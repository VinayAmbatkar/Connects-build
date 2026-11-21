import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  VISIBLE_TAB_COUNT,
  type TourRect,
  type TourStep,
  type TourTarget,
} from '@/src/features/tour/tourSteps';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

type Props = {
  steps: TourStep[];
  visible: boolean;
  stepIndex: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  /** On-screen boxes of the page elements `element` steps point at. */
  rects?: Record<string, TourRect | undefined>;
};

const SPOT = 64; // spotlight ring diameter
const ARROW = 14;
const CARD_GUTTER = spacing.md;
const RECT_PAD = 6;
const DIM = 'rgba(15, 23, 42, 0.78)';

/** What gets highlighted: a round spot (a tab / the profile button) or a
 *  rounded box around a page element. */
type Focus =
  | { shape: 'circle'; x: number; y: number }
  | { shape: 'rect'; x: number; y: number; width: number; height: number };

/** Mirrors the tab bar (AnimatedTabBar: 56pt + bottom inset) and
 *  AppHeader layouts. */
function focusFor(
  target: TourTarget,
  rects: Props['rects'],
  width: number,
  height: number,
  insetTop: number,
  insetBottom: number,
): Focus | null {
  if (target.kind === 'tab') {
    const bottomPad = Math.max(insetBottom, 8);
    return {
      shape: 'circle',
      x: (width / VISIBLE_TAB_COUNT) * (target.index + 0.5),
      y: height - bottomPad - 28,
    };
  }
  if (target.kind === 'header-profile') {
    return { shape: 'circle', x: width - spacing.md - 26, y: insetTop + 6 + 20 };
  }
  if (target.kind === 'element') {
    const r = rects?.[target.key];
    if (!r || r.width <= 0 || r.height <= 0) return null; // not measured: centered card
    return {
      shape: 'rect',
      x: r.x - RECT_PAD,
      y: r.y - RECT_PAD,
      width: r.width + RECT_PAD * 2,
      height: r.height + RECT_PAD * 2,
    };
  }
  return null;
}

