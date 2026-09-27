// The "everything about this place" summary and the single-variable detail for the Explore right panel.
// Every number is read from the bundled data or the browser-side scoring engine; charts are the primitives in
// ../charts. Nothing here is scored: it describes.
import { useMemo } from 'react';
import { FMR_2BR, askingRents, scoring, tractById } from '../../lib/data';
import { stabilityFor, tLabel, useAllResults } from '../../lib/derived';
import { matchPreset, useApp, type Level } from '../../lib/store';
import { CITY_GEOID, COUNTY_GEOID, LEVEL_LABEL, RELIABILITY, hasHistoryFor, historyFor, referenceSeries, reference, rentAreaFor, rentAreas, variableById, xwDominant, history } from '../../lib/explore/catalog';
import { estimates, fmtMoe, fmtTick, fmtValue, reliability } from '../../lib/explore/bins';
import { EXPLORE_UI } from '../../lib/explore/copy';
import { analysisConf, fmtAnalysis, isAnalysis } from '../../lib/explore/analysisVars';
import { binOf, change, composition, histogram, rankOf, type Series } from '../../lib/explore/summary';
import type { Estimate, Loaded, Unit, ValueMap, VariableDef } from '../../lib/explore/types';
import { FACTOR_COPY, RENT_CAVEAT, directionWord, factorName, matchText, pctShort, stabilityWords } from '../../lib/copy';
import { fmtSignedPct } from '../../lib/format';
import type { Conf, TractProps } from '../../lib/types';
import { BarCompare, Donut, HistogramChart, LineChart, PARTS, RankBar, SERIES, StackedBar, StatTile, fmtK } from '../charts';
import { Button, ConfChip, Explainer } from '../primitives';

const C = EXPLORE_UI.charts;
const fmtFor = (unit: Unit) => (v: number) => fmtValue(v, unit);
const tickFor = (unit: Unit) => (v: number) => (unit === 'usd' ? `$${fmtK(v)}` : fmtTick(v, unit));

const STRUCTURE = [
  ['sfd_share', 'Single-family'],
  ['units_2_4_share', '2–4 units'],
  ['units_5_19_share', '5–19 units'],
  ['units_20plus_share', '20+ units'],
] as const;
const RACE = [
  ['white_nh_share', 'White'],
  ['black_nh_share', 'Black'],
  ['asian_nh_share', 'Asian'],
  ['hispanic_share', 'Hispanic'],
] as const;
const COMMUTE = [
  ['drive_alone_share', 'Drive alone'],
  ['transit_share', 'Transit'],
  ['walk_share', 'Walk'],
  ['bike_share', 'Bike'],
  ['wfh_share', 'Home'],
] as const;
const BURDEN = [
  ['rent_burden30_share', 'Renters paying 30%+ of income'],
  ['rent_burden50_share', 'Renters paying 50%+'],
  ['owner_burden30_share', 'Owners paying 30%+'],
] as const;
const TILES = ['pop', 'households', 'med_hh_income', 'med_gross_rent', 'med_home_value', 'renter_share'] as const;

const est = (e: Estimate | null | undefined) => (e && typeof e.est === 'number' && Number.isFinite(e.est) ? e.est : null);
const delta = (a: number | null, b: number | null, unit: Unit) => {
  if (a == null || b == null) return null;
  const rel = b === 0 ? (a > 0 ? 1 : 0) : (a - b) / Math.abs(b);
  const dir = rel > 0.02 ? 'up' : rel < -0.02 ? 'down' : 'same';
  return { dir, text: `${dir === 'same' ? 'about the same as' : dir === 'up' ? 'higher than' : 'lower than'} the city (${fmtValue(b, unit)})` } as const;
};

