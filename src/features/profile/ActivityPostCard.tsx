import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Animated,
  TouchableOpacity,
  Share,
  Platform,
  Keyboard,
  TextInput,
  FlatList,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/src/components/Avatar';
import { PhotoCarousel } from '@/src/components/PhotoCarousel';
import { BottomSheet } from '@/src/components/BottomSheet';
import { getEventPhotoUrls } from '@/src/api/events';
import {
  formatCount,
  formatRelativeTime,
  formatRoleLabel,
  truncateText,
} from '@/src/features/profile/profileFormat';
import { useAuthStore } from '@/src/store/authStore';
import { eventsApi, apiClient } from '@/src/api/events';
import { searchApi } from '@/src/api/search';
import type { EventItem, Comment, ProfessionalSearchResult } from '@/src/types/api';
import { colors, spacing, typography, radius } from '@/src/theme/tokens';

type Props = {
  item: EventItem;
  authorName?: string;
  headline?: string;
  isOwn?: boolean;
  /** Hide the top divider (use on standalone feed cards). */
  hideDivider?: boolean;
  /** `feed`: full-width card that insets its own text and runs media edge to
   * edge. `inline` (default): sits inside an already-padded container. */
  variant?: 'feed' | 'inline';
};

const VERIFIED_BLUE = '#1D6FE8';
const VERIFIED_TINT = '#E8F0FE';
const ACTION_ICON_SIZE = 20;
const CARD_INSET = 12;

function authorProfileId(item: EventItem) {
  return item.userId ?? item.authorId ?? null;
}

