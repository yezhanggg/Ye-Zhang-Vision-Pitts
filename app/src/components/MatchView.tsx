import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { FMR_2BR, activeFactorIds, focusTracts, hasAskingRents, rankedTracts, scoring, tractById, tractLabel, tractSubLabel, typologyById } from '../lib/data';
import { tLabel, useAllResults, type TractResult } from '../lib/derived';
import { TYPOLOGY_COLORS, type MapPaint } from '../lib/paint';
import { matchPreset, useApp } from '../lib/store';
import { fmtInt, fmtMoney, fmtPct, fmtSignedPct } from '../lib/format';
import { PRESSURE_HOW, RENT_CAVEAT, RENT_HOW, UI, directionWord, percentilePhrase } from '../lib/copy';
// lib/explainRemote (the AI reading) is not imported here since update 3: the place page is evidence blocks and a
// rules-based recommendation; see the note at the top of that file.
import { closeMargin, rationale } from '../lib/analysis/rationale';
import { APP_STANCES } from '../lib/analysis/copy';
import { cityView, type View } from '../lib/analysis/framing';
import { topMargin } from '../lib/scoring';
import { hasPlaceData, hud as hudTable, placeById, placeFor } from '../lib/place/data';
import { FIXTURE_HUD, FIXTURE_PLACES } from '../lib/place/fixture';
import { AGE_LABEL, LEVEL_LABEL, sizeWord } from '../lib/place/plan';
import { usePlan } from '../lib/place/planStore';
import type { Recommendation } from '../lib/place/recommend';
import { suggestAll } from '../lib/place/suggest';
import { STANCE_LABEL } from '../lib/place/thresholds';
import type { HudTable, PlaceMeasures, Stance, Typology } from '../lib/place/types';
import type { TractProps, Weights } from '../lib/types';
import MapView from './MapView';
import ExportMenu from './export/ExportMenu';
import { buildPlaceReport, MEASURE_COLUMNS, placeMeasureRows } from '../lib/export/builders/place';
import { downloadCsv, exportFilename, toCsv } from '../lib/export/csv';
import { getMap, registerMap } from '../lib/export/mapRegistry';
import { mapSnapshot, printReport } from '../lib/export/report';
import Rail, { RailSection } from './Rail';
import { useTour } from '../lib/tour';
import AnalysisChat from './AnalysisChat';
import PanelFrame, { RightColumn } from './PanelFrame';
import DataLimitsPanel from './DataLimitsPanel';
import FactorTable from './analysis/FactorTable';
import FitOrder from './place/FitOrder';
import AdvancedSettings from './place/AdvancedSettings';
import FocusPicker from './place/FocusPicker';
import PlanAnswer from './place/PlanAnswer';
import PlanInputs from './place/PlanInputs';
import PlaceFolds, { Fold } from './place/PlaceFolds';
import SuggestionLegend, { FLOOD_FILL } from './place/SuggestionLegend';
import { ConfChip, Dot, Explainer, InfoTip, ObservedBadge, SectionTitle } from './primitives';

/** Map hover card. `weights` (the Match view passes them) lets it tell "every factor is zero" from "no data". */
export function MapTooltip({ id, results, weights }: { id: string; results: Map<string, TractResult>; weights?: Weights }) {
  const t = tractById.get(id);
  const r = results.get(id);
  if (!t) return null;
  const zero = !!weights && activeFactorIds.length > 0 && activeFactorIds.every((f) => !((weights[f] ?? 0) > 0));
  const m = r ? topMargin(r.scores) : null;
  const close = r?.top && m != null && m < closeMargin() ? r.ranking[1] ?? null : null;
  return (
    <div className="max-w-64">
      <div className="font-semibold">{tractLabel(t)}</div>
      <div className="text-caption text-white/75">{tractSubLabel(t)}</div>
      {!t.residential ? (
        <div className="mt-1 text-white/80">Not ranked ({typeof t.households === 'number' ? `${fmtInt(t.households)} households, ` : ''}fewer than 25)</div>
      ) : zero ? (
        <div className="mt-1 text-white/80">No score: every factor is set to zero</div>
      ) : r?.top ? (
        <>
          <div className="mt-1 flex items-center gap-1.5">
            <Dot color={typologyById.get(r.top)?.color ?? '#999'} size={9} />
            <span>
              Best match: <b>{tLabel(r.top)}</b>
            </span>
          </div>
          {close && <div className="mt-0.5 text-caption font-semibold text-amber-200">Close call with {tLabel(close)}</div>}
        </>
      ) : (
        <div className="mt-1 text-white/80">No score (missing data)</div>
      )}
      {t.watch_list && <div className="mt-0.5 text-caption font-semibold text-rose-200">Watch list: high need, rising market</div>}
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-white px-3 py-2">
      <div className="text-caption text-slate-600">{k}</div>
      <div className="text-lead font-semibold text-slate-900 tnum">{v}</div>
    </div>
  );
}

