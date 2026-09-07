import type { Conversation, Message } from '@/src/types/api';

export function conversationName(item: Conversation) {
  return item.participantName ?? item.otherPartyName ?? 'Conversation';
}

export function conversationRoleLine(item: Conversation) {
  const role = item.participantRole ?? item.otherPartyRole ?? '';
  const company =
    item.participantCompany ??
    (typeof item.company === 'string' ? item.company : '');
  if (role && company) return `${role} · ${company}`;
  return role || company || '';
}

export function conversationPreview(item: Conversation) {
  const preview = (item.lastMessage ?? item.lastMessagePreview ?? '').trim();
  return preview || 'Say hello';
}

export function conversationParticipantId(item: Conversation) {
  return item.participantId ?? item.otherPartyId;
}

export function formatConversationTime(value?: string) {
  if (!value?.trim()) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function formatMessageClock(value?: string) {
  if (!value?.trim()) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatMessageDayLabel(value?: string) {
  if (!value?.trim()) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function sameDay(a?: string, b?: string) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
  return da.toDateString() === db.toDateString();
}

export function messageText(item: Message) {
  const body = (item.body ?? '').trim();
  if (body) return body;
  if (item.attachmentType === 'pdf') {
    return item.attachmentName || 'Document.pdf';
  }
  if (item.attachmentType === 'image') return 'Photo';
  if (item.attachmentType === 'audio') return 'Voice note';
  return item.attachmentUrl ? 'Attachment' : '';
}
