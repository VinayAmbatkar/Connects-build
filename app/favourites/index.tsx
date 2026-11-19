import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { VerifiedName } from '@/src/components/VerifiedName';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { favouritesApi, type Favourite } from '@/src/api/social';
import { getErrorMessage } from '@/src/api/client';
import { Avatar } from '@/src/components/Avatar';
import { EmptyState, ErrorState } from '@/src/components/EmptyState';
import { formatRelativeTime } from '@/src/features/profile/profileFormat';
import { colors, spacing, typography } from '@/src/theme/tokens';

import { appAlert } from '@/src/components/AppDialog';
import { ListSkeleton } from '@/src/components/Skeleton';
/** Saved profiles -- the web app's Favourites page. */
export default function FavouritesScreen() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['favourites'], queryFn: favouritesApi.list });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => favouritesApi.remove(userId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['favourites'] }),
    onError: (e) => appAlert("Couldn't remove", getErrorMessage(e)),
  });

  if (query.isLoading) return <ListSkeleton />;
  if (query.isError) {
    return <ErrorState title="Couldn't load saved profiles" onRetry={() => void query.refetch()} />;
  }

  const items = query.data ?? [];
  const confirmRemove = (f: Favourite) =>
    appAlert('Remove from saved?', `${f.favouriteUserName} will be removed from your saved profiles.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMutation.mutate(f.favouriteUserId) },
    ]);

  return (
    <FlatList
      style={styles.screen}
      data={items}
      keyExtractor={(f) => f.favouriteUserId}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}
      contentContainerStyle={items.length ? styles.content : styles.emptyContent}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            Profiles you saved because you're interested in them
            {items.length ? ` · ${items.length}` : ''}
          </Text>
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          title="No saved profiles"
          message="Tap the bookmark on someone's profile to save it here for later."
        />
      }
      ItemSeparatorComponent={() => <View style={styles.divider} />}
      renderItem={({ item }) => {
        const when = formatRelativeTime(item.createdAt);
        return (
          <Pressable style={styles.row} onPress={() => router.push(`/public-profile/${item.favouriteUserId}`)}>
            <Avatar name={item.favouriteUserName} size={48} />
            <View style={styles.copy}>
              <VerifiedName name={item.favouriteUserName} verified={item.verified} style={styles.name} />
              {[item.role, item.specialization].filter(Boolean).length ? (
                <Text style={styles.meta} numberOfLines={1}>
                  {[item.role, item.specialization].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
              {when ? <Text style={styles.when}>Saved {when === 'Just now' ? 'just now' : `${when} ago`}</Text> : null}
            </View>
            <Pressable
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.favouriteUserName} from saved`}
              onPress={() => confirmRemove(item)}
            >
              <Ionicons name="bookmark" size={22} color={colors.primary} />
            </Pressable>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingVertical: spacing.sm },
  // The empty state centres itself below the subtitle.
  emptyContent: { flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  copy: { flex: 1 },
  name: { fontFamily: typography.fontFamily.semibold, fontSize: typography.size.md, color: colors.text },
  meta: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary },
  when: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, color: colors.textMuted },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 76 },
});