/** Composition rows for this place, the city and the county from a list of share variables. */
function compositionRows(unit: Record<string, Estimate> | null, ids: readonly string[]) {
  const partsOf = (rec: Record<string, Estimate> | null) => composition(rec, [...ids]).map((p) => p.value);
  const cityRec: Record<string, Estimate> = {}, countyRec: Record<string, Estimate> = {};
  for (const id of ids) {
    const r = reference(id);
    if (r.city) cityRec[id] = r.city;
    if (r.county) countyRec[id] = r.county;
  }
  return [
    { label: C.thisPlace, values: partsOf(unit) },
    { label: 'City', values: partsOf(cityRec) },
    { label: 'County', values: partsOf(countyRec) },
  ];
}
const partsDef = (defs: readonly (readonly [string, string])[]) => [...defs.map(([id, label], i) => ({ id, label, color: PARTS[i] })), { id: 'other', label: 'Other', color: PARTS[5] }];

function Section({ title, sub, children, open = true }: { title: string; sub?: string; children: React.ReactNode; open?: boolean }) {
  return (
    <Explainer tone="card" defaultOpen={open} title={<span><span className="block">{title}</span>{sub && <span className="block text-caption font-normal text-slate-600">{sub}</span>}</span>}>
      <div className="pt-1">{children}</div>
    </Explainer>
  );
}

/** Three-line chart of one variable: this place with its margin band, the city and the county. */
function HistoryLine({ level, geoid, varId, label }: { level: Level; geoid: string; varId: string; label: string }) {
  const v = variableById.get(varId);
  const mine = historyFor(level, geoid, varId);
  const ref = referenceSeries(varId);
  if (!v || !mine) return null;
  const series = [
    { id: 'place', label: C.thisPlace, color: SERIES.place, values: mine.est, moe: mine.moe },
    ...(ref.city ? [{ id: 'city', label: C.city, color: SERIES.city, values: ref.city.est }] : []),
    ...(ref.county ? [{ id: 'county', label: C.county, color: SERIES.county, values: ref.county.est }] : []),
  ];
  const ch = change(mine);
  const carried = level === 'tract' ? xwDominant(geoid) : null;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-small font-semibold text-slate-900">{label}</span>
        {ch && (
          <span className="text-caption text-slate-600 tnum">
            {ch.from.year}→{ch.to.year}: <b className="text-slate-900">{ch.pct != null ? fmtSignedPct(ch.pct) : '—'}</b> ({fmtValue(ch.from.value, v.unit)} → {fmtValue(ch.to.value, v.unit)})
          </span>
        )}
      </div>
      <LineChart years={mine.years} series={series} fmt={tickFor(v.unit)} caption={carried != null && carried < history.meta.xw_flag ? `${C.acsWindows} ${C.carried}` : C.acsWindows} />
    </div>
  );
}

/** Asking-rent line for a tract, ZIP or municipality against the city and county series. */
export function RentLine({ level, geoid }: { level: Level; geoid: string }) {
  const area = rentAreaFor(level, geoid);
  const years = rentAreas.years;
  if (!area || years.length === 0) return null;
  const ctx = (k: 'city' | 'county') => years.map((y) => askingRents[k]?.[String(y)]?.median_2br ?? null);
  const series = [
    { id: 'place', label: C.thisPlace, color: SERIES.place, values: area.rent_2br },
    { id: 'city', label: C.city, color: SERIES.city, values: ctx('city') },
    { id: 'county', label: C.county, color: SERIES.county, values: ctx('county') },
  ];
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2 text-small">
        <span className="font-semibold text-slate-900">Median 2BR asking rent</span>
        <span className="text-caption text-slate-600 tnum">
          2025–26: <b className="text-slate-900">{area.level != null ? fmtValue(area.level, 'usd') : 'hidden'}</b> ({area.n} units) · FMR {fmtValue(FMR_2BR, 'usd')}
          {area.growth_existing != null && <> · {fmtSignedPct(area.growth_existing)} since 2019–20, existing stock</>}
        </span>
      </div>
      <LineChart years={years} series={series} fmt={(v) => `$${fmtK(v)}`} caption={`${C.rentSeries} ${RENT_CAVEAT}`} />
      {area.conf && (
        <div className="mt-1">
          <ConfChip conf={area.conf} />
        </div>
      )}
    </div>
  );
}

