// Find places for a project (docs/data/finder.md): the project described once, every ranked tract tested with the
// same model the Place page runs (lib/project/model, the size sweep in lib/project/size), and the places ordered by a
// rule printed in words. No composite number: a place's standing is its rank, its tier and its figures.
//
// Order: tier (closes, then over PHFA's limit, then gap); places whose size range zoning or market depth did not cut come
// before those it did; then the gap a home at the reference size (headroom counts below zero); then more PHFA
// points the place itself brings; then the lower cost a home. "Either credit" tests 9% and 4% and keeps the better one
// by the same rule.
import { qctYears } from '../pencil/designations';
import { planFacts } from '../lihtc/fromPlan';
import { sheetState } from '../lihtc/sheetState';
import type { Entries } from '../lihtc/store';
import type { PlanLevel } from '../place/plan';
import type { HudTable, PlaceMeasures, Typology } from '../place/types';
import type { Branch } from '../pencil/inputs';
import { projectBase } from '../project/model';
import { sweepSizes, type Sweep, type Tier } from '../project/size';
import type { ProjectState } from '../project/store';

export type Financing = 'either' | Branch;

export interface FinderInputs {
  min: number;
  max: number;
  financing: Financing;
  /** The building type the by-right filter reads; null: any multi-home type. */
  type: Typology | null;
  /** Only places where zoning allows the type by right on at least 5% of the land (place.json, unverified table). */
  byRight: boolean;
  /** A conditional use counts as allowed. */
  conditionalOk: boolean;
  /** Most of the land in a FEMA flood zone, in percent; null: no limit. */
  maxFlood: number | null;
  qctOrDda: boolean;
  overlay: 'any' | 'inside' | 'outside';
  /** Fewest homes of market depth; null: no limit. */
  minDepth: number | null;
  /** Highest total cost a home at the reference size; null: no limit. */
  maxCost: number | null;
  top: number;
}

export const DEFAULT_INPUTS: FinderInputs = { min: 12, max: 60, financing: 'either', type: null, byRight: false, conditionalOk: false, maxFlood: null, qctOrDda: false, overlay: 'any', minDepth: null, maxCost: null, top: 20 };

export type Reason = 'no data' | 'zoning' | 'flood' | 'qct' | 'overlay' | 'depth' | 'cost';
export const REASON_WORD: Record<Reason, string> = {
  'no data': 'no place data',
  zoning: 'type not allowed by right',
  flood: 'too much land in a flood zone',
  qct: 'not a QCT or DDA',
  overlay: 'inclusionary overlay',
  depth: 'too little market depth',
  cost: 'cost a home above your limit',
};

export interface Points {
  total: number;
  low: number;
  high: number;
  threshold: number | null;
  fromPlace: number;
}

export interface FinderRow {
  geoid: string;
  sweep: Sweep;
  tier: Tier;
  /** Gap a home at the reference size (below zero: headroom). */
  gapPerHome: number;
  costPerHome: number;
  points: Points | null;
  /** Facts behind the standing, in words. */
  drivers: string[];
}

export interface FinderResult {
  rows: FinderRow[];
  tested: number;
  /** Places left out, counted under the first filter they fail. */
  excluded: Partial<Record<Reason, number>>;
  /** Places that fail exactly one filter, ranked by the same rule, with the filter. */
  nearMisses: { row: FinderRow; reason: Reason }[];
  /** For each filter, the places that would join if it alone were dropped (the near misses it holds out). */
  relax: Partial<Record<Reason, number>>;
}

const TIER_ORDER: Record<Tier, number> = { closes: 0, close: 1, gap: 2 };
const MULTI: Typology[] = ['small_apartment', 'townhome', 'duplex_triplex', 'senior'];
const usd = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;

export function compareRows(a: FinderRow, b: FinderRow): number {
  return (
    TIER_ORDER[a.tier] - TIER_ORDER[b.tier] ||
    Number(!!a.sweep.cut) - Number(!!b.sweep.cut) ||
    a.gapPerHome - b.gapPerHome ||
    (b.points?.fromPlace ?? 0) - (a.points?.fromPlace ?? 0) ||
    a.costPerHome - b.costPerHome ||
    a.geoid.localeCompare(b.geoid)
  );
}

/** Every filter on the place itself that a place fails (before any arithmetic), in the order they are checked. */
export function placeReasons(place: PlaceMeasures | null, i: FinderInputs, izoShare: number | null, geoid?: string): Reason[] {
  if (!place) return ['no data'];
  const out: Reason[] = [];
  if (i.byRight) {
    const ok = (s: string | undefined) => s === 'yes' || (i.conditionalOk && s === 'conditional');
    const by = place.zoning?.by_type;
    if (!by || !(i.type ? ok(by[i.type]) : MULTI.some((t) => ok(by[t])))) out.push('zoning');
  }
  if (i.maxFlood != null && (place.flood?.fema_sfha_pct ?? 0) > i.maxFlood) out.push('flood');
  // The next round's list (HUD 2027) when the tract is known, as the pencil reads it.
  const qct = geoid ? qctYears(geoid).y2027 : place.programs?.qct;
  if (i.qctOrDda && !(qct || place.programs?.dda)) out.push('qct');
  const inside = (izoShare ?? 0) > 0.5;
  if ((i.overlay === 'inside' && !inside) || (i.overlay === 'outside' && inside)) out.push('overlay');
  return out;
}

