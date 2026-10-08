import React, { useState, useRef, useCallback, useEffect } from 'react';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar';
import { StyleSheet, View, Linking, Platform, Vibration, ToastAndroid, AppState } from 'react-native';
import { WebView, WebViewNavigation, WebViewMessageEvent } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { APP_CONFIG, MESSAGE_TYPES } from './src/config/constants';
import { useBackHandler } from './src/hooks/useBackHandler';
import { getCurrentLocation } from './src/services/location';
import { launchCamera, launchImageLibrary } from './src/services/camera';
import { ErrorScreen } from './src/components/ErrorScreen';
import { LoadingBar, type LoadingBarHandle } from './src/components/LoadingBar';
import {
  INJECTED_JAVASCRIPT,
  createLocationSuccessScript,
  createLocationErrorScript,
  createImageInjectionScript,
  createEventScript,
  createCallbackScript,
  createNavigationScript,
  createInAppNavigationScript,
} from './src/utils/webview-bridge';
import type { WebViewMessage } from './src/types/messages';
import { getFCMToken, setupFCMListeners, onTokenRefresh } from './src/services/notificationService';
import { requestPermissionsInOrder } from './src/services/permissions';
import { requestDriverPermissions, startTracking, stopTracking } from './src/services/driverTracking';
import { openRazorpay } from './src/services/paymentService';
import {
  isAllowedInWebView,
  isTrustedBridgeOrigin,
  resolveAppUrl,
  hasPlatformParam,
  withPlatformParam,
} from './src/utils/url';
import { logger } from './src/utils/logger';
import { tapHaptic, successHaptic, alertHaptic } from './src/utils/haptics';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Never leave the user staring at the splash if the site is slow to respond.
const SPLASH_MAX_MS = 8000;
const DEVICE_ID_KEY = 'laundergo-device-id';
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function isLightColor(hex: string): boolean {
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

async function saveTokenToBackend(
  pushToken: string,
  deviceId: string,
  jwt: string,
  userId: string
): Promise<boolean> {
  try {
    const res = await fetch(`${APP_CONFIG.apiBaseUrl}/savefcmtoken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        expoPushToken: pushToken,
        deviceId,
        userId,
        platform: Platform.OS,
        appVersion: APP_CONFIG.appVersion,
      }),
    });
    logger.log('[API] Save push token:', res.status);
    return res.ok;
  } catch (e) {
    logger.warn('[API] Save push token error:', e);
    return false;
  }
}

async function getDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 11);
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function openExternally(url: string) {
  Linking.openURL(url).catch(() => {
    // Android intent:// links carry an optional web fallback.
    const fallback = /S\.browser_fallback_url=([^;]+)/.exec(url);
    if (fallback) Linking.openURL(decodeURIComponent(fallback[1])).catch(() => {});
  });
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

function MainApp() {
  const insets = useSafeAreaInsets();

  const webViewRef = useRef<WebView>(null);
  const pushTokenRef = useRef<string | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const webReadyRef = useRef(false);
  const initDoneRef = useRef(false);
  const splashHiddenRef = useRef(false);
  const authDataRef = useRef<{ jwt: string; userId: string } | null>(null);
  const tokenSavedForUserRef = useRef<string | null>(null);
  // Notification taps that arrive before the page has loaded (cold start).
  const pendingNavigationRef = useRef<string | null>(null);
  // Loop guard for the ?platform=app rewrite (e.g. if a redirect keeps stripping it).
  const platformRewriteRef = useRef<{ url: string; count: number; at: number } | null>(null);

  const [hasError, setHasError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [statusBarColor, setStatusBarColor] = useState<string>(APP_CONFIG.primaryColor);
  const [bottomBarColor, setBottomBarColor] = useState<string>(APP_CONFIG.backgroundColor);
  const [themeColor, setThemeColor] = useState<string>(APP_CONFIG.primaryColor);
  // Once the web app sets a colour explicitly (SET_THEME), auto-detection stops overriding it.
  const topColorLockedRef = useRef(false);
  const bottomColorLockedRef = useRef(false);
  const loadingBarRef = useRef<LoadingBarHandle>(null);

  // Android 3-button nav: dark icons on light bars, light icons on dark bars.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    NavigationBar.setButtonStyleAsync(isLightColor(bottomBarColor) ? 'dark' : 'light').catch(() => {});
  }, [bottomBarColor]);

  const goBack = useCallback(() => webViewRef.current?.goBack(), []);
  useBackHandler(canGoBack, goBack);

  const hideSplash = useCallback(() => {
    if (splashHiddenRef.current) return;
    splashHiddenRef.current = true;
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(hideSplash, SPLASH_MAX_MS);
    return () => clearTimeout(t);
  }, [hideSplash]);

  // Replies go straight to the current page: if it sent us a message it is alive,
  // even if onLoadEnd hasn't fired yet (Next.js hydrates before the load event).
  const injectScript = useCallback((script: string) => {
    webViewRef.current?.injectJavaScript(script);
  }, []);

  const dispatchToWeb = useCallback(
    (event: string, detail: unknown) => injectScript(createEventScript(event, detail)),
    [injectScript]
  );

  const trySaveToken = useCallback(async () => {
    const pushToken = pushTokenRef.current;
    const deviceId = deviceIdRef.current;
    const auth = authDataRef.current;

    if (!pushToken || !deviceId || !auth) return;
    if (tokenSavedForUserRef.current === auth.userId) return;

    const ok = await saveTokenToBackend(pushToken, deviceId, auth.jwt, auth.userId);
    if (ok) tokenSavedForUserRef.current = auth.userId;

    injectScript(createCallbackScript('_saveFCMToken', pushToken, deviceId));
  }, [injectScript]);

  const navigateTo = useCallback(
    (url: string) => {
      if (webReadyRef.current) {
        webViewRef.current?.injectJavaScript(createInAppNavigationScript(url));
      } else {
        pendingNavigationRef.current = url;
      }
    },
    []
  );

  const handleNotificationPress = useCallback(
    (data: Record<string, string>) => {
      logger.log('[APP] Notification pressed:', data);

      // Priority: url > screen+orderId > screen
      let target: string | null = null;
      if (data?.url) target = resolveAppUrl(data.url);
      else if (data?.screen === 'orders' && data?.orderId) target = resolveAppUrl(`/orders/${encodeURIComponent(data.orderId)}`);
      else if (data?.screen) target = resolveAppUrl(`/${encodeURIComponent(data.screen)}`);

      if (target) navigateTo(target);
      injectScript(createCallbackScript('_onNotificationTap', data));
    },
    [navigateTo, injectScript]
  );

  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    (async () => {
      try {
        await requestPermissionsInOrder();
        deviceIdRef.current = await getDeviceId();

        const token = await Promise.race([
          getFCMToken(),
          new Promise<null>(r => setTimeout(() => r(null), 10000)),
        ]);
        pushTokenRef.current = token;
        logger.log('[INIT] FCM token:', token ? 'ok' : 'null/timeout');
      } catch (e) {
        logger.warn('[INIT] Error:', e);
      }
      trySaveToken();
    })();
  }, [trySaveToken]);

  const handleForegroundMessage = useCallback(
    (title: string, body: string, data: Record<string, string>) => {
      if (Platform.OS === 'android') {
        ToastAndroid.show(`${title}: ${body}`, ToastAndroid.LONG);
        Vibration.vibrate([0, 200, 100, 200]);
      } else {
        alertHaptic();
      }

      injectScript(
        createCallbackScript('_onPushNotification', {
          title,
          body,
          orderId: data.orderId || null,
          screen: data.screen || null,
          url: data.url || null,
          image: data.image || null,
        })
      );
    },
    [injectScript]
  );

  useEffect(() => {
    return setupFCMListeners(handleNotificationPress, handleForegroundMessage);
  }, [handleNotificationPress, handleForegroundMessage]);

  useEffect(() => {
    return onTokenRefresh(newToken => {
      pushTokenRef.current = newToken;
      tokenSavedForUserRef.current = null;
      trySaveToken();
    });
  }, [trySaveToken]);

  // Let the web app refresh stale data (order status etc.) when the user returns.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') dispatchToWeb('APP_RESUME', null);
    });
    return () => sub.remove();
  }, [dispatchToWeb]);

  useEffect(() => () => stopTracking(), []);

  const handleCameraRequest = useCallback(
    async (mode: 'camera' | 'picker', inputId: string, multiple: boolean) => {
      tapHaptic();
      const images = mode === 'camera' ? await launchCamera() : await launchImageLibrary(multiple);
      if (images.length > 0) {
        injectScript(createImageInjectionScript(inputId, images));
        successHaptic();
      }
    },
    [injectScript]
  );

  const handleMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      // Only our own pages may drive the native bridge (auth, payments, tracking).
      if (!isTrustedBridgeOrigin(event.nativeEvent.url)) {
        logger.warn('[MSG] Ignored message from untrusted origin:', event.nativeEvent.url);
        return;
      }

      let message: WebViewMessage;
      try {
        message = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }

      try {
        switch (message.type) {
          case MESSAGE_TYPES.GET_LOCATION: {
            const result = await getCurrentLocation();
            injectScript(
              result.ok ? createLocationSuccessScript(result.coords) : createLocationErrorScript(result.code)
            );
            break;
          }

          case MESSAGE_TYPES.OPEN_CAMERA:
            await handleCameraRequest(message.mode, message.inputId, message.multiple);
            break;

          case MESSAGE_TYPES.VIBRATE:
            tapHaptic();
            break;

          case MESSAGE_TYPES.AUTH_TOKEN: {
            const { payload } = message;
            if (payload?.token && payload?.userId) {
              authDataRef.current = { jwt: payload.token, userId: String(payload.userId) };
              tokenSavedForUserRef.current = null;
              trySaveToken();
            }
            break;
          }

          case MESSAGE_TYPES.REQUEST_PUSH_TOKEN:
            trySaveToken();
            break;

          case MESSAGE_TYPES.USER_LOGOUT:
            authDataRef.current = null;
            tokenSavedForUserRef.current = null;
            stopTracking();
            break;

          case MESSAGE_TYPES.ENABLE_DRIVER_MODE: {
            const granted = await requestDriverPermissions();
            if (granted) {
              await startTracking(coords => dispatchToWeb('DRIVER_LOCATION', coords));
              dispatchToWeb('DRIVER_MODE_ENABLED', { enabled: true });
            } else {
              dispatchToWeb('DRIVER_MODE_ENABLED', { enabled: false, error: 'Permission denied' });
            }
            break;
          }

          case MESSAGE_TYPES.DISABLE_DRIVER_MODE:
            stopTracking();
            dispatchToWeb('DRIVER_MODE_DISABLED', { disabled: true });
            break;

          case MESSAGE_TYPES.RAZORPAY_PAYMENT:
            if (message.payload) {
              await openRazorpay(message.payload, dispatchToWeb);
            }
            break;

          case MESSAGE_TYPES.SET_THEME: {
            const primary = message.payload?.primaryColor;
            if (primary && HEX_COLOR.test(primary)) setThemeColor(primary);
            const top = message.payload?.statusBarColor;
            if (top && HEX_COLOR.test(top)) {
              topColorLockedRef.current = true;
              setStatusBarColor(top);
            }
            const bottom = message.payload?.navigationBarColor;
            if (bottom && HEX_COLOR.test(bottom)) {
              bottomColorLockedRef.current = true;
              setBottomBarColor(bottom);
            }
            break;
          }

          case MESSAGE_TYPES.EDGE_COLORS: {
            const { top, bottom } = message.payload || ({} as { top?: string; bottom?: string });
            if (!topColorLockedRef.current && top && HEX_COLOR.test(top)) setStatusBarColor(top);
            if (!bottomColorLockedRef.current && bottom && HEX_COLOR.test(bottom)) setBottomBarColor(bottom);
            break;
          }
        }
      } catch (err) {
        logger.error('[MSG] Error handling', message.type, err);
      }
    },
    [injectScript, dispatchToWeb, handleCameraRequest, trySaveToken]
  );

  const handleNavigationChange = useCallback((state: WebViewNavigation) => {
    setCanGoBack(state.canGoBack);
  }, []);

  const handleShouldStartLoad = useCallback((request: ShouldStartLoadRequest) => {
    const { url } = request;

    if (url.startsWith('about:') || url.startsWith('data:') || url.startsWith('blob:')) return true;

    // iOS also asks about iframes (maps, reCAPTCHA, embeds): never bounce those to Safari.
    if (request.isTopFrame === false && /^https?:/i.test(url)) return true;

    // Every top-level laundergo.in page load must carry ?platform=app so the
    // server renders the mobile UI. Cancel and re-issue it with the param.
    if (isTrustedBridgeOrigin(url) && !hasPlatformParam(url)) {
      const target = withPlatformParam(url);
      const now = Date.now();
      const last = platformRewriteRef.current;
      const count = last && last.url === target && now - last.at < 3000 ? last.count + 1 : 1;
      platformRewriteRef.current = { url: target, count, at: now };
      if (count <= 2) {
        webViewRef.current?.injectJavaScript(createNavigationScript(target));
        return false;
      }
      logger.warn('[NAV] platform=app keeps being dropped for', url);
    }

    if (isAllowedInWebView(url)) return true;

    // tel:, mailto:, upi:, whatsapp:, intent:, and off-site links.
    openExternally(url);
    return false;
  }, []);

  const handleLoadStart = useCallback(() => {
    webReadyRef.current = false;
    loadingBarRef.current?.start();
  }, []);

  const handleLoadProgress = useCallback(
    (e: { nativeEvent: { progress: number } }) => loadingBarRef.current?.progress(e.nativeEvent.progress),
    []
  );

  const handleLoadEnd = useCallback(() => {
    webReadyRef.current = true;
    loadingBarRef.current?.finish();
    hideSplash();

    const pending = pendingNavigationRef.current;
    if (pending) {
      pendingNavigationRef.current = null;
      webViewRef.current?.injectJavaScript(createNavigationScript(pending));
    }
  }, [hideSplash]);

  const handleLoadError = useCallback(() => {
    setHasError(true);
    hideSplash();
  }, [hideSplash]);

  // The OS can kill the WebView's renderer under memory pressure; without this
  // the user is left with a blank white screen until they force-quit the app.
  const handleProcessGone = useCallback(() => {
    webReadyRef.current = false;
    webViewRef.current?.reload();
  }, []);

  const handleRetry = useCallback(() => {
    tapHaptic();
    setHasError(false);
    webViewRef.current?.reload();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: statusBarColor }]}>
      <ExpoStatusBar style={isLightColor(statusBarColor) ? 'dark' : 'light'} />
      <View style={{ height: insets.top, backgroundColor: statusBarColor }} />

      <View style={styles.content}>
        <WebView
          ref={webViewRef}
          source={{ uri: APP_CONFIG.webviewUrl }}
          style={styles.webview}
          originWhitelist={['*']}
          applicationNameForUserAgent={APP_CONFIG.userAgentSuffix}
          injectedJavaScriptBeforeContentLoaded={INJECTED_JAVASCRIPT}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          cacheEnabled
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures
          decelerationRate="normal"
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          bounces={false}
          overScrollMode="never"
          textZoom={100}
          webviewDebuggingEnabled={__DEV__}
          onLoadStart={handleLoadStart}
          onLoadProgress={handleLoadProgress}
          onLoadEnd={handleLoadEnd}
          onNavigationStateChange={handleNavigationChange}
          onError={handleLoadError}
          onMessage={handleMessage}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onContentProcessDidTerminate={handleProcessGone}
          onRenderProcessGone={handleProcessGone}
        />
        <LoadingBar ref={loadingBarRef} color={themeColor} />
        {hasError && (
          <View style={StyleSheet.absoluteFill}>
            <ErrorScreen onRetry={handleRetry} />
          </View>
        )}
      </View>

      <View style={{ height: insets.bottom, backgroundColor: bottomBarColor }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_CONFIG.backgroundColor,
  },
  content: {
    flex: 1,
    backgroundColor: APP_CONFIG.backgroundColor,
  },
  webview: {
    flex: 1,
    backgroundColor: APP_CONFIG.backgroundColor,
  },
});
