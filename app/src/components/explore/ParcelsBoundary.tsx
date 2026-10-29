// Parcels as Explore's open boundary (online only): the county's lot outlines in view from close zoom, and a click
// picks a lot, whose facts and zoning fill the right panel (components/explore/ParcelSummary). The lots follow the
// Data layers: the land-use map colors each lot by its own use, the zoning map shows through outlines only, and
// otherwise vacant lots are tinted. While Sun and shadow is on, its By parcel view draws the lots instead (it opens
// on that view) and its picked lot fills the panel. Another boundary turned on closes Parcels. Loaded on demand;
// writes the lots into the store the Explore map reads (lib/explore/parcelShadowStore).
import { useCallback, useEffect, useMemo } from 'react';
import { useLandUseLayer } from '../../lib/explore/landUseMap';
import { useParcelShadow } from '../../lib/explore/parcelShadowStore';
import { useSunShadow } from '../../lib/explore/sunShadowStore';
import { useZoningLayer } from '../../lib/explore/zoning';
import { lotByRow } from '../../lib/parcel/lots';
import { usePlaceLots } from '../../lib/parcel/usePlaceLots';
import { useApp } from '../../lib/store';

const BOUNDARIES = ['tracts', 'bg', 'zcta', 'muni'] as const;
const openPanel = () => useApp.getState().set({ browsePanel: true });

export default function ParcelsBoundary() {
  const on = useParcelShadow((s) => !!s.boundary);
  const picked = useParcelShadow((s) => s.picked ?? null);
  const sunOn = useSunShadow((s) => s.on);
  const landOn = useLandUseLayer((s) => s.on);
  const zoningOn = useZoningLayer((s) => s.on);
  const onPick = useCallback((chunk: string, row: number) => {
    void lotByRow(chunk, row).then((l) => {
      const p = useParcelShadow.getState().picked;
      // A second click on the picked lot clears it.
      useParcelShadow.setState({ picked: l && p && p.chunk === l.chunk && p.row === l.row ? null : l });
      if (l) openPanel();
    });
  }, []);
  // Held steady between renders: a new object each time would redraw the lots, which re-renders the map, and so on.
  const at = useMemo(() => (picked ? { chunk: picked.chunk, row: picked.row } : null), [picked]);
  const lots = usePlaceLots(on && !sunOn, at, onPick, 'explore', landOn ? 'use' : zoningOn ? 'outline' : 'vacant');

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
  // Sun and shadow turned on with Parcels open shows sun by lot; a lot picked there opens the panel too.
  useEffect(() => {
    if (on && sunOn) useSunShadow.setState({ view: 'parcel' });
  }, [on, sunOn]);
  useEffect(
    () =>
      useParcelShadow.subscribe((s, prev) => {
        if (s.boundary && s.selected && s.selected !== prev.selected && useSunShadow.getState().on) openPanel();
      }),
    [],
  );
  useEffect(() => {
    if (!on) useParcelShadow.setState({ picked: null });
  }, [on]);
  return null;
}
