import { ALLOWED_HOSTS, APP_CONFIG, TRUSTED_BRIDGE_HOSTS } from '../config/constants';

function getHost(url: string): string | null {
  const match = /^https:\/\/([^/?#:]+)/i.exec(url);
  return match ? match[1].toLowerCase() : null;
}

function hostMatches(host: string, allowed: string[]): boolean {
  return allowed.some(h => host === h || host.endsWith('.' + h));
}

export function isAllowedInWebView(url: string): boolean {
  const host = getHost(url);
  return !!host && hostMatches(host, ALLOWED_HOSTS);
}

export function isTrustedBridgeOrigin(url: string | undefined): boolean {
  if (!url) return false;
  const host = getHost(url);
  return !!host && hostMatches(host, TRUSTED_BRIDGE_HOSTS);
}

const PLATFORM_PARAM = /[?&]platform=app(?:&|#|$)/;

export function hasPlatformParam(url: string): boolean {
  return PLATFORM_PARAM.test(url.split('#')[0] + '#');
}

/** Adds platform=app to the query string, keeping any #hash. Idempotent. */
export function withPlatformParam(url: string): string {
  if (hasPlatformParam(url)) return url;
  const hashIndex = url.indexOf('#');
  const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : url.slice(hashIndex);
  const existing = /([?&])platform=[^&]*/;
  if (existing.test(base)) return base.replace(existing, '$1platform=app') + hash;
  const sep = base.includes('?') ? (base.endsWith('?') || base.endsWith('&') ? '' : '&') : '?';
  return `${base}${sep}platform=app${hash}`;
}

/**
 * Resolves a notification deep link ("/orders/12" or "https://laundergo.in/...")
 * to an absolute laundergo.in URL carrying platform=app. Returns null for anything off-site.
 */
export function resolveAppUrl(pathOrUrl: string): string | null {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith('/') && !pathOrUrl.startsWith('//')) {
    return withPlatformParam(APP_CONFIG.baseUrl + pathOrUrl);
  }
  return isTrustedBridgeOrigin(pathOrUrl) ? withPlatformParam(pathOrUrl) : null;
}
