import { AxiosError, AxiosHeaders } from 'axios';
import {
  currentStepIndex,
  digitsOnly,
  formatAadhaar,
  formatCountdown,
  formatRetryAfter,
  getKycProgress,
  gstErrorMessage,
  gstResultMessage,
  GST_MESSAGES,
  isFlowComplete,
  isLockedOut,
  isValidAadhaar,
  isValidEmail,
  isValidGstin,
  isValidOtp,
  isWorkEmailVerified,
  maskAadhaar,
  normalizeGstin,
  normalizeRole,
  parseKycError,
  resolveKycFlow,
  stepsForFlow,
  toAttemptState,
} from '@/src/features/verification/kycLogic';
import type { GSTVerificationResult, VerificationStatusResponse } from '@/src/types/api';

function axiosError(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, {}, {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  });
}

describe('resolveKycFlow', () => {
  it.each([
    ['CONSUMER', undefined, 'individual'],
    ['CUSTOMER', undefined, 'individual'],
    ['OTHERS', 'EMPLOYEE', 'individual'],
    [undefined, undefined, 'individual'],
    ['BUILDERS', undefined, 'business'],
    ['BUILDERS_CONTRACTORS', 'EMPLOYEE', 'business'],
    ['CONSULTANTS', 'BUSINESS_OWNER', 'business'],
    // Older profiles predate employment type -- web defaults them to business owner.
    ['VENDORS', undefined, 'business'],
    ['CONTRACTORS', 'EMPLOYEE', 'employee'],
    ['consultants', 'employee', 'employee'],
  ])('role %s / %s -> %s', (role, employmentType, expected) => {
    expect(resolveKycFlow(role, employmentType)).toBe(expected);
  });

  it('normalizes the legacy CUSTOMER role', () => {
    expect(normalizeRole(' customer ')).toBe('CONSUMER');
  });

  it('lists steps per flow', () => {
    expect(stepsForFlow('individual')).toEqual(['identity']);
    expect(stepsForFlow('business')).toEqual(['identity', 'business', 'badge']);
    expect(stepsForFlow('employee')).toEqual(['identity', 'workEmail']);
  });
});

describe('input helpers', () => {
  it('strips non-digits and caps length', () => {
    expect(digitsOnly('1234 5678-9012 99', 12)).toBe('123456789012');
    expect(digitsOnly('a1b2')).toBe('12');
  });

  it('formats and masks Aadhaar numbers', () => {
    expect(formatAadhaar('123412341234')).toBe('1234 1234 1234');
    expect(formatAadhaar('12345')).toBe('1234 5');
    expect(maskAadhaar('123412349876')).toBe('XXXX XXXX 9876');
    expect(maskAadhaar('')).toBe('');
  });

  it('validates Aadhaar and OTP length', () => {
    expect(isValidAadhaar('123412341234')).toBe(true);
    expect(isValidAadhaar('12341234123')).toBe(false);
    expect(isValidAadhaar('12341234123a')).toBe(false);
    expect(isValidOtp('123456')).toBe(true);
    expect(isValidOtp('12345')).toBe(false);
  });

  it('normalizes and validates GSTIN', () => {
    expect(normalizeGstin(' 27abcde1234f1z5 ')).toBe('27ABCDE1234F1Z5');
    expect(normalizeGstin('27-ABCDE-1234F1Z5XYZ')).toBe('27ABCDE1234F1Z5');
    expect(isValidGstin('27ABCDE1234F1Z5')).toBe(true);
    expect(isValidGstin('27ABCDE1234F1X5')).toBe(false); // 14th char must be Z
    expect(isValidGstin('2ABCDE1234F1Z5')).toBe(false);
  });

  it('validates email', () => {
    expect(isValidEmail(' me@company.co ')).toBe(true);
    expect(isValidEmail('me@company')).toBe(false);
    expect(isValidEmail('me company@x.io')).toBe(false);
  });

  it('formats countdowns', () => {
    expect(formatCountdown(25)).toBe('00:25');
    expect(formatCountdown(65)).toBe('01:05');
    expect(formatCountdown(-3)).toBe('00:00');
  });
});

