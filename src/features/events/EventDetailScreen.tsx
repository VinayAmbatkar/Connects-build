import { useMemo } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/src/components/Avatar';
import { PhotoCarousel } from '@/src/components/PhotoCarousel';
import { ErrorState, LoadingState } from '@/src/components/EmptyState';
import { eventsApi, getEventPhotoUrls } from '@/src/api/events';
import { formatRelativeTime } from '@/src/features/profile/profileFormat';
import type { EventItem } from '@/src/types/api';
import { colors, spacing, typography } from '@/src/theme/tokens';

const WINDOW = Dimensions.get('window');
const DETAIL_PHOTO_HEIGHT = Math.min(WINDOW.height * 0.55, WINDOW.width * 1.15);

type Props = {
  eventId: string;
};

function findEventInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  eventId: string,
): EventItem | undefined {
  const direct = queryClient.getQueryData<EventItem>(['event', eventId]);
  if (direct?.id != null && String(direct.id) === eventId) return direct;

  const mine = queryClient.getQueryData<EventItem[]>(['my-events']);
  const fromMine = Array.isArray(mine)
    ? mine.find((item) => String(item.id) === eventId)
    : undefined;
  if (fromMine) return fromMine;

  const feed = queryClient.getQueryData<{ pages?: EventItem[][] }>(['events-feed']);
  if (feed?.pages) {
    for (const page of feed.pages) {
      const match = page.find((item) => String(item.id) === eventId);
      if (match) return match;
    }
  }

  return undefined;
}

export function EventDetailScreen({ eventId }: Props) {
  const queryClient = useQueryClient();

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const cached = findEventInCache(queryClient, eventId);
      if (cached) return cached;

      // Prefer own list, then feed scan — backend has no dedicated get-by-id in the collection.
      const mine = await eventsApi.listMine();
      const fromMine = mine.find((item) => String(item.id) === eventId);
      if (fromMine) return fromMine;

      const feed = await eventsApi.feed(100, 0);
      const fromFeed = feed.find((item) => String(item.id) === eventId);
      if (fromFeed) return fromFeed;

      throw new Error('Event not found');
    },
    initialData: () => findEventInCache(queryClient, eventId),
  });

  const event = eventQuery.data;
  const photos = useMemo(() => getEventPhotoUrls(event), [event]);
  const author =
    event?.ownerName ?? event?.authorName ?? event?.title ?? 'Event';
  const postedAt = event?.createdAt ?? event?.eventDate;

  if (eventQuery.isLoading && !event) return <LoadingState />;

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
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
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
          <PhotoCarousel
            urls={photos}
            height={DETAIL_PHOTO_HEIGHT}
            style={styles.carousel}
            borderRadius={12}
            resizeMode="contain"
          />
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
  carousel: {
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
  },
  hint: {
    marginTop: spacing.sm,
    textAlign: 'center',
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
});
