import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState, ErrorState, LoadingState } from '@/src/components/EmptyState';
import { DemoTourOverlay } from '@/src/features/tour/DemoTourOverlay';
import { TOUR_STEPS } from '@/src/features/tour/tourSteps';
import { ActivityPostCard } from '@/src/features/profile/ActivityPostCard';
import { eventsApi } from '@/src/api/events';
import { connectionsApi } from '@/src/api/connections';
import { getErrorMessage } from '@/src/api/client';
import { useSSE } from '@/src/hooks/useSSE';
import { useAuthStore } from '@/src/store/authStore';
import { usePrefsStore } from '@/src/store/prefsStore';
import { colors, spacing, typography } from '@/src/theme/tokens';
import type { Connection, EventItem } from '@/src/types/api';

const PAGE_SIZE = 20;
/** Network posts are filtered client-side, so keep paging until a screenful
 * of them is loaded (or the feed runs out). */
const MIN_NETWORK_POSTS = 6;

type FeedTab = 'forYou' | 'network';

const FEED_TABS: { key: FeedTab; label: string }[] = [
  { key: 'forYou', label: 'For you' },
  { key: 'network', label: 'Network' },
];

function connectionUserId(item: Connection) {
  return item.otherPartyId ?? item.userId ?? item.requesterId ?? item.recipientId;
}

function FeedTabs({ active, onChange }: { active: FeedTab; onChange: (tab: FeedTab) => void }) {
  return (
    <View style={styles.tabs} accessibilityRole="tablist">
      {FEED_TABS.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.tabText, selected && styles.tabTextActive]}>{tab.label}</Text>
            <View style={[styles.tabIndicator, selected && styles.tabIndicatorActive]} />
          </Pressable>
        );
      })}
    </View>
  );
}

export default function FeedScreen() {
  const params = useLocalSearchParams<{ tour?: string }>();
  const hasCompletedTour = usePrefsStore((s) => s.hasCompletedTour);
  const completeTour = usePrefsStore((s) => s.completeTour);
  const [tourVisible, setTourVisible] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [activeTab, setActiveTab] = useState<FeedTab>('forYou');
  const myId = useAuthStore((s) => s.user?.id);

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

  const connectionsQuery = useQuery({
    queryKey: ['connections', 'accepted'],
    queryFn: () => connectionsApi.list({ filter: 'accepted', limit: 100 }),
    enabled: activeTab === 'network',
  });

  const allPosts = useMemo<EventItem[]>(
    () => feedQuery.data?.pages.flat() ?? [],
    [feedQuery.data],
  );

  const networkIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of connectionsQuery.data ?? []) {
      const id = connectionUserId(c);
      if (id != null && String(id) !== String(myId)) ids.add(String(id));
    }
    return ids;
  }, [connectionsQuery.data, myId]);

  const data = useMemo(() => {
    if (activeTab === 'forYou') return allPosts;
    return allPosts.filter((post) => {
      const authorId = post.userId ?? post.authorId;
      return authorId != null && networkIds.has(String(authorId));
    });
  }, [activeTab, allPosts, networkIds]);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = feedQuery;
  const networkReady = activeTab === 'network' && connectionsQuery.isSuccess;
  useEffect(() => {
    if (
      networkReady &&
      networkIds.size > 0 &&
      data.length < MIN_NETWORK_POSTS &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      void fetchNextPage();
    }
  }, [networkReady, networkIds.size, data.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

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

  const isNetwork = activeTab === 'network';
  const networkLoading =
    isNetwork && (connectionsQuery.isLoading || (data.length === 0 && isFetchingNextPage));

  return (
    <View style={styles.screen}>
      <FeedTabs active={activeTab} onChange={setActiveTab} />
      <FlatList
        data={data}
        keyExtractor={(item, index) => String(item.id ?? index)}
        contentContainerStyle={data.length === 0 ? styles.emptyList : styles.list}
        ItemSeparatorComponent={FeedSeparator}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={feedQuery.isRefetching && !feedQuery.isFetchingNextPage}
            onRefresh={() => {
              void feedQuery.refetch();
              if (isNetwork) void connectionsQuery.refetch();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={() => {
          if (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
            void feedQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          networkLoading ? (
            <LoadingState />
          ) : isNetwork ? (
            <EmptyState
              title="No posts from your network yet"
              message={
                networkIds.size === 0
                  ? 'Connect with professionals to see their updates here.'
                  : 'Updates from your connections will show up here.'
              }
            />
          ) : (
            <EmptyState
              title="No posts yet"
              message="Create a post or connect with professionals to fill your feed."
            />
          )
        }
        ListFooterComponent={
          feedQuery.isFetchingNextPage ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <ActivityPostCard
            item={item}
            authorName={item.ownerName ?? item.authorName}
            variant="feed"
            hideDivider
          />
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

function FeedSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceMuted },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 10,
  },
  tabText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    paddingBottom: 8,
  },
  tabTextActive: {
    fontFamily: typography.fontFamily.semibold,
    color: colors.primary,
  },
  tabIndicator: {
    alignSelf: 'stretch',
    marginHorizontal: spacing.lg,
    height: 2,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    backgroundColor: 'transparent',
  },
  tabIndicatorActive: {
    backgroundColor: colors.primary,
  },
  list: {
    paddingTop: spacing.sm,
    paddingBottom: 96,
  },
  emptyList: { flexGrow: 1, paddingBottom: 88 },
  separator: {
    height: spacing.sm,
  },
  footerLoading: {
    paddingVertical: spacing.md,
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
