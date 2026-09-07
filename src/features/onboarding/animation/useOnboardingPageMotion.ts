import { useMemo } from 'react';
import { Animated } from 'react-native';
import { useOnboardingPagerContext } from '@/src/features/onboarding/animation/OnboardingPagerContext';

function buildInputRange(pageIndex: number, width: number, totalSteps: number): number[] {
  const points = new Set<number>();

  if (pageIndex > 0) {
    points.add(-(pageIndex - 1) * width);
  }

  points.add(-pageIndex * width);

  if (pageIndex < totalSteps - 1) {
    points.add(-(pageIndex + 1) * width);
  }

  return Array.from(points).sort((a, b) => a - b);
}

function buildFadeOutput(inputLength: number): number[] {
  if (inputLength === 2) {
    return [0.72, 1];
  }
  return [0.72, 1, 0.72];
}

export function useOnboardingPageMotion(pageIndex: number) {
  const { translateX, width, totalSteps } = useOnboardingPagerContext();

  return useMemo(() => {
    const inputRange = buildInputRange(pageIndex, width, totalSteps);
    const fadeOutput = buildFadeOutput(inputRange.length);

    const scrollOpacity = translateX.interpolate({
      inputRange,
      outputRange: fadeOutput,
      extrapolate: 'clamp',
    });

    const scrollTranslateY = translateX.interpolate({
      inputRange,
      outputRange: fadeOutput.map((value) => (1 - value) * 28),
      extrapolate: 'clamp',
    });

    const scrollParallaxX = translateX.interpolate({
      inputRange,
      outputRange: inputRange.map((value) => (value + pageIndex * width) * 0.14),
      extrapolate: 'clamp',
    });

    return {
      scrollOpacity,
      scrollTranslateY,
      scrollParallaxX,
    };
  }, [pageIndex, totalSteps, translateX, width]);
}
