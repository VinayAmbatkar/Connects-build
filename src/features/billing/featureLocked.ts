import axios from 'axios';

import { router } from 'expo-router';
import type { FreemiumOffer } from '@/src/api/freemium';
import { useFreemiumStore } from '@/src/features/billing/freemiumStore';

import { appAlert } from '@/src/components/AppDialog';
export interface FeatureLockedBody {
  error?: string;
  code: 'FEATURE_LOCKED' | 'LIMIT_REACHED';
  feature?: string;
  tier?: string;
  limit?: number;
  required_tier?: string;
  /** Server-written popup ("Claim it free" / "View plans"). Present on
   *  backends with the freemium campaign; older ones fall back to the
   *  built-in alert below. */
  offer?: FreemiumOffer;
}

/** The 403 the backend's RequireFeature / plan-limit checks return. */
export function getFeatureLocked(error: unknown): FeatureLockedBody | null {
  if (!axios.isAxiosError(error) || error.response?.status !== 403) return null;
  const body = error.response.data as Partial<FeatureLockedBody> | undefined;
  if (body?.code === 'FEATURE_LOCKED' || body?.code === 'LIMIT_REACHED') return body as FeatureLockedBody;
  return null;
}

export function isFeatureLockedError(error: unknown): boolean {
  return getFeatureLocked(error) !== null;
}

function planName(tier?: string): string {
  if (tier === 'PREMIUM') return 'Premium';
  return 'Verified membership';
}

let lastShownAt = 0;

/**
 * Shown once (throttled) whenever any request hits a plan gate, so every
 * gated action -- connect, message, search, project limit -- explains why
 * it failed and offers the upgrade. Called from the API client interceptor;
 * screens should skip their own error alert when isFeatureLockedError().
 */
export function showFeatureLockedPrompt(body: FeatureLockedBody) {
  if (useFreemiumStore.getState().showOffer(body.offer)) return;

  const now = Date.now();
  if (now - lastShownAt < 4000) return;
  lastShownAt = now;

  const title = body.code === 'LIMIT_REACHED' ? 'Plan limit reached' : 'Upgrade to continue';
  const message =
    body.code === 'LIMIT_REACHED'
      ? `${body.error || "You've reached your plan's limit."} Upgrade to ${planName(body.required_tier)} for more.`
      : `${body.error || 'This feature is not included in your plan.'} It's included with ${planName(body.required_tier)}.`;

  appAlert(title, message, [
    { text: 'Not now', style: 'cancel' },
    { text: 'View plans', onPress: () => router.push('/premium') },
  ]);
}

/** Standard error alert that stays quiet for plan gates (already prompted). */
export function alertApiError(error: unknown, fallback?: string, title = 'Error') {
  if (isFeatureLockedError(error)) return;
  // Lazy import keeps this module free of a cycle with the API client.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getErrorMessage } = require('@/src/api/client') as typeof import('@/src/api/client');
  appAlert(title, getErrorMessage(error, fallback));
}
