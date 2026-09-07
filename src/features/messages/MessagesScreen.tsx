import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/src/components/Avatar';
import { EmptyState, LoadingState } from '@/src/components/EmptyState';
import { messagesApi } from '@/src/api/messages';
import { useSSE } from '@/src/hooks/useSSE';
import type { Conversation } from '@/src/types/api';
import {
  conversationName,
  conversationPreview,
  conversationRoleLine,
  formatConversationTime,
} from '@/src/features/messages/messageFormat';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

type FilterId = 'all' | 'unread' | 'requests';

export function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const searchRef = useRef<TextInput>(null);
  const [filter, setFilter] = useState<FilterId>('all');
  const [query, setQuery] = useState('');

  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: messagesApi.conversations,
  });

  useSSE({
    path: '/messages/stream',
    onMessage: () => {
      void conversationsQuery.refetch();
    },
  });

  const conversations = useMemo(() => {
    const list = Array.isArray(conversationsQuery.data)
      ? conversationsQuery.data
      : [];
    return [...list].sort((a, b) => {
      const at = new Date(a.lastMessageAt ?? a.updatedAt ?? 0).getTime();
      const bt = new Date(b.lastMessageAt ?? b.updatedAt ?? 0).getTime();
      return bt - at;
    });
  }, [conversationsQuery.data]);

  const unreadCount = useMemo(
    () => conversations.filter((c) => Number(c.unreadCount ?? 0) > 0).length,
    [conversations],
  );

  const filtered = useMemo(() => {
    let list = conversations;
    if (filter === 'unread') {
      list = list.filter((c) => Number(c.unreadCount ?? 0) > 0);
    } else if (filter === 'requests') {
      list = [];
    }

    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
      const name = conversationName(c).toLowerCase();
      const role = conversationRoleLine(c).toLowerCase();
      const preview = conversationPreview(c).toLowerCase();
      return name.includes(q) || role.includes(q) || preview.includes(q);
    });
  }, [conversations, filter, query]);

  if (conversationsQuery.isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <LoadingState />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Messages</Text>
        <View style={styles.topActions}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => searchRef.current?.focus()}
            hitSlop={8}
            accessibilityLabel="Search messages"
          >
            <Ionicons name="search-outline" size={24} color={colors.text} />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            onPress={() => router.push('/new-message' as Href)}
            hitSlop={8}
            accessibilityLabel="New message"
          >
            <Ionicons name="create-outline" size={24} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item, index) => String(item.id ?? index)}
        contentContainerStyle={
          filtered.length === 0 ? styles.emptyList : styles.list
        }
        refreshControl={
          <RefreshControl
            refreshing={conversationsQuery.isRefetching}
            onRefresh={() => conversationsQuery.refetch()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.filters}>
              <FilterChip
                label="All"
                count={conversations.length}
                active={filter === 'all'}
                onPress={() => setFilter('all')}
              />
              <FilterChip
                label="Unread"
                count={unreadCount}
                active={filter === 'unread'}
                onPress={() => setFilter('unread')}
              />
              <FilterChip
                label="Requests"
                count={0}
                active={filter === 'requests'}
                onPress={() => setFilter('requests')}
              />
            </View>

            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                ref={searchRef}
                value={query}
                onChangeText={setQuery}
                placeholder="Search messages or people..."
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={
              filter === 'requests'
                ? 'No message requests'
                : filter === 'unread'
                  ? 'No unread messages'
                  : 'No conversations'
            }
            message={
              filter === 'requests'
                ? 'Message requests from people outside your network will show up here.'
                : 'Start a chat from a connection or tap the compose button.'
            }
          />
        }
        renderItem={({ item }) => (
          <ConversationRow
            item={item}
            onPress={() => router.push(`/chat/${item.id}` as Href)}
          />
        )}
      />
    </View>
  );
}

function FilterChip({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
      <View style={[styles.chipBadge, active && styles.chipBadgeActive]}>
        <Text style={[styles.chipBadgeText, active && styles.chipBadgeTextActive]}>
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

function ConversationRow({
  item,
  onPress,
}: {
  item: Conversation;
  onPress: () => void;
}) {
  const name = conversationName(item);
  const roleLine = conversationRoleLine(item);
  const preview = conversationPreview(item);
  const time = formatConversationTime(item.lastMessageAt ?? item.updatedAt);
  const unread = Number(item.unreadCount ?? 0);
  const online = Boolean(item.online ?? item.otherPartyOnline);

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.avatarWrap}>
        <Avatar name={name} size={52} />
        {online ? <View style={styles.onlineDot} /> : null}
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {time ? <Text style={styles.time}>{time}</Text> : null}
        </View>
        {roleLine ? (
          <Text style={styles.role} numberOfLines={1}>
            {roleLine}
          </Text>
        ) : null}
        <View style={styles.rowBottom}>
          <Text
            style={[styles.preview, unread > 0 && styles.previewUnread]}
            numberOfLines={1}
          >
            {preview}
          </Text>
          {unread > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {unread > 99 ? '99+' : unread}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  topBar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingBottom: spacing.xxl },
  emptyList: { flexGrow: 1, paddingBottom: spacing.xxl },
  headerBlock: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 28,
    color: colors.text,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 13,
    color: colors.text,
  },
  chipTextActive: {
    color: colors.white,
  },
  chipBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  chipBadgeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    color: colors.text,
  },
  chipBadgeTextActive: {
    color: colors.white,
  },
  searchBar: {
    marginTop: spacing.md,
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.white,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
    color: colors.text,
  },
  time: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  role: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  rowBottom: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  preview: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  previewUnread: {
    fontFamily: typography.fontFamily.medium,
    color: colors.text,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    color: colors.white,
  },
});
