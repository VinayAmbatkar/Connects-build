import { apiClient } from '@/src/api/client';
import type { ProfessionalProfile, ProfileOptions } from '@/src/types/api';

export const profileApi = {
  options: () =>
    apiClient
      .get<ProfileOptions>('/profile/professional/options')
      .then((r) => r.data),

  getMine: () =>
    apiClient.get<ProfessionalProfile>('/profile/professional').then((r) => r.data),

  save: (payload: ProfessionalProfile) =>
    apiClient
      .post<ProfessionalProfile>('/profile/professional', payload)
      .then((r) => r.data),

  getPublic: (userId: string | number) =>
    apiClient
      .get<ProfessionalProfile>(`/profile/professional/${userId}`)
      .then((r) => r.data),

  verifyGst: (gstNumber: string) =>
    apiClient.post('/profile/gst/verify', { gstNumber }).then((r) => r.data),
};
