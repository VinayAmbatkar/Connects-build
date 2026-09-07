import { create } from 'zustand';

export type SearchFlowState = {
  role: string;
  location: string;
  projectType: string;
  discipline: string;
  specialization: string;
  /** Wizard step to open when editing (1–4). */
  editStep: number | null;
  setRole: (role: string) => void;
  setLocation: (location: string) => void;
  setProjectType: (projectType: string) => void;
  setDiscipline: (discipline: string) => void;
  setSpecialization: (specialization: string) => void;
  setEditStep: (step: number | null) => void;
  resetSelections: () => void;
  reset: () => void;
};

const empty = {
  role: '',
  location: '',
  projectType: '',
  discipline: '',
  specialization: '',
  editStep: null as number | null,
};

export const useSearchFlowStore = create<SearchFlowState>((set) => ({
  ...empty,

  setRole: (role) =>
    set({
      role,
      location: '',
      projectType: '',
      discipline: '',
      specialization: '',
      editStep: null,
    }),

  setLocation: (location) => set({ location }),
  setProjectType: (projectType) => set({ projectType }),
  setDiscipline: (discipline) =>
    set({ discipline, specialization: '' }),
  setSpecialization: (specialization) => set({ specialization }),
  setEditStep: (editStep) => set({ editStep }),

  resetSelections: () =>
    set((s) => ({
      ...empty,
      role: s.role,
    })),

  reset: () => set({ ...empty }),
}));
