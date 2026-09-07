import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ONBOARDING_FEATURES } from '@/src/features/onboarding/slides';
import { colors, radius, typography } from '@/src/theme/tokens';

const BRAND_GREEN = '#F57D01';

export function FeatureGrid() {
  return (
    <View style={styles.grid}>
      {ONBOARDING_FEATURES.map((feature) => (
        <View key={feature.id} style={styles.item}>
          <View style={styles.iconWrap}>
            <Ionicons name={feature.icon} size={22} color={BRAND_GREEN} />
          </View>
          <Text style={styles.label}>{feature.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 8,
  },
  item: {
    width: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 8,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  label: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 12,
    color: colors.text,
    lineHeight: 15,
    textAlign: 'center',
  },
});
