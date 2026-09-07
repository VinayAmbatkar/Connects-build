import { createContext, useContext, type ReactNode } from 'react';
import { Animated } from 'react-native';

export type OnboardingPagerContextValue = {
  translateX: Animated.Value;
  width: number;
  step: number;
  totalSteps: number;
};

const OnboardingPagerContext = createContext<OnboardingPagerContextValue | null>(null);

type ProviderProps = {
  translateX: Animated.Value;
  width: number;
  step: number;
  totalSteps: number;
  children: ReactNode;
};

export function OnboardingPagerProvider({
  translateX,
  width,
  step,
  totalSteps,
  children,
}: ProviderProps) {
  return (
    <OnboardingPagerContext.Provider value={{ translateX, width, step, totalSteps }}>
      {children}
    </OnboardingPagerContext.Provider>
  );
}

export function useOnboardingPagerContext() {
  const context = useContext(OnboardingPagerContext);
  if (!context) {
    throw new Error('useOnboardingPagerContext must be used within OnboardingPagerProvider');
  }
  return context;
}
