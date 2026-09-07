import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { EmptyState, LoadingState } from '@/src/components/EmptyState';
import { getErrorMessage } from '@/src/api/client';
import { connectionsApi } from '@/src/api/connections';
import { messagesApi } from '@/src/api/messages';
import { searchApi } from '@/src/api/search';
import type { Connection, ProfessionalSearchResult } from '@/src/types/api';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

function connectionName(item: Connection) {
  return item.otherPartyName ?? item.fullName ?? 'Member';
}

function connectionRole(item: Connection) {
  const role = item.otherPartyRole ?? item.role ?? '';
  const company = item.otherPartyCompany ?? item.company ?? '';
  if (role && company) return `${role} · ${company}`;
  return role || company || '';
}

function connectionUserId(item: Connection) {
  return item.otherPartyId ?? item.userId ?? item.recipientId ?? item.requesterId;
}

function searchName(item: ProfessionalSearchResult) {
  return item.fullName ?? item.name ?? 'Professional';
}

function searchRole(item: ProfessionalSearchResult) {
  const role = item.role ?? '';
  const company = item.company ?? '';
  if (role && company) return `${role} · ${company}`;
  return role || company || item.location || '';
}

export function NewMessageScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [showAllConnections, setShowAllConnections] = useState(false);
  const [showAllSuggested, setShowAllSuggested] = useState(false);

  const connectionsQuery = useQuery({
    queryKey: ['connections', 'accepted'],
    queryFn: () => connectionsApi.list({ filter: 'accepted', limit: 100 }),
  });

  const suggestedQuery = useQuery({
    queryKey: ['messages-suggested', query],
    queryFn: () =>
      query.trim()
        ? searchApi.freeText(query.trim(), 20, 1)
        : searchApi.freeText('', 12, 1),
  });

  const connections = useMemo(() => {
    const list = Array.isArray(connectionsQuery.data) ? connectionsQuery.data : [];
    const q = query.trim().toLowerCase();
    const filtered = !q
      ? list
      : list.filter((item) => {
          const name = connectionName(item).toLowerCase();
          const role = connectionRole(item).toLowerCase();
          return name.includes(q) || role.includes(q);
        });
    return filtered;
  }, [connectionsQuery.data, query]);

  const connectionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of connections) {
      const id = connectionUserId(item);
      if (id != null) ids.add(String(id));
    }
    return ids;
  }, [connections]);

  const suggested = useMemo(() => {
    const results = Array.isArray(suggestedQuery.data) ? suggestedQuery.data : [];
    return results.filter((item) => {
      const id = item.userId ?? item.id;
      if (id == null) return false;
      return !connectionIds.has(String(id));
    });
  }, [suggestedQuery.data, connectionIds]);

  const startMutation = useMutation({
    mutationFn: (recipientId: string | number) =>
      messagesApi.startConversation(recipientId),
    onSuccess: (conversation) => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      router.replace(`/chat/${conversation.id}` as Href);
    },
    onError: (error) => Alert.alert('Error', getErrorMessage(error)),
  });

  const recent = showAllConnections ? connections : connections.slice(0, 5);
  const suggestedSlice = showAllSuggested ? suggested : suggested.slice(0, 5);

  const openChat = (recipientId: string | number | null | undefined) => {
    if (recipientId == null || startMutation.isPending) return;
    setSelectedId(recipientId);
    startMutation.mutate(recipientId);
  };

  if (connectionsQuery.isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <LoadingState />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 8) }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>New Message</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, company or role..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={[]}
        keyExtractor={() => 'header'}
        renderItem={null}
        ListHeaderComponent={
          <View style={styles.content}>
            <SectionHeader
              title="Recent Connections"
              showSeeAll={connections.length > 5}
              expanded={showAllConnections}
              onSeeAll={() => setShowAllConnections((v) => !v)}
            />

            {recent.length === 0 ? (
              <Text style={styles.emptyHint}>
                No accepted connections yet. Connect with professionals to message them.
              </Text>
            ) : (
              recent.map((item) => {
                const id = connectionUserId(item);
                const selected = id != null && String(selectedId) === String(id);
                return (
                  <Pressable
                    key={String(item.id ?? id)}
                    style={styles.row}
                    onPress={() => openChat(id)}
                    disabled={startMutation.isPending}
                  >
                    <Avatar name={connectionName(item)} size={48} />
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {connectionName(item)}
                      </Text>
                      {connectionRole(item) ? (
                        <Text style={styles.rowRole} numberOfLines={1}>
                          {connectionRole(item)}
                        </Text>
                      ) : null}
                    </View>
                    {startMutation.isPending && selected ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <View style={[styles.radio, selected && styles.radioSelected]}>
                        {selected ? <View style={styles.radioDot} /> : null}
                      </View>
                    )}
                  </Pressable>
                );
              })
            )}

            <SectionHeader
              title="Suggested Professionals"
              showSeeAll={suggested.length > 5}
              expanded={showAllSuggested}
              onSeeAll={() => setShowAllSuggested((v) => !v)}
            />

            {suggestedQuery.isLoading ? (
              <ActivityIndicator
                color={colors.primary}
                style={{ marginVertical: spacing.md }}
              />
            ) : suggestedSlice.length === 0 ? (
              <EmptyState
                title="No suggestions"
                message="Try a different search to find professionals."
              />
            ) : (
              suggestedSlice.map((item) => {
                const id = item.userId ?? item.id;
                const busy =
                  startMutation.isPending &&
                  id != null &&
                  String(selectedId) === String(id);
                return (
                  <Pressable
                    key={String(id)}
                    style={styles.row}
                    onPress={() => openChat(id)}
                    disabled={startMutation.isPending}
                  >
                    <Avatar name={searchName(item)} size={48} />
                    <View style={styles.rowCopy}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {searchName(item)}
                      </Text>
                      {searchRole(item) ? (
                        <Text style={styles.rowRole} numberOfLines={1}>
                          {searchRole(item)}
                        </Text>
                      ) : null}
                    </View>
                    {busy ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <View style={styles.plusBtn}>
                        <Ionicons name="add" size={20} color={colors.primary} />
                      </View>
                    )}
                  </Pressable>
                );
              })
            )}
          </View>
        }
      />
    </View>
  );
}

function SectionHeader({
  title,
  showSeeAll,
  expanded,
  onSeeAll,
}: {
  title: string;
  showSeeAll: boolean;
  expanded: boolean;
  onSeeAll: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {showSeeAll ? (
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={styles.seeAll}>{expanded ? 'Show less' : 'See All'}</Text>
        </Pressable>
      ) : null}
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
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    color: colors.text,
  },
  searchBar: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
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
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
    color: colors.text,
  },
  seeAll: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 13,
    color: colors.primary,
  },
  emptyHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  rowCopy: { flex: 1, minWidth: 0 },
  rowName: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    color: colors.text,
  },
  rowRole: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  plusBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
