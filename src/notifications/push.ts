import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo';
import Constants from 'expo-constants';
import type * as NotificationsModule from 'expo-notifications';
import type { Href } from 'expo-router';
import { Platform } from 'react-native';
import { devicesApi } from '@/src/api/devices';

const PUSH_TOKEN_KEY = 'cb_push_token';

/**
 * expo-notifications, or null when this binary doesn't include its native
 * code -- a dev client built before the package was added, Expo Go, or
 * web. Importing the package there throws "Cannot find native module
 * 'ExpoPushTokenManager'" and takes the whole app down, so it's only
 * loaded after checking. Everything push-related goes through this.
 */
export const Notifications: typeof NotificationsModule | null =
  Platform.OS !== 'web' && requireOptionalNativeModule('ExpoPushTokenManager')
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('expo-notifications') as typeof NotificationsModule)
    : null;

if (!Notifications && __DEV__ && Platform.OS !== 'web') {
  console.warn(
    '[push] expo-notifications native module missing — rebuild the dev client to enable push.',
  );
}

// Android channels. The backend picks one per notification
// (Backend-tech internal/push ChannelActivity / ChannelAnnouncements) --
// keep the ids in sync.
export const CHANNEL_ACTIVITY = 'activity';
export const CHANNEL_ANNOUNCEMENTS = 'announcements';

// Show pushes as a banner even while the app is open. On Android,
// shouldPlaySound: false would suppress the heads-up banner entirely.
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannels(N: typeof NotificationsModule) {
  if (Platform.OS !== 'android') return;
  await N.setNotificationChannelAsync(CHANNEL_ACTIVITY, {
    name: 'Activity',
    description:
      'Connection requests, posts from your connections, comments and mentions',
    importance: N.AndroidImportance.HIGH,
  });
  await N.setNotificationChannelAsync(CHANNEL_ANNOUNCEMENTS, {
    name: 'COBILDS announcements',
    description: 'News and updates from COBILDS',
    importance: N.AndroidImportance.HIGH,
  });
}

function easProjectId(): string | undefined {
  return (
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
    Constants.easConfig?.projectId
  );
}

// Token last sent to the backend in this session, and the registration in
// progress. Getting a token fires the push-token listener, which calls
// registerForPushAsync again -- without these that loops forever.
let registeredToken: string | null = null;
let inflight: Promise<string | null> | null = null;

/**
 * Asks for notification permission (once), gets this device's Expo push
 * token and registers it with the backend for the logged-in user.
 * Returns the token, or null if push isn't available (web, permission
 * denied, missing FCM config). Never throws. Concurrent calls share one
 * registration, and an unchanged token isn't re-sent.
 */
export function registerForPushAsync(): Promise<string | null> {
  inflight ??= register().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function register(): Promise<string | null> {
  const N = Notifications;
  if (!N) return null;

  try {
    // Android 13+: the permission prompt only appears once a channel
    // exists, and a channel must exist before requesting a token.
    await ensureAndroidChannels(N);

    const current = await N.getPermissionsAsync();
    let granted = current.granted;
    if (!granted && current.canAskAgain) {
      granted = (await N.requestPermissionsAsync()).granted;
    }
    if (!granted) return null;

    const token = (
      await N.getExpoPushTokenAsync({ projectId: easProjectId() })
    ).data;
    if (token === registeredToken) return token;

    await devicesApi.registerPushToken(token, Platform.OS);
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    registeredToken = token;
    return token;
  } catch (error) {
    if (__DEV__) {
      console.warn('[push] registration failed', error);
    }
    return null;
  }
}

/**
 * Removes this device's token from the backend. Call on logout, while the
 * session is still valid.
 */
export async function unregisterPushAsync(): Promise<void> {
  // The next login (maybe another account) must register again.
  registeredToken = null;
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!token) return;
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    await devicesApi.unregisterPushToken(token);
  } catch {
    // Best-effort: if this fails, the next account to log in on this
    // phone takes the token over anyway.
  }
}

type PushData = {
  type?: string;
  actorId?: string;
  referenceId?: number | string;
  notificationId?: number | string;
};

export function readPushData(
  notification: NotificationsModule.Notification,
): PushData {
  return (notification.request.content.data ?? {}) as PushData;
}

/** Screen to open when a notification of this type is tapped. */
export function routeForNotification(data: PushData): Href {
  const ref = data.referenceId;
  switch (data.type) {
    case 'NEW_POST':
    case 'NEW_COMMENT':
    case 'MENTION':
    case 'NEW_LIKE':
    case 'POST_SHARED':
      return ref ? `/event/${ref}` : '/notifications';
    case 'NEW_MESSAGE':
      return ref ? `/chat/${ref}` : '/notifications';
    case 'NEW_GROUP_MESSAGE':
    case 'ADDED_TO_GROUP':
      return ref ? (`/group/${ref}` as Href) : '/notifications';
    // The Network tab opens on "Requested", where Accept/Reject live.
    case 'CONNECTION_REQUEST':
      return '/(tabs)/network';
    case 'CONNECTION_ACCEPTED':
      return data.actorId ? `/public-profile/${data.actorId}` : '/(tabs)/network';
    default:
      return '/notifications';
  }
}
