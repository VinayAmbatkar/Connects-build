import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { useOnboardingPagerContext } from '@/src/features/onboarding/animation/OnboardingPagerContext';
import { useOnboardingPageMotion } from '@/src/features/onboarding/animation/useOnboardingPageMotion';

type MotionVariant = 'default' | 'hero' | 'footer' | 'logo';

type Props = {
  pageIndex: number;
  delay?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: MotionVariant;
};

const ENTRANCE_OFFSET: Record<MotionVariant, number> = {
  logo: 14,
  default: 24,
  hero: 40,
  footer: 18,
};

const ENTRANCE_SCALE: Record<MotionVariant, number> = {
  logo: 0.96,
  default: 0.94,
  hero: 0.96,
  footer: 0.98,
};

/** HapMinds-style: scroll-linked fade/parallax + spring entrance when the page is active. */
export function OnboardingMotionView({
  pageIndex,
  delay = 0,
  children,
  style,
  variant = 'default',
}: Props) {
  const { step } = useOnboardingPagerContext();
  const { scrollOpacity, scrollTranslateY, scrollParallaxX } = useOnboardingPageMotion(pageIndex);
  const entrance = useRef(new Animated.Value(step === pageIndex ? 1 : 0)).current;

  useEffect(() => {
    if (step !== pageIndex) {
      entrance.setValue(0);
      return;
    }

    entrance.setValue(0);
    const timer = setTimeout(() => {
      Animated.spring(entrance, {
        toValue: 1,
        useNativeDriver: true,
        tension: 56,
        friction: 10,
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, entrance, pageIndex, step]);

  const entranceY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [ENTRANCE_OFFSET[variant], 0],
  });
  const entranceScale = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [ENTRANCE_SCALE[variant], 1],
  });

  const isHero = variant === 'hero';
  const opacity = isHero ? 1 : Animated.multiply(scrollOpacity, entrance);
  const translateY = Animated.add(scrollTranslateY, entranceY);

  const transform = isHero
    ? [{ translateX: scrollParallaxX }, { translateY }, { scale: entranceScale }]
    : [{ translateY }, { scale: entranceScale }];

  return <Animated.View style={[style, { opacity, transform }]}>{children}</Animated.View>;
}
