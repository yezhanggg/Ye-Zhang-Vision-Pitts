// The project review (Ye, 2026-10-27): every check on a proposed project in one list, re-run on each change of the
// inputs. Zoning (lib/zoning/check: use, units by right, lot, floor area) plus height in feet and the inclusionary
// overlay's set-aside tested against the mix; the overlays (IZ-O, floodplain, historic for the historic tax credit);
// the fit with the people around it (lib/review/fit: capture, unit mix, seniors, market renters, displacement risk);
// and the money (lib/project/capital: coverage, the multiple, the gap); whether the tax credits can be won (the PHFA
// score against its minimum, at its best case) and whether the project is big enough for them. Each finding is one
// sentence with its numbers; the fixes are computed changes the person can apply. On tax credit paths no fix cuts the
// units below MIN_CREDIT_UNITS: Market rate, a larger lot or another place are offered instead. Rules only: the AI's
// second opinion (lib/review/ai) reads this, it never replaces it. Online only: loaded on demand.
import type { DemandUnit } from '../demand/types';
import { fmtShare } from '../place/format';
import type { PlanLevel } from '../place/plan';
import { THRESHOLDS } from '../place/thresholds';
import type { HudTable, PlaceMeasures } from '../place/types';
import { simpleProForma } from '../pencil/simple';
import { DEFAULTS } from '../pencil/inputs';
import { ltcForCashFlow, type CapitalRun } from '../project/capital';
import type { DevType } from '../project/devType';
import { EXAMPLE_HOMES, type Counts } from '../project/store';
import { CAPACITY, inclusionaryHomes, STANDARD_BY_CODE, STANDARDS } from '../zoning/capacity';
import { storyLimit, type CheckRow, type ZoningCheck } from '../zoning/check';
import { captureFit, captureTone, marketHouseholds, MIX_GAP_WARN, mixFit, mixWords, seniorHouseholds, type FitTone } from './fit';

export type Scope = 'parcel' | 'tract' | 'zip';
export type Area = 'zoning' | 'height' | 'overlay' | 'fit' | 'money';
export type Verdict = 'works' | 'changes' | 'no' | 'unknown';

export interface Finding {
  key: string;
  area: Area;
  tone: FitTone;
  title: string;
  text: string;
}

export type FixAction =
  | { kind: 'units'; value: number }
  | { kind: 'stories'; value: number }
  | { kind: 'izo'; homes: number }
  | { kind: 'capital'; key: string; value: number | null }
  | { kind: 'devType'; value: DevType }
  | { kind: 'mix' }
  /** Another type at a size and stories that work on the site (Market rate on a lot too small for tax credits). */
  | { kind: 'switch'; devType: DevType; units: number; stories: number | null }
  | { kind: 'branch'; value: 'four' }
  /** Read the project at the Tract level (on a lot sized for it), at `units` when given. */
  | { kind: 'scope'; value: 'tract'; units: number | null }
  /** Find places (at `units` when given). */
  | { kind: 'finder'; units: number | null }
  /** Move the units with an income limit to this AMI level (tax credit units must be at 60% AMI or below). */
  | { kind: 'ami'; value: PlanLevel }
  /** Open the tax credit score sheet. */
  | { kind: 'sheet' };

export interface Fix {
  key: string;
  label: string;
  /** Null: a number to know, nothing to apply. */
  action: FixAction | null;
}

export interface Review {
  verdict: Verdict;
  /** One sentence: the verdict and the reason that decided it. */
  line: string;
  findings: Finding[];
  fixes: Fix[];
}

export interface TypicalLot {
  district: string;
  lotSqft: number;
  /** The lot the project needs in that district (null: no district here allows it by right). */
  need: number | null;
  /** The tract's median and largest vacant lots, sq ft. */
  median: number | null;
  largest: number | null;
  /** Lots in the tract zoned to allow the project by right, or tracts in the ZIP where it is allowed on such a lot. */
  byRight: { yes: number; of: number; unit: 'lots' | 'tracts' } | null;
}

