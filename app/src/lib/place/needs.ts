// "What I need" (plan Tier 2.4): arithmetic only. A count of homes and a target population become a required rent,
// the qualifying households, the share reached, and the scale each type implies. No pro forma, no hash key.
import { BAND_LABEL, CEILING_CAVEAT, bandsUpTo, ceilingRent, confUsable } from './afford';
import { sumBands, sumTypes } from './bands';
import { REFUSES } from './copy';
import { fmtCount, fmtDollars, fmtShare, isNum, NA } from './format';
import { TYPOLOGIES, TYPOLOGY_LABEL } from './thresholds';
import type { Bedrooms, HudTable, PlaceMeasures, Typology } from './types';

export type Population = 'seniors' | 'families' | 'all';

export interface NeedsInput {
  homes: number | null;
  population: Population;
  band: 30 | 50 | 80;
}

export interface NeedsResult {
  /** The rent ceiling for the population's home size at the band (seniors: 1BR for one person; families and all: 2BR). */
  requiredRent: number | null;
  requiredRentFormula: string | null;
  /** Households of that population at or below the band (CHAS counts as published). */
  qualifying: number | null;
  servedRatio: string;
  scaleByType: Record<Typology, string>;
  /** (asking 2BR − 2BR ceiling) × 12 × homes when the market asks more; 0 when it does not; null when a number is missing. */
  gapPerYear: number | null;
  gapSentence: string;
  refuses: string[];
  lines: string[];
}

const POP_LABEL: Record<Population, string> = { seniors: 'senior households', families: 'family households', all: 'renter households' };

/** Homes per building, low and high, for the scale sentence. */
const HOMES_PER: Record<Typology, [number, number]> = {
  adu: [1, 1],
  duplex_triplex: [2, 3],
  townhome: [1, 1],
  small_apartment: [5, 19],
  senior: [20, 60],
};

function scaleFor(t: Typology, homes: number): string {
  const [lo, hi] = HOMES_PER[t];
  const nHi = Math.ceil(homes / lo), nLo = Math.ceil(homes / hi);
  const range = nLo === nHi ? fmtCount(nLo) : `${fmtCount(nLo)}–${fmtCount(nHi)}`;
  switch (t) {
    case 'adu': return `${fmtCount(homes)} lots, one ADU each`;
    case 'duplex_triplex': return `${range} houses converted (2–3 homes each)`;
    case 'townhome': return `${fmtCount(homes)} rowhouses on ${fmtCount(homes)} lots (in rows of 4–8, ${fmtCount(Math.ceil(homes / 8))}–${fmtCount(Math.ceil(homes / 4))} rows)`;
    case 'small_apartment': return `${range} buildings of 5–19 homes`;
    case 'senior': return `${range} building${nHi === 1 ? '' : 's'} of 20–60 homes`;
  }
}

