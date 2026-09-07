import { OnboardingFeedSlide } from '@/src/features/onboarding/OnboardingFeedSlide';
import { OnboardingHeroSlide } from '@/src/features/onboarding/OnboardingHeroSlide';
import { OnboardingVendorsSlide } from '@/src/features/onboarding/OnboardingVendorsSlide';
import { OnboardingPagerProvider } from '@/src/features/onboarding/animation/OnboardingPagerContext';
import { prefetchOnboardingImages } from '@/src/features/onboarding/assets';
import { useOnboardingPager } from '@/src/features/onboarding/hooks/useOnboardingPager';
import { ONBOARDING_SLIDES } from '@/src/features/onboarding/slides';
import { usePrefsStore } from '@/src/store/prefsStore';
import { colors } from '@/src/theme/tokens';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TOTAL_STEPS = ONBOARDING_SLIDES.length;

export default function OnboardingScreen() {
  const [pageHeight, setPageHeight] = useState(0);
  const completeOnboarding = usePrefsStore((s) => s.completeOnboarding);
  const { step, next, translateX, panHandlers, width } = useOnboardingPager({
    totalSteps: TOTAL_STEPS,
  });

  useEffect(() => {
    void prefetchOnboardingImages();
  }, []);

  const goLogin = async () => {
    await completeOnboarding();
    router.replace('/(auth)/login');
  };

  const goNext = async () => {
    if (step >= TOTAL_STEPS - 1) {
      await goLogin();
      return;
    }
    next();
  };

  const onStageLayout = (e: LayoutChangeEvent) => {
    setPageHeight(e.nativeEvent.layout.height);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <OnboardingPagerProvider
        translateX={translateX}
        width={width}
        step={step}
        totalSteps={TOTAL_STEPS}
      >
        <View style={styles.stage} onLayout={onStageLayout}>
          {pageHeight > 0 ? (
            <View style={[styles.root, { width }]}>
              <Animated.View
                style={[
                  styles.track,
                  {
                    width: width * TOTAL_STEPS,
                    transform: [{ translateX }],
                  },
                ]}
                {...panHandlers}
              >
                <View style={[styles.page, { width }]}>
                  <OnboardingHeroSlide
                    pageIndex={0}
                    width={width}
                    height={pageHeight}
                    onGetStarted={goNext}
                    onLogin={goLogin}
                  />
                </View>

                <View style={[styles.page, { width }]}>
                  <OnboardingVendorsSlide
                    pageIndex={1}
                    width={width}
                    height={pageHeight}
                    slideCount={TOTAL_STEPS}
                    onNext={goNext}
                    onSkip={goLogin}
                  />
                </View>

                <View style={[styles.page, { width }]}>
                  <OnboardingFeedSlide
                    pageIndex={2}
                    width={width}
                    height={pageHeight}
                    slideCount={TOTAL_STEPS}
                    onNext={goNext}
                    onSkip={goLogin}
                  />
                </View>
              </Animated.View>
            </View>
          ) : null}
        </View>
      </OnboardingPagerProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  stage: { flex: 1 },
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  track: {
    flex: 1,
    flexDirection: 'row',
  },
  page: {
    flexShrink: 0,
    overflow: 'hidden',
  },
});
