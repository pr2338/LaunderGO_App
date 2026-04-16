import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';

export interface ImageResult {
  base64: string;
  uri: string;
  width: number;
  height: number;
}

// ─── PERMISSION HELPERS ───────────────────────────────────────────────────────

async function ensureCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.getCameraPermissionsAsync();

  if (status === 'granted') return true;

  const { status: requested } = await ImagePicker.requestCameraPermissionsAsync();

  if (requested === 'granted') return true;

  Alert.alert(
    'Camera Permission Required',
    'Please allow camera access in Settings to use this feature.',
    [
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
      { text: 'Cancel', style: 'cancel' },
    ]
  );

  return false;
}

async function ensureMediaLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();

  if (status === 'granted') return true;

  const { status: requested } = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (requested === 'granted') return true;

  Alert.alert(
    'Gallery Permission Required',
    'Please allow photo library access in Settings to use this feature.',
    [
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
      { text: 'Cancel', style: 'cancel' },
    ]
  );

  return false;
}

// ─── REQUEST ALL UPFRONT (called during app init) ────────────────────────────
// Call this from App.tsx initApp() so user sees permissions on first launch,
// not the first time they tap the camera button.

export async function requestAllMediaPermissionsUpfront(): Promise<void> {
  await ImagePicker.requestCameraPermissionsAsync();
  await ImagePicker.requestMediaLibraryPermissionsAsync();
}

// ─── LAUNCH CAMERA ───────────────────────────────────────────────────────────

export async function launchCamera(): Promise<ImageResult | null> {
  const hasPermission = await ensureCameraPermission();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.85,
    base64: true,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  return {
    base64: asset.base64 || '',
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
  };
}

// ─── LAUNCH IMAGE LIBRARY ────────────────────────────────────────────────────

export async function launchImageLibrary(multiple = false): Promise<ImageResult[]> {
  const hasPermission = await ensureMediaLibraryPermission();
  if (!hasPermission) return [];

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: multiple,
    quality: 0.85,
    base64: true,
  });

  if (result.canceled || !result.assets) return [];

  return result.assets.map(asset => ({
    base64: asset.base64 || '',
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
  }));
}