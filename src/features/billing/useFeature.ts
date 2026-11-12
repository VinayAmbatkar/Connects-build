import { useQuery } from '@tanstack/react-query';
import { billingApi } from '@/src/api/billing';

/**
 * Which plan unlocks each gated feature -- mirrors the launch matrix in
 * Backend-tech internal/billing/catalog.go (seedMatrix). Used only to pick
 * the badge colour; whether the feature is actually on comes from
 * /billing/me, and the backend enforces it regardless.
 */
const REQUIRED_TIER: Record<string, 'verified' | 'premium'> = {
  search: 'verified',
  connect: 'verified',
  message: 'verified',
  full_profile: 'verified',
  project_upload: 'verified',
  group_chat: 'premium',
  message_attachments: 'premium',
  visibility_check: 'premium',
  profile_views: 'premium',
  advertisement: 'premium',
};

/** Gated even while billing enforcement is switched off (backend:
 *  billing.AlwaysEnforced). Everything else is free for all until it's on. */
const ALWAYS_ENFORCED = new Set(['message_attachments', 'group_chat']);

export type FeatureState = {
  /** The viewer's plan includes it. True while unknown, so nothing flashes a lock. */
  enabled: boolean;
  /** Set when locked: the plan that unlocks it (drives the badge colour). */
  lockedTier: 'verified' | 'premium' | null;
};

/** The viewer's access to one plan feature, from the shared billing query. */
export function useFeature(key: string): FeatureState {
  const { data } = useQuery({ queryKey: ['billing-me'], queryFn: billingApi.me, staleTime: 60_000 });
  if (!data) return { enabled: true, lockedTier: null };
  // /billing/me reports the plan matrix; with enforcement off the backend
  // still lets everyone use all but the always-enforced features.
  const inPlan = data.features.find((f) => f.key === key)?.enabled ?? false;
  const enabled = inPlan || (!data.enforced && !ALWAYS_ENFORCED.has(key));
  return { enabled, lockedTier: enabled ? null : REQUIRED_TIER[key] ?? 'premium' };
}
