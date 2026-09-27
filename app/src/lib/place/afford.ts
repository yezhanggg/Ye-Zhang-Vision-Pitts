// Affordability arithmetic (plan §3 "Price" and "Market test"). Every dollar figure carries its formula.
import { fmtDollars, isNum, roundHalfEven, NA } from './format';
import { THRESHOLDS } from './thresholds';
import type { BandId, Bedrooms, Conf, HudTable } from './types';

export const BAND_ORDER: BandId[] = ['le30', 'b30_50', 'b50_80', 'b80_100', 'gt100'];

/** The HUD limit that caps each band; 80–100% has no published limit below the median, >100% has none. */
export const BAND_PCT: Record<BandId, 30 | 50 | 80 | 100 | null> = { le30: 30, b30_50: 50, b50_80: 80, b80_100: 100, gt100: null };

export const BAND_LABEL: Record<BandId, string> = {
  le30: '≤30% AMI',
  b30_50: '30–50% AMI',
  b50_80: '50–80% AMI',
  b80_100: '80–100% AMI',
  gt100: '>100% AMI',
};

/** Longer wording for sentences ("at or below 30% of area median income"). */
export const BAND_PHRASE: Record<BandId, string> = {
  le30: 'at or below 30% of area median income',
  b30_50: 'between 30% and 50% of area median income',
  b50_80: 'between 50% and 80% of area median income',
  b80_100: 'between 80% and 100% of area median income',
  gt100: 'above area median income',
};

/** Bands at or below a given percent of AMI. */
export function bandsUpTo(pct: 30 | 50 | 80): BandId[] {
  return pct === 30 ? ['le30'] : pct === 50 ? ['le30', 'b30_50'] : ['le30', 'b30_50', 'b50_80'];
}

/** HUD convention: 1.5 persons per bedroom; a studio counts one person. */
export function personsForBedrooms(br: Bedrooms): number {
  return br === 0 ? 1 : br * THRESHOLDS.persons_per_bedroom;
}

const table = (hud: HudTable, pct: 30 | 50 | 80): number[] => (pct === 30 ? hud.metro.il30 : pct === 50 ? hud.metro.il50 : hud.metro.il80);

/** HUD family-size factors on the four-person figure, used only for the 100% line (HUD publishes no 100% table). */
const FAMILY_SIZE_FACTOR = [0.7, 0.8, 0.9, 1.0, 1.08, 1.16, 1.24, 1.32];

/** Income limit at `pct` of AMI for a household of `persons`; half persons are the mean of the two neighbouring sizes. */
export function limitFor(hud: HudTable, pct: 30 | 50 | 80, persons: number): number | null {
  const t = table(hud, pct);
  if (!Array.isArray(t) || !isNum(persons) || persons < 1) return null;
  const lo = Math.floor(persons);
  const frac = persons - lo;
  const a = t[lo - 1];
  if (!isNum(a)) return null;
  if (frac === 0) return a;
  const b = t[lo];
  if (!isNum(b)) return null;
  return (a + b) / 2;
}

/** The 100% line: median × HUD family-size factor, rounded to $50 (a derivation, not a published limit). */
export function limitAt100(hud: HudTable, persons: number): number | null {
  if (!isNum(hud.metro.median) || !isNum(persons) || persons < 1) return null;
  const lo = Math.floor(persons);
  const frac = persons - lo;
  const fa = FAMILY_SIZE_FACTOR[lo - 1];
  if (fa == null) return null;
  const fb = frac === 0 ? fa : FAMILY_SIZE_FACTOR[lo];
  if (fb == null) return null;
  const f = frac === 0 ? fa : (fa + fb) / 2;
  return Math.round((hud.metro.median * f) / 50) * 50;
}

/** The four-person income that caps a band (shown beside each band in block A); >100% has no cap. */
export function bandLimit4p(hud: HudTable, band: BandId): number | null {
  const pct = BAND_PCT[band];
  if (pct == null) return null;
  if (pct === 100) return isNum(hud.metro.median) ? hud.metro.median : null;
  return limitFor(hud, pct, 4);
}

/** "($23,200 + $26,500) ÷ 2 = $24,850" for a half-person household, else null. */
export function limitFormula(hud: HudTable, pct: 30 | 50 | 80, persons: number): string | null {
  const lo = Math.floor(persons);
  if (persons - lo === 0) return null;
  const t = table(hud, pct);
  const a = t?.[lo - 1], b = t?.[lo];
  if (!isNum(a) || !isNum(b)) return null;
  return `(${fmtDollars(a)} + ${fmtDollars(b)}) ÷ 2 = ${fmtDollars((a + b) / 2)}`;
}

export interface Ceiling {
  /** Gross monthly rent, rounded to the dollar (half to even, as the pipeline rounds). */
  rent: number;
  limit: number;
  persons: number;
  /** "$49,700 × 30% ÷ 12 = $1,242" */
  formula: string;
  /** The half-person interpolation when it applies. */
  limitFormula: string | null;
  pct: 30 | 50 | 80;
  bedrooms: Bedrooms;
  seniorAlone: boolean;
}

