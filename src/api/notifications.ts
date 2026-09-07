import { apiClient } from '@/src/api/client';
import type { NotificationItem } from '@/src/types/api';

export const notificationsApi = {
  list: () =>
    apiClient.get<NotificationItem[]>('/notifications').then((r) => r.data),
  unreadCount: () =>
    apiClient
      .get<{ count?: number }>('/notifications/unread-count')
      .then((r) => r.data),
  markRead: (id: string | number) =>
    apiClient.put(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () =>
    apiClient.put('/notifications/read-all').then((r) => r.data),
  remove: (id: string | number) =>
    apiClient.delete(`/notifications/${id}`).then((r) => r.data),
};