export interface ReviewInput {
  scope: Scope;
  devType: DevType;
  level: PlanLevel;
  counts: Counts;
  units: number;
  mixMode: 'mine' | 'suggested';
  stories: number | null;
  check: ZoningCheck;
  inIzo: boolean | null;
  /** Market-rate financing: the pencil applies the IZ-O's set-aside to the rents on its own. */
  market: boolean;
  floodPct: number | null;
  /** The tract's CHAS counts (null at ZIP level, where the ACS is used). */
  place: PlaceMeasures | null;
  demand: DemandUnit | null;
  hud: HudTable;
  capital: CapitalRun | null;
  dscrNeed: number;
  displacement: number | null;
  typical: TypicalLot | null;
  /** The tax credit self-score on tax credit paths (null at the ZIP level and for market rate). `high`: its best case,
   *  every design and financing line at its top (lib/lihtc/score range); `four`: the same sheet scored for 4% credits. */
  score?: { total: number; max: number; threshold: number | null; short: number; high?: number; most?: number; four?: { high: number; threshold: number | null } | null } | null;
  /** Market rate at the most units that are allowed and fit here, on tax credit paths that are too small or cut too
   *  small (useReview): whether it works (the return at 1.5× and the loan covered). */
  alt?: { units: number; stories: number | null; works: boolean; multiple: number | null } | null;
}

/** Tax credit deals under this many units rarely carry their fixed legal, syndication and compliance costs; no fix
 *  cuts a tax credit project below it. */
export const MIN_CREDIT_UNITS = 12;

