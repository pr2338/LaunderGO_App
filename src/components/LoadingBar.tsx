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

/**
 * Thin progress bar for full page loads. Driven imperatively (no React state)
 * so progress events never re-render the WebView.
 */
export const LoadingBar = forwardRef<LoadingBarHandle, LoadingBarProps>(({ color }, ref) => {
  const width = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useImperativeHandle(ref, () => ({
    start() {
      width.stopAnimation();
      width.setValue(0);
      opacity.setValue(1);
      // Creep forward immediately so the tap feels acknowledged.
      Animated.timing(width, { toValue: 0.3, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
    },
    progress(value) {
      Animated.timing(width, { toValue: Math.max(0.3, Math.min(value, 0.95)), duration: 200, useNativeDriver: false }).start();
    },
    finish() {
      Animated.sequence([
        Animated.timing(width, { toValue: 1, duration: 150, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: false }),
      ]).start();
    },
  }), [width, opacity]);

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
    height: 2.5,
    zIndex: 10,
  },
});
