import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/src/components/Avatar';
import { BottomSheet } from '@/src/components/BottomSheet';
import { EmptyState, LoadingState } from '@/src/components/EmptyState';
import { getErrorMessage } from '@/src/api/client';
import { messagesApi } from '@/src/api/messages';
import { useSSE } from '@/src/hooks/useSSE';
import { useAuthStore } from '@/src/store/authStore';
import type { Message } from '@/src/types/api';
import {
  conversationName,
  conversationParticipantId,
  conversationRoleLine,
  formatMessageClock,
  formatMessageDayLabel,
  messageText,
  sameDay,
} from '@/src/features/messages/messageFormat';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

type Props = {
  conversationId: string;
};

const EMOJIS = ['😀', '😂', '👍', '🙏', '🔥', '🎉', '❤️', '👏', '✅', '👀'];

export function ChatScreen({ conversationId }: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [body, setBody] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [online, setOnline] = useState(false);
  const bottomInset = Math.max(insets.bottom, spacing.sm);
  const keyboardGap = 14;

  // Edge-to-edge Android needs translucent flags so height tracks the real IME.
  const keyboard = useAnimatedKeyboard({
    isStatusBarTranslucentAndroid: true,
    isNavigationBarTranslucentAndroid: true,
  });
  const composerAnimStyle = useAnimatedStyle(() => {
    const kb = keyboard.height.value;
    const open = kb > 0;
    const gap = open ? keyboardGap : bottomInset;
    return {
      transform: [{ translateY: open ? -(kb - gap) : 0 }],
      paddingBottom: gap,
    };
  });

  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: messagesApi.conversations,
  });

  const conversation = useMemo(() => {
    const list = Array.isArray(conversationsQuery.data)
      ? conversationsQuery.data
      : [];
    return list.find((c) => String(c.id) === String(conversationId)) ?? null;
  }, [conversationsQuery.data, conversationId]);

  const messagesQuery = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => messagesApi.listMessages(conversationId),
    enabled: Boolean(conversationId),
  });

  useSSE({
    path: '/messages/stream',
    enabled: Boolean(conversationId),
    onMessage: () => {
      void messagesQuery.refetch();
      void conversationsQuery.refetch();
    },
  });

  useEffect(() => {
    const idNum = Number(conversationId);
    void messagesApi.setActive(Number.isFinite(idNum) ? idNum : null);
    return () => {
      void messagesApi.setActive(null);
    };
  }, [conversationId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await messagesApi.presence(conversationId);
        if (!cancelled) setOnline(Boolean(res?.online));
      } catch {
        if (!cancelled) setOnline(Boolean(conversation?.online));
      }
    };
    void load();
    const timer = setInterval(() => void load(), 20_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [conversationId, conversation?.online]);

  useEffect(() => {
    void messagesApi.markRead(conversationId).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      void queryClient.invalidateQueries({ queryKey: ['messages-unread'] });
    });
  }, [conversationId, queryClient]);

  const sendMutation = useMutation({
    mutationFn: () => messagesApi.sendText(conversationId, body.trim()),
    onSuccess: async () => {
      setBody('');
      setEmojiOpen(false);
      await messagesApi.markRead(conversationId);
      void queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      void queryClient.invalidateQueries({ queryKey: ['messages-unread'] });
    },
    onError: (error) => Alert.alert('Error', getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => messagesApi.hideConversation(conversationId),
    onSuccess: () => {
      setMenuOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      router.back();
    },
    onError: (error) => Alert.alert('Error', getErrorMessage(error)),
  });

  const name = conversation ? conversationName(conversation) : 'Chat';
  const roleLine = conversation ? conversationRoleLine(conversation) : '';
  const location =
    conversation?.participantLocation ??
    (typeof conversation?.location === 'string' ? conversation.location : '');
  const participantId = conversation
    ? conversationParticipantId(conversation)
    : null;

  const messages = useMemo(() => {
    const list = Array.isArray(messagesQuery.data) ? messagesQuery.data : [];
    return [...list].sort((a, b) => {
      const at = new Date(a.createdAt ?? 0).getTime();
      const bt = new Date(b.createdAt ?? 0).getTime();
      return at - bt;
    });
  }, [messagesQuery.data]);

  const openProfile = () => {
    if (participantId == null) return;
    setMenuOpen(false);
    router.push(`/public-profile/${participantId}` as Href);
  };

  if (messagesQuery.isLoading && !messages.length) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <LoadingState />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        <Pressable style={styles.identity} onPress={openProfile}>
          <Avatar name={name} size={40} />
          <View style={styles.identityCopy}>
            <Text style={styles.headerName} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.headerStatus, online && styles.headerOnline]}>
              {online ? 'Online' : 'Offline'}
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={styles.iconBtn}
          onPress={() => Alert.alert('Coming soon', 'Voice calls are not available yet.')}
          hitSlop={8}
        >
          <Ionicons name="call-outline" size={20} color={colors.text} />
        </Pressable>
        <Pressable
          style={styles.iconBtn}
          onPress={() => Alert.alert('Coming soon', 'Video calls are not available yet.')}
          hitSlop={8}
        >
          <Ionicons name="videocam-outline" size={22} color={colors.text} />
        </Pressable>
        <Pressable
          style={styles.iconBtn}
          onPress={() => setMenuOpen(true)}
          hitSlop={8}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={colors.text} />
        </Pressable>
      </View>

      {(roleLine || location || participantId != null) && (
        <View style={styles.profileCard}>
          <View style={styles.profileCopy}>
            {roleLine ? (
              <Text style={styles.profileRole} numberOfLines={1}>
                {roleLine}
              </Text>
            ) : null}
            {location ? (
              <Text style={styles.profileLocation} numberOfLines={1}>
                {location}
              </Text>
            ) : null}
          </View>
          {participantId != null ? (
            <Pressable style={styles.viewProfileBtn} onPress={openProfile}>
              <Text style={styles.viewProfileText}>View Profile</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <FlatList
        style={styles.listFlex}
        data={messages}
        keyExtractor={(item, index) => String(item.id ?? index)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={
          messages.length === 0 ? styles.empty : styles.list
        }
        ListEmptyComponent={
          <EmptyState title="No messages" message="Say hello to start the chat." />
        }
        renderItem={({ item, index }) => {
          const mine = String(item.senderId) === String(user?.id);
          const prev = index > 0 ? messages[index - 1] : null;
          const showDay = !prev || !sameDay(prev.createdAt, item.createdAt);
          const next = messages[index + 1];
          const showAvatar =
            !mine &&
            (!next ||
              String(next.senderId) !== String(item.senderId) ||
              !sameDay(next.createdAt, item.createdAt));

          return (
            <View>
              {showDay ? (
                <Text style={styles.dayLabel}>
                  {formatMessageDayLabel(item.createdAt)}
                </Text>
              ) : null}
              <MessageBubble
                item={item}
                mine={mine}
                name={name}
                showAvatar={showAvatar}
              />
            </View>
          );
        }}
      />

      <Animated.View style={[styles.stickyComposer, composerAnimStyle]}>
        {emojiOpen ? (
          <View style={styles.emojiBar}>
            {EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => setBody((prev) => `${prev}${emoji}`)}
                style={styles.emojiBtn}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.composer}>
          <Pressable
            style={styles.attachBtn}
            onPress={() =>
              Alert.alert(
                'Attachments',
                'Photo and PDF sharing is available for premium members.',
              )
            }
          >
            <Ionicons name="attach" size={22} color={colors.textSecondary} />
          </Pressable>

          <View style={styles.inputWrap}>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Type a message..."
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              multiline
              maxLength={2000}
            />
            <Pressable
              onPress={() => setEmojiOpen((v) => !v)}
              hitSlop={8}
              style={styles.emojiToggle}
            >
              <Ionicons
                name={emojiOpen ? 'happy' : 'happy-outline'}
                size={22}
                color={colors.textMuted}
              />
            </Pressable>
          </View>

          <Pressable
            style={[
              styles.sendBtn,
              (!body.trim() || sendMutation.isPending) && styles.sendDisabled,
            ]}
            disabled={!body.trim() || sendMutation.isPending}
            onPress={() => sendMutation.mutate()}
          >
            {sendMutation.isPending ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Ionicons name="send" size={18} color={colors.white} />
            )}
          </Pressable>
        </View>
      </Animated.View>

      <BottomSheet
        visible={menuOpen}
        title={name}
        onClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.menuRow} onPress={openProfile}>
          <Ionicons name="person-outline" size={20} color={colors.text} />
          <Text style={styles.menuRowText}>View profile</Text>
        </Pressable>
        <Pressable
          style={styles.menuRow}
          onPress={() => {
            Alert.alert(
              'Delete chat',
              'Hide this conversation from your list? You can still message again later.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => deleteMutation.mutate(),
                },
              ],
            );
          }}
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
          <Text style={[styles.menuRowText, styles.menuDanger]}>Delete chat</Text>
        </Pressable>
      </BottomSheet>
    </View>
  );
}

