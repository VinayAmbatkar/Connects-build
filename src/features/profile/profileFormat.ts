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
