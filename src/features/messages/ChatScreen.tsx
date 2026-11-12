import { alertApiError } from '@/src/features/billing/featureLocked';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
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
import { ImageViewer } from '@/src/components/ImageViewer';
import { BottomSheet } from '@/src/components/BottomSheet';
import { EmptyState } from '@/src/components/EmptyState';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import { PremiumBadge } from '@/src/components/PremiumBadge';
import * as ImagePicker from 'expo-image-picker';
import { groupsApi, messagesApi } from '@/src/api/messages';
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

import { appAlert } from '@/src/components/AppDialog';
import { useFeature } from '@/src/features/billing/useFeature';
import { ChatSkeleton } from '@/src/components/Skeleton';
type Props = {
  /** The conversation id, or the group id when kind is 'group'. */
  conversationId: string;
  kind?: 'dm' | 'group';
};

const EMOJIS = ['😀', '😂', '👍', '🙏', '🔥', '🎉', '❤️', '👏', '✅', '👀'];

type UploadFile = { uri: string; name: string; type: string; file?: File };

/**
 * A message shown before the server has it -- the WhatsApp-style "sending"
 * bubble. It appears the instant Send is tapped (the composer clears right
 * away), shows a clock until the server confirms, then is swapped for the
 * real message. A failed send stays, marked, and can be retried.
 */
type PendingMessage = Message & {
  localId: string;
  status: 'sending' | 'failed';
  text?: string;
  upload?: UploadFile;
};

