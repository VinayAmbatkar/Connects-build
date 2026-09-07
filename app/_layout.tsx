import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useAuthStore } from '@/src/store/authStore';
import { usePrefsStore } from '@/src/store/prefsStore';
import { isNetworkError } from '@/src/api/client';
import { colors } from '@/src/theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        failureCount < 1 && isNetworkError(error),
      retryDelay: 1000,
      staleTime: 30_000,
    },
  },
});

export default function RootLayout() {
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const hydratePrefs = usePrefsStore((s) => s.hydrate);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const prefsHydrated = usePrefsStore((s) => s.hydrated);

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    void hydrateAuth();
    void hydratePrefs();
  }, [hydrateAuth, hydratePrefs]);

  useEffect(() => {
    if (fontsLoaded && authHydrated && prefsHydrated) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, authHydrated, prefsHydrated]);

  if (!fontsLoaded || !authHydrated || !prefsHydrated) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(onboarding)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
          <Stack.Screen name="edit-about" options={{ headerShown: true, title: 'Edit about' }} />
          <Stack.Screen name="search" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="notifications" options={{ headerShown: true, title: 'Notifications' }} />
          <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="new-message" options={{ headerShown: false }} />
          <Stack.Screen name="public-profile/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="projects/index" options={{ headerShown: true, title: 'My Projects' }} />
          <Stack.Screen name="listings/index" options={{ headerShown: true, title: 'My Listings' }} />
          <Stack.Screen name="portfolio/index" options={{ headerShown: true, title: 'Portfolio' }} />
          <Stack.Screen name="premium/index" options={{ headerShown: true, title: 'Premium' }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="support/index" options={{ headerShown: true, title: 'Support' }} />
          <Stack.Screen name="blocks/index" options={{ headerShown: true, title: 'Blocked users' }} />
          <Stack.Screen name="create-event" options={{ headerShown: false }} />
          <Stack.Screen
            name="connect/wizard"
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="connect/results"
            options={{ headerShown: false, animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="event/[id]"
            options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }}
          />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
