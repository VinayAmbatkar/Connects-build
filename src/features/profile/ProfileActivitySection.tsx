import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '@/src/api/events';
import { getErrorMessage } from '@/src/api/client';
import { ActivityPostCard } from '@/src/features/profile/ActivityPostCard';
import { ProfileSectionCard } from '@/src/features/profile/ProfileSectionCard';
import { useAuthStore } from '@/src/store/authStore';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';
import type { EventItem, ProfessionalProfile } from '@/src/types/api';

const LINKEDIN_BLUE = '#0A66C2';
const PREVIEW_COUNT = 3;

type Props = {
  profile?: ProfessionalProfile | null;
  authorName?: string;
  headline?: string;
  connectionsCount?: number;
  /** When provided and non-empty, render these events directly. */
  events?: EventItem[];
  /** Show every event (Events tab) instead of a short preview. */
  showAll?: boolean;
  /** Profile owner id — used to load/filter that user's events. */
  ownerUserId?: string | number | null;
};

function matchesOwner(event: EventItem, ownerId: string) {
  const candidates = [event.userId, event.authorId, (event as { ownerId?: unknown }).ownerId];
  return candidates.some((id) => id != null && String(id) === ownerId);
}

export function ProfileActivitySection({
  profile,
  authorName,
  headline,
  connectionsCount,
  events: eventsProp,
  showAll = false,
  ownerUserId,
}: Props) {
  const authUserId = useAuthStore((s) => s.user?.id);
  const resolvedOwnerId = ownerUserId ?? authUserId ?? null;
  const ownerKey = resolvedOwnerId != null ? String(resolvedOwnerId) : null;
  const isOwnProfile =
    ownerKey != null && authUserId != null && ownerKey === String(authUserId);

  const hasProvidedEvents = Array.isArray(eventsProp) && eventsProp.length > 0;

  const eventsQuery = useQuery({
    queryKey: ['my-events'],
    queryFn: eventsApi.listMine,
    enabled: !hasProvidedEvents && isOwnProfile,
  });

  const mine = useMemo(() => {
    if (hasProvidedEvents) return eventsProp as EventItem[];
    if (!isOwnProfile) return [];
    return Array.isArray(eventsQuery.data) ? eventsQuery.data : [];
  }, [hasProvidedEvents, eventsProp, isOwnProfile, eventsQuery.data]);

  const needsFeedFallback = !hasProvidedEvents && mine.length === 0 && ownerKey != null;

  const feedFallbackQuery = useQuery({
    queryKey: ['events-feed', 'profile-fallback', ownerKey ?? ''],
    queryFn: () => eventsApi.feed(50, 0),
    enabled: needsFeedFallback && !eventsQuery.isLoading,
  });

  const events = useMemo(() => {
    if (mine.length) return mine;
    const feed = Array.isArray(feedFallbackQuery.data) ? feedFallbackQuery.data : [];
    if (!ownerKey) return [];
    return feed.filter((item) => matchesOwner(item, ownerKey));
  }, [mine, feedFallbackQuery.data, ownerKey]);

  const visible = showAll ? events : events.slice(0, PREVIEW_COUNT);
  const subtitle =
    connectionsCount !== undefined
      ? `${connectionsCount >= 500 ? '500+' : connectionsCount} connections`
      : undefined;

  const isLoading =
    (isOwnProfile && !hasProvidedEvents && eventsQuery.isLoading) ||
    (needsFeedFallback && feedFallbackQuery.isLoading);

  if (isLoading) {
    return (
      <ProfileSectionCard title="Events" subtitle={subtitle}>
        <Text style={styles.empty}>Loading events…</Text>
      </ProfileSectionCard>
    );
  }

  if (isOwnProfile && eventsQuery.isError && !events.length) {
    return (
      <ProfileSectionCard title="Events" subtitle={subtitle}>
        <Text style={styles.empty}>{getErrorMessage(eventsQuery.error)}</Text>
        <Pressable onPress={() => void eventsQuery.refetch()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </ProfileSectionCard>
    );
  }

  return (
    <ProfileSectionCard
      title="Events"
      subtitle={subtitle}
      onEdit={isOwnProfile ? () => router.push('/create-event') : undefined}
      onAdd={isOwnProfile ? () => router.push('/create-event') : undefined}
    >
      {isOwnProfile ? (
        <View style={styles.toolbar}>
          <Pressable
            style={styles.createBtn}
            onPress={() => router.push('/create-event')}
          >
            <Text style={styles.createBtnText}>Create post</Text>
          </Pressable>
        </View>
      ) : null}

      {visible.length ? (
        visible.map((item, index) => (
          <ActivityPostCard
            key={`${String(item.id)}-${index}`}
            item={item}
            authorName={authorName ?? profile?.fullName}
            headline={headline}
            isOwn={isOwnProfile}
          />
        ))
      ) : (
        <Text style={styles.empty}>
          {isOwnProfile
            ? 'Share project updates and events to build your professional presence.'
            : 'No events shared yet.'}
        </Text>
      )}

      {!showAll && events.length > PREVIEW_COUNT ? (
        <Pressable onPress={() => router.push('/(tabs)/feed')} style={styles.showAll}>
          <Text style={styles.showAllText}>Show all {events.length} events</Text>
          <Text style={styles.showAllArrow}>→</Text>
        </Pressable>
      ) : null}
    </ProfileSectionCard>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.sm,
  },
  createBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: LINKEDIN_BLUE,
  },
  createBtnText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: LINKEDIN_BLUE,
  },
  empty: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  retryBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: LINKEDIN_BLUE,
  },
  retryText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: LINKEDIN_BLUE,
  },
  showAll: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  showAllText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: LINKEDIN_BLUE,
  },
  showAllArrow: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: LINKEDIN_BLUE,
  },
});
