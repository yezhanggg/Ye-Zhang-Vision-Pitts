// Analysis > Place online: the same map, search box and right panel as MatchView, with the suggestion read without a
// focusing issue. Each place shows the types that pass your screens (lib/policy/compose): renter need at the income
// level, the binding rules (no ADU overlay is mapped; senior housing only for senior residents) and the screens you
// switch on, each with the document behind it. The weights only order types inside that set, at the published
// equal-weights reference. The left panel (PlaceRail) holds every input, flat, behind Confirm.
// Loaded on demand; the offline single file keeps MatchView.
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { rankedTracts, scoring, tractById, tractLabel, typologyById } from '../../lib/data';
import { useAllResults } from '../../lib/derived';
import { TYPOLOGY_COLORS, type MapPaint } from '../../lib/paint';
import { presetWeights, useApp } from '../../lib/store';
import { UI } from '../../lib/copy';
import { cityView, type View } from '../../lib/analysis/framing';
import { hasPlaceData, hud as hudTable, placeById } from '../../lib/place/data';
import { isSeniorAge, LEVEL_LABEL } from '../../lib/place/plan';
import { usePlan } from '../../lib/place/planStore';
import { STANCE_LABEL } from '../../lib/place/thresholds';
import type { HudTable, PlaceMeasures, Typology } from '../../lib/place/types';
import { useDemandScores } from '../../lib/place/useDemandScores';
import { useZipView } from '../../lib/place/zipView';
import { composeAll, screensWords, type Composed } from '../../lib/policy/compose';
import { usePolicy } from '../../lib/policy/store';
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
import { DetailHeader, placeDataFor, StartCard, SuggestTooltip, TractDetail } from '../MatchView';
import PanelFrame, { RightColumn } from '../PanelFrame';
import ExportMenu from '../export/ExportMenu';
import PlaceFolds from './PlaceFolds';
import PlaceRail from './PlaceRail';
import PlanAnswer from './PlanAnswer';
import SuggestionLegend, { FLOOD_FILL } from './SuggestionLegend';
import ZipPanel, { useZipOverlays } from './ZipPanel';
import PoliciesCard from './flat/PoliciesCard';
import ProjectPanel from './project/ProjectPanel';
import { useProjectModel } from './project/useProjectModel';

const TYPOLOGY_INDEX = new Map(scoring.typologies.map((t, i) => [t.id, i]));
/** The fit order's weights: the published equal-weights reference, now that no focus picks a preset. */
const FIT_WEIGHTS = presetWeights('balanced');

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

function StudioDetail({ t, c, fitOrder, words, onClose }: { t: TractProps; c: Composed; fitOrder: Typology[]; words: string; onClose: () => void }) {
  const plan = usePlan();
  const policy = usePolicy();
  const { place, hud } = placeDataFor(t.GEOID);
  const m = useProjectModel(t.GEOID, place, hud);
  if (!place || !hud) return null;
  const ctx: PolicyContext | null = m ? { label: tractLabel(t), place, cap: m.cap, homes: m.mix.homes, branch: m.branch, qctOrDda: m.qctOrDda, score: m.sheet.score, draftSheet: m.sheet.sheet.status === 'draft' } : null;
  return (
    <div>
      <DetailHeader t={t} onClose={onClose} actions={<StudioExport t={t} place={place} hud={hud} c={c} words={words} />} />
      <div className="space-y-3 p-5">
        <PlanAnswer rec={c.rec} hud={hud} level={plan.level} size="auto" age={plan.age} homes={plan.homes} context={`${words} · ${LEVEL_LABEL[plan.level]}`} why={c.why ?? undefined} />
        <PoliciesCard composed={c} ctx={ctx} policy={policy} />
        <ProjectPanel t={t} place={place} hud={hud} rec={c.rec} fitOrder={fitOrder} />
        <PlaceFolds t={t} place={place} hud={hud} rec={c.rec} level={plan.level} fitOrder={fitOrder} />
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
  const results = useAllResults(FIT_WEIGHTS);
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

  const zipMode = useZipView((s) => s.area) === 'zip';
  const zipOverlays = useZipOverlays(zipMode, paint);
  const t = selectedId ? tractById.get(selectedId) : null;
  const r = selectedId ? (results.get(selectedId) ?? { scores: [], ranking: [], top: null, topScore: null }) : null;
  const c = selectedId ? (composed.get(selectedId) ?? null) : null;
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
          selectedId={zipMode ? null : selectedId}
          baseTracts={!zipMode}
          overlays={zipOverlays}
          buildingColor={buildingColor}
          lite={lite}
          terrain={layers.terrain}
          buildings={layers.buildings}
          hillshade={layers.hillshade}
          padding={padding}
          pin={pin}
          elevationReadout
          onSelect={(id) => select(useApp.getState().selectedId === id ? null : id)}
          idleOrbit
          initialView={view ?? undefined}
          tooltip={(id) => <SuggestTooltip id={id} rec={suggestions.get(id)} />}
          cue={tourCue?.part === 'analysis' ? tourCue : null}
          onMapReady={registerMap('place')}
        />
      )}
      <PlaceRail t={t ?? null} rec={rec} zipMode={zipMode} title={UI.matchTab} legend={<SuggestionLegend focus={words} level={LEVEL_LABEL[plan.level]} counts={counts} noneLabel={noneLabel} />} />
      <RightColumn>
        <ChatPill />
        <PanelFrame inline>
          {zipMode ? (
            <ZipPanel suggestions={suggestions} hud={hudTable} level={plan.level} />
          ) : t && r && c ? (
            <StudioDetail t={t} c={c} fitOrder={fitOrders.get(t.GEOID) ?? (r.ranking as Typology[])} words={words} onClose={() => select(null)} />
          ) : t && r ? (
            <TractDetail t={t} r={r} weights={FIT_WEIGHTS} rec={null} fitOrder={fitOrders.get(t.GEOID)} onClose={() => select(null)} />
          ) : (
            <StartCard suggestions={suggestions} />
          )}
        </PanelFrame>
      </RightColumn>
    </div>
  );
}
