import { spacing, typography } from '@/src/theme/tokens';
import { StyleSheet, Text, View } from 'react-native';

const STEPS = ['Profile setup', 'Role setup', 'Password setup', 'Email verification'] as const;
const TOTAL = STEPS.length;
const BRAND = '#F57D01';

type Props = {
  current: 0 | 1 | 2 | 3;
  /** Kept for call-site compatibility; compact bar never uses a card. */
  card?: boolean;
};

export function StepProgress({ current }: Props) {
  const title = STEPS[current];

  return (
    <View style={styles.wrap}>
      <Text style={styles.meta}>
        {title} · {current + 1} of {TOTAL}
      </Text>

      <View style={styles.track}>
        {STEPS.map((label, index) => {
          const active = index <= current;
          return (
            <View
              key={label}
              style={[styles.segment, active ? styles.segmentActive : styles.segmentIdle]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  meta: {
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: typography.fontFamily.semibold,
    fontSize: 13,
    color: BRAND,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  segmentActive: {
    backgroundColor: BRAND,
  },
  segmentIdle: {
    backgroundColor: '#E5E7EB',
  },
});
