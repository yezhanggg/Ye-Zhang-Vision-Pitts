// Everything computed from data + weights. Code only; no model writes a number here.
import { useMemo } from 'react';
import { activeFactorIds, factorById, focusTracts, rankedTracts, scoring, tractById, tractLabel, typologyById } from './data';
import { rank, rankStability, scoreTract, type Stability, type TypologyScore } from './scoring';
import { FACTOR_COPY, factorName } from './copy';
import type { TractProps, Weights } from './types';

export interface TractResult {
  scores: TypologyScore[];
  ranking: string[];
  top: string | null;
  topScore: number | null;
}

const EMPTY: TractResult = { scores: [], ranking: [], top: null, topScore: null };

export function resultFor(t: TractProps, w: Weights): TractResult {
  if (!t.residential) return EMPTY;
  const scores = scoreTract(t, w, scoring);
  const ranking = rank(scores);
  const top = ranking[0] ?? null;
  return { scores, ranking, top, topScore: top ? (scores.find((s) => s.typology === top)!.score as number) : null };
}

const cache = new WeakMap<Weights, Map<string, TractResult>>();
/** Results for every ranked tract under a weight set, memoized per weights object. */
export function allResults(w: Weights): Map<string, TractResult> {
  let m = cache.get(w);
  if (!m) {
    m = new Map(rankedTracts.map((t) => [t.GEOID, resultFor(t, w)]));
    cache.set(w, m);
  }
  return m;
}
export const useAllResults = (w: Weights) => useMemo(() => allResults(w), [w]);

const stabCache = new WeakMap<Weights, Map<string, Stability | null>>();
export function stabilityFor(id: string, w: Weights): Stability | null {
  let m = stabCache.get(w);
  if (!m) {
    m = new Map();
    stabCache.set(w, m);
  }
  if (!m.has(id)) {
    const t = tractById.get(id);
    m.set(id, t && t.residential ? rankStability(t, w, scoring, parseInt(id.slice(-6), 10)) : null);
  }
  return m.get(id) ?? null;
}

export function topCounts(results: Map<string, TractResult>): Record<string, number> {
  const c: Record<string, number> = {};
  for (const r of results.values()) if (r.top) c[r.top] = (c[r.top] ?? 0) + 1;
  return c;
}

/** Tracts whose top pick differs between two result sets. */
export function flipsBetween(a: Map<string, TractResult>, b: Map<string, TractResult>): Set<string> {
  const s = new Set<string>();
  for (const [id, r] of a) {
    const o = b.get(id);
    if (r.top && o?.top && r.top !== o.top) s.add(id);
  }
  return s;
}

// --------------------------------------------------------------- narratives
export const fLabel = (f: string) => factorName(f, factorById.get(f)?.label);
export const tLabel = (k: string | null | undefined) => (k ? typologyById.get(k)?.label ?? k : '—');

/** Factors that push the top pick ahead of the runner-up. */
export function marginDrivers(r: TractResult) {
  if (!r.top) return [];
  const top = r.scores.find((s) => s.typology === r.top)!;
  const second = r.scores.find((s) => s.typology === r.ranking[1]);
  return top.parts
    .map((p) => {
      const q = second?.parts.find((z) => z.factor === p.factor);
      return { factor: p.factor, x: p.x, margin: p.contrib - (q?.contrib ?? 0), contrib: p.contrib };
    })
    .sort((a, b) => b.margin - a.margin);
}

export function describeFactor(f: string, x: number) {
  const c = FACTOR_COPY[f];
  if (f === 'subsidy_eligible') return x >= 0.5 ? 'eligibility for housing subsidies' : 'no subsidy designation';
  if (!c) return fLabel(f).toLowerCase();
  return x >= 0.5 ? c.high : c.low;
}

const joinAnd = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** One plain sentence from the top two score drivers. Used when no checked AI text is available. */
export function templateSummary(t: TractProps, r: TractResult): string {
  if (!t.residential) return `${tractLabel(t)} has fewer than 25 households, so no housing type is ranked here.`;
  if (!r.top) return `There is no factor data for ${tractLabel(t)}, so no housing type can be ranked.`;
  const d = marginDrivers(r).filter((x) => x.margin > 0).slice(0, 2);
  const second = r.ranking[1];
  const s2 = r.scores.find((s) => s.typology === second)?.score ?? 0;
  const gap = (r.topScore ?? 0) - s2;
  const why = d.length ? `, mainly because this area has ${joinAnd(d.map((x) => describeFactor(x.factor, x.x)))}` : '';
  const next = gap < 0.03 ? ` ${tLabel(second)} is a very close second.` : ` Next best is ${tLabel(second)} (${Math.round(s2 * 100)} / 100).`;
  return `${tLabel(r.top)} fits ${tractLabel(t)} best${why}.${next}`;
}

