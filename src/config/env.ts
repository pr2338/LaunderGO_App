type Environment = 'development' | 'production';

interface EnvConfig {
  env: Environment;
  apiBaseUrl: string;
  webviewUrl: string;
  baseUrl: string;
  enableLogging: boolean;
}

// The web app serves the mobile UI when it sees ?platform=app. The native
// User-Agent suffix (see APP_CONFIG.userAgentSuffix) identifies the app on
// every later request, after client-side navigation drops the query param.
const DEV: EnvConfig = {
  env: 'development',
  apiBaseUrl: 'https://laundergo.in/api',
  webviewUrl: 'https://laundergo.in/?platform=app',
  baseUrl: 'https://laundergo.in',
  enableLogging: true,
};

const PROD: EnvConfig = {
  env: 'production',
  apiBaseUrl: 'https://laundergo.in/api',
  webviewUrl: 'https://laundergo.in/?platform=app',
  baseUrl: 'https://laundergo.in',
  enableLogging: false,
};

const ENV: Environment = __DEV__ ? 'development' : 'production';

const ENV_MAP: Record<Environment, EnvConfig> = {
  development: DEV,
  production: PROD,
};

export const env = ENV_MAP[ENV];
