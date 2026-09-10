import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhoneCountryPicker } from '@/src/components/PhoneCountryPicker';
import { SignupAccountFooter } from '@/src/components/SignupAccountFooter';
import { StepProgress } from '@/src/components/StepProgress';
import { TextField } from '@/src/components/TextField';
import { BrandHeader } from '@/src/features/onboarding/BrandHeader';
import {
  digitsOnly,
  getPhoneCountryById,
  isValidNationalNumber,
  type PhoneCountry,
} from '@/src/constants/phoneCountries';
import { useSignupStore } from '@/src/store/signupStore';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

const signupHero = require('../../../assets/images/Onboarding/loginimg-bg.webp');
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BRAND = '#F57D01';

export default function SignupProfileScreen() {
  const draft = useSignupStore((s) => s.draft);
  const update = useSignupStore((s) => s.update);
  const [countryOpen, setCountryOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const country = useMemo(
    () => getPhoneCountryById(draft.phoneCountryId || 'IN'),
    [draft.phoneCountryId],
  );

  const ensureVisible = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const onPhoneChange = (value: string) => {
    const next = digitsOnly(value).slice(0, country.maxLength);
    update({ phoneNumber: next });
  };

  const onSelectCountry = (next: PhoneCountry) => {
    const trimmed = digitsOnly(draft.phoneNumber).slice(0, next.maxLength);
    update({
      phoneCountryId: next.id,
      phoneCountryCode: next.dialCode,
      phoneNumber: trimmed,
    });
  };

  const onContinue = () => {
    if (!draft.fullName.trim() || !draft.email.trim()) {
      Alert.alert('Missing info', 'Please fill full name and email.');
      return;
    }
    if (!isValidNationalNumber(digitsOnly(draft.phoneNumber), country)) {
      Alert.alert(
        'Invalid phone number',
        `Enter a valid ${country.name} mobile number (${country.maxLength} digits).`,
      );
      return;
    }
    router.push('/(auth)/signup/role');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, 16) },
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
              <BrandHeader showMadeInBharath />
              <Text style={styles.pageTitle}>Sign Up</Text>
              <Text style={styles.pageSub}>Create your account and get started</Text>
            </View>
          </View>

          <View style={styles.body}>
            <StepProgress current={0} card />

            <View style={styles.sectionHead}>
              <View style={styles.sectionIcon}>
                <Ionicons name="person-outline" size={18} color={BRAND} />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={styles.heading}>Let&apos;s start with your profile</Text>
                <Text style={styles.desc}>Tell us a little about yourself.</Text>
              </View>
            </View>

            <TextField
              label="Full Name"
              required
              value={draft.fullName}
              onChangeText={(fullName) => update({ fullName })}
              placeholder="Enter your full name"
              leftAddon={<Ionicons name="person-outline" size={20} color={BRAND} />}
            />

            <TextField
              label="Email Address"
              required
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={draft.email}
              onChangeText={(email) => update({ email })}
              placeholder="you@example.com"
              leftAddon={<Ionicons name="mail-outline" size={20} color={BRAND} />}
              onFocus={ensureVisible}
            />

            <Text style={styles.label}>
              Phone Number <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.phoneBox}>
              <Ionicons name="call-outline" size={20} color={BRAND} style={styles.phoneIcon} />
              <Pressable
                style={styles.country}
                onPress={() => setCountryOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Select country"
              >
                <Text style={styles.flag}>{country.flag}</Text>
                <Text style={styles.dialCode}>{country.dialCode}</Text>
                <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
                <View style={styles.divider} />
              </Pressable>
              <TextInput
                style={styles.phoneInput}
                keyboardType="number-pad"
                maxLength={country.maxLength}
                placeholder={country.placeholder}
                placeholderTextColor={colors.textMuted}
                value={draft.phoneNumber}
                onChangeText={onPhoneChange}
                onFocus={ensureVisible}
              />
            </View>
            <Text style={styles.phoneHint}>
              Enter {country.maxLength}-digit {country.name} mobile number
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={onContinue}
              style={({ pressed }) => [styles.nextBtn, pressed && styles.nextPressed]}
            >
              <View style={styles.nextRow}>
                <Text style={styles.nextText}>Next</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.white} />
              </View>
            </Pressable>

            <SignupAccountFooter />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <PhoneCountryPicker
        visible={countryOpen}
        selectedId={country.id}
        onClose={() => setCountryOpen(false)}
        onSelect={onSelectCountry}
      />
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
  label: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.danger,
  },
  phoneBox: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  phoneIcon: {
    marginRight: 8,
  },
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 8,
  },
  flag: {
    fontSize: 18,
  },
  dialCode: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    color: colors.text,
  },
  divider: {
    width: 1,
    height: 22,
    backgroundColor: colors.border,
    marginLeft: 6,
  },
  phoneInput: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  phoneHint: {
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  nextBtn: {
    marginTop: spacing.md,
    minHeight: 54,
    borderRadius: radius.md,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextPressed: {
    opacity: 0.92,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.white,
  },
});
