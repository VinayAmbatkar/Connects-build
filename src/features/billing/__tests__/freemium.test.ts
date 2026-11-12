import { AxiosError, AxiosHeaders } from 'axios';
import { router } from 'expo-router';
import { freemiumApi, type FreemiumOffer, type Nudge } from '@/src/api/freemium';
import { showFeatureLockedPrompt } from '@/src/features/billing/featureLocked';
import { useFreemiumStore } from '@/src/features/billing/freemiumStore';
import { useAuthStore } from '@/src/store/authStore';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
const api = {
  claim: jest.spyOn(freemiumApi, 'claim'),
  nudges: jest.spyOn(freemiumApi, 'nudges'),
};

const claimOffer: FreemiumOffer = {
  type: 'CLAIM_FREE',
  feature: 'connect',
  title: 'Unlock connect for free',
  message: 'No payment needed.',
  cta_label: 'Claim it free',
  cta_action: 'CLAIM',
  dismiss_label: 'Not now',
};

const nudge: Nudge = {
  id: 'trial_ending:20270201:2027-01-28',
  kind: 'TRIAL_ENDING',
  title: 'Keep your connections alive',
  body: 'b',
  quote: 'Your network is your net worth.',
  cta: { label: 'View plans', action: 'OPEN_PLANS' },
  dismiss_label: 'Later',
};

function httpError(status: number) {
  return new AxiosError('x', String(status), undefined, undefined, {
    status, statusText: '', headers: {}, config: { headers: new AxiosHeaders() }, data: { code: 'FREEMIUM_OFF' },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  api.claim.mockReset();
  api.nudges.mockReset();
  useFreemiumStore.setState({ popup: null, notice: null, celebration: null, claiming: false, claimCount: 0, lastOfferKey: '', lastOfferAt: 0, lastNudgeCheck: 0 });
  useAuthStore.setState({ accessToken: 'tok', user: { id: 'u1' } } as never);
});

describe('freemium', () => {
  it('renders the server offer from a lock response instead of the built-in alert', () => {
    showFeatureLockedPrompt({ code: 'FEATURE_LOCKED', feature: 'connect', offer: claimOffer });
    expect(useFreemiumStore.getState().popup).toMatchObject({ title: 'Unlock connect for free', ctaAction: 'CLAIM' });
  });

  it('celebrates a new claim', async () => {
    const celebration = { title: 'Congratulations! 🎉', message: 'x', products: ['Verified', 'Premium'], features: ['Group chat'], cta_label: 'Start exploring' };
    api.claim.mockResolvedValue({ claimed: true, new: true, message: "You're in!", celebration });
    useFreemiumStore.getState().showOffer(claimOffer);
    await useFreemiumStore.getState().act();
    expect(useFreemiumStore.getState().celebration).toEqual(celebration);
    expect(useFreemiumStore.getState().notice).toBeNull();
    useFreemiumStore.getState().closeCelebration();
    expect(useFreemiumStore.getState().celebration).toBeNull();
  });

  it('claims, confirms and counts the claim', async () => {
    api.claim.mockResolvedValue({ claimed: true, new: true, message: "You're in!" });
    useFreemiumStore.getState().showOffer(claimOffer);
    await useFreemiumStore.getState().act();

    expect(api.claim).toHaveBeenCalledWith('connect');
    const s = useFreemiumStore.getState();
    expect(s.popup).toBeNull();
    expect(s.claimCount).toBe(1);
    expect(s.notice).toEqual({ kind: 'success', text: "You're in!" });
  });

  it('opens the plans when the campaign was switched off meanwhile', async () => {
    api.claim.mockRejectedValue(httpError(409));
    useFreemiumStore.getState().showOffer(claimOffer);
    await useFreemiumStore.getState().act();
    expect(router.push).toHaveBeenCalledWith('/premium');
  });

  it('treats an unknown action as dismiss', async () => {
    useFreemiumStore.getState().showOffer({ ...claimOffer, cta_action: 'SOMETHING_NEW' });
    await useFreemiumStore.getState().act();
    expect(useFreemiumStore.getState().popup).toBeNull();
    expect(router.push).not.toHaveBeenCalled();
    expect(api.claim).not.toHaveBeenCalled();
  });

  it('shows each nudge once', async () => {
    api.nudges.mockResolvedValue([nudge]);
    await useFreemiumStore.getState().checkNudges(true);
    expect(useFreemiumStore.getState().popup).toMatchObject({ source: 'nudge', quote: nudge.quote });

    useFreemiumStore.getState().dismiss();
    await useFreemiumStore.getState().checkNudges(true);
    expect(useFreemiumStore.getState().popup).toBeNull();
  });

  it('never covers an open offer with a nudge', async () => {
    api.nudges.mockResolvedValue([{ ...nudge, id: 'other' }]);
    useFreemiumStore.getState().showOffer(claimOffer);
    await useFreemiumStore.getState().checkNudges(true);
    expect(useFreemiumStore.getState().popup?.source).toBe('offer');
  });
});
