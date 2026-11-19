import type { AdCard, OwnerAd } from '@/src/api/ads';

export const adsKeys = {
  mine: ['ads', 'mine'] as const,
  catalog: ['ads', 'catalog'] as const,
  analytics: (id: number, days: number) => ['ads', 'analytics', id, days] as const,
};

/** The owner's ad rendered as the feed card it will become. */
export function toCard(ad: Pick<OwnerAd, 'id' | 'title' | 'description' | 'imageUrls' | 'linkUrl' | 'cta' | 'ctaLabel'>, name: string, role?: string): AdCard {
  return {
    id: ad.id, title: ad.title, description: ad.description, imageUrls: ad.imageUrls, linkUrl: ad.linkUrl,
    cta: ad.cta, ctaLabel: ad.ctaLabel,
    advertiser: { id: '', name, role, verified: false, businessVerified: false },
  };
}