/** The matchmaker's read on a city tract under the current priorities: best match, factors, pressure, rents. */
function AnalysisBlock({ t }: { t: TractProps }) {
  const weights = useApp((s) => s.weights);
  const setMode = useApp((s) => s.setMode);
  const set = useApp((s) => s.set);
  const results = useAllResults(weights);
  const r = results.get(t.GEOID);
  const stability = useMemo(() => stabilityFor(t.GEOID, weights), [t.GEOID, weights]);
  const preset = scoring.presets.find((p) => p.id === matchPreset(weights))?.label ?? 'custom mix';
  const top = r?.top ? scoring.typologies.find((k) => k.id === r.top) : null;
  const p = t.market_pressure;
  const word = p == null ? null : p > 0.25 ? 'much stronger' : p > 0.08 ? 'stronger' : p < -0.25 ? 'much weaker' : p < -0.08 ? 'weaker' : 'about the same';
  return (
    <div className="space-y-3">
      {t.residential && top && r ? (
        <div className="rounded-xl p-3 ring-1" style={{ background: `${top.color}14`, boxShadow: `inset 0 0 0 1px ${top.color}40` }}>
          <div className="text-caption text-slate-600">Best match under {preset}</div>
          <div className="font-display text-title font-bold text-slate-900">{top.label}</div>
          <div className="text-small text-slate-700">
            {matchText(r.topScore)}
            {stability && <> · {stabilityWords(stability.share).label}: stays #1 in {stabilityWords(stability.share).n} of 10 small changes to the priorities</>}
            {r.ranking[1] && <> · next: {tLabel(r.ranking[1])}</>}
          </div>
        </div>
      ) : (
        <div className="hatch rounded-xl px-3 py-2 text-small text-slate-700">Not ranked: fewer than 25 households.</div>
      )}
      <div className="space-y-2">
        {scoring.factors.map((f) => {
          const v = typeof t[f.id] === 'number' ? (t[f.id] as number) : null;
          const conf = (t[`${f.id}_conf`] as Conf | null) ?? null;
          return (
            <div key={f.id}>
              <div className="flex items-center justify-between gap-2 text-small">
                <span className="text-slate-800">{factorName(f.id, f.label)}</span>
                <span className="flex items-center gap-1.5 tnum">
                  <span className="font-semibold text-slate-900">{v == null ? 'no data' : pctShort(v)}</span>
                  {conf && <ConfChip conf={conf} />}
                </span>
              </div>
              <div className="mt-1">
                <RankBar pct={v} label={`${factorName(f.id, f.label)}: ${v == null ? 'no data' : pctShort(v)}`} />
              </div>
            </div>
          );
        })}
        <p className="text-caption text-slate-600">Percentiles against the {scoring.factors.length} factors' ranked city tracts; {FACTOR_COPY.need ? 'observed public data, never a verdict.' : ''}</p>
      </div>
      <div className={`rounded-xl px-3 py-2 text-small ring-1 ${t.watch_list ? 'bg-rose-50 ring-rose-200 text-rose-900' : 'bg-white ring-stone-200 text-slate-700'}`}>
        {p != null && word && (
          <>
            Neighbors’ markets are <b>{word}</b> than this one. Own market: <b>{t.mva21 ? `type ${t.mva21}` : 'unclassified'}</b>, {directionWord(t.market_direction)} since 2016.{' '}
          </>
        )}
        {t.watch_list ? <b>Watch list: high need with a rising market.</b> : 'Not on the watch list.'}
      </div>
      <RentLine level="tract" geoid={t.GEOID} />
      <Button className="w-full" onClick={() => {
        set({ selectedId: t.GEOID });
        setMode('match');
      }}>
        {EXPLORE_UI.place.openMatch}
      </Button>
    </div>
  );
}

/** Everything about one place: headline tiles, compositions, cost burden, change over time, and the matchmaker. */
export default function PlaceSummary({ level, geoid, unit }: { level: Level; geoid: string; unit: Record<string, Estimate> | null }) {
  const tract = level === 'tract' ? tractById.get(geoid) ?? null : null;
  const renter = est(unit?.renter_share);
  const cityRenter = est(reference('renter_share').city);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-stone-200/70 ring-1 ring-stone-200/70">
        {TILES.map((id) => {
          const v = variableById.get(id);
          const e = unit?.[id];
          if (!v) return null;
          const value = est(e);
          return <StatTile key={id} label={v.label} value={fmtValue(value, v.unit)} sub={typeof e?.moe === 'number' ? `± ${fmtMoe(e.moe, v.unit)}` : undefined} delta={v.unit === 'count' ? null : delta(value, est(reference(id).city), v.unit)} conf={reliability(e?.cv, RELIABILITY)} />;
        })}
      </div>
      <Section title={C.tenure} sub={`${C.source} · renter vs owner households`}>
        <Donut parts={[{ label: 'Renters', value: renter, color: SERIES.place }, { label: 'Owners', value: renter == null ? null : 1 - renter, color: PARTS[5] }]} center={renter == null ? '—' : `${Math.round(renter * 100)}%`} sub="rent" />
        {cityRenter != null && <p className="mt-2 text-caption text-slate-600">City-wide, {Math.round(cityRenter * 100)}% of households rent; county-wide {Math.round((est(reference('renter_share').county) ?? 0) * 100)}%.</p>}
      </Section>
      <Section title={C.structure} sub="Share of all housing units by units in the building">
        <StackedBar parts={partsDef(STRUCTURE)} rows={compositionRows(unit, STRUCTURE.map((s) => s[0]))} caption={C.source} />
      </Section>
      <Section title={C.burden} sub="Households paying more than the threshold of their income on housing">
        <div className="space-y-3">
          {BURDEN.map(([id, label]) => {
            const ref = reference(id);
            return (
              <div key={id}>
                <div className="mb-1 text-small font-medium text-slate-800">{label}</div>
                <BarCompare rows={[{ label: C.thisPlace, value: est(unit?.[id]), moe: unit?.[id]?.moe ?? null, color: SERIES.place }, { label: 'City', value: est(ref.city), color: SERIES.city }, { label: 'County', value: est(ref.county), color: SERIES.county }]} fmt={fmtFor('share')} max={1} />
              </div>
            );
          })}
        </div>
      </Section>
      {hasHistoryFor('med_hh_income') && (
        <Section title={C.incomeRent} sub="ACS 5-year estimates, 2014–2024">
          <div className="space-y-4">
            <HistoryLine level={level} geoid={geoid} varId="med_hh_income" label="Median household income" />
            <HistoryLine level={level} geoid={geoid} varId="med_gross_rent" label="Median gross rent" />
          </div>
        </Section>
      )}
      <Section title={C.race} sub="Share of the population" open={false}>
        <StackedBar parts={partsDef(RACE)} rows={compositionRows(unit, RACE.map((s) => s[0]))} caption={`${C.source} · Hispanic or Latino of any race; other races and two or more in Other`} />
      </Section>
      <Section title={C.commute} sub="Workers 16 and over by how they usually get to work" open={false}>
        <StackedBar parts={partsDef(COMMUTE)} rows={compositionRows(unit, COMMUTE.map((s) => s[0]))} caption={C.source} />
      </Section>
      {tract ? (
        <Section title={C.analysis} sub="Same numbers as the Analysis section, under the priorities set there">
          <AnalysisBlock t={tract} />
        </Section>
      ) : (
        rentAreaFor(level, geoid) && (
          <Section title={C.rents} sub="Licensed listing data, information only">
            <RentLine level={level} geoid={geoid} />
          </Section>
        )
      )}
    </div>
  );
}

