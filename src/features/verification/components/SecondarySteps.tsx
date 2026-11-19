import { type ComponentProps, type ReactNode, type Ref, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
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
import { WorkProofStep } from '@/src/features/verification/components/WorkProofStep';
import type {
  ConsultantKyc,
  EmployeeMethodQuery,
  GstKyc,
  WorkEmailKyc,
  WorkProofKyc,
} from '@/src/features/verification/useKycVerification';
import { parseKycError } from '@/src/features/verification/kycLogic';
import { GSTIN_LENGTH, MAX_VERIFICATION_DOCUMENTS, formatRetryAfter } from '@/src/features/verification/kycLogic';
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

type WorkEmailStepProps = {
  email: WorkEmailKyc;
  workProof: WorkProofKyc;
  /** Backend decision: work email OTP or work proof, for companyName. */
  method: EmployeeMethodQuery;
  /** The company on the employee's profile. */
  companyName: string;
  onEditProfile: () => void;
};

/**
 * The employee's second step. The work email OTP is offered only when the
 * company's business owner whitelisted email domains on COBILDS; any other
 * company (no whitelist, or not registered) uploads work proof instead.
 */
export function WorkEmailStep({ email, workProof, method, companyName, onEditProfile }: WorkEmailStepProps) {
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

  // A submitted or approved work proof stays visible whatever the method.
  if (workProof.review === 'APPROVED' || workProof.review === 'PENDING') {
    return <WorkProofStep workProof={workProof} companyName={companyName} />;
  }

  if (!companyName.trim()) {
    return (
      <KycCard
        testID="work-email-company-missing"
        icon="business-outline"
        title="Add your company"
        subtitle="Add the company you work for on your profile, then come back to verify you work there."
      >
        <KycButton title="Edit profile" icon="create-outline" onPress={onEditProfile} />
      </KycCard>
    );
  }

  if (method.isLoading) {
    return (
      <KycCard testID="work-email-checking" icon="mail-outline" title="Verify your company" subtitle={`Checking ${companyName}…`}>
        <ActivityIndicator color={kyc.navy} />
      </KycCard>
    );
  }

  if (method.isError || !method.data) {
    return (
      <KycCard testID="work-email-method-error" icon="mail-outline" title="Verify your company">
        <View style={fieldStyles.gap}>
          <Banner
            tone="error"
            message={parseKycError(method.error, "Couldn't check your company. Please try again.").message}
          />
          <KycButton variant="secondary" title="Try again" icon="refresh" onPress={() => void method.refetch()} />
        </View>
      </KycCard>
    );
  }

  if (method.data.method === 'WORK_PROOF') {
    return (
      <WorkProofStep
        workProof={workProof}
        message={method.data.message}
        companyName={companyName}
        onEditProfile={onEditProfile}
      />
    );
  }

  const domains = method.data.emailDomains ?? [];
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
          placeholder={domains[0] ? `you@${domains[0]}` : 'you@yourcompany.com'}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          hint={
            domains.length
              ? `${method.data.organizationName ?? companyName} accepts ${domains.map((d) => `@${d}`).join(', ')} addresses.`
              : undefined
          }
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

// ── Licence review (Individual Consultants) ────────────────────────────

async function pickPdfs(consultant: ConsultantKyc) {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return;
  consultant.addDocuments(
    result.assets.map((a) => ({
      uri: a.uri,
      name: a.name || 'document.pdf',
      type: a.mimeType || 'application/pdf',
      size: a.size,
      file: a.file,
    })),
  );
}

export function ConsultantStep({ consultant }: { consultant: ConsultantKyc }) {
  const { review, record } = consultant;

  if (review === 'APPROVED') {
    return (
      <KycCard
        testID="consultant-approved"
        icon="ribbon"
        title="Licence verified"
        subtitle="Approved by the COBILDS verification team."
        badge={<StatusPill label="Verified" />}
      >
        <DetailRow label="Legal name" value={record?.legalName} verified />
        <DetailRow label="Licensing body" value={record?.licensingAuthority} />
        <DetailRow label="Licence no." value={record?.maskedLicenseNumber} />
      </KycCard>
    );
  }

  if (review === 'PENDING') {
    return (
      <KycCard
        testID="consultant-pending"
        icon="document-text-outline"
        title="Licence under review"
        subtitle="Our team is reviewing your licence. We'll notify you as soon as it's done."
        badge={<StatusPill label="In review" tone="pending" />}
      >
        <DetailRow label="Legal name" value={record?.legalName} />
        <DetailRow label="Licensing body" value={record?.licensingAuthority} />
        <DetailRow label="Licence no." value={record?.maskedLicenseNumber} />
      </KycCard>
    );
  }

  return (
    <KycCard
      testID="consultant-step"
      icon="document-text-outline"
      title="Verify your professional licence"
      subtitle="As an Individual Consultant, upload your licence or registration and proof of your consultancy practice. Our team reviews it manually."
    >
      <View style={fieldStyles.gap}>
        {review === 'REJECTED' ? (
          <Banner
            tone="error"
            testID="consultant-rejected"
            message={`Your last submission was not approved${record?.rejectionReason ? `: ${record.rejectionReason}` : '.'} Please correct it and submit again.`}
          />
        ) : null}
        <Field
          testID="consultant-legal-name"
          label="Full legal name"
          value={consultant.legalName}
          onChangeText={consultant.setLegalName}
          placeholder="As on your licence"
          autoCorrect={false}
        />
        <Field
          testID="consultant-authority"
          label="Licensing body (optional)"
          value={consultant.licensingAuthority}
          onChangeText={consultant.setLicensingAuthority}
          placeholder="e.g. Council of Architecture"
        />
        <Field
          testID="consultant-licence"
          label="Licence / registration number"
          value={consultant.licenseNumber}
          onChangeText={consultant.setLicenseNumber}
          placeholder="e.g. CA/2015/12345"
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <Field
          testID="consultant-certifications"
          label="Other certifications (optional)"
          value={consultant.certifications}
          onChangeText={consultant.setCertifications}
          placeholder="e.g. LEED AP, PMP"
        />

        <View>
          <FieldLabel>Documents</FieldLabel>
          <Text style={styles.codeHint}>
            Licence certificate plus proof of consultancy (e.g. letterhead, client work order). PDF, up to{' '}
            {MAX_VERIFICATION_DOCUMENTS} files, 10 MB each.
          </Text>
          {consultant.documents.map((doc) => (
            <View key={doc.uri} style={styles.docRow}>
              <Ionicons name="document-attach-outline" size={18} color={kyc.navy} />
              <Text style={styles.docName} numberOfLines={1}>
                {doc.name}
              </Text>
              <Pressable
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${doc.name}`}
                onPress={() => consultant.removeDocument(doc.uri)}
              >
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
          {consultant.documents.length < MAX_VERIFICATION_DOCUMENTS ? (
            <View style={styles.docAdd}>
              <KycButton
                testID="consultant-add-docs"
                variant="secondary"
                title={consultant.documents.length ? 'Add more PDFs' : 'Attach PDFs'}
                icon="attach"
                onPress={() => void pickPdfs(consultant)}
              />
            </View>
          ) : null}
        </View>

        {consultant.error ? <Banner tone="error" message={consultant.error} testID="consultant-error" /> : null}

        <KycButton
          testID="consultant-submit"
          title={consultant.submitting ? 'Submitting…' : 'Submit for review'}
          icon="arrow-forward"
          loading={consultant.submitting}
          disabled={!consultant.canSubmit}
          onPress={consultant.submit}
        />
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
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: 10,
    backgroundColor: kyc.tint,
  },
  docName: { flex: 1, fontFamily: typography.fontFamily.medium, fontSize: typography.size.sm, color: colors.text },
  docAdd: { marginTop: spacing.sm },
  codeHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm - 1,
    color: colors.textSecondary,
  },
});
