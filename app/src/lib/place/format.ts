// Number formats for the place blocks: households as published, dollars "$1,243", shares as whole percent,
// miles to two decimals, "±" when a band's margin of error is at least half its estimate.
import { THRESHOLDS } from './thresholds';

export const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export const NA = 'not available';

/** Round half to even (the convention the pipeline's Python `round` uses), so 1242.5 → 1242 and 1987.5 → 1988. */
export function roundHalfEven(x: number): number {
  const f = Math.floor(x);
  const diff = x - f;
  if (diff > 0.5) return f + 1;
  if (diff < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}

export const fmtDollars = (v: number | null | undefined): string => (isNum(v) ? `$${Math.round(v).toLocaleString('en-US')}` : NA);
export const fmtHouseholds = (v: number | null | undefined): string => (isNum(v) ? Math.round(v).toLocaleString('en-US') : NA);
export const fmtCount = fmtHouseholds;
/** A share (0–1) as a whole percent. */
export const fmtShare = (v: number | null | undefined): string => (isNum(v) ? `${Math.round(v * 100)}%` : NA);
/** A percent already on 0–100, whole. */
export const fmtPct100 = (v: number | null | undefined): string => (isNum(v) ? `${Math.round(v)}%` : NA);
/** A percent already on 0–100, one decimal (FEMA and HAND shares are published that way). */
export const fmtPct100d1 = (v: number | null | undefined): string => (isNum(v) ? `${v.toFixed(1)}%` : NA);
export const fmtMiles = (v: number | null | undefined): string => (isNum(v) ? `${v.toFixed(2)} miles` : NA);
export const fmtScore = (v: number | null | undefined): string => (isNum(v) ? v.toFixed(2) : NA);

/** True when the margin of error is at least half the estimate. */
export const moeFlag = (hh: number | null | undefined, moe: number | null | undefined): boolean => isNum(hh) && isNum(moe) && hh > 0 && moe >= THRESHOLDS.moe_flag_share * hh;

/** "435" or, when the margin of error is at least half the estimate, "435 ±171". */
export function fmtEst(hh: number | null | undefined, moe: number | null | undefined): string {
  if (!isNum(hh)) return NA;
  return moeFlag(hh, moe) ? `${fmtHouseholds(hh)} ±${fmtHouseholds(moe)}` : fmtHouseholds(hh);
}
/** "435 ±171" whenever a margin of error exists (for tables). */
export function fmtEstMoe(hh: number | null | undefined, moe: number | null | undefined): string {
  if (!isNum(hh)) return NA;
  return isNum(moe) ? `${fmtHouseholds(hh)} ±${fmtHouseholds(moe)}` : fmtHouseholds(hh);
}

export const joinAnd = (xs: string[]): string => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

export const plural = (n: number, one: string, many: string) => (Math.round(n) === 1 ? one : many);

export const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
