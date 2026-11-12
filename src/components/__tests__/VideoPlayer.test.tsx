import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

const mockPlayer = { play: jest.fn(), pause: jest.fn(), replaceAsync: jest.fn(), status: 'loading', playing: false, loop: true };
const mockUseVideoPlayer = jest.fn((_source: unknown, setup?: (p: typeof mockPlayer) => void) => {
  setup?.(mockPlayer);
  return mockPlayer;
});

jest.mock('expo-video', () => {
  const { View } = jest.requireActual('react-native');
  return {
    useVideoPlayer: (source: unknown, setup?: (p: unknown) => void) => mockUseVideoPlayer(source, setup),
    VideoView: (props: object) => <View testID="video-view" {...props} />,
  };
});

jest.mock('expo', () => ({
  useEvent: (_player: unknown, _event: string, initial: object) => initial,
  requireOptionalNativeModule: jest.fn(() => ({})),
}));

import { requireOptionalNativeModule } from 'expo';
import { VideoPlayer } from '@/src/components/VideoPlayer';

describe('VideoPlayer', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not create a player (or download anything) until tapped', () => {
    render(<VideoPlayer url="https://cdn.example/v.mp4" />);
    expect(mockUseVideoPlayer).not.toHaveBeenCalled();
    expect(screen.queryByTestId('video-view')).toBeNull();
  });

  it('plays inside the app on tap -- never opens the browser', () => {
    const openURL = jest.spyOn(Linking, 'openURL');
    render(<VideoPlayer url="https://cdn.example/v.mp4" />);
    fireEvent.press(screen.getByLabelText('Play video'));

    expect(openURL).not.toHaveBeenCalled();
    expect(mockUseVideoPlayer).toHaveBeenCalledWith({ uri: 'https://cdn.example/v.mp4', useCaching: true }, expect.any(Function));
    expect(mockPlayer.play).toHaveBeenCalled();
    const view = screen.getByTestId('video-view');
    expect(view.props.nativeControls).toBe(true);
    expect(view.props.fullscreenOptions).toEqual({ enable: true });
  });

  it('shows an update hint instead of crashing on a build without the native module', () => {
    (requireOptionalNativeModule as jest.Mock).mockReturnValue(null);
    const openURL = jest.spyOn(Linking, 'openURL');
    render(<VideoPlayer url="https://cdn.example/v.mp4" />);
    fireEvent.press(screen.getByLabelText('Play video'));
    expect(screen.getByText('Update the app to play videos')).toBeTruthy();
    expect(mockUseVideoPlayer).not.toHaveBeenCalled();
    expect(openURL).not.toHaveBeenCalled();
    (requireOptionalNativeModule as jest.Mock).mockReturnValue({});
  });
});
