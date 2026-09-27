// Small synthetic configs and tracts for the analysis tests. Nothing here reads the shipped data.
import type { TractResult } from '../derived';
import type { Part, TypologyScore } from '../scoring';
import type { ScoringConfig, TractProps, Weights } from '../types';

/** The eight factors and five types of scoring v0.4.0 (the plan's fit matrix), with the two margins set. */
export const FACTORS = ['need', 'market_strength', 'displacement_risk', 'subsidy_eligible', 'transit_access', 'flood_exposure', 'senior_demand', 'small_multifamily_stock'];
export const TYPES: [string, string][] = [
  ['adu', 'ADU'],
  ['duplex_triplex', 'Duplex / triplex'],
  ['townhome', 'Townhome'],
  ['small_apartment', 'Small apartment'],
  ['senior', 'Senior housing'],
];
const LABELS: Record<string, string> = {
  need: 'Affordability need',
  market_strength: 'Market strength',
  displacement_risk: 'Displacement risk',
  subsidy_eligible: 'Subsidy eligibility',
  transit_access: 'Transit access',
  flood_exposure: 'Flood exposure',
  senior_demand: 'Residents 65 and over',
  small_multifamily_stock: '2–4 unit homes',
  walk_score: 'Walk score',
};
export const MATRIX: Record<string, Record<string, number>> = {
  adu: { need: 0.3, market_strength: 0.5, displacement_risk: 0.5, subsidy_eligible: 0, transit_access: 0.3, flood_exposure: -0.8, senior_demand: 0, small_multifamily_stock: 0.3 },
  duplex_triplex: { need: 0.6, market_strength: 0.4, displacement_risk: 0.3, subsidy_eligible: 0.2, transit_access: 0.5, flood_exposure: -1, senior_demand: 0, small_multifamily_stock: 0.8 },
  townhome: { need: 0, market_strength: 1, displacement_risk: -0.4, subsidy_eligible: 0.1, transit_access: 0.2, flood_exposure: -1, senior_demand: 0, small_multifamily_stock: 0 },
  small_apartment: { need: 1, market_strength: 0.3, displacement_risk: 0.4, subsidy_eligible: 0.6, transit_access: 1, flood_exposure: -0.5, senior_demand: 0, small_multifamily_stock: 0 },
  senior: { need: 0.3, market_strength: 0.15, displacement_risk: 0.2, subsidy_eligible: 0.6, transit_access: 0.8, flood_exposure: -1, senior_demand: 0.8, small_multifamily_stock: 0 },
};

export const ones = (ids: string[] = FACTORS, v = 1): Weights => Object.fromEntries(ids.map((f) => [f, v]));

export function cfgOf(factors: string[] = FACTORS, matrix: Record<string, Record<string, number>> = MATRIX, types: [string, string][] = TYPES, extra: Partial<ScoringConfig> = {}): ScoringConfig {
  return {
    version: 'test',
    factors: factors.map((id) => ({ id, label: LABELS[id] ?? id, short: id, description: '', raw_field: null, unit: 'pct', sources: [], year: 2024 })),
    typologies: types.map(([id, label]) => ({ id, label, long: label, color: '#000' })),
    fit: { label: 'test', matrix },
    scoring: { stability_draws: 1000, stability_concentration: 25, stability_seed: 42, tie_margin: 0.005, close_margin: 0.03 },
    presets: [
      { id: 'balanced', label: 'Balanced', weights: ones(factors) },
      { id: 'anti_displacement', label: 'Anti-displacement', weights: { ...ones(factors), need: 2, market_strength: 0.5, displacement_risk: 3, subsidy_eligible: 1.5 } },
      { id: 'transit_first', label: 'Transit-first', weights: { ...ones(factors), transit_access: 3 } },
    ],
    bins: { score: [0, 0.4, 0.5, 0.6, 0.7, 0.8, 1] },
    ...extra,
  };
}
export const CFG = cfgOf();

/** A ranked tract with the given factor values (null = no data); anything else can be overridden. */
export function tractOf(values: Record<string, number | null>, over: Partial<TractProps> = {}): TractProps {
  return { GEOID: '42003000100', name: 'Tract 1', neighborhood: 'Testville', focus: null, residential: true, pgh_share: 1, households: 1200, need_count: 300, ...values, ...over } as unknown as TractProps;
}

/** A tract with the same value on every factor. */
export const flatTract = (x: number, over: Partial<TractProps> = {}) => tractOf(Object.fromEntries(FACTORS.map((f) => [f, x])), over);

export const part = (factor: string, x: number, d: number, contrib: number, lift: number, w = 1): Part => ({ factor, x, d, w, contrib, lift });

/** A hand-written result from typology scores (best first by score); parts optional. */
export function resultOf(scores: [string, number | null, Part[]?][]): TractResult {
  const list: TypologyScore[] = scores.map(([typology, score, parts]) => ({ typology, score, parts: parts ?? [] }));
  const ranking = list.filter((s) => s.score != null).sort((a, b) => (b.score as number) - (a.score as number)).map((s) => s.typology);
  const top = ranking[0] ?? null;
  return { scores: list, ranking, top, topScore: top ? (list.find((s) => s.typology === top)!.score as number) : null };
}
