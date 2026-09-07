import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/src/components/Button';
import { EmptyState, LoadingState } from '@/src/components/EmptyState';
import { notificationsApi } from '@/src/api/notifications';
import { useSSE } from '@/src/hooks/useSSE';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

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
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markOneMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (listQuery.isLoading) return <LoadingState />;
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
            style={[styles.card, !item.read && styles.unread]}
            onPress={() => markOneMutation.mutate(item.id)}
          >
            <Text style={styles.title}>{item.title ?? 'Notification'}</Text>
            {item.body ? <Text style={styles.body}>{item.body}</Text> : null}
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
