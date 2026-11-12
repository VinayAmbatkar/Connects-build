import { useEffect, useMemo, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';
import { useFreemiumStore } from '@/src/features/billing/freemiumStore';

const CONFETTI_COLORS = ['#F57D01', '#FFB020', '#FFD166', '#16A34A', '#3B82F6', '#EC4899', '#8B5CF6', '#FFFFFF'];
const PIECES = 60;
const FALL_MS = 3200;

type Piece = {
  x: number;
  delay: number;
  drift: number;
  spin: number;
  size: number;
  color: string;
  round: boolean;
};

/** One falling, tumbling confetti piece (native-driver animation). */
function ConfettiPiece({ piece, height, progress }: { piece: Piece; height: number; progress: Animated.Value }) {
  const local = progress.interpolate({
    inputRange: [0, piece.delay, 1],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });
  const translateY = local.interpolate({ inputRange: [0, 1], outputRange: [-40, height + 40] });
  const translateX = local.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, piece.drift, 0, -piece.drift, 0] });
  const rotate = local.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${piece.spin}deg`] });
  const rotateX = local.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${piece.spin * 2}deg`] });
  const opacity = local.interpolate({ inputRange: [0, 0.05, 0.85, 1], outputRange: [0, 1, 1, 0] });
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: piece.x,
        top: 0,
        width: piece.size,
        height: piece.round ? piece.size : piece.size * 1.6,
        borderRadius: piece.round ? piece.size / 2 : 2,
        backgroundColor: piece.color,
        opacity,
        transform: [{ translateX }, { translateY }, { rotate }, { rotateX }],
      }}
    />
  );
}

/**
 * "Congratulations!" popup after a successful "Claim it free", with a
 * confetti shower. Mounted once (via FreemiumBridge); all text comes from
 * the claim response.
 */
export function FreemiumCelebration() {
  const celebration = useFreemiumStore((s) => s.celebration);
  const close = useFreemiumStore((s) => s.closeCelebration);
  const { width, height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: PIECES }, () => ({
        x: Math.random() * width,
        delay: Math.random() * 0.45,
        drift: 15 + Math.random() * 35,
        spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 540),
        size: 6 + Math.random() * 6,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        round: Math.random() < 0.25,
      })),
    // New pieces for each celebration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [celebration, width],
  );

  useEffect(() => {
    if (!celebration) return;
    progress.setValue(0);
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled || reduced) return;
      Animated.timing(progress, { toValue: 1, duration: FALL_MS, easing: Easing.linear, useNativeDriver: true }).start();
    });
    return () => {
      cancelled = true;
    };
  }, [celebration, progress, pop]);

  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

  return (
    <Modal visible={!!celebration} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={styles.overlay}>
        {celebration ? (
          <Animated.View style={[styles.panel, { opacity: pop, transform: [{ scale }] }]} accessibilityViewIsModal>
            <ScrollView contentContainerStyle={styles.panelContent} showsVerticalScrollIndicator={false}>
              <View style={styles.hero}>
                <Ionicons name="trophy" size={38} color={colors.primary} />
              </View>
              <Text style={styles.title} accessibilityRole="header">{celebration.title}</Text>

              <View style={styles.badges}>
                {celebration.products.map((p) => (
                  <View key={p} style={[styles.badge, p === 'Premium' && styles.badgePremium]}>
                    <Ionicons
                      name={p === 'Premium' ? 'diamond' : 'checkmark-circle'}
                      size={14}
                      color={p === 'Premium' ? '#FFD166' : colors.white}
                    />
                    <Text style={[styles.badgeText, p === 'Premium' && styles.badgeTextPremium]}>{p} unlocked</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.message}>{celebration.message}</Text>

              {celebration.features.length ? (
                <View style={styles.features}>
                  {celebration.features.map((f) => (
                    <View key={f} style={styles.featureRow}>
                      <Ionicons name="checkmark" size={15} color={colors.success} />
                      <Text style={styles.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={close}
                style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.ctaText}>{celebration.cta_label || 'Start exploring'}</Text>
              </Pressable>
            </ScrollView>
          </Animated.View>
        ) : null}

        {/* Above the panel, never catching touches. */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {celebration ? pieces.map((p, i) => <ConfettiPiece key={i} piece={p} height={height} progress={progress} />) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.overlay,
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '88%',
    borderRadius: radius.xl,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  panelContent: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  hero: {
    width: 76,
    height: 76,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    borderWidth: 3,
    borderColor: colors.primaryLight,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    color: colors.text,
    textAlign: 'center',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: spacing.md - 4,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  badgePremium: { backgroundColor: colors.secondary },
  badgeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xs + 1,
    color: colors.white,
  },
  badgeTextPremium: { color: '#FFD166' },
  message: {
    marginTop: spacing.md,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  features: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featureText: {
    flexShrink: 1,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  cta: {
    alignSelf: 'stretch',
    minHeight: 50,
    marginTop: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  ctaText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.white,
  },
});
