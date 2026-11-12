import { alertApiError } from '@/src/features/billing/featureLocked';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/src/components/Avatar';
import { appAlert } from '@/src/components/AppDialog';
import { EmptyState } from '@/src/components/EmptyState';
import { ListSkeleton } from '@/src/components/Skeleton';
import { blocksApi, type BlockedUser } from '@/src/api/blocks';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

function blockedOn(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `Blocked ${d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export default function BlocksScreen() {
  const queryClient = useQueryClient();
  const listQuery = useQuery({ queryKey: ['blocks'], queryFn: blocksApi.list });

  const unblockMutation = useMutation({
    mutationFn: (userId: string) => blocksApi.unblock(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['blocks'] });
      void queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: (error) => alertApiError(error),
  });

  const confirmUnblock = (u: BlockedUser) =>
    appAlert(`Unblock ${u.fullName || 'this member'}?`, 'They will be able to find you, connect and message you again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unblock', onPress: () => unblockMutation.mutate(u.userId) },
    ]);

  if (listQuery.isLoading) return <ListSkeleton rows={4} />;

  const data = listQuery.data ?? [];

  return (
    <FlatList
      style={styles.screen}
      data={data}
      keyExtractor={(item) => item.userId}
      contentContainerStyle={data.length === 0 ? styles.empty : styles.list}
      refreshControl={
        <RefreshControl refreshing={listQuery.isRefetching} onRefresh={() => listQuery.refetch()} tintColor={colors.primary} />
      }
      ListEmptyComponent={<EmptyState title="No blocked users" message="People you block will appear here." />}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Pressable
            style={styles.person}
            onPress={() => router.push(`/public-profile/${item.userId}` as Href)}
            accessibilityRole="button"
          >
            <Avatar name={item.fullName || 'Member'} size={44} />
            <View style={styles.copy}>
              <Text style={styles.name} numberOfLines={1}>
                {item.fullName || 'Member'}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {[item.role, blockedOn(item.blockedAt)].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.unblock, pressed && { opacity: 0.7 }]}
            onPress={() => confirmUnblock(item)}
            disabled={unblockMutation.isPending && unblockMutation.variables === item.userId}
            accessibilityRole="button"
          >
            <Text style={styles.unblockText}>Unblock</Text>
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md },
  empty: { flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
  },
  person: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  copy: { flex: 1, minWidth: 0 },
  name: { fontFamily: typography.fontFamily.semibold, fontSize: 15, color: colors.text },
  meta: { marginTop: 2, fontFamily: typography.fontFamily.regular, fontSize: 12, color: colors.textSecondary },
  unblock: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  unblockText: { fontFamily: typography.fontFamily.semibold, fontSize: 13, color: colors.primary },
});
