// Global native-module mocks for the Jest (jest-expo) environment.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

// expo-video is native-only; components render a plain View in its place.
jest.mock('expo-video', () => {
  const { View } = jest.requireActual('react-native');
  const player = { play: jest.fn(), pause: jest.fn(), replaceAsync: jest.fn(), status: 'idle', playing: false };
  return {
    useVideoPlayer: (_source: unknown, setup?: (p: typeof player) => void) => {
      setup?.(player);
      return player;
    },
    VideoView: View,
  };
});
