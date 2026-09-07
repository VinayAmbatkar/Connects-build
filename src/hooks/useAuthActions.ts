import { authApi } from '@/src/api/auth';
import { getErrorMessage } from '@/src/api/client';
import { useAuthStore } from '@/src/store/authStore';
import type { LoginResponse } from '@/src/types/api';

function normalizeTokens(data: LoginResponse) {
  const accessToken =
    data.accessToken ??
    (data as { token?: string }).token ??
    (data as { access_token?: string }).access_token;
  const refreshToken =
    data.refreshToken ??
    (data as { refresh_token?: string }).refresh_token ??
    '';
  if (!accessToken) {
    throw new Error('Login succeeded but no access token was returned');
  }
  return {
    accessToken: String(accessToken),
    refreshToken: String(refreshToken || accessToken),
  };
}

export function useAuthActions() {
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const clear = useAuthStore((s) => s.clear);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  const persistSession = async (data: LoginResponse) => {
    const tokens = normalizeTokens(data);
    await setTokens(tokens);
    if (data.user) {
      await setUser(data.user);
    }
  };

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email.trim(), password);
    await persistSession(data);
    return data;
  };

  const logout = async () => {
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // ignore logout API errors
    } finally {
      await clear();
    }
  };

  return { login, logout, persistSession, getErrorMessage };
}
