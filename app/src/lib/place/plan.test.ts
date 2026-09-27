import { describe, expect, it } from 'vitest';
import { FIXTURE_CITY_MEDIAN_VALUE, FIXTURE_HUD as hud, HAZELWOOD, HOMEWOOD_NORTH, SQUIRREL_HILL_NORTH, ZERO_PLACE } from './fixture';
import {
  amiOf, ceilingForSize, floodCheck, homesLines, largestType, levelIncomeLine, levelTarget, marketRent, planTenants, resolveHousehold, sizeBedrooms, sizeIncomeLine, transitTestMiles, typesFor, typesNote, AGE_GROUPS, AGE_LABEL, AGE_TYPES, FLOOD_LABEL, FLOOD_LIMIT_PCT, FLOOD_RISKS, HOUSEHOLD_SIZES, SIZE_LABEL,
} from './plan';
import { CLIMATE_WHY, climateTest, recommend, type Recommendation } from './recommend';
import { suggestAll } from './suggest';
import type { PlaceMeasures } from './types';

const base = { cityMedianValue: FIXTURE_CITY_MEDIAN_VALUE };

function expectArithmetic(r: Recommendation) {
  for (const line of [...r.lines, ...r.types.map((t) => t.because), ...r.not.map((n) => n.because)]) {
    if (line.includes('$')) expect(line, line).toMatch(/[×÷−=]/);
  }
}

describe('household size → HUD limit and home size', () => {
  it('limit by size and the rent that fits', () => {
    expect(sizeIncomeLine(hud, 50, 3)).toBe('3-person household at 50% AMI: up to $49,700 a year · rent that fits $1,242 for a 2-bedroom');
    expect(sizeIncomeLine(hud, 30, 1)).toBe('1-person household at 30% AMI: up to $23,200 a year · rent that fits $580 for a studio or 1-bedroom');
    expect(ceilingForSize(hud, 50, 4)).toMatchObject({ limit: 55200, rent: 1380, bedrooms: 2, formula: '$55,200 × 30% ÷ 12 = $1,380' });
    expect(ceilingForSize(hud, 80, 5)).toMatchObject({ limit: 95400, rent: 2385, bedrooms: 3 });
    expect(sizeIncomeLine(hud, 'market', 3)).toContain('more than $79,500 a year');
    expect(sizeIncomeLine(null, 50, 3)).toContain('not available');
  });

  it('bedrooms: 1 → 1, 2 → 1, 3–4 → 2, 5+ → 3', () => {
    expect([1, 2, 3, 4, 5].map((s) => sizeBedrooms(s as 1))).toEqual([1, 1, 2, 2, 3]);
  });

  it('the four-person line kept for older callers', () => {
    expect(levelIncomeLine(hud, 30)).toBe('Up to $33,100 a year for a family of four · rent up to $745 for a 2-bedroom');
  });
});

