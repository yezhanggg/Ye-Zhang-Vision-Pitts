// What would change the answer: the smallest single-slider move that puts another housing type on top.
import { weightWord } from '../copy';
import { scoring } from '../data';
import { isTie, rank, scoreTract } from '../scoring';
import type { ScoringConfig, TractProps, Weights } from '../types';
import { ANALYSIS_COPY as C } from './copy';
import { factorLabel, tieMargin, typeLabel, type Rationale } from './rationale';

export interface FlipPoint {
  factor: string;
  from: number;
  to: number;
  newTop: string;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const stop = (v: number) => Math.round(v * 1e6) / 1e6;

/**
 * Scans every stop of every slider (0..max by step, the others held) and returns the smallest move after which a
 * different type is clearly on top (not a tie). Null when no single slider changes the pick, or nothing is ranked.
 * Equal distances go to the factor listed first in the config, then to the lower stop.
 */
export function flipPoint(t: TractProps, w: Weights, max = 4, step = 0.1, cfg: ScoringConfig = scoring): FlipPoint | null {
  if (!t.residential || !(step > 0) || !(max >= 0)) return null;
  const topOf = (ww: Weights) => {
    const s = scoreTract(t, ww, cfg);
    const top = rank(s)[0];
    return top ? { top, tie: isTie(s, tieMargin(cfg)) } : null;
  };
  const base = topOf(w);
  if (!base) return null;
  const n = Math.round(max / step);
  let best: (FlipPoint & { dist: number }) | null = null;
  for (const f of cfg.factors) {
    if (!isNum(t[f.id])) continue;
    const from = w[f.id] ?? 0;
    for (let i = 0; i <= n; i++) {
      const to = stop(i * step);
      const dist = Math.abs(to - from);
      if (dist < 1e-9 || (best && dist >= best.dist - 1e-9)) continue;
      const next = topOf({ ...w, [f.id]: to });
      if (next && next.top !== base.top && !next.tie) best = { factor: f.id, from, to, newTop: next.top, dist };
    }
  }
  return best ? { factor: best.factor, from: best.from, to: best.to, newTop: best.newTop } : null;
}

const num = (v: number) => String(Math.round(v * 100) / 100);

/** "What would change the answer: …". Null unless the place has a clear or close pick. */
export function flipSentence(fp: FlipPoint | null, ra: Rationale, cfg: ScoringConfig = scoring): string | null {
  if (!ra.top || (ra.state !== 'clear' && ra.state !== 'close')) return null;
  if (!fp) return C.flip.none(typeLabel(ra.top, cfg));
  const a = weightWord(fp.from), b = weightWord(fp.to);
  const factor = factorLabel(fp.factor, cfg), newTop = typeLabel(fp.newTop, cfg);
  return a === b ? C.flip.nudge(factor, num(fp.from), num(fp.to), a, newTop) : C.flip.move(factor, a, b, newTop);
}
