import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';
import {
  AttemptNotice,
  Banner,
  FadeInView,
  FieldLabel,
  KycButton,
  KycCard,
  fieldStyles,
  kyc,
} from '@/src/features/verification/components/kycUi';
import { OtpCodeInput } from '@/src/features/verification/components/OtpCodeInput';
import { NameMatchGuideSheet } from '@/src/features/verification/components/NameMatchGuideSheet';
import type { AadhaarKyc } from '@/src/features/verification/useKycVerification';
import {
  formatAadhaar,
  formatCountdown,
  formatRetryAfter,
  maskAadhaar,
  type KycFlow,
} from '@/src/features/verification/kycLogic';

type Props = {
  kyc: AadhaarKyc;
  flow: KycFlow;
  profileName: string;
  onEditProfile: () => void;
  onDone: () => void;
};

export function AadhaarStep({ kyc: state, flow, profileName, onEditProfile, onDone }: Props) {
  const [guide, setGuide] = useState<{ open: boolean; afterFailure: boolean }>({ open: false, afterFailure: false });
  const previousStep = useRef(state.step);

  // A name/number mismatch is the one failure the user can fix themselves,
  // so explain how the moment it happens.
  useEffect(() => {
    if (state.step === 'failed' && previousStep.current !== 'failed') {
      setGuide({ open: true, afterFailure: true });
    }
    previousStep.current = state.step;
  }, [state.step]);

  const openGuide = (afterFailure: boolean) => setGuide({ open: true, afterFailure });
  const closeGuide = () => setGuide((g) => ({ ...g, open: false }));

  let panel;
  switch (state.step) {
    case 'otp':
      panel = <OtpPanel state={state} />;
      break;
    case 'verifying':
      panel = <VerifyingPanel />;
      break;
    case 'success':
      panel = <SuccessPanel flow={flow} onContinue={flow === 'individual' ? onDone : state.acknowledgeSuccess} />;
      break;
    case 'failed':
      panel = <FailedPanel state={state} onEditProfile={onEditProfile} onShowGuide={() => openGuide(true)} />;
      break;
    default:
      panel = (
        <NumberPanel
          state={state}
          profileName={profileName}
          onEditProfile={onEditProfile}
          onShowGuide={() => openGuide(false)}
        />
      );
  }

  return (
    <>
      {panel}
      <NameMatchGuideSheet
        variant="identity"
        visible={guide.open}
        afterFailure={guide.afterFailure}
        attemptsRemaining={state.attempts.remaining}
        profileName={profileName}
        onClose={closeGuide}
        onEditProfile={() => {
          closeGuide();
          onEditProfile();
        }}
      />
    </>
  );
}

function LockoutBanner({ state }: { state: AadhaarKyc }) {
  if (!state.lockedOut) return null;
  const retry = formatRetryAfter(state.attempts.retryAfter);
  return (
    <Banner
      tone="warning"
      testID="aadhaar-lockout"
      message={`You've used all Aadhaar verification attempts. ${retry ?? 'Please try again later'}.`}
    />
  );
}

