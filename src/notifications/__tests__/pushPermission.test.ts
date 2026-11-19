jest.mock('expo', () => ({
  requireOptionalNativeModule: jest.fn(() => ({})),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: null, easConfig: null },
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  AndroidImportance: { HIGH: 4 },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}));

jest.mock('@/src/api/devices', () => ({
  devicesApi: {
    registerPushToken: jest.fn(),
    unregisterPushToken: jest.fn(),
  },
}));

import {
  Notifications,
  requestPushPermissionAsync,
} from '@/src/notifications/push';

const mockNotifications = Notifications as NonNullable<typeof Notifications>;
const getPermissionsAsync =
  mockNotifications.getPermissionsAsync as jest.Mock;
const requestPermissionsAsync =
  mockNotifications.requestPermissionsAsync as jest.Mock;

describe('push notification permission requests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('re-prompts when the operating system still allows another request', async () => {
    getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
    requestPermissionsAsync.mockResolvedValue({
      granted: true,
      canAskAgain: true,
    });

    await expect(requestPushPermissionAsync()).resolves.toBe('granted');
    expect(requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('does not re-prompt when permission is blocked and directs the caller to settings', async () => {
    getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });

    await expect(requestPushPermissionAsync()).resolves.toBe('blocked');
    expect(requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('does not prompt again when permission is already granted', async () => {
    getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });

    await expect(requestPushPermissionAsync()).resolves.toBe('granted');
    expect(requestPermissionsAsync).not.toHaveBeenCalled();
  });
});
