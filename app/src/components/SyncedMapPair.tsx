import { useEffect, useMemo, type ReactNode } from 'react';
import MapView, { makeSyncGroup, type OverlayLayer } from './MapView';
import type { Map as MLMap } from 'maplibre-gl';
import type { MapPaint } from '../lib/paint';
import type { Pin } from '../lib/types';
import { useApp } from '../lib/store';

export interface PairSide {
  paint: MapPaint;
  selectedId: string | null;
  buildingColor?: string | null;
  flips?: Set<string> | null;
  overlay?: ReactNode;
  /** Extra polygon layers on this side (the close-call wash on "Which type wins"). Memoize: MapView diffs by identity. */
  overlays?: OverlayLayer[];
  tooltip?: (id: string) => ReactNode;
  onSelect?: (id: string) => void;
  pin?: Pin | null;
  /** The side's MapLibre map once created (exports use it for a snapshot). */
  onMapReady?: (map: MLMap) => void;
}

/** Two maps side by side: the zoom level is linked, but each map pans, tilts and flies to its own selected tract on its own. */
/** `className` replaces the default frame (grey backing, 6px gutter) around the two maps. */
/** `syncZoom` (default on) links the zoom; off, each map is controlled on its own. Turning it on brings both maps to
 *  the wider of their two zoom levels, each on its own center. */
export default function SyncedMapPair({ a, b, children, className, syncZoom = true }: { a: PairSide; b: PairSide; children?: ReactNode; className?: string; syncZoom?: boolean }) {
  const lite = useApp((s) => s.lite);
  const layers = useApp((s) => s.layers);
  const pad = { top: 50, bottom: 50, left: 40, right: 40 };
  const sync = useMemo(() => makeSyncGroup(), []);
  sync.enabled = syncZoom;
  useEffect(() => {
    if (!syncZoom || sync.maps.size < 2) return;
    const zoom = Math.min(...[...sync.maps].map((m) => m.getZoom()));
    for (const m of sync.maps) if (Math.abs(m.getZoom() - zoom) > 0.01) m.easeTo({ zoom, duration: 600 });
  }, [syncZoom, sync]);
  return (
    <div className={className ?? 'relative grid h-full grid-cols-2 gap-1.5 bg-stone-200/60 p-1.5'}>
      {[a, b].map((s, i) => (
        <div key={i} className="relative overflow-hidden rounded-xl ring-1 ring-black/5">
          <MapView paint={s.paint} selectedId={s.selectedId} buildingColor={s.buildingColor} flips={s.flips} lite={lite} terrain={layers.terrain} buildings={layers.buildings} hillshade={layers.hillshade} padding={pad} onSelect={s.onSelect} tooltip={s.tooltip} overlay={s.overlay} overlays={s.overlays} pin={s.pin} sync={sync} onMapReady={s.onMapReady} />
        </div>
      ))}
      {children}
    </div>
  );
}