function NumberPanel({
  state,
  profileName,
  onEditProfile,
  onShowGuide,
}: {
  state: AadhaarKyc;
  profileName: string;
  onEditProfile: () => void;
  onShowGuide: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const [showConsent, setShowConsent] = useState(false);

  return (
    <KycCard
      testID="aadhaar-number-step"
      icon="finger-print"
      title="Verify with Aadhaar"
      subtitle="Quick and secure OTP verification with your Indian Government ID."
    >
      <View style={fieldStyles.gap}>
        <View style={styles.nameCard}>
          <View style={styles.nameCardText}>
            <Text style={styles.nameCardLabel}>Name on your profile</Text>
            <Text style={styles.nameCardValue} numberOfLines={1}>
              {profileName || 'Not set'}
            </Text>
            <Text style={styles.nameCardHint}>
              Must match your Aadhaar exactly.{' '}
              <Text
                testID="aadhaar-name-help"
                style={styles.nameCardLink}
                onPress={onShowGuide}
                accessibilityRole="link"
              >
                See example
              </Text>
            </Text>
          </View>
          <Pressable onPress={onEditProfile} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit profile name">
            <Text style={styles.nameCardEdit}>Edit</Text>
          </Pressable>
        </View>

        <View>
          <FieldLabel>Aadhaar number</FieldLabel>
          <View style={[styles.aadhaarField, focused && fieldStyles.inputFocused]}>
            <Ionicons name="card-outline" size={20} color={focused ? kyc.navy : colors.textMuted} />
            <TextInput
              testID="aadhaar-input"
              accessibilityLabel="Aadhaar number"
              value={formatAadhaar(state.aadhaarNumber)}
              onChangeText={state.setAadhaarNumber}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="XXXX XXXX XXXX"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={14}
              autoComplete="off"
              importantForAutofill="no"
              editable={!state.lockedOut}
              style={styles.aadhaarInput}
            />
            {state.aadhaarNumber.length === 12 ? (
              <Ionicons name="checkmark-circle" size={20} color={kyc.success} />
            ) : (
              <Text style={styles.counter}>{state.aadhaarNumber.length}/12</Text>
            )}
          </View>
        </View>

        <Pressable
          testID="aadhaar-consent"
          onPress={() => state.setConsent(!state.consent)}
          style={styles.consentRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: state.consent }}
          accessibilityLabel="Consent to Aadhaar verification"
        >
          <View style={[styles.checkbox, state.consent && styles.checkboxOn]}>
            {state.consent ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
          </View>
          <Text style={styles.consentText}>
            I consent to identity verification using my Government of India-issued ID and to an OTP being
            sent to my Aadhaar-linked mobile number.
          </Text>
        </Pressable>

        <Pressable onPress={() => setShowConsent((v) => !v)} hitSlop={6}>
          <Text style={styles.consentToggle}>{showConsent ? 'Hide consent details' : 'View consent details'}</Text>
        </Pressable>
        {showConsent ? (
          <FadeInView>
            <Text style={styles.consentDetails}>
              Your Aadhaar details are verified through authorised UIDAI-enabled services (OKYC). We only keep a
              masked number and your verification status -- never your full Aadhaar number.
            </Text>
          </FadeInView>
        ) : null}

        {state.error ? <Banner tone="error" message={state.error} testID="aadhaar-error" /> : null}
        <LockoutBanner state={state} />

        <KycButton
          testID="send-otp"
          title={state.submitting ? 'Sending OTP…' : 'Send OTP'}
          icon="arrow-forward"
          loading={state.submitting}
          disabled={!state.canRequestOtp}
          onPress={state.requestOtp}
        />
        <AttemptNotice attempts={state.attempts} />
      </View>
    </KycCard>
  );
}

function OtpPanel({ state }: { state: AadhaarKyc }) {
  return (
    <KycCard
      testID="aadhaar-otp-step"
      icon="chatbubble-ellipses-outline"
      title="Enter the OTP"
      subtitle={`We sent a 6-digit code to the mobile linked with Aadhaar ${maskAadhaar(state.otpNumber)}.`}
    >
      <View style={fieldStyles.gap}>
        <OtpCodeInput
          value={state.otp}
          onChange={state.setOtp}
          hasError={!!state.error}
          autoFocus
          editable={!state.lockedOut}
          accessibilityLabel="Aadhaar OTP"
        />

        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Didn&apos;t receive the OTP?</Text>
          {state.resendSeconds > 0 ? (
            <Text style={styles.resendTimer} testID="resend-timer">
              Resend in {formatCountdown(state.resendSeconds)}
            </Text>
          ) : (
            <Pressable
              testID="resend-otp"
              onPress={state.resendOtp}
              disabled={!state.canResend}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={[styles.resendLink, !state.canResend && styles.resendDisabled]}>Resend OTP</Text>
            </Pressable>
          )}
        </View>

        {state.error ? <Banner tone="error" message={state.error} testID="aadhaar-error" /> : null}
        <LockoutBanner state={state} />

        <KycButton
          testID="verify-otp"
          title="Verify OTP"
          icon="shield-checkmark-outline"
          loading={state.submitting}
          disabled={!state.canVerify}
          onPress={state.verifyOtp}
        />
        <AttemptNotice attempts={state.attempts} />
        <KycButton variant="link" title="Use a different Aadhaar number" onPress={state.reset} />
      </View>
    </KycCard>
  );
}

const VERIFYING_STEPS = ['OTP verified', 'Verifying with UIDAI', 'Updating your profile'];

function VerifyingPanel() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (active >= VERIFYING_STEPS.length - 1) return;
    const timer = setTimeout(() => setActive((i) => i + 1), 900);
    return () => clearTimeout(timer);
  }, [active]);

  return (
    <KycCard
      testID="aadhaar-verifying-step"
      icon="sync-outline"
      title="Verifying your details"
      subtitle="Please wait while we confirm your Aadhaar with government records."
    >
      <View style={styles.checklist}>
        {VERIFYING_STEPS.map((label, index) => {
          const done = index < active;
          const current = index === active;
          return (
            <View key={label} style={styles.checkItem}>
              <View style={[styles.checkDot, done && styles.checkDotDone, current && styles.checkDotCurrent]}>
                {done ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
              </View>
              <Text style={[styles.checkLabel, (done || current) && styles.checkLabelActive]}>{label}</Text>
            </View>
          );
        })}
      </View>
    </KycCard>
  );
}

