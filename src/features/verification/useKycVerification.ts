import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '@/src/api/profile';
import { verificationApi } from '@/src/api/verification';
import { useAuthStore } from '@/src/store/authStore';
import type {
  GSTVerificationResult,
  VerificationStatusResponse,
} from '@/src/types/api';
import {
  AADHAAR_DETAILS_MISMATCH,
  AADHAAR_LENGTH,
  GST_MESSAGES,
  type AttemptState,
  type KycFlow,
  RESEND_SECONDS,
  digitsOnly,
  getKycProgress,
  gstErrorMessage,
  gstResultMessage,
  isAadhaarApproved,
  isGstVerified,
  isLockedOut,
  isValidAadhaar,
  isValidEmail,
  isValidGstin,
  isValidOtp,
  isWorkEmailVerified,
  normalizeGstin,
  parseKycError,
  resolveKycFlow,
  toAttemptState,
} from '@/src/features/verification/kycLogic';

export const VERIFICATION_STATUS_KEY = ['verification-status'] as const;
const PROFILE_KEY = ['my-profile'] as const;

/** Refetches the status once a backend lockout window ends, so the form
 *  unlocks on its own instead of waiting for the user to leave and return. */
function useLockoutRefresh(attempts: AttemptState, refresh: () => void) {
  useEffect(() => {
    if (!attempts.retryAfter) return;
    const delay = Date.parse(attempts.retryAfter) - Date.now();
    if (Number.isNaN(delay) || delay <= 0) return;
    // setTimeout overflows past ~24.8 days; nobody keeps the screen open that long.
    const timer = setTimeout(refresh, Math.min(delay, 2_147_000_000));
    return () => clearTimeout(timer);
  }, [attempts.retryAfter, refresh]);
}

// ── Screen-level data ────────────────────────────────────────────────────

export function useKycContext() {
  const user = useAuthStore((s) => s.user);
  const profileQuery = useQuery({ queryKey: PROFILE_KEY, queryFn: profileApi.getMine });
  const statusQuery = useQuery({
    queryKey: VERIFICATION_STATUS_KEY,
    queryFn: verificationApi.getMyStatus,
    staleTime: 0,
  });

  const profile = profileQuery.data;
  const role = profile?.role || user?.role;
  const employmentType =
    (profile?.employmentType as string | undefined) ??
    (user?.employmentType as string | undefined);
  const flow: KycFlow = resolveKycFlow(role, employmentType);

  return {
    flow,
    profile,
    profileName: (profile?.fullName || user?.fullName || '').trim(),
    status: statusQuery.data,
    isLoading: statusQuery.isLoading || profileQuery.isLoading,
    isError: statusQuery.isError,
    error: statusQuery.error,
    refetch: statusQuery.refetch,
  };
}

/** Verification progress for My Profile -- shares the status cache with the
 *  verification screen, so finishing a step there updates the card here. */
export function useKycProgress(flow: KycFlow, profileVerified?: boolean) {
  const statusQuery = useQuery({
    queryKey: VERIFICATION_STATUS_KEY,
    queryFn: verificationApi.getMyStatus,
    staleTime: 0,
  });
  return {
    progress: getKycProgress(flow, statusQuery.data, profileVerified === true),
    // Until status loads, a business/employee account can't be known to be
    // complete -- callers keep the card up rather than flash the tick.
    isLoading: statusQuery.isLoading,
  };
}

function useStatusCache() {
  const queryClient = useQueryClient();
  const patch = useCallback(
    (update: (prev: VerificationStatusResponse) => VerificationStatusResponse) => {
      queryClient.setQueryData<VerificationStatusResponse>(VERIFICATION_STATUS_KEY, (prev) =>
        prev ? update(prev) : prev,
      );
    },
    [queryClient],
  );
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: VERIFICATION_STATUS_KEY });
  }, [queryClient]);
  const refreshProfile = useCallback(() => {
    // The profile carries the `verified` badge flag shown on My Profile.
    void queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
  }, [queryClient]);
  return { patch, refresh, refreshProfile };
}

// ── Step 1: Aadhaar OKYC ─────────────────────────────────────────────────

