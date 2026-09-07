import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@/src/components/BottomSheet';
import { PROJECT_TYPE_OPTIONS } from '@/src/constants/category';
import { DisciplineTabs, SectionActions } from '@/src/features/profile/expertiseUi';
import {
  filterDisciplinesByRole,
  filterSpecializationsByDiscipline,
  getSelectedOptions,
  isIdSelected,
  normalizeOptions,
  optionIdsMatch,
  pruneSpecializationsForDisciplines,
  removeIdByMatch,
  resolveOptionLabel,
  toggleId,
  type ProfileOption,
} from '@/src/features/profile/profileOptions';
import type { ProfessionalProfile, ProfileOptions } from '@/src/types/api';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

type Props = {
  visible: boolean;
  form: ProfessionalProfile;
  options?: ProfileOptions;
  /** Keep the same discipline tab open as the main screen. */
  initialDisciplineId?: string | null;
  onChange: (next: ProfessionalProfile) => void;
  onClose: () => void;
};

function GridTile({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.gridTile, active && styles.gridTileActive]}
    >
      <View style={[styles.tileCheckbox, active && styles.tileCheckboxActive]}>
        {active ? <Ionicons name="checkmark" size={12} color={colors.white} /> : null}
      </View>
      <Text style={[styles.tileLabel, active && styles.tileLabelActive]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

function mergeProjectTypes(apiOptions: ProfileOption[]): ProfileOption[] {
  if (PROJECT_TYPE_OPTIONS.length) {
    return PROJECT_TYPE_OPTIONS.map((item) => {
      const apiMatch = apiOptions.find((o) => optionIdsMatch(o.id, item.id));
      return { id: item.id, label: apiMatch?.label ?? item.label };
    });
  }
  return apiOptions;
}

export function ExpertiseEditorSheet({
  visible,
  form,
  options,
  initialDisciplineId,
  onChange,
  onClose,
}: Props) {
  const roleOptions = normalizeOptions(options?.roles);
  const apiDisciplines = normalizeOptions(options?.disciplines);
  const apiSpecializations = normalizeOptions(options?.specializations);
  const projectTypes = useMemo(
    () => mergeProjectTypes(normalizeOptions(options?.projectTypes)),
    [options?.projectTypes],
  );

  const availableDisciplines = useMemo(
    () => filterDisciplinesByRole(apiDisciplines, form.role),
    [apiDisciplines, form.role],
  );

  const selectedDisciplines = useMemo(
    () => getSelectedOptions(availableDisciplines, form.disciplineIds ?? []),
    [availableDisciplines, form.disciplineIds],
  );

  const [activeDisciplineId, setActiveDisciplineId] = useState<string | null>(null);

  // Only seed the active tab when the sheet opens — do not reset on every form edit.
  useEffect(() => {
    if (!visible) return;

    const preferred =
      initialDisciplineId ??
      form.disciplineIds?.[0] ??
      availableDisciplines[0]?.id ??
      null;

    setActiveDisciplineId(preferred);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // If active discipline was deselected, fall back to another selected one.
  useEffect(() => {
    if (!visible) return;
    if (!selectedDisciplines.length) {
      setActiveDisciplineId(null);
      return;
    }
    if (
      !activeDisciplineId ||
      !selectedDisciplines.some((item) => optionIdsMatch(item.id, activeDisciplineId))
    ) {
      setActiveDisciplineId(selectedDisciplines[0].id);
    }
  }, [visible, selectedDisciplines, activeDisciplineId]);

  const activeDiscipline =
    selectedDisciplines.find((item) => optionIdsMatch(item.id, activeDisciplineId ?? '')) ??
    selectedDisciplines[0] ??
    null;

  // Specializations for the focused discipline only (category map).
  const activeSpecializations = useMemo(() => {
    if (!activeDiscipline) return [];
    return filterSpecializationsByDiscipline(apiSpecializations, activeDiscipline.id);
  }, [activeDiscipline, apiSpecializations]);

  const selectedRoleLabel =
    resolveOptionLabel(roleOptions, form.role) ?? form.role ?? 'your role';

  const focusDiscipline = (disciplineId: string) => {
    setActiveDisciplineId(disciplineId);
  };

  const toggleDiscipline = (disciplineId: string) => {
    const isSelected = isIdSelected(form.disciplineIds ?? [], disciplineId);

    // Already selected → just focus so specializations switch (like web selectSub1).
    if (isSelected) {
      if (activeDiscipline && optionIdsMatch(activeDiscipline.id, disciplineId)) {
        // Second tap on the focused chip → deselect
        const nextDisciplines = removeIdByMatch(form.disciplineIds ?? [], disciplineId);
        onChange({
          ...form,
          disciplineIds: nextDisciplines,
          specializationIds: pruneSpecializationsForDisciplines(
            form.specializationIds ?? [],
            apiSpecializations,
            nextDisciplines,
          ),
        });
        return;
      }
      focusDiscipline(disciplineId);
      return;
    }

    // Newly selected → select + focus
    const nextDisciplines = [...(form.disciplineIds ?? []), disciplineId];
    focusDiscipline(disciplineId);
    onChange({ ...form, disciplineIds: nextDisciplines });
  };

  const toggleSpecialization = (specializationId: string) => {
    onChange({
      ...form,
      specializationIds: toggleId(form.specializationIds ?? [], specializationId),
    });
  };

  const toggleProjectType = (projectTypeId: string) => {
    onChange({
      ...form,
      projectTypeIds: toggleId(form.projectTypeIds ?? [], projectTypeId),
    });
  };

  const selectAllSpecs = () => {
    const merged = new Set([
      ...(form.specializationIds ?? []),
      ...activeSpecializations.map((item) => item.id),
    ]);
    onChange({ ...form, specializationIds: [...merged] });
  };

  const clearSpecs = () => {
    if (!activeDiscipline) return;
    onChange({
      ...form,
      specializationIds: (form.specializationIds ?? []).filter(
        (id) => !activeSpecializations.some((item) => isIdSelected([id], item.id)),
      ),
    });
  };

  const selectAllProjectTypes = () => {
    onChange({ ...form, projectTypeIds: projectTypes.map((item) => item.id) });
  };

  const clearProjectTypes = () => {
    onChange({ ...form, projectTypeIds: [] });
  };

  const hasDisciplines = selectedDisciplines.length > 0;

  return (
    <BottomSheet
      visible={visible}
      title="Role & Expertise"
      subtitle={`Options for ${selectedRoleLabel}`}
      onClose={onClose}
      tall
      footer={
        <Pressable style={styles.doneBtn} onPress={onClose}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      }
    >
      <View style={styles.sheetSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionNumber}>2.</Text>
          <Text style={styles.sectionTitle}>
            Discipline<Text style={styles.required}> *</Text>
          </Text>
        </View>
        <Text style={styles.sectionHint}>
          Tap a discipline to focus it — specializations update below. Tap again to remove.
        </Text>

        <View style={styles.disciplineGrid}>
          {availableDisciplines.map((discipline) => {
            const selected = isIdSelected(form.disciplineIds ?? [], discipline.id);
            const focused =
              selected &&
              activeDiscipline != null &&
              optionIdsMatch(activeDiscipline.id, discipline.id);
            return (
              <Pressable
                key={discipline.id}
                onPress={() => toggleDiscipline(discipline.id)}
                style={[
                  styles.disciplineChip,
                  selected && styles.disciplineChipActive,
                  focused && styles.disciplineChipFocused,
                ]}
              >
                <Text
                  style={[
                    styles.disciplineChipText,
                    selected && styles.disciplineChipTextActive,
                  ]}
                >
                  {discipline.label}
                </Text>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {hasDisciplines ? (
        <>
          <View style={styles.sheetSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionNumber}>3.</Text>
                <View>
                  <Text style={styles.sectionTitle}>Specialization</Text>
                  <Text style={styles.sectionHint}>Based on selected discipline</Text>
                </View>
              </View>
              <SectionActions onSelectAll={selectAllSpecs} onClear={clearSpecs} />
            </View>

            <DisciplineTabs
              disciplines={selectedDisciplines}
              activeId={activeDiscipline?.id ?? null}
              specializationIds={form.specializationIds ?? []}
              allSpecializations={apiSpecializations}
              disciplineLinked
              onChange={focusDiscipline}
            />

            {activeDiscipline ? (
              <>
                <Text style={styles.focusHint}>
                  Select specialization for{' '}
                  <Text style={styles.focusBold}>{activeDiscipline.label}</Text>
                </Text>

                {activeSpecializations.length ? (
                  <View style={styles.optionGrid}>
                    {activeSpecializations.map((option) => {
                      const active = isIdSelected(form.specializationIds ?? [], option.id);
                      return (
                        <GridTile
                          key={option.id}
                          label={option.label}
                          active={active}
                          onPress={() => toggleSpecialization(option.id)}
                        />
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.emptyHint}>
                    No specialization options for {activeDiscipline.label} yet.
                  </Text>
                )}
              </>
            ) : null}
          </View>

          <View style={styles.sheetSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionNumber}>4.</Text>
                <Text style={styles.sectionTitle}>
                  Project Types<Text style={styles.required}> *</Text>
                </Text>
              </View>
              <SectionActions
                onSelectAll={selectAllProjectTypes}
                onClear={clearProjectTypes}
              />
            </View>

            {projectTypes.length ? (
              <View style={styles.optionGrid}>
                {projectTypes.map((option) => {
                  const active = isIdSelected(form.projectTypeIds ?? [], option.id);
                  return (
                    <GridTile
                      key={option.id}
                      label={option.label}
                      active={active}
                      onPress={() => toggleProjectType(option.id)}
                    />
                  );
                })}
              </View>
            ) : (
              <Text style={styles.emptyHint}>No project types available.</Text>
            )}
          </View>
        </>
      ) : (
        <View style={styles.lockedBox}>
          <Text style={styles.lockedTitle}>Specialization & Project Types</Text>
          <Text style={styles.lockedHint}>
            Select a discipline above to view specializations and project types.
          </Text>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetSection: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    flex: 1,
  },
  sectionNumber: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  sectionHint: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  required: {
    color: colors.danger,
  },
  disciplineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.sm,
  },
  disciplineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  disciplineChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  disciplineChipFocused: {
    borderWidth: 2,
    borderColor: colors.primaryDark,
  },
  disciplineChipText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  disciplineChipTextActive: {
    color: colors.primaryDark,
    fontFamily: typography.fontFamily.semibold,
  },
  focusHint: {
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  focusBold: {
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridTile: {
    width: '31%',
    minHeight: 72,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    gap: 6,
  },
  gridTileActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFFAF5',
  },
  tileCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  tileCheckboxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  tileLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 11,
    lineHeight: 15,
    color: colors.text,
  },
  tileLabelActive: {
    color: colors.primaryDark,
  },
  emptyHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 20,
    color: colors.textMuted,
  },
  lockedBox: {
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  lockedTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  lockedHint: {
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 20,
    color: colors.textMuted,
  },
  doneBtn: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.white,
  },
});
