import { Platform } from 'react-native';
import { APP_CONFIG } from '../config/constants';

// Runs at document start (before <head>/<body> exist), on every full page load.
// Anything touching the DOM must wait for DOMContentLoaded; a throw here would
// silently disable the whole bridge.
export const INJECTED_JAVASCRIPT = `
(function() {
  if (window.__laundergoBridge) return;
  window.__laundergoBridge = true;

  function post(msg) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); } catch (e) {}
  }

  window.isNativeApp = true;
  window.nativeApp = { platform: ${JSON.stringify(Platform.OS)}, version: ${JSON.stringify(APP_CONFIG.appVersion)} };

  // ── Keep ?platform=app on every same-site URL ────────────────────────
  // Full page loads are rewritten natively (App.tsx); this covers client-side
  // routing (Next.js router.push / <Link>), which never reaches native code.
  function withPlatform(url) {
    try {
      var u = new URL(url, location.href);
      if (u.origin !== location.origin || u.searchParams.get('platform') === 'app') return url;
      u.searchParams.set('platform', 'app');
      return u.href;
    } catch (e) { return url; }
  }
  ['pushState', 'replaceState'].forEach(function(method) {
    var original = history[method];
    history[method] = function(state, title, url) {
      if (url !== undefined && url !== null) url = withPlatform(String(url));
      return original.call(this, state, title, url);
    };
  });
  if (location.protocol === 'https:') {
    var current = withPlatform(location.href);
    if (current !== location.href) history.replaceState(history.state, '', current);
  }

  // ── Geolocation → native ─────────────────────────────────────────────
  var geoPending = [];
  window._geoResolve = function(ok, payload) {
    var pending = geoPending; geoPending = [];
    pending.forEach(function(p) {
      try {
        if (ok) p.success && p.success(payload);
        else p.error && p.error(payload);
      } catch (e) {}
    });
  };
  var nativeGeo = {
    getCurrentPosition: function(success, error) {
      geoPending.push({ success: success, error: error });
      post({ type: 'GET_LOCATION' });
    },
    watchPosition: function(success, error) {
      geoPending.push({ success: success, error: error });
      post({ type: 'GET_LOCATION' });
      return 1;
    },
    clearWatch: function() {}
  };
  // navigator.geolocation is a getter-only property: plain assignment is ignored.
  try {
    Object.defineProperty(navigator, 'geolocation', { value: nativeGeo, configurable: true });
  } catch (e) {
    try {
      navigator.geolocation.getCurrentPosition = nativeGeo.getCurrentPosition;
      navigator.geolocation.watchPosition = nativeGeo.watchPosition;
      navigator.geolocation.clearWatch = nativeGeo.clearWatch;
    } catch (e2) {}
  }

  // ── Haptics ──────────────────────────────────────────────────────────
  try {
    Object.defineProperty(navigator, 'vibrate', {
      value: function(pattern) { post({ type: 'VIBRATE', pattern: pattern || 15 }); return true; },
      configurable: true
    });
  } catch (e) {}

  var clickTargets = 'button, a, [role="button"], input[type="submit"], input[type="button"], .btn';
  document.addEventListener('click', function(e) {
    var el = e.target && e.target.closest ? e.target.closest(clickTargets) : null;
    if (el) post({ type: 'VIBRATE', pattern: 10 });
  }, { passive: true, capture: true });

  // ── Image file inputs → native camera / photo picker ────────────────
  document.addEventListener('click', function(e) {
    var el = e.target && e.target.closest ? e.target.closest('input[type="file"]') : null;
    if (!el) return;
    var accept = el.getAttribute('accept') || '';
    if (accept && accept.indexOf('image') === -1 && accept !== '*' && accept !== '*/*') return;
    e.preventDefault();
    e.stopPropagation();
    if (!el.id) el.id = '__fi_' + Date.now();
    post({
      type: 'OPEN_CAMERA',
      mode: el.hasAttribute('capture') ? 'camera' : 'picker',
      inputId: el.id,
      multiple: !!el.multiple
    });
  }, true);

  // ── Payments ─────────────────────────────────────────────────────────
  window.openRazorpay = function(data) {
    post({ type: 'RAZORPAY_PAYMENT', payload: data });
  };

  // ── DOM tweaks (need <head>/<body>) ──────────────────────────────────
  function onDomReady() {
    try {
      var meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'viewport');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');

      var style = document.createElement('style');
      // touch-action removes the double-tap-zoom delay without swallowing fast taps
      style.textContent = 'html,body{overflow-x:hidden;max-width:100vw;-webkit-tap-highlight-color:transparent}' +
        '*{touch-action:manipulation}';
      document.head.appendChild(style);
    } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onDomReady);
  } else {
    onDomReady();
  }
})();
true;
`;

interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

export function createLocationSuccessScript(coords: LocationCoords): string {
  const position = {
    coords: {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy || 0,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: coords.timestamp,
  };
  return `window._geoResolve && window._geoResolve(true, ${JSON.stringify(position)}); true;`;
}

export function createLocationErrorScript(code: 1 | 2 | 3 = 2): string {
  const messages = { 1: 'User denied Geolocation', 2: 'Position unavailable', 3: 'Timeout' };
  const error = { code, message: messages[code], PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 };
  return `window._geoResolve && window._geoResolve(false, ${JSON.stringify(error)}); true;`;
}

export interface InjectedImage {
  base64: string;
  mimeType: string;
  fileName: string;
}

export function createImageInjectionScript(inputId: string, images: InjectedImage[]): string {
  return `
    (function() {
      var input = document.getElementById(${JSON.stringify(inputId)});
      if (!input) return;
      var images = ${JSON.stringify(images)};
      var dt = new DataTransfer();
      images.forEach(function(img) {
        var byteStr = atob(img.base64);
        var bytes = new Uint8Array(byteStr.length);
        for (var i = 0; i < byteStr.length; i++) bytes[i] = byteStr.charCodeAt(i);
        dt.items.add(new File([bytes], img.fileName, { type: img.mimeType }));
      });
      input.files = dt.files;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    })();
    true;
  `;
}

/** Dispatches a CustomEvent on window. `detail` is JSON-encoded, so it is injection-safe. */
export function createEventScript(name: string, detail: unknown): string {
  return `window.dispatchEvent(new CustomEvent(${JSON.stringify(name)}, { detail: ${JSON.stringify(detail ?? null)} })); true;`;
}

/** Calls window[fnName](...args) if the web app defined it. Args are JSON-encoded. */
export function createCallbackScript(fnName: string, ...args: unknown[]): string {
  const name = JSON.stringify(fnName);
  const argList = args.map(a => JSON.stringify(a ?? null)).join(', ');
  return `(function(){ var fn = window[${name}]; if (typeof fn === 'function') fn(${argList}); })(); true;`;
}

export function createNavigationScript(url: string): string {
  return `window.location.href = ${JSON.stringify(url)}; true;`;
}
