import { NativeModules, TurboModuleRegistry } from 'react-native';
import type { CheckoutSuccess } from '@/src/api/billing';
import { CHECKOUT_THEME, parseCheckoutError, type CheckoutOptions, type CheckoutResult } from '@/src/features/billing/checkoutTypes';

export const CHECKOUT_UNAVAILABLE_MESSAGE =
  'The payment window is not available in this version of the app. Please update the app and try again.';

/** True when the Razorpay native SDK is compiled into this build. It is
 *  missing from any dev client / APK built before react-native-razorpay was
 *  added -- those need a native rebuild, a JS reload is not enough. */
export function isCheckoutAvailable(): boolean {
  return Boolean(TurboModuleRegistry.get('RNRazorpayCheckout') ?? NativeModules.RNRazorpayCheckout);
}

type RazorpayModule = { open(options: Record<string, unknown>): Promise<Record<string, unknown>> };

/** Opens Razorpay's native Checkout (Android/iOS SDK, UPI intent included).
 *  Throws (-> reported as a failed purchase) if the SDK isn't in the build. */
export async function openCheckout(options: CheckoutOptions): Promise<CheckoutResult> {
  if (!isCheckoutAvailable()) {
    throw new Error(CHECKOUT_UNAVAILABLE_MESSAGE);
  }
  // Loaded lazily: importing the SDK without its native module can throw
  // at module load (NativeEventEmitter on iOS) and take the screen down.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RazorpayCheckout = (require('react-native-razorpay') as { default: RazorpayModule }).default;

  let data: Partial<CheckoutSuccess>;
  try {
    data = (await RazorpayCheckout.open({
      key: options.keyId,
      order_id: options.orderId,
      amount: options.amountPaise,
      currency: options.currency,
      name: 'COBILDS',
      description: options.description,
      prefill: options.prefill ?? {},
      theme: { color: CHECKOUT_THEME },
      modal: { confirm_close: true },
    })) as Partial<CheckoutSuccess>;
  } catch (error) {
    // A JS error (not a Razorpay payload) means the sheet never opened --
    // report it rather than treating it as the user cancelling.
    if (error instanceof Error) throw error;
    return { kind: 'dismissed', lastError: parseCheckoutError(error) };
  }

  if (data?.razorpay_payment_id && data.razorpay_signature) {
    return {
      kind: 'success',
      response: {
        razorpay_order_id: data.razorpay_order_id ?? options.orderId,
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_signature: data.razorpay_signature,
      },
    };
  }
  return { kind: 'dismissed' };
}
