// Real county lots for the Place page's Parcel level. The shapes are the By parcel view's (data/parcel-shadow/: each
// lot's outline, county lot label, use class, shape area and share of three days in shadow); the facts beside them
// (data/parcel-lots/, scripts/22) add the zoning district at the lot, the assessment's lot area, a rough frontage and
// depth and the homes on it today. Lot facts only: no parcel ID, owner, address, value or sale is in either file.
// The pure half (finding a lot at a point, reading its facts) is tested without a map; the loaders cache by chunk.
// Online only: loaded on demand.
import { chunkUrl, parseParcelManifest, prepareChunk, type LotCollection, type LotFeature, type ParcelManifest } from '../explore/parcelShadow';
import { pointInGeometry, type GeoGeometry } from '../geo';
import type { SiteLot } from '../project/store';

/** How far from a point a lot still counts as the one meant: geocoded addresses fall on the street in front. */
export const NEAR_M = 30;
/** Chunks of shapes kept in memory (a dense one is several megabytes). */
const KEEP_CHUNKS = 6;

export interface FactsFile {
  codes: string[];
  /** Lot label → [district index or -1, lot sq ft, frontage ft or -1, depth ft or -1, homes today or -1]. */
  lots: Record<string, number[]>;
}

export interface LotFacts {
  district: string | null;
  sqft: number;
  frontageFt: number | null;
  depthFt: number | null;
  existing: number | null;
}

// ------------------------------------------------------------------------------------------------------- pure

const M_LAT = 110_540;
const mLng = (lat: number) => 111_320 * Math.cos((lat * Math.PI) / 180);

/** Meters from a point to a segment, on a flat local grid (fine at lot scale). */
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number, kx: number): number {
  const x = (px - ax) * kx, y = (py - ay) * M_LAT, ux = (bx - ax) * kx, uy = (by - ay) * M_LAT;
  const len = ux * ux + uy * uy;
  const t = len > 0 ? Math.max(0, Math.min(1, (x * ux + y * uy) / len)) : 0;
  return Math.hypot(x - t * ux, y - t * uy);
}

const polygonsOf = (g: GeoGeometry): number[][][][] => (g.type === 'Polygon' ? [g.coordinates as number[][][]] : g.type === 'MultiPolygon' ? (g.coordinates as number[][][][]) : []);

/** Meters from a point to a lot's edge (0 inside it). */
export function distanceToLot(lng: number, lat: number, g: GeoGeometry): number {
  if (pointInGeometry(lng, lat, g)) return 0;
  const kx = mLng(lat);
  let best = Infinity;
  for (const poly of polygonsOf(g))
    for (const ring of poly)
      for (let i = 1; i < ring.length; i++) best = Math.min(best, segDist(lng, lat, ring[i - 1][0], ring[i - 1][1], ring[i][0], ring[i][1], kx));
  return best;
}

/** The lot at a point in one chunk: the smallest one holding it (chunks list lots largest first, so the last match),
 *  else the nearest within `near` meters. */
export function lotIn(fc: LotCollection, lng: number, lat: number, near = NEAR_M): { feature: LotFeature; meters: number } | null {
  let inside: LotFeature | null = null;
  let nearest: { feature: LotFeature; meters: number } | null = null;
  for (const f of fc.features) {
    if (pointInGeometry(lng, lat, f.geometry)) inside = f;
    else if (!inside) {
      const d = distanceToLot(lng, lat, f.geometry);
      if (d <= near && (!nearest || d < nearest.meters)) nearest = { feature: f, meters: d };
    }
  }
  return inside ? { feature: inside, meters: 0 } : nearest;
}

/** A point inside the lot for the pin: its largest part's center when that is inside, else the middle of the widest
 *  run across the part at the center's latitude. */
export function labelPoint(g: GeoGeometry): [number, number] | null {
  const polys = polygonsOf(g);
  if (!polys.length) return null;
  const area = (r: number[][]) => Math.abs(r.reduce((s, p, i) => (i ? s + (r[i - 1][0] * p[1] - p[0] * r[i - 1][1]) : 0), 0)) / 2;
  const ring = polys.map((p) => p[0]).sort((a, b) => area(b) - area(a))[0];
  if (!ring?.length) return null;
  const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cy = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  if (pointInGeometry(cx, cy, g)) return [cx, cy];
  const xs: number[] = [];
  for (let i = 1; i < ring.length; i++) {
    const [ax, ay] = ring[i - 1], [bx, by] = ring[i];
    if (ay > cy !== by > cy) xs.push(ax + ((cy - ay) * (bx - ax)) / (by - ay));
  }
  xs.sort((a, b) => a - b);
  let best: [number, number] | null = null, width = -1;
  for (let i = 0; i + 1 < xs.length; i += 2)
    if (xs[i + 1] - xs[i] > width) {
      width = xs[i + 1] - xs[i];
      best = [(xs[i] + xs[i + 1]) / 2, cy];
    }
  return best ?? [ring[0][0], ring[0][1]];
}

