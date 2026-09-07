import { create } from 'zustand';

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
