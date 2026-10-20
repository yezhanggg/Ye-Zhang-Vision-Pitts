import { describe, expect, it } from 'vitest';
import { NO_DATA } from '../mapStyle';
import { chunkUrl, chunksToLoad, curvePath, curveRow, lotName, lotSize, mostlyOf, parseParcelManifest, prepareChunk, shadeClass, shadeColors, shadeFillExpr, shadeOf, stepOffsets, sunHours, useLabel, type LotProps, type ParcelChunk } from './parcelShadow';
import { HOURS_RAMP, evict } from './sunShadow';

// what scripts/15_build_parcel_shadow.py writes (chunk rows: x, y, lots, west, south, east, north)
const raw = () => ({
  version: 1, built: '2026-10-11', source: 's', cellFt: 6, grid: { z: 13 }, minZoom: 14.5, minCells: 10, stepMinutes: 30,
  uses: ['residential', 'commercial', 'industrial', 'vacant', 'institutional', 'other', 'unrecorded'],
  days: [{ id: 'jun21', label: 'June 21', steps: 29, first: 390 }, { id: 'sep22', label: 'September 22', steps: 24, first: 450 }, { id: 'dec21', label: 'December 21', steps: 18, first: 480 }],
  profile: { noData: 255 }, paths: { lots: '{x}_{y}.json', profile: '{x}_{y}.bin' },
  chunks: [[2275, 3087, 3, -80.02, 40.44, -79.97, 40.48], [2276, 3087, 2, -79.98, 40.44, -79.93, 40.48], [2275, 3088, 1, -80.02, 40.41, -79.98, 40.445]],
  lots: 6, rated: 6, bytes: 1,
});
const shadowDays = [{ id: 'jun21', steps: Array(29).fill(0) }, { id: 'sep22', steps: Array(24).fill(0) }, { id: 'dec21', steps: Array(18).fill(0) }];
const manifest = () => parseParcelManifest(raw(), shadowDays)!;
const lot = (i: number, extra: Record<string, number | string> = {}): LotProps => ({ i, lot: '102-P-193', u: 0, sf: 3251, n: 91, s0: 36, s1: 46, s2: 63, m0: 31, m1: 42, m2: 67, ...extra });
const feature = (i: number) => ({ type: 'Feature', properties: lot(i), geometry: { type: 'Polygon', coordinates: [] } });

describe('manifest', () => {
  it('accepts what the pipeline writes', () => {
    const m = manifest();
    expect(m.minZoom).toBe(14.5);
    expect(m.noData).toBe(255);
    expect(m.chunks[0]).toEqual({ key: '2275_3087', lots: 3, box: { west: -80.02, south: 40.44, east: -79.97, north: 40.48 } });
    expect(chunkUrl('/data/parcel-shadow/', m.paths.lots, '2275_3087')).toBe('/data/parcel-shadow/2275_3087.json');
    expect(chunkUrl('/data/parcel-shadow/', m.paths.profile, '2275_3087')).toBe('/data/parcel-shadow/2275_3087.bin');
  });
  it('rejects anything it cannot draw', () => {
    expect(parseParcelManifest(null)).toBeNull();
    expect(parseParcelManifest({ ...raw(), version: 2 })).toBeNull();
    expect(parseParcelManifest({ ...raw(), minZoom: undefined })).toBeNull();
    expect(parseParcelManifest({ ...raw(), days: [] })).toBeNull();
    expect(parseParcelManifest({ ...raw(), chunks: [[2275, 3087, 3, -80, 40]] })).toBeNull();
    expect(parseParcelManifest({ ...raw(), profile: {} })).toBeNull();
  });
  it('rejects lots counted from another shadow run', () => {
    expect(parseParcelManifest(raw(), shadowDays.slice(0, 2))).toBeNull();
    expect(parseParcelManifest(raw(), [shadowDays[0], shadowDays[1], { id: 'dec21', steps: Array(17).fill(0) }])).toBeNull();
    expect(parseParcelManifest(raw(), [shadowDays[1], shadowDays[0], shadowDays[2]])).toBeNull();
  });
});

