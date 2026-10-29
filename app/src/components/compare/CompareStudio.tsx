// Analysis > Compare places as three strips: place A on the left and place B on the right, each with its map on top
// (colored under that side's screens and income level) and its inputs underneath (the Place tab's flat sections: the
// project, the mix and income, the site, the policies and screens, open space, the pencil), and
// the comparison in the middle: at a glance, what each place would get, why they differ and the project
// in each place. Side A uses the Place tab's settings; side B
// shares them or, with "Separate settings", keeps its own (lib/compare/store, lib/project/side). So it reads two
// places under one set of settings, two places under two, or one place under two. Both sides are read at one level, as
// on the Place tab (CompareLevel): a real lot picked on each map (Parcel), a tract (Tract), or a ZIP code picked above
// each map (ZIP code; the tract sections below the project are left out there).
// Loaded on demand: the offline single file keeps CompareTractsView, and so do phones, which have no room for three
// columns.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { rankedTracts, scoring, tractById, tractLabel, typologyById } from '../../lib/data';
import { compareTakeaway, fLabel, stabilityFor, tLabel, useAllResults } from '../../lib/derived';
import { TYPOLOGY_COLORS, type MapPaint } from '../../lib/paint';
import { useApp } from '../../lib/store';
import { cx } from '../../lib/format';
import { pctShort } from '../../lib/copy';
import { compareMessage, compareState, factorDeltasSafe } from '../../lib/analysis/compare';
import { rationale } from '../../lib/analysis/rationale';
import { setSeparate, useCompare, useCompareRead } from '../../lib/compare/store';
import { amiWords } from '../../lib/equity/measures';
import { zipName, zipPlaces } from '../../lib/equity/zip';
import { lotName, lotSize } from '../../lib/explore/parcelShadow';
import { buildCompareReport, type CompareReportInput } from '../../lib/export/builders/compare';
import { compareCsvRows, COMPARE_COLUMNS, followScreen } from '../../lib/compare/report';
import { downloadCsv, exportFilename, toCsv } from '../../lib/export/csv';
import { getMap, registerMap } from '../../lib/export/mapRegistry';
import { mapSnapshot, printReport, type Report } from '../../lib/export/report';
import { pickLot } from '../../lib/parcel/pick';
import type { PlaceArea } from '../../lib/place/zipView';
import type { SiteLot } from '../../lib/project/store';
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
import CompareTractsView, { COLOR_A, COLOR_B, MapChip, Side as SideRanking, SuggestTip, SwapIcon, wordsOnly } from '../CompareTractsView';
import FactorDeltaBars from '../FactorDeltaBars';
import MapView, { makeSyncGroup } from '../MapView';
import ChatPill from '../ChatPill';
import TractSearch from '../TractSearch';
import PanelTitle from '../analysis/PanelTitle';
import ExportMenu from '../export/ExportMenu';
import { ProjectInputs, ZipInputs, ZipPicker } from '../place/levels/LevelInputs';
import { Chevron, Dot, Segmented } from '../primitives';
import { GLANCE_GRID, GROUPS, Measure, PlaceHead, SectionHead, Value, WhyParagraphs, getsCells, glanceFlag, glanceRows, type GetsCells, type SideInfo } from './CompareBlocks';
import { CompareLevelSwitch, frameBoth, LotLegendBar, searchAtParcel, SideLot, useSideLots, useZipLayers } from './CompareLevel';
import CompareResults from './CompareResults';
import { RESULTS_SUB, sideName, type Tag } from './levelWords';
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

/** The closing line of Why they differ: the type each side's rules suggest (the answer on the maps), then the factor
 *  difference the scoring finds. The weighted top type is left out: it can name a type the rules rule out (an ADU). */
function suggestedTakeaway(ta: { GEOID: string }, tb: { GEOID: string }, recA: Recommendation | null, recB: Recommendation | null, scored: string): string {
  const lead = (r: Recommendation | null) => (r?.types[0] ? tLabel(r.types[0].typology) : 'no suggestion');
  const A = tractLabel(tractById.get(ta.GEOID)), B = tractLabel(tractById.get(tb.GEOID));
  return `Suggested: ${A}, ${lead(recA)}; ${B}, ${lead(recB)}.${scored.match(/ Biggest difference:.*$/)?.[0] ?? ''}`;
}

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

