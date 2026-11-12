import { useLocalSearchParams } from 'expo-router';
import { GroupInfoScreen } from '@/src/features/messages/GroupInfoScreen';

export default function GroupInfoRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <GroupInfoScreen groupId={String(id ?? '')} />;
}
