import { alertApiError } from '@/src/features/billing/featureLocked';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/src/components/Button';
import { EmptyState } from '@/src/components/EmptyState';
import { TextField } from '@/src/components/TextField';
import { getErrorMessage } from '@/src/api/client';
import { supportApi } from '@/src/api/support';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

import { appAlert } from '@/src/components/AppDialog';
import { ListSkeleton } from '@/src/components/Skeleton';
export default function SupportScreen() {
  const [type, setType] = useState('bug');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['support-cases'],
    queryFn: supportApi.listCases,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      supportApi.createCase({
        type: type.trim(),
        subject: subject.trim(),
        description: description.trim(),
      }),
    onSuccess: () => {
      setSubject('');
      setDescription('');
      void queryClient.invalidateQueries({ queryKey: ['support-cases'] });
      appAlert('Submitted', 'Your support case was created.');
    },
    onError: (error) => alertApiError(error),
  });

  if (listQuery.isLoading) return <ListSkeleton />;
  const data = Array.isArray(listQuery.data) ? listQuery.data : [];

  return (
    <View style={styles.screen}>
      <View style={styles.form}>
        <Text style={styles.heading}>Raise a case</Text>
        <TextField label="Type" value={type} onChangeText={setType} placeholder="bug / abuse / other" />
        <TextField label="Subject" value={subject} onChangeText={setSubject} />
        <TextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          style={{ minHeight: 90, textAlignVertical: 'top' }}
        />
        <Button
          title="Submit"
          loading={createMutation.isPending}
          onPress={() => {
            if (!subject.trim() || !description.trim()) {
              appAlert('Missing info', 'Subject and description are required.');
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
        ListEmptyComponent={
          <EmptyState title="No cases" message="Your support history will appear here." />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.subject}</Text>
            <Text style={styles.meta}>
              {[item.type, item.status].filter(Boolean).join(' · ')}
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
