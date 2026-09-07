import { apiClient } from '@/src/api/client';
import type { PremiumPlan } from '@/src/types/api';

export const premiumApi = {
  plans: () => apiClient.get<PremiumPlan[]>('/premium/plans').then((r) => r.data),
  status: () => apiClient.get('/premium/status').then((r) => r.data),
  benefits: () => apiClient.get('/premium/benefits').then((r) => r.data),
};
