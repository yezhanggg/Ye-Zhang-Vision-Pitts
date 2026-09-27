import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BUILDINGS_SCALE, decodeBuildings, encodeBuildings, type BuildingFeature } from './buildingsCodec';

type Pt = [number, number];
type Poly = { type: 'Polygon'; coordinates: Pt[][] };
type Multi = { type: 'MultiPolygon'; coordinates: Pt[][][] };

const feature = (h: number, src: string, GEOID: string, geometry: Poly | Multi, yb?: number): BuildingFeature => ({
  type: 'Feature',
  properties: yb === undefined ? { h, src, GEOID } : { h, src, GEOID, yb },
  geometry,
});

// Coordinates carry more digits than the encoding keeps, so the round trip has something to lose.
const SQUARE: Pt[] = [[-79.9783149, 40.4435449], [-79.9782051, 40.4434012], [-79.9781003, 40.4434548], [-79.9782, 40.4435951], [-79.9783149, 40.4435449]];
const LOT: Pt[] = [[-79.95, 40.46], [-79.9494, 40.46], [-79.9494, 40.4606], [-79.95, 40.4606], [-79.95, 40.46]];
const COURT: Pt[] = [[-79.9498, 40.4602], [-79.9498, 40.4604], [-79.9496, 40.4604], [-79.9496, 40.4602], [-79.9498, 40.4602]];
const SHED: Pt[] = [[-80.0212345, 40.4101234], [-80.0211345, 40.4101234], [-80.0211345, 40.4102234], [-80.0212345, 40.4101234]];

const synthetic = () => ({
  type: 'FeatureCollection' as const,
  features: [
    feature(7.26, 'overture_height', '42003562300', { type: 'Polygon', coordinates: [SQUARE] }, 1925),
    feature(12, 'assessment_stories', '42003050100', { type: 'Polygon', coordinates: [LOT, COURT] }),
    feature(6, 'default', '42003562300', { type: 'MultiPolygon', coordinates: [[SQUARE], [SHED]] }),
    feature(3, 'accessory', '42003191600', { type: 'Polygon', coordinates: [SHED] }),
    feature(9.94, 'overture_height', '42003050100', { type: 'Polygon', coordinates: [LOT] }),
  ],
});

/** What the app does: the compact form goes to disk as JSON, is parsed, then decoded. */
const throughFile = (fc: { features: BuildingFeature[] }, opts?: { yb?: boolean }) => decodeBuildings(JSON.parse(JSON.stringify(encodeBuildings(fc, opts))));

const rings = (geometry: unknown): Pt[][] => {
  const g = geometry as Poly | Multi;
  return g.type === 'Polygon' ? g.coordinates : g.coordinates.flat();
};

describe('decodeBuildings, round trip', () => {
  it('brings every vertex back to within 1e-5 degrees and every height to within 0.05 m', () => {
    const fc = synthetic();
    const back = throughFile(fc);
    expect(back.type).toBe('FeatureCollection');
    expect(back.features).toHaveLength(fc.features.length);
    let worst = 0;
    let vertices = 0;
    fc.features.forEach((f, i) => {
      const a = rings(f.geometry);
      const b = rings(back.features[i].geometry);
      expect((back.features[i].geometry as Poly).type).toBe((f.geometry as Poly).type);
      expect(b.map((r) => r.length)).toEqual(a.map((r) => r.length));
      a.forEach((ring, r) =>
        ring.forEach((p, k) => {
          worst = Math.max(worst, Math.abs(p[0] - b[r][k][0]), Math.abs(p[1] - b[r][k][1]));
          vertices++;
        }),
      );
      expect(Math.abs(back.features[i].properties.h - f.properties.h)).toBeLessThanOrEqual(0.05 + 1e-9);
    });
    expect(vertices).toBe(5 + 10 + 9 + 4 + 5);
    expect(worst).toBeGreaterThan(0); // the fixture really has digits to lose
    expect(worst).toBeLessThan(1e-5);
    expect(worst).toBeLessThanOrEqual(0.5 / BUILDINGS_SCALE + 1e-12); // rounding to the nearest step loses at most half a step
  });

  it('is exact for coordinates that already sit on the 1e-5 grid', () => {
    const fc = { type: 'FeatureCollection' as const, features: [feature(5.5, 'overture_height', '42003050100', { type: 'Polygon', coordinates: [LOT, COURT] })] };
    expect(throughFile(fc)).toEqual(fc);
  });

  it('gives the same result when decoded twice and when its own output is decoded again', () => {
    const compact = encodeBuildings(synthetic());
    const once = decodeBuildings(compact);
    expect(decodeBuildings(compact)).toEqual(once);
    expect(decodeBuildings(once)).toBe(once);
    expect(encodeBuildings(once)).toEqual(compact);
  });
});

