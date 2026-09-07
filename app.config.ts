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
    bundleIdentifier: 'com.connexbuild.app',
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
    package: 'com.connexbuild.app',
    // Pan so the chat composer can lift with Reanimated keyboard height
    // without Android also resizing the window (which caused clipping).
    softwareKeyboardLayoutMode: 'pan',
    adaptiveIcon: {
      backgroundColor: '#F57D01',
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
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#F57D01',
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
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://backendcode-7jad.onrender.com/api',
    webOrigin: process.env.EXPO_PUBLIC_WEB_ORIGIN ?? 'https://www.cobilds.com',
    eas: {
      projectId: 'd0549fce-939e-4016-a9ca-d413c75110c1',
    },
  },
});
