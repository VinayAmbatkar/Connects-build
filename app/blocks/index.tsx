import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/src/components/Button';
import { EmptyState, LoadingState } from '@/src/components/EmptyState';
import { blocksApi } from '@/src/api/blocks';
import { getErrorMessage } from '@/src/api/client';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

type BlockedUser = {
  id?: string | number;
  userId?: string | number;
  fullName?: string;
};

export default function BlocksScreen() {
  const queryClient = useQueryClient();
  const listQuery = useQuery({
    queryKey: ['blocks'],
    queryFn: blocksApi.list,
  });

  const unblockMutation = useMutation({
    mutationFn: (userId: string | number) => blocksApi.unblock(userId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['blocks'] }),
    onError: (error) => Alert.alert('Error', getErrorMessage(error)),
  });

  if (listQuery.isLoading) return <LoadingState />;

  const data: BlockedUser[] = Array.isArray(listQuery.data) ? listQuery.data : [];

  return (
    <FlatList
      style={styles.screen}
      data={data}
      keyExtractor={(item, index) => String(item.id ?? item.userId ?? index)}
      contentContainerStyle={data.length === 0 ? styles.empty : styles.list}
      ListEmptyComponent={
        <EmptyState title="No blocked users" message="People you block will appear here." />
      }
      renderItem={({ item }) => {
        const userId = item.userId ?? item.id;
        return (
          <View style={styles.card}>
            <Text style={styles.title}>{item.fullName ?? `User ${userId}`}</Text>
            <Button
              title="Unblock"
              variant="outline"
              onPress={() => {
                if (userId != null) unblockMutation.mutate(userId);
              }}
              style={styles.btn}
            />
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md },
  empty: { flexGrow: 1 },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  title: { fontFamily: typography.fontFamily.semibold, color: colors.text },
  btn: { marginTop: spacing.sm, minHeight: 44 },
});
