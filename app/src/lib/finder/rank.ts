// Find places for a project (docs/data/finder.md): the project as set on the left (development type, units, stories,
// income level, financing, capital) read in every ranked tract as the Tract view reads it (components/place/finder/read:
// the lot the project needs in a district here that allows it by right, the zoning check on it, the capital run, the
// review), and the places ordered by a rule printed in words. No composite number: a place's standing is its rank and
// its words, and a row says what the place it opens says.
//
// Order: the review's verdict (works, works with changes, doesn't work as is, district not computed); on tax credit
// paths, how far PHFA's minimum score is in reach; fewer findings to fix (stops, then warnings); the less money a unit
// still to find (tax credits: the gap after every source; market rate: the equity a 1.5× return would not pay back);
// more PHFA points the place itself brings; then the lower cost a unit.
import type { PlaceRead } from '../../components/place/finder/read';
import { tractById } from '../data';
import { STATUS_OF, type Score } from '../lihtc/score';
import { qctYears } from '../pencil/designations';
import type { Branch } from '../pencil/inputs';
import { LEVEL_LABEL, type PlanLevel } from '../place/plan';
import type { PlaceMeasures } from '../place/types';
import { DEV_TYPE_LABEL, type DevType } from '../project/devType';
import { PATH_LABEL } from '../project/paths';
import { MULTIPLE_GOOD, type Verdict } from '../review/review';

export interface FinderInputs {
  /** Only places where the zoning check allows the project by right on the lot it needs (as the Tract view reads it). */
  byRight: boolean;
  /** A hearing (conditional use, special exception) counts as allowed. */
  hearingOk: boolean;
  /** Most of the land in a FEMA flood zone, in percent; null: no limit. */
  maxFlood: number | null;
  qctOrDda: boolean;
  overlay: 'any' | 'inside' | 'outside';
  /** Fewest homes of market depth; null: no limit. */
  minDepth: number | null;
  /** Highest total cost a unit; null: no limit. */
  maxCost: number | null;
  top: number;
}

export const DEFAULT_INPUTS: FinderInputs = { byRight: true, hearingOk: false, maxFlood: null, qctOrDda: false, overlay: 'any', minDepth: null, maxCost: null, top: 20 };

export type Reason = 'no data' | 'flood' | 'qct' | 'overlay' | 'zoning' | 'code' | 'depth' | 'cost';
export const REASON_WORD: Record<Reason, string> = {
  'no data': 'no place data',
  flood: 'too much land in a flood zone',
  qct: 'not a QCT or DDA',
  overlay: 'inclusionary overlay',
  zoning: 'not allowed by right',
  code: 'district not computed',
  depth: 'too little market depth',
  cost: 'cost a unit above your limit',
};

/** How far PHFA's minimum is: met; within the project's design and financing choices; only with the site, partner and
 *  team lines still to confirm; or out of reach even with every line at its top. */
export type Reach = 'met' | 'choices' | 'confirm' | 'no';

export interface Points {
  total: number;
  /** With every design and financing line at its top (the score's range). */
  high: number;
  /** At most: `high` plus every point the lines to confirm could add (an upper bound; caps can only lower it). */
  most: number;
  threshold: number | null;
  fromPlace: number;
  reach: Reach | null;
}

export function pointsOf(s: Score): Points {
  const confirm = s.sections.flatMap((x) => x.lines).filter((l) => STATUS_OF[l.item.basis] === 'confirm').reduce((a, l) => a + l.gain, 0);
  const high = s.range.high;
  const most = Math.min(s.max, high + confirm);
  const t = s.threshold;
  const reach: Reach | null = t == null ? null : s.total >= t ? 'met' : high >= t ? 'choices' : most >= t ? 'confirm' : 'no';
  return { total: s.total, high, most, threshold: t, fromPlace: s.fromPlace, reach };
}

