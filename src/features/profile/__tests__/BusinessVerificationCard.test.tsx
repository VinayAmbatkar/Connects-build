import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { router } from 'expo-router';
import { BusinessVerificationCard } from '@/src/features/profile/BusinessVerificationCard';
import { getKycProgress } from '@/src/features/verification/kycLogic';
import type { VerificationStatusResponse } from '@/src/types/api';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const aadhaar = { status: 'APPROVED' } as VerificationStatusResponse['aadhaar'];
const approved = { aadhaar } as VerificationStatusResponse;

/** Lets the icon font finish loading so its state update lands inside act(). */
async function renderCard(ui: ReactElement) {
  render(ui);
  await act(async () => {});
}

describe('BusinessVerificationCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('introduces the full business flow before anything is verified', async () => {
    await renderCard(<BusinessVerificationCard progress={getKycProgress('business', null)} />);
    expect(screen.getByText('Get Verified as a Business')).toBeTruthy();
    expect(screen.getByTestId('promo-step-identity')).toHaveTextContent(/Aadhaar/);
    expect(screen.getByTestId('promo-step-business')).toHaveTextContent(/GST/);
    expect(screen.getByText('Start Verification')).toBeTruthy();
  });

  it('shows one step remaining for a business owner after Aadhaar', async () => {
    await renderCard(<BusinessVerificationCard progress={getKycProgress('business', approved, true)} />);
    expect(screen.getByText('1 step remaining')).toBeTruthy();
    expect(screen.getByText('STEP 2 OF 2')).toBeTruthy();
    expect(screen.getByTestId('promo-step-identity')).toHaveTextContent(/Done/);
    expect(screen.getByTestId('promo-step-business')).not.toHaveTextContent(/Done/);

    fireEvent.press(screen.getByText('Verify Business'));
    expect(router.push).toHaveBeenCalledWith('/verification');
  });

  it('points an employee at the work email step after Aadhaar', async () => {
    await renderCard(<BusinessVerificationCard progress={getKycProgress('employee', approved)} />);
    expect(screen.getByText('1 step remaining')).toBeTruthy();
    expect(screen.getByText(/Confirm your company work email/)).toBeTruthy();
    expect(screen.getByText('Verify Work Email')).toBeTruthy();
  });

  it('shows the consumer intro with only the Aadhaar step', async () => {
    await renderCard(<BusinessVerificationCard progress={getKycProgress('individual', null)} />);
    expect(screen.getByText('Get Verified')).toBeTruthy();
    expect(screen.getByTestId('promo-step-identity')).toBeTruthy();
    expect(screen.queryByTestId('promo-step-business')).toBeNull();
    expect(screen.queryByText(/remaining/)).toBeNull();
  });
});
