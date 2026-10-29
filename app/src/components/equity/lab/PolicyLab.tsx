// Analysis > Equity & policy online: the Policy lab (lib/policylab), the challenge's policy simulator. The left panel
// (LabLevers) is inputs only: the test building and Pittsburgh's housing policies. The map has one meaning (Ye,
// 2026-10-29): green where the test building works under your rules, yellow where it could, red where it doesn't; tracts that changed from today are outlined. The right panel (LabResults) answers in words and numbers. Controls float on the map as on the other tabs. Online only: loaded on demand; the
// offline file keeps EquityPolicyView.
import { Suspense, lazy, useDeferredValue, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { tractById, tractLabel } from '../../../lib/data';
import { downloadCsv, exportFilename, toCsv } from '../../../lib/export/csv';
import type { MapPaint } from '../../../lib/paint';
import { changeClass, costRange, LEVER_LABEL, leverEffects, moved, resultClass, runScenario, START, TODAY, VERDICT_WORD, type LeverEffect, type Scenario, type Summary, type TractOutcome } from '../../../lib/policylab/lab';
import { useApp } from '../../../lib/store';
import { UI } from '../../../lib/copy';
import { mapPadding, useViewport } from '../../../lib/viewport';
import MapView from '../../MapView';
import PanelFrame, { RightColumn } from '../../PanelFrame';
import { FoldButton, SPRING_PANEL, SPRING_TAB } from '../../primitives';
import LabLevers from './LabLevers';
import LabResults from './LabResults';
import { answer, CHANGE_WORD, EVIDENCE, n0, projectName, RESULT_WORD, usdK } from './ui';

const ChatPill = lazy(() => import('../../ChatPill'));

/** The map's classes (Ye, 2026-10-29): green works by right; yellow could work (with a zoning hearing, breaks even
 *  but under the developer's bar, or the money works where the zoning isn't read); red doesn't; grey: no rent on file
 *  or left out by your values. */
const MAP_COLOR = ['#059669', '#facc15', '#e11d48', '#d6d3d1'];
const MAP_WORD = ['Works', 'Could work', 'Doesn’t work', 'No data or left out'];
const mapClass = (t: TractOutcome) => {
  const c = resultClass(t);
  if (c === 'works') return 0;
  if (c === 'hearingWorks' || c === 'close' || (c === 'unread' && t.pencils)) return 1;
  if (c === 'nodata' || c === 'screened') return 3;
  return 2;
};

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
  const set = (p: Partial<Scenario>) => setS((x) => ({ ...x, ...p }));
  const ds = useDeferredValue(s);
  const lite = useApp((x) => x.lite);
  const selectedId = useApp((x) => x.selectedId);
  const base = useMemo(() => runScenario({ ...ds, ...TODAY }), [ds]);
  const run = useMemo(() => runScenario(ds), [ds]);
  const fx = useMemo(() => leverEffects(ds, run), [ds, run]);
  const range = useMemo(() => costRange(ds), [ds]);
  const byId = useMemo(() => new Map(run.tracts.map((t) => [t.geoid, t])), [run]);
  const baseById = useMemo(() => new Map(base.tracts.map((t) => [t.geoid, t])), [base]);
  const paint: MapPaint = useMemo(() => ({ kind: 'cat', palette: MAP_COLOR, values: new Map(run.tracts.map((t) => [t.geoid, mapClass(t)])) }), [run]);
  // Outlined: tracts that changed from today (works now, or stopped working).
  const flips = useMemo(() => new Set(run.tracts.filter((t) => mapClass(t) !== mapClass(baseById.get(t.geoid) ?? t)).map((t) => t.geoid)), [run, baseById]);
  const counts = useMemo(() => {
    const c = [0, 0, 0, 0];
    for (const t of run.tracts) c[mapClass(t)] += 1;
    return c;
  }, [run]);
  const facts = useMemo(() => scenarioFacts(ds, base.summary, run.summary, fx, range), [ds, base, run, fx, range]);
  const picked = selectedId ? byId.get(selectedId) : undefined;
  const leftOpen = useApp((x) => x.ui.left);
  const rightOpen = useApp((x) => x.ui.right);
  const setUi = useApp((x) => x.setUi);
  const vp = useViewport();
  const phone = vp.phone;
  const padding = useMemo(() => mapPadding(vp, leftOpen, rightOpen), [vp, leftOpen, rightOpen]);
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
    <div className="relative h-full" data-policy-lab data-active={active ? 'true' : 'false'}>
      <MapView
        paint={paint}
        selectedId={selectedId}
        flips={flips}
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
              {t && o && (
                <>
                  <div className="mt-0.5">
                    <b>{RESULT_WORD[resultClass(t)]}</b>: {t.why}
                  </div>
                  {flips.has(id) && <div className="mt-0.5 text-caption text-white/75">Today: {RESULT_WORD[resultClass(o)].toLowerCase()}</div>}
                </>
              )}
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
                  <p className="text-caption leading-snug text-slate-600 max-sm:hidden">Pick a test building and the rules; the map and results follow.</p>
                </div>
                <FoldButton onClick={() => setUi({ left: false })} label={UI.hidePanel}>
                  <PanelLeftClose className="h-4 w-4" />
                </FoldButton>
              </div>
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
          <div className="font-semibold text-slate-900">Does the test building work?</div>
          {MAP_WORD.map((w, i) =>
            counts[i] ? (
              <div key={w} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: MAP_COLOR[i] }} />
                {w} <span className="text-slate-500 tnum">{counts[i]}</span>
              </div>
            ) : null,
          )}
          {flips.size > 0 && <div className="mt-0.5 text-slate-500">Outlined: {flips.size} changed from today</div>}
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
          <LabResults s={ds} today={base.summary} yours={run.summary} fx={fx} range={range} picked={picked} pickedToday={selectedId ? baseById.get(selectedId) : undefined} facts={facts} />
        </PanelFrame>
      </RightColumn>
      )}
    </div>
  );
}
