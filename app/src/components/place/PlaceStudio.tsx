// Analysis > Place online: the same map, search box and right panel as MatchView, with the suggestion read without a
// focusing issue. Each place shows the types that pass your screens (lib/policy/compose): renter need at the income
// level, the binding rules (no ADU overlay is mapped; senior housing only for senior residents) and the screens you
// switch on, each with the document behind it. The weights (Balanced; online there is no picker) only order types
// inside that set. The left panel (PlaceRail) holds the address box and every input, flat, applied at once.
// Loaded on demand; the offline single file keeps MatchView.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { rankedTracts, scoring, tractAt, tractById, tractLabel, typologyById } from '../../lib/data';
import { useAllResults } from '../../lib/derived';
import { TYPOLOGY_COLORS, type MapPaint } from '../../lib/paint';
import { useApp } from '../../lib/store';
import { UI } from '../../lib/copy';
import { cityView, type View } from '../../lib/analysis/framing';
import { hasPlaceData, hud as hudTable, placeById } from '../../lib/place/data';
import { isSeniorAge, LEVEL_LABEL } from '../../lib/place/plan';
import { usePlan } from '../../lib/place/planStore';
import type { HudTable, PlaceMeasures, Typology } from '../../lib/place/types';
import { useDemandScores } from '../../lib/place/useDemandScores';
import { useZipView } from '../../lib/place/zipView';
import { composeAll, screensWords, type Composed } from '../../lib/policy/compose';
import { usePolicy } from '../../lib/policy/store';
import { setProjectBoth } from '../../lib/project/draft';
import { useProject, type Site } from '../../lib/project/store';
import { lotAt, lotByRow } from '../../lib/parcel/lots';
import { clearLot, pickLot, samePoint } from '../../lib/parcel/pick';
import { usePlaceLots } from '../../lib/parcel/usePlaceLots';
import { inIzoAt, zoningAtPin } from '../../lib/zoning/atPin';
import type { PolicyContext } from '../../lib/policy/applies';
import { insertBefore, swapStance } from '../../lib/policy/report';
import { buildPlaceReport, MEASURE_COLUMNS, placeMeasureRows } from '../../lib/export/builders/place';
import { downloadCsv, exportFilename, toCsv } from '../../lib/export/csv';
import { getMap, registerMap } from '../../lib/export/mapRegistry';
import { mapSnapshot, printReport, type Report } from '../../lib/export/report';
import { mapPadding, usePhoneTakeTurns, useViewport } from '../../lib/viewport';
import { useTour } from '../../lib/tour';
import type { TractProps } from '../../lib/types';
import ChatPill from '../ChatPill';
import MapView from '../MapView';
import { DetailHeader, placeDataFor, SuggestTooltip, TractDetail } from '../MatchView';
import { frameLevel, setLevel } from './levels/LevelSwitch';
import SiteDetail from './levels/SiteDetail';
import { ParcelStart, TractStart } from './levels/Starts';
import ZipDetail from './levels/ZipDetail';
import PanelFrame, { RightColumn } from '../PanelFrame';
import ExportMenu from '../export/ExportMenu';
import PlaceFolds from './PlaceFolds';
import PlaceRail from './PlaceRail';
import PlanAnswer from './PlanAnswer';
import SuggestionLegend, { FLOOD_FILL } from './SuggestionLegend';
import { useZipOverlays } from './ZipPanel';
import ProjectResults from './levels/ProjectResults';
import Overview from './levels/Overview';
import { useBrowse } from './levels/browse';
import { Explainer } from '../primitives';
import { useLihtc } from '../../lib/lihtc/store';
import { capitalize } from '../../lib/place/format';
import { STANCE_LABEL, TYPOLOGY_LABEL } from '../../lib/place/thresholds';
import { DEV_TYPE_LABEL, devTypeOf, setDevType, type DevType } from '../../lib/project/devType';
import { SIDE_A } from '../../lib/project/side';
import { useProjectModel } from './project/useProjectModel';

/** Read the map at the pin into the pin's tract (lib/project/store Site.pin): the district under it, which Try a lot then
 *  opens on when it has standards, and the IZ-O. With no pin, every reading goes, so nothing stale is left behind. */
