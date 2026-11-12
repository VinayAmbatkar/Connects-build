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
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState, ErrorState } from '@/src/components/EmptyState';
import { DemoTourOverlay } from '@/src/features/tour/DemoTourOverlay';
import { TOUR_STEPS } from '@/src/features/tour/tourSteps';
import { ActivityPostCard } from '@/src/features/profile/ActivityPostCard';
import { eventsApi, normalizeEvent } from '@/src/api/events';
import { getErrorMessage } from '@/src/api/client';
import { feedKeys, flattenUnique, nextOffset, upsertEventAtTop } from '@/src/features/events/feedCache';
import { useSSE } from '@/src/hooks/useSSE';
import { useAuthStore } from '@/src/store/authStore';
import { usePrefsStore } from '@/src/store/prefsStore';
import { colors, spacing, typography } from '@/src/theme/tokens';
import type { EventItem } from '@/src/types/api';

import { FeedSkeleton } from '@/src/components/Skeleton';
const PAGE_SIZE = 20;

type FeedTab = 'forYou' | 'network';

const FEED_TABS: { key: FeedTab; label: string }[] = [
  { key: 'forYou', label: 'For you' },
  { key: 'network', label: 'Network' },
];

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

  // One server-paged list per tab. The Network tab used to page through
  // the whole global feed and filter on the phone until it found 6 posts
  // from connections -- dozens of requests (endlessly, while the backend
  // ignored ?offset= and returned page 1 every time).
  const forYouQuery = useInfiniteQuery({
    queryKey: feedKeys.feed('forYou'),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => eventsApi.feed(PAGE_SIZE, pageParam),
    getNextPageParam: nextOffset(PAGE_SIZE),
  });
  const networkQuery = useInfiniteQuery({
    queryKey: feedKeys.feed('network'),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => eventsApi.feed(PAGE_SIZE, pageParam, 'network'),
    getNextPageParam: nextOffset(PAGE_SIZE),
    enabled: activeTab === 'network',
  });
  const feedQuery = activeTab === 'network' ? networkQuery : forYouQuery;

  const data = useMemo<EventItem[]>(() => flattenUnique(feedQuery.data), [feedQuery.data]);

  // A live post is inserted where it belongs instead of refetching -- a
  // refetch of an infinite query re-downloads every loaded page.
  const queryClient = useQueryClient();
  useSSE({
    path: '/events/stream',
    enabled: true,
    onMessage: (raw) => {
      try {
        const event = normalizeEvent(JSON.parse(raw) as Record<string, unknown>);
        if (event.id == null || event.id === '') return;
        if (String(event.userId ?? '') === String(myId ?? '')) return;
        upsertEventAtTop(queryClient, event);
      } catch {
        // Malformed frame -- ignore; the next pull-to-refresh catches up.
      }
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

  const isNetwork = activeTab === 'network';
  // Full-screen states only for the first tab's first load; the Network
  // tab loads inside the list so the tab bar stays put.
  if (!isNetwork && feedQuery.isLoading) return <FeedSkeleton />;

  if (!isNetwork && feedQuery.isError) {
    return (
      <ErrorState
        title="Feed unavailable"
        message={getErrorMessage(feedQuery.error)}
        onRetry={() => feedQuery.refetch()}
      />
    );
  }

  const networkLoading = isNetwork && feedQuery.isLoading;

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
            <FeedSkeleton />
          ) : isNetwork ? (
            <EmptyState
              title="No posts from your network yet"
              message="Updates from your connections will show up here. Connect with professionals to grow your network."
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
