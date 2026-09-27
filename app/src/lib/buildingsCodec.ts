// Compact building footprints. scripts/05_build_buildings.py writes src/data/buildings.json in the form below (about a
// fifth of the GeoJSON size) and decodeBuildings() turns it back into an ordinary FeatureCollection once, at load.
//
//   { v: 1, scale: 100000, tracts: [GEOID, …], src: [height source, …], b: [[h, srcIdx, tractIdx, rings, yb?], …] }
//
//   h         height in metres, rounded to 0.1
//   srcIdx    index into `src`;  tractIdx  index into `tracts`
//   rings     Polygon: an array of rings, outer ring first, then holes. Each ring is a flat array of integers
//             [x0, y0, dx1, dy1, dx2, dy2, …] where x = round(lng * scale), y = round(lat * scale) and every pair after
//             the first is the step from the vertex before it. The closing vertex is left out; decoding adds it back.
//             MultiPolygon: an array of such ring arrays, one per part (one level deeper), so a building stays one entry.
//   yb        optional year built. The pipeline does not write it, because nothing in the app reads it.
//
// No imports at run time and no side effects: the type import below is erased by the compiler.
import type { BuildingProps, FC } from './types';

export type BuildingFeature = { type: 'Feature'; properties: BuildingProps; geometry: unknown };
type Ring = number[];
export type CompactBuilding = [h: number, srcIdx: number, tractIdx: number, rings: Ring[] | Ring[][], yb?: number | null];
export interface CompactBuildings {
  v: 1;
  scale: number;
  tracts: string[];
  src: string[];
  b: CompactBuilding[];
}

