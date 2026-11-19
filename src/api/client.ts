import { useAuthStore } from '@/src/store/authStore';
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { getFeatureLocked, showFeatureLockedPrompt } from '@/src/features/billing/featureLocked';
import { CLIENT_FEATURES } from '@/src/api/freemium';
import {
  COMPLETE_PROFILE_MESSAGE,
  isProfileIncompleteError,
  promptCompleteProfile,
} from '@/src/features/profile/profileGate';

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'https://stagging-backend-tcgym.ondigitalocean.app/api';

export const API_BASE_URL = apiUrl.replace(/\/$/, '');

const API_LOG_ENABLED =
  __DEV__ || process.env.EXPO_PUBLIC_API_LOG === 'true';

const SENSITIVE_KEYS = new Set([
  'password',
  'newPassword',
  'currentPassword',
  'refreshToken',
  'accessToken',
  'token',
  'idToken',
  'code',
  'otp',
  // KYC: never print identity numbers or live OTP sessions in dev logs.
  'aadhaar_number',
  'aadharNumber',
  'session_id',
  'kyc_data',
]);

type TimedRequestConfig = InternalAxiosRequestConfig & {
  _apiLogStart?: number;
  _retry?: boolean;
};

function redactValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEYS.has(key)) return '***';
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return redactBody(value as Record<string, unknown>);
  }
  return value;
}

function redactBody(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map((item) => redactBody(item));

  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>).map(([key, value]) => [
      key,
      redactValue(key, value),
    ]),
  );
}

function formatUrl(config: InternalAxiosRequestConfig) {
  const path = config.url ?? '';
  if (path.startsWith('http')) return path;
  const base = (config.baseURL ?? API_BASE_URL).replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

function parseRequestBody(data: unknown): unknown {
  if (typeof data === 'string') {
    try {
      return redactBody(JSON.parse(data));
    } catch {
      return data;
    }
  }
  return redactBody(data);
}

function logApi(
  direction: '→' | '←' | '✖',
  message: string,
  details?: Record<string, unknown>,
) {
  const label = `[API] ${direction} ${message}`;
  if (details) {
    console.log(label, details);
    return;
  }
  console.log(label);
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens, clear } = useAuthStore.getState();
  if (!refreshToken) {
    await clear();
    return null;
  }

  try {
    if (API_LOG_ENABLED) {
      logApi('→', 'POST /auth/refresh', { body: { refreshToken: '***' } });
    }
    const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken,
    });
    if (API_LOG_ENABLED) {
      logApi('←', 'POST /auth/refresh', { status: 200 });
    }
    const accessToken = data.accessToken ?? data.token ?? data.access_token;
    const nextRefresh = data.refreshToken ?? data.refresh_token ?? refreshToken;
    if (!accessToken) {
      await clear();
      return null;
    }
    await setTokens({ accessToken, refreshToken: nextRefresh });
    return accessToken as string;
  } catch (error) {
    if (API_LOG_ENABLED) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      logApi('✖', 'POST /auth/refresh', { status, error: getErrorMessage(error) });
    }
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (status === 401 || status === 403) {
      await clear();
    }
    return null;
  }
}

apiClient.interceptors.request.use((config: TimedRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Freemium: this version renders "Claim it free" offers and nudges, and
  // all their text comes from the backend in this language. Older app
  // versions don't send these, and the backend claims for them instead.
  config.headers['X-Client-Features'] = CLIENT_FEATURES;
  config.headers['X-App-Language'] = 'en';

  // If the request body is FormData, delete the Content-Type header so
  // axios can set it automatically with the correct boundary.
  // In React Native, FormData detection via instanceof can be unreliable,
  // so we also check the constructor name.
  const data = config.data;
  const isFormData = data instanceof FormData ||
    (data && typeof data === 'object' && data.constructor?.name === 'FormData');
  if (isFormData) {
    delete config.headers['Content-Type'];
  }

  if (API_LOG_ENABLED) {
    config._apiLogStart = Date.now();
    const method = (config.method ?? 'get').toUpperCase();
    const url = formatUrl(config);
    logApi('→', `${method} ${url}`, {
      params: config.params ?? undefined,
      body: config.data ? parseRequestBody(config.data) : undefined,
      auth: token ? 'Bearer ***' : undefined,
    });
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (API_LOG_ENABLED) {
      const config = response.config as TimedRequestConfig;
      const method = (config.method ?? 'get').toUpperCase();
      const url = formatUrl(config);
      const durationMs = config._apiLogStart
        ? Date.now() - config._apiLogStart
        : undefined;
      logApi('←', `${method} ${url}`, {
        status: response.status,
        durationMs,
        data: redactBody(response.data),
      });
    }
    return response;
  },
  async (error: AxiosError) => {
    const original = error.config as TimedRequestConfig | undefined;

    if (API_LOG_ENABLED && original) {
      const method = (original.method ?? 'get').toUpperCase();
      const url = formatUrl(original);
      const durationMs = original._apiLogStart
        ? Date.now() - original._apiLogStart
        : undefined;
      logApi('✖', `${method} ${url}`, {
        status: error.response?.status,
        durationMs,
        error: getErrorMessage(error),
        data: redactBody(error.response?.data),
      });
    }

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }
    }

    // Plan gate (BILLING_ENFORCE): explain it and offer the upgrade from
    // one place, whichever screen made the call.
    const locked = getFeatureLocked(error);
    if (locked) {
      showFeatureLockedPrompt(locked);
    }

    // Profile gate: a professional without company / role / discipline is
    // refused most features. Say so and offer the fix, instead of each
    // screen showing a bare "something went wrong".
    if (isProfileIncompleteError(error)) {
      promptCompleteProfile();
    }

    return Promise.reject(error);
  },
);

export function isNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  if (!error.response) return true;
  return error.code === 'ECONNABORTED' || error.message === 'Network Error';
}

/** Fit to show a person: non-empty, not markup, not a stack of text. */
function isShortMessage(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && t.length <= 240 && !/<\/?(html|body|head|!doctype|div|p)\b/i.test(t);
}

/** The error code the backend attached to a failed request (e.g.
 *  "USER_NOT_FOUND"), if any. */
export function getErrorCode(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) return undefined;
  const data = error.response?.data as { code?: unknown } | undefined;
  return data && typeof data === 'object' && typeof data.code === 'string' ? data.code : undefined;
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. The server may be waking up or your network is slow.';
    }
    if (!error.response && error.message === 'Network Error') {
      return 'Cannot reach the server. Check your internet or try another network.';
    }
    if (isProfileIncompleteError(error)) {
      return COMPLETE_PROFILE_MESSAGE;
    }

    const data = error.response?.data as
      | { message?: string; error?: string }
      | string
      | undefined;
    // A text body is shown only when it reads like a message. An HTML page
    // (e.g. a proxy error, or a redirect the client followed) or a wall of
    // text used to be dumped straight into the alert.
    if (typeof data === 'string' && isShortMessage(data)) return data.trim();
    if (data && typeof data === 'object') {
      if (data.message && isShortMessage(data.message)) return data.message;
      if (data.error && isShortMessage(data.error)) return data.error;
    }
    if (typeof data === 'string' || data) return fallback;
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