export function DemoTourOverlay({ steps, visible, stepIndex, onNext, onBack, onSkip, rects }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const step = steps[stepIndex] ?? steps[0];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex >= steps.length - 1;
  const focus = focusFor(step.target, rects, width, height, insets.top, insets.bottom);
  // Horizontal centre and top/bottom edges of the highlight.
  const anchorX = focus ? (focus.shape === 'circle' ? focus.x : focus.x + focus.width / 2) : 0;
  const focusTop = focus ? (focus.shape === 'circle' ? focus.y - SPOT / 2 : focus.y) : 0;
  const focusBottom = focus ? (focus.shape === 'circle' ? focus.y + SPOT / 2 : focus.y + focus.height) : 0;
  // Card goes below a highlight in the top half of the screen (arrow
  // pointing up), above one in the bottom half (arrow pointing down) --
  // or, when a tall element leaves room on neither side, floats at the
  // bottom of the screen over it, without an arrow.
  const CARD_ROOM = 290;
  const roomBelow = height - focusBottom - insets.bottom;
  const roomAbove = focusTop - insets.top;
  let placement: 'below' | 'above' | 'float' = 'float';
  if (focus) {
    const preferBelow = (focusTop + focusBottom) / 2 < height / 2;
    if (preferBelow && roomBelow >= CARD_ROOM) placement = 'below';
    else if (roomAbove >= CARD_ROOM) placement = 'above';
    else if (roomBelow >= CARD_ROOM) placement = 'below';
  }
  const pointsUp = placement === 'below';
  const spot = focus;

  // Card: fade + slide in on every step change.
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [stepIndex, visible, enter]);

  // Spotlight: a soft pulse that keeps drawing the eye.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    pulse.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [visible, pulse]);

  const slide = enter.interpolate({
    inputRange: [0, 1],
    outputRange: [pointsUp ? -16 : 16, 0],
  });

  const cardPosition = !spot
    ? { top: height * 0.28 }
    : placement === 'below'
      ? { top: focusBottom + ARROW + 6 }
      : placement === 'above'
        ? { bottom: height - focusTop + ARROW + 6 }
        : { bottom: insets.bottom + spacing.lg };
  const showArrow = !!spot && placement !== 'float';
  const cardWidth = width - CARD_GUTTER * 2;
  const arrowLeft = Math.min(
    Math.max(anchorX - CARD_GUTTER - ARROW, radius.xl),
    cardWidth - radius.xl - ARROW * 2,
  );
  // Skip sits in whichever corner the card leaves free.
  const skipAtBottom = placement === 'below';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onSkip}
    >
      <View style={[styles.overlay, spot?.shape === 'rect' && styles.overlayClear]}>
        {spot?.shape === 'rect' ? (
          <>
            {/* Dim everything except the highlighted element, so the real
                section shows through. */}
            <View pointerEvents="none" style={[styles.dim, { left: 0, right: 0, top: 0, height: Math.max(0, spot.y) }]} />
            <View pointerEvents="none" style={[styles.dim, { left: 0, right: 0, top: spot.y + spot.height, bottom: 0 }]} />
            <View pointerEvents="none" style={[styles.dim, { left: 0, width: Math.max(0, spot.x), top: spot.y, height: spot.height }]} />
            <View pointerEvents="none" style={[styles.dim, { left: spot.x + spot.width, right: 0, top: spot.y, height: spot.height }]} />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.rectPulse,
                {
                  left: spot.x,
                  top: spot.y,
                  width: spot.width,
                  height: spot.height,
                  opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }),
                  transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }],
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[styles.rect, { left: spot.x, top: spot.y, width: spot.width, height: spot.height }]}
            />
          </>
        ) : null}

        {spot?.shape === 'circle' ? (
          <>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pulse,
                {
                  left: spot.x - SPOT / 2,
                  top: spot.y - SPOT / 2,
                  opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
                  transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }],
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[styles.spot, { left: spot.x - SPOT / 2, top: spot.y - SPOT / 2 }]}
            >
              <Ionicons name={step.icon} size={26} color={colors.primary} />
            </View>
          </>
        ) : null}

        {!isLast ? (
          <Pressable
            onPress={onSkip}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Skip tour"
            style={[styles.skip, skipAtBottom ? { bottom: insets.bottom + spacing.lg } : { top: insets.top + spacing.sm }]}
          >
            <Text style={styles.skipText}>Skip</Text>
            <Ionicons name="close" size={16} color={colors.white} />
          </Pressable>
        ) : null}

        <Animated.View
          style={[
            styles.card,
            { width: cardWidth, left: CARD_GUTTER, opacity: enter, transform: [{ translateY: slide }] },
            cardPosition,
          ]}
          accessibilityViewIsModal
        >
          {showArrow ? (
            <View
              style={[
                styles.arrow,
                { left: arrowLeft },
                pointsUp ? { top: -ARROW / 2 - 1 } : { bottom: -ARROW / 2 - 1 },
              ]}
            />
          ) : !spot ? (
            <View style={styles.heroIcon}>
              <Ionicons name={step.icon} size={30} color={colors.white} />
            </View>
          ) : null}

          <View style={styles.headRow}>
            {spot ? (
              <View style={styles.iconBubble}>
                <Ionicons name={step.icon} size={18} color={colors.primary} />
              </View>
            ) : null}
            <View style={styles.headCopy}>
              <Text style={styles.kicker}>
                {isFirst ? 'QUICK TOUR' : `STEP ${stepIndex} OF ${steps.length - 1}`}
              </Text>
              <Text style={styles.title}>{step.title}</Text>
            </View>
          </View>
          <Text style={styles.body}>{step.body}</Text>

          <View style={styles.progress} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {steps.map((s, i) => (
              <View
                key={s.id}
                style={[styles.progressSeg, i <= stepIndex && styles.progressSegOn, i === stepIndex && styles.progressSegNow]}
              />
            ))}
          </View>

          <View style={styles.footer}>
            {isFirst ? (
              <Pressable onPress={onSkip} hitSlop={8} accessibilityRole="button" style={styles.ghostBtn}>
                <Text style={styles.ghostText}>Not now</Text>
              </Pressable>
            ) : (
              <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Previous tip" style={styles.ghostBtn}>
                <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
                <Text style={styles.ghostText}>Back</Text>
              </Pressable>
            )}
            <Pressable
              onPress={onNext}
              accessibilityRole="button"
              style={({ pressed }) => [styles.nextBtn, pressed && styles.pressed]}
            >
              <Text style={styles.nextText}>{isFirst ? 'Start tour' : isLast ? "Let's go" : 'Next'}</Text>
              <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={18} color={colors.white} />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: DIM,
  },
  overlayClear: {
    backgroundColor: 'transparent',
  },
  dim: {
    position: 'absolute',
    backgroundColor: DIM,
  },
  spot: {
    position: 'absolute',
    width: SPOT,
    height: SPOT,
    borderRadius: SPOT / 2,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  rect: {
    position: 'absolute',
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  rectPulse: {
    position: 'absolute',
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  pulse: {
    position: 'absolute',
    width: SPOT,
    height: SPOT,
    borderRadius: SPOT / 2,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  skip: {
    position: 'absolute',
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  skipText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.white,
  },
  card: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  arrow: {
    position: 'absolute',
    width: ARROW * 2,
    height: ARROW * 2,
    marginLeft: 0,
    backgroundColor: colors.white,
    borderRadius: 4,
    transform: [{ rotate: '45deg' }, { scale: 0.7 }],
  },
  heroIcon: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    marginTop: -spacing.lg - 32,
    marginBottom: spacing.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.white,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headCopy: { flex: 1 },
  kicker: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xs,
    letterSpacing: 1,
    color: colors.primary,
    marginBottom: 2,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    color: colors.text,
    letterSpacing: -0.3,
  },
  body: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  progress: {
    flexDirection: 'row',
    gap: 5,
    marginTop: spacing.md,
  },
  progressSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  progressSegOn: {
    backgroundColor: colors.primaryMuted,
  },
  progressSegNow: {
    backgroundColor: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    paddingRight: spacing.md,
  },
  ghostText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.textSecondary,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  nextText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.white,
  },
  pressed: { opacity: 0.9 },
});
