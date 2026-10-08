import * as Location from 'expo-location';
import { logger } from '../utils/logger';

export interface PermissionResults {
  location: boolean;
}

// Only location is asked up front (nearby-service lookup). Camera is requested
// the first time the user takes a photo, and notifications by getFCMToken() —
// App Store review rejects apps that prompt for unrelated permissions on launch.
export async function requestPermissionsInOrder(): Promise<PermissionResults> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    logger.log('[PERM] Location:', status);
    return { location: status === 'granted' };
  } catch (e) {
    logger.warn('[PERM] Location error:', e);
    return { location: false };
  }
}
