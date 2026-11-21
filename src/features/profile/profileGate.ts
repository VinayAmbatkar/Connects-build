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
let tourActive = false;

/** The first-run tour reports when it's showing, so this dialog never
 *  stacks on top of it (the feed prompts once the tour ends). */
export function setTourActive(active: boolean) {
  tourActive = active;
}

/** Edit Profile reports when it's on screen, so the prompt never sends
 *  someone to the page they're already filling in. */
export function setEditProfileOpen(open: boolean) {
  editProfileOpen = open;
}

/** Shown when a professional with an incomplete profile opens Home,
 *  Discover or Profile (see the tabs layout). One dialog at a time;
 *  "Later" dismisses it until they open one of those tabs again. */
export function promptCompleteProfile() {
  if (promptOpen || editProfileOpen || tourActive) return;
  promptOpen = true;
  appAlert(COMPLETE_PROFILE_TITLE, COMPLETE_PROFILE_MESSAGE, [
    {
      text: 'Later',
      style: 'cancel',
      onPress: () => {
        promptOpen = false;
      },
    },
    {
      text: 'Complete profile',
      onPress: () => {
        promptOpen = false;
        router.push(ONBOARDING_EDIT_PROFILE);
      },
    },
  ]);
}
