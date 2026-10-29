import { describe, expect, it } from 'vitest';
import type { LotCollection, LotFeature } from '../explore/parcelShadow';
import { pointInGeometry } from '../geo';
import { distanceToLot, factsOf, labelPoint, lotIn, siteLot, type FactsFile } from './lots';

const rect = (x0: number, y0: number, x1: number, y1: number) => ({ type: 'Polygon', coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]] });
const lot = (i: number, label: string, u: number, sf: number, geometry: ReturnType<typeof rect>): LotFeature => ({ type: 'Feature', properties: { i, lot: label, u, sf, n: 10, s0: 20.5, s1: -1, s2: 61 }, geometry });

// A big lot and a small lot inside it (chunks list lots largest first), and a lot across the street.
const fc: LotCollection = {
  type: 'FeatureCollection',
  features: [lot(0, '1-A-1', 0, 40000, rect(-80.0, 40.44, -79.998, 40.442)), lot(1, '1-A-2', 3, 2500, rect(-79.9995, 40.4405, -79.9990, 40.4410)), lot(2, '1-A-3', 0, 3000, rect(-79.996, 40.44, -79.9955, 40.4405))],
};

describe('finding a lot at a point', () => {
  it('the smallest lot holding the point wins', () => {
    expect(lotIn(fc, -79.9993, 40.4407)?.feature.properties.lot).toBe('1-A-2');
    expect(lotIn(fc, -79.9999, 40.4419)?.feature.properties.lot).toBe('1-A-1');
  });

  it('a point on the street snaps to the nearest lot within 30 m, and nothing past that', () => {
    const hit = lotIn(fc, -79.99625, 40.44025); // about 21 m west of lot 1-A-3
    expect(hit?.feature.properties.lot).toBe('1-A-3');
    expect(hit!.meters).toBeGreaterThan(15);
    expect(hit!.meters).toBeLessThan(30);
    expect(lotIn(fc, -79.9975, 40.4440)).toBeNull();
  });

  it('measures meters to a lot edge, zero inside', () => {
    expect(distanceToLot(-79.9993, 40.4407, fc.features[1].geometry)).toBe(0);
    expect(distanceToLot(-79.996, 40.4403, fc.features[2].geometry)).toBe(0);
    expect(Math.round(distanceToLot(-79.9962, 40.44025, fc.features[2].geometry))).toBe(17);
  });

  it('puts the pin inside the lot, even an L-shaped one', () => {
    const L = { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 1], [1, 1], [1, 10], [0, 10], [0, 0]]] };
    const p = labelPoint(L)!;
    expect(pointInGeometry(p[0], p[1], L)).toBe(true);
  });
});

describe('lot facts', () => {
  const file: FactsFile = { codes: ['R2-M', 'RM-M'], lots: { '1-A-2': [1, 2400, 30, 80, -1], '1-A-1': [-1, 41000, -1, -1, 2] } };

  it('reads a lot’s district, area, frontage, depth and homes today, with unknowns as null', () => {
    expect(factsOf(file, '1-A-2')).toEqual({ district: 'RM-M', sqft: 2400, frontageFt: 30, depthFt: 80, existing: null });
    expect(factsOf(file, '1-A-1')).toEqual({ district: null, sqft: 41000, frontageFt: null, depthFt: null, existing: 2 });
    expect(factsOf(file, 'none')).toBeNull();
    expect(factsOf(null, '1-A-2')).toBeNull();
  });

  it('keeps what the site needs: facts first, the shape area without them, shade with unrated days as null', () => {
    const m = { uses: ['residential', 'commercial', 'industrial', 'vacant'] };
    const s = siteLot(m, '2275_3088', fc.features[1], factsOf(file, '1-A-2'), [-79.9993, 40.4407]);
    expect(s).toMatchObject({ chunk: '2275_3088', row: 1, label: '1-A-2', use: 'vacant', sqft: 2400, district: 'RM-M', frontageFt: 30, shade: [20.5, null, 61] });
    expect(siteLot(m, 'k', fc.features[2], null, [0, 0]).sqft).toBe(3000);
  });
});
