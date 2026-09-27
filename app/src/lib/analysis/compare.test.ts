import { describe, expect, it } from 'vitest';
import type { Weights } from '../types';
import { compareMessage, compareState, factorDeltasSafe, missingText } from './compare';
import { resultWith } from './rationale';
import { CFG, FACTORS, ones, tractOf } from './testkit';

const W = ones();
const A = tractOf({ need: 0.9, market_strength: null, displacement_risk: 0.8, subsidy_eligible: 1, transit_access: 0.7, flood_exposure: 0.2, senior_demand: 0.3, small_multifamily_stock: 0.6 }, { neighborhood: 'Terrace Village', GEOID: 'A' });
const B = tractOf({ need: 0.4, market_strength: 0.9, displacement_risk: 0.3, subsidy_eligible: 0, transit_access: 0.5, flood_exposure: null, senior_demand: null, small_multifamily_stock: 0.2 }, { neighborhood: 'Point Breeze', GEOID: 'B' });
const ra = resultWith(A, W, CFG), rb = resultWith(B, W, CFG);

describe('factorDeltasSafe', () => {
  const rows = factorDeltasSafe(A, B, ra, rb, undefined, CFG);
  it('has a row per factor, null rows last, and never counts a missing value as an edge', () => {
    expect(rows.length).toBe(FACTORS.length);
    const nulls = rows.filter((r) => r.missing);
    expect(nulls.map((r) => [r.factor, r.missing])).toEqual([
      ['market_strength', 'a'],
      ['flood_exposure', 'b'],
      ['senior_demand', 'b'],
    ]);
    for (const r of nulls) {
      expect(r.delta).toBeNull();
      expect(r.gap).toBeNull();
    }
    expect(rows.slice(0, rows.length - 3).every((r) => r.missing === null && r.gap != null && r.delta != null)).toBe(true);
    const gaps = rows.slice(0, rows.length - 3).map((r) => Math.abs(r.gap as number));
    expect([...gaps].sort((x, y) => y - x)).toEqual(gaps);
  });
  it('uses A’s top pick as the basis unless told otherwise, and reports both sides missing', () => {
    const need = rows.find((r) => r.factor === 'need')!;
    expect(need.delta).toBeCloseTo(0.5, 9);
    const sa = ra.scores.find((s) => s.typology === ra.top)!.parts.find((p) => p.factor === 'need')!.contrib;
    const sb = rb.scores.find((s) => s.typology === ra.top)!.parts.find((p) => p.factor === 'need')!.contrib;
    expect(need.gap).toBeCloseTo(sa - sb, 9);
    const other = factorDeltasSafe(A, B, ra, rb, 'townhome', CFG).find((r) => r.factor === 'need')!;
    expect(other.gap).toBeCloseTo(0, 9);
    const both = factorDeltasSafe(tractOf({ need: null }), tractOf({ need: null }), resultWith(tractOf({}), W, CFG), resultWith(tractOf({}), W, CFG), undefined, CFG);
    expect(both.every((r) => r.missing === 'both')).toBe(true);
    expect(missingText(both[0], A, B)).toBe('No data for either place: not compared');
  });
  it('words a missing side', () => {
    expect(missingText(rows.find((r) => r.factor === 'market_strength')!, A, B)).toBe('No data for Terrace Village: not compared');
    expect(missingText(rows.find((r) => r.factor === 'flood_exposure')!, A, B)).toBe('No data for Point Breeze: not compared');
    expect(missingText(rows[0], A, B)).toBeNull();
  });
});

describe('compareState and compareMessage', () => {
  const park = tractOf({}, { residential: false, households: 0, neighborhood: 'Squirrel Hill South', GEOID: 'P' });
  const rp = resultWith(park, W, CFG);
  it('needs two different places', () => {
    expect(compareState(null, B, null, rb, W, CFG)).toBe('need_two');
    expect(compareState(A, null, ra, null, W, CFG)).toBe('need_two');
    expect(compareState(A, A, ra, ra, W, CFG)).toBe('need_two');
    expect(compareMessage('need_two', A, null)).toBe('Pick two places to compare.');
  });
  it('names an unranked side with its household count', () => {
    expect(compareState(park, B, rp, rb, W, CFG)).toBe('a_unranked');
    expect(compareState(A, park, ra, rp, W, CFG)).toBe('b_unranked');
    expect(compareMessage('b_unranked', A, park)).toBe('Squirrel Hill South is not ranked (0 households, fewer than 25). Pick another place for B.');
    expect(compareMessage('a_unranked', park, B)).toBe('Squirrel Hill South is not ranked (0 households, fewer than 25). Pick another place for A.');
    const noData = tractOf({}, { GEOID: 'N', neighborhood: 'Nowhere' });
    expect(compareState(A, noData, ra, resultWith(noData, W, CFG), W, CFG)).toBe('b_unranked');
    expect(compareMessage('b_unranked', A, noData)).toBe('Nowhere has no data for the factors switched on, so it cannot be ranked. Pick another place for B.');
  });
  it('zero weights, then ok', () => {
    const zero: Weights = ones(FACTORS, 0);
    expect(compareState(A, B, resultWith(A, zero, CFG), resultWith(B, zero, CFG), zero, CFG)).toBe('zero_weights');
    expect(compareMessage('zero_weights', A, B)).toBe('Every factor is set to zero, so nothing can be ranked. Turn at least one factor up, or pick a stance.');
    expect(compareState(A, B, ra, rb, W, CFG)).toBe('ok');
    expect(compareMessage('ok', A, B)).toBeNull();
  });
});
