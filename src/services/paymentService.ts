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

export async function openRazorpay(
  payload: PaymentPayload,
  dispatch: (event: 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED', detail: unknown) => void
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
    logger.log('[PAYMENT] Failed:', error?.code, error?.description);
    dispatch('PAYMENT_FAILED', {
      error: error?.description || 'Payment failed',
      code: error?.code ?? null,
    });
  } finally {
    paymentInProgress = false;
  }
}
