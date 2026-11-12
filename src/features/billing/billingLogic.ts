import type { FeatureAccess, ProductStatus } from '@/src/api/billing';

/** "₹1,899" from paise. */
export function formatInr(amountPaise: number): string {
  const rupees = amountPaise / 100;
  const fixed = Number.isInteger(rupees) ? String(rupees) : rupees.toFixed(2);
  const [whole, decimals] = fixed.split('.');
  // Indian grouping: last 3 digits, then pairs (1,23,45,678).
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}` : last3;
  return `₹${grouped}${decimals ? `.${decimals}` : ''}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "4 Nov 2027" in IST, independent of the device's time zone. */
export function formatIstDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const ist = new Date(new Date(iso).getTime() + (5 * 60 + 30) * 60 * 1000);
  return `${ist.getUTCDate()} ${MONTHS[ist.getUTCMonth()]} ${ist.getUTCFullYear()}`;
}

export type StatusTone = 'active' | 'renew' | 'expired' | 'none';

/** One line describing a membership, plus how to colour it. */
export function describeStatus(s: ProductStatus): { text: string; tone: StatusTone } {
  if (s.active && s.trial) {
    return { text: 'Free access', tone: 'active' };
  }
  if (s.active && s.can_renew) {
    return { text: `Expires ${formatIstDate(s.valid_until)} — renew now`, tone: 'renew' };
  }
  if (s.active) {
    return { text: `Active until ${formatIstDate(s.valid_until)}`, tone: 'active' };
  }
  if (s.expired_at) {
    return { text: `Expired on ${formatIstDate(s.expired_at)}`, tone: 'expired' };
  }
  return { text: 'Not active', tone: 'none' };
}

/** Features a plan actually includes, with their limit where it has one. */
export function includedFeatures(features: FeatureAccess[]): string[] {
  return features
    .filter((f) => f.enabled && (f.kind === 'BOOL' || f.limit > 0))
    .map((f) => (f.kind === 'LIMIT' ? `${f.label} (up to ${f.limit})` : f.label));
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  CREATED: 'Not completed',
  PAID: 'Paid',
  FAILED: 'Failed',
  NEEDS_REVIEW: 'Under review',
  REFUNDED: 'Refunded',
};

export function paymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_LABEL[status] ?? status;
}
