export function formatMonthYear(value?: string) {
  if (!value?.trim()) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export function formatDateRange(start?: string, end?: string) {
  const startLabel = formatMonthYear(start);
  const endLabel = end ? formatMonthYear(end) : 'Present';
  if (!startLabel && !end) return '';
  if (!startLabel) return endLabel;
  return `${startLabel} – ${endLabel}`;
}

export function formatRelativeTime(value?: string) {
  if (!value?.trim()) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(days / 365);
  return `${years}y`;
}

export function truncateText(text: string, max = 180) {
  if (text.length <= max) return { text, truncated: false };
  return { text: text.slice(0, max).trim(), truncated: true };
}

const ABOUT_PREVIEW_MAX = 120;

export function formatAboutPreview(bio: string, maxLength = ABOUT_PREVIEW_MAX) {
  const normalized = bio.trim().replace(/\s+/g, ' ');
  if (normalized.length <= maxLength) {
    return { text: normalized, truncated: false };
  }
  return {
    text: normalized.slice(0, maxLength).trimEnd(),
    truncated: true,
  };
}

const POST_ROLE_LABELS: Record<string, string> = {
  CONSULTANTS: 'Consultants',
  CONTRACTORS: 'Contractors',
  BUILDERS: 'Builders',
  BUILDERS_CONTRACTORS: 'Builders & Contractors',
  VENDORS: 'Vendors',
  CONSUMER: 'Consumer',
  CUSTOMER: 'Consumer',
  OTHERS: 'Professional',
};

/** "CONSULTANTS" -> "Consultants"; unknown values are title-cased. */
export function formatRoleLabel(role?: string | null): string {
  const key = role?.trim().toUpperCase();
  if (!key) return '';
  return (
    POST_ROLE_LABELS[key] ??
    key
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ')
  );
}

/** Compact engagement counts: 999, 1.2K, 12K, 1.5M. */
export function formatCount(value: number): string {
  if (!Number.isFinite(value) || value < 1000) return String(Math.max(0, Math.floor(value || 0)));
  const units: [number, string][] = [
    [1_000_000, 'M'],
    [1_000, 'K'],
  ];
  for (const [size, suffix] of units) {
    if (value >= size) {
      const scaled = value / size;
      const text = scaled >= 10 ? Math.floor(scaled).toString() : (Math.floor(scaled * 10) / 10).toString();
      return `${text}${suffix}`;
    }
  }
  return String(value);
}
