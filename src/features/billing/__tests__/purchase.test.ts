import { AxiosError, AxiosHeaders } from 'axios';
import type { BillingOrder, OrderState, ProductStatus } from '@/src/api/billing';
import { parseCheckoutError } from '@/src/features/billing/checkoutTypes';
import { POLL_ATTEMPTS, runPurchase, type PurchaseDeps } from '@/src/features/billing/purchase';

jest.mock('expo-crypto', () => ({ randomUUID: () => 'uuid-1' }));

const inactive: ProductStatus = {
  product: 'VERIFIED',
  active: false,
  valid_until: null,
  renewable_from: null,
  can_renew: false,
  expired_at: null,
};

const order: BillingOrder = {
  order_id: 'order_1',
  amount_paise: 189900,
  currency: 'INR',
  key_id: 'rzp_test_x',
  product: 'VERIFIED',
  interval: 'YEAR',
};

function state(status: OrderState['status']): OrderState {
  return {
    order_id: 'order_1',
    product: 'VERIFIED',
    interval: 'YEAR',
    amount_paise: 189900,
    currency: 'INR',
    status,
    paid_at: status === 'PAID' ? '2026-11-06T10:00:00Z' : null,
    tier: status === 'PAID' ? 'VERIFIED' : 'FREE',
    verified: { ...inactive, active: status === 'PAID', valid_until: status === 'PAID' ? '2027-11-06T00:00:00Z' : null },
    premium: { ...inactive, product: 'PREMIUM' },
  };
}

function httpError(status: number, data: unknown = {}) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('fail', String(status), config, {}, { status, statusText: '', headers: {}, config, data });
}

function networkError() {
  return new AxiosError('Network Error', 'ERR_NETWORK', { headers: new AxiosHeaders() });
}

const success = {
  kind: 'success' as const,
  response: { razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: 'sig' },
};

function deps(overrides: Partial<PurchaseDeps['api']> = {}, checkout: PurchaseDeps['openCheckout'] = async () => success): PurchaseDeps {
  return {
    api: {
      createOrder: jest.fn(async () => order),
      verifyOrder: jest.fn(async () => state('PAID')),
      getOrder: jest.fn(async () => state('CREATED')),
      ...overrides,
    },
    openCheckout: jest.fn(checkout),
    newKey: () => 'key-1',
    sleep: async () => undefined,
  };
}

describe('runPurchase', () => {
  it('pays: create order -> checkout -> verify', async () => {
    const d = deps();
    const out = await runPurchase(d, 'VERIFIED', 'YEAR', { name: 'Asha' });
    expect(out.status).toBe('paid');
    expect(d.api.createOrder).toHaveBeenCalledWith('VERIFIED', 'YEAR', 'key-1');
    expect(d.openCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ keyId: 'rzp_test_x', orderId: 'order_1', amountPaise: 189900, prefill: { name: 'Asha' } }),
    );
    expect(d.api.verifyOrder).toHaveBeenCalledWith(success.response);
  });

  it('retries order creation once with the same idempotency key on a network error', async () => {
    const createOrder = jest.fn().mockRejectedValueOnce(networkError()).mockResolvedValueOnce(order);
    const d = deps({ createOrder });
    const out = await runPurchase(d, 'VERIFIED', 'YEAR');
    expect(out.status).toBe('paid');
    expect(createOrder).toHaveBeenCalledTimes(2);
    expect(createOrder.mock.calls[0][2]).toBe(createOrder.mock.calls[1][2]);
  });

  it('reports a create-order rejection without opening checkout', async () => {
    const d = deps({ createOrder: jest.fn().mockRejectedValue(httpError(409, { error: 'Already active', code: 'ALREADY_ACTIVE' })) });
    const out = await runPurchase(d, 'VERIFIED', 'YEAR');
    expect(out).toEqual({ status: 'failed', code: 'ALREADY_ACTIVE', message: 'Already active' });
    expect(d.openCheckout).not.toHaveBeenCalled();
  });

  it('treats a dismissed sheet as paid when the UPI payment landed anyway', async () => {
    const d = deps({ getOrder: jest.fn(async () => state('PAID')) }, async () => ({ kind: 'dismissed' }));
    expect((await runPurchase(d, 'VERIFIED', 'YEAR')).status).toBe('paid');
  });

  it('is cancelled when the user closes the sheet and nothing was paid', async () => {
    const d = deps({}, async () => ({ kind: 'dismissed' }));
    expect(await runPurchase(d, 'VERIFIED', 'YEAR')).toEqual({ status: 'cancelled' });
  });

  it('surfaces the last checkout error when the sheet closes after a failure', async () => {
    const d = deps({}, async () => ({ kind: 'dismissed', lastError: 'Card declined' }));
    expect(await runPurchase(d, 'VERIFIED', 'YEAR')).toEqual({ status: 'failed', message: 'Card declined' });
  });

  it('fails on a signature mismatch instead of polling', async () => {
    const d = deps({ verifyOrder: jest.fn().mockRejectedValue(httpError(400, { error: 'signature mismatch' })) });
    const out = await runPurchase(d, 'VERIFIED', 'YEAR');
    expect(out).toEqual({ status: 'failed', code: undefined, message: 'signature mismatch' });
    expect(d.api.getOrder).not.toHaveBeenCalled();
  });

  it('polls the order when verification is lost, and settles once it is paid', async () => {
    const getOrder = jest.fn().mockResolvedValueOnce(state('CREATED')).mockResolvedValueOnce(state('PAID'));
    const d = deps({ verifyOrder: jest.fn().mockRejectedValue(networkError()), getOrder });
    expect((await runPurchase(d, 'VERIFIED', 'YEAR')).status).toBe('paid');
    expect(getOrder).toHaveBeenCalledTimes(2);
  });

  it('reports pending (never failed) when the payment is still unconfirmed after polling', async () => {
    const getOrder = jest.fn(async () => state('CREATED'));
    const d = deps({ verifyOrder: jest.fn().mockRejectedValue(httpError(503)), getOrder });
    expect(await runPurchase(d, 'VERIFIED', 'YEAR')).toEqual({ status: 'pending', orderId: 'order_1' });
    expect(getOrder).toHaveBeenCalledTimes(POLL_ATTEMPTS);
  });

  it('stops polling with a review message when the order needs review', async () => {
    const d = deps({ verifyOrder: jest.fn().mockRejectedValue(httpError(500)), getOrder: jest.fn(async () => state('NEEDS_REVIEW')) });
    const out = await runPurchase(d, 'PREMIUM', 'MONTH');
    expect(out).toMatchObject({ status: 'failed', code: 'NEEDS_REVIEW' });
  });
});

describe('parseCheckoutError', () => {
  it('treats a user cancel as no error', () => {
    expect(parseCheckoutError({ code: 0, description: 'Payment cancelled by user' })).toBeUndefined();
    expect(
      parseCheckoutError({
        code: 2,
        description: JSON.stringify({ error: { description: 'Payment processing cancelled by user', reason: 'payment_cancelled' } }),
      }),
    ).toBeUndefined();
    expect(parseCheckoutError(undefined)).toBeUndefined();
  });

  it('returns the real failure text, plain or JSON-encoded', () => {
    expect(parseCheckoutError({ description: 'Card declined by bank' })).toBe('Card declined by bank');
    expect(
      parseCheckoutError({ description: JSON.stringify({ error: { description: 'Insufficient funds', reason: 'payment_failed' } }) }),
    ).toBe('Insufficient funds');
    expect(parseCheckoutError({ error: { description: 'UPI app timed out' } })).toBe('UPI app timed out');
  });
});
