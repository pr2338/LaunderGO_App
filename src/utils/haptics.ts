import * as Haptics from 'expo-haptics';

// Vibration.vibrate(ms) ignores the duration on iOS and always buzzes ~400ms,
// so taps use the system haptic engine instead.
export function tapHaptic(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function successHaptic(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function alertHaptic(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
