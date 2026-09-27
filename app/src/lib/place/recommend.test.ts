import { describe, expect, it } from 'vitest';
import { FIXTURE_CITY_MEDIAN_VALUE, FIXTURE_HUD as hud, HAZELWOOD, HOMEWOOD_NORTH, NULL_PLACE, SQUIRREL_HILL_NORTH, ZERO_PLACE } from './fixture';
import { normalizeFitOrder, recommend, underEachStance, type Recommendation } from './recommend';
import { STANCES, TYPOLOGIES } from './thresholds';
import type { Stance, Typology } from './types';

const opts = { cityMedianValue: FIXTURE_CITY_MEDIAN_VALUE };
const rec = (p: typeof HAZELWOOD, stance: Stance, extra: Record<string, unknown> = {}) => recommend(p, hud, stance, { ...opts, ...extra });

/** Every line that shows a dollar figure shows its arithmetic (×, ÷, − or =). */
function expectArithmetic(r: Recommendation) {
  for (const line of [...r.lines, ...r.types.map((t) => t.because), ...r.not.map((n) => n.because)]) {
    if (line.includes('$')) expect(line, line).toMatch(/[×÷−=]/);
  }
}

describe('Hazelwood', () => {
  it('Anti-displacement: high risk → senior 1BR for seniors alone at $580–966, additive types, not townhome', () => {
    const r = rec(HAZELWOOD, 'anti_displacement');
    expect(r.branch).toBe('high');
    expect(r.band.band).toBe('le30');
    expect(r.servedBands).toEqual(['le30', 'b30_50']);
    expect(r.lead).toBe('senior');
    expect(r.types[0].bedrooms).toBe(1);
    expect(r.price?.rent).toBe(580);
    expect(r.priceAlso?.rent).toBe(966);
    expect(r.twoBedroom?.rent).toBe(745);
    expect(r.market.gap).toBe(405);
    expect(r.types.map((t) => t.typology).sort()).toEqual(['adu', 'duplex_triplex', 'senior', 'small_apartment']);
    expect(r.not.map((n) => n.typology)).toEqual(['townhome']);
    expect(r.notServed).toEqual(['b50_80', 'b80_100', 'gt100']);
    expect(r.notServedWhy).toBe('above the income limit for these homes');
    expect(r.types.find((t) => t.typology === 'duplex_triplex')?.bedrooms).toBe(2);
    expect(r.stanceTest.passed).toBe(true);
    expect(r.stanceTest.sentence).toContain('0.72, at or above the 0.67 mark');
    expect(r.lines.join('\n')).toContain('$23,200 × 30% ÷ 12 = $580');
    expect(r.lines.join('\n')).toContain('$38,650 × 30% ÷ 12 = $966');
    expect(r.lines.join('\n')).toContain('$29,800 × 30% ÷ 12 = $745');
    expect(r.lines.join('\n')).toContain('165 seniors living alone');
    expect(r.lines.join('\n')).toContain('gross rent, utility allowance not known');
    expect(r.lines[r.lines.length - 1]).toContain('This page does not choose.');
    expect(r.headline).toContain('Senior housing');
    expect(r.headline).toContain('$580–$966');
    expectArithmetic(r);
  });
  it('Market-led: no unsubsidized product, gap shown, not served ≤30%', () => {
    const r = rec(HAZELWOOD, 'market_led');
    expect(r.stanceTest.passed).toBe(false);
    expect(r.lead).toBeNull();
    expect(r.types).toEqual([]);
    expect(r.stanceTest.sentence).toContain('No unsubsidized product is supported here');
    expect(r.stanceTest.sentence).toContain('$1,350 − $1,150 = $200 below');
    expect(r.stanceTest.sentence).toContain('$207,850 − $89,100 = $118,750 below the city median');
    expect(r.notServed).toEqual(['le30']);
    expect(r.notServedWhy).toContain('$1,150 − $745 = $405 short');
    expect(r.servedBands).toEqual([]);
    expect(r.lines.join('\n')).toContain('Not served by this option: ≤30% AMI');
    expect(r.headline).toBe('No unsubsidized product is supported here');
    expectArithmetic(r);
  });
  it('Transit-first: passes at 65%, densest feasible type is the small apartment', () => {
    const r = rec(HAZELWOOD, 'transit_first');
    expect(r.stanceTest.passed).toBe(true);
    expect(r.stanceTest.sentence).toContain('65% of residents');
    expect(r.lead).toBe('small_apartment');
    expect(r.types.map((t) => t.typology)).toEqual(['small_apartment', 'senior', 'duplex_triplex']);
    expect(r.not.map((n) => n.typology)).toEqual(['adu', 'townhome']);
    expectArithmetic(r);
  });
});

