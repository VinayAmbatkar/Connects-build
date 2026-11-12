import { apiClient } from '@/src/api/client';

/** One person the viewer has blocked (backend block.BlockedUserSummary). */
export type BlockedUser = {
  userId: string;
  fullName: string;
  role?: string;
  blockedAt?: string;
};

/**
 * GET /blocks answers { blockedUserIds, blockedUsers: [...] }. The Blocked
 * users screen used to expect a bare array, so it always looked empty even
 * though blocking worked.
 */
function unwrapBlocked(data: unknown): BlockedUser[] {
  if (Array.isArray(data)) return data as BlockedUser[];
  const body = (data ?? {}) as { blockedUsers?: unknown };
  return Array.isArray(body.blockedUsers) ? (body.blockedUsers as BlockedUser[]) : [];
}

export const blocksApi = {
  list: () => apiClient.get('/blocks').then((r) => unwrapBlocked(r.data)),
  block: (userId: string | number) =>
    apiClient.post(`/blocks/${userId}`).then((r) => r.data),
  unblock: (userId: string | number) =>
    apiClient.delete(`/blocks/${userId}`).then((r) => r.data),
};
