import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { PhotoCarousel } from '@/src/components/PhotoCarousel';

const fail = (label: string) =>
  act(() => {
    fireEvent(screen.getByLabelText(label), 'error', { nativeEvent: { error: '404' } });
  });

describe('PhotoCarousel', () => {
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => undefined));

  it('renders nothing (no empty dark box) when its only photo fails to load', () => {
    const { toJSON } = render(<PhotoCarousel urls={['https://x/broken.jpg']} />);
    fail('Photo 1 of 1');
    expect(toJSON()).toBeNull();
  });

  it('drops a failed photo and keeps the rest', () => {
    render(<PhotoCarousel urls={['https://x/a.jpg', 'https://x/b.jpg']} />);
    expect(screen.getByText('1/2')).toBeTruthy();
    fail('Photo 1 of 2');
    expect(screen.queryByText('1/2')).toBeNull(); // single photo left: no counter
    expect(screen.getByLabelText('Photo 1 of 1')).toBeTruthy();
  });
});
