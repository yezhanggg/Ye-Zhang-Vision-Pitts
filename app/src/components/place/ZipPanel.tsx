// Analysis > Place at ZIP level: the Tracts | ZIPs switch, the map layers (ZIP outlines over the tracts' suggestion
// colors, a veil outside the city) and the right panel (a short ZIP profile, then the city tracts whose main ZIP it
// is, each with its suggested type; a click opens the tract). Suggestions stay per tract: nothing here is a ZIP
// suggestion. Data: lib/equity/zip (read-only) and lib/place/zipView.
import { useMemo, type ReactNode } from 'react';
import { tractById, tractLabel, tractsFC, typologyById } from '../../lib/data';
import { useApp } from '../../lib/store';
import type { MapPaint } from '../../lib/paint';
import { cx } from '../../lib/format';
import { bundledGeo, CITY_GEOID } from '../../lib/explore/catalog';
import { fits2br } from '../../lib/equity/measures';
import { zipById, zipCoverage, zipName } from '../../lib/equity/zip';
import { fmtDollars, fmtHouseholds, fmtMiles, isNum } from '../../lib/place/format';
import { LEVEL_LABEL, amiOf, type PlanLevel } from '../../lib/place/plan';
import type { Recommendation } from '../../lib/place/recommend';
import type { HudTable } from '../../lib/place/types';
import { ZIP_SUGGEST_NOTE, hasPlaceZips, mainZipOf, placeZips, useZipView, zipExtra, zipLevelKey, zipTracts, type PlaceArea } from '../../lib/place/zipView';
import { spotlightRings, type OverlayLayer } from '../MapView';
import { getMap } from '../../lib/export/mapRegistry';
import { cityView } from '../../lib/analysis/framing';
import { Dot, InfoTip, SlideBg, useSlide } from '../primitives';

type FC = OverlayLayer['data'];
type Geom = FC['features'][number]['geometry'];
const zipLabelOf = (id: string) => (zipById.get(id)?.edge ? `${id} (city part)` : id);
const ZIP_FC: FC = (() => {
  const fc = bundledGeo('zcta');
  return { type: 'FeatureCollection', features: fc.features.map((f) => ({ type: 'Feature' as const, geometry: f.geometry as Geom, properties: { GEOID: f.properties.GEOID, label: zipLabelOf(f.properties.GEOID) } })) };
})();
const TRACT_FC: FC = { type: 'FeatureCollection', features: tractsFC.features.map((f) => ({ type: 'Feature' as const, geometry: f.geometry as unknown as Geom, properties: { GEOID: f.properties.GEOID } })) };
const CITY_VEIL: FC | null = (() => {
  const g = bundledGeo('city').features.find((f) => f.properties.GEOID === CITY_GEOID)?.geometry as { type: string; coordinates: unknown } | undefined;
  if (!g) return null;
  const polys = g.type === 'Polygon' ? [g.coordinates as number[][][]] : g.type === 'MultiPolygon' ? (g.coordinates as number[][][][]) : [];
  const enclaves = polys.flatMap((p) => p.slice(1).map((r) => [r]));
  return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { GEOID: 'veil' }, geometry: { type: 'MultiPolygon', coordinates: [spotlightRings(g), ...enclaves] } as Geom }] };
})();
const CITY_FC = bundledGeo('city') as unknown as FC;
const ZIP_LINE: OverlayLayer['line'] = {
  color: '#334155',
  width: ['interpolate', ['linear'], ['zoom'], 10, 1.7, 13, 2.4, 15, 3] as unknown as number,
  opacity: 0.95,
  casing: { color: '#ffffff', width: ['interpolate', ['linear'], ['zoom'], 10, 3.6, 15, 5.2] as unknown as number, opacity: 0.8 },
  label: { field: 'label', minzoom: 11, color: '#1e293b', size: 11 },
};

