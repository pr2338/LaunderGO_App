import { Platform } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { logger } from '../utils/logger';

export interface PaymentPayload {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  purpose?: string;
  orderPayload?: any;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
}

interface PaymentResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

let paymentInProgress = false;

// Razorpay's "user cancelled" code differs per SDK (Android: PAYMENT_CANCELED = 0,
// iOS: paymentCancelled = 2; on Android 2 means NETWORK_ERROR).
const CANCEL_CODE = Platform.OS === 'android' ? 0 : 2;

interface NormalizedError {
  cancelled: boolean;
  message: string;
  reason: string | null;
}

/**
 * The SDK's `description` is often a raw JSON string such as
 * {"error":{"code":"BAD_REQUEST_ERROR","description":"Payment processing cancelled by user","reason":"payment_cancelled"}}
 * Pull out a human-readable message and detect user cancellation (incl. backing out of a UPI app).
 */
function normalizeError(error: any): NormalizedError {
  let message: string = typeof error?.description === 'string' ? error.description : '';
  let reason: string | null = null;
  try {
    const parsed = JSON.parse(message);
    const inner = parsed?.error ?? parsed;
    if (inner?.description) message = String(inner.description);
    if (inner?.reason) reason = String(inner.reason);
  } catch {
    // Plain-text description.
  }

  const cancelled =
    error?.code === CANCEL_CODE ||
    reason === 'payment_cancelled' ||
    /cancel/i.test(message);

  if (cancelled) return { cancelled, message: 'Payment cancelled', reason };
  if (!message || /^BAD_REQUEST_ERROR$/i.test(message) || /^undefined$/i.test(message)) {
    message = 'Payment could not be completed. Please try again.';
  }
  return { cancelled, message, reason };
}

export async function openRazorpay(
  payload: PaymentPayload,
  dispatch: (event: 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'PAYMENT_CANCELLED', detail: unknown) => void
): Promise<void> {
  // Guard against double-taps opening two checkout sheets.
  if (paymentInProgress) return;
  paymentInProgress = true;

  const { purpose, orderPayload, ...options } = payload;
  try {
    const result: PaymentResult = await RazorpayCheckout.open(options);
    logger.log('[PAYMENT] Success:', result.razorpay_payment_id);
    dispatch('PAYMENT_SUCCESS', {
      razorpay_payment_id: result.razorpay_payment_id,
      razorpay_order_id: result.razorpay_order_id,
      razorpay_signature: result.razorpay_signature,
      purpose: purpose || '',
      amount: payload.amount / 100,
      orderPayload: orderPayload ?? null,
    });
  } catch (error: any) {
    const { cancelled, message, reason } = normalizeError(error);
    logger.log('[PAYMENT]', cancelled ? 'Cancelled:' : 'Failed:', error?.code, error?.description);
    const detail = { error: message, cancelled, reason, code: error?.code ?? null, purpose: purpose || '' };
    if (cancelled) {
      // Lets the web app treat a cancel as a non-error (no red toast).
      dispatch('PAYMENT_CANCELLED', detail);
    }
    // Still sent on cancel: the web checkout resets its loading state on this event.
    dispatch('PAYMENT_FAILED', detail);
  } finally {
    paymentInProgress = false;
  }
}
