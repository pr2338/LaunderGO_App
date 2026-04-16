import React, { useState, useRef, useCallback, useEffect } from 'react';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { StyleSheet, View, Linking, Platform, Vibration, ToastAndroid, StatusBar } from 'react-native';
import { WebView, WebViewNavigation, WebViewMessageEvent } from 'react-native-webview';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { APP_CONFIG, MESSAGE_TYPES } from './src/config/constants';
import { useBackHandler } from './src/hooks/useBackHandler';
import { getCurrentLocation } from './src/services/location';
import { launchCamera, launchImageLibrary } from './src/services/camera';
import { ErrorScreen } from './src/components/ErrorScreen';
import {
  INJECTED_JAVASCRIPT,
  createLocationSuccessScript,
  createLocationErrorScript,
  createImageInjectionScript,
} from './src/utils/webview-bridge';
import type { WebViewMessage } from './src/types/messages';
import { getFCMToken, setupFCMListeners, onTokenRefresh } from './src/services/notificationService';
import { requestPermissionsInOrder } from './src/services/permissions';
import { requestDriverPermissions, startTracking, stopTracking } from './src/services/driverTracking';
import { openRazorpay } from './src/services/paymentService';

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
    console.log('[API] Saving push token to backend for user:', userId);
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
      }),
    });
    const ok = res.ok;
    console.log('[API] Save result:', res.status, ok ? '✅' : '❌');
    return ok;
  } catch (e) {
    console.log('[API] Save error:', e);
    return false;
  }
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
  const webReadyRef = useRef<boolean>(false);
  const initDoneRef = useRef<boolean>(false);
  const authDataRef = useRef<{ jwt: string; userId: string } | null>(null);
  const tokenSavedForUserRef = useRef<string | null>(null);

  const [hasError, setHasError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [statusBarColor, setStatusBarColor] = useState(APP_CONFIG.primaryColor);

  useBackHandler(canGoBack, () => webViewRef.current?.goBack());

  const trySaveToken = useCallback(async () => {
    const pushToken = pushTokenRef.current;
    const deviceId = deviceIdRef.current;
    const auth = authDataRef.current;

    console.log('[SAVE] trySaveToken check:', {
      hasPushToken: !!pushToken,
      hasDeviceId: !!deviceId,
      hasAuth: !!auth,
      alreadySavedFor: tokenSavedForUserRef.current,
    });
    console.log('[SAVE] fcmToken:', pushToken);
    console.log('[SAVE] deviceId:', deviceId);
    console.log('[SAVE] userId:', auth?.userId);

    if (!pushToken || !deviceId || !auth) return;
    if (tokenSavedForUserRef.current === auth.userId) {
      console.log('[SAVE] Already saved for this user, skipping');
      return;
    }

    const ok = await saveTokenToBackend(pushToken, deviceId, auth.jwt, auth.userId);
    if (ok) {
      tokenSavedForUserRef.current = auth.userId;
      console.log('[SAVE] ✅ Token saved for user:', auth.userId);
    }

    if (webReadyRef.current) {
      webViewRef.current?.injectJavaScript(`
        (function() {
          if (typeof window._saveFCMToken === 'function') {
            window._saveFCMToken('${pushToken}', '${deviceId}');
          }
        })();
        true;
      `);
      console.log('[SAVE] Also injected into WebView');
    }
  }, []);

  const handleNotificationPress = useCallback((data: Record<string, string>) => {
    console.log('[APP] Notification pressed:', data);
    
    // Priority: url > screen+orderId > screen
    if (data?.url) {
      console.log('[APP] Navigating to URL:', data.url);
      webViewRef.current?.injectJavaScript(`window.location.href='${data.url}';true;`);
    } else if (data?.screen === 'orders' && data?.orderId) {
      console.log('[APP] Navigating to order:', data.orderId);
      webViewRef.current?.injectJavaScript(`window.location.href='/orders/${data.orderId}';true;`);
    } else if (data?.screen) {
      console.log('[APP] Navigating to screen:', data.screen);
      webViewRef.current?.injectJavaScript(`window.location.href='/${data.screen}';true;`);
    }
    
    // Also notify WebView about the tap
    if (webReadyRef.current) {
      webViewRef.current?.injectJavaScript(`
        if (typeof window._onNotificationTap === 'function') {
          window._onNotificationTap(${JSON.stringify(data)});
        }
        true;
      `);
    }
  }, []);

  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;
    console.log('[INIT 1] Starting init...');

    (async () => {
      try {
        console.log('[INIT 2] Requesting permissions in order...');
        const perms = await requestPermissionsInOrder();
        console.log('[INIT 3] Permissions result:', perms);

        console.log('[INIT 4] Getting FCM token...');
        const tokenPromise = getFCMToken();
        const timeoutPromise = new Promise<null>((r) => setTimeout(() => r(null), 10000));
        const token = await Promise.race([tokenPromise, timeoutPromise]);
        pushTokenRef.current = token;
        console.log('[INIT] FCM token:', token || 'null/timeout');

        let id = await AsyncStorage.getItem('laundergo-device-id');
        if (!id) {
          id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
          await AsyncStorage.setItem('laundergo-device-id', id);
        }
        deviceIdRef.current = id;
        console.log('[INIT] Device ID:', id);
      } catch (e) {
        console.log('[INIT] Error:', e);
      }
      console.log('[INIT] Complete, saving token...');
      trySaveToken();
    })();
  }, [trySaveToken]);

  const handleForegroundMessage = useCallback((title: string, body: string, data: Record<string, string>) => {
    console.log('[APP] Foreground notification:', { title, body, data });
    
    if (Platform.OS === 'android') {
      ToastAndroid.show(`${title}: ${body}`, ToastAndroid.LONG);
    }
    
    Vibration.vibrate([0, 200, 100, 200]);
    
    if (webReadyRef.current) {
      const payload = {
        title,
        body,
        orderId: data.orderId || null,
        screen: data.screen || null,
        url: data.url || null,
        image: data.image || null,
      };
      webViewRef.current?.injectJavaScript(`
        if (typeof window._onPushNotification === 'function') {
          window._onPushNotification(${JSON.stringify(payload)});
        }
        true;
      `);
    }
  }, []);

  useEffect(() => {
    const cleanup = setupFCMListeners(handleNotificationPress, handleForegroundMessage);
    return cleanup;
  }, [handleNotificationPress, handleForegroundMessage]);

  useEffect(() => {
    const unsubscribe = onTokenRefresh((newToken) => {
      console.log('[TOKEN] Refreshed');
      pushTokenRef.current = newToken;
      tokenSavedForUserRef.current = null;
      trySaveToken();
    });
    return unsubscribe;
  }, [trySaveToken]);

  const injectScript = useCallback((script: string) => {
    if (webReadyRef.current) {
      webViewRef.current?.injectJavaScript(script);
    }
  }, []);

  const handleCameraRequest = useCallback(
    async (mode: 'camera' | 'picker', inputId: string, multiple: boolean) => {
      Vibration.vibrate(10);
      const images =
        mode === 'camera'
          ? await launchCamera().then(img => (img ? [img] : []))
          : await launchImageLibrary(multiple);
      if (images.length > 0 && images[0].base64) {
        injectScript(createImageInjectionScript(inputId, images[0].base64));
        Vibration.vibrate(15);
      }
    },
    [injectScript]
  );

  const handleMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      try {
        const message: WebViewMessage = JSON.parse(event.nativeEvent.data);

        switch (message.type) {
          case MESSAGE_TYPES.GET_LOCATION: {
            const location = await getCurrentLocation();
            injectScript(
              location
                ? createLocationSuccessScript(location)
                : createLocationErrorScript()
            );
            break;
          }

          case MESSAGE_TYPES.OPEN_CAMERA: {
            await handleCameraRequest(message.mode, message.inputId, message.multiple);
            break;
          }

          case MESSAGE_TYPES.VIBRATE: {
            Vibration.vibrate(15);
            break;
          }

          case MESSAGE_TYPES.AUTH_TOKEN: {
            const payload = (message as any).payload;
            console.log('[MSG] auth_token, userId:', payload?.userId);
            if (payload?.token && payload?.userId) {
              authDataRef.current = { jwt: payload.token, userId: payload.userId };
              tokenSavedForUserRef.current = null;
              trySaveToken();
            }
            break;
          }

          case MESSAGE_TYPES.REQUEST_PUSH_TOKEN: {
            const payload = (message as any).payload;
            console.log('[MSG] request_push_token, userId:', payload?.userId);
            trySaveToken();
            break;
          }

          case MESSAGE_TYPES.USER_LOGOUT: {
            console.log('[MSG] logout');
            authDataRef.current = null;
            tokenSavedForUserRef.current = null;
            stopTracking();
            break;
          }

          case MESSAGE_TYPES.ENABLE_DRIVER_MODE: {
            console.log('[DRIVER] Enable driver mode');
            const granted = await requestDriverPermissions();
            if (granted && webViewRef.current) {
              startTracking(webViewRef as React.RefObject<WebView>);
              webViewRef.current.injectJavaScript(`
                window.dispatchEvent(new CustomEvent('DRIVER_MODE_ENABLED', { detail: { enabled: true } }));
                true;
              `);
            } else {
              webViewRef.current?.injectJavaScript(`
                window.dispatchEvent(new CustomEvent('DRIVER_MODE_ENABLED', { detail: { enabled: false, error: 'Permission denied' } }));
                true;
              `);
            }
            break;
          }

          case MESSAGE_TYPES.DISABLE_DRIVER_MODE: {
            console.log('[DRIVER] Disable driver mode');
            stopTracking();
            webViewRef.current?.injectJavaScript(`
              window.dispatchEvent(new CustomEvent('DRIVER_MODE_DISABLED', { detail: { disabled: true } }));
              true;
            `);
            break;
          }

          case MESSAGE_TYPES.RAZORPAY_PAYMENT: {
            const payload = (message as any).payload;
            console.log('[PAYMENT] Razorpay request:', payload?.orderId);
            if (payload && webViewRef.current) {
              openRazorpay(webViewRef as React.RefObject<WebView>, payload);
            }
            break;
          }

          case MESSAGE_TYPES.SET_THEME: {
            const payload = (message as any).payload;
            const color = payload?.statusBarColor || APP_CONFIG.primaryColor;
            setStatusBarColor(color);
            if (Platform.OS === 'android') {
              StatusBar.setBackgroundColor(color);
              StatusBar.setBarStyle(isLightColor(color) ? 'dark-content' : 'light-content');
            }
            break;
          }
        }
      } catch (err) {
        console.log('[MSG] Error:', err);
      }
    },
    [injectScript, handleCameraRequest, trySaveToken]
  );

  const handleNavigationChange = useCallback((state: WebViewNavigation) => {
    setCanGoBack(state.canGoBack);
  }, []);

  const handleRetry = useCallback(() => {
    Vibration.vibrate(20);
    setHasError(false);
    setTimeout(() => webViewRef.current?.reload(), 100);
  }, []);

  const handleShouldStartLoad = useCallback((request: { url: string }) => {
    const { url } = request;
    if (!url.startsWith(APP_CONFIG.baseUrl) && !url.startsWith('about:')) {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    return true;
  }, []);

  if (hasError) {
    return <ErrorScreen onRetry={handleRetry} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: statusBarColor }]}>
      <ExpoStatusBar style={isLightColor(statusBarColor) ? 'dark' : 'light'} backgroundColor={statusBarColor} />
      <View style={[styles.statusBar, { height: insets.top, backgroundColor: statusBarColor }]} />

      <WebView
        ref={webViewRef}
        source={{ uri: APP_CONFIG.webviewUrl }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        injectedJavaScriptBeforeContentLoaded={INJECTED_JAVASCRIPT}
        bounces={false}
        scrollEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        onLoadEnd={() => {
          webReadyRef.current = true;
          console.log('[WEBVIEW] onLoadEnd');
        }}
        onNavigationStateChange={handleNavigationChange}
        onError={() => setHasError(true)}
        onHttpError={() => {}}
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_CONFIG.backgroundColor,
  },
  statusBar: {
    width: '100%',
    backgroundColor: APP_CONFIG.primaryColor,
  },
  webview: {
    flex: 1,
    backgroundColor: APP_CONFIG.backgroundColor,
  },
});