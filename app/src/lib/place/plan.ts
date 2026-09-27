// Planning inputs (the Match panel's "Who you're planning for"): a household (size and age group), an income level,
// how many homes, the flood risk you accept and how far from frequent transit. Values, not weights: each one changes a
// rule's input, and every sentence built from them keeps its arithmetic.
//
// Income level → bands (the mapping the rules use):
//   ≤30% AMI → the ≤30% band; price = the 30% limit for the household's size × 30% ÷ 12.
//   ≤50% AMI → the ≤30% and 30–50% bands together; price = the 50% limit for the size.
//   ≤80% AMI → the ≤30%, 30–50% and 50–80% bands together; price = the 80% limit for the size.
//   Market rate → the 80–100% and >100% bands (CHAS types read ">80%"); no HUD ceiling: the price is what the market
//   asks (the tract's 2-bedroom asking rent, else the ACS median rent), and the suggestion follows the Market-led test.
// Household size → the HUD income limit for that many persons and the home size (1 → studio/1-bedroom, 2 → 1-bedroom,
// 3–4 → 2-bedroom, 5+ → 3-bedroom). Size × age → the CHAS household types counted as "who it serves" (CHAS splits age
// only at 62). "Largest group here" ('auto', the default) picks, per tract, the largest CHAS renter household type
// within the chosen bands and age group, and takes size and home size from it (TYPE_SIZE).
import { bandsUpTo, confUsable, limitFor, type Ceiling } from './afford';
import { bedroomsWord, sumBands, type TargetBand, type TenantProfile, type TenantType } from './bands';
import { capitalize, fmtDollars, fmtEst, fmtHouseholds, fmtMiles, fmtPct100d1, isNum, joinAnd, NA, roundHalfEven } from './format';
import { HOUSEHOLD_TYPE_ORDER } from './thresholds';
import type { BandId, Bedrooms, HouseholdType, HudTable, PlaceMeasures, TypeBandId } from './types';

/** The three HUD levels (the Equity view's toggle uses only these). */
export type IncomeLevel = 30 | 50 | 80;
/** What the Place view's income control can hold: the three HUD levels or market rate (above 80% AMI). */
export type PlanLevel = IncomeLevel | 'market';
/** An explicit household size (5 = 5 or more). */
export type FixedSize = 1 | 2 | 3 | 4 | 5;
/** A size, or 'auto': each tract's largest CHAS renter household type sets it. */
export type HouseholdSize = FixedSize | 'auto';
export type AgeGroup = 'any' | 'under62' | 'senior62';
export type FloodRisk = 'avoid' | 'some' | 'any';
export type TransitMiles = 0.25 | 0.5 | 1;

export const INCOME_LEVELS: IncomeLevel[] = [30, 50, 80];
export const PLAN_LEVELS: PlanLevel[] = [30, 50, 80, 'market'];
export const HOUSEHOLD_SIZES: HouseholdSize[] = ['auto', 1, 2, 3, 4, 5];
export const AGE_GROUPS: AgeGroup[] = ['any', 'under62', 'senior62'];
export const FLOOD_RISKS: FloodRisk[] = ['avoid', 'some', 'any'];
export const TRANSIT_MILES: TransitMiles[] = [0.25, 0.5, 1];

export const isAmiLevel = (l: PlanLevel): l is IncomeLevel => l !== 'market';
/** For views that only know the HUD levels: market rate reads as 80% AMI there. */
export const amiOf = (l: PlanLevel): IncomeLevel => (l === 'market' ? 80 : l);

