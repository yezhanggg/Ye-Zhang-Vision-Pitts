// The recommendation block (plan §3 stances, §4 block G): written rules with printed thresholds, a fixed "You decide"
// line, and a fit order (supplied by the UI from scoreTract under the stance preset) that only orders the feasible set.
import {
  BAND_LABEL, BAND_ORDER, BAND_PCT, BAND_PHRASE, CEILING_CAVEAT, bandLimit4p, ceilingRent, confUsable, limitAt100, marketTest,
  type Ceiling, type MarketTest,
} from './afford';
import { bandFigures, bedroomsWord, rankBands, targetBand, tenantProfile, type TargetBand, type TenantProfile } from './bands';
import { CITY_MEDIAN_HOME_VALUE } from './context';
import { DECIDE, G, TYPOLOGY_LABEL } from './copy';
import { floodNote, lotPattern, zoningNote, type FloodNote, type LotPattern } from './feasibility';
import { capitalize, fmtCount, fmtDollars, fmtMiles, fmtScore, fmtShare, isNum, joinAnd, NA, roundHalfEven } from './format';
import { LEVEL_BAND, LEVEL_LABEL, levelPhrase, levelTarget, planTenants, transitTestMiles, type Household, type IncomeLevel } from './plan';
import { DEFAULT_FIT_ORDER, DENSITY_ORDER, SERVES, STANCES, THRESHOLDS, TYPE_BEDROOMS, TYPOLOGIES, TYPOLOGY_BEDROOMS } from './thresholds';
import type { BandId, Bedrooms, HouseholdType, HudTable, PlaceMeasures, Stance, Typology } from './types';

export type { Stance, Typology };

export interface RecommendedType {
  typology: Typology;
  because: string;
  bedrooms: Bedrooms;
}

export type Branch = 'high' | 'between' | 'low' | 'unknown' | null;

export interface Recommendation {
  stance: Stance;
  band: TargetBand;
  tenants: TenantProfile;
  /** The rent ceiling for the main tenants' home size at the band's percent; null above 80% AMI. */
  price: Ceiling | null;
  /** The market test on the 2-bedroom ceiling at the band's percent (80% as the reference above it). */
  market: MarketTest;
  types: RecommendedType[];
  not: { typology: Typology; because: string }[];
  notServed: BandId[];
  stanceTest: { passed: boolean | null; sentence: string };
  lines: string[];
  decide: string;
  // ---- extras the UI may use
  /** The first recommended type, or null when the stance recommends nothing here. */
  lead: Typology | null;
  /** One line for the "Under each stance" table. */
  headline: string;
  servedBands: BandId[];
  notServedWhy: string;
  /** The second ceiling shown when the stance serves a range (≤50%: the 50% line beside the 30% line). */
  priceAlso: Ceiling | null;
  twoBedroom: Ceiling | null;
  lot: LotPattern;
  flood: FloodNote;
  branch: Branch;
  fitOrder: Typology[];
}

export interface RecommendOptions {
  /** A reader-chosen band overrides the rule. */
  band?: BandId;
  /** Types from best to worst fit under the stance preset (scoreTract); orders types within the feasible set. */
  fitOrder?: Typology[];
  /** Override the city median home value (defaults to meta.city_medians.med_home_value). */
  cityMedianValue?: number | null;
  /** The reader's income level (lib/place/plan): counts summed over every band at or below it, price at its ceiling. Overrides `band`. */
  level?: IncomeLevel;
  /** The reader's household: seniors, families, or anyone (the data's largest group). */
  household?: Household;
  /** Transit-first passes when the nearest frequent stop is within this many miles of the average resident (replaces the share/departures rule). */
  transitMiles?: number;
}

const HIGH_BANDS: BandId[] = [...THRESHOLDS.anti_displacement_high_bands];
const pctOf = (band: BandId): 30 | 50 | 80 | null => {
  const pct = BAND_PCT[band];
  return pct === 30 || pct === 50 || pct === 80 ? pct : null;
};

