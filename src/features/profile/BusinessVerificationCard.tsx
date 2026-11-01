import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';
import {
  getKycProgress,
  type KycActionStep,
  type KycFlow,
  type KycProgress,
} from '@/src/features/verification/kycLogic';

const VERIFY_BLUE = '#1E3A8A';
const VERIFY_GREEN = '#16A34A';

const INTRO: Record<KycFlow, { title: string; description: string }> = {
  individual: {
    title: 'Get Verified',
    description: 'Verify your identity to build trust and get a verified badge on your profile.',
  },
  business: {
    title: 'Get Verified as a Business',
    description: 'Verify your identity and business to build trust and get a verified badge on your profile.',
  },
  employee: {
    title: 'Get Verified',
    description: 'Verify your identity and company email to build trust and get a verified badge.',
  },
};

const STEP_COPY: Record<KycActionStep, { label: string; cta: string; remainingBody: string }> = {
  identity: {
    label: 'Verify identity with Aadhaar (OTP)',
    cta: 'Start Verification',
    remainingBody: '',
  },
  business: {
    label: 'Verify your GST registration',
    cta: 'Verify Business',
    remainingBody: 'Your identity is verified. Verify your GST registration to get your verified business badge.',
  },
  workEmail: {
    label: 'Verify your company work email',
    cta: 'Verify Work Email',
    remainingBody: 'Your identity is verified. Confirm your company work email to get your verified badge.',
  },
};

function stepsFor(flow: KycFlow): KycActionStep[] {
  if (flow === 'business') return ['identity', 'business'];
  if (flow === 'employee') return ['identity', 'workEmail'];
  return ['identity'];
}

type Props = {
  progress?: KycProgress;
  /** Shorthand for a user who hasn't started (used when no progress is known). */
  flow?: KycFlow;
  onPress?: () => void;
};

export function BusinessVerificationCard({ progress, flow = 'individual', onPress }: Props) {
  const state = progress ?? getKycProgress(flow, null);
  const steps = stepsFor(state.flow);
  const next = state.remaining[0] ?? 'identity';
  // "One step remaining" only once identity is done -- before that the user
  // sees the full introduction.
  const midway = state.identityDone && state.remaining.length > 0;
  const title = midway
    ? `${state.remaining.length} step${state.remaining.length === 1 ? '' : 's'} remaining`
    : INTRO[state.flow].title;
  const description = midway ? STEP_COPY[next].remainingBody : INTRO[state.flow].description;
  const cta = STEP_COPY[next].cta;

  const handlePress = () => {
    if (onPress) onPress();
    else router.push('/verification');
  };

  return (
    <Pressable
      testID="verification-promo-card"
      onPress={handlePress}
      style={styles.card}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${cta}`}
    >
      <LinearGradient
        colors={midway ? ['#DCFCE7', '#DBEAFE'] : ['#DBEAFE', '#EDE9FE']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.iconWrapper}>
            <Ionicons
              name={midway ? 'shield-half-outline' : 'shield-checkmark-outline'}
              size={28}
              color={midway ? VERIFY_GREEN : VERIFY_BLUE}
            />
          </View>
          <View style={styles.textContent}>
            {midway ? (
              <Text style={styles.eyebrow}>
                STEP {steps.length - state.remaining.length + 1} OF {steps.length}
              </Text>
            ) : null}
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
            <View style={styles.benefits}>
              {steps.map((step) => {
                const done = !state.remaining.includes(step);
                return (
                  <View key={step} style={styles.benefitRow} testID={`promo-step-${step}`}>
                    <Ionicons
                      name={done ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={done ? VERIFY_GREEN : VERIFY_BLUE}
                    />
                    <Text style={[styles.benefitText, done && styles.benefitDone]}>
                      {STEP_COPY[step].label}
                      {done ? ' · Done' : ''}
                    </Text>
                  </View>
                );
              })}
              <View style={styles.benefitRow}>
                <Ionicons name="ribbon-outline" size={16} color={VERIFY_BLUE} />
                <Text style={styles.benefitText}>Get a verified badge</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.ctaWrapper}>
          <Pressable onPress={handlePress} style={styles.ctaButton} hitSlop={4}>
            <Text style={styles.ctaText}>{cta}</Text>
            <Ionicons name="chevron-forward-outline" size={18} color={colors.white} />
          </Pressable>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.xl,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  gradient: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  content: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  textContent: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    letterSpacing: 1,
    color: VERIFY_GREEN,
    marginBottom: 2,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: VERIFY_BLUE,
    marginBottom: spacing.xs,
  },
  description: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 20,
    color: '#374151',
    marginBottom: spacing.md,
  },
  benefits: {
    gap: spacing.xs + 2,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  benefitText: {
    flexShrink: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: '#374151',
  },
  benefitDone: {
    color: '#15803D',
  },
  ctaWrapper: {
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(30, 58, 138, 0.15)',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: VERIFY_BLUE,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    elevation: 2,
    shadowColor: VERIFY_BLUE,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  ctaText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.white,
  },
});
