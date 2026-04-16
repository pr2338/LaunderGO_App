import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';

export function useBackHandler(canGoBack: boolean, onGoBack: () => void): void {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const handler = () => {
      if (canGoBack) {
        onGoBack();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => subscription.remove();
  }, [canGoBack, onGoBack]);
}
