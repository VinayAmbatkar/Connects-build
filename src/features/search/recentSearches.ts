import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'cobilds_recent_searches';
const MAX_RECENT = 8;

export type RecentTextSearch = {
  type: 'text';
  term: string;
  at: number;
};

export type RecentPersonSearch = {
  type: 'person';
  userId: string;
  name: string;
  role?: string;
  company?: string;
  location?: string;
  at: number;
};

export type RecentSearch = RecentTextSearch | RecentPersonSearch;

export async function loadRecentSearches(): Promise<RecentSearch[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item): RecentSearch | null => {
        if (!item || typeof item !== 'object') return null;
        const row = item as Record<string, unknown>;
        if (row.type === 'person' && typeof row.userId === 'string' && typeof row.name === 'string') {
          return {
            type: 'person',
            userId: row.userId,
            name: row.name,
            role: typeof row.role === 'string' ? row.role : undefined,
            company: typeof row.company === 'string' ? row.company : undefined,
            location: typeof row.location === 'string' ? row.location : undefined,
            at: typeof row.at === 'number' ? row.at : Date.now(),
          };
        }
        if (row.type === 'text' && typeof row.term === 'string' && row.term.trim()) {
          return {
            type: 'text',
            term: row.term.trim(),
            at: typeof row.at === 'number' ? row.at : Date.now(),
          };
        }
        // Legacy plain string
        if (typeof item === 'string' && item.trim()) {
          return { type: 'text', term: item.trim(), at: Date.now() };
        }
        return null;
      })
      .filter((item): item is RecentSearch => Boolean(item))
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

async function saveRecentSearches(items: RecentSearch[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
}

export async function addRecentTextSearch(term: string): Promise<RecentSearch[]> {
  const cleaned = term.trim();
  if (!cleaned) return loadRecentSearches();
  const existing = await loadRecentSearches();
  const next: RecentSearch[] = [
    { type: 'text', term: cleaned, at: Date.now() },
    ...existing.filter(
      (item) => !(item.type === 'text' && item.term.toLowerCase() === cleaned.toLowerCase()),
    ),
  ];
  await saveRecentSearches(next);
  return next;
}

export async function addRecentPersonSearch(person: {
  userId: string;
  name: string;
  role?: string;
  company?: string;
  location?: string;
}): Promise<RecentSearch[]> {
  if (!person.userId || !person.name.trim()) return loadRecentSearches();
  const existing = await loadRecentSearches();
  const next: RecentSearch[] = [
    {
      type: 'person',
      userId: person.userId,
      name: person.name.trim(),
      role: person.role,
      company: person.company,
      location: person.location,
      at: Date.now(),
    },
    ...existing.filter(
      (item) => !(item.type === 'person' && item.userId === person.userId),
    ),
  ];
  await saveRecentSearches(next);
  return next;
}

export async function clearRecentSearches(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function removeRecentSearch(target: RecentSearch): Promise<RecentSearch[]> {
  const existing = await loadRecentSearches();
  const next = existing.filter((item) => {
    if (target.type === 'text' && item.type === 'text') {
      return item.term.toLowerCase() !== target.term.toLowerCase();
    }
    if (target.type === 'person' && item.type === 'person') {
      return item.userId !== target.userId;
    }
    return true;
  });
  await saveRecentSearches(next);
  return next;
}

/** Construction / AEC suggestions for empty state. */
export const SEARCH_SUGGESTIONS = [
  'Architect',
  'Structural engineer',
  'PMC',
  'Interior designer',
  'HVAC contractor',
  'Facade consultant',
  'MEP engineer',
  'Project manager',
];
