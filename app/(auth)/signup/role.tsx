import { useEffect } from 'react';
import {
  Dimensions,
  Image,
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
import { BrandHeader } from '@/src/features/onboarding/BrandHeader';
import { SignupAccountFooter } from '@/src/components/SignupAccountFooter';
import { StepProgress } from '@/src/components/StepProgress';
import { DEFAULT_ROLES, type AppRole } from '@/src/constants/app';
import { useSignupStore } from '@/src/store/signupStore';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

import { appAlert } from '@/src/components/AppDialog';
const signupHero = require('../../../assets/images/Onboarding/loginimg-bg.webp');
const BRAND = '#F57D01';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RoleOption = AppRole;

export default function SignupRoleScreen() {
  const draft = useSignupStore((s) => s.draft);
  const update = useSignupStore((s) => s.update);
  const insets = useSafeAreaInsets();
  const roles: RoleOption[] = DEFAULT_ROLES;

  useEffect(() => {
    if (!draft.role && roles[0]) {
      update({ role: roles[0].value });
    }
  }, [draft.role, roles, update]);

  const continueNext = () => {
    const selected = draft.role || roles[0]?.value;
    if (!selected) {
      appAlert('Select a role', 'Choose the role that best describes you.');
      return;
    }
    if (!draft.role) update({ role: selected });
    router.push('/(auth)/signup/password');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
          <StepProgress current={1} card />

          <View style={styles.sectionHead}>
            <View style={styles.sectionIcon}>
              <Ionicons name="briefcase-outline" size={18} color={BRAND} />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.heading}>Select your role</Text>
              <Text style={styles.desc}>We&apos;ll tailor the experience just for you.</Text>
            </View>
          </View>
        </View>

        <View style={styles.roleList}>
          {roles.map((item) => {
            const selected = (draft.role || roles[0]?.value) === item.value;
            return (
              <Pressable
                key={item.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${item.label}: ${item.description}`}
                onPress={() => update({ role: item.value })}
                style={[styles.roleCard, selected && styles.roleCardSelected]}
              >
                <View style={styles.roleAvatar}>
                  {item.image != null ? (
                    <Image source={item.image} style={styles.roleAvatarImage} resizeMode="contain" />
                  ) : (
                    <Ionicons name={item.icon ?? 'person-outline'} size={28} color={BRAND} />
                  )}
                </View>
                <View style={styles.roleCopy}>
                  <Text style={styles.cardTitle}>{item.label}</Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                </View>
                {selected ? (
                  <View style={styles.selectedCheck}>
                    <Ionicons name="checkmark" size={16} color={colors.white} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

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
              onPress={continueNext}
              style={({ pressed }) => [styles.nextBtn, pressed && styles.pressed]}
            >
              <Text style={styles.nextText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </Pressable>
          </View>

          <SignupAccountFooter />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
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
  roleList: {
    paddingHorizontal: spacing.lg,
    gap: 7,
  },
  roleCard: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  roleCardSelected: {
    borderColor: BRAND,
  },
  roleAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  roleAvatarImage: {
    width: 52,
    height: 52,
  },
  roleCopy: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 17,
    lineHeight: 21,
    color: colors.text,
    marginBottom: 2,
  },
  cardDesc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  selectedCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomGroup: {
    marginTop: 'auto',
    gap: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
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
  nextBtn: {
    flex: 1,
    height: 54,
    borderRadius: radius.full,
    backgroundColor: BRAND,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pressed: {
    opacity: 0.92,
  },
  nextText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.white,
  },
});
