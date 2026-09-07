import { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/src/components/Button';
import { EmptyState, LoadingState } from '@/src/components/EmptyState';
import { TextField } from '@/src/components/TextField';
import { getErrorMessage } from '@/src/api/client';
import { projectsApi } from '@/src/api/projects';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

export default function ProjectsScreen() {
  const [name, setName] = useState('');
  const [locationId, setLocationId] = useState('');
  const [sizeSqft, setSizeSqft] = useState('');
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.listMine,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      projectsApi.create({
        name: name.trim(),
        locationId: locationId.trim(),
        sizeSqft: Number(sizeSqft) || 0,
      }),
    onSuccess: () => {
      setName('');
      setLocationId('');
      setSizeSqft('');
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error) => Alert.alert('Error', getErrorMessage(error)),
  });

  if (listQuery.isLoading) return <LoadingState />;
  const data = Array.isArray(listQuery.data) ? listQuery.data : [];

  return (
    <View style={styles.screen}>
      <View style={styles.form}>
        <Text style={styles.heading}>Add project</Text>
        <TextField label="Name" value={name} onChangeText={setName} />
        <TextField label="Location ID" value={locationId} onChangeText={setLocationId} />
        <TextField
          label="Size (sqft)"
          keyboardType="number-pad"
          value={sizeSqft}
          onChangeText={setSizeSqft}
        />
        <Button
          title="Create"
          loading={createMutation.isPending}
          onPress={() => {
            if (!name.trim()) {
              Alert.alert('Name required');
              return;
            }
            createMutation.mutate();
          }}
        />
      </View>
      <FlatList
        data={data}
        keyExtractor={(item, index) => String(item.id ?? index)}
        contentContainerStyle={data.length === 0 ? styles.empty : styles.list}
        ListEmptyComponent={<EmptyState title="No projects" message="Create your first project." />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.name}</Text>
            <Text style={styles.meta}>
              {[item.locationId, item.sizeSqft ? `${item.sizeSqft} sqft` : null]
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
