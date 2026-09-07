import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandHeader } from '@/src/features/onboarding/BrandHeader';
import { OnboardingMotionView } from '@/src/features/onboarding/components/OnboardingMotionView';
import { useOnboardingPagerContext } from '@/src/features/onboarding/animation/OnboardingPagerContext';
import { onboardingVendors } from '@/src/features/onboarding/assets';
import { colors, typography } from '@/src/theme/tokens';

const BRAND_GREEN = '#F57D01';
const ACCENT_GREEN = '#D96A00';

type Props = {
  pageIndex: number;
  width: number;
  height: number;
  slideCount: number;
  onNext: () => void;
  onSkip: () => void;
};

export function OnboardingVendorsSlide({
  pageIndex,
  width,
  height,
  slideCount,
  onNext,
  onSkip,
}: Props) {
  const { step } = useOnboardingPagerContext();
  const imageHeight = Math.min(Math.round(height * 0.48), 380);

  return (
    <View style={[styles.slide, { width, height }]}>
      <OnboardingMotionView pageIndex={pageIndex} variant="logo" delay={0} style={styles.header}>
        <BrandHeader />
      </OnboardingMotionView>

      <OnboardingMotionView
        pageIndex={pageIndex}
        variant="hero"
        delay={100}
        style={[styles.imageWrap, { height: imageHeight }]}
      >
        <Image
          source={onboardingVendors}
          style={{ width: width - 8, height: imageHeight }}
          resizeMode="contain"
        />
      </OnboardingMotionView>

      <OnboardingMotionView pageIndex={pageIndex} delay={160} style={styles.copy}>
        <Text style={styles.title}>
          <Text style={styles.titleDark}>Connecting The Right{'\n'}</Text>
          <Text style={styles.titleGreen}>Vendor, Consultant{'\n'}</Text>
          <Text style={styles.titleDark}>For Your Project</Text>
        </Text>
        <View style={styles.underline} />
      </OnboardingMotionView>

      <OnboardingMotionView pageIndex={pageIndex} delay={240} style={styles.subtitleWrap}>
        <Text style={styles.subtitle}>
          Find verified vendors and consultants who match your requirements and deliver the best
          results.
        </Text>
      </OnboardingMotionView>

      <View style={styles.spacer} />

      <OnboardingMotionView pageIndex={pageIndex} variant="footer" delay={320} style={styles.footer}>
        <Pressable onPress={onSkip} hitSlop={12} accessibilityRole="button">
          <Text style={styles.skip}>Skip</Text>
        </Pressable>

        <View style={styles.dots}>
          {Array.from({ length: slideCount }).map((_, i) => (
            <View key={`dot-${i}`} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next"
          onPress={onNext}
          style={({ pressed }) => [styles.nextBtn, pressed && styles.nextPressed]}
        >
          <Ionicons name="arrow-forward" size={22} color={colors.white} />
        </Pressable>
      </OnboardingMotionView>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 8,
  },
  imageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    paddingHorizontal: 28,
    alignItems: 'center',
    marginTop: 8,
  },
  title: {
    textAlign: 'center',
    fontFamily: typography.fontFamily.bold,
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  titleDark: {
    color: colors.text,
    fontFamily: typography.fontFamily.bold,
  },
  titleGreen: {
    color: ACCENT_GREEN,
    fontFamily: typography.fontFamily.bold,
  },
  underline: {
    marginTop: 14,
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: ACCENT_GREEN,
  },
  subtitleWrap: {
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  subtitle: {
    marginTop: 14,
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  spacer: {
    flex: 1,
    minHeight: 12,
  },
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skip: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 15,
    color: colors.textMuted,
    minWidth: 56,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: BRAND_GREEN,
  },
  nextBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextPressed: {
    opacity: 0.9,
  },
});
