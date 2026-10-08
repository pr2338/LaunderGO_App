import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';

import App from './App';
import { logger } from './src/utils/logger';

// Must be registered outside React so FCM can wake the app in the background.
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  logger.log('[FCM] Background message:', remoteMessage.notification?.title);
});

registerRootComponent(App);
