import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoadingState } from '@/src/components/EmptyState';
import { accountApi } from '@/src/api/account';
import { getErrorMessage } from '@/src/api/client';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

export function SettingsNotificationsScreen() {
  const queryClient = useQueryClient();
  const generalQuery = useQuery({
    queryKey: ['general'],
    queryFn: accountApi.getGeneral,
  });

  const mutation = useMutation({
    mutationFn: (notificationsEnabled: boolean) =>
      accountApi.updateGeneral({ language: 'ENGLISH', notificationsEnabled }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['general'] }),
    onError: (error) => Alert.alert('Error', getErrorMessage(error)),
  });

  if (generalQuery.isLoading) return <LoadingState />;

  const enabled = Boolean(
    (generalQuery.data as { notificationsEnabled?: boolean } | undefined)
      ?.notificationsEnabled,
  );

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
            onValueChange={(value) => mutation.mutate(value)}
            trackColor={{ true: colors.primaryLight, false: colors.border }}
            thumbColor={colors.white}
            disabled={mutation.isPending}
          />
        </View>
      </View>
      <Text style={styles.note}>
        Preference is saved to your account. Delivery depends on device
        notification permissions.
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
