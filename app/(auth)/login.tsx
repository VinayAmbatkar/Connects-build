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
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextField } from '@/src/components/TextField';
import { BrandTaglineFooter } from '@/src/components/BrandTaglineFooter';
import { BrandHeader } from '@/src/features/onboarding/BrandHeader';
import { GoogleButton } from '@/src/features/auth/GoogleButton';
import { useAuthActions } from '@/src/hooks/useAuthActions';
import { usePrefsStore } from '@/src/store/prefsStore';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

const loginHero = require('../../assets/images/Onboarding/loginimg-bg.webp');
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BRAND = '#F57D01';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, getErrorMessage } = useAuthActions();
  const hasCompletedTour = usePrefsStore((s) => s.hasCompletedTour);
  const insets = useSafeAreaInsets();

  const goHome = () => {
    if (hasCompletedTour) {
      router.replace('/(tabs)/feed');
    } else {
      router.replace('/(tabs)/feed?tour=1');
    }
  };

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing info', 'Enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      goHome();
    } catch (error) {
      Alert.alert('Login failed', getErrorMessage(error));
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
            { paddingBottom: Math.max(insets.bottom, 16) + spacing.lg },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroArt} pointerEvents="none">
              <Image
                source={loginHero}
                style={styles.heroImage}
                resizeMode="contain"
              />
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
              <BrandHeader showMadeInBharath />
              <Text style={styles.welcome}>Welcome back! 👋</Text>
              <Text style={styles.welcomeSub}>
                Sign in to continue building great connections.
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <TextField
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              placeholder="Loisbecket@gmail.com"
              leftAddon={
                <Ionicons name="mail-outline" size={20} color={BRAND} />
              }
            />

            <View style={styles.passwordLabelRow}>
              <Text style={styles.passwordLabel}>Password</Text>
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                <Text style={styles.showLink}>{showPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>
            <TextField
              autoComplete="password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              leftAddon={<Ionicons name="lock-closed-outline" size={20} color={BRAND} />}
              rightAddon={
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={22}
                    color={colors.textMuted}
                  />
                </Pressable>
              }
            />

            <Link href="/(auth)/forgot-password" asChild>
              <Pressable style={styles.forgotWrap}>
                <Text style={styles.forgot}>Forgot Password?</Text>
              </Pressable>
            </Link>

            <Pressable
              accessibilityRole="button"
              onPress={onSubmit}
              disabled={loading}
              style={({ pressed }) => [
                styles.loginBtn,
                pressed && styles.loginPressed,
                loading && styles.loginDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <View style={styles.loginRow}>
                  <Text style={styles.loginText}>Log In</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.white} />
                </View>
              )}
            </Pressable>

            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <View style={styles.orBadge}>
                <Text style={styles.orText}>OR</Text>
              </View>
              <View style={styles.orLine} />
            </View>

            <GoogleButton onSuccess={goHome} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <Link href="/(auth)/signup" asChild>
              <Pressable>
                <Text style={styles.link}>Sign Up</Text>
              </Pressable>
            </Link>
          </View>

          <View style={styles.taglineFooter}>
            <BrandTaglineFooter />
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
    minHeight: 100,
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
  welcome: {
    marginTop: spacing.sm,
    fontFamily: typography.fontFamily.bold,
    fontSize: 26,
    lineHeight: 32,
    color: colors.text,
    letterSpacing: -0.4,
  },
  welcomeSub: {
    marginTop: 4,
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  passwordLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  showLink: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: BRAND,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: spacing.lg,
  },
  forgot: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: BRAND,
  },
  loginBtn: {
    minHeight: 54,
    borderRadius: radius.md,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginPressed: {
    opacity: 0.92,
  },
  loginDisabled: {
    opacity: 0.55,
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.white,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  orBadge: {
    marginHorizontal: 10,
    minWidth: 36,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 10,
  },
  orText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  footerText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    color: colors.textSecondary,
  },
  link: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: BRAND,
  },
  taglineFooter: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
});
