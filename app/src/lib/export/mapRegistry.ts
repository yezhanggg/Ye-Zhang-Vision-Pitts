// The live MapLibre maps, by name ('explore', 'place', 'compare-a', 'compare-b'), for map snapshots in exports.
// Views pass `onMapReady={registerMap('explore')}` to <MapView>; export handlers call `getMap('explore')`.
import type { Map as MLMap } from 'maplibre-gl';

const maps = new Map<string, MLMap>();
const handlers = new Map<string, (m: MLMap) => void>();

/** A stable onMapReady callback for `key`. */
export function registerMap(key: string): (m: MLMap) => void {
  let h = handlers.get(key);
  if (!h) {
    h = (m: MLMap) => {
      maps.set(key, m);
      m.once('remove', () => {
        if (maps.get(key) === m) maps.delete(key);
      });
    };
    handlers.set(key, h);
  }
  return h;
}

export function getMap(key: string): MLMap | null {
  return maps.get(key) ?? null;
}
