import axios from 'axios';
import { getErrorMessage } from '@/src/api/client';
import type {
  GSTVerificationResult,
  VerificationStatusResponse,
} from '@/src/types/api';

/**
 * Which verification path a user follows. Mirrors the web Profile page
 * (Frontend-Tech Profile.component.ts isConsumer / isBusinessOwnerFlow /
 * isEmployeeFlow):
 *  - individual: Aadhaar OKYC only (Consumer, Others, no role yet)
 *  - business:   Aadhaar, then GST registration (TrueID)
 *  - employee:   Aadhaar, then company work-email OTP
 */
export type KycFlow = 'individual' | 'business' | 'employee';

export type KycStepKey = 'identity' | 'business' | 'workEmail' | 'badge';

export const AADHAAR_LENGTH = 12;
export const OTP_LENGTH = 6;
export const GSTIN_LENGTH = 15;
export const RESEND_SECONDS = 25;
export const DEFAULT_ATTEMPTS = 3;

export const AADHAAR_DETAILS_MISMATCH = 'AADHAAR_DETAILS_MISMATCH';

const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Builders are always business owners; these roles choose Business Owner
 *  or Employee (see validateEmploymentType on the backend). */
const EMPLOYMENT_TYPE_ROLES = new Set(['CONSULTANTS', 'CONTRACTORS', 'VENDORS']);
const BUILDER_ROLES = new Set(['BUILDERS', 'BUILDERS_CONTRACTORS']);

export function normalizeRole(role?: string | null): string {
  const value = (role ?? '').trim().toUpperCase();
  return value === 'CUSTOMER' ? 'CONSUMER' : value;
}

export function resolveKycFlow(role?: string | null, employmentType?: string | null): KycFlow {
  const normalized = normalizeRole(role);
  if (BUILDER_ROLES.has(normalized)) return 'business';
  if (EMPLOYMENT_TYPE_ROLES.has(normalized)) {
    return (employmentType ?? '').toUpperCase() === 'EMPLOYEE' ? 'employee' : 'business';
  }
  return 'individual';
}

export function stepsForFlow(flow: KycFlow): KycStepKey[] {
  if (flow === 'business') return ['identity', 'business', 'badge'];
  if (flow === 'employee') return ['identity', 'workEmail'];
  return ['identity'];
}

export const STEP_LABELS: Record<KycStepKey, string> = {
  identity: 'Identity',
  business: 'Business',
  workEmail: 'Work email',
  badge: 'Badge',
};

// ── Input helpers ────────────────────────────────────────────────────────

export function digitsOnly(value: string, max?: number): string {
  const digits = value.replace(/\D/g, '');
  return max === undefined ? digits : digits.slice(0, max);
}

/** "123412341234" -> "1234 1234 1234" */
export function formatAadhaar(digits: string): string {
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** Only the last four digits are ever shown back to the user. */
export function maskAadhaar(digits: string): string {
  const tail = digits.slice(-4);
  return tail ? `XXXX XXXX ${tail}` : '';
}

export function isValidAadhaar(digits: string): boolean {
  return new RegExp(`^\\d{${AADHAAR_LENGTH}}$`).test(digits);
}

export function isValidOtp(code: string): boolean {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code);
}

export function normalizeGstin(value: string): string {
  return value.replace(/[^0-9a-z]/gi, '').toUpperCase().slice(0, GSTIN_LENGTH);
}