/** Two short phrases for a typology's strongest drivers ("subsidy eligibility · many low-income renters"). */
export function reasons(r: TractResult, k: string): string {
  const s = r.scores.find((x) => x.typology === k);
  if (!s) return '';
  return [...s.parts]
    .sort((a, b) => b.contrib - a.contrib)
    .filter((p) => p.contrib > 0.005)
    .slice(0, 2)
    .map((p) => {
      const c = FACTOR_COPY[p.factor];
      if (!c) return p.factor;
      if (p.factor === 'subsidy_eligible') return p.x >= 0.5 ? c.high : c.low;
      const lowSide = p.d < 0 || p.x < 0.34;
      return lowSide ? c.low : c.high;
    })
    .join(' · ');
}

export interface DeltaRow {
  factor: string;
  a: number | null;
  b: number | null;
  delta: number | null;
  gap: number;
}

/** Per-factor A−B difference and each factor's contribution to the gap in the top-pick score. */
export function factorDeltas(ta: TractProps, tb: TractProps, ra: TractResult, rb: TractResult): DeltaRow[] {
  const k = ra.top ?? rb.top;
  const sa = ra.scores.find((s) => s.typology === k);
  const sb = rb.scores.find((s) => s.typology === k);
  return activeFactorIds
    .map((f) => {
      const a = typeof ta[f] === 'number' ? (ta[f] as number) : null;
      const b = typeof tb[f] === 'number' ? (tb[f] as number) : null;
      const ca = sa?.parts.find((p) => p.factor === f)?.contrib ?? 0;
      const cb = sb?.parts.find((p) => p.factor === f)?.contrib ?? 0;
      return { factor: f, a, b, delta: a != null && b != null ? a - b : null, gap: ca - cb };
    })
    .sort((x, y) => Math.abs(y.gap) - Math.abs(x.gap));
}

export function compareTakeaway(ta: TractProps, tb: TractProps, ra: TractResult, rb: TractResult): string {
  if (!ra.top || !rb.top) return 'One of the two places is not ranked (no households or no factor data).';
  const A = tractLabel(ta), B = tractLabel(tb);
  const rows = factorDeltas(ta, tb, ra, rb).filter((r) => Math.abs(r.gap) > 0.002 && r.delta != null).slice(0, 2);
  const by = new Map<string, string[]>();
  for (const r of rows) {
    const c = FACTOR_COPY[r.factor];
    if (r.factor === 'subsidy_eligible') {
      const who = r.delta! > 0 ? A : B;
      by.set(who, [...(by.get(who) ?? []), 'subsidy eligibility the other lacks']);
      continue;
    }
    const who = r.delta! >= 0 ? A : B;
    by.set(who, [...(by.get(who) ?? []), c ? c.more : `higher ${fLabel(r.factor).toLowerCase()}`]);
  }
  const phr = [...by].map(([who, xs]) => `${who} has ${joinAnd(xs)}`);
  const because = phr.length ? ` Biggest difference: ${joinAnd(phr)}.` : '';
  if (ra.top === rb.top) {
    const sa = Math.round((ra.topScore ?? 0) * 100), sb = Math.round((rb.topScore ?? 0) * 100);
    if (sa === sb) return `Both places match ${tLabel(ra.top)} best, about equally well (${sa}/100).${because}`;
    const better = sa > sb ? A : B;
    return `Both places match ${tLabel(ra.top)} best, and it fits ${better} more strongly (${Math.max(sa, sb)} vs ${Math.min(sa, sb)}).${because}`;
  }
  return `${A} matches ${tLabel(ra.top)} best; ${B} matches ${tLabel(rb.top)}.${because}`;
}

export const focusFlipList = (flips: Set<string>) => focusTracts.filter((f) => flips.has(f.GEOID));
