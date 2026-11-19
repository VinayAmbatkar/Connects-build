import { type ComponentProps, type ReactNode, type Ref, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { colors, spacing, typography } from '@/src/theme/tokens';
import {
  Banner,
  DetailRow,
  FieldLabel,
  KycButton,
  KycCard,
  StatusPill,
  fieldStyles,
  kyc,
} from '@/src/features/verification/components/kycUi';
import type { WorkProofKyc } from '@/src/features/verification/useKycVerification';
import { MAX_VERIFICATION_DOCUMENTS } from '@/src/features/verification/kycLogic';

type WorkProofType = 'OFFER_LETTER' | 'OFFICE_ID';

const WORK_PROOF_TYPES: { value: WorkProofType; label: string; description: string }[] = [
  { value: 'OFFER_LETTER', label: 'Offer Letter', description: 'Employment offer letter from your company' },
  { value: 'OFFICE_ID', label: 'Office ID', description: 'Company-issued ID card proving you work there' },
];

async function pickDocuments(k: WorkProofKyc) {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/jpeg', 'image/png'],
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return;
  k.addDocuments(
    result.assets.map((a) => ({
      uri: a.uri,
      name: a.name || 'document',
      type: a.mimeType || 'application/pdf',
      size: a.size,
      file: a.file,
    })),
  );
}

function WorkProofTypeSelector({ 
  value, 
  onChange, 
  error 
}: { 
  value: WorkProofType | '';
  onChange: (v: WorkProofType) => void;
  error?: string;
}) {
  return (
    <View>
      <FieldLabel>Work Proof Type</FieldLabel>
      <View style={styles.typeSelector}>
        {WORK_PROOF_TYPES.map((t) => (
          <Pressable
            key={t.value}
            onPress={() => onChange(t.value)}
            style={({ pressed }) => [
              styles.typeOption,
              value === t.value && styles.typeOptionSelected,
              pressed && styles.typeOptionPressed,
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ selected: value === t.value }}
          >
            <View style={styles.typeOptionContent}>
              <Text style={[
                styles.typeOptionLabel,
                value === t.value && styles.typeOptionLabelSelected,
              ]}>
                {t.label}
              </Text>
              <Text style={[
                styles.typeOptionDesc,
                value === t.value && styles.typeOptionDescSelected,
              ]}>
                {t.description}
              </Text>
            </View>
            {value === t.value && (
              <Ionicons name="checkmark-circle" size={22} color={kyc.navy} />
            )}
          </Pressable>
        ))}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

export const DEFAULT_WORK_PROOF_MESSAGE =
  'The whitelisted work email is not provided by your business owner. Please upload your work proof.';

export function WorkProofStep({
  workProof,
  message,
  companyName,
  onEditProfile,
}: {
  workProof: WorkProofKyc;
  /** Why work proof is needed (from the backend's method check). */
  message?: string;
  companyName?: string;
  onEditProfile?: () => void;
}) {
  const { review, record } = workProof;

  if (review === 'APPROVED') {
    return (
      <KycCard
        testID="work-proof-approved"
        icon="ribbon"
        title="Work proof approved"
        subtitle="Approved by the COBILDS verification team."
        badge={<StatusPill label="Verified" />}
      >
        <DetailRow label="Company" value={record?.companyLegalName ?? companyName} verified />
        <DetailRow label="Work proof" value={record?.licensingAuthority} verified />
        <DetailRow label="Email" value={record?.companyEmail} />
      </KycCard>
    );
  }

  if (review === 'PENDING') {
    return (
      <KycCard
        testID="work-proof-pending"
        icon="document-text-outline"
        title="Work proof under review"
        subtitle="Our team is reviewing your work proof. We'll notify you as soon as it's approved or rejected."
        badge={<StatusPill label="In review" tone="pending" />}
      >
        <DetailRow label="Company" value={record?.companyLegalName ?? companyName} />
        <DetailRow label="Work proof" value={record?.licensingAuthority} />
        <DetailRow label="Email" value={record?.companyEmail} />
      </KycCard>
    );
  }

  const selectedType = WORK_PROOF_TYPES.find((t) => t.value === workProof.workProofType);

  return (
    <KycCard
      testID="work-proof-step"
      icon="document-text-outline"
      title="Verify with work proof"
      subtitle="Upload your offer letter or office ID card. Our team reviews it manually."
    >
      <View style={fieldStyles.gap}>
        <Banner tone="info" testID="work-proof-reason" message={message || DEFAULT_WORK_PROOF_MESSAGE} />

        {review === 'REJECTED' ? (
          <Banner
            tone="error"
            testID="work-proof-rejected"
            message={`Your last submission was rejected${record?.rejectionReason ? `. Reason: ${record.rejectionReason}` : '.'} Please upload a valid document and submit again.`}
          />
        ) : null}

        <View style={styles.companyBox}>
          <View style={styles.flex}>
            <Text style={styles.companyLabel}>Company</Text>
            <Text style={styles.companyName} numberOfLines={2}>
              {workProof.unlistedCompanyName || companyName || 'Not set'}
            </Text>
          </View>
          {onEditProfile ? (
            <KycButton variant="link" title="Change" onPress={onEditProfile} testID="work-proof-change-company" />
          ) : null}
        </View>

        <Field
          testID="work-proof-legal-name"
          label="Full legal name"
          value={workProof.legalName}
          onChangeText={workProof.setLegalName}
          placeholder="As on your documents"
          autoCorrect={false}
        />

        <Field
          testID="work-proof-company-email"
          label="Email"
          value={workProof.companyEmail}
          onChangeText={workProof.setCompanyEmail}
          placeholder="you@company.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          hint="Your work email if you have one, otherwise an email we can reach you at."
        />

        <WorkProofTypeSelector
          value={workProof.workProofType}
          onChange={workProof.setWorkProofType}
          error={workProof.workProofTypeError ?? undefined}
        />

        <View>
          <FieldLabel>Documents</FieldLabel>
          <Text style={styles.codeHint}>
            {`Upload your ${selectedType ? selectedType.label.toLowerCase() : 'work proof document'} (PDF, JPG, PNG). Up to ${MAX_VERIFICATION_DOCUMENTS} files, 10 MB each.`}
          </Text>
          {workProof.documents.map((doc) => (
            <View key={doc.uri} style={styles.docRow}>
              <Ionicons name="document-attach-outline" size={18} color={kyc.navy} />
              <Text style={styles.docName} numberOfLines={1}>
                {doc.name}
              </Text>
              <Pressable
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${doc.name}`}
                onPress={() => workProof.removeDocument(doc.uri)}
              >
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
          {workProof.documents.length < MAX_VERIFICATION_DOCUMENTS ? (
            <View style={styles.docAdd}>
              <KycButton
                testID="work-proof-add-docs"
                variant="secondary"
                title={workProof.documents.length ? 'Add more documents' : 'Attach documents'}
                icon="attach"
                onPress={() => void pickDocuments(workProof)}
              />
            </View>
          ) : null}
        </View>

        {workProof.error ? <Banner tone="error" message={workProof.error} testID="work-proof-error" /> : null}

        <KycButton
          testID="work-proof-submit"
          title={workProof.submitting ? 'Submitting…' : 'Submit for review'}
          icon="arrow-forward"
          loading={workProof.submitting}
          disabled={!workProof.canSubmit}
          onPress={workProof.submit}
        />
      </View>
    </KycCard>
  );
}

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

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  typeSelector: { gap: spacing.sm, marginTop: spacing.xs },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  typeOptionSelected: {
    borderColor: kyc.navy,
    backgroundColor: kyc.tint,
  },
  typeOptionPressed: {
    opacity: 0.9,
  },
  typeOptionContent: { flex: 1 },
  typeOptionLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  typeOptionLabelSelected: {
    color: kyc.navy,
  },
  typeOptionDesc: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  typeOptionDescSelected: {
    color: kyc.navy,
  },
  errorText: {
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: kyc.danger,
  },
  flex: { flex: 1 },
  companyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 10,
    backgroundColor: kyc.tint,
  },
  companyLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  companyName: {
    marginTop: 2,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
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