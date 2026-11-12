import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { billingApi, type BillingReceipt } from '@/src/api/billing';
import { EmptyState } from '@/src/components/EmptyState';
import { formatInr, formatIstDate, paymentStatusLabel } from '@/src/features/billing/billingLogic';
import { colors, radius, spacing, typography } from '@/src/theme/tokens';

import { DetailSkeleton } from '@/src/components/Skeleton';
function productLabel(r: BillingReceipt): string {
  if (r.product === 'VERIFIED') return 'Verified membership (1 year)';
  return r.interval === 'MONTH' ? 'Premium (1 month)' : 'Premium (1 year)';
}

function receiptText(r: BillingReceipt): string {
  return [
    `COBILDS payment receipt ${r.number}`,
    `Issued: ${formatIstDate(r.issued_at)}`,
    `Billed to: ${r.customer_name} <${r.customer_email}>`,
    `Item: ${productLabel(r)}`,
    r.period_start ? `Period: ${formatIstDate(r.period_start)} – ${formatIstDate(r.period_end)}` : '',
    `Amount: ${formatInr(r.amount_paise)} (incl. GST)`,
    `Status: ${paymentStatusLabel(r.status)}${r.refunded_at ? ` on ${formatIstDate(r.refunded_at)}` : ''}`,
    `Razorpay payment ID: ${r.razorpay_payment_id}`,
    `Razorpay order ID: ${r.razorpay_order_id}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} selectable>
        {value}
      </Text>
    </View>
  );
}

/** Payment receipt (GET /billing/payments/:id/receipt), shareable as text. */
export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const paymentId = Number(id);
  const query = useQuery({
    queryKey: ['billing-receipt', paymentId],
    queryFn: () => billingApi.receipt(paymentId),
    enabled: Number.isFinite(paymentId),
  });

  if (query.isLoading) return <DetailSkeleton />;
  if (query.isError || !query.data) {
    return <EmptyState title="Receipt unavailable" message="Receipts are available for completed payments only." />;
  }
  const r = query.data;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.brand}>COBILDS</Text>
        <Text style={styles.title}>Payment receipt</Text>
        <Text style={styles.number}>{r.number}</Text>
        <Text style={styles.amount}>{formatInr(r.amount_paise)}</Text>
        <Text style={styles.gst}>Inclusive of GST</Text>

        <View style={styles.divider} />
        <Row label="Issued" value={formatIstDate(r.issued_at)} />
        <Row label="Billed to" value={`${r.customer_name}\n${r.customer_email}`} />
        <Row label="Item" value={productLabel(r)} />
        {r.period_start ? (
          <Row label="Period" value={`${formatIstDate(r.period_start)} – ${formatIstDate(r.period_end)}`} />
        ) : null}
        <Row
          label="Status"
          value={`${paymentStatusLabel(r.status)}${r.refunded_at ? ` on ${formatIstDate(r.refunded_at)}` : ''}`}
        />
        <Row label="Payment ID" value={r.razorpay_payment_id} />
        <Row label="Order ID" value={r.razorpay_order_id} />
      </View>

      <Pressable
        accessibilityRole="button"
        style={styles.share}
        onPress={() => void Share.share({ message: receiptText(r), title: `Receipt ${r.number}` })}
      >
        <Text style={styles.shareText}>Share receipt</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  brand: { fontFamily: typography.fontFamily.bold, color: colors.primary, letterSpacing: 1 },
  title: { marginTop: spacing.xs, fontFamily: typography.fontFamily.bold, fontSize: typography.size.lg, color: colors.text },
  number: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.sm, color: colors.textMuted },
  amount: { marginTop: spacing.md, fontFamily: typography.fontFamily.bold, fontSize: typography.size.xxl, color: colors.text },
  gst: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.xs, color: colors.textMuted },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.md },
  row: { flexDirection: 'row', paddingVertical: spacing.xs, gap: spacing.md },
  rowLabel: { width: 96, fontFamily: typography.fontFamily.medium, color: colors.textSecondary },
  rowValue: { flex: 1, fontFamily: typography.fontFamily.regular, color: colors.text },
  share: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareText: { fontFamily: typography.fontFamily.semibold, color: colors.white },
});
