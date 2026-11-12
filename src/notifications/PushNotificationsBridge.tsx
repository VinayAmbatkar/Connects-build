import { useEffect, useRef } from 'react';
import type { NotificationResponse } from 'expo-notifications';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/src/api/notifications';
import { useAuthStore } from '@/src/store/authStore';
import {
  Notifications,
  readPushData,
  registerForPushAsync,
  routeForNotification,
} from '@/src/notifications/push';

/**
 * Wires push notifications into the app; renders nothing. Mounted once in
 * the root layout, inside the QueryClientProvider. Does nothing when the
 * build has no expo-notifications native code (see push.ts).
 *
 * - Registers the device token whenever someone is logged in.
 * - Refreshes the notification list/badge when a push arrives in the
 *   foreground.
 * - Opens the right screen when a notification is tapped, including the
 *   tap that launched the app from a killed state.
 */
export function PushNotificationsBridge() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const userId = useAuthStore((s) => s.user?.id);
  const isLoggedIn = Boolean(accessToken);
  const handled = useRef(new Set<string>());

  useEffect(() => {
    if (!Notifications || !isLoggedIn) return;
    void registerForPushAsync();
    // Tokens rarely rotate, but when they do the old one stops working.
    // This listener also fires every time a token is fetched (including by
    // registerForPushAsync itself), so only react to an actual change.
    let lastDeviceToken: string | null = null;
    const sub = Notifications.addPushTokenListener(({ data }) => {
      const token = String(data);
      if (lastDeviceToken === null) {
        lastDeviceToken = token;
        return;
      }
      if (token === lastDeviceToken) return;
      lastDeviceToken = token;
      void registerForPushAsync();
    });
    return () => sub.remove();
    // userId: re-register when a different account logs in.
  }, [isLoggedIn, userId]);

  useEffect(() => {
    if (!Notifications) return;
    const sub = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    });
    return () => sub.remove();
  }, [queryClient]);

  useEffect(() => {
    const N = Notifications;
    if (!N || !isLoggedIn) return;

    const open = (response: NotificationResponse) => {
      const id = response.notification.request.identifier;
      if (handled.current.has(id)) return;
      handled.current.add(id);

      const data = readPushData(response.notification);
      if (data.notificationId) {
        void notificationsApi.markRead(data.notificationId).then(() => {
          void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
        });
      }
      router.push(routeForNotification(data));
    };

    // Cold start: the tap that launched the app.
    void N.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        open(response);
        void N.clearLastNotificationResponseAsync();
      }
    });

    const sub = N.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [isLoggedIn, queryClient]);

  return null;
}
