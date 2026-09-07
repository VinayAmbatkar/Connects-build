import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/src/components/Avatar';
import { BottomSheet } from '@/src/components/BottomSheet';
import { EmptyState, LoadingState } from '@/src/components/EmptyState';
import { connectionsApi } from '@/src/api/connections';
import { getErrorMessage } from '@/src/api/client';
import { formatRelativeTime } from '@/src/features/profile/profileFormat';
import type { Connection } from '@/src/types/api';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

type TabId = 'requested' | 'sent' | 'connections';
type SheetKind = 'withdraw' | 'sentMenu' | 'requestMenu' | 'reject' | 'remove' | null;

function statusOf(item: Connection) {
  return String(item.status ?? '').toUpperCase();
}

function isAccepted(item: Connection) {
  const status = statusOf(item);
  return status === 'ACCEPTED' || status === 'CONNECTED';
}

function displayName(item: Connection) {
  return item.otherPartyName ?? item.fullName ?? 'Member';
}

function displayRole(item: Connection) {
  return item.otherPartyRole ?? item.role ?? '';
}

function displayCompany(item: Connection) {
  return item.otherPartyCompany ?? item.company ?? '';
}

function displayHeadline(item: Connection) {
  const role = displayRole(item);
  const company = displayCompany(item);
  const location =
    item.otherPartyLocation ??
    (typeof item.location === 'string' ? item.location : '');
  const right = company || location;
  if (role && right) return `${role} - ${right}`;
  return role || right || '';
}

function otherPartyId(item: Connection) {
  return item.otherPartyId ?? item.userId ?? item.requesterId ?? item.recipientId;
}

function mutualLabel(item: Connection) {
  const count =
    typeof item.mutualConnections === 'number'
      ? item.mutualConnections
      : typeof item.mutualCount === 'number'
        ? item.mutualCount
        : null;
  if (count == null) return null;
  if (count === 1) return '1 mutual connection';
  return `${count} mutual connections`;
}

function connectedLabel(item: Connection) {
  const when = formatRelativeTime(item.updatedAt ?? item.createdAt);
  if (!when) return 'Connected';
  if (when === 'Just now') return 'Connected just now';
  return `Connected ${when} ago`;
}