export const MULTIPLE_GOOD = 1.5;
const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const usd = (v: number) => `$${n0(v)}`;
const usdM = (v: number) => (Math.abs(v) >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${Math.round(v / 1000)}k`);
const usdS = (v: number) => `${v < 0 ? '−' : ''}${usdM(Math.abs(v))}`;

const ROW_TONE: Record<CheckRow['tone'], FitTone> = { yes: 'ok', hearing: 'warn', no: 'stop', info: 'info', unknown: 'warn' };
const ROW_AREA: Record<CheckRow['key'], Area> = { use: 'zoning', density: 'zoning', lot: 'zoning', floor: 'zoning', parking: 'zoning', height: 'height', izo: 'overlay', flood: 'overlay' };

/** The rent a unit a month (the mix's average) at which a market-rate project returns `target` × its equity, holding
 *  the loan; null when no rent within 0.2–5× today's gets there. */
export function rentForMultiple(run: CapitalRun, units: number, target = MULTIPLE_GOOD): number | null {
  const i = run.inputs;
  if (units <= 0 || i.grossRent <= 0) return null;
  const gap = (s: number) => {
    const r = simpleProForma({ ...i, grossRent: i.grossRent * s });
    return r.developerReturn - target * Math.max(0, r.developerEquity);
  };
  let lo = 0.2, hi = 5;
  if (gap(hi) < 0) return null;
  if (gap(lo) >= 0) return (i.grossRent * lo) / units / 12;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    if (gap(mid) >= 0) hi = mid;
    else lo = mid;
  }
  return (i.grossRent * hi) / units / 12;
}

function zoningFindings(i: ReviewInput, out: Finding[], fixes: Fix[]) {
  const housing = i.devType !== 'commercial';
  const t = i.typical;
  if (t) {
    const b = t.byRight;
    const share = b && b.of > 0 ? (b.unit === 'lots' ? `${fmtShare(b.yes / b.of)} of the tract's lots are zoned for it by right` : `allowed by right in ${b.yes} of the ZIP's ${b.of} tracts`) : '';
    out.push({
      key: 'typical',
      area: 'zoning',
      tone: 'info',
      title: 'Site read',
      text: t.need != null ? `A ${n0(t.lotSqft)} sq ft lot in ${t.district}, the size ${i.units} units need there${share ? `; ${share}` : ''}.` : `No district here allows it by right; read on a typical ${t.district} lot (${n0(t.lotSqft)} sq ft)${share ? `; ${share}` : ''}.`,
    });
    if (t.need != null && t.largest != null && t.need > t.largest) {
      out.push({ key: 'lotsize', area: 'zoning', tone: 'warn', title: 'Lot size', text: `No vacant lot here is that big: the largest is ${n0(t.largest)} sq ft (median ${t.median == null ? 'n/a' : n0(t.median)}); it needs assembled lots or fewer units.` });
    }
  }
  for (const r of i.check.rows) {
    if (r.key === 'izo') continue;
    out.push({ key: r.key, area: ROW_AREA[r.key], tone: ROW_TONE[r.tone], title: r.title, text: r.text });
  }
  const s = i.check.district ? STANDARD_BY_CODE.get(i.check.district) : undefined;
  if (s && i.stories != null && s.max_height_ft != null) {
    const ft = i.stories * CAPACITY.assumptions.story_ft;
    const heightRow = out.find((f) => f.key === 'height');
    if (heightRow && heightRow.tone === 'ok' && ft > s.max_height_ft) {
      heightRow.tone = 'warn';
      heightRow.text = `${i.stories} stories at ${CAPACITY.assumptions.story_ft} ft is ${ft} ft, over the ${s.max_height_ft} ft limit: lower the floor heights or drop a story.`;
    }
    const maxStories = Math.min(s.max_stories ?? Infinity, Math.floor(s.max_height_ft / CAPACITY.assumptions.story_ft));
    if (heightRow && heightRow.tone !== 'ok' && Number.isFinite(maxStories) && maxStories > 0 && maxStories < i.stories)
      fixes.push({ key: 'stories', label: `Use ${maxStories} stories (${s.max_height_ft} ft limit)`, action: { kind: 'stories', value: maxStories } });
  }
  const cap = i.check.maxUnits;
  const fit = i.check.fit;
  const most = Math.min(cap ?? Infinity, fit && !fit.fits ? fit.units : Infinity);
  if (housing && Number.isFinite(most) && most > 0 && i.units > most) fixes.push({ key: 'units', label: `Use ${most} unit${most === 1 ? '' : 's'} (${most === cap ? 'allowed by right' : 'fit the lot'})`, action: { kind: 'units', value: most } });
  // A footprint too big for the lot: the stories that would hold it, within the height limit.
  const lim = s ? storyLimit(s) : null;
  if (fit && !fit.fits && fit.footprint > fit.room && fit.room > 0 && lim != null) {
    const need = Math.ceil((i.units * fit.grossPerHome) / fit.room);
    if (need > fit.stories && need <= lim) fixes.push({ key: 'fit', label: `Use ${need} stories (fits the lot)`, action: { kind: 'stories', value: need } });
  }
}

const creditPath = (i: ReviewInput) => i.devType !== 'commercial' && !i.market && !!i.capital?.credits;

/** On tax credit paths: no unit cut below MIN_CREDIT_UNITS, and a project already under it is told so; what helps
 *  instead is Market rate where it works on the site, a lot sized for the project (the Tract level) or another place. */
function smallFindings(i: ReviewInput, out: Finding[], fixes: Fix[]) {
  if (!creditPath(i)) return;
  const cuts = fixes.filter((f) => f.action?.kind === 'units' && f.action.value < MIN_CREDIT_UNITS);
  const under = i.units > 0 && i.units < MIN_CREDIT_UNITS;
  if (!cuts.length && !under) return;
  for (const f of cuts) fixes.splice(fixes.indexOf(f), 1);
  const why = `tax credit deals under ${MIN_CREDIT_UNITS} units rarely carry their fixed legal, syndication and compliance costs`;
  const most = Math.max(0, ...cuts.map((f) => (f.action as { value: number }).value));
  out.push(
    under
      ? { key: 'small', area: 'money', tone: 'stop', title: 'Too small for tax credits', text: `${i.units} unit${i.units === 1 ? '' : 's'}: ${why}.` }
      : { key: 'small', area: 'money', tone: 'info', title: 'Too small for tax credits', text: `Cutting it to ${most} unit${most === 1 ? '' : 's'} would make it too small: ${why}.` },
  );
  const alts: Fix[] = [];
  const a = i.alt;
  // A project already under the floor is read elsewhere at the example's size.
  const n = under ? EXAMPLE_HOMES : null;
  if (a && !a.works) out.push({ key: 'marketalt', area: 'money', tone: 'info', title: 'Market rate', text: `Market rate at ${a.units} unit${a.units === 1 ? '' : 's'} does not work here either${a.multiple != null ? ` (${a.multiple.toFixed(2)}× the equity; ${MULTIPLE_GOOD}× is a common bar)` : ''}.` });
  if (a?.works) alts.push({ key: 'market', label: `Test Market rate at ${a.units} unit${a.units === 1 ? '' : 's'}${a.multiple != null ? ` (${a.multiple.toFixed(2)}×)` : ''}`, action: { kind: 'switch', devType: 'market', units: a.units, stories: a.stories } });
  if (i.scope === 'parcel') alts.push({ key: 'tract', label: n ? `Read ${n} units at Tract level` : 'Read it at Tract level, on a lot sized for it', action: { kind: 'scope', value: 'tract', units: n } });
  alts.push({ key: 'finder', label: n ? `Find places for ${n} units` : 'Find places where it fits', action: { kind: 'finder', units: n } });
  fixes.unshift(...alts);
}

/** Whether the tax credits can be won: the PHFA self-score against the minimum now, with every design and financing
 *  choice (`high`), and with every line at its top (`most`, the lines a sponsor confirms included). Below the minimum
 *  even at `most`, the place holds it back and it does not work as is; between, it works with changes. */
function creditFindings(i: ReviewInput, out: Finding[], fixes: Fix[]) {
  const sc = i.score;
  const run = i.capital;
  if (run?.credits && i.scope === 'zip') out.push({ key: 'score', area: 'money', tone: 'info', title: 'Tax credit score', text: "Not scored for a ZIP code: PHFA scores a site, so read a tract or a lot for its score." });
  if (!run?.credits || !sc || sc.threshold == null) return;
  if (sc.short <= 0) {
    out.push({ key: 'score', area: 'money', tone: 'ok', title: 'Tax credit score', text: `${sc.total} of ${sc.max} points, at least PHFA's ${sc.threshold} minimum; awards go to the highest scores.` });
    return;
  }
  const high = sc.high ?? sc.total;
  const most = sc.most ?? high;
  if (most < sc.threshold) {
    out.push({ key: 'score', area: 'money', tone: 'stop', title: 'Tax credit score', text: `Scores at most ${most} of PHFA's ${sc.threshold} here, even with every line on the score sheet at its top (${sc.total} now): the place holds it back.` });
    const four = sc.four;
    if (four && four.threshold != null && four.high >= four.threshold) fixes.push({ key: 'four', label: `Use 4% credits + bonds (${four.high} of ${four.threshold} in reach)`, action: { kind: 'branch', value: 'four' } });
    fixes.push({ key: 'sheet', label: 'Enter the team and partners on the score sheet', action: { kind: 'sheet' } });
    const eq = run.result.sources.find((x) => x.label === 'LIHTC equity')?.value ?? 0;
    if (eq > 0) fixes.push({ key: 'nocredit', label: `Without credits, ${usdM(eq)} of gap funds must replace the credit equity`, action: null });
    fixes.push({ key: 'finder', label: 'Find places that score higher', action: { kind: 'finder', units: null } });
    return;
  }
  if (high < sc.threshold) {
    // Design and financing alone fall short; the lines a sponsor confirms (team, partners, site visit) can close it.
    out.push({ key: 'score', area: 'money', tone: 'warn', title: 'Tax credit score', text: `${sc.total} of ${sc.max} points: needs ${sc.short} more for PHFA's ${sc.threshold}. Design and financing choices reach ${high}; the other ${sc.threshold - high} must come from team, partner and site lines. The credits are not won yet.` });
    fixes.push({ key: 'sheet', label: 'Enter the team and partners on the score sheet', action: { kind: 'sheet' } });
    fixes.push({ key: 'finder', label: 'Find places that score higher', action: { kind: 'finder', units: null } });
    return;
  }
  out.push({ key: 'score', area: 'money', tone: 'warn', title: 'Tax credit score', text: `${sc.total} of ${sc.max} points: needs ${sc.short} more for PHFA's ${sc.threshold}, from commitments on the score sheet (up to ${high} with every design and financing choice); the credits are not won yet.` });
  fixes.push({ key: 'sheet', label: `Enter commitments on the score sheet (${sc.short} points short)`, action: { kind: 'sheet' } });
}

