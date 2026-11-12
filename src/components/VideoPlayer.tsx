import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { requireOptionalNativeModule, useEvent } from 'expo';
import type { VideoPlayer as Player } from 'expo-video';
import { colors, typography } from '@/src/theme/tokens';

// expo-video is loaded only when its native module is in this build.
// Importing it statically threw "Cannot find native module 'ExpoVideo'" at
// module load in any binary built before it was added -- and since the feed
// imports this file, that took the whole tab down, not just the video.
// Looked up when the player renders (a registry lookup; require is cached),
// so nothing touches the native side at module load.
function loadVideoLib(): typeof import('expo-video') | null {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return requireOptionalNativeModule('ExpoVideo') ? require('expo-video') : null;
}

type Props = {
  url: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * In-app video for posts. Shows a tap-to-play tile first and only creates a
 * player once tapped, so a feed full of videos doesn't download (or hold
 * decoders for) any of them until the user actually wants one. Plays inline
 * with native controls, including fullscreen -- the video never leaves the
 * app for the browser.
 */
export function VideoPlayer({ url, style }: Props) {
  const [started, setStarted] = useState(false);
  const videoLib = started ? loadVideoLib() : null;

  // A different video in the same slot (list recycling) starts as a tile again.
  useEffect(() => setStarted(false), [url]);

  return (
    <View style={[styles.frame, style]}>
      {started && videoLib ? (
        <InlinePlayer url={url} lib={videoLib} />
      ) : started ? (
        <View style={styles.center}>
          <Ionicons name="refresh-circle-outline" size={40} color={colors.white} />
          <Text style={styles.caption}>Update the app to play videos</Text>
        </View>
      ) : (
        <Pressable
          style={styles.center}
          onPress={() => setStarted(true)}
          accessibilityRole="button"
          accessibilityLabel="Play video"
        >
          <Ionicons name="play-circle" size={60} color={colors.white} />
          <Text style={styles.caption}>Play video</Text>
        </Pressable>
      )}
    </View>
  );
}

/** The player currently making sound -- starting another pauses it. */
let activePlayer: Player | null = null;

function InlinePlayer({ url, lib }: { url: string; lib: typeof import('expo-video') }) {
  const { useVideoPlayer, VideoView } = lib;
  const player = useVideoPlayer({ uri: url, useCaching: true }, (p) => {
    p.loop = false;
    p.play();
  });

  const { status, error } = useEvent(player, 'statusChange', { status: player.status, error: undefined });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  useEffect(() => {
    if (!isPlaying) return;
    if (activePlayer && activePlayer !== player) {
      try {
        activePlayer.pause();
      } catch {
        // That player was already released (its post scrolled away).
      }
    }
    activePlayer = player;
  }, [isPlaying, player]);

  useEffect(
    () => () => {
      if (activePlayer === player) activePlayer = null;
    },
    [player],
  );

  const retry = () => {
    void player.replaceAsync({ uri: url, useCaching: true }).then(() => player.play());
  };

  return (
    <View style={styles.fill}>
      <VideoView
        style={styles.fill}
        player={player}
        nativeControls
        contentFit="contain"
        fullscreenOptions={{ enable: true }}
      />
      {status === 'loading' ? (
        <View style={[styles.center, styles.overlay]} pointerEvents="none">
          <ActivityIndicator color={colors.white} size="large" />
        </View>
      ) : null}
      {status === 'error' ? (
        <View style={[styles.center, styles.overlay, styles.errorBg]}>
          <Ionicons name="alert-circle-outline" size={36} color={colors.white} />
          <Text style={styles.caption}>Couldn't play this video</Text>
          {__DEV__ && error?.message ? (
            <Text style={styles.detail} numberOfLines={2}>
              {error.message}
            </Text>
          ) : null}
          <Pressable onPress={retry} style={styles.retry} accessibilityRole="button">
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: 16 / 9,
    backgroundColor: '#111827',
    overflow: 'hidden',
  },
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12 },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  errorBg: { backgroundColor: 'rgba(17, 24, 39, 0.92)' },
  caption: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.white,
  },
  detail: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  retry: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  retryText: { fontFamily: typography.fontFamily.semibold, fontSize: 13, color: colors.white },
});
