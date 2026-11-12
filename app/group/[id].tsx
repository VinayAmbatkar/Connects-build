import { useLocalSearchParams } from 'expo-router';
import { ChatScreen } from '@/src/features/messages/ChatScreen';

export default function GroupChatRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ChatScreen conversationId={String(id ?? '')} kind="group" />;
}
