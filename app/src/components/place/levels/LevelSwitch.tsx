// Parcel | Tract | ZIP code at the top of the Place tab's left panel, with one line saying what the level answers.
// Switching keeps the place: into Parcel the map closes in on the tract (or the pin) so lots show; into ZIP code the
// tract's main ZIP opens and the whole city comes into view, as the older Tracts | ZIPs switch did.
// Online only: loaded on demand; the offline file keeps AreaSwitch (place/ZipPanel).
import { cityView } from '../../../lib/analysis/framing';
import { tractBounds } from '../../../lib/data';
import { getMap } from '../../../lib/export/mapRegistry';
import { dropLotSuggestion } from '../../../lib/project/draft';
import { SIDE_A } from '../../../lib/project/side';
import { cx } from '../../../lib/format';
import { mainZipOf, useZipView } from '../../../lib/place/zipView';
import { useApp } from '../../../lib/store';
import { SlideBg, useSlide } from '../../primitives';
import { LEVELS, type Level } from './levels';

/** The zoom the map closes in to at the Parcel level, past the lots' own minimum. */
export const PARCEL_ZOOM = 15.6;

/** Move the map for a level: the city for ZIP codes, the tract or the pin for Parcel. */
export function frameLevel(level: Level) {
  const map = getMap('place');
  if (!map) return;
  const { selectedId, pin, ui } = useApp.getState();
  if (level === 'zip') {
    const el = map.getContainer();
    const v = cityView(el.clientWidth, el.clientHeight, { top: 90, bottom: 90, left: ui.left ? 470 : 70, right: ui.right ? 500 : 70 });
    if (v) map.easeTo({ ...v, duration: 900 });
    return;
  }
  if (level !== 'parcel') return;
  const pad = { top: 90, bottom: 90, left: ui.left ? 470 : 60, right: ui.right ? 500 : 60 };
  if (pin) map.easeTo({ center: [pin.lng, pin.lat], zoom: Math.max(map.getZoom(), PARCEL_ZOOM + 0.6), padding: pad, duration: 900 });
  else if (selectedId && tractBounds.get(selectedId)) {
    const b = tractBounds.get(selectedId)!;
    map.easeTo({ center: [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2], zoom: Math.max(map.getZoom(), PARCEL_ZOOM), padding: pad, duration: 900 });
  } else map.easeTo({ zoom: Math.max(map.getZoom(), PARCEL_ZOOM), duration: 900 });
}

export function setLevel(level: Level) {
  const z = useZipView.getState();
  if (level === z.area) return;
  const sel = useApp.getState().selectedId;
  if (z.area === 'parcel') dropLotSuggestion(SIDE_A);
  z.set(level === 'zip' ? { area: level, zip: (sel && mainZipOf.get(sel)) || z.zip } : { area: level });
  frameLevel(level);
}

export default function LevelSwitch() {
  const level = useZipView((s) => s.area);
  const [ref, box] = useSlide(level);
  return (
    <div>
      <div ref={ref} role="radiogroup" aria-label="Level" data-testid="place-level" className="relative grid grid-cols-3 gap-0.5 rounded-lg bg-stone-100 p-0.5">
        <SlideBg box={box} className="rounded-md bg-white shadow-sm ring-1 ring-stone-200" />
        {LEVELS.map((o) => {
          const on = o.id === level;
          return (
            <button key={o.id} type="button" role="radio" aria-checked={on} data-slide-on={on} title={o.line} onClick={() => setLevel(o.id)} className={cx('relative rounded-md px-1.5 py-1 text-small font-medium transition-colors', on ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900')}>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
