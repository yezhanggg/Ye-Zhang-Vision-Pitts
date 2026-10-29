// The Policy lab (Ye, 2026-10-27; made clearer 2026-10-28): the challenge's policy simulator. Pick Pittsburgh housing
// policies (zoning, inclusionary housing and its density bonus, tax breaks and funding, an infrastructure investment)
// and see, in every city tract, whether one test building of a chosen type is allowed by right and pencils (the
// simple pro forma, lib/pencil/simple via lib/project/capital), and how many homes zoning allows (zoning_capacity.json).
// Each policy's part is read by running your rules with and without it, so its verdict is computed: works, trade-off,
// no effect or backfires. Public data, the code's rules, labeled examples and your own values (the screens) are kept
// apart (docs/data/policy_lab.md). Arithmetic on public data, not a feasibility study. Online only: loaded on demand.
import { demandTract } from '../demand/data';
import { groupShares, householdsByGroup, recommendedMix } from '../demand/mix';
import { hud as hudTable, placeById } from '../place/data';
import { THRESHOLDS } from '../place/thresholds';
import type { HudTable, PlaceMeasures } from '../place/types';
import { qctYears } from '../pencil/designations';
import { DEFAULTS, type Plan } from '../pencil/inputs';
import { marketRents } from '../pencil/rents';
import { runCapital, suggestCapital, type CapitalContext } from '../project/capital';
import { lotFor, STANDARD_BY_CODE, STANDARDS, storiesOf, tractCapacity, type TractCapacity, type UseKey } from '../zoning/capacity';

export type IzWhere = 'off' | 'izo' | 'citywide';
export type Ami = 30 | 50 | 60 | 80;
export type HouseLots = 'today' | 'adu' | 'three' | 'four';
export type Parking = 'keep' | 'transit' | 'remove';
export type TestType = 'duplex' | 'triplex' | 'fourplex' | 'townhomes' | 'small' | 'apartments' | 'senior';
export type Financing = 'market' | 'affordable';

/** The policies. TODAY holds the rules in force. */
export interface Policies {
  /** Inclusionary housing: where a set-aside is required, from what size, how much and at what income. */
  izWhere: IzWhere;
  izMin: number;
  izShare: number;
  izAmi: Ami;
  /** Bill 2025-1545's optional bonus where no set-aside is required: the share of homes at 50% AMI (0: off). */
  bonus: number;
  houseLots: HouseLots;
  lots: 'today' | 'pre2025';
  parking: Parking;
  plan: Plan;
  /** Gap subsidy a home with an income limit, $. */
  subsidy: number;
  /** Property tax off a home a year, $ (0: off). */
  abatement: number;
  /** Infrastructure: every bus line runs at least every 15 minutes, so a tract's nearest stop is a frequent one. */
  frequentBus: boolean;
  /** Your values: the tracts left out. */
  displacement: boolean;
  transitMi: number | null;
  flood: boolean;
}

/** The one building tested in every tract. */
export interface TestProject {
  type: TestType;
  devType: Financing;
  units: number;
  stories: number;
}

/** Examples the person can change. They apply to today's rules and to theirs alike. */
export interface Assumptions {
  /** A project works at this multiple of the developer's equity. */
  bar: number;
  hardPerSf: number;
  /** Cost of one required parking space, $. */
  parkingSpace: number;
}

export type Scenario = Policies & TestProject & Assumptions;

export const TODAY: Policies = {
  izWhere: 'izo',
  izMin: STANDARDS.inclusionary.min_homes,
  izShare: STANDARDS.inclusionary.share,
  izAmi: 50,
  bonus: 0,
  houseLots: 'today',
  lots: 'today',
  parking: 'keep',
  plan: 'adopted',
  subsidy: 0,
  abatement: 0,
  frequentBus: false,
  displacement: false,
  transitMi: null,
  flood: false,
};

export const TEST_TYPES: Record<TestType, { label: string; units: number; stories: number; devType: Financing }> = {
  duplex: { label: 'Duplex', units: 2, stories: 2, devType: 'market' },
  triplex: { label: 'Triplex', units: 3, stories: 3, devType: 'market' },
  fourplex: { label: 'Fourplex', units: 4, stories: 3, devType: 'market' },
  townhomes: { label: 'Townhomes', units: 6, stories: 3, devType: 'market' },
  small: { label: 'Small apartments', units: 12, stories: 3, devType: 'market' },
  apartments: { label: 'Apartments', units: 40, stories: 4, devType: 'market' },
  senior: { label: 'Senior', units: 50, stories: 4, devType: 'affordable' },
};
export const TEST_PROJECT: TestProject = { type: 'apartments', devType: 'market', units: 40, stories: 4 };
export const ASSUMPTIONS: Assumptions = { bar: 1.5, hardPerSf: DEFAULTS.inputs.hard_per_sf.value as number, parkingSpace: 15000 };
export const START: Scenario = { ...TODAY, ...TEST_PROJECT, ...ASSUMPTIONS };

