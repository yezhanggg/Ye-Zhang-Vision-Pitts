import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirichletAround, fitValue, isTie, prng, rank, rankStability, scoreTract, topMargin } from './scoring';
import type { ScoringConfig, Weights } from './types';
import fixture from './__fixtures__/scoring_cases.json';

// The fixture is written by scripts/make_parity_fixture.py from the Python engine (tests/fixtures/scoring_cases.json
// is the same file). `cases` check scores, top, margin and tie digit for digit; `stability` checks the share of weight
// draws within a tolerance, because the two engines use different random generators.
interface Case {
  name: string;
  geoid?: string;
  x: Record<string, number | null>;
  weights: Weights;
  scores: Record<string, number | null>;
  top: string | null;
  margin: number | null;
  tie: boolean;
}
interface StabilityCase {
  name: string;
  geoid: string;
  x: Record<string, number | null>;
  weights: Weights;
  top: string;
  share: number;
  draws: number;
  seed: number;
  tolerance: number;
}
const fx = fixture as { version: string; factors: string[]; cases: Case[]; stability: StabilityCase[] };

const cfg = JSON.parse(readFileSync(new URL('../../../config/scoring.json', import.meta.url), 'utf8')) as ScoringConfig;
const ids = cfg.factors.map((f) => f.id);
const ones: Weights = Object.fromEntries(ids.map((f) => [f, 1]));
const tieEps = cfg.scoring.tie_margin ?? 0.005;
const X = { need: 0.9, market_strength: 0.2, displacement_risk: 0.8, subsidy_eligible: 1, transit_access: 0.5, flood_exposure: 0.1, senior_demand: 0.6, small_multifamily_stock: 0.4 };

describe('fixture', () => {
  it('was generated for this config', () => {
    expect(fx.version).toBe(cfg.version);
    expect(fx.factors).toEqual(ids);
    expect(fx.cases.length).toBeGreaterThan(40);
    expect(fx.stability.length).toBe(8);
  });
});

describe('fitValue', () => {
  it('rewards high values for positive fit and low values for negative fit', () => {
    expect(fitValue(0.8, 1)).toBeCloseTo(0.8);
    expect(fitValue(0.8, -1)).toBeCloseTo(0.2);
    expect(fitValue(0.3, -0.5)).toBeCloseTo(0.35);
  });
});

describe('scoreTract', () => {
  it('matches the Python engine on every parity case', () => {
    for (const c of fx.cases) {
      const s = scoreTract(c.x, c.weights, cfg);
      expect(s.map((t) => t.typology)).toEqual(Object.keys(c.scores));
      for (const t of s) {
        const want = c.scores[t.typology];
        if (want == null) expect(t.score, c.name).toBeNull();
        else expect(t.score, c.name).toBeCloseTo(want, 9);
      }
    }
  });
  it('agrees with Python on top, margin and tie for every parity case', () => {
    for (const c of fx.cases) {
      const s = scoreTract(c.x, c.weights, cfg);
      expect(rank(s)[0] ?? null, c.name).toBe(c.top);
      const m = topMargin(s);
      if (c.margin == null) expect(m, c.name).toBeNull();
      else expect(m, c.name).toBeCloseTo(c.margin, 9);
      expect(isTie(s, tieEps), c.name).toBe(c.tie);
    }
  });
  it('a graded subsidy enters as its grade', () => {
    const w: Weights = { ...Object.fromEntries(ids.map((f) => [f, 0])), subsidy_eligible: 1 };
    const half = scoreTract({ ...X, subsidy_eligible: 0.5 }, w, cfg).find((t) => t.typology === 'small_apartment')!;
    const full = scoreTract({ ...X, subsidy_eligible: 1 }, w, cfg).find((t) => t.typology === 'small_apartment')!;
    expect(half.score).toBeCloseTo(0.5, 9);
    expect(full.score).toBeCloseTo(1, 9);
  });
  it('contributions add up to the score', () => {
    for (const t of scoreTract(X, ones, cfg)) {
      const sum = t.parts.reduce((s, p) => s + p.contrib, 0);
      expect(sum).toBeCloseTo(t.score as number, 9);
    }
  });
  it('ranks by score with config-order tie breaks and drops nulls', () => {
    const order = rank([
      { typology: 'adu', score: 0.5, parts: [] },
      { typology: 'duplex_triplex', score: 0.9, parts: [] },
      { typology: 'townhome', score: 0.9, parts: [] },
      { typology: 'small_apartment', score: null, parts: [] },
      { typology: 'senior', score: 0.1, parts: [] },
    ]);
    expect(order).toEqual(['duplex_triplex', 'townhome', 'adu', 'senior']);
  });
});

