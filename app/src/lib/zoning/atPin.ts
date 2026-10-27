// The zoning district under a pin: a map reading of the city's zoning polygons (lib/explore/zoning), not a zoning
// determination. A geocoded address often lands on the street centerline, which no district covers, so a miss looks
// around the point (15, 30 and 50 m in 8 directions) and takes the district most of those points fall in.
import izoFile from '../../data/lazy/izo_overlay.json';
import { zoningFC } from '../explore/zoning';
import { boundsOf, pointInGeometry, type Bounds, type GeoGeometry } from '../geo';
import { STANDARD_BY_CODE, STANDARDS } from './capacity';

export type PinZoning =
  /** A district with standards: Try a lot can open on it. `near`: read around the point (a right of way). */
  | { kind: 'computed'; code: string; near: boolean }
  /** A mapped district Try a lot has no standards for (Riverfront, Downtown, …), with the reason the file gives. */
  | { kind: 'not_computed'; code: string; near: boolean; why: string | null }
  /** No district within 50 m: outside the city, or in a river. */
  | { kind: 'none' };

let index: { code: string; geometry: (typeof zoningFC.features)[number]['geometry']; bounds: Bounds }[] | null = null;
function districts() {
  index ??= zoningFC.features.map((f) => ({ code: f.properties.code, geometry: f.geometry, bounds: boundsOf(f.geometry) }));
  return index;
}

export function districtAt(lng: number, lat: number): string | null {
  for (const d of districts()) {
    const [[x0, y0], [x1, y1]] = d.bounds;
    if (lng < x0 || lng > x1 || lat < y0 || lat > y1) continue;
    if (pointInGeometry(lng, lat, d.geometry)) return d.code;
  }
  return null;
}

const M_PER_DEG_LAT = 111_320;

export function zoningAtPin(lng: number, lat: number): PinZoning {
  let code = districtAt(lng, lat);
  let near = false;
  if (!code) {
    const votes = new Map<string, number>();
    const mLng = M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
    for (const r of [15, 30, 50]) {
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        const c = districtAt(lng + (r * Math.cos(a)) / mLng, lat + (r * Math.sin(a)) / M_PER_DEG_LAT);
        if (c) votes.set(c, (votes.get(c) ?? 0) + 1);
      }
      // The nearest ring that reaches any district decides, so a far district never outvotes the near one.
      if (votes.size) break;
    }
    code = [...votes].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    near = true;
  }
  if (!code) return { kind: 'none' };
  if (STANDARD_BY_CODE.has(code)) return { kind: 'computed', code, near };
  return { kind: 'not_computed', code, near, why: STANDARDS.not_computed[code] ?? null };
}

const IZO = izoFile as unknown as { source: string; geometry: GeoGeometry };
const IZO_BOUNDS = boundsOf(IZO.geometry);

/** Whether a point is in the inclusionary housing overlay (the City's layer, simplified at 15 ft; scripts/18). */
export function inIzoAt(lng: number, lat: number): boolean {
  const [[x0, y0], [x1, y1]] = IZO_BOUNDS;
  return lng >= x0 && lng <= x1 && lat >= y0 && lat <= y1 && pointInGeometry(lng, lat, IZO.geometry);
}
