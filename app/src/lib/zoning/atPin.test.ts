import { describe, expect, it } from 'vitest';
import izo from '../../data/lazy/izo_overlay.json';
import { zoningFC } from '../explore/zoning';
import { boundsOf, pointInGeometry } from '../geo';
import { districtAt, inIzoAt, zoningAtPin } from './atPin';
import { STANDARD_BY_CODE, STANDARDS } from './capacity';

/** A point inside a feature: the first grid point in its box that falls in it. */
function inside(f: (typeof zoningFC.features)[number]): [number, number] {
  const [[x0, y0], [x1, y1]] = boundsOf(f.geometry);
  for (let i = 1; i < 60; i++)
    for (let j = 1; j < 60; j++) {
      const x = x0 + ((x1 - x0) * i) / 60;
      const y = y0 + ((y1 - y0) * j) / 60;
      if (pointInGeometry(x, y, f.geometry) && districtAt(x, y) === f.properties.code) return [x, y];
    }
  throw new Error(`no inside point for ${f.properties.code}`);
}

describe('zoning at the pin', () => {
  it('every mapped district is computed or has a reason it is not', () => {
    for (const f of zoningFC.features) expect(STANDARD_BY_CODE.has(f.properties.code) || f.properties.code in STANDARDS.not_computed).toBe(true);
  });

  it('reads a computed district under the point', () => {
    const f = zoningFC.features.find((x) => STANDARD_BY_CODE.has(x.properties.code))!;
    const [x, y] = inside(f);
    expect(zoningAtPin(x, y)).toEqual({ kind: 'computed', code: f.properties.code, near: false });
  });

  it('names a district without standards and its reason', () => {
    const f = zoningFC.features.find((x) => !STANDARD_BY_CODE.has(x.properties.code))!;
    const [x, y] = inside(f);
    const z = zoningAtPin(x, y);
    expect(z.kind).toBe('not_computed');
    if (z.kind === 'not_computed') expect(z.why).toBe(STANDARDS.not_computed[f.properties.code]);
  });

  it('a point in a street gap reads the district around it', () => {
    // Step off a district's edge by 3 m at a vertex: if that lands outside every district, the 15 m ring finds one.
    for (const f of zoningFC.features) {
      const ring = ((f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates) as number[][][][])[0][0];
      for (const [x, y] of ring.slice(0, 50)) {
        const px = x + 3 / 85_000;
        if (districtAt(px, y)) continue;
        const z = zoningAtPin(px, y);
        expect(z.kind).not.toBe('none');
        if (z.kind !== 'none') expect(z.near).toBe(true);
        return;
      }
    }
  });

  it('reads the IZ-O at a point inside it', () => {
    const geom = (izo as unknown as { geometry: { type: string; coordinates: unknown } }).geometry;
    const [[x0, y0], [x1, y1]] = boundsOf(geom);
    let hit = false;
    for (let i = 1; i < 80 && !hit; i++)
      for (let j = 1; j < 80 && !hit; j++) {
        const x = x0 + ((x1 - x0) * i) / 80;
        const y = y0 + ((y1 - y0) * j) / 80;
        if (pointInGeometry(x, y, geom)) hit = inIzoAt(x, y);
      }
    expect(hit).toBe(true);
  });

  it('nothing outside the city', () => {
    expect(zoningAtPin(-80.5, 40.0)).toEqual({ kind: 'none' });
    expect(inIzoAt(-80.5, 40.0)).toBe(false);
  });
});
