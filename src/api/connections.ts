import { apiClient } from '@/src/api/client';
import type { Connection, ConnectionSummary } from '@/src/types/api';

export type ConnectionFilter = 'all' | 'accepted' | 'received' | 'sent';

function unwrapConnections(data: unknown): Connection[] {
  if (Array.isArray(data)) return data as Connection[];
  if (data && typeof data === 'object') {
    const body = data as { connections?: Connection[]; data?: unknown };
    if (Array.isArray(body.connections)) return body.connections;
    if (Array.isArray(body.data)) return body.data as Connection[];
  }
  return [];
}

export const connectionsApi = {
  list: (params?: { page?: number; limit?: number; filter?: ConnectionFilter }) =>
    apiClient
      .get('/connections', {
        params: {
          page: params?.page ?? 1,
          limit: params?.limit ?? 50,
          ...(params?.filter && params.filter !== 'all'
            ? { filter: params.filter }
            : {}),
        },
      })
      .then((r) => unwrapConnections(r.data)),

  summary: () =>
    apiClient.get<ConnectionSummary>('/connections/summary').then((r) => r.data),

  count: () =>
    apiClient.get<{ count?: number }>('/connections/count').then((r) => r.data),

  send: (recipientId: string | number) =>
    apiClient.post('/connections', { recipientId }).then((r) => r.data),

  accept: (id: string | number) =>
    apiClient.put(`/connections/${id}/accept`).then((r) => r.data),

  reject: (id: string | number) =>
    apiClient.put(`/connections/${id}/reject`).then((r) => r.data),

  remove: (id: string | number) =>
    apiClient.delete(`/connections/${id}`).then((r) => r.data),
};