export function isValidGstin(value: string): boolean {
  return GSTIN_PATTERN.test(value);
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ── Attempt limits ───────────────────────────────────────────────────────

export type AttemptState = {
  remaining: number;
  retryAfter: string | null;
};

export function toAttemptState(remaining?: number | null, retryAfter?: string | null): AttemptState {
  return {
    remaining: Math.max(0, remaining ?? DEFAULT_ATTEMPTS),
    retryAfter: retryAfter || null,
  };
}

/** True while the backend's lockout window is still running. */
export function isLockedOut(attempts: AttemptState, now = Date.now()): boolean {
  if (attempts.remaining > 0) return false;
  if (!attempts.retryAfter) return true;
  const until = Date.parse(attempts.retryAfter);
  return Number.isNaN(until) || until > now;
}

/** "Try again in 14 min" style copy for a retryAfter timestamp. */
export function formatRetryAfter(retryAfter: string | null, now = Date.now()): string | null {
  if (!retryAfter) return null;
  const until = Date.parse(retryAfter);
  if (Number.isNaN(until)) return null;
  const minutes = Math.ceil((until - now) / 60_000);
  if (minutes <= 0) return 'You can try again now';
  if (minutes < 60) return `Try again in ${minutes} min`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `Try again in ${hours} hr${hours === 1 ? '' : 's'}`;
  const days = Math.ceil(hours / 24);
  return `Try again in ${days} day${days === 1 ? '' : 's'}`;
}

// ── API errors ───────────────────────────────────────────────────────────

export type KycApiError = {
  status?: number;
  message: string;
  code?: string;
  attemptsRemaining?: number;
  retryAfter?: string | null;
};

type ErrorBody = {
  error?: string;
  message?: string;
  code?: string;
  attemptsRemaining?: number;
  retryAfter?: string | null;
};

/** The verification handlers answer errors with
 *  `{ error, attemptsRemaining?, retryAfter?, code? }`. */
export function parseKycError(error: unknown, fallback: string): KycApiError {
  if (axios.isAxiosError(error) && error.response) {
    const body = (error.response.data ?? {}) as ErrorBody;
    const message = typeof body === 'object' ? body.error || body.message : undefined;
    return {
      status: error.response.status,
      message: message?.trim() || fallback,
      code: typeof body === 'object' ? body.code : undefined,
      attemptsRemaining:
        typeof body === 'object' && typeof body.attemptsRemaining === 'number'
          ? body.attemptsRemaining
          : undefined,
      retryAfter: typeof body === 'object' ? body.retryAfter ?? undefined : undefined,
    };
  }
  // No response: timeout / offline -- reuse the app-wide wording.
  return { message: getErrorMessage(error, fallback) };
}

// ── Status selectors ─────────────────────────────────────────────────────

export function isAadhaarApproved(status?: VerificationStatusResponse | null): boolean {
  return status?.aadhaar?.status === 'APPROVED';
}

export function isGstVerified(status?: VerificationStatusResponse | null): boolean {
  return status?.gst?.status === 'VERIFIED';
}

export function isWorkEmailVerified(status?: VerificationStatusResponse | null, email?: string): boolean {
  const record = status?.employeeEmail;
  if (!record?.verified) return false;
  if (email === undefined) return true;
  return record.email.trim().toLowerCase() === email.trim().toLowerCase();
}

export const GST_MESSAGES = {
  invalid: "Enter your company's legal name and a valid 15-character GSTIN.",
  mismatch:
    'The legal business name does not match the GST registration. Check the name you entered and try again.',
  inactive: 'This GST registration is not active.',
  limit: 'GST verification attempt limit reached. Try again later.',
  unavailable: 'GST verification service is temporarily unavailable. Please try again later.',
  failed: "Couldn't verify your GST registration. Please try again.",
} as const;

/** The message to show for a non-VERIFIED GST result, or null when verified. */
export function gstResultMessage(result: GSTVerificationResult): string | null {
  switch (result.status) {
    case 'VERIFIED':
      return null;
    case 'MISMATCH':
      return GST_MESSAGES.mismatch;
    case 'INACTIVE':
      return GST_MESSAGES.inactive;
    default:
      return result.failureReason || GST_MESSAGES.failed;
  }
}

export function gstErrorMessage(error: KycApiError): string {
  if (error.status === 429) return GST_MESSAGES.limit;
  if (error.status === 502 || error.status === 504) return GST_MESSAGES.unavailable;
  return error.status ? error.message : GST_MESSAGES.unavailable;
}

/** Which step the user is on (1-based) given what is already verified. */
export function currentStepIndex(
  flow: KycFlow,
  done: { aadhaar: boolean; gst: boolean; workEmail: boolean },
): number {
  if (!done.aadhaar) return 0;
  if (flow === 'business') return done.gst ? 2 : 1;
  if (flow === 'employee') return done.workEmail ? 2 : 1;
  return 1;
}

export function isFlowComplete(
  flow: KycFlow,
  done: { aadhaar: boolean; gst: boolean; workEmail: boolean },
): boolean {
  if (flow === 'business') return done.aadhaar && done.gst;
  if (flow === 'employee') return done.aadhaar && done.workEmail;
  return done.aadhaar;
}

// ── Profile badge / promo card ───────────────────────────────────────────

/** The steps a user actually acts on (the badge itself is not a step). */
export type KycActionStep = 'identity' | 'business' | 'workEmail';

export type KycProgress = {
  flow: KycFlow;
  identityDone: boolean;
  /** Business (GST) or work email -- always true for the individual flow. */
  secondDone: boolean;
  /** Fully verified for this flow: the only state that earns the blue tick. */
  complete: boolean;
  remaining: KycActionStep[];
};

/**
 * Where a user stands across the whole flow. The backend's `profile.verified`
 * flips on Aadhaar alone, which is "done" only for individual accounts --
 * business owners and employees also need GST / work email before they are
 * shown as verified.
 */
export function getKycProgress(
  flow: KycFlow,
  status: VerificationStatusResponse | null | undefined,
  profileVerified = false,
): KycProgress {
  const identityDone = profileVerified || isAadhaarApproved(status);
  const secondDone =
    flow === 'business' ? isGstVerified(status) : flow === 'employee' ? isWorkEmailVerified(status) : true;
  const remaining: KycActionStep[] = [];
  if (!identityDone) remaining.push('identity');
  if (flow === 'business' && !secondDone) remaining.push('business');
  if (flow === 'employee' && !secondDone) remaining.push('workEmail');
  return { flow, identityDone, secondDone, complete: remaining.length === 0, remaining };
}
