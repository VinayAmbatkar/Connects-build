import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
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
import { SignupAccountFooter } from '@/src/components/SignupAccountFooter';
import { BrandTaglineFooter } from '@/src/components/BrandTaglineFooter';
import { StepProgress } from '@/src/components/StepProgress';
import { TextField } from '@/src/components/TextField';
import { BrandHeader } from '@/src/features/onboarding/BrandHeader';
import { authApi } from '@/src/api/auth';
import { getErrorMessage } from '@/src/api/client';
import { useAuthActions } from '@/src/hooks/useAuthActions';
import { useSignupStore } from '@/src/store/signupStore';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

import { appAlert } from '@/src/components/AppDialog';
import { LEGAL } from '@/src/constants/app';
import { openInApp } from '@/src/utils/openInApp';

const AGREE_REQUIRED = 'You must agree to the Terms and Privacy Policy.';
const signupHero = require('../../../assets/images/Onboarding/loginimg-bg.webp');
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BRAND = '#F57D01';

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={styles.rule}>
      <View style={[styles.ruleDot, ok && styles.ruleDotOk]}>
        {ok ? <Ionicons name="checkmark" size={10} color={colors.white} /> : null}
      </View>
      <Text style={[styles.ruleText, ok && styles.ruleTextOk]}>{label}</Text>
    </View>
  );
}

export default function SignupPasswordScreen() {
  const draft = useSignupStore((s) => s.draft);
  const update = useSignupStore((s) => s.update);
  const { persistSession } = useAuthActions();
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollToField = (offset = 0) => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: offset, animated: true });
    }, 120);
  };

  const scrollToConfirm = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const checks = useMemo(
    () => ({
      length: draft.password.length >= 8,
      upper: /[A-Z]/.test(draft.password),
      number: /\d/.test(draft.password),
      special: /[^A-Za-z0-9]/.test(draft.password),
      match: draft.password.length > 0 && draft.password === confirm,
    }),
    [draft.password, confirm],
  );

  const allValid =
    checks.length && checks.upper && checks.number && checks.special && checks.match;

  // Same rule as web signup: no account without accepting the Terms and
  // Privacy Policy.
  const [agreed, setAgreed] = useState(false);
  const [agreeError, setAgreeError] = useState(false);

  const createAccountAndContinue = async () => {
    if (!agreed) {
      setAgreeError(true);
      appAlert('Terms and Privacy Policy', AGREE_REQUIRED);
      return;
    }
    if (!allValid) {
      appAlert('Password', 'Please meet all password requirements and confirm it.');
      return;
    }
    if (!draft.fullName.trim() || !draft.email.trim() || !draft.role) {
      appAlert('Missing info', 'Please complete profile and role steps first.');
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.signup({
        fullName: draft.fullName.trim(),
        email: draft.email.trim(),
        phoneCountryCode: draft.phoneCountryCode.trim(),
        phoneNumber: draft.phoneNumber.trim(),
        password: draft.password,
        role: draft.role,
      });
      await persistSession(data);
      router.push('/(auth)/signup/otp');
    } catch (error) {
      appAlert('Signup failed', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const eyeToggle = (visible: boolean, onToggle: () => void) => (
    <Pressable
      onPress={onToggle}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={visible ? 'Hide password' : 'Show password'}
    >
      <Ionicons
        name={visible ? 'eye-outline' : 'eye-off-outline'}
        size={22}
        color={colors.textMuted}
      />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        // Android runs edge-to-edge, so the window no longer resizes for the
        // keyboard -- pad on both platforms (same as ChatScreen).
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom:
                Math.max(insets.bottom, 16) + (keyboardVisible ? 220 : 24),
            },
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
            </View>
          </View>

          <View style={styles.body}>
            <StepProgress current={2} card />

            <View style={styles.sectionHead}>
              <View style={styles.sectionIcon}>
                <Ionicons name="lock-closed-outline" size={18} color={BRAND} />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={styles.heading}>Create a password</Text>
                <Text style={styles.desc}>Set a strong password to keep your account secure.</Text>
              </View>
            </View>

            <TextField
              label="Password"
              required
              autoComplete="new-password"
              secureTextEntry={!showPassword}
              value={draft.password}
              onChangeText={(password) => update({ password })}
              onFocus={() => scrollToField(180)}
              placeholder="Enter your password"
              leftAddon={<Ionicons name="lock-closed-outline" size={20} color={BRAND} />}
              rightAddon={eyeToggle(showPassword, () => setShowPassword((v) => !v))}
            />

            <View style={styles.rules}>
              <Rule ok={checks.length} label="8+ characters" />
              <Rule ok={checks.upper} label="1 uppercase" />
              <Rule ok={checks.number} label="1 number" />
              <Rule ok={checks.special} label="1 special character" />
            </View>

            <TextField
              label="Confirm Password"
              required
              autoComplete="new-password"
              secureTextEntry={!showConfirm}
              value={confirm}
              onChangeText={setConfirm}
              onFocus={scrollToConfirm}
              placeholder="Confirm your password"
              leftAddon={<Ionicons name="lock-closed-outline" size={20} color={BRAND} />}
              rightAddon={eyeToggle(showConfirm, () => setShowConfirm((v) => !v))}
              error={
                confirm.length > 0 && !checks.match ? 'Passwords do not match' : undefined
              }
            />

            <Pressable
              style={styles.termsRow}
              onPress={() => {
                setAgreed((v) => !v);
                setAgreeError(false);
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
              accessibilityLabel="I agree to the Terms and Privacy Policy"
              hitSlop={6}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxOn, agreeError && styles.checkboxError]}>
                {agreed ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={styles.termsLink} onPress={() => openInApp(LEGAL.termsUrl)}>
                  Terms
                </Text>{' '}
                and{' '}
                <Text style={styles.termsLink} onPress={() => openInApp(LEGAL.privacyUrl)}>
                  Privacy Policy
                </Text>
                .
              </Text>
            </Pressable>
            {agreeError ? <Text style={styles.termsError}>{AGREE_REQUIRED}</Text> : null}

            <View style={styles.bottomGroup}>
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
                  onPress={createAccountAndContinue}
                  disabled={loading}
                  accessibilityState={{ disabled: loading || !agreed }}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    pressed && styles.pressed,
                    (loading || !agreed) && styles.submitDisabled,
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <>
                      <Text style={styles.submitText}>Create Account</Text>
                      <Ionicons name="arrow-forward" size={18} color={colors.white} />
                    </>
                  )}
                </Pressable>
              </View>

              <SignupAccountFooter />
              <BrandTaglineFooter />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: spacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    marginTop: 1,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { borderColor: BRAND, backgroundColor: BRAND },
  checkboxError: { borderColor: colors.danger },
  termsText: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  termsLink: { fontFamily: typography.fontFamily.semibold, color: BRAND },
  termsError: {
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.danger,
  },
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
  body: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  sectionHead: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacing.md,
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
  rules: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: -4,
    marginBottom: spacing.md,
    rowGap: 10,
  },
  rule: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  ruleDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleDotOk: {
    borderColor: BRAND,
    backgroundColor: BRAND,
  },
  ruleText: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  ruleTextOk: {
    color: colors.text,
    fontFamily: typography.fontFamily.medium,
  },
  bottomGroup: {
    marginTop: 'auto',
    gap: spacing.md,
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
