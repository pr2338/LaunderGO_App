import * as Location from 'expo-location';
import { logger } from '../utils/logger';

let subscription: Location.LocationSubscription | null = null;

export async function requestDriverPermissions(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return false;

    // Prompts the user to turn on GPS (Android) if location services are off.
    if (!(await Location.hasServicesEnabledAsync())) {
      await Location.enableNetworkProviderAsync().catch(() => {});
    }
    return true;
  } catch (err) {
    logger.warn('[DRIVER] Permission error:', err);
    return false;
  }
}

export async function startTracking(
  onLocationUpdate: (coords: { latitude: number; longitude: number }) => void
): Promise<void> {
  if (subscription) return;

  subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 10,
      timeInterval: 5000,
    },
    position => {
      onLocationUpdate({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    }
  );
}

export function stopTracking(): void {
  subscription?.remove();
  subscription = null;
}

export function isTracking(): boolean {
  return subscription !== null;
}
