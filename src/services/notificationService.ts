import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';
import Sound from 'react-native-sound';
import { logger } from '../utils/logger';

// mixWithOthers: don't stop the user's music just because the app launched.
Sound.setCategory('Playback', true);

let alertSound: Sound | null = null;

function playAlertSound(): void {
  if (alertSound) {
    alertSound.stop();
    alertSound.release();
  }
  
  alertSound = new Sound('alert_sound.mp3', Sound.MAIN_BUNDLE, (error) => {
    if (error) {
      logger.log('[SOUND] Failed to load sound:', error);
      return;
    }
    alertSound?.setVolume(1.0);
    alertSound?.play((success) => {
      if (!success) {
        logger.log('[SOUND] Playback failed');
      }
      alertSound?.release();
      alertSound = null;
    });
  });
}

export async function getFCMToken(): Promise<string | null> {
  logger.log('[FCM] getFCMToken called');

  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      logger.log('[FCM] Android 13+ POST_NOTIFICATIONS:', granted);
    }

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    logger.log('[FCM] Permission status:', authStatus, enabled ? 'granted' : 'denied');

    if (!enabled) {
      return null;
    }

    const token = await messaging().getToken();
    logger.log('[FCM] Token obtained');
    return token;
  } catch (error) {
    logger.log('[FCM] getFCMToken error:', error);
    return null;
  }
}

export function setupFCMListeners(
  onNotificationPress: (data: Record<string, string>) => void,
  onForegroundMessage?: (title: string, body: string, data: Record<string, string>) => void
): () => void {
  logger.log('[FCM] Setting up listeners');

  const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
    const title = remoteMessage.notification?.title || 'LaunderGo';
    const body = remoteMessage.notification?.body || '';
    const data = (remoteMessage.data || {}) as Record<string, string>;
    const image = remoteMessage.notification?.android?.imageUrl || data.image || '';
    
    logger.log('[FCM] Foreground message:', { title, body, type: data.type });
    
    if (data.type === 'NEW_ORDER' || data.playSound === 'true') {
      playAlertSound();
    }
    
    if (onForegroundMessage) {
      onForegroundMessage(title, body, { ...data, image });
    }
  });

  const unsubscribeOpened = messaging().onNotificationOpenedApp((remoteMessage) => {
    logger.log('[FCM] Notification tapped (background):', remoteMessage.data);
    if (remoteMessage.data) {
      onNotificationPress(remoteMessage.data as Record<string, string>);
    }
  });

  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage?.data) {
        logger.log('[FCM] App opened from killed state:', remoteMessage.data);
        onNotificationPress(remoteMessage.data as Record<string, string>);
      }
    })
    .catch(() => {});

  logger.log('[FCM] Listeners registered');

  return () => {
    unsubscribeForeground();
    unsubscribeOpened();
  };
}

export function onTokenRefresh(callback: (newToken: string) => void): () => void {
  return messaging().onTokenRefresh((token) => {
    logger.log('[FCM] Token refreshed');
    callback(token);
  });
}