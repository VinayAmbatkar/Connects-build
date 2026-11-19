import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { adsApi, type AdAnalytics, type AdCard, type OwnerAd } from '@/src/api/ads';
import { getErrorMessage } from '@/src/api/client';
import { Button } from '@/src/components/Button';
import { ErrorState } from '@/src/components/EmptyState';
import { ListSkeleton } from '@/src/components/Skeleton';
import { appAlert } from '@/src/components/AppDialog';
import { alertApiError } from '@/src/features/billing/featureLocked';
import { SponsoredPostCard } from '@/src/features/ads/SponsoredPostCard';
import { unlockAds } from '@/src/features/ads/unlock';
import { adsKeys, toCard } from '@/src/features/ads/shared';
import { useAuthStore } from '@/src/store/authStore';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';


const STATUS: Record<OwnerAd['deliveryStatus'], { label: string; fg: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  LIVE: { label: 'Live', fg: '#166534', bg: '#DCFCE7', icon: 'radio-button-on' },
  PRIVATE: { label: 'Private', fg: colors.textSecondary, bg: colors.surfaceMuted, icon: 'lock-closed' },
  PAUSED_PLAN: { label: 'Paused: plan expired', fg: '#92400E', bg: '#FEF3C7', icon: 'pause-circle' },
  NEEDS_IMAGE: { label: 'Needs an image', fg: '#92400E', bg: '#FEF3C7', icon: 'image-outline' },
  REMOVED: { label: 'Removed', fg: '#991B1B', bg: '#FEE2E2', icon: 'close-circle' },
};

const SAMPLE: AdCard = {
  id: 0,
  title: 'Premium TMT bars delivered to site in 48 hours',
  description: 'Fe 550D TMT bars from certified mills. Bulk pricing for builders and contractors.',
  imageUrls: [],
  linkUrl: 'https://example.com',
  cta: 'GET_QUOTE',
  ctaLabel: 'Get a quote',
  advertiser: { id: '', name: 'Shree Steel Traders', role: 'VENDORS', company: 'Shree Steel Traders', verified: true, businessVerified: true },
};

export default function AdsScreen() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const mineQuery = useQuery({ queryKey: adsKeys.mine, queryFn: adsApi.mine });
  const ad = mineQuery.data?.ads[0];

  const visibility = useMutation({
    mutationFn: (pub: boolean) => adsApi.setVisibility(ad!.id, pub ? 'PUBLIC' : 'PRIVATE'),
    // ['ads'] also refreshes the feed's cached ad set, so the change shows
    // on the Home feed right away.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ads'] }),
    onError: (e) => alertApiError(e, 'Could not change visibility'),
  });
  const remove = useMutation({
    mutationFn: () => adsApi.remove(ad!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ads'] }),
    onError: (e) => alertApiError(e, 'Could not delete the ad'),
  });

  if (mineQuery.isLoading) return <ListSkeleton />;
  if (mineQuery.isError || !mineQuery.data) {
    return <ErrorState title="Couldn't load your ad" message={getErrorMessage(mineQuery.error)} onRetry={() => mineQuery.refetch()} />;
  }
  const mine = mineQuery.data;

  if (!ad) {
    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.hero}>
          <Text style={styles.kicker}>{mine.entitled ? 'INCLUDED IN YOUR PLAN' : 'VERIFIED & PREMIUM MEMBERS'}</Text>
          <Text style={styles.heroTitle}>Put your business in front of the right people</Text>
          <Text style={styles.heroBody}>
            Run a sponsored post between posts in the home feed, seen by builders, consultants, vendors and homeowners where you work.
          </Text>
          {[
            'Learn more link to your website',
            'Target All India, a region or specific states',
            'See views, reach, clicks and profile visits',
          ].map((t) => (
            <View key={t} style={styles.point}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <Text style={styles.pointText}>{t}</Text>
            </View>
          ))}
          <Button
            title={mine.entitled ? 'Create your ad' : 'Unlock advertising'}
            onPress={() => (mine.canCreate ? router.push('/ads/edit' as Href) : void unlockAds())}
            style={{ marginTop: spacing.md }}
          />
        </View>
        <Text style={styles.sectionLabel}>EXAMPLE</Text>
        <SponsoredPostCard ad={SAMPLE} preview />
      </ScrollView>
    );
  }

  const status = STATUS[ad.deliveryStatus];
  const isPublic = ad.visibility === 'PUBLIC';
  const blocker = ad.deliveryStatus === 'REMOVED' ? 'This ad was removed and can’t be published.'
    : ad.imageUrls.length === 0 ? 'Add at least one image to go public.' : '';

  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      refreshControl={<RefreshControl refreshing={mineQuery.isRefetching} onRefresh={() => void qc.invalidateQueries({ queryKey: ['ads'] })} tintColor={colors.primary} />}
    >
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={[styles.pill, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={13} color={status.fg} />
            <Text style={[styles.pillText, { color: status.fg }]}>{status.label}</Text>
          </View>
          <Text style={styles.muted}>{ad.stats.views} views · {ad.stats.clicks} clicks</Text>
        </View>

        {ad.deliveryStatus === 'PAUSED_PLAN' && (
          <Pressable style={styles.banner} onPress={() => void unlockAds()}>
            <Text style={styles.bannerText}>Your ad is saved but not showing. Renew your membership to resume it.</Text>
            <Text style={styles.bannerCta}>Renew</Text>
          </Pressable>
        )}
        {ad.deliveryStatus === 'REMOVED' && (
          <View style={[styles.banner, { backgroundColor: '#FEE2E2' }]}>
            <Text style={[styles.bannerText, { color: '#991B1B' }]}>{ad.removedReason || 'Removed by COBILDS for breaking our guidelines.'}</Text>
          </View>
        )}

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>{isPublic ? 'Public' : 'Private'}</Text>
            <Text style={styles.muted}>{isPublic ? 'Showing in members’ feeds' : 'Only you can see it'}</Text>
          </View>
          <Switch
            value={isPublic}
            disabled={visibility.isPending || (!isPublic && !!blocker)}
            onValueChange={(v) => visibility.mutate(v)}
            trackColor={{ true: colors.success, false: colors.border }}
            thumbColor={colors.white}
            accessibilityLabel="Public or private"
          />
        </View>
        {!isPublic && !!blocker && <Text style={styles.warn}>{blocker}</Text>}
      </View>

      <Text style={styles.sectionLabel}>FEED PREVIEW</Text>
      <SponsoredPostCard ad={toCard(ad, user?.fullName ?? 'You', user?.role)} preview />

      <View style={styles.actions}>
        <Button title="Edit ad" variant="outline" style={{ flex: 1 }} onPress={() => router.push(`/ads/edit?id=${ad.id}` as Href)} />
        <Button
          title="Delete"
          variant="danger"
          style={{ flex: 1 }}
          loading={remove.isPending}
          onPress={() =>
            appAlert('Delete this advertisement?', 'Your ad, its images and analytics will be permanently deleted.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => remove.mutate() },
            ])
          }
        />
      </View>

      <Analytics adId={ad.id} isPublic={isPublic} />
    </ScrollView>
  );
}

