// Find places for a project (docs/data/finder.md): the project described once, every ranked tract tested with the
// same model the Place page runs (lib/project/model, the size sweep in lib/project/size), and the places ordered by a
// rule printed in words. No composite number: a place's standing is its rank, its tier and its figures.
//
// Order: tier (closes, then close call, then gap); places whose size range zoning or market depth did not cut come
// before those it did; then the gap a home at the reference size (money to spare counts below zero); then more PHFA
// points the place itself brings; then the lower cost a home. "Either credit" tests 9% and 4% and keeps the better one
// by the same rule.
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
  /** Gap a home at the reference size (below zero: money to spare). */
  gapPerHome: number;
  costPerHome: number;
  points: Points | null;
  /** Facts behind the standing, in words. */
  drivers: string[];
}

export interface FinderResult {
  rows: FinderRow[];
  tested: number;
  excluded: Partial<Record<Reason, number>>;
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

/** Why a place is left out before any arithmetic, or null when it passes every filter on the place itself. */
export function placeFilter(place: PlaceMeasures | null, i: FinderInputs, izoShare: number | null): Reason | null {
  if (!place) return 'no data';
  if (i.byRight) {
    const ok = (s: string | undefined) => s === 'yes' || (i.conditionalOk && s === 'conditional');
    const by = place.zoning?.by_type;
    if (!by || !(i.type ? ok(by[i.type]) : MULTI.some((t) => ok(by[t])))) return 'zoning';
  }
  if (i.maxFlood != null && (place.flood?.fema_sfha_pct ?? 0) > i.maxFlood) return 'flood';
  if (i.qctOrDda && !(place.programs?.qct || place.programs?.dda)) return 'qct';
  const inside = (izoShare ?? 0) > 0.5;
  if ((i.overlay === 'inside' && !inside) || (i.overlay === 'outside' && inside)) return 'overlay';
  return null;
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
  if (base.qctOrDda && branch !== 'market') drivers.push(`${place.programs?.qct ? 'QCT' : 'DDA'}: 130% basis`);
  if (sweep.bounds.zoning != null) drivers.push(`${sweep.bounds.zoning.toLocaleString('en-US')} homes by right`);
  if (sweep.bounds.depth != null) drivers.push(`market depth ${sweep.bounds.depth.toLocaleString('en-US')} homes`);
  if (r.capped) drivers.push("PHFA's credit cap binds");
  return { geoid, sweep, tier: sweep.best.tier, gapPerHome: sweep.best.gap / homes, costPerHome: r.tdc / homes, points, drivers };
}

export function findPlaces(ctx: FinderContext, i: FinderInputs, izoShare: (geoid: string) => number | null): FinderResult {
  const excluded: FinderResult['excluded'] = {};
  const out = (r: Reason) => (excluded[r] = (excluded[r] ?? 0) + 1);
  const rows: FinderRow[] = [];
  const branches: Branch[] = i.financing === 'either' ? ['nine', 'four'] : [i.financing];
  for (const geoid of ctx.geoids) {
    const place = ctx.placeFor(geoid);
    const why = placeFilter(place, i, izoShare(geoid));
    if (why) {
      out(why);
      continue;
    }
    const base = projectBase(geoid, place!, ctx.hud, ctx.level, ctx.project, ctx.entries);
    if (i.minDepth != null && (base.depth?.homes ?? 0) < i.minDepth) {
      out('depth');
      continue;
    }
    const row = branches.map((b) => rowFor(ctx, geoid, place!, b, i, base)).sort(compareRows)[0];
    if (i.maxCost != null && row.costPerHome > i.maxCost) {
      out('cost');
      continue;
    }
    rows.push(row);
  }
  rows.sort(compareRows);
  return { rows, tested: ctx.geoids.length, excluded };
}
