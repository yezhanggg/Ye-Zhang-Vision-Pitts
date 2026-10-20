// Market depth (docs/data/finder.md): how many homes with an income limit the renters near a place could fill. Renter
// households at or below 60% AMI in the city tracts within a mile (CHAS; the 60% line is interpolated across the
// 50–80% band), less the tax credit homes already within that mile (HUD), times a capture rate. The capture rate is an
// example input: 10%, with 5% and 15% shown beside it. A screening count, not a market study.
import type { DemandUnit } from './types';

export const CAPTURE = { value: 0.1, low: 0.05, high: 0.15 };

export interface Depth {
  /** Renter households at or below 60% AMI within the mile. */
  households: number;
  /** Tax credit homes already within the mile. */
  existing: number;
  /** Households not already in a tax credit home. */
  open: number;
  homes: number;
  low: number;
  high: number;
  capture: number;
  formula: string;
}

const n = (v: number) => Math.round(v).toLocaleString('en-US');

export function depthHomes(tract: DemandUnit | null | undefined, capture: number = CAPTURE.value): Depth | null {
  const d = tract?.depth;
  if (!d) return null;
  const existing = tract?.lihtc?.mile?.li_units ?? 0;
  const open = Math.max(0, d.le60 - existing);
  const at = (c: number) => Math.floor(open * c);
  return {
    households: d.le60,
    existing,
    open,
    homes: at(capture),
    low: at(CAPTURE.low),
    high: at(CAPTURE.high),
    capture,
    formula: `(${n(d.le50)} at or below 50% AMI + ⅓ × ${n(d.b50_80)} at 50–80% = ${n(d.le60)} renter households in ${d.tracts} tract${d.tracts === 1 ? '' : 's'} within a mile − ${n(existing)} tax credit homes) × ${Math.round(capture * 100)}% = ${n(at(capture))} homes`,
  };
}