function readPin(pin: { lng: number; lat: number } | null) {
  setProjectBoth((s) => {
    const sites: Record<string, Site> = Object.fromEntries(Object.entries(s.sites).map(([g, v]) => [g, { ...v, pin: undefined }]));
    const g = pin ? tractAt(pin.lng, pin.lat) : null;
    if (pin && g) {
      const z = zoningAtPin(pin.lng, pin.lat);
      const code = z.kind === 'none' ? null : z.code;
      // A picked lot's district (the full-resolution zoning map, lib/parcel) wins over this map reading.
      sites[g] = { ...sites[g], ...(z.kind === 'computed' && !sites[g]?.lot?.district ? { district: z.code } : {}), pin: { code, computed: z.kind === 'computed', near: z.kind !== 'none' && z.near, why: z.kind === 'not_computed' ? z.why : null, izo: inIzoAt(pin.lng, pin.lat) } };
    }
    return { sites };
  });
}

/** The pin dropped by dragging: a new pin there, and the tract under it (none outside the city). */
function dropPin(lng: number, lat: number) {
  const g = tractAt(lng, lat);
  const { set, select } = useApp.getState();
  set({ pin: { lng, lat, label: 'Dropped pin' } });
  if (g) select(g);
}

const TYPOLOGY_INDEX = new Map(scoring.typologies.map((t, i) => [t.id, i]));

/** The place report with the screens in place of a focusing issue, and the policies as a block. */
function screensReport(r: Report, stanceLabel: string, words: string, c: Composed): Report {
  return insertBefore(swapStance(r, stanceLabel, words), /decide/i, [
    { kind: 'heading', text: 'Policies and screens' },
    { kind: 'list', items: [...c.checks.filter((x) => x.on).map((x) => x.sentence), ...c.rec.not.map((n) => `Not ${n.typology.replace('_', ' ')}: ${n.because}.`)] },
  ]);
}

function StudioExport({ t, place, hud, c, words }: { t: TractProps; place: PlaceMeasures; hud: HudTable; c: Composed; words: string }) {
  const plan = usePlan();
  const rec = c.rec;
  const input = () => ({ t, place, hud, rec, plan: { focus: rec.stance, level: plan.level, size: 'auto' as const, age: plan.age, homes: plan.homes, flood: plan.flood, transitMi: plan.transitMi }, typeLabel: (k: Typology) => typologyById.get(k)?.label ?? k });
  const name = tractLabel(t);
  return (
    <ExportMenu
      items={[
        {
          label: 'Report (PDF)',
          hint: 'Answer, policies, evidence tables, map and sources',
          onSelect: async () => {
            const ui = useApp.getState().ui;
            const map = await mapSnapshot(getMap('place'), { crop: { top: 70, bottom: 20, left: ui.left ? 470 : 0, right: ui.right ? 470 : 0 } });
            printReport(screensReport(buildPlaceReport({ ...input(), map, filename: exportFilename('place', name, 'pdf') }), STANCE_LABEL[rec.stance], words, c));
          },
        },
        {
          label: 'Data (CSV)',
          hint: 'One row per measure, with units and sources',
          onSelect: () => downloadCsv(exportFilename('place', name, 'csv'), toCsv(placeMeasureRows(t, place, hud) as unknown as Record<string, unknown>[], MEASURE_COLUMNS)),
        },
      ]}
    />
  );
}

/** The map's key at the Parcel level: lots, vacant lots and the lot picked (the census tracts are not drawn). */
function LotLegend() {
  const swatch = (bg: string, line: string) => <span className="inline-block h-3 w-4 shrink-0 rounded-sm" style={{ background: bg, boxShadow: `inset 0 0 0 1.5px ${line}` }} />;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-white/95 px-3 py-2 text-small text-slate-700 shadow-lg ring-1 ring-black/5 backdrop-blur" data-lot-legend>
      <span className="font-semibold text-slate-900">County lots</span>
      <span className="flex items-center gap-1.5">{swatch('#ffffff', '#94a3b8')}Lot</span>
      <span className="flex items-center gap-1.5">{swatch('rgba(245,158,11,0.35)', '#94a3b8')}Vacant</span>
      <span className="flex items-center gap-1.5">{swatch('#ffffff', '#7c3aed')}Your site</span>
    </div>
  );
}

