import type { CheckoutSuccess } from '@/src/api/billing';
import { CHECKOUT_THEME, type CheckoutOptions, type CheckoutResult } from '@/src/features/billing/checkoutTypes';

// Web build (react-native-web): the native SDK isn't available, so load
// Razorpay's checkout.js on first use -- same as the Angular web app.
// iOS/Android resolve razorpay.native.ts instead.

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

type RazorpayCtor = new (options: Record<string, unknown>) => {
  open(): void;
  on(event: 'payment.failed', handler: (resp: { error?: { description?: string } }) => void): void;
};

let scriptPromise: Promise<void> | null = null;

function getCtor(): RazorpayCtor | undefined {
  return (globalThis as unknown as { Razorpay?: RazorpayCtor }).Razorpay;
}

function load(): Promise<void> {
  if (getCtor()) return Promise.resolve();
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('Payments are not available here.'));
  }
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CHECKOUT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        script.remove();
        reject(new Error('Could not load the payment window. Check your connection and try again.'));
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

export const CHECKOUT_UNAVAILABLE_MESSAGE = 'Payments are not available here.';

/** checkout.js loads on demand, so the web build can always try. */
export function isCheckoutAvailable(): boolean {
  return typeof document !== 'undefined';
}

export async function openCheckout(options: CheckoutOptions): Promise<CheckoutResult> {
  await load();
  const Razorpay = getCtor();
  if (!Razorpay) throw new Error('Payment window is unavailable.');

  return new Promise<CheckoutResult>((resolve) => {
    let lastError: string | undefined;
    const rzp = new Razorpay({
      key: options.keyId,
      order_id: options.orderId,
      amount: options.amountPaise,
      currency: options.currency,
      name: 'COBILDS',
      description: options.description,
      prefill: options.prefill ?? {},
      theme: { color: CHECKOUT_THEME },
      handler: (response: CheckoutSuccess) => resolve({ kind: 'success', response }),
      modal: {
        ondismiss: () => resolve({ kind: 'dismissed', lastError }),
        confirm_close: true,
      },
    });
    rzp.on('payment.failed', (resp) => {
      lastError = resp?.error?.description || 'Payment failed.';
    });
    rzp.open();
  });
}
