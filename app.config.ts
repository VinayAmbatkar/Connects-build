import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'COBILDS',
  slug: 'connexbuild',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'connexbuild',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.cobilds.com',
    infoPlist: {
      NSCameraUsageDescription:
        'COBILDS needs camera access to upload profile, project, and message photos.',
      NSPhotoLibraryUsageDescription:
        'COBILDS needs photo library access to upload images to your profile and feed.',
      NSPhotoLibraryAddUsageDescription:
        'COBILDS may save images you choose to share.',
    },
  },
  android: {
    package: 'com.cobilds.com',
    // Pan so the chat composer can lift with Reanimated keyboard height
    // without Android also resizing the window (which caused clipping).
    softwareKeyboardLayoutMode: 'pan',
    adaptiveIcon: {
      backgroundColor: '#FFFFFF',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    permissions: [
      'android.permission.CAMERA',
      'android.permission.READ_MEDIA_IMAGES',
    ],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    ...(process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME
      ? [
          [
            '@react-native-google-signin/google-signin',
            { iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME },
          ] as [string, { iosUrlScheme: string }],
        ]
      : []),
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#FFFFFF',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Allow COBILDS to access your photos for portfolio and messaging.',
        cameraPermission:
          'Allow COBILDS to use your camera for uploads.',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          // Universal APKs ship 4 ABIs (~100MB). Phones need arm64 only.
          buildArchs: ['arm64-v8a'],
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          enableBundleCompression: true,
          useLegacyPackaging: true,
          extraProguardRules: [
            '-keep class com.swmansion.reanimated.** { *; }',
            '-keep class com.swmansion.worklets.** { *; }',
            '-keep class com.facebook.react.turbomodule.** { *; }',
          ].join('\n'),
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://backendcode-7jad.onrender.com/api',
    webOrigin: process.env.EXPO_PUBLIC_WEB_ORIGIN ?? 'https://www.cobilds.com',
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
    eas: {
      projectId: 'd0549fce-939e-4016-a9ca-d413c75110c1',
    },
  },
});
