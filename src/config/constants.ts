import { env } from './env';

export const APP_CONFIG = {
  webviewUrl: env.webviewUrl,
  baseUrl: env.baseUrl,
  apiBaseUrl: env.apiBaseUrl,
  primaryColor: '#1A9999',
  backgroundColor: '#FFFFFF',
} as const;

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