/** The type the units say. Townhomes and senior housing keep their type at any size. */
export function typeFor(t: TestType, units: number): TestType {
  if (t === 'townhomes' || t === 'senior') return t;
  return units <= 2 ? 'duplex' : units === 3 ? 'triplex' : units === 4 ? 'fourplex' : units < 20 ? 'small' : 'apartments';
}

/** Labeled examples and screen limits (docs/data/policy_lab.md). */
export const EXAMPLES = {
  /** Flood screen: tracts with more of their land in the FEMA 1%-a-year zone are left out, %. */
  floodPct: 5,
  /** Tax credit test project: its homes rent at 60% AMI. */
  creditAmi: 60 as Ami,
  /** "Near frequent transit" (the parking idea and the climate count), miles. */
  nearMi: 0.5,
  /** The range: building cost this much a sq ft either side of yours. */
  costSpread: 50,
};
export const ABATEMENTS = [0, 1500, 3000];
export const SUBSIDIES = [0, 25000, 50000, 100000];
const BONUS_FT = 15;
const STORY_FT = 10;
const BONUS_AMI: Ami = 50;

/** Ready-made sets of policies to start from. Each starts from today's rules. */
export const PACKAGES: { id: string; label: string; line: string; set: Partial<Policies>; project?: TestProject }[] = [
  { id: 'today', label: "Today's rules", line: 'In force now', set: {} },
  { id: 'middle', label: 'Missing middle', line: 'Triplexes, less parking', set: { houseLots: 'three', parking: 'transit' }, project: { type: 'triplex', devType: 'market', units: 3, stories: 3 } },
  { id: 'affordable', label: 'More affordable homes', line: 'Set-aside, subsidy, tax break', set: { izWhere: 'citywide', subsidy: 50000, abatement: 1500 } },
  { id: 'transit', label: 'Build near transit', line: 'Frequent bus, height bonus', set: { frequentBus: true, parking: 'transit', bonus: 0.2, transitMi: 0.5 } },
  { id: 'proposed', label: 'On the table', line: 'Bills before the City', set: { bonus: 0.2, parking: 'remove' } },
];

/** works / fails: allowed by right, and the money works or not; hearing: allowed only with a zoning hearing (money read
 *  as if granted); zoning: not allowed; unread: zoning mostly in districts not read here; screened: left out by your
 *  values; nodata: no rent on file. */
export type Status = 'works' | 'fails' | 'hearing' | 'zoning' | 'unread' | 'screened' | 'nodata';

export interface ZoningRead {
  /** yes: some of the tract's lots are in districts that allow the test project by right; hearing: none by right, some
   *  with an exception or conditional use (senior housing everywhere, §911.02); no: neither, with at least three
   *  quarters of the lots read; unknown: more lots in districts not computed here (downtown, riverfront, special). */
  status: 'yes' | 'hearing' | 'no' | 'unknown';
  /** Lots by right, lots with a hearing, lots in all. */
  lots: number;
  hearing: number;
  of: number;
}

export interface TractOutcome {
  geoid: string;
  status: Status;
  units: number;
  affordable: number;
  /** A set-aside is required here. */
  required: boolean;
  /** The developer took the height bonus. */
  bonus: boolean;
  multiple: number | null;
  dscr: number;
  /** The money works (at or over the bar), whatever zoning says. */
  pencils: boolean;
  /** Subsidy a unit that would bring the project to the bar (0 where it works; null where not read). */
  gap: number | null;
  /** Homes allowed by right on vacant and house lots. */
  capacity: number;
  zoning: ZoningRead;
  highRisk: boolean;
  /** Nearest frequent stop, miles (with the frequent bus idea when it is on). */
  transitMi: number | null;
  nearTransit: boolean;
  floodPct: number | null;
  why: string;
}

export interface Summary {
  tracts: number;
  capacity: number;
  /** Tracts where zoning allows the test project by right, only with a hearing, and where zoning was read. */
  allowed: number;
  hearing: number;
  zoned: number;
  works: number;
  /** Tracts where it needs a zoning hearing and the money works; tracts whose zoning is not read, and of those, where
   *  the money works. None of these count in `works`. */
  worksHearing: number;
  unread: number;
  unreadPencils: number;
  /** Tracts tested: allowed by right or with a hearing, with a rent, not left out. */
  tested: number;
  /** Tested tracts where the developer at least gets back what it puts in (1×, or no equity needed and the loan covered). */
  breakEven: number;
  /** Tracts where a set-aside is asked of the test building, and the homes with an income limit it asks across them. */
  asked: number;
  askedHomes: number;
  screened: number;
  /** Tracts where the developer took the height bonus. */
  bonusTaken: number;
  /** Homes, and homes with an income limit, with one test project in each tract where it works (by right or with a hearing). */
  homes: number;
  affordable: number;
  /** Median gap a unit where a tested project does not work. */
  medianGap: number | null;
  /** Who gains: homes with an income limit in working tracts at high displacement risk, and working tracts there with none. */
  riskAffordable: number;
  riskMarketOnly: number;
  /** Climate: working tracts near frequent transit, and with more than the flood screen's share in the flood zone. */
  nearTransit: number;
  inFlood: number;
}