describe('age × size → CHAS household type', () => {
  it('maps as CHAS defines the types', () => {
    expect(typesFor(1, 'senior62')).toEqual(['elderly_alone']);
    expect(typesFor(2, 'senior62')).toEqual(['elderly_family']);
    expect(typesFor(1, 'under62')).toEqual(['other']);
    expect(typesFor(2, 'under62')).toEqual(['small_family']);
    expect(typesFor(4, 'under62')).toEqual(['small_family']);
    expect(typesFor(5, 'senior62')).toEqual(['large_family']);
    expect(typesFor(1, 'any')).toEqual(['elderly_alone', 'other']);
    expect(typesFor(2, 'any')).toEqual(['elderly_family', 'small_family']);
  });

  it('five age options, each keeping the CHAS types it can support', () => {
    expect(AGE_GROUPS).toEqual(['any', 'under62', 'senior62', 'senior_alone', 'senior_couple']);
    expect(AGE_GROUPS.map((a) => AGE_LABEL[a])).toEqual(['Any age', 'Under 62', '62+', '62+ alone', '62+ couple']);
    expect(AGE_TYPES.any).toHaveLength(5);
    expect(AGE_TYPES.under62).toEqual(['other', 'small_family', 'large_family']);
    expect(AGE_TYPES.senior62).toEqual(['elderly_alone', 'elderly_family']);
    expect(AGE_TYPES.senior_alone).toEqual(['elderly_alone']);
    expect(AGE_TYPES.senior_couple).toEqual(['elderly_family']);
    for (const a of AGE_GROUPS) expect(typesFor('auto', a)).toEqual(AGE_TYPES[a]);
  });

  it('62+ alone and 62+ couple fix the size (1 and 2) whatever size is chosen', () => {
    for (const s of HOUSEHOLD_SIZES) {
      expect(typesFor(s, 'senior_alone')).toEqual(['elderly_alone']);
      expect(typesFor(s, 'senior_couple')).toEqual(['elderly_family']);
    }
    expect(resolveHousehold(HAZELWOOD, ['le30'], 4, 'senior_alone')).toMatchObject({ size: 1, auto: false });
    expect(resolveHousehold(HAZELWOOD, ['le30'], 4, 'senior_couple')).toMatchObject({ size: 2, auto: false });
    expect(resolveHousehold(HAZELWOOD, ['le30'], 'auto', 'senior_alone')).toMatchObject({ type: 'elderly_alone', size: 1 });
    expect(typesNote(4, 'senior_couple')).toContain('priced for 2 people');
    expect(typesNote(2, 'senior_couple')).toBeNull();
    const t = planTenants(HAZELWOOD, ['le30'], 3, 'senior_alone', 'at or below 30% AMI');
    expect(t.types[0]).toMatchObject({ type: 'elderly_alone', count: 165 });
    expect(t.seniorAlone).toBe(true);
    expect(t.bedrooms).toBe(1);
    expect(t.sentence).toContain('62+ living alone');
  });

  it('who it serves sums the types over the level’s bands, with the sum written out', () => {
    const t = planTenants(HAZELWOOD, ['le30', 'b30_50'], 3, 'any', 'at or below 50% AMI');
    expect(t.types).toEqual([{ type: 'small_family', label: 'small families (2–4 people)', count: 150 + 60 }]);
    expect(t.bedrooms).toBe(2);
    expect(t.sentence).toContain('150 at ≤30% + 60 at 30–50% = 210');
    const s = planTenants(HAZELWOOD, ['le30'], 1, 'senior62', 'at or below 30% AMI');
    expect(s.types[0]).toMatchObject({ type: 'elderly_alone', count: 165 });
    expect(s.seniorAlone).toBe(true);
    const a = planTenants(HAZELWOOD, ['le30'], 1, 'any', 'at or below 30% AMI');
    expect(a.types.map((x) => x.count).reduce((x, y) => x + y, 0)).toBe(165 + 80);
    expect(a.sentence).toContain('165 + 80 = 245');
  });
});

describe('income level', () => {
  it('≤50% sums the ≤30% and 30–50% bands; the reason shows the sum', () => {
    const t = levelTarget(HAZELWOOD, 50);
    expect(t.hh).toBe(435 + 155);
    expect(t.burdened).toBe(350 + 110);
    expect(t.reason).toContain('350 + 110 = 460');
  });

  it('market rate reads the two bands above 80% AMI', () => {
    const t = levelTarget(HAZELWOOD, 'market');
    expect(t.hh).toBe(10 + 25);
    expect(t.available).toBe(true);
    expect(t.reason).toContain('10 + 25 = 35');
    expect(amiOf('market')).toBe(80);
    expect(amiOf(30)).toBe(30);
  });

  it('market rent: the 2-bedroom asking rent, else the ACS median rent', () => {
    expect(marketRent(HAZELWOOD).source).toBe('asking');
    const noAsk = { ...HAZELWOOD, market: { ...HAZELWOOD.market, asking_2br: null } } as PlaceMeasures;
    const r = marketRent(noAsk);
    expect(r.source).toBe('acs');
    expect(r.rent).toBe(HAZELWOOD.market.acs_rent);
  });
});