/** At the Tract level: the way to the Parcel level, where a specific site and its money are tested. */
function TestSite({ t }: { t: TractProps }) {
  const pin = useApp((s) => s.pin);
  const address = pin && tractAt(pin.lng, pin.lat) === t.GEOID && pin.label !== 'Dropped pin' ? pin.label : null;
  return (
    <section className="rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200" data-test-site>
      <h3 className="text-small font-semibold text-slate-900">{address ? `Test ${address} as a site` : `Test a specific site in ${tractLabel(t)}`}</h3>
      <p className="mt-0.5 text-caption leading-snug text-slate-600">At the Parcel level you pick a real lot: its size, zoning and sun fill in, and the project runs through the pencil and the tax credit sheet.</p>
      <button type="button" onClick={() => setLevel('parcel')} className="mt-2 w-full rounded-lg bg-violet-600 px-2 py-1.5 text-small font-semibold text-white hover:bg-violet-700">
        {address ? 'Test this address' : 'Test a site here'}
      </button>
    </section>
  );
}

/** At the Tract level: the type the rules suggest here, in one line, with a way to test it. */
function SuggestedHere({ c, words }: { c: Composed; words: string }) {
  const plan = usePlan();
  const project = useProject();
  const lead = c.rec.lead;
  if (!lead) return <p className="text-small leading-snug text-slate-600">No type is suggested here at {LEVEL_LABEL[plan.level]} ({words}).</p>;
  const type: DevType = lead === 'senior' ? 'senior' : plan.level === 'market' ? 'market' : 'affordable';
  return (
    <section className="flex items-center justify-between gap-2 rounded-2xl bg-white px-4 py-2.5 ring-1 ring-stone-200" data-suggested-here title={c.why ?? undefined}>
      <span className="min-w-0 text-small leading-snug text-slate-800">
        Suggested here: <b className="font-semibold text-slate-900">{capitalize(TYPOLOGY_LABEL[lead])}</b> at {LEVEL_LABEL[plan.level]}
      </span>
      {/* Hidden when the project is already of that type. */}
      {devTypeOf(project, plan.level, isSeniorAge(plan.age)) !== type && (
        <button type="button" onClick={() => setDevType(SIDE_A, type)} className="shrink-0 text-caption font-medium text-violet-700 hover:text-violet-800">
          Test as {DEV_TYPE_LABEL[type]}
        </button>
      )}
    </section>
  );
}

function StudioDetail({ t, c, fitOrder, words, onClose }: { t: TractProps; c: Composed; fitOrder: Typology[]; words: string; onClose: () => void }) {
  const plan = usePlan();
  const policy = usePolicy();
  const project = useProject();
  const sheet = useLihtc((e) => e.sheet);
  const { place, hud } = placeDataFor(t.GEOID);
  const m = useProjectModel(t.GEOID, place, hud);
  if (!place || !hud) return null;
  const pinIzo = m?.base.project.sites[t.GEOID]?.pin?.izo;
  const ctx: PolicyContext | null = m ? { label: tractLabel(t), place, cap: m.cap, homes: m.mix.homes, branch: m.branch, qctOrDda: m.qctOrDda, qct: m.base.qct, score: m.sheet.score, draftSheet: m.sheet.sheet.status === 'draft', pinIzo } : null;
  const devType = devTypeOf(project, plan.level, isSeniorAge(plan.age));
  const browse = useBrowse((x) => x.mode) === 'browse';
  return (
    <div>
      <DetailHeader t={t} onClose={onClose} actions={<StudioExport t={t} place={place} hud={hud} c={c} words={words} />} />
      <div className="space-y-3 p-5">
        {browse ? <Overview scope="tract" geoid={t.GEOID} zip={null} place={place} demand={m?.tract ?? null} hud={hud} fitOrder={fitOrder} /> : <SuggestedHere c={c} words={words} />}
        {!browse && m && <ProjectResults scope="tract" t={t} place={place} hud={hud} m={m} devType={devType} c={c} ctx={ctx} policy={policy} sheet={sheet} exportable name={tractLabel(t)} />}
        <TestSite t={t} />
        <Explainer title="The evidence behind the suggestion">
          <div className="space-y-3">
            <PlanAnswer rec={c.rec} hud={hud} level={plan.level} size="auto" age={plan.age} homes={plan.homes} context={`${words} · ${LEVEL_LABEL[plan.level]}`} why={c.why ?? undefined} />
            <PlaceFolds t={t} place={place} hud={hud} rec={c.rec} level={plan.level} fitOrder={fitOrder} />
          </div>
        </Explainer>
      </div>
    </div>
  );
}