describe('decodeBuildings, other input', () => {
  it('returns a FeatureCollection unchanged', () => {
    const fc = synthetic();
    const copy = JSON.parse(JSON.stringify(fc));
    expect(decodeBuildings(fc)).toBe(fc);
    expect(fc).toEqual(copy);
    const none = { type: 'FeatureCollection', features: [] };
    expect(decodeBuildings(none)).toBe(none);
  });

  it('gives an empty collection for anything that is neither form', () => {
    const empty = { type: 'FeatureCollection', features: [] };
    const compact = encodeBuildings(synthetic());
    const garbage: unknown[] = [
      null,
      undefined,
      0,
      42,
      'buildings',
      true,
      [],
      [[1, 2, 3]],
      {},
      { type: 'FeatureCollection' },
      { type: 'FeatureCollection', features: 'none' },
      { type: 'Feature', properties: {}, geometry: null },
      { ...compact, v: 2 },
      { ...compact, v: '1' },
      { ...compact, scale: 0 },
      { ...compact, scale: '100000' },
      { ...compact, scale: Number.NaN },
      { ...compact, tracts: null },
      { ...compact, src: 'overture_height' },
      { ...compact, b: 'nope' },
      { ...compact, b: undefined },
    ];
    for (const g of garbage) expect(decodeBuildings(g), JSON.stringify(g) ?? String(g)).toEqual(empty);
  });

  it('leaves out an entry it cannot read, keeps the others and never throws', () => {
    const ring = [-7995000, 4046000, 60, 0, 0, 60, -60, 0];
    const raw = {
      v: 1,
      scale: 100000,
      tracts: ['42003050100'],
      src: ['default'],
      b: [
        [6, 0, 0, [ring]],
        null,
        'row',
        [6, 0, 0],
        [6, 1, 0, [ring]], // source index outside the table
        [6, 0, 3, [ring]], // tract index outside the table
        [6, 0.5, 0, [ring]],
        [6, -1, 0, [ring]],
        ['6', 0, 0, [ring]],
        [Number.NaN, 0, 0, [ring]],
        [6, 0, 0, []],
        [6, 0, 0, [[]]],
        [6, 0, 0, [[1, 2, 3]]], // odd length
        [6, 0, 0, [[1, 2, 'x', 4]]],
        [6, 0, 0, [ring, [1, 2, null, 4]]], // one bad hole spoils the building
        [6, 0, 0, 'rings'],
        [6, 0, 0, [[[ring]], 7]], // a bad part spoils the building
        [4.5, 0, 0, [ring]],
      ],
    };
    const out = decodeBuildings(raw);
    expect(out.features.map((f) => f.properties.h)).toEqual([6, 4.5]);
    expect(decodeBuildings({ ...raw, tracts: [11], src: [null] }).features).toEqual([]);
  });
});