/** One variable for one place: value, rank among peers, distribution, comparison bars and the 2014–2024 line. */
export function VariableDetail({ level, geoid, variable, values, unit }: { level: Level; geoid: string; variable: VariableDef; values: Loaded<ValueMap> | null; unit: Record<string, Estimate> | null }) {
  const setBrowse = useApp((s) => s.setBrowse);
  const many = LEVEL_LABEL[level].many;
  const analysis = isAnalysis(variable) ? variable : null;
  const own: Estimate | null = values?.data.get(geoid) ?? (analysis ? null : unit?.[variable.id] ?? null);
  const value = est(own);
  const peers = useMemo(() => (values ? estimates(values.data) : []), [values]);
  const rank = useMemo(() => rankOf(value, peers), [value, peers]);
  const hist = useMemo(() => histogram(peers, 12), [peers]);
  const ref = analysis ? { city: null, county: null } : reference(variable.id);
  const bin = binOf(hist, value);
  const fmt = analysis ? (v: number) => fmtAnalysis(analysis, v) : fmtFor(variable.unit);
  const tick = analysis ? (v: number) => (analysis.unit === 'pct' || analysis.unit === 'score' ? String(Math.round(v * 100)) : fmtAnalysis(analysis, v)) : tickFor(variable.unit);
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-stone-200/80">
        <div className="text-caption text-slate-600">{variable.label}</div>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-display text-display font-bold text-slate-900 tnum">{analysis ? fmtAnalysis(analysis, value) : fmtValue(value, variable.unit)}</span>
          {!analysis && typeof own?.moe === 'number' && <span className="text-small text-slate-600 tnum">± {fmtMoe(own.moe, variable.unit)}</span>}
          {analysis ? analysisConf(analysis, geoid) && <ConfChip conf={analysisConf(analysis, geoid)} /> : <ConfChip conf={reliability(own?.cv, RELIABILITY)} />}
        </div>
        {rank && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-small text-slate-700">
              <span>{C.rank(rank.rank, rank.n, many)}</span>
              <span className="tnum">higher than {Math.round(rank.pct * 100)}% of {many}</span>
            </div>
            <div className="mt-1">
              <RankBar pct={rank.pct} label={C.rank(rank.rank, rank.n, many)} />
            </div>
          </div>
        )}
        <p className="mt-2 text-caption text-slate-600">{variable.description}</p>
      </div>
      {hist.edges.length > 1 && (
        <Section title={C.distribution} sub={`All ${hist.n} ${many} with a value`}>
          <HistogramChart data={hist} fmt={tick} many={many} marker={value != null ? { value, label: `this ${LEVEL_LABEL[level].one.toLowerCase()} (bin ${bin == null ? '—' : bin + 1} of ${hist.counts.length})` } : null} refs={[{ label: 'City', value: est(ref.city), color: SERIES.city }, { label: 'County', value: est(ref.county), color: SERIES.county }]} />
        </Section>
      )}
      {!analysis && (
        <Section title="Against the city and county">
          <BarCompare rows={[{ label: C.thisPlace, value, moe: own?.moe ?? null, color: SERIES.place }, { label: 'City', value: est(ref.city), moe: ref.city?.moe ?? null, color: SERIES.city }, { label: 'County', value: est(ref.county), moe: ref.county?.moe ?? null, color: SERIES.county }]} fmt={fmt} />
        </Section>
      )}
      {!analysis && hasHistoryFor(variable.id) && historyFor(level, geoid, variable.id) && (
        <Section title="2014–2024" sub="ACS 5-year estimates by end year">
          <HistoryLine level={level} geoid={geoid} varId={variable.id} label={variable.label} />
        </Section>
      )}
      {analysis?.group === 'an_rents' && <RentLine level={level} geoid={geoid} />}
      <button onClick={() => setBrowse({ variable: null })} className="w-full rounded-xl bg-white px-3 py-2 text-small font-semibold text-violet-700 ring-1 ring-stone-200 hover:bg-violet-50">
        {C.showEverything}
      </button>
    </div>
  );
}

export type { Series };
export { CITY_GEOID, COUNTY_GEOID };
