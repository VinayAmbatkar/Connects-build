import { alertApiError } from '@/src/features/billing/featureLocked';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/src/components/Avatar';
import { EmptyState } from '@/src/components/EmptyState';
import { connectionsApi } from '@/src/api/connections';
import { groupsApi, MAX_GROUP_MEMBERS } from '@/src/api/messages';
import type { Connection } from '@/src/types/api';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

import { ListSkeleton } from '@/src/components/Skeleton';
type Props = {
  /** When set, the screen adds members to this existing group instead of
   *  creating a new one. */
  addToGroupId?: string;
};

function personId(c: Connection): string {
  return String(c.otherPartyId ?? c.userId ?? '');
}

function personName(c: Connection): string {
  return c.otherPartyName ?? c.fullName ?? 'Member';
}

function personRole(c: Connection): string {
  const role = c.otherPartyRole ?? c.role ?? '';
  const company = c.otherPartyCompany ?? c.company ?? '';
  if (role && company) return `${role} · ${company}`;
  return role || company || '';
}

/**
 * Create a group chat, or add people to one. Only accepted connections can
 * be picked (the backend allows nobody else), and the counter -- which
 * includes you -- stops at MAX_GROUP_MEMBERS.
 *
 * Plan gating (group_chat is Premium) is checked before this screen opens
 * and again by the backend; a locked response raises the shared
 * feature-locked prompt via alertApiError.
 */
export function NewGroupScreen({ addToGroupId }: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const adding = Boolean(addToGroupId);
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const connectionsQuery = useQuery({
    queryKey: ['connections', 'accepted'],
    queryFn: () => connectionsApi.list({ filter: 'accepted', limit: 100 }),
  });

  const groupQuery = useQuery({
    queryKey: ['group', addToGroupId],
    queryFn: () => groupsApi.get(addToGroupId!),
    enabled: adding,
  });

  const existing = useMemo(
    () => new Set((groupQuery.data?.members ?? []).map((m) => m.userId)),
    [groupQuery.data],
  );
  const base = adding ? groupQuery.data?.memberCount ?? 1 : 1; // you
  const total = base + picked.size;
  const full = total >= MAX_GROUP_MEMBERS;

  const people = useMemo(() => {
    const list = (Array.isArray(connectionsQuery.data) ? connectionsQuery.data : []).filter(
      (c) => personId(c) !== '',
    );
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) => personName(c).toLowerCase().includes(q) || personRole(c).toLowerCase().includes(q),
    );
  }, [connectionsQuery.data, query]);

  const toggle = (id: string) => {
    if (existing.has(id)) return;
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (!full) next.add(id);
      return next;
    });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      adding
        ? groupsApi.addMembers(addToGroupId!, [...picked])
        : groupsApi.create(name.trim(), [...picked]),
    onSuccess: (group) => {
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
      void queryClient.invalidateQueries({ queryKey: ['group', String(group.id)] });
      if (adding) router.back();
      else router.replace(`/group/${group.id}` as Href);
    },
    onError: (error) => alertApiError(error, "Couldn't save the group."),
  });

  const canSave = picked.size > 0 && (adding || name.trim().length > 0) && !saveMutation.isPending;

  if (connectionsQuery.isLoading || (adding && groupQuery.isLoading)) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <ListSkeleton />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 8) }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{adding ? 'Add members' : 'New group'}</Text>
        <Pressable
          onPress={() => saveMutation.mutate()}
          disabled={!canSave}
          hitSlop={10}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel={adding ? 'Add' : 'Create'}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={[styles.saveText, !canSave && styles.saveDisabled]}>{adding ? 'Add' : 'Create'}</Text>
          )}
        </Pressable>
      </View>

      {!adding ? (
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Group name (e.g. Site team – Tower B)"
          placeholderTextColor={colors.textMuted}
          style={styles.nameInput}
          maxLength={80}
        />
      ) : null}

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search your connections"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          clearButtonMode="while-editing"
        />
      </View>

      <Text style={[styles.counter, full && styles.counterFull]}>
        {total} / {MAX_GROUP_MEMBERS} members{full ? ' · Group is full' : ''}
      </Text>

      <FlatList
        data={people}
        keyExtractor={(c) => personId(c)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={people.length === 0 ? styles.empty : styles.list}
        ListEmptyComponent={
          <EmptyState
            title={query.trim() ? 'No matches' : 'No connections yet'}
            message={query.trim() ? 'Try another name.' : 'You can only add accepted connections to a group.'}
          />
        }
        renderItem={({ item }) => {
          const id = personId(item);
          const inGroup = existing.has(id);
          const on = picked.has(id) || inGroup;
          const disabled = inGroup || (full && !picked.has(id));
          return (
            <Pressable
              style={[styles.row, disabled && styles.rowDisabled]}
              onPress={() => toggle(id)}
              disabled={disabled}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on, disabled }}
            >
              <Avatar name={personName(item)} size={44} />
              <View style={styles.rowCopy}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {personName(item)}
                </Text>
                <Text style={styles.rowRole} numberOfLines={1}>
                  {inGroup ? 'Already in the group' : personRole(item)}
                </Text>
              </View>
              <Ionicons
                name={on ? 'checkbox' : 'square-outline'}
                size={22}
                color={on ? colors.primary : colors.textMuted}
              />
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerBtn: { minWidth: 56, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    color: colors.text,
  },
  saveText: { fontFamily: typography.fontFamily.bold, fontSize: 15, color: colors.primary },
  saveDisabled: { color: colors.textMuted },
  nameInput: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: typography.fontFamily.regular,
    fontSize: 15,
    color: colors.text,
  },
  searchBar: {
    marginHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 10,
  },
  counter: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    fontFamily: typography.fontFamily.semibold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  counterFull: { color: colors.danger },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  empty: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowDisabled: { opacity: 0.5 },
  rowCopy: { flex: 1, minWidth: 0 },
  rowName: { fontFamily: typography.fontFamily.semibold, fontSize: 15, color: colors.text },
  rowRole: { marginTop: 2, fontFamily: typography.fontFamily.regular, fontSize: 13, color: colors.textSecondary },
});
