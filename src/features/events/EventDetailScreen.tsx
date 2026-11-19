import { useMemo, useCallback } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePullToRefresh } from '@/src/hooks/usePullToRefresh';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/src/components/Avatar';
import { PhotoCarousel } from '@/src/components/PhotoCarousel';
import { ErrorState } from '@/src/components/EmptyState';
import { eventsApi, getEventPhotoUrls } from '@/src/api/events';
import { formatRelativeTime } from '@/src/features/profile/profileFormat';
import { VideoTile } from '@/src/features/profile/ActivityPostCard';
import { feedKeys } from '@/src/features/events/feedCache';
import { useAuthStore } from '@/src/store/authStore';
import type { EventItem } from '@/src/types/api';
import { colors, spacing, typography } from '@/src/theme/tokens';

import { FeedSkeleton } from '@/src/components/Skeleton';
import { getErrorMessage } from '@/src/api/client';
import { appAlert } from '@/src/components/AppDialog';
const WINDOW = Dimensions.get('window');
const DETAIL_PHOTO_HEIGHT = Math.min(WINDOW.height * 0.55, WINDOW.width * 1.15);

type Props = {
  eventId: string;
};

/** A copy already on screen (the card that was tapped seeds
 *  ['event', id]; the profile list also holds own posts) -- shown
 *  instantly while the real fetch confirms it. */
function findEventInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  eventId: string,
): EventItem | undefined {
  const direct = queryClient.getQueryData<EventItem>(feedKeys.event(eventId));
  if (direct?.id != null && String(direct.id) === eventId) return direct;

  const mine = queryClient.getQueryData<EventItem[]>(['my-events']);
  return Array.isArray(mine) ? mine.find((item) => String(item.id) === eventId) : undefined;
}

export function EventDetailScreen({ eventId }: Props) {
  const pull = usePullToRefresh();
  const queryClient = useQueryClient();

  const me = useAuthStore((s) => s.user);

  // GET /events/:id. This used to download your own posts plus 100 feed
  // posts and search them, so any post outside those (older, or opened
  // from a notification or link) showed "Event unavailable".
  const eventQuery = useQuery({
    queryKey: feedKeys.event(eventId),
    queryFn: async () => {
      const fetched = await eventsApi.get(eventId);
      // The single-post response has no owner name; keep the one the
      // tapped card already had.
      const cached = findEventInCache(queryClient, eventId);
      return { ...cached, ...fetched, ownerName: fetched.ownerName ?? cached?.ownerName } as EventItem;
    },
    placeholderData: () => findEventInCache(queryClient, eventId),
  });

  const event = eventQuery.data;
  const photos = useMemo(() => getEventPhotoUrls(event), [event]);
  const isMine = event?.userId != null && String(event.userId) === String(me?.id ?? '');
  // The post title used to be the fallback author name.
  const author =
    event?.ownerName ?? event?.authorName ?? (isMine ? me?.fullName : undefined) ?? 'Member';
  const postedAt = event?.createdAt ?? event?.eventDate;

  const handleDelete = useCallback(async () => {
    try {
      await eventsApi.remove(eventId);
      // Invalidate all relevant queries to trigger immediate refetch
      queryClient.invalidateQueries({ queryKey: ['my-events'] });
      queryClient.invalidateQueries({ queryKey: ['events-feed'] });
      queryClient.invalidateQueries({ queryKey: ['user-events'] });
      queryClient.invalidateQueries({ queryKey: feedKeys.event(eventId) });
      appAlert('Deleted', 'Your post has been removed.');
      router.back();
    } catch (e) {
      appAlert("Couldn't delete", getErrorMessage(e));
    }
  }, [eventId, queryClient]);

  const handleMoreOptions = useCallback(() => {
    if (!isMine) return;
    appAlert('Delete post?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: handleDelete,
      },
    ]);
  }, [isMine, handleDelete]);

  if (eventQuery.isLoading && !event) return <FeedSkeleton posts={1} />;

  if (eventQuery.isError && !event) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.topTitle}>Event</Text>
          <View style={styles.iconBtn} />
        </View>
        <ErrorState
          title="Event unavailable"
          message="This event could not be loaded."
          onRetry={() => void eventQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  if (!event) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Event</Text>
        <Pressable
          onPress={handleMoreOptions}
          style={styles.iconBtn}
          accessibilityLabel={isMine ? 'Post options' : ''}
        >
          {isMine && <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />}
        </Pressable>
      </View>

      <ScrollView
        refreshControl={pull.refreshControl}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Avatar name={author} size={48} />
          <View style={styles.headerCopy}>
            <Text style={styles.author}>{author}</Text>
            <Text style={styles.meta}>
              {formatRelativeTime(postedAt)}
              {event.location ? ` • ${event.location}` : ''}
            </Text>
          </View>
        </View>

        {event.title ? <Text style={styles.title}>{event.title}</Text> : null}

        {event.description?.trim() ? (
          <Text style={styles.body}>{event.description.trim()}</Text>
        ) : null}

        {photos.length ? (
          <View style={styles.media}>
            <PhotoCarousel
              urls={photos}
              height={DETAIL_PHOTO_HEIGHT}
              borderRadius={12}
              resizeMode="contain"
            />
          </View>
        ) : null}

        {event.videoUrl ? (
          <View style={styles.media}>
            <VideoTile url={event.videoUrl} rounded />
          </View>
        ) : null}

        {photos.length > 1 ? (
          <Text style={styles.hint}>Swipe left or right to see all photos</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  scroll: { flex: 1 },
  content: {
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  headerCopy: { flex: 1, justifyContent: 'center' },
  author: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  meta: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  title: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    color: colors.text,
  },
  body: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.md,
    lineHeight: 24,
    color: colors.text,
  },
  // Padding on a wrapper, not margin on the carousel: the carousel is
  // width 100%, and in React Native margins are added on top of a
  // percentage width, so the photo overflowed the right edge by twice the
  // margin (the "post not aligned" look).
  media: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  hint: {
    marginTop: spacing.sm,
    textAlign: 'center',
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
});
