import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/tokens';

type Props = { color: ColorValue; size: number; focused: boolean };

/**
 * Bottom-nav icon for Connect -- the app's main action, so it gets a quiet
 * highlight no other tab has: a soft orange "radar" ring that ripples out
 * every few seconds (finding people nearby), and a small spring pop when
 * the tab is selected. Native-driver only, so it costs nothing on the JS
 * thread.
 */
export function ConnectTabIcon({ color, size, focused }: Props) {
  const ripple = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(ripple, {
          toValue: 1,
          duration: 1600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(1400),
      ]),
    );
    ripple.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [ripple]);

  useEffect(() => {
    if (!focused) return;
    pop.setValue(0.8);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }).start();
  }, [focused, pop]);

  const ringSize = size + 14;
  return (
    <View style={[styles.wrap, { width: ringSize, height: ringSize }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            opacity: ripple.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.55, 0] }),
            transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.35] }) }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.badge,
          focused && styles.badgeFocused,
          { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, transform: [{ scale: pop }] },
        ]}
      >
        <Ionicons
          name={focused ? 'people-circle' : 'people-circle-outline'}
          size={size}
          color={focused ? colors.white : color}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
  },
  badge: { alignItems: 'center', justifyContent: 'center' },
  badgeFocused: { backgroundColor: colors.primary },
});
