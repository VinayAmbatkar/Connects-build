import { apiClient } from '@/src/api/client';
import type { Listing } from '@/src/types/api';

export const listingsApi = {
  listMine: () => apiClient.get<Listing[]>('/listings').then((r) => r.data),
  listByUser: (userId: string | number) =>
    apiClient.get<Listing[]>(`/listings/user/${userId}`).then((r) => r.data),
  create: (payload: {
    title: string;
    category: string;
    description: string;
    price: number;
  }) => apiClient.post<Listing>('/listings', payload).then((r) => r.data),
  update: (
    id: string | number,
    payload: {
      title: string;
      category: string;
      description: string;
      price: number;
    },
  ) => apiClient.put<Listing>(`/listings/${id}`, payload).then((r) => r.data),
  remove: (id: string | number) =>
    apiClient.delete(`/listings/${id}`).then((r) => r.data),
};
