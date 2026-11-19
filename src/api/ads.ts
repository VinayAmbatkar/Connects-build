import { AppState } from 'react-native';
import { apiClient } from '@/src/api/client';

/** /api/ads -- see Backend-tech handler/ads.go and docs/ADVERTISEMENTS_PLAN.md. */

export type AdVisibility = 'PUBLIC' | 'PRIVATE';
export type AdDeliveryStatus = 'LIVE' | 'PRIVATE' | 'PAUSED_PLAN' | 'NEEDS_IMAGE' | 'REMOVED';
export type AdEventKind = 'IMPRESSION' | 'CLICK' | 'PROFILE_CLICK';

export interface AdRegion { code: string; name: string; states: string[] }
export interface AdState { code: string; name: string; region: string }
export interface AdCatalog {
  regions: AdRegion[];
  states: AdState[];
  ctas: { code: string; label: string }[];
  maxImages: number;
}

export interface OwnerAd {
  id: number;
  title: string;
  description: string;
  imageUrls: string[];
  linkUrl: string;
  cta: string;
  ctaLabel: string;
  visibility: AdVisibility;
  deliveryStatus: AdDeliveryStatus;
  removedReason?: string;
  targetAll: boolean;
  targetRegions: string[];
  targetStates: string[];
  stats: { views: number; clicks: number; profileVisits: number };
  createdAt: string;
  updatedAt: string;
}

export interface MyAds { ads: OwnerAd[]; limit: number; used: number; canCreate: boolean; entitled: boolean }

export interface AdRequest {
  title: string;
  description: string;
  linkUrl: string;
  cta: string;
  targetAll: boolean;
  targetRegions: string[];
  targetStates: string[];
}

export interface AdCard {
  id: number;
  title: string;
  description: string;
  imageUrls: string[];
  linkUrl?: string;
  cta: string;
  ctaLabel: string;
  advertiser: {
    id: string;
    name: string;
    role?: string;
    company?: string;
    verified: boolean;
    businessVerified: boolean;
  };
  /** The viewer's own ad: shown as "Your ad", never counted. */
  own?: boolean;
}

export interface AdFeed { ads: AdCard[]; firstAfter: number; insertEvery: number }

export interface AnalyticsTotals { views: number; reach: number; clicks: number; profileVisits: number; ctr: number }
export interface AdAnalytics {
  adId: number;
  days: number;
  totals: AnalyticsTotals;
  period: AnalyticsTotals;
  daily: { day: string; views: number; clicks: number; profileVisits: number }[];
  byState: { code: string; name: string; views: number }[];
  unknownLocationViews: number;
}

export interface PickedImage { uri: string; name: string; type: string }

const EMPTY_FEED: AdFeed = { ads: [], firstAfter: 3, insertEvery: 6 };

function imageForm(images: PickedImage[]): FormData {
  const form = new FormData();
  // React Native's FormData takes a { uri, name, type } file descriptor.
  // Repeating "file" sends every image in one request.
  for (const image of images) {
    form.append('file', { uri: image.uri, name: image.name, type: image.type } as unknown as Blob);
  }
  return form;
}

export const adsApi = {
  catalog: () => apiClient.get<AdCatalog>('/ads/catalog').then((r) => r.data),
  mine: () => apiClient.get<MyAds>('/ads/mine').then((r) => r.data),
  get: (id: number) => apiClient.get<OwnerAd>(`/ads/${id}`).then((r) => r.data),
  create: (body: AdRequest) => apiClient.post<OwnerAd>('/ads', body).then((r) => r.data),
  update: (id: number, body: AdRequest) => apiClient.put<OwnerAd>(`/ads/${id}`, body).then((r) => r.data),
  remove: (id: number) => apiClient.delete(`/ads/${id}`).then((r) => r.data),
  setVisibility: (id: number, visibility: AdVisibility) =>
    apiClient.patch<OwnerAd>(`/ads/${id}/visibility`, { visibility }).then((r) => r.data),
  /** All images in one request; the backend uploads them in parallel. */
  uploadImages: (id: number, images: PickedImage[]) =>
    apiClient
      .post<OwnerAd>(`/ads/${id}/images`, imageForm(images), {
        timeout: 60000,
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),
  removeImage: (id: number, imageUrl: string) =>
    apiClient.delete<OwnerAd>(`/ads/${id}/images`, { data: { imageUrl } }).then((r) => r.data),
  analytics: (id: number, days = 30) =>
    apiClient.get<AdAnalytics>(`/ads/${id}/analytics`, { params: { days } }).then((r) => r.data),

  /** Never rejects: no ads is always a valid feed. */
  feed: (limit = 5): Promise<AdFeed> =>
    apiClient
      .get<AdFeed>('/ads/feed', { params: { limit } })
      .then((r) => r.data ?? EMPTY_FEED)
      .catch(() => EMPTY_FEED),
};

/** The ad that goes right after post index i (0-based), or null. */
export function adAfter(feed: AdFeed | undefined, postIndex: number, totalPosts = Infinity): AdCard | null {
  if (!feed || feed.ads.length === 0) return null;
  // A feed shorter than firstAfter still gets its first ad, after the last post.
  if (totalPosts < feed.firstAfter) return postIndex === totalPosts - 1 ? feed.ads[0] : null;
  const n = postIndex + 1 - feed.firstAfter;
  if (n < 0 || n % feed.insertEvery !== 0) return null;
  return feed.ads[n / feed.insertEvery] ?? null;
}

// ── Impression / click beacons ────────────────────────────────────────
// Batched; the backend counts one per viewer, ad, kind and day, so a lost
// or repeated batch is harmless.
const queue: { adId: number; kind: AdEventKind }[] = [];
const sent = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  while (queue.length) {
    const events = queue.splice(0, 50);
    apiClient.post('/ads/events', { events }).catch(() => undefined);
  }
}

AppState.addEventListener('change', (s) => {
  if (s !== 'active') flush();
});

export function trackAd(adId: number, kind: AdEventKind) {
  const key = `${adId}:${kind}`;
  if (sent.has(key)) return;
  sent.add(key);
  queue.push({ adId, kind });
  if (kind !== 'IMPRESSION') {
    flush();
    return;
  }
  if (!timer) timer = setTimeout(flush, 4000);
}
