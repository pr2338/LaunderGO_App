export const INJECTED_JAVASCRIPT = `
(function() {
  var meta = document.querySelector('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'viewport');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');

  document.documentElement.style.overflowX = 'hidden';
  document.body.style.overflowX = 'hidden';
  document.body.style.width = '100%';
  document.body.style.maxWidth = '100vw';

  var lastTouchEnd = 0;
  document.addEventListener('touchend', function(e) {
    var now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  navigator.geolocation = {
    getCurrentPosition: function(success, error) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'GET_LOCATION' }));
      window._geoSuccess = success;
      window._geoError = error;
    },
    watchPosition: function(success, error) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'GET_LOCATION' }));
      window._geoSuccess = success;
      window._geoError = error;
      return 1;
    },
    clearWatch: function() {}
  };

  navigator.vibrate = function(pattern) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'VIBRATE', pattern: pattern || 15 }));
    return true;
  };

  var clickTargets = 'button, a, [role="button"], input[type="submit"], input[type="button"], .btn, [onclick]';
  
  document.addEventListener('touchstart', function(e) {
    var el = e.target;
    while (el && el !== document.body) {
      if (el.matches && el.matches(clickTargets)) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'VIBRATE', pattern: 10 }));
        return;
      }
      el = el.parentElement;
    }
  }, { passive: true, capture: true });

  document.addEventListener('click', function(e) {
    var el = e.target;
    while (el && el.tagName !== 'INPUT') el = el.parentElement;
    if (el && el.tagName === 'INPUT' && el.type === 'file') {
      var accept = el.getAttribute('accept') || '';
      var capture = el.getAttribute('capture') || '';
      if (accept.includes('image') || accept === '*' || accept === '') {
        e.preventDefault();
        e.stopPropagation();
        var id = el.id || ('__fi_' + Date.now());
        if (!el.id) el.id = id;
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'OPEN_CAMERA',
          mode: capture ? 'camera' : 'picker',
          inputId: id,
          multiple: el.multiple || false
        }));
      }
    }
  }, true);

  window.isNativeApp = true;
})();
true;
window.openRazorpay = function(data) {
  window.ReactNativeWebView.postMessage(JSON.stringify({
    type: 'RAZORPAY_PAYMENT',
    payload: data
  }));
};
`;

interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

export function createLocationSuccessScript(coords: LocationCoords): string {
  return `
    window._geoSuccess && window._geoSuccess({
      coords: {
        latitude: ${coords.latitude},
        longitude: ${coords.longitude},
        accuracy: ${coords.accuracy || 0}
      },
      timestamp: ${coords.timestamp}
    });
    true;
  `;
}

export function createLocationErrorScript(): string {
  return `window._geoError && window._geoError({ code: 2, message: 'Position unavailable' }); true;`;
}

export function createImageInjectionScript(inputId: string, base64: string): string {
  return `
    (function() {
      var input = document.getElementById('${inputId}');
      if (!input) return;
      var byteStr = atob('${base64}');
      var ab = new ArrayBuffer(byteStr.length);
      var ia = new Uint8Array(ab);
      for (var i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i);
      var file = new File([new Blob([ab], { type: 'image/jpeg' })], 'photo.jpg', { type: 'image/jpeg' });
      var dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    })();
    true;
  `;
}

export function createPushTokenScript(token: string | null): string {
  return `window._pushToken = ${token ? `'${token}'` : 'null'}; true;`;
}

export function createNavigationScript(url: string): string {
  return `window.location.href = '${url}'; true;`;
}
