import { describe, expect, it } from 'vitest';
import { BROWSE_PALETTE, browsePaint, classify, extent, fmtEstimate, fmtMoe, fmtTick, fmtValue, paletteFor, quantileBreaks, refPosition, reliability, reliabilityMix } from './bins';
import type { ValueMap } from './types';

describe('quantileBreaks', () => {
  it('returns four inner breaks for five classes over 1…100', () => {
    const xs = Array.from({ length: 100 }, (_, i) => i + 1);
    const b = quantileBreaks(xs, 5);
    expect(b).toHaveLength(4);
    expect(b[0]).toBeCloseTo(20.8, 5);
    expect(b[3]).toBeCloseTo(80.2, 5);
    for (let i = 1; i < b.length; i++) expect(b[i]).toBeGreaterThan(b[i - 1]);
  });
  it('ignores nulls and non-finite values', () => {
    expect(quantileBreaks([null, undefined, Number.NaN, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5)).toEqual(quantileBreaks([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5));
  });
  it('collapses ties so every class can hold a value', () => {
    const b = quantileBreaks([0, 0, 0, 0, 0, 0, 0, 0, 1, 2], 5);
    expect(new Set(b).size).toBe(b.length);
    expect(b.length).toBeLessThan(4);
    expect(b.every((x) => x < 2)).toBe(true);
  });
  it('is empty with fewer than two values or all-equal values', () => {
    expect(quantileBreaks([], 5)).toEqual([]);
    expect(quantileBreaks([7], 5)).toEqual([]);
    expect(quantileBreaks([3, 3, 3, 3], 5)).toEqual([]);
  });
});

describe('classify and palettes', () => {
  const breaks = [10, 20, 30, 40];
  it('puts a value at a break into the lower class', () => {
    expect(classify(5, breaks)).toBe(0);
    expect(classify(10, breaks)).toBe(0);
    expect(classify(10.1, breaks)).toBe(1);
    expect(classify(40, breaks)).toBe(3);
    expect(classify(41, breaks)).toBe(4);
    expect(classify(null, breaks)).toBeNull();
    expect(classify(Number.NaN, breaks)).toBeNull();
  });
  it('spreads fewer classes across the palette', () => {
    expect(paletteFor(5)).toEqual(BROWSE_PALETTE);
    expect(paletteFor(3)).toEqual([BROWSE_PALETTE[0], BROWSE_PALETTE[2], BROWSE_PALETTE[4]]);
    expect(paletteFor(1)).toEqual([BROWSE_PALETTE[2]]);
    expect(paletteFor(0)).toEqual([]);
  });
  it('builds a categorical paint with one class per unit', () => {
    const values: ValueMap = new Map([
      ['a', { est: 5, moe: 1, cv: 0.1 }],
      ['b', { est: 35, moe: 1, cv: 0.1 }],
      ['c', { est: null, moe: null, cv: null }],
    ]);
    const p = browsePaint(values, breaks);
    expect(p.kind).toBe('cat');
    expect(p.palette).toHaveLength(5);
    expect(p.values.get('a')).toBe(0);
    expect(p.values.get('b')).toBe(3);
    expect(p.values.get('c')).toBeNull();
  });
  it('finds the extent of finite values', () => {
    expect(extent([null, 3, 1, 2])).toEqual([1, 3]);
    expect(extent([null])).toBeNull();
  });
});

describe('formats', () => {
  it('formats values per unit', () => {
    expect(fmtValue(1230, 'usd')).toBe('$1,230');
    expect(fmtValue(2337, 'count')).toBe('2,337');
    expect(fmtValue(0.52, 'share')).toBe('52.0%');
    expect(fmtValue(1948, 'years')).toBe('1948');
    expect(fmtValue(36.2, 'age')).toBe('36.2');
    expect(fmtValue(null, 'usd')).toBe('—');
  });
  it('formats margins per unit, shares in points', () => {
    expect(fmtMoe(0.041, 'share')).toBe('4.1 pts');
    expect(fmtMoe(55, 'usd')).toBe('$55');
    expect(fmtMoe(1200, 'count')).toBe('1,200');
    expect(fmtMoe(3.4, 'years')).toBe('3');
    expect(fmtMoe(2.5, 'age')).toBe('2.5');
    expect(fmtMoe(null, 'share')).toBe('—');
  });
  it('joins estimate and margin', () => {
    expect(fmtEstimate({ est: 0.52, moe: 0.041, cv: 0.05 }, 'share')).toBe('52.0% ± 4.1 pts');
    expect(fmtEstimate({ est: 1230, moe: null, cv: null }, 'usd')).toBe('$1,230');
    expect(fmtEstimate({ est: null, moe: 5, cv: null }, 'usd')).toBe('—');
    expect(fmtEstimate(null, 'usd')).toBe('—');
  });
  it('shortens large legend ticks', () => {
    expect(fmtTick(52300, 'usd')).toBe('$52k');
    expect(fmtTick(1_250_000, 'usd')).toBe('$1.3M');
    expect(fmtTick(12000, 'count')).toBe('12k');
    expect(fmtTick(950, 'usd')).toBe('$950');
    expect(fmtTick(0.524, 'share')).toBe('52%');
    expect(fmtTick(1948, 'years')).toBe('1948');
  });
});

describe('reliability', () => {
  it('follows the CV thresholds', () => {
    expect(reliability(0.149)).toBe('high');
    expect(reliability(0.15)).toBe('medium');
    expect(reliability(0.3)).toBe('medium');
    expect(reliability(0.301)).toBe('low');
    expect(reliability(null)).toBeNull();
    expect(reliability(Number.NaN)).toBeNull();
  });
  it('counts the mix over a value map', () => {
    const values: ValueMap = new Map([
      ['a', { est: 5, moe: 1, cv: 0.1 }],
      ['b', { est: 35, moe: 1, cv: 0.2 }],
      ['c', { est: 1, moe: 1, cv: 0.9 }],
      ['d', { est: null, moe: null, cv: null }],
      ['e', { est: 0, moe: 1, cv: null }],
    ]);
    expect(reliabilityMix(values)).toEqual({ high: 1, medium: 1, low: 1, none: 2, withData: 4, total: 5 });
  });
});

describe('refPosition', () => {
  const breaks = [10, 20, 30, 40];
  it('maps the extent to the ramp ends and breaks to swatch edges', () => {
    expect(refPosition(0, breaks, [0, 50])).toBe(0);
    expect(refPosition(50, breaks, [0, 50])).toBe(1);
    expect(refPosition(10, breaks, [0, 50])).toBeCloseTo(0.2, 6);
    expect(refPosition(25, breaks, [0, 50])).toBeCloseTo(0.5, 6);
  });
  it('clamps values beyond the extent and handles missing values', () => {
    expect(refPosition(-5, breaks, [0, 50])).toBe(0);
    expect(refPosition(500, breaks, [0, 50])).toBe(1);
    expect(refPosition(null, breaks, [0, 50])).toBeNull();
  });
  it('uses class midpoints for the outer classes without an extent', () => {
    expect(refPosition(5, breaks)).toBeCloseTo(0.1, 6);
    expect(refPosition(45, breaks)).toBeCloseTo(0.9, 6);
    expect(refPosition(15, breaks)).toBeCloseTo(0.3, 6);
  });
  it('is monotone', () => {
    const xs = [0, 5, 10, 12, 19, 20, 21, 33, 40, 49, 50];
    const ps = xs.map((x) => refPosition(x, breaks, [0, 50])!);
    for (let i = 1; i < ps.length; i++) expect(ps[i]).toBeGreaterThanOrEqual(ps[i - 1]);
  });
});