function overlayFindings(i: ReviewInput, out: Finding[], fixes: Fix[]) {
  const z = STANDARDS.inclusionary;
  if (i.devType !== 'commercial' && i.inIzo) {
    const need = inclusionaryHomes(i.units, true);
    const have = i.counts['30'].concat(i.counts['50']).reduce((a, b) => a + b, 0);
    if (need === 0) out.push({ key: 'izo', area: 'overlay', tone: 'info', title: 'Inclusionary overlay', text: `In the IZ-O; under ${z.min_homes} units nothing is set aside (${z.section}).` });
    else if (i.market) out.push({ key: 'izo', area: 'overlay', tone: 'info', title: 'Inclusionary overlay', text: `${need} of ${i.units} units rent at ${z.ami_rental}% AMI for ${z.years} years (${z.section}); the rents above include them.` });
    else if (have >= need) out.push({ key: 'izo', area: 'overlay', tone: 'ok', title: 'Inclusionary overlay', text: `${have} units at ${z.ami_rental}% AMI or below meet the ${need} the IZ-O asks for (${z.section}).` });
    else {
      out.push({ key: 'izo', area: 'overlay', tone: 'stop', title: 'Inclusionary overlay', text: `The IZ-O asks for ${need} units at ${z.ami_rental}% AMI or below for ${z.years} years; the mix has ${have} (${z.section}).` });
      fixes.push({ key: 'izo', label: `Make ${need} units ${z.ami_rental}% AMI (IZ-O)`, action: { kind: 'izo', homes: need } });
    }
  }
  if (i.capital && i.capital.inputs.htcRate > 0)
    out.push({ key: 'historic', area: 'overlay', tone: 'info', title: 'Historic credit', text: 'Needs a certified historic building and a rehab approved by the National Park Service; no historic district data is read here, so confirm the listing.' });
}

