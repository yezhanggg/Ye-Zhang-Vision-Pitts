// "Who you're planning for" on Analysis > Match: the household (size and age group), income level, homes needed, the
// flood risk accepted and the transit distance, plus the focusing issue the rules run under. Session state only
// (never the URL, never saved).
import { create } from 'zustand';
import type { AgeGroup, FloodRisk, HouseholdSize, PlanLevel, TransitMiles } from './plan';
import type { Stance } from './types';

export interface PlanState {
  focus: Stance;
  /** A HUD level (30 / 50 / 80) or 'market' (above 80% AMI). The Equity view reads market rate as 80%. */
  level: PlanLevel;
  size: HouseholdSize;
  age: AgeGroup;
  /** Homes needed; null when the box is empty. */
  homes: number | null;
  flood: FloodRisk;
  transitMi: TransitMiles;
  setPlan: (p: Partial<Omit<PlanState, 'setPlan'>>) => void;
}

export const PLAN_DEFAULTS = {
  focus: 'anti_displacement' as Stance,
  level: 50 as PlanLevel,
  /** 'auto' (the default): each place's largest CHAS renter household type sets the size. */
  size: 'auto' as HouseholdSize,
  age: 'any' as AgeGroup,
  homes: null,
  flood: 'any' as FloodRisk,
  transitMi: 0.5 as TransitMiles,
};

export const usePlan = create<PlanState>((set) => ({
  ...PLAN_DEFAULTS,
  setPlan: (p) => set(p),
}));
