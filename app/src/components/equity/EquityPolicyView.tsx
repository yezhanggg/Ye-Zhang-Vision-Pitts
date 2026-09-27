// Analysis > Equity & policy (mode `scenarios`), one screen: a single control bar (measure, income, the four policy
// levers with the policy simulator pop-up beside them, export) over three columns: the map (colored by the measure,
// lever-changed tracts outlined), the measure section (definition, plain sentences, charts, the selected tract against
// the city, every tract ranked by need) and the question box filling the right column.
import { useCallback, useMemo, useState } from 'react';
import { rankedTracts, tractById, tractLabel } from '../../lib/data';
import { useApp } from '../../lib/store';
import type { MapPaint } from '../../lib/paint';
import { hud, placeById } from '../../lib/place/data';
import { ceilingRent } from '../../lib/place/afford';
import { usePlan } from '../../lib/place/planStore';
import { amiOf } from '../../lib/place/plan';
import { MEASURES, buildLegend, measureById, measureValue, median, rankByNeed, type AmiPct, type MeasureId } from '../../lib/equity/measures';
import type { Row } from '../../lib/equity/policy';
import { POLICY_COLUMNS, buildEquityReport, equityFacts, equityPrompts, measureColumns, measureRows, policyRows, type LeverId, type TractInfo } from '../../lib/equity/export';
import { downloadCsv, exportFilename, toCsv } from '../../lib/export/csv';
import { mapSnapshot, printReport, reportFooter } from '../../lib/export/report';
import ExportMenu, { useMapRef } from '../export/ExportMenu';
import MapView from '../MapView';
import AnalysisChat from '../AnalysisChat';
import EquityToolbar from './EquityToolbar';
import MeasurePanel from './MeasurePanel';
import PolicyPopover from './PolicySimulator';
import { policiesOnLine } from '../../lib/equity/explain';
import { usePolicy } from './usePolicy';
import { nameOf } from './names';

const infoOf = (id: string): TractInfo => {
  const t = tractById.get(id);
  return { geoid: id, neighborhood: tractLabel(t), tract: t?.name ?? id };
};
const tractOf = (id: string) => tractById.get(id)?.name ?? id;

function Legend({ title, items, flips }: { title: string; items: { color: string; label: string }[]; flips: number }) {
  return (
    <div className="pointer-events-none absolute bottom-2.5 left-2.5 z-10 rounded-lg bg-white/95 px-2.5 py-2 shadow-md ring-1 ring-black/5">
      <div className="mb-1 text-caption font-semibold text-slate-800">{title}</div>
      <ul className="space-y-px">
        {items.map((it) => (
          <li key={it.label} className="flex items-center gap-1.5 text-caption text-slate-700">
            <span className="inline-block h-2.5 w-3.5 rounded-sm ring-1 ring-black/10" style={{ background: it.color }} />
            {it.label}
          </li>
        ))}
        <li className="flex items-center gap-1.5 text-caption text-slate-500">
          <span className="inline-block h-2.5 w-3.5 rounded-sm bg-[#e7e5e4] ring-1 ring-black/10" />
          no data or not ranked
        </li>
        {flips > 0 && (
          <li className="flex items-center gap-1.5 text-caption text-slate-800">
            <span className="inline-block h-2.5 w-3.5 rounded-sm ring-2 ring-slate-900" />
            changed by the levers on ({flips})
          </li>
        )}
      </ul>
    </div>
  );
}

