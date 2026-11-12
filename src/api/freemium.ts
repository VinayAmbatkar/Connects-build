import { apiClient } from '@/src/api/client';

// "Claim it free" freemium -- see Backend-tech docs/FREEMIUM_CLAIM_PLAN.md.
// The app decides nothing about the campaign: it renders what the backend
// sends and runs a small fixed set of actions. Any action it doesn't know
// is treated as "dismiss", so new actions never break this app version.

export type OfferType = 'CLAIM_FREE' | 'PURCHASE' | 'NONE';
export type OfferAction = 'CLAIM' | 'OPEN_PLANS' | 'DISMISS' | (string & {});

/** The `offer` block on a 403 FEATURE_LOCKED / LIMIT_REACHED response. */
export interface FreemiumOffer {
  type: OfferType;
  feature: string;
  title: string;
  message: string;
  cta_label: string;
  cta_action: OfferAction;
  dismiss_label: string;
  /** Plans screen only: "Free for the next 3 months". */
  price_note?: string;
}

export interface Nudge {
  id: string;
  kind: string;
  title: string;
  body: string;
  quote?: string;
  cta?: { label: string; action: OfferAction };
  dismiss_label: string;
}

/** "Congratulations!" popup after a new claim (all text from the backend). */
export interface Celebration {
  title: string;
  message: string;
  products: string[];
  features: string[];
  cta_label: string;
}

export interface ClaimResult {
  claimed: boolean;
  new: boolean;
  message: string;
  celebration?: Celebration;
}

/** Declared on every request: this app version shows the claim button and
 *  nudges itself, so the backend must not claim on its behalf. */
export const CLIENT_FEATURES = 'claim-v1,nudges-v1';

export const freemiumApi = {
  claim: (feature: string) =>
    apiClient.post<ClaimResult>('/billing/claim', { feature }).then((r) => r.data),

  nudges: () =>
    apiClient.get<{ nudges?: Nudge[] }>('/app/nudges').then((r) => r.data.nudges ?? []),
};
