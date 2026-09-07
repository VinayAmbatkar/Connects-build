import { useLocalSearchParams } from 'expo-router';
import { EventDetailScreen } from '@/src/features/events/EventDetailScreen';
import { ErrorState } from '@/src/components/EmptyState';

export default function EventRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;

  if (!eventId) {
    return <ErrorState title="Event unavailable" message="Missing event id." />;
  }

  return <EventDetailScreen eventId={String(eventId)} />;
}
