// Planning inputs (the Match panel's "Who you're planning for"): an income level, a household, how many homes and
// how far from frequent transit. Values, not weights: each one changes a rule's input, and every sentence built from
// them keeps its arithmetic.
//
// Income level → bands (the mapping the rules use):
//   ≤30% AMI → the ≤30% band; price = the 30% ceiling.
//   ≤50% AMI → the ≤30% and 30–50% bands together; price = the 50% ceiling.
//   ≤80% AMI → the ≤30%, 30–50% and 50–80% bands together; price = the 80% ceiling.
// Counts (renters, cost burden, household types) are summed over every band at or below the level; the price is the
// ceiling at the level's own percent, the most a home can charge and still count as affordable at that level.
import { bandsUpTo, ceilingRent, limitFor } from './afford';
import { bedroomsWord, sumBands, sumTypes, type TargetBand, type TenantProfile, type TenantType } from './bands';
import { capitalize, fmtDollars, fmtEst, fmtHouseholds, fmtMiles, isNum, joinAnd, NA } from './format';
import { HOUSEHOLD_TYPE_LABEL, HOUSEHOLD_TYPE_ORDER, TYPE_BEDROOMS } from './thresholds';
import type { BandId, HouseholdType, HudTable, PlaceMeasures } from './types';

export type IncomeLevel = 30 | 50 | 80;
export type Household = 'seniors' | 'families' | 'anyone';
export type TransitMiles = 0.25 | 0.5 | 1;

export const INCOME_LEVELS: IncomeLevel[] = [30, 50, 80];
export const HOUSEHOLDS: Household[] = ['seniors', 'families', 'anyone'];
export const TRANSIT_MILES: TransitMiles[] = [0.25, 0.5, 1];

/** The top band of each level: it sets the price percent (BAND_PCT) the rules read. */
export const LEVEL_BAND: Record<IncomeLevel, BandId> = { 30: 'le30', 50: 'b30_50', 80: 'b50_80' };
export const LEVEL_LABEL: Record<IncomeLevel, string> = { 30: '≤30% AMI', 50: '≤50% AMI', 80: '≤80% AMI' };
export const levelPhrase = (level: IncomeLevel): string => `at or below ${level}% AMI`;
export const HOUSEHOLD_LABEL: Record<Household, string> = { seniors: 'Seniors', families: 'Families', anyone: 'Anyone' };
export const MILES_LABEL: Record<TransitMiles, string> = { 0.25: '¼ mile', 0.5: '½ mile', 1: '1 mile' };

/** Household types each choice keeps ("anyone" keeps all, and the data's largest group leads). */
const KEEP: Record<Household, HouseholdType[]> = {
  seniors: ['elderly_alone', 'elderly_family'],
  families: ['small_family', 'large_family'],
  anyone: HOUSEHOLD_TYPE_ORDER,
};
const HOUSEHOLD_NOUN: Record<Household, string> = { seniors: 'senior renter households', families: 'family renter households', anyone: 'renter households' };

/** "Up to $33,100 a year for a family of four · rent up to $745 for a 2-bedroom" (HUD limits × 30% ÷ 12). */
export function levelIncomeLine(hud: HudTable | null, level: IncomeLevel): string {
  if (!hud) return `HUD income limits ${NA}`;
  const four = limitFor(hud, level, 4);
  const two = ceilingRent(hud, level, 2);
  const a = isNum(four) ? `Up to ${fmtDollars(four)} a year for a family of four` : `Four-person limit ${NA}`;
  const b = two ? `rent up to ${fmtDollars(two.rent)} for a 2-bedroom` : `2-bedroom rent ${NA}`;
  return `${a} · ${b}`;
}