export function ConnectionsScreen() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabId>('requested');
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [sheetKind, setSheetKind] = useState<SheetKind>(null);
  const [sheetItem, setSheetItem] = useState<Connection | null>(null);

  const closeSheet = () => {
    setSheetKind(null);
    setSheetItem(null);
  };

  const openSheet = (kind: Exclude<SheetKind, null>, item: Connection) => {
    setSheetItem(item);
    setSheetKind(kind);
  };

  const summaryQuery = useQuery({
    queryKey: ['connections-summary'],
    queryFn: connectionsApi.summary,
    staleTime: 30_000,
  });

  const requestedQuery = useQuery({
    queryKey: ['connections', 'received'],
    queryFn: () => connectionsApi.list({ filter: 'received', limit: 100 }),
    enabled: tab === 'requested',
    staleTime: 30_000,
  });

  const sentQuery = useQuery({
    queryKey: ['connections', 'sent'],
    queryFn: () => connectionsApi.list({ filter: 'sent', limit: 100 }),
    enabled: tab === 'sent',
    staleTime: 30_000,
  });

  const acceptedQuery = useQuery({
    queryKey: ['connections', 'accepted'],
    queryFn: () => connectionsApi.list({ filter: 'accepted', limit: 100 }),
    enabled: tab === 'connections',
    staleTime: 30_000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['connections'] });
    void queryClient.invalidateQueries({ queryKey: ['connections-summary'] });
    void queryClient.invalidateQueries({ queryKey: ['connections-count'] });
  };

  const acceptMutation = useMutation({
    mutationFn: connectionsApi.accept,
    onMutate: (id) => setBusyId(id),
    onSuccess: () => invalidate(),
    onError: (error) => Alert.alert('Error', getErrorMessage(error)),
    onSettled: () => setBusyId(null),
  });

  const rejectMutation = useMutation({
    mutationFn: connectionsApi.reject,
    onMutate: (id) => setBusyId(id),
    onSuccess: () => invalidate(),
    onError: (error) => Alert.alert('Error', getErrorMessage(error)),
    onSettled: () => setBusyId(null),
  });

  const removeMutation = useMutation({
    mutationFn: connectionsApi.remove,
    onMutate: (id) => setBusyId(id),
    onSuccess: () => invalidate(),
    onError: (error) => Alert.alert('Error', getErrorMessage(error)),
    onSettled: () => setBusyId(null),
  });

  const requested = useMemo(() => {
    const list = Array.isArray(requestedQuery.data) ? requestedQuery.data : [];
    // Prefer API filter; keep only pending as a safety net.
    return list.filter((item) => statusOf(item) === 'PENDING');
  }, [requestedQuery.data]);

  const sent = useMemo(() => {
    const list = Array.isArray(sentQuery.data) ? sentQuery.data : [];
    return list.filter((item) => statusOf(item) === 'PENDING');
  }, [sentQuery.data]);

  const connections = useMemo(() => {
    const list = Array.isArray(acceptedQuery.data) ? acceptedQuery.data : [];
    return list.filter(isAccepted);
  }, [acceptedQuery.data]);

  const requestedCount = summaryQuery.data?.receivedRequests ?? 0;
  const sentCount = summaryQuery.data?.sentRequests ?? 0;

  const activeQuery =
    tab === 'requested'
      ? requestedQuery
      : tab === 'sent'
        ? sentQuery
        : acceptedQuery;

  const openProfile = (item: Connection) => {
    const id = otherPartyId(item);
    if (id == null) return;
    closeSheet();
    router.push(`/public-profile/${id}` as Href);
  };

  const runWithdraw = () => {
    if (!sheetItem) return;
    const id = sheetItem.id;
    closeSheet();
    removeMutation.mutate(id);
  };

  const runReject = () => {
    if (!sheetItem) return;
    const id = sheetItem.id;
    closeSheet();
    rejectMutation.mutate(id);
  };

  const runRemove = () => {
    if (!sheetItem) return;
    const id = sheetItem.id;
    closeSheet();
    removeMutation.mutate(id);
  };

  const refreshing =
    activeQuery.isRefetching || summaryQuery.isRefetching;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void activeQuery.refetch();
              void summaryQuery.refetch();
            }}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={styles.title}>Network</Text>

        <View style={styles.tabs}>
          <TopTab
            label="Requested"
            active={tab === 'requested'}
            badge={requestedCount}
            onPress={() => setTab('requested')}
          />
          <TopTab
            label="Sent"
            active={tab === 'sent'}
            badge={sentCount}
            onPress={() => setTab('sent')}
          />
          <TopTab
            label="My connections"
            active={tab === 'connections'}
            onPress={() => setTab('connections')}
          />
        </View>

        {tab === 'requested' ? (
          <>
            <SectionHeader
              title="Connection Requests"
              count={
                requestedQuery.isLoading ? undefined : requested.length
              }
            />
            {requestedQuery.isLoading ? (
              <LoadingState />
            ) : requestedQuery.isError ? (
              <EmptyState
                title="Could not load requests"
                message={getErrorMessage(requestedQuery.error)}
              />
            ) : requested.length ? (
              requested.map((item, index) => (
                <RequestRow
                  key={String(item.id)}
                  item={item}
                  busy={busyId === item.id}
                  showDivider={index < requested.length - 1}
                  onPress={() => openProfile(item)}
                  onMore={() => openSheet('requestMenu', item)}
                  onAccept={() => acceptMutation.mutate(item.id)}
                  onReject={() => openSheet('reject', item)}
                />
              ))
            ) : (
              <EmptyState
                title="No requests"
                message="When someone wants to connect, their request will show up here."
              />
            )}
          </>
        ) : null}

        {tab === 'sent' ? (
          <>
            <SectionHeader
              title="Sent Requests"
              count={sentQuery.isLoading ? undefined : sent.length}
            />
            {sentQuery.isLoading ? (
              <LoadingState />
            ) : sentQuery.isError ? (
              <EmptyState
                title="Could not load sent requests"
                message={getErrorMessage(sentQuery.error)}
              />
            ) : sent.length ? (
              sent.map((item, index) => (
                <SentRow
                  key={`sent-${String(item.id)}`}
                  item={item}
                  busy={busyId === item.id}
                  showDivider={index < sent.length - 1}
                  onPress={() => openProfile(item)}
                  onMore={() => openSheet('sentMenu', item)}
                  onWithdraw={() => openSheet('withdraw', item)}
                />
              ))
            ) : (
              <EmptyState
                title="No sent requests"
                message="Requests you send will appear here until they are accepted."
              />
            )}
          </>
        ) : null}

        {tab === 'connections' ? (
          <>
            <SectionHeader
              title="My Connections"
              count={
                acceptedQuery.isLoading ? undefined : connections.length
              }
            />
            {acceptedQuery.isLoading ? (
              <LoadingState />
            ) : acceptedQuery.isError ? (
              <EmptyState
                title="Could not load connections"
                message={getErrorMessage(acceptedQuery.error)}
              />
            ) : connections.length ? (
              connections.map((item, index) => (
                <ConnectionRow
                  key={String(item.id)}
                  item={item}
                  showDivider={index < connections.length - 1}
                  onPress={() => openProfile(item)}
                  onMore={() => openSheet('remove', item)}
                />
              ))
            ) : (
              <EmptyState
                title="No connections yet"
                message="Find professionals and send connection requests to grow your network."
              />
            )}
          </>
        ) : null}
      </ScrollView>

      <BottomSheet
        visible={sheetKind === 'withdraw' && !!sheetItem}
        title="Withdraw invitation"
        subtitle="Do you want to withdraw this invitation?"
        onClose={closeSheet}
        footer={
          <View style={styles.sheetActions}>
            <Pressable style={styles.sheetCancelBtn} onPress={closeSheet}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.sheetConfirmBtn} onPress={runWithdraw}>
              <Text style={styles.sheetConfirmText}>Withdraw</Text>
            </Pressable>
          </View>
        }
      >
        <View />
      </BottomSheet>

      <BottomSheet
        visible={sheetKind === 'sentMenu' && !!sheetItem}
        title={sheetItem ? displayName(sheetItem) : 'Options'}
        onClose={closeSheet}
      >
        <Pressable
          style={styles.menuRow}
          onPress={() => sheetItem && openProfile(sheetItem)}
        >
          <Ionicons name="person-outline" size={20} color={colors.text} />
          <Text style={styles.menuRowText}>View profile</Text>
        </Pressable>
        <Pressable
          style={styles.menuRow}
          onPress={() => {
            if (!sheetItem) return;
            openSheet('withdraw', sheetItem);
          }}
        >
          <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
          <Text style={[styles.menuRowText, styles.menuDanger]}>Withdraw</Text>
        </Pressable>
      </BottomSheet>

      <BottomSheet
        visible={sheetKind === 'requestMenu' && !!sheetItem}
        title={sheetItem ? displayName(sheetItem) : 'Options'}
        onClose={closeSheet}
      >
        <Pressable
          style={styles.menuRow}
          onPress={() => sheetItem && openProfile(sheetItem)}
        >
          <Ionicons name="person-outline" size={20} color={colors.text} />
          <Text style={styles.menuRowText}>View profile</Text>
        </Pressable>
        <Pressable
          style={styles.menuRow}
          onPress={() => {
            if (!sheetItem) return;
            openSheet('reject', sheetItem);
          }}
        >
          <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
          <Text style={[styles.menuRowText, styles.menuDanger]}>Reject</Text>
        </Pressable>
      </BottomSheet>

      <BottomSheet
        visible={sheetKind === 'reject' && !!sheetItem}
        title="Reject request"
        subtitle={
          sheetItem
            ? `Reject the connection request from ${displayName(sheetItem)}?`
            : undefined
        }
        onClose={closeSheet}
        footer={
          <View style={styles.sheetActions}>
            <Pressable style={styles.sheetCancelBtn} onPress={closeSheet}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.sheetConfirmBtn} onPress={runReject}>
              <Text style={styles.sheetConfirmText}>Reject</Text>
            </Pressable>
          </View>
        }
      >
        <Text style={styles.sheetBody}>
          They won’t be notified that you declined.
        </Text>
      </BottomSheet>

      <BottomSheet
        visible={sheetKind === 'remove' && !!sheetItem}
        title="Remove connection"
        subtitle={
          sheetItem
            ? `Remove ${displayName(sheetItem)} from your network?`
            : undefined
        }
        onClose={closeSheet}
        footer={
          <View style={styles.sheetActions}>
            <Pressable style={styles.sheetCancelBtn} onPress={closeSheet}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.sheetConfirmBtn} onPress={runRemove}>
              <Text style={styles.sheetConfirmText}>Remove</Text>
            </Pressable>
          </View>
        }
      >
        <Text style={styles.sheetBody}>
          You can always send a new request later.
        </Text>
      </BottomSheet>
    </View>
  );
}

