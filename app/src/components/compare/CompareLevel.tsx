// Compare places at the Place tab's three levels (place/levels): one Parcel | Tract | ZIP code switch for both sides
// (lib/compare/store; Tract to start, nothing picked). At Parcel each map draws the county lots from close zoom and a
// click picks that side's lot (its tract becomes the side's place); at ZIP code each map outlines the ZIP codes and a
// click picks that side's ZIP. Here: the switch, each map's lots or ZIP outlines, moving a map for a level, and the
// lots' key. Lot facts only. Online only: loaded on demand with Compare places.
import { useCallback, useMemo } from 'react';
import type { Map as MLMap } from 'maplibre-gl';
import { cityView } from '../../lib/analysis/framing';
import { setCompareLevel, useCompare } from '../../lib/compare/store';
import { tractAt, tractBounds, tractsFC } from '../../lib/data';
import { zipById, zipCoverage, zipName } from '../../lib/equity/zip';
import { bundledGeo } from '../../lib/explore/catalog';
import { getMap, onMap } from '../../lib/export/mapRegistry';
import { cx } from '../../lib/format';
import type { MapPaint } from '../../lib/paint';
import { lotAt, lotByRow } from '../../lib/parcel/lots';
import { pickLot } from '../../lib/parcel/pick';
import { usePlaceLots } from '../../lib/parcel/usePlaceLots';
import { placeZips, zipTracts, type PlaceArea } from '../../lib/place/zipView';
import { SIDE_A, SIDE_B } from '../../lib/project/side';
import type { SiteLot } from '../../lib/project/store';
import { useApp } from '../../lib/store';
import type { OverlayLayer } from '../MapView';
import { SlideBg, useSlide } from '../primitives';
import { LEVELS } from '../place/levels/levels';
import { PARCEL_ZOOM } from '../place/levels/LevelSwitch';
import LotZoning from '../place/levels/LotZoning';
import { inIzoAt } from '../../lib/zoning/atPin';
import { LEVEL_NOTE, lotClash, sideWait, type Tag } from './levelWords';

export const mapKeyOf = (tag: Tag) => (tag === 'A' ? 'compare-a' : 'compare-b');