/** The target band when the reader chose an income level: counts summed over every band at or below it. */
export function levelTarget(p: PlaceMeasures, level: IncomeLevel): TargetBand {
  const ids = bandsUpTo(level);
  const s = sumBands(p, ids);
  const band = LEVEL_BAND[level];
  const available = isNum(s.burden30) && s.burden30 > 0;
  const uncertain = ids.some((id) => {
    const b = p?.bands?.[id];
    return isNum(b?.hh) && isNum(b?.moe) && b!.hh! > 0 && b!.moe! > b!.hh!;
  });
  const moe = ids.map((id) => p?.bands?.[id]?.moe).filter(isNum);
  const moeSum = moe.length ? Math.round(Math.sqrt(moe.reduce((a, m) => a + m * m, 0))) : null;
  let reason: string;
  if (!isNum(s.hh)) reason = `You chose ${LEVEL_LABEL[level]}: renter households by income band are ${NA} here.`;
  else if (s.hh === 0) reason = `You chose ${LEVEL_LABEL[level]}: CHAS counts no renter households ${levelPhrase(level)} here, so no one at this level is under-served on the evidence.`;
  else if (!available) reason = `You chose ${LEVEL_LABEL[level]}: ${fmtHouseholds(s.hh)} renter households ${levelPhrase(level)}, none of them paying more than 30% of income, so no one at this level is under-served on the evidence.`;
  else {
    const parts = ids.map((id) => fmtHouseholds(p?.bands?.[id]?.burden30 ?? 0));
    const sum = ids.length > 1 ? ` (${parts.join(' + ')} = ${fmtHouseholds(s.burden30)})` : '';
    reason = `You chose ${LEVEL_LABEL[level]}: ${fmtEst(s.hh, moeSum)} renter households ${levelPhrase(level)}, ${fmtHouseholds(s.burden30)} of them paying more than 30% of income${sum}.`;
    if (uncertain) reason += ' A margin of error exceeds its estimate in at least one band, so the count is uncertain.';
  }
  return { band, uncertain, runnerUp: null, burdened: s.burden30, hh: s.hh, reason, available, overridden: true };
}

/**
 * Who the homes are for, from the household types summed over `bands`. Seniors → seniors living alone and senior
 * families (a 1-bedroom; one person when seniors living alone lead). Families → small and large families (2 or 3
 * bedrooms, from the larger group). Anyone → every type; the data's largest group sets the home size.
 */
export function planTenants(p: PlaceMeasures, bands: BandId[], household: Household, phrase: string): TenantProfile {
  const sums = sumTypes(p, bands);
  const keep = KEEP[household];
  const types: TenantType[] = sums
    ? keep
        .filter((t) => isNum(sums[t]) && (sums[t] as number) > 0)
        .map((t) => ({ type: t, label: HOUSEHOLD_TYPE_LABEL[t], count: sums[t] as number }))
        .sort((a, b) => b.count - a.count || HOUSEHOLD_TYPE_ORDER.indexOf(a.type) - HOUSEHOLD_TYPE_ORDER.indexOf(b.type))
    : [];
  const who = household === 'anyone' ? 'renter households' : HOUSEHOLD_NOUN[household];
  if (!sums) return { types, bedrooms: household === 'families' ? 2 : 1, seniorAlone: false, sentence: `Household types ${phrase} are ${NA}.`, available: false };
  if (types.length === 0) return { types, bedrooms: household === 'families' ? 2 : 1, seniorAlone: false, sentence: `CHAS counts no ${who} ${phrase} here.`, available: false };
  const lead = types[0];
  const bedrooms = household === 'seniors' ? 1 : TYPE_BEDROOMS[lead.type];
  const seniorAlone = lead.type === 'elderly_alone';
  const total = types.reduce((a, t) => a + t.count, 0);
  const parts = types.map((t) => `${fmtHouseholds(t.count)} ${t.label}`);
  const sumText = types.length > 1 ? ` (${types.map((t) => fmtHouseholds(t.count)).join(' + ')} = ${fmtHouseholds(total)} ${who})` : '';
  const head = household === 'anyone' ? capitalize(phrase) : `You chose ${household}: ${phrase}`;
  const size = household === 'anyone' ? `The largest group, ${lead.label}, sets the home size` : 'Home size';
  const sentence = `${head}, CHAS counts ${joinAnd(parts)}${sumText}. ${size}: ${bedroomsWord(bedrooms, seniorAlone)}.`;
  return { types, bedrooms, seniorAlone, sentence, available: true };
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