describe('Homewood North', () => {
  it('Anti-displacement: between → target band ≤30%, additive preference, senior lead', () => {
    const r = rec(HOMEWOOD_NORTH, 'anti_displacement');
    expect(r.branch).toBe('between');
    expect(r.band.band).toBe('le30');
    expect(r.lead).toBe('senior');
    expect(r.price?.rent).toBe(580);
    expect(r.market.verdict).toBe('needs_subsidy');
    expect(r.market.gap).toBe(505);
    expect(r.types.map((t) => t.typology)).toContain('duplex_triplex');
    expect(r.types.find((t) => t.typology === 'duplex_triplex')?.because).toContain('82 parcels hold 2–4 units');
    expect(r.not.map((n) => n.typology)).toEqual(['townhome']);
    expectArithmetic(r);
  });
  it('Market-led: no unsubsidized product', () => {
    const r = rec(HOMEWOOD_NORTH, 'market_led');
    expect(r.stanceTest.passed).toBe(false);
    expect(r.stanceTest.sentence).toContain('No unsubsidized product is supported here');
    expect(r.stanceTest.sentence).toContain('sale median since 2023 $45,000');
    expectArithmetic(r);
  });
  it('Transit-first fails: 35% and 618 departures, 0.34 miles', () => {
    const r = rec(HOMEWOOD_NORTH, 'transit_first');
    expect(r.stanceTest.passed).toBe(false);
    expect(r.stanceTest.sentence).toContain('Fails the transit test');
    expect(r.stanceTest.sentence).toContain('35%');
    expect(r.stanceTest.sentence).toContain('618 weekday departures');
    expect(r.stanceTest.sentence).toContain('0.34 miles');
    expect(r.types).toEqual([]);
    expect(r.headline).toContain('Fails the transit test');
    expectArithmetic(r);
  });
});

describe('Squirrel Hill North', () => {
  it('Anti-displacement: low risk → gentle density for 30–50%, senior lead at $966, gap $653', () => {
    const r = rec(SQUIRREL_HILL_NORTH, 'anti_displacement');
    expect(r.branch).toBe('low');
    expect(r.band.band).toBe('b30_50');
    expect(r.band.uncertain).toBe(false);
    expect(r.lead).toBe('senior');
    expect(r.price?.rent).toBe(966);
    expect(r.twoBedroom?.rent).toBe(1242);
    expect(r.market.verdict).toBe('gap');
    expect(r.market.gap).toBe(653);
    expect(r.lines.join('\n')).toContain('$1,895 − $1,242 = $653');
    expect(r.not.map((n) => n.typology)).toEqual(['townhome']);
    expect(r.notServed).toEqual(['le30', 'b50_80', 'b80_100', 'gt100']);
    expect(r.notServedWhy).toContain('≤30% AMI only with a voucher');
    expectArithmetic(r);
  });
  it('Market-led: townhome leads; not served: every band at or below 100% AMI', () => {
    const r = rec(SQUIRREL_HILL_NORTH, 'market_led');
    expect(r.stanceTest.passed).toBe(true);
    expect(r.lead).toBe('townhome');
    expect(r.types.map((t) => t.typology)).toEqual(['townhome', 'small_apartment', 'duplex_triplex', 'adu']);
    expect(r.not.map((n) => n.typology)).toEqual(['senior']);
    expect(r.notServed).toEqual(['le30', 'b30_50', 'b50_80', 'b80_100']);
    expect(r.notServedWhy).toContain('$766,066 ÷ 3 = $255,355');
    expect(r.notServedWhy).toContain('$110,400');
    expect(r.servedBands).toEqual(['gt100']);
    expect(r.headline).toBe('Townhome (2-bedroom, for sale) at the $766,066 sale median; serves households above 100% AMI');
    expect(r.types[0].because).toContain('$766,066 − $207,850 = $558,216 above the city median');
    expect(r.types[0].because).not.toContain('small families');
    expect(r.lines[3]).toContain('Types the market pays for here');
    expectArithmetic(r);
  });
  it('Market-led with a rental fit order: not served by the 2-bedroom ceilings', () => {
    const r = rec(SQUIRREL_HILL_NORTH, 'market_led', { fitOrder: ['small_apartment', 'townhome'] });
    expect(r.lead).toBe('small_apartment');
    expect(r.notServed).toEqual(['le30', 'b30_50']);
    expect(r.notServedWhy).toContain('$1,242');
    expectArithmetic(r);
  });
  it('Transit-first: 96% → small apartment, infill only', () => {
    const r = rec(SQUIRREL_HILL_NORTH, 'transit_first');
    expect(r.stanceTest.passed).toBe(true);
    expect(r.lead).toBe('small_apartment');
    expect(r.types[0].because).toContain('infill only');
    expectArithmetic(r);
  });
});

