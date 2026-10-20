import { describe, expect, it } from 'vitest';
import { DEFAULT_ENTRIES } from '../lihtc/store';
import { hud, placeFor } from '../place/data';
import { projectBase } from './model';
import { comparePathRows, comparePaths, pathRange, type PathRow } from './paths';
import { DEFAULT_PROJECT } from './store';

const HAZELWOOD = '42003562300';

describe('comparePaths', () => {
  const b = projectBase(HAZELWOOD, placeFor(HAZELWOOD)!, hud!, 50, DEFAULT_PROJECT, DEFAULT_ENTRIES);
  const rows = comparePaths(b, 40, 4);
  it('runs all three paths at the person’s size, in rule order', () => {
    expect(rows.map((r) => r.branch).sort()).toEqual(['four', 'market', 'nine']);
    for (const r of rows) expect(r.yours.homes).toBe(40);
    for (let k = 1; k < rows.length; k++) expect(comparePathRows(rows[k - 1], rows[k])).toBeLessThanOrEqual(0);
  });
  it('gives credit paths PHFA points with a range around the total, and market rate none', () => {
    for (const r of rows) {
      if (r.branch === 'market') expect(r.points).toBeNull();
      else {
        expect(r.points!.low).toBeLessThanOrEqual(r.points!.total);
        expect(r.points!.high).toBeGreaterThanOrEqual(r.points!.total);
      }
    }
  });
  it('sweeps around the person’s size', () => {
    expect(pathRange(40)).toEqual([14, 80]);
    expect(pathRange(3)).toEqual([4, 12]);
  });
  it('ranks a closing path above a cheaper gap', () => {
    const mk = (tier: 'closes' | 'gap', gap: number) => ({ yours: { tier, gap, homes: 10 }, points: null }) as unknown as PathRow;
    expect(comparePathRows(mk('closes', 5e6), mk('gap', 1))).toBeLessThan(0);
  });
});
