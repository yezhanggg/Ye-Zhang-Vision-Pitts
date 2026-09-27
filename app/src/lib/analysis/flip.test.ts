import { describe, expect, it } from 'vitest';
import { isTie, rank, scoreTract } from '../scoring';
import type { Weights } from '../types';
import { flipPoint, flipSentence } from './flip';
import { rationale, resultWith } from './rationale';
import { CFG, FACTORS, cfgOf, flatTract, ones, tractOf } from './testkit';

const W = ones();
const topOf = (t: ReturnType<typeof tractOf>, w: Weights) => rank(scoreTract(t, w, CFG))[0];

describe('flipPoint', () => {
  const t = tractOf({ need: 0.7, market_strength: 0.7, displacement_risk: 0.5, subsidy_eligible: 0.5, transit_access: 0.7, flood_exposure: 0.3, senior_demand: 0.4, small_multifamily_stock: 0.5 });
  it('re-scores to a different, clear top, and no smaller move does', () => {
    const fp = flipPoint(t, W, 4, 0.1, CFG)!;
    expect(fp).not.toBeNull();
    expect(FACTORS).toContain(fp.factor);
    expect(fp.from).toBe(1);
    const base = topOf(t, W);
    const after = { ...W, [fp.factor]: fp.to };
    expect(topOf(t, after)).toBe(fp.newTop);
    expect(fp.newTop).not.toBe(base);
    expect(isTie(scoreTract(t, after, CFG), 0.005)).toBe(false);
    const dist = Math.abs(fp.to - fp.from);
    for (const f of FACTORS) {
      for (let i = 0; i <= 40; i++) {
        const to = i / 10;
        if (Math.abs(to - 1) >= dist - 1e-9 || Math.abs(to - 1) < 1e-9) continue;
        const s = scoreTract(t, { ...W, [f]: to }, CFG);
        expect(rank(s)[0] === base || isTie(s, 0.005), `${f} → ${to}`).toBe(true);
      }
    }
  });
  it('is null on a dominant tract, an unranked one, and with nothing to move', () => {
    const strong = tractOf({ need: 0.6, market_strength: 0.8, displacement_risk: 0.45, subsidy_eligible: 0.5, transit_access: 0.6, flood_exposure: 0.3, senior_demand: 0.4, small_multifamily_stock: 0.5 });
    expect(topOf(strong, W)).toBe('townhome');
    expect(flipPoint(strong, W, 4, 0.1, CFG)).toBeNull();
    const cfg = cfgOf(['a', 'b'], { up: { a: 1, b: 1 }, down: { a: -1, b: -1 } }, [['up', 'Up'], ['down', 'Down']]);
    expect(flipPoint(tractOf({ a: 0.9, b: 0.9 }), { a: 1, b: 1 }, 4, 0.1, cfg)).toBeNull();
    expect(flipPoint(tractOf({ a: 0.9, b: 0.9 }, { residential: false }), { a: 1, b: 1 }, 4, 0.1, cfg)).toBeNull();
    expect(flipPoint(tractOf({ a: 0.9, b: 0.9 }), { a: 0, b: 0 }, 4, 0.1, cfg)).toBeNull();
  });
  it('honours max and step', () => {
    const fp = flipPoint(t, W, 4, 0.1, CFG)!;
    const coarse = flipPoint(t, W, 4, 0.5, CFG);
    if (coarse) expect(Math.round(coarse.to * 2)).toBe(coarse.to * 2);
    expect(fp.to).toBeLessThanOrEqual(4);
    expect(fp.to).toBeGreaterThanOrEqual(0);
  });
});

describe('flipSentence', () => {
  const t = flatTract(0.5, { market_strength: 0.8, need: 0.6 });
  it('names the slider words, or the values when the words do not differ', () => {
    const ra = rationale(t, resultWith(t, W, CFG), W, CFG);
    expect(flipSentence({ factor: 'need', from: 1, to: 2.5, newTop: 'small_apartment' }, ra, CFG)).toBe('What would change the answer: moving Affordability need from “Some” to “Top priority” makes Small apartment the best match.');
    expect(flipSentence({ factor: 'need', from: 1, to: 0.9, newTop: 'small_apartment' }, ra, CFG)).toBe('What would change the answer: moving Affordability need from 1 to 0.9 (still “Some”) makes Small apartment the best match.');
    expect(flipSentence(null, ra, CFG)).toContain('no single slider does');
  });
  it('says nothing on a tie or when nothing is ranked', () => {
    const zero = ones(FACTORS, 0);
    expect(flipSentence(null, rationale(t, resultWith(t, zero, CFG), zero, CFG), CFG)).toBeNull();
  });
});
