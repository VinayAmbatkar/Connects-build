import { Stack } from 'expo-router';
import { colors, typography } from '@/src/theme/tokens';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleStyle: {
          fontFamily: typography.fontFamily.semibold,
          color: colors.text,
        },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: '#F4F5F7' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="general" options={{ title: 'Customize experience' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy' }} />
      <Stack.Screen name="password" options={{ title: 'Change password' }} />
    </Stack>
  );
}
