import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { activeFactorIds, activeFactors, scoring, tractById, tractLabel, tractsFC, typologyById } from '../lib/data';
import { flipsBetween, focusFlipList, resultFor, tLabel, useAllResults } from '../lib/derived';
import { buildPaint } from '../lib/paint';
import { MAX_SCENARIOS, SCENARIO_COLORS, presetWeights, useApp } from '../lib/store';
import { cx } from '../lib/format';
import { UI, factorName, weightWord } from '../lib/copy';
import { closeCallOverlay } from '../lib/analysis/closeCalls';
import { ANALYSIS_COPY, APP_STANCES, REFERENCE_LABEL } from '../lib/analysis/copy';
import { alreadySaved, findDuplicate, nextName, uniqueName } from '../lib/analysis/scenarios';
import type { Scenario } from '../lib/types';
import Rail, { RailSection } from './Rail';
import TractSearch from './TractSearch';
import WeightPanel from './WeightPanel';
import SyncedMapPair from './SyncedMapPair';
import Legend from './Legend';
import Slopegraph from './Slopegraph';
import AnalysisChat from './AnalysisChat';
import FlipList from './analysis/FlipList';
import { MapTooltip } from './MatchView';
import { MapChip } from './CompareTractsView';
import PanelTitle from './analysis/PanelTitle';
import { Dot } from './primitives';

const PICK = { kind: 'pick' } as const;
/** How long a refusal ("Already saved as …") stays on screen. */
const NOTICE_MS = 4000;

