import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/src/components/Button';
import { EmptyState } from '@/src/components/EmptyState';
import { notificationsApi } from '@/src/api/notifications';
import { useSSE } from '@/src/hooks/useSSE';
import { routeForNotification } from '@/src/notifications/push';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

import { ListSkeleton } from '@/src/components/Skeleton';
function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const listQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
  });

  useSSE({
    path: '/notifications/stream',
    onMessage: () => {
      void listQuery.refetch();
    },
  });

  const markAllMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  if (listQuery.isLoading) return <ListSkeleton />;
  const data = Array.isArray(listQuery.data) ? listQuery.data : [];
  const hasNotifications = data.length > 0;

  return (
    <View style={styles.screen}>
      {hasNotifications ? (
        <View style={styles.toolbar}>
          <Button
            title="Mark all read"
            variant="outline"
            onPress={() => markAllMutation.mutate()}
            loading={markAllMutation.isPending}
            style={styles.markAll}
          />
        </View>
      ) : null}
      <FlatList
        data={data}
        keyExtractor={(item, index) => String(item.id ?? index)}
        contentContainerStyle={data.length === 0 ? styles.empty : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={listQuery.isRefetching}
            onRefresh={() => listQuery.refetch()}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState title="No notifications" message="You're all caught up." />
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, !item.isRead && styles.unread]}
            onPress={() => {
              if (!item.isRead) markOneMutation.mutate(item.id);
              const target = routeForNotification(item);
              if (target !== '/notifications') router.push(target);
            }}
          >
            <Text style={styles.title}>{item.message}</Text>
            <Text style={styles.body}>{formatWhen(item.createdAt)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  toolbar: { padding: spacing.md },
  markAll: { minHeight: 44 },
  list: { paddingHorizontal: spacing.md },
  empty: { flexGrow: 1 },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  unread: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.primaryMuted,
  },
  title: { fontFamily: typography.fontFamily.semibold, color: colors.text },
  body: {
    marginTop: 4,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
});
