import { useMemo } from 'react';
import { matchPreset, useApp } from '../../lib/store';
import { scoring } from '../../lib/data';
import { classCounts, fmtAnalysis, isAnalysis, type AnalysisVar } from '../../lib/explore/analysisVars';
import { LEVEL_LABEL, bundledGeo, groups, hasHistoryFor, plainDescription, referenceSeries, unitTitle } from '../../lib/explore/catalog';
import { histogram, topBottom } from '../../lib/explore/summary';
import { HistogramChart, LineChart, SERIES, fmtK } from '../charts';
import { estimates, fmtTick, fmtValue } from '../../lib/explore/bins';
import { EXPLORE_UI } from '../../lib/explore/copy';
import { useReference } from '../../lib/explore/remote';
import type { BrowseLevel, Estimate, Loaded, UnitFC, ValueMap, VariableDef } from '../../lib/explore/types';
import { Button, SectionTitle } from '../primitives';
import ExportMenu from '../export/ExportMenu';
import { layerExportItems } from '../export/exploreExport';

function RefStat({ k, e, variable }: { k: string; e: Estimate | null; variable: VariableDef }) {
  return (
    <div className="bg-white px-3 py-2">
      <div className="text-caption text-slate-600">{k}</div>
      <div className="text-lead font-semibold text-slate-900 tnum">{fmtValue(e?.est, variable.unit)}</div>
    </div>
  );
}

