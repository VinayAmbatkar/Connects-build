import axios from 'axios';
import { router } from 'expo-router';
import { appAlert } from '@/src/components/AppDialog';

// "Complete your profile first" gate. The backend
// (middleware.ProfileCompleteRequired) refuses most features with
// 403 { code: 'PROFILE_INCOMPLETE' } until a professional has saved a
// company, a role and at least one discipline -- `profileComplete` on
// GET /profile/professional is the same rule. Consumers are never gated.

export const PROFILE_INCOMPLETE_CODE = 'PROFILE_INCOMPLETE';

export const COMPLETE_PROFILE_TITLE = 'Complete your profile first';
export const COMPLETE_PROFILE_MESSAGE =
  'Add your professional details (company and firm location) and your role & expertise to start using CoBilds. It only takes a minute.';

export const ONBOARDING_EDIT_PROFILE = '/edit-profile?onboarding=1' as const;

export function isProfileIncompleteError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const data = error.response?.data as { code?: string } | undefined;
  return error.response?.status === 403 && data?.code === PROFILE_INCOMPLETE_CODE;
}

let promptOpen = false;
let editProfileOpen = false;

/** Edit Profile reports when it's on screen, so the prompt never sends
 *  someone to the page they're already filling in. */
export function setEditProfileOpen(open: boolean) {
  editProfileOpen = open;
}

/** One dialog however many gated requests fail at once. */
export function promptCompleteProfile() {
  if (promptOpen || editProfileOpen) return;
  promptOpen = true;
  appAlert(
    COMPLETE_PROFILE_TITLE,
    COMPLETE_PROFILE_MESSAGE,
    [
      {
        text: 'Complete profile',
        onPress: () => {
          promptOpen = false;
          router.push(ONBOARDING_EDIT_PROFILE);
        },
      },
    ],
    { cancelable: false },
  );
}
