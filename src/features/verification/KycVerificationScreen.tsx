import { useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePullToRefresh } from '@/src/hooks/usePullToRefresh';
import { KeyboardAwareScrollView } from '@/src/components/KeyboardAwareScrollView';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getErrorMessage } from '@/src/api/client';
import { ErrorState } from '@/src/components/EmptyState';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';
import { AadhaarStep } from '@/src/features/verification/components/AadhaarStep';
import { KycHero, KycTrustSection } from '@/src/features/verification/components/KycOverview';
import { ConsultantStep, GstStep, WorkEmailStep } from '@/src/features/verification/components/SecondarySteps';
import {
  DetailRow,
  FadeInView,
  KycButton,
  KycCard,
  StatusPill,
  kyc,
} from '@/src/features/verification/components/kycUi';
import {
  useAadhaarKyc,
  useConsultantKyc,
  useEmployeeMethod,
  useGstKyc,
  useKycContext,
  useWorkEmailKyc,
  useWorkProofKyc,
} from '@/src/features/verification/useKycVerification';
import { currentStepIndex, isFlowComplete } from '@/src/features/verification/kycLogic';
import type { VerificationRequestSummary } from '@/src/types/api';

import { DetailSkeleton } from '@/src/components/Skeleton';
export function KycVerificationScreen() {
  const pull = usePullToRefresh();
  const ctx = useKycContext();
  const aadhaar = useAadhaarKyc(ctx.status);
  const gst = useGstKyc(ctx.status, ctx.profile?.company?.trim() ?? '');
  const legalName = ctx.status?.aadhaar?.legalName?.trim() || ctx.profileName;
  const companyName = ctx.profile?.company?.trim() ?? '';
  // Employees: OTP only when the company's owner whitelisted email domains,
  // otherwise work proof. Re-checked whenever the profile's company changes.
  const employeeMethod = useEmployeeMethod(companyName, ctx.flow === 'employee');
  const refetchMethod = employeeMethod.refetch;
  const onWorkProofRequired = useCallback(() => void refetchMethod(), [refetchMethod]);
  const workEmail = useWorkEmailKyc(ctx.status, employeeMethod.data?.organizationId ?? '', onWorkProofRequired);
  const workProof = useWorkProofKyc(ctx.status, {
    legalName,
    companyName,
    companyEmail: ctx.status?.employeeEmail?.email,
  });
  const consultant = useConsultantKyc(ctx.status, legalName);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'));
  const editProfile = () => router.push('/edit-profile');

  const header = (
    <View style={styles.header}>
      <Pressable onPress={goBack} hitSlop={10} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
      <Text style={styles.headerTitle}>Get Verified</Text>
      <View style={styles.backBtn} />
    </View>
  );

  if (ctx.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {header}
        <DetailSkeleton />
      </SafeAreaView>
    );
  }

  if (ctx.isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {header}
        <ErrorState
          title="Couldn't load verification"
          message={getErrorMessage(ctx.error, "Couldn't load your verification status. Please try again.")}
          onRetry={() => void ctx.refetch()}
        />
      </SafeAreaView>
    );
  }

  const { flow } = ctx;
  const done = {
    aadhaar: aadhaar.approved,
    gst: gst.verified,
    workEmail: workEmail.verified || workProof.approved,
    licence: consultant.approved,
  };
  const celebrating = aadhaar.step === 'success';
  const complete = isFlowComplete(flow, done) && !celebrating;
  // The Aadhaar card stays up while the user is mid-flow or celebrating.
  const showAadhaarFlow = !aadhaar.approved || aadhaar.step !== 'input';
  const stepIndex = celebrating ? 0 : currentStepIndex(flow, done);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {header}
      <View style={styles.flex}>
        <KeyboardAwareScrollView
          refreshControl={pull.refreshControl}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <KycHero flow={flow} currentStep={stepIndex} complete={complete} />

          {showAadhaarFlow ? (
            <AadhaarStep
              kyc={aadhaar}
              flow={flow}
              profileName={ctx.profileName}
              onEditProfile={editProfile}
              onDone={goBack}
            />
          ) : (
            <AadhaarVerifiedCard record={ctx.status?.aadhaar ?? null} />
          )}

          {flow === 'business' && !celebrating ? (
            aadhaar.approved ? (
              <GstStep gst={gst} />
            ) : (
              <LockedStep icon="business-outline" title="Verify your business" />
            )
          ) : null}

          {flow === 'employee' && !celebrating ? (
            aadhaar.approved ? (
              <WorkEmailStep
                email={workEmail}
                workProof={workProof}
                method={employeeMethod}
                companyName={companyName}
                onEditProfile={editProfile}
              />
            ) : (
              <LockedStep icon="mail-outline" title="Verify your company" />
            )
          ) : null}

          {flow === 'consultant' && !celebrating ? (
            aadhaar.approved ? (
              <ConsultantStep consultant={consultant} />
            ) : (
              <LockedStep icon="document-text-outline" title="Verify your professional licence" />
            )
          ) : null}

          {complete ? (
            <FadeInView style={styles.badgeReady}>
              <View testID="kyc-complete" style={styles.badgeReadyInner}>
                <Ionicons name="ribbon" size={28} color={kyc.success} />
                <View style={styles.flex}>
                  <Text style={styles.badgeReadyTitle}>
                    {flow === 'business' ? 'Your business and profile are verified' : 'Your profile is verified'}
                  </Text>
                  <Text style={styles.badgeReadyBody}>Your verified badge is now shown on your profile.</Text>
                </View>
              </View>
              <KycButton variant="secondary" title="Back to profile" onPress={goBack} />
            </FadeInView>
          ) : null}

          <KycTrustSection flow={flow} />
        </KeyboardAwareScrollView>
      </View>
    </SafeAreaView>
  );
}

function AadhaarVerifiedCard({ record }: { record: VerificationRequestSummary | null }) {
  return (
    <KycCard
      testID="aadhaar-verified"
      icon="finger-print"
      title="Identity verified"
      subtitle="Verified with Aadhaar OKYC."
      badge={<StatusPill label="Verified" />}
    >
      <DetailRow label="Name" value={record?.legalName} verified />
      <DetailRow label="Aadhaar" value={record?.maskedNumber} />
    </KycCard>
  );
}

function LockedStep({
  icon,
  title,
}: {
  icon: 'business-outline' | 'mail-outline' | 'document-text-outline';
  title: string;
}) {
  return (
    <View style={styles.locked} testID="kyc-locked-step">
      <View style={styles.lockedIcon}>
        <Ionicons name={icon} size={20} color={colors.textMuted} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.lockedTitle}>{title}</Text>
        <Text style={styles.lockedBody}>Unlocks after identity verification.</Text>
      </View>
      <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.text,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  locked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  lockedIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  lockedBody: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  badgeReady: {
    gap: spacing.md,
    padding: spacing.md + 4,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: kyc.successTint,
  },
  badgeReadyInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4 },
  badgeReadyTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: '#14532D',
  },
  badgeReadyBody: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm - 1,
    color: '#166534',
  },
});
