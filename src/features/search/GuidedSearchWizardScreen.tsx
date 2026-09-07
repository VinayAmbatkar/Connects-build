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
import { BottomSheet } from '@/src/components/BottomSheet';
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

function ChipGrid({
  options,
  selectedId,
  onSelect,
}: {
  options: CategoryOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.chipGrid}>
      {options.map((opt) => {
        const active = opt.id === selectedId;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onSelect(opt.id)}
            style={[styles.chip, active && styles.chipActive]}
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
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  required?: boolean;
}) {
  return (
    <View style={styles.sectionLabel}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={styles.sectionLabelText}>
        {label}
        {required ? ' *' : ''}
      </Text>
    </View>
  );
}

export function GuidedSearchWizardScreen() {
  const role = useSearchFlowStore((s) => s.role);
  const location = useSearchFlowStore((s) => s.location);
  const projectType = useSearchFlowStore((s) => s.projectType);
  const discipline = useSearchFlowStore((s) => s.discipline);
  const specialization = useSearchFlowStore((s) => s.specialization);
  const setLocation = useSearchFlowStore((s) => s.setLocation);
  const setProjectType = useSearchFlowStore((s) => s.setProjectType);
  const setDiscipline = useSearchFlowStore((s) => s.setDiscipline);
  const setSpecialization = useSearchFlowStore((s) => s.setSpecialization);

  const [locOpen, setLocOpen] = useState(false);

  const roleLabel = getCategoryRoleLabel(role) || 'Connections';
  const disciplines = useMemo(() => getDisciplinesForRole(role), [role]);
  const specializations = useMemo(
    () => getSpecializationsForDiscipline(discipline),
    [discipline],
  );

  useEffect(() => {
    if (!role) {
      router.replace('/(tabs)/connect' as Href);
    }
  }, [role]);

  const locationLabel =
    LOCATION_OPTIONS.find((o) => o.id === location)?.label ?? 'Choose location';

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

        <SectionLabel icon="business-outline" label="Select Your Project Type" />
        <ChipGrid
          options={PROJECT_TYPE_OPTIONS}
          selectedId={projectType}
          onSelect={setProjectType}
        />

        <SectionLabel
          icon="construct-outline"
          label={`Select Type of ${roleLabel}`}
        />
        <ChipGrid
          options={disciplines}
          selectedId={discipline}
          onSelect={(id) => {
            setDiscipline(id);
          }}
        />

        {specializations.length > 0 ? (
          <>
            <SectionLabel icon="layers-outline" label="Select Category" />
            <ChipGrid
              options={specializations}
              selectedId={specialization}
              onSelect={setSpecialization}
            />
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

      <BottomSheet
        visible={locOpen}
        title="Select Location"
        subtitle="Choose where you want to find connections."
        onClose={() => setLocOpen(false)}
        tall
      >
        {LOCATION_OPTIONS.map((opt) => {
          const active = opt.id === location;
          return (
            <Pressable
              key={opt.id}
              style={[styles.modalRow, active && styles.modalRowActive]}
              onPress={() => {
                setLocation(opt.id);
                setLocOpen(false);
              }}
            >
              <Text
                style={[
                  styles.modalRowText,
                  active && styles.modalRowTextActive,
                ]}
              >
                {opt.label}
              </Text>
              {active ? (
                <Ionicons name="checkmark" size={18} color={colors.primary} />
              ) : null}
            </Pressable>
          );
        })}
      </BottomSheet>
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
