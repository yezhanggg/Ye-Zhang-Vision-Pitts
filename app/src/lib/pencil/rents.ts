// Rents the pencil collects. Tax credit homes: 30% of the HUD MTSP income limit ÷ 12 at 1.5 persons a bedroom (a
// studio counts one person; a half person takes the mean of the two neighboring limits), rounded down, less the
// utility allowance. Market homes: the tract's 2-bedroom asking rent (or the ZIP's Small Area FMR), scaled to each
// size by the ZIP's Small Area FMR ratios. A tax credit rent never goes above the market rent for the same size.
import { confUsable } from '../place/afford';
import { isNum } from '../place/format';
import type { HudTable, PlaceMeasures } from '../place/types';
import type { DefaultsFile } from './inputs';

export type Level = '30' | '50' | '60' | '80';
export const personsFor = (br: number) => (br <= 0 ? 1 : 1.5 * br);
const n0 = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;

export function mtspLimit(mtsp: DefaultsFile['mtsp'], level: Level, persons: number): number | null {
  const t = mtsp.l[level];
  const lo = Math.floor(persons);
  const a = t?.[lo - 1];
  if (!isNum(a)) return null;
  if (persons === lo) return a;
  const b = t[lo];
  return isNum(b) ? (a + b) / 2 : null;
}

export interface Rent {
  gross: number;
  net: number;
  formula: string;
}

export function taxCreditRent(mtsp: DefaultsFile['mtsp'], level: Level, br: number, ua: number): Rent | null {
  const persons = personsFor(br);
  const limit = mtspLimit(mtsp, level, persons);
  if (limit == null) return null;
  const gross = Math.floor((limit * 0.3) / 12);
  const net = Math.max(0, gross - ua);
  return { gross, net, formula: `${n0(limit)} (${persons} ${persons === 1 ? 'person' : 'persons'}, ${level}% MTSP) × 30% ÷ 12 = ${n0(gross)} − ${n0(ua)} utilities = ${n0(net)}` };
}

export interface MarketRents {
  rents: [number, number, number, number] | null;
  formula: string;
}

/** Market rent by size: 2-bedroom asking rent (medium or high confidence) or the ZIP SAFMR, times the ZIP's SAFMR ratio for each size. */
export function marketRents(place: PlaceMeasures, hud: HudTable): MarketRents {
  const m = place.market;
  const zip = m?.zip ?? null;
  const safmr = zip ? hud.safmr?.[zip] ?? null : null;
  const base = isNum(m?.asking_2br) && confUsable(m?.asking_conf) ? { v: m!.asking_2br!, word: '2-bedroom asking rent' } : isNum(m?.safmr_2br) ? { v: m!.safmr_2br!, word: 'ZIP Small Area FMR, 2-bedroom' } : null;
  if (!base) return { rents: null, formula: 'no asking rent or Small Area FMR here' };
  if (!safmr || !isNum(safmr[2]) || safmr[2] <= 0) return { rents: [base.v, base.v, base.v, base.v], formula: `${base.word} ${n0(base.v)} for every size (no SAFMR ratios)` };
  const r = [0, 1, 2, 3].map((b) => Math.round((base.v * safmr[b]) / safmr[2])) as [number, number, number, number];
  return { rents: r, formula: `${base.word} ${n0(base.v)} × the ZIP ${zip} SAFMR ratio for each size (${[0, 1, 2, 3].map((b) => (safmr[b] / safmr[2]).toFixed(2)).join(', ')})` };
}
