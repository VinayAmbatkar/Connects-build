import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LogoMark } from '@/src/features/onboarding/LogoMark';
import { colors, typography } from '@/src/theme/tokens';

type Props = {
  onPress?: () => void;
  /** Kept for call-site compatibility; brand mark is always COBILDS. */
  accentName?: boolean;
  /** Kept for call-site compatibility; brand mark is always COBILDS. */
  splitName?: boolean;
  /** Show "MADE IN BHARATH" under the logo (login/signup). */
  showMadeInBharath?: boolean;
};

export function BrandHeader({ onPress, showMadeInBharath }: Props) {
  const content = (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <LogoMark size={40} />
        <Text style={styles.name} accessibilityRole="header">
          COBILDS
        </Text>
      </View>
      {showMadeInBharath ? (
        <Text style={styles.madeIn}>MADE IN BHARATH</Text>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button">
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  name: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 18,
    color: colors.black,
    letterSpacing: 6,
    lineHeight: 22,
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
  madeIn: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    letterSpacing: 2.2,
    color: colors.textMuted,
    textTransform: 'uppercase',
    includeFontPadding: false,
  },
});
