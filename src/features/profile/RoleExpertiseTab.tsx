import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExpertiseEditorSheet } from '@/src/features/profile/ExpertiseEditorSheet';
import {
  DisciplineTabs,
  ExpertiseChip,
  SectionActions,
} from '@/src/features/profile/expertiseUi';
import {
  filterSpecializationsByDiscipline,
  getSelectedOptions,
  getSelectedSpecializationsForDiscipline,
  isIdSelected,
  normalizeOptions,
  optionIdsMatch,
  removeIdByMatch,
  specializationsAreDisciplineLinked,
  toggleId,
} from '@/src/features/profile/profileOptions';
import type { ProfessionalProfile, ProfileOptions } from '@/src/types/api';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

type Props = {
  form: ProfessionalProfile;
  options?: ProfileOptions;
  onChange: (next: ProfessionalProfile) => void;
};

export function RoleExpertiseTab({ form, options, onChange }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeDisciplineId, setActiveDisciplineId] = useState<string | null>(null);

  const allDisciplines = normalizeOptions(options?.disciplines);
  const allSpecializations = normalizeOptions(options?.specializations);
  const allProjectTypes = normalizeOptions(options?.projectTypes);
  const disciplineLinked = specializationsAreDisciplineLinked(allSpecializations);

  const selectedDisciplines = getSelectedOptions(allDisciplines, form.disciplineIds ?? []);
  const selectedProjectTypes = getSelectedOptions(allProjectTypes, form.projectTypeIds ?? []);

  const hasExpertise =
    selectedDisciplines.length > 0 ||
    (form.specializationIds?.length ?? 0) > 0 ||
    selectedProjectTypes.length > 0;

  const activeDiscipline =
    selectedDisciplines.find((item) => optionIdsMatch(item.id, activeDisciplineId ?? '')) ??
    selectedDisciplines[0] ??
    null;

  useEffect(() => {
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
  }, [selectedDisciplines, activeDisciplineId]);

  const activeSpecializations = useMemo(() => {
    if (!activeDiscipline) return [];
    return getSelectedSpecializationsForDiscipline(
      allSpecializations,
      activeDiscipline.id,
      form.specializationIds ?? [],
    );
  }, [activeDiscipline, allSpecializations, form.specializationIds]);

  const removeSpecialization = (specializationId: string) => {
    onChange({
      ...form,
      specializationIds: removeIdByMatch(form.specializationIds ?? [], specializationId),
    });
  };

  const removeProjectType = (projectTypeId: string) => {
    onChange({
      ...form,
      projectTypeIds: toggleId(form.projectTypeIds ?? [], projectTypeId),
    });
  };

  const selectAllForActiveDiscipline = () => {
    if (!activeDiscipline) return;
    const scoped = filterSpecializationsByDiscipline(
      allSpecializations,
      activeDiscipline.id,
    );
    const merged = new Set([
      ...(form.specializationIds ?? []),
      ...scoped.map((item) => item.id),
    ]);
    onChange({ ...form, specializationIds: [...merged] });
  };

  const clearForActiveDiscipline = () => {
    if (!activeDiscipline) return;
    const scoped = filterSpecializationsByDiscipline(
      allSpecializations,
      activeDiscipline.id,
    );
    onChange({
      ...form,
      specializationIds: (form.specializationIds ?? []).filter(
        (id) => !scoped.some((item) => isIdSelected([id], item.id)),
      ),
    });
  };

  return (
    <View>
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Role & Expertise</Text>
        <Text style={styles.sectionSubtitle}>
          Tell us what you do and where you specialize
        </Text>
      </View>

      {hasExpertise ? (
        <View style={styles.summaryWrap}>
          {selectedDisciplines.length ? (
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <View>
                  <Text style={styles.panelTitle}>Specialization</Text>
                  <Text style={styles.panelHint}>Based on selected discipline</Text>
                </View>
                <SectionActions
                  onSelectAll={selectAllForActiveDiscipline}
                  onClear={clearForActiveDiscipline}
                />
              </View>

              <DisciplineTabs
                disciplines={selectedDisciplines}
                activeId={activeDiscipline?.id ?? null}
                specializationIds={form.specializationIds ?? []}
                allSpecializations={allSpecializations}
                disciplineLinked={disciplineLinked}
                onChange={setActiveDisciplineId}
              />

              {activeDiscipline ? (
                <>
                  <Text style={styles.focusHint}>
                    Select specialization for{' '}
                    <Text style={styles.focusBold}>{activeDiscipline.label}</Text>
                  </Text>

                  {activeSpecializations.length ? (
                    <View style={styles.chipRow}>
                      {activeSpecializations.map((item) => (
                        <ExpertiseChip
                          key={item.id}
                          label={item.label}
                          onRemove={() => removeSpecialization(item.id)}
                        />
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.emptyLine}>
                      No specializations added for {activeDiscipline.label.toLowerCase()} yet.
                    </Text>
                  )}
                </>
              ) : null}
            </View>
          ) : null}

          {selectedProjectTypes.length ? (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Project Types</Text>
              <View style={[styles.chipRow, { marginTop: spacing.sm }]}>
                {selectedProjectTypes.map((item) => (
                  <ExpertiseChip
                    key={item.id}
                    label={item.label}
                    onRemove={() => removeProjectType(item.id)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <Pressable style={styles.editBtn} onPress={() => setSheetOpen(true)}>
            <Ionicons name="create-outline" size={18} color={colors.primary} />
            <Text style={styles.editBtnText}>Edit expertise</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.addCard} onPress={() => setSheetOpen(true)}>
          <View style={styles.addIconWrap}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </View>
          <Text style={styles.addTitle}>Add discipline & expertise</Text>
          <Text style={styles.addHint}>
            Pick disciplines, then choose specializations and project types in one place.
          </Text>
        </Pressable>
      )}

      <ExpertiseEditorSheet
        visible={sheetOpen}
        form={form}
        options={options}
        initialDisciplineId={activeDiscipline?.id ?? activeDisciplineId}
        onChange={onChange}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeading: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.text,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  summaryWrap: {
    gap: spacing.sm,
  },
  panel: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  panelTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  panelHint: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  focusHint: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  focusBold: {
    fontFamily: typography.fontFamily.bold,
    color: colors.text,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emptyLine: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textMuted,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.sm,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  editBtnText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.primary,
  },
  addCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: '#FFFAF5',
  },
  addIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  addTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
    marginBottom: 4,
  },
  addHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