/** One line of asking-rent context from licensed listing data. Information only: nothing here enters the score. */
function AskingRentLine({ t }: { t: TractProps }) {
  const set = useApp((s) => s.set);
  if (!hasAskingRents) return null;
  const rent = t.rent_2br_2025_26;
  const n = t.n_units_2025_26 ?? 0;
  const gx = t.rent_2br_growth_existing;
  const ga = t.rent_2br_growth_all;
  // Asking rent more than twice the census median: the listings and the residents are different markets.
  const reconcile = rent != null && typeof t.med_gross_rent === 'number' && t.med_gross_rent > 0 && rent > 2 * t.med_gross_rent;
  let growth: React.ReactNode;
  if (gx != null) {
    growth = (
      <>
        <b className="text-slate-900">{fmtSignedPct(gx)}</b> since 2019–20 for existing stock
        {ga != null && <span className="text-slate-600"> (all listings {fmtSignedPct(ga)})</span>}
      </>
    );
  } else if (ga != null) {
    growth = (
      <>
        <b className="text-slate-900">{fmtSignedPct(ga)}</b> since 2019–20 across all listings <span className="text-slate-600">(existing stock hidden: fewer than 20 units listed before 2019)</span>
      </>
    );
  } else {
    growth = <span className="text-slate-600">growth hidden (fewer than 20 units listed in 2019–20)</span>;
  }
  return (
    <div className="mt-2 rounded-xl bg-white px-3 py-2 ring-1 ring-stone-200/80">
      <div className="flex items-start justify-between gap-2">
        <div className="text-small leading-snug text-slate-800">
          {rent != null ? (
            <>
              Median 2BR asking rent <b className="text-slate-900">{fmtMoney(rent)}</b> (2025–26, {fmtInt(n)} units) · vs FMR {fmtMoney(FMR_2BR)}
              {t.rent_2br_gt_fmr != null && <span className={t.rent_2br_gt_fmr ? 'text-rose-700' : 'text-emerald-700'}> ({t.rent_2br_gt_fmr ? 'above' : 'at or below'})</span>} · {growth}
            </>
          ) : (
            <>
              Median 2BR asking rent hidden: <b className="text-slate-900">{fmtInt(n)}</b> distinct units listed in 2025–26, fewer than 20.
            </>
          )}
        </div>
        <InfoTip label="About asking rents" width={300}>
          {RENT_HOW}
        </InfoTip>
      </div>
      {reconcile && <p className="mt-1 text-caption text-slate-700">Listings here are mostly new market-rate units. The census median ({fmtMoney(t.med_gross_rent)}) includes subsidized homes, which is what most residents pay.</p>}
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-slate-600">
        <span>{RENT_CAVEAT}</span>
        <ConfChip conf={t.asking_rents_conf} />
        <button onClick={() => set({ metric: { kind: 'info', id: 'rent_growth_existing' } })} className="font-semibold text-violet-700 hover:underline">
          Show growth on the map
        </button>
      </div>
    </div>
  );
}

