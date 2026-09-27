import { describe, expect, it } from 'vitest';
import { FIXTURE_CITY_MEDIAN_VALUE, FIXTURE_HUD as hud, HAZELWOOD, HOMEWOOD_NORTH, ZERO_PLACE } from './fixture';
import { levelIncomeLine, levelTarget, planTenants, transitTestMiles } from './plan';
import { recommend, type Recommendation } from './recommend';
import { suggestAll } from './suggest';
import type { PlaceMeasures } from './types';

const base = { cityMedianValue: FIXTURE_CITY_MEDIAN_VALUE };

function expectArithmetic(r: Recommendation) {
  for (const line of [...r.lines, ...r.types.map((t) => t.because), ...r.not.map((n) => n.because)]) {
    if (line.includes('$')) expect(line, line).toMatch(/[×÷−=]/);
  }
}

describe('planning inputs', () => {
  it('income line: four-person limit and the 2-bedroom rent at each level', () => {
    expect(levelIncomeLine(hud, 30)).toBe('Up to $33,100 a year for a family of four · rent up to $745 for a 2-bedroom');
    expect(levelIncomeLine(hud, 50)).toBe('Up to $55,200 a year for a family of four · rent up to $1,242 for a 2-bedroom');
    expect(levelIncomeLine(null, 80)).toContain('not available');
  });

  it('≤50% sums the ≤30% and 30–50% bands; the reason shows the sum', () => {
    const t = levelTarget(HAZELWOOD, 50);
    expect(t.band).toBe('b30_50');
    expect(t.hh).toBe(435 + 155);
    expect(t.burdened).toBe(350 + 110);
    expect(t.available).toBe(true);
    expect(t.reason).toContain('350 + 110 = 460');
  });

  it('households: seniors, families, anyone', () => {
    const s = planTenants(HAZELWOOD, ['le30'], 'seniors', 'at or below 30% AMI');
    expect(s.types.map((x) => x.type)).toEqual(['elderly_alone', 'elderly_family']);
    expect(s.bedrooms).toBe(1);
    expect(s.seniorAlone).toBe(true);
    expect(s.sentence).toContain('165 + 40 = 205 senior renter households');
    const f = planTenants(HAZELWOOD, ['le30', 'b30_50'], 'families', 'at or below 50% AMI');
    expect(f.types[0]).toMatchObject({ type: 'small_family', count: 210 });
    expect(f.bedrooms).toBe(2);
    const a = planTenants(HAZELWOOD, ['le30'], 'anyone', 'at or below 30% AMI');
    expect(a.types[0].type).toBe('elderly_alone');
  });

  it('transit distance: passes within the chosen miles, fails beyond, with the subtraction', () => {
    expect(transitTestMiles(HOMEWOOD_NORTH, 0.5).passed).toBe(true);
    const fail = transitTestMiles(HOMEWOOD_NORTH, 0.25);
    expect(fail.passed).toBe(false);
    expect(fail.sentence).toContain('0.34 miles − 0.25 miles = 0.09 miles too far');
  });
});

describe('recommend with planning inputs (Hazelwood)', () => {
  it('≤30% + seniors: senior housing, 1-bedroom for one person at $580', () => {
    const r = recommend(HAZELWOOD, hud, 'anti_displacement', { ...base, level: 30, household: 'seniors' });
    expect(r.lead).toBe('senior');
    expect(r.price?.rent).toBe(580);
    expect(r.price?.formula).toBe('$23,200 × 30% ÷ 12 = $580');
    expect(r.tenants.types[0]).toMatchObject({ type: 'elderly_alone', count: 165 });
    expect(r.servedBands).toEqual(['le30']);
    expect(r.priceAlso).toBeNull();
    expectArithmetic(r);
  });

  it('≤50% + families: a 2–4 unit conversion, 2-bedroom, at the 50% ceiling $1,242', () => {
    const r = recommend(HAZELWOOD, hud, 'anti_displacement', { ...base, level: 50, household: 'families' });
    expect(r.lead).toBe('duplex_triplex');
    expect(r.types[0].bedrooms).toBe(2);
    expect(r.price?.rent).toBe(1242);
    expect(r.servedBands).toEqual(['le30', 'b30_50']);
    expect(r.headline).toContain('households ≤50% AMI');
    expect(r.lines.join('\n')).toContain('at or below 50% AMI');
    expectArithmetic(r);
  });

  it('the level changes the answer and the price; the household changes the lead', () => {
    const a = recommend(HAZELWOOD, hud, 'anti_displacement', { ...base, level: 30 });
    const b = recommend(HAZELWOOD, hud, 'anti_displacement', { ...base, level: 80 });
    expect(a.price?.rent).not.toBe(b.price?.rent);
    const s = recommend(HAZELWOOD, hud, 'transit_first', { ...base, level: 50, household: 'seniors', transitMiles: 0.5 });
    const f = recommend(HAZELWOOD, hud, 'transit_first', { ...base, level: 50, household: 'families', transitMiles: 0.5 });
    expect(s.lead).toBe('senior');
    expect(f.lead).toBe('duplex_triplex');
  });

  it('Transit-first uses the chosen distance', () => {
    const near = recommend(HOMEWOOD_NORTH, hud, 'transit_first', { ...base, level: 50, transitMiles: 0.5 });
    const far = recommend(HOMEWOOD_NORTH, hud, 'transit_first', { ...base, level: 50, transitMiles: 0.25 });
    expect(near.stanceTest.passed).toBe(true);
    expect(near.types.length).toBeGreaterThan(0);
    expect(far.stanceTest.passed).toBe(false);
    expect(far.types).toEqual([]);
    expect(far.headline).toContain('nearest frequent stop 0.34 miles');
  });

  it('no under-served renters at the level: no suggestion', () => {
    const r = recommend(ZERO_PLACE, hud, 'anti_displacement', { ...base, level: 50 });
    expect(r.types).toEqual([]);
    expect(r.band.available).toBe(false);
  });

  it('suggestAll runs every place with the same inputs', () => {
    const places = new Map<string, PlaceMeasures>([['a', HAZELWOOD], ['b', ZERO_PLACE]]);
    const out = suggestAll(places, hud, 'anti_displacement', { level: 30, household: 'seniors', transitMi: 0.5 });
    expect(out.get('a')?.lead).toBe('senior');
    expect(out.get('b')?.lead).toBeNull();
  });
});
