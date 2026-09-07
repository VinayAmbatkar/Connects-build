import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import type { AuthTokens, UserSummary } from '@/src/types/api';

const ACCESS_KEY = 'cb_access_token';
const REFRESH_KEY = 'cb_refresh_token';
const USER_KEY = 'cb_user';

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserSummary | null;
  hydrated: boolean;
  setTokens: (tokens: AuthTokens) => Promise<void>;
  setUser: (user: UserSummary | null) => Promise<void>;
  hydrate: () => Promise<void>;
  clear: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,

  setTokens: async ({ accessToken, refreshToken }) => {
    await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
    set({ accessToken, refreshToken });
  },

  setUser: async (user) => {
    if (user) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(USER_KEY);
    }
    set({ user });
  },

  hydrate: async () => {
    try {
      const [accessToken, refreshToken, userRaw] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_KEY),
        SecureStore.getItemAsync(REFRESH_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);
      set({
        accessToken,
        refreshToken,
        user: userRaw ? (JSON.parse(userRaw) as UserSummary) : null,
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },

  clear: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
    set({ accessToken: null, refreshToken: null, user: null });
  },
}));
