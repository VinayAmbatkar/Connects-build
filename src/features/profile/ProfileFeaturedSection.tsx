import { colors, radius, spacing, typography } from '@/src/theme/tokens';
import type { EventItem, Project } from '@/src/types/api';
import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const LINKEDIN_BLUE = '#0A66C2';

type FeaturedItem = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  kind: 'event' | 'project';
};

function toFeaturedItem(event: EventItem): FeaturedItem | null {
  const imageUrl =
    event.imageUrl ??
    event.coverImage ??
    (Array.isArray(event.photos) ? event.photos[0] : undefined);
  if (!imageUrl) return null;

  return {
    id: `event-${event.id}`,
    title: event.title ?? 'Event',
    subtitle: event.location,
    imageUrl: String(imageUrl),
    kind: 'event',
  };
}

function projectToFeatured(project: Project): FeaturedItem | null {
  const imageUrl = Array.isArray(project.photos) ? project.photos[0] : undefined;
  if (!imageUrl) return null;

  return {
    id: `project-${project.id}`,
    title: project.name ?? project.title ?? 'Project',
    subtitle: project.locationId ? String(project.locationId) : undefined,
    imageUrl: String(imageUrl),
    kind: 'project',
  };
}

type Props = {
  events?: EventItem[];
  projects?: Project[];
  onAdd?: () => void;
  onEdit?: () => void;
};

export function ProfileFeaturedSection({ events = [], projects = [], onAdd, onEdit }: Props) {
  const items = [
    ...events.map(toFeaturedItem).filter((item): item is FeaturedItem => Boolean(item)),
    ...projects.map(projectToFeatured).filter((item): item is FeaturedItem => Boolean(item)),
  ];

  if (!items.length) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Featured</Text>
        <View style={styles.actions}>
          {onAdd ? (
            <Pressable onPress={onAdd} hitSlop={8}>
              <Ionicons name="add" size={22} color={LINKEDIN_BLUE} />
            </Pressable>
          ) : null}
          {onEdit ? (
            <Pressable onPress={onEdit} hitSlop={8}>
              <Ionicons name="pencil" size={18} color={LINKEDIN_BLUE} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carousel}
      >
        {items.map((item) => (
          <View key={item.id} style={styles.featureCard}>
            <Text style={styles.featureKind}>{item.kind === 'event' ? 'Post' : 'Project'}</Text>
            <Image source={{ uri: item.imageUrl }} style={styles.featureImage} />
            <Text style={styles.featureTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {item.subtitle ? (
              <Text style={styles.featureSubtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  carousel: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  featureCard: {
    width: 220,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  featureKind: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  featureImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.surfaceMuted,
  },
  featureTitle: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  featureSubtitle: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    paddingTop: 4,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
});
