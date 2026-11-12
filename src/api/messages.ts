import { apiClient } from '@/src/api/client';
import { appendNativeFile } from '@/src/utils/nativeFormData';
import type { Conversation, GroupChat, Message } from '@/src/types/api';

/** Max people in a group chat, creator included (backend:
 *  models.MaxGroupChatMembers). */
export const MAX_GROUP_MEMBERS = 15;

type UploadFile = { uri: string; name: string; type: string; file?: File };

function attachmentForm(file: UploadFile, caption?: string) {
  const form = new FormData();
  if (file.file) form.append('file', file.file);
  else appendNativeFile(form, 'file', { uri: file.uri, name: file.name, type: file.type });
  if (caption?.trim()) form.append('body', caption.trim());
  return form;
}

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

  /** Photo (JPEG/PNG/WebP) or PDF, optionally with a caption. Premium only
   *  (internal/message SendAttachment). */
  sendAttachment: (
    id: string | number,
    file: { uri: string; name: string; type: string; file?: File },
    caption?: string,
  ) => {
    return apiClient
      .post<Message>(`/messages/conversations/${id}/attachment`, attachmentForm(file, caption), {
        timeout: 60000,
      })
      .then((r) => r.data);
  },

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

  /** Marks a group chat as the open thread (so its messages don't also
   *  raise a notification). setActive(null) clears either kind. */
  setActiveGroup: (groupId: number) =>
    apiClient.put('/messages/active', { conversationId: null, groupId }).then((r) => r.data),

  hideConversation: (id: string | number) =>
    apiClient.delete(`/messages/conversations/${id}`).then((r) => r.data),
};

/**
 * Group chats (/api/messages/groups). Creating a group and adding members
 * need the group_chat plan feature (Premium); members chat under the normal
 * message feature; files need message_attachments. Max 15 people.
 */
export const groupsApi = {
  list: () =>
    apiClient
      .get<{ groups?: GroupChat[] }>('/messages/groups', { params: { page: 1, limit: 50 } })
      .then((r) => r.data.groups ?? []),

  get: (id: string | number) =>
    apiClient.get<GroupChat>(`/messages/groups/${id}`).then((r) => r.data),

  create: (name: string, memberIds: string[]) =>
    apiClient.post<GroupChat>('/messages/groups', { name, memberIds }).then((r) => r.data),

  rename: (id: string | number, name: string) =>
    apiClient.patch<GroupChat>(`/messages/groups/${id}`, { name }).then((r) => r.data),

  addMembers: (id: string | number, memberIds: string[]) =>
    apiClient.post<GroupChat>(`/messages/groups/${id}/members`, { memberIds }).then((r) => r.data),

  removeMember: (id: string | number, userId: string) =>
    apiClient
      .delete<GroupChat>(`/messages/groups/${id}/members/${encodeURIComponent(userId)}`)
      .then((r) => r.data),

  leave: (id: string | number) =>
    apiClient.post(`/messages/groups/${id}/leave`).then((r) => r.data),

  listMessages: (id: string | number) =>
    apiClient
      .get(`/messages/groups/${id}/messages`, { params: { page: 1, limit: 100 } })
      .then((r) => unwrapMessages(r.data)),

  sendText: (id: string | number, body: string) =>
    apiClient.post<Message>(`/messages/groups/${id}/messages`, { body }).then((r) => r.data),

  sendAttachment: (id: string | number, file: UploadFile, caption?: string) =>
    apiClient
      .post<Message>(`/messages/groups/${id}/attachment`, attachmentForm(file, caption), {
        timeout: 60000,
      })
      .then((r) => r.data),

  markRead: (id: string | number) =>
    apiClient.put(`/messages/groups/${id}/read`).then((r) => r.data),
};
