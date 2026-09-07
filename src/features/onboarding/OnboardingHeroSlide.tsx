import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandHeader } from '@/src/features/onboarding/BrandHeader';
import { FeatureGrid } from '@/src/features/onboarding/FeatureGrid';
import { HeroBottomWave } from '@/src/features/onboarding/HeroBottomWave';
import { OnboardingMotionView } from '@/src/features/onboarding/components/OnboardingMotionView';
import { onboardingHero } from '@/src/features/onboarding/assets';
import { colors, radius, typography } from '@/src/theme/tokens';

const BUTTON_WIDTH = 342;
const BUTTON_HEIGHT = 64;
const BRAND_GREEN = '#F57D01';
const HERO_BG = '#FFEAD5';
const WAVE_HEIGHT = 64;

type Props = {
  pageIndex: number;
  width: number;
  height: number;
  onGetStarted: () => void;
  onLogin: () => void;
};

export function OnboardingHeroSlide({
  pageIndex,
  width,
  height,
  onGetStarted,
  onLogin,
}: Props) {
  const ctaWidth = Math.min(BUTTON_WIDTH, width - 48);
  const heroHeight = Math.min(Math.round(height * 0.4), 320);
  const textColumnWidth = Math.round(width * 0.54);
  const imageWidth = Math.round(width * 0.82);
  const imageHeight = heroHeight + 56;

  return (
    <View style={[styles.slide, { width, height }]}>
      <View style={styles.heroBand}>
        <OnboardingMotionView pageIndex={pageIndex} variant="logo" delay={0} style={styles.header}>
          <BrandHeader />
        </OnboardingMotionView>

        <View style={[styles.hero, { height: heroHeight }]}>
          <OnboardingMotionView
            pageIndex={pageIndex}
            delay={80}
            style={[styles.heroCopy, { width: textColumnWidth }]}
          >
            <View style={styles.headlineWrap}>
              <View>
                <Text
                  style={[styles.headlineLine, styles.lineDark]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  Connect.
                </Text>
                <View style={styles.underline} />
              </View>
              <Text
                style={[styles.headlineLine, styles.lineGreen]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                Collaborate.
              </Text>
              <Text
                style={[styles.headlineLine, styles.lineDark]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                Construct.
              </Text>
            </View>
            <Text style={styles.subtitle}>
              One platform to connect with Designers, Engineers, Contractors, Builders and
              Vendors.
            </Text>
          </OnboardingMotionView>

          <OnboardingMotionView
            pageIndex={pageIndex}
            variant="hero"
            delay={120}
            style={[
              styles.heroImage,
              {
                width: imageWidth,
                height: imageHeight,
              },
            ]}
          >
            <Image
              source={onboardingHero}
              style={{ width: imageWidth, height: imageHeight }}
              resizeMode="contain"
            />
          </OnboardingMotionView>
        </View>

        <HeroBottomWave width={width} height={WAVE_HEIGHT} fill={colors.background} />
      </View>

      <OnboardingMotionView pageIndex={pageIndex} delay={200} style={styles.featuresWrap}>
        <FeatureGrid />
      </OnboardingMotionView>

      <View style={styles.spacer} />

      <OnboardingMotionView pageIndex={pageIndex} variant="footer" delay={280} style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={onGetStarted}
          style={({ pressed }) => [
            styles.cta,
            { width: ctaWidth, height: BUTTON_HEIGHT },
            pressed && styles.ctaPressed,
          ]}
        >
          <Text style={styles.ctaText}>Get Started</Text>
          <View style={styles.ctaArrow}>
            <Ionicons name="arrow-forward" size={18} color={BRAND_GREEN} />
          </View>
        </Pressable>

        <Pressable onPress={onLogin} style={styles.loginRow} hitSlop={10}>
          <Text style={styles.loginMuted}>Already Have Account? </Text>
          <Text style={styles.loginLink}>Login</Text>
        </Pressable>
      </OnboardingMotionView>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  heroBand: {
    backgroundColor: HERO_BG,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
    zIndex: 3,
  },
  hero: {
    position: 'relative',
    justifyContent: 'center',
    overflow: 'visible',
  },
  heroImage: {
    position: 'absolute',
    right: -36,
    top: -24,
    zIndex: 2,
  },
  heroCopy: {
    paddingLeft: 24,
    paddingRight: 4,
    paddingVertical: 4,
    zIndex: 1,
    justifyContent: 'center',
  },
  headlineWrap: {
    gap: 0,
  },
  headlineLine: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.6,
    includeFontPadding: false,
  },
  lineDark: {
    color: colors.text,
  },
  lineGreen: {
    color: BRAND_GREEN,
  },
  underline: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: BRAND_GREEN,
    marginTop: 2,
    marginBottom: 4,
  },
  subtitle: {
    marginTop: 12,
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
    maxWidth: 155,
  },
  featuresWrap: {
    paddingHorizontal: 24,
    marginTop: 8,
  },
  spacer: {
    flex: 1,
    minHeight: 16,
  },
  actions: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 14,
    zIndex: 2,
  },
  cta: {
    borderRadius: 16,
    backgroundColor: BRAND_GREEN,
    paddingLeft: 28,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaPressed: {
    opacity: 0.92,
  },
  ctaText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    color: colors.white,
  },
  ctaArrow: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginMuted: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  loginLink: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
    color: BRAND_GREEN,
  },
});