describe('attempt limits', () => {
  const now = Date.parse('2026-10-31T10:00:00Z');

  it('defaults to three attempts and clamps negatives', () => {
    expect(toAttemptState(undefined, undefined)).toEqual({ remaining: 3, retryAfter: null });
    expect(toAttemptState(-1, '')).toEqual({ remaining: 0, retryAfter: null });
  });

  it('is locked out only with no attempts left and a future retry time', () => {
    expect(isLockedOut({ remaining: 1, retryAfter: null }, now)).toBe(false);
    expect(isLockedOut({ remaining: 0, retryAfter: '2026-10-31T11:00:00Z' }, now)).toBe(true);
    expect(isLockedOut({ remaining: 0, retryAfter: '2026-10-31T09:00:00Z' }, now)).toBe(false);
    expect(isLockedOut({ remaining: 0, retryAfter: null }, now)).toBe(true);
  });

  it('describes the retry window in friendly units', () => {
    expect(formatRetryAfter(null, now)).toBeNull();
    expect(formatRetryAfter('garbage', now)).toBeNull();
    expect(formatRetryAfter('2026-10-31T09:00:00Z', now)).toBe('You can try again now');
    expect(formatRetryAfter('2026-10-31T10:14:10Z', now)).toBe('Try again in 15 min');
    expect(formatRetryAfter('2026-10-31T11:00:00Z', now)).toBe('Try again in 1 hr');
    expect(formatRetryAfter('2026-10-31T11:30:00Z', now)).toBe('Try again in 2 hrs');
    expect(formatRetryAfter('2026-11-01T10:00:00Z', now)).toBe('Try again in 1 day');
  });
});

describe('parseKycError', () => {
  it('reads the backend error body, code and attempts', () => {
    const err = axiosError(409, {
      error: 'details mismatch',
      code: 'AADHAAR_DETAILS_MISMATCH',
      attemptsRemaining: 1,
      retryAfter: '2026-10-31T11:00:00Z',
    });
    expect(parseKycError(err, 'fallback')).toEqual({
      status: 409,
      message: 'details mismatch',
      code: 'AADHAAR_DETAILS_MISMATCH',
      attemptsRemaining: 1,
      retryAfter: '2026-10-31T11:00:00Z',
    });
  });

  it('falls back when the body has no message', () => {
    expect(parseKycError(axiosError(500, {}), 'fallback').message).toBe('fallback');
    expect(parseKycError(axiosError(500, ''), 'fallback').message).toBe('fallback');
  });

  it('keeps attemptsRemaining 0 (not treated as missing)', () => {
    expect(parseKycError(axiosError(429, { error: 'x', attemptsRemaining: 0 }), 'f').attemptsRemaining).toBe(0);
  });

  it('handles network errors without a response', () => {
    const err = new AxiosError('Network Error', 'ERR_NETWORK');
    const parsed = parseKycError(err, 'fallback');
    expect(parsed.status).toBeUndefined();
    expect(parsed.message).toMatch(/Cannot reach the server/);
  });
});

describe('GST messages', () => {
  const base: GSTVerificationResult = {
    status: 'VERIFIED',
    gstin: '27ABCDE1234F1Z5',
    maskedGstin: '27XXXXX1234F1Z5',
    attemptsRemaining: 2,
  };

  it('maps result statuses', () => {
    expect(gstResultMessage(base)).toBeNull();
    expect(gstResultMessage({ ...base, status: 'MISMATCH' })).toBe(GST_MESSAGES.mismatch);
    expect(gstResultMessage({ ...base, status: 'INACTIVE' })).toBe(GST_MESSAGES.inactive);
    expect(gstResultMessage({ ...base, status: 'FAILED', failureReason: 'Provider says no' })).toBe('Provider says no');
    expect(gstResultMessage({ ...base, status: 'FAILED' })).toBe(GST_MESSAGES.failed);
  });

  it('maps HTTP failures', () => {
    expect(gstErrorMessage({ status: 429, message: 'x' })).toBe(GST_MESSAGES.limit);
    expect(gstErrorMessage({ status: 502, message: 'x' })).toBe(GST_MESSAGES.unavailable);
    expect(gstErrorMessage({ status: 504, message: 'x' })).toBe(GST_MESSAGES.unavailable);
    expect(gstErrorMessage({ status: 409, message: 'GSTIN already used' })).toBe('GSTIN already used');
    expect(gstErrorMessage({ message: 'offline' })).toBe(GST_MESSAGES.unavailable);
  });
});

