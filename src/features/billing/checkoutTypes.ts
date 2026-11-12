import type { CheckoutSuccess } from '@/src/api/billing';

export interface CheckoutOptions {
  keyId: string;
  orderId: string;
  amountPaise: number;
  currency: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
}

/**
 * How one Checkout session ended. 'dismissed' covers both a user cancel and
 * a failed last attempt (lastError set) -- the caller checks the order on
 * the server before deciding which, since a UPI payment can still land
 * after the sheet closes.
 */
export type CheckoutResult =
  | { kind: 'success'; response: CheckoutSuccess }
  | { kind: 'dismissed'; lastError?: string };

export const CHECKOUT_THEME = '#E3A400';

/**
 * Razorpay's error payload is shaped differently per platform: `description`
 * may be plain text or a JSON string with error.description / error.reason.
 * Returns undefined for a plain user cancel.
 */
export function parseCheckoutError(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as { description?: unknown; error?: { description?: unknown; reason?: unknown } };
  let description = typeof data.description === 'string' ? data.description : '';
  let reason = typeof data.error?.reason === 'string' ? data.error.reason : '';
  if (description.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(description) as { error?: { description?: string; reason?: string } };
      description = parsed.error?.description ?? '';
      reason = parsed.error?.reason ?? reason;
    } catch {
      // keep the raw text
    }
  } else if (!description && typeof data.error?.description === 'string') {
    description = data.error.description;
  }
  const text = `${description} ${reason}`.toLowerCase();
  if (!description || text.includes('cancel')) return undefined;
  return description;
}