function TopTab({
  label,
  active,
  badge,
  onPress,
}: {
  label: string;
  active: boolean;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.topTab}>
      <View style={styles.topTabInner}>
        <Text style={[styles.topTabText, active && styles.topTabTextActive]}>
          {label}
        </Text>
        {badge != null && badge > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.topTabLine, active && styles.topTabLineActive]} />
    </Pressable>
  );
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {count != null ? (
        <Text style={styles.sectionCount}>{count}</Text>
      ) : null}
    </View>
  );
}

function RequestRow({
  item,
  busy,
  showDivider,
  onPress,
  onMore,
  onAccept,
  onReject,
}: {
  item: Connection;
  busy?: boolean;
  showDivider?: boolean;
  onPress: () => void;
  onMore: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  const name = displayName(item);
  const headline = displayHeadline(item);
  const mutual = mutualLabel(item);

  return (
    <View style={[styles.row, showDivider && styles.rowDivider]}>
      <Pressable onPress={onPress} style={styles.rowTop}>
        <Avatar name={name} size={52} />
        <View style={styles.rowCopy}>
          <Text style={styles.rowName}>{name}</Text>
          {headline ? (
            <Text style={styles.rowHeadline} numberOfLines={1}>
              {headline}
            </Text>
          ) : null}
          {mutual ? <Text style={styles.rowMeta}>{mutual}</Text> : null}
        </View>
        <Pressable onPress={onMore} hitSlop={10} style={styles.moreBtn}>
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
        </Pressable>
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          style={[styles.acceptBtn, busy && styles.btnDisabled]}
          onPress={onAccept}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.acceptText}>Accept</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.rejectBtn, busy && styles.btnDisabled]}
          onPress={onReject}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text style={styles.rejectText}>Reject</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function SentRow({
  item,
  busy,
  showDivider,
  onPress,
  onMore,
  onWithdraw,
}: {
  item: Connection;
  busy?: boolean;
  showDivider?: boolean;
  onPress: () => void;
  onMore: () => void;
  onWithdraw: () => void;
}) {
  const name = displayName(item);
  const headline = displayHeadline(item);
  const when = formatRelativeTime(item.createdAt ?? item.updatedAt);

  return (
    <View style={[styles.row, showDivider && styles.rowDivider]}>
      <Pressable onPress={onPress} style={styles.rowTop}>
        <Avatar name={name} size={52} />
        <View style={styles.rowCopy}>
          <Text style={styles.rowName}>{name}</Text>
          {headline ? (
            <Text style={styles.rowHeadline} numberOfLines={1}>
              {headline}
            </Text>
          ) : null}
          <Text style={styles.rowMeta}>
            Request sent{when ? ` · ${when}` : ''}
          </Text>
        </View>
        <Pressable onPress={onMore} hitSlop={10} style={styles.moreBtn}>
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
        </Pressable>
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          style={[styles.rejectBtn, busy && styles.btnDisabled]}
          onPress={onWithdraw}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text style={styles.rejectText}>Withdraw</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function ConnectionRow({
  item,
  showDivider,
  onPress,
  onMore,
}: {
  item: Connection;
  showDivider?: boolean;
  onPress: () => void;
  onMore: () => void;
}) {
  const name = displayName(item);
  const headline = displayHeadline(item);

  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, showDivider && styles.rowDivider]}
    >
      <View style={styles.rowTop}>
        <Avatar name={name} size={52} />
        <View style={styles.rowCopy}>
          <Text style={styles.rowName}>{name}</Text>
          {headline ? (
            <Text style={styles.rowHeadline} numberOfLines={1}>
              {headline}
            </Text>
          ) : null}
          <View style={styles.connectedRow}>
            <View style={styles.connectedDot} />
            <Text style={styles.rowMeta}>{connectedLabel(item)}</Text>
          </View>
        </View>
        <Pressable onPress={onMore} hitSlop={10} style={styles.moreBtn}>
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: {
    paddingBottom: spacing.xxl,
  },
  title: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    fontFamily: typography.fontFamily.bold,
    fontSize: 28,
    color: colors.text,
  },
  tabs: {
    marginTop: spacing.md,
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  topTab: {
    flex: 1,
    alignItems: 'center',
  },
  topTabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  topTabText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 13,
    color: colors.textMuted,
  },
  topTabTextActive: {
    color: colors.text,
  },
  topTabLine: {
    height: 3,
    width: '100%',
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  topTabLineActive: {
    backgroundColor: colors.primary,
  },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 10,
    color: colors.white,
  },
  sectionHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.text,
  },
  sectionCount: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  rowCopy: { flex: 1, minWidth: 0 },
  rowName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 15,
    color: colors.text,
  },
  rowHeadline: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  rowMeta: {
    marginTop: 3,
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  moreBtn: {
    padding: 4,
  },
  actions: {
    marginTop: 12,
    marginLeft: 64,
    flexDirection: 'row',
    gap: 10,
  },
  acceptBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 14,
    color: colors.white,
  },
  rejectBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 14,
    color: colors.text,
  },
  btnDisabled: { opacity: 0.7 },
  connectedRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  connectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  sheetBody: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
  },
  sheetCancelBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCancelText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    color: colors.primary,
  },
  sheetConfirmBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetConfirmText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    color: colors.white,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  menuRowText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 16,
    color: colors.text,
  },
  menuDanger: {
    color: colors.danger,
  },
});
