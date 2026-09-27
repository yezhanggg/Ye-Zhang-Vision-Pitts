// Pure helpers behind the summary panels: distributions, ranks, compositions and time series. No React, no data
// imports, so they are testable in node; the panels hand in the values they already have.
import type { Estimate, ValueMap } from './types';

export const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export interface Histogram {
  /** k+1 edges, first = min, last = max. */
  edges: number[];
  counts: number[];
  n: number;
}

/** Equal-width histogram of the finite values (k bins). Empty when fewer than two distinct values. */
export function histogram(values: Iterable<number | null | undefined>, k = 12): Histogram {
  const xs = [...values].filter(isNum);
  const empty = { edges: [], counts: [], n: xs.length };
  if (xs.length < 2) return empty;
  let lo = Infinity, hi = -Infinity;
  for (const x of xs) {
    if (x < lo) lo = x;
    if (x > hi) hi = x;
  }
  if (hi <= lo) return empty;
  const width = (hi - lo) / k;
  const edges = Array.from({ length: k + 1 }, (_, i) => lo + i * width);
  const counts = new Array<number>(k).fill(0);
  for (const x of xs) counts[Math.min(k - 1, Math.floor((x - lo) / width))]++;
  return { edges, counts, n: xs.length };
}

/** Which bin of a histogram a value falls in, or null when outside. */
export function binOf(h: Histogram, v: number | null | undefined): number | null {
  if (!isNum(v) || h.edges.length < 2) return null;
  const lo = h.edges[0], hi = h.edges[h.edges.length - 1];
  if (v < lo || v > hi) return null;
  const k = h.counts.length;
  return Math.min(k - 1, Math.floor(((v - lo) / (hi - lo)) * k));
}

export interface Rank {
  /** 1 = highest value. */
  rank: number;
  n: number;
  /** Share of peers with a lower value (0–1). */
  pct: number;
}

/** Rank of a value among peers (ties share the better rank); null without a finite value or peers. */
export function rankOf(value: number | null | undefined, peers: Iterable<number | null | undefined>): Rank | null {
  if (!isNum(value)) return null;
  const xs = [...peers].filter(isNum);
  if (xs.length === 0) return null;
  let above = 0, below = 0;
  for (const x of xs) {
    if (x > value) above++;
    else if (x < value) below++;
  }
  return { rank: above + 1, n: xs.length, pct: below / xs.length };
}

export interface Part {
  id: string;
  value: number | null;
}

/** Shares for a composition, plus an "other" remainder so the parts sum to 1 when the inputs allow it. */
export function composition(unit: Record<string, Estimate> | null | undefined, ids: string[], withOther = true): Part[] {
  const parts: Part[] = ids.map((id) => ({ id, value: isNum(unit?.[id]?.est) ? (unit![id].est as number) : null }));
  if (!withOther) return parts;
  const known = parts.filter((p) => p.value != null);
  if (known.length === 0) return parts;
  const sum = known.reduce((s, p) => s + (p.value as number), 0);
  parts.push({ id: 'other', value: Math.round(Math.max(0, Math.min(1, 1 - sum)) * 1e6) / 1e6 });
  return parts;
}

export interface Series {
  years: number[];
  est: (number | null)[];
  moe: (number | null)[] | null;
}

export interface Change {
  from: { year: number; value: number };
  to: { year: number; value: number };
  /** Relative change to → from, null when the start is 0. */
  pct: number | null;
  diff: number;
}

/** First and last finite points of a series and the change between them. */
export function change(s: Series | null | undefined): Change | null {
  if (!s) return null;
  let a = -1, b = -1;
  for (let i = 0; i < s.years.length; i++) {
    if (isNum(s.est[i])) {
      if (a < 0) a = i;
      b = i;
    }
  }
  if (a < 0 || a === b) return null;
  const from = s.est[a] as number, to = s.est[b] as number;
  return { from: { year: s.years[a], value: from }, to: { year: s.years[b], value: to }, pct: from !== 0 ? to / from - 1 : null, diff: to - from };
}

/** Highest and lowest k units of a value map (finite values only), as [geoid, value] pairs. */
export function topBottom(values: ValueMap, k = 5): { top: [string, number][]; bottom: [string, number][] } {
  const rows: [string, number][] = [];
  for (const [id, e] of values) if (isNum(e.est)) rows.push([id, e.est]);
  rows.sort((x, y) => y[1] - x[1]);
  return { top: rows.slice(0, k), bottom: rows.slice(-k).reverse() };
}

/** Nice axis ticks: 3–5 round values spanning the data (0 included when the data is all positive and near it). */
export function niceTicks(lo: number, hi: number, n = 4): number[] {
  if (!isNum(lo) || !isNum(hi)) return [];
  if (hi <= lo) return [lo];
  const span = hi - lo;
  const raw = span / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const start = Math.floor(lo / step) * step;
  const out: number[] = [];
  for (let v = start, i = 0; i < 50; v += step, i++) {
    out.push(Math.round(v * 1e6) / 1e6);
    if (v >= hi) break; // the last tick is the first round value at or past the data
  }
  return out;
}
