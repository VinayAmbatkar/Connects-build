import { apiClient } from '@/src/api/client';

export const devicesApi = {
  registerPushToken: (token: string, platform: string) =>
    apiClient
      .post('/devices/push-token', { token, platform })
      .then((r) => r.data),
  unregisterPushToken: (token: string) =>
    apiClient
      .delete('/devices/push-token', { data: { token } })
      .then((r) => r.data),
};