/** Parcel | Tract | ZIP code for both sides, in the Place tab's look, with one line on what the level reads. */
export function CompareLevelSwitch() {
  const level = useCompare((s) => s.level);
  const [ref, box] = useSlide(level);
  return (
    <div className="mb-3">
      <div ref={ref} role="radiogroup" aria-label="Level" data-testid="compare-level" className="relative grid grid-cols-3 gap-0.5 rounded-lg bg-stone-100 p-0.5">
        <SlideBg box={box} className="rounded-md bg-white shadow-sm ring-1 ring-stone-200" />
        {LEVELS.map((o) => {
          const on = o.id === level;
          return (
            <button key={o.id} type="button" role="radio" aria-checked={on} data-slide-on={on} title={o.line} onClick={() => setCompareLevel(o.id)} className={cx('relative rounded-md px-1.5 py-1 text-small font-medium transition-colors', on ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900')}>
              {o.label}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-caption leading-snug text-slate-600">{LEVEL_NOTE[level]}</p>
    </div>
  );
}

/** Put a lot on a side: into that side's settings, its tract becoming the side's place. Returns why not, or null. */
export function pickSideLot(tag: Tag, lot: SiteLot): string | null {
  const g = tractAt(lot.point[0], lot.point[1]);
  if (!g) return 'That lot is outside the city’s tracts.';
  const { selectedId, compareId, set } = useApp.getState();
  const { separate } = useCompare.getState();
  const clash = lotClash(tag, g, selectedId, compareId, separate);
  if (clash) return clash;
  pickLot(lot, { side: tag === 'B' && separate ? SIDE_B : SIDE_A });
  set(tag === 'A' ? { selectedId: g } : { compareId: g });
  return null;
}

/** A side's lots on its map at the Parcel level; a click picks one (`onNote` hears why a lot cannot go on the side). */
export function useSideLots(tag: Tag, on: boolean, lot: SiteLot | undefined, onNote: (tag: Tag, note: string | null) => void) {
  const onPick = useCallback(
    (chunk: string, row: number) => {
      void lotByRow(chunk, row).then((l) => l && onNote(tag, pickSideLot(tag, l)));
    },
    [tag, onNote],
  );
  const picked = useMemo(() => (lot ? { chunk: lot.chunk, row: lot.row } : null), [lot]);
  return usePlaceLots(on, picked, onPick, mapKeyOf(tag));
}

// ------------------------------------------------------------------------------------------------ ZIP code outlines

type FC = OverlayLayer['data'];
type Geom = FC['features'][number]['geometry'];
let zipFc: FC | null = null;
let tractFc: FC | null = null;
const zipFC = (): FC =>
  (zipFc ??= {
    type: 'FeatureCollection',
    features: bundledGeo('zcta').features.map((f) => ({ type: 'Feature' as const, geometry: f.geometry as Geom, properties: { GEOID: f.properties.GEOID, label: zipById.get(f.properties.GEOID)?.edge ? `${f.properties.GEOID} (city part)` : f.properties.GEOID } })),
  });
const tractFC = (): FC => (tractFc ??= { type: 'FeatureCollection', features: tractsFC.features.map((f) => ({ type: 'Feature' as const, geometry: f.geometry as unknown as Geom, properties: { GEOID: f.properties.GEOID } })) });
const ZIP_LINE: OverlayLayer['line'] = {
  color: '#334155',
  width: ['interpolate', ['linear'], ['zoom'], 10, 1.7, 13, 2.4, 15, 3] as unknown as number,
  opacity: 0.95,
  casing: { color: '#ffffff', width: ['interpolate', ['linear'], ['zoom'], 10, 3.6, 15, 5.2] as unknown as number, opacity: 0.8 },
  label: { field: 'label', minzoom: 11, color: '#1e293b', size: 11 },
};
const PICKABLE = new Set(placeZips);

/** A side's map at the ZIP level: its tracts in the side's colors under the ZIP outlines; a click picks a ZIP that has
 *  city tracts mainly in it. */
export function useZipLayers(on: boolean, zip: string | null, paint: MapPaint, onPick: (zip: string) => void): OverlayLayer[] | undefined {
  return useMemo(() => {
    if (!on) return undefined;
    return [
      { id: 'cmp-tracts', data: tractFC(), idField: 'GEOID', fill: { paint }, line: { color: '#ffffff', width: 0.6, opacity: 0.7 } },
      {
        id: 'cmp-zip',
        data: zipFC(),
        idField: 'GEOID',
        line: ZIP_LINE,
        interactive: true,
        zoomTo: false,
        selectedId: zip,
        onSelect: (id) => PICKABLE.has(id) && onPick(id),
        tooltip: (id) => {
          const n = zipTracts(id).main.length;
          return (
            <div className="max-w-64">
              <div className="font-semibold">{zipName(id)}</div>
              <div className="text-caption text-white/75">{zipCoverage(id)}</div>
              <div className="mt-1">{n && PICKABLE.has(id) ? `${n} city ${n === 1 ? 'tract' : 'tracts'} mainly here · click to pick` : 'No city tract mainly here'}</div>
            </div>
          );
        },
      },
    ];
  }, [on, zip, paint, onPick]);
}

// ---------------------------------------------------------------------------------------------- moving the maps

const PAD = { top: 50, bottom: 50, left: 40, right: 40 };

/** A side's place now: its tract and the lot picked there (in the settings it reads). */
function placeOf(tag: Tag): { g: string | null; lot: SiteLot | undefined } {
  const { selectedId, compareId } = useApp.getState();
  const g = tag === 'A' ? selectedId : compareId;
  const side = tag === 'B' && useCompare.getState().separate ? SIDE_B : SIDE_A;
  return { g, lot: g ? side.project.getState().sites[g]?.lot : undefined };
}

/** Move a side's map for a level: the city for ZIP codes; for Parcel, close in on a point, its lot or its tract so
 *  lots show. At the Tract level the map flies to the side's tract by itself. */
function frameSide(map: MLMap, tag: Tag, level: PlaceArea, at?: [number, number]) {
  if (level === 'zip') {
    const el = map.getContainer();
    const v = cityView(el.clientWidth, el.clientHeight, PAD);
    if (v) map.easeTo({ ...v, duration: 900 });
    return;
  }
  if (level !== 'parcel') return;
  const { g, lot } = placeOf(tag);
  const b = g ? tractBounds.get(g) : undefined;
  const point = at ?? lot?.point;
  if (point) map.easeTo({ center: point, zoom: Math.max(map.getZoom(), PARCEL_ZOOM + 0.6), duration: 900 });
  else if (b) map.easeTo({ center: [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2], zoom: Math.max(map.getZoom(), PARCEL_ZOOM), duration: 900 });
}

/** Move both maps for a level, now or, for a map still being made, once it has drawn. Returns a stop function. */
export function frameBoth(level: PlaceArea): () => void {
  const stops = (['A', 'B'] as const).map((tag) => {
    let done = false;
    return onMap(mapKeyOf(tag), (m) => {
      if (done) return;
      done = true;
      const go = () => frameSide(m, tag, level);
      if (m.isStyleLoaded()) go();
      else m.once('idle', go);
    });
  });
  return () => stops.forEach((s) => s());
}

/** A place searched at the Parcel level: an address picks the lot under it (as on the Place tab), a neighborhood
 *  brings its lots into view. The search has already made the tract the side's place. */
export function searchAtParcel(tag: Tag, geoid: string, onNote: (tag: Tag, note: string | null) => void) {
  const pin = useApp.getState().pin;
  const at: [number, number] | undefined = pin && tractAt(pin.lng, pin.lat) === geoid ? [pin.lng, pin.lat] : undefined;
  const map = getMap(mapKeyOf(tag));
  if (map) frameSide(map, tag, 'parcel', at);
  onNote(tag, null);
  if (at) void lotAt(at[0], at[1]).then((l) => l && onNote(tag, pickSideLot(tag, { ...l, point: at })));
}

const NOTE = 'rounded-lg bg-amber-50 px-2.5 py-1.5 text-small leading-snug text-amber-900 ring-1 ring-amber-200';

/** A side's lot at the Parcel level, in its strip: the lot and its zoning (folded), or what to do to pick one. */
export function SideLot({ tag, lot, note }: { tag: Tag; lot: SiteLot | undefined; note: string | null }) {
  return (
    <>
      {note && (
        <p className={NOTE} role="status">
          {note}
        </p>
      )}
      {lot ? <LotZoning key={`${lot.chunk}:${lot.row}`} lot={lot} izo={inIzoAt(lot.point[0], lot.point[1])} fold /> : !note && <p className={NOTE}>{sideWait('parcel', tag)} Zoom in until the lots show, or search an address.</p>}
    </>
  );
}

/** The key under a map at the Parcel level. */
export function LotLegendBar({ zoomOk }: { zoomOk: boolean }) {
  const swatch = (bg: string, line: string) => <span className="inline-block h-3 w-4 shrink-0 rounded-sm" style={{ background: bg, boxShadow: `inset 0 0 0 1.5px ${line}` }} />;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-white px-3 py-2 text-caption text-slate-700 ring-1 ring-stone-200/80" data-lot-legend>
      <span className="font-semibold text-slate-900">County lots</span>
      <span className="inline-flex items-center gap-1.5">{swatch('#ffffff', '#94a3b8')}Lot</span>
      <span className="inline-flex items-center gap-1.5">{swatch('rgba(245,158,11,0.35)', '#94a3b8')}Vacant</span>
      <span className="inline-flex items-center gap-1.5">{swatch('#ffffff', '#7c3aed')}Picked</span>
      {!zoomOk && <span className="text-slate-500">Zoom in to see lots</span>}
    </div>
  );
}
