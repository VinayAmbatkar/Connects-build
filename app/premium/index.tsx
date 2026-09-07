import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, LoadingState } from '@/src/components/EmptyState';
import { premiumApi } from '@/src/api/premium';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

export default function PremiumScreen() {
  const plansQuery = useQuery({
    queryKey: ['premium-plans'],
    queryFn: premiumApi.plans,
  });

  if (plansQuery.isLoading) return <LoadingState />;

  const data = Array.isArray(plansQuery.data) ? plansQuery.data : [];

  return (
    <View style={styles.screen}>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Premium — Coming soon</Text>
        <Text style={styles.bannerBody}>
          Browse plans below. In-app purchase will be enabled in a future release once store billing
          is ready.
        </Text>
      </View>
      <FlatList
        data={data}
        keyExtractor={(item, index) => String(item.id ?? index)}
        contentContainerStyle={data.length === 0 ? styles.empty : styles.list}
        ListEmptyComponent={
          <EmptyState
            title="Plans coming soon"
            message="Premium plans will appear here when available."
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.name ?? 'Plan'}</Text>
            {item.price != null ? (
              <Text style={styles.price}>₹{item.price}</Text>
            ) : null}
            {item.description ? <Text style={styles.body}>{item.description}</Text> : null}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Coming soon</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  banner: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryMuted,
  },
  bannerTitle: {
    fontFamily: typography.fontFamily.bold,
    color: colors.secondary,
    fontSize: typography.size.lg,
  },
  bannerBody: {
    marginTop: spacing.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.primaryDark,
    lineHeight: 20,
  },
  list: { padding: spacing.md },
  empty: { flexGrow: 1 },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  title: { fontFamily: typography.fontFamily.semibold, color: colors.text, fontSize: typography.size.lg },
  price: {
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  body: {
    marginTop: spacing.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.textSecondary,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  badgeText: {
    fontFamily: typography.fontFamily.medium,
    color: colors.textSecondary,
    fontSize: typography.size.xs,
  },
});
