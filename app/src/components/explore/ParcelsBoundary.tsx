// Parcels as Explore's open boundary (online only): the county's lot outlines in view from close zoom, vacant lots
// tinted, and a card with the clicked lot's facts (lot number, use, area, zoning, shape, homes today, sun). While Sun
// and shadow is on, its By parcel view draws the lots instead (it opens on that view). Another boundary turned on
// closes Parcels. Loaded on demand; writes the lots into the store the Explore map reads (lib/explore/parcelShadowStore).
import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useParcelShadow } from '../../lib/explore/parcelShadowStore';
import { useSunShadow } from '../../lib/explore/sunShadowStore';
import { lotByRow } from '../../lib/parcel/lots';
import { usePlaceLots } from '../../lib/parcel/usePlaceLots';
import type { SiteLot } from '../../lib/project/store';
import { useApp } from '../../lib/store';
import LotCard from '../place/levels/LotCard';

const BOUNDARIES = ['tracts', 'bg', 'zcta', 'muni'] as const;

export default function ParcelsBoundary() {
  const on = useParcelShadow((s) => !!s.boundary);
  const sunOn = useSunShadow((s) => s.on);
  const [picked, setPicked] = useState<SiteLot | null>(null);
  const onPick = useCallback((chunk: string, row: number) => {
    void lotByRow(chunk, row).then((l) => setPicked((p) => (l && p && p.chunk === l.chunk && p.row === l.row ? null : l)));
  }, []);
  const lots = usePlaceLots(on && !sunOn, picked ? { chunk: picked.chunk, row: picked.row } : null, onPick, 'explore');

  // The lots go to the Explore map while Sun and shadow is off (its By parcel view owns them while it is on).
  useEffect(() => {
    if (!on || sunOn) return;
    useParcelShadow.setState({ overlays: lots.overlays ?? [], active: lots.zoomOk, minZoom: lots.minZoom });
    return () => useParcelShadow.setState({ overlays: [], active: false });
  }, [on, sunOn, lots.overlays, lots.zoomOk, lots.minZoom]);
  // One boundary at a time: another one opened closes Parcels.
  useEffect(
    () =>
      useApp.subscribe((s, prev) => {
        if (BOUNDARIES.some((id) => s.layers[id] && !prev.layers[id])) useParcelShadow.setState({ boundary: false });
      }),
    [],
  );
  // Sun and shadow turned on with Parcels open shows sun by lot.
  useEffect(() => {
    if (on && sunOn) useSunShadow.setState({ view: 'parcel' });
  }, [on, sunOn]);
  useEffect(() => {
    if (!on) setPicked(null);
  }, [on]);

  if (!on || sunOn) return null;
  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 z-20 rounded-xl bg-white/95 p-3 shadow-lg ring-1 ring-black/5 backdrop-blur" style={{ width: 320, left: 384 }} data-parcels-card>
      <div className="flex items-center justify-between gap-2">
        <div className="text-small font-semibold text-slate-900">{picked ? 'Lot' : 'Parcels'}</div>
        <button type="button" onClick={() => (picked ? setPicked(null) : useParcelShadow.setState({ boundary: false }))} className="rounded-md p-0.5 text-slate-500 hover:text-slate-800" aria-label={picked ? 'Clear the lot' : 'Close Parcels'}>
          <X className="h-4 w-4" />
        </button>
      </div>
      {picked ? (
        <div className="mt-2">
          <LotCard lot={picked} izo={null} />
        </div>
      ) : (
        <p className="mt-1 text-small text-slate-600">{lots.minZoom == null ? 'The lot files are not on this copy of the site.' : lots.zoomOk ? 'Click a lot for its facts. Vacant lots are tinted.' : 'Zoom in to see lots.'}</p>
      )}
    </div>
  );
}
