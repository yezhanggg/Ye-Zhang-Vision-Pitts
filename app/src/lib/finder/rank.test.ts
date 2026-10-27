import { describe, expect, it } from 'vitest';
import { rankedTracts } from '../data';
import { DEFAULT_ENTRIES } from '../lihtc/store';
import { hud, placeFor } from '../place/data';
import type { PlaceMeasures } from '../place/types';
import { DEFAULT_PROJECT } from '../project/store';
import { tractCapacity } from '../zoning/capacity';
import { compareRows, DEFAULT_INPUTS, findPlaces, placeFilter, type FinderContext, type FinderRow } from './rank';

const ctx: FinderContext = { geoids: rankedTracts.map((t) => t.GEOID), placeFor, hud: hud!, level: 50, project: DEFAULT_PROJECT, entries: DEFAULT_ENTRIES };
const izo = (g: string) => tractCapacity(g)?.izo_share ?? null;
const HAZELWOOD = '42003562300';

describe('placeFilter', () => {
  const p = placeFor(HAZELWOOD)!;
  it('reads zoning, flood, QCT and the overlay', () => {
    expect(placeFilter(null, DEFAULT_INPUTS, null)).toBe('no data');
    expect(placeFilter(p, DEFAULT_INPUTS, null)).toBeNull();
    expect(placeFilter(p, { ...DEFAULT_INPUTS, byRight: true, type: 'adu' }, null)).toBe('zoning');
    expect(placeFilter(p, { ...DEFAULT_INPUTS, byRight: true, type: 'adu', conditionalOk: true }, null)).toBeNull();
    const wet = { ...p, flood: { ...p.flood, fema_sfha_pct: 20 } } as PlaceMeasures;
    expect(placeFilter(wet, { ...DEFAULT_INPUTS, maxFlood: 10 }, null)).toBe('flood');
    const noQct = { ...p, programs: { ...p.programs, qct: false, dda: false } } as PlaceMeasures;
    expect(placeFilter(noQct, { ...DEFAULT_INPUTS, qctOrDda: true }, null)).toBe('qct');
    expect(placeFilter(p, { ...DEFAULT_INPUTS, overlay: 'inside' }, 0.1)).toBe('overlay');
    expect(placeFilter(p, { ...DEFAULT_INPUTS, overlay: 'outside' }, 0.9)).toBe('overlay');
  });
});

describe('compareRows', () => {
  const row = (o: Partial<FinderRow>): FinderRow => ({ geoid: 'x', tier: 'gap', gapPerHome: 0, costPerHome: 0, points: null, drivers: [], sweep: { cut: null } as FinderRow['sweep'], ...o });
  it('orders by tier, then cut, then gap a home, then place points, then cost', () => {
    expect(compareRows(row({ tier: 'closes', gapPerHome: 9e9 }), row({ tier: 'close', gapPerHome: -9e9 }))).toBeLessThan(0);
    expect(compareRows(row({ sweep: { cut: 'zoning' } as FinderRow['sweep'], gapPerHome: -1 }), row({ gapPerHome: 1 }))).toBeGreaterThan(0);
    expect(compareRows(row({ gapPerHome: -100 }), row({ gapPerHome: 100 }))).toBeLessThan(0);
    const pts = (fromPlace: number) => ({ total: 0, low: 0, high: 0, threshold: null, fromPlace });
    expect(compareRows(row({ points: pts(10) }), row({ points: pts(5) }))).toBeLessThan(0);
    expect(compareRows(row({ costPerHome: 1 }), row({ costPerHome: 2 }))).toBeLessThan(0);
  });
});

describe('findPlaces', () => {
  it('tests every ranked tract and returns them in rule order', () => {
    const r = findPlaces(ctx, DEFAULT_INPUTS, izo);
    expect(r.tested).toBe(ctx.geoids.length);
    expect(r.rows.length + Object.values(r.excluded).reduce((a, b) => a + (b ?? 0), 0)).toBe(r.tested);
    for (let k = 1; k < r.rows.length; k++) expect(compareRows(r.rows[k - 1], r.rows[k])).toBeLessThanOrEqual(0);
    // either credit keeps a credit branch and its PHFA points
    expect(r.rows.every((x) => x.sweep.branch === 'nine' || x.sweep.branch === 'four')).toBe(true);
    expect(r.rows.every((x) => x.points != null)).toBe(true);
  });
  it('drops places by cost and depth, and counts why', () => {
    const r = findPlaces(ctx, { ...DEFAULT_INPUTS, maxCost: 1, minDepth: 1e9 }, izo);
    expect(r.rows).toHaveLength(0);
    expect(r.excluded.depth).toBeGreaterThan(0);
  });
  it('market rate has no PHFA points', () => {
    const r = findPlaces({ ...ctx, geoids: [HAZELWOOD], level: 'market' }, { ...DEFAULT_INPUTS, financing: 'market' }, izo);
    expect(r.rows[0].points).toBeNull();
  });
  it('near misses: one filter away, and dropping that filter alone adds exactly them', () => {
    const i = { ...DEFAULT_INPUTS, qctOrDda: true, overlay: 'outside' as const };
    const r = findPlaces(ctx, i, izo);
    for (const reason of ['qct', 'overlay'] as const) {
      const without = findPlaces(ctx, reason === 'qct' ? { ...i, qctOrDda: false } : { ...i, overlay: 'any' }, izo);
      expect(without.rows.length - r.rows.length).toBe(r.relax[reason] ?? 0);
      const joined = new Set(without.rows.map((x) => x.geoid));
      for (const m of r.nearMisses.filter((x) => x.reason === reason)) expect(joined.has(m.row.geoid)).toBe(true);
    }
    for (let k = 1; k < r.nearMisses.length; k++) expect(compareRows(r.nearMisses[k - 1].row, r.nearMisses[k].row)).toBeLessThanOrEqual(0);
  });
});