/** The top band of each level: it sets the price percent (BAND_PCT) the rules read. */
export const LEVEL_BAND: Record<PlanLevel, BandId> = { 30: 'le30', 50: 'b30_50', 80: 'b50_80', market: 'gt100' };
export const LEVEL_LABEL: Record<PlanLevel, string> = { 30: '≤30% AMI', 50: '≤50% AMI', 80: '≤80% AMI', market: 'Market rate' };
export const levelPhrase = (level: PlanLevel): string => (level === 'market' ? 'above 80% AMI' : `at or below ${level}% AMI`);
export const SIZE_LABEL: Record<HouseholdSize, string> = { auto: 'Largest group', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5+' };
export const sizeWord = (s: HouseholdSize): string => (s === 'auto' ? 'largest group' : s === 5 ? '5+-person' : `${s}-person`);
/** "1 person", "3 people", "5+ people". */
export const personsWord = (s: FixedSize): string => (s === 1 ? '1 person' : s === 5 ? '5+ people' : `${s} people`);
export const AGE_LABEL: Record<AgeGroup, string> = { any: 'Any age', under62: 'Under 62', senior62: '62 and older' };
export const FLOOD_LABEL: Record<FloodRisk, string> = { avoid: 'Avoid flood zones', some: 'Some is OK', any: 'Any' };
/** Most of a tract's land that may sit in a FEMA flood zone (percent); null = no limit. */
export const FLOOD_LIMIT_PCT: Record<FloodRisk, number | null> = { avoid: 5, some: 15, any: null };
export const MILES_LABEL: Record<TransitMiles, string> = { 0.25: '¼ mile', 0.5: '½ mile', 1: '1 mile' };

/** The CHAS bands each level reads (market rate: the two bands above 80% AMI). */
export const levelBands = (level: PlanLevel): BandId[] => (level === 'market' ? ['b80_100', 'gt100'] : bandsUpTo(level));

// ---------------------------------------------------------------- household size → limit and home size
export const SIZE_RULE = '1 person → a studio or 1-bedroom, 2 → 1-bedroom, 3–4 → 2-bedroom, 5 or more → 3-bedroom';

/** Home size for a household (the rent is priced on the larger of studio/1-bedroom for one person: a 1-bedroom). */
export const sizeBedrooms = (size: FixedSize): Bedrooms => (size <= 2 ? 1 : size <= 4 ? 2 : 3);
export const sizeHomeWord = (size: FixedSize): string => (size === 1 ? 'a studio or 1-bedroom' : bedroomsWord(sizeBedrooms(size)));

/** The rent that fits a household of `size` at `pct` of AMI: the HUD limit for that many persons × 30% ÷ 12. */
export function ceilingForSize(hud: HudTable, pct: IncomeLevel, size: FixedSize): Ceiling | null {
  const limit = limitFor(hud, pct, size);
  if (limit == null) return null;
  const rent = roundHalfEven(limit / 40);
  return { rent, limit, persons: size, formula: `${fmtDollars(limit)} × 30% ÷ 12 = ${fmtDollars(rent)}`, limitFormula: null, pct, bedrooms: sizeBedrooms(size), seniorAlone: false };
}

/** What the market asks here: the 2-bedroom asking rent (medium or high confidence), else the ACS median rent. */
export interface MarketRent {
  rent: number | null;
  source: 'asking' | 'acs' | null;
  /** "market asks $1,150 (2-bedroom asking rent, 66 listings)" */
  words: string;
}
export function marketRent(p: PlaceMeasures): MarketRent {
  const m = p?.market;
  if (isNum(m?.asking_2br) && confUsable(m?.asking_conf)) return { rent: m!.asking_2br!, source: 'asking', words: `market asks ${fmtDollars(m!.asking_2br)} (2-bedroom asking rent${isNum(m?.asking_n) ? `, ${fmtHouseholds(m!.asking_n)} listings` : ''})` };
  if (isNum(m?.acs_rent)) return { rent: m!.acs_rent!, source: 'acs', words: `market asks ${fmtDollars(m!.acs_rent)} (ACS median rent residents pay; no usable 2-bedroom asking rent)` };
  return { rent: null, source: null, words: `market rent ${NA}` };
}

/** "3-person household at 50% AMI: up to $49,700 a year · rent that fits $1,242 for a 2-bedroom". */
export function sizeIncomeLine(hud: HudTable | null, level: PlanLevel, size: HouseholdSize): string {
  if (!hud) return `HUD income limits ${NA}`;
  if (size === 'auto') {
    if (level === 'market') return "Uses each place's largest group; above 80% AMI no HUD rent ceiling applies: the rent is what the market asks";
    const one = ceilingForSize(hud, level, 1);
    const three = ceilingForSize(hud, level, 3);
    if (!one || !three) return `Uses each place's largest group; ${level}% AMI limit ${NA}`;
    return `Uses each place's largest group; e.g. 1 person at ${level}% AMI: up to ${fmtDollars(one.limit)} a year · rent that fits ${fmtDollars(one.rent)}; a small family (priced at 3): ${fmtDollars(three.limit)} · ${fmtDollars(three.rent)}`;
  }
  const who = `${sizeWord(size)} household`;
  const persons = Math.min(size, 8);
  if (level === 'market') {
    const l80 = limitFor(hud, 80, persons);
    return `${capitalize(who)} at market rate: more than ${fmtDollars(l80)} a year (above the 80% AMI limit) · no HUD rent ceiling applies; the rent is what the market asks`;
  }
  const c = ceilingForSize(hud, level, size);
  if (!c) return `${capitalize(who)} at ${level}% AMI: limit ${NA}`;
  return `${capitalize(who)} at ${level}% AMI: up to ${fmtDollars(c.limit)} a year · rent that fits ${fmtDollars(c.rent)} for ${sizeHomeWord(size)}${size === 5 ? ' (5-person limit)' : ''}`;
}

/** Four-person line kept for older callers: "Up to $33,100 a year for a family of four · rent up to $745 for a 2-bedroom". */
export function levelIncomeLine(hud: HudTable | null, level: IncomeLevel): string {
  if (!hud) return `HUD income limits ${NA}`;
  const four = limitFor(hud, level, 4);
  const three = limitFor(hud, level, 3);
  const a = isNum(four) ? `Up to ${fmtDollars(four)} a year for a family of four` : `Four-person limit ${NA}`;
  const b = isNum(three) ? `rent up to ${fmtDollars(roundHalfEven(three / 40))} for a 2-bedroom` : `2-bedroom rent ${NA}`;
  return `${a} · ${b}`;
}

// ---------------------------------------------------------------- size × age → CHAS household types
export const AGE_NOTE = 'CHAS splits households only at age 62 (its "elderly"), so finer age groups are not available.';
export const PLAN_TYPE_LABEL: Record<HouseholdType, string> = {
  elderly_alone: 'seniors (62+) living alone',
  elderly_family: 'senior families (2 people, one 62+)',
  small_family: 'small families (2–4 people)',
  large_family: 'large families (5 or more)',
  other: 'single adults and unrelated households',
};

/** Short labels for the answer card's one-line rows. */
export const PLAN_TYPE_SHORT: Record<HouseholdType, string> = {
  elderly_alone: 'seniors living alone',
  elderly_family: 'senior couples',
  small_family: 'small families',
  large_family: 'large families',
  other: 'single adults',
};

/** The size each CHAS type is priced at (small family is 2–4 people, priced at 3; large family at 5). */
export const TYPE_SIZE: Record<HouseholdType, FixedSize> = { elderly_alone: 1, other: 1, elderly_family: 2, small_family: 3, large_family: 5 };
/** The persons a type spans, for the card ("2–4 people, priced at 3"). */
export const TYPE_PERSONS: Record<HouseholdType, string> = {
  elderly_alone: '1 person',
  other: '1 person',
  elderly_family: '2 people',
  small_family: '2–4 people, priced at 3',
  large_family: '5+ people',
};
/** The types "Largest group here" chooses among, by age group (CHAS splits only at 62). */
export function autoTypes(age: AgeGroup): HouseholdType[] {
  if (age === 'senior62') return ['elderly_alone', 'elderly_family'];
  if (age === 'under62') return ['other', 'small_family', 'large_family'];
  return [...HOUSEHOLD_TYPE_ORDER];
}

/** A plan's household, resolved for one place: the size used for the HUD limit and home size, and the CHAS type when 'auto' picked one. */
export interface ResolvedHousehold {
  size: FixedSize;
  auto: boolean;
  /** The largest type here (auto only); null when CHAS counts none of the eligible types. */
  type: HouseholdType | null;
  count: number | null;
}

const TYPE_BAND_OF: Record<BandId, TypeBandId> = { le30: 'le30', b30_50: 'b30_50', b50_80: 'b50_80', b80_100: 'gt80', gt100: 'gt80' };

/** Each eligible type's renter households summed over the bands (missing rows skipped); null when no number is on file. */
function typeTotals(p: PlaceMeasures, bands: BandId[], keep: HouseholdType[]): { type: HouseholdType; count: number }[] | null {
  const tbs = Array.from(new Set(bands.map((b) => TYPE_BAND_OF[b])));
  if (!tbs.some((tb) => keep.some((t) => isNum(p?.types?.[tb]?.[t])))) return null;
  return keep.map((t) => ({ type: t, count: tbs.reduce((a, tb) => a + (isNum(p?.types?.[tb]?.[t]) ? p.types[tb][t] : 0), 0) }));
}

/** The largest CHAS renter household type within the bands and age group; ties go to HOUSEHOLD_TYPE_ORDER. */
export function largestType(p: PlaceMeasures, bands: BandId[], age: AgeGroup): { type: HouseholdType; count: number } | null {
  const totals = typeTotals(p, bands, autoTypes(age));
  if (!totals) return null;
  const best = [...totals].sort((a, b) => b.count - a.count || HOUSEHOLD_TYPE_ORDER.indexOf(a.type) - HOUSEHOLD_TYPE_ORDER.indexOf(b.type))[0];
  return best && best.count > 0 ? best : null;
}

/** Resolve 'auto' for one place (explicit sizes pass through). With no eligible type on file, auto prices at 3 people. */
export function resolveHousehold(p: PlaceMeasures, bands: BandId[], size: HouseholdSize, age: AgeGroup): ResolvedHousehold {
  if (size !== 'auto') return { size, auto: false, type: null, count: null };
  const best = largestType(p, bands, age);
  return best ? { size: TYPE_SIZE[best.type], auto: true, type: best.type, count: best.count } : { size: 3, auto: true, type: null, count: null };
}

/**
 * The CHAS household types a size and age group count. CHAS definitions: elderly alone = one person 62+; elderly
 * family = two people, either 62+; small family = 2–4 people (3–4 at any age, 2 when neither is 62+); large family =
 * 5 or more at any age; other = single adults under 62 and unrelated households.
 */
export function typesFor(size: HouseholdSize, age: AgeGroup): HouseholdType[] {
  if (size === 'auto') return autoTypes(age);
  if (size >= 5) return ['large_family'];
  if (size === 1) return age === 'senior62' ? ['elderly_alone'] : age === 'under62' ? ['other'] : ['elderly_alone', 'other'];
  if (size === 2) return age === 'senior62' ? ['elderly_family'] : age === 'under62' ? ['small_family'] : ['elderly_family', 'small_family'];
  return ['small_family'];
}

/** Why a size/age pair maps as it does, when CHAS cannot separate it. */
export function typesNote(size: HouseholdSize, age: AgeGroup): string | null {
  if (size === 'auto') return null;
  if (size >= 5 && age !== 'any') return 'CHAS counts every household of 5 or more as a large family, whatever the age.';
  if (size >= 3 && size <= 4 && age !== 'any') return 'CHAS counts every family of 3–4 people as a small family, whatever the age.';
  return null;
}

const TYPE_BAND: Record<BandId, TypeBandId> = { le30: 'le30', b30_50: 'b30_50', b50_80: 'b50_80', b80_100: 'gt80', gt100: 'gt80' };
const TYPE_BAND_SHORT: Record<TypeBandId, string> = { le30: '≤30%', b30_50: '30–50%', b50_80: '50–80%', gt80: '>80%' };

/**
 * Who the homes are for: the CHAS types for the size and age, summed over the level's bands, with the sum written
 * out ("150 at ≤30% + 115 at 30–50% = 265 small families"). Home size comes from the household size, not the data.
 */
export function planTenants(p: PlaceMeasures, bands: BandId[], sizeIn: HouseholdSize, age: AgeGroup, phrase: string): TenantProfile {
  if (sizeIn === 'auto') return autoTenants(p, bands, age, phrase);
  const size = sizeIn;
  const tbs = Array.from(new Set(bands.map((b) => TYPE_BAND[b])));
  const bedrooms = sizeBedrooms(size);
  const seniorAlone = size === 1 && age === 'senior62';
  const keep = typesFor(size, age);
  const who = `${sizeWord(size)} households${age === 'any' ? '' : age === 'senior62' ? ' 62 and older' : ' under 62'}`;
  const anyNum = tbs.some((tb) => keep.some((t) => isNum(p?.types?.[tb]?.[t])));
  if (!anyNum) return { types: [], bedrooms, seniorAlone, sentence: `CHAS household types ${phrase} are ${NA}.`, available: false };
  const types: TenantType[] = [];
  const pieces: string[] = [];
  for (const t of keep) {
    const byBand = tbs.map((tb) => ({ tb, n: p?.types?.[tb]?.[t] })).filter((x): x is { tb: TypeBandId; n: number } => isNum(x.n));
    const count = byBand.reduce((a, x) => a + x.n, 0);
    if (count > 0) types.push({ type: t, label: PLAN_TYPE_LABEL[t], count });
    const sum = byBand.length > 1 ? `: ${byBand.map((x) => `${fmtHouseholds(x.n)} at ${TYPE_BAND_SHORT[x.tb]}`).join(' + ')} = ${fmtHouseholds(count)}` : '';
    pieces.push(`${fmtHouseholds(count)} ${PLAN_TYPE_LABEL[t]}${sum}`);
  }
  types.sort((a, b) => b.count - a.count || HOUSEHOLD_TYPE_ORDER.indexOf(a.type) - HOUSEHOLD_TYPE_ORDER.indexOf(b.type));
  const total = types.reduce((a, t) => a + t.count, 0);
  const home = `Home size: ${sizeHomeWord(size)} (${SIZE_RULE})`;
  if (total === 0) return { types, bedrooms, seniorAlone, sentence: `For ${who} ${phrase}, CHAS counts no ${joinAnd(keep.map((t) => PLAN_TYPE_LABEL[t]))} here.`, available: false };
  const totalText = keep.length > 1 ? `; in all ${types.map((t) => fmtHouseholds(t.count)).join(' + ')} = ${fmtHouseholds(total)} renter households` : '';
  const sentence = `For ${who} ${phrase}, CHAS counts ${joinAnd(pieces)}${totalText}. ${home}.`;
  return { types, bedrooms, seniorAlone, sentence, available: true };
}

/** "Largest group here": the one CHAS type with the most renter households in the bands (age group respected); size and home size follow it. */
function autoTenants(p: PlaceMeasures, bands: BandId[], age: AgeGroup, phrase: string): TenantProfile {
  const tbs = Array.from(new Set(bands.map((b) => TYPE_BAND[b])));
  const keep = autoTypes(age);
  const ageWords = age === 'any' ? '' : age === 'senior62' ? ' 62 and older' : ' under 62';
  const totals = typeTotals(p, bands, keep);
  const best = largestType(p, bands, age);
  if (!totals) return { types: [], bedrooms: 2, seniorAlone: false, sentence: `CHAS household types ${phrase} are ${NA}.`, available: false };
  if (!best) return { types: [], bedrooms: 2, seniorAlone: false, sentence: `For households${ageWords} ${phrase}, CHAS counts no ${joinAnd(keep.map((t) => PLAN_TYPE_LABEL[t]))} here.`, available: false };
  const t = best.type;
  const size = TYPE_SIZE[t];
  const byBand = tbs.map((tb) => ({ tb, n: p?.types?.[tb]?.[t] })).filter((x): x is { tb: TypeBandId; n: number } => isNum(x.n));
  const sum = byBand.length > 1 ? ` (${byBand.map((x) => `${fmtHouseholds(x.n)} at ${TYPE_BAND_SHORT[x.tb]}`).join(' + ')} = ${fmtHouseholds(best.count)})` : '';
  const rest = totals.filter((x) => x.type !== t).sort((a, b) => b.count - a.count);
  const restText = rest.length ? `, more than ${joinAnd(rest.map((x) => `${fmtHouseholds(x.count)} ${PLAN_TYPE_LABEL[x.type]}`))}` : '';
  const sentence = `Largest group here${ageWords ? ` (${ageWords.trim()})` : ''} ${phrase}: CHAS counts ${fmtHouseholds(best.count)} ${PLAN_TYPE_LABEL[t]}${sum}${restText}. Priced for ${TYPE_PERSONS[t]}; home size: ${sizeHomeWord(size)} (${SIZE_RULE}).`;
  return { types: [{ type: t, label: PLAN_TYPE_LABEL[t], count: best.count }], bedrooms: sizeBedrooms(size), seniorAlone: t === 'elderly_alone', sentence, available: true };
}

// ---------------------------------------------------------------- target at a level
/** The target band when the reader chose an income level: counts summed over every band the level reads. */
export function levelTarget(p: PlaceMeasures, level: PlanLevel): TargetBand {
  const ids = levelBands(level);
  const s = sumBands(p, ids);
  const band = LEVEL_BAND[level];
  const market = level === 'market';
  // Market rate plans for households the market serves: "available" = CHAS counts renters there at all.
  const available = market ? isNum(s.hh) && s.hh > 0 : isNum(s.burden30) && s.burden30 > 0;
  const uncertain = ids.some((id) => {
    const b = p?.bands?.[id];
    return isNum(b?.hh) && isNum(b?.moe) && b!.hh! > 0 && b!.moe! > b!.hh!;
  });
  const moe = ids.map((id) => p?.bands?.[id]?.moe).filter(isNum);
  const moeSum = moe.length ? Math.round(Math.sqrt(moe.reduce((a, m) => a + m * m, 0))) : null;
  const hhParts = ids.map((id) => fmtHouseholds(p?.bands?.[id]?.hh ?? 0));
  let reason: string;
  if (!isNum(s.hh)) reason = `You chose ${LEVEL_LABEL[level]}: renter households by income band are ${NA} here.`;
  else if (s.hh === 0) reason = `You chose ${LEVEL_LABEL[level]}: CHAS counts no renter households ${levelPhrase(level)} here${market ? '.' : ', so no one at this level is under-served on the evidence.'}`;
  else if (market) reason = `You chose market rate: ${fmtEst(s.hh, moeSum)} renter households ${levelPhrase(level)} (${hhParts.join(' + ')} = ${fmtHouseholds(s.hh)}, 80–100% and above 100% AMI), ${fmtHouseholds(s.burden30 ?? 0)} of them paying more than 30% of income.`;
  else if (!available) reason = `You chose ${LEVEL_LABEL[level]}: ${fmtHouseholds(s.hh)} renter households ${levelPhrase(level)}, none of them paying more than 30% of income, so no one at this level is under-served on the evidence.`;
  else {
    const parts = ids.map((id) => fmtHouseholds(p?.bands?.[id]?.burden30 ?? 0));
    const sum = ids.length > 1 ? ` (${parts.join(' + ')} = ${fmtHouseholds(s.burden30)})` : '';
    reason = `You chose ${LEVEL_LABEL[level]}: ${fmtEst(s.hh, moeSum)} renter households ${levelPhrase(level)}, ${fmtHouseholds(s.burden30)} of them paying more than 30% of income${sum}.`;
  }
  if (uncertain && isNum(s.hh) && s.hh > 0) reason += ' A margin of error exceeds its estimate in at least one band, so the count is uncertain.';
  return { band, uncertain, runnerUp: null, burdened: s.burden30, hh: s.hh, reason, available, overridden: true };
}

// ---------------------------------------------------------------- flood limit
export interface FloodCheck {
  /** True when the FEMA flood-zone share is above the reader's limit. */
  blocked: boolean;
  limit: number | null;
  pct: number | null;
  sentence: string;
}

/** The reader's flood limit against the tract's FEMA flood-zone share of land. Unknown share → not blocked, said so. */
export function floodCheck(p: PlaceMeasures, risk: FloodRisk): FloodCheck {
  const limit = FLOOD_LIMIT_PCT[risk];
  const pct = isNum(p?.flood?.fema_sfha_pct) ? p.flood.fema_sfha_pct : null;
  if (limit == null) return { blocked: false, limit, pct, sentence: pct == null ? `FEMA flood-zone share ${NA}; you set no flood limit.` : `${fmtPct100d1(pct)} of the land is in a FEMA flood zone; you set no flood limit.` };
  if (pct == null) return { blocked: false, limit, pct, sentence: `FEMA flood-zone share ${NA}, so your ${limit}% limit cannot be checked here.` };
  return pct > limit
    ? { blocked: true, limit, pct, sentence: `${fmtPct100d1(pct)} of the land is in a FEMA flood zone (above your limit of ${limit}%).` }
    : { blocked: false, limit, pct, sentence: `${fmtPct100d1(pct)} of the land is in a FEMA flood zone, within your limit of ${limit}% (${limit}% − ${fmtPct100d1(pct)} = ${(limit - pct).toFixed(1)} points to spare).` };
}

/** Transit-first with the reader's distance: passes when the nearest frequent stop is within it of where the average resident lives. */
export function transitTestMiles(p: PlaceMeasures, miles: number): { passed: boolean | null; sentence: string } {
  const d = p?.transit?.freq_dist_mi;
  const want = `${miles.toFixed(2)} miles`;
  if (!isNum(d)) return { passed: null, sentence: `Distance to the nearest frequent stop ${NA}; the transit test cannot run.` };
  const diff = Math.abs(miles - d);
  return d <= miles
    ? { passed: true, sentence: `Transit test passes: the nearest frequent stop (one bus or T every 15 minutes or better) is ${fmtMiles(d)} from where the average resident lives, within the ${want} you chose (${want} − ${fmtMiles(d)} = ${diff.toFixed(2)} miles to spare). The focus asks for the densest feasible type.` }
    : { passed: false, sentence: `Fails the transit test: the nearest frequent stop is ${fmtMiles(d)} from where the average resident lives, beyond the ${want} you chose (${fmtMiles(d)} − ${want} = ${diff.toFixed(2)} miles too far).` };
}

// ---------------------------------------------------------------- homes needed
/** "40 homes reach 40 of 265 qualifying … (40 ÷ 265 = 15%)" and the yearly rent gap at 2-bedroom prices. */
export function homesLines(
  homes: number,
  qualifying: number | null,
  who: string,
  level: PlanLevel,
  asking: number | null,
  fits2br: number | null,
): { served: string; gap: string } {
  const n = fmtHouseholds(homes);
  let served: string;
  if (qualifying == null) served = `${n} homes; qualifying ${who} ${NA}.`;
  else if (qualifying === 0) served = `${n} homes; CHAS counts no ${who} here.`;
  else {
    const units = Math.min(homes, qualifying);
    const ratio = `${fmtHouseholds(units)} ÷ ${fmtHouseholds(qualifying)} = ${Math.round((units / qualifying) * 100)}%`;
    served = homes > qualifying
      ? `${n} homes for ${fmtHouseholds(qualifying)} ${who}: all of them (${ratio}), with ${fmtHouseholds(homes - qualifying)} homes to spare.`
      : `${n} homes reach ${fmtHouseholds(units)} of ${fmtHouseholds(qualifying)} ${who} (${ratio}).`;
  }
  let gap: string;
  if (level === 'market') gap = 'At market rate the rent is what the market asks, so there is no rent gap to cover.';
  else if (!isNum(asking)) gap = 'No usable 2-bedroom asking rent: the yearly rent gap cannot be measured.';
  else if (!isNum(fits2br)) gap = `HUD income limits ${NA}; no rent gap.`;
  else {
    const per = Math.max(0, asking - fits2br);
    gap = per === 0
      ? `Listings ask ${fmtDollars(asking)} for a 2-bedroom, at or below the ${fmtDollars(fits2br)} that fits: no rent gap on turnover.`
      : `Rent gap at 2-bedroom prices: (${fmtDollars(asking)} − ${fmtDollars(fits2br)}) × 12 × ${n} = ${fmtDollars(per * 12 * homes)} a year.`;
  }
  return { served, gap };
}
