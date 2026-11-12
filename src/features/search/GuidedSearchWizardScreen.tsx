import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocationAutocomplete } from '@/src/components/LocationAutocomplete';
import {
  LOCATION_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  getCategoryRoleLabel,
  getDisciplinesForRole,
  getSpecializationsForDiscipline,
  type CategoryOption,
} from '@/src/constants/category';
import { useSearchFlowStore } from '@/src/features/search/searchFlowStore';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

/** Multi-select chips: tap to add, tap again to remove. */
function ChipGrid({
  options,
  selected,
  onToggle,
}: {
  options: CategoryOption[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <View style={styles.chipGrid}>
      {options.map((opt) => {
        const active = selected.includes(opt.id);
        return (
          <Pressable
            key={opt.id}
            onPress={() => onToggle(opt.id)}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
          >
            <Text
              style={[styles.chipText, active && styles.chipTextActive]}
              numberOfLines={2}
            >
              {opt.label}
            </Text>
            {active ? (
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function SectionLabel({
  icon,
  label,
  required,
  hint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <View style={styles.sectionLabel}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={styles.sectionLabelText}>
        {label}
        {required ? ' *' : ''}
      </Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
    </View>
  );
}

export function GuidedSearchWizardScreen() {
  const role = useSearchFlowStore((s) => s.role);
  const location = useSearchFlowStore((s) => s.location);
  const projectTypes = useSearchFlowStore((s) => s.projectTypes);
  const selectedDisciplines = useSearchFlowStore((s) => s.disciplines);
  const selectedSpecializations = useSearchFlowStore((s) => s.specializations);
  const setLocation = useSearchFlowStore((s) => s.setLocation);
  const toggleProjectType = useSearchFlowStore((s) => s.toggleProjectType);
  const toggleDiscipline = useSearchFlowStore((s) => s.toggleDiscipline);
  const toggleSpecialization = useSearchFlowStore((s) => s.toggleSpecialization);

  const [locOpen, setLocOpen] = useState(false);
  const [locValue, setLocValue] = useState(location || '');

  const roleLabel = getCategoryRoleLabel(role) || 'Connections';
  const disciplines = useMemo(() => getDisciplinesForRole(role), [role]);
  // One category group per selected type that has categories, in the
  // order the types are listed.
  const categoryGroups = useMemo(
    () =>
      disciplines
        .filter((d) => selectedDisciplines.includes(d.id))
        .map((d) => ({ discipline: d, options: getSpecializationsForDiscipline(d.id) }))
        .filter((g) => g.options.length > 0),
    [disciplines, selectedDisciplines],
  );

  useEffect(() => {
    if (!role) {
      router.replace('/(tabs)/connect' as Href);
    }
  }, [role]);

  const locationLabel =
    LOCATION_OPTIONS.find((o) => o.id === location)?.label ??
    (location || 'Choose location');

  const canApply = Boolean(location);

  const onApply = () => {
    if (!canApply) return;
    router.push('/connect/results' as Href);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.iconBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroRow}>
          <View style={styles.heroCopy}>
            <Text style={styles.title}>Find {roleLabel}</Text>
            <Text style={styles.subtitle}>
              Set your preferences to find the right {roleLabel.toLowerCase()} for
              your project.
            </Text>
          </View>
          <View style={styles.heroArt}>
            <Ionicons name="business-outline" size={36} color={colors.primary} />
            <Ionicons
              name="construct-outline"
              size={22}
              color="#93C5FD"
              style={styles.heroArtIcon}
            />
          </View>
        </View>

        <SectionLabel icon="location-outline" label="Select Location" required />
        <Pressable style={styles.dropdown} onPress={() => setLocOpen(true)}>
          <Text
            style={[
              styles.dropdownText,
              !location && styles.dropdownPlaceholder,
            ]}
            numberOfLines={1}
          >
            {locationLabel}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </Pressable>

        <SectionLabel icon="business-outline" label="Select Your Project Type" hint="Select one or more" />
        <ChipGrid options={PROJECT_TYPE_OPTIONS} selected={projectTypes} onToggle={toggleProjectType} />

        <SectionLabel icon="construct-outline" label={`Select Type of ${roleLabel}`} hint="Select one or more" />
        <ChipGrid options={disciplines} selected={selectedDisciplines} onToggle={toggleDiscipline} />

        {categoryGroups.length > 0 ? (
          <>
            <SectionLabel icon="layers-outline" label="Select Category" hint="Optional · one or more" />
            {categoryGroups.map((g) => (
              <View key={g.discipline.id} style={styles.group}>
                {categoryGroups.length > 1 ? <Text style={styles.groupTitle}>{g.discipline.label}</Text> : null}
                <ChipGrid options={g.options} selected={selectedSpecializations} onToggle={toggleSpecialization} />
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.applyBtn, !canApply && styles.applyDisabled]}
          disabled={!canApply}
          onPress={onApply}
        >
          <Text style={styles.applyText}>Apply</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.white} />
        </Pressable>
      </View>

      <LocationAutocomplete
        visible={locOpen}
        initialValue={locValue}
        onClose={() => {
          setLocOpen(false);
          setLocValue(location || '');
        }}
        onSelect={(result) => {
          // Keep the place ID: the backend matches it exactly (and searches
          // nearby) instead of guessing from the text.
          setLocation(result.name || result.formattedAddress || '', result.placeId || '');
          setLocOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  topBar: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: spacing.lg,
  },
  heroCopy: { flex: 1 },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 26,
    color: colors.text,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  heroArt: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#EEF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroArtIcon: {
    position: 'absolute',
    right: 8,
    bottom: 8,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    marginTop: spacing.md,
  },
  sectionLabelText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  sectionHint: {
    marginLeft: 'auto',
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  group: { marginBottom: spacing.sm },
  groupTitle: {
    marginBottom: 6,
    fontFamily: typography.fontFamily.semibold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  dropdownText: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  dropdownPlaceholder: {
    color: colors.textMuted,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  chipText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.text,
  },
  chipTextActive: {
    color: colors.primaryDark,
    fontFamily: typography.fontFamily.semibold,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  applyBtn: {
    minHeight: 50,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  applyDisabled: {
    opacity: 0.45,
  },
  applyText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.white,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalRowActive: {
    backgroundColor: colors.primaryMuted,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  modalRowText: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  modalRowTextActive: {
    color: colors.primaryDark,
    fontFamily: typography.fontFamily.semibold,
  },
});
