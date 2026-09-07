import { apiClient } from '@/src/api/client';
import type { ProfessionalSearchResult } from '@/src/types/api';

export type SearchListResponse = {
  results?: ProfessionalSearchResult[];
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
};

export type SearchPage = {
  results: ProfessionalSearchResult[];
  total: number;
};

function normalizeResult(raw: Record<string, unknown>): ProfessionalSearchResult {
  const userId = (raw.userId ?? raw.id) as string | number | undefined;
  const fullName =
    (typeof raw.fullName === 'string' && raw.fullName) ||
    (typeof raw.name === 'string' && raw.name) ||
    undefined;

  const location =
    (typeof raw.location === 'string' && raw.location) ||
    (Array.isArray(raw.serviceLocations) && raw.serviceLocations[0]
      ? String(raw.serviceLocations[0])
      : undefined) ||
    (Array.isArray(raw.firmLocationIds) && raw.firmLocationIds[0]
      ? String(raw.firmLocationIds[0])
      : undefined);

  return {
    ...raw,
    id: (raw.id as string | number | undefined) ?? userId ?? '',
    userId,
    fullName,
    name: fullName,
    role: typeof raw.role === 'string' ? raw.role : undefined,
    company: typeof raw.company === 'string' ? raw.company : undefined,
    location,
    bio: typeof raw.bio === 'string' ? raw.bio : undefined,
    yearsExperience:
      typeof raw.yearsExperience === 'number' ? raw.yearsExperience : undefined,
    projectCount:
      typeof raw.projectCount === 'number' ? raw.projectCount : undefined,
  };
}

function unwrapPage(data: unknown): SearchPage {
  if (Array.isArray(data)) {
    const results = data.map((item) =>
      normalizeResult(item as Record<string, unknown>),
    );
    return { results, total: results.length };
  }

  if (data && typeof data === 'object') {
    const body = data as SearchListResponse;
    const results = Array.isArray(body.results)
      ? body.results.map((item) =>
          normalizeResult(item as unknown as Record<string, unknown>),
        )
      : [];
    const total =
      typeof body.pagination?.total === 'number'
        ? body.pagination.total
        : results.length;
    return { results, total };
  }

  return { results: [], total: 0 };
}

export const searchApi = {
  freeText: (q: string, limit = 20, page = 1) =>
    apiClient
      .get<SearchListResponse>('/professionals/search', {
        params: { q, limit, page },
      })
      .then((r) => unwrapPage(r.data).results),

  category: (params: {
    role?: string;
    projectType?: string;
    discipline?: string;
    specialization?: string;
    location?: string;
    page?: number;
    limit?: number;
  }) =>
    apiClient
      .get<SearchListResponse>('/professionals/search/category', {
        params,
      })
      .then((r) => unwrapPage(r.data)),
};
