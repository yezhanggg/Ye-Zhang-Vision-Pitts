// "Who you're planning for" on Analysis > Match: the reader's income level, household, homes needed and transit
// distance, plus the focusing issue the rules run under. Session state only (never the URL, never saved).
import { create } from 'zustand';
import type { Household, IncomeLevel, TransitMiles } from './plan';
import type { Stance } from './types';

export interface PlanState {
  focus: Stance;
  level: IncomeLevel;
  household: Household;
  /** Homes needed; null when the box is empty. */
  homes: number | null;
  transitMi: TransitMiles;
  setPlan: (p: Partial<Omit<PlanState, 'setPlan'>>) => void;
}

export const PLAN_DEFAULTS = { focus: 'anti_displacement' as Stance, level: 50 as IncomeLevel, household: 'anyone' as Household, homes: null, transitMi: 0.5 as TransitMiles };

export const usePlan = create<PlanState>((set) => ({
  ...PLAN_DEFAULTS,
  setPlan: (p) => set(p),
}));
