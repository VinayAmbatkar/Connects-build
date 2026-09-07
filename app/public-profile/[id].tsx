import { useLocalSearchParams } from 'expo-router';
import { PublicProfileScreen } from '@/src/features/profile/PublicProfileScreen';
import { ErrorState } from '@/src/components/EmptyState';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/src/theme/tokens';

export default function PublicProfileRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <ErrorState title="Profile not found" message="This profile link is invalid." />
      </SafeAreaView>
    );
  }

  return <PublicProfileScreen userId={String(id)} />;
}
