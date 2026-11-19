import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  type KeyboardEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
  type View,
} from 'react-native';

/**
 * A ScrollView that keeps the focused text input above the keyboard, on
 * both Android and iOS.
 *
 * Why this exists: Android runs edge-to-edge (android/gradle.properties
 * `edgeToEdgeEnabled=true`), and under edge-to-edge the window is no longer
 * resized for the keyboard, so `softwareKeyboardLayoutMode: 'resize'` and
 * `KeyboardAvoidingView behavior={undefined}` both leave inputs hidden
 * behind it. This works from the keyboard's real position instead:
 *
 *  - it measures how far the keyboard overlaps this ScrollView (0 if the
 *    window *was* resized, so it never double-compensates) and pads the
 *    content by that much, so the last field can scroll clear of it;
 *  - it scrolls the focused input into view when the keyboard opens, and
 *    again whenever a TextField inside it gains focus while it's open.
 *
 * Plain `TextInput`s are covered by the keyboard-open path; `TextField`
 * also reports focus changes through the context below.
 */

/** Gap kept between the focused input and the top of the keyboard. */
const INPUT_MARGIN = 24;

type KeyboardAwareContextValue = {
  /** Scroll `input` above the keyboard if the keyboard is open. */
  ensureVisible: (input: View | TextInput | null) => void;
};

const KeyboardAwareContext = createContext<KeyboardAwareContextValue | null>(null);

/** For inputs that want to stay visible when they gain focus. No-op when
 *  rendered outside a KeyboardAwareScrollView. */
export function useKeyboardAwareInput() {
  return useContext(KeyboardAwareContext);
}

const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

export type KeyboardAwareScrollViewProps = ScrollViewProps & {
  /** Extra space kept under the content while the keyboard is open. */
  extraKeyboardSpace?: number;
  /** false when a parent already moves this view clear of the keyboard
   *  (e.g. BottomSheet): only scroll the focused field into view. */
  padForKeyboard?: boolean;
};

export const KeyboardAwareScrollView = forwardRef<ScrollView, KeyboardAwareScrollViewProps>(
  function KeyboardAwareScrollView(
    { children, contentContainerStyle, onScroll, extraKeyboardSpace = 0, padForKeyboard = true, ...props },
    forwardedRef,
  ) {
    const scrollRef = useRef<ScrollView>(null);
    const scrollY = useRef(0);
    const keyboardTop = useRef<number | null>(null);
    const [overlap, setOverlap] = useState(0);

    useImperativeHandle(forwardedRef, () => scrollRef.current as ScrollView);

    const scrollInputIntoView = useCallback((input: View | TextInput | null) => {
      const top = keyboardTop.current;
      const scroll = scrollRef.current;
      if (top == null || !input || !scroll) return;
      // measureInWindow works for both class and host components.
      (input as View).measureInWindow?.((_x, y, _w, height) => {
        const inputBottom = y + height + INPUT_MARGIN;
        if (inputBottom > top) {
          scroll.scrollTo({ y: scrollY.current + (inputBottom - top), animated: true });
          return;
        }
        // Scrolled-up case: the input sits above the visible area.
        (scroll as unknown as View).measureInWindow?.((_sx, scrollTop) => {
          if (y < scrollTop) {
            scroll.scrollTo({
              y: Math.max(0, scrollY.current - (scrollTop - y) - INPUT_MARGIN),
              animated: true,
            });
          }
        });
      });
    }, []);

    const ensureVisible = useCallback(
      (input: View | TextInput | null) => {
        // Let the focus settle (and padding apply) before measuring.
        setTimeout(() => scrollInputIntoView(input), 60);
      },
      [scrollInputIntoView],
    );

    useEffect(() => {
      const onShow = (event: KeyboardEvent) => {
        const top = event.endCoordinates.screenY;
        keyboardTop.current = top;
        const node = scrollRef.current as unknown as View | null;
        node?.measureInWindow?.((_x, y, _w, height) => {
          setOverlap(Math.max(0, y + height - top));
          const focused = TextInput.State.currentlyFocusedInput?.() as unknown as
            | View
            | null;
          // Wait one tick so the new bottom padding exists to scroll into.
          setTimeout(() => scrollInputIntoView(focused), Platform.OS === 'ios' ? 0 : 60);
        });
      };
      const onHide = () => {
        keyboardTop.current = null;
        setOverlap(0);
      };
      const subs = [
        Keyboard.addListener(showEvent, onShow),
        Keyboard.addListener(hideEvent, onHide),
      ];
      return () => subs.forEach((sub) => sub.remove());
    }, [scrollInputIntoView]);

    const handleScroll = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollY.current = event.nativeEvent.contentOffset.y;
        onScroll?.(event);
      },
      [onScroll],
    );

    const context = useMemo(() => ({ ensureVisible }), [ensureVisible]);
    const keyboardPadding = padForKeyboard && overlap > 0 ? overlap + extraKeyboardSpace : 0;

    return (
      <KeyboardAwareContext.Provider value={context}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
          scrollEventThrottle={16}
          {...props}
          onScroll={handleScroll}
          contentContainerStyle={[
            contentContainerStyle,
            keyboardPadding ? { paddingBottom: addPadding(contentContainerStyle, keyboardPadding) } : null,
          ]}
        >
          {children}
        </ScrollView>
      </KeyboardAwareContext.Provider>
    );
  },
);

/** The content's own bottom padding plus the keyboard overlap. */
function addPadding(style: ScrollViewProps['contentContainerStyle'], extra: number): number {
  const flat = StyleSheet.flatten(style) ?? {};
  const base =
    typeof flat.paddingBottom === 'number'
      ? flat.paddingBottom
      : typeof flat.paddingVertical === 'number'
        ? flat.paddingVertical
        : typeof flat.padding === 'number'
          ? flat.padding
          : 0;
  return base + extra;
}
