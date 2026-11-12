import { apiClient } from '@/src/api/client';

// Mirrors Backend-tech internal/billing + handler/billing.go. Same API the
// web /subscription page uses: create order -> Razorpay Checkout -> verify,
// with GET /billing/orders/:id as the fallback (it reconciles with Razorpay
// server-side, so a lost confirmation is never a lost payment).

export type BillingProduct = 'VERIFIED' | 'PREMIUM';
export type BillingInterval = 'YEAR' | 'MONTH';
export type BillingTier = 'FREE' | 'VERIFIED' | 'PREMIUM';
export type PaymentStatus = 'CREATED' | 'PAID' | 'FAILED' | 'NEEDS_REVIEW' | 'REFUNDED';

export interface ProductStatus {
  product: BillingProduct;
  active: boolean;
  valid_until: string | null;
  renewable_from: string | null;
  can_renew: boolean;
  expired_at: string | null;
  /** Free (freemium) access: the backend hides its dates -- show "Free
   *  access" and never an end date. */
  trial?: boolean;
}

export interface FeatureAccess {
  key: string;
  label: string;
  kind: 'BOOL' | 'LIMIT';
  enabled: boolean;
  limit: number;
}

export interface BillingMe {
  tier: BillingTier;
  role: string;
  enforced: boolean;
  verified: ProductStatus;
  premium: ProductStatus;
  features: FeatureAccess[];
  /** Freemium: present while this user can still "Claim it free";
   *  claim_products are what a claim gives. */
  claim_offer?: import('@/src/api/freemium').FreemiumOffer;
  claim_products?: BillingProduct[];
}

export interface PlanPrice {
  interval: BillingInterval;
  amount_paise: number;
  currency: string;
}

export interface PlanProduct {
  product: BillingProduct;
  tier: BillingTier;
  prices: PlanPrice[];
  features: FeatureAccess[];
}

export interface BillingPlans {
  role: string;
  free_features: FeatureAccess[];
  products: PlanProduct[];
}

export interface BillingOrder {
  order_id: string;
  amount_paise: number;
  currency: string;
  key_id: string;
  product: BillingProduct;
  interval: BillingInterval;
}

export interface OrderState {
  order_id: string;
  product: BillingProduct;
  interval: BillingInterval;
  amount_paise: number;
  currency: string;
  status: PaymentStatus;
  paid_at: string | null;
  tier: BillingTier;
  verified: ProductStatus;
  premium: ProductStatus;
}

export interface CheckoutSuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface BillingPayment {
  ID: number;
  CreatedAt: string;
  product: BillingProduct;
  interval: BillingInterval;
  amount_paise: number;
  currency: string;
  status: PaymentStatus;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  paid_at?: string;
  failure_reason?: string;
}

export interface BillingReceipt {
  number: string;
  issued_at: string;
  customer_name: string;
  customer_email: string;
  product: BillingProduct;
  interval: BillingInterval;
  period_start: string | null;
  period_end: string | null;
  amount_paise: number;
  currency: string;
  status: PaymentStatus;
  refunded_at?: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
}

export const billingApi = {
  me: () => apiClient.get<BillingMe>('/billing/me').then((r) => r.data),
  plans: () => apiClient.get<BillingPlans>('/billing/plans').then((r) => r.data),
  createOrder: (product: BillingProduct, interval: BillingInterval, idempotencyKey: string) =>
    apiClient
      .post<BillingOrder>('/billing/orders', { product, interval, idempotency_key: idempotencyKey })
      .then((r) => r.data),
  verifyOrder: (payload: CheckoutSuccess) =>
    apiClient.post<OrderState>('/billing/orders/verify', payload).then((r) => r.data),
  getOrder: (orderId: string) =>
    apiClient.get<OrderState>(`/billing/orders/${encodeURIComponent(orderId)}`).then((r) => r.data),
  payments: () =>
    apiClient.get<{ payments: BillingPayment[] }>('/billing/payments').then((r) => r.data.payments ?? []),
  receipt: (paymentId: number) =>
    apiClient.get<BillingReceipt>(`/billing/payments/${paymentId}/receipt`).then((r) => r.data),
};