export default function EquityPolicyView({ active = true }: { active?: boolean }) {
  const selectedId = useApp((s) => s.selectedId);
  const lite = useApp((s) => s.lite);
  const select = useApp((s) => s.select);
  const planLevel = usePlan((s) => s.level);
  const setPlan = usePlan((s) => s.setPlan);
  // Market rate (Place tab) has no HUD ceiling; this view reads it as 80% AMI and says so.
  const level = amiOf(planLevel) as AmiPct;
  const [measure, setMeasure] = useState<MeasureId>('rent_gap');
  const [on, setOn] = useState<Record<LeverId, boolean>>({ adu: false, bonus: false, voucher: false, transit: false });
  const [homesText, setHomesText] = useState('40');
  const homes = Math.max(0, Math.min(10000, Math.round(Number(homesText) || 0)));
  const def = measureById.get(measure)!;
  const { getMap, onMapReady } = useMapRef();

  const rows: Row[] = useMemo(() => rankedTracts.filter((t) => placeById.has(t.GEOID)).map((t) => ({ id: t.GEOID, p: placeById.get(t.GEOID)! })), []);
  const allValues = useMemo(() => new Map(MEASURES.map((m) => [m.id, rows.map((r) => measureValue(m.id, r.p, hud, level)).filter((v): v is number => v != null)])), [rows, level]);
  const medians = useMemo(() => new Map(MEASURES.map((m) => [m.id, median(allValues.get(m.id) ?? [])])), [allValues]);
  const values = useMemo(() => rows.map((r) => ({ id: r.id, value: measureValue(measure, r.p, hud, level) })), [rows, measure, level]);
  const ranked = useMemo(() => rankByNeed(values, def.higherIsNeed), [values, def]);
  const legend = useMemo(() => buildLegend(def, values.map((v) => v.value).filter((v): v is number => v != null)), [def, values]);
  const paint: MapPaint = useMemo(() => ({ kind: 'cat', palette: legend.colors, values: new Map(values.map((v) => [v.id, legend.classOf(v.value)])) }), [legend, values]);
  const valueById = useMemo(() => new Map(values.map((v) => [v.id, v.value])), [values]);
  const available = values.filter((v) => v.value != null).length;
  const fits = hud ? ceilingRent(hud, level, 2) : null;
  const med = medians.get(measure) ?? null;
  const { results, levers, flips } = usePolicy(rows, level, homes, on);
  const toggle = useCallback((id: LeverId) => setOn((o) => ({ ...o, [id]: !o[id] })), []);

  const selectedFacts = useMemo(() => {
    if (!selectedId || !placeById.has(selectedId)) return null;
    const p = placeById.get(selectedId)!;
    return { id: selectedId, values: MEASURES.map((m) => ({ def: m, value: measureValue(m.id, p, hud, level), median: medians.get(m.id) ?? null })) };
  }, [selectedId, level, medians]);
  const facts = useMemo(
    () => equityFacts({ ami: level, def, median: med, available, n: rows.length, ranked, levers, nameOf, tractOf, selected: selectedFacts }),
    [level, def, med, available, rows.length, ranked, levers, selectedFacts],
  );
  const prompts = useMemo(() => equityPrompts(def, level, levers, selectedId ? nameOf(selectedId) : null), [def, level, levers, selectedId]);

  const exportItems = [
    {
      label: 'Equity report (PDF)',
      hint: `${def.short}, map, top 20 and the four levers`,
      onSelect: async () => {
        const map = await mapSnapshot(getMap());
        printReport(
          buildEquityReport({
            ami: level,
            marketAs80: planLevel === 'market',
            def,
            median: med,
            available,
            n: rows.length,
            ranked,
            levers,
            info: infoOf,
            map,
            footer: reportFooter(),
            filename: exportFilename('equity', def.short, 'pdf'),
          }),
        );
      },
    },
    {
      label: 'Measure data (CSV)',
      hint: `All ${rows.length} tracts, six measures${flips.size ? ', levers on' : ''}`,
      onSelect: () => downloadCsv(exportFilename('equity-measures', `${level}-ami`, 'csv'), toCsv(measureRows(rows, infoOf, hud, level, levers), measureColumns(level, levers))),
    },
    {
      label: 'Policy results (CSV)',
      hint: 'One row per lever: rule, before, after',
      onSelect: () => downloadCsv(exportFilename('equity-policies', `${level}-ami`, 'csv'), toCsv(policyRows(levers, nameOf), POLICY_COLUMNS)),
    },
  ];

  if (!hud || placeById.size === 0) {
    return <div className="grid h-full place-items-center pt-14 text-small text-slate-600">The place measures (place.json and the HUD table) are not built yet, so the equity dashboard cannot run.</div>;
  }

  return (
    <div className="flex h-full flex-col bg-[#fbfaf8] pt-[96px]" data-active={active ? 'true' : 'false'}>
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 px-4 pb-4 pt-1.5 sm:px-5 max-lg:overflow-y-auto">
        <div data-tour="equity-bar">
        <EquityToolbar
          measure={measure}
          onMeasure={setMeasure}
          level={level}
          onLevel={(l) => setPlan({ level: l })}
          marketAs80={planLevel === 'market'}
          fitsFormula={fits?.formula ?? null}
          on={on}
          onToggle={toggle}
          homesText={homesText}
          onHomes={setHomesText}
          about={
            <>
              Where rents outrun what people earn, and how close people live to jobs, schools, frequent transit and everyday services. One measure at a time, in real units, for the {rows.length} city tracts with at
              least 25 households. Darker = more need.
            </>
          }
          policySlot={<PolicyPopover levers={levers} results={results} selectedId={selectedId} onToggle={toggle} />}
          exportSlot={<ExportMenu items={exportItems} size="md" className="[&>button]:h-10 [&>button]:px-3.5" />}
        />
        </div>

        <div className="grid min-h-0 flex-1 gap-2.5 lg:grid-cols-[minmax(0,43fr)_minmax(0,30fr)_minmax(0,27fr)] max-lg:grid-cols-1">
          <div className="relative min-h-[420px] overflow-hidden rounded-xl ring-1 ring-stone-200/80">
            <MapView
              paint={paint}
              selectedId={selectedId}
              flips={flips}
              lite={lite}
              terrain={false}
              buildings={false}
              hillshade={false}
              onSelect={select}
              onMapReady={onMapReady}
              tooltip={(id) => (
                <div className="max-w-64">
                  <div className="font-semibold">{nameOf(id)}</div>
                  <div className="text-caption text-white/75">{tractById.get(id)?.name}</div>
                  <div className="mt-1">
                    {def.short}: <b>{tractById.get(id)?.residential ? def.fmt(valueById.get(id) ?? null) : 'not ranked'}</b>
                  </div>
                  {flips.has(id) && <div className="mt-0.5 text-caption text-white/75">Changed by {levers.filter((l) => l.on && l.changed.includes(id)).map((l) => l.name).join(', ')}</div>}
                </div>
              )}
            />
            <Legend title={`${def.title} (${def.unit})`} items={legend.items} flips={flips.size} />
          </div>

          <MeasurePanel
            def={def}
            ami={level}
            median={med}
            available={available}
            n={rows.length}
            ranked={ranked}
            values={values}
            legend={legend}
            medians={medians}
            allValues={allValues}
            selectedId={selectedId}
            policiesLine={policiesOnLine(levers)}
            onPick={select}
          />

          <section aria-label="Questions" className="flex min-h-0 flex-col overflow-hidden rounded-xl bg-white ring-1 ring-stone-200/80 max-lg:min-h-[480px]">
            <div className="shrink-0 border-b border-stone-100 px-3.5 pb-2 pt-2.5">
              <h2 className="text-small font-semibold text-slate-900">Equity &amp; Policy Analysis Chat Box</h2>
            </div>
            <div className="flex min-h-0 flex-1 flex-col px-2.5 pb-2.5 pt-2 [&>[data-testid=analysis-chat]]:flex [&>[data-testid=analysis-chat]]:min-h-0 [&>[data-testid=analysis-chat]]:flex-1 [&>[data-testid=analysis-chat]]:flex-col">
              <AnalysisChat compact dock extraFacts={active ? facts : undefined} prompts={prompts} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

