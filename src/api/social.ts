import { apiClient } from '@/src/api/client';

// Social endpoints the web app already uses and the app didn't:
// favourites, connection suggestions, mutual connections, profile share
// links, comment edit/delete/like, and the dashboard stats card.

type Pagination = { page: number; limit: number; total: number; totalPages: number };

export interface Favourite {
  id: number;
  favouriteUserId: string;
  favouriteUserName: string;
  specialization: string;
  role: string;
  /** Profile badge of the saved person. */
  verified?: boolean;
  createdAt: string;
}

export interface Suggestion {
  userId: string;
  name: string;
  role: string;
  company: string;
  bio: string;
  yearsExperience: number;
  specializations: string[];
  projectCount: number;
  location: string;
  mutualConnectionCount?: number;
  /** Profile badge. */
  verified?: boolean;
}

export interface MutualConnection {
  userId: string;
  name: string;
  role?: string;
}

export interface ShareLink {
  id: number;
  url?: string;
  label?: string;
  expiresAt: string;
  createdAt?: string;
}

export interface LikeToggle {
  targetType: string;
  targetId: number;
  likeCount: number;
  likedByMe: boolean;
}

export interface DashboardStats {
  connections: number;
  profileViews: number;
  newListings: number;
  visibility: number;
  /** Plan-gated insight the caller can't see on their tier. */
  profileViewsLocked?: boolean;
  visibilityLocked?: boolean;
}

export const favouritesApi = {
  list: () =>
    apiClient.get<{ favourites: Favourite[] }>('/favourites').then((r) => r.data.favourites ?? []),
  add: (userId: string, specialization = '') =>
    apiClient
      .post<Favourite>('/favourites', { favouriteUserId: userId, specialization })
      .then((r) => r.data),
  remove: (userId: string) => apiClient.delete(`/favourites/${encodeURIComponent(userId)}`).then((r) => r.data),
};

export const suggestionsApi = {
  list: (page = 1, limit = 20) =>
    apiClient
      .get<{ suggestions: Suggestion[]; pagination?: Pagination }>('/connections/suggestions', {
        params: { page, limit },
      })
      .then((r) => r.data.suggestions ?? []),
  mutual: (userId: string, page = 1, limit = 50) =>
    apiClient
      .get<{ connections: MutualConnection[]; pagination?: Pagination }>(
        `/connections/mutual/${encodeURIComponent(userId)}`,
        { params: { page, limit } },
      )
      .then((r) => r.data),
};

export const shareLinksApi = {
  create: (label?: string, expiresInHours?: number) =>
    apiClient
      .post<ShareLink & { url: string }>('/profile/share-links', {
        ...(label?.trim() ? { label: label.trim() } : {}),
        ...(expiresInHours ? { expiresInHours } : {}),
      })
      .then((r) => r.data),
  list: () => apiClient.get<{ links: ShareLink[] }>('/profile/share-links').then((r) => r.data.links ?? []),
  revoke: (id: number) => apiClient.delete(`/profile/share-links/${id}`).then((r) => r.data),
};

export const commentsApi = {
  update: (id: string | number, body: string) =>
    apiClient.put(`/comments/${id}`, { body }).then((r) => r.data),
  remove: (id: string | number) => apiClient.delete(`/comments/${id}`).then((r) => r.data),
  toggleLike: (id: string | number, liked: boolean) =>
    (liked
      ? apiClient.delete<LikeToggle>(`/comments/${id}/likes`)
      : apiClient.post<LikeToggle>(`/comments/${id}/likes`, {})
    ).then((r) => r.data),
};

export const dashboardApi = {
  stats: () => apiClient.get<DashboardStats>('/dashboard/stats').then((r) => r.data),
};
