// Explore's right panel while Parcels is the open boundary (online only): the clicked lot's facts and zoning
// (components/place/levels/LotZoning), the neighborhood it is in, and a way to test a project on it in Place. With no
// lot yet, where to click, and what the Data layers do with lots. While Sun and shadow is on, the lot picked in its By
// parcel view. Lot facts only. Loaded on demand.
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { tractAt, tractById, tractLabel } from '../../lib/data';
import { lotName } from '../../lib/explore/parcelShadow';
import { useParcelShadow } from '../../lib/explore/parcelShadowStore';
import { useSunShadow } from '../../lib/explore/sunShadowStore';
import { loadLotManifest, lotByRow } from '../../lib/parcel/lots';
import type { SiteLot } from '../../lib/project/store';
import { useApp } from '../../lib/store';
import { isPhone } from '../../lib/viewport';
import { inIzoAt } from '../../lib/zoning/atPin';
import { useBrowse } from '../place/levels/browse';
import { setLevel } from '../place/levels/LevelSwitch';
import LotZoning from '../place/levels/LotZoning';

/** Open the lot in Analysis > Place, at the Parcel level, ready to test a project on it. */
function testOn(lot: SiteLot, geoid: string) {
  const a = useApp.getState();
  a.set({ pin: { lng: lot.point[0], lat: lot.point[1], label: lotName(lot.label) } });
  a.select(geoid);
  setLevel('parcel');
  useBrowse.getState().set('test');
  a.setMode('match');
}

/** The lot the panel reads: the one clicked under Parcels, or the one picked in Sun and shadow's By parcel view. */
function useLot(): SiteLot | null {
  const picked = useParcelShadow((s) => s.picked ?? null);
  const sel = useParcelShadow((s) => s.selected);
  const sunOn = useSunShadow((s) => s.on);
  const [sunLot, setSunLot] = useState<SiteLot | null>(null);
  useEffect(() => {
    if (!sunOn || !sel) return setSunLot(null);
    let live = true;
    void lotByRow(sel.chunk, sel.row).then((l) => live && setSunLot(l));
    return () => {
      live = false;
    };
  }, [sunOn, sel]);
  return sunOn ? sunLot : picked;
}

function Waiting() {
  const active = useParcelShadow((s) => s.active);
  const [files, setFiles] = useState<boolean | null>(null);
  useEffect(() => {
    void loadLotManifest().then((m) => setFiles(!!m));
  }, []);
  const where = isPhone() ? 'Lots are not drawn on phones: search an address in Analysis › Place.' : files === false ? 'The lot files are not on this copy of the site.' : active ? 'Click a lot for its facts and zoning.' : 'Zoom in to see the lots.';
  return (
    <div className="space-y-3 p-5" data-parcel-summary="empty">
      <div>
        <div className="text-small font-semibold text-violet-700">Parcels</div>
        <h2 className="font-display text-title font-bold text-slate-900">County lots</h2>
        <p className="mt-1 text-small text-slate-700">{where}</p>
      </div>
      <div className="rounded-2xl bg-white px-4 py-3 text-caption leading-snug text-slate-600 ring-1 ring-stone-200">
        <div className="text-small font-semibold text-slate-900">With the Data layers</div>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>Land-use map: each lot colored by its own use.</li>
          <li>Zoning districts: the district colors show through the lots.</li>
          <li>Sun and shadow: hours of sun by lot.</li>
          <li>Census figures are counted by area, not by lot: open a boundary to map them.</li>
        </ul>
      </div>
    </div>
  );
}

export default function ParcelSummary() {
  const lot = useLot();
  if (!lot) return <Waiting />;
  const geoid = tractAt(lot.point[0], lot.point[1]);
  const t = geoid ? tractById.get(geoid) : null;
  const clear = () => useParcelShadow.setState({ picked: null, selected: null });
  return (
    <div data-parcel-summary="lot">
      <div className="sticky top-0 z-10 border-b border-stone-100 bg-white/95 px-5 pb-3 pt-4 backdrop-blur">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-small font-semibold text-violet-700">Parcel</div>
            <h2 className="truncate font-display text-title font-bold text-slate-900">{lotName(lot.label)}</h2>
            <div className="text-small text-slate-600">{t ? tractLabel(t) : 'Outside the city of Pittsburgh'}</div>
          </div>
          <button type="button" onClick={clear} className="rounded-lg p-1.5 text-slate-500 hover:bg-stone-100 hover:text-slate-900" aria-label="Clear the lot">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="space-y-3 p-5">
        <LotZoning key={`${lot.chunk}:${lot.row}`} lot={lot} izo={inIzoAt(lot.point[0], lot.point[1])} />
        {geoid && (
          <button type="button" onClick={() => testOn(lot, geoid)} className="w-full rounded-lg bg-violet-600 px-2 py-1.5 text-small font-semibold text-white hover:bg-violet-700">
            Test a project on this lot
          </button>
        )}
      </div>
    </div>
  );
}
