// The lots on the Place map at the Parcel level: the county's lot outlines for the chunks in view, from the lots'
// minimum zoom, vacant lots tinted so open land stands out, the picked lot outlined. A click picks a lot. Phones get
// none (a dense chunk is several megabytes); the address box still finds a lot there. Online only: loaded on demand.
import { useEffect, useMemo, useState } from 'react';
import type { Map as MLMap } from 'maplibre-gl';
import type { OverlayLayer } from '../../components/MapView';
import { chunksToLoad, lotName, lotSize, useLabel, type LotCollection, type ParcelManifest } from '../explore/parcelShadow';
import { onMap } from '../export/mapRegistry';
import { isPhone } from '../viewport';
import { loadLotManifest, loadShapes } from './lots';

const LAYER = 'pl-lots-';
/** Chunks drawn at once: the view's nearest. */
const MAX_NEEDED = 4;
/** Chunks start loading this much before the lots show. */
const EARLY = 0.6;
const VACANT_FILL = '#f59e0b';
const LINE: OverlayLayer['line'] = { color: '#475569', width: 0.6, opacity: 0.55 };

export interface PlaceLots {
  overlays: OverlayLayer[] | undefined;
  /** The zoom lots show from, once it is known that this copy of the site has them. */
  minZoom: number | null;
  /** The map is zoomed in far enough for the lots to show. */
  zoomOk: boolean;
}

export function usePlaceLots(on: boolean, picked: { chunk: string; row: number } | null, onPick: (chunk: string, row: number) => void, mapKey = 'place'): PlaceLots {
  const [manifest, setManifest] = useState<ParcelManifest | null>(null);
  const [ready, setReady] = useState<[string, LotCollection][]>([]);
  const [zoomOk, setZoomOk] = useState(false);

  useEffect(() => {
    if (!on || isPhone()) return;
    let live = true;
    let map: MLMap | null = null;
    let m: ParcelManifest | null = null;
    const update = () => {
      if (!live || !map || !m) return;
      const zoom = map.getZoom();
      setZoomOk(zoom >= m.minZoom);
      if (zoom < m.minZoom - EARLY) return;
      const b = map.getBounds(), c = map.getCenter();
      const keys = chunksToLoad({ west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() }, [c.lng, c.lat], m.chunks, MAX_NEEDED).map((k) => k.key);
      const mm = m;
      void Promise.all(keys.map((k) => loadShapes(mm, k).then((fc) => [k, fc] as const))).then((got) => {
        if (!live) return;
        const next = got.filter((g): g is [string, LotCollection] => !!g[1]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
        setReady((prev) => (prev.map((p) => p[0]).join('|') === next.map((p) => p[0]).join('|') ? prev : next));
      });
    };
    let stop: (() => void) | null = null;
    void loadLotManifest().then((got) => {
      if (!live) return;
      m = got;
      setManifest(got);
      if (!got) return;
      stop = onMap(mapKey, (mp) => {
        map?.off('moveend', update);
        map = mp;
        mp.on('moveend', update);
        update();
      });
    });
    return () => {
      live = false;
      stop?.();
      try {
        map?.off('moveend', update);
      } catch {
        /* the map went with its view */
      }
      setReady([]);
    };
  }, [on, mapKey]);

  const overlays = useMemo(() => {
    if (!on || !manifest) return undefined;
    const vacant = manifest.uses.indexOf('vacant');
    return ready.map(([key, fc]): OverlayLayer => ({
      id: LAYER + key,
      data: fc as unknown as OverlayLayer['data'],
      idField: 'i',
      minzoom: manifest.minZoom,
      selection: 'outline',
      interactive: true,
      fill: { expr: ['case', ['==', ['get', 'u'], vacant], VACANT_FILL, '#ffffff'], opacity: ['case', ['==', ['get', 'u'], vacant], 0.35, 0.02] },
      line: LINE,
      selectedId: picked && picked.chunk === key ? String(picked.row) : null,
      onSelect: (id) => onPick(key, Number(id)),
      tooltip: (id) => {
        const p = fc.features[Number(id)]?.properties;
        return p ? (
          <div className="max-w-64">
            <div className="font-semibold">{lotName(p.lot)}</div>
            <div className="text-caption text-white/75">
              {useLabel(manifest, p.u)} · {lotSize(p.sf)}
            </div>
          </div>
        ) : null;
      },
    }));
  }, [on, manifest, ready, picked, onPick]);

  return { overlays, minZoom: manifest?.minZoom ?? null, zoomOk };
}