export const BUILDINGS_DECIMALS = 5;
export const BUILDINGS_SCALE = 10 ** BUILDINGS_DECIMALS;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isIndex = (v: unknown, n: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < n;
const same = (a: number[], b: number[]) => a[0] === b[0] && a[1] === b[1];

function decodeRing(flat: unknown, scale: number): [number, number][] | null {
  if (!Array.isArray(flat) || flat.length < 2 || flat.length % 2 !== 0) return null;
  const out: [number, number][] = [];
  let x = 0;
  let y = 0;
  for (let i = 0; i < flat.length; i += 2) {
    const dx: unknown = flat[i];
    const dy: unknown = flat[i + 1];
    if (typeof dx !== 'number' || typeof dy !== 'number' || !Number.isFinite(dx) || !Number.isFinite(dy)) return null;
    x += dx;
    y += dy;
    out.push([x / scale, y / scale]);
  }
  if (!same(out[0], out[out.length - 1])) out.push([out[0][0], out[0][1]]);
  return out;
}

function decodeRings(rings: unknown, scale: number): [number, number][][] | null {
  if (!Array.isArray(rings) || !rings.length) return null;
  const out: [number, number][][] = [];
  for (const r of rings) {
    const ring = decodeRing(r, scale);
    if (!ring) return null;
    out.push(ring);
  }
  return out;
}

function decodeRow(row: unknown, scale: number, tracts: unknown[], src: unknown[]): BuildingFeature | null {
  if (!Array.isArray(row) || row.length < 4) return null;
  const [h, s, t, rings, yb] = row as unknown[];
  if (typeof h !== 'number' || !Number.isFinite(h) || !isIndex(s, src.length) || !isIndex(t, tracts.length)) return null;
  const source = src[s];
  const geoid = tracts[t];
  if (typeof source !== 'string' || typeof geoid !== 'string' || !Array.isArray(rings) || !rings.length) return null;
  const multi = Array.isArray(rings[0]) && Array.isArray(rings[0][0]);
  let geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
  if (multi) {
    const parts: [number, number][][][] = [];
    for (const part of rings) {
      const p = decodeRings(part, scale);
      if (!p) return null;
      parts.push(p);
    }
    geometry = { type: 'MultiPolygon', coordinates: parts };
  } else {
    const p = decodeRings(rings, scale);
    if (!p) return null;
    geometry = { type: 'Polygon', coordinates: p };
  }
  const properties: BuildingProps = { h, src: source, GEOID: geoid };
  if (typeof yb === 'number' && Number.isFinite(yb)) properties.yb = yb;
  return { type: 'Feature', properties, geometry };
}

/**
 * Building footprints as a FeatureCollection, whatever the file holds:
 * the compact form is decoded, a FeatureCollection is returned as it is, anything else gives an empty collection.
 * An entry that cannot be read (bad index, odd-length ring, a value that is not a number) is left out; nothing throws.
 */
export function decodeBuildings(raw: unknown): FC<BuildingFeature> {
  if (!isObject(raw)) return { type: 'FeatureCollection', features: [] };
  if (raw.type === 'FeatureCollection' && Array.isArray(raw.features)) return raw as unknown as FC<BuildingFeature>;
  const { v, scale, tracts, src, b } = raw;
  const features: BuildingFeature[] = [];
  if (v === 1 && typeof scale === 'number' && Number.isFinite(scale) && scale > 0 && Array.isArray(tracts) && Array.isArray(src) && Array.isArray(b)) {
    for (const row of b) {
      const f = decodeRow(row, scale, tracts, src);
      if (f) features.push(f);
    }
  }
  return { type: 'FeatureCollection', features };
}

// ------------------------------------------------------------------ encoder (tests and tooling; the pipeline has its own in Python)
type AnyFeature = { properties?: Partial<BuildingProps> | null; geometry?: unknown };

/** Degrees to integer steps. Rounded in decimal first, as the pipeline does: v * scale alone can land on a false tie. */
const steps = (v: number) => Math.round(Number(v.toFixed(BUILDINGS_DECIMALS)) * BUILDINGS_SCALE) + 0; // + 0 turns -0 into 0

function encodeRing(ring: unknown): Ring | null {
  if (!Array.isArray(ring) || ring.length < 3) return null;
  const pts: [number, number][] = [];
  for (const p of ring) {
    if (!Array.isArray(p) || typeof p[0] !== 'number' || typeof p[1] !== 'number' || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) return null;
    pts.push([steps(p[0]), steps(p[1])]);
  }
  // Leave out the closing vertex, unless the ring would still look closed without it (a repeated last vertex).
  if (same(pts[0], pts[pts.length - 1]) && !same(pts[0], pts[pts.length - 2])) pts.pop();
  const flat: Ring = [];
  let px = 0;
  let py = 0;
  for (const [x, y] of pts) {
    flat.push(x - px, y - py);
    px = x;
    py = y;
  }
  return flat;
}

function encodeParts(geometry: unknown): { multi: boolean; parts: Ring[][] } | null {
  if (!isObject(geometry) || !Array.isArray(geometry.coordinates)) return null;
  const multi = geometry.type === 'MultiPolygon';
  if (!multi && geometry.type !== 'Polygon') return null;
  const polys: unknown[] = multi ? geometry.coordinates : [geometry.coordinates];
  const parts: Ring[][] = [];
  for (const poly of polys) {
    if (!Array.isArray(poly) || !poly.length) return null;
    const rings: Ring[] = [];
    for (const r of poly) {
      const ring = encodeRing(r);
      if (!ring) return null;
      rings.push(ring);
    }
    parts.push(rings);
  }
  return parts.length ? { multi, parts } : null;
}

/**
 * FeatureCollection to the compact form; the mirror of encode_compact() in scripts/05_build_buildings.py
 * (same tables, same order, same rounding). A feature without a polygon, a height, a source or a GEOID is left out.
 */
export function encodeBuildings(fc: { features: AnyFeature[] }, opts: { yb?: boolean } = {}): CompactBuildings {
  const kept: { h: number; src: string; GEOID: string; yb: number | null; multi: boolean; parts: Ring[][] }[] = [];
  for (const f of fc.features) {
    const p = f.properties;
    if (!p || typeof p.h !== 'number' || !Number.isFinite(p.h) || typeof p.src !== 'string' || !p.src || typeof p.GEOID !== 'string' || !p.GEOID) continue;
    const g = encodeParts(f.geometry);
    if (g) kept.push({ h: Math.round(p.h * 10) / 10 + 0, src: p.src, GEOID: p.GEOID, yb: typeof p.yb === 'number' ? p.yb : null, ...g });
  }
  const count = new Map<string, number>();
  for (const k of kept) count.set(k.src, (count.get(k.src) ?? 0) + 1);
  const src = [...count.keys()].sort((a, b) => count.get(b)! - count.get(a)! || (a < b ? -1 : a > b ? 1 : 0));
  const tracts = [...new Set(kept.map((k) => k.GEOID))].sort();
  const srcIx = new Map(src.map((s, i) => [s, i]));
  const tractIx = new Map(tracts.map((t, i) => [t, i]));
  const b = kept.map((k): CompactBuilding => {
    const row: CompactBuilding = [k.h, srcIx.get(k.src)!, tractIx.get(k.GEOID)!, k.multi ? k.parts : k.parts[0]];
    if (opts.yb) row.push(k.yb);
    return row;
  });
  return { v: 1, scale: BUILDINGS_SCALE, tracts, src, b };
}
