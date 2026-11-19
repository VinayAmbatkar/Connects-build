import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { profileApi } from '@/src/api/profile';
import { SkillsDiamondRow } from '@/src/features/profile/SkillsDiamondRow';
import {
  normalizeOptions,
  normalizeProfileIds,
  resolveOptionLabels,
} from '@/src/features/profile/profileOptions';
import type { ProfessionalProfile } from '@/src/types/api';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

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

function SkillBlock({
  title,
  values,
  showAll,
}: {
  title: string;
  values: string[];
  showAll: boolean;
}) {
  if (!values.length) return null;

  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      {showAll ? (
        <View style={styles.skillChipRow}>
          {values.map((value) => (
            <View key={`${title}-${value}`} style={styles.skillChip}>
              <Text style={styles.skillChipText}>{value}</Text>
            </View>
          ))}
        </View>
      ) : (
        <SkillsDiamondRow skills={values} maxVisible={3} />
      )}
    </View>
  );
}

export function RoleExpertiseSection({ profile, showAll = false }: Props & { showAll?: boolean }) {
  const optionsQuery = useQuery({
    queryKey: ['profile-options'],
    queryFn: profileApi.options,
  });

  const disciplineOptions = normalizeOptions(optionsQuery.data?.disciplines);
  const specializationOptions = normalizeOptions(optionsQuery.data?.specializations);
  const projectTypeOptions = normalizeOptions(optionsQuery.data?.projectTypes);

  const ids = normalizeProfileIds((profile as Record<string, unknown>) ?? {});
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

  // The role is already shown beside the avatar, so it isn't repeated here.
  const hasContent = Boolean(disciplines.length || specializations.length || projectTypes.length);

  if (!hasContent) {
    return (
      <Text style={styles.empty}>No expertise details shared yet.</Text>
    );
  }

  return (
    <View>
      <SkillBlock title="Discipline" values={disciplines} showAll={showAll} />
      <SkillBlock title="Specialization" values={specializations} showAll={showAll} />
      <SkillBlock title="Project Types" values={projectTypes} showAll={showAll} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginBottom: spacing.md,
  },
  blockTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  skillChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  skillChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: '#FFF4E8',
    borderWidth: 1,
    borderColor: '#F6D6B6',
  },
  skillChipText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.text,
  },
  empty: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 22,
    color: colors.textSecondary,
  },
});