describe('flood limit', () => {
  it('four options by share of land in the flood zone: None 0%, ≤5%, ≤15%, Any', () => {
    expect(FLOOD_RISKS).toEqual(['none', 'le5', 'le15', 'any']);
    expect(FLOOD_RISKS.map((f) => FLOOD_LIMIT_PCT[f])).toEqual([0, 5, 15, null]);
    expect(FLOOD_RISKS.map((f) => FLOOD_LABEL[f])).toEqual(['None', '≤5%', '≤15%', 'Any']);
  });

  it('Hazelwood (9.6%) is above None and ≤5%, within ≤15% and Any', () => {
    expect(floodCheck(HAZELWOOD, 'none')).toMatchObject({ blocked: true, limit: 0, sentence: '9.6% of the land is in a FEMA flood zone (above your limit of none (0%)).' });
    expect(floodCheck(HAZELWOOD, 'le5')).toMatchObject({ blocked: true, sentence: '9.6% of the land is in a FEMA flood zone (above your limit of 5%).' });
    expect(floodCheck(HAZELWOOD, 'le15').blocked).toBe(false);
    expect(floodCheck(HAZELWOOD, 'any').blocked).toBe(false);
  });

  it('None passes only a tract with no land in the zone; a missing share is never blocked', () => {
    const dry = { ...HAZELWOOD, flood: { ...HAZELWOOD.flood, fema_sfha_pct: 0 } } as PlaceMeasures;
    expect(floodCheck(dry, 'none')).toMatchObject({ blocked: false, limit: 0 });
    const wet = { ...HAZELWOOD, flood: { ...HAZELWOOD.flood, fema_sfha_pct: 0.2 } } as PlaceMeasures;
    expect(floodCheck(wet, 'none').blocked).toBe(true);
    expect(floodCheck(wet, 'le5').blocked).toBe(false);
    const unknown = { ...HAZELWOOD, flood: { ...HAZELWOOD.flood, fema_sfha_pct: null } } as unknown as PlaceMeasures;
    for (const f of FLOOD_RISKS) expect(floodCheck(unknown, f).blocked).toBe(false);
  });

  it('a tract above the limit gets no suggestion, with the flood reason', () => {
    const r = recommend(HAZELWOOD, hud, 'anti_displacement', { ...base, level: 50, size: 3, age: 'any', flood: 'le5' });
    expect(r.types).toEqual([]);
    expect(r.floodLimit?.blocked).toBe(true);
    expect(r.headline).toContain('above your limit of 5%');
    const ok = recommend(HAZELWOOD, hud, 'anti_displacement', { ...base, level: 50, size: 3, age: 'any', flood: 'le15' });
    expect(ok.types.length).toBeGreaterThan(0);
  });

  it('suggestAll filters by the flood limit', () => {
    const places = new Map<string, PlaceMeasures>([['a', HAZELWOOD]]);
    const avoid = suggestAll(places, hud, 'anti_displacement', { level: 50, size: 3, age: 'any', flood: 'le5', transitMi: 0.5 });
    const any = suggestAll(places, hud, 'anti_displacement', { level: 50, size: 3, age: 'any', flood: 'any', transitMi: 0.5 });
    expect(avoid.get('a')?.lead).toBeNull();
    expect(any.get('a')?.lead).not.toBeNull();
  });
});

