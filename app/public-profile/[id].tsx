import { useLocalSearchParams } from 'expo-router';
import {
  PublicProfileScreen,
  type ProfileFocus,
} from '@/src/features/profile/PublicProfileScreen';
import { ErrorState } from '@/src/components/EmptyState';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/src/theme/tokens';

export default function PublicProfileRoute() {
  const { id, focus } = useLocalSearchParams<{ id: string; focus?: string }>();

  if (!id) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <ErrorState title="Profile not found" message="This profile link is invalid." />
      </SafeAreaView>
    );
  }

  // Set by notification taps (see routeForNotification).
  const focusSection: ProfileFocus | undefined =
    focus === 'connection' || focus === 'credentials' ? focus : undefined;

  return <PublicProfileScreen userId={String(id)} focus={focusSection} />;
}
