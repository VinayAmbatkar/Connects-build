import axios from 'axios';
import * as Crypto from 'expo-crypto';
import {
  billingApi,
  type BillingInterval,
  type BillingOrder,
  type BillingProduct,
  type OrderState,
} from '@/src/api/billing';
import { getErrorMessage, isNetworkError } from '@/src/api/client';
import type { CheckoutOptions, CheckoutResult } from '@/src/features/billing/checkoutTypes';

/** How one purchase attempt ended. 'pending' = money may be taken but not
 * confirmed yet (webhook / later check finishes it) -- never a failure. */
export type PurchaseOutcome =
  | { status: 'paid'; order: OrderState }
  | { status: 'pending'; orderId: string }
  | { status: 'cancelled' }
  | { status: 'failed'; message: string; code?: string };

export const POLL_ATTEMPTS = 8;
export const POLL_INTERVAL_MS = 2500;

export interface PurchaseDeps {
  api: Pick<typeof billingApi, 'createOrder' | 'verifyOrder' | 'getOrder'>;
  openCheckout: (options: CheckoutOptions) => Promise<CheckoutResult>;
  newKey: () => string;
  sleep: (ms: number) => Promise<void>;
}

export function describePurchase(product: BillingProduct, interval: BillingInterval): string {
  if (product === 'VERIFIED') return 'Verified membership (1 year)';
  return interval === 'MONTH' ? 'Premium (1 month)' : 'Premium (1 year)';
}

function failed(err: unknown): PurchaseOutcome {
  if (axios.isAxiosError(err)) {
    const body = (err.response?.data ?? {}) as { code?: string };
    return { status: 'failed', code: body.code, message: getErrorMessage(err, 'Something went wrong, please try again.') };
  }
  return { status: 'failed', message: getErrorMessage(err, 'Something went wrong, please try again.') };
}

async function tryGetOrder(deps: PurchaseDeps, orderId: string): Promise<OrderState | null> {
  try {
    return await deps.api.getOrder(orderId);
  } catch {
    return null;
  }
}

async function pollUntilSettled(deps: PurchaseDeps, orderId: string): Promise<PurchaseOutcome> {
  for (let i = 0; i < POLL_ATTEMPTS; i++) {
    await deps.sleep(POLL_INTERVAL_MS);
    const state = await tryGetOrder(deps, orderId);
    if (state?.status === 'PAID') return { status: 'paid', order: state };
    if (state?.status === 'NEEDS_REVIEW') {
      return {
        status: 'failed',
        code: 'NEEDS_REVIEW',
        message: 'We received your payment but need to review it. Support will contact you.',
      };
    }
  }
  return { status: 'pending', orderId };
}

/**
 * Buys one period of a product: create order -> Razorpay Checkout ->
 * verify, falling back to polling the order whenever the direct
 * confirmation is lost. Resolves (never rejects). Mirrors the web app's
 * BillingService.purchase so both clients behave the same.
 */
export async function runPurchase(
  deps: PurchaseDeps,
  product: BillingProduct,
  interval: BillingInterval,
  prefill?: CheckoutOptions['prefill'],
): Promise<PurchaseOutcome> {
  // One key per attempt: a retried create returns the same order.
  const key = deps.newKey();

  let order: BillingOrder;
  try {
    order = await deps.api.createOrder(product, interval, key);
  } catch (err) {
    if (!isNetworkError(err)) return failed(err);
    try {
      order = await deps.api.createOrder(product, interval, key);
    } catch (retryErr) {
      return failed(retryErr);
    }
  }

  let result: CheckoutResult;
  try {
    result = await deps.openCheckout({
      keyId: order.key_id,
      orderId: order.order_id,
      amountPaise: order.amount_paise,
      currency: order.currency,
      description: describePurchase(product, interval),
      prefill,
    });
  } catch (err) {
    return { status: 'failed', message: getErrorMessage(err, 'Could not open the payment window.') };
  }

  if (result.kind === 'dismissed') {
    // A UPI payment can complete after the sheet closes: check once.
    const state = await tryGetOrder(deps, order.order_id);
    if (state?.status === 'PAID') return { status: 'paid', order: state };
    return result.lastError ? { status: 'failed', message: result.lastError } : { status: 'cancelled' };
  }

  try {
    const state = await deps.api.verifyOrder(result.response);
    if (state?.status === 'PAID') return { status: 'paid', order: state };
  } catch (err) {
    // Signature / mismatch problems are real failures; network, 5xx and
    // "still pending" fall through to polling.
    const status = axios.isAxiosError(err) ? err.response?.status : undefined;
    if (status === 400 || status === 402 || status === 409) return failed(err);
  }
  return pollUntilSettled(deps, order.order_id);
}

export function defaultPurchaseDeps(openCheckout: PurchaseDeps['openCheckout']): PurchaseDeps {
  return {
    api: billingApi,
    openCheckout,
    newKey: () => Crypto.randomUUID(),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
}
