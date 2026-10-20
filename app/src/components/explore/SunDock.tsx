// The sun-and-shadow control: season, play, time, a dial showing where the sun is, the hours-of-sun view, and the
// By parcel view (lots colored by their share of the day in shadow, where this copy of the site has the lot files).
// Loaded only when the switch is turned on (it brings the layers' code with it), and never part of the offline single file.
import type { CSSProperties } from 'react';
import { Pause, Play, X } from 'lucide-react';
import { Segmented } from '../primitives';
import { useParcelShadow } from '../../lib/explore/parcelShadowStore';
import { HOURS_RAMP, SEASONS as SEASON, clockLabel, compassWord, dialPoint, interpSun, type ShadowDay, type ShadowManifest } from '../../lib/explore/sunShadow';
import { setSunShadow, useSunShadow, type SunView } from '../../lib/explore/sunShadowStore';
import { useParcelLayer, useSelectedLot } from '../../lib/explore/useParcelLayer';
import { useSunShadowLayer } from '../../lib/explore/useSunShadowLayer';
import { ParcelLegend, ParcelReadout } from './ParcelCard';

const SUN = '#f59e0b';
const CARD = 'w-[21.5rem] max-w-full rounded-xl bg-white/95 px-3.5 py-3 shadow-lg ring-1 ring-black/5 backdrop-blur';
const VIEWS: { value: SunView; label: string }[] = [
  { value: 'shadow', label: 'By time' },
  { value: 'hours', label: 'Hours of sun' },
];
const PARCEL_VIEW: { value: SunView; label: string } = { value: 'parcel', label: 'By parcel' };

