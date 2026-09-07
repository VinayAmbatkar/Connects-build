import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
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

const signupHero = require('../../../assets/images/Onboarding/loginimg-bg.png');
const BRAND = '#F57D01';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.72, 280);
const CARD_GAP = 16;
const SIDE_PAD = (SCREEN_WIDTH - CARD_WIDTH) / 2;

type RoleOption = AppRole;

export default function SignupRoleScreen() {
  const draft = useSignupStore((s) => s.draft);
  const update = useSignupStore((s) => s.update);
  const listRef = useRef<FlatList<RoleOption>>(null);
  const [index, setIndex] = useState(0);
  const insets = useSafeAreaInsets();
  const roles: RoleOption[] = DEFAULT_ROLES;

  useEffect(() => {
    if (!draft.role && roles[0]) {
      update({ role: roles[0].value });
      setIndex(0);
      return;
    }
    if (draft.role) {
      const i = roles.findIndex((r) => r.value === draft.role);
      if (i >= 0) setIndex(i);
    }
  }, [draft.role, roles, update]);

  const selectRole = (value: string, i: number) => {
    update({ role: value });
    setIndex(i);
    listRef.current?.scrollToOffset({
      offset: i * (CARD_WIDTH + CARD_GAP),
      animated: true,
    });
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP));
    const clamped = Math.max(0, Math.min(next, roles.length - 1));
    setIndex(clamped);
    const role = roles[clamped];
    if (role) update({ role: role.value });
  };

  const continueNext = () => {
    const selected = draft.role || roles[index]?.value;
    if (!selected) {
      Alert.alert('Select a role', 'Choose the role that best describes you.');
      return;
    }
    if (!draft.role) update({ role: selected });
    router.push('/(auth)/signup/password');
  };

  const renderItem = ({ item, index: i }: ListRenderItemInfo<RoleOption>) => {
    const selected = (draft.role || roles[index]?.value) === item.value;
    return (
      <Pressable
        onPress={() => selectRole(item.value, i)}
        style={[styles.card, selected && styles.cardSelected, { width: CARD_WIDTH }]}
      >
        <View style={styles.artWrap}>
          {item.image != null ? (
            <Image source={item.image} style={styles.artImage} resizeMode="contain" />
          ) : (
            <View style={styles.artFallback}>
              <Ionicons name={item.icon ?? 'person-outline'} size={64} color={BRAND} />
            </View>
          )}
        </View>
        <Text style={styles.cardTitle}>{item.label}</Text>
        <Text style={styles.cardDesc}>{item.description}</Text>
      </Pressable>
    );
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
            <Text style={styles.pageSub}>Create your account and get started</Text>
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

        <FlatList
          ref={listRef}
          data={roles}
          keyExtractor={(item) => item.value}
          horizontal
          scrollEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + CARD_GAP}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: SIDE_PAD }}
          ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
          onMomentumScrollEnd={onScrollEnd}
          renderItem={renderItem}
          onScrollToIndexFailed={() => undefined}
          style={styles.carousel}
        />

        <View style={styles.dots}>
          {roles.map((role, i) => (
            <View key={role.value} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

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

        <View style={styles.accountFooter}>
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
  carousel: {
    flexGrow: 0,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    minHeight: 320,
  },
  cardSelected: {
    borderColor: BRAND,
  },
  artWrap: {
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  artImage: {
    width: CARD_WIDTH - 48,
    height: 190,
  },
  artFallback: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFEAD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
    color: colors.text,
    marginBottom: 6,
  },
  cardDesc: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 22,
    backgroundColor: BRAND,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountFooter: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
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
