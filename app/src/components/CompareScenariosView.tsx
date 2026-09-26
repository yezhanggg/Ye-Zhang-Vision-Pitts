import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { activeFactors, scoring, tractById, tractLabel, typologyById } from '../lib/data';
import { flipsBetween, focusFlipList, resultFor, tLabel, useAllResults } from '../lib/derived';
import { buildPaint } from '../lib/paint';
import { MAX_SCENARIOS, SCENARIO_COLORS, matchPreset, useApp } from '../lib/store';
import { cx } from '../lib/format';
import { factorName, weightWord } from '../lib/copy';
import type { Scenario } from '../lib/types';
import Rail, { RailSection } from './Rail';
import TractSearch from './TractSearch';
import WeightPanel from './WeightPanel';
import SyncedMapPair from './SyncedMapPair';
import Legend from './Legend';
import Slopegraph from './Slopegraph';
import { MapTooltip } from './MatchView';
import { MapChip } from './CompareTractsView';
import { Dot, SectionTitle } from './primitives';

const PICK = { kind: 'pick' } as const;

function ScenarioPicker({ which, value, scenarios, onChange }: { which: 'A' | 'B'; value: string; scenarios: Scenario[]; onChange: (id: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-4 text-small font-bold text-slate-700">{which}</span>
      <div className="flex flex-1 flex-wrap gap-1">
        {scenarios.map((s, i) => (
          <button key={s.id} onClick={() => onChange(s.id)} className={cx('flex items-center gap-1.5 rounded-lg px-2 py-1 text-small font-semibold ring-1 transition', s.id === value ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-stone-300 hover:ring-stone-400')}>
            <Dot color={SCENARIO_COLORS[i % SCENARIO_COLORS.length]} size={8} />
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function WeightsDiff({ a, b }: { a: Scenario; b: Scenario }) {
  const rows = activeFactors
    .map((f) => ({ f, wa: a.weights[f.id] ?? 0, wb: b.weights[f.id] ?? 0 }))
    .map((r) => ({ ...r, same: weightWord(r.wa) === weightWord(r.wb), d: r.wb - r.wa }))
    .sort((x, y) => Number(x.same) - Number(y.same) || Math.abs(y.d) - Math.abs(x.d));
  return (
    <div className="flex flex-wrap gap-1.5">
      {rows.map(({ f, wa, wb, same, d }) => (
        <motion.span layout key={f.id} className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-small ring-1', same ? 'bg-white text-slate-600 ring-stone-200' : d > 0 ? 'bg-emerald-50 text-emerald-900 ring-emerald-200' : 'bg-rose-50 text-rose-900 ring-rose-200')}>
          <span className="font-semibold">{f.short ?? factorName(f.id, f.label)}:</span>
          {same ? (
            <span>{weightWord(wa)}</span>
          ) : (
            <span>
              {weightWord(wa)} → <b>{weightWord(wb)}</b> {d > 0 ? '▲' : '▼'}
            </span>
          )}
        </motion.span>
      ))}
    </div>
  );
}

export default function CompareScenariosView() {
  const selectedId = useApp((s) => s.selectedId);
  const scenarios = useApp((s) => s.scenarios);
  const scenA = useApp((s) => s.scenA);
  const scenB = useApp((s) => s.scenB);
  const editing = useApp((s) => s.editing);
  const { set, select, setScenarioWeights, saveScenario, removeScenario } = useApp.getState();
  const A = scenarios.find((s) => s.id === scenA) ?? scenarios[0];
  const B = scenarios.find((s) => s.id === scenB) ?? scenarios[scenarios.length - 1];
  const idxA = scenarios.indexOf(A), idxB = scenarios.indexOf(B);
  const colorA = SCENARIO_COLORS[idxA % SCENARIO_COLORS.length];
  const colorB = SCENARIO_COLORS[idxB % SCENARIO_COLORS.length];
  const resA = useAllResults(A.weights);
  const resB = useAllResults(B.weights);
  const paintA = useMemo(() => buildPaint(PICK, resA), [resA]);
  const paintB = useMemo(() => buildPaint(PICK, resB), [resB]);
  const flips = useMemo(() => flipsBetween(resA, resB), [resA, resB]);
  const t = selectedId ? tractById.get(selectedId) : null;
  const ra = t ? resultFor(t, A.weights) : null;
  const rb = t ? resultFor(t, B.weights) : null;
  const focusFlips = focusFlipList(flips);
  const edited = editing === 'A' ? A : B;
  const editColor = editing === 'A' ? colorA : colorB;
  const takeaway = `Switching from ${A.name} to ${B.name} changes the best match in ${flips.size} of ${resA.size} ranked tracts${focusFlips.length ? `, including ${focusFlips.length} demo neighborhood${focusFlips.length > 1 ? 's' : ''}` : ''}.`;
  const tipA = (id: string) => <MapTooltip id={id} results={resA} />;
  const tipB = (id: string) => <MapTooltip id={id} results={resB} />;

  return (
    <div className="flex h-full">
      <Rail>
        <RailSection title="Find a place" step={1}>
          <TractSearch value={selectedId} onChange={select} showQuickPicks={false} label="Search an address, neighborhood or tract" />
        </RailSection>
        <RailSection title={`Scenarios to compare (${scenarios.length} of ${MAX_SCENARIOS})`} step={2} sub="A scenario is a saved set of priorities.">
          <div className="space-y-1.5 rounded-xl bg-white p-2 ring-1 ring-stone-200/80">
            <ScenarioPicker which="A" value={A.id} scenarios={scenarios} onChange={(id) => set({ scenA: id })} />
            <ScenarioPicker which="B" value={B.id} scenarios={scenarios} onChange={(id) => set({ scenB: id })} />
          </div>
          <div className="mt-2 flex gap-1.5">
            <button
              disabled={scenarios.length >= MAX_SCENARIOS}
              onClick={() => {
                saveScenario(`Scenario ${scenarios.length + 1}`, edited.weights);
                set({ editing: 'B' });
              }}
              className="flex-1 rounded-lg bg-white px-2 py-1.5 text-small font-semibold text-slate-700 ring-1 ring-stone-300 hover:text-violet-800 hover:ring-violet-300 disabled:opacity-40"
            >
              + Copy {editing}
            </button>
            <button disabled={scenarios.length <= 1} onClick={() => removeScenario(edited.id)} className="rounded-lg bg-white px-2 py-1.5 text-small font-semibold text-slate-700 ring-1 ring-stone-300 hover:text-rose-700 hover:ring-rose-200 disabled:opacity-40">
              Delete {editing}
            </button>
          </div>
        </RailSection>
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-body font-semibold text-slate-900">Edit</span>
            <div className="inline-flex rounded-lg bg-stone-100 p-0.5 ring-1 ring-stone-200/70">
              {(['A', 'B'] as const).map((w) => (
                <button key={w} onClick={() => set({ editing: w })} className={cx('rounded-md px-3 py-1 text-small font-semibold', editing === w ? 'bg-white shadow-sm ring-1 ring-black/5' : 'text-slate-600')} style={editing === w ? { color: w === 'A' ? colorA : colorB } : undefined}>
                  {w} · {(w === 'A' ? A : B).name}
                </button>
              ))}
            </div>
          </div>
          <WeightPanel
            key={edited.id}
            weights={edited.weights}
            onChange={(w) => {
              setScenarioWeights(editing, w);
              const p = matchPreset(w);
              const label = scoring.presets.find((x) => x.id === p)?.label;
              if (label && label !== edited.name && !scenarios.some((s) => s.name === label)) useApp.setState((st) => ({ scenarios: st.scenarios.map((s) => (s.id === edited.id ? { ...s, name: label } : s)) }));
            }}
            accent={editColor}
            title={`What matters in scenario ${editing}?`}
            compact
            fineTuneOpen
          />
        </div>
      </Rail>
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="relative h-[46%] min-h-[260px]">
          <SyncedMapPair
            a={{ paint: paintA, selectedId, flips, tooltip: tipA, onSelect: select, buildingColor: ra?.top ? typologyById.get(ra.top)?.color : null, overlay: <MapChip tag="A" color={colorA} title={A.name} sub="Which type wins in each tract" /> }}
            b={{ paint: paintB, selectedId, flips, tooltip: tipB, onSelect: select, buildingColor: rb?.top ? typologyById.get(rb.top)?.color : null, overlay: <MapChip tag="B" color={colorB} title={B.name} sub="Which type wins in each tract" /> }}
          >
            <div className="absolute bottom-3 left-3 z-10">
              <Legend metric={PICK} flips compact />
            </div>
            <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-slate-900/90 px-3 py-1.5 text-small font-semibold text-white shadow-lg backdrop-blur">
              <motion.span key={flips.size} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }}>
                {flips.size}
              </motion.span>{' '}
              of {resA.size} tracts change their best match
            </div>
          </SyncedMapPair>
        </div>
        <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto bg-[#fbfaf8] px-5 py-4">
          <AnimatePresence mode="wait">
            <motion.div key={takeaway} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="mb-4 flex items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-stone-200/80">
              <span className="mt-0.5 rounded-md bg-slate-900 px-1.5 py-0.5 text-caption font-bold uppercase tracking-wider text-white">Takeaway</span>
              <p className="font-display text-lead font-medium text-slate-900">{takeaway}</p>
            </motion.div>
          </AnimatePresence>
          <div className="mb-4">
            <SectionTitle sub="Your judgment calls, not data.">How the two scenarios weigh things</SectionTitle>
            <WeightsDiff a={A} b={B} />
          </div>
          <div className="grid grid-cols-[1.35fr_1fr] gap-5">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200/80">
              <SectionTitle sub={t ? 'Rank of each housing type under A (left) and B (right). Bold lines move.' : undefined}>{t ? `${tractLabel(t)}: ranking under A and B` : 'Pick a place'}</SectionTitle>
              {t && ra?.top && rb?.top ? (
                <>
                  <Slopegraph a={ra} b={rb} labelA={A.name} labelB={B.name} colorA={colorA} colorB={colorB} />
                  <AnimatePresence mode="wait">
                    <motion.p key={`${ra.top}-${rb.top}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-2 text-body text-slate-800">
                      {ra.top === rb.top ? (
                        <>
                          Same answer: <b>{tLabel(ra.top)}</b> is the best match under both.
                        </>
                      ) : (
                        <>
                          The answer <b className="text-rose-700">changes</b>: <b>{tLabel(ra.top)}</b> under A, <b>{tLabel(rb.top)}</b> under B.
                        </>
                      )}
                    </motion.p>
                  </AnimatePresence>
                </>
              ) : (
                <p className="text-small text-slate-600">Choose a ranked tract on either map.</p>
              )}
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200/80">
              <SectionTitle>Demo neighborhoods that change</SectionTitle>
              {focusFlips.length === 0 ? (
                <p className="text-small text-slate-700">No demo neighborhood changes its best match between these scenarios.</p>
              ) : (
                <ul className="space-y-1">
                  {focusFlips.map((f) => {
                    const x = resA.get(f.GEOID)!, y = resB.get(f.GEOID)!;
                    return (
                      <li key={f.GEOID}>
                        <button onClick={() => select(f.GEOID)} className={cx('flex w-full flex-col gap-0.5 rounded-lg px-2 py-1.5 text-left text-small hover:bg-stone-50', f.GEOID === selectedId && 'bg-violet-50')}>
                          <span className="font-semibold text-slate-900">{tractLabel(f)}</span>
                          <span className="flex items-center gap-1 text-caption text-slate-700">
                            <Dot color={typologyById.get(x.top!)!.color} size={8} />
                            {tLabel(x.top)} <span className="text-slate-500">→</span> <Dot color={typologyById.get(y.top!)!.color} size={8} />
                            {tLabel(y.top)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-2 text-caption text-slate-600">Dark outlines on both maps mark every tract whose best match changes.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
