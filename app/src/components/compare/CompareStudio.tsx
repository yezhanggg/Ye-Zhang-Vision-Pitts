// Analysis > Compare places as three strips: place A on the left and place B on the right, each with its map on top
// (colored under that side's screens and income level) and its inputs underneath (the Place tab's flat sections: the
// project, the mix and income, the site, the policies and screens, open space, the pencil), and
// the comparison in the middle: at a glance, what each place would get, why they differ and the project
// in each place. Side A uses the Place tab's settings; side B
// shares them or, with "Separate settings", keeps its own (lib/compare/store, lib/project/side). So it reads two
// places under one set of settings, two places under two, or one place under two.
// Loaded on demand: the offline single file keeps CompareTractsView, and so do phones, which have no room for three
// columns.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { rankedTracts, scoring, tractById, tractLabel, typologyById } from '../../lib/data';
import { compareTakeaway, fLabel, stabilityFor, tLabel, useAllResults } from '../../lib/derived';
import { TYPOLOGY_COLORS, type MapPaint } from '../../lib/paint';
import { presetWeights, useApp } from '../../lib/store';
import { cx } from '../../lib/format';
import { pctShort } from '../../lib/copy';
import { compareMessage, compareState, factorDeltasSafe } from '../../lib/analysis/compare';
import { rationale } from '../../lib/analysis/rationale';
import { setSeparate, useCompare } from '../../lib/compare/store';
import { amiWords } from '../../lib/equity/measures';
import { buildCompareReport, GLANCE_COLUMNS, glanceCsvRows, type CompareReportInput } from '../../lib/export/builders/compare';
import { downloadCsv, exportFilename, toCsv } from '../../lib/export/csv';
import { getMap, registerMap } from '../../lib/export/mapRegistry';
import { mapSnapshot, printReport } from '../../lib/export/report';
import { hasPlaceData, hud as hudTable, placeById } from '../../lib/place/data';
import { fmtDollars } from '../../lib/place/format';
import { isSeniorAge, LEVEL_LABEL, type PlanLevel } from '../../lib/place/plan';
import { STANCE_LABEL } from '../../lib/place/thresholds';
import { usePlan } from '../../lib/place/planStore';
import type { Recommendation } from '../../lib/place/recommend';
import type { Typology } from '../../lib/place/types';
import { useDemandScores } from '../../lib/place/useDemandScores';
import { whyTheyDiffer } from '../../lib/place/whyDiffer';
import { SIDE_A, SIDE_B, SideContext, usePlanB, usePolicyB, type Side } from '../../lib/project/side';
import { composeAll, screensWords } from '../../lib/policy/compose';
import { usePolicy, type PolicyState } from '../../lib/policy/store';
import { swapStance } from '../../lib/policy/report';
import { useViewport } from '../../lib/viewport';
import CompareTractsView, { COLOR_A, COLOR_B, MapChip, SCORING_CAVEAT, Side as SideRanking, SuggestTip, SwapIcon, wordsOnly } from '../CompareTractsView';
import FactorDeltaBars from '../FactorDeltaBars';
import MapView, { makeSyncGroup } from '../MapView';
import ChatPill from '../ChatPill';
import TractSearch from '../TractSearch';
import PanelTitle from '../analysis/PanelTitle';
import ExportMenu from '../export/ExportMenu';
import { FlatInputsFor, type SectionId } from '../place/flat/FlatInputs';
import { Chevron, Dot, Segmented } from '../primitives';
import { GLANCE_GRID, GROUPS, Measure, PlaceHead, SectionHead, Value, WhyParagraphs, getsCells, glanceFlag, glanceRows, type GetsCells, type SideInfo } from './CompareBlocks';
import CompareProject from './CompareProject';
import SuggestLegendBar from './SuggestLegendBar';

const TYPOLOGY_INDEX = new Map(scoring.typologies.map((t, i) => [t.id, i]));

