// Right panel when nothing is selected and no variable is painted: the city (or county) at a glance, with the
// same charts the place summary uses, the watch list and best-match counts from the matchmaker, and what to click.
import { useMemo, useState } from 'react';
import { askingRents, meta, rankedTracts, scoring } from '../../lib/data';
import { topCounts, useAllResults } from '../../lib/derived';
import { matchPreset, useApp } from '../../lib/store';
import { CITY_GEOID, COUNTY_GEOID, bundledValues, hasHistoryFor, historyFor, reference, unitValues, variableById } from '../../lib/explore/catalog';
import { fmtMoe, fmtValue, reliability } from '../../lib/explore/bins';
import { RELIABILITY } from '../../lib/explore/catalog';
import { EXPLORE_UI } from '../../lib/explore/copy';
import { remoteConfigured } from '../../lib/explore/remote';
import { composition } from '../../lib/explore/summary';
import type { Estimate } from '../../lib/explore/types';
import { fmtInt } from '../../lib/format';
import { BarCompare, Donut, LineChart, PARTS, SERIES, StackedBar, StatTile, fmtK } from '../charts';
import { Button, Explainer, Segmented } from '../primitives';

const C = EXPLORE_UI.charts;
const TILES = ['pop', 'households', 'med_hh_income', 'med_gross_rent', 'renter_share', 'rent_burden30_share'] as const;
const STRUCTURE = [
  ['sfd_share', 'Single-family'],
  ['units_2_4_share', '2–4 units'],
  ['units_5_19_share', '5–19 units'],
  ['units_20plus_share', '20+ units'],
] as const;
const est = (e: Estimate | null | undefined) => (e && typeof e.est === 'number' && Number.isFinite(e.est) ? e.est : null);

function Section({ title, sub, children, open = true }: { title: string; sub?: string; children: React.ReactNode; open?: boolean }) {
  return (
    <Explainer tone="card" defaultOpen={open} title={<span><span className="block">{title}</span>{sub && <span className="block text-caption font-normal text-slate-600">{sub}</span>}</span>}>
      <div className="pt-1">{children}</div>
    </Explainer>
  );
}

function RefLine({ varId, label }: { varId: string; label: string }) {
  const v = variableById.get(varId);
  const city = historyFor('city', CITY_GEOID, varId);
  const county = historyFor('county', COUNTY_GEOID, varId);
  if (!v || !city || !county) return null;
  const fmt = (x: number) => (v.unit === 'usd' ? `$${fmtK(x)}` : fmtValue(x, v.unit));
  return (
    <div>
      <div className="mb-1 text-small font-semibold text-slate-900">{label}</div>
      <LineChart years={city.years} series={[{ id: 'city', label: C.city, color: SERIES.city, values: city.est, moe: city.moe }, { id: 'county', label: C.county, color: SERIES.county, values: county.est }]} fmt={fmt} caption={C.acsWindows} />
    </div>
  );
}

