import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DEFAULT_ROLES, type AppRole } from '@/src/constants/app';
import { HOME_ROLE_TO_CATEGORY_ROLE } from '@/src/constants/category';
import { useSearchFlowStore } from '@/src/features/search/searchFlowStore';
import { isConsumerRole } from '@/src/features/profile/profileLocks';
import { DemoTourOverlay } from '@/src/features/tour/DemoTourOverlay';
import { CONSUMER_TOUR_STEPS, type TourRect } from '@/src/features/tour/tourSteps';
import { useAppTour } from '@/src/features/tour/useAppTour';
import { useAuthStore } from '@/src/store/authStore';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

type TourKey = 'roles' | 'steps' | 'search';

type RoleCard = AppRole & {
  tags: string[];
  theme: {
    bg: string;
    tagBg: string;
    tagText: string;
    icon: keyof typeof Ionicons.glyphMap;
  };
};

const ROLE_META: Record<
  string,
  { tags: string[]; theme: RoleCard['theme'] }
> = {
  Consultant: {
    tags: ['Advisory', 'Planning', 'Design'],
    theme: {
      bg: '#EEF6FF',
      tagBg: '#DCEBFF',
      tagText: '#2563EB',
      icon: 'person-outline',
    },
  },
  Builder: {
    tags: ['Construction', 'Development'],
    theme: {
      bg: '#FFF7ED',
      tagBg: '#FFEDD5',
      tagText: '#C2410C',
      icon: 'home-outline',
    },
  },
  Vendor: {
    tags: ['Materials', 'Equipment', 'Supplies'],
    theme: {
      bg: '#FFF4E8',
      tagBg: '#FFE4C7',
      tagText: '#B45309',
      icon: 'storefront-outline',
    },
  },
  Contractor: {
    tags: ['Execution', 'Project Management'],
    theme: {
      bg: '#F0FDF4',
      tagBg: '#DCFCE7',
      tagText: '#15803D',
      icon: 'construct-outline',
    },
  },
};

const ROLE_ORDER = ['Consultant', 'Builder', 'Vendor', 'Contractor'];

const STEPPER = [
  { id: 1, label: 'Select Role' },
  { id: 2, label: 'Location' },
  { id: 3, label: 'Project Type' },
  { id: 4, label: 'Vendor Type' },
] as const;

function toCategoryRole(value: string) {
  return (
    HOME_ROLE_TO_CATEGORY_ROLE[value] ??
    HOME_ROLE_TO_CATEGORY_ROLE[value.toUpperCase()] ??
    `${value.toUpperCase()}S`
  );
}