describe('options', () => {
  it('a chosen band overrides the rule and the >100% band has no ceiling', () => {
    const r = rec(SQUIRREL_HILL_NORTH, 'anti_displacement', { band: 'gt100' });
    expect(r.band.band).toBe('gt100');
    expect(r.band.overridden).toBe(true);
    expect(r.price).toBeNull();
    expect(r.lines[2]).toContain('no HUD rent ceiling applies');
    expect(r.lines[2]).toContain('$79,500 × 30% ÷ 12 = $1,988');
    expect(r.types.map((t) => t.typology)).toContain('townhome');
    expectArithmetic(r);
  });
  it('a chosen 50–80% band prices at 80%', () => {
    const r = rec(HAZELWOOD, 'anti_displacement', { band: 'b50_80' });
    expect(r.band.band).toBe('b50_80');
    expect(r.price?.pct).toBe(80);
    expect(r.twoBedroom?.rent).toBe(1988);
    expect(r.market.verdict).toBe('market_reaches');
  });
  it('the fit order orders types within the feasible set; the lead follows the tenants', () => {
    const r = rec(HAZELWOOD, 'anti_displacement', { fitOrder: ['small_apartment', 'senior', 'adu', 'duplex_triplex', 'townhome'] });
    expect(r.lead).toBe('senior');
    expect(r.types.map((t) => t.typology)).toEqual(['senior', 'adu', 'small_apartment', 'duplex_triplex']);
    expect(normalizeFitOrder(['townhome'], 'anti_displacement')).toEqual(['townhome', 'senior', 'small_apartment', 'adu', 'duplex_triplex']);
    expect(normalizeFitOrder(undefined, 'market_led')[0]).toBe('townhome');
  });
});

describe('nulls everywhere', () => {
  it('every stance reads not available and never throws', () => {
    for (const stance of STANCES) {
      const r = rec(NULL_PLACE, stance, { cityMedianValue: null });
      expect(r.lines.length).toBeGreaterThanOrEqual(6);
      expect(r.lines.join('\n')).toContain('not available');
      expect(r.decide).toContain('This page does not choose.');
      if (stance !== 'anti_displacement') expect(r.stanceTest.passed).toBeNull();
      expectArithmetic(r);
    }
    const r = rec(NULL_PLACE, 'anti_displacement', { cityMedianValue: null });
    expect(r.branch).toBe('unknown');
    expect(r.stanceTest.passed).toBeNull();
    expect(r.market.verdict).toBe('unknown');
    expect(r.price?.rent).toBe(621);
  });
  it('an empty object never throws', () => {
    for (const stance of STANCES) expect(() => recommend({} as never, hud, stance, opts)).not.toThrow();
  });
});

describe('zero-need tract (park, campus, downtown block)', () => {
  it('need-driven stances recommend nothing and say why; Market-led runs its own test', () => {
    const a = rec(ZERO_PLACE, 'anti_displacement');
    expect(a.band.available).toBe(false);
    expect(a.lead).toBeNull();
    expect(a.types).toEqual([]);
    expect(a.not).toEqual([]);
    expect(a.notServed).toEqual([]);
    expect(a.headline).toContain('No under-served band on the evidence');
    expect(a.lines[0]).toContain('CHAS counts no renter households here');
    expect(a.lines.join('\n')).toContain('Not served by this option: nothing is recommended');
    const t = rec(ZERO_PLACE, 'transit_first');
    expect(t.stanceTest.passed).toBe(true);
    expect(t.lead).toBeNull();
    expect(t.headline).toContain('No under-served band on the evidence');
    const m = rec(ZERO_PLACE, 'market_led');
    expect(m.stanceTest.passed).toBeNull();
    expect(m.headline).toContain('Market test incomplete');
    for (const r of [a, t, m]) expectArithmetic(r);
  });
});

describe('underEachStance', () => {
  it('one row per stance with the lead, the fit top and a close-call word', () => {
    const orders: Record<Stance, Typology[]> = {
      anti_displacement: ['small_apartment', 'senior', 'adu', 'duplex_triplex', 'townhome'],
      market_led: ['townhome', 'small_apartment', 'duplex_triplex', 'adu', 'senior'],
      transit_first: ['small_apartment', 'senior', 'townhome', 'duplex_triplex', 'adu'],
      climate_resilient: ['small_apartment', 'duplex_triplex', 'townhome', 'senior', 'adu'],
    };
    const rows = underEachStance(HAZELWOOD, hud, orders);
    expect(rows.map((r) => r.stance)).toEqual(STANCES);
    expect(rows[0].leadType).toBe('senior');
    expect(rows[0].fitTop).toBe('small_apartment');
    expect(rows[0].close).toBe(true);
    expect(rows[0].word).toBe('close call');
    expect(rows[1].leadType).toBeNull();
    expect(rows[1].word).toBe('no product');
    expect(rows[1].lead).toContain('No unsubsidized product');
    expect(rows[2].leadType).toBe('small_apartment');
    expect(rows[2].word).toBe('agrees');
    for (const r of rows) {
      expect(typeof r.lead).toBe('string');
      expect(r.fitTop == null || TYPOLOGIES.includes(r.fitTop)).toBe(true);
    }
  });
  it('missing fit orders fall back to the stance defaults', () => {
    const rows = underEachStance(SQUIRREL_HILL_NORTH, hud, {} as Record<Stance, Typology[]>);
    expect(rows[1].leadType).toBe('townhome');
    expect(rows[1].fitTop).toBe('townhome');
    expect(rows[1].word).toBe('agrees');
  });
});
