import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import {
  BottomTabBar,
  type BottomTabBarProps,
} from 'expo-router/build/react-navigation/bottom-tabs';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/src/theme/tokens';

/** True for Find Connections tab + wizard/results stack routes. */
function shouldHideTabBar(pathname: string) {
  if (pathname.includes('/connect')) return true;
  return false;
}

export function AnimatedTabBar(props: BottomTabBarProps) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const hide = shouldHideTabBar(pathname);
  const visibleHeight = 56 + Math.max(insets.bottom, 8);
  const height = useRef(new Animated.Value(hide ? 0 : visibleHeight)).current;
  const translateY = useRef(new Animated.Value(hide ? visibleHeight : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(height, {
        toValue: hide ? 0 : visibleHeight,
        duration: 260,
        useNativeDriver: false,
      }),
      Animated.timing(translateY, {
        toValue: hide ? visibleHeight : 0,
        duration: 260,
        useNativeDriver: false,
      }),
    ]).start();
  }, [hide, visibleHeight, height, translateY]);

  return (
    <Animated.View
      pointerEvents={hide ? 'none' : 'auto'}
      style={[styles.wrap, { height }]}
    >
      <Animated.View
        style={{
          transform: [{ translateY }],
        }}
      >
        <BottomTabBar {...props} style={styles.bar} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  bar: {
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
});
