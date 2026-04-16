import RazorpayCheckout from 'react-native-razorpay';
import { WebView } from 'react-native-webview';
import { RefObject } from 'react';

interface PaymentPayload {
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

export function openRazorpay(
  webViewRef: RefObject<WebView>,
  payload: PaymentPayload
): void {
  const { purpose, orderPayload, ...options } = payload;

  RazorpayCheckout.open(options)
    .then((result: PaymentResult) => {
      console.log('[PAYMENT] Success:', result.razorpay_payment_id);
      webViewRef.current?.injectJavaScript(`
        window.dispatchEvent(new CustomEvent('PAYMENT_SUCCESS', {
          detail: {
            razorpay_payment_id: '${result.razorpay_payment_id}',
            razorpay_order_id: '${result.razorpay_order_id}',
            razorpay_signature: '${result.razorpay_signature}',
            purpose: '${purpose || ''}',
            amount: ${payload.amount / 100},
            orderPayload: ${JSON.stringify(orderPayload || null)}
          }
        }));
        true;
      `);
    })
    .catch((error: { code: number; description: string }) => {
      console.log('[PAYMENT] Failed:', error.code, error.description);
      webViewRef.current?.injectJavaScript(`
        window.dispatchEvent(new CustomEvent('PAYMENT_FAILED', {
          detail: { error: '${error.description || 'Payment failed'}' }
        }));
        true;
      `);
    });
}