function Analytics({ adId, isPublic }: { adId: number; isPublic: boolean }) {
  const [days, setDays] = useState(30);
  const q = useQuery({ queryKey: adsKeys.analytics(adId, days), queryFn: () => adsApi.analytics(adId, days) });
  const a = q.data;

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.cardTitle}>Performance</Text>
          <Text style={styles.muted}>Each member counts once per day</Text>
        </View>
        <View style={styles.seg}>
          {[7, 30, 90].map((d) => (
            <Pressable key={d} onPress={() => setDays(d)} style={[styles.segBtn, days === d && styles.segOn]} accessibilityState={{ selected: days === d }}>
              <Text style={[styles.segText, days === d && styles.segTextOn]}>{d}d</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.kpis}>
        <Kpi label="Views" value={a?.period.views} sub={a ? `${a.totals.views} all time` : ''} />
        <Kpi label="Reach" value={a?.period.reach} sub="Unique members" />
        <Kpi label="Link clicks" value={a?.period.clicks} sub={a ? `${a.period.ctr}% click rate` : ''} />
        <Kpi label="Profile visits" value={a?.period.profileVisits} sub="From your ad" />
      </View>

      {a && <ViewsChart a={a} />}
      {a && a.period.views === 0 && (
        <Text style={styles.empty}>{isPublic ? 'No views yet. Your ad shows as members scroll their feed.' : 'Make your ad public to start getting views.'}</Text>
      )}

      {a && a.byState.length > 0 && (
        <View style={{ marginTop: spacing.md, gap: 8 }}>
          <Text style={styles.cardTitle}>Where people saw it</Text>
          {a.byState.map((s) => {
            const max = Math.max(...a.byState.map((x) => x.views), 1);
            return (
              <View key={s.code} style={styles.stateRow}>
                <Text style={styles.stateName} numberOfLines={1}>{s.name}</Text>
                <View style={styles.stateTrack}><View style={[styles.stateFill, { width: `${(s.views / max) * 100}%` }]} /></View>
                <Text style={styles.stateVal}>{s.views}</Text>
              </View>
            );
          })}
        </View>
      )}
      {a && a.unknownLocationViews > 0 && (
        <Text style={styles.muted}>{a.unknownLocationViews} views from members without a profile location</Text>
      )}
    </View>
  );
}

