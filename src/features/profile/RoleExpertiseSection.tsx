import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { profileApi } from '@/src/api/profile';
import { SkillsDiamondRow } from '@/src/features/profile/SkillsDiamondRow';
import {
  normalizeOptions,
  normalizeProfileIds,
  resolveOptionLabel,
  resolveOptionLabels,
} from '@/src/features/profile/profileOptions';
import type { ProfessionalProfile } from '@/src/types/api';
import { colors, spacing, typography } from '@/src/theme/tokens';

type Props = {
  profile?: ProfessionalProfile | null;
};

export function getProfileSkillLabels(
  profile: ProfessionalProfile | null | undefined,
  options?: {
    disciplines?: ReturnType<typeof normalizeOptions>;
    specializations?: ReturnType<typeof normalizeOptions>;
    projectTypes?: ReturnType<typeof normalizeOptions>;
  },
) {
  const disciplineOptions = options?.disciplines ?? [];
  const specializationOptions = options?.specializations ?? [];
  const projectTypeOptions = options?.projectTypes ?? [];

  const ids = normalizeProfileIds(
    (profile as Record<string, unknown>) ?? {},
  );

  return [
    ...resolveOptionLabels(disciplineOptions, ids.disciplineIds.length ? ids.disciplineIds : profile?.disciplineIds),
    ...resolveOptionLabels(specializationOptions, ids.specializationIds.length ? ids.specializationIds : profile?.specializationIds),
    ...resolveOptionLabels(projectTypeOptions, ids.projectTypeIds.length ? ids.projectTypeIds : profile?.projectTypeIds),
  ];
}

function SkillBlock({ title, values }: { title: string; values: string[] }) {
  if (!values.length) return null;

  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      <SkillsDiamondRow skills={values} maxVisible={3} />
    </View>
  );
}

export function RoleExpertiseSection({ profile }: Props) {
  const optionsQuery = useQuery({
    queryKey: ['profile-options'],
    queryFn: profileApi.options,
  });

  const roleOptions = normalizeOptions(optionsQuery.data?.roles);
  const disciplineOptions = normalizeOptions(optionsQuery.data?.disciplines);
  const specializationOptions = normalizeOptions(optionsQuery.data?.specializations);
  const projectTypeOptions = normalizeOptions(optionsQuery.data?.projectTypes);

  const ids = normalizeProfileIds((profile as Record<string, unknown>) ?? {});
  const roleLabel = resolveOptionLabel(roleOptions, profile?.role) ?? profile?.role;
  const disciplines = resolveOptionLabels(
    disciplineOptions,
    ids.disciplineIds.length ? ids.disciplineIds : profile?.disciplineIds,
  );
  const specializations = resolveOptionLabels(
    specializationOptions,
    ids.specializationIds.length ? ids.specializationIds : profile?.specializationIds,
  );
  const projectTypes = resolveOptionLabels(
    projectTypeOptions,
    ids.projectTypeIds.length ? ids.projectTypeIds : profile?.projectTypeIds,
  );

  const hasContent = Boolean(
    roleLabel || disciplines.length || specializations.length || projectTypes.length,
  );

  if (!hasContent) {
    return (
      <Text style={styles.empty}>No role or expertise details shared yet.</Text>
    );
  }

  return (
    <View>
      {roleLabel ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Role</Text>
          <Text style={styles.roleValue}>{roleLabel}</Text>
        </View>
      ) : null}
      <SkillBlock title="Discipline" values={disciplines} />
      <SkillBlock title="Specialization" values={specializations} />
      <SkillBlock title="Project Types" values={projectTypes} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginBottom: spacing.md,
  },
  blockTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  roleValue: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  empty: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 22,
    color: colors.textSecondary,
  },
});