const ua = DEFAULTS.ua.by_br;

/** The most rent (net of the utility allowance) a home of `br` bedrooms may ask at `ami`: 30% of the income limit for
 *  a household of 1.5 a bedroom (1 for a studio), the IZ-O's rule (§907.04.A), from HUD's FY2026 MTSP limits. */
export function rentAt(ami: Ami, br: 0 | 1 | 2 | 3): number {
  const l = DEFAULTS.mtsp.l[String(ami) as '50'];
  const persons = br === 0 ? 1 : br * 1.5;
  const lo = Math.floor(persons), f = persons - lo;
  const limit = f ? (l[lo - 1] + l[lo]) / 2 : l[lo - 1];
  return Math.max(0, Math.round((limit * 0.3) / 12 - ua[br]));
}

export const bonusPoints = (share: number) => (share >= 0.2 ? 6 : share >= 0.15 ? 4 : share >= 0.1 ? 2 : 0);

/** Studios, 1-, 2- and 3-bedroom homes: split like the tract's renters; senior housing 80% one-bedroom. */
const mixOf = (geoid: string, units: number, type: TestType): [number, number, number, number] => {
  if (type === 'senior') {
    const one = Math.round(units * 0.8);
    return [0, one, units - one, 0];
  }
  const d = demandTract(geoid);
  const shares = (d && groupShares(householdsByGroup(d))) ?? { small: 0.5, two: 0.35, large: 0.15 };
  const by = Object.fromEntries(recommendedMix(units, shares).map((l) => [l.group, l.homes])) as Record<'small' | 'two' | 'large', number>;
  return [0, by.small, by.two, by.large];
};

