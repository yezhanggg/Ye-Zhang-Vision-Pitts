import { describe, expect, it } from 'vitest';
import { divergingBreaks, quantileBreaks } from './bins';
import { ANALYSIS_VARS } from './analysisVars';
import { variables } from './catalog';
import { THEME_PALETTES, isDiverging, themeOf, themePalette } from './palettes';

describe('theme palettes', () => {
  it('every ramp has five distinct colors', () => {
    for (const p of Object.values(THEME_PALETTES)) {
      expect(p).toHaveLength(5);
      expect(new Set(p).size).toBe(5);
    }
  });
  it('maps topics to their ramp', () => {
    expect(themeOf({ id: 'med_hh_income', group: 'income' })).toBe('money');
    expect(themeOf({ id: 'poverty_share', group: 'income' })).toBe('stress');
    expect(themeOf({ id: 'an_rent_fmr', group: 'an_rents' })).toBe('rent');
    expect(themeOf({ id: 'an_ami_le30', group: 'an_ami' })).toBe('ami');
    expect(themeOf({ id: 'an_flood_fema', group: 'an_inputs' })).toBe('flood');
    expect(themeOf({ id: 'something_new', group: 'commute' })).toBe('transit');
    expect(isDiverging({ id: 'renter_share', group: 'tenure' })).toBe(true);
  });
  it('every quantile variable gets a ramp', () => {
    const quantile = [...variables.filter((v) => v.source !== 'analysis'), ...ANALYSIS_VARS.filter((v) => v.paint.kind === 'quantile')];
    for (const v of quantile) expect(themePalette(v)).toHaveLength(5);
  });
});

describe('divergingBreaks', () => {
  it('puts the center in the middle class', () => {
    const xs = Array.from({ length: 101 }, (_, i) => i / 100);
    const b = divergingBreaks(xs, 0.4);
    expect(b).toHaveLength(4);
    expect(b[1]).toBeLessThan(0.4);
    expect(b[2]).toBeGreaterThan(0.4);
    for (let i = 1; i < b.length; i++) expect(b[i]).toBeGreaterThan(b[i - 1]);
  });
  it('falls back to quantiles without a center or when the center sits outside the values', () => {
    const xs = Array.from({ length: 101 }, (_, i) => i);
    expect(divergingBreaks(xs, null)).toEqual(quantileBreaks(xs, 5));
    expect(divergingBreaks(xs, 500)).toEqual(quantileBreaks(xs, 5));
  });
});
