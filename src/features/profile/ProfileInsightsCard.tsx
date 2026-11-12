import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/src/api/social';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

function Stat({
  label,
  value,
  locked,
  onPress,
}: {
  label: string;
  value: number;
  locked?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={styles.stat}
      onPress={locked ? () => router.push('/premium') : onPress}
      disabled={!locked && !onPress}
      accessibilityRole={locked || onPress ? 'button' : undefined}
      accessibilityLabel={locked ? `${label}: upgrade to see` : `${label}: ${value}`}
    >
      {locked ? (
        <Ionicons name="lock-closed" size={18} color={colors.textMuted} />
      ) : (
        <Text style={styles.value}>{value.toLocaleString('en-IN')}</Text>
      )}
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

/** Profile analytics (GET /dashboard/stats) -- the web dashboard's stat
 *  cards. Locked insights link to the plans screen. Private to the owner. */
export function ProfileInsightsCard() {
  const query = useQuery({ queryKey: ['dashboard-stats'], queryFn: dashboardApi.stats, staleTime: 60_000 });
  if (!query.data) return null;
  const s = query.data;
  const anyLocked = s.profileViewsLocked || s.visibilityLocked;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
        <View style={styles.private}>
          <Ionicons name="eye-off-outline" size={12} color={colors.textMuted} />
          <Text style={styles.privateText}>Private to you</Text>
        </View>
      </View>
      <View style={styles.row}>
        <Stat label="Profile views" value={s.profileViews} locked={s.profileViewsLocked} />
        <Stat label="Search appearances" value={s.visibility} locked={s.visibilityLocked} />
        <Stat label="Connections" value={s.connections} onPress={() => router.push('/(tabs)/network')} />
      </View>
      {anyLocked ? (
        <Pressable onPress={() => router.push('/premium')} hitSlop={6}>
          <Text style={styles.upgrade}>See who's finding you — upgrade your plan ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: typography.fontFamily.bold, fontSize: typography.size.md, color: colors.text },
  private: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  privateText: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, color: colors.textMuted },
  row: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    minHeight: 64,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  value: { fontFamily: typography.fontFamily.bold, fontSize: typography.size.lg, color: colors.text },
  label: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  upgrade: { fontFamily: typography.fontFamily.semibold, fontSize: typography.size.sm, color: colors.primaryDark },
});
