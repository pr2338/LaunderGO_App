import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import messaging from '@react-native-firebase/messaging';

export interface PermissionResults {
  location: boolean;
  camera: boolean;
  mediaLibrary: boolean;
  notification: boolean;
}

export async function requestPermissionsInOrder(): Promise<PermissionResults> {
  console.log('[PERM 1] Starting: Location → Camera → Notification');

  const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
  const location = locStatus === 'granted';
  console.log('[PERM 2] Location:', locStatus);

  const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
  const camera = camStatus === 'granted';
  console.log('[PERM 3] Camera:', camStatus);

  const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  const mediaLibrary = mediaStatus === 'granted';
  console.log('[PERM 4] Media Library:', mediaStatus);

  const authStatus = await messaging().requestPermission();
  const notification =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  console.log('[PERM 5] Notification:', authStatus, notification ? '✅' : '❌');

  console.log('[PERM 6] ✅ Done:', { location, camera, mediaLibrary, notification });
  return { location, camera, mediaLibrary, notification };
}