function Kpi({ label, value, sub }: { label: string; value?: number; sub: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value ?? '–'}</Text>
      {!!sub && <Text style={styles.kpiSub}>{sub}</Text>}
    </View>
  );
}

/** Single-series column chart: views per day. Tap a column to inspect. */
function ViewsChart({ a }: { a: AdAnalytics }) {
  const [sel, setSel] = useState<number | null>(null);
  const max = Math.max(4, ...a.daily.map((d) => d.views));
  const fmt = (day: string) => new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const picked = sel != null ? a.daily[sel] : null;

  return (
    <View style={{ marginTop: spacing.md }}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>Views per day</Text>
        <Text style={styles.muted}>{picked ? `${fmt(picked.day)}: ${picked.views} views · ${picked.clicks} clicks` : `Peak ${Math.max(...a.daily.map((d) => d.views))}`}</Text>
      </View>
      <View style={styles.chart} accessibilityLabel={`Views per day, last ${a.days} days`}>
        {a.daily.map((d, i) => (
          <Pressable key={d.day} style={styles.col} onPress={() => setSel(sel === i ? null : i)} accessibilityLabel={`${fmt(d.day)}: ${d.views} views`}>
            <View
              style={[
                styles.bar,
                { height: `${(d.views / max) * 100}%`, opacity: sel == null || sel === i ? 1 : 0.35 },
              ]}
            />
          </Pressable>
        ))}
      </View>
      <View style={styles.rowBetween}>
        <Text style={styles.axis}>{fmt(a.daily[0].day)}</Text>
        <Text style={styles.axis}>{fmt(a.daily[a.daily.length - 1].day)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl, backgroundColor: colors.surfaceMuted, flexGrow: 1 },
  hero: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, gap: 8 },
  kicker: { fontFamily: typography.fontFamily.bold, fontSize: 11, letterSpacing: 1, color: colors.primaryDark },
  heroTitle: { fontFamily: typography.fontFamily.bold, fontSize: typography.size.xl, color: colors.text, lineHeight: 28 },
  heroBody: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: 4 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pointText: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.sm, color: colors.text, flex: 1 },
  sectionLabel: { fontFamily: typography.fontFamily.bold, fontSize: 11, letterSpacing: 1, color: colors.textMuted, marginBottom: -8, marginLeft: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, gap: 12 },
  cardTitle: { fontFamily: typography.fontFamily.semibold, fontSize: typography.size.md, color: colors.text },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  pillText: { fontFamily: typography.fontFamily.bold, fontSize: 12 },
  muted: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, color: colors.textMuted },
  warn: { fontFamily: typography.fontFamily.medium, fontSize: typography.size.xs, color: colors.warning },
  banner: { backgroundColor: '#FEF3C7', borderRadius: radius.md, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  bannerText: { flex: 1, fontFamily: typography.fontFamily.medium, fontSize: 13, color: '#92400E' },
  bannerCta: { fontFamily: typography.fontFamily.bold, fontSize: 13, color: colors.primaryDark },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  switchTitle: { fontFamily: typography.fontFamily.semibold, fontSize: typography.size.sm, color: colors.text },
  actions: { flexDirection: 'row', gap: spacing.sm },
  seg: { flexDirection: 'row', backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, padding: 3 },
  segBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  segOn: { backgroundColor: colors.white },
  segText: { fontFamily: typography.fontFamily.semibold, fontSize: 12, color: colors.textMuted },
  segTextOn: { color: colors.text },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpi: { flexBasis: '48%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  kpiLabel: { fontFamily: typography.fontFamily.semibold, fontSize: 12, color: colors.textSecondary },
  kpiValue: { fontFamily: typography.fontFamily.bold, fontSize: 24, color: colors.text, marginTop: 2 },
  kpiSub: { fontFamily: typography.fontFamily.regular, fontSize: 11, color: colors.textMuted },
  chart: { height: 140, flexDirection: 'row', alignItems: 'flex-end', marginTop: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  col: { flex: 1, height: '100%', justifyContent: 'flex-end', paddingHorizontal: 1 },
  bar: { backgroundColor: colors.primaryDark, borderTopLeftRadius: 3, borderTopRightRadius: 3, minHeight: 0 },
  axis: { fontFamily: typography.fontFamily.regular, fontSize: 11, color: colors.textMuted, marginTop: 4 },
  empty: { fontFamily: typography.fontFamily.regular, fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stateName: { width: 110, fontFamily: typography.fontFamily.medium, fontSize: 13, color: colors.text },
  stateTrack: { flex: 1, height: 12 },
  stateFill: { height: '100%', minWidth: 4, backgroundColor: colors.primaryDark, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  stateVal: { width: 36, textAlign: 'right', fontFamily: typography.fontFamily.semibold, fontSize: 13, color: colors.text },
});
