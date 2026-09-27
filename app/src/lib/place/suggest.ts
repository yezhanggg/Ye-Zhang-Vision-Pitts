// The suggested housing type for every tract with place measures, under one focusing issue and the reader's planning
// inputs (lib/place/plan). It is recommend() run 128 times; the Match map paints the lead type of each.
import { recommend, type RecommendOptions, type Recommendation } from './recommend';
import type { AgeGroup, FloodRisk, HouseholdSize, PlanLevel } from './plan';
import type { HudTable, PlaceMeasures, Stance, Typology } from './types';

export interface PlanInput {
  level: PlanLevel;
  size: HouseholdSize;
  age: AgeGroup;
  flood: FloodRisk;
  transitMi: number;
}

/** The recommend() options for a plan and a fit order (the fit order only orders types inside the suggested set). */
export const planOptions = (plan: PlanInput, fitOrder?: Typology[]): RecommendOptions => ({ level: plan.level, size: plan.size, age: plan.age, flood: plan.flood, transitMiles: plan.transitMi, fitOrder });

/** GEOID → recommendation for every place; `fitOrders` (GEOID → types best first) is optional. */
export function suggestAll(places: Map<string, PlaceMeasures>, hud: HudTable, stance: Stance, plan: PlanInput, fitOrders?: Map<string, Typology[]>): Map<string, Recommendation> {
  const out = new Map<string, Recommendation>();
  for (const [id, p] of places) out.set(id, recommend(p, hud, stance, planOptions(plan, fitOrders?.get(id))));
  return out;
}
