import { describe, expect, it } from 'vitest';
import { ZONING_FAMILIES, byRightList, zoningFC, zoningLine, zoningPaint } from './zoning';
import { ANALYSIS_VARS } from './analysisVars';
import { themeOf } from './palettes';
import { bundledValues, variableById, variables } from './catalog';

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
  it('land use and zoning are catalogue variables at every level, with their own ramps', () => {
    expect(ANALYSIS_VARS.some((v) => v.group === 'an_land')).toBe(false);
    const land = variables.filter((v) => v.group === 'land').map((v) => v.id);
    expect(land).toEqual(['lu_residential', 'lu_commercial', 'lu_industrial', 'lu_institutional', 'lu_vacant', 'vacant_lots', 'parcels']);
    expect(variables.filter((v) => v.group === 'zoning')).toHaveLength(7);
    expect(variableById.get('lu_vacant')?.source).toBe('parcels');
    expect(variableById.get('zoned_multi')?.source).toBe('zoning');
    expect(variableById.get('pop')?.source).toBe('acs');
    expect(themeOf({ id: 'lu_residential', group: 'land' })).toBe('landRes');
    expect(themeOf({ id: 'lu_industrial', group: 'land' })).toBe('landInd');
    // bundled values, no margins: Hazelwood's land use, and the city's zoning
    expect(bundledValues('tract')['42003562300'].lu_vacant).toEqual([0.096, null, null]);
    expect(bundledValues('city')['4261000'].zoned_multi[0]).toBeGreaterThan(0);
    expect(bundledValues('muni')['4200366264'].zoned_multi).toEqual([null, null, null]);
  });
});
