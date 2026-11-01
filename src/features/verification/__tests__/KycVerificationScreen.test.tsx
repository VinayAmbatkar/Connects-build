import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders } from 'axios';
import { router } from 'expo-router';
import { Linking } from 'react-native';
import { KycVerificationScreen } from '@/src/features/verification/KycVerificationScreen';
import { verificationApi } from '@/src/api/verification';
import { profileApi } from '@/src/api/profile';
import type { GSTVerificationResult, VerificationStatusResponse } from '@/src/types/api';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('@/src/api/verification', () => ({
  verificationApi: {
    getMyStatus: jest.fn(),
    requestAadhaarOTP: jest.fn(),
    verifyAadhaarOTP: jest.fn(),
    submitGSTVerification: jest.fn(),
    sendEmployeeEmailOTP: jest.fn(),
    verifyEmployeeEmailOTP: jest.fn(),
  },
}));
// The shared sheet only unmounts after its close animation; render it purely
// from `visible` so these tests exercise when the guide opens and closes.
jest.mock('@/src/components/BottomSheet', () => {
  const { Pressable, Text, View } = require('react-native');
  return {
    BottomSheet: ({ visible, title, subtitle, onClose, children, footer }: any) =>
      visible ? (
        <View>
          <Text>{title}</Text>
          {subtitle ? <Text>{subtitle}</Text> : null}
          <Pressable accessibilityLabel="Close" onPress={onClose} />
          {children}
          {footer}
        </View>
      ) : null,
  };
});
jest.mock('@/src/api/profile', () => ({
  profileApi: { getMine: jest.fn() },
}));

// Full-screen renders; the first test also pays the module transform cost.
jest.setTimeout(20_000);

const api = verificationApi as jest.Mocked<typeof verificationApi>;
const profile = profileApi as jest.Mocked<typeof profileApi>;

const AADHAAR = '234567890123';

function emptyStatus(overrides: Partial<VerificationStatusResponse> = {}): VerificationStatusResponse {
  return {
    aadhaar: null,
    aadhaarAttemptsRemaining: 3,
    gstTan: null,
    license: null,
    employee: null,
    employeeEmail: null,
    gst: null,
    ...overrides,
  };
}

const approvedAadhaar = {
  id: 1,
  status: 'APPROVED' as const,
  type: 'AADHAAR' as const,
  legalName: 'ASHA RAO',
  maskedNumber: 'XXXXXXXX0123',
  submittedAt: '2026-10-30T10:00:00Z',
};

function httpError(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, {}, {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  });
}

const clients: QueryClient[] = [];

/** gcTime Infinity: no garbage-collection timers left running after a test. */
function makeClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  clients.push(client);
  return client;
}

afterEach(() => {
  clients.splice(0).forEach((client) => client.clear());
});

function renderScreen({
  status = emptyStatus(),
  role = 'CONSUMER',
  employmentType,
  company,
}: {
  status?: VerificationStatusResponse;
  role?: string;
  employmentType?: string;
  company?: string;
} = {}) {
  api.getMyStatus.mockResolvedValue(status);
  profile.getMine.mockResolvedValue({ fullName: 'ASHA RAO', role, employmentType, company });
  const client = makeClient();
  render(
    <QueryClientProvider client={client}>
      <KycVerificationScreen />
    </QueryClientProvider>,
  );
  return client;
}

async function requestOtp() {
  fireEvent.changeText(await screen.findByTestId('aadhaar-input'), AADHAAR);
  fireEvent.press(screen.getByTestId('aadhaar-consent'));
  fireEvent.press(screen.getByTestId('send-otp'));
  await screen.findByTestId('aadhaar-otp-step');
}

beforeEach(() => {
  jest.clearAllMocks();
  api.requestAadhaarOTP.mockResolvedValue({ message: 'sent', session_id: 'sess-1' });
});

