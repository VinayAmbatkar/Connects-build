import { alertApiError } from '@/src/features/billing/featureLocked';
import { useState } from 'react';
import { Linking, StyleSheet, Switch, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { accountApi } from '@/src/api/account';
import { getErrorMessage } from '@/src/api/client';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

import { appAlert } from '@/src/components/AppDialog';
import { DetailSkeleton } from '@/src/components/Skeleton';
import {
  registerForPushAsync,
  requestPushPermissionAsync,
  unregisterPushAsync,
} from '@/src/notifications/push';

export function SettingsNotificationsScreen() {
  const queryClient = useQueryClient();
  const [requestingPermission, setRequestingPermission] = useState(false);
  const generalQuery = useQuery({
    queryKey: ['general'],
    queryFn: accountApi.getGeneral,
  });

  const mutation = useMutation({
    mutationFn: (notificationsEnabled: boolean) =>
      accountApi.updateGeneral({
        language: generalQuery.data?.language ?? 'ENGLISH',
        startupPage: generalQuery.data?.startupPage ?? 'DASHBOARD',
        notificationsEnabled,
      }),
    onSuccess: async (_data, notificationsEnabled) => {
      await queryClient.invalidateQueries({ queryKey: ['general'] });
      if (notificationsEnabled) {
        const token = await registerForPushAsync();
        if (!token) {
          appAlert(
            'Push notifications unavailable',
            'Your preference was saved, but this device could not register for push notifications. Please try again later.',
          );
        }
      } else {
        try {
          await unregisterPushAsync();
        } catch (error) {
          appAlert(
            'Could not fully disable push notifications',
            `Your account preference is off, but this device could not be unregistered. ${getErrorMessage(error)}`,
          );
        }
      }
    },
    onError: (error) => alertApiError(error),
  });

  const handleToggle = async (value: boolean) => {
    if (!value) {
      mutation.mutate(false);
      return;
    }

    setRequestingPermission(true);
    try {
      const permission = await requestPushPermissionAsync();
      if (permission === 'granted') {
        mutation.mutate(true);
      } else if (permission === 'blocked') {
        appAlert(
          'Notifications are blocked',
          'Allow notifications for COBILDS in your device settings to turn them on.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                void Linking.openSettings().catch((error) =>
                  appAlert('Unable to open settings', getErrorMessage(error)),
                );
              },
            },
          ],
        );
      } else if (permission === 'denied') {
        appAlert(
          'Permission not granted',
          'Notifications are still off. You can try enabling them again here.',
        );
      } else {
        appAlert(
          'Push notifications unavailable',
          'This app build does not include push notification support.',
        );
      }
    } catch (error) {
      appAlert('Unable to request permission', getErrorMessage(error));
    } finally {
      setRequestingPermission(false);
    }
  };

  if (generalQuery.isLoading) return <DetailSkeleton />;

  const enabled = Boolean(generalQuery.data?.notificationsEnabled);

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.title}>Push & in-app alerts</Text>
            <Text style={styles.subtitle}>
              Get notified about messages, connection requests, and activity.
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={(value) => void handleToggle(value)}
            trackColor={{ true: colors.primaryLight, false: colors.border }}
            thumbColor={colors.white}
            disabled={mutation.isPending || requestingPermission}
          />
        </View>
      </View>
      <Text style={styles.note}>
        Turning this off unregisters push notifications on this device. If
        notifications are blocked, enable them in your device settings first.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F5F7',
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  copy: { flex: 1 },
  title: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    color: colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  note: {
    marginTop: spacing.md,
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