function MessageBubble({
  item,
  mine,
  name,
  showAvatar,
}: {
  item: Message;
  mine: boolean;
  name: string;
  showAvatar: boolean;
}) {
  const text = messageText(item);
  const time = formatMessageClock(item.createdAt);
  const isPdf = item.attachmentType === 'pdf' && item.attachmentUrl;
  const isImage = item.attachmentType === 'image' && item.attachmentUrl;

  return (
    <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
      {!mine ? (
        <View style={styles.sideAvatar}>
          {showAvatar ? <Avatar name={name} size={28} /> : null}
        </View>
      ) : null}

      <View style={[styles.bubbleCol, mine && styles.bubbleColMine]}>
        <View
          style={[
            styles.bubble,
            mine ? styles.bubbleMine : styles.bubbleTheirs,
            (isPdf || isImage) && styles.bubbleAttachment,
          ]}
        >
          {isImage ? (
            <Pressable onPress={() => void Linking.openURL(String(item.attachmentUrl))}>
              <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
                📷 Photo
              </Text>
            </Pressable>
          ) : null}

          {isPdf ? (
            <Pressable
              style={styles.pdfCard}
              onPress={() => void Linking.openURL(String(item.attachmentUrl))}
            >
              <View style={styles.pdfIcon}>
                <Text style={styles.pdfIconText}>PDF</Text>
              </View>
              <View style={styles.pdfCopy}>
                <Text style={styles.pdfName} numberOfLines={1}>
                  {item.attachmentName || 'Document.pdf'}
                </Text>
              </View>
              <Ionicons name="download-outline" size={18} color={colors.textSecondary} />
            </Pressable>
          ) : null}

          {text && !isPdf ? (
            <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
              {text}
            </Text>
          ) : null}
        </View>

        <View style={[styles.metaRow, mine && styles.metaRowMine]}>
          {time ? <Text style={styles.metaTime}>{time}</Text> : null}
          {mine ? (
            <Ionicons
              name="checkmark-done"
              size={14}
              color={item.isRead ? colors.primary : colors.textMuted}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  listFlex: { flex: 1 },
  stickyComposer: {
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 2,
    backgroundColor: colors.white,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
    marginRight: 4,
  },
  identityCopy: { flex: 1, minWidth: 0 },
  headerName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 16,
    color: colors.text,
  },
  headerStatus: {
    marginTop: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  headerOnline: {
    color: colors.success,
  },
  profileCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileCopy: { flex: 1, minWidth: 0 },
  profileRole: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 13,
    color: colors.text,
  },
  profileLocation: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  viewProfileBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  viewProfileText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 12,
    color: colors.primary,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  empty: { flexGrow: 1 },
  dayLabel: {
    alignSelf: 'center',
    marginVertical: 12,
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
    gap: 8,
  },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  sideAvatar: { width: 28 },
  bubbleCol: { maxWidth: '78%' },
  bubbleColMine: { alignItems: 'flex-end' },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 6,
  },
  bubbleTheirs: {
    backgroundColor: colors.surfaceMuted,
    borderBottomLeftRadius: 6,
  },
  bubbleAttachment: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: colors.surfaceMuted,
  },
  bubbleText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  bubbleTextMine: {
    color: colors.white,
  },
  metaRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaRowMine: {
    justifyContent: 'flex-end',
  },
  metaTime: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  pdfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 200,
  },
  pdfIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfIconText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 9,
    color: '#DC2626',
  },
  pdfCopy: { flex: 1, minWidth: 0 },
  pdfName: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 13,
    color: colors.text,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  attachBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
    paddingTop: Platform.OS === 'ios' ? 6 : 4,
    paddingBottom: Platform.OS === 'ios' ? 6 : 4,
  },
  emojiToggle: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.5 },
  emojiBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  emojiBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
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
  menuDanger: { color: colors.danger },
});
