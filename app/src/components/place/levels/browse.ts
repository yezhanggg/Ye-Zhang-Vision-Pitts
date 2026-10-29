// Browse or test (Ye, 2026-10-27): at every level the left panel can browse a place (what it needs most: incomes,
// rents, who rents, what zoning allows, and the project that fits best) before any project is set, or test a project.
// Online only: loaded on demand.
import { create } from 'zustand';

export type PlaceMode = 'browse' | 'test';

export const useBrowse = create<{ mode: PlaceMode; set: (mode: PlaceMode) => void }>((set) => ({ mode: 'test', set: (mode) => set({ mode }) }));
