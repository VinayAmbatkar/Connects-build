import { act, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityPostCard } from '@/src/features/profile/ActivityPostCard';
import type { EventItem } from '@/src/types/api';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.useFakeTimers();

const post: EventItem = {
  id: 1,
  userId: 7,
  ownerName: 'Amit Sharma',
  ownerRole: 'CONTRACTOR',
  location: 'Hyderabad',
  description: 'Excited to share the progress on our new commercial project.',
  createdAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
  likeCount: 120,
  commentCount: 12,
  shareCount: 1,
};

/** Lets the icon font finish loading so its state update lands inside act(). */
async function renderCard(ui: ReactElement) {
  const client = new QueryClient();
  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  await act(async () => {});
}

describe('ActivityPostCard (feed variant)', () => {
  it('shows a compact author block with time and location', async () => {
    await renderCard(<ActivityPostCard item={post} variant="feed" />);
    expect(screen.getByText('Amit Sharma')).toBeTruthy();
    expect(screen.getByText(/Hyderabad/)).toBeTruthy();
    expect(screen.getByText('3h ·')).toBeTruthy();
  });

  it('summarises engagement above three fixed action labels', async () => {
    await renderCard(<ActivityPostCard item={post} variant="feed" />);
    expect(screen.getByText('120')).toBeTruthy();
    expect(screen.getByText('12 comments · 1 share')).toBeTruthy();
    expect(screen.getByTestId('post-like')).toHaveTextContent(/Like$/);
    expect(screen.getByTestId('post-comment')).toHaveTextContent(/Comment$/);
    expect(screen.getByTestId('post-share')).toHaveTextContent(/Share$/);
  });

  it('hides the summary row when a post has no engagement', async () => {
    await renderCard(
      <ActivityPostCard item={{ ...post, likeCount: 0, commentCount: 0, shareCount: 0 }} />,
    );
    expect(screen.queryByText(/comment(s)? ·|share(s)?$/)).toBeNull();
    expect(screen.getByTestId('post-like')).toHaveTextContent(/Like$/);
  });
});