describe('decodeBuildings, rings', () => {
  it('leaves the closing vertex out of the compact form and puts it back', () => {
    const compact = encodeBuildings({ features: [feature(6, 'default', '42003050100', { type: 'Polygon', coordinates: [LOT] })] });
    expect(compact.b[0][3]).toEqual([[-7995000, 4046000, 60, 0, 0, 60, -60, 0]]); // 4 vertices for a 5-position ring
    const [ring] = rings(decodeBuildings(compact).features[0].geometry);
    expect(ring).toEqual(LOT);
    expect(ring[ring.length - 1]).toEqual(ring[0]);
    expect(ring[ring.length - 1]).not.toBe(ring[0]); // its own array, not a second reference to the first vertex
  });

  it('closes a ring that was stored open and leaves a closed one alone', () => {
    const open = [-7995000, 4046000, 60, 0, 0, 60];
    const closed = [...open, -60, -60];
    const out = decodeBuildings({ v: 1, scale: 100000, tracts: ['42003050100'], src: ['default'], b: [[6, 0, 0, [open]], [6, 0, 0, [closed]]] });
    const want = [[-79.95, 40.46], [-79.9494, 40.46], [-79.9494, 40.4606], [-79.95, 40.46]];
    expect(rings(out.features[0].geometry)).toEqual([want]);
    expect(rings(out.features[1].geometry)).toEqual([want]);
  });

  it('reads coordinates at the scale the file states', () => {
    const out = decodeBuildings({ v: 1, scale: 1_000_000, tracts: ['42003050100'], src: ['default'], b: [[6, 0, 0, [[-79950000, 40460000, 600, 0, 0, 600]]]] });
    expect(rings(out.features[0].geometry)).toEqual([[[-79.95, 40.46], [-79.9494, 40.46], [-79.9494, 40.4606], [-79.95, 40.46]]]);
  });

  it('closes every ring of a polygon with a hole and of a MultiPolygon', () => {
    const back = throughFile(synthetic());
    for (const f of back.features) for (const r of rings(f.geometry)) expect(r[r.length - 1]).toEqual(r[0]);
    expect(rings(back.features[1].geometry)).toHaveLength(2);
    const multi = back.features[2].geometry as Multi;
    expect(multi.type).toBe('MultiPolygon');
    expect(multi.coordinates.map((part) => part.length)).toEqual([1, 1]);
    expect(back.features.filter((f) => f.properties.GEOID === '42003562300')).toHaveLength(2); // one building, not one per part
  });

  it('keeps a ring that ends on a repeated vertex as it is', () => {
    const ring: Pt[] = [[-79.95, 40.46], [-79.9494, 40.46], [-79.9494, 40.4606], [-79.95, 40.46], [-79.95, 40.46]];
    const fc = { type: 'FeatureCollection' as const, features: [feature(6, 'default', '42003050100', { type: 'Polygon', coordinates: [ring] })] };
    expect(throughFile(fc)).toEqual(fc);
  });
});

