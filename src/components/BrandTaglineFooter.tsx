import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/src/theme/tokens';

const SAFFRON = '#FF9933';
const INDIA_GREEN = '#138808';

export function BrandTaglineFooter() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.tagline}>
        BUILT BY TWO ARCHITECTS. FOR THE ENTIRE CONSTRUCTION INDUSTRY.
      </Text>
      <View style={styles.tricolor}>
        <View style={[styles.stripe, styles.saffron]} />
        <View style={[styles.stripe, styles.white]} />
        <View style={[styles.stripe, styles.green]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 4,
    paddingHorizontal: spacing.sm,
    width: '100%',
  },
  tagline: {
    textAlign: 'center',
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.3,
    color: colors.text,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  tricolor: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 280,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  stripe: {
    flex: 1,
  },
  saffron: {
    backgroundColor: SAFFRON,
  },
  white: {
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  green: {
    backgroundColor: INDIA_GREEN,
  },
});
