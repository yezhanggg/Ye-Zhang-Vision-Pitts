// Point-in-polygon lookup used by search to find the tract under an address.
type Ring = number[][];
type PolygonCoords = Ring[];

export function pointInRing(x: number, y: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function pointInPolygon(x: number, y: number, poly: PolygonCoords): boolean {
  if (!poly.length || !pointInRing(x, y, poly[0])) return false;
  for (let h = 1; h < poly.length; h++) if (pointInRing(x, y, poly[h])) return false;
  return true;
}

export interface GeoGeometry {
  type: string;
  coordinates: unknown;
}

export function pointInGeometry(x: number, y: number, g: GeoGeometry | null | undefined): boolean {
  if (!g) return false;
  if (g.type === 'Polygon') return pointInPolygon(x, y, g.coordinates as PolygonCoords);
  if (g.type === 'MultiPolygon') return (g.coordinates as PolygonCoords[]).some((p) => pointInPolygon(x, y, p));
  return false;
}

export interface IndexedFeature {
  id: string;
  geometry: GeoGeometry;
  bounds: [[number, number], [number, number]];
}

export function featureAt(lng: number, lat: number, features: Iterable<IndexedFeature>): string | null {
  for (const f of features) {
    const [[x0, y0], [x1, y1]] = f.bounds;
    if (lng < x0 || lng > x1 || lat < y0 || lat > y1) continue;
    if (pointInGeometry(lng, lat, f.geometry)) return f.id;
  }
  return null;
}

/** Generous City of Pittsburgh bounding box for search bias and quick "outside the city" checks. */
export const CITY_BBOX: [number, number, number, number] = [-80.11, 40.36, -79.85, 40.51];
export const inCityBox = (lng: number, lat: number) => lng >= CITY_BBOX[0] && lng <= CITY_BBOX[2] && lat >= CITY_BBOX[1] && lat <= CITY_BBOX[3];

// ------------------------------------------------------------------ bounds and indexes (any polygon set)
export type Bounds = [[number, number], [number, number]];

/** [[west, south], [east, north]] of a Polygon or MultiPolygon. */
export function boundsOf(geom: GeoGeometry | null | undefined): Bounds {
  let w = 180, s = 90, e = -180, n = -90;
  const walk = (c: unknown) => {
    if (Array.isArray(c) && typeof c[0] === 'number') {
      const [x, y] = c as number[];
      if (x < w) w = x;
      if (x > e) e = x;
      if (y < s) s = y;
      if (y > n) n = y;
    } else if (Array.isArray(c)) c.forEach(walk);
  };
  walk(geom?.coordinates);
  return [[w, s], [e, n]];
}

/** Smallest box around several boxes, or null for none. */
export function unionBounds(list: Iterable<Bounds>): Bounds | null {
  let out: Bounds | null = null;
  for (const [[w, s], [e, n]] of list) {
    if (!out) out = [[w, s], [e, n]];
    else {
      if (w < out[0][0]) out[0][0] = w;
      if (s < out[0][1]) out[0][1] = s;
      if (e > out[1][0]) out[1][0] = e;
      if (n > out[1][1]) out[1][1] = n;
    }
  }
  return out;
}

/** Point-in-polygon index for any feature collection keyed by `idField`. */
export function indexFC(fc: { features: { properties: Record<string, unknown>; geometry: GeoGeometry }[] }, idField = 'GEOID'): IndexedFeature[] {
  const out: IndexedFeature[] = [];
  for (const f of fc.features) {
    const id = f.properties?.[idField];
    if (id == null) continue;
    out.push({ id: String(id), geometry: f.geometry, bounds: boundsOf(f.geometry) });
  }
  return out;
}