/** Tracts | ZIPs, short labels, in the planning inputs' look. */
export function AreaSwitch() {
  const area = useZipView((s) => s.area);
  const [ref, box] = useSlide(area);
  if (!hasPlaceZips) return null;
  const pick = (a: PlaceArea) => {
    if (a === area) return;
    const sel = useApp.getState().selectedId;
    // Into ZIPs with a tract open: open its main ZIP.
    useZipView.getState().set(a === 'zip' ? { area: a, zip: (sel && mainZipOf.get(sel)) || useZipView.getState().zip } : { area: a });
    // Into ZIPs: frame the whole city, so every ZIP is in view.
    const map = a === 'zip' ? getMap('place') : null;
    const el = map?.getContainer();
    const ui = useApp.getState().ui;
    const v = el ? cityView(el.clientWidth, el.clientHeight, { top: 90, bottom: 90, left: ui.left ? 420 : 70, right: ui.right ? 500 : 70 }) : null;
    if (map && v) map.easeTo({ ...v, duration: 900 });
  };
  const opts: { v: PlaceArea; label: string; title: string }[] = [
    { v: 'tract', label: 'Tracts', title: 'Census tracts: the level every suggestion is made at' },
    { v: 'zip', label: 'ZIPs', title: 'ZIP codes: a short profile and the tracts inside each' },
  ];
  return (
    <div className="flex items-center gap-1.5 px-0.5">
      <div ref={ref} role="radiogroup" aria-label="Areas to show" data-testid="place-area" className="relative grid flex-1 grid-cols-2 gap-0.5 rounded-lg bg-stone-100 p-0.5">
        <SlideBg box={box} className="rounded-md bg-white shadow-sm ring-1 ring-stone-200" />
        {opts.map((o) => {
          const on = o.v === area;
          return (
            <button key={o.v} type="button" role="radio" aria-checked={on} data-slide-on={on} title={o.title} onClick={() => pick(o.v)} className={cx('relative rounded-md px-1.5 py-1 text-small font-medium transition-colors', on ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900')}>
              {o.label}
            </button>
          );
        })}
      </div>
      <InfoTip label="About ZIPs" side="bottom" align="end" width={250}>
        {ZIP_SUGGEST_NOTE} ZIP figures add up the city's tracts, weighted by 2020 housing units; edge ZIPs cover only their city part.
      </InfoTip>
    </div>
  );
}

/** The map layers at ZIP level: the tracts' suggestion colors, ZIP outlines (click to select), the veil and the city line. */
export function useZipOverlays(on: boolean, paint: MapPaint): OverlayLayer[] | undefined {
  const zip = useZipView((s) => s.zip);
  return useMemo(() => {
    if (!on) return undefined;
    const out: OverlayLayer[] = [
      { id: 'pl-tracts', data: TRACT_FC, idField: 'GEOID', fill: { paint }, line: { color: '#ffffff', width: 0.6, opacity: 0.7 } },
      {
        id: 'pl-zip',
        data: ZIP_FC,
        idField: 'GEOID',
        line: ZIP_LINE,
        interactive: true,
        zoomTo: false,
        selectedId: zip,
        onSelect: (id) => useZipView.getState().set({ zip: useZipView.getState().zip === id ? null : id }),
        tooltip: (id) => {
          const n = zipTracts(id).main.length;
          return (
            <div className="max-w-64">
              <div className="font-semibold">{zipName(id)}</div>
              <div className="text-caption text-white/75">{zipCoverage(id)}</div>
              <div className="mt-1">{n ? `${n} city ${n === 1 ? 'tract' : 'tracts'} mainly here · click to list` : 'No city tract mainly here'}</div>
            </div>
          );
        },
      },
    ];
    if (CITY_VEIL) out.push({ id: 'pl-city-veil', data: CITY_VEIL, idField: 'GEOID', fill: { color: '#f8f7f4', opacity: 0.78 }, line: { color: '#0f172a', width: 0, opacity: 0 } });
    out.push({ id: 'pl-city-line', data: CITY_FC, idField: 'GEOID', line: { color: '#1e293b', width: 1.8, opacity: 0.9, casing: { color: '#ffffff', width: 4, opacity: 0.8 } } });
    return out;
  }, [on, paint, zip]);
}

function Fact({ k, children, info }: { k: string; children: ReactNode; info?: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5">
      <dt className="w-24 shrink-0 text-caption font-semibold uppercase tracking-wide text-slate-500">{k}</dt>
      <dd className="min-w-0 flex-1 text-small text-slate-800 tnum">{children}</dd>
      {info && (
        <InfoTip label={`About ${k.toLowerCase()}`} width={240} align="end">
          {info}
        </InfoTip>
      )}
    </div>
  );
}
const B = ({ children }: { children: ReactNode }) => <b className="font-semibold text-slate-900">{children}</b>;

/** No ZIP picked yet: one line and every ZIP with city tracts, by code. */
function ZipStart() {
  const set = useZipView((s) => s.set);
  const top = useMemo(() => [...placeZips].sort(), []);
  return (
    <div className="space-y-3 p-5">
      <div className="text-small font-semibold text-violet-700">ZIP codes</div>
      <p className="font-display text-lead font-semibold leading-snug text-slate-900">Pick a ZIP on the map or below.</p>
      <p className="text-small leading-snug text-slate-600">{ZIP_SUGGEST_NOTE}</p>
      <div className="flex flex-wrap gap-1.5">
        {top.map((z) => (
          <button key={z} onClick={() => set({ zip: z })} className="rounded-full bg-white px-2.5 py-0.5 text-small font-medium text-slate-800 ring-1 ring-stone-300 tnum hover:bg-violet-50 hover:text-violet-800 hover:ring-violet-200">
            {zipLabelOf(z)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The right panel at ZIP level. `suggestions` are the tract suggestions the map shows (same plan inputs). */
export default function ZipPanel({ suggestions, hud, level }: { suggestions: Map<string, Recommendation>; hud: HudTable | null; level: PlanLevel }) {
  const zip = useZipView((s) => s.zip);
  const set = useZipView((s) => s.set);
  const r = zip ? zipById.get(zip) : undefined;
  if (!zip || !r) return <ZipStart />;
  const key = zipLevelKey(level);
  const renters = zipExtra.get(zip)?.renters[key] ?? null;
  const burdened = r.burdened[key] ?? null;
  const market = level === 'market';
  const fits = market ? null : fits2br(hud, amiOf(level))?.rent ?? null;
  const gap = r.asking != null && isNum(fits) ? r.asking - fits : null;
  const { main, partly } = zipTracts(zip);
  const levelWord = market ? 'above 80% AMI' : LEVEL_LABEL[level];
  const open = (t: string) => {
    set({ area: 'tract' });
    useApp.getState().select(t);
  };
  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-stone-100 bg-white/95 px-5 pb-3 pt-4 backdrop-blur">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate font-display text-title font-bold text-slate-900">{zipName(zip)}</h2>
            <div className="text-small text-slate-600 tnum">{zipCoverage(zip)}</div>
          </div>
          <button onClick={() => set({ zip: null })} className="rounded-lg p-1.5 text-slate-500 hover:bg-stone-100 hover:text-slate-900" aria-label="Clear ZIP">
            <svg viewBox="0 0 20 20" className="h-4 w-4">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      <div className="space-y-3 p-5">
        <dl className="divide-y divide-stone-100 rounded-2xl bg-white py-0.5 ring-1 ring-stone-200" data-testid="zip-profile">
          <Fact k="Renters" info={`Renter households ${levelWord} (HUD CHAS), summed over the city tracts by their share of homes in the ZIP.`}>
            <B>{renters != null ? fmtHouseholds(renters) : 'n/a'}</B> {levelWord}
          </Fact>
          <Fact k="Burdened" info="Of them, paying more than 30% of income for housing (HUD CHAS), weighted the same way.">
            <B>{burdened != null ? fmtHouseholds(burdened) : 'n/a'}</B> pay over 30%
          </Fact>
          <Fact k="Rent gap" info={market ? "The ZIP's median 2-bedroom asking rent (2025–26 listings, the whole ZIP). At market rate there is no gap." : `The ZIP's median 2-bedroom asking rent (2025–26 listings, the whole ZIP) minus the ${isNum(fits) ? fmtDollars(fits) : ''} a 3-person household ${levelWord} can pay for a 2-bedroom.`}>
            {r.asking == null ? 'asking rent not available' : market || gap == null ? (
              <>
                asks <B>{fmtDollars(r.asking)}</B>
              </>
            ) : gap > 0 ? (
              <>
                asks <B>{fmtDollars(r.asking)}</B> · gap <B>{fmtDollars(gap)}/mo</B>
              </>
            ) : (
              <>
                asks <B>{fmtDollars(r.asking)}</B> · <B>{fmtDollars(-gap)}</B> under
              </>
            )}
          </Fact>
          <Fact k="Transit" info="Average straight-line distance from homes to the nearest frequent stop (a bus or T every 15 minutes or better), weighted by housing units.">
            <B>{r.transit != null ? fmtMiles(r.transit) : 'n/a'}</B> to frequent transit
          </Fact>
          <Fact k="Jobs · services" info="Jobs within 1 mile (LODES) and services (grocery, health, pharmacy, library) within ½ mile, housing-unit-weighted averages.">
            <B>{r.jobs != null ? fmtHouseholds(r.jobs) : 'n/a'}</B> jobs · <B>{r.services != null ? r.services.toFixed(1) : 'n/a'}</B> services
          </Fact>
          <Fact k="In the city" info="Share of the ZIP's 2020 homes in the city's residential tracts. Under half: an edge ZIP, whose figures cover only its city part.">
            <B>{Math.round(r.share * 100)}%</B> of its homes{r.edge ? ' · city part only' : ''}
          </Fact>
        </dl>
        <div>
          <div className="mb-1 flex items-center gap-1 text-small font-semibold text-slate-700">
            Tracts in this ZIP
            <InfoTip label="About tracts in this ZIP" side="bottom" align="start" width={250}>
              {ZIP_SUGGEST_NOTE} Listed: the city tracts with most of their 2020 homes in this ZIP, with the type suggested for each under your focus and inputs.
            </InfoTip>
          </div>
          <p className="mb-2 text-caption leading-snug text-slate-600">{ZIP_SUGGEST_NOTE}</p>
          {main.length === 0 ? (
            <p className="text-small text-slate-600">No city tract has most of its homes in this ZIP.</p>
          ) : (
            <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200" data-testid="zip-tracts">
              {main.map((id) => {
                const t = tractById.get(id);
                const lead = suggestions.get(id)?.types[0]?.typology ?? null;
                const ty = lead ? typologyById.get(lead) : null;
                return (
                  <li key={id}>
                    <button type="button" onClick={() => open(id)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-violet-50">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-small font-semibold text-slate-900">{tractLabel(t)}</span>
                        <span className="block text-caption text-slate-500">{t?.name ?? id}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5 text-small text-slate-700">
                        {ty ? (
                          <>
                            <Dot color={ty.color} size={9} />
                            {ty.label}
                          </>
                        ) : (
                          <span className="text-slate-500">No suggestion</span>
                        )}
                        <span aria-hidden className="text-slate-400">›</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {partly.length > 0 && (
            <p className="mt-2 text-caption leading-snug text-slate-500">
              {partly.length} more {partly.length === 1 ? 'tract has' : 'tracts have'} some homes here but most in another ZIP: {partly.map((id) => tractLabel(tractById.get(id))).filter((v, i, a) => a.indexOf(v) === i).join(', ')}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
