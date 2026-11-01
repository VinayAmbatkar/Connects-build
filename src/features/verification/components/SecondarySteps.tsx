import { type ComponentProps, type ReactNode, type Ref, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/src/theme/tokens';
import {
  AttemptNotice,
  Banner,
  DetailRow,
  FieldLabel,
  KycButton,
  KycCard,
  StatusPill,
  fieldStyles,
  kyc,
} from '@/src/features/verification/components/kycUi';
import { OtpCodeInput } from '@/src/features/verification/components/OtpCodeInput';
import { NameMatchGuideSheet } from '@/src/features/verification/components/NameMatchGuideSheet';
import type { GstKyc, WorkEmailKyc } from '@/src/features/verification/useKycVerification';
import { GSTIN_LENGTH, formatRetryAfter } from '@/src/features/verification/kycLogic';
import type { GSTVerificationResult } from '@/src/types/api';

function Field({
  label,
  hint,
  testID,
  inputRef,
  labelAccessory,
  ...input
}: ComponentProps<typeof TextInput> & {
  label: string;
  hint?: string;
  inputRef?: Ref<TextInput>;
  labelAccessory?: ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <View style={styles.labelRow}>
        <FieldLabel>{label}</FieldLabel>
        {labelAccessory}
      </View>
      <TextInput
        ref={inputRef}
        testID={testID}
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[fieldStyles.input, focused && fieldStyles.inputFocused]}
        {...input}
      />
      {hint ? <Text style={fieldStyles.hint}>{hint}</Text> : null}
    </View>
  );
}

// ── GST ──────────────────────────────────────────────────────────────────

export function GstStep({ gst }: { gst: GstKyc }) {
  const legalNameRef = useRef<TextInput>(null);
  const [guide, setGuide] = useState<{ open: boolean; afterFailure: boolean }>({ open: false, afterFailure: false });

  // Every rejected name opens the guide -- the usual cause is the trade name
  // or a "PVT LTD" vs "PRIVATE LIMITED" style difference.
  const handledMismatches = useRef(gst.mismatchCount);
  useEffect(() => {
    if (gst.mismatchCount > handledMismatches.current) {
      handledMismatches.current = gst.mismatchCount;
      setGuide({ open: true, afterFailure: true });
    }
  }, [gst.mismatchCount]);

  if (gst.verified && gst.result) return <GstVerifiedCard result={gst.result} />;

  const retry = gst.lockedOut ? formatRetryAfter(gst.attempts.retryAfter) : null;
  const closeGuide = () => setGuide((g) => ({ ...g, open: false }));
  return (
    <>
    <KycCard
      testID="gst-step"
      icon="business-outline"
      title="Verify your business"
      subtitle="We confirm your GST registration in real time with the GST network."
    >
      <View style={fieldStyles.gap}>
        <Field
          testID="gst-legal-name"
          label="Legal business name"
          value={gst.legalName}
          onChangeText={gst.setLegalName}
          placeholder="As registered on the GST portal"
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!gst.lockedOut}
          inputRef={legalNameRef}
          labelAccessory={
            <Pressable
              testID="gst-name-help"
              onPress={() => setGuide({ open: true, afterFailure: false })}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="How to find your legal business name"
              style={styles.helpLink}
            >
              <Ionicons name="help-circle-outline" size={16} color={kyc.navy} />
              <Text style={styles.helpText}>Where do I find this?</Text>
            </Pressable>
          }
          hint="Enter the exact 'Legal Name of Business' from your GST certificate, not the trade name."
        />
        <Field
          testID="gst-number"
          label="GSTIN"
          value={gst.gstin}
          onChangeText={gst.setGstin}
          placeholder="e.g. 27ABCDE1234F1Z5"
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          maxLength={GSTIN_LENGTH}
          editable={!gst.lockedOut}
          hint={`${gst.gstin.length}/${GSTIN_LENGTH} characters`}
        />

        {gst.error ? <Banner tone="error" message={gst.error} testID="gst-error" /> : null}
        {gst.lockedOut ? (
          <Banner tone="warning" message={`GST attempt limit reached. ${retry ?? 'Please try again later'}.`} />
        ) : null}

        <KycButton
          testID="verify-gst"
          title={gst.submitting ? 'Verifying GST registration…' : 'Verify GST registration'}
          icon="arrow-forward"
          loading={gst.submitting}
          disabled={!gst.canSubmit}
          onPress={gst.submit}
        />
        <AttemptNotice attempts={gst.attempts} label="GST attempts remaining" />
      </View>
    </KycCard>
    <NameMatchGuideSheet
      variant="business"
      visible={guide.open}
      afterFailure={guide.afterFailure}
      attemptsRemaining={gst.attempts.remaining}
      enteredName={guide.afterFailure ? gst.submittedName : gst.legalName}
      onClose={closeGuide}
      onFixName={() => {
        closeGuide();
        // Let the sheet's close animation start before the keyboard opens.
        setTimeout(() => legalNameRef.current?.focus(), 300);
      }}
    />
    </>
  );
}

