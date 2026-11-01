import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Keyboard, Platform, StyleSheet, Text, TextInput } from 'react-native';
import { BottomSheet } from '@/src/components/BottomSheet';

type Listener = (e: { endCoordinates: { height: number }; duration: number }) => void;
const listeners: Record<string, Listener> = {};

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, cb: Listener) => {
    listeners[event] = cb;
    return { remove: jest.fn() };
  }) as never);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function setPlatform(os: 'ios' | 'android') {
  jest.replaceProperty(Platform, 'OS', os);
}

async function settle(ms = 400) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

function sheetStyle() {
  return StyleSheet.flatten(screen.getByTestId('bottom-sheet').props.style);
}

function contentPadding() {
  return StyleSheet.flatten(screen.getByTestId('bottom-sheet-content').props.style).paddingBottom;
}

function renderSheet() {
  render(
    <BottomSheet visible title="Comments" onClose={jest.fn()} tall fixedHeight footer={<TextInput testID="comment-input" />}>
      <Text>thread</Text>
    </BottomSheet>,
  );
}

function layout(height: number) {
  fireEvent(screen.getByTestId('bottom-sheet-overlay'), 'layout', { nativeEvent: { layout: { height, width: 400 } } });
}

const keyboard = (event: string, height: number) =>
  act(async () => listeners[event]({ endCoordinates: { height }, duration: 250 }));

describe('BottomSheet keyboard handling (LinkedIn style)', () => {
  it('iOS: lifts only the footer above the keyboard; the sheet itself never moves', async () => {
    setPlatform('ios');
    renderSheet();
    await settle();
    layout(800);
    const restingTranslate = sheetStyle().transform;

    await keyboard('keyboardWillShow', 300);
    await settle();
    expect(contentPadding()).toBe(308);
    expect(sheetStyle().transform).toEqual(restingTranslate);
    // Measured: 88% of the resting 800px window, unchanged by the keyboard.
    expect(sheetStyle().height).toBe(704);

    await keyboard('keyboardWillHide', 0);
    await settle();
    expect(contentPadding()).toBe(16);
    expect(sheetStyle().transform).toEqual(restingTranslate);
  });

  it('Android: does not add the keyboard on top of a window resize (no jump)', async () => {
    setPlatform('android');
    renderSheet();
    await settle();
    layout(800);

    await keyboard('keyboardDidShow', 300);
    layout(500); // ADJUST_RESIZE shrank the modal window
    await settle();
    expect(contentPadding()).toBe(8);
    // Top edge stays put (800 - 704 = 96px gap): the sheet shrinks from the
    // bottom only, so the header doesn't move.
    expect(sheetStyle().height).toBe(500 - 96);
  });

  it('Android: lifts the footer when the window did not resize (edge-to-edge)', async () => {
    setPlatform('android');
    renderSheet();
    await settle();
    layout(800);

    await keyboard('keyboardDidShow', 300);
    // Held back briefly while waiting for a possible resize...
    expect(contentPadding()).not.toBe(308);
    await settle(); // resize window passes with no resize...
    await settle(); // ...then the padding animates up
    expect(contentPadding()).toBe(308);
  });
});
