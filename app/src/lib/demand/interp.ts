// Counts below a cut in bracketed census tables (income brackets in B25118, rent brackets in B25068): every whole
// bracket under the cut, plus a straight-line share of the bracket the cut falls in. The open top bracket is never
// split, so a cut inside it gives a lower bound.
import { isNum } from '../place/format';

export interface BelowCut {
  value: number | null;
  /** The cut fell in the open top bracket: `value` counts the closed brackets only. */
  lowerBound: boolean;
  /** "1,240 + 0.40 × 310 = 1,364" */
  formula: string;
}

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');

/** `counts[i]` lies between `edges[i]` and `edges[i + 1]`; the last edge is null (open). */
export function belowCut(counts: (number | null)[], edges: (number | null)[], cut: number): BelowCut {
  if (!isNum(cut) || counts.length === 0 || edges.length !== counts.length + 1) return { value: null, lowerBound: false, formula: '' };
  if (counts.some((c) => !isNum(c))) return { value: null, lowerBound: false, formula: '' };
  let whole = 0;
  for (let i = 0; i < counts.length; i++) {
    const lo = edges[i] as number;
    const hi = edges[i + 1];
    const c = counts[i] as number;
    if (hi != null && cut >= hi) {
      whole += c;
      continue;
    }
    if (hi == null) {
      // The cut is inside the open top bracket: no straight line to draw.
      return cut > lo ? { value: whole, lowerBound: true, formula: `${n0(whole)} or more (the top bracket starts at ${n0(lo)})` } : { value: whole, lowerBound: false, formula: n0(whole) };
    }
    if (cut <= lo) return { value: whole, lowerBound: false, formula: n0(whole) };
    const frac = (cut - lo) / (hi - lo);
    const value = whole + frac * c;
    return { value, lowerBound: false, formula: `${n0(whole)} + ${frac.toFixed(2)} × ${n0(c)} = ${n0(value)}` };
  }
  return { value: whole, lowerBound: false, formula: n0(whole) };
}
