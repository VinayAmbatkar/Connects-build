import { alertApiError } from '@/src/features/billing/featureLocked';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { usePullToRefresh } from '@/src/hooks/usePullToRefresh';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/src/components/Button';
import { EmptyState } from '@/src/components/EmptyState';
import { TextField } from '@/src/components/TextField';
import { getErrorMessage } from '@/src/api/client';
import { listingsApi } from '@/src/api/listings';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

import { appAlert } from '@/src/components/AppDialog';
import { ListSkeleton } from '@/src/components/Skeleton';
export default function ListingsScreen() {
  const pull = usePullToRefresh();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['listings'],
    queryFn: listingsApi.listMine,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      listingsApi.create({
        title: title.trim(),
        category: category.trim(),
        description: description.trim(),
        price: Number(price) || 0,
      }),
    onSuccess: () => {
      setTitle('');
      setCategory('');
      setDescription('');
      setPrice('');
      void queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
    onError: (error) => alertApiError(error),
  });

  if (listQuery.isLoading) return <ListSkeleton />;
  const data = Array.isArray(listQuery.data) ? listQuery.data : [];

  return (
    <View style={styles.screen}>
      <View style={styles.form}>
        <Text style={styles.heading}>Create listing</Text>
        <TextField label="Title" value={title} onChangeText={setTitle} />
        <TextField label="Category" value={category} onChangeText={setCategory} />
        <TextField label="Description" value={description} onChangeText={setDescription} />
        <TextField
          label="Price"
          keyboardType="number-pad"
          value={price}
          onChangeText={setPrice}
        />
        <Button
          title="Create"
          loading={createMutation.isPending}
          onPress={() => {
            if (!title.trim()) {
              appAlert('Title required');
              return;
            }
            createMutation.mutate();
          }}
        />
      </View>
      <FlatList
        refreshControl={pull.refreshControl}
        data={data}
        keyExtractor={(item, index) => String(item.id ?? index)}
        contentContainerStyle={data.length === 0 ? styles.empty : styles.list}
        ListEmptyComponent={<EmptyState title="No listings" message="Create your first listing." />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>
              {[item.category, item.price != null ? `₹${item.price}` : null]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  form: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  heading: {
    fontFamily: typography.fontFamily.semibold,
    marginBottom: spacing.sm,
    color: colors.text,
  },
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
  meta: { fontFamily: typography.fontFamily.regular, color: colors.textSecondary, marginTop: 4 },
});
