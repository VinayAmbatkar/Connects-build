import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LoadingState } from '@/src/components/EmptyState';
import { accountApi } from '@/src/api/account';
import { getErrorMessage } from '@/src/api/client';
import { useAuthActions } from '@/src/hooks/useAuthActions';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

const OPTIONS = [
  {
    value: 'PUBLIC',
    label: 'Public',
    desc: 'Anyone on COBILDS can view your profile.',
  },
  {
    value: 'CONNECTIONS',
    label: 'Connections only',
    desc: 'Only accepted connections can view your full profile.',
  },
  {
    value: 'PRIVATE',
    label: 'Private',
    desc: 'Your profile stays hidden from search and discovery.',
  },
] as const;

export function SettingsPrivacyScreen() {
  const queryClient = useQueryClient();
  const { logout } = useAuthActions();
  const privacyQuery = useQuery({
    queryKey: ['privacy'],
    queryFn: accountApi.getPrivacy,
  });

  const mutation = useMutation({
    mutationFn: (profileVisibility: string) =>
      accountApi.updatePrivacy(profileVisibility),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['privacy'] }),
    onError: (error) => Alert.alert('Error', getErrorMessage(error)),
  });

  const deactivateMutation = useMutation({
    mutationFn: accountApi.deactivate,
    onSuccess: async () => {
      await logout();
      router.replace('/(auth)/login');
      Alert.alert(
        'Account deactivated',
        'Your account has been soft-deleted. Contact support to restore it.',
      );
    },
    onError: (error) => Alert.alert('Error', getErrorMessage(error)),
  });

  if (privacyQuery.isLoading) return <LoadingState />;

  const current = String(
    (privacyQuery.data as { profileVisibility?: string } | undefined)
      ?.profileVisibility ?? 'PUBLIC',
  ).toUpperCase();

  return (
    <View style={styles.screen}>
      <Text style={styles.heading}>Profile visibility</Text>
      <Text style={styles.subheading}>
        Choose who can see your profile details.
      </Text>

      <View style={styles.card}>
        {OPTIONS.map((opt, index) => {
          const active = current === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[
                styles.option,
                index < OPTIONS.length - 1 && styles.optionDivider,
                active && styles.optionActive,
              ]}
              onPress={() => mutation.mutate(opt.value)}
              disabled={mutation.isPending}
            >
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>{opt.label}</Text>
                <Text style={styles.optionDesc}>{opt.desc}</Text>
              </View>
              {active ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              ) : (
                <View style={styles.radio} />
              )}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={styles.dangerBtn}
        onPress={() =>
          Alert.alert(
            'Deactivate account',
            'This soft-deletes your account. You can contact support to restore it.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Deactivate',
                style: 'destructive',
                onPress: () => deactivateMutation.mutate(),
              },
            ],
          )
        }
      >
        <Text style={styles.dangerText}>Deactivate account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F5F7',
    padding: spacing.md,
  },
  heading: {
    fontFamily: typography.fontFamily.bold,
    fontSize: 18,
    color: colors.text,
  },
  subheading: {
    marginTop: 4,
    marginBottom: spacing.md,
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: spacing.md,
  },
  optionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionActive: {
    backgroundColor: colors.primaryMuted,
  },
  optionCopy: { flex: 1 },
  optionTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    color: colors.text,
  },
  optionDesc: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  dangerBtn: {
    marginTop: spacing.lg,
    minHeight: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    color: colors.danger,
  },
});
