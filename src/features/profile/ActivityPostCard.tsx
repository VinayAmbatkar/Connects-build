import { commentsApi } from '@/src/api/social';
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
import { VideoPlayer } from '@/src/components/VideoPlayer';
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
import { getErrorMessage } from '@/src/api/client';
import { searchApi } from '@/src/api/search';
import { patchEventEverywhere } from '@/src/features/events/feedCache';
import type { EventItem, Comment, ProfessionalSearchResult } from '@/src/types/api';
import { colors, spacing, typography, radius } from '@/src/theme/tokens';

import { appAlert } from '@/src/components/AppDialog';
import { usePlaceLabel } from '@/src/hooks/usePlaceLabels';
import { getWebOrigin } from '@/src/constants/app';
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
  const postedAt = item.createdAt ?? item.eventDate;
  const photos = getEventPhotoUrls(item);
  const profileId = authorProfileId(item);
  const myName = useAuthStore((s) => s.user?.fullName);
  const verified = item.ownerVerified === true;
  const businessVerified = item.ownerBusinessVerified === true;
  const roleLine = headline ?? formatRoleLabel(item.ownerRole);
  const timeLine = formatRelativeTime(postedAt);
  const viewingOwn =
    isOwn || (profileId != null && myId != null && String(profileId) === String(myId));
  // The post title used to be the last fallback here, so a post with no
  // owner name showed its title as the author.
  const displayName =
    authorName ?? item.ownerName ?? item.authorName ?? (viewingOwn ? myName : undefined) ?? 'Member';

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
      // Patch the cached copies (feed, profile lists, detail) so the state
      // survives scrolling -- invalidating ['events-feed'] here used to
      // re-download every loaded feed page after each tap.
      patchEventEverywhere(queryClient, item.id, (e) => ({
        ...e,
        likedByMe: nextLiked,
        likeCount: Math.max(0, nextCount),
      }));
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
    // The link goes inside the message: Android ignores Share's `url`
    // field (iOS-only), so it used to share the text with no link at all.
    // The site has no per-post page, so this points at COBILDS itself.
    const siteUrl = Platform.OS === 'web' ? window.location.origin : getWebOrigin();
    const shareTitle = item.title?.trim() || 'A post on COBILDS';
    const snippet = body.length > 200 ? `${body.slice(0, 200).trimEnd()}…` : body;
    const author = item.authorName ? ` by ${item.authorName}` : '';
    const shareMessage = [
      `${shareTitle}${author}`,
      snippet,
      `See more on COBILDS: ${siteUrl}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    try {
      const result = await Share.share({
        title: shareTitle,
        message: shareMessage,
      });

      if (result.action === Share.sharedAction) {
        setShareCount((c) => c + 1);
        setSharedByMe(true);
        // Optimistic update, then sync
        await eventsApi.shareEvent(item.id);
        patchEventEverywhere(queryClient, item.id, (e) => ({
          ...e,
          sharedByMe: true,
          shareCount: (e.shareCount ?? 0) + (e.sharedByMe ? 0 : 1),
        }));
      }
    } catch (e) {
      console.warn('Share failed', e);
    }
  }, [item.id, item.title, item.authorName, body, queryClient]);

  const handleDelete = useCallback(async () => {
    try {
      await eventsApi.remove(item.id);
      // Invalidate all relevant queries to trigger immediate refetch
      queryClient.invalidateQueries({ queryKey: ['my-events'] });
      queryClient.invalidateQueries({ queryKey: ['events-feed'] });
      queryClient.invalidateQueries({ queryKey: ['user-events'] });
      queryClient.invalidateQueries({ queryKey: ['event', String(item.id)] });
      appAlert('Deleted', 'Your post has been removed.');
    } catch (e) {
      appAlert("Couldn't delete", getErrorMessage(e));
    }
  }, [item.id, queryClient]);

  const handleMoreOptions = useCallback(() => {
    if (!viewingOwn) return;
    appAlert('Delete post?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: handleDelete,
      },
    ]);
  }, [viewingOwn, handleDelete]);

  const onCommentCountChange = useCallback(
    (delta: number) => {
      setCommentCount((c) => Math.max(0, c + delta));
      patchEventEverywhere(queryClient, item.id, (e) => ({
        ...e,
        commentCount: Math.max(0, (e.commentCount ?? 0) + delta),
      }));
    },
    [queryClient, item.id],
  );

  const onCommentsClose = useCallback(() => {
    Keyboard.dismiss();
    setCommentsVisible(false);
  }, []);

  const hasStats = likeCount > 0 || commentCount > 0 || shareCount > 0;
  const locationLabel = usePlaceLabel(item.location);
  const metaLine = [roleLine, locationLabel].filter(Boolean).join(' · ');
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
          onPress={handleMoreOptions}
          style={styles.moreBtn}
          accessibilityRole="button"
          accessibilityLabel={viewingOwn ? 'Post options' : 'More options'}
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
          resizeMode="contain"
          backgroundColor={colors.white}
          onPress={openEvent}
        />
      ) : null}

      {item.videoUrl ? <VideoTile url={item.videoUrl} rounded={!isFeed} /> : null}

      {hasStats ? (
        <View style={[styles.statsRow, isFeed && styles.inset]}>
          {likeCount > 0 ? (
            <View style={styles.statsLikes}>
              <View style={styles.likeBubble}>
                <Ionicons name="heart" size={9} color={colors.white} />
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
              name={likedByMe ? 'heart' : 'heart-outline'}
              size={ACTION_ICON_SIZE}
              color={likedByMe ? LIKE_RED : colors.textSecondary}
            />
          </Animated.View>
          <Text style={[styles.postActionLabel, likedByMe && styles.postActionLabelLiked]}>
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
        onCommentCountChange={onCommentCountChange}
      />
    </View>
  );
}

/* Comment Bottom Sheet Component - Uses the app's BottomSheet with proper Modal */
/** Applies fn to the comment with this id, wherever it sits in the reply tree. */
function updateInTree(list: Comment[], id: string | number, fn: (c: Comment) => Comment): Comment[] {
  return list.map((c) => {
    if (String(c.id) === String(id)) return fn(c);
    return c.replies?.length ? { ...c, replies: updateInTree(c.replies, id, fn) } : c;
  });
}

/** Removes a comment (and so its replies) from the tree, fixing the parent's reply count. */
function removeFromTree(list: Comment[], id: string | number): Comment[] {
  return list
    .filter((c) => String(c.id) !== String(id))
    .map((c) => {
      if (!c.replies?.length) return c;
      const replies = removeFromTree(c.replies, id);
      return replies.length === c.replies.length
        ? c
        : { ...c, replies, replyCount: Math.max(0, (c.replyCount ?? replies.length + 1) - 1) };
    });
}

function CommentBottomSheet({
  visible,
  onClose,
  eventId,
  initialComments,
  commentCount,
  onCommentCountChange,
}: {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  initialComments: Comment[];
  commentCount: number;
  onCommentCountChange: (delta: number) => void;
}) {
  const myId = useAuthStore((s) => s.user?.id);
  const myName = useAuthStore((s) => s.user?.fullName);
  // Top-level comments whose reply thread is open. Lifted up here (it was
  // per-row state) so posting a reply can open that thread -- replies used
  // to land inside a collapsed thread, which looked like nothing happened.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // People picked from the @ suggestions, so their ids go with the
  // comment. The old regex only took the first word after @, so a
  // two-word name like "Rahul Rao" never matched and never notified.
  const [pickedMentions, setPickedMentions] = useState<Array<{ id: string | number; name: string }>>([]);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
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
      setEditingComment(null);
      setPickedMentions([]);
      setExpandedIds(new Set());
    }
  }, [visible, fetchComments]);

  // Fetch mentions for @ suggestions using search API
  const [mentionSearchDebounce, setMentionSearchDebounce] = useState('');

  // The @word being typed at the end of the text (it used to only work
  // when @ was the very first character of the comment).
  const activeMentionQuery = /(^|\s)@([^\s@]*)$/.exec(input)?.[2] ?? null;

  useEffect(() => {
    if (activeMentionQuery != null) {
      setMentionSearchDebounce(activeMentionQuery.toLowerCase());
    } else {
      setMentionSearchDebounce('');
      setMentions([]);
    }
  }, [activeMentionQuery]);

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
      setInput(input.slice(0, beforeAt) + `@${name} `);
      setPickedMentions((prev) =>
        prev.some((m) => String(m.id) === String(user.id)) ? prev : [...prev, { id: user.id, name }],
      );
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    setShowMentions(false);
  };

  // Ids of picked people whose "@Full Name" is still in the text.
  const extractMentionedUserIds = (text: string): (string | number)[] =>
    pickedMentions.filter((m) => text.includes(`@${m.name}`)).map((m) => m.id);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    if (editingComment) {
      try {
        await commentsApi.update(editingComment.id, text);
        setComments((prev) =>
          updateInTree(prev, editingComment.id, (c) => ({ ...c, body: text, updatedAt: new Date().toISOString() })),
        );
        setEditingComment(null);
        setInput('');
      } catch (e) {
        appAlert("Couldn't edit comment", getErrorMessage(e));
      } finally {
        setSending(false);
      }
      return;
    }
    try {
      const mentionedUserIds = extractMentionedUserIds(text);
      const parentId = replyingTo ? replyParentId(replyingTo, comments) : undefined;
      const created = await eventsApi.addComment(eventId, text, parentId, mentionedUserIds);
      // Fill in the author if the response lacks it (older backends) -- it's us.
      const newComment: Comment = {
        ...created,
        replies: created.replies ?? [],
        commenter: created.commenter ?? (myId != null ? { userId: myId, name: myName ?? 'You' } : undefined),
        authorId: created.authorId ?? (myId as string | number),
      };

      if (parentId != null) {
        const root = rootIdOf(comments, parentId);
        setComments((prev) => addReply(prev, parentId, newComment));
        if (root != null) setExpandedIds((prev) => new Set(prev).add(String(root)));
      } else {
        setComments((prev) => [newComment, ...prev]);
      }

      setInput('');
      setReplyingTo(null);
      setPickedMentions([]);
      onCommentCountChange(1);
      inputRef.current?.focus();
    } catch (e) {
      // Used to be try/finally only: a failed send (e.g. the backend's
      // reply-depth cap) silently did nothing.
      appAlert(replyingTo ? "Couldn't post reply" : "Couldn't post comment", getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const handleLikeComment = async (comment: Comment) => {
    const nextLiked = !comment.likedByMe;
    const nextCount = comment.likedByMe ? (comment.likeCount ?? 1) - 1 : (comment.likeCount ?? 0) + 1;
    setComments((prev) =>
      updateInTree(prev, comment.id, (c) => ({ ...c, likedByMe: nextLiked, likeCount: Math.max(0, nextCount) })),
    );
    try {
      if (nextLiked) {
        await apiClient.post(`/comments/${comment.id}/likes`);
      } else {
        await apiClient.delete(`/comments/${comment.id}/likes`);
      }
    } catch {
      setComments((prev) =>
        updateInTree(prev, comment.id, (c) => ({ ...c, likedByMe: comment.likedByMe, likeCount: comment.likeCount })),
      );
    }
  };

const getAuthorName = (comment: Comment) => comment.authorName ?? comment.commenter?.name ?? 'Unknown';

  const footer = (
      <View style={styles.footerWrap}>
        {editingComment && (
          <View style={styles.replyIndicatorInner}>
            <Text style={styles.replyIndicatorText}>Editing your comment</Text>
            <Pressable
              onPress={() => {
                setEditingComment(null);
                setInput('');
              }}
              hitSlop={8}
            >
              <Ionicons name="close" size={14} color={colors.textMuted} />
            </Pressable>
          </View>
        )}
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
            {showMentions && activeMentionQuery != null && mentions.length > 0 && (
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
    setEditingComment(null);
    setReplyingTo(comment);
    inputRef.current?.focus();
  };

  const handleOwnMenu = (comment: Comment) => {
    appAlert('Your comment', undefined, [
      {
        text: 'Edit',
        onPress: () => {
          setReplyingTo(null);
          setEditingComment(comment);
          setInput(comment.body);
          setTimeout(() => inputRef.current?.focus(), 50);
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          appAlert('Delete comment?', 'This removes the comment and its replies.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  await commentsApi.remove(comment.id);
                  setComments((prev) => removeFromTree(prev, comment.id));
                  // The comment and every reply under it are gone. (This
                  // used to call the "comment added" handler, so deleting
                  // raised the count.)
                  onCommentCountChange(-(1 + countDescendants(comment)));
                } catch (e) {
                  appAlert("Couldn't delete comment", getErrorMessage(e));
                }
              },
            },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
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
                  expanded={expandedIds.has(String(comment.id))}
                  onToggleReplies={() =>
                    setExpandedIds((prev) => {
                      const next = new Set(prev);
                      const key = String(comment.id);
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    })
                  }
                  onLike={handleLikeComment}
                  onReply={handleReply}
                  onOwnMenu={handleOwnMenu}
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

/* Comment thread rendering.
 *
 * Replies show as ONE indented list under their top-level comment, in
 * thread order, each labelled with who it answers ("↳ Asha") when that
 * isn't the top-level comment. The backend nests replies up to 8 deep;
 * rendering that nesting literally (as this used to, adding the indent
 * twice per level) squeezed replies-to-replies into a sliver at the right
 * edge. Flattening keeps every reply readable at the same width.
 */

const MAX_COMMENT_DEPTH = 8; // backend comment.MaxCommentDepth

const commentAuthorName = (c: Comment) => c.authorName ?? c.commenter?.name ?? 'Unknown';

type FlatReply = { reply: Comment; replyToName?: string };

/** Every descendant of a top-level comment, depth-first in thread order. */
function flattenReplies(top: Comment): FlatReply[] {
  const out: FlatReply[] = [];
  const walk = (parent: Comment, isTop: boolean) => {
    for (const r of parent.replies ?? []) {
      out.push({ reply: r, replyToName: isTop ? undefined : commentAuthorName(parent) });
      walk(r, false);
    }
  };
  walk(top, true);
  return out;
}

function countDescendants(c: Comment): number {
  return (c.replies ?? []).reduce((n, r) => n + 1 + countDescendants(r), 0);
}

function findPath(list: Comment[], id: string | number, path: Comment[] = []): Comment[] | null {
  for (const c of list) {
    const here = [...path, c];
    if (String(c.id) === String(id)) return here;
    const deeper = findPath(c.replies ?? [], id, here);
    if (deeper) return deeper;
  }
  return null;
}

/** Which comment a reply attaches to: normally the one tapped; at the
 *  backend's depth cap, its parent instead (same thread, still labelled)
 *  rather than failing with "maximum reply depth". */
function replyParentId(target: Comment, tree: Comment[]): string | number {
  const path = findPath(tree, target.id);
  const depth = target.depth ?? (path ? path.length - 1 : 0);
  if (depth >= MAX_COMMENT_DEPTH && path && path.length >= 2) {
    return path[path.length - 2].id;
  }
  return target.id;
}

/** Top-level ancestor id of a comment. */
function rootIdOf(tree: Comment[], id: string | number): string | number | null {
  const path = findPath(tree, id);
  return path ? path[0].id : null;
}

/** Appends a reply under its parent (oldest-first, like the server). */
function addReply(list: Comment[], parentId: string | number, reply: Comment): Comment[] {
  return list.map((c) => {
    if (String(c.id) === String(parentId)) {
      return { ...c, replies: [...(c.replies ?? []), reply], replyCount: (c.replyCount ?? 0) + 1 };
    }
    return c.replies?.length ? { ...c, replies: addReply(c.replies, parentId, reply) } : c;
  });
}

function CommentBody({ body, mentions }: { body: string; mentions?: Comment['mentions'] }) {
  if (!mentions?.length) return <Text style={styles.commentBody}>{body}</Text>;

  // Find every mention first, then emit text in order. The old loop walked
  // mentions longest-name-first with one moving cursor, so it skipped any
  // mention appearing earlier in the text than a longer one.
  const hits: Array<{ start: number; end: number; userId?: string | number; text: string }> = [];
  for (const m of mentions) {
    const text = `@${m.name}`;
    let from = 0;
    for (;;) {
      const at = body.indexOf(text, from);
      if (at === -1) break;
      if (!hits.some((h) => at < h.end && at + text.length > h.start)) {
        hits.push({ start: at, end: at + text.length, userId: m.userId, text });
      }
      from = at + text.length;
    }
  }
  hits.sort((a, b) => a.start - b.start);

  const segments: React.ReactNode[] = [];
  let cursor = 0;
  hits.forEach((h, i) => {
    if (h.start > cursor) segments.push(body.slice(cursor, h.start));
    segments.push(
      <Text
        key={`m-${i}`}
        style={styles.mentionLink}
        onPress={() => {
          if (h.userId != null) router.push(`/public-profile/${h.userId}` as Href);
        }}
      >
        {h.text}
      </Text>,
    );
    cursor = h.end;
  });
  if (cursor < body.length) segments.push(body.slice(cursor));
  return <Text style={styles.commentBody}>{segments}</Text>;
}

type CommentHandlers = {
  myId?: string | number;
  onLike: (comment: Comment) => void;
  onReply: (comment: Comment) => void;
  onOwnMenu: (comment: Comment) => void;
};

const isOwnComment = (c: Comment, myId?: string | number) =>
  myId != null && String(c.authorId ?? c.commenter?.userId) === String(myId);

function CommentActions({
  comment,
  small,
  myId,
  onLike,
  onReply,
  onOwnMenu,
  trailing,
}: CommentHandlers & { comment: Comment; small?: boolean; trailing?: React.ReactNode }) {
  return (
    <View style={styles.commentActions}>
      <Pressable onPress={() => onLike(comment)} style={styles.actionText} hitSlop={6}>
        <Ionicons
          name={comment.likedByMe ? 'heart' : 'heart-outline'}
          size={small ? 14 : 16}
          color={comment.likedByMe ? colors.danger : colors.textMuted}
        />
        {(comment.likeCount ?? 0) > 0 && (
          <Text style={[styles.actionCountSmall, comment.likedByMe && { color: colors.danger }]}>
            {comment.likeCount}
          </Text>
        )}
      </Pressable>
      <Pressable onPress={() => onReply(comment)} style={styles.actionText} hitSlop={6}>
        <Text style={styles.actionLabel}>Reply</Text>
      </Pressable>
      {isOwnComment(comment, myId) ? (
        <Pressable
          onPress={() => onOwnMenu(comment)}
          style={styles.actionText}
          hitSlop={8}
          accessibilityLabel="Edit or delete comment"
        >
          <Ionicons name="ellipsis-horizontal" size={small ? 14 : 16} color={colors.textMuted} />
        </Pressable>
      ) : null}
      {trailing}
    </View>
  );
}

function CommentHeader({ comment, small, myId }: { comment: Comment; small?: boolean; myId?: string | number }) {
  return (
    <View style={styles.commentHeader}>
      <Text style={[small ? styles.replyAuthor : styles.commentAuthor, styles.commentAuthorShrink]} numberOfLines={1}>
        {commentAuthorName(comment)}
      </Text>
      <Text style={small ? styles.replyTime : styles.commentTime}>{formatRelativeTime(comment.createdAt)}</Text>
      {isOwnComment(comment, myId) && <Text style={styles.youTag}>You</Text>}
    </View>
  );
}

/* One top-level comment plus (when expanded) its whole reply thread. */
function CommentItem({
  comment,
  expanded,
  onToggleReplies,
  ...handlers
}: CommentHandlers & { comment: Comment; expanded: boolean; onToggleReplies: () => void }) {
  const thread = flattenReplies(comment);
  const total = thread.length;

  return (
    <View style={styles.commentRow}>
      <Avatar name={commentAuthorName(comment)} size={32} />
      <View style={styles.commentContent}>
        <CommentHeader comment={comment} myId={handlers.myId} />
        <CommentBody body={comment.body} mentions={comment.mentions} />
        <CommentActions
          comment={comment}
          {...handlers}
          trailing={
            total > 0 ? (
              <Pressable onPress={onToggleReplies} style={styles.actionText} hitSlop={6}>
                <Text style={styles.actionLabel}>
                  {expanded ? 'Hide' : 'View'} {total} repl{total === 1 ? 'y' : 'ies'}
                </Text>
              </Pressable>
            ) : null
          }
        />
        {expanded && total > 0 ? (
          <View style={styles.repliesContainer}>
            {thread.map(({ reply, replyToName }) => (
              <ReplyItem key={String(reply.id)} reply={reply} replyToName={replyToName} {...handlers} />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/* A reply, at one fixed indent whatever its depth. */
function ReplyItem({ reply, replyToName, ...handlers }: CommentHandlers & { reply: Comment; replyToName?: string }) {
  return (
    <View style={styles.replyRow}>
      <Avatar name={commentAuthorName(reply)} size={26} />
      <View style={styles.replyInner}>
        <CommentHeader comment={reply} small myId={handlers.myId} />
        {replyToName ? (
          <Text style={styles.replyToLabel} numberOfLines={1}>
            ↳ {replyToName}
          </Text>
        ) : null}
        <CommentBody body={reply.body} mentions={reply.mentions} />
        <CommentActions comment={reply} small {...handlers} />
      </View>
    </View>
  );
}

/* A video attachment, played inside the app (see VideoPlayer). It used to
 * hand the URL to Linking.openURL, which opened the browser. */
export function VideoTile({ url, rounded }: { url: string; rounded?: boolean }) {
  return <VideoPlayer url={url} style={[styles.videoTile, rounded && { borderRadius: radius.md }]} />;
}

/** Liked-heart colour (the stats bubble uses it too). */
const LIKE_RED = '#E0245E';

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
    backgroundColor: LIKE_RED,
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
  postActionLabelLiked: {
    color: LIKE_RED,
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
    paddingLeft: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
  replyRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  commentAuthorShrink: {
    flexShrink: 1,
  },
  replyToLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  videoTile: {
    marginTop: 10,
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