/** The tax credit line of a row, in words: what PHFA's minimum asks and where the points would come from. */
export function pointsLine(branch: Branch, p: Points): string {
  const path = PATH_LABEL[branch];
  const t = p.threshold;
  if (t == null || p.reach == null) return `${path}: ${p.total} points (no minimum on this sheet)`;
  if (p.reach === 'met') return `${path}: ${p.total} points, meets PHFA's ${t} minimum`;
  if (p.reach === 'choices') return `${path}: ${p.total} points now, ${t} needed; design and financing choices reach ${p.high}`;
  if (p.reach === 'confirm') return `${path}: ${p.total} points now, ${t} needed; design and financing choices reach ${p.high}, the other ${t - p.high} must come from site, partner and team lines`;
  return `${path} can't reach PHFA's ${t} minimum here: ${p.most} points at most`;
}

export interface FinderRow {
  geoid: string;
  read: PlaceRead;
  verdict: Verdict;
  stops: number;
  warns: number;
  /** Tax credit paths only. */
  points: Points | null;
  /** Money a unit still to find: on tax credit paths the gap after every source (lib/project/capital); at market rate
   *  the equity a 1.5× return would not pay back (below zero: a cushion). */
  gapPerUnit: number;
  costPerUnit: number;
  /** Findings to act on, worst first (their titles, as the review card names them). */
  fix: string[];
  /** Facts behind the standing, in words. */
  drivers: string[];
}

export interface FinderProject {
  devType: DevType;
  units: number;
  /** Units were not set, so the example count is used (as on the project card). */
  example: boolean;
  stories: number | null;
  level: PlanLevel;
  branch: Branch;
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
  /** The project as read (the same in every place); null when no place was read. */
  project: FinderProject | null;
}

/** "Bloomfield · Tract 802": the neighborhood and the tract, since a neighborhood can hold several tracts. */
export function rowName(geoid: string): string {
  const t = tractById.get(geoid);
  if (!t) return geoid;
  return t.neighborhood ? `${t.neighborhood} · ${t.name}` : t.name;
}

/** "Affordable · 40 units · 4 stories · ≤50% AMI · 9% credits": the project the list is read on, each word once. */
export function projectWords(p: FinderProject): string {
  const level = LEVEL_LABEL[p.level];
  const path = PATH_LABEL[p.branch];
  return [DEV_TYPE_LABEL[p.devType], `${p.units} units${p.example ? ' (example)' : ''}`, p.stories != null ? `${p.stories} stories` : null, level, level === path ? null : path].filter(Boolean).join(' · ');
}

const VERDICT_ORDER: Record<Verdict, number> = { works: 0, changes: 1, no: 2, unknown: 3 };
const REACH_ORDER: Record<Reach, number> = { met: 0, choices: 1, confirm: 2, no: 3 };
const usd = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;

export function compareRows(a: FinderRow, b: FinderRow): number {
  const reach = (r: FinderRow) => (r.points?.reach ? REACH_ORDER[r.points.reach] : 0);
  return (
    VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] ||
    reach(a) - reach(b) ||
    a.stops - b.stops ||
    a.warns - b.warns ||
    a.gapPerUnit - b.gapPerUnit ||
    (b.points?.fromPlace ?? 0) - (a.points?.fromPlace ?? 0) ||
    a.costPerUnit - b.costPerUnit ||
    a.geoid.localeCompare(b.geoid)
  );
}

/** The filters on the place itself that a place fails before it is read, in the order they are checked. */
export function placeReasons(place: PlaceMeasures | null, i: FinderInputs, geoid?: string): Reason[] {
  if (!place) return ['no data'];
  const out: Reason[] = [];
  if (i.maxFlood != null && (place.flood?.fema_sfha_pct ?? 0) > i.maxFlood) out.push('flood');
  // The next round's list (HUD 2027) when the tract is known, as the pencil reads it.
  const qct = geoid ? qctYears(geoid).y2027 : place.programs?.qct;
  if (i.qctOrDda && !(qct || place.programs?.dda)) out.push('qct');
  return out;
}

