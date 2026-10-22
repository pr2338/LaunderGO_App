import * as Location from 'expo-location';
import { APP_CONFIG } from '../config/constants';
import { logger } from '../utils/logger';

export interface DriverCoords {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
}

const SERVER_SYNC_INTERVAL_MS = 5000;
const SERVER_SYNC_DISTANCE_M = 15;

let subscription: Location.LocationSubscription | null = null;
let lastSynced: { at: number; latitude: number; longitude: number } | null = null;

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

function toCoords(position: Location.LocationObject): DriverCoords {
  const { latitude, longitude, heading, speed, accuracy } = position.coords;
  return {
    latitude,
    longitude,
    ...(heading !== null && heading >= 0 ? { heading } : {}),
    ...(speed !== null && speed >= 0 ? { speed } : {}),
    ...(accuracy !== null ? { accuracy } : {}),
  };
}

function metersBetween(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

async function syncToServer(coords: DriverCoords, getJwt: () => string | null): Promise<void> {
  const jwt = getJwt();
  if (!jwt) return;

  const now = Date.now();
  if (lastSynced) {
    const elapsed = now - lastSynced.at;
    const moved = metersBetween(lastSynced, coords);
    if (elapsed < SERVER_SYNC_INTERVAL_MS && moved < SERVER_SYNC_DISTANCE_M) return;
  }
  lastSynced = { at: now, latitude: coords.latitude, longitude: coords.longitude };

  try {
    await fetch(`${APP_CONFIG.apiBaseUrl}/driver/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify(coords),
    });
  } catch (err) {
    logger.warn('[DRIVER] Location sync failed:', err);
  }
}

export async function startTracking(
  onLocationUpdate: (coords: DriverCoords) => void,
  getJwt: () => string | null
): Promise<void> {
  if (subscription) return;

  const handle = (position: Location.LocationObject) => {
    const coords = toCoords(position);
    onLocationUpdate(coords);
    syncToServer(coords, getJwt);
  };

  const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 60000 }).catch(() => null);
  if (lastKnown) handle(lastKnown);

  subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 5,
      timeInterval: 3000,
    },
    handle
  );
}

export function stopTracking(): void {
  subscription?.remove();
  subscription = null;
  lastSynced = null;
}

export function isTracking(): boolean {
  return subscription !== null;
}
