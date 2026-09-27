import { describe, expect, it } from 'vitest';
import { BAND_PCT, bandLimit4p, bandsUpTo, ceilingRent, limitAt100, limitFor, marketTest, personsForBedrooms } from './afford';
import { FIXTURE_HUD as hud } from './fixture';
import { roundHalfEven } from './format';

describe('household size and income limits', () => {
  it('1.5 persons per bedroom, a studio counts one person', () => {
    expect(personsForBedrooms(0)).toBe(1);
    expect(personsForBedrooms(1)).toBe(1.5);
    expect(personsForBedrooms(2)).toBe(3);
    expect(personsForBedrooms(3)).toBe(4.5);
  });
  it('half persons are the mean of the two neighbouring sizes', () => {
    expect(limitFor(hud, 30, 1)).toBe(23200);
    expect(limitFor(hud, 30, 1.5)).toBe(24850);
    expect(limitFor(hud, 50, 1.5)).toBe(41425);
    expect(limitFor(hud, 50, 3)).toBe(49700);
    expect(limitFor(hud, 80, 4)).toBe(88300);
    expect(limitFor(hud, 50, 0)).toBeNull();
    expect(limitFor(hud, 50, 9)).toBeNull();
  });
  it('the 100% line follows the HUD family-size factors on the median', () => {
    expect(limitAt100(hud, 4)).toBe(110400);
    expect(limitAt100(hud, 3)).toBe(99350);
    expect(bandLimit4p(hud, 'le30')).toBe(33100);
    expect(bandLimit4p(hud, 'b30_50')).toBe(55200);
    expect(bandLimit4p(hud, 'b50_80')).toBe(88300);
    expect(bandLimit4p(hud, 'b80_100')).toBe(110400);
    expect(bandLimit4p(hud, 'gt100')).toBeNull();
    expect(BAND_PCT.gt100).toBeNull();
    expect(bandsUpTo(50)).toEqual(['le30', 'b30_50']);
  });
});

describe('rent ceilings reproduce the plan dollars', () => {
  it('rounds half to even like the pipeline', () => {
    expect(roundHalfEven(1242.5)).toBe(1242);
    expect(roundHalfEven(1987.5)).toBe(1988);
    expect(roundHalfEven(621.25)).toBe(621);
    expect(roundHalfEven(1035.625)).toBe(1036);
  });
  it('1BR: 30% $621, 50% $1,036', () => {
    expect(ceilingRent(hud, 30, 1)?.rent).toBe(621);
    expect(ceilingRent(hud, 50, 1)?.rent).toBe(1036);
  });
  it('2BR: 30% $745, 50% $1,242, 80% $1,988', () => {
    expect(ceilingRent(hud, 30, 2)?.rent).toBe(745);
    expect(ceilingRent(hud, 50, 2)?.rent).toBe(1242);
    expect(ceilingRent(hud, 80, 2)?.rent).toBe(1988);
  });
  it('senior alone: 30% $580, 50% $966', () => {
    expect(ceilingRent(hud, 30, 1, true)?.rent).toBe(580);
    expect(ceilingRent(hud, 50, 1, true)?.rent).toBe(966);
  });
  it('shows the multiplication and the half-person mean', () => {
    const c = ceilingRent(hud, 50, 2)!;
    expect(c.formula).toBe('$49,700 × 30% ÷ 12 = $1,242');
    expect(c.limitFormula).toBeNull();
    expect(c.persons).toBe(3);
    const one = ceilingRent(hud, 30, 1)!;
    expect(one.formula).toBe('$24,850 × 30% ÷ 12 = $621');
    expect(one.limitFormula).toBe('($23,200 + $26,500) ÷ 2 = $24,850');
    const senior = ceilingRent(hud, 30, 1, true)!;
    expect(senior.persons).toBe(1);
    expect(senior.formula).toBe('$23,200 × 30% ÷ 12 = $580');
  });
  it('returns null when the table lacks the size', () => {
    const short = { ...hud, metro: { ...hud.metro, il30: [23200] } };
    expect(ceilingRent(short, 30, 1)).toBeNull();
    expect(ceilingRent(short, 30, 0)?.rent).toBe(580);
  });
});

describe('market test', () => {
  it('Hazelwood 2BR at 30%: gap $405, a voucher reaches the asking rent', () => {
    const r = marketTest(745, 1150, 'high', 1350);
    expect(r.gap).toBe(405);
    expect(r.verdict).toBe('needs_subsidy');
    expect(r.sentence).toContain('$1,150 − $745 = $405');
    expect(r.sentence).toContain('voucher');
  });
  it('Hazelwood 2BR at 50%: the market reaches the band', () => {
    const r = marketTest(1242, 1150, 'high', 1350);
    expect(r.verdict).toBe('market_reaches');
    expect(r.gap).toBe(0);
    expect(r.sentence).toContain('already reaches this band on turnover');
    expect(r.sentence).toContain('$1,242 − $1,150 = $92');
  });
  it('Squirrel Hill North at 50%: gap $653, above the Fair Market Rent too', () => {
    const r = marketTest(1242, 1895, 'high', 1620);
    expect(r.verdict).toBe('gap');
    expect(r.gap).toBe(653);
    expect(r.sentence).toContain('$1,895 − $1,242 = $653');
    expect(r.sentence).toContain('voucher alone does not reach it');
  });
  it('Homewood North at 30%: needs a subsidy (asking within the Fair Market Rent)', () => {
    const r = marketTest(745, 1250, 'medium', 1500);
    expect(r.verdict).toBe('needs_subsidy');
    expect(r.gap).toBe(505);
  });
  it('low-confidence or missing asking rents are not used', () => {
    expect(marketTest(745, 1150, 'low', 1350).verdict).toBe('needs_subsidy');
    expect(marketTest(745, 1150, 'low', 1350).gap).toBeNull();
    expect(marketTest(745, 1150, 'low', 1350).sentence).toContain('low confidence');
    const u = marketTest(745, null, null, null);
    expect(u.verdict).toBe('unknown');
    expect(u.sentence).toContain('not available');
    expect(marketTest(1988, null, null, 1350).verdict).toBe('unknown');
  });
  it('gap without a Fair Market Rent still prints the arithmetic', () => {
    const r = marketTest(745, 1150, 'high', null);
    expect(r.verdict).toBe('gap');
    expect(r.sentence).toContain('$1,150 − $745 = $405');
    expect(r.sentence).toContain('not available');
  });
});
