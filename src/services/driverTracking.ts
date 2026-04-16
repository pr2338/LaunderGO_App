import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation, { GeoPosition } from 'react-native-geolocation-service';
import { WebView } from 'react-native-webview';
import { RefObject } from 'react';

let watchId: number | null = null;

export async function requestDriverPermissions(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const status = await Geolocation.requestAuthorization('whenInUse');
    return status === 'granted';
  }

  try {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);

    const isGranted =
      granted['android.permission.ACCESS_FINE_LOCATION'] === 'granted';

    console.log('[DRIVER] Permission:', isGranted ? 'granted' : 'denied');
    return isGranted;
  } catch (err) {
    console.log('[DRIVER] Permission error:', err);
    return false;
  }
}

export function startTracking(
  webViewRef: RefObject<WebView>,
  onLocationUpdate?: (coords: { latitude: number; longitude: number }) => void
): void {
  if (watchId !== null) {
    console.log('[DRIVER] Already tracking');
    return;
  }

  console.log('[DRIVER] Starting live tracking');

  watchId = Geolocation.watchPosition(
    (position: GeoPosition) => {
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      console.log('[DRIVER] Location:', coords);

      sendToWebView(webViewRef, coords);

      if (onLocationUpdate) {
        onLocationUpdate(coords);
      }
    },
    (error) => {
      console.log('[DRIVER] Location error:', error.code, error.message);
    },
    {
      enableHighAccuracy: true,
      distanceFilter: 10,
      interval: 5000,
      fastestInterval: 3000,
      showLocationDialog: true,
      forceRequestLocation: true,
    }
  );
}

export function stopTracking(): void {
  if (watchId !== null) {
    console.log('[DRIVER] Stopping tracking');
    Geolocation.clearWatch(watchId);
    watchId = null;
  }
}

function sendToWebView(
  webViewRef: RefObject<WebView>,
  coords: { latitude: number; longitude: number }
): void {
  webViewRef.current?.injectJavaScript(`
    window.dispatchEvent(new CustomEvent('DRIVER_LOCATION', {
      detail: {
        latitude: ${coords.latitude},
        longitude: ${coords.longitude}
      }
    }));
    true;
  `);
}

export function isTracking(): boolean {
  return watchId !== null;
}
