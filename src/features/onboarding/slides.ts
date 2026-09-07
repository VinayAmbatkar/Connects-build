export const ONBOARDING_FEATURES = [
  {
    id: 'verified',
    label: 'Verified Professionals',
    icon: 'search-outline' as const,
  },
  {
    id: 'quality',
    label: 'Quality Assured',
    icon: 'speedometer-outline' as const,
  },
  {
    id: 'ontime',
    label: 'On Time Delivery',
    icon: 'refresh-circle-outline' as const,
  },
  {
    id: 'trusted',
    label: 'Trusted by Thousands',
    icon: 'shield-checkmark-outline' as const,
  },
] as const;

export const ONBOARDING_SLIDES = [
  {
    id: 'hero',
    title: 'Connect. Collaborate. Construct.',
    subtitle:
      'One platform to connect with Designers, Engineers, Contractors, Builders and Vendors.',
    chips: ONBOARDING_FEATURES.map((f) => f.label),
    cta: 'Get Started',
  },
  {
    id: 'vendors',
    title: 'Connecting The Right Vendor, Consultant For Your Project.',
    subtitle:
      'Find verified vendors and consultants who match your requirements and deliver the best results.',
    chips: [],
    cta: 'Next',
  },
  {
    id: 'feed',
    title: 'Events Feed',
    subtitle:
      'Share project updates with photos and video, and watch your network building.',
    chips: [],
    cta: 'Continue',
  },
] as const;
