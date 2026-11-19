import { useQuery } from '@tanstack/react-query';
import { profileApi } from '@/src/api/profile';
import { normalizeRole, resolveKycFlow } from '@/src/features/verification/kycLogic';
import { useKycProgress } from '@/src/features/verification/useKycVerification';
import type { ProfessionalProfile } from '@/src/types/api';

// Step locks shared by Edit Profile and every screen that adds projects --
// the same chain as the web Profile page (roleStepLocked ->
// projectsRoleChainLocked -> projectsStepLocked): each step needs the one
// before it filled in AND saved, and Projects also needs full verification.

export const LOCK_MESSAGES = {
  role: 'Please complete Professional Info before moving on to Role & Expertise.',
  credentials:
    'Complete and save Role & Expertise first — your specializations decide which licensing bodies we suggest.',
  projectsRole: 'Please complete Role & Expertise before moving on to Projects.',
  projectsVerify:
    'Please complete your full verification before adding Projects. Business owners need Aadhaar + GST, employees need Aadhaar + company work email, and individual consultants need Aadhaar + an approved licence review.',
};

type BasicInfo = Pick<
  ProfessionalProfile,
  'fullName' | 'email' | 'phoneNumber' | 'company' | 'workEmail' | 'firmLocationIds' | 'role' | 'employmentType'
>;

export function isConsumerRole(role?: string | null) {
  return normalizeRole(role) === 'CONSUMER';
}

/** Web basicInfoComplete: name, email, phone, and -- for professionals --
 *  company plus a firm location (employees: a work email instead). */
export function isBasicInfoComplete(p: BasicInfo | null | undefined, consumer: boolean) {
  if (!p) return false;
  const employee = resolveKycFlow(p.role, p.employmentType) === 'employee';
  const companyDone =
    consumer ||
    (!!p.company?.trim() &&
      (employee ? !!p.workEmail?.trim() : (p.firmLocationIds?.length ?? 0) > 0));
  return !!(p.fullName?.trim() && p.email?.trim() && p.phoneNumber?.trim() && companyDone);
}

type LockInput = {
  /** What's on screen now (Edit Profile's form); defaults to `saved`. */
  live?: ProfessionalProfile | null;
  /** The profile as last saved on the server. */
  saved: ProfessionalProfile | null | undefined;
  /** Full verification for the user's employment type is done. */
  verificationComplete: boolean;
};

export function computeStepLocks({ live, saved, verificationComplete }: LockInput) {
  const current = live ?? saved;
  const consumer = isConsumerRole(current?.role ?? saved?.role);
  const basicInfoComplete = isBasicInfoComplete(current, consumer);
  const roleStepLocked = !consumer && (!basicInfoComplete || !isBasicInfoComplete(saved, consumer));
  const roleExpertiseComplete =
    consumer ||
    (!!current?.role &&
      (current?.disciplineIds?.length ?? 0) > 0 &&
      (saved?.disciplineIds?.length ?? 0) > 0);
  const roleChainLocked = !consumer && (roleStepLocked || !roleExpertiseComplete);
  return {
    consumer,
    basicInfoComplete,
    roleExpertiseComplete,
    roleStepLocked,
    roleChainLocked,
    credentialsLocked: roleChainLocked,
    projectsLocked: !consumer && (roleChainLocked || !verificationComplete),
  };
}

/** Whether the signed-in user may add projects yet, with the reason if not.
 *  `loading` stays true until both the profile and verification status are
 *  known, so callers never flash the form before locking it. */
export function useProjectsLock() {
  const profileQuery = useQuery({ queryKey: ['my-profile'], queryFn: profileApi.getMine });
  const saved = profileQuery.data;
  const { progress, isLoading } = useKycProgress(
    resolveKycFlow(saved?.role, saved?.employmentType),
    saved?.verified,
  );
  const locks = computeStepLocks({ saved, verificationComplete: progress.complete });
  return {
    loading: profileQuery.isLoading || isLoading,
    locked: locks.projectsLocked,
    /** True when the missing piece is Role & Expertise (else: verification). */
    needsRoleExpertise: locks.roleChainLocked,
    message: locks.roleChainLocked ? LOCK_MESSAGES.projectsRole : LOCK_MESSAGES.projectsVerify,
  };
}
