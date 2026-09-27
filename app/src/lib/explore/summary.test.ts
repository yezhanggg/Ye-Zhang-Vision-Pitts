import { describe, expect, it } from 'vitest';
import { binOf, change, composition, histogram, niceTicks, rankOf, topBottom } from './summary';
import type { ValueMap } from './types';

describe('histogram', () => {
  it('bins finite values into equal widths and ignores nulls', () => {
    const h = histogram([0, 1, 2, 3, 4, null, undefined, 10], 5);
    expect(h.n).toBe(6);
    expect(h.edges).toHaveLength(6);
    expect(h.edges[0]).toBe(0);
    expect(h.edges[5]).toBe(10);
    expect(h.counts.reduce((a, b) => a + b, 0)).toBe(6);
    expect(h.counts[4]).toBe(1); // the max lands in the last bin, not past it
    expect(binOf(h, 10)).toBe(4);
    expect(binOf(h, 0)).toBe(0);
    expect(binOf(h, 11)).toBeNull();
  });
  it('is empty with fewer than two distinct values', () => {
    expect(histogram([3, 3, 3]).edges).toEqual([]);
    expect(histogram([null, 1]).counts).toEqual([]);
  });
});

describe('rankOf', () => {
  it('ranks from the top and reports the share below', () => {
    expect(rankOf(5, [1, 5, 9, null])).toEqual({ rank: 2, n: 3, pct: 1 / 3 });
    expect(rankOf(9, [1, 5, 9])).toEqual({ rank: 1, n: 3, pct: 2 / 3 });
    expect(rankOf(null, [1, 2])).toBeNull();
    expect(rankOf(1, [])).toBeNull();
  });
});

describe('composition', () => {
  const unit = { a: { est: 0.5, moe: null, cv: null }, b: { est: 0.2, moe: null, cv: null }, c: { est: null, moe: null, cv: null } };
  it('adds the remainder as other and clamps it', () => {
    expect(composition(unit, ['a', 'b'])).toEqual([{ id: 'a', value: 0.5 }, { id: 'b', value: 0.2 }, { id: 'other', value: 0.3 }]);
    expect(composition({ a: { est: 0.9, moe: null, cv: null }, b: { est: 0.3, moe: null, cv: null } }, ['a', 'b']).at(-1)).toEqual({ id: 'other', value: 0 });
  });
  it('keeps nulls and skips other when nothing is known', () => {
    expect(composition(unit, ['c'])).toEqual([{ id: 'c', value: null }]);
    expect(composition(null, ['a'], false)).toEqual([{ id: 'a', value: null }]);
  });
});

describe('change', () => {
  it('uses the first and last finite points', () => {
    const c = change({ years: [2014, 2015, 2016, 2017], est: [null, 100, null, 125], moe: null });
    expect(c).toEqual({ from: { year: 2015, value: 100 }, to: { year: 2017, value: 125 }, pct: 0.25, diff: 25 });
    expect(change({ years: [2014, 2015], est: [null, 1], moe: null })).toBeNull();
    expect(change({ years: [2014, 2015], est: [0, 5], moe: null })?.pct).toBeNull();
  });
});

describe('topBottom and niceTicks', () => {
  it('sorts finite values both ways', () => {
    const m: ValueMap = new Map([
      ['a', { est: 3, moe: null, cv: null }],
      ['b', { est: null, moe: null, cv: null }],
      ['c', { est: 9, moe: null, cv: null }],
      ['d', { est: 1, moe: null, cv: null }],
    ]);
    expect(topBottom(m, 2)).toEqual({ top: [['c', 9], ['a', 3]], bottom: [['d', 1], ['a', 3]] });
  });
  it('produces round ticks that cover the range', () => {
    const t = niceTicks(0, 1234, 4);
    expect(t[0]).toBe(0);
    expect(t[t.length - 1]).toBeGreaterThanOrEqual(1234);
    expect(niceTicks(0.12, 0.55, 4).every((v) => Number.isFinite(v))).toBe(true);
    expect(niceTicks(5, 5)).toEqual([5]);
  });
});
