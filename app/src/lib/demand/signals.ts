// Renter demand signals (docs/assumptions.md §15): five shares of renter households, read for the tract against the
// city. A signal counts only when the gap clears a printed margin AND the tract's 90% margin of error (the city's is
// small enough to ignore). Where the tract's margin is too wide to tell, the tract's ZIP code (the whole census ZCTA)
// is read instead. Growth and rent over income are shown beside them as context and never counted.
import { capitalize, fmtShare, isNum } from '../place/format';
import type { DemandUnit, Share, ShareKey } from './types';

export type Direction = 'up' | 'down';

/** How far from the city a share must be to count, in share points (0.05 = 5 points). */
export const SIGNAL_MARGIN: Record<ShareKey, number> = { renter: 0.05, one_person: 0.05, large5: 0.02, age65: 0.05, small_bldg: 0.1 };

export const SIGNAL_KEYS: ShareKey[] = ['renter', 'one_person', 'large5', 'age65', 'small_bldg'];

export const SIGNAL_LABEL: Record<ShareKey, string> = {
  renter: 'Households that rent',
  one_person: 'Renter households of one person',
  large5: 'Renter households of 5 or more',
  age65: 'Renter householders 65 or older',
  small_bldg: 'Renter homes in 1–4 unit buildings',
};

/** Short labels for narrow tables. */
export const SIGNAL_SHORT: Record<ShareKey, string> = {
  renter: 'Renting households',
  one_person: 'One-person renters',
  large5: 'Renters, 5+ people',
  age65: 'Renters 65+',
  small_bldg: 'Renters in 1–4 units',
};

/** The table each share comes from. */
export const SIGNAL_TABLE: Record<ShareKey, string> = { renter: 'B25009', one_person: 'B25009', large5: 'B25009', age65: 'B25007', small_bldg: 'B25032' };

export interface Signal {
  key: ShareKey;
  dir: Direction | null;
  /** Which figure decided it. */
  from: 'tract' | 'zip' | null;
  tract: Share | null;
  zip: Share | null;
  city: number | null;
  /** "61% ±7 in the tract against 52% citywide: 9 points above, more than the 5-point mark and the margin of error" */
  sentence: string;
}

const pts = (d: number) => `${Math.round(Math.abs(d) * 100)} point${Math.round(Math.abs(d) * 100) === 1 ? '' : 's'}`;
const withMoe = (s: Share) => `${fmtShare(s[0])}${isNum(s[1]) ? ` ±${Math.round(s[1] * 100)}` : ''}`;

/** Up, down or null for one share against the city value. */
export function decide(s: Share | null | undefined, city: number | null, margin: number): Direction | null {
  if (!s || !isNum(s[0]) || !isNum(city)) return null;
  const d = s[0] - city;
  if (Math.abs(d) < margin) return null;
  if (isNum(s[1]) && Math.abs(d) <= s[1]) return null;
  return d > 0 ? 'up' : 'down';
}

export function readSignal(key: ShareKey, tract: DemandUnit | null, zip: DemandUnit | null, city: DemandUnit): Signal {
  const c = city.shares[key]?.[0] ?? null;
  const t = tract?.shares[key] ?? null;
  const z = zip?.shares[key] ?? null;
  const m = SIGNAL_MARGIN[key];
  const mark = `the ${Math.round(m * 100)}-point mark`;
  const base = { key, tract: t, zip: z, city: c };
  if (!isNum(c)) return { ...base, dir: null, from: null, sentence: 'City figure not available.' };
  const dt = decide(t, c, m);
  if (dt) {
    const d = (t![0] as number) - c;
    return { ...base, dir: dt, from: 'tract', sentence: `${withMoe(t!)} in the tract against ${fmtShare(c)} citywide: ${pts(d)} ${dt === 'up' ? 'above' : 'below'}, past ${mark} and the margin of error.` };
  }
  const dz = decide(z, c, m);
  const tractWhy = !t || !isNum(t[0]) ? 'the tract figure is not available' : Math.abs(t[0] - c) < m ? `the tract (${withMoe(t)}) is within ${mark}` : `the tract's margin of error (${withMoe(t)}) is too wide to tell`;
  if (dz) {
    const d = (z![0] as number) - c;
    return { ...base, dir: dz, from: 'zip', sentence: `${capitalize(tractWhy)}, so the ZIP code is read: ${withMoe(z!)} against ${fmtShare(c)} citywide, ${pts(d)} ${dz === 'up' ? 'above' : 'below'}.` };
  }
  const zipWhy = !z || !isNum(z[0]) ? 'the ZIP figure is not available' : Math.abs(z[0] - c) < m ? `the ZIP code (${withMoe(z)}) is within it too` : `the ZIP code's margin (${withMoe(z)}) is too wide as well`;
  return { ...base, dir: null, from: null, sentence: `Near the city's ${fmtShare(c)}: ${tractWhy}, and ${zipWhy}.` };
}

export function signalsFor(tract: DemandUnit | null, zip: DemandUnit | null, city: DemandUnit): Signal[] {
  return SIGNAL_KEYS.map((k) => readSignal(k, tract, zip, city));
}

/** Growth in renter households 2014 → 2024 (households × renter share, both years on 2020 geography). */
export function renterGrowth(u: DemandUnit | null): number | null {
  const g = u?.g?.renters;
  if (!g || !isNum(g[0]) || !isNum(g[1]) || g[0] <= 0) return null;
  return g[1] / g[0] - 1;
}