export default function ScopeOverview() {
  const [scope, setScope] = useState<'city' | 'county'>('city');
  const setMode = useApp((s) => s.setMode);
  const set = useApp((s) => s.set);
  const weights = useApp((s) => s.weights);
  const results = useAllResults(weights);
  const counts = useMemo(() => topCounts(results), [results]);
  const n = results.size;
  const preset = scoring.presets.find((p) => p.id === matchPreset(weights))?.label ?? 'custom mix';
  const watch = rankedTracts.filter((t) => t.watch_list);
  const unit = unitValues(bundledValues(scope), scope === 'city' ? CITY_GEOID : COUNTY_GEOID);
  const other = unitValues(bundledValues(scope === 'city' ? 'county' : 'city'), scope === 'city' ? COUNTY_GEOID : CITY_GEOID);
  const renter = est(unit?.renter_share);
  const years = Object.keys(askingRents.city ?? {}).map(Number).sort();
  const rentSeries = years.length
    ? [
        { id: 'city', label: C.city, color: SERIES.city, values: years.map((y) => askingRents.city?.[String(y)]?.median_2br ?? null) },
        { id: 'county', label: C.county, color: SERIES.county, values: years.map((y) => askingRents.county?.[String(y)]?.median_2br ?? null) },
      ]
    : null;
  const structureRows = [
    { label: scope === 'city' ? 'City' : 'County', values: composition(unit, STRUCTURE.map((s) => s[0])).map((p) => p.value) },
    { label: scope === 'city' ? 'County' : 'City', values: composition(other, STRUCTURE.map((s) => s[0])).map((p) => p.value) },
  ];
  return (
    <div className="space-y-3 p-4">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-small font-semibold text-violet-700">{EXPLORE_UI.intro.kicker}</div>
            <h2 className="mt-0.5 font-display text-title font-bold text-slate-900">{scope === 'city' ? 'The City of Pittsburgh at a glance' : 'Allegheny County at a glance'}</h2>
          </div>
          <Segmented value={scope} onChange={setScope} size="xs" options={[{ value: 'city', label: 'City' }, { value: 'county', label: 'County' }]} />
        </div>
        <p className="mt-1 text-caption text-slate-600">Click a tract, ZIP code or municipality on the map, or pick a variable under Data, and this panel follows.</p>
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-stone-200/70 ring-1 ring-stone-200/70">
        {TILES.map((id) => {
          const v = variableById.get(id);
          const e = unit?.[id];
          if (!v) return null;
          return <StatTile key={id} label={v.label} value={fmtValue(est(e), v.unit)} sub={typeof e?.moe === 'number' ? `± ${fmtMoe(e.moe, v.unit)}` : undefined} conf={reliability(e?.cv, RELIABILITY)} />;
        })}
      </div>
      <Section title={C.tenure} sub={C.source}>
        <Donut parts={[{ label: 'Renters', value: renter, color: SERIES.place }, { label: 'Owners', value: renter == null ? null : 1 - renter, color: PARTS[5] }]} center={renter == null ? '—' : `${Math.round(renter * 100)}%`} sub="rent" />
      </Section>
      <Section title={C.structure} sub="Share of all housing units by units in the building">
        <StackedBar parts={[...STRUCTURE.map(([id, label], i) => ({ id, label, color: PARTS[i] })), { id: 'other', label: 'Other', color: PARTS[5] }]} rows={structureRows} caption={C.source} />
      </Section>
      {hasHistoryFor('med_hh_income') && (
        <Section title={C.incomeRent} sub="ACS 5-year estimates, 2014–2024, city and county">
          <div className="space-y-4">
            <RefLine varId="med_hh_income" label="Median household income" />
            <RefLine varId="med_gross_rent" label="Median gross rent" />
          </div>
        </Section>
      )}
      <Section title={C.burden} sub="Renter households paying 30% or more of income on rent">
        <BarCompare rows={[{ label: 'City', value: est(reference('rent_burden30_share').city), color: SERIES.city }, { label: 'County', value: est(reference('rent_burden30_share').county), color: SERIES.county }]} fmt={(v) => fmtValue(v, 'share')} max={1} />
      </Section>
      {rentSeries && (
        <Section title={C.rents} sub="Licensed listing data, information only">
          <LineChart years={years} series={rentSeries} fmt={(v) => `$${fmtK(v)}`} caption={C.rentSeries} />
        </Section>
      )}
      <Section title={C.analysis} sub={`Across the ${n} ranked city tracts, under ${preset}`}>
        <button onClick={() => set({ browse: { level: 'tract', variable: 'an_watch_list', selected: null }, layers: { ...useApp.getState().layers, tracts: true } })} className="block w-full rounded-xl bg-rose-50 px-3 py-2 text-left ring-1 ring-rose-200 hover:bg-rose-100/70">
          <div className="text-small font-semibold text-rose-900">
            Watch list: <span className="tnum">{watch.length}</span> tracts with high need and a rising market
          </div>
          <div className="text-caption text-rose-800">About {fmtInt(watch.reduce((s, t) => s + (t.need_count ?? 0), 0))} renter households at ≤50% AMI live in them. Show on the map →</div>
        </button>
        <div className="mt-3 space-y-1.5">
          {scoring.typologies.map((t) => {
            const c = counts[t.id] ?? 0;
            return (
              <div key={t.id} className="flex items-center gap-2 text-small">
                <span className="w-28 shrink-0 truncate text-slate-800">{t.label}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full" style={{ background: t.color, width: `${n ? (c / n) * 100 : 0}%` }} />
                </div>
                <span className="w-8 text-right font-semibold text-slate-900 tnum">{c}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-caption text-slate-600">Best match per tract under the current priorities; {meta.n_tracts ?? 0} city tracts in all, {(meta.n_tracts ?? 0) - n} not ranked. Paint these as layers under Data → Match.</p>
        <Button className="mt-3 w-full" onClick={() => setMode('match')}>
          {EXPLORE_UI.intro.analysis}
        </Button>
      </Section>
      <p className="text-caption text-slate-600">
        {EXPLORE_UI.footer}
        {remoteConfigured() ? ' · county-wide values load online, the city subset and every municipality are built in' : ' · city subset and every municipality built in'} ·{' '}
        <button onClick={() => set({ sourcesOpen: true })} className="font-semibold text-violet-700 hover:underline">
          {EXPLORE_UI.sourcesLink}
        </button>
      </p>
    </div>
  );
}
