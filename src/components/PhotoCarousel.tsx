import { useCallback, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageResizeMode,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

type Props = {
  urls: string[];
  height?: number;
  /** Called when the user taps the active photo. */
  onPress?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  /** `contain` shows the full photo; `cover` fills and may crop. */
  resizeMode?: ImageResizeMode;
};

const DEFAULT_WIDTH = Dimensions.get('window').width;

export function PhotoCarousel({
  urls,
  height = 280,
  onPress,
  style,
  borderRadius = 0,
  resizeMode = 'cover',
}: Props) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [index, setIndex] = useState(0);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!width) return;
      const next = Math.round(event.nativeEvent.contentOffset.x / width);
      if (next !== index && next >= 0 && next < urls.length) {
        setIndex(next);
      }
    },
    [width, index, urls.length],
  );

  if (!urls.length) return null;

  const renderImage = (uri: string, photoIndex: number) => (
    <Pressable
      onPress={() => onPress?.(photoIndex)}
      style={[styles.slide, { width: width || DEFAULT_WIDTH, height }]}
    >
      <Image
        source={{ uri }}
        style={styles.image}
        resizeMode={resizeMode}
        accessibilityLabel={`Photo ${photoIndex + 1} of ${urls.length}`}
      />
    </Pressable>
  );

  return (
    <View
      style={[styles.wrap, { height, borderRadius }, style]}
      onLayout={(e) => {
        const nextWidth = e.nativeEvent.layout.width;
        if (nextWidth > 0 && Math.abs(nextWidth - width) > 1) {
          setWidth(nextWidth);
        }
      }}
    >
      {urls.length === 1 ? (
        renderImage(urls[0], 0)
      ) : (
        <FlatList
          data={urls}
          keyExtractor={(url, i) => `${url}-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          bounces={false}
          getItemLayout={(_, i) => ({
            length: width || DEFAULT_WIDTH,
            offset: (width || DEFAULT_WIDTH) * i,
            index: i,
          })}
          renderItem={({ item, index: photoIndex }) =>
            renderImage(item, photoIndex)
          }
        />
      )}

      {urls.length > 1 ? (
        <>
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {index + 1}/{urls.length}
            </Text>
          </View>
          <View style={styles.dots}>
            {urls.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  counter: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  counterText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.xs,
    color: colors.white,
  },
  dots: {
    position: 'absolute',
    bottom: spacing.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    backgroundColor: colors.white,
  },
});
