// Choropleth classes, formats and reliability for the data browser. Pure functions (tested in bins.test.ts).
import { NO_DATA } from '../mapStyle';
import type { MapPaint } from '../paint';
import type { Conf } from '../types';
import type { Estimate, Unit, ValueMap } from './types';

export { NO_DATA };
/** Five blues, light → dark, so browser values never read as match scores (warm) or factors (green). */
export const BROWSE_PALETTE = ['#e8f1f8', '#b9d5ea', '#7fb2d6', '#3f83b5', '#164f7f'];

export const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Min and max of the finite values, or null when there are none. */
export function extent(values: Iterable<number | null | undefined>): [number, number] | null {
  let lo = Infinity, hi = -Infinity;
  for (const v of values) {
    if (!finite(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return lo <= hi ? [lo, hi] : null;
}

/**
 * Inner quantile breaks for `k` classes (k − 1 values, linear interpolation between order statistics).
 * Tied quantiles collapse to one break and a break at the maximum is dropped, so every class can hold a value.
 */
export function quantileBreaks(values: Iterable<number | null | undefined>, k = 5): number[] {
  const xs = [...values].filter(finite).sort((a, b) => a - b);
  if (xs.length < 2 || k < 2) return [];
  const max = xs[xs.length - 1];
  const out: number[] = [];
  for (let i = 1; i < k; i++) {
    const pos = (i / k) * (xs.length - 1);
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    const q = xs[lo] + (xs[hi] - xs[lo]) * (pos - lo);
    if (q >= max) break;
    if (out.length === 0 || q > out[out.length - 1]) out.push(q);
  }
  return out;
}

/** Class index 0…breaks.length (value ≤ break → that class), null for missing values. */
export function classify(v: number | null | undefined, breaks: number[]): number | null {
  if (!finite(v)) return null;
  let i = 0;
  while (i < breaks.length && v > breaks[i]) i++;
  return i;
}

/** `n` colors spread over the palette (all five for five classes; fewer classes skip evenly). */
export function paletteFor(n: number, palette = BROWSE_PALETTE): string[] {
  if (n <= 0) return [];
  if (n === 1) return [palette[Math.floor(palette.length / 2)]];
  if (n >= palette.length) return palette.slice(0, n);
  return Array.from({ length: n }, (_, i) => palette[Math.round((i * (palette.length - 1)) / (n - 1))]);
}

export const estimates = (values: ValueMap): (number | null)[] => [...values.values()].map((e) => e.est);

/** MapPaint for an overlay: one category per class (feature-state `k`), null → no-data grey. */
export function browsePaint(values: ValueMap | Map<string, number | null>, breaks: number[]): MapPaint {
  const out = new Map<string, number | null>();
  for (const [id, v] of values) out.set(id, classify(typeof v === 'number' || v == null ? v : v.est, breaks));
  return { kind: 'cat', palette: paletteFor(breaks.length + 1), values: out };
}

// ------------------------------------------------------------------ formats
const int = (v: number) => Math.round(v).toLocaleString('en-US');

/** usd $1,230 · count 2,337 · share 52.0% · years 1948 · age 36.2 · missing — */
export function fmtValue(v: number | null | undefined, unit: Unit): string {
  if (!finite(v)) return '—';
  switch (unit) {
    case 'usd':
      return `$${int(v)}`;
    case 'count':
      return int(v);
    case 'share':
      return `${(v * 100).toFixed(1)}%`;
    case 'years':
      return String(Math.round(v));
    case 'age':
      return v.toFixed(1);
  }
}

/** The margin without its ± sign: usd $55 · count 55 · share 4.1 pts · years 3 · age 2.5 */
export function fmtMoe(moe: number | null | undefined, unit: Unit): string {
  if (!finite(moe)) return '—';
  switch (unit) {
    case 'usd':
      return `$${int(moe)}`;
    case 'count':
      return int(moe);
    case 'share':
      return `${(moe * 100).toFixed(1)} pts`;
    case 'years':
      return String(Math.round(moe));
    case 'age':
      return moe.toFixed(1);
  }
}

/** "52.0% ± 4.1 pts"; the estimate alone when the margin is unpublished; — when the estimate is missing. */
export function fmtEstimate(e: Estimate | null | undefined, unit: Unit): string {
  if (!e || !finite(e.est)) return '—';
  return finite(e.moe) ? `${fmtValue(e.est, unit)} ± ${fmtMoe(e.moe, unit)}` : fmtValue(e.est, unit);
}

/** Compact legend tick: large dollar and count values shorten to k / M; everything else is fmtValue. */
export function fmtTick(v: number | null | undefined, unit: Unit): string {
  if (!finite(v)) return '—';
  if ((unit === 'usd' || unit === 'count') && Math.abs(v) >= 10_000) {
    const p = unit === 'usd' ? '$' : '';
    if (Math.abs(v) >= 1_000_000) return `${p}${(v / 1_000_000).toFixed(Math.abs(v) >= 10_000_000 ? 0 : 1)}M`;
    return `${p}${Math.round(v / 1000)}k`;
  }
  if (unit === 'share') return `${Math.round(v * 100)}%`;
  return fmtValue(v, unit);
}

// ------------------------------------------------------------------ reliability
export interface ReliabilityThresholds {
  high: number;
  medium: number;
}
export const DEFAULT_RELIABILITY: ReliabilityThresholds = { high: 0.15, medium: 0.3 };

/** cv < 0.15 high · ≤ 0.30 medium · above low · unpublished null */
export function reliability(cv: number | null | undefined, t: ReliabilityThresholds = DEFAULT_RELIABILITY): Conf | null {
  if (!finite(cv)) return null;
  if (cv < t.high) return 'high';
  if (cv <= t.medium) return 'medium';
  return 'low';
}

export interface ReliabilityMix {
  high: number;
  medium: number;
  low: number;
  none: number;
  withData: number;
  total: number;
}
export function reliabilityMix(values: ValueMap, t: ReliabilityThresholds = DEFAULT_RELIABILITY): ReliabilityMix {
  const mix: ReliabilityMix = { high: 0, medium: 0, low: 0, none: 0, withData: 0, total: 0 };
  for (const e of values.values()) {
    mix.total++;
    if (!finite(e.est)) {
      mix.none++;
      continue;
    }
    mix.withData++;
    const r = reliability(e.cv, t);
    if (r) mix[r]++;
    else mix.none++;
  }
  return mix;
}

// ------------------------------------------------------------------ legend geometry
/**
 * Where a value sits along a ramp of equal-width class swatches (0 = left edge, 1 = right edge).
 * Inside a class the position is linear between the class bounds; the outer bounds come from `ext` (min, max)
 * or, without it, the outer classes use their midpoint. Values beyond the extent clamp to the edges.
 */
export function refPosition(value: number | null | undefined, breaks: number[], ext?: [number, number] | null): number | null {
  if (!finite(value)) return null;
  const n = breaks.length + 1;
  const c = classify(value, breaks) ?? 0;
  const lo = c === 0 ? ext?.[0] : breaks[c - 1];
  const hi = c === n - 1 ? ext?.[1] : breaks[c];
  let frac = 0.5;
  if (finite(lo) && finite(hi)) frac = hi > lo ? (value - lo) / (hi - lo) : 0.5;
  else if (finite(lo) && value <= lo) frac = 0;
  else if (finite(hi) && value >= hi) frac = 1;
  frac = Math.max(0, Math.min(1, frac));
  return Math.max(0, Math.min(1, (c + frac) / n));
}
