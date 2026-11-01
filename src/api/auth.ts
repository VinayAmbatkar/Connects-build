import { apiClient } from '@/src/api/client';
import type { LoginResponse, SignupPayload } from '@/src/types/api';

export const authApi = {
  signup: (payload: SignupPayload) =>
    apiClient.post<LoginResponse>('/auth/signup', payload).then((r) => r.data),

  login: (email: string, password: string) =>
    apiClient
      .post<LoginResponse>('/auth/login', { email, password })
      .then((r) => r.data),

  logout: (refreshToken: string) =>
    apiClient.post('/auth/logout', { refreshToken }).then((r) => r.data),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (token: string, newPassword: string) =>
    apiClient
      .post('/auth/reset-password', { token, newPassword })
      .then((r) => r.data),

  sendEmailOtp: (email: string) =>
    apiClient.post('/auth/send-email-otp', { email }).then((r) => r.data),

  verifyEmailOtp: (email: string, code: string) =>
    apiClient
      .post('/auth/verify-email-otp', { email, code })
      .then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient
      .post('/auth/change-password', { currentPassword, newPassword })
      .then((r) => r.data),

  googleNativeLogin: (idToken: string) =>
    apiClient
      .post<LoginResponse>('/auth/google/native', { idToken })
      .then((r) => r.data),
};
