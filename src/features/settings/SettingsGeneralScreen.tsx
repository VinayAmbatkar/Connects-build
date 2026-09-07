import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LoadingState } from '@/src/components/EmptyState';
import { accountApi } from '@/src/api/account';
import { getErrorMessage } from '@/src/api/client';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

const STARTUP_OPTIONS = [
  { value: 'DASHBOARD', label: 'Home feed' },
  { value: 'SEARCH', label: 'Discover' },
  { value: 'PROFILE', label: 'My profile' },
] as const;

export function SettingsGeneralScreen() {
  const queryClient = useQueryClient();
  const generalQuery = useQuery({
    queryKey: ['general'],
    queryFn: accountApi.getGeneral,
  });

  const mutation = useMutation({
    mutationFn: (startupPage: string) =>
      accountApi.updateGeneral({
        language: 'ENGLISH',
        startupPage,
        notificationsEnabled: Boolean(
          (generalQuery.data as { notificationsEnabled?: boolean } | undefined)
            ?.notificationsEnabled,
        ),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['general'] });
      Alert.alert('Saved', 'Your experience preferences were updated.');
    },
    onError: (error) => Alert.alert('Error', getErrorMessage(error)),
  });

  if (generalQuery.isLoading) return <LoadingState />;

  const current = String(
    (generalQuery.data as { startupPage?: string } | undefined)?.startupPage ??
      'DASHBOARD',
  ).toUpperCase();

  return (
    <View style={styles.screen}>
      <Text style={styles.heading}>Startup page</Text>
      <Text style={styles.subheading}>
        Choose where you land after opening the app.
      </Text>

      <View style={styles.card}>
        {STARTUP_OPTIONS.map((opt, index) => {
          const active = current === opt.value;
          return (
            <Pressable
              key={opt.value}
              style={[
                styles.row,
                index < STARTUP_OPTIONS.length - 1 && styles.rowDivider,
              ]}
              onPress={() => mutation.mutate(opt.value)}
              disabled={mutation.isPending}
            >
              <Text style={styles.rowLabel}>{opt.label}</Text>
              {active ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              ) : (
                <View style={styles.radio} />
              )}
            </Pressable>
          );
        })}
      </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 16,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    fontFamily: typography.fontFamily.medium,
    fontSize: 15,
    color: colors.text,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
});
