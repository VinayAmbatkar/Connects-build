import { create } from 'zustand';
import type { LoginResponse } from '@/src/types/api';

/** Signup-screen role keys -> the backend's models.Role values (the same
 *  ids Edit Profile's role picker uses, so the choice carries over). */
const SIGNUP_ROLE_TO_API: Record<string, string> = {
  Consumer: 'CONSUMER',
  Consultant: 'CONSULTANTS',
  // Separate roles, same as the web signup.
  Builder: 'BUILDERS',
  Contractor: 'CONTRACTORS',
  Vendor: 'VENDORS',
};

export function toApiSignupRole(role: string): string {
  return SIGNUP_ROLE_TO_API[role] ?? role;
}

// The signup response is held here until the email OTP is verified; only
// then is the session persisted (logging the user in).
let pendingSession: LoginResponse | null = null;
export function setPendingSignupSession(data: LoginResponse | null) {
  pendingSession = data;
}
export function takePendingSignupSession(): LoginResponse | null {
  const data = pendingSession;
  pendingSession = null;
  return data;
}

export type SignupDraft = {
  fullName: string;
  email: string;
  phoneCountryCode: string;
  phoneCountryId: string;
  phoneNumber: string;
  role: string;
  password: string;
  emailVerified: boolean;
};

type SignupState = {
  draft: SignupDraft;
  update: (partial: Partial<SignupDraft>) => void;
  reset: () => void;
};

const initialDraft: SignupDraft = {
  fullName: '',
  email: '',
  phoneCountryCode: '+91',
  phoneCountryId: 'IN',
  phoneNumber: '',
  role: '',
  password: '',
  emailVerified: false,
};

export const useSignupStore = create<SignupState>((set) => ({
  draft: initialDraft,
  update: (partial) =>
    set((state) => ({ draft: { ...state.draft, ...partial } })),
  reset: () => set({ draft: initialDraft }),
}));
