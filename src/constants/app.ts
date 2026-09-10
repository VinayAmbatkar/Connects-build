import Constants from 'expo-constants';
import type { ImageSourcePropType } from 'react-native';
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export const LEGAL = {
  privacyUrl: 'https://connexbuild.com/privacy',
  termsUrl: 'https://connexbuild.com/terms',
  supportEmail: 'support@connexbuild.com',
};

export const APP_NAME = 'COBILDS';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type AppRole = {
  value: string;
  label: string;
  description: string;
  image?: ImageSourcePropType;
  icon?: IoniconName;
};

export const ROLE_IMAGES = {
  Consultant: require('../../assets/images/Roles/Consultant.webp'),
  Builder: require('../../assets/images/Roles/Builder.webp'),
  Vendor: require('../../assets/images/Roles/Vendor.webp'),
  Contractor: require('../../assets/images/Roles/contractor.webp'),
  Architect: require('../../assets/images/Roles/architect.webp'),
} as const;

export const DEFAULT_ROLES: AppRole[] = [
  {
    value: 'Consultant',
    label: 'Consultant',
    description: 'I provide expert advice and consultation',
    image: ROLE_IMAGES.Consultant,
  },
  {
    value: 'Builder',
    label: 'Builder',
    description: 'I build and deliver construction projects',
    image: ROLE_IMAGES.Builder,
  },
  {
    value: 'Vendor',
    label: 'Vendor',
    description: 'I supply materials and products for projects',
    image: ROLE_IMAGES.Vendor,
  },
  {
    value: 'Contractor',
    label: 'Contractor',
    description: 'I execute and manage construction work',
    image: ROLE_IMAGES.Contractor,
  },
  {
    value: 'Architect',
    label: 'Architect',
    description: 'I plan and design spaces and structures',
    image: ROLE_IMAGES.Architect,
  },
  {
    value: 'Engineer',
    label: 'Engineer',
    description: 'I deliver structural and MEP expertise',
    icon: 'settings-outline',
  },
];

/** Match API role strings back to our local art/copy. */
export function findDefaultRole(value: string, label = value): AppRole | undefined {
  const needle = `${value} ${label}`.toLowerCase();
  return DEFAULT_ROLES.find((role) => {
    const key = role.value.toLowerCase();
    const name = role.label.toLowerCase();
    return (
      needle.includes(key) ||
      needle.includes(name) ||
      key.includes(value.toLowerCase()) ||
      name.includes(label.toLowerCase())
    );
  });
}

export function getApiUrl() {
  return (
    process.env.EXPO_PUBLIC_API_URL ??
    (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
    'https://backendcode-7jad.onrender.com/api'
  );
}

/** Origin of the deployed web app that hosts Google OAuth success. */
export function getWebOrigin() {
  return (
    process.env.EXPO_PUBLIC_WEB_ORIGIN ??
    (Constants.expoConfig?.extra?.webOrigin as string | undefined) ??
    'https://www.cobilds.com'
  ).replace(/\/$/, '');
}

/** Backend redirects here after Google; Expo closes the auth session on this URL. */
export function getGoogleSuccessReturnUrl() {
  return `${getWebOrigin()}/auth/google-success`;
}