function fitFindings(i: ReviewInput, out: Finding[], fixes: Fix[]) {
  if (i.devType === 'commercial' || i.units <= 0) return;
  const cap = captureFit(i.counts, i.place, i.demand, i.hud);
  if (cap && cap.rate != null) {
    const tone = captureTone(cap.rate);
    const pool = cap.qualified - cap.existing;
    out.push({
      key: 'capture',
      area: 'fit',
      tone,
      title: 'Renters who qualify',
      text: `${cap.homes} unit${cap.homes === 1 ? '' : 's'} at ${cap.level}% AMI would need ${fmtShare(cap.rate)} of the ${n0(pool)} qualifying renter households in the ${cap.where === 'tract' ? 'tract' : 'ZIP'}${cap.existing > 0 ? ` not already in tax credit homes` : ''}; ${tone === 'ok' ? 'deep enough' : tone === 'warn' ? 'a stretch' : 'too few'} (10% is the screen).`,
    });
    const target = Math.floor(pool * 0.1);
    if (tone === 'stop' && cap.homes === i.units && target > 0 && target < i.units) fixes.push({ key: 'capture', label: `Use ${target} units (10% of qualifying renters)`, action: { kind: 'units', value: target } });
  } else if (cap && cap.rate == null) out.push({ key: 'capture', area: 'fit', tone: 'stop', title: 'Renters who qualify', text: `No qualifying renter households are left over at ${cap.level}% AMI after the tax credit homes already here.` });

  const mix = mixFit(i.counts, i.demand);
  if (mix) {
    const g = mix.worst;
    const off = Math.abs(g.gap) > MIX_GAP_WARN;
    out.push({
      key: 'mix',
      area: 'fit',
      tone: off ? 'warn' : 'ok',
      title: 'Unit mix',
      text: off ? `${fmtShare(mix.proposed[g.group])} of the units are ${mixWords(g.group)}; ${fmtShare(mix.area[g.group])} of renter households here are that size.` : `The mix follows the sizes of renter households here (within ${Math.round(MIX_GAP_WARN * 100)} points).`,
    });
    if (off && i.mixMode === 'mine') fixes.push({ key: 'mix', label: "Use the renters' split", action: { kind: 'mix' } });
  }

  if (i.devType === 'senior') {
    const lv = i.level === 'market' ? 'mkt' : (String(i.level) as '30' | '50' | '80');
    const hh = seniorHouseholds(i.place, lv);
    if (hh != null && hh > 0) {
      const rate = i.units / hh;
      out.push({ key: 'senior', area: 'fit', tone: captureTone(rate), title: 'Seniors here', text: `${i.units} units would house ${fmtShare(rate)} of the ${n0(hh)} elderly renter households (62+) here${lv === 'mkt' ? '' : ` at or below ${lv}% AMI`}.` });
    } else if (i.demand) {
      const s65 = i.demand.shares.age65?.[0];
      if (s65 != null) out.push({ key: 'senior', area: 'fit', tone: 'info', title: 'Seniors here', text: `${fmtShare(s65)} of renter households here are headed by someone 65 or older.` });
    }
  }

  const affordable = ['30', '50', '60', '80'].reduce((s, l) => s + i.counts[l as '30'].reduce((a, b) => a + b, 0), 0);
  if (i.devType === 'market' || i.devType === 'mixed') {
    const hh = marketHouseholds(i.place);
    if (hh != null && affordable < i.units) {
      const mkt = i.units - affordable;
      const rate = hh > 0 ? mkt / hh : Infinity;
      out.push({ key: 'market', area: 'fit', tone: rate > 0.15 ? 'warn' : 'ok', title: 'Market renters', text: `${n0(hh)} renter households here earn over 80% AMI; ${mkt} market units would be ${hh > 0 ? fmtShare(rate) : 'all'} of them.` });
    }
  }
  if (i.displacement != null && i.displacement >= THRESHOLDS.displacement_high && affordable === 0) {
    out.push({ key: 'displacement', area: 'fit', tone: 'warn', title: 'Displacement risk', text: `Displacement risk here is high (${i.displacement.toFixed(2)} of 1) and no units carry an income limit.` });
    const ten = Math.ceil(i.units * 0.1);
    if (ten > 0 && !fixes.some((f) => f.key === 'izo')) fixes.push({ key: 'displacement', label: `Make ${ten} unit${ten === 1 ? '' : 's'} 50% AMI`, action: { kind: 'izo', homes: ten } });
  }
}

