import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';
import { kyc } from '@/src/features/verification/components/kycUi';
import { STEP_LABELS, stepsForFlow, type KycFlow } from '@/src/features/verification/kycLogic';

const HERO_COPY: Record<KycFlow, { title: string; body: string }> = {
  individual: {
    title: 'Get your verified badge',
    body: 'Verify your identity with Aadhaar to show others your profile is authentic and trusted.',
  },
  business: {
    title: 'Get your business badge',
    body: 'Verify your identity, then your GST registration, to earn a verified business badge.',
  },
  employee: {
    title: 'Get your verified badge',
    body: 'Verify your identity with Aadhaar, then confirm your company work email.',
  },
};

export function KycHero({
  flow,
  currentStep,
  complete,
}: {
  flow: KycFlow;
  currentStep: number;
  complete: boolean;
}) {
  const steps = stepsForFlow(flow);
  const copy = HERO_COPY[flow];

  return (
    <LinearGradient
      colors={[kyc.navyDeep, kyc.navy, kyc.indigo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.heroTop}>
        <View style={styles.heroText}>
          <Text style={styles.heroEyebrow}>
            {complete ? 'ALL DONE' : steps.length > 1 ? `STEP ${currentStep + 1} OF ${steps.length}` : 'ONE QUICK STEP'}
          </Text>
          <Text style={styles.heroTitle}>{complete ? "You're verified" : copy.title}</Text>
          <Text style={styles.heroBody}>
            {complete ? 'Your verified badge is now visible on your profile.' : copy.body}
          </Text>
        </View>
        <View style={styles.heroShield}>
          <Ionicons name={complete ? 'shield-checkmark' : 'shield-half-outline'} size={34} color={colors.white} />
        </View>
      </View>

      {steps.length > 1 ? (
        <View style={styles.stepper} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: steps.length, now: complete ? steps.length : currentStep }}>
          {steps.map((key, index) => {
            const done = complete || index < currentStep;
            const active = !complete && index === currentStep;
            return (
              <View key={key} style={styles.stepItem}>
                <View style={styles.stepTrackRow}>
                  <View style={[styles.stepDot, done && styles.stepDotDone, active && styles.stepDotActive]}>
                    {done ? (
                      <Ionicons name="checkmark" size={13} color={kyc.navy} />
                    ) : (
                      <Text style={[styles.stepNum, active && styles.stepNumActive]}>{index + 1}</Text>
                    )}
                  </View>
                  {index < steps.length - 1 ? <View style={[styles.stepLine, done && styles.stepLineDone]} /> : null}
                </View>
                <Text style={[styles.stepLabel, (done || active) && styles.stepLabelActive]}>{STEP_LABELS[key]}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </LinearGradient>
  );
}

const BENEFITS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  { icon: 'people-outline', title: 'Build trust', body: 'Show clients you are a genuine professional.' },
  { icon: 'star-outline', title: 'Stand out', body: 'Verified profiles get noticed in search.' },
  { icon: 'trending-up-outline', title: 'More opportunities', body: 'Clients prefer verified profiles.' },
  { icon: 'lock-closed-outline', title: 'Secure & private', body: 'Your data is encrypted and never shared.' },
];

const FAQ = [
  {
    q: 'Is my Aadhaar number stored?',
    a: 'No. After verification we only keep a masked number and your verification status.',
  },
  {
    q: "What if I don't receive the OTP?",
    a: 'Check that your Aadhaar is linked to an active mobile number. You can resend the OTP once the timer ends.',
  },
  {
    q: 'Why did my verification fail?',
    a: 'The name on your profile must match your Aadhaar exactly. Update your profile name and try again.',
  },
  {
    q: 'Which business name should I enter?',
    a: "Use the 'Legal Name of Business' printed on your GST certificate, not your trade or brand name.",
  },
];

export function KycTrustSection({ flow }: { flow: KycFlow }) {
  const [open, setOpen] = useState<number | null>(null);
  const faq = flow === 'business' ? FAQ : FAQ.slice(0, 3);

  return (
    <View style={styles.trust}>
      <Text style={styles.sectionTitle}>Why get verified?</Text>
      <View style={styles.benefitGrid}>
        {BENEFITS.map((b) => (
          <View key={b.title} style={styles.benefit}>
            <View style={styles.benefitIcon}>
              <Ionicons name={b.icon} size={18} color={kyc.navy} />
            </View>
            <Text style={styles.benefitTitle}>{b.title}</Text>
            <Text style={styles.benefitBody}>{b.body}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.sectionTitle, styles.faqTitle]}>Questions</Text>
      <View style={styles.faq}>
        {faq.map((item, index) => {
          const expanded = open === index;
          return (
            <Pressable
              key={item.q}
              onPress={() => setOpen(expanded ? null : index)}
              style={[styles.faqItem, index > 0 && styles.faqDivider]}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
            >
              <View style={styles.faqHead}>
                <Text style={styles.faqQ}>{item.q}</Text>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
              </View>
              {expanded ? <Text style={styles.faqA}>{item.a}</Text> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.privacy}>
        <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
        <Text style={styles.privacyText}>
          Your information is encrypted and used only to verify your identity.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg - 4,
    marginBottom: spacing.md,
  },
  heroTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  heroText: { flex: 1 },
  heroEyebrow: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.7)',
  },
  heroTitle: {
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    color: colors.white,
  },
  heroBody: {
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm - 1,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.85)',
  },
  heroShield: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepper: { flexDirection: 'row', marginTop: spacing.lg - 4 },
  stepItem: { flex: 1 },
  stepTrackRow: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { borderColor: colors.white, backgroundColor: 'rgba(255,255,255,0.18)' },
  stepDotDone: { backgroundColor: colors.white, borderColor: colors.white },
  stepNum: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  stepNumActive: { color: colors.white },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 6,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  stepLineDone: { backgroundColor: colors.white },
  stepLabel: {
    marginTop: 6,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: 'rgba(255,255,255,0.6)',
  },
  stepLabelActive: { color: colors.white, fontFamily: typography.fontFamily.semibold },
  trust: { marginTop: spacing.sm },
  sectionTitle: {
    marginBottom: spacing.sm + 4,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  faqTitle: { marginTop: spacing.lg },
  benefitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2 },
  benefit: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: spacing.md - 2,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  benefitIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: kyc.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  benefitTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  benefitBody: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  faq: {
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  faqItem: { paddingVertical: spacing.md - 2 },
  faqDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  faqQ: {
    flex: 1,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  faqA: {
    marginTop: spacing.xs + 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm - 1,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  privacyText: {
    flexShrink: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
});
