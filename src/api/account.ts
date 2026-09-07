import { apiClient } from '@/src/api/client';

export const accountApi = {
  getPrivacy: () => apiClient.get('/account/privacy').then((r) => r.data),
  updatePrivacy: (profileVisibility: string) =>
    apiClient.put('/account/privacy', { profileVisibility }).then((r) => r.data),
  getGeneral: () => apiClient.get('/account/general').then((r) => r.data),
  updateGeneral: (payload: {
    language?: string;
    startupPage?: string;
    notificationsEnabled?: boolean;
  }) => apiClient.put('/account/general', payload).then((r) => r.data),
  loginHistory: () =>
    apiClient.get('/account/login-history').then((r) => r.data),
  deactivate: () =>
    apiClient.post('/account/deactivate').then((r) => r.data),
};