describe('progress', () => {
  const none = { aadhaar: false, gst: false, workEmail: false };

  it('tracks the current step', () => {
    expect(currentStepIndex('business', none)).toBe(0);
    expect(currentStepIndex('business', { ...none, aadhaar: true })).toBe(1);
    expect(currentStepIndex('business', { ...none, aadhaar: true, gst: true })).toBe(2);
    expect(currentStepIndex('employee', { ...none, aadhaar: true, workEmail: true })).toBe(2);
  });

  it('knows when each flow is complete', () => {
    expect(isFlowComplete('individual', { ...none, aadhaar: true })).toBe(true);
    expect(isFlowComplete('business', { ...none, aadhaar: true })).toBe(false);
    expect(isFlowComplete('business', { ...none, aadhaar: true, gst: true })).toBe(true);
    expect(isFlowComplete('employee', { ...none, aadhaar: true, workEmail: true })).toBe(true);
    // GST alone never completes the business flow -- identity comes first.
    expect(isFlowComplete('business', { ...none, gst: true })).toBe(false);
  });

  it('matches a verified work email case-insensitively', () => {
    const status = {
      employeeEmail: { email: 'Me@Corp.com', verified: true, codePending: false },
    } as VerificationStatusResponse;
    expect(isWorkEmailVerified(status, 'me@corp.com ')).toBe(true);
    expect(isWorkEmailVerified(status, 'other@corp.com')).toBe(false);
    expect(isWorkEmailVerified(status)).toBe(true);
    expect(isWorkEmailVerified(undefined, 'me@corp.com')).toBe(false);
  });
});

describe('getKycProgress (profile badge / promo card)', () => {
  const aadhaar = { status: 'APPROVED' } as VerificationStatusResponse['aadhaar'];
  const gst = { status: 'VERIFIED' } as VerificationStatusResponse['gst'];
  const status = (extra: Partial<VerificationStatusResponse>) => extra as VerificationStatusResponse;

  it('completes a consumer on Aadhaar alone, including via profile.verified', () => {
    expect(getKycProgress('individual', null).complete).toBe(false);
    expect(getKycProgress('individual', status({ aadhaar })).complete).toBe(true);
    // Status not loaded yet, but the backend badge flag is already set.
    expect(getKycProgress('individual', undefined, true).complete).toBe(true);
  });

  it('keeps a business owner incomplete until GST is verified', () => {
    // profile.verified flips on Aadhaar alone -- not enough for a business.
    const midway = getKycProgress('business', status({ aadhaar }), true);
    expect(midway).toMatchObject({ identityDone: true, secondDone: false, complete: false, remaining: ['business'] });
    expect(getKycProgress('business', status({ aadhaar, gst })).complete).toBe(true);
  });

  it('keeps an employee incomplete until the work email is verified', () => {
    const midway = getKycProgress('employee', status({ aadhaar }));
    expect(midway.remaining).toEqual(['workEmail']);
    const done = getKycProgress(
      'employee',
      status({ aadhaar, employeeEmail: { email: 'a@b.co', verified: true, codePending: false } }),
    );
    expect(done.complete).toBe(true);
  });

  it('never completes on the second step alone', () => {
    const p = getKycProgress('business', status({ gst }));
    expect(p.complete).toBe(false);
    expect(p.remaining).toEqual(['identity']);
  });
});