export default function PlaceStudio() {
  const tourCue = useTour((s) => s.cue);
  const selectedId = useApp((s) => s.selectedId);
  const lite = useApp((s) => s.lite);
  const layers = useApp((s) => s.layers);
  const pin = useApp((s) => s.pin);
  const ui = useApp((s) => s.ui);
  const { select } = useApp.getState();
  const plan = usePlan();
  const policy = usePolicy();
  const senior = isSeniorAge(plan.age);
  // The fit order uses Balanced, or the weights a link carries (no picker online).
  const weights = useApp((s) => s.weights);
  const results = useAllResults(weights);
  const fitOrders = useMemo(() => new Map([...results].map(([id, r]) => [id, r.ranking as Typology[]])), [results]);
  const demand = useDemandScores();
  const composed = useMemo(() => (hasPlaceData && hudTable ? composeAll(placeById, hudTable, { level: plan.level, senior }, policy, fitOrders, demand) : new Map<string, Composed>()), [plan.level, senior, policy, fitOrders, demand]);
  const suggestions = useMemo(() => new Map([...composed].map(([id, c]) => [id, c.rec])), [composed]);
  const words = screensWords(policy);

  const { paint, counts } = useMemo(() => {
    const values = new Map<string, number | null>();
    const counts: Record<string, number> = { none: 0, flood: 0 };
    const floodIdx = TYPOLOGY_COLORS.length;
    for (const t of rankedTracts) {
      const rec = suggestions.get(t.GEOID);
      const lead = rec?.types[0]?.typology ?? null;
      if (!lead && rec?.floodLimit?.blocked) {
        values.set(t.GEOID, floodIdx);
        counts.flood += 1;
        continue;
      }
      values.set(t.GEOID, lead ? (TYPOLOGY_INDEX.get(lead) ?? null) : null);
      counts[lead ?? 'none'] = (counts[lead ?? 'none'] ?? 0) + 1;
    }
    const paint: MapPaint = { kind: 'cat', palette: [...TYPOLOGY_COLORS, FLOOD_FILL], values };
    return { paint, counts };
  }, [suggestions]);

  useEffect(() => readPin(pin), [pin]);


  const level = useZipView((s) => s.area);
  const zipMode = level === 'zip';
  const parcel = level === 'parcel';
  const zipOverlays = useZipOverlays(zipMode, paint);
  const pickedLot = useProject((s) => (selectedId ? s.sites[selectedId]?.lot : undefined));
  const onPickLot = useCallback((chunk: string, row: number) => {
    void lotByRow(chunk, row).then((l) => l && pickLot(l));
  }, []);
  const lots = usePlaceLots(parcel, pickedLot ? { chunk: pickedLot.chunk, row: pickedLot.row } : null, onPickLot);
  // A link that carries a pin opens on the Parcel level.
  useEffect(() => {
    if (useApp.getState().pin && useZipView.getState().area === 'tract') setLevel('parcel');
  }, []);
  // At the Parcel level a pin (an address, or a dragged pin) means the lot under it.
  useEffect(() => {
    if (!parcel || !pin) return;
    const g = tractAt(pin.lng, pin.lat);
    const cur = g ? useProject.getState().sites[g]?.lot : undefined;
    if (cur && samePoint(cur.point, pin.lng, pin.lat)) return;
    let live = true;
    void lotAt(pin.lng, pin.lat).then((l) => {
      if (!live) return;
      if (l) pickLot({ ...l, point: [pin.lng, pin.lat] }, { keepPin: true });
      else if (g) clearLot(g);
    });
    return () => {
      live = false;
    };
  }, [parcel, pin]);
  // A place picked at the Parcel level without a lot yet: close in on it so its lots show.
  useEffect(() => {
    if (parcel && selectedId && !useProject.getState().sites[selectedId]?.lot && !useApp.getState().pin) frameLevel('parcel');
  }, [parcel, selectedId]);
  const t = selectedId ? tractById.get(selectedId) : null;
  const r = selectedId ? (results.get(selectedId) ?? { scores: [], ranking: [], top: null, topScore: null }) : null;
  const c = selectedId ? (composed.get(selectedId) ?? null) : null;
  const pd = t ? placeDataFor(t.GEOID) : null;
  const rec = c?.rec ?? null;
  const lead = rec?.types[0]?.typology ?? null;
  const buildingColor = lead ? typologyById.get(lead)?.color : null;
  const vp = useViewport();
  const padding = useMemo(() => mapPadding(vp, ui.left, ui.right), [vp, ui.left, ui.right]);
  usePhoneTakeTurns(vp.phone, ui.left, ui.right, () => useApp.getState().setUi({ left: false }), () => useApp.getState().setUi({ right: false }));
  const noneLabel = plan.level === 'market' ? 'No suggestion (the market test fails or cannot run)' : 'No suggestion (no under-served renters at this level, or a screen rules it out)';

  const root = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View | null | undefined>(undefined);
  useLayoutEffect(() => {
    const el = root.current;
    const s = useApp.getState();
    const pad = { top: 90, bottom: 90, left: s.ui.left ? 500 : 70, right: s.ui.right ? 500 : 70 };
    setView(!s.selectedId && el ? cityView(el.clientWidth, el.clientHeight, pad) : null);
  }, []);

  return (
    <div ref={root} className="relative h-full">
      {view !== undefined && (
        <MapView
          paint={paint}
          selectedId={zipMode || parcel ? null : selectedId}
          baseTracts={!zipMode && !parcel}
          overlays={zipMode ? zipOverlays : parcel ? lots.overlays : undefined}
          buildingColor={buildingColor}
          lite={lite}
          terrain={layers.terrain}
          buildings={layers.buildings}
          hillshade={layers.hillshade}
          padding={padding}
          pin={pin}
          onPinDrag={dropPin}
          elevationReadout
          onSelect={(id) => {
            // At the Parcel level, once lots show a click is the lot layer's; before that it picks the tract to close in on.
            if (parcel) {
              if (lots.minZoom != null && (getMap('place')?.getZoom() ?? 0) >= lots.minZoom) return;
              select(id);
              return;
            }
            select(useApp.getState().selectedId === id ? null : id);
          }}
          idleOrbit
          initialView={view ?? undefined}
          tooltip={(id) => <SuggestTooltip id={id} rec={suggestions.get(id)} />}
          cue={tourCue?.part === 'analysis' ? tourCue : null}
          onMapReady={registerMap('place')}
        />
      )}
      <PlaceRail t={t ?? null} rec={rec} zipMode={zipMode} title={UI.matchTab} legend={parcel ? <LotLegend /> : <SuggestionLegend focus={words} level={LEVEL_LABEL[plan.level]} counts={counts} noneLabel={noneLabel} />} />
      <RightColumn>
        <ChatPill />
        <PanelFrame inline>
          {zipMode ? (
            <ZipDetail suggestions={suggestions} hud={hudTable} level={plan.level} />
          ) : parcel ? (
            t && c && pd?.place && pd.hud ? (
              <SiteDetail t={t} place={pd.place} hud={pd.hud} c={c} fitOrder={fitOrders.get(t.GEOID) ?? ((r?.ranking ?? []) as Typology[])} actions={<StudioExport t={t} place={pd.place} hud={pd.hud} c={c} words={words} />} />
            ) : (
              <ParcelStart suggestions={suggestions} />
            )
          ) : t && r && c ? (
            <StudioDetail t={t} c={c} fitOrder={fitOrders.get(t.GEOID) ?? (r.ranking as Typology[])} words={words} onClose={() => select(null)} />
          ) : t && r ? (
            <TractDetail t={t} r={r} weights={weights} rec={null} fitOrder={fitOrders.get(t.GEOID)} onClose={() => select(null)} />
          ) : (
            <TractStart />
          )}
        </PanelFrame>
      </RightColumn>
    </div>
  );
}
