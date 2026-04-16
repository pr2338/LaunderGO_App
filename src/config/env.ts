type Environment = 'development' | 'production';

interface EnvConfig {
  env: Environment;
  apiBaseUrl: string;
  webviewUrl: string;
  baseUrl: string;
  enableLogging: boolean;
  razorpayKeyId: string;
}

const DEV: EnvConfig = {
  env: 'development',
  apiBaseUrl: 'https://laundergo.in/api',
  webviewUrl: 'https://laundergo.in/schedule',
  baseUrl: 'https://laundergo.in',
  enableLogging: true,
  razorpayKeyId: 'rzp_test_XXXXXXXXXX',
};

const PROD: EnvConfig = {
  env: 'production',
  apiBaseUrl: 'https://laundergo.in/api',
  webviewUrl: 'https://laundergo.in/schedule',
  baseUrl: 'https://laundergo.in',
  enableLogging: false,
  razorpayKeyId: 'rzp_live_XXXXXXXXXX',
};

const ENV: Environment = __DEV__ ? 'development' : 'production';

const ENV_MAP: Record<Environment, EnvConfig> = {
  development: DEV,
  production: PROD,
};

export const env = ENV_MAP[ENV];