describe('recommend with planning inputs (Hazelwood)', () => {
  it('default: 3-person, any age, ≤50% → 2-bedroom at $1,242, 210 small families (fixture)', () => {
    const r = recommend(HAZELWOOD, hud, 'anti_displacement', { ...base, level: 50, size: 3, age: 'any', flood: 'le15' });
    expect(r.price?.rent).toBe(1242);
    expect(r.price?.formula).toBe('$49,700 × 30% ÷ 12 = $1,242');
    expect(r.types[0].bedrooms).toBe(2);
    expect(r.tenants.types[0]).toMatchObject({ type: 'small_family', count: 210 });
    expect(r.twoBedroom?.rent).toBe(1242);
    expectArithmetic(r);
  });

  it('1 person, 62+, ≤30% → senior housing, 1-bedroom at $580 for 165 seniors living alone', () => {
    const r = recommend(HAZELWOOD, hud, 'anti_displacement', { ...base, level: 30, size: 1, age: 'senior62' });
    expect(r.lead).toBe('senior');
    expect(r.price?.rent).toBe(580);
    expect(r.price?.formula).toBe('$23,200 × 30% ÷ 12 = $580');
    expect(r.tenants.types[0]).toMatchObject({ type: 'elderly_alone', count: 165 });
    expect(r.twoBedroom?.rent).toBe(745);
    expectArithmetic(r);
  });

  it('62+ alone and 62+ couple price for 1 and 2 people and keep senior housing allowed', () => {
    const alone = recommend(HAZELWOOD, hud, 'anti_displacement', { ...base, level: 30, size: 'auto', age: 'senior_alone' });
    expect(alone.household).toMatchObject({ type: 'elderly_alone', size: 1 });
    expect(alone.price?.rent).toBe(580);
    expect(alone.lead).toBe('senior');
    const couple = recommend(HAZELWOOD, hud, 'anti_displacement', { ...base, level: 50, size: 3, age: 'senior_couple' });
    expect(couple.household?.size).toBe(2);
    expect(couple.tenants.types.every((t) => t.type === 'elderly_family')).toBe(true);
    expect(couple.not.some((n) => n.typology === 'senior' && n.because.includes('under 62'))).toBe(false);
  });

  it('under 62: senior housing is never suggested', () => {
    const r = recommend(HAZELWOOD, hud, 'anti_displacement', { ...base, level: 50, size: 1, age: 'under62' });
    expect(r.types.map((t) => t.typology)).not.toContain('senior');
    expect(r.not.some((n) => n.typology === 'senior' && n.because.includes('62'))).toBe(true);
  });

  it('market rate: no HUD ceiling, the market-led test decides, CHAS >80% types serve', () => {
    const r = recommend(HAZELWOOD, hud, 'transit_first', { ...base, level: 'market', size: 3, age: 'any' });
    expect(r.price).toBeNull();
    expect(r.marketRent.rent).toBe(1150);
    expect(r.servedBands).toEqual(['b80_100', 'gt100']);
    expect(r.tenants.types[0]).toMatchObject({ type: 'small_family', count: HAZELWOOD.types.gt80.small_family });
    expect(r.stanceTest.sentence).toMatch(/Market test|No unsubsidized product/);
    expect(r.types.map((t) => t.typology)).not.toContain('senior');
  });

  it('market rate under Anti-displacement: no market-rate homes where displacement risk is high (Hazelwood 0.72)', () => {
    const r = recommend(HAZELWOOD, hud, 'anti_displacement', { ...base, level: 'market', size: 3, age: 'any' });
    expect(r.types).toEqual([]);
    expect(r.stanceTest.passed).toBe(false);
    expect(r.headline).toBe('No market-rate homes where displacement risk is high');
  });

  it('at ≤50% the market sentence says when listings reach the top of the level but not the ≤30% band', () => {
    const r = recommend(HAZELWOOD, hud, 'anti_displacement', { ...base, level: 50, size: 'auto', age: 'any' });
    expect(r.market.verdict).toBe('market_reaches');
    expect(r.market.sentence).toContain('not the ≤30% band, whose 2-bedroom ceiling is $745');
  });

  it('size changes the price; transit distance still applies', () => {
    const a = recommend(HAZELWOOD, hud, 'anti_displacement', { ...base, level: 50, size: 1 });
    const b = recommend(HAZELWOOD, hud, 'anti_displacement', { ...base, level: 50, size: 4 });
    expect(a.price?.rent).toBe(966);
    expect(b.price?.rent).toBe(1380);
    const near = recommend(HOMEWOOD_NORTH, hud, 'transit_first', { ...base, level: 50, size: 3, transitMiles: 0.5 });
    const far = recommend(HOMEWOOD_NORTH, hud, 'transit_first', { ...base, level: 50, size: 3, transitMiles: 0.25 });
    expect(near.stanceTest.passed).toBe(true);
    expect(far.types).toEqual([]);
  });

  it('transit sentence keeps the subtraction', () => {
    expect(transitTestMiles(HOMEWOOD_NORTH, 0.25).sentence).toContain('0.34 miles − 0.25 miles = 0.09 miles too far');
  });

  it('no under-served renters at the level: no suggestion', () => {
    const r = recommend(ZERO_PLACE, hud, 'anti_displacement', { ...base, level: 50, size: 3 });
    expect(r.types).toEqual([]);
  });

  it('homes needed: served share and yearly gap', () => {
    const h = homesLines(40, 265, 'qualifying 3-person households at or below 50% AMI', 50, 1400, 1242);
    expect(h.served).toBe('40 homes reach 40 of 265 qualifying 3-person households at or below 50% AMI (40 ÷ 265 = 15%).');
    expect(h.gap).toBe('Rent gap at 2-bedroom prices: ($1,400 − $1,242) × 12 × 40 = $75,840 a year.');
    expect(homesLines(40, 35, 'x', 'market', 1150, null).gap).toContain('no rent gap');
  });
});