function moneyFindings(i: ReviewInput, out: Finding[], fixes: Fix[]) {
  const run = i.capital;
  if (!run || i.devType === 'commercial' || i.units <= 0) return;
  const r = run.result;
  const dscr = r.years[0]?.dscr ?? 0;
  const mult = r.multiple;
  if (dscr < 1) out.push({ key: 'dscr', area: 'money', tone: 'stop', title: 'Loan coverage', text: `Year-1 income pays ${Math.round(Math.max(0, dscr) * 100)}% of the loan payment (DSCR ${Math.max(0, dscr).toFixed(2)}).` });
  else if (Number.isFinite(dscr)) out.push({ key: 'dscr', area: 'money', tone: dscr < i.dscrNeed ? 'warn' : 'ok', title: 'Loan coverage', text: `DSCR ${dscr.toFixed(2)} in year 1${dscr < i.dscrNeed ? `, under the ${i.dscrNeed.toFixed(2)} lenders ask for` : `, at least the ${i.dscrNeed.toFixed(2)} lenders ask for`}.` });
  if (dscr < i.dscrNeed && run.kinds.ltc === 'yours') fixes.push({ key: 'ltc', label: 'Size the loan to the income', action: { kind: 'capital', key: 'ltc', value: null } });

  // Every year of the run, not only the first: expenses grow faster than rents.
  const neg = r.firstNegative;
  if (neg != null) {
    const y = r.years[neg - 1];
    const late = run.credits && neg > DEFAULTS.underwriting.positive_years.value;
    const short = y.noi < 0;
    out.push({ key: 'cashflow', area: 'money', tone: late ? 'warn' : 'stop', title: 'Cash flow', text: `Cash flow turns negative in year ${neg} (${usdS(y.cashFlow)}${short ? ': operating cost passes the income before any loan' : `, DSCR ${y.dscr.toFixed(2)}`})${late ? '; PHFA allows it after year 10' : ''}.` });
    const ltc = short ? null : ltcForCashFlow(run);
    if (ltc != null && ltc < run.inputs.ltc) fixes.push({ key: 'cashflow', label: `Use a ${Math.round(ltc * 100)}% loan (cash flow stays positive)`, action: { kind: 'capital', key: 'ltc', value: ltc } });
  } else if (r.years.length) out.push({ key: 'cashflow', area: 'money', tone: 'ok', title: 'Cash flow', text: `Cash flow stays above zero through year ${r.years.length}.` });

  if (run.credits) {
    // Tax credit deals: judged by the gap and the cash flow over the compliance period, not a sale or a multiple.
    if (run.noCredits) {
      out.push({ key: 'eligible', area: 'money', tone: 'stop', title: 'Tax credits', text: `${run.noCredits}.` });
      fixes.push({ key: 'eligible', label: 'Use ≤50% AMI', action: { kind: 'ami', value: 50 } });
    }
    const paid = r.sources.filter((s) => s.label !== 'Gap to fill' && s.value > 0).map((s) => (s.label.startsWith('LIHTC') ? s.label : s.label.toLowerCase()));
    const after = paid.length > 1 ? `${paid.slice(0, -1).join(', ')} and ${paid[paid.length - 1]}` : (paid[0] ?? 'the sources');
    if (r.gap > 0.5 && r.total > 0) {
      out.push({ key: 'gap', area: 'money', tone: 'warn', title: 'Funding gap', text: `${usdM(r.gap)} still to find after the ${after}.` });
      fixes.push({ key: 'gap', label: `Add ${usdM(r.gap)} other subsidy`, action: { kind: 'capital', key: 'otherSubsidyPct', value: Math.min(1, run.inputs.otherSubsidyPct + r.gap / r.total) } });
    } else out.push({ key: 'gap', area: 'money', tone: 'ok', title: 'Funding gap', text: `No gap: the ${after} cover the ${usdM(r.total)} cost.` });
  } else {
    if (mult == null) out.push({ key: 'return', area: 'money', tone: 'ok', title: 'Return', text: `No developer equity needed; the developer gets back ${usdM(r.developerReturn)} over 7 years and the sale.` });
    else if (mult < 1) out.push({ key: 'return', area: 'money', tone: 'stop', title: 'Return', text: `Loses money: puts in ${usdM(r.developerEquity)}, gets back ${usdM(r.developerReturn)} (${mult.toFixed(2)}×).` });
    else out.push({ key: 'return', area: 'money', tone: mult < MULTIPLE_GOOD ? 'warn' : 'ok', title: 'Return', text: `${mult.toFixed(2)}× the ${usdM(r.developerEquity)} equity over 7 years and the sale${mult < MULTIPLE_GOOD ? `; ${MULTIPLE_GOOD}× is a common bar` : ''}.` });
    if (mult != null && mult < MULTIPLE_GOOD) {
      const need = rentForMultiple(run, i.units);
      const now = run.inputs.grossRent / i.units / 12;
      if (need != null) fixes.push({ key: 'rent', label: `Rents need ${usd(need)} a unit a month (now ${usd(now)})`, action: null });
      if (i.devType === 'market' && i.units >= MIN_CREDIT_UNITS) fixes.push({ key: 'type', label: 'Test it as Affordable (tax credits)', action: { kind: 'devType', value: 'affordable' } });
    }
  }
  if (r.creditsCould != null) out.push({ key: 'credits', area: 'money', tone: 'info', title: 'Tax credits', text: `LIHTC sized to need: ${usdM(r.sources.find((x) => x.label === 'LIHTC equity')?.value ?? 0)} of the ${usdM(r.creditsCould)} the project could claim.` });
}