describe('topMargin and isTie', () => {
  const s = [
    { typology: 'adu', score: 0.5, parts: [] },
    { typology: 'duplex_triplex', score: 0.9, parts: [] },
    { typology: 'townhome', score: 0.896, parts: [] },
    { typology: 'small_apartment', score: null, parts: [] },
    { typology: 'senior', score: 0.1, parts: [] },
  ];
  it('is the gap between the two best scores', () => {
    expect(topMargin(s)).toBeCloseTo(0.004, 9);
    expect(isTie(s)).toBe(true);
    expect(isTie(s, 0.001)).toBe(false);
  });
  it('needs two scored typologies', () => {
    expect(topMargin([{ typology: 'adu', score: 0.7, parts: [] }, { typology: 'senior', score: null, parts: [] }])).toBeNull();
    expect(isTie([{ typology: 'adu', score: 0.7, parts: [] }])).toBe(false);
    expect(topMargin([])).toBeNull();
  });
  it('zero weights score nothing; a single factor makes every typology it touches score the same', () => {
    const zero: Weights = Object.fromEntries(ids.map((f) => [f, 0]));
    expect(scoreTract(X, zero, cfg).every((t) => t.score === null)).toBe(true);
    const needOnly = scoreTract(X, { ...zero, need: 1 }, cfg);
    expect(needOnly.find((t) => t.typology === 'townhome')!.score).toBeNull();
    expect(isTie(needOnly)).toBe(true);
    const seniorOnly = scoreTract(X, { ...zero, senior_demand: 1 }, cfg);
    expect(rank(seniorOnly)).toEqual(['senior']);
    expect(topMargin(seniorOnly)).toBeNull();
  });
});

describe('stability', () => {
  it('dirichlet draws are a simplex centered near the weights', () => {
    const rng = prng(7);
    const acc: Record<string, number> = Object.fromEntries(ids.map((f) => [f, 0]));
    const w: Weights = { ...ones, displacement_risk: 3 };
    for (let i = 0; i < 2000; i++) {
      const d = dirichletAround(w, ids, 25, rng);
      expect(Object.values(d).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
      for (const f of ids) acc[f] += d[f];
    }
    const total = ids.reduce((s, f) => s + w[f], 0);
    for (const f of ids) expect(acc[f] / 2000).toBeCloseTo(w[f] / total, 1);
  });
  it('is reproducible and bounded', () => {
    const a = rankStability(X, ones, cfg)!;
    const b = rankStability(X, ones, cfg)!;
    expect(a.share).toBe(b.share);
    expect(a.draws).toBe(cfg.scoring.stability_draws);
    expect(a.share).toBeGreaterThanOrEqual(0);
    expect(a.share).toBeLessThanOrEqual(1);
  });
  it('lands within tolerance of the Python engine on every focus tract', () => {
    for (const c of fx.stability) {
      const local: ScoringConfig = { ...cfg, scoring: { ...cfg.scoring, stability_draws: c.draws, stability_seed: c.seed } };
      const s = rankStability(c.x, c.weights, local, 0)!;
      expect(s.top, c.name).toBe(c.top);
      expect(s.draws, c.name).toBe(c.draws);
      expect(Math.abs(s.share - c.share), `${c.name}: ts ${s.share} vs py ${c.share}`).toBeLessThanOrEqual(c.tolerance);
    }
  });
});