function AboutPlace({ t }: { t: TractProps }) {
  return (
    <section>
      <SectionTitle>{UI.aboutPlace}</SectionTitle>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-stone-200/70 ring-1 ring-stone-200/70">
        <Stat k="People" v={fmtInt(t.pop)} />
        <Stat k="Median household income" v={fmtMoney(t.med_hh_income)} />
        <Stat k="Median rent" v={fmtMoney(t.med_gross_rent)} />
        <Stat k="Households that rent" v={fmtPct(t.renter_share)} />
      </div>
      <AskingRentLine t={t} />
    </section>
  );
}

/** The anti-displacement lens for one tract: neighbors' market vs its own, and the watch-list test. */
function PressureCard({ t }: { t: TractProps }) {
  const set = useApp((s) => s.set);
  if (t.market_pressure == null && !t.market_direction) return null;
  const p = t.market_pressure;
  const word = p == null ? null : p > 0.25 ? 'much stronger' : p > 0.08 ? 'stronger' : p < -0.25 ? 'much weaker' : p < -0.08 ? 'weaker' : 'about the same';
  return (
    <section>
      <SectionTitle right={<ObservedBadge small />} sub="Is price pressure spilling in from next door?">
        <span className="flex items-center gap-1">
          {UI.pressure}
          <InfoTip label="About market pressure">{PRESSURE_HOW}</InfoTip>
        </span>
      </SectionTitle>
      <div className={`rounded-xl px-3 py-2.5 ring-1 ${t.watch_list ? 'bg-rose-50 ring-rose-200' : 'bg-white ring-stone-200/80'}`}>
        {p != null && (
          <div className="text-body text-slate-900">
            Neighboring tracts’ markets are <b>{word}</b> {word === 'about the same' ? 'as' : 'than'} this one ({p > 0 ? '+' : ''}
            {p.toFixed(2)} on the 0–1 market scale).
          </div>
        )}
        <div className="mt-1 text-small text-slate-700">
          Own market: <b>{t.mva21 ? `type ${t.mva21}` : 'unclassified'}</b>, {directionWord(t.market_direction)} since 2016. Need: <b>{percentilePhrase(t.need).toLowerCase()}</b>.
        </div>
        {t.watch_list ? (
          <div className="mt-2 rounded-lg bg-white/80 px-2.5 py-1.5 text-small font-semibold text-rose-800 ring-1 ring-rose-200">Watch list: high need with a rising market. Adding market-rate homes here without protections is most likely to displace current renters.</div>
        ) : (
          <div className="mt-1.5 text-caption text-slate-600">Not on the watch list (that needs high need plus a rising market).</div>
        )}
        <div className="mt-2 flex gap-3 text-caption font-semibold text-violet-700">
          <button onClick={() => set({ metric: { kind: 'lens', id: 'pressure' } })} className="hover:underline">
            Show pressure on the map
          </button>
          <button onClick={() => set({ metric: { kind: 'lens', id: 'bivariate' } })} className="hover:underline">
            Show the watch list
          </button>
        </div>
      </div>
    </section>
  );
}