export type AadhaarStep = 'input' | 'otp' | 'verifying' | 'success' | 'failed';

const MISMATCH_MESSAGE =
  'The Aadhaar details do not match your profile. Make sure the name on your profile is exactly as it appears on your Aadhaar, then try again.';

export function useAadhaarKyc(status?: VerificationStatusResponse) {
  const { refresh, refreshProfile } = useStatusCache();

  const [step, setStep] = useState<AadhaarStep>('input');
  const [aadhaarNumber, setAadhaarNumberState] = useState('');
  const [consent, setConsent] = useState(false);
  const [otp, setOtp] = useState('');
  const [sessionId, setSessionId] = useState('');
  /** The number the live OTP was sent for -- kept for resends after the
   *  visible input is cleared. */
  const [otpNumber, setOtpNumber] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [justApproved, setJustApproved] = useState(false);
  const [attempts, setAttempts] = useState<AttemptState>(() =>
    toAttemptState(status?.aadhaarAttemptsRemaining, status?.aadhaarRetryAfter),
  );
  const inFlight = useRef(false);

  useEffect(() => {
    if (status) {
      setAttempts(toAttemptState(status.aadhaarAttemptsRemaining, status.aadhaarRetryAfter));
    }
  }, [status]);

  useLockoutRefresh(attempts, refresh);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setTimeout(() => setResendSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  const approved = justApproved || isAadhaarApproved(status);
  const lockedOut = isLockedOut(attempts);
  const canRequestOtp = isValidAadhaar(aadhaarNumber) && consent && !submitting && !lockedOut;
  const canVerify = isValidOtp(otp) && !!sessionId && !submitting && !lockedOut;
  const canResend = resendSeconds === 0 && !!otpNumber && !submitting && !lockedOut;

  const setAadhaarNumber = useCallback((value: string) => {
    setAadhaarNumberState(digitsOnly(value, AADHAAR_LENGTH));
    setError(null);
  }, []);

  const applyAttemptError = useCallback((remaining?: number, retryAfter?: string | null) => {
    if (remaining === undefined && retryAfter === undefined) return;
    setAttempts((prev) => toAttemptState(remaining ?? prev.remaining, retryAfter ?? prev.retryAfter));
  }, []);

  const sendOtp = useCallback(async (number: string, fromResend: boolean) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const result = await verificationApi.requestAadhaarOTP(number);
      setSessionId(result.session_id);
      setOtp('');
      setOtpNumber(number);
      setResendSeconds(RESEND_SECONDS);
      if (!fromResend) {
        // Don't keep the full number on screen once the OTP is out.
        setAadhaarNumberState('');
        setStep('otp');
      }
    } catch (e) {
      const err = parseKycError(e, "Couldn't send the Aadhaar OTP. Please try again.");
      if (err.status === 429) applyAttemptError(err.attemptsRemaining ?? 0, err.retryAfter);
      setError(err.message);
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [applyAttemptError]);

  const requestOtp = useCallback(async () => {
    if (lockedOut) return;
    if (!isValidAadhaar(aadhaarNumber)) {
      setError('Enter a valid 12-digit Aadhaar number.');
      return;
    }
    if (!consent) {
      setError('Please provide consent before requesting an Aadhaar OTP.');
      return;
    }
    await sendOtp(aadhaarNumber, false);
  }, [aadhaarNumber, consent, lockedOut, sendOtp]);

  const resendOtp = useCallback(async () => {
    if (!canResend) return;
    await sendOtp(otpNumber, true);
  }, [canResend, otpNumber, sendOtp]);

  const clearOtpSession = useCallback(() => {
    setSessionId('');
    setOtp('');
    setOtpNumber('');
    setResendSeconds(0);
  }, []);

  const verifyOtp = useCallback(async () => {
    if (lockedOut || inFlight.current) return;
    if (!sessionId || !isValidOtp(otp)) {
      setError('Enter the 6-digit OTP sent to your Aadhaar-linked mobile.');
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    setStep('verifying');
    try {
      const result = await verificationApi.verifyAadhaarOTP(sessionId, otp);
      if (result.status !== 'approved') {
        setStep('otp');
        setError(
          result.message ||
            "Your OTP was accepted, but we couldn't confirm the verification. Please try again.",
        );
        return;
      }
      // The backend has already compared the OKYC name/number against the
      // profile before approving -- it is the single source of truth here.
      clearOtpSession();
      setJustApproved(true);
      setStep('success');
      refresh();
      refreshProfile();
    } catch (e) {
      const err = parseKycError(e, "Couldn't verify the OTP. Please check the code and try again.");
      if (err.status === 429 || err.attemptsRemaining !== undefined) {
        applyAttemptError(err.attemptsRemaining ?? 0, err.retryAfter);
      }
      if (err.code === AADHAAR_DETAILS_MISMATCH) {
        // The OTP session is spent; the user has to fix their profile and
        // request a new one.
        clearOtpSession();
        setFailureMessage(MISMATCH_MESSAGE);
        setStep('failed');
        return;
      }
      setOtp('');
      setStep('otp');
      setError(err.message);
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [lockedOut, sessionId, otp, refresh, refreshProfile, applyAttemptError, clearOtpSession]);

  /** Back to the number input -- "use a different Aadhaar" / "try again". */
  const reset = useCallback(() => {
    clearOtpSession();
    setAadhaarNumberState('');
    setConsent(false);
    setError(null);
    setFailureMessage(null);
    setStep('input');
  }, [clearOtpSession]);

  /** Leaves the celebration panel so the next step shows. */
  const acknowledgeSuccess = useCallback(() => setStep('input'), []);

  return {
    step,
    approved,
    aadhaarNumber,
    setAadhaarNumber,
    consent,
    setConsent,
    otp,
    setOtp: (value: string) => {
      setOtp(digitsOnly(value, 6));
      setError(null);
    },
    otpNumber,
    resendSeconds,
    submitting,
    error,
    failureMessage,
    attempts,
    lockedOut,
    canRequestOtp,
    canVerify,
    canResend,
    requestOtp,
    resendOtp,
    verifyOtp,
    reset,
    acknowledgeSuccess,
  };
}

export type AadhaarKyc = ReturnType<typeof useAadhaarKyc>;

// ── Step 2a: GST (business owners) ───────────────────────────────────────

export function useGstKyc(status?: VerificationStatusResponse, defaultBusinessName = '') {
  const { patch, refresh, refreshProfile } = useStatusCache();

  const [legalName, setLegalNameState] = useState(defaultBusinessName);
  const [gstin, setGstinState] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<AttemptState>(() =>
    toAttemptState(status?.gst?.attemptsRemaining, status?.gst?.retryAfter),
  );
  /** Bumped on every MISMATCH result -- a counter (not a flag) so a second
   *  mismatch in a row still re-opens the name guide. */
  const [mismatchCount, setMismatchCount] = useState(0);
  const [submittedName, setSubmittedName] = useState('');
  const inFlight = useRef(false);
  const prefilled = useRef(!!defaultBusinessName);

  useEffect(() => {
    if (status) setAttempts(toAttemptState(status.gst?.attemptsRemaining, status.gst?.retryAfter));
  }, [status]);

  // Prefill from the profile's company once it loads, without clobbering edits.
  useEffect(() => {
    if (!prefilled.current && defaultBusinessName) {
      prefilled.current = true;
      setLegalNameState((current) => current || defaultBusinessName);
    }
  }, [defaultBusinessName]);

  useLockoutRefresh(attempts, refresh);

  const verified = isGstVerified(status);
  const lockedOut = isLockedOut(attempts);
  const normalizedGstin = normalizeGstin(gstin);
  const canSubmit =
    !!legalName.trim() && isValidGstin(normalizedGstin) && !submitting && !lockedOut;

  const submit = useCallback(async () => {
    if (lockedOut || inFlight.current) return;
    const name = legalName.trim();
    if (!name || !isValidGstin(normalizedGstin)) {
      setError(GST_MESSAGES.invalid);
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const result: GSTVerificationResult = await verificationApi.submitGSTVerification(
        normalizedGstin,
        name,
      );
      patch((prev) => ({ ...prev, gst: result }));
      setSubmittedName(name);
      if (result.status === 'MISMATCH') setMismatchCount((n) => n + 1);
      setAttempts(toAttemptState(result.attemptsRemaining, result.retryAfter));
      setError(gstResultMessage(result));
      if (result.status === 'VERIFIED') refreshProfile();
      refresh();
    } catch (e) {
      const err = parseKycError(e, GST_MESSAGES.unavailable);
      setError(gstErrorMessage(err));
      if (err.attemptsRemaining !== undefined || err.retryAfter !== undefined) {
        setAttempts((prev) =>
          toAttemptState(err.attemptsRemaining ?? prev.remaining, err.retryAfter ?? prev.retryAfter),
        );
      }
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [lockedOut, legalName, normalizedGstin, patch, refresh, refreshProfile]);

  return {
    verified,
    result: status?.gst ?? null,
    legalName,
    setLegalName: (value: string) => {
      setLegalNameState(value);
      setError(null);
    },
    gstin: normalizedGstin,
    setGstin: (value: string) => {
      setGstinState(normalizeGstin(value));
      setError(null);
    },
    submitting,
    error,
    attempts,
    lockedOut,
    canSubmit,
    submit,
    mismatchCount,
    submittedName,
  };
}

export type GstKyc = ReturnType<typeof useGstKyc>;

// ── Step 2b: work email (employees) ──────────────────────────────────────

export function useWorkEmailKyc(status?: VerificationStatusResponse) {
  const { patch, refresh } = useStatusCache();
  const record = status?.employeeEmail ?? null;

  const [email, setEmailState] = useState(record?.email ?? '');
  const [code, setCodeState] = useState('');
  const [codeSent, setCodeSent] = useState(!!record?.codePending);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefilled = useRef(!!record?.email);

  useEffect(() => {
    if (!prefilled.current && record?.email) {
      prefilled.current = true;
      setEmailState((current) => current || record.email);
      setCodeSent(!!record.codePending);
    }
  }, [record?.email, record?.codePending]);

  const verified = isWorkEmailVerified(status, email);
  const codeAvailable =
    codeSent ||
    (!!record?.codePending && record.email.toLowerCase() === email.trim().toLowerCase());
  const canSend = isValidEmail(email) && !sending && !verifying;
  const canVerify = /^\d{6}$/.test(code) && !verifying && !sending;

  const setEmail = useCallback((value: string) => {
    setEmailState(value);
    // A code is tied to the address it was sent to.
    setCodeSent(false);
    setCodeState('');
    setError(null);
  }, []);

  const sendCode = useCallback(async () => {
    const address = email.trim();
    if (!isValidEmail(address)) {
      setError('Enter a valid company work email address.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await verificationApi.sendEmployeeEmailOTP(address);
      setCodeSent(true);
      setCodeState('');
      refresh();
    } catch (e) {
      setError(parseKycError(e, 'Could not send the verification code. Please try again.').message);
    } finally {
      setSending(false);
    }
  }, [email, refresh]);

  const verifyCode = useCallback(async () => {
    const address = email.trim();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the six-digit code sent to your work email.');
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      await verificationApi.verifyEmployeeEmailOTP(address, code);
      patch((prev) => ({
        ...prev,
        employeeEmail: { email: address, verified: true, codePending: false },
      }));
      setCodeSent(false);
      setCodeState('');
    } catch (e) {
      setError(parseKycError(e, 'Could not verify this code. Check it and try again.').message);
    } finally {
      setVerifying(false);
    }
  }, [email, code, patch]);

  return {
    verified,
    verifiedEmail: record?.verified ? record.email : null,
    email,
    setEmail,
    code,
    setCode: (value: string) => {
      setCodeState(digitsOnly(value, 6));
      setError(null);
    },
    codeAvailable,
    sending,
    verifying,
    error,
    canSend,
    canVerify,
    sendCode,
    verifyCode,
  };
}

export type WorkEmailKyc = ReturnType<typeof useWorkEmailKyc>;
