import { apiClient } from '@/src/api/client';

export const blocksApi = {
  list: () => apiClient.get('/blocks').then((r) => r.data),
  block: (userId: string | number) =>
    apiClient.post(`/blocks/${userId}`).then((r) => r.data),
  unblock: (userId: string | number) =>
    apiClient.delete(`/blocks/${userId}`).then((r) => r.data),
};
