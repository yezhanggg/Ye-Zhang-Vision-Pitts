import { describe, expect, it } from 'vitest';
import type { Stability } from '../scoring';
import { rationale } from './rationale';
import { digitsFor, stabilityBand, stabilityHow, stabilityText } from './stability';
import { CFG, flatTract, ones, resultOf } from './testkit';

const t = flatTract(0.5);
const clear = rationale(t, resultOf([['townhome', 0.7], ['adu', 0.5]]), ones(), CFG);
const tie = rationale(t, resultOf([['townhome', 0.7], ['adu', 0.699]]), ones(), CFG);
const s = (share: number, draws = 1000, top = 'townhome'): Stability => ({ top, share, draws, counts: {} });

describe('stabilityBand', () => {
  it('bands: solid from .75, likely from .55, close below', () => {
    expect(stabilityBand(s(0.75), clear)).toMatchObject({ band: 'solid', label: 'Solid pick' });
    expect(stabilityBand(s(0.74), clear)).toMatchObject({ band: 'likely', label: 'Likely pick' });
    expect(stabilityBand(s(0.55), clear)).toMatchObject({ band: 'likely' });
    expect(stabilityBand(s(0.54), clear)).toMatchObject({ band: 'close', label: 'Close call' });
  });
  it('never carries digits, whatever the number of draws', () => {
    expect(stabilityBand(s(0.8, 200), clear).digits).toBeNull();
    expect(stabilityBand(s(0.8), clear).digits).toBeNull();
    expect(stabilityBand(s(0.8, 2000), clear).digits).toBeNull();
  });
  it('digitsFor is kept for tools: tenths, a range within .03 of a rounding boundary', () => {
    expect(digitsFor(0.76)).toEqual([7, 8]);
    expect(digitsFor(0.72)).toEqual([7]);
    expect(digitsFor(0.97)).toEqual([9, 10]);
    expect(digitsFor(1)).toEqual([10]);
    expect(digitsFor(0)).toEqual([0]);
  });
  it('is hidden on a tie, with zero draws, without a result, or when the stability was for another top', () => {
    expect(stabilityBand(s(0.9), tie).show).toBe(false);
    expect(stabilityBand(s(1, 0), clear).show).toBe(false);
    expect(stabilityBand(null, clear).show).toBe(false);
    expect(stabilityBand(s(0.9, 1000, 'adu'), clear).show).toBe(false);
    expect(stabilityBand(s(0.9), clear).show).toBe(true);
  });
});

describe('stabilityText and stabilityHow', () => {
  it('writes one sentence per band, in words', () => {
    expect(stabilityText(stabilityBand(s(0.8), clear))).toBe('The order holds under small changes to the weights.');
    expect(stabilityText(stabilityBand(s(0.76), clear))).toBe('The order holds under small changes to the weights.');
    expect(stabilityText(stabilityBand(s(0.6, 200), clear))).toBe('The order is likely to hold.');
    expect(stabilityText(stabilityBand(s(0.4), clear))).toBe('A close call: a small change in the weights flips it.');
    expect(stabilityText(stabilityBand(s(0.6), tie))).toBeNull();
    for (const share of [0.1, 0.5, 0.6, 0.8, 1]) expect(stabilityText(stabilityBand(s(share), clear))).not.toMatch(/\d/);
  });
  it('states the draws and that only the weights are tested', () => {
    const how = stabilityHow(1000, 25);
    expect(how).toContain('1,000 times');
    expect(how).toContain('about 8 percentage points');
    expect(how).toContain('not errors in the data');
    expect(stabilityHow(200, 25)).toContain('200 times');
    expect(stabilityHow(0, 25)).toContain('nothing to test');
  });
});
