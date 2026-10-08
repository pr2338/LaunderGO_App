import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';

export interface ImageResult {
  base64: string;
  mimeType: string;
  fileName: string;
}

// Base64 crosses the JS bridge into the WebView; keep payloads modest.
const IMAGE_QUALITY = 0.6;

async function ensureCameraPermission(): Promise<boolean> {
  const { status } = await ImagePicker.getCameraPermissionsAsync();
  if (status === 'granted') return true;

  const { status: requested } = await ImagePicker.requestCameraPermissionsAsync();
  if (requested === 'granted') return true;

  Alert.alert(
    'Camera Permission Required',
    'Please allow camera access in Settings to take photos of your laundry.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]
  );
  return false;
}

function toResult(asset: ImagePicker.ImagePickerAsset, index: number): ImageResult | null {
  if (!asset.base64) return null;
  const mimeType = asset.mimeType || 'image/jpeg';
  const ext = mimeType.split('/')[1] || 'jpg';
  return {
    base64: asset.base64,
    mimeType,
    fileName: asset.fileName || `photo_${Date.now()}_${index}.${ext}`,
  };
}

export async function launchCamera(): Promise<ImageResult[]> {
  if (!(await ensureCameraPermission())) return [];

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: IMAGE_QUALITY,
    base64: true,
  });
  if (result.canceled || !result.assets) return [];
  return result.assets.map(toResult).filter((r): r is ImageResult => r !== null);
}

// The system photo picker (Android 13+ / iOS 14+) needs no library permission,
// which also keeps us compliant with Play's photo-permission policy.
export async function launchImageLibrary(multiple = false): Promise<ImageResult[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: multiple,
    selectionLimit: multiple ? 10 : 1,
    quality: IMAGE_QUALITY,
    base64: true,
  });
  if (result.canceled || !result.assets) return [];
  return result.assets.map(toResult).filter((r): r is ImageResult => r !== null);
}