export function ConnectRolePickerScreen() {
  const currentRole = useSearchFlowStore((s) => s.role);
  const setRole = useSearchFlowStore((s) => s.setRole);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<TextInput>(null);
  const [selected, setSelected] = useState<string>(() => {
    const match = ROLE_ORDER.find(
      (value) => toCategoryRole(value) === currentRole,
    );
    return match ?? 'Vendor';
  });

  // Consumers land here after signup: their own first-run tour.
  const role = useAuthStore((s) => s.user?.role);
  const tour = useAppTour(isConsumerRole(role), CONSUMER_TOUR_STEPS.length);
  const tourRefs = {
    roles: useRef<View>(null),
    steps: useRef<View>(null),
    search: useRef<View>(null),
  };
  const [tourRects, setTourRects] = useState<Partial<Record<TourKey, TourRect>>>({});
  const measureTourTargets = useCallback(() => {
    (Object.keys(tourRefs) as TourKey[]).forEach((key) => {
      tourRefs[key].current?.measureInWindow((x, y, width, height) => {
        setTourRects((prev) => ({ ...prev, [key]: { x, y, width, height } }));
      });
    });
    // Refs are stable; re-measure only when asked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!tour.visible) return;
    // After layout settles (header, safe area).
    const t = setTimeout(measureTourTargets, 250);
    return () => clearTimeout(t);
  }, [tour.visible, tour.step, measureTourTargets]);

  const roles: RoleCard[] = useMemo(() => {
    return ROLE_ORDER.map((value) => {
      const base = DEFAULT_ROLES.find((r) => r.value === value)!;
      const meta = ROLE_META[value];
      return { ...base, ...meta };
    }).filter(Boolean);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((role) => {
      const hay = [role.label, role.description, ...role.tags]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [roles, query]);

  // Tapping a card picks it and moves straight to the next step.
  const chooseRole = (value: string) => {
    setSelected(value);
    setRole(toCategoryRole(value));
    router.push('/connect/wizard' as Href);
  };

  const openSearch = () => {
    setSearchOpen(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          {searchOpen ? (
            <View style={styles.searchExpanded}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                ref={searchRef}
                value={query}
                onChangeText={setQuery}
                placeholder="Search roles..."
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                autoCorrect={false}
                returnKeyType="search"
              />
              <Pressable onPress={closeSearch} hitSlop={8}>
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.title}>
                Find <Text style={styles.titleAccent}>Connections</Text>
              </Text>
              <View ref={tourRefs.search} collapsable={false}>
                <Pressable
                  onPress={openSearch}
                  style={styles.searchIconBtn}
                  hitSlop={8}
                  accessibilityLabel="Search roles"
                >
                  <Ionicons name="search" size={20} color={colors.text} />
                </Pressable>
              </View>
            </>
          )}
        </View>

        <Text style={styles.subtitle}>
          Choose who you want to connect with in the construction industry.
        </Text>

        <View ref={tourRefs.steps} collapsable={false} style={styles.stepper}>
          {STEPPER.map((step, index) => {
            const active = step.id === 1;
            return (
              <View key={step.id} style={styles.stepItem}>
                <View style={styles.stepRow}>
                  <View style={[styles.stepCircle, active && styles.stepCircleActive]}>
                    <Text
                      style={[styles.stepNumber, active && styles.stepNumberActive]}
                    >
                      {step.id}
                    </Text>
                  </View>
                  {index < STEPPER.length - 1 ? (
                    <View style={styles.stepLine} />
                  ) : null}
                </View>
                <Text
                  style={[styles.stepLabel, active && styles.stepLabelActive]}
                  numberOfLines={1}
                >
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.stepOf}>STEP 1 OF 4 · TAP A ROLE TO CONTINUE</Text>

        <View ref={tourRefs.roles} collapsable={false} style={styles.grid}>
          {filtered.map((role) => {
            const isSelected = selected === role.value;
            return (
              <Pressable
                key={role.value}
                onPress={() => chooseRole(role.value)}
                accessibilityRole="button"
                accessibilityLabel={`Find ${role.label}s`}
                style={[
                  styles.card,
                  { backgroundColor: role.theme.bg },
                  isSelected && styles.cardSelected,
                ]}
              >
                {role.image ? (
                  <Image
                    source={role.image}
                    style={styles.roleImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.roleImageFallback}>
                    <Ionicons
                      name="people-outline"
                      size={40}
                      color={role.theme.tagText}
                    />
                  </View>
                )}

                <Text style={styles.cardTitle}>{role.label}</Text>
                <Text style={styles.cardBody} numberOfLines={2}>
                  {role.description}
                </Text>

                <View style={styles.tags}>
                  {role.tags.slice(0, 2).map((tag) => (
                    <View
                      key={tag}
                      style={[styles.tag, { backgroundColor: role.theme.tagBg }]}
                    >
                      <Text style={[styles.tagText, { color: role.theme.tagText }]}>
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <DemoTourOverlay
        steps={CONSUMER_TOUR_STEPS}
        rects={tourRects}
        visible={tour.visible}
        stepIndex={tour.step}
        onNext={tour.next}
        onBack={tour.back}
        onSkip={() => void tour.skip()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 36,
  },
  title: {
    flex: 1,
    fontFamily: typography.fontFamily.bold,
    fontSize: 24,
    color: colors.text,
  },
  titleAccent: {
    color: colors.primary,
  },
  searchIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchExpanded: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.text,
    paddingVertical: 8,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: spacing.md,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    lineHeight: 18,
    color: colors.textSecondary,
    maxWidth: '95%',
  },
  stepper: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  stepItem: {
    flex: 1,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  stepNumber: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 11,
    color: colors.textMuted,
  },
  stepNumberActive: {
    color: colors.white,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
    backgroundColor: colors.border,
  },
  stepLabel: {
    marginTop: 4,
    fontFamily: typography.fontFamily.medium,
    fontSize: 9,
    color: colors.textMuted,
  },
  stepLabelActive: {
    color: colors.primary,
    fontFamily: typography.fontFamily.semibold,
  },
  stepOf: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    width: '47%',
    flexGrow: 1,
    minWidth: 140,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 4,
  },
  cardSelected: {
    borderColor: colors.primary,
  },
  roleImage: {
    width: '100%',
    height: 104,
    marginBottom: 4,
  },
  roleImageFallback: {
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  cardBody: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSecondary,
    minHeight: 28,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  tagText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 9,
  },
});