/** Why a place is left out before any arithmetic (the first filter it fails), or null when it passes them all. */
export function placeFilter(place: PlaceMeasures | null, i: FinderInputs, izoShare: number | null, geoid?: string): Reason | null {
  return placeReasons(place, i, izoShare, geoid)[0] ?? null;
}

export interface FinderContext {
  geoids: string[];
  placeFor: (geoid: string) => PlaceMeasures | null;
  hud: HudTable;
  level: PlanLevel;
  project: ProjectState;
  entries: Entries;
}

function rowFor(ctx: FinderContext, geoid: string, place: PlaceMeasures, branch: Branch, i: FinderInputs, base = projectBase(geoid, place, ctx.hud, ctx.level, ctx.project, ctx.entries)): FinderRow {
  const sweep = sweepSizes(base, branch, [i.min, i.max]);
  const r = sweep.best.run.result;
  const homes = Math.max(1, r.homes);
  let points: Points | null = null;
  if (branch !== 'market') {
    const entries = { ...ctx.entries, setup: { ...ctx.entries.setup, credit: branch } };
    const s = sheetState(entries, geoid, place, planFacts(r.counts, ctx.project.stories, r.finance)).score;
    points = { total: s.total, low: s.range.low, high: s.range.high, threshold: s.threshold, fromPlace: s.fromPlace };
  }
  const drivers: string[] = [];
  const mkt = place.market?.asking_2br ?? place.market?.safmr_2br ?? null;
  const lv = ctx.level === 'market' ? null : (String(ctx.level) as '30' | '50' | '60' | '80');
  const own = lv ? r.rents[lv]?.[2] ?? null : null;
  if (mkt != null) drivers.push(own != null ? `2BR market rent ${usd(mkt)} vs ${usd(own)} at ${lv}% AMI` : `2BR market rent ${usd(mkt)}`);
  if (base.qctOrDda && branch !== 'market') drivers.push(`${base.qct.y2027 ? 'QCT (2027 list)' : 'DDA'}: 130% basis`);
  else if (base.qct.y2026 && branch !== 'market') drivers.push('leaves the QCT list on 2027-01-01');
  if (sweep.bounds.zoning != null) drivers.push(`${sweep.bounds.zoning.toLocaleString('en-US')} homes by right`);
  if (sweep.bounds.depth != null) drivers.push(`market depth ${sweep.bounds.depth.toLocaleString('en-US')} homes`);
  if (r.capped) drivers.push("PHFA's credit cap binds");
  return { geoid, sweep, tier: sweep.best.tier, gapPerHome: sweep.best.gap / homes, costPerHome: r.tdc / homes, points, drivers };
}

export function findPlaces(ctx: FinderContext, i: FinderInputs, izoShare: (geoid: string) => number | null): FinderResult {
  const excluded: FinderResult['excluded'] = {};
  const relax: FinderResult['relax'] = {};
  const rows: FinderRow[] = [];
  const nearMisses: FinderResult['nearMisses'] = [];
  const branches: Branch[] = i.financing === 'either' ? ['nine', 'four'] : [i.financing];
  for (const geoid of ctx.geoids) {
    const place = ctx.placeFor(geoid);
    const why = placeReasons(place, i, izoShare(geoid), geoid);
    // Two filters or more (or no data): left out, and not a near miss, so no arithmetic is spent on it.
    if (!place || why.length > 1) {
      excluded[why[0]] = (excluded[why[0]] ?? 0) + 1;
      continue;
    }
    const base = projectBase(geoid, place, ctx.hud, ctx.level, ctx.project, ctx.entries);
    if (i.minDepth != null && (base.depth?.homes ?? 0) < i.minDepth) why.push('depth');
    if (why.length > 1) {
      excluded[why[0]] = (excluded[why[0]] ?? 0) + 1;
      continue;
    }
    const row = branches.map((b) => rowFor(ctx, geoid, place, b, i, base)).sort(compareRows)[0];
    if (i.maxCost != null && row.costPerHome > i.maxCost) why.push('cost');
    if (why.length === 0) rows.push(row);
    else {
      excluded[why[0]] = (excluded[why[0]] ?? 0) + 1;
      if (why.length === 1) {
        nearMisses.push({ row, reason: why[0] });
        relax[why[0]] = (relax[why[0]] ?? 0) + 1;
      }
    }
  }
  rows.sort(compareRows);
  nearMisses.sort((a, b) => compareRows(a.row, b.row));
  return { rows, tested: ctx.geoids.length, excluded, nearMisses, relax };
}
