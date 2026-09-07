import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/src/components/Button';
import { TOUR_STEPS } from '@/src/features/tour/tourSteps';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

type Props = {
  visible: boolean;
  stepIndex: number;
  onNext: () => void;
  onSkip: () => void;
};

export function DemoTourOverlay({ visible, stepIndex, onNext, onSkip }: Props) {
  const step = TOUR_STEPS[stepIndex] ?? TOUR_STEPS[0];
  const isLast = stepIndex >= TOUR_STEPS.length - 1;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.kicker}>
            Tip {stepIndex + 1} of {TOUR_STEPS.length}
          </Text>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.body}>{step.body}</Text>
          <Button title={isLast ? 'Done' : 'Next'} onPress={onNext} />
          <Pressable onPress={onSkip} style={styles.skip}>
            <Text style={styles.skipText}>Skip tour</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  kicker: {
    fontFamily: typography.fontFamily.medium,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  body: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  skip: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  skipText: {
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
  },
});
