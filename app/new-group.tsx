import { useLocalSearchParams } from 'expo-router';
import { NewGroupScreen } from '@/src/features/messages/NewGroupScreen';

/** /new-group creates a group; /new-group?addTo=<id> adds members to one. */
export default function NewGroupRoute() {
  const { addTo } = useLocalSearchParams<{ addTo?: string }>();
  return <NewGroupScreen addToGroupId={addTo ? String(addTo) : undefined} />;
}
