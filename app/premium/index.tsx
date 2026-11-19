import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '@/src/components/EmptyState';
import {
  billingApi,
  type BillingInterval,
  type BillingPayment,
  type BillingProduct,
  type FeatureAccess,
  type PlanProduct,
  type ProductStatus,
} from '@/src/api/billing';
import {
  describeStatus,
  formatInr,
  formatIstDate,
  includedFeatures,
  paymentStatusLabel,
  type StatusTone,
} from '@/src/features/billing/billingLogic';
import { purchaseKey, usePurchase } from '@/src/features/billing/usePurchase';
import { useFreemiumStore } from '@/src/features/billing/freemiumStore';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

import { DetailSkeleton } from '@/src/components/Skeleton';
/**
 * The signed-in user's Verified / Premium memberships, what each plan
 * includes, and buy / renew via Razorpay Checkout (native SDK on
 * Android/iOS, checkout.js on web). Same billing API and purchase flow as
 * the web /subscription page -- see src/features/billing/purchase.ts.
 */
const toneColor: Record<StatusTone, string> = {
  active: colors.success,
  renew: colors.warning,
  expired: colors.danger,
  none: colors.textMuted,
};

function StatusRow({ title, status }: { title: string; status: ProductStatus }) {
  const { text, tone } = describeStatus(status);
  return (
    <View style={styles.statusRow}>
      <View style={[styles.dot, { backgroundColor: toneColor[tone] }]} />
      <View style={styles.statusText}>
        <Text style={styles.statusTitle}>{title}</Text>
        <Text style={[styles.statusLine, { color: tone === 'none' ? colors.textSecondary : toneColor[tone] }]}>{text}</Text>
      </View>
    </View>
  );
}

