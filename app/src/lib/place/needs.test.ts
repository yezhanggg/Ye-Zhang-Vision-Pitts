import { describe, expect, it } from 'vitest';
import { FIXTURE_HUD as hud, HAZELWOOD, NULL_PLACE, SQUIRREL_HILL_NORTH } from './fixture';
import { needsArithmetic } from './needs';
import { REFUSES } from './copy';

describe('needsArithmetic', () => {
  it('40 homes for seniors at 50% in Hazelwood: $966, seniors in the ≤50% bands, the ratio sentence', () => {
    const r = needsArithmetic(HAZELWOOD, hud, { homes: 40, population: 'seniors', band: 50 });
    expect(r.requiredRent).toBe(966);
    expect(r.requiredRentFormula).toBe('$38,650 × 30% ÷ 12 = $966');
    // seniors alone + senior families in ≤30% (165 + 40) and 30–50% (35 + 20)
    expect(r.qualifying).toBe(260);
    expect(r.servedRatio).toBe('40 homes reach 40 of 260 qualifying senior households at or below 50% AMI (40 ÷ 260 = 15%).');
    expect(r.gapPerYear).toBe(0);
    expect(r.gapSentence).toContain('no rent gap on turnover');
    expect(r.scaleByType.senior).toBe('1–2 buildings of 20–60 homes');
    expect(r.scaleByType.adu).toBe('40 lots, one ADU each');
    expect(r.scaleByType.duplex_triplex).toBe('14–20 houses converted (2–3 homes each)');
    expect(r.scaleByType.small_apartment).toBe('3–8 buildings of 5–19 homes');
    expect(r.refuses).toEqual(REFUSES);
    expect(r.lines.join('\n')).toContain('$38,650 × 30% ÷ 12 = $966');
  });
  it('families at 30%: 2BR $745 and a yearly gap at 2-bedroom prices', () => {
    const r = needsArithmetic(HAZELWOOD, hud, { homes: 20, population: 'families', band: 30 });
    expect(r.requiredRent).toBe(745);
    expect(r.qualifying).toBe(150);
    expect(r.gapPerYear).toBe(405 * 12 * 20);
    expect(r.gapSentence).toContain('($1,150 − $745) × 12 × 20 = $97,200 a year');
  });
  it('more homes than qualifying households says so', () => {
    const r = needsArithmetic(SQUIRREL_HILL_NORTH, hud, { homes: 300, population: 'seniors', band: 30 });
    expect(r.qualifying).toBe(20);
    expect(r.servedRatio).toContain('all of them');
    expect(r.servedRatio).toContain('280 homes to spare');
  });
  it('all renters at 80% count the bands', () => {
    const r = needsArithmetic(HAZELWOOD, hud, { homes: 100, population: 'all', band: 80 });
    expect(r.qualifying).toBe(690);
    expect(r.requiredRent).toBe(1988);
  });
  it('no homes count: asks for one, still gives the rent', () => {
    const r = needsArithmetic(HAZELWOOD, hud, { homes: null, population: 'seniors', band: 50 });
    expect(r.requiredRent).toBe(966);
    expect(r.servedRatio).toContain('Enter how many homes');
    expect(r.gapPerYear).toBeNull();
    expect(r.scaleByType.adu).toBe('—');
  });
  it('nulls read not available and never throw', () => {
    const r = needsArithmetic(NULL_PLACE, hud, { homes: 40, population: 'seniors', band: 50 });
    expect(r.requiredRent).toBe(966);
    expect(r.qualifying).toBeNull();
    expect(r.servedRatio).toContain('not available');
    expect(r.gapPerYear).toBeNull();
    expect(r.gapSentence).toContain('not available');
    expect(() => needsArithmetic({} as never, hud, { homes: 1, population: 'all', band: 30 })).not.toThrow();
  });
});
