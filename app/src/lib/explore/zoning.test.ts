import { describe, expect, it } from 'vitest';
import { ZONING_FAMILIES, byRightList, zoningFC, zoningLine, zoningPaint } from './zoning';
import { ANALYSIS_VARS } from './analysisVars';
import { themeOf } from './palettes';

describe('zoning map', () => {
  it('colors every district by a known family with distinct colors', () => {
    expect(new Set(ZONING_FAMILIES.map((f) => f.color)).size).toBe(ZONING_FAMILIES.length);
    for (const f of zoningFC.features) expect(zoningPaint.values.get(f.properties.code)).not.toBeNull();
  });
  it('reads the by-right list for the tooltip', () => {
    const p = { code: 'RM-M', family: 'res_multi', family_label: 'Residential multi-unit', zfam: 'RM', adu: 'conditional', duplex_triplex: 'yes', townhome: 'no', small_apartment: 'yes', senior: 'unknown' } as const;
    expect(byRightList(p)).toEqual(['duplex/triplex', 'small apartment']);
    expect(zoningLine(p)).toBe('RM-M · Residential multi-unit · by right: duplex/triplex, small apartment');
  });
  it('land-use layers get their own ramps', () => {
    const ids = ANALYSIS_VARS.filter((v) => v.group === 'an_land').map((v) => v.id);
    expect(ids).toEqual(['an_land_res', 'an_land_com', 'an_land_ind', 'an_land_vacant', 'an_land_vacant_lots']);
    expect(themeOf({ id: 'an_land_res', group: 'an_land' })).toBe('landRes');
    expect(themeOf({ id: 'an_land_ind', group: 'an_land' })).toBe('landInd');
  });
});