describe('decodeBuildings, properties', () => {
  it('maps the indexes back to the height source and the tract', () => {
    const compact = encodeBuildings(synthetic());
    expect(compact.v).toBe(1);
    expect(compact.scale).toBe(100000);
    expect(compact.tracts).toEqual(['42003050100', '42003191600', '42003562300']); // sorted
    expect(compact.src).toEqual(['overture_height', 'accessory', 'assessment_stories', 'default']); // most used first, then by name
    expect(compact.b.map((r) => r.slice(0, 3))).toEqual([[7.3, 0, 2], [12, 2, 0], [6, 3, 2], [3, 1, 1], [9.9, 0, 0]]);
    expect(decodeBuildings(compact).features.map((f) => f.properties)).toEqual([
      { h: 7.3, src: 'overture_height', GEOID: '42003562300' },
      { h: 12, src: 'assessment_stories', GEOID: '42003050100' },
      { h: 6, src: 'default', GEOID: '42003562300' },
      { h: 3, src: 'accessory', GEOID: '42003191600' },
      { h: 9.9, src: 'overture_height', GEOID: '42003050100' },
    ]);
  });

  it('gives each feature the GeoJSON shape the map source expects', () => {
    for (const f of throughFile(synthetic()).features) {
      expect(f.type).toBe('Feature');
      expect(Object.keys(f)).toEqual(['type', 'properties', 'geometry']);
      for (const r of rings(f.geometry)) for (const p of r) {
        expect(p).toHaveLength(2);
        expect(p[0]).toBeLessThan(0); // [lng, lat], in that order
        expect(p[1]).toBeGreaterThan(0);
      }
    }
  });

  it('drops the year built unless it is asked for, then reads it as a fifth element', () => {
    expect(throughFile(synthetic()).features.some((f) => 'yb' in f.properties)).toBe(false);
    const compact = encodeBuildings(synthetic(), { yb: true });
    expect(compact.b.map((r) => r[4])).toEqual([1925, null, null, null, null]);
    expect(decodeBuildings(compact).features.map((f) => f.properties.yb)).toEqual([1925, undefined, undefined, undefined, undefined]);
  });

  it('leaves out a feature that has no polygon, height, source or tract', () => {
    const ok = feature(6, 'default', '42003050100', { type: 'Polygon', coordinates: [LOT] });
    const bad = [
      { ...ok, geometry: null },
      { ...ok, geometry: { type: 'Point', coordinates: [-79.95, 40.46] } },
      { ...ok, geometry: { type: 'Polygon', coordinates: [] } },
      { ...ok, geometry: { type: 'Polygon', coordinates: [[[-79.95, 40.46], [-79.94, 40.46]]] } },
      { ...ok, properties: null },
      { ...ok, properties: { src: 'default', GEOID: '42003050100' } },
      { ...ok, properties: { h: 6, GEOID: '42003050100' } },
      { ...ok, properties: { h: 6, src: 'default' } },
    ];
    expect(encodeBuildings({ features: [...bad, ok] as never }).b).toHaveLength(1);
  });
});

describe('the bundled buildings.json', () => {
  const file = fileURLToPath(new URL('../data/buildings.json', import.meta.url));
  const metaFile = fileURLToPath(new URL('../../../data/processed/buildings_meta.json', import.meta.url));

  it.skipIf(!existsSync(file))('decodes to closed footprints with a height, a source and a tract', () => {
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    const fc = decodeBuildings(raw);
    expect(fc.features.length).toBeGreaterThan(0);
    if (Array.isArray(raw.b)) expect(fc.features).toHaveLength(raw.b.length); // no entry was left out
    for (const f of fc.features) {
      expect(f.properties.h).toBeGreaterThan(0);
      expect(f.properties.src).toMatch(/^[a-z_]+$/);
      expect(f.properties.GEOID).toMatch(/^42003\d{6}$/);
      for (const r of rings(f.geometry)) {
        expect(r.length).toBeGreaterThanOrEqual(4);
        expect(r[r.length - 1]).toEqual(r[0]);
      }
    }
    if (existsSync(metaFile)) {
      const meta = JSON.parse(readFileSync(metaFile, 'utf8'));
      expect(fc.features).toHaveLength(meta.n_buildings);
      const perTract: Record<string, number> = {};
      for (const f of fc.features) perTract[f.properties.GEOID] = (perTract[f.properties.GEOID] ?? 0) + 1;
      expect(perTract).toEqual(meta.per_tract);
    }
  });

  it.skipIf(!existsSync(file))('reaches the app through data.ts as a FeatureCollection', async () => {
    const { buildingsFC, buildingStats } = await import('./data');
    expect(buildingsFC.type).toBe('FeatureCollection');
    expect(buildingsFC.features).toHaveLength(decodeBuildings(JSON.parse(readFileSync(file, 'utf8'))).features.length);
    let total = 0;
    for (const s of buildingStats.values()) total += s.total;
    expect(total).toBe(buildingsFC.features.length);
  });
});