describe('Aadhaar OKYC (individual)', () => {
  it('gates Send OTP on a full number and consent, and formats the number', async () => {
    renderScreen();
    const input = await screen.findByTestId('aadhaar-input');
    const send = screen.getByTestId('send-otp');
    expect(screen.getByText('ASHA RAO')).toBeTruthy(); // profile name the backend will match against

    expect(send).toBeDisabled();
    fireEvent.changeText(input, '2345 6789 0123 999');
    expect(input.props.value).toBe('2345 6789 0123');
    expect(send).toBeDisabled();

    fireEvent.press(screen.getByTestId('aadhaar-consent'));
    expect(send).toBeEnabled();
  });

  it('sends the OTP, masks the number, then verifies and celebrates', async () => {
    const client = renderScreen();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    await requestOtp();

    expect(api.requestAadhaarOTP).toHaveBeenCalledWith(AADHAAR);
    expect(screen.getByText(/XXXX XXXX 0123/)).toBeTruthy();
    expect(screen.queryByText(/2345 6789/)).toBeNull();
    expect(screen.getByTestId('resend-timer')).toHaveTextContent('Resend in 00:25', { exact: false });

    const verify = screen.getByTestId('verify-otp');
    expect(verify).toBeDisabled();
    fireEvent.changeText(screen.getByTestId('otp-input'), '12a3456');
    expect(verify).toBeEnabled();

    api.verifyAadhaarOTP.mockResolvedValue({ status: 'approved', message: 'ok' });
    fireEvent.press(verify);

    expect(await screen.findByTestId('aadhaar-success-step')).toBeTruthy();
    expect(api.verifyAadhaarOTP).toHaveBeenCalledWith('sess-1', '123456');
    // Both the status and the profile (verified badge) are refreshed.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['verification-status'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['my-profile'] });

    fireEvent.press(screen.getByTestId('aadhaar-success-continue'));
    expect(router.back).toHaveBeenCalled();
  });

  it('shows the backend error and remaining attempts for a wrong OTP', async () => {
    renderScreen();
    await requestOtp();
    api.verifyAadhaarOTP.mockRejectedValue(
      httpError(400, { error: 'Invalid OTP, please try again', attemptsRemaining: 1, retryAfter: null }),
    );

    fireEvent.changeText(screen.getByTestId('otp-input'), '000000');
    fireEvent.press(screen.getByTestId('verify-otp'));

    expect(await screen.findByTestId('aadhaar-error')).toHaveTextContent('Invalid OTP, please try again', { exact: false });
    expect(screen.getByTestId('aadhaar-otp-step')).toBeTruthy();
    expect(screen.getByTestId('attempt-notice')).toHaveTextContent('Attempts remaining: 1', { exact: false });
    // The wrong code is cleared so the user can retype.
    expect(screen.getByTestId('otp-input').props.value).toBe('');
  });

  it('moves to the failed panel on a profile details mismatch', async () => {
    renderScreen();
    await requestOtp();
    api.verifyAadhaarOTP.mockRejectedValue(
      httpError(409, { error: 'mismatch', code: 'AADHAAR_DETAILS_MISMATCH', attemptsRemaining: 2 }),
    );

    fireEvent.changeText(screen.getByTestId('otp-input'), '123456');
    fireEvent.press(screen.getByTestId('verify-otp'));

    expect(await screen.findByTestId('aadhaar-failed-step')).toBeTruthy();
    expect(screen.getByText(/do not match your profile/)).toBeTruthy();

    fireEvent.press(screen.getByText('Update my profile details'));
    expect(router.push).toHaveBeenCalledWith('/edit-profile');

    fireEvent.press(screen.getByText('Try again'));
    expect(await screen.findByTestId('aadhaar-number-step')).toBeTruthy();
    expect(screen.getByTestId('aadhaar-input').props.value).toBe('');
  });

  it('treats a non-approved 200 response as not verified', async () => {
    renderScreen();
    await requestOtp();
    api.verifyAadhaarOTP.mockResolvedValue({ status: 'pending', message: 'Still processing' });

    fireEvent.changeText(screen.getByTestId('otp-input'), '123456');
    fireEvent.press(screen.getByTestId('verify-otp'));

    expect(await screen.findByTestId('aadhaar-error')).toHaveTextContent('Still processing', { exact: false });
    expect(screen.queryByTestId('aadhaar-success-step')).toBeNull();
  });

  it('locks the form when the backend reports no attempts left', async () => {
    renderScreen({
      status: emptyStatus({
        aadhaarAttemptsRemaining: 0,
        aadhaarRetryAfter: new Date(Date.now() + 30 * 60_000).toISOString(),
      }),
    });

    expect(await screen.findByTestId('aadhaar-lockout')).toHaveTextContent(/Try again in 30 min/);
    fireEvent.changeText(screen.getByTestId('aadhaar-input'), AADHAAR);
    fireEvent.press(screen.getByTestId('aadhaar-consent'));
    expect(screen.getByTestId('send-otp')).toBeDisabled();
  });

  it('applies a 429 from OTP generation as a lockout', async () => {
    renderScreen();
    api.requestAadhaarOTP.mockRejectedValue(
      httpError(429, {
        error: 'too many Aadhaar verification attempts',
        attemptsRemaining: 0,
        retryAfter: new Date(Date.now() + 2 * 3_600_000).toISOString(),
      }),
    );
    fireEvent.changeText(await screen.findByTestId('aadhaar-input'), AADHAAR);
    fireEvent.press(screen.getByTestId('aadhaar-consent'));
    fireEvent.press(screen.getByTestId('send-otp'));

    expect(await screen.findByTestId('aadhaar-error')).toHaveTextContent('too many Aadhaar verification attempts', { exact: false });
    expect(screen.getByTestId('aadhaar-lockout')).toHaveTextContent(/Try again in 2 hrs/);
    expect(screen.getByTestId('send-otp')).toBeDisabled();
  });

  it('enables resend after the countdown and reuses the original number', async () => {
    jest.useFakeTimers();
    try {
      renderScreen();
      await requestOtp();
      api.requestAadhaarOTP.mockResolvedValue({ message: 'sent', session_id: 'sess-2' });

      for (let i = 0; i < 25; i += 1) {
        await act(async () => {
          jest.advanceTimersByTime(1000);
        });
      }
      fireEvent.press(screen.getByTestId('resend-otp'));
      await waitFor(() => expect(api.requestAadhaarOTP).toHaveBeenCalledTimes(2));
      expect(api.requestAadhaarOTP).toHaveBeenLastCalledWith(AADHAAR);
      expect(await screen.findByTestId('resend-timer')).toHaveTextContent('00:25', { exact: false });

      // The new session is what gets verified.
      api.verifyAadhaarOTP.mockResolvedValue({ status: 'approved', message: 'ok' });
      fireEvent.changeText(screen.getByTestId('otp-input'), '654321');
      fireEvent.press(screen.getByTestId('verify-otp'));
      await waitFor(() => expect(api.verifyAadhaarOTP).toHaveBeenCalledWith('sess-2', '654321'));
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows a retryable error state if status fails to load', async () => {
    api.getMyStatus.mockRejectedValueOnce(httpError(500, { error: 'failed to load verification status' }));
    profile.getMine.mockResolvedValue({ fullName: 'ASHA RAO', role: 'CONSUMER' });
    const client = makeClient();
    render(
      <QueryClientProvider client={client}>
        <KycVerificationScreen />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('failed to load verification status')).toBeTruthy();
    api.getMyStatus.mockResolvedValue(emptyStatus());
    fireEvent.press(screen.getByText('Try again'));
    expect(await screen.findByTestId('aadhaar-number-step')).toBeTruthy();
  });

  it('shows the verified summary when Aadhaar is already approved', async () => {
    renderScreen({ status: emptyStatus({ aadhaar: approvedAadhaar }) });
    expect(await screen.findByTestId('aadhaar-verified')).toBeTruthy();
    expect(screen.getByTestId('kyc-complete')).toBeTruthy();
    expect(screen.queryByTestId('aadhaar-input')).toBeNull();
  });
});

describe('Business owner flow (Aadhaar + GST)', () => {
  const verifiedGst: GSTVerificationResult = {
    status: 'VERIFIED',
    gstin: '27ABCDE1234F1Z5',
    maskedGstin: '27XXXXX1234F1Z5',
    legalName: 'RAO BUILDERS PRIVATE LIMITED',
    tradeName: 'Rao Builders',
    panNumber: 'ABCDE1234F',
    gstinStatus: 'Active',
    natureOfBusiness: ['Works Contract'],
    attemptsRemaining: 3,
  };

  it('keeps GST locked until identity is verified', async () => {
    renderScreen({ role: 'BUILDERS_CONTRACTORS' });
    expect(await screen.findByTestId('aadhaar-number-step')).toBeTruthy();
    expect(screen.getByTestId('kyc-locked-step')).toHaveTextContent(/Verify your business/);
    expect(screen.getByText('STEP 1 OF 3')).toBeTruthy();
  });

  it('continues from Aadhaar success into the GST step', async () => {
    renderScreen({ role: 'CONSULTANTS', employmentType: 'BUSINESS_OWNER' });
    await requestOtp();
    api.verifyAadhaarOTP.mockResolvedValue({ status: 'approved', message: 'ok' });
    fireEvent.changeText(screen.getByTestId('otp-input'), '123456');
    fireEvent.press(screen.getByTestId('verify-otp'));

    fireEvent.press(await screen.findByText('Continue to business verification'));
    expect(await screen.findByTestId('gst-step')).toBeTruthy();
  });

  it('prefills the company, validates the GSTIN and shows a name mismatch', async () => {
    renderScreen({
      role: 'VENDORS',
      company: 'Rao Builders',
      status: emptyStatus({ aadhaar: approvedAadhaar }),
    });

    expect(await screen.findByTestId('gst-step')).toBeTruthy();
    expect(screen.getByText('STEP 2 OF 3')).toBeTruthy();
    expect(screen.getByTestId('gst-legal-name').props.value).toBe('Rao Builders');

    const submit = screen.getByTestId('verify-gst');
    fireEvent.changeText(screen.getByTestId('gst-number'), '27abcde1234f1x5');
    expect(submit).toBeDisabled();
    fireEvent.changeText(screen.getByTestId('gst-number'), '27abcde1234f1z5');
    expect(screen.getByTestId('gst-number').props.value).toBe('27ABCDE1234F1Z5');
    expect(submit).toBeEnabled();

    const mismatch: GSTVerificationResult = { ...verifiedGst, status: 'MISMATCH', attemptsRemaining: 2 };
    api.submitGSTVerification.mockResolvedValue(mismatch);
    // The status refetch after submitting reflects the spent attempt.
    api.getMyStatus.mockResolvedValue(emptyStatus({ aadhaar: approvedAadhaar, gst: mismatch }));
    fireEvent.press(submit);

    expect(await screen.findByTestId('gst-error')).toHaveTextContent(/does not match the GST registration/);
    expect(api.submitGSTVerification).toHaveBeenCalledWith('27ABCDE1234F1Z5', 'Rao Builders');
    expect(screen.getByText(/GST attempts remaining: 2/)).toBeTruthy();
  });

  it('shows verified company details and the completed badge', async () => {
    renderScreen({ role: 'BUILDERS', status: emptyStatus({ aadhaar: approvedAadhaar }) });
    fireEvent.changeText(await screen.findByTestId('gst-legal-name'), 'RAO BUILDERS PRIVATE LIMITED');
    fireEvent.changeText(screen.getByTestId('gst-number'), '27ABCDE1234F1Z5');

    api.submitGSTVerification.mockResolvedValue(verifiedGst);
    api.getMyStatus.mockResolvedValue(emptyStatus({ aadhaar: approvedAadhaar, gst: verifiedGst }));
    fireEvent.press(screen.getByTestId('verify-gst'));

    expect(await screen.findByTestId('gst-verified')).toBeTruthy();
    expect(screen.getByText('RAO BUILDERS PRIVATE LIMITED')).toBeTruthy();
    expect(screen.getByText('ABCDE1234F')).toBeTruthy();
    expect(screen.getByText('Works Contract')).toBeTruthy();
    expect(screen.getByTestId('kyc-complete')).toHaveTextContent(/business and profile are verified/);
  });

  it('explains a GST provider outage', async () => {
    renderScreen({ role: 'BUILDERS', company: 'Rao', status: emptyStatus({ aadhaar: approvedAadhaar }) });
    fireEvent.changeText(await screen.findByTestId('gst-number'), '27ABCDE1234F1Z5');
    api.submitGSTVerification.mockRejectedValue(httpError(502, { error: 'upstream timeout' }));
    fireEvent.press(screen.getByTestId('verify-gst'));

    expect(await screen.findByTestId('gst-error')).toHaveTextContent(/temporarily unavailable/);
  });
});

describe('Employee flow (Aadhaar + work email)', () => {
  it('verifies the company work email with a code', async () => {
    renderScreen({
      role: 'CONTRACTORS',
      employmentType: 'EMPLOYEE',
      status: emptyStatus({ aadhaar: approvedAadhaar }),
    });

    expect(await screen.findByTestId('work-email-step')).toBeTruthy();
    const send = screen.getByTestId('send-email-code');
    fireEvent.changeText(screen.getByTestId('work-email-input'), 'asha@');
    expect(send).toBeDisabled();
    fireEvent.changeText(screen.getByTestId('work-email-input'), 'asha@raoinfra.com');

    api.sendEmployeeEmailOTP.mockResolvedValue({ message: 'sent' });
    fireEvent.press(send);
    expect(await screen.findByTestId('email-otp-input')).toBeTruthy();
    expect(api.sendEmployeeEmailOTP).toHaveBeenCalledWith('asha@raoinfra.com');

    api.verifyEmployeeEmailOTP.mockRejectedValueOnce(httpError(400, { error: 'invalid or expired code' }));
    fireEvent.changeText(screen.getByTestId('email-otp-input'), '111111');
    fireEvent.press(screen.getByTestId('verify-email-code'));
    expect(await screen.findByTestId('work-email-error')).toHaveTextContent('invalid or expired code', { exact: false });

    api.verifyEmployeeEmailOTP.mockResolvedValue({ message: 'ok' });
    fireEvent.changeText(screen.getByTestId('email-otp-input'), '222222');
    fireEvent.press(screen.getByTestId('verify-email-code'));

    expect(await screen.findByTestId('work-email-verified')).toBeTruthy();
    expect(api.verifyEmployeeEmailOTP).toHaveBeenLastCalledWith('asha@raoinfra.com', '222222');
    expect(screen.getByTestId('kyc-complete')).toBeTruthy();
  });

  it('resumes a pending code for the saved work email', async () => {
    renderScreen({
      role: 'CONSULTANTS',
      employmentType: 'EMPLOYEE',
      status: emptyStatus({
        aadhaar: approvedAadhaar,
        employeeEmail: { email: 'asha@raoinfra.com', verified: false, codePending: true },
      }),
    });

    expect(await screen.findByTestId('email-otp-input')).toBeTruthy();
    expect(screen.getByTestId('work-email-input').props.value).toBe('asha@raoinfra.com');

    // Changing the address invalidates the pending code.
    fireEvent.changeText(screen.getByTestId('work-email-input'), 'asha@other.com');
    expect(screen.queryByTestId('email-otp-input')).toBeNull();
  });
});

describe('Name match guide popups', () => {
  async function failAadhaarWithMismatch() {
    await requestOtp();
    api.verifyAadhaarOTP.mockRejectedValue(
      httpError(409, { error: 'mismatch', code: 'AADHAAR_DETAILS_MISMATCH', attemptsRemaining: 2 }),
    );
    fireEvent.changeText(screen.getByTestId('otp-input'), '123456');
    fireEvent.press(screen.getByTestId('verify-otp'));
    await screen.findByTestId('aadhaar-failed-step');
  }

  it('opens the Aadhaar name guide automatically on a details mismatch', async () => {
    renderScreen();
    await failAadhaarWithMismatch();

    const guide = await screen.findByTestId('identity-name-guide');
    expect(screen.getByText("Your name didn't match your Aadhaar")).toBeTruthy();
    expect(guide).toHaveTextContent(/ASHA RAO/);
    expect(guide).toHaveTextContent(/2 attempts left/);

    fireEvent.press(screen.getByTestId('guide-edit-profile'));
    expect(router.push).toHaveBeenCalledWith('/edit-profile');
    await waitFor(() => expect(screen.queryByTestId('identity-name-guide')).toBeNull());

    // It can be reopened from the failed panel.
    fireEvent.press(screen.getByText('See how to fix this'));
    expect(await screen.findByTestId('identity-name-guide')).toBeTruthy();
  });

  it('does not open the guide for an ordinary wrong OTP', async () => {
    renderScreen();
    await requestOtp();
    api.verifyAadhaarOTP.mockRejectedValue(httpError(400, { error: 'Invalid OTP', attemptsRemaining: 2 }));
    fireEvent.changeText(screen.getByTestId('otp-input'), '123456');
    fireEvent.press(screen.getByTestId('verify-otp'));

    await screen.findByTestId('aadhaar-error');
    expect(screen.queryByTestId('identity-name-guide')).toBeNull();
  });

  it('lets the user check the Aadhaar name rules before trying', async () => {
    renderScreen();
    fireEvent.press(await screen.findByTestId('aadhaar-name-help'));

    expect(await screen.findByTestId('identity-name-guide')).toBeTruthy();
    expect(screen.getByText('Use your name as per Aadhaar')).toBeTruthy();
    expect(screen.queryByText(/attempts left/)).toBeNull();
    fireEvent.press(screen.getByText('Got it'));
    await waitFor(() => expect(screen.queryByTestId('identity-name-guide')).toBeNull());
  });

  describe('GST business name', () => {
    const mismatch: GSTVerificationResult = {
      status: 'MISMATCH',
      gstin: '27ABCDE1234F1Z5',
      maskedGstin: '27XXXXX1234F1Z5',
      failureReason: 'Legal business name does not match GST registration',
      attemptsRemaining: 2,
    };

    async function submitGst(result: GSTVerificationResult) {
      api.submitGSTVerification.mockResolvedValue(result);
      api.getMyStatus.mockResolvedValue(emptyStatus({ aadhaar: approvedAadhaar, gst: result }));
      fireEvent.press(screen.getByTestId('verify-gst'));
      await screen.findByTestId('gst-error');
    }

    it('opens on every mismatch and shows what was entered', async () => {
      renderScreen({ role: 'BUILDERS', company: 'Rao Builders', status: emptyStatus({ aadhaar: approvedAadhaar }) });
      fireEvent.changeText(await screen.findByTestId('gst-number'), '27ABCDE1234F1Z5');
      await submitGst(mismatch);

      const guide = await screen.findByTestId('business-name-guide');
      expect(screen.getByText("Business name didn't match GST")).toBeTruthy();
      expect(guide).toHaveTextContent(/You entered/);
      expect(guide).toHaveTextContent(/Rao Builders/);
      expect(guide).toHaveTextContent(/2 attempts left/);

      fireEvent.press(screen.getByTestId('guide-fix-business-name'));
      await waitFor(() => expect(screen.queryByTestId('business-name-guide')).toBeNull());

      // A second rejected name re-opens it.
      fireEvent.changeText(screen.getByTestId('gst-legal-name'), 'RAO BUILDERS PVT');
      await submitGst({ ...mismatch, attemptsRemaining: 1 });
      expect(await screen.findByTestId('business-name-guide')).toHaveTextContent(/RAO BUILDERS PVT/);
      expect(screen.getByTestId('business-name-guide')).toHaveTextContent(/1 attempt left/);
    });

    it('does not open for an inactive registration', async () => {
      renderScreen({ role: 'BUILDERS', company: 'Rao Builders', status: emptyStatus({ aadhaar: approvedAadhaar }) });
      fireEvent.changeText(await screen.findByTestId('gst-number'), '27ABCDE1234F1Z5');
      await submitGst({ ...mismatch, status: 'INACTIVE' });
      expect(screen.queryByTestId('business-name-guide')).toBeNull();
    });

    it('opens from the help link with an enlargeable guide image and portal link', async () => {
      const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
      renderScreen({ role: 'BUILDERS', company: 'Rao Builders', status: emptyStatus({ aadhaar: approvedAadhaar }) });
      fireEvent.press(await screen.findByTestId('gst-name-help'));

      expect(await screen.findByTestId('business-name-guide')).toBeTruthy();
      expect(screen.getByText('Use your exact GST business name')).toBeTruthy();

      expect(screen.queryByTestId('gst-guide-zoomed')).toBeNull();
      fireEvent.press(screen.getByTestId('gst-guide-zoom'));
      expect(screen.getByTestId('gst-guide-zoomed')).toBeTruthy();

      fireEvent.press(screen.getByText('Open GST portal'));
      expect(openURL).toHaveBeenCalledWith('https://services.gst.gov.in/services/searchtp');
      openURL.mockRestore();
    });
  });
});
