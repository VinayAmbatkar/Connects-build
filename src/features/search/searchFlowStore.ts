import { create } from 'zustand';
import { getSpecializationsForDiscipline } from '@/src/constants/category';

/**
 * Find Connections (guided search) selections. Project type, type of <role>
 * (discipline) and category (specialization) are all multi-select, matching
 * the web wizard and the backend's multi-value search.
 */
export type SearchFlowState = {
  role: string;
  /** Display text for the chosen place (or a location code). */
  location: string;
  /** Google place ID of the chosen place, when it came from Places. */
  placeId: string;
  projectTypes: string[];
  disciplines: string[];
  specializations: string[];
  /** Wizard step to open when editing (1–4). */
  editStep: number | null;
  setRole: (role: string) => void;
  setLocation: (location: string, placeId?: string) => void;
  toggleProjectType: (id: string) => void;
  toggleDiscipline: (id: string) => void;
  toggleSpecialization: (id: string) => void;
  setProjectTypes: (ids: string[]) => void;
  setDisciplines: (ids: string[]) => void;
  setSpecializations: (ids: string[]) => void;
  setEditStep: (step: number | null) => void;
  resetSelections: () => void;
  reset: () => void;
};

const empty = {
  role: '',
  location: '',
  placeId: '',
  projectTypes: [] as string[],
  disciplines: [] as string[],
  specializations: [] as string[],
  editStep: null as number | null,
};

const toggle = (list: string[], id: string) =>
  list.includes(id) ? list.filter((v) => v !== id) : [...list, id];

/** Categories still offered by the selected disciplines. */
function pruneSpecializations(disciplines: string[], specializations: string[]) {
  const allowed = new Set(disciplines.flatMap((d) => getSpecializationsForDiscipline(d).map((o) => o.id)));
  return specializations.filter((s) => allowed.has(s));
}

export const useSearchFlowStore = create<SearchFlowState>((set) => ({
  ...empty,

  setRole: (role) => set({ ...empty, role }),

  setLocation: (location, placeId = '') => set({ location, placeId }),
  toggleProjectType: (id) => set((s) => ({ projectTypes: toggle(s.projectTypes, id) })),
  toggleDiscipline: (id) =>
    set((s) => {
      const disciplines = toggle(s.disciplines, id);
      // Deselecting a type drops the categories picked under it.
      return { disciplines, specializations: pruneSpecializations(disciplines, s.specializations) };
    }),
  toggleSpecialization: (id) => set((s) => ({ specializations: toggle(s.specializations, id) })),
  setProjectTypes: (projectTypes) => set({ projectTypes }),
  setDisciplines: (disciplines) =>
    set((s) => ({ disciplines, specializations: pruneSpecializations(disciplines, s.specializations) })),
  setSpecializations: (specializations) => set({ specializations }),
  setEditStep: (editStep) => set({ editStep }),

  resetSelections: () => set((s) => ({ ...empty, role: s.role })),

  reset: () => set({ ...empty }),
}));

/**
 * The backend's multi-select category filter: one "TYPE" or
 * "TYPE:CAT|CAT" entry per selected discipline (see the backend's
 * auth.ParseCategoryFilter). A type with no category picked means anyone
 * of that type.
 */
export function toCategoryParam(disciplines: string[], specializations: string[]): string {
  return disciplines
    .map((d) => {
      const own = new Set(getSpecializationsForDiscipline(d).map((o) => o.id));
      const picked = specializations.filter((s) => own.has(s));
      return picked.length ? `${d}:${picked.join('|')}` : d;
    })
    .join(',');
}
