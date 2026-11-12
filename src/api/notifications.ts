import { apiClient } from '@/src/api/client';
import type { NotificationListResponse } from '@/src/types/api';

export const notificationsApi = {
  list: () =>
    apiClient
      .get<NotificationListResponse>('/notifications')
      .then((r) => r.data.notifications ?? []),
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
