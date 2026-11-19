import { router, type Href } from 'expo-router';
import { apiClient } from '@/src/api/client';
import type { FreemiumOffer } from '@/src/api/freemium';
import { useFreemiumStore } from '@/src/features/billing/freemiumStore';

/**
 * "Unlock advertising": the same server-driven offer every locked feature
 * shows ("Claim it free" during the freemium campaign, otherwise plans),
 * falling back to the plans screen.
 */
export async function unlockAds() {
  try {
    const { data } = await apiClient.get<{ locked: boolean; offer?: FreemiumOffer }>('/billing/offer', {
      params: { feature: 'advertisement' },
    });
    if (data.locked && useFreemiumStore.getState().showOffer(data.offer)) return;
  } catch {
    // fall through to plans
  }
  router.push('/premium' as Href);
}
