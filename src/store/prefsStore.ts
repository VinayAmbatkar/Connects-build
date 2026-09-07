import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const ONBOARDING_KEY = 'cb_has_completed_onboarding';
const TOUR_KEY = 'cb_has_completed_tour';

type PrefsState = {
  hasCompletedOnboarding: boolean;
  hasCompletedTour: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  completeTour: () => Promise<void>;
  resetTour: () => Promise<void>;
};

export const usePrefsStore = create<PrefsState>((set) => ({
  hasCompletedOnboarding: false,
  hasCompletedTour: false,
  hydrated: false,

  hydrate: async () => {
    const [onboarding, tour] = await Promise.all([
      AsyncStorage.getItem(ONBOARDING_KEY),
      AsyncStorage.getItem(TOUR_KEY),
    ]);
    set({
      hasCompletedOnboarding: onboarding === 'true',
      hasCompletedTour: tour === 'true',
      hydrated: true,
    });
  },

  completeOnboarding: async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    set({ hasCompletedOnboarding: true });
  },

  resetOnboarding: async () => {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    set({ hasCompletedOnboarding: false });
  },

  completeTour: async () => {
    await AsyncStorage.setItem(TOUR_KEY, 'true');
    set({ hasCompletedTour: true });
  },

  resetTour: async () => {
    await AsyncStorage.setItem(TOUR_KEY, 'false');
    set({ hasCompletedTour: false });
  },
}));
