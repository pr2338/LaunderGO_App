import * as Location from 'expo-location';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

export type LocationResult =
  | { ok: true; coords: LocationCoords }
  | { ok: false; code: 1 | 2 | 3 }; // W3C GeolocationPositionError codes

export async function getCurrentLocation(): Promise<LocationResult> {
  try {
    let { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Location.requestForegroundPermissionsAsync());
    }
    if (status !== 'granted') return { ok: false, code: 1 };

    const location = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 15000)),
    ]);
    if (!location) {
      const last = await Location.getLastKnownPositionAsync();
      if (!last) return { ok: false, code: 3 };
      return { ok: true, coords: toCoords(last) };
    }
    return { ok: true, coords: toCoords(location) };
  } catch {
    return { ok: false, code: 2 };
  }
}

function toCoords(location: Location.LocationObject): LocationCoords {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    timestamp: location.timestamp,
  };
}
