import { ConfigContext, ExpoConfig } from 'expo/config';

// Firebase config Android needs for push (FCM), Firebase project
// cobilds-prod. Committed on purpose: it holds no secrets. Set
// GOOGLE_SERVICES_JSON (e.g. an EAS "file" env var) to use a different one.
const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ?? './google-services.json';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'COBILDS',
  // EAS can't rename a project's slug; this must stay 'connexbuild' to
  // match @cobilds/connexbuild (its dashboard display name is COBILDS).
  slug: 'connexbuild',
  owner: 'cobilds',
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
      // UPI intent apps Razorpay Checkout can hand off to (Razorpay's
      // documented list for iOS).
      LSApplicationQueriesSchemes: ['tez', 'phonepe', 'paytmmp'],
    },
  },
  android: {
    package: 'com.cobilds.com',
    // Resize the available chat area with the keyboard so the message list
    // and composer move together instead of applying a second manual lift.
    softwareKeyboardLayoutMode: 'resize',
    googleServicesFile,
    adaptiveIcon: {
      backgroundColor: '#FFFFFF',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    permissions: ['android.permission.CAMERA'],
    // Play's photo/video permission policy rejects broad media access for
    // occasional picks; expo-image-picker uses the system Photo Picker.
    blockedPermissions: [
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.RECORD_AUDIO',
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
    // In-app video playback for post videos (VideoPlayer). No background
    // playback or picture-in-picture needed, so no options.
    'expo-video',
    [
      'expo-notifications',
      {
        icon: './assets/images/android-icon-monochrome.png',
        color: '#F57D01',
        defaultChannel: 'activity',
      },
    ],
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
        microphonePermission: false,
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
            // Razorpay Checkout SDK (react-native-razorpay) -- the keep
            // rules from Razorpay's Android integration docs.
            '-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }',
            '-keepattributes JavascriptInterface',
            '-keepattributes *Annotation*',
            '-dontwarn com.razorpay.**',
            '-keep class com.razorpay.** { *; }',
            '-optimizations !method/inlining/*',
            '-keepclasseswithmembers class * { public void onPayment*(...); }',
          ].join('\n'),
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://stagging-backend-tcgym.ondigitalocean.app/api',
    webOrigin: process.env.EXPO_PUBLIC_WEB_ORIGIN ?? 'https://www.cobilds.com',
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
    eas: {
      projectId: 'd0549fce-939e-4016-a9ca-d413c75110c1',
    },
  },
});
