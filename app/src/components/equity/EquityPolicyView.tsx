// Analysis > Equity & policy (mode `scenarios`), one screen: a single control bar (measure, income, the four policy
// levers with the policy simulator pop-up beside them, export) over three columns: the map (colored by the measure,
// lever-changed tracts outlined), the measure section (definition, plain sentences, charts, the selected tract against
// the city, every tract ranked by need) and the question box filling the right column.
import { useCallback, useMemo, useState } from 'react';
import { rankedTracts, tractById, tractLabel } from '../../lib/data';
import { useApp } from '../../lib/store';
import type { MapPaint } from '../../lib/paint';
import { hud, placeById } from '../../lib/place/data';
import { usePlan } from '../../lib/place/planStore';
import { amiOf } from '../../lib/place/plan';
import { MEASURES, buildLegend, fits2br, measureById, measureValue, median, rankByNeed, type AmiPct, type MeasureId } from '../../lib/equity/measures';
import { rent60TwoBedroom, type Row } from '../../lib/equity/policy';
import { POLICY_COLUMNS, buildEquityReport, equityFacts, equityPrompts, measureColumns, measureRows, policyRows, type LeverId, type TractInfo } from '../../lib/equity/export';
import { downloadCsv, exportFilename, toCsv } from '../../lib/export/csv';
import { mapSnapshot, printReport, reportFooter } from '../../lib/export/report';
import ExportMenu, { useMapRef } from '../export/ExportMenu';
import MapView from '../MapView';
import AnalysisChat from '../AnalysisChat';
import EquityToolbar from './EquityToolbar';
import MeasurePanel from './MeasurePanel';
import PolicyPopover from './PolicySimulator';
import { explainPolicies, policiesOnLine } from '../../lib/equity/explain';
import { useEquityReading } from '../../lib/equity/reading';
import { usePolicy } from './usePolicy';
import { nameOf } from './names';
import { useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { cx } from '../../lib/format';
import { InfoTip } from '../primitives';

/** v2: the chat is a floating panel behind a button, closed until asked for (remembered per browser). */
const CHAT_KEY = 'visionpitts.equityChat.v2';

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
  // Market rate (shared with the Place tab) reads as a household at the area median income (100% AMI).
  const level: AmiPct = planLevel === 'market' ? 100 : (amiOf(planLevel) as AmiPct);
  const [measure, setMeasure] = useState<MeasureId>('rent_gap');
  const [on, setOn] = useState<Record<LeverId, boolean>>({ adu: false, bonus: false, voucher: false, transit: false });
  const [homesText, setHomesText] = useState('40');
  // VisionPitts-Chat floats over the right of the page; the map and the analysis never change size, so opening it
  // costs no layout work (the panel stays mounted and only fades and slides).
  const [chatOpen, setChatOpen] = useState(() => {
    try {
      return localStorage.getItem(CHAT_KEY) === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!chatOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggleChat();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen]);
  const toggleChat = () =>
    setChatOpen((o) => {
      try {
        localStorage.setItem(CHAT_KEY, o ? '0' : '1');
      } catch {
        /* private mode */
      }
      return !o;
    });
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
  const fits = fits2br(hud, level);
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
  // What the switched-on policies change (exact sentences), and a VisionPitts-Chat reading of the whole tab.
  const policyTexts = useMemo(
    () =>
      explainPolicies({
        def,
        values,
        levers,
        subsidy: { tracts: results.gaps.top.map((g) => g.id), homes: results.homes, total: results.gaps.total, fits: results.fits, ami: results.ami },
        rent60: rent60TwoBedroom(hud)?.formula ?? null,
        transitLabel: results.transitLabel,
        nameOf,
      }),
    [def, values, levers, results],
  );
  const readingFacts = useMemo(() => (policyTexts.length ? `${facts}\nWHAT THE POLICIES THAT ARE ON CHANGE:\n${policyTexts.map((p) => `${p.name}: ${p.text}`).join('\n')}` : facts), [facts, policyTexts]);
  const reading = useEquityReading(readingFacts, active);
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
            marketAs80: false,
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
        <header className="flex shrink-0 flex-wrap items-baseline gap-x-3">
          <h1 className="font-display text-title font-bold text-slate-900">Equity &amp; policy</h1>
          <p className="text-small text-slate-600">Where renters need help most, and what four policy levers would change.</p>
        </header>
        <div data-tour="equity-bar">
        <EquityToolbar
          measure={measure}
          onMeasure={setMeasure}
          level={level}
          onLevel={(l) => setPlan({ level: l === 100 ? 'market' : l })}
          marketAs80={false}
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
          exportSlot={<ExportMenu items={exportItems} size="md" iconOnlyNarrow className="[&>button]:h-8 [&>button]:px-2.5 [&>button]:text-caption min-[2100px]:[&>button]:px-3 min-[2100px]:[&>button]:text-small" />}
          chatSlot={
            <button
              type="button"
              onClick={toggleChat}
              aria-pressed={chatOpen}
              aria-controls="equity-chat"
              title={chatOpen ? 'Close VisionPitts-Chat' : 'Ask VisionPitts-Chat about these numbers and Pittsburgh housing'}
              className={cx(
                'flex h-8 items-center gap-1 whitespace-nowrap rounded-lg px-2.5 text-caption font-semibold text-white shadow-sm min-[2100px]:text-small transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.97]',
                chatOpen ? 'bg-violet-800 ring-2 ring-violet-300' : 'bg-violet-600 hover:bg-violet-700 hover:shadow-md',
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              VisionPitts-Chat
            </button>
          }
        />
        </div>

        <div className="relative flex min-h-0 flex-1 max-lg:flex-col">
          <div className="relative min-h-[420px] min-w-0 flex-[44_1_0%] overflow-hidden rounded-xl ring-1 ring-stone-200/80">
            <MapView
              paint={paint}
              selectedId={selectedId}
              flips={flips}
              lite={lite}
              terrain={false}
              buildings={false}
              hillshade={false}
              onSelect={(id) => select(useApp.getState().selectedId === id ? null : id)}
              onMapReady={onMapReady}
              spotlightDim={0.4}
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

          <div className="ml-2.5 flex min-h-0 min-w-0 flex-[56_1_0%] flex-col max-lg:ml-0 max-lg:mt-2.5 [&>section]:flex-1">
          <MeasurePanel
            wide
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
            policyTexts={policyTexts}
            reading={reading}
            onPick={select}
          />
          </div>

          {/* VisionPitts-Chat: a floating panel over the right of the page. Always mounted (the thread and its scroll
              survive), shown by opacity and a short slide on the compositor, so opening it never re-lays out the map. */}
          <section
            id="equity-chat"
            aria-label="VisionPitts-Chat"
            aria-hidden={!chatOpen}
            inert={!chatOpen}
            className={cx(
              'absolute bottom-0 right-0 top-0 z-30 flex w-[min(400px,100%)] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_18px_50px_-12px_rgba(76,29,149,0.35)] ring-1 ring-violet-200/70 will-change-transform',
              'transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none',
              chatOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-4 opacity-0',
            )}
          >
            <div className="flex shrink-0 items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 px-3.5 py-2.5 text-white">
              <Sparkles className="h-4 w-4 shrink-0" />
              <h2 className="min-w-0 flex-1 text-small font-semibold leading-tight">VisionPitts-Chat</h2>
              <span className="text-white/85 [&_button]:text-white/85 hover:[&_button]:text-white">
                <InfoTip label="About VisionPitts-Chat" width={260} side="bottom">
                  Answers questions about this tab's numbers, the four levers and other Pittsburgh housing topics. Numbers in an answer are checked against the tool's data.
                </InfoTip>
              </span>
              <button type="button" onClick={toggleChat} className="grid h-7 w-7 place-items-center rounded-full text-white/90 transition-colors hover:bg-white/15 hover:text-white" aria-label="Close VisionPitts-Chat" title="Close (Esc)">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-violet-50/50 to-white px-2.5 pb-2.5 pt-2 [&>[data-testid=analysis-chat]]:flex [&>[data-testid=analysis-chat]]:min-h-0 [&>[data-testid=analysis-chat]]:flex-1 [&>[data-testid=analysis-chat]]:flex-col">
              <AnalysisChat compact dock extraFacts={active ? facts : undefined} prompts={prompts} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

