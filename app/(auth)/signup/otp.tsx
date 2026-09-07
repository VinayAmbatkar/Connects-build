import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi } from '@/src/api/auth';
import { getErrorMessage } from '@/src/api/client';
import { OtpInput } from '@/src/components/OtpInput';
import { SignupAccountFooter } from '@/src/components/SignupAccountFooter';
import { StepProgress } from '@/src/components/StepProgress';
import { BrandHeader } from '@/src/features/onboarding/BrandHeader';
import { useSignupStore } from '@/src/store/signupStore';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

const signupHero = require('../../../assets/images/Onboarding/loginimg-bg.png');
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BRAND = '#F57D01';

export default function SignupOtpScreen() {
  const draft = useSignupStore((s) => s.draft);
  const update = useSignupStore((s) => s.update);
  const reset = useSignupStore((s) => s.reset);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const insets = useSafeAreaInsets();

  const resendOtp = async () => {
    if (!draft.email.trim()) {
      Alert.alert('Missing email', 'Go back and enter your email address.');
      return;
    }
    setResending(true);
    try {
      await authApi.sendEmailOtp(draft.email.trim());
      Alert.alert('OTP sent', 'A new verification code has been sent to your email.');
    } catch (error) {
      Alert.alert('Could not resend OTP', getErrorMessage(error));
    } finally {
      setResending(false);
    }
  };

  const verifyEmail = async () => {
    if (code.length < 6) {
      Alert.alert('Enter OTP', 'Please enter the 6-digit code.');
      return;
    }
    setLoading(true);
    try {
      await authApi.verifyEmailOtp(draft.email.trim(), code);
      update({ emailVerified: true });
      reset();
      router.replace('/(auth)/signup-success');
    } catch (error) {
      Alert.alert('Verification failed', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, 24) + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroArt} pointerEvents="none">
              <Image source={signupHero} style={styles.heroImage} resizeMode="contain" />
              <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.55)', 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 0.55, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.7)', '#FFFFFF']}
                style={styles.heroFadeBottom}
              />
            </View>

            <View style={styles.heroContent}>
              <View style={styles.brandRow}>
                <Pressable
                  onPress={() => router.back()}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  style={styles.backBtn}
                >
                  <Ionicons name="chevron-back" size={22} color={colors.text} />
                </Pressable>
                <BrandHeader showMadeInBharath />
              </View>
              <Text style={styles.pageTitle}>Sign Up</Text>
              <Text style={styles.pageSub}>Verify your email to finish creating your account</Text>
            </View>
          </View>

          <View style={styles.body}>
            <StepProgress current={3} />

            <View style={styles.sectionHead}>
              <View style={styles.sectionIcon}>
                <Ionicons name="mail-outline" size={18} color={BRAND} />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={styles.heading}>Enter verification code</Text>
                <Text style={styles.desc}>
                  We sent a 6-digit code to {draft.email || 'your email'}.
                </Text>
              </View>
            </View>

            <OtpInput value={code} onChange={setCode} />

            <Pressable
              onPress={resendOtp}
              disabled={resending}
              accessibilityRole="button"
              style={styles.resendWrap}
            >
              {resending ? (
                <ActivityIndicator size="small" color={BRAND} />
              ) : (
                <Text style={styles.resendText}>Resend code</Text>
              )}
            </Pressable>

            <View style={styles.footer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() => router.back()}
                style={({ pressed }) => [styles.backCircle, pressed && styles.pressed]}
              >
                <Ionicons name="chevron-back" size={24} color={BRAND} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={verifyEmail}
                disabled={loading}
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && styles.pressed,
                  loading && styles.submitDisabled,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Text style={styles.submitText}>Verify Email</Text>
                    <Ionicons name="arrow-forward" size={18} color={colors.white} />
                  </>
                )}
              </Pressable>
            </View>

            <SignupAccountFooter />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
  },
  hero: {
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  heroArt: {
    ...StyleSheet.absoluteFill,
    opacity: 0.55,
  },
  heroImage: {
    position: 'absolute',
    right: -48,
    top: -36,
    width: SCREEN_WIDTH * 0.52,
    height: 112,
  },
  heroFadeBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 36,
  },
  heroContent: {
    zIndex: 2,
    maxWidth: '78%',
    paddingBottom: spacing.xs,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
  },
  pageTitle: {
    marginTop: spacing.sm,
    fontFamily: typography.fontFamily.bold,
    fontSize: 26,
    lineHeight: 32,
    color: colors.text,
    letterSpacing: -0.4,
  },
  pageSub: {
    marginTop: 4,
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  body: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  sectionHead: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacing.lg,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFEAD5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  sectionCopy: {
    flex: 1,
  },
  heading: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  desc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  resendWrap: {
    alignSelf: 'flex-end',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 32,
    justifyContent: 'center',
  },
  resendText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: BRAND,
  },
  footer: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    borderColor: BRAND,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    flex: 1,
    height: 54,
    borderRadius: radius.full,
    backgroundColor: BRAND,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
  },
  submitText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.white,
  },
  pressed: {
    opacity: 0.92,
  },
  submitDisabled: {
    opacity: 0.7,
  },
});
