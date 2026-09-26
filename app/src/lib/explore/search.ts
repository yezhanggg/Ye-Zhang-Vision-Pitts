// Places a search result in the unit under it at the chosen geography, using whatever geometry is loaded
// (city subset or county-wide). TractSearch calls the returned resolver instead of its tract-only default.
import { tractBounds, tractById } from '../data';
import { featureAt, indexFC, type IndexedFeature } from '../geo';
import type { GeoResult, Resolved } from '../geocode';
import type { BrowseLevel, UnitFC } from './types';

const indexCache = new WeakMap<UnitFC, IndexedFeature[]>();
/** Point-in-polygon index for a feature collection, built once per collection. */
export function indexOf(fc: UnitFC): IndexedFeature[] {
  let idx = indexCache.get(fc);
  if (!idx) {
    idx = indexFC(fc, 'GEOID');
    indexCache.set(fc, idx);
  }
  return idx;
}

export function resolveForLevel(level: BrowseLevel, fc: UnitFC): (r: GeoResult) => Resolved {
  const ids = new Set(fc.features.map((f) => f.properties.GEOID));
  const index = indexOf(fc);
  const ok = (r: GeoResult, geoid: string): Resolved => ({ ok: true, result: r, geoid });
  const byPoint = (r: GeoResult, lng: number, lat: number): Resolved => {
    const id = featureAt(lng, lat, index);
    return id ? ok(r, id) : { ok: false, reason: 'outside' };
  };
  return (r) => {
    // Exact tract hit (local tract results, Census geocoder results).
    if (level === 'tract' && r.geoid && ids.has(r.geoid)) return ok(r, r.geoid);
    // A point is the most precise thing we have for block groups and ZIPs.
    if (r.center) {
      const res = byPoint(r, r.center[0], r.center[1]);
      if (res.ok || !r.geoid) return res;
    }
    if (r.geoid) {
      if (level === 'bg') {
        const hit = fc.features.find((f) => f.properties.tract === r.geoid);
        if (hit) return ok(r, hit.properties.GEOID);
      }
      if (level === 'zcta') {
        const z = tractById.get(r.geoid)?.zcta;
        if (z && ids.has(z)) return ok(r, z);
      }
      const b = tractBounds.get(r.geoid);
      if (b) return byPoint(r, (b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2);
      return { ok: false, reason: 'outside' };
    }
    return { ok: false, reason: 'notfound' };
  };
}
