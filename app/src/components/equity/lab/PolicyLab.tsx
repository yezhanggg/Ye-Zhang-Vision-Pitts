// Analysis > Equity & policy online: the Policy lab (lib/policylab), the challenge's policy simulator. The left panel
// (LabLevers) sets a test building and Pittsburgh's housing policies; the map shows, per tract, whether the building
// works under your rules, what changed from today, the homes zoning allows by right, or one of the six need measures;
// the right panel (LabResults) answers in words and numbers. The map follows the controls: moving a policy the current
// map does not show switches it to one that does, and changed tracts are outlined. Controls float on the map as on the
// other tabs. Online only: loaded on demand; the offline file keeps EquityPolicyView.
import { Suspense, lazy, useDeferredValue, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { tractById, tractLabel } from '../../../lib/data';
import { MEASURES, buildLegend, measureById, measureValue, type AmiPct } from '../../../lib/equity/measures';
import { downloadCsv, exportFilename, toCsv } from '../../../lib/export/csv';
import { cx } from '../../../lib/format';
import type { MapPaint } from '../../../lib/paint';
import { hud as hudTable, placeById } from '../../../lib/place/data';
import { CHANGE_CLASSES, changeClass, costRange, LEVER_LABEL, leverEffects, moved, RESULT_CLASSES, resultClass, runScenario, START, TODAY, VERDICT_WORD, type LeverEffect, type Scenario, type Summary, type TractOutcome } from '../../../lib/policylab/lab';
import { useApp } from '../../../lib/store';
import { UI } from '../../../lib/copy';
import { mapPadding, useViewport } from '../../../lib/viewport';
import MapView from '../../MapView';
import PanelFrame, { RightColumn } from '../../PanelFrame';
import { FoldButton, SPRING_PANEL, SPRING_TAB } from '../../primitives';
import { Segmented } from '../../place/PlanInputs';
import LabLevers from './LabLevers';
import LabResults from './LabResults';
import { answer, CAP_BINS, CAP_CHANGE, capBin, capChangeBin, CARD, CHANGE_COLOR, CHANGE_WORD, EVIDENCE, FIELD, isNeed, n0, projectName, RESULT_COLOR, RESULT_WORD, SUB, usdK, type Layer } from './ui';

const ChatPill = lazy(() => import('../../ChatPill'));

const LAYER_TITLE: Record<'result' | 'change' | 'capacity', string> = { result: 'Does the test project work?', change: 'What changed from today', capacity: 'Homes allowed by right' };

/** Policies that move the homes allowed by right; the rest move the test project. */
const CAP_KEYS = new Set<keyof Scenario>(['houseLots', 'lots']);
const small = (x: Scenario) => x.type === 'duplex' || x.type === 'triplex' || x.type === 'fourplex';
const upzoned = (x: Scenario) => x.houseLots === 'three' || x.houseLots === 'four';

/** The map follows the controls: keep the map when it shows what the change moves, else switch to one that does. */
function follow(layer: Layer, next: Scenario, prev: Scenario): Layer {
  const changed = (Object.keys(next) as (keyof Scenario)[]).filter((k) => next[k] !== prev[k]);
  if (!changed.length) return layer;
  const cap = changed.some((k) => CAP_KEYS.has(k));
  const project = changed.some((k) => !CAP_KEYS.has(k)) || (changed.includes('houseLots') && small(next) && (upzoned(next) || upzoned(prev)));
  if (layer === 'capacity' && cap) return layer;
  if ((layer === 'result' || layer === 'change') && project) return layer;
  return project ? 'result' : 'capacity';
}

function scenarioFacts(s: Scenario, today: Summary, yours: Summary, fx: LeverEffect[], range: { cheaper: number; dearer: number }): string {
  const a = answer(s, today, yours, range);
  return [
    `POLICY SCENARIO (Pittsburgh, ${yours.tracts} city tracts)`,
    `Test project: ${projectName(s)}, ${s.units} units, ${s.stories} stories. Works at ${s.bar}× equity; building $${s.hardPerSf}/sq ft; parking space $${n0(s.parkingSpace)}.`,
    `Inclusionary: ${s.izWhere === 'off' ? 'off' : `${s.izWhere === 'izo' ? 'IZ-O only' : 'citywide'}, ${Math.round(s.izShare * 100)}% at ${s.izAmi}% AMI from ${s.izMin} units, required`}; height bonus ${s.bonus ? `${Math.round(s.bonus * 100)}% (Bill 2025-1545)` : 'off'}`,
    `Zoning: house lots ${s.houseLots}; lot minimums ${s.lots === 'today' ? 'today' : 'before May 2025'}; parking minimums ${s.parking}`,
    `Funding: abatement $${n0(s.abatement)} a home a year; gap subsidy $${n0(s.subsidy)} a home with an income limit; PHFA plan ${s.plan}. Infrastructure: frequent bus on every line ${s.frequentBus ? 'on' : 'off'}`,
    `Screens (values): displacement ${s.displacement ? 'on' : 'off'}; transit ${s.transitMi == null ? 'none' : `${s.transitMi} mi`}; flood ${s.flood ? 'on' : 'off'}`,
    'ANSWER',
    a.lead,
    ...a.lines,
    'RESULTS today → yours',
    `Tracts where it works by right: ${today.works} → ${yours.works}; with a zoning hearing ${today.worksHearing} → ${yours.worksHearing}; breaks even ${today.breakEven} → ${yours.breakEven}; allowed by right ${today.allowed} → ${yours.allowed}; zoning not read ${yours.unread} (money works in ${yours.unreadPencils}, not counted)`,
    `Set-aside asked in ${today.asked} → ${yours.asked} tracts (${n0(today.askedHomes)} → ${n0(yours.askedHomes)} homes with an income limit across the test buildings)`,
    `Homes allowed by right: ${n0(today.capacity)} → ${n0(yours.capacity)}; homes with an income limit in the working test buildings: ${n0(today.affordable)} → ${n0(yours.affordable)}`,
    `Median gap a unit where it falls short: ${today.medianGap == null ? 'none' : usdK(today.medianGap)} → ${yours.medianGap == null ? 'none' : usdK(yours.medianGap)}`,
    `Who gains: income-limited homes at high displacement risk ${today.riskAffordable} → ${yours.riskAffordable}; market-only projects there ${today.riskMarketOnly} → ${yours.riskMarketOnly}`,
    `Climate: working tracts near frequent transit ${today.nearTransit} → ${yours.nearTransit}; in a flood zone ${today.inFlood} → ${yours.inFlood}`,
    'EACH POLICY (your rules with and without it)',
    ...fx.map((f) => `${LEVER_LABEL[f.id]}: ${VERDICT_WORD[f.verdict]}. ${f.sentence}`),
    moved(s, 'iz') ? EVIDENCE.text : '',
  ].filter(Boolean).join('\n');
}

export default function PolicyLab({ active = true }: { active?: boolean }) {
  const [s, setS] = useState<Scenario>(START);
  const [layer, setLayer] = useState<Layer>('result');
  const [ami, setAmi] = useState<AmiPct>(50);
  const set = (p: Partial<Scenario>) => {
    const next = { ...s, ...p };
    setLayer((l) => follow(l, next, s));
    setS(next);
  };
  const ds = useDeferredValue(s);
  const lite = useApp((x) => x.lite);
  const selectedId = useApp((x) => x.selectedId);
  const base = useMemo(() => runScenario({ ...ds, ...TODAY }), [ds]);
  const run = useMemo(() => runScenario(ds), [ds]);
  const fx = useMemo(() => leverEffects(ds, run), [ds, run]);
  const range = useMemo(() => costRange(ds), [ds]);
  const byId = useMemo(() => new Map(run.tracts.map((t) => [t.geoid, t])), [run]);
  const baseById = useMemo(() => new Map(base.tracts.map((t) => [t.geoid, t])), [base]);
  const capChanged = run.summary.capacity !== base.summary.capacity;
  const need = useMemo(() => {
    if (!isNeed(layer)) return null;
    const def = measureById.get(layer)!;
    const values = [...placeById].map(([g, p]) => ({ id: g, value: measureValue(layer, p, hudTable, ami) }));
    const legend = buildLegend(def, values.map((v) => v.value).filter((v): v is number => v != null));
    const byGeoid = new Map(values.map((v) => [v.id, v.value]));
    const ranked = values.filter((v) => v.value != null).sort((a, b) => (def.higherIsNeed ? b.value! - a.value! : a.value! - b.value!));
    return { def, legend, byGeoid, ranked };
  }, [layer, ami]);
  const classOf = useMemo(() => {
    const today = (t: TractOutcome) => baseById.get(t.geoid) ?? t;
    if (layer === 'change') return (t: TractOutcome) => CHANGE_CLASSES.indexOf(changeClass(today(t), t));
    if (layer === 'capacity') return capChanged ? (t: TractOutcome) => capChangeBin(t.capacity - today(t).capacity) : (t: TractOutcome) => capBin(t.capacity);
    return (t: TractOutcome) => RESULT_CLASSES.indexOf(resultClass(t));
  }, [layer, capChanged, baseById]);
  const { palette, words } = useMemo(
    () =>
      layer === 'change'
        ? { palette: CHANGE_CLASSES.map((c) => CHANGE_COLOR[c]), words: CHANGE_CLASSES.map((c) => CHANGE_WORD[c]) }
        : layer === 'capacity'
          ? capChanged
            ? { palette: CAP_CHANGE.colors, words: CAP_CHANGE.words }
            : { palette: CAP_BINS.colors, words: CAP_BINS.words }
          : { palette: RESULT_CLASSES.map((c) => RESULT_COLOR[c]), words: RESULT_CLASSES.map((c) => RESULT_WORD[c]) },
    [layer, capChanged],
  );
  const paint: MapPaint = useMemo(
    () => (need ? { kind: 'cat', palette: need.legend.colors, values: new Map([...need.byGeoid].map(([g, v]) => [g, need.legend.classOf(v)])) } : { kind: 'cat', palette, values: new Map(run.tracts.map((t) => [t.geoid, classOf(t)])) }),
    [run, need, classOf, palette],
  );
  // Outlined on the result map: tracts whose class changed from today (the other maps show the change itself).
  const flips = useMemo(() => (layer === 'result' ? new Set(run.tracts.filter((t) => resultClass(t) !== resultClass(baseById.get(t.geoid) ?? t)).map((t) => t.geoid)) : null), [layer, run, baseById]);
  const counts = useMemo(() => {
    const c = new Map<number, number>();
    for (const t of run.tracts) c.set(classOf(t), (c.get(classOf(t)) ?? 0) + 1);
    return c;
  }, [run, classOf]);
  const facts = useMemo(() => scenarioFacts(ds, base.summary, run.summary, fx, range), [ds, base, run, fx, range]);
  const picked = selectedId ? byId.get(selectedId) : undefined;
  const leftOpen = useApp((x) => x.ui.left);
  const rightOpen = useApp((x) => x.ui.right);
  const setUi = useApp((x) => x.setUi);
  const vp = useViewport();
  const phone = vp.phone;
  const padding = useMemo(() => mapPadding(vp, leftOpen, rightOpen), [vp, leftOpen, rightOpen]);
  const layerLine = need
    ? 'Need today, from public data. Policies don’t change this map.'
    : layer === 'result'
      ? 'Each tract: does the test project work under your rules? “Short” is the subsidy a unit it would need. Outlined: changed from today.'
      : layer === 'change'
        ? 'Each tract: is the test project better or worse off than under today’s rules?'
        : capChanged
          ? 'Each tract: the change from today in homes allowed by right (vacant and house lots).'
          : 'Each tract: homes zoning allows by right on vacant lots and house lots.';
  const exportCsv = () => {
    const rows = run.tracts.map((t) => {
      const o = baseById.get(t.geoid);
      return { ...t, name: tractLabel(tractById.get(t.geoid)), today: o ? RESULT_WORD[resultClass(o)] : '', yours: RESULT_WORD[resultClass(t)], change: o ? CHANGE_WORD[changeClass(o, t)] : '', zoning: t.zoning.status, zoningLots: t.zoning.lots, capacityToday: o?.capacity ?? '', near: t.nearTransit ? 'yes' : 'no', risk: t.highRisk ? 'high' : '' };
    });
    const cols = [
      { key: 'geoid', label: 'Tract' },
      { key: 'name', label: 'Place' },
      { key: 'today', label: 'Today' },
      { key: 'yours', label: 'Your rules' },
      { key: 'change', label: 'Change' },
      { key: 'why', label: 'Why' },
      { key: 'units', label: 'Units' },
      { key: 'affordable', label: 'Homes with an income limit' },
      { key: 'multiple', label: 'Return (× equity)', format: (v: unknown) => (typeof v === 'number' ? v.toFixed(2) : '') },
      { key: 'gap', label: 'Gap a unit ($)', format: (v: unknown) => (typeof v === 'number' ? String(Math.round(v)) : '') },
      { key: 'zoning', label: 'Zoning (by right: yes / hearing / no / unknown)' },
      { key: 'zoningLots', label: 'Lots allowing it by right' },
      { key: 'capacityToday', label: 'Homes by right today' },
      { key: 'capacity', label: 'Homes by right, your rules' },
      { key: 'near', label: `Frequent transit within ½ mile` },
      { key: 'risk', label: 'Displacement risk' },
    ];
    downloadCsv(exportFilename('policy-lab', 'scenario', 'csv'), toCsv(rows as unknown as Record<string, unknown>[], cols));
  };

  return (
    <div className="relative h-full" data-policy-lab data-active={active ? 'true' : 'false'} data-layer={layer}>
      <MapView
        paint={paint}
        selectedId={selectedId}
        flips={need ? null : flips}
        lite={lite}
        terrain={false}
        buildings={false}
        hillshade={false}
        padding={padding}
        onSelect={(id) => useApp.getState().select(useApp.getState().selectedId === id ? null : id)}
        // A city-wide map: picking a tract keeps the city in view instead of flying to street level.
        onMapReady={(m) => m.setMaxZoom(12.5)}
        tooltip={(id) => {
          const t = byId.get(id);
          const o = baseById.get(id);
          return (
            <div className="max-w-64">
              <div className="font-semibold">{tractLabel(tractById.get(id))}</div>
              {need ? (
                <div className="mt-0.5">
                  {need.def.short}: <b>{need.def.fmt(need.byGeoid.get(id) ?? null)}</b>
                </div>
              ) : t && o ? (
                layer === 'capacity' ? (
                  <div className="mt-0.5">
                    Homes by right: {capChanged ? `${n0(o.capacity)} today → ` : ''}
                    <b>{n0(t.capacity)}</b>
                  </div>
                ) : layer === 'change' ? (
                  <>
                    <div className="mt-0.5">
                      <b>{CHANGE_WORD[changeClass(o, t)]}</b>: {RESULT_WORD[resultClass(o)].toLowerCase()} today, {RESULT_WORD[resultClass(t)].toLowerCase()} with yours
                    </div>
                    {o.multiple != null && t.multiple != null && <div className="text-caption text-white/75">Return {o.multiple.toFixed(2)}× → {t.multiple.toFixed(2)}×</div>}
                  </>
                ) : (
                  <>
                    <div className="mt-0.5">
                      <b>{RESULT_WORD[resultClass(t)]}</b>: {t.why}
                    </div>
                    {flips?.has(id) && <div className="mt-0.5 text-caption text-white/75">Today: {RESULT_WORD[resultClass(o)].toLowerCase()}</div>}
                  </>
                )
              ) : null}
            </div>
          );
        }}
      />
      <AnimatePresence initial={false} mode="popLayout">
        {leftOpen ? (
          <motion.aside key="rail" style={{ transformOrigin: 'top left', width: phone ? undefined : 440 }} initial={{ opacity: 0, scale: 0.9, x: -14, filter: 'blur(6px)' }} animate={{ opacity: 1, scale: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.92, x: -14, filter: 'blur(6px)', transition: { duration: 0.18, ease: 'easeIn' } }} transition={SPRING_PANEL} className="absolute left-3 top-16 z-20 flex max-h-[calc(100%-4.75rem-12.5rem)] flex-col rounded-2xl bg-white/95 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.25)] ring-1 ring-black/5 backdrop-blur max-[1099px]:top-[7.25rem] max-sm:right-3 max-sm:w-auto max-sm:!max-h-[40vh]" aria-label="Policy lab controls">
            <div className="space-y-2 border-b border-stone-200/80 px-3 pb-2.5 pt-2.5">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-display text-body font-bold text-slate-900">Policy lab</div>
                  <p className="text-caption leading-snug text-slate-600 max-sm:hidden">Test a housing policy across Pittsburgh: pick a test building and the rules. The map and the results follow.</p>
                </div>
                <FoldButton onClick={() => setUi({ left: false })} label={UI.hidePanel}>
                  <PanelLeftClose className="h-4 w-4" />
                </FoldButton>
              </div>
              <label className="block">
                <span className="text-caption font-medium text-slate-600">The map shows</span>
                <select className={cx(FIELD, 'mt-0.5')} value={layer} onChange={(e) => setLayer(e.target.value as Layer)} aria-label="The map shows">
                  <optgroup label="Your rules">
                    {(['result', 'change', 'capacity'] as const).map((k) => (
                      <option key={k} value={k}>
                        {LAYER_TITLE[k]}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Need today (data)">
                    {MEASURES.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.short}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
              <p className="text-caption leading-snug text-slate-500 max-sm:hidden">{layerLine}</p>
              {(layer === 'rent_gap' || layer === 'burdened') && <Segmented label="Income" options={[30, 50, 80, 100] as AmiPct[]} value={ami} onChange={setAmi} text={(v) => (v === 100 ? 'Market' : `≤${v}%`)} cols={4} />}
              {phone && (
                <button type="button" onClick={() => setUi({ left: false })} className="block text-caption font-medium text-violet-700 hover:text-violet-800">
                  See the results
                </button>
              )}
            </div>
            <div className="scroll-quiet relative min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3">
              <LabLevers s={s} set={set} />
              <button type="button" onClick={exportCsv} className="mt-2 block text-caption font-medium text-violet-700 hover:text-violet-800">
                Download CSV (every tract, today and yours)
              </button>
            </div>
          </motion.aside>
        ) : (
          <motion.div key="rail-tab" style={{ transformOrigin: 'top left' }} initial={{ opacity: 0, scale: 0.6, x: -8 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.12 } }} transition={SPRING_TAB} className="absolute left-3 top-16 z-20 max-[1099px]:top-[7.25rem]">
            <motion.button onClick={() => setUi({ left: true })} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }} transition={SPRING_TAB} className="flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-small font-semibold text-slate-800 shadow-lg ring-1 ring-black/5 backdrop-blur hover:bg-white" aria-label={UI.showPanel} title={UI.showPanel}>
              <PanelLeftOpen className="h-4 w-4 text-slate-600" />
              Policy lab
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="absolute bottom-3 left-3 z-20 max-sm:hidden" data-lab-legend>
        <div className="rounded-lg bg-white/95 px-2.5 py-1.5 text-caption text-slate-700 shadow-sm ring-1 ring-stone-200">
          {need ? (
            <>
              <div className="font-semibold text-slate-900">
                {need.def.title} ({need.def.unit})
              </div>
              {need.legend.items.map((it) => (
                <div key={it.label} className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: it.color }} />
                  {it.label}
                </div>
              ))}
              <div className="mt-0.5 text-slate-500">Policies don’t change this map.</div>
            </>
          ) : (
            <>
              <div className="font-semibold text-slate-900">{layer === 'capacity' && capChanged ? 'Homes allowed by right: change from today' : LAYER_TITLE[layer as 'result']}</div>
              {words.map((w, i) =>
                counts.get(i) ? (
                  <div key={w} className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: palette[i] }} />
                    {w} <span className="text-slate-500 tnum">{counts.get(i)}</span>
                  </div>
                ) : null,
              )}
              {flips && flips.size > 0 && <div className="mt-0.5 text-slate-500">Outlined: {flips.size} changed from today</div>}
            </>
          )}
        </div>
      </div>
      {/* On a phone the controls and the results take turns, so the map stays in view. */}
      {!(phone && leftOpen) && (
      <RightColumn>
        {active && (
          <Suspense fallback={null}>
            <ChatPill extraFacts={facts} />
          </Suspense>
        )}
        <PanelFrame inline title="Results">
          <LabResults s={ds} today={base.summary} yours={run.summary} fx={fx} range={range} picked={picked} pickedToday={selectedId ? baseById.get(selectedId) : undefined} facts={facts}>
            {need && (
              <section className={CARD} data-lab-need>
                <h3 className="text-small font-semibold text-slate-900">Where need is: {need.def.short}</h3>
                <p className="mt-0.5 text-caption leading-snug text-slate-600">{need.def.definition(ami)}</p>
                <div className={cx(SUB, 'mt-2')}>Most need</div>
                <ol className="mt-1 space-y-0.5 text-small text-slate-800">
                  {need.ranked.slice(0, 5).map((v, i) => (
                    <li key={v.id} className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate">
                        {i + 1}. {tractLabel(tractById.get(v.id))}
                      </span>
                      <span className="font-semibold tnum">{need.def.fmt(v.value)}</span>
                    </li>
                  ))}
                </ol>
                {selectedId && need.byGeoid.has(selectedId) && (
                  <p className="mt-1.5 text-caption text-slate-700">
                    {tractLabel(tractById.get(selectedId))}: <b className="font-semibold">{need.def.fmt(need.byGeoid.get(selectedId) ?? null)}</b>, {need.ranked.findIndex((v) => v.id === selectedId) + 1} of {need.ranked.length}.
                  </p>
                )}
              </section>
            )}
          </LabResults>
        </PanelFrame>
      </RightColumn>
      )}
    </div>
  );
}