/** Rent ceiling: 30% of the income limit, monthly. Household size = 1.5 persons per bedroom; a senior living alone = 1 person. */
export function ceilingRent(hud: HudTable, pct: 30 | 50 | 80, br: Bedrooms, seniorAlone = false): Ceiling | null {
  const persons = seniorAlone ? 1 : personsForBedrooms(br);
  const limit = limitFor(hud, pct, persons);
  if (limit == null) return null;
  // limit × 0.30 ÷ 12 = limit ÷ 40, exact for whole and half dollars.
  const rent = roundHalfEven(limit / 40);
  return {
    rent,
    limit,
    persons,
    formula: `${fmtDollars(limit)} × 30% ÷ 12 = ${fmtDollars(rent)}`,
    limitFormula: limitFormula(hud, pct, persons),
    pct,
    bedrooms: br,
    seniorAlone,
  };
}

export const CEILING_CAVEAT = 'gross rent, utility allowance not known';

export const confUsable = (c: Conf | null | undefined): boolean => c === 'high' || c === 'medium';

export type MarketVerdict = 'market_reaches' | 'needs_subsidy' | 'gap' | 'unknown';

export interface MarketTest {
  verdict: MarketVerdict;
  /** asking − ceiling in $/month when the asking rent is usable (0 when the market reaches the band); null otherwise. */
  gap: number | null;
  sentence: string;
  /** The asking rent the test used, or null when it was missing or low-confidence. */
  askingUsed: number | null;
}

/**
 * Market test (plan §3): asking 2BR (confidence medium or better) against the ceiling.
 * At or below → the market already reaches this band on turnover. Above, with the ceiling below the ZIP SAFMR and the
 * asking rent within it → new homes need a voucher or project-based subsidy (a voucher's payment standard reaches the
 * rent). Otherwise the gap in $/month is the answer. Nothing is imputed when the asking rent is missing.
 */
export function marketTest(ceiling: number, asking: number | null, askingConf: Conf | null, safmr: number | null): MarketTest {
  const usable = isNum(asking) && confUsable(askingConf);
  const safmrText = isNum(safmr) ? `the ZIP Fair Market Rent ${fmtDollars(safmr)}` : 'the ZIP Fair Market Rent (not available)';
  if (!isNum(ceiling)) {
    return { verdict: 'unknown', gap: null, sentence: 'No rent ceiling applies to this band, so the market test does not run.', askingUsed: null };
  }
  if (!usable) {
    const why = isNum(asking) ? `the asking rent ${fmtDollars(asking)} has low confidence and is not used` : `asking rent ${NA}`;
    if (isNum(safmr) && ceiling < safmr) {
      return {
        verdict: 'needs_subsidy',
        gap: null,
        sentence: `Market test: ${why}; the ${fmtDollars(ceiling)} ceiling sits below ${safmrText} (${fmtDollars(safmr)} − ${fmtDollars(ceiling)} = ${fmtDollars(safmr - ceiling)}), so new homes at this price need a voucher or project-based subsidy.`,
        askingUsed: null,
      };
    }
    return { verdict: 'unknown', gap: null, sentence: `Market test: ${why}; ${safmrText}. The market test cannot run.`, askingUsed: null };
  }
  const a = asking as number;
  if (a <= ceiling) {
    return {
      verdict: 'market_reaches',
      gap: 0,
      sentence: `Listings ask ${fmtDollars(a)} for a 2-bedroom, at or below the ${fmtDollars(ceiling)} ceiling (${fmtDollars(ceiling)} − ${fmtDollars(a)} = ${fmtDollars(ceiling - a)} of room): the market already reaches this band on turnover.`,
      askingUsed: a,
    };
  }
  const gap = a - ceiling;
  const gapText = `${fmtDollars(a)} − ${fmtDollars(ceiling)} = ${fmtDollars(gap)} a month`;
  if (isNum(safmr) && ceiling < safmr && a <= safmr) {
    return {
      verdict: 'needs_subsidy',
      gap,
      sentence: `Listings ask ${fmtDollars(a)} for a 2-bedroom, ${gapText} above the ceiling; the ceiling sits below ${safmrText}, and a voucher pays up to that, so new homes at this price need a voucher or project-based subsidy.`,
      askingUsed: a,
    };
  }
  const beyond = isNum(safmr) ? (a > safmr ? `, and above ${safmrText}, so a voucher alone does not reach it` : `; the ceiling is at or above ${safmrText}`) : `; ${safmrText}`;
  return {
    verdict: 'gap',
    gap,
    sentence: `Listings ask ${fmtDollars(a)} for a 2-bedroom; gap ${gapText} above the ceiling${beyond}.`,
    askingUsed: a,
  };
}