export function ActivityPostCard({
  item,
  authorName,
  headline,
  isOwn,
  hideDivider,
  variant = 'inline',
}: Props) {
  const isFeed = variant === 'feed';
  const queryClient = useQueryClient();
  const myId = useAuthStore((s) => s.user?.id);
  const [expanded, setExpanded] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const likeAnim = useRef(new Animated.Value(1)).current;
  const commentAnim = useRef(new Animated.Value(1)).current;
  const [isLiking, setIsLiking] = useState(false);

  // Local optimistic state
  const [likeCount, setLikeCount] = useState(item.likeCount ?? 0);
  const [likedByMe, setLikedByMe] = useState(item.likedByMe ?? false);
  const [commentCount, setCommentCount] = useState(item.commentCount ?? 0);
  const [shareCount, setShareCount] = useState(item.shareCount ?? 0);
  const [sharedByMe, setSharedByMe] = useState(item.sharedByMe ?? false);

  // Pick up server counts after a feed refetch. Skipped mid-like so a slow
  // refetch can't undo the optimistic heart.
  useEffect(() => {
    if (isLiking) return;
    setLikeCount(item.likeCount ?? 0);
    setLikedByMe(item.likedByMe ?? false);
  }, [item.likeCount, item.likedByMe]);
  useEffect(() => {
    setCommentCount(item.commentCount ?? 0);
  }, [item.commentCount]);
  useEffect(() => {
    setShareCount(item.shareCount ?? 0);
    setSharedByMe(item.sharedByMe ?? false);
  }, [item.shareCount, item.sharedByMe]);

  const body = item.description?.trim() ?? '';
  const preview = truncateText(body, 180);
  const displayName = authorName ?? item.ownerName ?? item.authorName ?? item.title ?? 'You';
  const postedAt = item.createdAt ?? item.eventDate;
  const photos = getEventPhotoUrls(item);
  const profileId = authorProfileId(item);
  const verified = item.ownerVerified === true;
  const businessVerified = item.ownerBusinessVerified === true;
  const roleLine = headline ?? formatRoleLabel(item.ownerRole);
  const timeLine = formatRelativeTime(postedAt);
  const viewingOwn =
    isOwn || (profileId != null && myId != null && String(profileId) === String(myId));

  const openEvent = () => {
    if (item.id == null || item.id === '') return;
    const id = String(item.id);
    queryClient.setQueryData(['event', id], item);
    router.push(`/event/${id}` as Href);
  };

  const openProfile = () => {
    if (viewingOwn) {
      router.push('/(tabs)/profile' as Href);
      return;
    }
    if (profileId == null || profileId === '') return;
    router.push(`/public-profile/${profileId}` as Href);
  };

  const handleLike = useCallback(async () => {
    if (isLiking) return;
    setIsLiking(true);

    const nextLiked = !likedByMe;
    const nextCount = likedByMe ? likeCount - 1 : likeCount + 1;

    // Optimistic update
    setLikedByMe(nextLiked);
    setLikeCount(Math.max(0, nextCount));

    // Heart pop animation
    Animated.sequence([
      Animated.timing(likeAnim, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.timing(likeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    try {
      if (nextLiked) {
        await eventsApi.likeEvent(item.id);
      } else {
        await eventsApi.unlikeEvent(item.id);
      }
      // Invalidate to sync with server
      queryClient.invalidateQueries({ queryKey: ['events-feed'] });
      queryClient.invalidateQueries({ queryKey: ['event', String(item.id)] });
    } catch {
      // Rollback on error
      setLikedByMe(likedByMe);
      setLikeCount(likeCount);
    } finally {
      setIsLiking(false);
    }
  }, [item.id, likedByMe, likeCount, likeAnim, queryClient, isLiking]);

  const handleComment = useCallback(() => {
    Animated.sequence([
      Animated.timing(commentAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
      Animated.timing(commentAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    setCommentsVisible(true);
  }, [commentAnim]);

  const handleShare = useCallback(async () => {
    const eventUrl = `${Platform.OS === 'web' ? window.location.origin : 'https://www.cobilds.com'}/event/${item.id}`;
    const shareTitle = item.title ?? 'Check out this post';
    const shareMessage = body.slice(0, 200) + (body.length > 200 ? '...' : '');

    try {
      const result = await Share.share({
        title: shareTitle,
        message: shareMessage,
        url: eventUrl,
      });

      if (result.action === Share.sharedAction) {
        setShareCount((c) => c + 1);
        setSharedByMe(true);
        // Optimistic update, then sync
        await eventsApi.shareEvent(item.id);
        queryClient.invalidateQueries({ queryKey: ['events-feed'] });
        queryClient.invalidateQueries({ queryKey: ['event', String(item.id)] });
      }
    } catch (e) {
      console.warn('Share failed', e);
    }
  }, [item.id, item.title, body, queryClient]);

  const onCommentAdded = useCallback(() => {
    setCommentCount((c) => c + 1);
  }, []);

  const onCommentsClose = useCallback(() => {
    Keyboard.dismiss();
    setCommentsVisible(false);
  }, []);

  const hasStats = likeCount > 0 || commentCount > 0 || shareCount > 0;
  const metaLine = [roleLine, item.location].filter(Boolean).join(' · ');
  const statsRight = [
    commentCount > 0 ? `${formatCount(commentCount)} comment${commentCount === 1 ? '' : 's'}` : null,
    shareCount > 0 ? `${formatCount(shareCount)} share${shareCount === 1 ? '' : 's'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      style={[
        styles.card,
        isFeed && styles.cardFeed,
        hideDivider && styles.cardNoDivider,
      ]}
    >
      <View style={[styles.header, isFeed && styles.inset]}>
        <Pressable
          onPress={openProfile}
          disabled={!viewingOwn && profileId == null}
          style={styles.headerMain}
          accessibilityRole="button"
          accessibilityLabel={`Open ${displayName}'s profile${verified ? ', verified' : ''}`}
        >
          <View>
            <Avatar name={displayName} size={44} />
            {verified ? (
              <View style={styles.avatarBadge} testID="post-avatar-verified">
                <Ionicons name="checkmark-circle" size={14} color={VERIFIED_BLUE} />
              </View>
            ) : null}
          </View>
          <View style={styles.headerCopy}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {displayName}
              </Text>
              {verified ? (
                <Ionicons
                  testID="post-name-verified"
                  name="checkmark-circle"
                  size={15}
                  color={VERIFIED_BLUE}
                  accessibilityLabel="Verified"
                />
              ) : null}
              {viewingOwn ? <Text style={styles.youTag}>· You</Text> : null}
            </View>
            {metaLine ? (
              <Text style={styles.meta} numberOfLines={1}>
                {metaLine}
              </Text>
            ) : null}
            <View style={styles.timeRow}>
              {timeLine ? <Text style={styles.time}>{timeLine} ·</Text> : null}
              <Ionicons name="earth" size={12} color={colors.textMuted} />
              {businessVerified ? (
                <View style={styles.businessPill} testID="post-business-verified">
                  <Ionicons name="shield-checkmark" size={10} color={VERIFIED_BLUE} />
                  <Text style={styles.businessPillText}>Verified Business</Text>
                </View>
              ) : null}
            </View>
          </View>
        </Pressable>
        <Pressable
          hitSlop={10}
          onPress={openEvent}
          style={styles.moreBtn}
          accessibilityRole="button"
          accessibilityLabel="More options"
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      {item.title || body ? (
        <Pressable onPress={openEvent} style={[styles.contentWrapper, isFeed && styles.inset]}>
          {item.title ? <Text style={styles.title}>{item.title}</Text> : null}

          {body ? (
            <Text style={[styles.body, !!item.title && styles.bodyAfterTitle]}>
              {expanded || !preview.truncated ? body : preview.text}
              {preview.truncated && !expanded ? (
                <Text
                  style={styles.more}
                  onPress={() => setExpanded(true)}
                >
                  {' '}
                  ...more
                </Text>
              ) : null}
            </Text>
          ) : null}
        </Pressable>
      ) : null}

      {photos.length ? (
        <PhotoCarousel
          urls={photos}
          aspectRatio={4 / 3}
          borderRadius={isFeed ? 0 : radius.md}
          style={styles.carousel}
          onPress={openEvent}
        />
      ) : null}

      {hasStats ? (
        <View style={[styles.statsRow, isFeed && styles.inset]}>
          {likeCount > 0 ? (
            <View style={styles.statsLikes}>
              <View style={styles.likeBubble}>
                <Ionicons name="thumbs-up" size={9} color={colors.white} />
              </View>
              <Text style={styles.statsText}>{formatCount(likeCount)}</Text>
            </View>
          ) : (
            <View />
          )}
          {statsRight ? (
            <Text style={styles.statsText} onPress={commentCount > 0 ? handleComment : undefined}>
              {statsRight}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.actionBar, isFeed && styles.actionBarFeed]}>
        <TouchableOpacity
          testID="post-like"
          onPress={handleLike}
          style={styles.actionBtn}
          accessibilityRole="button"
          accessibilityLabel={`${likedByMe ? 'Unlike' : 'Like'}, ${likeCount} likes`}
          accessibilityState={{ selected: likedByMe }}
          disabled={isLiking}
        >
          <Animated.View style={{ transform: [{ scale: likeAnim }] }}>
            <Ionicons
              name={likedByMe ? 'thumbs-up' : 'thumbs-up-outline'}
              size={ACTION_ICON_SIZE}
              color={likedByMe ? colors.primary : colors.textSecondary}
            />
          </Animated.View>
          <Text style={[styles.postActionLabel, likedByMe && styles.postActionLabelActive]}>
            Like
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="post-comment"
          onPress={handleComment}
          style={styles.actionBtn}
          accessibilityRole="button"
          accessibilityLabel={`Comment, ${commentCount} comments`}
        >
          <Animated.View style={{ transform: [{ scale: commentAnim }] }}>
            <Ionicons
              name="chatbubble-outline"
              size={ACTION_ICON_SIZE}
              color={colors.textSecondary}
            />
          </Animated.View>
          <Text style={styles.postActionLabel}>Comment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="post-share"
          onPress={handleShare}
          style={styles.actionBtn}
          accessibilityRole="button"
          accessibilityLabel={`Share${shareCount > 0 ? `, ${shareCount} shares` : ''}`}
        >
          <Ionicons
            name="arrow-redo-outline"
            size={ACTION_ICON_SIZE}
            color={sharedByMe ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.postActionLabel, sharedByMe && styles.postActionLabelActive]}>
            Share
          </Text>
        </TouchableOpacity>
      </View>

      {/* Comments Bottom Sheet - Using the app's existing BottomSheet component */}
      <CommentBottomSheet
        visible={commentsVisible}
        onClose={onCommentsClose}
        eventId={String(item.id)}
        initialComments={item.comments ?? []}
        commentCount={commentCount}
        onCommentAdded={onCommentAdded}
      />
    </View>
  );
}

/* Comment Bottom Sheet Component - Uses the app's BottomSheet with proper Modal */
function CommentBottomSheet({
  visible,
  onClose,
  eventId,
  initialComments,
  commentCount,
  onCommentAdded,
}: {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  initialComments: Comment[];
  commentCount: number;
  onCommentAdded: () => void;
}) {
  const queryClient = useQueryClient();
  const myId = useAuthStore((s) => s.user?.id);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentions, setMentions] = useState<Array<{ id: string | number; fullName?: string; name?: string }>>([]);
  const inputRef = useRef<any>(null);
  const loadingRef = useRef(false);
  const hasFetchedRef = useRef(false);
  const initialCommentsRef = useRef<Comment[]>(initialComments);

  // Update ref when initialComments actually changes (not just new reference)
  useEffect(() => {
    initialCommentsRef.current = initialComments;
  }, [initialComments]);

  const fetchComments = useCallback(async (pageNum: number, append = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await eventsApi.getEventComments(eventId, 20, pageNum);
      const newComments = (res.comments ?? []) as Comment[];
      if (append) {
        setComments((prev) => [...prev, ...newComments]);
      } else {
        setComments(newComments);
      }
      // Use backend pagination meta to determine if there are more pages
      const totalPages = res.pagination?.totalPages ?? 1;
      setHasMore(pageNum < totalPages);
      setPage(pageNum);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [eventId]);

  // Fetch comments when sheet opens
  useEffect(() => {
    if (visible && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchComments(1, false);
    } else if (!visible) {
      // Reset on close
      hasFetchedRef.current = false;
      setComments(initialCommentsRef.current);
      setPage(1);
      setHasMore(false);
      setInput('');
      setReplyingTo(null);
    }
  }, [visible, fetchComments]);

  // Fetch mentions for @ suggestions using search API
  const [mentionSearchDebounce, setMentionSearchDebounce] = useState('');

  useEffect(() => {
    if (input.startsWith('@')) {
      const query = input.slice(1).toLowerCase();
      setMentionSearchDebounce(query);
    } else {
      setMentionSearchDebounce('');
      setMentions([]);
    }
  }, [input]);

  useEffect(() => {
    if (!mentionSearchDebounce || mentionSearchDebounce.length < 2) {
      setMentions([]);
      return;
    }

    let cancelled = false;
    searchApi.freeText(mentionSearchDebounce, 10, 1).then((users) => {
      if (!cancelled) {
        setMentions(
          users.map((u) => ({
            id: u.id,
            fullName: u.fullName,
            name: u.fullName,
          }))
        );
      }
    }).catch(() => {
      // Fallback to comment authors
      if (!cancelled) {
        const uniqueAuthors = Array.from(
          new Map(comments.map((c) => [c.authorId, { id: c.authorId, fullName: c.authorName }])).values()
        );
        setMentions(uniqueAuthors.filter((u) => u.fullName?.toLowerCase().includes(mentionSearchDebounce)));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mentionSearchDebounce, comments]);

  const insertMention = (user: { id: string | number; fullName?: string; name?: string }) => {
    const name = user.fullName ?? user.name ?? 'User';
    const beforeAt = input.lastIndexOf('@');
    if (beforeAt >= 0) {
      const newInput = input.slice(0, beforeAt) + `@${name} `;
      setInput(newInput);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    setShowMentions(false);
  };

  // Extract mentioned user IDs from input (for API)
  const extractMentionedUserIds = (text: string): (string | number)[] => {
    const ids: (string | number)[] = [];
    const mentionRegex = /@(\w+)/g;
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionName = match[1];
      const user = mentions.find((m) => (m.fullName ?? m.name)?.toLowerCase() === mentionName.toLowerCase());
      if (user) {
        ids.push(user.id);
      }
    }
    return [...new Set(ids)];
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const mentionedUserIds = extractMentionedUserIds(text);
      const newComment = await eventsApi.addComment(eventId, text, replyingTo?.id, mentionedUserIds);
      
      if (replyingTo) {
        // Add reply under the specific parent comment
        setComments((prev) => 
          prev.map((comment) => {
            if (String(comment.id) === String(replyingTo.id)) {
              return {
                ...comment,
                replies: [newComment, ...(comment.replies ?? [])],
                replyCount: (comment.replyCount ?? 0) + 1,
              };
            }
            // Also check nested replies recursively
            if (comment.replies?.length) {
              return {
                ...comment,
                replies: addReplyToNested(comment.replies, replyingTo.id, newComment),
              };
            }
            return comment;
          })
        );
      } else {
        // Top-level comment - add to beginning
        setComments((prev) => [newComment, ...prev]);
      }
      
      setInput('');
      setReplyingTo(null);
      onCommentAdded();
      queryClient.invalidateQueries({ queryKey: ['events-feed'] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      // Focus back to input for continued typing
      inputRef.current?.focus();
    } finally {
      setSending(false);
    }
  };

  // Helper to recursively find and add reply to nested comment
  const addReplyToNested = (replies: Comment[], parentId: string | number, newReply: Comment): Comment[] => {
    return replies.map((reply) => {
      if (String(reply.id) === String(parentId)) {
        return {
          ...reply,
          replies: [newReply, ...(reply.replies ?? [])],
          replyCount: (reply.replyCount ?? 0) + 1,
        };
      }
      if (reply.replies?.length) {
        return {
          ...reply,
          replies: addReplyToNested(reply.replies, parentId, newReply),
        };
      }
      return reply;
    });
  };

  const handleLikeComment = async (comment: Comment) => {
    const nextLiked = !comment.likedByMe;
    const nextCount = comment.likedByMe ? (comment.likeCount ?? 1) - 1 : (comment.likeCount ?? 0) + 1;
    setComments((prev) =>
      prev.map((c) =>
        c.id === comment.id ? { ...c, likedByMe: nextLiked, likeCount: Math.max(0, nextCount) } : c
      )
    );
    try {
      if (nextLiked) {
        await apiClient.post(`/comments/${comment.id}/likes`);
      } else {
        await apiClient.delete(`/comments/${comment.id}/likes`);
      }
    } catch {
      setComments((prev) =>
        prev.map((c) =>
          c.id === comment.id ? { ...c, likedByMe: comment.likedByMe, likeCount: comment.likeCount } : c
        )
      );
    }
  };

const getAuthorName = (comment: Comment) => comment.authorName ?? comment.commenter?.name ?? 'Unknown';

  const footer = (
      <View style={styles.footerWrap}>
        {replyingTo && (
          <View style={styles.replyIndicatorInner}>
            <Text style={styles.replyIndicatorText}>Replying to <Text style={styles.replyToName}>{getAuthorName(replyingTo)}</Text></Text>
            <Pressable onPress={() => setReplyingTo(null)} hitSlop={8}>
              <Ionicons name="close" size={14} color={colors.textMuted} />
            </Pressable>
          </View>
        )}
        <View style={styles.inputWrap}>
          <Avatar name={useAuthStore.getState().user?.fullName ?? 'You'} size={32} />
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={replyingTo ? `Reply to ${replyingTo.authorName}...` : 'Write a comment...'}
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={2000}
              onSubmitEditing={handleSend}
              onFocus={() => setShowMentions(true)}
              onBlur={() => setTimeout(() => setShowMentions(false), 200)}
            />
            {showMentions && input.startsWith('@') && mentions.length > 0 && (
              <View style={styles.mentionsList}>
                {mentions.slice(0, 5).map((user) => (
                  <Pressable
                    key={String(user.id)}
                    onPress={() => insertMention(user)}
                    style={styles.mentionItem}
                  >
                    <Avatar name={user.fullName ?? user.name ?? 'User'} size={24} />
                    <Text style={styles.mentionName}>@{user.fullName ?? user.name ?? 'User'}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim() || sending}
            style={[
              styles.sendBtn,
              !input.trim() && styles.sendBtnDisabled,
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {sending ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Ionicons name="send" size={22} color={input.trim() ? colors.primary : colors.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );

  const handleReply = (comment: Comment) => {
    setReplyingTo(comment);
    inputRef.current?.focus();
  };

  return (
    <BottomSheet
      visible={visible}
      title={`Comments (${commentCount})`}
      onClose={onClose}
      tall
      fixedHeight
      footer={footer}
    >
      {loading && comments.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <View style={styles.commentsContainer}>
          {comments.length === 0 && !loading ? (
            <View style={styles.emptyComments}>
              <Ionicons name="chatbubble-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.commentsList}
              contentContainerStyle={styles.commentsContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="interactive"
            >
              {comments.map((comment) => (
                <CommentItem
                  key={String(comment.id)}
                  comment={comment}
                  myId={myId}
                  onLike={handleLikeComment}
                  onReply={handleReply}
                />
              ))}
            </ScrollView>
          )}
          {hasMore && !loading && (
            <Pressable
              onPress={() => fetchComments(page + 1, true)}
              style={styles.loadMoreBtn}
            >
              <Text style={styles.loadMoreText}>Load more comments</Text>
            </Pressable>
          )}
        </View>
      )}
    </BottomSheet>
  );
}

/* Comment Item Component */
function CommentItem({
  comment,
  myId,
  onLike,
  onReply,
}: {
  comment: Comment;
  myId?: string | number;
  onLike: (comment: Comment) => void;
  onReply: (comment: Comment) => void;
}) {
  const isOwn = myId != null && String(comment.authorId ?? comment.commenter?.userId) === String(myId);
  const authorDisplayName = comment.authorName ?? comment.commenter?.name ?? 'Unknown';
  const [showReplies, setShowReplies] = useState(false);

  // Render comment body with mention links
  const renderCommentBody = (body: string, mentions?: Comment['mentions']) => {
    if (!mentions?.length) return <Text style={styles.commentBody}>{body}</Text>;

    const segments: React.ReactNode[] = [];
    let lastIndex = 0;
    const sortedMentions = [...mentions].sort((a, b) => (b.name?.length ?? 0) - (a.name?.length ?? 0));

    for (const mention of sortedMentions) {
      const mentionText = `@${mention.name}`;
      const index = body.indexOf(mentionText, lastIndex);
      if (index === -1) continue;

      if (index > lastIndex) {
        segments.push(<Text key={`text-${lastIndex}`} style={styles.commentBody}>{body.slice(lastIndex, index)}</Text>);
      }
      segments.push(
        <Text
          key={`mention-${mention.userId}`}
          style={styles.mentionLink}
          onPress={() => {
            if (mention.userId) {
              router.push(`/public-profile/${mention.userId}` as any);
            }
          }}
        >
          {mentionText}
        </Text>
      );
      lastIndex = index + mentionText.length;
    }

    if (lastIndex < body.length) {
      segments.push(<Text key={`text-${lastIndex}`} style={styles.commentBody}>{body.slice(lastIndex)}</Text>);
    }

    return <Text style={styles.commentBody}>{segments}</Text>;
  };

  // Render replies for this comment (direct replies only)
  const renderReplies = (replies: Comment[] | undefined, level: number) => {
    if (!replies?.length) return null;
    return (
      <View style={[styles.repliesContainer, { marginLeft: level * 12 }]}>
        {replies.map((reply) => (
          <ReplyItem
            key={String(reply.id)}
            reply={reply}
            myId={myId}
            onLike={onLike}
            onReply={onReply}
            level={level + 1}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.commentRow}>
      <Avatar name={authorDisplayName} size={32} />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>{authorDisplayName}</Text>
          <Text style={styles.commentTime}>{formatRelativeTime(comment.createdAt)}</Text>
          {isOwn && <Text style={styles.youTag}>You</Text>}
        </View>
        {renderCommentBody(comment.body, comment.mentions)}
        <View style={styles.commentActions}>
          <Pressable onPress={() => onLike(comment)} style={styles.actionText}>
            <Ionicons
              name={comment.likedByMe ? 'heart' : 'heart-outline'}
              size={16}
              color={comment.likedByMe ? colors.danger : colors.textMuted}
            />
            {(comment.likeCount ?? 0) > 0 && (
              <Text style={[styles.actionCountSmall, comment.likedByMe && { color: colors.danger }]}>
                {comment.likeCount}
              </Text>
            )}
          </Pressable>
          <Pressable onPress={() => onReply(comment)} style={styles.actionText}>
            <Text style={styles.actionLabel}>Reply</Text>
          </Pressable>
          {(comment.replyCount ?? 0) > 0 && (
            <Pressable onPress={() => setShowReplies(!showReplies)} style={styles.actionText}>
              <Text style={styles.actionLabel}>
                {showReplies ? `Hide ${comment.replyCount} repl${comment.replyCount === 1 ? 'y' : 'ies'}` : `View ${comment.replyCount} repl${comment.replyCount === 1 ? 'y' : 'ies'}`}
              </Text>
            </Pressable>
          )}
        </View>
        {showReplies && renderReplies(comment.replies, 1)}
      </View>
    </View>
  );
}

/* Reply Item Component - for nested replies (LinkedIn style) */
function ReplyItem({
  reply,
  myId,
  onLike,
  onReply,
  level = 1,
}: {
  reply: Comment;
  myId?: string | number;
  onLike: (comment: Comment) => void;
  onReply: (comment: Comment) => void;
  level: number;
}) {
  const isOwn = myId != null && String(reply.authorId ?? reply.commenter?.userId) === String(myId);
  const authorDisplayName = reply.authorName ?? reply.commenter?.name ?? 'Unknown';
  const [showReplies, setShowReplies] = useState(false);

  const renderCommentBody = (body: string, mentions?: Comment['mentions']) => {
    if (!mentions?.length) return <Text style={styles.commentBody}>{body}</Text>;

    const segments: React.ReactNode[] = [];
    let lastIndex = 0;
    const sortedMentions = [...mentions].sort((a, b) => (b.name?.length ?? 0) - (a.name?.length ?? 0));

    for (const mention of sortedMentions) {
      const mentionText = `@${mention.name}`;
      const index = body.indexOf(mentionText, lastIndex);
      if (index === -1) continue;

      if (index > lastIndex) {
        segments.push(<Text key={`text-${lastIndex}`} style={styles.commentBody}>{body.slice(lastIndex, index)}</Text>);
      }
      segments.push(
        <Text
          key={`mention-${mention.userId}`}
          style={styles.mentionLink}
          onPress={() => {
            if (mention.userId) {
              router.push(`/public-profile/${mention.userId}` as any);
            }
          }}
        >
          {mentionText}
        </Text>
      );
      lastIndex = index + mentionText.length;
    }

    if (lastIndex < body.length) {
      segments.push(<Text key={`text-${lastIndex}`} style={styles.commentBody}>{body.slice(lastIndex)}</Text>);
    }

    return <Text style={styles.commentBody}>{segments}</Text>;
  };

  const renderReplies = (replies: Comment[] | undefined, currentLevel: number) => {
    if (!replies?.length) return null;
    return (
      <View style={[styles.repliesContainer, { marginLeft: currentLevel * 12 }]}>
        {replies.map((r) => (
          <ReplyItem
            key={String(r.id)}
            reply={r}
            myId={myId}
            onLike={onLike}
            onReply={onReply}
            level={currentLevel + 1}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.replyRow, { marginLeft: level * 12 }]}>
      <View style={styles.replyConnector} />
      <View style={styles.replyContent}>
        <Avatar name={authorDisplayName} size={28} />
        <View style={styles.replyInner}>
          <View style={styles.replyHeader}>
            <Text style={styles.replyAuthor}>{authorDisplayName}</Text>
            <Text style={styles.replyTime}>{formatRelativeTime(reply.createdAt)}</Text>
            {isOwn && <Text style={styles.youTag}>You</Text>}
          </View>
          {renderCommentBody(reply.body, reply.mentions)}
          <View style={styles.replyActions}>
            <Pressable onPress={() => onLike(reply)} style={styles.actionText}>
              <Ionicons
                name={reply.likedByMe ? 'heart' : 'heart-outline'}
                size={14}
                color={reply.likedByMe ? colors.danger : colors.textMuted}
              />
              {(reply.likeCount ?? 0) > 0 && (
                <Text style={[styles.actionCountSmall, reply.likedByMe && { color: colors.danger }]}>
                  {reply.likeCount}
                </Text>
              )}
            </Pressable>
            <Pressable onPress={() => onReply(reply)} style={styles.actionText}>
              <Text style={styles.actionLabel}>Reply</Text>
            </Pressable>
            {(reply.replyCount ?? 0) > 0 && (
              <Pressable onPress={() => setShowReplies(!showReplies)} style={styles.actionText}>
                <Text style={styles.actionLabel}>
                  {showReplies ? `Hide ${reply.replyCount} repl${reply.replyCount === 1 ? 'y' : 'ies'}` : `View ${reply.replyCount} repl${reply.replyCount === 1 ? 'y' : 'ies'}`}
                </Text>
              </Pressable>
            )}
          </View>
          {showReplies && renderReplies(reply.replies, level + 1)}
        </View>
      </View>
    </View>
);
  }

const styles = StyleSheet.create({
  card: {
    paddingTop: 0,
  },
  cardFeed: {
    paddingTop: CARD_INSET,
    backgroundColor: colors.white,
  },
  cardNoDivider: {},
  inset: {
    paddingHorizontal: CARD_INSET,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    borderRadius: 9,
    backgroundColor: colors.white,
    padding: 1,
  },
  headerCopy: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    flexShrink: 1,
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  businessPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    backgroundColor: VERIFIED_TINT,
  },
  businessPillText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 10,
    lineHeight: 14,
    color: VERIFIED_BLUE,
  },
  youTag: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  meta: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  time: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    lineHeight: 16,
    color: colors.textMuted,
  },
  moreBtn: {
    width: 32,
    height: 28,
    marginRight: -6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrapper: {
    paddingTop: 10,
  },
  title: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  body: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 20,
    color: colors.text,
  },
  bodyAfterTitle: {
    marginTop: 2,
  },
  more: {
    fontFamily: typography.fontFamily.semibold,
    color: colors.textSecondary,
  },
  carousel: {
    marginTop: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 6,
  },
  statsLikes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeBubble: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  actionBarFeed: {
    marginHorizontal: CARD_INSET,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
  },
  postActionLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  postActionLabelActive: {
    color: colors.primary,
  },
  // Comment Sheet Styles (used by BottomSheet footer/content)
  loadingWrap: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  commentsContainer: {
    flex: 1,
  },
  commentsList: {
    paddingBottom: spacing.md,
  },
  commentsContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    marginTop: spacing.sm,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textMuted,
  },
  loadMoreBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: spacing.md,
  },
  loadMoreText: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.primary,
  },
  commentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  commentAuthor: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  commentTime: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  commentBody: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 20,
    color: colors.text,
  },
  commentActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  actionText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
  },
  actionCountSmall: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.textMuted,
  },
  replies: {
    marginTop: spacing.sm,
    marginLeft: 40,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingLeft: spacing.md,
  },
  repliesContainer: {
    marginTop: spacing.sm,
  },
  replyRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  replyConnector: {
    width: 2,
    backgroundColor: colors.border,
    marginRight: spacing.sm,
    marginTop: 4,
  },
  replyContent: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  replyInner: {
    flex: 1,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  replyAuthor: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xs,
    color: colors.text,
  },
  replyTime: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 10,
    color: colors.textMuted,
  },
  replyActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.text,
    maxHeight: 100,
  },
  inputContainer: {
    flex: 1,
  },
  mentionsList: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 4,
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  mentionName: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  mentionLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  replyIndicator: {
    position: 'absolute',
    bottom: '100%',
    left: 40,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  replyIndicatorInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  replyIndicatorText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: colors.primary,
  },
  replyToName: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.sm,
    color: colors.primary,
  },
  footerWrap: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sendBtn: {
    padding: 8,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});