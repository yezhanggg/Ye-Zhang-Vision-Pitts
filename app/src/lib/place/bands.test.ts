import { describe, expect, it } from 'vitest';
import { bandFigures, rankBands, sumBands, sumTypes, targetBand, tenantProfile, typeBandFor } from './bands';
import { HAZELWOOD, HOMEWOOD_NORTH, NULL_PLACE, SQUIRREL_HILL_NORTH, ZERO_PLACE } from './fixture';

describe('targetBand', () => {
  it('Hazelwood: ≤30% with 350 burdened, certain', () => {
    const t = targetBand(HAZELWOOD);
    expect(t.band).toBe('le30');
    expect(t.burdened).toBe(350);
    expect(t.hh).toBe(435);
    expect(t.uncertain).toBe(false);
    expect(t.runnerUp).toBe('b30_50');
    expect(t.reason).toContain('435 renter households at or below 30% of area median income, 350 of them paying more than 30% of income');
    expect(t.reason).toContain('next: 30–50% AMI with 110');
    expect(t.available).toBe(true);
  });
  it('Homewood North: ≤30%', () => {
    const t = targetBand(HOMEWOOD_NORTH);
    expect(t.band).toBe('le30');
    expect(t.burdened).toBe(170);
    expect(t.uncertain).toBe(false);
  });
  it('Squirrel Hill North: 30–50% with 110 burdened, not uncertain (MOE 66 < 115)', () => {
    const t = targetBand(SQUIRREL_HILL_NORTH);
    expect(t.band).toBe('b30_50');
    expect(t.burdened).toBe(110);
    expect(t.hh).toBe(115);
    expect(t.uncertain).toBe(false);
    expect(t.reason).toContain('115 ±66');
  });
  it('ties go to the more severe burden, then to the lower band', () => {
    const p = structuredClone(HAZELWOOD);
    p.bands.b30_50.burden30 = 350;
    p.bands.b30_50.burden50 = 300;
    expect(rankBands(p)[0]).toBe('b30_50');
    p.bands.b30_50.burden50 = 280;
    expect(rankBands(p)[0]).toBe('le30');
  });
  it('flags uncertainty when the margin of error exceeds the estimate and names the runner-up', () => {
    const p = structuredClone(HAZELWOOD);
    p.bands.le30.moe = 500;
    const t = targetBand(p);
    expect(t.uncertain).toBe(true);
    expect(t.reason).toContain('uncertain');
    expect(t.reason).toContain('30–50% AMI is the runner-up');
  });
  it('a chosen band overrides', () => {
    const t = targetBand(HAZELWOOD, 'b50_80');
    expect(t.band).toBe('b50_80');
    expect(t.overridden).toBe(true);
    expect(t.reason).toContain('Band chosen by you');
    expect(t.burdened).toBe(0);
  });
  it('a zero-renter tract is not under-served on the evidence', () => {
    const t = targetBand(ZERO_PLACE);
    expect(t.available).toBe(false);
    expect(t.burdened).toBe(0);
    expect(t.reason).toBe('CHAS counts no renter households here, so no band is under-served on the evidence.');
    const p = structuredClone(ZERO_PLACE);
    p.renter_hh = 40;
    expect(targetBand(p).reason).toContain('no renter households paying more than 30% of income here, in any band (40 renter households)');
  });
  it('all nulls: defaults to ≤30%, says not available, never throws', () => {
    const t = targetBand(NULL_PLACE);
    expect(t.band).toBe('le30');
    expect(t.available).toBe(false);
    expect(t.burdened).toBeNull();
    expect(t.reason).toContain('not available');
    expect(bandFigures(NULL_PLACE, 'le30')).toContain('not available');
    expect(targetBand({} as never).available).toBe(false);
  });
});

describe('tenantProfile', () => {
  it('Hazelwood ≤30%: seniors living alone lead → 1BR for one person', () => {
    const t = tenantProfile(HAZELWOOD, 'le30');
    expect(t.types.map((x) => [x.type, x.count])).toEqual([['elderly_alone', 165], ['small_family', 150], ['other', 80], ['elderly_family', 40]]);
    expect(t.bedrooms).toBe(1);
    expect(t.seniorAlone).toBe(true);
    expect(t.sentence).toContain('165 seniors living alone');
    expect(t.sentence).toContain('1-bedroom for one person');
  });
  it('Homewood North ≤30%: seniors living alone (100) ahead of small families (90)', () => {
    const t = tenantProfile(HOMEWOOD_NORTH, 'le30');
    expect(t.types[0].type).toBe('elderly_alone');
    expect(t.bedrooms).toBe(1);
  });
  it('Squirrel Hill North 30–50%: a tie between seniors alone and other goes to seniors', () => {
    const t = tenantProfile(SQUIRREL_HILL_NORTH, 'b30_50');
    expect(t.types[0].type).toBe('elderly_alone');
    expect(t.types[1].type).toBe('other');
    expect(t.bedrooms).toBe(1);
    expect(t.seniorAlone).toBe(true);
  });
  it('small families → 2BR, large families → 3BR', () => {
    const p = structuredClone(HAZELWOOD);
    p.types.le30 = { elderly_alone: 10, elderly_family: 0, small_family: 150, large_family: 20, other: 5 };
    expect(tenantProfile(p, 'le30').bedrooms).toBe(2);
    expect(tenantProfile(p, 'le30').seniorAlone).toBe(false);
    p.types.le30.large_family = 200;
    expect(tenantProfile(p, 'le30').bedrooms).toBe(3);
  });
  it('the top bands read the >80% row', () => {
    expect(typeBandFor('b80_100')).toBe('gt80');
    expect(typeBandFor('gt100')).toBe('gt80');
    expect(tenantProfile(SQUIRREL_HILL_NORTH, 'gt100').sentence).toMatch(/above 80% AMI/i);
    expect(tenantProfile(SQUIRREL_HILL_NORTH, 'gt100').sentence).toContain('does not split 80–100%');
  });
  it('nulls read not available and never throw', () => {
    const t = tenantProfile(NULL_PLACE, 'le30');
    expect(t.types).toEqual([]);
    expect(t.available).toBe(false);
    expect(t.sentence).toContain('not available');
    expect(tenantProfile({} as never, 'le30').sentence).toContain('not available');
  });
});

describe('sums', () => {
  it('sum bands and types over ≤50%', () => {
    expect(sumBands(HAZELWOOD, ['le30', 'b30_50'])).toEqual({ hh: 590, burden30: 460, burden50: 310 });
    expect(sumTypes(HAZELWOOD, ['le30', 'b30_50'])?.elderly_alone).toBe(200);
    expect(sumTypes(HAZELWOOD, ['b80_100', 'gt100'])?.small_family).toBe(20);
    expect(sumBands(NULL_PLACE, ['le30']).hh).toBeNull();
    expect(sumTypes(NULL_PLACE, ['le30'])).toBeNull();
  });
});
