import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/src/components/Avatar';
import { PhotoCarousel } from '@/src/components/PhotoCarousel';
import { getEventPhotoUrls } from '@/src/api/events';
import { formatRelativeTime, truncateText } from '@/src/features/profile/profileFormat';
import { useAuthStore } from '@/src/store/authStore';
import type { EventItem } from '@/src/types/api';
import { colors, spacing, typography } from '@/src/theme/tokens';

type Props = {
  item: EventItem;
  authorName?: string;
  headline?: string;
  isOwn?: boolean;
  /** Hide the top divider (use on standalone feed cards). */
  hideDivider?: boolean;
};

function authorProfileId(item: EventItem) {
  return item.userId ?? item.authorId ?? null;
}

export function ActivityPostCard({ item, authorName, headline, isOwn, hideDivider }: Props) {
  const queryClient = useQueryClient();
  const myId = useAuthStore((s) => s.user?.id);
  const [expanded, setExpanded] = useState(false);
  const body = item.description?.trim() ?? '';
  const preview = truncateText(body, 180);
  const displayName = authorName ?? item.ownerName ?? item.authorName ?? item.title ?? 'You';
  const postedAt = item.createdAt ?? item.eventDate;
  const photos = getEventPhotoUrls(item);
  const profileId = authorProfileId(item);
  const viewingOwn =
    isOwn ||
    (profileId != null && myId != null && String(profileId) === String(myId));

  const openEvent = () => {
    if (item.id == null || item.id === '') return;
    const id = String(item.id);
    queryClient.setQueryData(['event', id], item);
    router.push(`/event/${id}` as Href);
  };

  const openProfile = () => {
    if (viewingOwn) {
      router.push('/(tabs)/profile' as Href);
      return;
    }
    if (profileId == null || profileId === '') return;
    router.push(`/public-profile/${profileId}` as Href);
  };

  return (
    <View style={[styles.card, hideDivider && styles.cardNoDivider]}>
      <Pressable
        onPress={openProfile}
        disabled={!viewingOwn && profileId == null}
        style={styles.header}
        accessibilityRole="button"
        accessibilityLabel={`Open ${displayName}'s profile`}
      >
        <Avatar name={displayName} size={44} />
        <View style={styles.headerCopy}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{displayName}</Text>
            {viewingOwn ? <Text style={styles.youTag}> • You</Text> : null}
          </View>
          {headline ? (
            <Text style={styles.headline} numberOfLines={1}>
              {headline}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            <Text style={styles.meta}>
              {formatRelativeTime(postedAt)}
              {item.location ? ` • ${item.location}` : ''}
            </Text>
            <Ionicons name="globe-outline" size={12} color={colors.textMuted} />
          </View>
        </View>
        <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
      </Pressable>

      <Pressable onPress={openEvent}>
        {item.title ? <Text style={styles.title}>{item.title}</Text> : null}

        {body ? (
          <Text style={styles.body}>
            {expanded || !preview.truncated ? body : preview.text}
            {preview.truncated && !expanded ? (
              <Text
                style={styles.more}
                onPress={() => setExpanded(true)}
              >
                {' '}
                ...more
              </Text>
            ) : null}
          </Text>
        ) : null}
      </Pressable>

      {photos.length ? (
        <PhotoCarousel
          urls={photos}
          height={200}
          borderRadius={8}
          style={styles.carousel}
          onPress={openEvent}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  cardNoDivider: {
    borderTopWidth: 0,
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  name: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  youTag: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  headline: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  meta: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  title: {
    marginTop: spacing.sm,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  body: {
    marginTop: spacing.sm,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 22,
    color: colors.text,
  },
  more: {
    color: colors.textMuted,
  },
  carousel: {
    marginTop: spacing.sm,
  },
});