export function ChatScreen({ conversationId, kind = 'dm' }: Props) {
  const isGroup = kind === 'group';
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [body, setBody] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [online, setOnline] = useState(false);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [viewer, setViewer] = useState<{ urls: string[]; index: number } | null>(null);
  const listRef = useRef<FlatList<Message>>(null);
  const bottomInset = Math.max(insets.bottom, spacing.sm);
  const keyboardGap = 0;

  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: messagesApi.conversations,
    enabled: !isGroup,
  });

  const groupQuery = useQuery({
    queryKey: ['group', conversationId],
    queryFn: () => groupsApi.get(conversationId),
    enabled: isGroup && Boolean(conversationId),
  });
  const group = groupQuery.data ?? null;

  // Per-kind endpoints, so everything below reads the same for both.
  const api = useMemo(
    () =>
      isGroup
        ? {
            list: () => groupsApi.listMessages(conversationId),
            send: (text: string) => groupsApi.sendText(conversationId, text),
            attach: (file: { uri: string; name: string; type: string; file?: File }, caption: string) =>
              groupsApi.sendAttachment(conversationId, file, caption),
            markRead: () => groupsApi.markRead(conversationId),
          }
        : {
            list: () => messagesApi.listMessages(conversationId),
            send: (text: string) => messagesApi.sendText(conversationId, text),
            attach: (file: { uri: string; name: string; type: string; file?: File }, caption: string) =>
              messagesApi.sendAttachment(conversationId, file, caption),
            markRead: () => messagesApi.markRead(conversationId),
          },
    [isGroup, conversationId],
  );
  const messagesKey = [isGroup ? 'group-messages' : 'messages', conversationId];
  const listKey = isGroup ? ['groups'] : ['conversations'];

  const refreshLists = () => {
    void queryClient.invalidateQueries({ queryKey: listKey });
    void queryClient.invalidateQueries({ queryKey: ['messages-unread'] });
  };

  const conversation = useMemo(() => {
    const list = Array.isArray(conversationsQuery.data)
      ? conversationsQuery.data
      : [];
    return list.find((c) => String(c.id) === String(conversationId)) ?? null;
  }, [conversationsQuery.data, conversationId]);

  const messagesQuery = useQuery({
    queryKey: messagesKey,
    queryFn: api.list,
    enabled: Boolean(conversationId),
  });

  useSSE({
    path: '/messages/stream',
    enabled: Boolean(conversationId),
    onMessage: (raw) => {
      let mine = true; // unparseable: assume it's ours and refresh
      try {
        const m = JSON.parse(raw) as { groupId?: number; conversationId?: number };
        mine = isGroup
          ? String(m.groupId ?? '') === conversationId
          : !m.groupId && String(m.conversationId ?? '') === conversationId;
      } catch {
        // keep mine = true
      }
      if (!mine) {
        refreshLists(); // another chat -- just its row/badge
        return;
      }
      void messagesQuery.refetch();
      // The thread is on screen, so whatever just arrived is read --
      // otherwise the unread badge kept counting messages being looked at.
      void api.markRead().then(refreshLists, refreshLists);
    },
  });

  useEffect(() => {
    const idNum = Number(conversationId);
    if (Number.isFinite(idNum)) {
      void (isGroup ? messagesApi.setActiveGroup(idNum) : messagesApi.setActive(idNum));
    }
    return () => {
      void messagesApi.setActive(null);
    };
  }, [conversationId, isGroup]);

  useEffect(() => {
    if (isGroup) return; // presence is a 1:1 thing
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
  }, [conversationId, conversation?.online, isGroup]);

  useEffect(() => {
    void api.markRead().then(refreshLists, () => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  /** Puts the server's copy of a just-sent message into the cached thread
   *  (the stream/refetch may already have added it) and drops the
   *  pending bubble it replaces. */
  const confirmSent = (localId: string, sent: Message) => {
    queryClient.setQueryData<Message[]>(messagesKey, (old) => {
      const list = Array.isArray(old) ? old : [];
      return list.some((m) => String(m.id) === String(sent.id)) ? list : [...list, sent];
    });
    setPending((prev) => prev.filter((m) => m.localId !== localId));
    void api.markRead().catch(() => undefined);
    refreshLists();
  };

  const deliver = (msg: PendingMessage) => {
    const request = msg.upload ? api.attach(msg.upload, msg.text ?? '') : api.send(msg.text ?? '');
    request
      .then((sent) => confirmSent(msg.localId, sent))
      .catch(() => {
        // Shown on the bubble itself ("Not sent · tap to retry"). A plan or
        // limit error also gets the upgrade prompt, raised centrally by the
        // API client.
        setPending((prev) => prev.map((m) => (m.localId === msg.localId ? { ...m, status: 'failed' } : m)));
      });
  };

  const enqueue = (text: string, upload?: UploadFile) => {
    const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const msg: PendingMessage = {
      id: localId,
      localId,
      status: 'sending',
      text,
      upload,
      body: text,
      senderId: user?.id,
      createdAt: new Date().toISOString(),
      attachmentType: upload ? (upload.type === 'application/pdf' ? 'pdf' : 'image') : undefined,
      attachmentUrl: upload?.uri,
      attachmentName: upload?.name,
    };
    setPending((prev) => [...prev, msg]);
    setBody('');
    setEmojiOpen(false);
    deliver(msg);
  };

  const sendText = () => {
    const text = body.trim();
    if (text) enqueue(text);
  };

  const retryPending = (msg: PendingMessage) =>
    appAlert('Message not sent', 'Try sending it again?', [
      { text: 'Delete', style: 'destructive', onPress: () => setPending((prev) => prev.filter((m) => m.localId !== msg.localId)) },
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Retry',
        onPress: () => {
          const again = { ...msg, status: 'sending' as const };
          setPending((prev) => prev.map((m) => (m.localId === msg.localId ? again : m)));
          deliver(again);
        },
      },
    ]);

  // Attachments are a Premium feature (same gate as the web paperclip).
  const canAttach = useFeature('message_attachments').enabled;

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const a = result.assets[0];
    enqueue(body.trim(), {
      uri: a.uri,
      name: a.fileName ?? `photo-${Date.now()}.jpg`,
      type: (a.mimeType ?? 'image/jpeg').toLowerCase(),
      file: (a as { file?: File }).file,
    });
  };

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    const a = result.assets[0];
    if ((a.size ?? 0) > 10 * 1024 * 1024) {
      appAlert('File too large', 'PDFs can be up to 10 MB.');
      return;
    }
    enqueue(body.trim(), { uri: a.uri, name: a.name || 'document.pdf', type: 'application/pdf', file: a.file });
  };

  const openAttach = () => {
    if (!canAttach) {
      appAlert('Premium feature', 'Sending photos and PDFs in messages is included with Premium.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'View plans', onPress: () => router.push('/premium') },
      ]);
      return;
    }
    appAlert('Attach', body.trim() ? 'Your typed message will be sent as the caption.' : undefined, [
      { text: 'Photo', onPress: () => void pickPhoto() },
      { text: 'PDF document', onPress: () => void pickPdf() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const deleteMutation = useMutation({
    mutationFn: () => messagesApi.hideConversation(conversationId),
    onSuccess: () => {
      setMenuOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      router.back();
    },
    onError: (error) => alertApiError(error),
  });

  const leaveMutation = useMutation({
    mutationFn: () => groupsApi.leave(conversationId),
    onSuccess: () => {
      setMenuOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
      router.back();
    },
    onError: (error) => alertApiError(error),
  });

  const name = isGroup
    ? group?.name ?? 'Group'
    : conversation ? conversationName(conversation) : 'Chat';
  const roleLine = !isGroup && conversation ? conversationRoleLine(conversation) : '';
  const location = isGroup
    ? ''
    : conversation?.participantLocation ??
      (typeof conversation?.location === 'string' ? conversation.location : '');
  const participantId = !isGroup && conversation
    ? conversationParticipantId(conversation)
    : null;
  const statusLine = isGroup
    ? group ? `${group.memberCount} members` : ''
    : online ? 'Online' : 'Offline';

  const messages = useMemo<Message[]>(() => {
    const list = Array.isArray(messagesQuery.data) ? messagesQuery.data : [];
    const sorted = [...list].sort((a, b) => {
      const at = new Date(a.createdAt ?? 0).getTime();
      const bt = new Date(b.createdAt ?? 0).getTime();
      return at - bt;
    });
    // Unconfirmed sends always sit at the bottom, in the order sent.
    return [...sorted, ...pending];
  }, [messagesQuery.data, pending]);
  const latestMessageId = messages[messages.length - 1]?.id;

  useEffect(() => {
    if (!messages.length) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages.length, latestMessageId]);

  /** Every photo in the thread, so the viewer can swipe between them. */
  const openPhoto = (url: string) => {
    const urls = messages
      .filter((m) => m.attachmentType === 'image' && m.attachmentUrl && !(m as PendingMessage).localId)
      .map((m) => String(m.attachmentUrl));
    const index = urls.indexOf(url);
    setViewer(index >= 0 ? { urls, index } : { urls: [url], index: 0 });
  };

  const openProfile = () => {
    setMenuOpen(false);
    if (isGroup) {
      router.push(`/group-info/${conversationId}` as Href);
      return;
    }
    if (participantId == null) return;
    router.push(`/public-profile/${participantId}` as Href);
  };

  if (messagesQuery.isLoading && !messages.length) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <ChatSkeleton />
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
            <Text style={[styles.headerStatus, !isGroup && online && styles.headerOnline]}>
              {statusLine}
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={styles.iconBtn}
          onPress={() => setMenuOpen(true)}
          hitSlop={8}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={colors.text} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 72 : 0}
      >

      {!isGroup && (roleLine || location || participantId != null) && (
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
        ref={listRef}
        style={styles.listFlex}
        data={messages}
        keyExtractor={(item, index) => String((item as PendingMessage).localId ?? item.id ?? index)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={
          messages.length === 0 ? styles.empty : styles.list
        }
        ListEmptyComponent={
          <EmptyState
            title="No messages"
            message={isGroup ? 'Say hello to the group.' : 'Say hello to start the chat.'}
          />
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
                name={isGroup ? item.senderName || 'Member' : name}
                showAvatar={showAvatar}
                showSender={isGroup && !mine && (!prev || String(prev.senderId) !== String(item.senderId) || showDay)}
                showReadReceipt={!isGroup}
                pendingStatus={(item as PendingMessage).status}
                onRetry={(item as PendingMessage).localId ? () => retryPending(item as PendingMessage) : undefined}
                onOpenImage={openPhoto}
              />
            </View>
          );
        }}
      />

      <View
        style={[
          styles.stickyComposer,
          { paddingBottom: bottomInset },
        ]}
      >
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
            onPress={openAttach}
            accessibilityRole="button"
            accessibilityLabel={canAttach ? 'Attach a photo or PDF' : 'Attach a photo or PDF (Premium)'}
          >
            <Ionicons name="attach" size={22} color={colors.textSecondary} />
            {!canAttach ? <PremiumBadge style={styles.attachBadge} /> : null}
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

          {/* Never shows a spinner: the message appears in the thread right
              away with a "sending" clock (see enqueue). */}
          <Pressable
            style={[styles.sendBtn, !body.trim() && styles.sendDisabled]}
            disabled={!body.trim()}
            onPress={sendText}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Ionicons name="send" size={18} color={colors.white} />
          </Pressable>
        </View>
      </View>
      </KeyboardAvoidingView>

      <BottomSheet
        visible={menuOpen}
        title={name}
        onClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.menuRow} onPress={openProfile}>
          <Ionicons name={isGroup ? 'people-outline' : 'person-outline'} size={20} color={colors.text} />
          <Text style={styles.menuRowText}>{isGroup ? 'Group info' : 'View profile'}</Text>
        </Pressable>
        {isGroup ? (
          <Pressable
            style={styles.menuRow}
            onPress={() =>
              appAlert('Leave group', `Leave "${name}"? You will stop getting its messages.`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Leave', style: 'destructive', onPress: () => leaveMutation.mutate() },
              ])
            }
          >
            <Ionicons name="exit-outline" size={20} color={colors.danger} />
            <Text style={[styles.menuRowText, styles.menuDanger]}>Leave group</Text>
          </Pressable>
        ) : (
        <Pressable
          style={styles.menuRow}
          onPress={() => {
            appAlert(
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
        )}
      </BottomSheet>

      <ImageViewer urls={viewer?.urls ?? null} initialIndex={viewer?.index ?? 0} onClose={() => setViewer(null)} />
    </View>
  );
  }

function MessageBubble({
  item,
  mine,
  name,
  showAvatar,
  showSender = false,
  showReadReceipt = true,
  pendingStatus,
  onRetry,
  onOpenImage,
}: {
  item: Message;
  mine: boolean;
  name: string;
  showAvatar: boolean;
  /** Group chats: label the first bubble of each run with who wrote it. */
  showSender?: boolean;
  /** Read ticks only mean something 1:1; a group has many readers. */
  showReadReceipt?: boolean;
  /** Set while the message hasn't reached the server yet. */
  pendingStatus?: 'sending' | 'failed';
  onRetry?: () => void;
  onOpenImage?: (url: string) => void;
}) {
  const time = formatMessageClock(item.createdAt);
  const isPdf = item.attachmentType === 'pdf' && item.attachmentUrl;
  const isImage = item.attachmentType === 'image' && item.attachmentUrl;
  // A photo's caption is its real body only -- messageText's "Photo"
  // fallback would just repeat what the thumbnail already shows.
  const text = isImage ? (item.body ?? '').trim() : messageText(item);
  const failed = pendingStatus === 'failed';

  return (
    <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
      {!mine ? (
        <View style={styles.sideAvatar}>
          {showAvatar ? <Avatar name={name} size={28} /> : null}
        </View>
      ) : null}

      <View style={[styles.bubbleCol, mine && styles.bubbleColMine]}>
        {showSender ? (
          <Text style={styles.senderName} numberOfLines={1}>
            {name}
          </Text>
        ) : null}
        <Pressable
          disabled={!failed}
          onPress={onRetry}
          style={[
            styles.bubble,
            mine ? styles.bubbleMine : styles.bubbleTheirs,
            (isPdf || isImage) && styles.bubbleAttachment,
            isImage && styles.bubblePhoto,
            pendingStatus === 'sending' && styles.bubbleSending,
            failed && styles.bubbleFailed,
          ]}
        >
          {isImage ? (
            <Pressable
              disabled={!!pendingStatus}
              onPress={() => onOpenImage?.(String(item.attachmentUrl))}
              accessibilityRole="imagebutton"
              accessibilityLabel="Open photo"
            >
              <Image source={{ uri: String(item.attachmentUrl) }} style={styles.photoThumb} resizeMode="cover" />
              {pendingStatus === 'sending' ? (
                <View style={styles.photoUploading}>
                  <ActivityIndicator color={colors.white} />
                </View>
              ) : null}
            </Pressable>
          ) : null}

          {isPdf ? (
            <Pressable
              style={styles.pdfCard}
              disabled={!!pendingStatus}
              // In-app browser tab rather than leaving for the browser app.
              onPress={() => void WebBrowser.openBrowserAsync(String(item.attachmentUrl))}
            >
              <View style={styles.pdfIcon}>
                <Text style={styles.pdfIconText}>PDF</Text>
              </View>
              <View style={styles.pdfCopy}>
                <Text style={styles.pdfName} numberOfLines={1}>
                  {item.attachmentName || 'Document.pdf'}
                </Text>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
            </Pressable>
          ) : null}

          {text && !isPdf ? (
            <Text style={[styles.bubbleText, mine && !isImage && styles.bubbleTextMine, isImage && styles.photoCaption]}>
              {text}
            </Text>
          ) : null}
        </Pressable>

        <View style={[styles.metaRow, mine && styles.metaRowMine]}>
          {failed ? (
            <>
              <Ionicons name="alert-circle" size={14} color={colors.danger} />
              <Text style={styles.metaFailed}>Not sent · tap to retry</Text>
            </>
          ) : (
            <>
              {time ? <Text style={styles.metaTime}>{time}</Text> : null}
              {mine && pendingStatus === 'sending' ? (
                <Ionicons name="time-outline" size={13} color={colors.textMuted} accessibilityLabel="Sending" />
              ) : mine && showReadReceipt ? (
                <Ionicons
                  name="checkmark-done"
                  size={14}
                  color={item.isRead ? colors.primary : colors.textMuted}
                />
              ) : null}
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  senderName: {
    marginBottom: 2,
    marginLeft: 4,
    fontFamily: typography.fontFamily.semibold,
    fontSize: 12,
    color: colors.primary,
  },
  listFlex: { flex: 1 },
  keyboardAvoiding: { flex: 1 },
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
  bubblePhoto: { padding: 4 },
  bubbleSending: { opacity: 0.75 },
  bubbleFailed: { borderWidth: 1, borderColor: colors.danger },
  photoThumb: { width: 220, height: 220, borderRadius: 12, backgroundColor: colors.surfaceMuted },
  photoUploading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  photoCaption: { paddingHorizontal: 6, paddingTop: 6, paddingBottom: 2, color: colors.text },
  metaFailed: { fontFamily: typography.fontFamily.medium, fontSize: 11, color: colors.danger },
  attachBadge: { position: 'absolute', top: 2, right: 0 },
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
