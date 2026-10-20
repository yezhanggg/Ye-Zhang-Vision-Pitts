import { describe, expect, it } from 'vitest';
import { parseCanopyManifest } from './canopyLayer';
import { CANOPY_VAR, CITY_GEOID, COUNTY_GEOID, bundledValues, canopyValues, groups, variableById, variableIds, variablesByGroup } from './catalog';
import { isAnalysisGroup } from './analysisVars';
import { themeOf } from './palettes';
import type { GeoLevel } from './types';

const LEVELS: GeoLevel[] = ['tract', 'bg', 'zcta', 'muni', 'city', 'county'];

describe('tree canopy in the Explore catalogue', () => {
  it('is one variable in its own group, listed before the Analysis layers', () => {
    const v = variableById.get(CANOPY_VAR)!;
    expect(v).toMatchObject({ label: 'Tree canopy', group: 'canopy', unit: 'share', source: 'canopy' });
    expect(variablesByGroup('canopy').map((x) => x.id)).toEqual([CANOPY_VAR]);
    expect(variableIds).toContain(CANOPY_VAR);
    const at = groups.findIndex((g) => g.id === 'canopy');
    expect(groups[at].label).toBe('Tree canopy (2020 lidar)');
    expect(at).toBeLessThan(groups.findIndex((g) => isAnalysisGroup(g.id)));
    expect(themeOf(v)).toBe('green');
  });
  it('gives every bundled unit a share between 0 and 1, with no margin of error', () => {
    for (const level of LEVELS) {
      const values = bundledValues(level);
      expect(Object.keys(values).length, level).toBeGreaterThan(0);
      for (const [geoid, rec] of Object.entries(values)) {
        const [est, moe, cv] = rec[CANOPY_VAR];
        expect(typeof est === 'number' && est >= 0 && est <= 1, `${level} ${geoid}`).toBe(true);
        expect([moe, cv]).toEqual([null, null]);
      }
    }
  });
  it('carries the measured figures', () => {
    expect(bundledValues('tract')['42003562300'][CANOPY_VAR]).toEqual([0.5402, null, null]);
    expect(bundledValues('city')[CITY_GEOID][CANOPY_VAR][0]).toBe(0.3951);
    expect(bundledValues('county')[COUNTY_GEOID][CANOPY_VAR][0]).toBe(0.5155);
  });
  it('holds the whole county, for units the bundle leaves to the database', () => {
    expect(Object.keys(canopyValues('tract')!)).toHaveLength(394);
    expect(Object.keys(canopyValues('bg')!)).toHaveLength(1062);
    expect(Object.keys(canopyValues('muni')!)).toHaveLength(129);
    // ZIP codes that lie mostly outside the county have no figure
    expect(canopyValues('zcta')!['15301']).toBeUndefined();
  });
});

describe('the canopy map manifest', () => {
  const ok = { version: 1, tileSize: 512, minzoom: 11, maxzoom: 15, bounds: [-80.112305, 40.346544, -79.848633, 40.513799], tiles: 646, bytes: 1, path: '{z}/{x}/{y}.png' };
  it('is read when it has what the map source needs', () => {
    expect(parseCanopyManifest(ok)).toEqual({ tileSize: 512, minzoom: 11, maxzoom: 15, bounds: ok.bounds, path: '{z}/{x}/{y}.png' });
  });
  it('is refused otherwise', () => {
    expect(parseCanopyManifest(null)).toBeNull();
    expect(parseCanopyManifest({ ...ok, bounds: [1, 2, 3] })).toBeNull();
    expect(parseCanopyManifest({ ...ok, maxzoom: 9 })).toBeNull();
    expect(parseCanopyManifest({ ...ok, path: undefined })).toBeNull();
    expect(parseCanopyManifest({ ...ok, tileSize: 'big' })).toBeNull();
  });
});
