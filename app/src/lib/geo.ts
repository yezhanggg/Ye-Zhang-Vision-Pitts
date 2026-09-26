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
