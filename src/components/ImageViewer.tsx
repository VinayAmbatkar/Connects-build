import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, typography } from '@/src/theme/tokens';

type Props = {
  /** Photos to page through; null/empty closes the viewer. */
  urls: string[] | null;
  /** Which photo opens first. */
  initialIndex?: number;
  /** Optional caption under the photo (e.g. a project name). */
  caption?: string;
  onClose: () => void;
};

/**
 * Full-screen, in-app photo viewer: swipe between photos, tap X or the back
 * button to close. Used wherever a photo used to be handed to the browser
 * (chat attachments) and for project photos.
 */
export function ImageViewer({ urls, initialIndex = 0, caption, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const visible = !!urls && urls.length > 0;
  const { width, height } = Dimensions.get('window');
  const [index, setIndex] = useState(initialIndex);
  const listRef = useRef<FlatList<string>>(null);

  useEffect(() => {
    if (visible) setIndex(initialIndex);
  }, [visible, initialIndex]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  if (!visible) return null;

  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.screen}>
        <FlatList
          ref={listRef}
          data={urls}
          keyExtractor={(u, i) => `${u}-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={Math.min(initialIndex, urls.length - 1)}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onScroll={onScroll}
          scrollEventThrottle={16}
          renderItem={({ item }) => <Slide uri={item} width={width} height={height} />}
        />

        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          {urls.length > 1 ? (
            <Text style={styles.counter}>
              {index + 1} / {urls.length}
            </Text>
          ) : (
            <View />
          )}
          <Pressable onPress={onClose} hitSlop={12} style={styles.close} accessibilityRole="button" accessibilityLabel="Close photo">
            <Ionicons name="close" size={26} color={colors.white} />
          </Pressable>
        </View>

        {caption ? (
          <View style={[styles.captionBar, { paddingBottom: insets.bottom + 16 }]} pointerEvents="none">
            <Text style={styles.caption} numberOfLines={2}>
              {caption}
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function Slide({ uri, width, height }: { uri: string; width: number; height: number }) {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  return (
    <View style={[styles.slide, { width, height }]}>
      <Image
        source={{ uri }}
        style={styles.image}
        resizeMode="contain"
        onLoad={() => setState('ok')}
        onError={() => setState('error')}
        accessibilityLabel="Photo"
      />
      {state === 'loading' ? <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.white} /> : null}
      {state === 'error' ? (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Ionicons name="image-outline" size={40} color="rgba(255,255,255,0.6)" />
          <Text style={styles.errorText}>Couldn't load this photo</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  slide: { alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  errorText: { fontFamily: typography.fontFamily.medium, fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  counter: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    color: colors.white,
    fontFamily: typography.fontFamily.semibold,
    fontSize: 13,
  },
  close: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  caption: { color: colors.white, fontFamily: typography.fontFamily.semibold, fontSize: 15 },
});

// ── Global viewer: showImages() from anywhere, rendered by <ImageViewerHost />
//    (mounted once in app/_layout.tsx). ─────────────────────────────────────

type ViewerRequest = { urls: string[]; index: number; caption?: string } | null;
let current: ViewerRequest = null;
const viewerListeners = new Set<(r: ViewerRequest) => void>();

/** Open photos full screen inside the app. */
export function showImages(urls: string[], index = 0, caption?: string) {
  current = urls.length ? { urls, index, caption } : null;
  viewerListeners.forEach((l) => l(current));
}

export function ImageViewerHost() {
  const [req, setReq] = useState<ViewerRequest>(current);
  useEffect(() => {
    viewerListeners.add(setReq);
    return () => {
      viewerListeners.delete(setReq);
    };
  }, []);
  return (
    <ImageViewer
      urls={req?.urls ?? null}
      initialIndex={req?.index ?? 0}
      caption={req?.caption}
      onClose={() => showImages([])}
    />
  );
}
