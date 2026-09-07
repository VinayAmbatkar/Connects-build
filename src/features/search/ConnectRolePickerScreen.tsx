import { useMemo, useRef, useState } from 'react';
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
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

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

  const continueNext = () => {
    if (!selected) return;
    setRole(toCategoryRole(selected));
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
              <Pressable
                onPress={openSearch}
                style={styles.searchIconBtn}
                hitSlop={8}
                accessibilityLabel="Search roles"
              >
                <Ionicons name="search" size={20} color={colors.text} />
              </Pressable>
            </>
          )}
        </View>

        <Text style={styles.subtitle}>
          Choose who you want to connect with in the construction industry.
        </Text>

        <View style={styles.stepper}>
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

        <Text style={styles.stepOf}>STEP 1 OF 4</Text>

        <View style={styles.grid}>
          {filtered.map((role) => {
            const isSelected = selected === role.value;
            return (
              <Pressable
                key={role.value}
                onPress={() => setSelected(role.value)}
                style={[
                  styles.card,
                  { backgroundColor: role.theme.bg },
                  isSelected && styles.cardSelected,
                ]}
              >
                <View style={styles.cardTop}>
                  <View
                    style={[
                      styles.cardIcon,
                      { backgroundColor: role.theme.tagBg },
                    ]}
                  >
                    <Ionicons
                      name={role.theme.icon}
                      size={14}
                      color={role.theme.tagText}
                    />
                  </View>
                  <View
                    style={[
                      styles.radio,
                      isSelected && styles.radioSelected,
                    ]}
                  >
                    {isSelected ? (
                      <Ionicons name="checkmark" size={12} color={colors.white} />
                    ) : null}
                  </View>
                </View>

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
                      size={28}
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

      <View style={styles.footer}>
        <Pressable
          style={[styles.continueBtn, !selected && styles.continueDisabled]}
          disabled={!selected}
          onPress={continueNext}
        >
          <Text style={styles.continueText}>Continue</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.white} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
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
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  roleImage: {
    width: '100%',
    height: 56,
    marginTop: 0,
  },
  roleImageFallback: {
    height: 56,
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
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  continueBtn: {
    minHeight: 46,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueDisabled: {
    opacity: 0.45,
  },
  continueText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: colors.white,
  },
});