/** `n` homes taken for the set-aside from the largest size first. */
function setAside(mix: number[], n: number): number[] {
  const out = [0, 0, 0, 0];
  const left = [...mix];
  for (let k = 0; k < n; k++) {
    const br = left.indexOf(Math.max(...left));
    if (left[br] <= 0) break;
    left[br] -= 1;
    out[br] += 1;
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ zoning
const HOUSE_FAMILIES = new Set(['R1D', 'R1A', 'R2', 'R3']);
const HOUSE_UP: Record<HouseLots, number> = { today: 0, adu: 0, three: 3, four: 4 };
/** Districts not computed here that hold no homes by right (from the standards' reasons). */
const noHomes = (code: string) => /no homes|special exception only|^Parks$|^Hillside|institution/i.test(STANDARDS.not_computed[code] ?? '');

const useKeys = (t: Pick<TestProject, 'type' | 'units'>): UseKey[] =>
  t.type === 'senior' ? ['elderly_limited', 'elderly_general'] : t.type === 'townhomes' ? ['single_attached'] : t.units <= 2 ? ['two_unit'] : t.units === 3 ? ['three_unit'] : ['multi_unit'];

const fitsMemo = new Map<string, boolean>();
const lotHolds = (code: string, units: number) => {
  const k = `${code}:${units}`;
  let v = fitsMemo.get(k);
  if (v == null) fitsMemo.set(k, (v = lotFor(STANDARD_BY_CODE.get(code)!, units).kind === 'fits'));
  return v;
};

/** Where zoning allows the test project in a tract: lots in districts whose use table allows it (by right, or with a
 *  hearing; a house lot under the house-lot idea by right), whose homes a lot hold it (townhomes take a lot each) and
 *  whose height takes its stories. */
export function zoningIn(cap: TractCapacity | null, s: Pick<Scenario, 'type' | 'units' | 'stories' | 'houseLots'>): ZoningRead {
  if (!cap) return { status: 'unknown', lots: 0, hearing: 0, of: 0 };
  const keys = useKeys(s);
  const up = HOUSE_UP[s.houseLots];
  const plain = s.type !== 'senior' && s.type !== 'townhomes';
  let yes = 0, hearing = 0, read = 0, unread = 0;
  for (const [code, n] of Object.entries(cap.districts)) {
    const std = STANDARD_BY_CODE.get(code);
    if (!std) {
      if (noHomes(code)) read += n;
      else unread += n;
      continue;
    }
    read += n;
    const upzoned = plain && up > 0 && HOUSE_FAMILIES.has(std.family) && s.units <= up;
    const byRight = upzoned || keys.some((k) => std.uses[k] === 'P' || std.uses[k] === 'P/S');
    if (!byRight && !keys.some((k) => std.uses[k] !== 'N')) continue;
    if (s.type !== 'townhomes' && !upzoned && (std.max_homes ? s.units > std.max_homes : !lotHolds(code, s.units))) continue;
    const most = storiesOf(std);
    if (most != null && s.stories > most) continue;
    if (byRight) yes += n;
    else hearing += n;
  }
  // "No" only when lots in districts not computed here are under a quarter of the tract: otherwise it is not read.
  return { status: yes > 0 ? 'yes' : hearing > 0 ? 'hearing' : unread <= 0.25 * (read + unread) ? 'no' : 'unknown', lots: yes, hearing, of: read + unread };
}

/** Homes allowed by right on the tract's vacant lots and lived-in house lots, under the lot minimums and house-lot rule. */
export function capacityOf(cap: TractCapacity | null, s: Pick<Policies, 'lots' | 'houseLots'>): number {
  if (!cap) return 0;
  const old = s.lots === 'pre2025';
  const g = cap.gentle;
  const key = ({ today: 'homes', adu: 'adu', three: 'up3', four: 'up4' } as const)[s.houseLots];
  const house = old ? (g[`${key}_old`] ?? g[key] ?? g.homes) : (g[key] ?? g.homes);
  return (old ? (cap.vacant.homes_old ?? cap.vacant.homes) : cap.vacant.homes) + house;
}

/** The nearest frequent stop, with every line frequent when the idea is on (its nearest stop of any kind). */
export function transitMiles(place: PlaceMeasures, frequentBus: boolean): number | null {
  const f = place.transit?.freq_dist_mi ?? null;
  const a = place.transit?.any_dist_mi ?? null;
  if (!frequentBus) return f;
  return f == null ? a : a == null ? f : Math.min(f, a);
}

const PARKING_USE = (s: Pick<TestProject, 'type'>, units: number) =>
  s.type === 'townhomes' ? 'Single-unit attached' : s.type === 'senior' ? 'Housing for the elderly' : units === 2 ? 'Two-unit' : units === 3 ? 'Three-unit' : 'Multi-unit';
/** Spaces the parking minimums ask (§914.02). Senior housing needs a parking study, not costed. */
export const spacesFor = (s: Pick<TestProject, 'type'>, units: number) => Math.ceil(units * (STANDARDS.parking.rules.find((r) => r.use === PARKING_USE(s, units))?.min_per_home ?? 0));

// ------------------------------------------------------------------------------------------------ money
interface Run {
  multiple: number | null;
  dscr: number;
  developerEquity: number;
  developerReturn: number;
  affordable: number;
  /** Tax credit deals: the gap to fill (no sale, no multiple), and the first year cash flow goes negative. */
  credits: boolean;
  gap: number;
  firstNegative: number | null;
}

function proForma(geoid: string, place: PlaceMeasures, hud: HudTable, s: Scenario, units: number, setAt: Ami | null, setShare: number, parkingFree: boolean): Run | null {
  const rents = marketRents(place, hud).rents;
  if (!rents) return null;
  const mix = mixOf(geoid, units, s.type);
  const credits = s.devType === 'affordable';
  const aff = credits ? mix : setAt ? setAside(mix, Math.ceil(units * setShare)) : [0, 0, 0, 0];
  const affordable = aff.reduce((a, b) => a + b, 0);
  const at = credits ? EXAMPLES.creditAmi : setAt ?? 50;
  const gross = [0, 1, 2, 3].reduce((sum, br) => sum + (mix[br] - aff[br]) * rents[br] + aff[br] * Math.min(rentAt(at, br as 0), rents[br]), 0) * 12;
  const i = DEFAULTS.inputs;
  const unitSf = i.unit_sf.value as number[];
  const sizeSf = mix.reduce((x, n, br) => x + n * unitSf[br], 0) / (i.efficiency.value as number);
  const ctx: CapitalContext = {
    devType: s.type === 'senior' ? 'senior' : credits ? 'affordable' : 'market',
    branch: credits ? 'nine' : 'market',
    plan: s.plan,
    units,
    affordable,
    large: affordable >= 60 && (mix[2] + mix[3]) / units >= 0.51,
    qctOrDda: qctYears(geoid).y2027 || !!place.programs?.dda,
    sizeSf,
    grossRent: gross,
    opexPerUnit: (i.opex_per_home.value as number) + (i.reserves_per_home.value as number) - s.abatement,
    price: i.price_nine.value as number,
    dscrNeed: credits ? DEFAULTS.underwriting.dscr.value : (i.dscr.value as number),
  };
  const parking = parkingFree ? 0 : spacesFor(s, units) * s.parkingSpace;
  const over: Record<string, number> = { acquisition: suggestCapital(ctx).acquisition.value + parking, hardPerSf: s.hardPerSf };
  let r = runCapital(ctx, over).result;
  if (s.subsidy > 0 && affordable > 0 && r.total > 0) r = runCapital(ctx, { ...over, otherSubsidyPct: Math.min(1, (s.subsidy * affordable) / r.total) }).result;
  return { multiple: r.multiple, dscr: r.years[0]?.dscr ?? 0, developerEquity: r.developerEquity, developerReturn: r.developerReturn, affordable, credits, gap: r.gap, firstNegative: r.firstNegative };
}

/** Market: at the bar for the developer's return (or, needing no equity, the loan paid and cash flow above zero). Tax
 *  credits: no gap left to fill and cash flow above zero through the compliance period. */
const works = (r: Run, bar: number) => (r.credits ? r.gap <= 0 && r.firstNegative == null : r.multiple == null ? r.dscr >= 1 && r.firstNegative == null : r.multiple >= bar);
const better = (a: Run, b: Run, bar: number) => (works(a, bar) !== works(b, bar) ? works(a, bar) : (a.multiple ?? 99) >= (b.multiple ?? 99));
const x2 = (v: number) => `${v.toFixed(2)}×`;

export function runTract(geoid: string, place: PlaceMeasures, s: Scenario, hud: HudTable = hudTable!): TractOutcome {
  const cap = tractCapacity(geoid);
  const risk = place.displacement?.score ?? null;
  const transitMi = transitMiles(place, s.frequentBus);
  const nearTransit = transitMi != null && transitMi <= EXAMPLES.nearMi;
  const floodPct = place.flood?.fema_sfha_pct ?? null;
  const base: TractOutcome = {
    geoid,
    status: 'nodata',
    units: s.units,
    affordable: 0,
    required: false,
    bonus: false,
    multiple: null,
    dscr: 0,
    pencils: false,
    gap: null,
    capacity: capacityOf(cap, s),
    zoning: zoningIn(cap, s),
    highRisk: risk != null && risk >= THRESHOLDS.displacement_high,
    transitMi,
    nearTransit,
    floodPct,
    why: '',
  };
  // Your values first: a tract they leave out is not tested.
  if (s.transitMi != null && (transitMi ?? Infinity) > s.transitMi) return { ...base, status: 'screened', why: `left out: frequent transit is over ${s.transitMi} mi away` };
  if (s.flood && (floodPct ?? 0) > EXAMPLES.floodPct) return { ...base, status: 'screened', why: `left out: over ${EXAMPLES.floodPct}% of the land is in the flood zone` };
  const covered = s.izWhere === 'citywide' || (s.izWhere === 'izo' && (cap?.izo_share ?? 0) > 0.5);
  const market = s.devType === 'market';
  const required = market && covered && s.units >= s.izMin && s.izShare > 0;
  const parkingFree = s.parking === 'remove' || (s.parking === 'transit' && nearTransit);
  let run: Run | null;
  let units = s.units;
  let bonus = false;
  if (required) run = proForma(geoid, place, hud, s, units, s.izAmi, s.izShare, parkingFree);
  else {
    run = proForma(geoid, place, hud, s, units, null, 0, parkingFree);
    // The bonus is optional: the developer takes it only where the taller building does better.
    const floors = market && !covered && s.bonus > 0 && s.units >= s.izMin ? Math.floor((bonusPoints(s.bonus) * BONUS_FT) / STORY_FT) : 0;
    if (run && floors > 0) {
      const bigger = Math.round((s.units * (s.stories + floors)) / s.stories);
      const withBonus = proForma(geoid, place, hud, s, bigger, BONUS_AMI, s.bonus, parkingFree);
      if (withBonus && better(withBonus, run, s.bar)) {
        run = withBonus;
        units = bigger;
        bonus = true;
      }
    }
  }
  if (!run) return { ...base, why: 'no asking rent or Small Area FMR here' };
  const ok = works(run, s.bar);
  const gap = ok ? 0 : run.credits ? (run.gap > 0 ? run.gap / Math.max(1, units) : null) : run.multiple == null ? null : Math.max(0, run.developerEquity - run.developerReturn / s.bar) / Math.max(1, units);
  const money = { units, affordable: run.affordable, required, bonus, multiple: run.multiple, dscr: run.dscr, pencils: ok, gap };
  const why = run.credits
    ? ok
      ? 'no gap to fill, and cash flow stays above zero'
      : run.gap > 0
        ? `a gap of $${n0(run.gap)} to fill after the credits`
        : `cash flow turns negative in year ${run.firstNegative}`
    : ok
    ? run.multiple == null
      ? 'no equity needed and the loan is covered'
      : `${x2(run.multiple)} the equity, at or over ${x2(s.bar)}`
    : run.multiple == null
      ? 'income does not cover the loan'
      : run.multiple < 1
        ? `${x2(run.multiple)} the equity: loses money`
        : `${x2(run.multiple)} the equity, under ${x2(s.bar)}`;
  if (base.zoning.status === 'no') return { ...base, ...money, status: 'zoning', why: `zoning does not allow it on any lot here (if it did: ${why})` };
  if (s.displacement && base.highRisk && run.affordable === 0) return { ...base, ...money, status: 'screened', why: 'left out: high displacement risk and no homes with an income limit' };
  // Not counted as working: zoning not read (check the code), or a hearing the project may not win.
  if (base.zoning.status === 'unknown') return { ...base, ...money, status: 'unread', why: `zoning not read here: most lots are in downtown, riverfront or special districts (if allowed: ${why})` };
  if (base.zoning.status === 'hearing') return { ...base, ...money, status: 'hearing', why: `needs a zoning hearing (special exception or conditional use); if granted: ${why}` };
  return { ...base, ...money, status: ok ? 'works' : 'fails', why };
}

export interface ScenarioRun {
  tracts: TractOutcome[];
  summary: Summary;
}

export function runScenario(s: Scenario, places: Map<string, PlaceMeasures> = placeById): ScenarioRun {
  const tracts = [...places].map(([g, p]) => runTract(g, p, s));
  const tested = tracts.filter((t) => t.status === 'works' || t.status === 'fails' || t.status === 'hearing');
  const ok = tested.filter((t) => t.pencils);
  const unread = tracts.filter((t) => t.status === 'unread');
  const asked = tracts.filter((t) => t.required && t.status !== 'screened' && t.status !== 'nodata');
  const gaps = tested.filter((t) => !t.pencils && t.gap != null).map((t) => t.gap!).sort((a, b) => a - b);
  const sum = (ts: TractOutcome[], f: (t: TractOutcome) => number) => ts.reduce((x, t) => x + f(t), 0);
  return {
    tracts,
    summary: {
      tracts: tracts.length,
      capacity: sum(tracts, (t) => t.capacity),
      allowed: tracts.filter((t) => t.zoning.status === 'yes').length,
      hearing: tracts.filter((t) => t.zoning.status === 'hearing').length,
      zoned: tracts.filter((t) => t.zoning.status !== 'unknown').length,
      works: tracts.filter((t) => t.status === 'works').length,
      worksHearing: tracts.filter((t) => t.status === 'hearing' && t.pencils).length,
      unread: unread.length,
      unreadPencils: unread.filter((t) => t.pencils).length,
      tested: tested.length,
      breakEven: tested.filter((t) => (t.multiple == null ? t.dscr >= 1 : t.multiple >= 1)).length,
      asked: asked.length,
      askedHomes: sum(asked, (t) => t.affordable),
      screened: tracts.filter((t) => t.status === 'screened').length,
      bonusTaken: tracts.filter((t) => t.bonus).length,
      homes: sum(ok, (t) => t.units),
      affordable: sum(ok, (t) => t.affordable),
      medianGap: gaps.length ? gaps[Math.floor(gaps.length / 2)] : null,
      riskAffordable: sum(ok.filter((t) => t.highRisk), (t) => t.affordable),
      riskMarketOnly: ok.filter((t) => t.highRisk && t.affordable === 0).length,
      nearTransit: ok.filter((t) => t.nearTransit).length,
      inFlood: ok.filter((t) => (t.floodPct ?? 0) > EXAMPLES.floodPct).length,
    },
  };
}

/** The count the answer leads with: works by right, or with a hearing where nothing is allowed by right (senior housing). */
export const headline = (m: Summary) => (m.allowed || !m.hearing ? m.works : m.worksHearing);

/** How sure: the headline count if building cost is EXAMPLES.costSpread a sq ft lower or higher. */
export function costRange(s: Scenario): { cheaper: number; dearer: number } {
  return {
    cheaper: headline(runScenario({ ...s, hardPerSf: Math.max(50, s.hardPerSf - EXAMPLES.costSpread) }).summary),
    dearer: headline(runScenario({ ...s, hardPerSf: s.hardPerSf + EXAMPLES.costSpread }).summary),
  };
}

// ------------------------------------------------------------------------------------------------ the map's classes
/** Does the test project work, graded by the gap a unit where it does not. */
/** A tract that needs a hearing shows "works with a hearing", or its gap where the money falls short. */
export type ResultClass = 'works' | 'hearingWorks' | 'close' | 'gap50' | 'gap150' | 'gap250' | 'gapMore' | 'zoning' | 'unread' | 'screened' | 'nodata';
export const RESULT_CLASSES: ResultClass[] = ['works', 'hearingWorks', 'close', 'gap50', 'gap150', 'gap250', 'gapMore', 'zoning', 'unread', 'screened', 'nodata'];
export function resultClass(t: TractOutcome): ResultClass {
  if (t.status === 'works' || t.status === 'zoning' || t.status === 'unread' || t.status === 'screened' || t.status === 'nodata') return t.status;
  if (t.status === 'hearing' && t.pencils) return 'hearingWorks';
  if (t.multiple != null && t.multiple >= 1) return 'close';
  const g = t.gap ?? Infinity;
  return g < 50000 ? 'gap50' : g < 150000 ? 'gap150' : g < 250000 ? 'gap250' : 'gapMore';
}

/** The test project under your rules against today's, in one tract: read on the developer's return (the multiple of
 *  equity, the measure "works" uses) when it moves 0.01× or more (0.1× where it works both ways), else on the gap a
 *  unit when it moves $1,000 or more; else "same". */
export type ChangeClass = 'nowWorks' | 'better' | 'same' | 'worse' | 'stops' | 'zoning' | 'unread' | 'screened' | 'nodata';
export const CHANGE_CLASSES: ChangeClass[] = ['nowWorks', 'better', 'same', 'worse', 'stops', 'zoning', 'unread', 'screened', 'nodata'];
/** Works by right, or with a hearing. */
export const builds = (t: TractOutcome) => t.status === 'works' || (t.status === 'hearing' && t.pencils);
/** Zoning, best first: by right (2), with a hearing (1), not allowed or not read (0). */
const zoningRank = (t: TractOutcome) => (t.status === 'zoning' || t.status === 'unread' ? 0 : t.status === 'hearing' ? 1 : 2);
export function changeClass(today: TractOutcome, yours: TractOutcome): ChangeClass {
  if (yours.status === 'nodata') return 'nodata';
  if (yours.status === 'screened') return 'screened';
  if (yours.status === 'unread') return 'unread';
  const w0 = builds(today), w1 = builds(yours);
  if (w1 && !w0) return 'nowWorks';
  if (w0 && !w1) return 'stops';
  const z0 = zoningRank(today), z1 = zoningRank(yours);
  if (z1 === 0) return z0 === 0 ? 'zoning' : 'worse';
  if (z1 !== z0) return z1 > z0 ? 'better' : 'worse';
  const step = w1 ? 0.1 : 0.01;
  const dm = today.multiple != null && yours.multiple != null ? yours.multiple - today.multiple : 0;
  if (Math.abs(dm) >= step) return dm > 0 ? 'better' : 'worse';
  const dg = today.gap != null && yours.gap != null ? yours.gap - today.gap : 0;
  return dg <= -1000 ? 'better' : dg >= 1000 ? 'worse' : 'same';
}

// ------------------------------------------------------------------------------------------------ each policy's part
export type LeverId = 'houseLots' | 'lots' | 'parking' | 'iz' | 'bonus' | 'abatement' | 'subsidy' | 'plan' | 'frequentBus' | 'screens';
export const LEVER_LABEL: Record<LeverId, string> = {
  houseLots: 'Homes on house lots',
  lots: 'Minimum lot sizes',
  parking: 'Parking minimums',
  iz: 'Inclusionary requirement',
  bonus: 'Height bonus',
  abatement: 'Tax abatement',
  subsidy: 'Gap subsidy',
  plan: 'PHFA plan',
  frequentBus: 'Frequent bus on every line',
  screens: 'Your values (screens)',
};
export const LEVER_KEYS: Record<LeverId, (keyof Policies)[]> = {
  houseLots: ['houseLots'],
  lots: ['lots'],
  parking: ['parking'],
  iz: ['izWhere', 'izMin', 'izShare', 'izAmi'],
  bonus: ['bonus'],
  abatement: ['abatement'],
  subsidy: ['subsidy'],
  plan: ['plan'],
  frequentBus: ['frequentBus'],
  screens: ['displacement', 'transitMi', 'flood'],
};
export const moved = (s: Policies, id: LeverId) => LEVER_KEYS[id].some((k) => s[k] !== TODAY[k]);

/** Helps: gains only; trade-off: some of each; hurts: losses only; overlaps: nothing with your other choices, which
 *  already do the same, though it moves things on its own; none: nothing either way. */
export type Verdict = 'works' | 'tradeoff' | 'none' | 'backfires' | 'overlap';
export const VERDICT_WORD: Record<Verdict, string> = { works: 'Helps', tradeoff: 'Trade-off', none: 'No effect', backfires: 'Hurts', overlap: 'Overlaps' };

export interface LeverEffect {
  id: LeverId;
  verdict: Verdict;
  works: number;
  allowed: number;
  affordable: number;
  capacity: number;
  nearTransit: number;
  /** Change in the tracts left out by your values. */
  screened: number;
  /** Tracts better and worse off (the map's "What changed", read against your rules without this policy). */
  better: number;
  worse: number;
  sentence: string;
}

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const signed = (v: number) => `${v > 0 ? '+' : '−'}${n0(Math.abs(v))}`;
const tracts = (v: number) => `${Math.abs(v) === 1 ? 'tract' : 'tracts'}`;

/** Why a moved policy changes nothing for the test project, where the reason is plain. */
function whyNothing(id: LeverId, s: Scenario, run: ScenarioRun): string {
  const market = s.devType === 'market';
  if ((id === 'iz' || id === 'bonus') && !market) return 'tax credit projects are all affordable already';
  if ((id === 'iz' || id === 'bonus') && s.units < s.izMin) return `the test project is under ${s.izMin} units`;
  if (id === 'bonus') return 'the taller building does no better anywhere, so no developer would take it';
  if (id === 'plan' && market) return 'only tax credit projects use the PHFA plan';
  if (id === 'subsidy' && market && !run.summary.asked) return 'it pays only for homes with an income limit, and no set-aside is asked of this market-rate test project';
  if (id === 'parking' && s.type === 'townhomes') return 'townhomes need no parking';
  if (id === 'parking' && s.type === 'senior') return 'senior housing needs a parking study, not costed here';
  if (id === 'frequentBus') return 'it matters with parking "near transit", the transit screen or the climate count';
  if (id === 'screens') return 'with your other choices, no tract is left out';
  return '';
}

/** `y` against `w`: the counts that moved, the tracts better and worse off, and the sentence parts. */
function compare(id: LeverId, y: ScenarioRun, w: ScenarioRun) {
  const a = y.summary, b = w.summary;
  const dw = a.works - b.works, dh = a.worksHearing - b.worksHearing, dz = a.allowed - b.allowed, da = a.affordable - b.affordable, dc = a.capacity - b.capacity, ds = a.screened - b.screened;
  const dk = a.askedHomes - b.askedHomes;
  // Near transit is this policy's own effect only for the bus; elsewhere it follows the tracts that work.
  const dt = id === 'frequentBus' ? a.nearTransit - b.nearTransit : 0;
  const was = new Map(w.tracts.map((t) => [t.geoid, t]));
  let better = 0, worse = 0, down = 0, up = 0;
  for (const t of y.tracts) {
    const o = was.get(t.geoid);
    if (!o || o.status === 'screened' || o.status === 'nodata') continue;
    const c = changeClass(o, t);
    const dg = t.gap != null && o.gap != null ? t.gap - o.gap : 0;
    if (c === 'better' || c === 'nowWorks') {
      better += 1;
      down -= Math.min(0, dg);
    } else if (c === 'worse' || c === 'stops') {
      worse += 1;
      up += Math.max(0, dg);
    }
  }
  const gains = dw > 0 || dh > 0 || dz > 0 || da > 0 || dk > 0 || dc > 0 || dt > 0 || ds < 0 || better > 0;
  const losses = dw < 0 || dh < 0 || dz < 0 || da < 0 || dk < 0 || dc < 0 || dt < 0 || ds > 0 || worse > 0;
  const parts = [
    dw ? `${signed(dw)} ${tracts(dw)} where it works by right` : '',
    dh ? `${signed(dh)} ${tracts(dh)} where it works with a hearing` : '',
    dz ? `${signed(dz)} ${tracts(dz)} where zoning allows it by right` : '',
    dk ? `${signed(dk)} homes with an income limit asked of the test buildings (${n0(a.asked)} ${tracts(a.asked)} ask a set-aside)` : '',
    da ? `${signed(da)} homes with an income limit where it works` : '',
    dc ? `${signed(dc)} homes allowed by right` : '',
    dt ? `${signed(dt)} working ${tracts(dt)} near frequent transit` : '',
    ds ? `${n0(Math.abs(ds))} ${ds > 0 ? 'more' : 'fewer'} ${tracts(ds)} left out by your values` : '',
    better ? `better off in ${n0(better)} ${tracts(better)}${down >= better * 1000 ? ` (gap about $${n0(down / better)} a unit smaller)` : ''}` : '',
    worse ? `worse off in ${n0(worse)} ${tracts(worse)}${up >= worse * 1000 ? ` (gap about $${n0(up / worse)} a unit larger)` : ''}` : '',
    id === 'bonus' && a.bonusTaken ? `taken in ${n0(a.bonusTaken)} ${tracts(a.bonusTaken)}` : '',
  ].filter(Boolean);
  return { dw, dz, da, dc, dt, ds, better, worse, gains, losses, parts };
}

/** Each moved policy's part in your rules: your rules against the same rules with that policy back at today's value.
 *  With one policy moved, that is the policy against today. A policy that changes nothing there but moves things on its
 *  own overlaps with your other choices (two ways to close the same gap), and the sentence says what it does alone. */
export function leverEffects(s: Scenario, yours: ScenarioRun): LeverEffect[] {
  const out: LeverEffect[] = [];
  const reset = (id: LeverId) => Object.fromEntries(LEVER_KEYS[id].map((k) => [k, TODAY[k]])) as Partial<Policies>;
  let today: ScenarioRun | null = null;
  for (const id of Object.keys(LEVER_KEYS) as LeverId[]) {
    if (!moved(s, id)) continue;
    const c = compare(id, yours, runScenario({ ...s, ...reset(id) }));
    // A screen leaves places out by choice: what it costs is the price of a value, so it reads as a trade-off.
    let verdict: Verdict = id === 'screens' ? (c.gains || c.losses ? 'tradeoff' : 'none') : c.gains && c.losses ? 'tradeoff' : c.gains ? 'works' : c.losses ? 'backfires' : 'none';
    let sentence = c.parts.length ? `${c.parts.join('; ')}.` : '';
    if (verdict === 'none' && id !== 'screens') {
      today ??= runScenario({ ...s, ...TODAY });
      const alone = compare(id, runScenario({ ...s, ...TODAY, ...Object.fromEntries(LEVER_KEYS[id].map((k) => [k, s[k]])) }), today);
      if (alone.gains || alone.losses) {
        verdict = 'overlap';
        sentence = `Nothing more with your other choices, which already do this. On its own: ${alone.parts.join('; ')}.`;
      } else if (sentence) sentence = `${sentence.slice(0, -1)}, but nothing else changes.`;
    }
    if (!sentence) sentence = `Nothing changes${whyNothing(id, s, yours) ? `: ${whyNothing(id, s, yours)}` : ' for this test project'}.`;
    out.push({ id, verdict, works: c.dw, allowed: c.dz, affordable: c.da, capacity: c.dc, nearTransit: c.dt, screened: c.ds, better: c.better, worse: c.worse, sentence });
  }
  return out;
}
