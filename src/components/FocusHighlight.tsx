import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { Animated, StyleSheet, View, type ScrollView, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius } from '@/src/theme/tokens';

type Props = {
  /** Scroll to this section and blink it once it has rendered. */
  active: boolean;
  scrollRef: RefObject<ScrollView | null>;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Space left above the section after scrolling. */
  topOffset?: number;
};

const PULSES = 3;

/**
 * Wraps a section a notification points at (e.g. "X accepted your
 * connection request" -> the connect/message buttons on X's profile):
 * scrolls it into view and blinks an orange outline over it a few times,
 * so the user sees exactly what the notification was about.
 */
export function FocusHighlight({ active, scrollRef, children, style, topOffset = 24 }: Props) {
  const ref = useRef<View>(null);
  const pulse = useRef(new Animated.Value(0)).current;
  const done = useRef(false);

  useEffect(() => {
    if (!active || done.current) return;
    done.current = true;
    // Let the screen finish laying out (sections above may still be
    // measuring) before scrolling to it.
    const timer = setTimeout(() => {
      const target = ref.current;
      const scroll = scrollRef.current as unknown as View | null;
      if (target && scroll) {
        target.measureInWindow((_x, targetY) => {
          scroll.measureInWindow((_sx, scrollY) => {
            const y = Math.max(0, targetY - scrollY - topOffset);
            if (y > 8) scrollRef.current?.scrollTo({ y, animated: true });
          });
        });
      }
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0.15, duration: 320, useNativeDriver: true }),
        ]),
        { iterations: PULSES },
      ).start(() => {
        Animated.timing(pulse, { toValue: 0, duration: 400, useNativeDriver: true }).start();
      });
    }, 450);
    return () => clearTimeout(timer);
  }, [active, pulse, scrollRef, topOffset]);

  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[styles.overlay, { opacity: pulse }]}
        testID={active ? 'focus-highlight' : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: -4,
    right: -4,
    bottom: -4,
    left: -4,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
  },
});