function PlanCard({
  plan,
  status,
  busy,
  onBuy,
  claimLabel,
  claiming,
  onClaim,
  priceNote,
}: {
  plan: PlanProduct;
  status: ProductStatus;
  busy: string | null;
  onBuy: (product: BillingProduct, interval: BillingInterval) => void;
  /** Set while this plan can be claimed free (freemium campaign). */
  claimLabel?: string;
  claiming?: boolean;
  onClaim?: () => void;
  /** "Free for the next 3 months", from the backend. */
  priceNote?: string;
}) {
  const isPremium = plan.product === 'PREMIUM';
  const active = status.active;
  const claimable = !!claimLabel && !status.active;
  const canBuy = !claimable && (!status.active || status.can_renew);
  return (
    <View style={[styles.card, isPremium && styles.cardDark]}>
      <View style={styles.cardHead}>
        <Text style={[styles.cardTitle, isPremium && styles.onDark]}>{isPremium ? 'Premium' : 'Verified membership'}</Text>
        {active ? (
          <View style={styles.currentPill}>
            <Text style={styles.currentPillText}>Your plan</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.cardSub, isPremium && styles.onDarkMuted]}>
        {isPremium
          ? 'Group chat, profile insights, an advertisement and room for more projects.'
          : 'The Verified badge, plus connect, message and showcase your projects.'}
      </Text>
      <View style={styles.prices}>
        {plan.prices.map((p) => (
          <Text key={p.interval} style={[styles.price, isPremium && styles.onDark, claimable && styles.struck]}>
            {formatInr(p.amount_paise)}
            <Text style={[styles.per, isPremium && styles.onDarkMuted]}>{p.interval === 'YEAR' ? ' / year' : ' / month'}</Text>
          </Text>
        ))}
      </View>
      {claimable && priceNote ? (
        <View style={styles.freePill}>
          <Text style={styles.freePillText}>{priceNote}</Text>
        </View>
      ) : null}
      {includedFeatures(plan.features).map((label) => (
        <Text key={label} style={[styles.feature, isPremium && styles.onDark]}>
          <Text style={styles.tick}>✓ </Text>
          {label}
        </Text>
      ))}
      {claimable ? (
        <View style={styles.buyRow}>
          <Pressable
            accessibilityRole="button"
            disabled={claiming}
            onPress={onClaim}
            style={({ pressed }) => [
              styles.buyButton,
              isPremium && styles.buyButtonOnDark,
              (pressed || claiming) && styles.buyButtonDim,
            ]}
          >
            {claiming ? (
              <ActivityIndicator color={isPremium ? colors.secondary : colors.white} />
            ) : (
              <Text style={[styles.buyText, isPremium && styles.buyTextOnDark]}>{claimLabel}</Text>
            )}
          </Pressable>
          <Text style={[styles.renewNote, isPremium && styles.onDarkMuted]}>No payment, no card. Free access starts right away.</Text>
        </View>
      ) : null}
      {canBuy && status.trial ? (
        <Text style={[styles.renewNote, isPremium && styles.onDarkMuted]}>
          Your free access continues. The paid plan starts only when it ends, so you lose no days.
        </Text>
      ) : null}
      {canBuy ? (
        <View style={styles.buyRow}>
          {plan.prices.map((p) => {
            const key = purchaseKey(plan.product, p.interval);
            const loading = busy === key;
            const per = p.interval === 'YEAR' ? 'year' : 'month';
            const verb = status.trial
              ? isPremium ? 'Keep Premium' : 'Keep Verified'
              : active ? 'Renew' : isPremium ? 'Get Premium' : 'Get Verified';
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={`${verb} for ${formatInr(p.amount_paise)} per ${per}`}
                disabled={busy !== null}
                onPress={() => onBuy(plan.product, p.interval)}
                style={({ pressed }) => [
                  styles.buyButton,
                  isPremium && styles.buyButtonOnDark,
                  (pressed || (busy !== null && !loading)) && styles.buyButtonDim,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color={isPremium ? colors.secondary : colors.white} />
                ) : (
                  <Text style={[styles.buyText, isPremium && styles.buyTextOnDark]}>
                    {plan.prices.length > 1 ? `${verb} · ${per}ly` : verb}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ) : claimable ? null : (
        <Text style={[styles.renewNote, isPremium && styles.onDarkMuted]}>
          {status.trial
            ? "Free access active · you're all set"
            : status.renewable_from ? `Renewal opens on ${formatIstDate(status.renewable_from)}.` : 'Active.'}
        </Text>
      )}
    </View>
  );
}

/** The Free plan, shown first like the web's plan columns -- every account
 *  has it, so there's nothing to buy. */
function FreePlanCard({ features, current }: { features: FeatureAccess[]; current: boolean }) {
  const included = includedFeatures(features);
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>Free</Text>
        {current ? (
          <View style={styles.currentPill}>
            <Text style={styles.currentPillText}>Your plan</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.cardSub}>Create your profile and explore the platform.</Text>
      <View style={styles.prices}>
        <Text style={styles.price}>
          {formatInr(0)}
          <Text style={styles.per}> forever</Text>
        </Text>
      </View>
      {included.map((label) => (
        <Text key={label} style={styles.feature}>
          <Text style={styles.tick}>✓ </Text>
          {label}
        </Text>
      ))}
      <Text style={styles.renewNote}>
        {current ? 'No card needed' : 'Included with every account'}
      </Text>
    </View>
  );
}

function PaymentRow({ payment }: { payment: BillingPayment }) {
  const name =
    payment.product === 'PREMIUM'
      ? `Premium (${payment.interval === 'MONTH' ? 'monthly' : 'yearly'})`
      : 'Verified membership';
  const hasReceipt = payment.status === 'PAID' || payment.status === 'REFUNDED';
  return (
    <Pressable
      accessibilityRole={hasReceipt ? 'button' : undefined}
      disabled={!hasReceipt}
      onPress={() => router.push({ pathname: '/billing/receipt/[id]', params: { id: String(payment.ID) } })}
      style={styles.paymentRow}
    >
      <View style={styles.statusText}>
        <Text style={styles.statusTitle}>{name}</Text>
        <Text style={styles.paymentMeta}>
          {formatIstDate(payment.paid_at ?? payment.CreatedAt)} · {paymentStatusLabel(payment.status)}
        </Text>
      </View>
      <Text style={styles.paymentAmount}>{formatInr(payment.amount_paise)}</Text>
      {hasReceipt ? <Text style={styles.receiptLink}>Receipt ›</Text> : null}
    </Pressable>
  );
}

export default function PremiumScreen() {
  const meQuery = useQuery({ queryKey: ['billing-me'], queryFn: billingApi.me });
  const plansQuery = useQuery({ queryKey: ['billing-plans'], queryFn: billingApi.plans });
  const paymentsQuery = useQuery({ queryKey: ['billing-payments'], queryFn: billingApi.payments });
  const { buy, busy } = usePurchase();
  const claim = useFreemiumStore((s) => s.claim);
  const claiming = useFreemiumStore((s) => s.claiming);

  if (meQuery.isLoading || plansQuery.isLoading) return <DetailSkeleton />;

  if (meQuery.isError || plansQuery.isError) {
    return (
      <EmptyState
        title="Couldn't load your plan"
        message="Check your connection and pull down to try again."
      />
    );
  }

  const me = meQuery.data!;
  const plans = plansQuery.data!;
  const refreshing = meQuery.isRefetching || plansQuery.isRefetching;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void meQuery.refetch();
            void plansQuery.refetch();
            void paymentsQuery.refetch();
          }}
        />
      }
    >
      {me.claim_offer ? (
        <View style={styles.claimBanner}>
          <View style={styles.claimIcon}>
            <Ionicons name="gift-outline" size={22} color={colors.white} />
          </View>
          <Text style={styles.claimTitle}>{me.claim_offer.title}</Text>
          <Text style={styles.claimMessage}>{me.claim_offer.message}</Text>
          <Pressable
            accessibilityRole="button"
            disabled={claiming}
            onPress={() => void claim('')}
            style={({ pressed }) => [styles.claimBtn, (pressed || claiming) && styles.buyButtonDim]}
          >
            {claiming ? <ActivityIndicator color={colors.white} /> : <Text style={styles.claimBtnText}>{me.claim_offer.cta_label}</Text>}
          </Pressable>
        </View>
      ) : null}

      <View style={styles.yourPlan}>
        <Text style={styles.label}>YOUR PLAN</Text>
        <Text style={styles.tier}>{me.tier === 'FREE' ? 'Free' : me.tier === 'VERIFIED' ? 'Verified' : 'Premium'}</Text>
        <StatusRow title="Verified membership" status={me.verified} />
        <StatusRow title="Premium" status={me.premium} />
        <Text style={styles.note}>Your Verified badge appears once your verification (KYC) is also complete.</Text>
      </View>

      <Text style={styles.sectionTitle}>Plans</Text>
      <FreePlanCard features={plans.free_features ?? []} current={me.tier === 'FREE'} />
      {plans.products.map((plan) => (
        <PlanCard
          key={plan.product}
          plan={plan}
          status={plan.product === 'PREMIUM' ? me.premium : me.verified}
          busy={busy}
          onBuy={(product, interval) => void buy(product, interval)}
          claimLabel={me.claim_offer && me.claim_products?.includes(plan.product) ? me.claim_offer.cta_label : undefined}
          claiming={claiming}
          onClaim={() => void claim('')}
          priceNote={me.claim_offer?.price_note}
        />
      ))}
      <Text style={styles.note}>Prices include GST. Payments are processed securely by Razorpay.</Text>

      {paymentsQuery.data && paymentsQuery.data.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Payment history</Text>
          <View style={styles.paymentList}>
            {paymentsQuery.data.map((p) => (
              <PaymentRow key={p.ID} payment={p} />
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  struck: { textDecorationLine: 'line-through', opacity: 0.55 },
  freePill: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.full,
    backgroundColor: colors.success,
  },
  freePillText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xs,
    color: colors.white,
  },
  claimBanner: {
    marginBottom: spacing.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  claimIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  claimTitle: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.text,
  },
  claimMessage: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  claimBtn: {
    minHeight: 48,
    marginTop: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  claimBtnText: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.md,
    color: colors.white,
  },
  yourPlan: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  label: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xs,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  tier: {
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.xl,
    color: colors.text,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 9, height: 9, borderRadius: 5 },
  statusText: { flex: 1 },
  statusTitle: { fontFamily: typography.fontFamily.semibold, color: colors.text },
  statusLine: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm },
  note: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.lg,
    color: colors.text,
  },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  cardDark: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cardTitle: { fontFamily: typography.fontFamily.bold, fontSize: typography.size.lg, color: colors.text },
  cardSub: { fontFamily: typography.fontFamily.regular, color: colors.textSecondary, lineHeight: 20 },
  currentPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
  },
  currentPillText: { fontFamily: typography.fontFamily.semibold, fontSize: typography.size.xs, color: colors.primaryDark },
  prices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginVertical: spacing.sm },
  price: { fontFamily: typography.fontFamily.bold, fontSize: typography.size.xl, color: colors.text },
  per: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textSecondary },
  feature: { fontFamily: typography.fontFamily.regular, color: colors.text, lineHeight: 22 },
  tick: { color: colors.primary, fontFamily: typography.fontFamily.bold },
  onDark: { color: colors.white },
  onDarkMuted: { color: 'rgba(255,255,255,0.7)' },
  buyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  buyButton: {
    flexGrow: 1,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButtonOnDark: { backgroundColor: colors.primary },
  buyButtonDim: { opacity: 0.6 },
  buyText: { fontFamily: typography.fontFamily.semibold, color: colors.white },
  buyTextOnDark: { color: colors.secondary },
  renewNote: {
    marginTop: spacing.sm,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  paymentList: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  paymentMeta: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, color: colors.textMuted },
  paymentAmount: { fontFamily: typography.fontFamily.bold, color: colors.text },
  receiptLink: { fontFamily: typography.fontFamily.semibold, fontSize: typography.size.xs, color: colors.primaryDark },
});