/** A lot's facts from its chunk's facts file, or null when the file has no row for it. */
export function factsOf(file: FactsFile | null, label: string): LotFacts | null {
  const r = label && file ? file.lots[label] : undefined;
  if (!r || r.length < 5) return null;
  const n = (v: number) => (v >= 0 ? v : null);
  return { district: r[0] >= 0 ? (file!.codes[r[0]] ?? null) : null, sqft: r[1], frontageFt: n(r[2]), depthFt: n(r[3]), existing: n(r[4]) };
}

/** What the site keeps of a lot (lib/project/store SiteLot). */
export function siteLot(m: Pick<ParcelManifest, 'uses'>, chunk: string, f: LotFeature, facts: LotFacts | null, point: [number, number]): SiteLot {
  const p = f.properties;
  const shade = [0, 1, 2].map((d) => {
    const v = p[`s${d}`];
    return typeof v === 'number' && v >= 0 ? v : null;
  });
  return {
    chunk,
    row: p.i,
    label: p.lot ?? '',
    use: m.uses[p.u] ?? 'other',
    point,
    sqft: facts?.sqft ?? Math.round(p.sf),
    district: facts?.district ?? null,
    frontageFt: facts?.frontageFt ?? null,
    depthFt: facts?.depthFt ?? null,
    existing: facts?.existing ?? null,
    shade,
  };
}

// ----------------------------------------------------------------------------------------------------- loading

const dataBase = () => new URL('data/', document.baseURI).toString();
let manifestOnce: Promise<ParcelManifest | null> | null = null;
const shapes = new Map<string, Promise<LotCollection | null>>();
const facts = new Map<string, Promise<FactsFile | null>>();

/** The lots' manifest, or null when this copy of the site has no lot files. */
export function loadLotManifest(): Promise<ParcelManifest | null> {
  manifestOnce ??= fetch(dataBase() + 'parcel-shadow/manifest.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => parseParcelManifest(json))
    .catch(() => null);
  return manifestOnce;
}

export function loadShapes(m: ParcelManifest, key: string): Promise<LotCollection | null> {
  let p = shapes.get(key);
  if (!p) {
    const lots = m.chunks.find((c) => c.key === key)?.lots ?? -1;
    p = fetch(chunkUrl(dataBase() + 'parcel-shadow/', m.paths.lots, key))
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => prepareChunk(json, lots))
      .catch(() => null);
    shapes.set(key, p);
    while (shapes.size > KEEP_CHUNKS) shapes.delete(shapes.keys().next().value!);
  } else {
    shapes.delete(key);
    shapes.set(key, p);
  }
  return p;
}

export function loadFacts(key: string): Promise<FactsFile | null> {
  let p = facts.get(key);
  if (!p) {
    p = fetch(dataBase() + `parcel-lots/${key}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => (json && Array.isArray(json.codes) && json.lots && typeof json.lots === 'object' ? (json as FactsFile) : null))
      .catch(() => null);
    facts.set(key, p);
  }
  return p;
}

/** The lot at a point anywhere in the city (the smallest holding it, else the nearest within NEAR_M), with its facts. */
export async function lotAt(lng: number, lat: number): Promise<SiteLot | null> {
  const m = await loadLotManifest();
  if (!m) return null;
  const pad = NEAR_M / M_LAT;
  const keys = m.chunks.filter((c) => c.box.west - pad <= lng && c.box.east + pad >= lng && c.box.south - pad <= lat && c.box.north + pad >= lat).map((c) => c.key);
  let best: { key: string; feature: LotFeature; meters: number } | null = null;
  for (const key of keys) {
    const fc = await loadShapes(m, key);
    const hit = fc ? lotIn(fc, lng, lat) : null;
    if (hit && (!best || hit.meters < best.meters || (hit.meters === best.meters && hit.feature.properties.sf < best.feature.properties.sf))) best = { key, ...hit };
  }
  if (!best) return null;
  return lotFrom(m, best.key, best.feature, best.meters === 0 ? [lng, lat] : null);
}

/** A lot by its chunk and row (a click on the map's lot layer). */
export async function lotByRow(key: string, row: number): Promise<SiteLot | null> {
  const m = await loadLotManifest();
  const fc = m ? await loadShapes(m, key) : null;
  const f = fc?.features[row];
  return m && f ? lotFrom(m, key, f, null) : null;
}

async function lotFrom(m: ParcelManifest, key: string, f: LotFeature, point: [number, number] | null): Promise<SiteLot | null> {
  const at = point ?? labelPoint(f.geometry);
  if (!at) return null;
  return siteLot(m, key, f, factsOf(await loadFacts(key), f.properties.lot ?? ''), at);
}
