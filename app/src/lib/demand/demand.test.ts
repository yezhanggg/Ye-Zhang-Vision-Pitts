import { describe, expect, it } from 'vitest';
import { hud, placeById } from '../place/data';
import { suggestAll } from '../place/suggest';
import type { Typology } from '../place/types';
import { projectMix } from '../project/plan';
import { DEFAULT_PROJECT, total } from '../project/store';
import { DEMAND } from './data';
import { belowCut } from './interp';
import { captureRate, compareGroups, groupShares, householdsByGroup, recommendedMix } from './mix';
import { demandOrder, demandScores, FAVORED_BY, scoreTypes } from './order';
import { decide, readSignal, signalsFor } from './signals';
import type { DemandUnit, Share } from './types';

const unit = (shares: Partial<Record<keyof DemandUnit['shares'], Share>>): DemandUnit =>
  ({ ...DEMAND.city, shares: { ...DEMAND.city.shares, ...shares } }) as DemandUnit;

describe('belowCut', () => {
  const edges = [0, 300, 500, 750, 1000, 1500, null];
  const counts = [10, 20, 40, 80, 100, 50];
  it('adds whole brackets and a straight-line share of the one the cut falls in', () => {
    expect(belowCut(counts, edges, 500).value).toBe(30);
    expect(belowCut(counts, edges, 875).value).toBeCloseTo(10 + 20 + 40 + 0.5 * 80);
  });
  it('never splits the open top bracket', () => {
    const r = belowCut(counts, edges, 2000);
    expect(r.value).toBe(250);
    expect(r.lowerBound).toBe(true);
  });
  it('is null when a bracket is missing', () => {
    expect(belowCut([10, null, 5], [0, 1, 2, null], 1.5).value).toBeNull();
  });
});

describe('unit mix', () => {
  it('largest remainder always sums to n, ties in group order', () => {
    for (const n of [1, 7, 40, 51, 199]) {
      const lines = recommendedMix(n, { small: 0.523, two: 0.334, large: 0.143 });
      expect(lines.reduce((s, l) => s + l.homes, 0)).toBe(n);
    }
    expect(recommendedMix(2, { small: 1 / 3, two: 1 / 3, large: 1 / 3 }).map((l) => l.homes)).toEqual([1, 1, 0]);
  });
  it('city renter households by size add up to all renters', () => {
    const c = householdsByGroup(DEMAND.city);
    expect(c.reduce((s, g) => s + (g.value ?? 0), 0)).toBe(DEMAND.city.renters[0]);
    expect(groupShares(c)!.small).toBeGreaterThan(0.5);
  });
  it('only calls a size gap when it is wider than the two margins', () => {
    for (const g of compareGroups(DEMAND.city)) if (g.gap != null) expect(Math.abs(g.gap)).toBeGreaterThan(0);
  });
  it('suggested mix puts every home at the planning level and follows Homes needed', () => {
    const tract = DEMAND.tracts['42003562300'];
    const m = projectMix(DEFAULT_PROJECT, 50, 25, tract, null);
    expect(m.homes).toBe(25);
    expect(total(m.counts)).toBe(25);
    expect(m.counts['50'][0]).toBe(0);
    expect(projectMix(DEFAULT_PROJECT, 50, null, tract, null).example).toBe(true);
  });
  it('capture rate subtracts the tax credit homes already there', () => {
    expect(captureRate(50, 1000, 200).rate).toBeCloseTo(50 / 800);
    expect(captureRate(50, 100, 150).rate).toBeNull();
  });
});

describe('signals', () => {
  it('needs both the printed margin and the margin of error', () => {
    expect(decide([0.6, 0.02, 'high'], 0.5, 0.05)).toBe('up');
    expect(decide([0.53, 0.01, 'high'], 0.5, 0.05)).toBeNull(); // under the 5-point mark
    expect(decide([0.6, 0.15, 'low'], 0.5, 0.05)).toBeNull(); // inside its margin of error
    expect(decide([0.4, 0.02, 'high'], 0.5, 0.05)).toBe('down');
  });
  it('reads the ZIP code when the tract cannot tell', () => {
    const city = DEMAND.city;
    const c = city.shares.one_person[0]!;
    const s = readSignal('one_person', unit({ one_person: [c + 0.1, 0.2, 'low'] }), unit({ one_person: [c + 0.08, 0.02, 'high'] }), city);
    expect(s.dir).toBe('up');
    expect(s.from).toBe('zip');
  });
});

describe('demand order', () => {
  it('scores each type by its favoring signals and keeps the fit order on ties', () => {
    const city = DEMAND.city;
    const up = (k: keyof DemandUnit['shares']) => [city.shares[k][0]! + 0.2, 0.01, 'high'] as Share;
    const sig = signalsFor(unit({ one_person: up('one_person'), renter: up('renter') }), null, city);
    const scores = scoreTypes(sig);
    expect(scores.small_apartment.score).toBe(2);
    const fit: Typology[] = ['adu', 'townhome', 'senior', 'duplex_triplex', 'small_apartment'];
    expect(demandOrder(fit, scores)[0]).toBe('small_apartment');
    const none = scoreTypes(signalsFor(DEMAND.city, null, DEMAND.city));
    expect(demandOrder(fit, none)).toEqual(fit);
  });
  it('favors every type through at least one signal', () => {
    for (const wants of Object.values(FAVORED_BY)) expect(wants.length).toBeGreaterThan(0);
  });
  it('changes order only, never the suggested set', () => {
    if (!hud) return;
    const plan = { level: 50 as const, size: 'auto' as const, age: 'any' as const, flood: 'any' as const, transitMi: 0.5 };
    const demand = demandScores();
    for (const stance of ['anti_displacement', 'market_led', 'transit_first', 'climate_resilient'] as const) {
      for (const level of [30, 50, 80, 'market'] as const) {
        const a = suggestAll(placeById, hud, stance, { ...plan, level });
        const b = suggestAll(placeById, hud, stance, { ...plan, level }, undefined, demand);
        for (const [g, rec] of a) expect(new Set(b.get(g)!.types.map((x) => x.typology))).toEqual(new Set(rec.types.map((x) => x.typology)));
      }
    }
  });
  it('leaves Transit-first and Climate-resilient in their own order', () => {
    if (!hud) return;
    const demand = demandScores();
    for (const stance of ['transit_first', 'climate_resilient'] as const) {
      for (const level of [50, 'market'] as const) {
        const plan = { level, size: 'auto' as const, age: 'any' as const, flood: 'any' as const, transitMi: 0.5 };
        const a = suggestAll(placeById, hud, stance, plan);
        const b = suggestAll(placeById, hud, stance, plan, undefined, demand);
        for (const [g, rec] of a) expect(b.get(g)!.types.map((x) => x.typology)).toEqual(rec.types.map((x) => x.typology));
      }
    }
  });
  it('puts the type with the most signals first where the stance orders by fit', () => {
    if (!hud) return;
    const demand = demandScores();
    const plan = { level: 50 as const, size: 'auto' as const, age: 'any' as const, flood: 'any' as const, transitMi: 0.5 };
    for (const [g, rec] of suggestAll(placeById, hud, 'anti_displacement', plan, undefined, demand)) {
      if (!rec.lead) continue;
      const d = demand.get(g) ?? {};
      for (const t of rec.types) expect(d[rec.lead] ?? 0).toBeGreaterThanOrEqual(d[t.typology] ?? 0);
    }
  });
});