/** No tract yet: one line and the demo neighborhoods. Nothing else. */
function StartCard() {
  const select = useApp((s) => s.select);
  return (
    <div className="space-y-3 p-5">
      <div className="text-small font-semibold text-violet-700">Start here</div>
      <p className="font-display text-lead font-semibold leading-snug text-slate-900">Pick a place: tap a neighborhood below or search above.</p>
      <div className="flex flex-wrap gap-1.5">
        {focusTracts.map((t) => (
          <button key={t.GEOID} onClick={() => select(t.GEOID)} className="rounded-full bg-white px-3 py-1 text-small font-medium text-slate-800 ring-1 ring-stone-300 hover:bg-violet-50 hover:text-violet-800 hover:ring-violet-200">
            {tractLabel(t)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Map hover card on Match: the suggested type under the focusing issue and the planning inputs. */
function SuggestTooltip({ id, rec }: { id: string; rec: Recommendation | null | undefined }) {
  const t = tractById.get(id);
  if (!t) return null;
  const lead = rec?.types[0]?.typology ?? null;
  return (
    <div className="max-w-64">
      <div className="font-semibold">{tractLabel(t)}</div>
      <div className="text-caption text-white/75">{tractSubLabel(t)}</div>
      {!t.residential ? (
        <div className="mt-1 text-white/80">Not ranked ({typeof t.households === 'number' ? `${fmtInt(t.households)} households, ` : ''}fewer than 25)</div>
      ) : lead ? (
        <div className="mt-1 flex items-center gap-1.5">
          <Dot color={typologyById.get(lead)?.color ?? '#999'} size={9} />
          <span>
            Suggested: <b>{typologyById.get(lead)?.label ?? lead}</b>
          </span>
        </div>
      ) : (
        <div className="mt-1 text-white/80">{rec ? 'No suggestion at this level' : 'No place data'}</div>
      )}
    </div>
  );
}

/** Demo tracts the synthetic fixture (lib/place/fixture) stands in for, dev server only, with `?fixture=1` in the URL. */
const FIXTURE_GEOIDS: Record<string, keyof typeof FIXTURE_PLACES> = { '42003562300': 'hazelwood', '42003130700': 'homewood_north', '42003140300': 'squirrel_hill_north' };
function devFixtureOn(): boolean {
  try {
    return import.meta.env.DEV && new URLSearchParams(window.location.search).has('fixture');
  } catch {
    return false;
  }
}
/** The place measures and HUD table for a tract: the built files, or (dev server with ?fixture=1) the synthetic fixture. */
function placeDataFor(geoid: string): { place: PlaceMeasures | null; hud: HudTable | null } {
  if (hasPlaceData) return { place: placeFor(geoid), hud: hudTable };
  if (devFixtureOn()) {
    const key = FIXTURE_GEOIDS[geoid];
    return { place: key ? FIXTURE_PLACES[key] : null, hud: FIXTURE_HUD };
  }
  return { place: null, hud: null };
}

function DetailHeader({ t, onClose, actions }: { t: TractProps; onClose?: () => void; actions?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-10 border-b border-stone-100 bg-white/95 px-5 pb-3 pt-4 backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate font-display text-title font-bold text-slate-900">{tractLabel(t)}</h2>
          <div className="text-small text-slate-600 tnum">
            {tractSubLabel(t)}
            {t.focus && <span className="ml-2 rounded-full bg-violet-50 px-2 py-px text-caption font-semibold text-violet-700 ring-1 ring-violet-200">demo</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
        {actions}
        {onClose && (
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-stone-100 hover:text-slate-900" aria-label="Clear selection">
            <svg viewBox="0 0 20 20" className="h-4 w-4">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
        </div>
      </div>
    </div>
  );
}

/** Export for one place: the place report (PDF via print) and one CSV row per measure. */
function PlaceExport({ t, place, hud, rec }: { t: TractProps; place: PlaceMeasures; hud: HudTable; rec: Recommendation }) {
  const plan = usePlan();
  const input = () => ({ t, place, hud, rec, plan: { focus: rec.stance, level: plan.level, size: plan.size, age: plan.age, homes: plan.homes, flood: plan.flood, transitMi: plan.transitMi }, typeLabel: (k: Typology) => typologyById.get(k)?.label ?? k });
  const name = tractLabel(t);
  return (
    <ExportMenu
      items={[
        {
          label: 'Report (PDF)',
          hint: 'Answer, evidence tables, map and sources',
          onSelect: async () => {
            const ui = useApp.getState().ui;
            const map = await mapSnapshot(getMap('place'), { crop: { top: 70, bottom: 20, left: ui.left ? 390 : 0, right: ui.right ? 470 : 0 } });
            printReport(buildPlaceReport({ ...input(), map, filename: exportFilename('place', name, 'pdf') }));
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

/**
 * One place. With place measures: the answer card (the suggestion under the focusing issue and the planning inputs,
 * with its arithmetic), then the evidence folds A–F, how the suggestion was made and the fit order, then data limits.
 * Without them (the pipeline has not run): the weighted fit order and the factor table, as in update 2.
 */
export function TractDetail({ t, r, weights, rec, fitOrder, onClose }: { t: TractProps; r: TractResult; weights: Weights; rec?: Recommendation | null; fitOrder?: Typology[]; onClose?: () => void }) {
  const ra = useMemo(() => rationale(t, r, weights), [t, r, weights]);
  const plan = usePlan();
  const { place, hud } = placeDataFor(t.GEOID);
  if (place && hud && rec) {
    return (
      <div>
        <DetailHeader t={t} onClose={onClose} actions={<PlaceExport t={t} place={place} hud={hud} rec={rec} />} />
        <div className="space-y-3 p-5">
          <PlanAnswer rec={rec} hud={hud} level={plan.level} size={plan.size} age={plan.age} homes={plan.homes} />
          <PlaceFolds t={t} place={place} hud={hud} rec={rec} level={plan.level} fitOrder={fitOrder ?? (r.ranking as Typology[])} />
          <Fold title="Data limits" headline="what these numbers cannot tell you">
            <DataLimitsPanel t={t} />
          </Fold>
        </div>
      </div>
    );
  }
  return (
    <div>
      <DetailHeader t={t} onClose={onClose} />
      <div className="space-y-6 p-5">
        <FitOrder t={t} r={r} ra={ra} weights={weights} expanded />
        <Explainer tone="card" title={UI.dataBehind} right={<ObservedBadge small />}>
          <FactorTable t={t} weights={weights} topTypology={r.top} />
        </Explainer>
        <PressureCard t={t} />
        <AboutPlace t={t} />
        <DataLimitsPanel t={t} />
      </div>
    </div>
  );
}

/** Once per session: the first visit to Match that arrives on the equal-weights reference starts from a stance. */
let stanceApplied = false;

const isStance = (s: string | null): s is Stance => !!s && (APP_STANCES as readonly string[]).includes(s);
const TYPOLOGY_INDEX = new Map(scoring.typologies.map((t, i) => [t.id, i]));

/** Analysis → Match: pick a place, a focusing issue and who you are planning for; read the suggestion and its numbers. */
export default function MatchView() {
  const tourCue = useTour((s) => s.cue);
  // The reference (Balanced) is not a stance, so a first visit that lands on it moves to Anti-displacement, once.
  // A link that carries custom weights (matchPreset === null) or any stance is left alone; so is every later visit.
  useEffect(() => {
    if (stanceApplied) return;
    stanceApplied = true;
    const s = useApp.getState();
    if (matchPreset(s.weights) === 'balanced') s.applyPreset(APP_STANCES[0]);
  }, []);
  const selectedId = useApp((s) => s.selectedId);
  const weights = useApp((s) => s.weights);
  const lite = useApp((s) => s.lite);
  const layers = useApp((s) => s.layers);
  const pin = useApp((s) => s.pin);
  const ui = useApp((s) => s.ui);
  const { select, setWeights, applyPreset } = useApp.getState();
  const plan = usePlan();
  const results = useAllResults(weights);

  // The focusing issue: the stance the weights match (a shared link carries it), else the last one picked.
  const preset = matchPreset(weights);
  useEffect(() => {
    if (isStance(preset) && preset !== usePlan.getState().focus) usePlan.getState().setPlan({ focus: preset });
  }, [preset]);
  const focus: Stance = isStance(preset) ? preset : plan.focus;

  // The suggested type for every place under the focus and the planning inputs; the fit order (current weights) only
  // orders types inside each suggested set.
  const fitOrders = useMemo(() => new Map([...results].map(([id, r]) => [id, r.ranking as Typology[]])), [results]);
  const suggestions = useMemo(() => {
    if (!hasPlaceData || !hudTable) return new Map<string, Recommendation>();
    return suggestAll(placeById, hudTable, focus, { level: plan.level, size: plan.size, age: plan.age, flood: plan.flood, transitMi: plan.transitMi }, fitOrders);
  }, [focus, plan.level, plan.size, plan.age, plan.flood, plan.transitMi, fitOrders]);
  const { paint, counts } = useMemo(() => {
    const values = new Map<string, number | null>();
    const counts: Record<string, number> = { none: 0, flood: 0 };
    // Tracts above the reader's flood limit get their own swatch (after the five type colors) and their own count.
    const floodIdx = TYPOLOGY_COLORS.length;
    for (const t of rankedTracts) {
      const rec = suggestions.get(t.GEOID);
      const lead = rec?.types[0]?.typology ?? null;
      if (!lead && rec?.floodLimit?.blocked) {
        values.set(t.GEOID, floodIdx);
        counts.flood += 1;
        continue;
      }
      values.set(t.GEOID, lead ? TYPOLOGY_INDEX.get(lead) ?? null : null);
      counts[lead ?? 'none'] = (counts[lead ?? 'none'] ?? 0) + 1;
    }
    const paint: MapPaint = { kind: 'cat', palette: [...TYPOLOGY_COLORS, FLOOD_FILL], values };
    return { paint, counts };
  }, [suggestions]);

  const t = selectedId ? tractById.get(selectedId) : null;
  const r = selectedId ? results.get(selectedId) ?? { scores: [], ranking: [], top: null, topScore: null } : null;
  const rec = selectedId ? suggestions.get(selectedId) ?? null : null;
  const lead = rec?.types[0]?.typology ?? null;
  const buildingColor = lead ? typologyById.get(lead)?.color : null;
  const padding = useMemo(() => ({ top: 90, bottom: 90, left: ui.left ? 420 : 70, right: ui.right ? 500 : 70 }), [ui.left, ui.right]);
  const focusLabel = STANCE_LABEL[focus];
  const noneLabel = focus === 'market_led' || plan.level === 'market' ? 'No suggestion (the market test fails or cannot run)' : focus === 'transit_first' ? 'No suggestion (no under-served renters at this level, or frequent transit farther than you chose)' : focus === 'climate_resilient' ? 'No suggestion (over 5% of land in a flood zone, transit too far, or no under-served renters)' : 'No suggestion (no under-served renters at this level)';

  // On entry with no tract the camera frames the whole city inside the space the panels leave. Measured once, from
  // this element's size, before the map mounts; with a tract selected the map flies to it as before.
  const root = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View | null | undefined>(undefined);
  useLayoutEffect(() => {
    const el = root.current;
    const s = useApp.getState();
    const pad = { top: 90, bottom: 90, left: s.ui.left ? 420 : 70, right: s.ui.right ? 500 : 70 };
    setView(!s.selectedId && el ? cityView(el.clientWidth, el.clientHeight, pad) : null);
  }, []);

  return (
    <div ref={root} className="relative h-full">
      {view !== undefined && (
        <MapView
          paint={paint}
          selectedId={selectedId}
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
      <Rail float title={UI.matchTab} maxHeightClass="max-h-[calc(100%-4.75rem-12.5rem)]">
        <RailSection id="priorities" title="Focusing issue">
          <FocusPicker
            value={focus}
            onChange={(s) => {
              plan.setPlan({ focus: s });
              applyPreset(s);
            }}
          />
        </RailSection>
        <RailSection id="colorBy" title="Who you’re planning for">
          <PlanInputs />
        </RailSection>
        <AdvancedSettings focus={focus} weights={weights} onChange={setWeights} custom={!isStance(preset)} onReset={() => applyPreset(focus)} />
      </Rail>
      <RightColumn>
        <AnalysisChat />
        <PanelFrame inline>{t && r ? <TractDetail t={t} r={r} weights={weights} rec={rec} fitOrder={fitOrders.get(t.GEOID)} onClose={() => select(null)} /> : <StartCard />}</PanelFrame>
      </RightColumn>
      {(
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-3 left-3 z-20 w-[340px] xl:w-[360px]">
          <SuggestionLegend focus={focusLabel} level={[plan.size === 'auto' ? '' : sizeWord(plan.size), plan.age === 'any' ? '' : AGE_LABEL[plan.age].toLowerCase(), LEVEL_LABEL[plan.level]].filter(Boolean).join(' · ')} counts={counts} noneLabel={noneLabel} />
        </motion.div>
      )}
    </div>
  );
}
