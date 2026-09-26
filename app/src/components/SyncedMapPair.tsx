import { useMemo, type ReactNode } from 'react';
import MapView, { makeSyncGroup } from './MapView';
import type { MapPaint } from '../lib/paint';
import type { Pin } from '../lib/types';
import { useApp } from '../lib/store';

export interface PairSide {
  paint: MapPaint;
  selectedId: string | null;
  buildingColor?: string | null;
  flips?: Set<string> | null;
  overlay?: ReactNode;
  tooltip?: (id: string) => ReactNode;
  onSelect?: (id: string) => void;
  pin?: Pin | null;
}

/** Two maps side by side; zoom, pitch and bearing stay in sync, each keeps its own center. */
export default function SyncedMapPair({ a, b, children }: { a: PairSide; b: PairSide; children?: ReactNode }) {
  const lite = useApp((s) => s.lite);
  const layers = useApp((s) => s.layers);
  const sync = useMemo(() => makeSyncGroup(), []);
  const pad = { top: 50, bottom: 50, left: 40, right: 40 };
  return (
    <div className="relative grid h-full grid-cols-2 gap-1.5 bg-stone-200/60 p-1.5">
      {[a, b].map((s, i) => (
        <div key={i} className="relative overflow-hidden rounded-xl ring-1 ring-black/5">
          <MapView paint={s.paint} selectedId={s.selectedId} buildingColor={s.buildingColor} flips={s.flips} lite={lite} terrain={layers.terrain} buildings={layers.buildings} sync={sync} padding={pad} onSelect={s.onSelect} tooltip={s.tooltip} overlay={s.overlay} pin={s.pin} />
        </div>
      ))}
      {children}
    </div>
  );
}
