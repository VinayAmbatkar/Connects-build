import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  KeyboardEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  tall?: boolean;
  /** Keep a constant height instead of sizing to content, so the sheet
   *  doesn't grow while its content loads (e.g. a comment thread). */
  fixedHeight?: boolean;
};

const SHEET_TRAVEL = Dimensions.get('window').height;
const OPEN_MS = 280;
const CLOSE_MS = 220;

export function BottomSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
  footer,
  tall = false,
  fixedHeight = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [overlayHeight, setOverlayHeight] = useState(0);
  /** Overlay height with the keyboard closed -- the baseline for detecting
   *  how much the window itself already resized. */
  const restingHeightRef = useRef(0);
  /** Android: hold the lift until the window has had a chance to resize. */
  const [androidSettled, setAndroidSettled] = useState(true);
  const bottomPadding = useRef(new Animated.Value(Math.max(insets.bottom, spacing.md))).current;
  const keyboardDurationRef = useRef(250);
  const translateY = useRef(new Animated.Value(SHEET_TRAVEL)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);

  // LinkedIn-style keyboard handling: the sheet stays anchored to the
  // bottom and never moves; only its bottom padding grows so the footer
  // (comment input) rides above the keyboard while the list shrinks.
  //
  // Android's Modal window is SOFT_INPUT_ADJUST_RESIZE (RN
  // ReactModalHostView), so the system usually resizes it already; we only
  // add whatever part of the keyboard the window did NOT make room for.
  // Adding the full keyboard height on top of the resize is what made the
  // sheet jump up and then drop back.
  useEffect(() => {
    if (!visible) return;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    const onShow = (e: KeyboardEvent) => {
      keyboardDurationRef.current = e.duration || 250;
      if (Platform.OS === 'android') {
        setAndroidSettled(false);
        clearTimeout(settleTimer);
        settleTimer = setTimeout(() => setAndroidSettled(true), 120);
      }
      setKeyboardHeight(e.endCoordinates.height);
    };
    const onHide = (e: KeyboardEvent) => {
      keyboardDurationRef.current = e.duration || 200;
      clearTimeout(settleTimer);
      setAndroidSettled(true);
      setKeyboardHeight(0);
    };

    const showListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onShow,
    );
    const hideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onHide,
    );
    return () => {
      clearTimeout(settleTimer);
      showListener.remove();
      hideListener.remove();
    };
  }, [visible]);

  // If the window shrank at all, the system made room for the keyboard; its
  // reported height and the resize can differ by the nav bar, so subtracting
  // would leave a gap. Otherwise (iOS, edge-to-edge) lift by the full height.
  const windowResized = keyboardHeight > 0 && restingHeightRef.current - overlayHeight > 1;
  const keyboardLift = !androidSettled || windowResized ? 0 : keyboardHeight;
  const targetPadding =
    keyboardHeight > 0 ? keyboardLift + spacing.sm : Math.max(insets.bottom, spacing.md);

  // A fixed-height sheet keeps its TOP edge where it is when Android
  // shrinks the window for the keyboard -- only the list gets shorter.
  // Percent heights would follow the shrinking window and move the header.
  const fixedRatio = tall ? 0.88 : 0.7;
  const fixedPixelHeight =
    fixedHeight && restingHeightRef.current > 0 && overlayHeight > 0
      ? Math.max(0, overlayHeight - restingHeightRef.current * (1 - fixedRatio))
      : undefined;

  useEffect(() => {
    Animated.timing(bottomPadding, {
      toValue: targetPadding,
      duration: keyboardDurationRef.current,
      // Padding is a layout prop -- can't run on the native driver.
      useNativeDriver: false,
    }).start();
  }, [targetPadding, bottomPadding]);

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      setMounted(true);
      translateY.setValue(SHEET_TRAVEL * 0.35);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: OPEN_MS,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: OPEN_MS,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (!mounted || closingRef.current) return;

    closingRef.current = true;
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SHEET_TRAVEL * 0.45,
        duration: CLOSE_MS,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: CLOSE_MS,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setMounted(false);
        closingRef.current = false;
      }
    });
  }, [visible, mounted, translateY, backdropOpacity]);

  const requestClose = () => {
    if (closingRef.current) return;
    Keyboard.dismiss();
    onClose();
  };

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={requestClose}
      statusBarTranslucent
    >
      <View
        testID="bottom-sheet-overlay"
        style={styles.overlay}
        onLayout={(e) => {
          const height = e.nativeEvent.layout.height;
          setOverlayHeight(height);
          if (keyboardHeight === 0) restingHeightRef.current = height;
        }}
      >
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={requestClose} />
        </Animated.View>

        <Animated.View
          testID="bottom-sheet"
          style={[
            styles.sheet,
            tall && styles.sheetTall,
            fixedHeight && (tall ? styles.sheetFixedTall : styles.sheetFixed),
            fixedPixelHeight !== undefined && { height: fixedPixelHeight, maxHeight: undefined },
            { transform: [{ translateY }] },
          ]}
        >
          {/* Slide (native driver) and keyboard padding (JS driver, it's a
              layout prop) must live on separate views -- one Animated node
              can't be driven by both. */}
          <Animated.View
            testID="bottom-sheet-content"
            style={[
              fixedHeight ? styles.contentFill : styles.contentShrink,
              { paddingBottom: bottomPadding },
            ]}
          >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable onPress={requestClose} hitSlop={8} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            style={[styles.body, tall && styles.bodyTall]}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
          >
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  sheet: {
    maxHeight: '82%',
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
  },
  sheetTall: {
    maxHeight: '92%',
  },
  contentFill: {
    flex: 1,
  },
  contentShrink: {
    flexShrink: 1,
  },
  sheetFixed: {
    height: '70%',
  },
  sheetFixedTall: {
    height: '88%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
  },
  bodyTall: {
  },
  bodyContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});