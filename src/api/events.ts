import { apiClient, API_BASE_URL } from '@/src/api/client';
import type { EventItem, EventListResponse } from '@/src/types/api';

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

function toAbsoluteUrl(url?: string | null): string | undefined {
  if (!url?.trim()) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${API_ORIGIN}${path}`;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

/** Normalize a backend event into the shape the UI expects. */
export function normalizeEvent(raw: Record<string, unknown>): EventItem {
  const photoUrls = asStringArray(raw.photoUrls ?? raw.photos)
    .map((url) => toAbsoluteUrl(url))
    .filter((url): url is string => Boolean(url));

  const imageUrl =
    toAbsoluteUrl(
      typeof raw.imageUrl === 'string'
        ? raw.imageUrl
        : typeof raw.coverImage === 'string'
          ? raw.coverImage
          : photoUrls[0],
    ) ?? photoUrls[0];

  const ownerName =
    (typeof raw.ownerName === 'string' && raw.ownerName) ||
    (typeof raw.authorName === 'string' && raw.authorName) ||
    undefined;

  return {
    ...raw,
    id: (raw.id as string | number) ?? '',
    title: typeof raw.title === 'string' ? raw.title : undefined,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    location: typeof raw.location === 'string' ? raw.location : undefined,
    eventDate:
      typeof raw.eventDate === 'string'
        ? raw.eventDate
        : typeof raw.createdAt === 'string'
          ? raw.createdAt
          : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
    imageUrl,
    photoUrls,
    photos: photoUrls,
    videoUrl: toAbsoluteUrl(
      typeof raw.videoUrl === 'string' ? raw.videoUrl : undefined,
    ),
    authorName: ownerName,
    ownerName,
    userId:
      (raw.userId as string | number | undefined) ??
      (raw.authorId as string | number | undefined),
    authorId:
      (raw.userId as string | number | undefined) ??
      (raw.authorId as string | number | undefined),
  };
}

function unwrapEvents(data: unknown, depth = 0): EventItem[] {
  if (Array.isArray(data)) {
    return data.map((item) => normalizeEvent(item as Record<string, unknown>));
  }

  if (!data || typeof data !== 'object' || depth > 3) return [];

  const body = data as Record<string, unknown>;
  for (const key of ['events', 'data', 'items', 'results']) {
    const value = body[key];
    if (Array.isArray(value)) {
      return value.map((item) => normalizeEvent(item as Record<string, unknown>));
    }
    if (value && typeof value === 'object') {
      const nested = unwrapEvents(value, depth + 1);
      if (nested.length) return nested;
    }
  }

  return [];
}

/** Collect every photo URL on an event (deduped). */
export function getEventPhotoUrls(item: EventItem | null | undefined): string[] {
  if (!item) return [];

  const collected: string[] = [];
  const push = (value: unknown) => {
    if (typeof value !== 'string') return;
    const url = value.trim();
    if (!url) return;
    if (!collected.includes(url)) collected.push(url);
  };

  if (Array.isArray(item.photoUrls)) item.photoUrls.forEach(push);
  if (Array.isArray(item.photos)) item.photos.forEach(push);
  push(item.imageUrl);
  push(item.coverImage);

  return collected;
}

export const eventsApi = {
  feed: (limit = 20, offset = 0) =>
    apiClient
      .get<EventListResponse>('/events/feed', { params: { limit, offset } })
      .then((r) => unwrapEvents(r.data)),

  listMine: () =>
    apiClient.get<EventListResponse>('/events').then((r) => unwrapEvents(r.data)),

  create: (payload: {
    title: string;
    description: string;
    location: string;
    eventDate: string;
  }) =>
    apiClient
      .post<EventItem>('/events', payload)
      .then((r) => normalizeEvent(r.data as unknown as Record<string, unknown>)),

  update: (
    id: string | number,
    payload: {
      title: string;
      description: string;
      location: string;
      eventDate: string;
    },
  ) =>
    apiClient
      .put<EventItem>(`/events/${id}`, payload)
      .then((r) => normalizeEvent(r.data as unknown as Record<string, unknown>)),

  remove: (id: string | number) =>
    apiClient.delete(`/events/${id}`).then((r) => r.data),

  /** @deprecated Prefer uploadPhotos — kept for older callers. */
  uploadImage: (id: string | number, formData: FormData) =>
    apiClient
      .post(`/events/${id}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),

  /** 2–4 photos after create (field name `photos`, same as web). */
  uploadPhotos: (id: string | number, formData: FormData) =>
    apiClient
      .post(`/events/${id}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),

  /** Single video after create (field name `video`, same as web). */
  uploadVideo: (id: string | number, formData: FormData) =>
    apiClient
      .post(`/events/${id}/video`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),
};
