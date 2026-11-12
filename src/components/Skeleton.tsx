import { useEffect } from 'react';
import { Animated, Easing, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/src/theme/tokens';

/**
 * Skeleton placeholders -- grey shapes in the layout of the content that's
 * loading, gently pulsing, instead of a centred spinner. Each page uses the
 * preset matching its own layout so nothing jumps when the data arrives.
 *
 * All bones on screen share one animation driver.
 */

const pulse = new Animated.Value(0);
let running = 0;
let loop: Animated.CompositeAnimation | null = null;

function usePulse() {
  useEffect(() => {
    running += 1;
    if (running === 1) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      );
      loop.start();
    }
    return () => {
      running -= 1;
      if (running === 0) {
        loop?.stop();
        loop = null;
      }
    };
  }, []);
  return pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] });
}

type BoneProps = {
  width?: DimensionValue;
  height?: number;
  round?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** One grey placeholder shape. */
export function Bone({ width = '100%', height = 12, round = false, style }: BoneProps) {
  const opacity = usePulse();
  return (
    <Animated.View
      style={[
        styles.bone,
        { width, height, borderRadius: round ? height / 2 : radius.sm, opacity },
        style,
      ]}
    />
  );
}

/** Avatar + two lines -- people, conversations, notifications, settings rows. */
export function ListSkeleton({ rows = 6, avatar = 44 }: { rows?: number; avatar?: number }) {
  return (
    <View style={styles.page} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.listRow}>
          <Bone width={avatar} height={avatar} round />
          <View style={styles.flex}>
            <Bone width="55%" height={13} />
            <Bone width="80%" height={11} style={styles.gapTop} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Feed posts: header row, two text lines, media block, action bar. */
export function FeedSkeleton({ posts = 2 }: { posts?: number }) {
  return (
    <View style={styles.pageFlush} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: posts }, (_, i) => (
        <View key={i} style={styles.post}>
          <View style={styles.listRowTight}>
            <Bone width={44} height={44} round />
            <View style={styles.flex}>
              <Bone width="45%" height={13} />
              <Bone width="65%" height={11} style={styles.gapTop} />
            </View>
          </View>
          <Bone width="85%" height={14} style={styles.gapTopL} />
          <Bone width="95%" height={11} style={styles.gapTop} />
          <Bone height={220} style={styles.gapTopL} />
          <View style={styles.actions}>
            <Bone width={60} height={12} />
            <Bone width={80} height={12} />
            <Bone width={60} height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** A profile page: cover, avatar, name/role lines, two buttons, cards. */
export function ProfileSkeleton() {
  return (
    <View style={styles.pageFlush} accessibilityLabel="Loading" accessibilityRole="progressbar">
      <Bone height={110} style={{ borderRadius: 0 }} />
      <View style={styles.profileBody}>
        <Bone width={96} height={96} round style={styles.profileAvatar} />
        <Bone width="55%" height={22} />
        <Bone width="35%" height={13} style={styles.gapTop} />
        <Bone width="65%" height={12} style={styles.gapTop} />
        <View style={styles.buttons}>
          <Bone height={44} round style={styles.flex} />
          <Bone height={44} round style={styles.flex} />
        </View>
        <Bone height={90} style={styles.gapTopL} />
        <Bone height={120} style={styles.gapTopL} />
      </View>
    </View>
  );
}

/** A chat thread: alternating bubbles. */
export function ChatSkeleton() {
  const bubbles: [DimensionValue, boolean][] = [
    ['55%', false], ['40%', true], ['65%', false], ['35%', true], ['50%', true], ['60%', false],
  ];
  return (
    <View style={styles.page} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {bubbles.map(([w, mine], i) => (
        <Bone key={i} width={w} height={38} style={[styles.bubble, mine && styles.bubbleMine]} />
      ))}
    </View>
  );
}

/** Generic form/detail page: title and a few blocks. */
export function DetailSkeleton() {
  return (
    <View style={styles.page} accessibilityLabel="Loading" accessibilityRole="progressbar">
      <Bone width="50%" height={20} />
      <Bone height={48} style={styles.gapTopL} />
      <Bone height={48} style={styles.gapTopL} />
      <Bone height={96} style={styles.gapTopL} />
      <Bone height={48} style={styles.gapTopL} />
    </View>
  );
}

const styles = StyleSheet.create({
  bone: { backgroundColor: colors.surfaceMuted },
  page: { flex: 1, padding: spacing.md, backgroundColor: colors.background },
  pageFlush: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  gapTop: { marginTop: 8 },
  gapTopL: { marginTop: spacing.md },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  listRowTight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  post: {
    padding: spacing.md,
    borderBottomWidth: 8,
    borderBottomColor: colors.surface,
  },
  actions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.md },
  profileBody: { paddingHorizontal: spacing.md },
  profileAvatar: { marginTop: -48, marginBottom: spacing.md, borderWidth: 4, borderColor: colors.background },
  buttons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  bubble: { borderRadius: radius.lg, marginBottom: 10 },
  bubbleMine: { alignSelf: 'flex-end' },
});