export function needsArithmetic(p: PlaceMeasures, hud: HudTable, input: NeedsInput): NeedsResult {
  const homes = isNum(input.homes) && input.homes > 0 ? Math.round(input.homes) : null;
  const bedrooms: Bedrooms = input.population === 'seniors' ? 1 : 2;
  const seniorAlone = input.population === 'seniors';
  const ceiling = ceilingRent(hud, input.band, bedrooms, seniorAlone);
  const requiredRent = ceiling?.rent ?? null;
  const requiredRentFormula = ceiling ? `${ceiling.limitFormula ? `${ceiling.limitFormula}; ` : ''}${ceiling.formula}` : null;

  const bands = bandsUpTo(input.band);
  let qualifying: number | null;
  if (input.population === 'all') qualifying = sumBands(p, bands).hh;
  else {
    const t = sumTypes(p, bands);
    if (!t) qualifying = null;
    else if (input.population === 'seniors') qualifying = (t.elderly_alone ?? 0) + (t.elderly_family ?? 0);
    else qualifying = (t.small_family ?? 0) + (t.large_family ?? 0);
  }

  const bandWord = `at or below ${input.band}% AMI`;
  let servedRatio: string;
  if (homes == null) servedRatio = 'Enter how many homes to see what share of the qualifying households they reach.';
  else if (qualifying == null) servedRatio = `${fmtCount(homes)} homes; qualifying ${POP_LABEL[input.population]} ${bandWord} ${NA}.`;
  else if (qualifying === 0) servedRatio = `${fmtCount(homes)} homes; CHAS counts no ${POP_LABEL[input.population]} ${bandWord} here.`;
  else {
    const units = Math.min(homes, qualifying);
    const ratio = `${fmtCount(units)} ÷ ${fmtCount(qualifying)} = ${fmtShare(units / qualifying)}`;
    servedRatio = homes > qualifying
      ? `${fmtCount(homes)} homes for ${fmtCount(qualifying)} qualifying ${POP_LABEL[input.population]} ${bandWord}: all of them (${ratio}), with ${fmtCount(homes - qualifying)} homes to spare.`
      : `${fmtCount(homes)} homes reach ${fmtCount(units)} of ${fmtCount(qualifying)} qualifying ${POP_LABEL[input.population]} ${bandWord} (${ratio}).`;
  }

  const scaleByType = Object.fromEntries(TYPOLOGIES.map((t) => [t, homes == null ? '—' : scaleFor(t, homes)])) as Record<Typology, string>;

  const m = p?.market;
  const twoBr = ceilingRent(hud, input.band, 2);
  const usable = isNum(m?.asking_2br) && confUsable(m?.asking_conf);
  let gapPerYear: number | null = null;
  let gapSentence: string;
  if (homes == null) gapSentence = 'Enter how many homes to see the yearly rent gap at 2-bedroom prices.';
  else if (!twoBr) gapSentence = `HUD income limits ${NA}; no rent gap.`;
  else if (!usable) gapSentence = `Asking rent ${isNum(m?.asking_2br) ? 'has low confidence' : NA}; the yearly rent gap cannot be measured.`;
  else {
    const asking = m!.asking_2br!;
    const perMonth = Math.max(0, asking - twoBr.rent);
    gapPerYear = perMonth * 12 * homes;
    gapSentence = perMonth === 0
      ? `Listings ask ${fmtDollars(asking)} for a 2-bedroom, at or below the ${twoBr.formula} ceiling: no rent gap on turnover.`
      : `Rent gap at 2-bedroom prices: (${fmtDollars(asking)} − ${fmtDollars(twoBr.rent)}) × 12 × ${fmtCount(homes)} = ${fmtDollars(gapPerYear)} a year (the only asking rent this tool has is for 2-bedrooms).`;
  }

  const lines = [
    requiredRent != null ? `Required rent: ${requiredRentFormula} a month (${seniorAlone ? 'a 1-bedroom for one person' : 'a 2-bedroom'} at ${input.band}% AMI, ${BAND_LABEL[input.band === 30 ? 'le30' : input.band === 50 ? 'b30_50' : 'b50_80']}; ${CEILING_CAVEAT}).` : `Required rent: HUD income limits ${NA}.`,
    qualifying != null ? `Who qualifies: ${fmtCount(qualifying)} ${POP_LABEL[input.population]} ${bandWord} (CHAS, as published).` : `Who qualifies: ${POP_LABEL[input.population]} ${bandWord} ${NA}.`,
    servedRatio,
    gapSentence,
    homes != null ? `Scale by type: ${TYPOLOGIES.map((t) => `${TYPOLOGY_LABEL[t]} — ${scaleByType[t]}`).join(' · ')}.` : 'Scale by type: enter how many homes.',
    `This tool does not know: ${REFUSES.join(', ')}.`,
  ];

  return { requiredRent, requiredRentFormula, qualifying, servedRatio, scaleByType, gapPerYear, gapSentence, refuses: REFUSES, lines };
}
