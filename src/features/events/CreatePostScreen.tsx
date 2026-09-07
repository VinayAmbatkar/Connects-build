import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/src/components/Avatar';
import { BottomSheet } from '@/src/components/BottomSheet';
import { getErrorMessage } from '@/src/api/client';
import { eventsApi } from '@/src/api/events';
import {
  LOCATION_OPTIONS,
  getLocationLabel,
} from '@/src/constants/category';
import { useAuthStore } from '@/src/store/authStore';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

type AttachmentType = 'none' | 'photos' | 'video';

type PickedMedia = {
  uri: string;
  name: string;
  type: string;
  fileSize?: number | null;
};

const MIN_PHOTOS = 2;
const MAX_PHOTOS = 4;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const ALLOWED_PHOTO = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ALLOWED_VIDEO = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function toFormFile(asset: PickedMedia) {
  return {
    uri: asset.uri,
    name: asset.name,
    type: asset.type,
  } as unknown as Blob;
}

export function CreatePostScreen() {
  const params = useLocalSearchParams<{ attach?: string }>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [location, setLocation] = useState('');
  const [locOpen, setLocOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [attachmentType, setAttachmentType] = useState<AttachmentType>('none');
  const [photos, setPhotos] = useState<PickedMedia[]>([]);
  const [video, setVideo] = useState<PickedMedia | null>(null);
  const [mediaError, setMediaError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [allowLeave, setAllowLeave] = useState(false);

  useEffect(() => {
    const attach = String(params.attach ?? '');
    if (attach === 'photos') {
      void pickPhotos();
    } else if (attach === 'video') {
      void pickVideo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open picker once from deep link
  }, [params.attach]);

  const canSubmit = useMemo(
    () => title.trim().length > 0 && !submitting,
    [title, submitting],
  );

  const hasDraft = useMemo(
    () =>
      Boolean(
        title.trim() ||
          body.trim() ||
          location ||
          photos.length > 0 ||
          video,
      ),
    [title, body, location, photos.length, video],
  );

  const discardAndLeave = () => {
    setAllowLeave(true);
    router.back();
  };

  const confirmDiscard = () => {
    if (!hasDraft || submitting) {
      router.back();
      return;
    }
    Alert.alert(
      'Discard post?',
      'Do you want to discard this Post?',
      [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: discardAndLeave,
        },
      ],
    );
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (allowLeave || !hasDraft || submitting) return;
      e.preventDefault();
      Alert.alert(
        'Discard post?',
        'Do you want to discard this Post?',
        [
          { text: 'Keep editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setAllowLeave(true);
              navigation.dispatch(e.data.action);
            },
          },
        ],
      );
    });
    return unsubscribe;
  }, [navigation, allowLeave, hasDraft, submitting]);

  const locationLabel = location
    ? getLocationLabel(location) || location
    : 'Add location';

  const clearMedia = () => {
    setAttachmentType('none');
    setPhotos([]);
    setVideo(null);
    setMediaError('');
  };

  const pickPhotos = async () => {
    setMoreOpen(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to attach images.');
      return;
    }

    const remaining = MAX_PHOTOS - (attachmentType === 'photos' ? photos.length : 0);
    if (remaining <= 0) {
      setMediaError(`You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
    });

    if (result.canceled || !result.assets.length) return;

    const next: PickedMedia[] = [];
    for (const asset of result.assets) {
      const mime = (asset.mimeType ?? 'image/jpeg').toLowerCase();
      if (!ALLOWED_PHOTO.has(mime) && !mime.startsWith('image/')) {
        setMediaError('Use JPEG, PNG, or WebP images.');
        continue;
      }
      next.push({
        uri: asset.uri,
        name: asset.fileName ?? `photo-${Date.now()}.jpg`,
        type: mime.startsWith('image/') ? mime : 'image/jpeg',
        fileSize: asset.fileSize,
      });
    }

    setVideo(null);
    setAttachmentType('photos');
    setPhotos((prev) => {
      const base = attachmentType === 'photos' ? prev : [];
      return [...base, ...next].slice(0, MAX_PHOTOS);
    });
    setMediaError('');
  };

  const pickVideo = async () => {
    setMoreOpen(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow media library access to attach a video.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: false,
      quality: 1,
      videoMaxDuration: 180,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const mime = (asset.mimeType ?? 'video/mp4').toLowerCase();
    if (!ALLOWED_VIDEO.has(mime) && !mime.startsWith('video/')) {
      setMediaError('Use MP4, WebM, or MOV video.');
      return;
    }
    if (asset.fileSize != null && asset.fileSize > MAX_VIDEO_BYTES) {
      setMediaError('Video must be 50MB or smaller.');
      return;
    }

    setPhotos([]);
    setAttachmentType('video');
    setVideo({
      uri: asset.uri,
      name: asset.fileName ?? `video-${Date.now()}.mp4`,
      type: mime.startsWith('video/') ? mime : 'video/mp4',
      fileSize: asset.fileSize,
    });
    setMediaError('');
  };

  const finishAndGoBack = async () => {
    await queryClient.invalidateQueries({ queryKey: ['events-feed'] });
    await queryClient.invalidateQueries({ queryKey: ['my-events'] });
    Alert.alert('Posted', 'Your post is live on the feed.');
    setAllowLeave(true);
    router.back();
  };

  const submit = async () => {
    const trimmedTitle = title.trim();
    const text = body.trim();
    if (!trimmedTitle) {
      Alert.alert('Title required', 'Add a title before posting.');
      return;
    }
    if (attachmentType === 'photos' && photos.length > 0 && photos.length < MIN_PHOTOS) {
      setMediaError(`Add at least ${MIN_PHOTOS} photos (up to ${MAX_PHOTOS}).`);
      return;
    }

    setSubmitting(true);
    setMediaError('');
    try {
      const created = await eventsApi.create({
        title: trimmedTitle,
        description: text,
        location: location.trim(),
        eventDate: new Date(todayIsoDate()).toISOString(),
      });

      try {
        if (attachmentType === 'photos' && photos.length > 0) {
          const formData = new FormData();
          photos.forEach((photo) => formData.append('photos', toFormFile(photo)));
          await eventsApi.uploadPhotos(created.id, formData);
        } else if (attachmentType === 'video' && video) {
          const formData = new FormData();
          formData.append('video', toFormFile(video));
          await eventsApi.uploadVideo(created.id, formData);
        }
      } catch (uploadError) {
        Alert.alert(
          'Posted without media',
          `Your post was created, but media upload failed: ${getErrorMessage(uploadError)}`,
        );
        await queryClient.invalidateQueries({ queryKey: ['events-feed'] });
        await queryClient.invalidateQueries({ queryKey: ['my-events'] });
        setAllowLeave(true);
        router.back();
        return;
      }

      await finishAndGoBack();
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const displayName = user?.fullName ?? 'You';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable
            onPress={confirmDiscard}
            hitSlop={10}
            style={styles.iconBtn}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>

          <Avatar name={displayName} size={36} />

          <Pressable
            style={[styles.locationChip, location ? styles.locationChipActive : null]}
            onPress={() => setLocOpen(true)}
          >
            <Ionicons
              name="location-outline"
              size={14}
              color={location ? colors.primaryDark : colors.textSecondary}
            />
            <Text
              style={[
                styles.locationChipText,
                location ? styles.locationChipTextActive : null,
              ]}
              numberOfLines={1}
            >
              {locationLabel}
            </Text>
            <Ionicons
              name="chevron-down"
              size={14}
              color={location ? colors.primaryDark : colors.textSecondary}
            />
          </Pressable>

          <View style={styles.headerSpacer} />

          <Pressable
            style={[styles.postBtn, !canSubmit && styles.postBtnDisabled]}
            disabled={!canSubmit}
            onPress={() => void submit()}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text
                style={[styles.postBtnText, !canSubmit && styles.postBtnTextDisabled]}
              >
                Post
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Add Event Title"
            placeholderTextColor={colors.textMuted}
            style={styles.titleInput}
            autoFocus
            returnKeyType="next"
          />

          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Share Your Events thoughts"
            placeholderTextColor={colors.textMuted}
            style={styles.bodyInput}
            multiline
            textAlignVertical="top"
          />

          {photos.length > 0 ? (
            <View style={styles.mediaSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbsRow}
              >
                {photos.map((photo, index) => (
                  <View key={`${photo.uri}-${index}`} style={styles.thumbWrap}>
                    <Image source={{ uri: photo.uri }} style={styles.thumb} />
                    <Pressable
                      style={styles.thumbRemove}
                      onPress={() => {
                        const next = photos.filter((_, i) => i !== index);
                        setPhotos(next);
                        if (!next.length) clearMedia();
                      }}
                    >
                      <Ionicons name="close" size={14} color={colors.white} />
                    </Pressable>
                  </View>
                ))}
                {photos.length < MAX_PHOTOS ? (
                  <Pressable style={styles.addThumb} onPress={() => void pickPhotos()}>
                    <Ionicons name="add" size={22} color={colors.primary} />
                  </Pressable>
                ) : null}
              </ScrollView>
              <Text style={styles.mediaHint}>
                {photos.length} of {MIN_PHOTOS}–{MAX_PHOTOS} photos
              </Text>
            </View>
          ) : null}

          {video ? (
            <View style={styles.videoCard}>
              <Ionicons name="videocam" size={22} color={colors.primary} />
              <Text style={styles.videoName} numberOfLines={1}>
                {video.name}
              </Text>
              <Pressable onPress={clearMedia} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          ) : null}

          {mediaError ? <Text style={styles.error}>{mediaError}</Text> : null}
        </ScrollView>

        <View style={styles.toolbar}>
          <View style={styles.toolbarLeft}>
            {location ? (
              <View style={styles.locBadge}>
                <Ionicons name="location" size={12} color={colors.primary} />
                <Text style={styles.locBadgeText} numberOfLines={1}>
                  {getLocationLabel(location) || location}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.toolbarRight}>
            <Pressable
              style={styles.toolBtn}
              onPress={() => void pickPhotos()}
              accessibilityLabel="Add photos"
            >
              <Ionicons name="image-outline" size={26} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              style={styles.toolBtn}
              onPress={() => setMoreOpen(true)}
              accessibilityLabel="More attachments"
            >
              <Ionicons name="add" size={28} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <BottomSheet
        visible={locOpen}
        title="Select location"
        subtitle="Where is this post about?"
        onClose={() => setLocOpen(false)}
        tall
        footer={
          location ? (
            <Pressable
              style={styles.clearLocBtn}
              onPress={() => {
                setLocation('');
                setLocOpen(false);
              }}
            >
              <Text style={styles.clearLocText}>Clear location</Text>
            </Pressable>
          ) : null
        }
      >
        {LOCATION_OPTIONS.map((opt) => {
          const active = opt.id === location;
          return (
            <Pressable
              key={opt.id}
              style={[styles.optionRow, active && styles.optionRowActive]}
              onPress={() => {
                setLocation(opt.id);
                setLocOpen(false);
              }}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>
                {opt.label}
              </Text>
              {active ? (
                <Ionicons name="checkmark" size={18} color={colors.primary} />
              ) : null}
            </Pressable>
          );
        })}
      </BottomSheet>

      <BottomSheet
        visible={moreOpen}
        title="Add to your post"
        onClose={() => setMoreOpen(false)}
      >
        <Pressable style={styles.moreRow} onPress={() => void pickPhotos()}>
          <View style={[styles.moreIcon, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="image-outline" size={20} color="#2E7D32" />
          </View>
          <View style={styles.moreCopy}>
            <Text style={styles.moreTitle}>Photos</Text>
            <Text style={styles.moreSub}>Add 2–4 images</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
        <Pressable style={styles.moreRow} onPress={() => void pickVideo()}>
          <View style={[styles.moreIcon, { backgroundColor: '#E3F2FD' }]}>
            <Ionicons name="videocam-outline" size={20} color="#1565C0" />
          </View>
          <View style={styles.moreCopy}>
            <Text style={styles.moreTitle}>Video</Text>
            <Text style={styles.moreSub}>One video, up to 50MB</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
        <Pressable
          style={styles.moreRow}
          onPress={() => {
            setMoreOpen(false);
            setLocOpen(true);
          }}
        >
          <View style={[styles.moreIcon, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name="location-outline" size={20} color={colors.primaryDark} />
          </View>
          <View style={styles.moreCopy}>
            <Text style={styles.moreTitle}>Location</Text>
            <Text style={styles.moreSub}>Tag a city</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 150,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
  },
  locationChipActive: {
    backgroundColor: colors.primaryMuted,
  },
  locationChipText: {
    flexShrink: 1,
    fontFamily: typography.fontFamily.semibold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  locationChipTextActive: {
    color: colors.primaryDark,
  },
  headerSpacer: { flex: 1 },
  postBtn: {
    minWidth: 72,
    height: 34,
    paddingHorizontal: 16,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtnDisabled: {
    backgroundColor: '#E5E7EB',
  },
  postBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 14,
    color: colors.white,
  },
  postBtnTextDisabled: {
    color: '#9CA3AF',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  titleInput: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 20,
    lineHeight: 28,
    color: colors.text,
    padding: 0,
    marginBottom: 10,
  },
  bodyInput: {
    minHeight: 140,
    fontFamily: typography.fontFamily.regular,
    fontSize: 17,
    lineHeight: 26,
    color: colors.text,
    padding: 0,
  },
  mediaSection: {
    marginTop: spacing.md,
    gap: 8,
  },
  thumbsRow: {
    gap: 8,
  },
  thumbWrap: {
    width: 96,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumb: { width: '100%', height: '100%' },
  thumbRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(15,23,42,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addThumb: {
    width: 96,
    height: 96,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryMuted,
  },
  mediaHint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  videoCard: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  videoName: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  error: {
    marginTop: 10,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.xs,
    color: colors.danger,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  toolbarLeft: { flex: 1, paddingRight: 8 },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toolBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
  },
  locBadgeText: {
    flexShrink: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: 12,
    color: colors.primaryDark,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionRowActive: {
    backgroundColor: colors.primaryMuted,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  optionText: {
    flex: 1,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  optionTextActive: {
    color: colors.primaryDark,
    fontFamily: typography.fontFamily.semibold,
  },
  clearLocBtn: {
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearLocText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  moreIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreCopy: { flex: 1 },
  moreTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
  },
  moreSub: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
});
