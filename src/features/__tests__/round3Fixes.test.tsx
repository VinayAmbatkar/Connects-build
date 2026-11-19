import { AxiosError, AxiosHeaders } from 'axios';
import { act, render } from '@testing-library/react-native';
import { VerifiedName } from '@/src/components/VerifiedName';
import { isProfileIncompleteError } from '@/src/features/profile/profileGate';
import { routeForNotification } from '@/src/notifications/push';
import { getErrorMessage } from '@/src/api/client';

function apiError(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data,
  });
}

describe('profile gate', () => {
  it('recognises the backend PROFILE_INCOMPLETE refusal', () => {
    const gated = apiError(403, { error: 'Please complete your profile to continue.', code: 'PROFILE_INCOMPLETE' });
    expect(isProfileIncompleteError(gated)).toBe(true);
    expect(isProfileIncompleteError(apiError(403, { code: 'FEATURE_LOCKED' }))).toBe(false);
    expect(isProfileIncompleteError(new Error('x'))).toBe(false);
  });

  it('explains what to fill in instead of the bare backend text', () => {
    const gated = apiError(403, { error: 'Please complete your profile to continue.', code: 'PROFILE_INCOMPLETE' });
    expect(getErrorMessage(gated)).toMatch(/role & expertise/);
  });
});

describe('notification taps', () => {
  it('opens the accepter profile focused on the connection buttons', () => {
    expect(routeForNotification({ type: 'CONNECTION_ACCEPTED', actorId: 'u1' })).toBe(
      '/public-profile/u1?focus=connection',
    );
  });

  it('opens the profile focused on licences for credential decisions', () => {
    expect(routeForNotification({ type: 'CREDENTIAL_VIEW_APPROVED', actorId: 'u2' })).toBe(
      '/public-profile/u2?focus=credentials',
    );
  });
});

describe('VerifiedName', () => {
  it('shows the tick only for verified people', async () => {
    const verified = render(<VerifiedName name="Asha" verified />);
    // Icons render after their font loads.
    await act(async () => {});
    expect(verified.queryByTestId('verified-tick')).toBeTruthy();
    const plain = render(<VerifiedName name="Ravi" verified={false} />);
    await act(async () => {});
    expect(plain.queryByTestId('verified-tick')).toBeNull();
  });
});