/** The supplied order, completed with any missing types in the stance's default order. */
export function normalizeFitOrder(order: Typology[] | undefined, stance: Stance): Typology[] {
  const seen = new Set<Typology>();
  const out: Typology[] = [];
  for (const t of [...(order ?? []), ...DEFAULT_FIT_ORDER[stance]]) {
    if (TYPOLOGIES.includes(t) && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

function branchOf(score: number | null | undefined): Branch {
  if (!isNum(score)) return 'unknown';
  if (score >= THRESHOLDS.displacement_high) return 'high';
  if (score < THRESHOLDS.displacement_low) return 'low';
  return 'between';
}

/** The household type a building type answers here: the band's largest type when the type serves it, else the first type it is built for that lives in the band. */
function tenantMatch(t: Typology, tenants: TenantProfile) {
  const lead = tenants.types[0];
  if (lead && SERVES[t].includes(lead.type)) return lead;
  for (const ht of SERVES[t]) {
    const found = tenants.types.find((x) => x.type === ht);
    if (found) return found;
  }
  return null;
}

/** Bedrooms a type carries here: from the household type it answers, else its default. */
function bedroomsFor(t: Typology, tenants: TenantProfile): Bedrooms {
  const match = tenantMatch(t, tenants);
  return match ? TYPE_BEDROOMS[match.type] : TYPOLOGY_BEDROOMS[t];
}

/** How directly a type is built for the lead household type: 0 = built for them; higher = serves them among others; 9 = not at all. */
function fitToLead(t: Typology, lead: HouseholdType | null): number {
  if (!lead) return 9;
  const i = SERVES[t].indexOf(lead);
  return i < 0 ? 9 : i;
}

const isLowBand = (band: BandId) => band === 'le30' || band === 'b30_50';

/** Seniors: senior housing first when it is in the set; families: the family types (2–4 unit conversion, townhome) first. */
function preferFor(types: Typology[], household: Household | undefined): Typology[] {
  if (household === 'seniors') return [...types].sort((a, b) => Number(b === 'senior') - Number(a === 'senior'));
  if (household === 'families') {
    const fam = (t: Typology) => Number(t === 'duplex_triplex' || t === 'townhome');
    return [...types].sort((a, b) => fam(b) - fam(a));
  }
  return types;
}

/** Served bands in words; only the top band reads "households above 100% AMI". */
function bandsPhrase(bands: BandId[]): string {
  if (bands.length === 0) return 'no band';
  if (bands.length === 1 && bands[0] === 'gt100') return 'households above 100% AMI';
  return joinAnd(bands.map((b) => BAND_LABEL[b]));
}

interface Ctx {
  p: PlaceMeasures;
  band: BandId;
  tenants: TenantProfile;
  lot: LotPattern;
  flood: FloodNote;
  market: MarketTest;
  cityMedian: number | null;
  branch: Branch;
  /** "at or below 30% of area median income", or the chosen level's phrase. */
  phrase: string;
  /** "≤30% AMI", or the chosen level's label. */
  bandLabel: string;
}

const tenantClause = (t: Typology, c: Ctx): string | null => {
  const match = tenantMatch(t, c.tenants);
  if (!match) return null;
  const lead = c.tenants.types[0];
  return match === lead ? `${match.label} are the largest group ${c.phrase} (${fmtCount(match.count)} households)` : `${fmtCount(match.count)} ${match.label} ${c.phrase} need ${bedroomsWord(TYPE_BEDROOMS[match.type])} home`;
};

const zoningClause = (t: Typology, c: Ctx): string | null => {
  const z = zoningNote(c.p, t);
  if (z.status === 'not_checked' || z.status === 'unknown') return null;
  return `zoning: ${z.status === 'yes' ? 'by right' : z.status === 'conditional' ? 'conditional use' : 'not by right'} (unverified)`;
};

const isNewBuild = (t: Typology) => t === 'townhome' || t === 'small_apartment' || t === 'senior';
const isMultiUnit = (t: Typology) => t === 'small_apartment' || t === 'senior';

function becauseFor(t: Typology, c: Ctx, stance: Stance): string {
  const bits: string[] = [];
  // A market-rate product is not built for the under-served band, so its reasons never cite those tenants.
  const tenant = stance === 'market_led' ? null : tenantClause(t, c);
  if (t === 'senior') bits.push(tenant ?? 'age-restricted apartments hold the 30% and 50% rents', tenant ? 'age-restricted apartments hold the 30% and 50% rents' : '');
  else if (t === 'adu') bits.push('adds a home on an existing lot without demolition', tenant ?? '');
  else if (t === 'duplex_triplex') bits.push(stance === 'market_led' ? 'house-scale rental at market rents' : 'converts an existing house into 2–4 homes without demolition', tenant ?? '');
  else if (t === 'small_apartment') bits.push(stance === 'market_led' ? marketRentClause(c) : '5–19 homes on one lot, the densest type here', stance === 'market_led' ? '' : (tenant ?? ''));
  else if (t === 'townhome') bits.push(stance === 'market_led' ? saleClause(c) : `for-sale rowhouse for the ${c.bandLabel} band with down-payment help`, tenant ?? '');
  if (t === 'adu' || t === 'duplex_triplex') bits.push(c.lot.notes[0] ?? '');
  if (isNewBuild(t)) bits.push(c.lot.notes[1] ?? '');
  if (isMultiUnit(t) && c.flood.checkSite) bits.push(`FEMA share ${c.flood.word}: check the site`);
  bits.push(zoningClause(t, c) ?? '');
  return bits.filter(Boolean).map((s) => s.replace(/\.$/, '')).join('; ');
}

function marketRentClause(c: Ctx): string {
  const m = c.p?.market;
  if (!isNum(m?.asking_2br) || !isNum(m?.safmr_2br)) return 'market-rate rental';
  return `market-rate rental: listings ask ${fmtDollars(m!.asking_2br)} for a 2-bedroom, ${fmtDollars(m!.asking_2br)} − ${fmtDollars(m!.safmr_2br)} = ${fmtDollars(m!.asking_2br! - m!.safmr_2br!)} above the ZIP Fair Market Rent`;
}

function saleClause(c: Ctx): string {
  const m = c.p?.market;
  const v = isNum(m?.sale_median) ? m!.sale_median! : isNum(m?.value_acs) ? m!.value_acs! : null;
  const kind = isNum(m?.sale_median) ? 'sale median since 2023' : 'ACS median home value';
  if (v == null || !isNum(c.cityMedian)) return 'for-sale rowhouse at market prices';
  return `for-sale rowhouse: the ${kind} ${fmtDollars(v)} is ${fmtDollars(v)} − ${fmtDollars(c.cityMedian)} = ${fmtDollars(v - c.cityMedian)} above the city median`;
}

const townhomeLowBandReason = (c: Ctx) => `a for-sale rowhouse serves buyers, not renters ${c.phrase}; at that income it needs a subsidy this tool does not see${c.branch === 'high' ? ', and on an occupied lot it means demolition' : ''}`;

function orderByLead(types: Typology[], c: Ctx, fitOrder: Typology[]): Typology[] {
  const lead = c.tenants.types[0]?.type ?? null;
  return [...types].sort((a, b) => fitToLead(a, lead) - fitToLead(b, lead) || fitOrder.indexOf(a) - fitOrder.indexOf(b));
}

/** Bands other than the served ones, with the reason in words (below: only with a voucher; above: over the income limit). */
function notServedIncomeRestricted(served: BandId[]): { bands: BandId[]; why: string } {
  const bands = BAND_ORDER.filter((b) => !served.includes(b));
  const lo = Math.min(...served.map((b) => BAND_ORDER.indexOf(b)));
  const below = bands.filter((b) => BAND_ORDER.indexOf(b) < lo).map((b) => BAND_LABEL[b]);
  const above = bands.filter((b) => BAND_ORDER.indexOf(b) > lo);
  const why = [below.length ? `${joinAnd(below)} only with a voucher` : '', above.length ? `${below.length ? 'the others' : ''} above the income limit for these homes`.trim() : ''].filter(Boolean).join('; ');
  return { bands, why };
}

/** Bands a market-rate product does not reach: rentals by the 2-bedroom ceiling, for-sale by price ÷ income. */
function notServedByMarket(p: PlaceMeasures, hud: HudTable, lead: Typology | null): { bands: BandId[]; why: string } {
  const m = p?.market;
  if (lead === 'townhome') {
    const price = isNum(m?.sale_median) ? m!.sale_median! : isNum(m?.value_acs) ? m!.value_acs! : null;
    if (price == null) return { bands: [], why: `home price ${NA}` };
    const k = THRESHOLDS.own_price_to_income;
    const bands = BAND_ORDER.filter((b) => {
      const lim = bandLimit4p(hud, b);
      return lim != null && price > k * lim;
    });
    const top = bands.length ? bandLimit4p(hud, bands[bands.length - 1]) : null;
    const why = `a rowhouse at the ${fmtDollars(price)} ${isNum(m?.sale_median) ? 'sale median' : 'median home value'} needs an income near ${fmtDollars(price)} ÷ ${k} = ${fmtDollars(Math.round(price / k))}${top != null ? `, above the four-person ${BAND_LABEL[bands[bands.length - 1]].replace('≤', '')} limit ${fmtDollars(top)}` : ''}`;
    return { bands, why };
  }
  const usable = isNum(m?.asking_2br) && confUsable(m?.asking_conf);
  const rent = usable ? m!.asking_2br! : isNum(m?.safmr_2br) ? m!.safmr_2br! : null;
  if (rent == null) return { bands: [], why: `asking rent and Fair Market Rent ${NA}` };
  const rentWord = usable ? `the ${fmtDollars(rent)} asked` : `the ZIP Fair Market Rent ${fmtDollars(rent)}`;
  const bands: BandId[] = [];
  const parts: string[] = [];
  for (const b of BAND_ORDER) {
    const pct = BAND_PCT[b];
    if (pct == null) continue;
    const ceiling = pct === 100 ? (() => { const l = limitAt100(hud, 3); return l == null ? null : roundHalfEven(l / 40); })() : (ceilingRent(hud, pct, 2)?.rent ?? null);
    if (ceiling != null && ceiling < rent) {
      bands.push(b);
      parts.push(`${BAND_LABEL[b]} ${fmtDollars(ceiling)} (${fmtDollars(rent)} − ${fmtDollars(ceiling)} = ${fmtDollars(rent - ceiling)} short)`);
    }
  }
  const why = bands.length ? `the 2-bedroom ceiling${bands.length === 1 ? '' : 's'} at ${joinAnd(parts)} ${bands.length === 1 ? 'is' : 'are'} below ${rentWord}` : `every band's 2-bedroom ceiling reaches ${rentWord}`;
  return { bands, why };
}

function marketLedTest(p: PlaceMeasures, cityMedian: number | null, citySale: number | null = null): { passed: boolean | null; sentence: string } {
  const m = p?.market;
  const usable = isNum(m?.asking_2br) && confUsable(m?.asking_conf);
  const asking = usable ? m!.asking_2br! : null;
  const safmr = isNum(m?.safmr_2br) ? m!.safmr_2br! : null;
  // Like with like: a tract's sale median against the city's sale median; the ACS value against the ACS city median.
  const useSales = isNum(m?.sale_median) && isNum(citySale);
  const value = useSales ? m!.sale_median! : isNum(m?.value_acs) ? m!.value_acs! : null;
  const valueKind = useSales ? 'sale median since 2023' : 'ACS median home value';
  cityMedian = useSales ? citySale! : cityMedian;
  const rentPass = asking != null && safmr != null ? asking >= safmr : null;
  const valuePass = value != null && isNum(cityMedian) ? value >= cityMedian : null;
  const rentText =
    rentPass == null ? `the asking rent test cannot run (${asking == null ? (isNum(m?.asking_2br) ? 'asking rent has low confidence' : `asking rent ${NA}`) : `Fair Market Rent ${NA}`})`
    : rentPass ? `listings ask ${fmtDollars(asking)} for a 2-bedroom, ${fmtDollars(asking)} − ${fmtDollars(safmr)} = ${fmtDollars(asking! - safmr!)} at or above the ZIP Fair Market Rent (passes)`
    : `listings ask ${fmtDollars(asking)} for a 2-bedroom, ${fmtDollars(safmr)} − ${fmtDollars(asking)} = ${fmtDollars(safmr! - asking!)} below the ZIP Fair Market Rent (fails)`;
  const valueText =
    valuePass == null ? `the home-value test cannot run (${value == null ? `home value ${NA}` : `city median ${NA}`})`
    : valuePass ? `the ${valueKind} ${fmtDollars(value)} is ${fmtDollars(value)} − ${fmtDollars(cityMedian)} = ${fmtDollars(value! - cityMedian!)} at or above the city median (passes)`
    : `the ${valueKind} ${fmtDollars(value)} is ${fmtDollars(cityMedian)} − ${fmtDollars(value)} = ${fmtDollars(cityMedian! - value!)} below the city median (fails)`;
  const passed = rentPass === true && valuePass === true ? true : rentPass === false || valuePass === false ? false : null;
  const head = passed === true ? 'Market test passes: ' : passed === false ? 'No unsubsidized product is supported here: ' : 'Market test incomplete: ';
  const tail = passed === true ? ' The market pays for new homes here.' : passed === false ? ' Without a subsidy nothing is built at these prices.' : '';
  return { passed, sentence: `${head}${rentText}; ${valueText}.${tail}` };
}

function transitTest(p: PlaceMeasures): { passed: boolean | null; sentence: string } {
  const t = p?.transit;
  const share = isNum(t?.freq_share_qmi) ? t!.freq_share_qmi! : null;
  const dep = isNum(t?.departures_qmi) ? t!.departures_qmi! : null;
  if (share == null && dep == null) return { passed: null, sentence: `Transit measures ${NA}; the transit test cannot run.` };
  const passed = (share != null && share >= THRESHOLDS.transit_share_qmi) || (dep != null && dep >= THRESHOLDS.transit_departures_qmi);
  const shareText = share != null ? `${fmtShare(share)} of residents live within a quarter mile of a frequent stop (the mark is ${fmtShare(THRESHOLDS.transit_share_qmi)})` : `share within a quarter mile of a frequent stop ${NA}`;
  const depText = dep != null ? `${fmtCount(dep)} weekday departures within a quarter mile (the mark is ${fmtCount(THRESHOLDS.transit_departures_qmi)})` : `weekday departures ${NA}`;
  const dist = isNum(t?.freq_dist_mi) ? `; the nearest frequent stop is ${fmtMiles(t!.freq_dist_mi)}` : '';
  return passed
    ? { passed: true, sentence: `Transit test passes: ${shareText}; ${depText}${dist}. The stance asks for the densest feasible type.` }
    : { passed: false, sentence: `Fails the transit test: ${shareText}; ${depText}${dist}.` };
}

function antiDisplacementTest(p: PlaceMeasures, branch: Branch, served: BandId[], servedLabel?: string): { passed: boolean | null; sentence: string } {
  const s = p?.displacement?.score;
  const who = servedLabel ?? joinAnd(served.map((b) => BAND_LABEL[b]));
  if (branch === 'unknown' || !isNum(s)) return { passed: null, sentence: `Displacement risk score ${NA}; the stance reads the target band with the additive preference and cannot pick a branch.` };
  const score = fmtScore(s);
  if (branch === 'high') return { passed: true, sentence: `Displacement risk here is ${score}, at or above the ${THRESHOLDS.displacement_high} mark: only types that add homes without demolition, for ${who}, subsidized.` };
  if (branch === 'low') return { passed: true, sentence: `Displacement risk here is ${score}, below the ${THRESHOLDS.displacement_low} mark: affordable homes through gentle density, for ${who}.` };
  return { passed: true, sentence: `Displacement risk here is ${score}, between the ${THRESHOLDS.displacement_low} and ${THRESHOLDS.displacement_high} marks: the target band, ${who}, with the same preference for homes added without demolition.` };
}

/** The recommendation under one stance (plan §3), from the place measures, the HUD table and a fit order. */
export function recommend(p: PlaceMeasures, hud: HudTable, stance: Stance, opts: RecommendOptions = {}): Recommendation {
  const cityMedian = opts.cityMedianValue === undefined ? CITY_MEDIAN_HOME_VALUE : opts.cityMedianValue;
  const fitOrder = normalizeFitOrder(opts.fitOrder, stance);
  const lot = lotPattern(p);
  const flood = floodNote(p);
  const branch: Branch = stance === 'anti_displacement' ? branchOf(p?.displacement?.score) : null;

  // ---- band under the stance
  const level = opts.level;
  let target = level ? levelTarget(p, level) : targetBand(p, opts.band);
  let served: BandId[] = level ? BAND_ORDER.filter((b) => BAND_ORDER.indexOf(b) <= BAND_ORDER.indexOf(LEVEL_BAND[level])) : [target.band];
  if (stance === 'anti_displacement' && branch === 'high' && !opts.band && !level) {
    served = HIGH_BANDS;
    if (!served.includes(target.band)) {
      const alt = rankBands(p).find((b) => served.includes(b)) ?? 'le30';
      const t = targetBand(p, alt);
      t.overridden = false;
      t.reason = `The stance serves the ≤50% bands where risk is high: ${bandFigures(p, alt)} (the most burdened band overall is ${BAND_LABEL[target.band]}).`;
      target = t;
    }
  }
  const band = target.band;
  const phrase = level ? levelPhrase(level) : BAND_PHRASE[band];
  const household = opts.household;
  const tenants = level || (household && household !== 'anyone') ? planTenants(p, level ? served : [band], household ?? 'anyone', phrase) : tenantProfile(p, band);

  // ---- price and market test
  const pct = pctOf(band);
  const price = pct ? ceilingRent(hud, pct, tenants.bedrooms, tenants.seniorAlone) : null;
  const priceAlso = stance === 'anti_displacement' && branch === 'high' && pct === 30 && !level ? ceilingRent(hud, 50, tenants.bedrooms, tenants.seniorAlone) : null;
  const twoBedroom = ceilingRent(hud, pct ?? 80, 2);
  const m = p?.market;
  const market: MarketTest = twoBedroom
    ? marketTest(twoBedroom.rent, m?.asking_2br ?? null, m?.asking_conf ?? null, m?.safmr_2br ?? null)
    : { verdict: 'unknown', gap: null, sentence: `HUD income limits ${NA}; the market test cannot run.`, askingUsed: null };

  const c: Ctx = { p, band, tenants, lot, flood, market, cityMedian, branch, phrase, bandLabel: level ? LEVEL_LABEL[level] : BAND_LABEL[band] };

  // ---- stance rules
  let types: Typology[] = [];
  const not: { typology: Typology; because: string }[] = [];
  let stanceTest: { passed: boolean | null; sentence: string };
  let notServed: { bands: BandId[]; why: string };

  if (stance === 'anti_displacement') {
    stanceTest = antiDisplacementTest(p, branch, served, level ? `households ${LEVEL_LABEL[level]}` : undefined);
    const additive: Typology[] = ['adu', 'duplex_triplex'];
    const newBuild: Typology[] = ['senior', 'small_apartment'];
    if (branch === 'high') {
      types = [...additive];
      if (lot.vacantLand) types.push(...newBuild);
      else for (const t of newBuild) not.push({ typology: t, because: `${lot.notes[1]?.replace(/\.$/, '') ?? `vacant parcels ${NA}`}; a new building here would replace something` });
      not.push({ typology: 'townhome', because: townhomeLowBandReason(c) });
    } else {
      types = [...additive, ...newBuild];
      if (isLowBand(band)) not.push({ typology: 'townhome', because: townhomeLowBandReason(c) });
      else types.push('townhome');
    }
    types = preferFor(orderByLead(types, c, fitOrder), household);
    notServed = notServedIncomeRestricted(served);
  } else if (stance === 'market_led') {
    stanceTest = marketLedTest(p, cityMedian, hud?.city?.sale_median ?? null);
    if (stanceTest.passed) {
      types = fitOrder.filter((t) => t !== 'senior');
      not.push({ typology: 'senior', because: 'age-restricted affordable apartments are a subsidized product; the market test does not speak to them' });
    }
    notServed = notServedByMarket(p, hud, types[0] ?? null);
  } else {
    stanceTest = isNum(opts.transitMiles) ? transitTestMiles(p, opts.transitMiles) : transitTest(p);
    if (stanceTest.passed) {
      types = preferFor(DENSITY_ORDER.filter((t) => t !== 'adu' && !(t === 'townhome' && isLowBand(band))), household);
      not.push({ typology: 'adu', because: 'it adds one home per lot where frequent transit could carry many' });
      if (isLowBand(band)) not.push({ typology: 'townhome', because: townhomeLowBandReason(c) });
    }
    notServed = notServedIncomeRestricted(served);
  }

  // No band is under-served on the evidence (a park, a campus, a zero-renter tract): the need-driven stances recommend nothing.
  // The reader chose seniors or families and CHAS counts none of them at this level: nothing to build for them here.
  const noHousehold = !!household && household !== 'anyone' && !tenants.available;
  const noNeed = !target.available || noHousehold;
  if (noNeed && stance !== 'market_led') {
    types = [];
    not.length = 0;
    notServed = { bands: [], why: noHousehold && target.available ? `nothing is recommended, because CHAS counts no ${household === 'seniors' ? 'senior' : 'family'} renter households ${phrase} here` : 'nothing is recommended, because no band is under-served on the evidence' };
  }

  const recTypes: RecommendedType[] = types.map((t) => ({ typology: t, because: becauseFor(t, c, stance), bedrooms: stance === 'market_led' ? TYPOLOGY_BEDROOMS[t] : bedroomsFor(t, tenants) }));
  const lead = recTypes[0]?.typology ?? null;
  // A market-rate product serves whatever bands its price reaches, not the under-served band.
  if (stance === 'market_led') served = lead ? BAND_ORDER.filter((b) => !notServed.bands.includes(b)) : [];

  // ---- headline for the "Under each stance" table
  let headline: string;
  if (lead && stance === 'market_led') {
    const priceWord = lead === 'townhome'
      ? (isNum(m?.sale_median) ? `at the ${fmtDollars(m!.sale_median)} sale median` : isNum(m?.value_acs) ? `at the ${fmtDollars(m!.value_acs)} median home value` : 'at market prices')
      : (market.askingUsed != null ? `at the ${fmtDollars(market.askingUsed)} asked for a 2-bedroom` : 'at market rents');
    headline = `${capitalize(TYPOLOGY_LABEL[lead])} (${bedroomsWord(recTypes[0].bedrooms).replace(/^a /, '')}${lead === 'townhome' ? ', for sale' : ''}) ${priceWord}; serves ${bandsPhrase(served)}`;
  } else if (lead) headline = `${capitalize(TYPOLOGY_LABEL[lead])} (${bedroomsWord(recTypes[0].bedrooms).replace(/^a /, '')}) for ${level ? `households ${LEVEL_LABEL[level]}` : bandsPhrase(served)}${price ? ` at ${fmtDollars(price.rent)}${priceAlso ? `–${fmtDollars(priceAlso.rent)}` : ''} a month` : ''}`;
  else if (stance === 'market_led') headline = stanceTest.passed === null ? 'Market test incomplete (asking rent or home value not available)' : 'No unsubsidized product is supported here';
  else if (noNeed) headline = noHousehold && target.available ? `No ${household === 'seniors' ? 'senior' : 'family'} renter households ${phrase} on the evidence` : level ? `No under-served renters ${phrase} on the evidence (CHAS counts none paying more than 30% of income)` : 'No under-served band on the evidence (CHAS counts no cost-burdened renters here)';
  else if (stance === 'transit_first' && isNum(opts.transitMiles)) headline = stanceTest.passed === null ? `Transit measures ${NA}` : `Fails the transit test (nearest frequent stop ${fmtMiles(p?.transit?.freq_dist_mi)}; you chose within ${opts.transitMiles.toFixed(2)} miles)`;
  else if (stance === 'transit_first') headline = stanceTest.passed === null ? `Transit measures ${NA}` : `Fails the transit test (${fmtShare(p?.transit?.freq_share_qmi)} within a quarter mile; ${fmtCount(p?.transit?.departures_qmi)} departures)`;
  else headline = 'No type under this stance';

  const lines = [
    G.underServed(target),
    G.tenants(tenants),
    G.price(price, band, priceAlso, twoBedroom, market, CEILING_CAVEAT),
    G.types(recTypes, stance),
    ...G.not(not),
    stanceTest.sentence,
    G.notServed(notServed.bands, notServed.why),
    G.decide,
  ];

  return {
    stance, band: target, tenants, price, market, types: recTypes, not, notServed: notServed.bands, stanceTest, lines, decide: DECIDE,
    lead, headline, servedBands: served, notServedWhy: notServed.why, priceAlso, twoBedroom, lot, flood, branch, fitOrder,
  };
}

export interface StanceRow {
  stance: Stance;
  /** The recommendation's lead in one line. */
  lead: string;
  /** Top of the weighted fit order under the stance preset. */
  fitTop: Typology | null;
  /** The rule's lead is the weighted order's second: a close call worth a word. */
  close: boolean;
  /** "agrees" · "close call" · "differs" · "no product" */
  word: 'agrees' | 'close call' | 'differs' | 'no product';
  leadType: Typology | null;
  band: BandId;
}

/** One row per stance for the "Under each stance" table (plan §4 block G). */
export function underEachStance(p: PlaceMeasures, hud: HudTable, fitOrders: Record<Stance, Typology[]>): StanceRow[] {
  return STANCES.map((stance) => {
    const order = normalizeFitOrder(fitOrders?.[stance], stance);
    const rec = recommend(p, hud, stance, { fitOrder: order });
    const fitTop = order[0] ?? null;
    const idx = rec.lead ? order.indexOf(rec.lead) : -1;
    const close = rec.lead != null && fitTop != null && rec.lead !== fitTop && idx === 1;
    const word: StanceRow['word'] = rec.lead == null ? 'no product' : rec.lead === fitTop ? 'agrees' : close ? 'close call' : 'differs';
    return { stance, lead: rec.headline, fitTop, close, word, leadType: rec.lead, band: rec.band.band };
  });
}
