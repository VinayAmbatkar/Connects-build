import { useCallback, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { billingApi, type BillingInterval, type BillingProduct } from '@/src/api/billing';
import { formatIstDate } from '@/src/features/billing/billingLogic';
import { defaultPurchaseDeps, runPurchase, type PurchaseOutcome } from '@/src/features/billing/purchase';
import {
  CHECKOUT_UNAVAILABLE_MESSAGE,
  isCheckoutAvailable,
  openCheckout,
} from '@/src/features/billing/razorpay';
import { useAuthStore } from '@/src/store/authStore';

import { appAlert } from '@/src/components/AppDialog';
const PENDING_WATCH_ATTEMPTS = 12;
const PENDING_WATCH_INTERVAL_MS = 15000;

export const purchaseKey = (product: BillingProduct, interval: BillingInterval) => `${product}:${interval}`;

/**
 * The one place a purchase starts from the app. Only one checkout can be
 * open at a time; outcomes are reported the same way everywhere.
 */
export function usePurchase() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [busy, setBusy] = useState<string | null>(null);
  const busyRef = useRef(false);

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['billing-me'] });
    void queryClient.invalidateQueries({ queryKey: ['billing-payments'] });
    void queryClient.invalidateQueries({ queryKey: ['verification-status'] });
  }, [queryClient]);

  const report = useCallback(
    (outcome: PurchaseOutcome) => {
      switch (outcome.status) {
        case 'paid': {
          const isPremium = outcome.order.product === 'PREMIUM';
          const status = isPremium ? outcome.order.premium : outcome.order.verified;
          refresh();
          appAlert(
            'Payment successful',
            isPremium
              ? `Premium is active until ${formatIstDate(status.valid_until)}.`
              : `Your Verified membership is active until ${formatIstDate(status.valid_until)}. Complete verification (KYC) to get your badge.`,
          );
          break;
        }
        case 'pending':
          appAlert(
            'Payment processing',
            "We're confirming your payment with the bank. Your plan updates here automatically -- you don't need to pay again.",
          );
          break;
        case 'cancelled':
          break;
        case 'failed':
          appAlert('Payment not completed', outcome.message);
          break;
      }
    },
    [refresh],
  );

  const watchPending = useCallback(
    (orderId: string, attempt = 0) => {
      if (attempt >= PENDING_WATCH_ATTEMPTS) return;
      setTimeout(() => {
        billingApi
          .getOrder(orderId)
          .then((state) => {
            if (state.status === 'PAID') report({ status: 'paid', order: state });
            else if (state.status === 'CREATED' || state.status === 'FAILED') watchPending(orderId, attempt + 1);
          })
          .catch(() => watchPending(orderId, attempt + 1));
      }, PENDING_WATCH_INTERVAL_MS);
    },
    [report],
  );

  const buy = useCallback(
    async (product: BillingProduct, interval: BillingInterval): Promise<PurchaseOutcome> => {
      if (busyRef.current) return { status: 'cancelled' };
      if (!isCheckoutAvailable()) {
        // Checked before creating an order, so an old build doesn't leave
        // an unpaid order behind on every tap.
        appAlert('Payment unavailable', CHECKOUT_UNAVAILABLE_MESSAGE);
        return { status: 'failed', message: CHECKOUT_UNAVAILABLE_MESSAGE };
      }
      busyRef.current = true;
      setBusy(purchaseKey(product, interval));
      try {
        const prefill = {
          name: user?.fullName || undefined,
          email: user?.email || undefined,
        };
        const outcome = await runPurchase(defaultPurchaseDeps(openCheckout), product, interval, prefill);
        report(outcome);
        if (outcome.status === 'pending') watchPending(outcome.orderId);
        return outcome;
      } finally {
        busyRef.current = false;
        setBusy(null);
      }
    },
    [report, watchPending, user],
  );

  return { buy, busy };
}
