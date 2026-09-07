import { Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/src/api/projects';
import { formatDateRange, truncateText } from '@/src/features/profile/profileFormat';
import { ProfileSectionCard } from '@/src/features/profile/ProfileSectionCard';
import { SkillsDiamondRow } from '@/src/features/profile/SkillsDiamondRow';
import type { Project } from '@/src/types/api';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

const LINKEDIN_BLUE = '#0A66C2';
const PREVIEW_COUNT = 2;

function ProjectCard({ project, skills }: { project: Project; skills: string[] }) {
  const title = project.name ?? project.title ?? 'Untitled project';
  const description = String(project.description ?? '').trim();
  const preview = truncateText(description, 160);
  const imageUrl = Array.isArray(project.photos) ? project.photos[0] : undefined;
  const dateRange = formatDateRange(
    project.startDate ? String(project.startDate) : undefined,
    project.endDate ? String(project.endDate) : undefined,
  );

  return (
    <View style={styles.projectCard}>
      <Text style={styles.projectTitle}>{title}</Text>
      {dateRange ? <Text style={styles.projectDate}>{dateRange}</Text> : null}
      {description ? (
        <Text style={styles.projectBody}>
          {preview.text}
          {preview.truncated ? <Text style={styles.more}>...more</Text> : null}
        </Text>
      ) : null}
      <SkillsDiamondRow skills={skills} />

      {imageUrl ? (
        <View style={styles.mediaCard}>
          <Image source={{ uri: String(imageUrl) }} style={styles.mediaThumb} />
          <View style={styles.mediaCopy}>
            <Text style={styles.mediaTitle} numberOfLines={1}>
              {title}
            </Text>
            {description ? (
              <Text style={styles.mediaSubtitle} numberOfLines={2}>
                {description}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

type Props = {
  skills?: string[];
};

export function ProfileProjectsSection({ skills = [] }: Props) {
  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.listMine,
  });

  const projects = Array.isArray(projectsQuery.data) ? projectsQuery.data : [];
  const preview = projects.slice(0, PREVIEW_COUNT);

  if (projectsQuery.isLoading) {
    return (
      <ProfileSectionCard title="Projects">
        <Text style={styles.empty}>Loading projects…</Text>
      </ProfileSectionCard>
    );
  }

  if (!projects.length) {
    return (
      <ProfileSectionCard
        title="Projects"
        onAdd={() => router.push('/projects')}
        onEdit={() => router.push('/projects')}
      >
        <Text style={styles.empty}>Add projects to showcase your work.</Text>
      </ProfileSectionCard>
    );
  }

  return (
    <ProfileSectionCard
      title="Projects"
      onAdd={() => router.push('/projects')}
      onEdit={() => router.push('/projects')}
      footer={projects.length > PREVIEW_COUNT ? `Show all ${projects.length} projects` : undefined}
      onFooterPress={() => router.push('/projects')}
    >
      {preview.map((project, index) => (
        <View key={String(project.id)}>
          <ProjectCard
            project={project}
            skills={
              Array.isArray(project.skills)
                ? project.skills.map(String)
                : skills.slice(0, 3)
            }
          />
          {index < preview.length - 1 ? <View style={styles.divider} /> : null}
        </View>
      ))}
    </ProfileSectionCard>
  );
}

const styles = StyleSheet.create({
  projectCard: {
    paddingVertical: spacing.sm,
  },
  projectTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  projectDate: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  projectBody: {
    marginTop: spacing.sm,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 22,
    color: colors.text,
  },
  more: {
    color: colors.textMuted,
  },
  mediaCard: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  mediaThumb: {
    width: 96,
    height: 72,
    backgroundColor: colors.surfaceMuted,
  },
  mediaCopy: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
  },
  mediaTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  mediaSubtitle: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  empty: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 22,
    color: colors.textSecondary,
  },
});