describe('chunks to load', () => {
  const chunks = manifest().chunks;
  it('takes the chunks whose lots can be in view, nearest the center first', () => {
    const view = { west: -79.99, south: 40.45, east: -79.95, north: 40.47 };
    expect(chunksToLoad(view, [-79.96, 40.46], chunks, 4).map((c) => c.key)).toEqual(['2276_3087', '2275_3087']);
    expect(chunksToLoad(view, [-79.96, 40.46], chunks, 1).map((c) => c.key)).toEqual(['2276_3087']);
  });
  it('includes a chunk whose lots reach into the view from the next tile', () => {
    // the view is south of 40.445; the first chunk starts at 40.44, so its southernmost lots can show
    const view = { west: -80.01, south: 40.42, east: -79.99, north: 40.443 };
    expect(chunksToLoad(view, [-80.0, 40.43], chunks, 4).map((c) => c.key)).toEqual(['2275_3088', '2275_3087']);
  });
  it('is empty away from the city and settles ties the same way every time', () => {
    expect(chunksToLoad({ west: -75.2, south: 39.9, east: -75.1, north: 40 }, [-75.15, 39.95], chunks, 4)).toEqual([]);
    const both: ParcelChunk[] = [{ key: 'b', lots: 1, box: { west: 0, south: 0, east: 1, north: 1 } }, { key: 'a', lots: 1, box: { west: 0, south: 0, east: 1, north: 1 } }];
    expect(chunksToLoad({ west: 0, south: 0, east: 1, north: 1 }, [0.5, 0.5], both, 4).map((c) => c.key)).toEqual(['a', 'b']);
  });
  it('keeps a needed chunk in memory even when it alone is over the budget', () => {
    const held = [{ key: 'far', bytes: 9000, used: 1 }, { key: 'here', bytes: 17000, used: 2 }];
    expect(evict(held, 10000, new Set(['here']))).toEqual(['far']);
  });
});

describe('a chunk of lots', () => {
  it('is taken when it is what the manifest says', () => {
    const fc = { type: 'FeatureCollection', features: [feature(0), feature(1)] };
    expect(prepareChunk(fc, 2)?.features[1].properties.i).toBe(1);
  });
  it('is refused when the count or the rows are off', () => {
    expect(prepareChunk({ type: 'FeatureCollection', features: [feature(0)] }, 2)).toBeNull();
    expect(prepareChunk({ type: 'FeatureCollection', features: [feature(1), feature(0)] }, 2)).toBeNull();
    expect(prepareChunk({ features: [feature(0)] }, 1)).toBeNull();
    expect(prepareChunk(null, 0)).toBeNull();
  });
});