function GstVerifiedCard({ result }: { result: GSTVerificationResult }) {
  const address = result.principalAddress;
  const addressLine = [
    address?.fullAddress,
    [address?.city, address?.state].filter(Boolean).join(', '),
    address?.pincode,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <KycCard
      testID="gst-verified"
      icon="business"
      title="Business verified"
      subtitle="Details from your GST registration."
      badge={<StatusPill label="Verified" />}
    >
      <DetailRow label="Legal name" value={result.legalName} verified />
      <DetailRow label="GSTIN" value={result.maskedGstin || result.gstin} />
      <DetailRow label="Trade name" value={result.tradeName} />
      <DetailRow label="PAN" value={result.panNumber} />
      <DetailRow label="Constitution" value={result.constitutionOfBusiness} />
      <DetailRow label="Taxpayer type" value={result.taxpayerType} />
      <DetailRow label="GST status" value={result.gstinStatus} />
      <DetailRow label="Registered on" value={result.registrationDate} />
      <DetailRow label="Principal address" value={addressLine} />
      {result.natureOfBusiness?.length ? (
        <View style={styles.tags}>
          {result.natureOfBusiness.map((item) => (
            <View key={item} style={styles.tag}>
              <Text style={styles.tagText}>{item}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </KycCard>
  );
}

// ── Work email ───────────────────────────────────────────────────────────

export function WorkEmailStep({ email }: { email: WorkEmailKyc }) {
  if (email.verified) {
    return (
      <KycCard
        testID="work-email-verified"
        icon="mail"
        title="Work email verified"
        badge={<StatusPill label="Verified" />}
      >
        <DetailRow label="Company work email" value={email.verifiedEmail ?? email.email} verified />
      </KycCard>
    );
  }

  return (
    <KycCard
      testID="work-email-step"
      icon="mail-outline"
      title="Verify your work email"
      subtitle="We'll send a one-time code to your company email to confirm you can access it."
    >
      <View style={fieldStyles.gap}>
        <Field
          testID="work-email-input"
          label="Company work email"
          value={email.email}
          onChangeText={email.setEmail}
          placeholder="you@yourcompany.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
        />

        <KycButton
          testID="send-email-code"
          variant={email.codeAvailable ? 'secondary' : 'primary'}
          title={email.codeAvailable ? 'Resend code' : 'Send code'}
          icon={email.codeAvailable ? 'refresh' : 'arrow-forward'}
          loading={email.sending}
          disabled={!email.canSend}
          onPress={email.sendCode}
        />

        {email.codeAvailable ? (
          <View style={fieldStyles.gap}>
            <Text style={styles.codeHint}>Enter the 6-digit code sent to {email.email.trim()}</Text>
            <OtpCodeInput
              testID="email-otp-input"
              value={email.code}
              onChange={email.setCode}
              hasError={!!email.error}
              accessibilityLabel="Work email code"
            />
            <KycButton
              testID="verify-email-code"
              title="Verify code"
              icon="shield-checkmark-outline"
              loading={email.verifying}
              disabled={!email.canVerify}
              onPress={email.verifyCode}
            />
          </View>
        ) : null}

        {email.error ? <Banner tone="error" message={email.error} testID="work-email-error" /> : null}
      </View>
    </KycCard>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  helpLink: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  helpText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.xs,
    color: kyc.navy,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingTop: spacing.sm + 2 },
  tag: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: kyc.tint,
  },
  tagText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: kyc.navy,
  },
  codeHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm - 1,
    color: colors.textSecondary,
  },
});
