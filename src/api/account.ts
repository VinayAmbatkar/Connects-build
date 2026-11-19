import { apiClient } from '@/src/api/client';

export type GeneralSettings = {
  language?: string;
  startupPage?: string;
  notificationsEnabled?: boolean;
};

export type UpdateGeneralSettingsRequest = {
  language: string;
  startupPage: string;
  notificationsEnabled: boolean;
};

export const accountApi = {
  getPrivacy: () => apiClient.get('/account/privacy').then((r) => r.data),
  updatePrivacy: (profileVisibility: string) =>
    apiClient.put('/account/privacy', { profileVisibility }).then((r) => r.data),
  getGeneral: () =>
    apiClient.get<GeneralSettings>('/account/general').then((r) => r.data),
  updateGeneral: (payload: UpdateGeneralSettingsRequest) =>
    apiClient.put('/account/general', payload).then((r) => r.data),
  loginHistory: () =>
    apiClient.get('/account/login-history').then((r) => r.data),
  /** Permanent: the backend erases the account and all its data. */
  deleteAccount: () =>
    apiClient.post<{ message: string }>('/account/delete', {}).then((r) => r.data),
};
