import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/store/authStore';
import { usePrefsStore } from '@/src/store/prefsStore';

export default function Index() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasCompletedOnboarding = usePrefsStore((s) => s.hasCompletedOnboarding);
  const hasCompletedTour = usePrefsStore((s) => s.hasCompletedTour);

  if (accessToken) {
    if (!hasCompletedTour) {
      return <Redirect href="/(tabs)/feed?tour=1" />;
    }
    return <Redirect href="/(tabs)/feed" />;
  }

  if (!hasCompletedOnboarding) {
    return <Redirect href="/(onboarding)" />;
  }

  // New users sign up first; signup links to login for existing accounts.
  return <Redirect href="/(auth)/signup" />;
}
