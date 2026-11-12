import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { EventItem } from '@/src/types/api';

/**
 * Query keys for every cached list a post can appear in. Keeping them in
 * one place lets a like/comment/new post patch the post where it already
 * is, instead of invalidating `['events-feed']` -- which re-downloaded
 * every loaded feed page (and every profile's posts) after each tap.
 */
export const feedKeys = {
  all: ['events-feed'] as const,
  feed: (scope: 'forYou' | 'network') => ['events-feed', scope] as const,
  userEvents: (userId: string) => ['user-events', userId] as const,
  event: (id: string) => ['event', id] as const,
};

type Pages = InfiniteData<EventItem[], number>;

const sameId = (a: EventItem, id: string | number) => String(a.id) === String(id);

/** Applies fn to the post with this id wherever it is cached. */
export function patchEventEverywhere(
  queryClient: QueryClient,
  id: string | number,
  fn: (e: EventItem) => EventItem,
): void {
  const patchPages = (data: Pages | undefined) =>
    data?.pages
      ? { ...data, pages: data.pages.map((page) => page.map((e) => (sameId(e, id) ? fn(e) : e))) }
      : data;

  queryClient.setQueriesData<Pages>({ queryKey: feedKeys.all }, patchPages);
  queryClient.setQueriesData<Pages>({ queryKey: ['user-events'] }, patchPages);
  queryClient.setQueryData<EventItem>(feedKeys.event(String(id)), (e) => (e ? fn(e) : e));
}

/**
 * Puts a post at the top of the "For you" feed (and the author's own
 * profile list), or replaces it if it is already there. Used after you
 * create a post -- the server feed never includes your own posts, so
 * without this a new post was invisible on the feed -- and for live
 * stream updates.
 */
export function upsertEventAtTop(
  queryClient: QueryClient,
  event: EventItem,
  opts: { ownerId?: string | number | null } = {},
): void {
  const upsert = (data: Pages | undefined): Pages | undefined => {
    if (!data?.pages?.length) return data;
    const exists = data.pages.some((page) => page.some((e) => sameId(e, event.id)));
    if (exists) {
      return { ...data, pages: data.pages.map((page) => page.map((e) => (sameId(e, event.id) ? { ...e, ...event } : e))) };
    }
    const [first, ...rest] = data.pages;
    return { ...data, pages: [[event, ...first], ...rest] };
  };

  queryClient.setQueryData<Pages>(feedKeys.feed('forYou'), upsert);
  if (opts.ownerId != null) {
    queryClient.setQueryData<Pages>(feedKeys.userEvents(String(opts.ownerId)), upsert);
  }
  queryClient.setQueryData(feedKeys.event(String(event.id)), event);
}

/** Flattens infinite pages, dropping repeats (a post published between two
 *  page requests shifts later rows, so a boundary can repeat one). */
export function flattenUnique(data: InfiniteData<EventItem[], unknown> | undefined): EventItem[] {
  const seen = new Set<string>();
  const out: EventItem[] = [];
  for (const page of data?.pages ?? []) {
    for (const e of page) {
      const key = String(e.id);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
    }
  }
  return out;
}

/** Offset-based next page param shared by every post list. */
export function nextOffset(pageSize: number) {
  return (lastPage: EventItem[], _pages: EventItem[][], lastOffset: number) =>
    lastPage.length < pageSize ? undefined : lastOffset + lastPage.length;
}