/** A small sky dial: the rim is the horizon, the center is overhead, up is the top of the map. */
function SunDial({ day, az, el, bearing, showSun }: { day: ShadowDay; az: number; el: number; bearing: number; showSun: boolean }) {
  const R = 27;
  const path = day.steps.map((s, i) => {
    const p = dialPoint(s.az, s.el, bearing, R);
    return `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }).join(' ');
  const sun = dialPoint(az, el, bearing, R);
  const north = dialPoint(0, 0, bearing, R + 7);
  // shadows fall away from the sun, longer the lower it is
  const len = 6 + 16 * (1 - Math.min(90, Math.max(0, el)) / 90);
  const a = ((az - bearing + 180) * Math.PI) / 180;
  return (
    <svg viewBox="-38 -38 76 76" className="h-[76px] w-[76px] shrink-0" role="img" aria-label={`Sun ${Math.round(el)} degrees above the horizon, in the ${compassWord(az)}`}>
      <circle r={R} fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
      <circle r={R / 2} fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2 3" />
      <text x={north.x} y={north.y} textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="700" fill="#64748b">N</text>
      <path d={path} fill="none" stroke={SUN} strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {showSun && <line x1="0" y1="0" x2={(len * Math.sin(a)).toFixed(1)} y2={(-len * Math.cos(a)).toFixed(1)} stroke="#0f172a" strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round" />}
      <circle r="2.2" fill="#0f172a" />
      {showSun && (
        <>
          <circle cx={sun.x} cy={sun.y} r="7.5" fill={SUN} fillOpacity="0.25" />
          <circle cx={sun.x} cy={sun.y} r="4.2" fill={SUN} stroke="#ffffff" strokeWidth="1.2" />
        </>
      )}
    </svg>
  );
}

function Header({ note }: { note?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1 text-small font-semibold text-slate-900">Sun and shadow</div>
      {note && <span className="text-caption text-slate-500">{note}</span>}
      <button type="button" onClick={() => setSunShadow(false)} className="grid h-6 w-6 place-items-center rounded-full text-slate-500 hover:bg-stone-100 hover:text-slate-900" aria-label="Turn off sun and shadow" title="Turn off">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Controls({ manifest, lite }: { manifest: ShadowManifest; lite: boolean }) {
  const dayId = useSunShadow((s) => s.day);
  const t = useSunShadow((s) => s.t);
  const playing = useSunShadow((s) => s.playing);
  const view = useSunShadow((s) => s.view);
  const bearing = useSunShadow((s) => s.bearing);
  const loading = useSunShadow((s) => s.loading);
  const day = manifest.days.find((d) => d.id === dayId) ?? manifest.days[0];
  const n = day.steps.length;
  const sun = interpSun(day, t);
  const hours = view === 'hours';
  // By parcel: offered only where the lot files are (they are large and published separately).
  const lots = useParcelLayer(manifest);
  const parcel = view === 'parcel' && !!lots;
  const lotsOn = useParcelShadow((s) => s.active);
  const lotsLoading = useParcelShadow((s) => s.loading);
  const dayAt = Math.max(0, manifest.days.findIndex((d) => d.id === day.id));
  const picked = useSelectedLot(lots, dayAt);
  const busy = loading || (parcel && lotsLoading);
  const maxHours = (n * manifest.stepMinutes) / 60;
  const pct = n > 1 ? (Math.min(t, n - 1) / (n - 1)) * 100 : 0;

  return (
    <div className={CARD} data-sun-ready={busy ? undefined : ''}>
      <Header note={busy ? 'Loading…' : undefined} />
      <div className="mt-2">
        <Segmented full size="xs" label="Season" value={day.id} onChange={(id) => useSunShadow.setState({ day: id, t: Math.min(t, (manifest.days.find((d) => d.id === id)?.steps.length ?? 1) - 1) })} options={manifest.days.map((d) => ({ value: d.id, label: SEASON[d.id]?.name ?? d.label }))} />
        <p className="mt-1 px-0.5 text-caption text-slate-600">{SEASON[day.id]?.note ?? day.label}</p>
      </div>
      {view === 'shadow' && (
        <div className="mt-2 flex items-center gap-2">
          {!lite && (
            <button type="button" onClick={() => useSunShadow.setState({ playing: !playing, t: !playing && t >= n - 1 ? 0 : t })} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-900 text-white hover:bg-slate-700" aria-label={playing ? 'Pause' : 'Play the day'} title={playing ? 'Pause' : 'Play the day'}>
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 translate-x-px" />}
            </button>
          )}
          <input type="range" className="weight min-w-0 flex-1" min={0} max={n - 1} step={lite ? 1 : 0.01} value={Math.min(t, n - 1)} onChange={(e) => useSunShadow.setState({ t: Number(e.target.value), playing: false })} style={{ '--pct': `${pct}%`, '--fill': SUN } as CSSProperties} aria-label="Time of day" aria-valuetext={clockLabel(sun.min)} />
          <span className="tnum w-[4.6rem] shrink-0 text-right text-small font-semibold text-slate-900">{clockLabel(sun.min)}</span>
        </div>
      )}
      {parcel && lots ? (
        <div className="mt-2">
          <ParcelLegend manifest={lots} day={dayAt} />
          {picked.lot ? (
            <ParcelReadout lot={picked.lot} manifest={lots} day={dayAt} curve={picked.curve} onClose={() => useParcelShadow.setState({ selected: null })} />
          ) : (
            <p className="mt-1.5 text-caption text-slate-800">{lotsOn ? 'Click a lot for its three seasons and its day.' : 'Zoom in to see lots. From this far the map shows hours of sun.'}</p>
          )}
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-3">
          <SunDial day={day} az={sun.az} el={sun.el} bearing={bearing} showSun={view === 'shadow'} />
          {hours ? (
            <div className="min-w-0 flex-1">
              <div className="text-caption text-slate-800">Hours of direct sun between {day.steps[0].label} and {day.steps[n - 1].label}</div>
              <div className="mt-1.5 h-2.5 rounded-full" style={{ background: `linear-gradient(to right, ${HOURS_RAMP.join(', ')})` }} />
              <div className="tnum mt-0.5 flex justify-between text-caption text-slate-600">
                <span>0 h</span>
                <span>{maxHours / 2} h</span>
                <span>{maxHours} h</span>
              </div>
            </div>
          ) : (
            <div className="min-w-0 flex-1 text-caption text-slate-800">
              <div>
                Sun <span className="tnum font-semibold">{Math.round(sun.el)}°</span> above the horizon, in the {compassWord(sun.az)}
              </div>
              <div className="mt-0.5">
                <span className="tnum font-semibold">{Math.round(sun.shade * 100)}%</span> of the city in shadow
              </div>
            </div>
          )}
        </div>
      )}
      <div className="mt-2">
        <Segmented full size="xs" label="View" value={parcel || view !== 'parcel' ? view : 'hours'} onChange={(v) => useSunShadow.setState({ view: v, playing: v === 'shadow' ? playing : false })} options={lots ? [...VIEWS, PARCEL_VIEW] : VIEWS} />
      </div>
      <p className="mt-1.5 text-caption text-slate-600">
        {parcel ? 'Each lot as seen from above: roof, yard and tree tops together. 2015 lidar surface (PASDA), county lots 2026 (WPRDC). Clear sky. Not used in any score.' : '2015 lidar surface (PASDA): buildings, trees and hills as they stood then. Clear sky. Not used in any score.'}
      </p>
    </div>
  );
}

export default function SunDock({ lite }: { lite: boolean }) {
  const manifest = useSunShadowLayer(lite);
  const failed = useSunShadow((s) => s.failed);
  if (failed) {
    return (
      <div className={CARD}>
        <Header />
        <p className="mt-1 text-caption text-slate-600">The shadow data could not be loaded.</p>
      </div>
    );
  }
  if (!manifest) {
    return (
      <div className={CARD}>
        <Header note="Loading…" />
      </div>
    );
  }
  return <Controls manifest={manifest} lite={lite} />;
}
