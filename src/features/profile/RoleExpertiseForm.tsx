import { TabStrip } from '@/src/components/TabStrip';
import {
    isIdSelected,
    normalizeOptions,
    resolveOptionLabel,
    toggleId,
    type ProfileOption,
} from '@/src/features/profile/profileOptions';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';
import type { ProfessionalProfile, ProfileOptions } from '@/src/types/api';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const EXPERTISE_TABS = ['Discipline', 'Specialization', 'Project Types'] as const;
type ExpertiseTab = (typeof EXPERTISE_TABS)[number];

type Props = {
  form: ProfessionalProfile;
  options?: ProfileOptions;
  onChange: (next: ProfessionalProfile) => void;
  variant?: 'full' | 'skills';
};

type MultiGroupProps = {
  title: string;
  required?: boolean;
  options: ProfileOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  emptyHint?: string;
};

export function MultiSelectGroup({
  title,
  required,
  options,
  selected,
  onChange,
  emptyHint,
}: MultiGroupProps) {
  const selectAll = () => onChange(options.map((option) => option.id));
  const clearAll = () => onChange([]);

  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>
          {title}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
        <View style={styles.groupActions}>
          <Pressable onPress={selectAll} hitSlop={6}>
            <Text style={styles.actionText}>Select all</Text>
          </Pressable>
          <Text style={styles.dot}>·</Text>
          <Pressable onPress={clearAll} hitSlop={6}>
            <Text style={styles.actionText}>Clear</Text>
          </Pressable>
        </View>
      </View>

      {options.length ? (
        <View style={styles.optionList}>
          {options.map((option) => {
            const active = isIdSelected(selected, option.id);
            return (
              <Pressable
                key={option.id}
                onPress={() => onChange(toggleId(selected, option.id))}
                style={[styles.optionRow, active && styles.optionRowActive]}
              >
                <View style={[styles.checkbox, active && styles.checkboxActive]}>
                  {active ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
                </View>
                <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                  {option.label}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={styles.emptyHint}>{emptyHint ?? 'No options available.'}</Text>
      )}
    </View>
  );
}

export function RoleExpertiseForm({ form, options, onChange, variant = 'full' }: Props) {
  const [expertiseTab, setExpertiseTab] = useState<ExpertiseTab>('Discipline');

  const roleOptions = normalizeOptions(options?.roles);
  const disciplineOptions = normalizeOptions(options?.disciplines);
  const specializationOptions = normalizeOptions(options?.specializations);
  const projectTypeOptions = normalizeOptions(options?.projectTypes);

  const selectedRole = String(form.role ?? '');
  const selectedRoleLabel = resolveOptionLabel(roleOptions, selectedRole) ?? selectedRole;
  const hasDiscipline = Boolean(form.disciplineIds?.length);

  const setRole = (role: string) => onChange({ ...form, role });
  const setDisciplines = (disciplineIds: string[]) => onChange({ ...form, disciplineIds });
  const setSpecializations = (specializationIds: string[]) =>
    onChange({ ...form, specializationIds });
  const setProjectTypes = (projectTypeIds: string[]) => onChange({ ...form, projectTypeIds });

  if (variant === 'skills') {
    return (
      <View>
        <Text style={styles.sectionTitle}>Skills</Text>
        <Text style={styles.skillsHint}>
          Add disciplines, specializations, and project types you want to be known for. They&apos;ll
          appear on your profile.
        </Text>

        <TabStrip
          tabs={[...EXPERTISE_TABS]}
          active={expertiseTab}
          onChange={(tab) => setExpertiseTab(tab as ExpertiseTab)}
        />

        {expertiseTab === 'Discipline' ? (
          <MultiSelectGroup
            title="Discipline"
            required
            options={disciplineOptions}
            selected={form.disciplineIds ?? []}
            onChange={setDisciplines}
          />
        ) : null}

        {expertiseTab === 'Specialization' ? (
          hasDiscipline ? (
            <MultiSelectGroup
              title="Specialization"
              options={specializationOptions}
              selected={form.specializationIds ?? []}
              onChange={setSpecializations}
            />
          ) : (
            <View style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>Specialization</Text>
              </View>
              <Text style={styles.emptyHint}>
                Please select a discipline to view specialization options.
              </Text>
            </View>
          )
        ) : null}

        {expertiseTab === 'Project Types' ? (
          <MultiSelectGroup
            title="Project Types"
            options={projectTypeOptions}
            selected={form.projectTypeIds ?? []}
            onChange={setProjectTypes}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.heading}>Role & Expertise</Text>
      <Text style={styles.subheading}>Tell us what you do and where you specialize.</Text>
      <Text style={styles.requiredHint}>* indicates required field</Text>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>
          Role<Text style={styles.required}> *</Text>
        </Text>
        <Text style={styles.fieldHint}>What best describes what you do?</Text>

        {selectedRole ? (
          <View style={styles.roleTrail}>
            <Text style={styles.roleTrailText}>{selectedRoleLabel}</Text>
          </View>
        ) : null}

        <View style={styles.optionList}>
          {roleOptions.map((option) => {
            const active = selectedRole === option.id || selectedRole === option.label;
            return (
              <Pressable
                key={option.id}
                onPress={() => setRole(option.id)}
                style={[styles.optionRow, active && styles.optionRowActive]}
              >
                <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                  {option.label}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={active ? colors.primary : colors.textMuted}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      <MultiSelectGroup
        title="Discipline"
        required
        options={disciplineOptions}
        selected={form.disciplineIds ?? []}
        onChange={setDisciplines}
      />

      {hasDiscipline ? (
        <MultiSelectGroup
          title="Specialization"
          options={specializationOptions}
          selected={form.specializationIds ?? []}
          onChange={setSpecializations}
        />
      ) : (
        <View style={styles.group}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupTitle}>Specialization</Text>
          </View>
          <Text style={styles.emptyHint}>
            Please select a discipline to view specialization options.
          </Text>
        </View>
      )}

      <MultiSelectGroup
        title="Project Types"
        options={projectTypeOptions}
        selected={form.projectTypeIds ?? []}
        onChange={setProjectTypes}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subheading: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  skillsHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  requiredHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  group: {
    marginBottom: spacing.lg,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  groupTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  required: {
    color: colors.danger,
  },
  groupActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.primary,
  },
  dot: {
    color: colors.textMuted,
  },
  fieldHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  roleTrail: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.sm,
  },
  roleTrailText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  optionList: {
    gap: spacing.xs,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  optionRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  checkboxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionLabel: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  optionLabelActive: {
    color: colors.primaryDark,
  },
  emptyHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 22,
    color: colors.textMuted,
  },
});