describe('colors', () => {
  it('run from no shadow (pale yellow) to shadow all day (deep indigo)', () => {
    const c = shadeColors();
    expect(c).toHaveLength(10);
    expect(c.every((x) => /^#[0-9a-f]{6}$/.test(x))).toBe(true);
    expect(c[0]).toBe(HOURS_RAMP[HOURS_RAMP.length - 1]);
    expect(c[9]).toBe(HOURS_RAMP[0]);
    expect(shadeColors(5)).toEqual([...HOURS_RAMP].reverse());
  });
  it('class a percent in steps of ten', () => {
    expect([0, 9, 10, 55, 99, 100].map((v) => shadeClass(v))).toEqual([0, 0, 1, 5, 9, 9]);
    expect(shadeClass(-1)).toBe(-1);
    expect(shadeClass(Number.NaN)).toBe(-1);
  });
  it('the map expression colors a lot the way shadeClass does', () => {
    // a small reader of the two expression forms used: ['case', ['<', v, 0], a, b] and ['step', v, c0, stop1, c1, ...]
    const read = (expr: unknown, props: Record<string, unknown>): unknown => {
      if (!Array.isArray(expr)) return expr;
      const [op, ...a] = expr;
      if (op === 'get') return props[a[0] as string];
      if (op === 'number') return typeof read(a[0], props) === 'number' ? read(a[0], props) : read(a[1], props);
      if (op === '<') return (read(a[0], props) as number) < (read(a[1], props) as number);
      if (op === 'case') return read(a[0], props) ? read(a[1], props) : read(a[2], props);
      if (op === 'step') {
        const v = read(a[0], props) as number;
        let out = a[1];
        for (let i = 2; i < a.length; i += 2) if (v >= (a[i] as number)) out = a[i + 1];
        return out;
      }
      throw new Error(`unread: ${String(op)}`);
    };
    const colors = shadeColors();
    for (const v of [0, 5, 10, 19, 20, 50, 89, 90, 100]) expect(read(shadeFillExpr(2), { s2: v })).toBe(colors[shadeClass(v)]);
    expect(read(shadeFillExpr(2), { s2: -1 })).toBe(NO_DATA);
    expect(read(shadeFillExpr(2), {})).toBe(NO_DATA);
    expect(read(shadeFillExpr(0), { s0: 0, s2: 100 })).toBe(colors[0]);
    expect(shadeFillExpr(1)).toBe(shadeFillExpr(1));
  });
});

describe('a lot', () => {
  const m = manifest();
  it('reads its figures, and none when it is not rated', () => {
    expect(shadeOf(lot(0), 2)).toBe(63);
    expect(mostlyOf(lot(0), 0)).toBe(31);
    expect(shadeOf(lot(0, { s1: -1 }), 1)).toBeNull();
    expect(mostlyOf(lot(0, { m1: -1 }), 1)).toBeNull();
    expect(shadeOf(lot(0), 7)).toBeNull();
  });
  it('turns a shadow share into hours of direct sun', () => {
    expect(sunHours(0, m.days[0], 30)).toBe(14.5);
    expect(sunHours(100, m.days[0], 30)).toBe(0);
    expect(sunHours(50, m.days[2], 30)).toBe(4.5);
  });
  it('finds its day in the profile bytes', () => {
    expect(stepOffsets(m.days)).toEqual([0, 29, 53]);
    const bytes = new Uint8Array(3 * 71).map((_, k) => k % 71);
    expect(curveRow(bytes, 3, 1, m, 2)).toEqual(Array.from({ length: 18 }, (_, k) => 53 + k));
    expect(curveRow(bytes, 3, 0, m, 0)?.length).toBe(29);
    expect(curveRow(bytes, 3, 3, m, 0)).toBeNull();
    expect(curveRow(bytes, 4, 0, m, 0)).toBeNull();
    expect(curveRow(bytes, 3, 0, m, 5)).toBeNull();
    bytes[71 + 60] = 255;
    expect(curveRow(bytes, 3, 1, m, 2)).toBeNull();
    expect(curveRow(bytes, 3, 1, m, 0)?.length).toBe(29);
  });
  it('draws the curve across the whole box', () => {
    const p = curvePath([0, 100, 50], 100, 40);
    expect(p.line).toBe('M0.0 40.0L50.0 0.0L100.0 20.0');
    expect(p.area).toBe('M0.0 40.0L50.0 0.0L100.0 20.0L100.0 40.0L0.0 40.0Z');
    expect(curvePath([40], 100, 40).line).toBe('');
  });
  it('is named and sized in plain words', () => {
    expect(lotName('102-P-193')).toBe('Lot 102-P-193');
    expect(lotName('')).toBe('Lot without a number');
    expect(lotSize(3251.4)).toBe('3,251 sq ft');
    expect(lotSize(87120)).toBe('2.0 acres');
    expect(lotSize(1774814)).toBe('41 acres');
    expect(lotSize(0)).toBe('');
    expect(useLabel(m, 3)).toBe('Vacant land');
    expect(useLabel(m, 6)).toBe('No assessment record');
    expect(useLabel(m, 99)).toBe('Other use');
  });
});
