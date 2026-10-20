import { describe, expect, it } from 'vitest';
import { DEFAULT_ENTRIES } from '../lihtc/store';
import { hud, placeFor } from '../place/data';
import { projectBase } from './model';
import { closesWords, grid, sweepSizes, tierOf } from './size';
import { DEFAULT_PROJECT } from './store';

const HAZELWOOD = '42003562300';
const base = (geoid: string, level: 30 | 50 | 80 | 'market' = 50) => projectBase(geoid, placeFor(geoid)!, hud!, level as never, DEFAULT_PROJECT, DEFAULT_ENTRIES);

describe('grid', () => {
  it('covers both ends without repeats', () => {
    expect(grid(10, 20, 10)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(grid(12, 60, 4)).toEqual([12, 24, 36, 48, 60]);
    expect(grid(5, 5)).toEqual([5]);
  });
});

describe('sweepSizes', () => {
  it('reports a closing range inside the tested range, and the right size is its top', () => {
    const s = sweepSizes(base(HAZELWOOD), 'nine', [12, 120]);
    expect(s.range[0]).toBe(12);
    expect(s.range[1]).toBeLessThanOrEqual(120);
    if (s.closesAt) {
      expect(s.closesAt[0]).toBeGreaterThanOrEqual(s.range[0]);
      expect(s.closesAt[1]).toBeLessThanOrEqual(s.range[1]);
      if (!s.cut) expect(s.rightSize).toBe(s.closesAt[1]);
      expect(s.best.tier).not.toBe('gap');
    }
    // every row's tier follows the pencil
    for (const r of s.rows) expect(r.tier).toBe(tierOf(r.run.result, r.run.args.inputs.targetYield));
    expect(closesWords(s)).toMatch(/homes/);
  });

  it('names the bound that cuts the range', () => {
    const b = base(HAZELWOOD);
    const s = sweepSizes({ ...b, depth: { ...b.depth!, homes: 30 } }, 'nine', [12, 120]);
    expect(s.bounds.depth).toBe(30);
    expect(s.range[1]).toBeLessThanOrEqual(30);
    const cut = sweepSizes({ ...b, depth: { ...b.depth!, homes: 5 }, cap: null }, 'nine', [12, 120]);
    expect(cut.cut).toBe('depth');
    expect(cut.rightSize).toBeNull();
    expect(cut.range).toEqual([12, 120]);
  });

  it('market rate ignores market depth', () => {
    const s = sweepSizes(base(HAZELWOOD, 'market'), 'market', [12, 60]);
    expect(s.bounds.depth).toBeNull();
  });
});