describe('Climate-resilient focus', () => {
  it('Hazelwood (FEMA 9.6%) fails the ≤5% flood rule: not suggested here', () => {
    const t = climateTest(HAZELWOOD, 0.5);
    expect(t.passed).toBe(false);
    expect(t.sentence).toContain('not suggested here: 9.6% of land in a FEMA flood zone');
    expect(t.sentence).toContain('9.6% − 5% = 4.6 points over');
    const r = recommend(HAZELWOOD, hud, 'climate_resilient', { ...base, level: 50, size: 3, transitMiles: 0.5 });
    expect(r.types).toEqual([]);
    expect(r.headline).toBe('Not suggested here: 9.6% of land in a FEMA flood zone (the mark is 5%)');
    expect(r.lines).toContain(CLIMATE_WHY);
  });

  it('Squirrel Hill North (0% FEMA, frequent stop close by) passes; attached and multi-unit forms first', () => {
    const r = recommend(SQUIRREL_HILL_NORTH, hud, 'climate_resilient', { ...base, level: 50, size: 3, transitMiles: 0.5 });
    expect(r.stanceTest.passed).toBe(true);
    const order = r.types.map((t) => t.typology);
    // A 3-person household leans to the family forms, all attached; the ADU (detached-scale) comes last.
    expect(['small_apartment', 'duplex_triplex', 'townhome']).toContain(order[0]);
    expect(order.indexOf('small_apartment')).toBeLessThan(order.indexOf('adu'));
    const single = recommend(SQUIRREL_HILL_NORTH, hud, 'climate_resilient', { ...base, level: 50, transitMiles: 0.5 });
    expect(single.types[0].typology).toBe('small_apartment');
    expect(order[order.length - 1]).toBe('adu');
    expectArithmetic(r);
  });

  it('too far from frequent transit fails with the subtraction', () => {
    const far = { ...SQUIRREL_HILL_NORTH, transit: { ...SQUIRREL_HILL_NORTH.transit, freq_dist_mi: 0.8 } } as PlaceMeasures;
    const t = climateTest(far, 0.5);
    expect(t.passed).toBe(false);
    expect(t.sentence).toContain('too far from frequent transit');
    expect(t.sentence).toContain('0.80 miles − 0.50 miles = 0.30 miles too far');
  });
});

