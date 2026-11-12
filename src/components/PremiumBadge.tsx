import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '@/src/theme/tokens';

export const PREMIUM_GOLD = '#D4A017';
export const VERIFIED_BLUE = '#2563EB';

type Props = {
  /** 'premium' (gold crown) or 'verified' (blue shield). */
  tier?: 'premium' | 'verified';
  /** Show the word next to the icon ("Premium" / "Verified"). */
  label?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Marks a control as part of a paid plan, so a locked feature is
 * recognisable before it's tapped. Gold crown = Premium, blue shield =
 * Verified. Shown only while the viewer's plan doesn't include the feature.
 */
export function PremiumBadge({ tier = 'premium', label = false, size = 10, style }: Props) {
  const color = tier === 'premium' ? PREMIUM_GOLD : VERIFIED_BLUE;
  const icon = tier === 'premium' ? 'diamond' : 'shield-checkmark';
  if (!label) {
    return (
      <View
        style={[styles.dot, { backgroundColor: color, width: size + 6, height: size + 6, borderRadius: (size + 6) / 2 }, style]}
        accessibilityLabel={tier === 'premium' ? 'Premium feature' : 'Verified plan feature'}
      >
        <Ionicons name={icon} size={size} color="#fff" />
      </View>
    );
  }
  return (
    <View style={[styles.pill, { backgroundColor: color }, style]}>
      <Ionicons name={icon} size={size} color="#fff" />
      <Text style={styles.pillText}>{tier === 'premium' ? 'Premium' : 'Verified'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  pillText: { fontFamily: typography.fontFamily.semibold, fontSize: 10, color: '#fff' },
});
