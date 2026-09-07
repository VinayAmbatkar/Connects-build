import { apiClient } from '@/src/api/client';
import type { Conversation, Message } from '@/src/types/api';

function normalizeConversation(raw: Record<string, unknown>): Conversation {
  const otherPartyId = (raw.otherPartyId ?? raw.participantId) as
    | string
    | number
    | undefined;
  const otherPartyName = (raw.otherPartyName ?? raw.participantName) as
    | string
    | undefined;
  const otherPartyRole = (raw.otherPartyRole ?? raw.participantRole) as
    | string
    | undefined;
  const lastMessage = (raw.lastMessagePreview ?? raw.lastMessage) as
    | string
    | undefined;
  const lastMessageAt = (raw.lastMessageAt ?? raw.updatedAt) as string | undefined;

  return {
    ...raw,
    id: (raw.id as string | number) ?? '',
    participantId: otherPartyId,
    participantName: otherPartyName,
    participantRole: otherPartyRole,
    participantBio: (raw.otherPartyBio ?? raw.participantBio) as string | undefined,
    online: Boolean(raw.otherPartyOnline ?? raw.online),
    lastMessage,
    lastMessageAt,
    unreadCount: Number(raw.unreadCount ?? 0),
    otherPartyId,
    otherPartyName,
    otherPartyRole,
    otherPartyBio: raw.otherPartyBio as string | undefined,
    otherPartyOnline: Boolean(raw.otherPartyOnline),
    lastMessagePreview: lastMessage,
  };
}

function unwrapConversations(data: unknown): Conversation[] {
  if (Array.isArray(data)) {
    return data.map((item) =>
      normalizeConversation(item as Record<string, unknown>),
    );
  }
  if (data && typeof data === 'object') {
    const body = data as { conversations?: unknown[]; data?: unknown };
    if (Array.isArray(body.conversations)) {
      return body.conversations.map((item) =>
        normalizeConversation(item as Record<string, unknown>),
      );
    }
    if (Array.isArray(body.data)) {
      return body.data.map((item) =>
        normalizeConversation(item as Record<string, unknown>),
      );
    }
  }
  return [];
}

function unwrapMessages(data: unknown): Message[] {
  if (Array.isArray(data)) return data as Message[];
  if (data && typeof data === 'object') {
    const body = data as { messages?: Message[]; data?: unknown };
    if (Array.isArray(body.messages)) return body.messages;
    if (Array.isArray(body.data)) return body.data as Message[];
  }
  return [];
}

export const messagesApi = {
  conversations: () =>
    apiClient
      .get('/messages/conversations', { params: { page: 1, limit: 50 } })
      .then((r) => unwrapConversations(r.data)),

  startConversation: (recipientId: string | number) =>
    apiClient
      .post('/messages/conversations', { recipientId })
      .then((r) => normalizeConversation(r.data as Record<string, unknown>)),

  listMessages: (id: string | number) =>
    apiClient
      .get(`/messages/conversations/${id}/messages`, {
        params: { page: 1, limit: 100 },
      })
      .then((r) => unwrapMessages(r.data)),

  sendText: (id: string | number, body: string) =>
    apiClient
      .post<Message>(`/messages/conversations/${id}/messages`, { body })
      .then((r) => r.data),

  markRead: (id: string | number) =>
    apiClient.put(`/messages/conversations/${id}/read`).then((r) => r.data),

  unreadCount: () =>
    apiClient.get<{ count?: number }>('/messages/unread-count').then((r) => r.data),

  presence: (id: string | number) =>
    apiClient
      .get<{ online?: boolean }>(`/messages/conversations/${id}/presence`)
      .then((r) => r.data),

  setActive: (conversationId: number | null) =>
    apiClient.put('/messages/active', { conversationId }).then((r) => r.data),

  hideConversation: (id: string | number) =>
    apiClient.delete(`/messages/conversations/${id}`).then((r) => r.data),
};