/** Right panel for an Analysis layer: what it is, where it comes from, and how the city's tracts split on it. */
function AnalysisSummary({ variable, values }: { variable: AnalysisVar; values: Loaded<ValueMap> }) {
  const setBrowse = useApp((s) => s.setBrowse);
  const setMode = useApp((s) => s.setMode);
  const weights = useApp((s) => s.weights);
  const preset = scoring.presets.find((p) => p.id === matchPreset(weights))?.label ?? null;
  const group = groups.find((g) => g.id === variable.group)?.label ?? variable.group;
  const ests = [...values.data.values()].map((e) => e.est).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const sorted = [...ests].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
  const counts = classCounts(variable, values.data);
  return (
    <div className="space-y-5 p-5">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-small font-semibold text-violet-700">{group}</div>
            <h2 className="mt-1 font-display text-title font-bold text-slate-900">{variable.label}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ExportMenu items={layerExportItems(variable, 'tract', values, bundledGeo('tract'))} />
          <button onClick={() => setBrowse({ variable: null })} className="shrink-0 rounded-lg px-2 py-1 text-small font-semibold text-slate-600 hover:bg-stone-100 hover:text-slate-900">
            {EXPLORE_UI.clear}
          </button>
          </div>
        </div>
        <p className="mt-2 text-body text-slate-700">{plainDescription(variable)}</p>
        <p className="mt-1 text-caption text-slate-600">
          {EXPLORE_UI.analysisOnly}
          {variable.group === 'an_match' && ` · ${EXPLORE_UI.analysisPriorities(preset)}`}
        </p>
      </div>
      {variable.paint.kind === 'cat' ? (
        <section>
          <SectionTitle sub={`${ests.length} of ${values.data.size} city tracts have a value`}>How the tracts split</SectionTitle>
          <div className="space-y-1">
            {variable.paint.labels.map((label, i) => (
              <div key={label} className="flex items-center gap-2 text-small">
                <span className="h-3 w-4 shrink-0 rounded-sm" style={{ background: variable.paint.kind === 'cat' ? variable.paint.palette[i] : undefined }} />
                <span className="min-w-0 flex-1 truncate text-slate-800">{label}</span>
                <div className="h-2 w-24 overflow-hidden rounded-full bg-stone-100">
                  <div className="h-full rounded-full bg-slate-500" style={{ width: `${ests.length ? ((counts[i] ?? 0) / ests.length) * 100 : 0}%` }} />
                </div>
                <span className="w-8 text-right font-semibold text-slate-900 tnum">{counts[i] ?? 0}</span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-stone-200/70 ring-1 ring-stone-200/70">
          {[
            ['Lowest', sorted[0]],
            ['Median tract', median],
            ['Highest', sorted[sorted.length - 1]],
          ].map(([k, v]) => (
            <div key={String(k)} className="bg-white px-3 py-2">
              <div className="text-caption text-slate-600">{k}</div>
              <div className="text-lead font-semibold text-slate-900 tnum">{fmtAnalysis(variable, v as number | undefined)}</div>
            </div>
          ))}
        </div>
      )}
      <div className="rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200">
        <div className="text-small text-slate-700">Rank the housing types, change the priorities and compare places in Analysis.</div>
        <Button className="mt-2 w-full" onClick={() => setMode('match')}>
          {EXPLORE_UI.intro.analysis}
        </Button>
      </div>
      <p className="text-caption text-slate-600">{EXPLORE_UI.analysisOnly}</p>
    </div>
  );
}

/** Right panel while a variable is painted and nothing is selected: what it is, the city and county values, how the places spread. */
export default function VariableSummary({ variable, level, values, fc }: { variable: VariableDef; level: BrowseLevel; values: Loaded<ValueMap>; fc?: UnitFC }) {
  if (isAnalysis(variable)) return <AnalysisSummary variable={variable} values={values} />;
  return <AcsSummary variable={variable} level={level} values={values} fc={fc} />;
}

function AcsSummary({ variable, level, values, fc }: { variable: VariableDef; level: BrowseLevel; values: Loaded<ValueMap>; fc?: UnitFC }) {
  const setBrowse = useApp((s) => s.setBrowse);
  const ref = useReference(variable.id);
  const hist = useMemo(() => histogram(estimates(values.data), 12), [values.data]);
  const tb = useMemo(() => topBottom(values.data, 5), [values.data]);
  const index = useMemo(() => new Map((fc ?? bundledGeo(level)).features.map((f) => [f.properties.GEOID, f.properties])), [level, fc]);
  const series = useMemo(() => referenceSeries(variable.id), [variable.id]);
  const group = groups.find((g) => g.id === variable.group)?.label ?? variable.group;
  const many = LEVEL_LABEL[level].many;
  return (
    <div className="space-y-5 p-5">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-small font-semibold text-violet-700">{group}</div>
            <h2 className="mt-1 font-display text-title font-bold text-slate-900">{variable.label}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ExportMenu items={layerExportItems(variable, level, values, fc ?? bundledGeo(level))} />
          <button onClick={() => setBrowse({ variable: null })} className="shrink-0 rounded-lg px-2 py-1 text-small font-semibold text-slate-600 hover:bg-stone-100 hover:text-slate-900">
            {EXPLORE_UI.clear}
          </button>
          </div>
        </div>
        <p className="mt-2 text-body text-slate-700">{plainDescription(variable)}</p>
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-stone-200/70 ring-1 ring-stone-200/70">
        <RefStat k="City of Pittsburgh" e={ref.city} variable={variable} />
        <RefStat k="Allegheny County" e={ref.county} variable={variable} />
      </div>
      {hist.edges.length > 1 && (
        <section>
          <SectionTitle sub={`All ${hist.n} ${many} with a value; dashed lines mark the city and county`}>{EXPLORE_UI.charts.distribution}</SectionTitle>
          <HistogramChart data={hist} fmt={(v) => fmtTick(v, variable.unit)} many={many} refs={[{ label: 'City', value: ref.city?.est ?? null, color: SERIES.city }, { label: 'County', value: ref.county?.est ?? null, color: SERIES.county }]} />
        </section>
      )}
      {(tb.top.length > 0 || tb.bottom.length > 0) && (
        <section>
          <SectionTitle sub={EXPLORE_UI.charts.clickToSelect}>Highest and lowest</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {(['top', 'bottom'] as const).map((k) => (
              <div key={k} className="overflow-hidden rounded-xl ring-1 ring-stone-200">
                <div className="bg-stone-50 px-2.5 py-1 text-caption font-semibold text-slate-700">{k === 'top' ? EXPLORE_UI.charts.topFive : EXPLORE_UI.charts.bottomFive}</div>
                <ul className="divide-y divide-stone-100">
                  {tb[k].map(([id, v]) => (
                    <li key={id}>
                      <button onClick={() => setBrowse({ selected: { level, geoid: id } })} className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-small hover:bg-violet-50">
                        <span className="min-w-0 truncate text-slate-800">{index.has(id) ? unitTitle(index.get(id)) : id}</span>
                        <span className="shrink-0 font-semibold text-slate-900 tnum">{fmtValue(v, variable.unit)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
      {hasHistoryFor(variable.id) && series.city && series.county && (
        <section>
          <SectionTitle sub="ACS 5-year estimates by end year, city and county">2014–2024</SectionTitle>
          <LineChart years={series.city.years} series={[{ id: 'city', label: EXPLORE_UI.charts.city, color: SERIES.city, values: series.city.est }, { id: 'county', label: EXPLORE_UI.charts.county, color: SERIES.county, values: series.county.est }]} fmt={(v) => (variable.unit === 'usd' ? `$${fmtK(v)}` : fmtTick(v, variable.unit))} caption={EXPLORE_UI.charts.acsWindows} />
        </section>
      )}
      <p className="text-caption text-slate-600">{EXPLORE_UI.sourceOf(variable.source)}</p>
    </div>
  );
}