/** The filters a place fails once read: the overlay as the project reads it, zoning, market depth, cost a unit. */
export function readReasons(r: PlaceRead, i: FinderInputs): Reason[] {
  const out: Reason[] = [];
  const inside = r.m.inIzo;
  if ((i.overlay === 'inside' && !inside) || (i.overlay === 'outside' && inside)) out.push('overlay');
  const v = r.check.verdict;
  if (i.byRight && !(v === 'yes' || (i.hearingOk && v === 'hearing'))) out.push(v === 'unknown' ? 'code' : 'zoning');
  if (i.minDepth != null && (r.m.base.depth?.homes ?? 0) < i.minDepth) out.push('depth');
  if (i.maxCost != null && r.run.result.total / Math.max(1, r.m.mix.homes) > i.maxCost) out.push('cost');
  return out;
}

/** A row from a place's read: its standing and its words. */
export function rowOf(geoid: string, r: PlaceRead): FinderRow {
  const m = r.m;
  const res = r.run.result;
  const units = Math.max(1, m.mix.homes);
  const credits = m.branch !== 'market';
  const findings = r.review.findings;
  const stops = findings.filter((f) => f.tone === 'stop');
  const warns = findings.filter((f) => f.tone === 'warn');
  const drivers: string[] = [];
  const place = m.base.place;
  const mkt = place.market?.asking_2br ?? place.market?.safmr_2br ?? null;
  const lv = m.base.level === 'market' ? null : (String(m.base.level) as '30' | '50' | '60' | '80');
  const own = lv ? m.result.rents[lv]?.[2] ?? null : null;
  if (mkt != null) drivers.push(own != null ? `2BR market rent ${usd(mkt)} vs ${usd(own)} at ${lv}% AMI` : `2BR market rent ${usd(mkt)}`);
  if (credits && m.qctOrDda) drivers.push(`${m.base.qct.y2027 ? 'QCT (2027 list)' : 'DDA'}: 130% basis`);
  else if (credits && m.base.qct.y2026) drivers.push('leaves the QCT list on 2027-01-01');
  if (credits && m.base.depth) drivers.push(`market depth ${m.base.depth.homes.toLocaleString('en-US')} homes`);
  return {
    geoid,
    read: r,
    verdict: r.review.verdict,
    stops: stops.length,
    warns: warns.length,
    points: credits ? pointsOf(m.sheet.score) : null,
    gapPerUnit: (r.run.credits ? res.gap : res.developerEquity - res.developerReturn / MULTIPLE_GOOD) / units,
    costPerUnit: res.total / units,
    fix: [...stops, ...warns].map((f) => f.title),
    drivers,
  };
}

/** The 4% path for a row on 9% credits whose minimum the data and the project's choices alone don't reach; else null. */
export function altFor(row: FinderRow, read: FinderContext['read']): { read: PlaceRead; points: Points | null } | null {
  if (row.read.m.branch !== 'nine' || !(row.points?.reach === 'confirm' || row.points?.reach === 'no')) return null;
  const r = read(row.geoid, row.read.m.base.place, 'four');
  return { read: r, points: pointsOf(r.m.sheet.score) };
}

export interface FinderContext {
  geoids: string[];
  placeFor: (geoid: string) => PlaceMeasures | null;
  /** The place read as the Tract view reads it: the project as set, or (`branch`) with its financing switched. */
  read: (geoid: string, place: PlaceMeasures, branch?: Branch | null) => PlaceRead;
}

export function findPlaces(ctx: FinderContext, i: FinderInputs): FinderResult {
  const excluded: FinderResult['excluded'] = {};
  const relax: FinderResult['relax'] = {};
  const rows: FinderRow[] = [];
  const nearMisses: FinderResult['nearMisses'] = [];
  let project: FinderProject | null = null;
  for (const geoid of ctx.geoids) {
    const place = ctx.placeFor(geoid);
    const why = placeReasons(place, i, geoid);
    // Two filters or more (or no data): left out, and not a near miss, so no arithmetic is spent on it.
    if (!place || why.length > 1) {
      excluded[why[0]] = (excluded[why[0]] ?? 0) + 1;
      continue;
    }
    const r = ctx.read(geoid, place);
    project ??= { devType: r.devType, units: r.m.mix.homes, example: r.m.mix.example, stories: r.m.base.project.stories, level: r.m.base.level, branch: r.m.branch };
    why.push(...readReasons(r, i));
    const row = rowOf(geoid, r);
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
  return { rows, tested: ctx.geoids.length, excluded, nearMisses, relax, project };
}
