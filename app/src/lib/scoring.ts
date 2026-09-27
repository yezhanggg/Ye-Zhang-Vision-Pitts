// Scoring engine. Mirrors src/visionpitts/scoring.py exactly; parity fixture in src/lib/__fixtures__/scoring_cases.json.
//
//   S(t,k) = Σ_f w_f · c(x_tf, d_kf) / Σ_f w_f · |d_kf|    over factors with a value for the tract and w_f > 0
//   c(x,d) = d·x if d ≥ 0, else |d|·(1 − x)
//
// x are OBSERVED percentiles (0–1). w (weights) and d (fit matrix) are VALUE JUDGMENTS from config/scoring.json.
import type { ScoringConfig, Weights } from './types';

export type FactorValues = Record<string, unknown>;

export interface Part {
  factor: string;
  x: number;
  w: number;
  d: number;
  /** w·c / Σ w·|d|: this factor's additive share of the typology's score. */
  contrib: number;
  /** contrib − (the share this factor would add at x = 0.5): what makes the tract stand out. */
  lift: number;
}

export interface TypologyScore {
  typology: string;
  score: number | null;
  parts: Part[];
}

export function fitValue(x: number, d: number): number {
  return d >= 0 ? d * x : Math.abs(d) * (1 - x);
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function activeFactors(x: FactorValues, weights: Weights, cfg: ScoringConfig): string[] {
  return cfg.factors.map((f) => f.id).filter((f) => isNum(x[f]) && (weights[f] ?? 0) > 0);
}

export function scoreTract(x: FactorValues, weights: Weights, cfg: ScoringConfig): TypologyScore[] {
  const act = activeFactors(x, weights, cfg);
  return cfg.typologies.map((t) => {
    const row = cfg.fit.matrix[t.id];
    let num = 0;
    let den = 0;
    for (const f of act) {
      num += weights[f] * fitValue(x[f] as number, row[f]);
      den += weights[f] * Math.abs(row[f]);
    }
    if (den <= 0) return { typology: t.id, score: null, parts: [] };
    const parts = act.map((f) => {
      const c = fitValue(x[f] as number, row[f]);
      const c0 = fitValue(0.5, row[f]);
      return { factor: f, x: x[f] as number, w: weights[f], d: row[f], contrib: (weights[f] * c) / den, lift: (weights[f] * (c - c0)) / den };
    });
    return { typology: t.id, score: num / den, parts };
  });
}

/** Typology ids best first. Ties keep config order; nulls are dropped. */
export function rank(scores: TypologyScore[]): string[] {
  return scores
    .map((s, i) => ({ s, i }))
    .filter((o) => o.s.score != null)
    .sort((a, b) => (b.s.score as number) - (a.s.score as number) || a.i - b.i)
    .map((o) => o.s.typology);
}

export function topTypology(x: FactorValues, weights: Weights, cfg: ScoringConfig): string | null {
  return rank(scoreTract(x, weights, cfg))[0] ?? null;
}

/** Score gap between the best and the second-best typology; null with fewer than two scored. Mirrors scoring.margin in Python. */
export function topMargin(scores: TypologyScore[]): number | null {
  const s = scores.map((x) => x.score).filter((v): v is number => v != null).sort((a, b) => b - a);
  return s.length >= 2 ? s[0] - s[1] : null;
}

/** True when the top two scores are closer than eps: a tie, not a pick. Mirrors scoring.is_tie in Python. */
export function isTie(scores: TypologyScore[], eps = 0.005): boolean {
  const m = topMargin(scores);
  return m != null && m < eps;
}

// ---------------------------------------------------------------------------------------- stability
/** Small seeded PRNG (mulberry32) so stability numbers are reproducible per tract. */
export function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng: () => number): number {
  let u = 0;
  while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/** Gamma(shape, 1) by Marsaglia–Tsang, with the shape < 1 boost. */
export function gammaSample(shape: number, rng: () => number): number {
  if (shape <= 0) return 0;
  if (shape < 1) return gammaSample(shape + 1, rng) * Math.pow(rng() || 1e-12, 1 / shape);
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let z: number;
    let v: number;
    do {
      z = gaussian(rng);
      v = 1 + c * z;
    } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * z ** 4) return d * v;
    if (Math.log(u) < 0.5 * z * z + d * (1 - v + Math.log(v))) return d * v;
  }
}

/** One Dirichlet draw centered on the normalized weights: α_f = κ·w_f/Σw. */
export function dirichletAround(weights: Weights, factors: string[], concentration: number, rng: () => number): Weights {
  const total = factors.reduce((s, f) => s + Math.max(0, weights[f] ?? 0), 0);
  const out: Weights = {};
  let sum = 0;
  for (const f of factors) {
    const g = total > 0 ? gammaSample((concentration * Math.max(0, weights[f] ?? 0)) / total, rng) : 0;
    out[f] = g;
    sum += g;
  }
  if (sum <= 0) return { ...weights };
  for (const f of factors) out[f] /= sum;
  return out;
}

export interface Stability {
  top: string;
  share: number;
  draws: number;
  counts: Record<string, number>;
}

/** Share of weight perturbations under which the top pick holds ("stays #1 in N of 10"). */
export function rankStability(x: FactorValues, weights: Weights, cfg: ScoringConfig, seedOffset = 0): Stability | null {
  const top = topTypology(x, weights, cfg);
  if (!top) return null;
  const act = activeFactors(x, weights, cfg);
  const draws = cfg.scoring.stability_draws;
  if (act.length < 2) return { top, share: 1, draws: 0, counts: { [top]: draws } };
  const rng = prng((cfg.scoring.stability_seed ?? 42) + seedOffset);
  const counts: Record<string, number> = {};
  let same = 0;
  for (let i = 0; i < draws; i++) {
    const w = dirichletAround(weights, act, cfg.scoring.stability_concentration, rng);
    const t = topTypology(x, w, cfg);
    if (t) counts[t] = (counts[t] ?? 0) + 1;
    if (t === top) same++;
  }
  return { top, share: same / draws, draws, counts };
}

// ------------------------------------------------------------------------------------------ helpers
export function binIndex(v: number, breaks: number[]): number {
  for (let i = breaks.length - 2; i >= 0; i--) if (v >= breaks[i]) return i;
  return 0;
}

export function sameWeights(a: Weights, b: Weights, ids: string[]): boolean {
  return ids.every((f) => Math.abs((a[f] ?? 0) - (b[f] ?? 0)) < 1e-9);
}
