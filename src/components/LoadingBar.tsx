import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

export interface LoadingBarHandle {
  start(): void;
  progress(value: number): void;
  finish(): void;
}

interface LoadingBarProps {
  color: string;
}

// Never leave the bar on screen if a load never reports completion.
const MAX_VISIBLE_MS = 15000;

/**
 * Thin progress bar for full page loads. Driven imperatively (no React state)
 * so progress events never re-render the WebView.
 */
export const LoadingBar = forwardRef<LoadingBarHandle, LoadingBarProps>(({ color }, ref) => {
  const width = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const loadingRef = useRef(false);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useImperativeHandle(ref, () => {
    const finish = () => {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      if (!loadingRef.current) return;
      loadingRef.current = false;
      width.stopAnimation();
      opacity.stopAnimation();
      // Independent animations (not a sequence): a stray late event can't cancel
      // the fade-out and leave the bar stuck on screen.
      Animated.timing(width, { toValue: 1, duration: 150, useNativeDriver: false }).start();
      Animated.timing(opacity, { toValue: 0, delay: 150, duration: 200, useNativeDriver: false }).start();
    };

    return {
      start() {
        loadingRef.current = true;
        width.stopAnimation();
        opacity.stopAnimation();
        width.setValue(0);
        opacity.setValue(1);
        // Creep forward immediately so the tap feels acknowledged.
        Animated.timing(width, { toValue: 0.3, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
        safetyTimerRef.current = setTimeout(finish, MAX_VISIBLE_MS);
      },
      progress(value) {
        // Android reports progress=1 after onLoadEnd; ignore anything once finished.
        if (!loadingRef.current) return;
        Animated.timing(width, { toValue: Math.max(0.3, Math.min(value, 0.95)), duration: 200, useNativeDriver: false }).start();
      },
      finish,
    };
  }, [width, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bar,
        {
          backgroundColor: color,
          opacity,
          width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        },
      ]}
    />
  );
});

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 2,
    zIndex: 10,
  },
});
