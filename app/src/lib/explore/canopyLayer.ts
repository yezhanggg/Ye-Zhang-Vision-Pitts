// The tree canopy map: ordinary map tiles (scripts/16_build_canopy.py writes them, green where the 2020 lidar found
// canopy), added to the Explore map while the switch is on. Loaded the first time the switch is turned on.
import type { Map as MLMap } from 'maplibre-gl';
import { onMap } from '../export/mapRegistry';
import { OVERLAY_TOP } from '../mapStyle';
import { useCanopy } from './canopyStore';

export const CANOPY_ID = 'tree-canopy';
const OPACITY = 0.62;

export interface CanopyManifest {
  tileSize: number;
  minzoom: number;
  maxzoom: number;
  /** west, south, east, north */
  bounds: [number, number, number, number];
  path: string;
}

export const canopyBase = () => new URL('data/canopy/', document.baseURI).toString();

/** The manifest when it has what the map source needs, otherwise null. */
export function parseCanopyManifest(json: unknown): CanopyManifest | null {
  const m = json as Partial<CanopyManifest> | null;
  const n = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  if (!m || !n(m.tileSize) || !n(m.minzoom) || !n(m.maxzoom) || m.maxzoom < m.minzoom || typeof m.path !== 'string') return null;
  if (!Array.isArray(m.bounds) || m.bounds.length !== 4 || !m.bounds.every(n)) return null;
  return { tileSize: m.tileSize, minzoom: m.minzoom, maxzoom: m.maxzoom, bounds: m.bounds, path: m.path };
}

let manifest: Promise<CanopyManifest | null> | null = null;
const loadManifest = () =>
  (manifest ??= fetch(canopyBase() + 'manifest.json')
    .then((r) => (r.ok ? r.json() : null))
    .then(parseCanopyManifest)
    .catch(() => null));

function remove(m: MLMap) {
  try {
    if (m.getLayer(CANOPY_ID)) m.removeLayer(CANOPY_ID);
    if (m.getSource(CANOPY_ID)) m.removeSource(CANOPY_ID);
  } catch {
    /* the map was already removed with its view */
  }
}

function add(m: MLMap, man: CanopyManifest) {
  if (m.getLayer(CANOPY_ID) || !m.getLayer(OVERLAY_TOP)) return;
  if (!m.getSource(CANOPY_ID)) {
    m.addSource(CANOPY_ID, { type: 'raster', tiles: [canopyBase() + man.path], tileSize: man.tileSize, minzoom: man.minzoom, maxzoom: man.maxzoom, bounds: man.bounds });
  }
  // Just above the boundary fills, under the buildings and the labels.
  const layers = m.getStyle().layers;
  const above = layers[layers.findIndex((l) => l.id === OVERLAY_TOP) + 1]?.id;
  m.addLayer({ id: CANOPY_ID, type: 'raster', source: CANOPY_ID, paint: { 'raster-opacity': OPACITY, 'raster-fade-duration': 150 } }, above);
}

/** Keep the canopy layer on the Explore map in step with the switch, for as long as the page lives. */
export function startCanopy() {
  let map: MLMap | null = null;
  let onStyle: (() => void) | null = null;
  const sync = () => {
    const m = map;
    if (!m) return;
    if (!useCanopy.getState().on) return remove(m);
    void loadManifest().then((man) => {
      if (!man) return useCanopy.setState({ on: false, failed: true });
      if (map === m && useCanopy.getState().on) add(m, man);
    });
  };
  onMap('explore', (m) => {
    if (map && onStyle) {
      try {
        map.off('styledata', onStyle);
      } catch {
        /* gone with its view */
      }
    }
    map = m;
    // A style change (the basemap reloading) drops the layer; put it back.
    onStyle = sync;
    m.on('styledata', sync);
    sync();
  });
  useCanopy.subscribe((s, prev) => {
    if (s.on !== prev.on) sync();
  });
}