/** One side's inputs: the Place tab's project groups (type, units, capital, open space, policies) for its place, at
 *  the level: its tract (on the lot picked there, at Parcel) or its ZIP code. */
function SideInputs({ side, info, level, zip }: { side: Side; info: SideInfo; level: PlaceArea; zip: string | null }) {
  const wait = (text: string) => <p className="text-caption text-slate-600">{text}</p>;
  return (
    <SideContext.Provider value={side}>
      {level === 'zip' ? (
        zip && hudTable ? (
          <ZipInputs key={zip} zip={zip} />
        ) : (
          wait(`Pick a ZIP code for ${info.tag} above the map to test a project there.`)
        )
      ) : info.t && info.p && hudTable ? (
        <ProjectInputs key={`${level}:${info.t.GEOID}`} t={info.t} rec={info.rec} level={level} />
      ) : (
        wait(level === 'parcel' ? `Click a lot on ${info.tag}’s map to test a project there.` : `Pick place ${info.tag} above the map to test a project there.`)
      )}
    </SideContext.Provider>
  );
}

/** One place's strip: its search, its map on top, the map's legend, then the inputs for that place underneath. */
function Strip({ info, search, map, legend, tour, top = 0, children }: { info: SideInfo; search: ReactNode; map: ReactNode; legend: ReactNode; tour?: string; /** Room left above the strip for the open chat (B, under the chat pill). */ top?: number; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-1 flex-col gap-2" style={{ marginTop: top, transition: 'margin-top 0.2s ease' }} aria-label={`Place ${info.tag}`} data-tour={tour}>
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

  // The level both sides are read at, each side's ZIP code, and the lot picked in each side's tract (at Parcel).
  const level = useCompare((s) => s.level);
  const zipA = useCompare((s) => s.zipA);
  const zipB = useCompare((s) => s.zipB);
  const parcel = level === 'parcel';
  const atZip = level === 'zip';
  const lotA = SIDE_A.project((s) => (a ? s.sites[a]?.lot : undefined));
  const lotBShared = SIDE_A.project((s) => (b ? s.sites[b]?.lot : undefined));
  const lotBOwn = SIDE_B.project((s) => (b ? s.sites[b]?.lot : undefined));
  const lotB = separate ? lotBOwn : lotBShared;
  /** Why the last lot clicked could not go on a side. */
  const [lotNote, setLotNote] = useState<Record<Tag, string | null>>({ A: null, B: null });
  const onNote = useCallback((tag: Tag, note: string | null) => setLotNote((n) => (n[tag] === note ? n : { ...n, [tag]: note })), []);
  const lotsA = useSideLots('A', parcel, lotA, onNote);
  const lotsB = useSideLots('B', parcel, lotB, onNote);
  const pickZipA = useCallback((z: string | null) => useCompare.setState({ zipA: z }), []);
  const pickZipB = useCallback((z: string | null) => useCompare.setState({ zipB: z }), []);
  // On a level change (and on opening at Parcel or ZIP code), each map moves to where that level's picking happens.
  const seenLevel = useRef<PlaceArea | null>(null);
  useEffect(() => {
    const first = seenLevel.current === null;
    seenLevel.current = level;
    if (first && level === 'tract') return;
    setLotNote({ A: null, B: null });
    return frameBoth(level);
  }, [level]);

  // Both sides order types with the Place tab's weights (Balanced unless the link sets them); the screens and the income level decide the set.
  const weights = useApp((s) => s.weights);
  const results = useAllResults(weights);
  const fitOrders = useMemo(() => new Map([...results].map(([id, r]) => [id, r.ranking as Typology[]])), [results]);
  const demand = useDemandScores();
  const sugA = useMemo(() => suggestionsFor(levelA, seniorA, policyA, fitOrders, demand), [levelA, seniorA, policyA, fitOrders, demand]);
  const sugB = useMemo(() => (separate ? suggestionsFor(levelB, seniorB, policyB, fitOrders, demand) : sugA), [separate, levelB, seniorB, policyB, fitOrders, demand, sugA]);
  const mapA = useMemo(() => paintOf(sugA), [sugA]);
  const mapB = useMemo(() => (sugB === sugA ? mapA : paintOf(sugB)), [sugA, sugB, mapA]);
  const zipLayersA = useZipLayers(atZip, zipA, mapA.paint, pickZipA);
  const zipLayersB = useZipLayers(atZip, zipB, mapB.paint, pickZipB);

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
  // The factor detail reads the type each side's rules suggest (the weighted top only when nothing is suggested), so it
  // never names a type the answer does not.
  const topA = recA?.types[0]?.typology ?? ra?.top ?? null;
  const topB = recB?.types[0]?.typology ?? rb?.top ?? null;
  const [basisChoice, setBasisChoice] = useState<string | null>(null);
  const basis = ok && basisChoice && (basisChoice === topA || basisChoice === topB) ? basisChoice : (topA ?? topB);
  const rows = useMemo(() => (pair ? factorDeltasSafe(pair.ta, pair.tb, pair.ra, pair.rb, basis ?? undefined) : []), [pair, basis]);
  const takeaway = same
    ? 'The same place on both sides: its measures match, so what differs is what each set of settings suggests and how the project does.'
    : wordsOnly(message ?? (pair ? suggestedTakeaway(pair.ta, pair.tb, recA, recB, compareTakeaway(pair.ta, pair.tb, pair.ra, pair.rb)) : compareMessage('need_two', ta, tb)!));
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
  /** The open chat's height: B's strip, under the chat pill, moves down by it. */
  const [chatH, setChatH] = useState(0);
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
  /** The chip on a side's map: its tract (Tract), its lot (Parcel) or its ZIP code (ZIP code). */
  const chipFor = (info: SideInfo, lot: SiteLot | undefined, zip: string | null, policy: PolicyState, income: PlanLevel) => {
    const chip = (title: string, sub: ReactNode) => <MapChip tag={info.tag} color={info.color} title={title} sub={sub} />;
    if (atZip) return chip(zip ? zipName(zip) : `Place ${info.tag}`, zip ? zipPlaces(zip, (g) => tractLabel(tractById.get(g)), 2) : 'Pick a ZIP code above the map');
    if (parcel) return chip(lot ? lotName(lot.label) : info.t ? tractLabel(info.t) : `Place ${info.tag}`, lot ? [info.t ? tractLabel(info.t) : null, lotSize(lot.sqft), lot.district].filter(Boolean).join(' · ') : 'Zoom in and click a lot');
    return chip(info.t ? tractLabel(info.t) : `Place ${info.tag}`, chipSub(info.t, info.rec, policy, income));
  };

  // Export: the comparison report (PDF via print) and the At-a-glance rows as CSV. With separate settings each side's
  // settings ride on its name line; the report's header names side A's. At Parcel the project rows name each lot; at
  // ZIP code the report holds the project rows and the maps only (the tract tables are not shown there).
  const nameA = sideName(level, 'A', ta ? tractLabel(ta) : null, lotA, zipA);
  const nameB = sideName(level, 'B', tb ? tractLabel(tb) : null, lotB, zipB);
  const exportReady = atZip ? !!zipA && !!zipB : !!ta && !!tb;
  /** The project table's note, for the level. */
  const levelNote = (r: Report): Report => (level === 'tract' ? r : { ...r, blocks: r.blocks.map((x) => (x.kind === 'table' && x.note?.startsWith('Each side’s project') ? { ...x, note: `${RESULTS_SUB[level].replace(/; recomputed.*$/, '')}, as on screen. Example cost inputs are labeled on the Place tab.` } : x)) });
  const zipExport = (): { report: Report; csv: Pick<CompareReportInput, 'a' | 'b' | 'glance' | 'fits' | 'ami'> } | null => {
    if (!zipA || !zipB) return null;
    const words = separate ? `A ${settingsWords(policyA, levelA)}; B ${settingsWords(policyB, levelB)}` : settingsWords(policyA, levelA);
    const places = (z: string) => zipPlaces(z, (g) => tractLabel(tractById.get(g)), 3);
    const report: Report = {
      title: `Comparison report: ${nameA} and ${nameB}`,
      subtitle: `ZIP codes · ${words}`,
      blocks: [
        { kind: 'kv', rows: [['Place A', `${nameA} (${places(zipA)})`], ['Place B', `${nameB} (${places(zipB)})`], ['Settings', words]] },
        // "1." here becomes "2." once the project section goes in front (lib/compare/report followScreen).
        { kind: 'heading', text: '1. Maps' },
        { kind: 'callout', text: 'You decide: site, scale, sponsor and financing are yours; this report shows the evidence and the arithmetic.' },
      ],
      sources: ['ZIP code profiles: tract values weighted by 2020 housing units (city part of edge ZIP codes)'],
      filename: exportFilename('comparison', `${nameA} vs ${nameB}`, 'pdf'),
    };
    return { report, csv: { a: { name: nameA, geoid: zipA, rec: null }, b: { name: nameB, geoid: zipB, rec: null }, glance: [], fits: null, ami: 0 } };
  };
  const exportInput = (): CompareReportInput | null => {
    if (!ta || !tb) return null;
    const g = glanceRows(A.p, B.p, hudTable, levelA, ta.GEOID, tb.GEOID);
    const subsidyShort = (x: number) => (x >= 0.75 ? 'fully eligible' : x >= 0.25 ? 'partly eligible' : 'not eligible');
    const val = (x: number | null, f: string) => (x == null ? 'no data' : f === 'subsidy_eligible' ? subsidyShort(x) : pctShort(x));
    const sub = (name: string, policy: PolicyState, level: PlanLevel, lot: SiteLot | undefined) => [parcel && lot ? `${lotName(lot.label)}, ${lotSize(lot.sqft)}` : null, name, separate ? settingsWords(policy, level) : null].filter(Boolean).join(' · ');
    return {
      a: { name: tractLabel(ta), sub: sub(ta.name, policyA, levelA, lotA), geoid: ta.GEOID, rec: recA },
      b: { name: tractLabel(tb), sub: sub(tb.name, policyB, levelB, lotB), geoid: tb.GEOID, rec: recB },
      focus: recA?.stance ?? 'anti_displacement',
      level: levelA,
      glance: g.rows,
      fits: g.fits ? { rent: g.fits.rent, formula: g.fits.formula } : null,
      ami: g.ami,
      takeaway,
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
  const exportSlug = atZip ? `${nameA} vs ${nameB}` : ta && tb ? `${tractLabel(ta)} vs ${tractLabel(tb)}` : '';
  const exportMenu = (
    <ExportMenu
      items={[
        {
          label: 'Report (PDF)',
          hint: !exportReady ? (atZip ? 'Choose two ZIP codes first' : 'Choose two places first') : atZip ? 'The project in each ZIP code and both maps' : 'The project in each place, the tables and both maps',
          disabled: !exportReady,
          onSelect: async () => {
            const crop = { top: 0, bottom: 0, left: 0, right: 0 };
            if (atZip) {
              const z = zipExport();
              if (!z) return;
              const mA = await mapSnapshot(getMap('compare-a'), { crop });
              const mB = await mapSnapshot(getMap('compare-b'), { crop });
              const maps = [mA ? { kind: 'image' as const, src: mA, caption: `A · ${nameA}` } : null, mB ? { kind: 'image' as const, src: mB, caption: `B · ${nameB}` } : null].filter((x) => x !== null);
              const blocks = z.report.blocks.flatMap((x) => (x.kind === 'heading' && x.text === '1. Maps' ? (maps.length ? [x, ...maps] : []) : [x]));
              printReport(levelNote(followScreen({ ...z.report, blocks }, useCompareRead.getState(), nameA, nameB)));
              return;
            }
            const input = exportInput();
            if (!input) return;
            const mA = await mapSnapshot(getMap('compare-a'), { crop });
            const mB = await mapSnapshot(getMap('compare-b'), { crop });
            const report = swapStance(buildCompareReport({ ...input, maps: { a: mA, b: mB }, filename: exportFilename('comparison', exportSlug, 'pdf') }), STANCE_LABEL[input.focus], separate ? `A ${screensWords(policyA)}, B ${screensWords(policyB)}` : screensWords(policyA));
            printReport(levelNote(followScreen(report, useCompareRead.getState(), parcel ? nameA : input.a.name, parcel ? nameB : input.b.name)));
          },
        },
        {
          label: 'Data (CSV)',
          hint: !exportReady ? (atZip ? 'Choose two ZIP codes first' : 'Choose two places first') : atZip ? 'Project rows for each ZIP code' : 'Project and At-a-glance rows, with sources and years',
          disabled: !exportReady,
          onSelect: () => {
            const got = atZip ? (zipExport()?.csv ?? null) : exportInput();
            if (!got) return;
            // At Parcel the name columns carry each lot with its tract (the geoid columns stay the tracts').
            const input = parcel ? { ...got, a: { ...got.a, name: nameA }, b: { ...got.b, name: nameB } } : got;
            downloadCsv(exportFilename('comparison', exportSlug, 'csv'), toCsv(compareCsvRows(input, useCompareRead.getState()), COMPARE_COLUMNS));
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
  // At Parcel and ZIP code the tracts are not picked on the map (as on the Place tab): the lots or the ZIP outlines are.
  const mapFor = (info: SideInfo, paint: MapPaint, sug: Map<string, Recommendation>, onSelect: (id: string) => void, overlays: ReturnType<typeof useZipLayers>, chip: ReactNode) => (
    <MapView
      paint={paint}
      selectedId={parcel || atZip ? null : (info.t?.GEOID ?? null)}
      baseTracts={!parcel && !atZip}
      overlays={overlays}
      buildingColor={leadColor(info.rec)}
      lite={lite}
      terrain={layers.terrain}
      buildings={layers.buildings}
      hillshade={layers.hillshade}
      padding={MAP_PAD}
      onSelect={onSelect}
      tooltip={(id) => <SuggestTip id={id} rec={sug.get(id)} />}
      overlay={chip}
      pin={pin}
      sync={sync}
      onMapReady={registerMap(info.tag === 'A' ? 'compare-a' : 'compare-b')}
    />
  );

  // Each strip at the level: its search (a ZIP code picker at ZIP code; at Parcel an address picks its lot), its map's
  // layers and chip, and its key.
  const searchFor = (tag: Tag) => {
    const isA = tag === 'A';
    if (atZip)
      return (
        <div className="flex h-10 items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-caption font-bold text-white" style={{ background: isA ? COLOR_A : COLOR_B }}>
            {tag}
          </span>
          <div className="min-w-0 flex-1">
            <ZipPicker zip={isA ? zipA : zipB} onChange={isA ? pickZipA : pickZipB} label={`ZIP code for place ${tag}`} />
          </div>
        </div>
      );
    const onChange = (id: string) => {
      set(isA ? { selectedId: id } : { compareId: id });
      if (parcel) searchAtParcel(tag, id, onNote);
    };
    return <TractSearch dense value={isA ? a : b} onChange={onChange} tag={tag} tagColor={isA ? COLOR_A : COLOR_B} showQuickPicks={false} exclude={separate ? undefined : isA ? b : a} label={`Place ${tag}`} />;
  };
  const legendFor = (tag: Tag) => {
    const isA = tag === 'A';
    if (parcel) return <LotLegendBar zoomOk={(isA ? lotsA : lotsB).zoomOk} />;
    const policy = isA ? policyA : policyB, income = isA ? levelA : levelB;
    return <SuggestLegendBar focus={screensWords(policy)} level={LEVEL_LABEL[income]} counts={(isA ? mapA : mapB).counts} noneLabel={noneLabel(income)} />;
  };
  /** B under A's settings: what it reads, or what it still needs. */
  const sharedNote = atZip ? (zipB ? 'B tests A’s project across its ZIP code.' : 'Pick a ZIP code for B above.') : parcel ? (lotB ? 'B tests A’s project on the lot picked on its map.' : null) : tb ? 'B tests A’s project; each place is read on a lot of the size the project needs there.' : 'Pick place B above.';
  /** Swap the places (lots and ZIP codes too); each side keeps its settings. */
  const swap = () => {
    if (parcel && separate) {
      if (lotB) pickLot(lotB, { side: SIDE_A });
      if (lotA) pickLot(lotA, { side: SIDE_B });
    }
    useCompare.setState({ zipA: zipB, zipB: zipA });
    setLotNote({ A: null, B: null });
    set({ selectedId: b, compareId: a });
  };

  return (
    <MotionConfig reducedMotion={!active || lite ? 'always' : 'user'}>
      {/* 72 px on top: a clear gap under the Home / Explore-Analysis / chat buttons (inline, so no new CSS class). */}
      <div className="relative flex h-full gap-3 bg-[#fbfaf8] px-3 pb-3" style={{ paddingTop: 72 }}>
        <div className="absolute right-3 top-3 z-30">
          <ChatPill onHeight={setChatH} />
        </div>
        <Strip
          info={A}
          tour="compare-places"
          search={searchFor('A')}
          map={mapFor(A, mapA.paint, sugA, (id) => set({ selectedId: id }), parcel ? lotsA.overlays : zipLayersA, chipFor(A, lotA, zipA, policyA, levelA))}
          legend={legendFor('A')}
        >
          <p className="text-caption leading-snug text-slate-500">A uses the Place tab’s settings{separate ? '' : ', and so does B'}. Changes here apply at once.</p>
          {parcel && <SideLot tag="A" lot={lotA} note={lotNote.A} />}
          <SideInputs key="A" side={SIDE_A} info={A} level={level} zip={zipA} />
        </Strip>

        <div className="scroll-quiet min-h-0 shrink-0 overflow-y-auto rounded-xl bg-white px-4 pb-12 ring-1 ring-stone-200/80" style={{ width: 'clamp(440px, 36vw, 600px)', paddingTop: 44 }} aria-label="Comparison">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="font-display text-body font-bold text-slate-900">Comparison</div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={swap} title="Swap A and B" aria-label="Swap A and B" className="flex items-center gap-1.5 rounded-lg bg-white px-2 py-1 text-caption text-slate-600 ring-1 ring-stone-300 hover:bg-stone-50 hover:text-slate-900">
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
          <CompareLevelSwitch />
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
          {message && !atZip && (
            <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-small text-amber-900 ring-1 ring-amber-200" role="status">
              {message}
            </p>
          )}

          {(ta || tb || level !== 'tract') && <CompareResults A={A} B={B} sideA={SIDE_A} sideB={sideB} level={level} zipA={zipA} zipB={zipB} />}

          {/* The sections below read census tracts: at ZIP code they are left out; at Parcel they read each lot's tract. */}
          {atZip && <p className="mt-6 border-t border-stone-200/80 pt-5 text-caption leading-snug text-slate-500">At a glance, what each place would get and why they differ read census tracts: switch to Tract to see them.</p>}

          {!atZip && (ta || tb) && (
            <section className="mt-6 border-t border-stone-200/80 pt-5" aria-label="At a glance" data-tour="compare-glance">
              <SectionHead n={2} title="At a glance" sub={same ? 'The same place on both sides: the values match.' : parcel ? 'Real values for the tract each lot is in, same definitions on both sides.' : 'Real values for each place, same definitions on both sides.'} />
              <Glance A={A} B={B} levelA={levelA} levelB={levelB} />
            </section>
          )}

          {!atZip && (ta || tb) && (
            <section className="mt-6 border-t border-stone-200/80 pt-5" aria-label="What each place would get">
              <SectionHead n={3} title="What each place would get" sub={separate ? 'The types that pass each side’s own screens at its own income level.' : `The types that pass ${screensWords(policyA)} at ${LEVEL_LABEL[levelA]}.`} />
              <Gets A={A} B={B} levelA={levelA} levelB={levelB} />
            </section>
          )}

          {!atZip && (
          <section className={cx('flex flex-col', (ta || tb || parcel) && 'mt-6 border-t border-stone-200/80 pt-5')} aria-label="Why they differ">
            <SectionHead
              n={4}
              title="Why they differ"
              sub={parcel ? 'The rules behind each suggestion for the tract each lot is in, read side by side.' : 'The rules behind each suggestion, read side by side.'}
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
                  {takeaway}
                </>
              }
            />
          </section>
          )}

          <AnimatePresence initial={false}>
            {detail && pair && !atZip && (
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

        </div>

        <Strip
          top={chatH}
          info={B}
          search={searchFor('B')}
          map={mapFor(B, mapB.paint, sugB, (id) => set({ compareId: id }), parcel ? lotsB.overlays : zipLayersB, chipFor(B, lotB, zipB, policyB, levelB))}
          legend={legendFor('B')}
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
            <p className="text-caption leading-snug text-slate-500">{separate ? 'B keeps its own screens, residents, income and project, starting from a copy of A. It can be the same place as A. Tax credit entries stay shared; B’s financing picks its credit.' : 'B is read under A’s screens, income and project. Its own lets B differ in anything.'}</p>
          </div>
          {parcel && <SideLot tag="B" lot={lotB} note={lotNote.B} />}
          {separate ? <SideInputs key="B" side={SIDE_B} info={B} level={level} zip={zipB} /> : sharedNote && <p className="text-caption leading-snug text-slate-600">{sharedNote}</p>}
        </Strip>
      </div>
    </MotionConfig>
  );
}
