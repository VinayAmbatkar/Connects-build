import { alertApiError } from '@/src/features/billing/featureLocked';
import { useState } from 'react';
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/src/components/Avatar';
import { EmptyState } from '@/src/components/EmptyState';
import { groupsApi, MAX_GROUP_MEMBERS } from '@/src/api/messages';
import { useAuthStore } from '@/src/store/authStore';
import type { GroupChat, GroupMember } from '@/src/types/api';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

import { appAlert } from '@/src/components/AppDialog';
import { useFeature } from '@/src/features/billing/useFeature';
import { ListSkeleton } from '@/src/components/Skeleton';
type Props = { groupId: string };

/**
 * Group details: members (admins marked), and -- for admins -- rename, add
 * and remove. Anyone can leave. Adding people needs the group_chat plan
 * feature, same as creating a group.
 */
export function GroupInfoScreen({ groupId }: Props) {
  const queryClient = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState('');

  const groupQuery = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupsApi.get(groupId),
  });
  const canManage = useFeature('group_chat').enabled;

  const group = groupQuery.data;
  const isAdmin = group?.myRole === 'admin';
  const myId = String(me?.id ?? '');

  const onUpdated = (g: GroupChat) => {
    queryClient.setQueryData(['group', groupId], g);
    void queryClient.invalidateQueries({ queryKey: ['groups'] });
  };

  const renameMutation = useMutation({
    mutationFn: (name: string) => groupsApi.rename(groupId, name),
    onSuccess: (g) => {
      setRenaming(false);
      onUpdated(g);
    },
    onError: (error) => alertApiError(error, "Couldn't rename the group."),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => groupsApi.removeMember(groupId, userId),
    onSuccess: onUpdated,
    onError: (error) => alertApiError(error, "Couldn't remove the member."),
  });

  const leaveMutation = useMutation({
    mutationFn: () => groupsApi.leave(groupId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
      router.dismissAll();
      router.push('/(tabs)/messages' as Href);
    },
    onError: (error) => alertApiError(error),
  });

  const addMembers = () => {
    if (!canManage) {
      appAlert('Premium feature', 'Group chats are included with Premium.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'View plans', onPress: () => router.push('/premium') },
      ]);
      return;
    }
    router.push(`/new-group?addTo=${groupId}` as Href);
  };

  const confirmRemove = (m: GroupMember) =>
    appAlert('Remove member', `Remove ${m.name || 'this member'} from the group?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMutation.mutate(m.userId) },
    ]);

  const confirmLeave = () =>
    appAlert('Leave group', `Leave "${group?.name ?? 'this group'}"? You will stop getting its messages.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => leaveMutation.mutate() },
    ]);

  if (groupQuery.isLoading) return <ListSkeleton />;
  if (!group) return <EmptyState title="Group not found" message="You may no longer be a member." />;

  return (
    <FlatList
      style={styles.screen}
      data={group.members ?? []}
      keyExtractor={(m) => m.userId}
      ListHeaderComponent={
        <View>
          <View style={styles.identity}>
            <View style={styles.groupIcon}>
              <Ionicons name="people" size={34} color={colors.primary} />
            </View>
            {renaming ? (
              <View style={styles.renameRow}>
                <TextInput
                  value={draftName}
                  onChangeText={setDraftName}
                  style={styles.renameInput}
                  maxLength={80}
                  autoFocus
                />
                <Pressable
                  onPress={() => draftName.trim() && renameMutation.mutate(draftName.trim())}
                  disabled={!draftName.trim() || renameMutation.isPending}
                  hitSlop={8}
                >
                  {renameMutation.isPending ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <Ionicons name="checkmark" size={24} color={colors.primary} />
                  )}
                </Pressable>
                <Pressable onPress={() => setRenaming(false)} hitSlop={8}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.nameRow}
                disabled={!isAdmin}
                onPress={() => {
                  setDraftName(group.name);
                  setRenaming(true);
                }}
              >
                <Text style={styles.groupName}>{group.name}</Text>
                {isAdmin ? <Ionicons name="pencil" size={16} color={colors.textSecondary} /> : null}
              </Pressable>
            )}
            <Text style={styles.memberCount}>
              {group.memberCount} / {MAX_GROUP_MEMBERS} members
            </Text>
          </View>

          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Members</Text>
            {isAdmin && group.memberCount < MAX_GROUP_MEMBERS ? (
              <Pressable onPress={addMembers} hitSlop={8} style={styles.addBtn}>
                <Ionicons name="person-add-outline" size={16} color={colors.primary} />
                <Text style={styles.addText}>Add</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      }
      renderItem={({ item }) => {
        const isMe = item.userId === myId;
        return (
          <View style={styles.memberRow}>
            <Pressable
              style={styles.memberMain}
              disabled={isMe}
              onPress={() => router.push(`/public-profile/${item.userId}` as Href)}
            >
              <Avatar name={item.name || 'Member'} size={42} />
              <View style={styles.memberCopy}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {isMe ? 'You' : item.name || 'Member'}
                </Text>
                {item.userRole ? (
                  <Text style={styles.memberRole} numberOfLines={1}>
                    {item.userRole}
                  </Text>
                ) : null}
              </View>
            </Pressable>
            {item.role === 'admin' ? <Text style={styles.adminBadge}>Admin</Text> : null}
            {isAdmin && !isMe ? (
              <Pressable onPress={() => confirmRemove(item)} hitSlop={8} accessibilityLabel="Remove from group">
                <Ionicons name="close-circle-outline" size={22} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
        );
      }}
      ListFooterComponent={
        <Pressable style={styles.leaveRow} onPress={confirmLeave} disabled={leaveMutation.isPending}>
          <Ionicons name="exit-outline" size={20} color={colors.danger} />
          <Text style={styles.leaveText}>Leave group</Text>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  identity: { alignItems: 'center', paddingVertical: spacing.lg, gap: 6 },
  groupIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md },
  groupName: { fontFamily: typography.fontFamily.bold, fontSize: 20, color: colors.text, textAlign: 'center' },
  renameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.md },
  renameInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: typography.fontFamily.semibold,
    fontSize: 16,
    color: colors.text,
  },
  memberCount: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: colors.textSecondary },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  sectionTitle: { fontFamily: typography.fontFamily.bold, fontSize: 16, color: colors.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addText: { fontFamily: typography.fontFamily.semibold, fontSize: 14, color: colors.primary },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  memberMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  memberCopy: { flex: 1, minWidth: 0 },
  memberName: { fontFamily: typography.fontFamily.semibold, fontSize: 15, color: colors.text },
  memberRole: { marginTop: 2, fontFamily: typography.fontFamily.regular, fontSize: 12, color: colors.textSecondary },
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    color: colors.primaryDark,
    fontFamily: typography.fontFamily.semibold,
    fontSize: 11,
    overflow: 'hidden',
  },
  leaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  leaveText: { fontFamily: typography.fontFamily.semibold, fontSize: 15, color: colors.danger },
});