function SuccessPanel({ flow, onContinue }: { flow: KycFlow; onContinue: () => void }) {
  const next =
    flow === 'business' ? 'Continue to business verification' : flow === 'employee' ? 'Continue to work email' : 'Done';
  return (
    <FadeInView style={styles.successCard}>
      <View testID="aadhaar-success-step" style={styles.successInner}>
        <View style={styles.successHalo}>
          <View style={styles.successBadge}>
            <Ionicons name="shield-checkmark" size={40} color={colors.white} />
          </View>
        </View>
        <Text style={styles.successTitle} accessibilityRole="header">
          Identity verified!
        </Text>
        <Text style={styles.successBody}>
          {flow === 'individual'
            ? 'A verified badge now shows on your profile, helping you build more trust with clients.'
            : 'Your identity is confirmed. One more step to unlock your badge.'}
        </Text>
        <View style={styles.successBtn}>
          <KycButton testID="aadhaar-success-continue" title={next} icon="arrow-forward" onPress={onContinue} />
        </View>
      </View>
    </FadeInView>
  );
}

function FailedPanel({
  state,
  onEditProfile,
  onShowGuide,
}: {
  state: AadhaarKyc;
  onEditProfile: () => void;
  onShowGuide: () => void;
}) {
  return (
    <KycCard testID="aadhaar-failed-step" icon="alert-circle-outline" title="Verification failed">
      <View style={fieldStyles.gap}>
        <Banner tone="error" message={state.failureMessage ?? 'We could not verify your Aadhaar.'} />
        <LockoutBanner state={state} />
        <KycButton title="Update my profile details" icon="create-outline" onPress={onEditProfile} />
        <KycButton variant="secondary" title="Try again" onPress={state.reset} disabled={state.lockedOut} />
        <AttemptNotice attempts={state.attempts} />
        <KycButton variant="link" title="See how to fix this" onPress={onShowGuide} />
      </View>
    </KycCard>
  );
}

const styles = StyleSheet.create({
  nameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md - 4,
    borderRadius: radius.md,
    backgroundColor: kyc.tint,
  },
  nameCardText: { flex: 1 },
  nameCardLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  nameCardValue: {
    marginTop: 2,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: kyc.navyDeep,
  },
  nameCardHint: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  nameCardLink: {
    fontFamily: typography.fontFamily.semibold,
    color: kyc.navy,
    textDecorationLine: 'underline',
  },
  nameCardEdit: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: kyc.navy,
  },
  aadhaarField: {
    ...fieldStyles.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  aadhaarInput: {
    flex: 1,
    minHeight: 50,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.lg,
    letterSpacing: 1.5,
    color: colors.text,
  },
  counter: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + 2 },
  checkbox: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  checkboxOn: { backgroundColor: kyc.navy, borderColor: kyc.navy },
  consentText: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm - 1,
    lineHeight: 19,
    color: colors.text,
  },
  consentToggle: {
    marginTop: -spacing.sm,
    marginLeft: 32,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.xs,
    color: kyc.navy,
  },
  consentDetails: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    lineHeight: 18,
    color: colors.textSecondary,
    padding: spacing.sm + 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xs },
  resendLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm - 1,
    color: colors.textSecondary,
  },
  resendTimer: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm - 1,
    color: colors.textMuted,
  },
  resendLink: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm - 1,
    color: kyc.navy,
  },
  resendDisabled: { opacity: 0.4 },
  checklist: { gap: spacing.md, paddingVertical: spacing.xs },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4 },
  checkDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDotCurrent: { borderColor: kyc.navy },
  checkDotDone: { backgroundColor: kyc.success, borderColor: kyc.success },
  checkLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.textMuted,
  },
  checkLabelActive: { color: colors.text },
  successCard: {
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  successInner: { alignItems: 'center', padding: spacing.lg },
  successHalo: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: kyc.successTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: kyc.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    color: colors.text,
  },
  successBody: {
    marginTop: spacing.xs,
    textAlign: 'center',
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  successBtn: { alignSelf: 'stretch', marginTop: spacing.lg },
});
