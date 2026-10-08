import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { env } from './env';

const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

export const APP_CONFIG = {
  webviewUrl: env.webviewUrl,
  baseUrl: env.baseUrl,
  apiBaseUrl: env.apiBaseUrl,
  primaryColor: '#1A9999',
  backgroundColor: '#FFFFFF',
  appVersion: APP_VERSION,
  // Appended to the WebView User-Agent so the Next.js server/middleware can
  // detect the native app on every request, e.g. /LaunderGoApp\//.test(ua)
  userAgentSuffix: `LaunderGoApp/${APP_VERSION} (${Platform.OS})`,
} as const;

// Hosts the WebView may load as a top-level page. Anything else opens in the
// system browser / handling app. Subdomains of these hosts are also allowed.
export const ALLOWED_HOSTS = [
  'laundergo.in',
  'google.com',
  'gstatic.com',
  'recaptcha.net',
  'razorpay.com',
];

// Only pages on these hosts may talk to the native bridge (auth, payments...).
export const TRUSTED_BRIDGE_HOSTS = ['laundergo.in'];

export const NOTIFICATION_CONFIG = {
  channelId: 'laundergo-notifications',
  channelName: 'LaunderGo',
  vibrationPattern: [0, 250, 250, 250] as number[],
};

export const MESSAGE_TYPES = {
  GET_LOCATION: 'GET_LOCATION',
  OPEN_CAMERA: 'OPEN_CAMERA',
  VIBRATE: 'VIBRATE',
  AUTH_TOKEN: 'auth_token',
  USER_LOGOUT: 'logout',
  REQUEST_PUSH_TOKEN: 'request_push_token',
  ENABLE_DRIVER_MODE: 'ENABLE_DRIVER_MODE',
  DISABLE_DRIVER_MODE: 'DISABLE_DRIVER_MODE',
  RAZORPAY_PAYMENT: 'RAZORPAY_PAYMENT',
  SET_THEME: 'SET_THEME',
} as const;
