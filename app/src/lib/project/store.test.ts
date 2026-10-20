import { describe, expect, it } from 'vitest';
import { DEMAND } from '../demand/data';
import { projectMix } from './plan';
import { DEFAULT_PROJECT, emptyCounts, parseProject, total } from './store';

describe('parseProject', () => {
  it('falls back to the default on missing, broken or wrong-shaped storage', () => {
    for (const raw of [null, '', '{', 'null', '42', '"text"', '[]']) expect(parseProject(raw)).toEqual(DEFAULT_PROJECT);
  });

  it('keeps valid fields and drops invalid ones one by one', () => {
    const good = emptyCounts();
    good['60'] = [0, 4, 3, 1];
    const p = parseProject(JSON.stringify({ mode: 'mine', counts: good, stories: 5, sites: { a: { district: 'RM-M' } }, pencil: { hardPsf: 280 } }));
    expect(p).toEqual({ mode: 'mine', counts: good, stories: 5, sites: { a: { district: 'RM-M' } }, pencil: { hardPsf: 280 }, openShare: 0.15, openType: 'shared' });

    const bad = parseProject(JSON.stringify({ mode: 'other', counts: { ...good, '50': [1, -2, 0, 0] }, stories: 0, sites: 'x', pencil: null }));
    expect(bad).toEqual({ ...DEFAULT_PROJECT, counts: emptyCounts() });
  });

  it('rejects a mix with a missing level, a short row or a non-number', () => {
    const { mkt: _drop, ...noMarket } = emptyCounts();
    for (const counts of [noMarket, { ...emptyCounts(), '30': [0, 1, 2] }, { ...emptyCounts(), '80': [0, '1', 0, 0] }])
      expect(parseProject(JSON.stringify({ counts })).counts).toEqual(emptyCounts());
  });
});

describe('projectMix', () => {
  it("uses the person's own grid as is in 'mine' mode", () => {
    const counts = emptyCounts();
    counts['30'] = [2, 0, 0, 0];
    counts.mkt = [0, 5, 5, 0];
    const m = projectMix({ ...DEFAULT_PROJECT, mode: 'mine', counts }, 50, 99, null, null);
    expect(m).toMatchObject({ counts, homes: 12, example: false, mode: 'mine', lines: null, from: null });
  });

  it("splits by the ZIP's household sizes when the tract has none, and puts every home in 2-bedrooms when neither does", () => {
    const zip = Object.values(DEMAND.zips)[0];
    const fromZip = projectMix(DEFAULT_PROJECT, 80, 30, null, zip);
    expect(fromZip.from).toBe('zip');
    expect(total(fromZip.counts)).toBe(30);

    const none = projectMix(DEFAULT_PROJECT, 'market', 30, null, null);
    expect(none.from).toBeNull();
    expect(none.counts.mkt).toEqual([0, 0, 30, 0]);
  });
});
