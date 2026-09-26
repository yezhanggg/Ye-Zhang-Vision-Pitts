import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirichletAround, fitValue, prng, rank, rankStability, scoreTract } from './scoring';
import type { ScoringConfig, Weights } from './types';
import cases from './__fixtures__/scoring_cases.json';

const cfg = JSON.parse(readFileSync(new URL('../../../config/scoring.json', import.meta.url), 'utf8')) as ScoringConfig;
const ids = cfg.factors.map((f) => f.id);
const ones: Weights = Object.fromEntries(ids.map((f) => [f, 1]));

describe('fitValue', () => {
  it('rewards high values for positive fit and low values for negative fit', () => {
    expect(fitValue(0.8, 1)).toBeCloseTo(0.8);
    expect(fitValue(0.8, -1)).toBeCloseTo(0.2);
    expect(fitValue(0.3, -0.5)).toBeCloseTo(0.35);
  });
});

describe('scoreTract', () => {
  it('matches the Python engine on every parity case', () => {
    for (const c of cases as { name: string; x: Record<string, number | null>; weights: Weights; scores: Record<string, number | null> }[]) {
      const s = scoreTract(c.x, c.weights, cfg);
      for (const t of s) {
        const want = c.scores[t.typology];
        if (want == null) expect(t.score, c.name).toBeNull();
        else expect(t.score, c.name).toBeCloseTo(want, 9);
      }
    }
  });
  it('contributions add up to the score', () => {
    const x = { need: 0.9, market_strength: 0.2, displacement_risk: 0.8, subsidy_eligible: 1, transit_access: 0.5, flood_exposure: 0.1 };
    for (const t of scoreTract(x, ones, cfg)) {
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

describe('stability', () => {
  it('dirichlet draws are a simplex centered near the weights', () => {
    const rng = prng(7);
    let acc: Record<string, number> = Object.fromEntries(ids.map((f) => [f, 0]));
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
    const x = { need: 0.9, market_strength: 0.2, displacement_risk: 0.8, subsidy_eligible: 1, transit_access: 0.5, flood_exposure: 0.1 };
    const a = rankStability(x, ones, cfg)!;
    const b = rankStability(x, ones, cfg)!;
    expect(a.share).toBe(b.share);
    expect(a.share).toBeGreaterThanOrEqual(0);
    expect(a.share).toBeLessThanOrEqual(1);
  });
});
