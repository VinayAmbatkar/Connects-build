import {
  getDisciplinesForRole,
  getSpecializationsForDiscipline,
} from '@/src/constants/category';

export type ProfileOption = {
  id: string;
  label: string;
  name?: string;
  roleIds?: string[];
  disciplineIds?: string[];
};

type RawOption = {
  id?: string;
  label?: string;
  name?: string;
  value?: string;
  roleId?: string;
  roleIds?: string[];
  disciplineId?: string;
  disciplineIds?: string[];
};

function toIdList(...values: Array<string | string[] | undefined>): string[] {
  const ids = values.flatMap((value) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  });
  return [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
}

/** Normalize option IDs for cross-format matching (DESIGNERS ↔ designers, URBAN_PLANNER ↔ urban-planner). */
export function canonicalOptionId(id: string): string {
  return id.trim().toLowerCase().replace(/_/g, '-');
}

export function optionIdsMatch(a: string, b: string): boolean {
  return canonicalOptionId(a) === canonicalOptionId(b);
}

export function formatOptionIdAsLabel(id: string): string {
  return canonicalOptionId(id)
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function findOptionById(
  options: ProfileOption[],
  id: string,
): ProfileOption | undefined {
  const needle = canonicalOptionId(id);
  return options.find((option) => canonicalOptionId(option.id) === needle);
}

export function isIdSelected(selectedIds: string[], optionId: string): boolean {
  const needle = canonicalOptionId(optionId);
  return selectedIds.some((id) => canonicalOptionId(id) === needle);
}

export function removeIdByMatch(ids: string[], targetId: string): string[] {
  const needle = canonicalOptionId(targetId);
  return ids.filter((id) => canonicalOptionId(id) !== needle);
}

export function normalizeOptions(items?: RawOption[]): ProfileOption[] {
  if (!items?.length) return [];

  return items
    .map((item): ProfileOption | null => {
      const id = String(item.id ?? item.value ?? item.label ?? item.name ?? '').trim();
      const label = String(item.label ?? item.name ?? item.value ?? id).trim();
      if (!id) return null;

      const roleIds = toIdList(item.roleIds, item.roleId);
      const disciplineIds = toIdList(item.disciplineIds, item.disciplineId);

      return {
        id,
        label,
        ...(item.name ? { name: item.name } : {}),
        ...(roleIds.length ? { roleIds } : {}),
        ...(disciplineIds.length ? { disciplineIds } : {}),
      };
    })
    .filter((item): item is ProfileOption => item !== null);
}

export function resolveOptionLabel(
  options: ProfileOption[],
  value?: string,
): string | undefined {
  if (!value?.trim()) return undefined;

  const match = findOptionById(options, value);
  return match?.label ?? formatOptionIdAsLabel(value);
}

export function resolveOptionLabels(
  options: ProfileOption[],
  ids?: string[],
): string[] {
  if (!ids?.length) return [];
  return ids
    .map((id) => resolveOptionLabel(options, id))
    .filter((label): label is string => Boolean(label));
}

export function toggleId(ids: string[], id: string): string[] {
  return isIdSelected(ids, id)
    ? removeIdByMatch(ids, id)
    : [...ids, id];
}

/** Always true — discipline→specialization is defined in category constants. */
export function specializationsAreDisciplineLinked(_options?: ProfileOption[]): boolean {
  return true;
}

export function filterDisciplinesByRole(
  disciplines: ProfileOption[],
  roleId?: string,
): ProfileOption[] {
  const fromMap = getDisciplinesForRole(roleId);
  if (fromMap.length) {
    return fromMap.map((item) => {
      const apiMatch = findOptionById(disciplines, item.id);
      return {
        id: item.id,
        label: apiMatch?.label ?? item.label,
      };
    });
  }

  if (!roleId?.trim()) return disciplines;
  const role = roleId.trim();
  const roleScoped = disciplines.filter(
    (item) =>
      !item.roleIds?.length ||
      item.roleIds.some((id) => optionIdsMatch(id, role)),
  );
  return roleScoped.length ? roleScoped : disciplines;
}

/**
 * Specializations for a discipline — uses the hardcoded category tree
 * (same as web frontend SUB2_BY_SUB1). Falls back to API-linked options.
 */
export function filterSpecializationsByDiscipline(
  specializations: ProfileOption[],
  disciplineId: string,
  _disciplineLinked = true,
): ProfileOption[] {
  const fromMap = getSpecializationsForDiscipline(disciplineId);
  if (fromMap.length) {
    return fromMap.map((item) => {
      const apiMatch = findOptionById(specializations, item.id);
      return {
        id: item.id,
        label: apiMatch?.label ?? item.label,
      };
    });
  }

  // Discipline has no specialization tier (e.g. Builders → Buildings)
  // or unknown discipline — only use API disciplineIds if present
  const scoped = specializations.filter((item) =>
    item.disciplineIds?.some((id) => optionIdsMatch(id, disciplineId)),
  );
  return scoped;
}

/** Selected specializations that belong to a given discipline. */
export function getSelectedSpecializationsForDiscipline(
  specializations: ProfileOption[],
  disciplineId: string,
  selectedIds: string[] = [],
): ProfileOption[] {
  const scoped = filterSpecializationsByDiscipline(specializations, disciplineId, true);
  return scoped.filter((item) => isIdSelected(selectedIds, item.id));
}

export function getSelectedOptions(
  options: ProfileOption[],
  selectedIds: string[] = [],
): ProfileOption[] {
  return selectedIds.map((id) => {
    const match = findOptionById(options, id);
    if (match) return match;
    return { id, label: formatOptionIdAsLabel(id) };
  });
}

export function pruneSpecializationsForDisciplines(
  specializationIds: string[] = [],
  specializations: ProfileOption[],
  disciplineIds: string[] = [],
  _disciplineLinked = true,
): string[] {
  if (!disciplineIds.length) {
    return specializationIds;
  }

  const allowed = new Set<string>();
  for (const disciplineId of disciplineIds) {
    for (const option of filterSpecializationsByDiscipline(
      specializations,
      disciplineId,
    )) {
      allowed.add(canonicalOptionId(option.id));
    }
  }

  return specializationIds.filter((id) => allowed.has(canonicalOptionId(id)));
}

/**
 * Extract flat string-ID arrays from a profile response.
 * The backend may return `disciplines` as object arrays or `disciplineIds` as
 * string arrays — this handles both.
 */
export function normalizeProfileIds(raw: Record<string, unknown>): {
  disciplineIds: string[];
  specializationIds: string[];
  projectTypeIds: string[];
} {
  const extract = (key: string, altKey: string): string[] => {
    const val = raw[key] ?? raw[altKey];
    if (!Array.isArray(val) || val.length === 0) return [];
    if (typeof val[0] === 'string') return val as string[];
    if (typeof val[0] === 'object' && val[0] !== null) {
      return val
        .map((o: Record<string, unknown>) =>
          String(o.id ?? o._id ?? o.value ?? ''),
        )
        .filter(Boolean);
    }
    return [];
  };

  return {
    disciplineIds: extract('disciplines', 'disciplineIds'),
    specializationIds: extract('specializations', 'specializationIds'),
    projectTypeIds: extract('projectTypes', 'projectTypeIds'),
  };
}
