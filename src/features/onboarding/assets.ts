import { Image, ImageSourcePropType } from 'react-native';

export const brandLogo: ImageSourcePropType = require('../../../assets/images/COBILDS_Icon_Transparent.webp');
export const onboardingHero: ImageSourcePropType = require('../../../assets/images/Onboarding/onboarding-hero.webp');
export const onboardingVendors: ImageSourcePropType = require('../../../assets/images/Onboarding/onboardimg2.webp');
export const onboardingFeed: ImageSourcePropType = require('../../../assets/images/Onboarding/onboardimg3.webp');

/** Prefetch onboarding art so the first slide paints smoothly. */
export function prefetchOnboardingImages() {
  const uris = [
    Image.resolveAssetSource(brandLogo)?.uri,
    Image.resolveAssetSource(onboardingHero)?.uri,
    Image.resolveAssetSource(onboardingVendors)?.uri,
    Image.resolveAssetSource(onboardingFeed)?.uri,
  ].filter(Boolean) as string[];

  return Promise.all(uris.map((uri) => Image.prefetch(uri)));
}