/** The types that pass one side's screens in every place (the Place tab's rules, lib/policy/compose). */
function suggestionsFor(level: PlanLevel, senior: boolean, policy: PolicyState, fitOrders: Map<string, Typology[]>, demand: ReturnType<typeof useDemandScores>): Map<string, Recommendation> {
  if (!hasPlaceData || !hudTable) return new Map();
  return new Map([...composeAll(placeById, hudTable, { level, senior }, policy, fitOrders, demand)].map(([id, c]) => [id, c.rec]));
}

/** One map's colors (the suggested type) and the counts its legend lists. */
function paintOf(suggestions: Map<string, Recommendation>): { paint: MapPaint; counts: Record<string, number> } {
  const values = new Map<string, number | null>();
  const counts: Record<string, number> = { none: 0, missing: 0 };
  for (const t of rankedTracts) {
    const rec = suggestions.get(t.GEOID);
    const lead = rec?.types[0]?.typology ?? null;
    values.set(t.GEOID, lead ? (TYPOLOGY_INDEX.get(lead) ?? null) : null);
    const key = lead ?? (rec && rec.stanceTest.passed === null && !rec.floodLimit?.blocked ? 'missing' : 'none');
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return { paint: { kind: 'cat', palette: TYPOLOGY_COLORS, values }, counts };
}

const noneLabel = (level: PlanLevel) => (level === 'market' ? 'the market test fails or cannot run' : 'no under-served renters at this level, or a screen rules it out');

const settingsWords = (policy: PolicyState, level: PlanLevel) => `${screensWords(policy)} · ${LEVEL_LABEL[level]}`;
/** The fit order's weights: the published equal-weights reference, as on the Place tab. */
const FIT_WEIGHTS = presetWeights('balanced');

// ------------------------------------------------------------------------------------------------- results blocks

/** At a glance, with each side's own income level (the rent rows read at each side's level when they differ). */
function Glance({ A, B, levelA, levelB }: { A: SideInfo; B: SideInfo; levelA: PlanLevel; levelB: PlanLevel }) {
  const ga = A.t?.GEOID ?? null;
  const gb = B.t?.GEOID ?? null;
  const x = glanceRows(A.p, B.p, hudTable, levelA, ga, gb);
  const y = levelA === levelB ? x : glanceRows(A.p, B.p, hudTable, levelB, ga, gb);
  const split = x !== y;
  const gap = (label: string) => /^Rent gap/.test(label);
  const rows = x.rows.map((r, i) => (split && gap(r.label) ? { ...r, b: y.rows[i].b, neutral: true, label: 'Rent gap (asking − fits), each at its own level' } : split ? { ...r, b: y.rows[i].b } : r));
  const fitsText = (f: typeof x.fits) => (f ? `${fmtDollars(f.rent)}/mo` : 'not available');

  const line = (i: number | 'fits') => {
    if (i === 'fits')
      return (
        <div key="fits" className={cx(GLANCE_GRID, 'min-h-[30px]')}>
          <Measure label={split ? '2-bedroom rent that fits' : `2-bedroom rent that fits at ${amiWords(x.ami)}`} note={split ? `A at ${amiWords(x.ami)}, B at ${amiWords(y.ami)}` : 'same in both, HUD limit'} title={x.fits ? x.fits.formula : 'HUD table not loaded'} />
          <Value text={fitsText(x.fits)} muted={!x.fits} />
          <Value text={fitsText(y.fits)} muted={!y.fits} />
        </div>
      );
    const r = rows[i];
    const f = glanceFlag(r);
    const val = (v: number | null, side: 'a' | 'b', s: SideInfo) => <Value text={v == null ? (r.na ?? 'not available') : r.fmt(v)} muted={v == null} shade={f === side} color={s.color} />;
    return (
      <div key={r.label} className={cx(GLANCE_GRID, 'min-h-[30px]')}>
        <Measure label={r.label} note={r.dir} />
        {val(r.a, 'a', A)}
        {val(r.b, 'b', B)}
      </div>
    );
  };

  return (
    <div>
      <div className={cx(GLANCE_GRID, 'items-end')}>
        <div className="pb-1 text-caption text-slate-500">Measure</div>
        <PlaceHead s={A} />
        <PlaceHead s={B} />
      </div>
      {GROUPS.map((g) => (
        <div key={g.label}>
          <div className="pb-0.5 pt-3 text-[11px] uppercase tracking-wide text-slate-500">{g.label}</div>
          <div className="divide-y divide-stone-200/70 border-y border-stone-200/70">{g.idx.map(line)}</div>
        </div>
      ))}
      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        Shading marks the place with more need, better access or less flood land, in that place's color. Sources: CHAS 2018–22, Dewey listings, HUD FY2026, PRT GTFS, FEMA NFHL, LODES 2023, OpenStreetMap, county property assessments 2026, city zoning districts.
      </p>
    </div>
  );
}

/** What each place would get, each under its own side's settings. */
function Gets({ A, B, levelA, levelB }: { A: SideInfo; B: SideInfo; levelA: PlanLevel; levelB: PlanLevel }) {
  const a = getsCells(A, levelA);
  const b = getsCells(B, levelB);
  const rowsOf: { label: string; k: keyof GetsCells }[] = [
    { label: 'Suggested type', k: 'type' },
    { label: 'Home size', k: 'size' },
    { label: 'Rent that fits', k: 'rent' },
    { label: 'Who it serves', k: 'who' },
  ];
  const grid = 'grid grid-cols-[104px_minmax(0,1fr)_minmax(0,1fr)] gap-x-4';
  return (
    <div>
      <div className={cx(grid, 'items-end')}>
        <div className="pb-1 text-caption text-slate-500" />
        <PlaceHead s={A} align="left" />
        <PlaceHead s={B} align="left" />
      </div>
      <div className="divide-y divide-stone-200/70 border-b border-stone-200/70">
        {rowsOf.map((r) => (
          <div key={r.k} className={cx(grid, 'min-h-[30px] py-1.5')}>
            <div className="text-small leading-snug text-slate-600">{r.label}</div>
            <div className="min-w-0 text-small leading-snug">{a[r.k]}</div>
            <div className="min-w-0 text-small leading-snug">{b[r.k]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------------ the inputs

/** One side's inputs: the Place tab's flat sections, for this side's place (or only some of them). */
function SideInputs({ side, info, only }: { side: Side; info: SideInfo; only?: SectionId[] }) {
  return (
    <SideContext.Provider value={side}>
      {info.t && info.p && hudTable ? (
        <FlatInputsFor key={info.t.GEOID} t={info.t} place={info.p} hud={hudTable} rec={info.rec} only={only} />
      ) : (
        <p className="text-caption text-slate-600">Pick place {info.tag} above the map to test a project there.</p>
      )}
    </SideContext.Provider>
  );
}

/** One place's strip: its search, its map on top, the map's legend, then the inputs for that place underneath. */
function Strip({ info, search, map, legend, tour, children }: { info: SideInfo; search: ReactNode; map: ReactNode; legend: ReactNode; tour?: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-1 flex-col gap-2" aria-label={`Place ${info.tag}`} data-tour={tour}>
      {search}
      <div className="relative shrink-0 overflow-hidden rounded-xl ring-1 ring-black/5" style={{ height: '40%', minHeight: 220 }}>
        {map}
      </div>
      {legend}
      <div className="scroll-quiet min-h-0 flex-1 space-y-2.5 overflow-y-auto rounded-xl bg-white p-3 ring-1 ring-stone-200/80">{children}</div>
    </section>
  );
}

const MAP_PAD = { top: 50, bottom: 50, left: 40, right: 40 };

// -------------------------------------------------------------------------------------------------------- the view

export default function CompareStudio({ active = true }: { active?: boolean }) {
  return useViewport().phone ? <CompareTractsView active={active} /> : <Studio active={active} />;
}

function Studio({ active }: { active: boolean }) {
  const a = useApp((s) => s.selectedId);
  const b = useApp((s) => s.compareId);
  const pin = useApp((s) => s.pin);
  const lite = useApp((s) => s.lite);
  const { set } = useApp.getState();
  const separate = useCompare((s) => s.separate);
  const planA = usePlan();
  const planB = usePlanB();

  const policyA = usePolicy();
  const policyB0 = usePolicyB();
  const policyB = separate ? policyB0 : policyA;
  const levelA = planA.level as PlanLevel;
  const levelB = (separate ? planB.level : planA.level) as PlanLevel;
  const seniorA = isSeniorAge(planA.age);
  const seniorB = separate ? isSeniorAge(planB.age) : seniorA;
  const sideB: Side = separate ? SIDE_B : SIDE_A;

  // Both sides order types with the same reference weights; the screens and the income level decide the set.
  const weights = FIT_WEIGHTS;
  const results = useAllResults(FIT_WEIGHTS);
  const fitOrders = useMemo(() => new Map([...results].map(([id, r]) => [id, r.ranking as Typology[]])), [results]);
  const demand = useDemandScores();
  const sugA = useMemo(() => suggestionsFor(levelA, seniorA, policyA, fitOrders, demand), [levelA, seniorA, policyA, fitOrders, demand]);
  const sugB = useMemo(() => (separate ? suggestionsFor(levelB, seniorB, policyB, fitOrders, demand) : sugA), [separate, levelB, seniorB, policyB, fitOrders, demand, sugA]);
  const mapA = useMemo(() => paintOf(sugA), [sugA]);
  const mapB = useMemo(() => (sugB === sugA ? mapA : paintOf(sugB)), [sugA, sugB, mapA]);

  const ta = a ? (tractById.get(a) ?? null) : null;
  const tb = b ? (tractById.get(b) ?? null) : null;
  const ra = a ? (results.get(a) ?? null) : null;
  const rb = b ? (results.get(b) ?? null) : null;
  const recA = a ? (sugA.get(a) ?? null) : null;
  const recB = b ? (sugB.get(b) ?? null) : null;
  const same = !!a && a === b;
  const raA = useMemo(() => (ta && ra ? rationale(ta, ra, weights) : null), [ta, ra, weights]);
  const raB = useMemo(() => (tb && rb ? rationale(tb, rb, weights) : null), [tb, rb, weights]);
  const state = compareState(ta, tb, ra, rb, weights);
  const message = same ? null : compareMessage(state, ta, tb);
  const pair = useMemo(() => (!same && state === 'ok' && ta && tb && ra && rb ? { ta, tb, ra, rb } : null), [same, state, ta, tb, ra, rb]);
  const ok = !!pair;
  const topA = ra?.top ?? null;
  const topB = rb?.top ?? null;
  const [basisChoice, setBasisChoice] = useState<string | null>(null);
  const basis = ok && basisChoice && (basisChoice === topA || basisChoice === topB) ? basisChoice : (topA ?? topB);
  const rows = useMemo(() => (pair ? factorDeltasSafe(pair.ta, pair.tb, pair.ra, pair.rb, basis ?? undefined) : []), [pair, basis]);
  const takeaway = same
    ? 'The same place on both sides: its measures match, so what differs is what each set of settings suggests and how the project does.'
    : wordsOnly(message ?? (pair ? compareTakeaway(pair.ta, pair.tb, pair.ra, pair.rb) : compareMessage('need_two', ta, tb)!));
  const why = useMemo(() => {
    if (!ta || !tb) return [];
    const A = { name: tractLabel(ta), p: placeById.get(ta.GEOID) ?? null, rec: recA };
    const B = { name: tractLabel(tb), p: placeById.get(tb.GEOID) ?? null, rec: recB };
    const rowsA = whyTheyDiffer(A, B, levelA);
    if (levelA === levelB) return rowsA;
    // Each side's renters counted at its own level; the sentence setting the two counts side by side is dropped.
    const rowsB = whyTheyDiffer(A, B, levelB);
    return rowsA.map((r) => (r.topic === 'Who needs homes' ? { ...r, b: rowsB.find((x) => x.topic === r.topic)?.b ?? r.b, both: undefined } : r));
  }, [ta, tb, recA, recB, levelA, levelB]);
  const [detail, setDetail] = useState(false);
  const sa = useMemo(() => (a && detail ? stabilityFor(a, weights) : null), [a, weights, detail]);
  const sb = useMemo(() => (b && detail ? stabilityFor(b, weights) : null), [b, weights, detail]);
  const basisLabel = tLabel(basis);

  // Each map is controlled on its own unless the reader links their zoom (remembered in this browser).
  const [mapSync, setMapSync] = useState<boolean>(() => {
    try {
      return localStorage.getItem('visionpitts.compare.mapSync') === '1';
    } catch {
      return false;
    }
  });
  const toggleMapSync = () =>
    setMapSync((v) => {
      try {
        localStorage.setItem('visionpitts.compare.mapSync', v ? '0' : '1');
      } catch {
        /* storage blocked: the switch still works for this visit */
      }
      return !v;
    });

  const A: SideInfo = { tag: 'A', color: COLOR_A, t: ta, p: a ? (placeById.get(a) ?? null) : null, rec: recA };
  const B: SideInfo = { tag: 'B', color: COLOR_B, t: tb, p: b ? (placeById.get(b) ?? null) : null, rec: recB };
  const chipSub = (t: typeof ta, rec: Recommendation | null, policy: PolicyState, level: PlanLevel) => {
    if (!t) return 'Choose a place above the map';
    const lead = rec?.types[0]?.typology ?? null;
    const head = separate ? <span className="block">{settingsWords(policy, level)}</span> : null;
    if (!lead)
      return (
        <>
          {head}
          {!t.residential ? 'Not ranked (fewer than 25 households)' : 'No suggestion at this level'}
        </>
      );
    return (
      <>
        {head}
        <span className="inline-flex items-center gap-1">
          <Dot color={typologyById.get(lead)?.color ?? '#64748b'} size={8} />
          Suggested: {typologyById.get(lead)?.label ?? lead}
        </span>
      </>
    );
  };
  const leadColor = (rec: Recommendation | null) => (rec?.types[0] ? (typologyById.get(rec.types[0].typology)?.color ?? null) : null);

  // Export: the comparison report (PDF via print) and the At-a-glance rows as CSV. With separate settings each side's
  // settings ride on its name line; the report's header names side A's.
  const exportInput = (): CompareReportInput | null => {
    if (!ta || !tb) return null;
    const g = glanceRows(A.p, B.p, hudTable, levelA, ta.GEOID, tb.GEOID);
    const subsidyShort = (x: number) => (x >= 0.75 ? 'fully eligible' : x >= 0.25 ? 'partly eligible' : 'not eligible');
    const val = (x: number | null, f: string) => (x == null ? 'no data' : f === 'subsidy_eligible' ? subsidyShort(x) : pctShort(x));
    const sub = (name: string, policy: PolicyState, level: PlanLevel) => (separate ? `${name} · ${settingsWords(policy, level)}` : name);
    return {
      a: { name: tractLabel(ta), sub: sub(ta.name, policyA, levelA), geoid: ta.GEOID, rec: recA },
      b: { name: tractLabel(tb), sub: sub(tb.name, policyB, levelB), geoid: tb.GEOID, rec: recB },
      focus: recA?.stance ?? 'anti_displacement',
      level: levelA,
      glance: g.rows,
      fits: g.fits ? { rent: g.fits.rent, formula: g.fits.formula } : null,
      ami: g.ami,
      takeaway: ok ? `${SCORING_CAVEAT} ${takeaway}` : takeaway,
      why,
      basis: ok ? basisLabel : null,
      factors: pair
        ? rows.map((r) => ({
            label: fLabel(r.factor),
            a: val(r.a, r.factor),
            b: val(r.b, r.factor),
            favors: r.gap == null || Math.abs(r.gap) < 0.002 ? null : r.gap > 0 ? ('A' as const) : ('B' as const),
          }))
        : [],
      typeLabel: (k) => typologyById.get(k)?.label ?? k,
    };
  };
  const exportSlug = ta && tb ? `${tractLabel(ta)} vs ${tractLabel(tb)}` : '';
  const exportMenu = (
    <ExportMenu
      items={[
        {
          label: 'Report (PDF)',
          hint: ta && tb ? 'Both places, the tables and both maps' : 'Choose two places first',
          disabled: !ta || !tb,
          onSelect: async () => {
            const input = exportInput();
            if (!input) return;
            const crop = { top: 0, bottom: 0, left: 0, right: 0 };
            const mA = await mapSnapshot(getMap('compare-a'), { crop });
            const mB = await mapSnapshot(getMap('compare-b'), { crop });
            printReport(swapStance(buildCompareReport({ ...input, maps: { a: mA, b: mB }, filename: exportFilename('comparison', exportSlug, 'pdf') }), STANCE_LABEL[input.focus], separate ? `A ${screensWords(policyA)}, B ${screensWords(policyB)}` : screensWords(policyA)));
          },
        },
        {
          label: 'Data (CSV)',
          hint: ta && tb ? 'At-a-glance rows, A and B columns' : 'Choose two places first',
          disabled: !ta || !tb,
          onSelect: () => {
            const input = exportInput();
            if (!input) return;
            downloadCsv(exportFilename('comparison', exportSlug, 'csv'), toCsv(glanceCsvRows(input), GLANCE_COLUMNS));
          },
        },
      ]}
    />
  );

  const layers = useApp((s) => s.layers);
  const sync = useMemo(() => makeSyncGroup(), []);
  sync.enabled = mapSync;
  useEffect(() => {
    if (!mapSync || sync.maps.size < 2) return;
    const zoom = Math.min(...[...sync.maps].map((m) => m.getZoom()));
    for (const m of sync.maps) if (Math.abs(m.getZoom() - zoom) > 0.01) m.easeTo({ zoom, duration: 600 });
  }, [mapSync, sync]);
  const mapFor = (info: SideInfo, paint: MapPaint, sug: Map<string, Recommendation>, onSelect: (id: string) => void, policy: PolicyState, level: PlanLevel) => (
    <MapView
      paint={paint}
      selectedId={info.t?.GEOID ?? null}
      buildingColor={leadColor(info.rec)}
      lite={lite}
      terrain={layers.terrain}
      buildings={layers.buildings}
      hillshade={layers.hillshade}
      padding={MAP_PAD}
      onSelect={onSelect}
      tooltip={(id) => <SuggestTip id={id} rec={sug.get(id)} />}
      overlay={<MapChip tag={info.tag} color={info.color} title={info.t ? tractLabel(info.t) : `Place ${info.tag}`} sub={chipSub(info.t, info.rec, policy, level)} />}
      pin={pin}
      sync={sync}
      onMapReady={registerMap(info.tag === 'A' ? 'compare-a' : 'compare-b')}
    />
  );

  return (
    <MotionConfig reducedMotion={!active || lite ? 'always' : 'user'}>
      {/* 72 px on top: a clear gap under the Home / Explore-Analysis / chat buttons (inline, so no new CSS class). */}
      <div className="relative flex h-full gap-3 bg-[#fbfaf8] px-3 pb-3" style={{ paddingTop: 72 }}>
        <div className="absolute right-3 top-3 z-30">
          <ChatPill />
        </div>
        <Strip
          info={A}
          tour="compare-places"
          search={<TractSearch dense value={a} onChange={(id) => set({ selectedId: id })} tag="A" tagColor={COLOR_A} showQuickPicks={false} exclude={separate ? undefined : b} label="Place A" />}
          map={mapFor(A, mapA.paint, sugA, (id) => set({ selectedId: id }), policyA, levelA)}
          legend={<SuggestLegendBar focus={screensWords(policyA)} level={LEVEL_LABEL[levelA]} counts={mapA.counts} noneLabel={noneLabel(levelA)} />}
        >
          <p className="text-caption leading-snug text-slate-500">A uses the Place tab’s settings{separate ? '' : ', and so does B'}. Changes here apply at once.</p>
          <SideInputs key="A" side={SIDE_A} info={A} />
        </Strip>

        <div className="scroll-quiet min-h-0 shrink-0 overflow-y-auto rounded-xl bg-white px-4 pb-12 ring-1 ring-stone-200/80" style={{ width: 'clamp(440px, 36vw, 600px)', paddingTop: 44 }} aria-label="Comparison">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="font-display text-body font-bold text-slate-900">Comparison</div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => set({ selectedId: b, compareId: a })} title="Swap A and B" aria-label="Swap A and B" className="flex items-center gap-1.5 rounded-lg bg-white px-2 py-1 text-caption text-slate-600 ring-1 ring-stone-300 hover:bg-stone-50 hover:text-slate-900">
                <SwapIcon />
                Swap
              </button>
              <button type="button" role="switch" aria-checked={mapSync} onClick={toggleMapSync} title="On: zooming one map zooms the other. Each map still pans on its own." className={cx('inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 text-caption ring-1 transition-colors', mapSync ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-stone-300 hover:ring-slate-400')}>
                <span className={cx('relative h-3.5 w-6 rounded-full transition-colors', mapSync ? 'bg-white/30' : 'bg-stone-200')}>
                  <span className={cx('absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-all', mapSync ? 'left-3' : 'left-0.5')} />
                </span>
                Sync maps
              </button>
              {exportMenu}
            </div>
          </div>
          <p className="mb-3 text-caption leading-snug text-slate-600">
            {separate ? (
              <>
                <b className="font-semibold" style={{ color: COLOR_A }}>
                  A
                </b>{' '}
                {settingsWords(policyA, levelA)} ·{' '}
                <b className="font-semibold" style={{ color: COLOR_B }}>
                  B
                </b>{' '}
                {settingsWords(policyB, levelB)}. Each side read under its own settings.
              </>
            ) : (
              <>Both places under {settingsWords(policyA, levelA)}. Change the places and settings under each map.</>
            )}
          </p>
          {message && (
            <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-small text-amber-900 ring-1 ring-amber-200" role="status">
              {message}
            </p>
          )}

          {(ta || tb) && (
            <section aria-label="At a glance" data-tour="compare-glance">
              <SectionHead n={1} title="At a glance" sub={same ? 'The same place on both sides: the values match.' : 'Real values for each place, same definitions on both sides.'} />
              <Glance A={A} B={B} levelA={levelA} levelB={levelB} />
            </section>
          )}

          {(ta || tb) && (
            <section className="mt-6 border-t border-stone-200/80 pt-5" aria-label="What each place would get">
              <SectionHead n={2} title="What each place would get" sub={separate ? 'The types that pass each side’s own screens at its own income level.' : `The types that pass ${screensWords(policyA)} at ${LEVEL_LABEL[levelA]}.`} />
              <Gets A={A} B={B} levelA={levelA} levelB={levelB} />
            </section>
          )}

          <section className={cx('flex flex-col', (ta || tb) && 'mt-6 border-t border-stone-200/80 pt-5')} aria-label="Why they differ">
            <SectionHead
              n={3}
              title="Why they differ"
              sub="The rules behind each suggestion, read side by side."
              right={
                pair ? (
                  <button type="button" onClick={() => setDetail(!detail)} aria-expanded={detail} className="inline-flex items-center gap-0.5 pt-0.5 text-caption text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900 hover:decoration-slate-500">
                    Scoring detail
                    <Chevron className={cx('h-3.5 w-3.5 transition-transform', detail && 'rotate-180')} />
                  </button>
                ) : undefined
              }
            />
            <WhyParagraphs
              A={A}
              B={B}
              rows={ta && tb ? why : []}
              closing={
                <>
                  {ok && <span className="text-slate-500">{SCORING_CAVEAT} </span>}
                  {takeaway}
                </>
              }
            />
          </section>

          <AnimatePresence initial={false}>
            {detail && pair && (
              <motion.section key="detail" aria-label="Scoring detail" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <div className="mt-6 space-y-6 border-t border-stone-200/80 pt-5">
                  <SideRanking tag="A" color={COLOR_A} t={ta} r={ra} ra={raA} s={sa} idPrefix="ra" />
                  <SideRanking tag="B" color={COLOR_B} t={tb} r={rb} ra={raB} s={sb} idPrefix="rb" />
                  <div>
                    <PanelTitle
                      sub={`For the ${basisLabel} match in both places`}
                      right={
                        topA && topB && topA !== topB ? (
                          <Segmented
                            size="xs"
                            label="Which housing type to compare"
                            value={basis}
                            onChange={setBasisChoice}
                            options={[topA, topB].map((k) => ({
                              value: k,
                              label: (
                                <span className="inline-flex items-center gap-1">
                                  <Dot color={typologyById.get(k)?.color ?? '#64748b'} size={7} />
                                  {tLabel(k)}
                                </span>
                              ),
                            }))}
                          />
                        ) : undefined
                      }
                    >
                      Factor by factor
                    </PanelTitle>
                    {rows.length ? <FactorDeltaBars rows={rows} ta={pair.ta} tb={pair.tb} colorA={COLOR_A} colorB={COLOR_B} labelA={tractLabel(ta)} labelB={tractLabel(tb)} typology={basisLabel} /> : null}
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {(ta || tb) && <CompareProject A={A} B={B} sideA={SIDE_A} sideB={sideB} stacked />}
        </div>

        <Strip
          info={B}
          search={<TractSearch dense value={b} onChange={(id) => set({ compareId: id })} tag="B" tagColor={COLOR_B} showQuickPicks={false} exclude={separate ? undefined : a} label="Place B" />}
          map={mapFor(B, mapB.paint, sugB, (id) => set({ compareId: id }), policyB, levelB)}
          legend={<SuggestLegendBar focus={screensWords(policyB)} level={LEVEL_LABEL[levelB]} counts={mapB.counts} noneLabel={noneLabel(levelB)} />}
        >
          <div className="space-y-1.5">
            <div className="text-caption font-semibold uppercase tracking-wide text-slate-600">B’s settings</div>
            <Segmented
              size="xs"
              label="B's settings"
              value={separate ? 'separate' : 'same'}
              onChange={(v) => setSeparate(v === 'separate')}
              options={[
                { value: 'same', label: 'Same as A' },
                { value: 'separate', label: 'Its own' },
              ]}
            />
            <p className="text-caption leading-snug text-slate-500">{separate ? 'B keeps its own screens, residents, income and project, starting from a copy of A. It can be the same place as A. Tax credit entries stay shared; B’s financing picks its credit.' : 'B is read under A’s screens, residents, income and project. Its own lot and open space are below; Its own lets B differ in anything.'}</p>
          </div>
          {separate ? (
            <SideInputs key="B" side={SIDE_B} info={B} />
          ) : tb && B.p && hudTable ? (
            <SideInputs key="B-site" side={SIDE_A} info={B} only={['build', 'open']} />
          ) : (
            <p className="text-caption text-slate-600">Pick place B above.</p>
          )}
        </Strip>
      </div>
    </MotionConfig>
  );
}