const VERDICT_WORDS: Record<Verdict, string> = { works: 'Works', changes: 'Works with changes', no: "Doesn't work as is", unknown: 'Check the code' };
export const verdictWord = (v: Verdict) => VERDICT_WORDS[v];
const AREA_RANK: Area[] = ['zoning', 'height', 'overlay', 'money', 'fit'];
/** The stops a fix answers, besides the finding of its own key. */
const FIX_FOR: Record<string, string[]> = {
  units: ['density', 'floor', 'small'],
  stories: ['height'],
  fit: ['floor'],
  market: ['small', 'density', 'floor', 'use', 'score'],
  tract: ['small', 'density', 'floor', 'use'],
  finder: ['small', 'density', 'floor', 'use', 'score', 'capture'],
  four: ['score'],
  sheet: ['score'],
};

export function reviewProject(i: ReviewInput): Review {
  const findings: Finding[] = [];
  const fixes: Fix[] = [];
  zoningFindings(i, findings, fixes);
  overlayFindings(i, findings, fixes);
  moneyFindings(i, findings, fixes);
  creditFindings(i, findings, fixes);
  fitFindings(i, findings, fixes);
  smallFindings(i, findings, fixes);
  const stops = findings.filter((f) => f.tone === 'stop');
  const warns = findings.filter((f) => f.tone === 'warn');
  const unknownZoning = i.check.verdict === 'unknown';
  const verdict: Verdict = stops.length ? 'no' : unknownZoning ? 'unknown' : warns.length ? 'changes' : 'works';
  // The lead reason: by area, and a project too small for tax credits before its score.
  const lead = (stops.length ? stops : warns).slice().sort((a, b) => AREA_RANK.indexOf(a.area) - AREA_RANK.indexOf(b.area) || Number(b.key === 'small') - Number(a.key === 'small'))[0];
  const line =
    verdict === 'works'
      ? 'Zoning, the area and the money all check out on these inputs.'
      : verdict === 'unknown'
        ? `${i.check.district ?? 'The district'} is not computed here; the area and money checks still run.`
        : `${lead.title}: ${lead.text}`;
  // Fixes that address a stop come first, in the order they were found; one of each kind; at most three.
  const order = (f: Fix) => (f.action == null ? 2 : stops.some((s) => s.key === f.key || FIX_FOR[f.key]?.includes(s.key)) ? 0 : 1);
  const once = fixes.filter((f, k) => fixes.findIndex((g) => g.key === f.key) === k);
  return { verdict, line, findings, fixes: once.sort((a, b) => order(a) - order(b)).slice(0, 3) };
}

/** Findings by tone, worst first, for the card. */
export const TONE_RANK: FitTone[] = ['stop', 'warn', 'info', 'ok'];
