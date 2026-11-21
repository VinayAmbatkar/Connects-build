import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/src/api/auth';
import { promptCompleteProfile, setTourActive } from '@/src/features/profile/profileGate';
import { isConsumerRole } from '@/src/features/profile/profileLocks';
import { useAuthStore } from '@/src/store/authStore';
import { usePrefsStore } from '@/src/store/prefsStore';

/**
 * The first-run tour, shared by the professional tour (Home feed) and the
 * consumer tour (Find Connections). "Seen" is per account (users.has_seen_tour,
 * sent at login) as well as per device, so a finished or skipped tour never
 * comes back -- not after a reinstall, and not on another phone.
 *
 * `enabled` says whether this screen's tour applies (e.g. role, or the
 * ?tour=1 entry param); `stepCount` is the number of steps it has.
 */
export function useAppTour(enabled: boolean, stepCount: number) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const prefsHydrated = usePrefsStore((s) => s.hydrated);
  const hasCompletedTour = usePrefsStore((s) => s.hasCompletedTour);
  const completeTour = usePrefsStore((s) => s.completeTour);
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  const seenOnAccount = user?.hasSeenTour === true;

  useEffect(() => {
    if (!prefsHydrated) return;
    if (seenOnAccount && !hasCompletedTour) {
      void completeTour(); // remember it on this device too
      return;
    }
    if (enabled && !hasCompletedTour && !seenOnAccount) {
      setStep(0);
      setVisible(true);
    }
  }, [enabled, prefsHydrated, hasCompletedTour, seenOnAccount, completeTour]);

  // Keep the "complete your profile" dialog from stacking on the tour.
  useEffect(() => {
    setTourActive(visible);
    return () => setTourActive(false);
  }, [visible]);

  const finish = useCallback(async () => {
    setVisible(false);
    setTourActive(false);
    await completeTour();
    const current = useAuthStore.getState().user;
    if (current) void setUser({ ...current, hasSeenTour: true });
    authApi.markTourSeen().catch(() => undefined);
    // A professional who still owes their profile gets that prompt now
    // that the tour is out of the way.
    const profile = queryClient.getQueryData<{ role?: string; profileComplete?: boolean }>(['my-profile']);
    if (profile && profile.profileComplete === false && !isConsumerRole(profile.role ?? current?.role)) {
      promptCompleteProfile();
    }
  }, [completeTour, setUser, queryClient]);

  const next = useCallback(() => {
    if (step >= stepCount - 1) {
      void finish();
      return;
    }
    setStep((s) => s + 1);
  }, [step, stepCount, finish]);

  const back = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  return { visible, step, next, back, skip: finish };
}
