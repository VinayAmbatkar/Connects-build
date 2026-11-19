import Constants from 'expo-constants';
import type { ImageSourcePropType } from 'react-native';
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export const LEGAL = {
  privacyUrl: 'https://www.cobilds.com/privacy-policy',
  termsUrl: 'https://www.cobilds.com/terms-and-conditions',
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
  Consumer: require('../../assets/images/Roles/consumer.png'),
} as const;

export const DEFAULT_ROLES: AppRole[] = [
  {
    value: 'Consultant',
    label: 'Consultant',
    description: 'Connect with specialists who guide every decision.',
    image: ROLE_IMAGES.Consultant,
  },
  {
    value: 'Vendor',
    label: 'Vendor',
    description: 'List materials, manage orders and grow sales.',
    image: ROLE_IMAGES.Vendor,
  },
  {
    value: 'Builder',
    label: 'Builder',
    description: 'Manage projects, teams and timelines.',
    image: ROLE_IMAGES.Builder,
  },
  {
    value: 'Consumer',
    label: 'Consumer',
    description: 'Find, compare and hire trusted professionals.',
    image: ROLE_IMAGES.Consumer,
  },
  {
    value: 'Architect',
    label: 'Architect',
    description: 'Design, collaborate and bring projects to life.',
    image: ROLE_IMAGES.Architect,
  },
  {
    value: 'Contractor',
    label: 'Contractor',
    description: 'Find skilled execution partners for your projects.',
    image: ROLE_IMAGES.Contractor,
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
    'https://stagging-backend-tcgym.ondigitalocean.app/api'
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

/** Web OAuth Client ID from Google Cloud Console; required by GoogleSignin.configure. */
export function getGoogleWebClientId() {
  return (
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
    (Constants.expoConfig?.extra?.googleWebClientId as string | undefined) ??
    ''
  );
}

/** iOS OAuth Client ID; needed on iOS because we don't ship GoogleService-Info.plist. */
export function getGoogleIosClientId() {
  return process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined;
}