function ScenarioPicker({ which, value, scenarios, onChange }: { which: 'A' | 'B'; value: string; scenarios: Scenario[]; onChange: (id: string) => void }) {
  return (
    <div className="flex items-center gap-2" data-picker={which}>
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
        <motion.span layout key={f.id} className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-caption ring-1', same ? 'bg-white text-slate-600 ring-stone-200' : d > 0 ? 'bg-emerald-50 text-emerald-900 ring-emerald-200' : 'bg-rose-50 text-rose-900 ring-rose-200')}>
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

export default function CompareScenariosView({ active = true }: { active?: boolean }) {
  const selectedId = useApp((s) => s.selectedId);
  const scenarios = useApp((s) => s.scenarios);
  const scenA = useApp((s) => s.scenA);
  const scenB = useApp((s) => s.scenB);
  const editing = useApp((s) => s.editing);
  const lite = useApp((s) => s.lite);
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
  const overlaysA = useMemo(() => [closeCallOverlay(resA, tractsFC)], [resA]);
  const overlaysB = useMemo(() => [closeCallOverlay(resB, tractsFC)], [resB]);
  const flips = useMemo(() => flipsBetween(resA, resB), [resA, resB]);
  const t = selectedId ? tractById.get(selectedId) : null;
  const ra = t ? resultFor(t, A.weights) : null;
  const rb = t ? resultFor(t, B.weights) : null;
  const focusFlips = focusFlipList(flips);
  const edited = editing === 'A' ? A : B;
  const editColor = editing === 'A' ? colorA : colorB;
  const full = scenarios.length >= MAX_SCENARIOS;
  const takeaway = `Switching from ${A.name} to ${B.name} changes the best match in ${flips.size} of ${resA.size} ranked tracts${focusFlips.length ? `, including ${focusFlips.length} demo neighborhood${focusFlips.length > 1 ? 's' : ''}` : ''}.`;
  const tipA = (id: string) => <MapTooltip id={id} results={resA} />;
  const tipB = (id: string) => <MapTooltip id={id} results={resB} />;

  // A refusal shown under the buttons for a moment ("Already saved as …").
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(id);
  }, [notice]);

  /** Saves a set of priorities as a new scenario unless one already holds exactly these weights. */
  const trySave = (name: string, w: Scenario['weights'], among: Scenario[] = scenarios) => {
    const dup = findDuplicate(among, w, activeFactorIds);
    if (dup) return setNotice(alreadySaved(dup));
    if (full) return;
    saveScenario(uniqueName(name, scenarios), w);
    set({ editing: 'B' });
    setNotice(null);
  };
  /** A fork of the edited scenario to change next: refused while an identical fork of it already exists. */
  const copy = () => {
    const base = scoring.presets.some((p) => p.label === edited.name) ? ANALYSIS_COPY.scenarios.edited(edited.name) : `${edited.name} copy`;
    trySave(base, edited.weights, scenarios.filter((s) => s.id !== edited.id));
  };
  const rename = (id: string, name: string) => useApp.setState((st) => ({ scenarios: st.scenarios.map((s) => (s.id === id ? { ...s, name } : s)) }));

  return (
    <MotionConfig reducedMotion={!active || lite ? 'always' : 'user'}>
      <div className="flex h-full">
        <Rail title={UI.compareScenariosTab}>
          <AnalysisChat compact />
          <RailSection id="place" title="Find a place">
            <TractSearch value={selectedId} onChange={select} showQuickPicks={false} label="Search an address, neighborhood or tract" />
          </RailSection>
          <RailSection id="compare" title={`Scenarios to compare (${scenarios.length} of ${MAX_SCENARIOS})`} sub="A scenario is a saved stance: one set of weights.">
            <div className="space-y-1.5 rounded-xl bg-white p-2 ring-1 ring-stone-200/80">
              <ScenarioPicker which="A" value={A.id} scenarios={scenarios} onChange={(id) => set({ scenA: id })} />
              <ScenarioPicker which="B" value={B.id} scenarios={scenarios} onChange={(id) => set({ scenB: id })} />
            </div>
            <div className="mt-2">
              <div className="text-caption font-semibold text-slate-600">Add a stance</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {/* The three stances, then Balanced as the equal-weights reference (it keeps its config label as the saved name). */}
                {[...APP_STANCES.map((id) => scoring.presets.find((p) => p.id === id)), scoring.presets.find((p) => p.id === 'balanced')]
                  .filter((p): p is NonNullable<typeof p> => !!p)
                  .map((p) => {
                    const w = presetWeights(p.id);
                    const saved = findDuplicate(scenarios, w, activeFactorIds);
                    const shown = p.id === 'balanced' ? REFERENCE_LABEL : p.label;
                    return (
                      <button key={p.id} disabled={!saved && full} onClick={() => trySave(p.label, w)} className={cx('rounded-lg px-2 py-1 text-caption font-semibold ring-1 transition disabled:opacity-40', saved ? 'bg-stone-100 text-slate-500 ring-stone-200' : 'bg-white text-slate-700 ring-stone-300 hover:text-violet-800 hover:ring-violet-300')} title={saved ? alreadySaved(saved) : `Save ${shown} as a scenario`}>
                        {saved ? '✓ ' : '+ '}
                        {shown}
                      </button>
                    );
                  })}
              </div>
            </div>
            <div className="mt-2 flex gap-1.5">
              <button disabled={full} onClick={copy} className="flex-1 rounded-lg bg-white px-2 py-1.5 text-small font-semibold text-slate-700 ring-1 ring-stone-300 hover:text-violet-800 hover:ring-violet-300 disabled:opacity-40">
                + Copy {editing}
              </button>
              <button disabled={scenarios.length <= 1} onClick={() => removeScenario(edited.id)} className="rounded-lg bg-white px-2 py-1.5 text-small font-semibold text-slate-700 ring-1 ring-stone-300 hover:text-rose-700 hover:ring-rose-200 disabled:opacity-40">
                Delete {editing}
              </button>
            </div>
            <AnimatePresence initial={false}>
              {notice && (
                <motion.p key={notice} role="status" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden text-caption text-amber-900">
                  <span className="mt-1.5 block rounded-lg bg-amber-50 px-2 py-1 ring-1 ring-amber-200">{notice}</span>
                </motion.p>
              )}
            </AnimatePresence>
          </RailSection>
          <RailSection id="priorities" title={`Stance of scenario ${editing}`}>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-small font-semibold text-slate-700">Edit</span>
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
                const name = nextName(edited.name, w, scoring.presets, activeFactorIds);
                if (name !== edited.name) rename(edited.id, name);
              }}
              accent={editColor}
              compact
              hideTitle
            />
          </RailSection>
        </Rail>
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="relative h-[63%] min-h-[380px] shrink-0">
            <SyncedMapPair
              a={{ paint: paintA, selectedId, flips, overlays: overlaysA, tooltip: tipA, onSelect: select, buildingColor: ra?.top ? typologyById.get(ra.top)?.color : null, overlay: <MapChip tag="A" color={colorA} title={A.name} sub="Which type wins in each tract" /> }}
              b={{ paint: paintB, selectedId, flips, overlays: overlaysB, tooltip: tipB, onSelect: select, buildingColor: rb?.top ? typologyById.get(rb.top)?.color : null, overlay: <MapChip tag="B" color={colorB} title={B.name} sub="Which type wins in each tract" /> }}
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
          <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto bg-[#fbfaf8] px-4 py-3">
            <AnimatePresence mode="wait">
              <motion.div key={takeaway} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="mb-3 flex items-start gap-2.5 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-stone-200/80">
                <span className="mt-0.5 rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Takeaway</span>
                <p className="font-display text-body font-medium text-slate-900">{takeaway}</p>
              </motion.div>
            </AnimatePresence>
            <div className="mb-3">
              <PanelTitle sub="Your judgment calls, not data.">How the two scenarios weigh things</PanelTitle>
              <WeightsDiff a={A} b={B} />
            </div>
            <div className="grid grid-cols-[1.35fr_1fr] items-start gap-4">
              <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200/80">
                <PanelTitle sub={t ? 'Rank of each housing type under A (left) and B (right). Bold lines move.' : undefined}>{t ? `${tractLabel(t)}: ranking under A and B` : 'Pick a place'}</PanelTitle>
                {t && ra?.top && rb?.top ? (
                  <>
                    <Slopegraph a={ra} b={rb} labelA={A.name} labelB={B.name} colorA={colorA} colorB={colorB} />
                    <AnimatePresence mode="wait">
                      <motion.p key={`${ra.top}-${rb.top}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-1.5 text-small text-slate-800">
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
                  <p className="text-caption text-slate-600">Choose a ranked tract on either map.</p>
                )}
              </div>
              <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200/80">
                <PanelTitle sub={flips.size ? `${flips.size} of ${resA.size} ranked tracts, grouped by the change. Demo neighborhoods come first. Click a row to open that tract.` : undefined}>Tracts that change their best match</PanelTitle>
                <FlipList resA={resA} resB={resB} flips={flips} selectedId={selectedId} onSelect={select} />
                <p className="mt-2 text-caption text-slate-600">Dark outlines on both maps mark every tract whose best match changes; a pale wash with a dashed edge marks a close call between the top two types.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </MotionConfig>
  );
}
