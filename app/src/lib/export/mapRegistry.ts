// The live MapLibre maps, by name ('explore', 'place', 'compare-a', 'compare-b'), for map snapshots in exports.
// Views pass `onMapReady={registerMap('explore')}` to <MapView>; export handlers call `getMap('explore')`.
import type { Map as MLMap } from 'maplibre-gl';

const maps = new Map<string, MLMap>();
const handlers = new Map<string, (m: MLMap) => void>();
const waiting = new Map<string, Set<(m: MLMap) => void>>();

/** A stable onMapReady callback for `key`. */
export function registerMap(key: string): (m: MLMap) => void {
  let h = handlers.get(key);
  if (!h) {
    h = (m: MLMap) => {
      maps.set(key, m);
      for (const cb of waiting.get(key) ?? []) cb(m);
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

/** Call `cb` with the map named `key` now if it exists, and again whenever a new one registers. Returns a stop function. */
export function onMap(key: string, cb: (m: MLMap) => void): () => void {
  let set = waiting.get(key);
  if (!set) waiting.set(key, (set = new Set()));
  set.add(cb);
  const now = maps.get(key);
  if (now) cb(now);
  return () => void set.delete(cb);
}
