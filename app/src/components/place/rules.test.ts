// Block G's adapter over lib/place/recommend on the synthetic Hazelwood fixture (lib/place/fixture, the plan's computed
// examples): the lines carry their labels and arithmetic, the fixed sentences close them, and nothing prints a score
// out of 100 or a share of runs. Nothing here reads place.json.
import { describe, expect, it } from 'vitest';
import type { TractResult } from '../../lib/derived';
import { FIXTURE_HUD, HAZELWOOD, HOMEWOOD_NORTH, NULL_PLACE, SQUIRREL_HILL_NORTH } from '../../lib/place/fixture';
import { cumulative } from './Affordability';
import { NOT_CLAIMED, YOU_DECIDE, computeRules } from './Rules';
import { districtText } from './ZoningPrograms';

const R: TractResult = { scores: [], ranking: ['small_apartment', 'senior', 'adu', 'duplex_triplex', 'townhome'], top: 'small_apartment', topScore: 0.7 };
const ORDERS = { anti_displacement: ['senior', 'small_apartment', 'adu', 'duplex_triplex', 'townhome'], market_led: ['townhome', 'small_apartment', 'duplex_triplex', 'adu', 'senior'], transit_first: ['small_apartment', 'senior', 'townhome', 'duplex_triplex', 'adu'] };
const text = (o: ReturnType<typeof computeRules>) => o.lines.map((l) => `${l.label}: ${l.text}`).join('\n');

describe('block A helpers', () => {
  it('sums the bands at or below 50% and flags an uncertain band', () => {
    expect(cumulative(HAZELWOOD, 'b30_50')).toEqual({ hh: 590, b30: 460, b50: 310, uncertain: false });
    expect(cumulative(HAZELWOOD, 'le30').uncertain).toBe(false);
    expect(cumulative({ ...HAZELWOOD, bands: { ...HAZELWOOD.bands, le30: { hh: 100, moe: 171, burden30: 50, burden50: 20 } } }, 'le30').uncertain).toBe(true);
    expect(cumulative(NULL_PLACE, 'b30_50')).toEqual({ hh: null, b30: null, b50: null, uncertain: false });
  });
  it('prints districts largest first and drops shares under 1%', () => {
    expect(districtText(HAZELWOOD.zoning!.shares)).toBe('P 45% · RIV-GI 12% · R1A-H 10% · H 10% · R1D-M 7% · RM-M 7% · LNC 2% · R2 1%');
    expect(districtText({ A: 0.4, B: 0.004 })).toBe('A 40%'); // fractions (place.json) scale to percents; under 1% dropped
    expect(districtText({ A: 40, B: 0.4 })).toBe('A 40%'); // percents stay percents
  });
});

describe('the rules adapter on Hazelwood', () => {
  const anti = computeRules(HAZELWOOD, R, 'anti_displacement', ORDERS, undefined, FIXTURE_HUD);
  const market = computeRules(HAZELWOOD, R, 'market_led', ORDERS, undefined, FIXTURE_HUD);
  const transit = computeRules(HAZELWOOD, R, 'transit_first', ORDERS, undefined, FIXTURE_HUD);

  it('targets the ≤30% band (350 burdened), seniors living alone, $580 for one person and the 2BR test at $745 vs $1,150', () => {
    expect(anti.targetBand).toBe('le30');
    expect(anti.typeBand).toBe('le30');
    expect(anti.rec?.band.burdened).toBe(350);
    expect(anti.rec?.tenants.seniorAlone).toBe(true);
    expect(anti.rec?.price?.rent).toBe(580);
    const s = text(anti);
    expect(s).toContain('Under-served here: ');
    expect(s).toContain('Main tenants the data shows: ');
    expect(s).toContain('$23,200 × 30% ÷ 12 = $580');
    expect(s).toContain('$29,800 × 30% ÷ 12 = $745');
    expect(s).toContain('$1,150');
  });
  it('anti-displacement at 0.72 ≥ 0.67: additive types, why not townhome, the fixed closing lines', () => {
    const s = text(anti);
    expect(s).toContain('Displacement risk here is 0.72, at or above the 0.67 mark');
    expect(s).toMatch(/Types that can deliver this \(fit rules, a value judgment\): (ADU|Duplex \/ triplex|Senior housing|Small apartment)/i);
    expect(s).toContain('Not townhome');
    expect(s).toContain(`You decide: ${YOU_DECIDE}`);
    expect(s).toContain(`Refuses to pretend: ${NOT_CLAIMED}`);
    expect(s).toContain('(unverified)');
    expect(anti.lines.find((l) => l.label === 'Anti-displacement rule')).toBeTruthy();
  });
  it('market-led: no unsubsidized product (asking below the ZIP FMR), and who is not served', () => {
    const s = text(market);
    expect(s).toContain('No unsubsidized product is supported here');
    expect(s).toContain('$1,350 − $1,150 = $200 below the ZIP Fair Market Rent');
    expect(s).toContain('Not served by this option');
    expect(market.lines.find((l) => l.label === 'Market-led rule')?.tone).toBe('warn');
  });
  it('transit-first: passes at 65% within a quarter mile; Homewood North fails at 35% and 618 departures', () => {
    expect(text(transit)).toContain('Transit test passes: 65% of residents live within a quarter mile of a frequent stop');
    const fail = computeRules(HOMEWOOD_NORTH, R, 'transit_first', ORDERS, undefined, FIXTURE_HUD);
    expect(text(fail)).toMatch(/Fails the transit test: 35% of residents/);
  });
  it('squirrel hill north under market-led names a market product and who it leaves out', () => {
    const s = text(computeRules(SQUIRREL_HILL_NORTH, R, 'market_led', ORDERS, undefined, FIXTURE_HUD));
    expect(s).toContain('Market test passes');
    expect(s).toContain('Not served by this option');
  });
  it('never prints a score out of 100 or a share of runs', () => {
    for (const o of [anti, market, transit]) expect(text(o)).not.toMatch(/\/ ?100|\b\d+ of 10\b/);
  });
  it('survives an all-null place, and no HUD table, without throwing', () => {
    for (const s of ['anti_displacement', 'market_led', 'transit_first']) {
      const o = computeRules(NULL_PLACE, R, s, ORDERS, undefined, FIXTURE_HUD);
      expect(o.lines.length).toBeGreaterThan(3);
      expect(text(o)).toContain('not available');
      expect(o.targetBand).toBeNull();
    }
    const none = computeRules(HAZELWOOD, R, 'anti_displacement', ORDERS, undefined, null);
    expect(none.rec).toBeNull();
    expect(text(none)).toContain('HUD income limits not available');
    expect(text(none)).toContain(YOU_DECIDE);
  });
});
