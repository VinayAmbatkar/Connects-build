import { useQueries } from '@tanstack/react-query';
import { getPlaceName } from '@/src/api/googlePlaces';
import { LOCATION_LABELS } from '@/src/constants/category';

/**
 * Profiles and posts store a location as one of: a Google place ID
 * ("ChIJx9Lr6tq..."), a location code ("MUMBAI"), or typed text. This turns
 * any of them into something readable -- never the raw place ID, which is
 * what profiles used to show.
 */

/** Google place IDs are long opaque tokens with no spaces -- unlike
 *  location codes (UPPER_SNAKE) or typed text. Same rule as the web app. */
export function isPlaceId(value: string): boolean {
  return value.length >= 20 && !/\s/.test(value) && !/^[A-Z0-9_]+$/.test(value);
}

/** The label for anything that isn't a place ID ('' for a place ID). */
export function staticLocationLabel(value: string | null | undefined): string {
  const v = (value ?? '').trim();
  if (!v) return '';
  if (LOCATION_LABELS[v]) return LOCATION_LABELS[v];
  if (isPlaceId(v)) return '';
  return /^[A-Z0-9_]+$/.test(v)
    ? v.toLowerCase().split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : v;
}

/**
 * Readable labels for `values`, in order, with duplicates and anything that
 * can't be resolved dropped. Place names are looked up once and cached for
 * the session (a place's name doesn't change).
 */
export function usePlaceLabels(values: (string | null | undefined)[]): string[] {
  const cleaned = values.map((v) => (v ?? '').trim()).filter(Boolean);
  const placeIds = [...new Set(cleaned.filter((v) => !LOCATION_LABELS[v] && isPlaceId(v)))];

  const results = useQueries({
    queries: placeIds.map((id) => ({
      queryKey: ['place-name', id],
      queryFn: () => getPlaceName(id),
      staleTime: Infinity,
      gcTime: Infinity,
      retry: false,
    })),
  });
  const names = new Map(placeIds.map((id, i) => [id, results[i]?.data ?? '']));

  const out: string[] = [];
  for (const v of cleaned) {
    const label = isPlaceId(v) && !LOCATION_LABELS[v] ? names.get(v) ?? '' : staticLocationLabel(v);
    if (label && !out.includes(label)) out.push(label);
  }
  return out;
}

/** Single-value form of usePlaceLabels. */
export function usePlaceLabel(value: string | null | undefined): string {
  return usePlaceLabels([value])[0] ?? '';
}