describe('household size "Any" (auto: sized for the largest group here)', () => {
  // CHAS counts at the Central Business District (42003020100): single adults and unrelated households lead.
  const CBD_LIKE = {
    ...HAZELWOOD,
    types: {
      le30: { elderly_alone: 70, elderly_family: 0, small_family: 4, large_family: 0, other: 235 },
      b30_50: { elderly_alone: 45, elderly_family: 0, small_family: 0, large_family: 0, other: 105 },
      b50_80: { elderly_alone: 15, elderly_family: 0, small_family: 30, large_family: 0, other: 30 },
      gt80: { elderly_alone: 95, elderly_family: 30, small_family: 170, large_family: 0, other: 950 },
    },
  } as PlaceMeasures;

  it('is the first option and prices from the picked type', () => {
    expect(HOUSEHOLD_SIZES[0]).toBe('auto');
    expect(SIZE_LABEL.auto).toBe('Any');
    expect(sizeIncomeLine(hud, 50, 'auto')).toContain("Uses each place's largest group; e.g. 1 person at 50% AMI: up to $38,650");
  });

  it('Hazelwood ≤30%: seniors living alone (165) → 1 person, studio/1-bedroom at $580', () => {
    expect(largestType(HAZELWOOD, ['le30'], 'any')).toEqual({ type: 'elderly_alone', count: 165 });
    const r = recommend(HAZELWOOD, hud, 'anti_displacement', { ...base, level: 30, size: 'auto', age: 'any' });
    expect(r.household).toMatchObject({ auto: true, type: 'elderly_alone', size: 1 });
    expect(r.price?.rent).toBe(580);
    expect(r.tenants.types).toEqual([{ type: 'elderly_alone', label: 'seniors (62+) living alone', count: 165 }]);
    expect(r.tenants.bedrooms).toBe(1);
    expectArithmetic(r);
  });

  it('Hazelwood ≤50%: small families (150 + 60 = 210) → priced at 3, 2-bedroom at $1,242', () => {
    const r = recommend(HAZELWOOD, hud, 'anti_displacement', { ...base, level: 50, size: 'auto', age: 'any' });
    expect(r.household).toMatchObject({ type: 'small_family', size: 3, count: 210 });
    expect(r.price?.formula).toBe('$49,700 × 30% ÷ 12 = $1,242');
    expect(r.tenants.sentence).toContain('150 at ≤30% + 60 at 30–50% = 210');
    expect(r.types[0].bedrooms).toBe(2);
  });

  it('CBD-like ≤50%: 340 single adults and unrelated households → 1 person at $966', () => {
    const r = recommend(CBD_LIKE, hud, 'anti_displacement', { ...base, level: 50, size: 'auto', age: 'any' });
    expect(r.household).toMatchObject({ type: 'other', size: 1, count: 340 });
    expect(r.price?.rent).toBe(966);
    expect(r.tenants.types[0]).toMatchObject({ type: 'other', count: 340 });
    expect(r.types[0]?.bedrooms).toBe(1);
  });

  it('respects the age group', () => {
    expect(resolveHousehold(CBD_LIKE, ['le30', 'b30_50'], 'auto', 'senior62')).toMatchObject({ type: 'elderly_alone', size: 1 });
    expect(resolveHousehold(HAZELWOOD, ['le30'], 'auto', 'under62')).toMatchObject({ type: 'small_family', size: 3 });
    expect(resolveHousehold(HAZELWOOD, ['le30'], 3, 'any')).toEqual({ size: 3, auto: false, type: null, count: null });
  });

  it('no CHAS types on file: no suggestion, no crash', () => {
    const r = recommend(ZERO_PLACE, hud, 'anti_displacement', { ...base, level: 50, size: 'auto' });
    expect(r.types).toEqual([]);
  });
});
