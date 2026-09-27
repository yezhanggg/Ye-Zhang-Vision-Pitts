import { describe, expect, it } from 'vitest';
import { hud, placeById } from '../place/data';
import { rankedTracts, tractById, tractLabel } from '../data';
import { MEASURES, buildLegend, measureById, measureValue } from './measures';
import { classCounts, explainMeasure, joinNames, needPercentile, policiesOnLine, topNames } from './explain';

const nameOf = (id: string) => tractLabel(tractById.get(id));
const def = (id: Parameters<typeof measureById.get>[0]) => measureById.get(id)!;

describe('explain helpers', () => {
  it('joins names', () => {
    expect(joinNames([])).toBe('');
    expect(joinNames(['A'])).toBe('A');
    expect(joinNames(['A', 'B'])).toBe('A and B');
    expect(joinNames(['A', 'B', 'C'])).toBe('A, B and C');
  });

  it('takes distinct names in need order', () => {
    const vals = [
      { id: 'a', value: 10 },
      { id: 'b', value: 30 },
      { id: 'c', value: 20 },
      { id: 'd', value: null },
    ];
    const names: Record<string, string> = { a: 'X', b: 'Y', c: 'Y', d: 'Z' };
    expect(topNames(vals, true, (id) => names[id])).toEqual(['Y', 'X']);
    expect(topNames(vals, false, (id) => names[id], 1)).toEqual(['X']);
  });

  it('writes the rent-gap sentences from the values', () => {
    const vals = [
      { id: 'a', value: 300 },
      { id: 'b', value: 100 },
      { id: 'c', value: -50 },
      { id: 'd', value: null },
    ];
    const s = explainMeasure({ def: def('rent_gap'), ami: 50, values: vals, nameOf: (id) => id.toUpperCase() });
    expect(s[0]).toBe('Listings ask more than a 50% AMI household can pay in 2 of 3 tracts with a reliable asking rent. 1 tract has no reliable asking rent and is left out.');
    expect(s[1]).toBe('The median gap is $100 a month; where there is a gap, it is typically $200 a month.');
    expect(s[2]).toBe('The largest gaps are in A, B and C.');
  });

  it('says how many tracts use the census 2-bedroom rent', () => {
    const vals = [
      { id: 'a', value: 300 },
      { id: 'b', value: 100 },
      { id: 'c', value: -50 },
      { id: 'd', value: null },
    ];
    const s = explainMeasure({ def: def('rent_gap'), ami: 50, values: vals, nameOf: (id) => id.toUpperCase(), usesCensusRent: (id) => id === 'b' });
    expect(s[0]).toBe(
      'Listings ask more than a 50% AMI household can pay in 2 of 3 tracts with a 2-bedroom rent (1 of them uses the census 2-bedroom gross rent because listings are too few). 1 tract has no 2-bedroom rent from listings or the census and is left out.',
    );
  });

  it('says so when the market fits everywhere', () => {
    const s = explainMeasure({ def: def('rent_gap'), ami: 80, values: [{ id: 'a', value: -10 }, { id: 'b', value: -5 }], nameOf: (id) => id });
    expect(s).toEqual(['Listings for a 2-bedroom already fit an 80% AMI household in all 2 tracts with a reliable asking rent.']);
  });

  it('handles a measure with no values', () => {
    expect(explainMeasure({ def: def('jobs'), ami: 50, values: [{ id: 'a', value: null }], nameOf: (id) => id })).toEqual(['No tract has a value for jobs within 1 mile yet.']);
  });

  it('counts tracts per legend class', () => {
    const vals = [{ id: 'a', value: 1 }, { id: 'b', value: 5 }, { id: 'c', value: 9 }, { id: 'd', value: null }];
    const legend = buildLegend(def('burdened'), [1, 5, 9], 3);
    const { classes, missing } = classCounts(legend, vals);
    expect(missing).toBe(1);
    expect(classes.reduce((s, c) => s + c.count, 0)).toBe(3);
    expect(classes.map((c) => c.color)).toEqual(legend.colors);
  });

  it('places a value on the need scale', () => {
    expect(needPercentile(10, [10, 20, 30], true)).toBe(0);
    expect(needPercentile(30, [10, 20, 30], true)).toBe(1);
    expect(needPercentile(10, [10, 20, 30], false)).toBe(1);
    expect(needPercentile(null, [10, 20], true)).toBeNull();
  });

  it('lists the levers that are on', () => {
    expect(policiesOnLine([{ name: 'ADU by right', on: true }, { name: 'Density bonus', on: false }, { name: 'Rent-gap subsidy', on: true }])).toBe('Policies on: ADU by right, Rent-gap subsidy — details in ③');
    expect(policiesOnLine([{ name: 'ADU by right', on: false }])).toBeNull();
  });
});

describe.runIf(hud && placeById.size > 0)('explain on the real tracts', () => {
  const ids = rankedTracts.filter((t) => placeById.has(t.GEOID)).map((t) => t.GEOID);
  for (const m of MEASURES) {
    it(`writes 2–3 sentences with numbers for ${m.id}`, () => {
      const values = ids.map((id) => ({ id, value: measureValue(m.id, placeById.get(id), hud, 50) }));
      const s = explainMeasure({ def: m, ami: 50, values, nameOf });
      if (process.env.EXPLAIN_PRINT) console.log(`${m.id}: ${s.join(' ')}`);
      expect(s.length).toBeGreaterThanOrEqual(2);
      expect(s.length).toBeLessThanOrEqual(3);
      expect(s.join(' ')).toMatch(/\d/);
      expect(s.join(' ')).not.toMatch(/undefined|NaN|null/);
    });
  }
});

describe('market rate', () => {
  it('uses the area median income for 3 people (HUD 90% adjustment)', async () => {
    const { fits2br, amiWords } = await import('./measures');
    const f = fits2br(hud, 100)!;
    expect(f.rent).toBe(Math.round((hud!.metro.median * 0.9) / 40));
    expect(f.formula).toContain('× 90% (3 people) × 30% ÷ 12');
    expect(amiWords(100)).toBe('market rate (100% AMI)');
    expect(fits2br(hud, 50)!.rent).toBe(1242);
  });
});
