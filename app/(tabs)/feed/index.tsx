import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState, ErrorState, LoadingState } from '@/src/components/EmptyState';
import { DemoTourOverlay } from '@/src/features/tour/DemoTourOverlay';
import { TOUR_STEPS } from '@/src/features/tour/tourSteps';
import { ActivityPostCard } from '@/src/features/profile/ActivityPostCard';
import { eventsApi } from '@/src/api/events';
import { getErrorMessage } from '@/src/api/client';
import { useSSE } from '@/src/hooks/useSSE';
import { usePrefsStore } from '@/src/store/prefsStore';
import { colors, spacing } from '@/src/theme/tokens';
import type { EventItem } from '@/src/types/api';

const PAGE_SIZE = 20;

export default function FeedScreen() {
  const params = useLocalSearchParams<{ tour?: string }>();
  const hasCompletedTour = usePrefsStore((s) => s.hasCompletedTour);
  const completeTour = usePrefsStore((s) => s.completeTour);
  const [tourVisible, setTourVisible] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  useEffect(() => {
    if (params.tour === '1' && !hasCompletedTour) {
      setTourVisible(true);
    }
  }, [params.tour, hasCompletedTour]);

  const feedQuery = useInfiniteQuery({
    queryKey: ['events-feed'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => eventsApi.feed(PAGE_SIZE, pageParam),
    getNextPageParam: (lastPage, _pages, lastOffset) =>
      lastPage.length < PAGE_SIZE ? undefined : lastOffset + lastPage.length,
  });

  useSSE({
    path: '/events/stream',
    enabled: true,
    onMessage: () => {
      void feedQuery.refetch();
    },
  });

  const finishTour = async () => {
    setTourVisible(false);
    await completeTour();
  };

  const nextTour = async () => {
    if (tourStep >= TOUR_STEPS.length - 1) {
      await finishTour();
      return;
    }
    setTourStep((s) => s + 1);
  };

  if (feedQuery.isLoading) return <LoadingState />;

  if (feedQuery.isError) {
    return (
      <ErrorState
        title="Feed unavailable"
        message={getErrorMessage(feedQuery.error)}
        onRetry={() => feedQuery.refetch()}
      />
    );
  }

  const data: EventItem[] = feedQuery.data?.pages.flat() ?? [];

  return (
    <View style={styles.screen}>
      <FlatList
        data={data}
        keyExtractor={(item, index) => String(item.id ?? index)}
        contentContainerStyle={data.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={feedQuery.isRefetching && !feedQuery.isFetchingNextPage}
            onRefresh={() => feedQuery.refetch()}
            tintColor={colors.primary}
          />
        }
        onEndReached={() => {
          if (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
            void feedQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <EmptyState
            title="No posts yet"
            message="Create a post or connect with professionals to fill your feed."
          />
        }
        ListFooterComponent={
          feedQuery.isFetchingNextPage ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <ActivityPostCard
              item={item}
              authorName={item.ownerName ?? item.authorName}
              hideDivider
            />
          </View>
        )}
      />

      <Pressable
        style={styles.fab}
        onPress={() => router.push('/create-event' as Href)}
        accessibilityLabel="Create post"
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </Pressable>

      <DemoTourOverlay
        visible={tourVisible}
        stepIndex={tourStep}
        onNext={nextTour}
        onSkip={finishTour}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  list: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    paddingBottom: 88,
  },
  emptyList: { flexGrow: 1, paddingBottom: 88 },
  cardWrap: {
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  footerLoading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
