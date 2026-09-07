import { apiClient } from '@/src/api/client';
import type { SupportCase } from '@/src/types/api';

export const supportApi = {
  listCases: () =>
    apiClient.get<SupportCase[]>('/support/cases').then((r) => r.data),
  createCase: (payload: {
    type: string;
    subject: string;
    description: string;
  }) => apiClient.post('/support/cases', payload).then((r) => r.data),
};
