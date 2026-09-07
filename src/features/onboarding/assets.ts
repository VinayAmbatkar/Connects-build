import { Image, ImageSourcePropType } from 'react-native';

export const brandLogo: ImageSourcePropType = require('../../../assets/images/COBILDS_Icon_Transparent.png');
export const onboardingHero: ImageSourcePropType = require('../../../assets/images/Onboarding/onboarding-hero.png');
export const onboardingVendors: ImageSourcePropType = require('../../../assets/images/Onboarding/onboardimg2.png');
export const onboardingFeed: ImageSourcePropType = require('../../../assets/images/Onboarding/onboardimg3.png');

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
