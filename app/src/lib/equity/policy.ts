// The policy simulator: four levers, each a written rule applied to the published tract measures. Before and after
// are both computed here from the same data, so every count on the page can be recomputed by hand.
import { recommend, type RecommendOptions } from '../place/recommend';
import { transitTestMiles } from '../place/plan';
import { isNum, roundHalfEven } from '../place/format';
import type { HudTable, PlaceMeasures, ZoningStatus } from '../place/types';
import { fitsRent2br, rentGap, type AmiPct } from './measures';
import { RESIDENTIAL_FAMILIES, SMALL_APT_CONDITIONAL_FAMILIES, statusFromShares, type SimType } from './zoning';

export interface Row {
  id: string;
  p: PlaceMeasures;
}

const override = (families: readonly string[], status: ZoningStatus) => Object.fromEntries(families.map((f) => [f, status])) as Record<string, ZoningStatus>;

function zoningFlip(rows: Row[], t: SimType, families: readonly string[]) {
  const before: string[] = [],
    after: string[] = [],
    changed: string[] = [];
  for (const { id, p } of rows) {
    const shares = p.zoning?.shares;
    if (!shares) continue;
    const b = statusFromShares(shares, t);
    const a = statusFromShares(shares, t, override(families, 'yes'));
    if (b === 'yes') before.push(id);
    if (a === 'yes') after.push(id);
    if (a === 'yes' && b !== 'yes') changed.push(id);
  }
  return { before, after, changed };
}

/** A copy of the place with one type's by-right status replaced. */
function withStatus(p: PlaceMeasures, t: SimType, status: ZoningStatus): PlaceMeasures {
  if (!p.zoning) return p;
  return {
    ...p,
    zoning: { ...p.zoning, by_type: { ...p.zoning.by_type, [t]: status } },
  };
}

// ---------------------------------------------------------------- 1. ADU by right
export interface AduResult {
  before: string[];
  after: string[];
  changed: string[];
  /** Tracts where the Anti-displacement recommendation includes an ADU before / after. */
  recBefore: string[];
  recAfter: string[];
  newlyRecommended: string[];
  /** Tracts where the recommendation already lists an ADU and its zoning note now reads "by right" instead of "conditional use". */
  noteChanged: string[];
}

export function aduByRight(rows: Row[], hud: HudTable | null, opts: RecommendOptions = {}): AduResult {
  const z = zoningFlip(rows, 'adu', RESIDENTIAL_FAMILIES);
  const recBefore: string[] = [],
    recAfter: string[] = [],
    noteChanged: string[] = [];
  if (hud) {
    const changed = new Set(z.changed);
    for (const { id, p } of rows) {
      const hasAdu = (q: PlaceMeasures) => recommend(q, hud, 'anti_displacement', opts).types.some((x) => x.typology === 'adu');
      const b = hasAdu(p);
      const a = changed.has(id) ? hasAdu(withStatus(p, 'adu', 'yes')) : b;
      if (b) recBefore.push(id);
      if (a) recAfter.push(id);
      if (a && b && changed.has(id)) noteChanged.push(id);
    }
  }
  const bSet = new Set(recBefore);
  return {
    ...z,
    recBefore,
    recAfter,
    newlyRecommended: recAfter.filter((id) => !bSet.has(id)),
    noteChanged,
  };
}

// ---------------------------------------------------------------- 2. Density bonus
/** Assumption: the bonus requires this share of homes affordable at 60% AMI. */
export const BONUS_AFFORDABLE_SHARE = 0.1;
/** HUD sets 60% limits at 1.2 × the 50% limits (the LIHTC convention). */
export const SIXTY_FROM_FIFTY = 1.2;

export interface Rent60 {
  limit50: number;
  limit60: number;
  rent: number;
  /** "$49,700 × 1.2 = $59,640; $59,640 × 30% ÷ 12 = $1,491" */
  formula: string;
}

const $ = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;

/** The 2-bedroom (3-person) rent at 60% AMI: the 50% limit × 1.2, then 30% of income ÷ 12. */
export function rent60TwoBedroom(hud: HudTable | null): Rent60 | null {
  const l50 = hud?.metro?.il50?.[2];
  if (!isNum(l50)) return null;
  const l60 = Math.round(l50 * SIXTY_FROM_FIFTY);
  const rent = roundHalfEven(l60 / 40);
  return {
    limit50: l50,
    limit60: l60,
    rent,
    formula: `${$(l50)} × 1.2 = ${$(l60)} a year; ${$(l60)} × 30% ÷ 12 = ${$(rent)} a month`,
  };
}

/** Homes that must be affordable in a building of `homes` under the bonus (10%, rounded up). */
export const bonusAffordableHomes = (homes: number) => Math.ceil(Math.max(0, homes) * BONUS_AFFORDABLE_SHARE - 1e-9);

export function densityBonus(rows: Row[]) {
  return zoningFlip(rows, 'small_apartment', SMALL_APT_CONDITIONAL_FAMILIES);
}

// ---------------------------------------------------------------- 3. Voucher / tax incentive
export interface GapCost {
  id: string;
  asking: number;
  fits: number;
  gap: number;
  /** max(0, gap) × 12 × homes */
  cost: number;
}

/** Annual gross subsidy to bring `homes` 2-bedroom homes from the asking rent down to what fits at `ami`. */
export function gapCost(id: string, p: PlaceMeasures, hud: HudTable | null, ami: AmiPct, homes: number): GapCost | null {
  const gap = rentGap(p, hud, ami);
  const fits = fitsRent2br(hud, ami);
  if (gap == null || fits == null) return null;
  return {
    id,
    asking: fits + gap,
    fits,
    gap,
    cost: Math.max(0, gap) * 12 * Math.max(0, homes),
  };
}

export function largestGaps(rows: Row[], hud: HudTable | null, ami: AmiPct, homes: number, n = 10) {
  const all = rows.map((r) => gapCost(r.id, r.p, hud, ami, homes)).filter((x): x is GapCost => !!x && x.gap > 0);
  const top = all.sort((a, b) => b.gap - a.gap || a.id.localeCompare(b.id)).slice(0, n);
  return {
    top,
    total: top.reduce((s, x) => s + x.cost, 0),
    withGap: all.length,
  };
}

// ---------------------------------------------------------------- 4. Frequent transit extension
/** The planner's Transit-first test (lib/place/plan): the average resident is within `miles` of a frequent stop. */
export function transitPasses(p: PlaceMeasures, miles: number): boolean {
  return transitTestMiles(p, miles).passed === true;
}

/** Tracts that pass at the planner's distance, at the extended distance, and those that newly pass. */
export function transitExtension(rows: Row[], chosenMi: number, extendedMi = 1) {
  const before: string[] = [],
    after: string[] = [],
    changed: string[] = [];
  for (const { id, p } of rows) {
    const b = transitPasses(p, chosenMi),
      a = transitPasses(p, Math.max(chosenMi, extendedMi));
    if (b) before.push(id);
    if (a) after.push(id);
    if (a && !b) changed.push(id);
  }
  return { before, after, changed };
}
