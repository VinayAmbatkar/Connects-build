import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@/src/components/BottomSheet';
import { ImageViewer } from '@/src/components/ImageViewer';
import { PhotoCarousel } from '@/src/components/PhotoCarousel';
import { usePlaceLabel } from '@/src/hooks/usePlaceLabels';
import type { Project } from '@/src/types/api';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

/** Photos for a project, whichever field the response used. */
export function projectPhotos(project: Project): string[] {
  const p = project as { photoUrls?: unknown; photos?: unknown };
  const list = Array.isArray(p.photoUrls) ? p.photoUrls : Array.isArray(p.photos) ? p.photos : [];
  return list.filter((u): u is string => typeof u === 'string' && !!u);
}

type Props = {
  project: Project | null;
  onClose: () => void;
};

/**
 * A project opened from a profile's Projects tab: every photo (tap one to
 * view it full screen), location, size, awards and description. Before,
 * tapping a project did nothing.
 */
export function ProjectDetailSheet({ project, onClose }: Props) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const location = usePlaceLabel(project?.locationId);

  const photos = project ? projectPhotos(project) : [];
  const title = project ? String(project.name ?? project.title ?? 'Project') : '';
  const size = project?.sizeSqft ? `${Number(project.sizeSqft).toLocaleString()} ${String(project.sizeUnit ?? 'sq ft')}` : '';
  const awards = typeof project?.awards === 'string' ? project.awards.trim() : '';
  const description = typeof project?.description === 'string' ? project.description.trim() : '';

  return (
    <>
      <BottomSheet visible={!!project} title={title} onClose={onClose} tall>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {photos.length ? (
            <PhotoCarousel
              urls={photos}
              aspectRatio={4 / 3}
              borderRadius={radius.md}
              resizeMode="cover"
              onPress={(i) => setViewerIndex(i)}
            />
          ) : null}

          <View style={styles.facts}>
            {location ? <Fact icon="location-outline" text={location} /> : null}
            {size ? <Fact icon="resize-outline" text={size} /> : null}
            {awards ? <Fact icon="trophy-outline" text={awards} /> : null}
          </View>

          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : !photos.length && !location && !size && !awards ? (
            <Text style={styles.empty}>No details added for this project yet.</Text>
          ) : null}
        </ScrollView>
      </BottomSheet>

      <ImageViewer
        urls={viewerIndex === null ? null : photos}
        initialIndex={viewerIndex ?? 0}
        caption={title}
        onClose={() => setViewerIndex(null)}
      />
    </>
  );
}

function Fact({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={styles.factText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: spacing.xl, gap: spacing.md },
  facts: { gap: spacing.sm },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  factText: { flex: 1, fontFamily: typography.fontFamily.medium, fontSize: 14, color: colors.text },
  description: { fontFamily: typography.fontFamily.regular, fontSize: 14, lineHeight: 21, color: colors.textSecondary },
  empty: { fontFamily: typography.fontFamily.regular, fontSize: 14, color: colors.textMuted },
});
