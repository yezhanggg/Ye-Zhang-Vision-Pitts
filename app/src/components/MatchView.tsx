import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FMR_2BR, focusTracts, hasAskingRents, meta, rankedTracts, scoring, tractById, tractLabel, tractSubLabel, typologyById } from '../lib/data';
import { stabilityFor, tLabel, topCounts, useAllResults, type TractResult } from '../lib/derived';
import { usePaint } from '../lib/paint';
import { MAX_SCENARIOS, matchPreset, useApp } from '../lib/store';
import { fmtInt, fmtMoney, fmtPct, fmtSignedPct, score100 } from '../lib/format';
import { PRESSURE_HOW, RENT_CAVEAT, RENT_HOW, SCORE_HOW, UI, directionWord, matchText, percentilePhrase } from '../lib/copy';
import { useExplanation } from '../lib/explainRemote';
import type { TractProps } from '../lib/types';
import MapView from './MapView';
import Rail, { RailSection } from './Rail';
import PanelFrame from './PanelFrame';
import TractSearch from './TractSearch';
import WeightPanel from './WeightPanel';
import MetricPicker from './MetricPicker';
import Legend from './Legend';
import TypologyRankList, { StabilityBadge } from './TypologyRankList';
import FactorCards from './FactorCards';
import DataLimitsPanel from './DataLimitsPanel';
import { ConfChip, Dot, Explainer, InfoTip, ObservedBadge, SectionTitle, readableColor } from './primitives';

export function MapTooltip({ id, results }: { id: string; results: Map<string, TractResult> }) {
  const t = tractById.get(id);
  const r = results.get(id);
  if (!t) return null;
  return (
    <div className="max-w-64">
      <div className="font-semibold">{tractLabel(t)}</div>
      <div className="text-caption text-white/75">{tractSubLabel(t)}</div>
      {!t.residential ? (
        <div className="mt-1 text-white/80">Not ranked (fewer than 25 households)</div>
      ) : r?.top ? (
        <div className="mt-1 flex items-center gap-1.5">
          <Dot color={typologyById.get(r.top)?.color ?? '#999'} size={9} />
          <span>
            Best match: <b>{tLabel(r.top)}</b> ({score100(r.topScore)}/100)
          </span>
        </div>
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
            Neighboring tracts’ markets are <b>{word}</b> than this one ({p > 0 ? '+' : ''}
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

function CitySummary({ results }: { results: Map<string, TractResult> }) {
  const select = useApp((s) => s.select);
  const set = useApp((s) => s.set);
  const counts = useMemo(() => topCounts(results), [results]);
  const n = results.size;
  const lead = scoring.typologies.map((t) => ({ t, c: counts[t.id] ?? 0 })).sort((a, b) => b.c - a.c)[0];
  const watch = rankedTracts.filter((t) => t.watch_list);
  return (
    <div className="space-y-5 p-5">
      <div>
        <div className="text-small font-semibold text-violet-700">Start here</div>
        <h2 className="mt-1 font-display text-title font-bold text-slate-900">Pick a place to see which kind of housing fits it best, and why.</h2>
        <ul className="mt-3 space-y-1.5 text-body text-slate-700">
          {['Search an address or click the map.', 'Choose what matters most and watch the ranking change.', 'Compare two places, or two sets of priorities.'].map((t) => (
            <li key={t} className="flex gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-600" aria-hidden />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="mb-1.5 text-small text-slate-700">Demo neighborhoods</div>
        <div className="flex flex-wrap gap-1.5">
          {focusTracts.map((t) => (
            <button key={t.GEOID} onClick={() => select(t.GEOID)} className="rounded-full bg-white px-3 py-1 text-small font-medium text-slate-800 ring-1 ring-stone-300 hover:bg-violet-50 hover:text-violet-800 hover:ring-violet-200">
              {tractLabel(t)}
            </button>
          ))}
        </div>
      </div>
      <button onClick={() => set({ metric: { kind: 'lens', id: 'bivariate' } })} className="block w-full rounded-xl bg-rose-50 px-3 py-2.5 text-left ring-1 ring-rose-200 hover:bg-rose-100/70">
        <div className="text-small font-semibold text-rose-900">
          Watch list: <span className="tnum">{watch.length}</span> tracts with high need and a rising market
        </div>
        <div className="text-caption text-rose-800">About {fmtInt(watch.reduce((s, t) => s + (t.need_count ?? 0), 0))} renter households at ≤50% AMI live in them. Show on the map →</div>
      </button>
      <div>
        <SectionTitle sub={lead ? `${lead.t.label} wins in the most places (${lead.c} of ${n}).` : undefined}>Best match across all {n} ranked tracts</SectionTitle>
        <div className="space-y-2">
          {scoring.typologies.map((t) => {
            const c = counts[t.id] ?? 0;
            return (
              <div key={t.id} className="flex items-center gap-2 text-small">
                <span className="w-32 shrink-0 truncate text-slate-800">{t.label}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                  <motion.div className="h-full rounded-full" style={{ background: t.color }} initial={false} animate={{ width: `${n ? (c / n) * 100 : 0}%` }} transition={{ type: 'spring', stiffness: 220, damping: 30 }} />
                </div>
                <span className="w-9 text-right font-semibold text-slate-900 tnum">{c}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-caption text-slate-600">{meta.n_tracts ?? 0} city tracts in all; {(meta.n_tracts ?? 0) - n} with fewer than 25 households are shown but not ranked.</p>
      </div>
    </div>
  );
}

function AnswerCard({ t, r, weights }: { t: TractProps; r: TractResult; weights: Record<string, number> }) {
  const stability = useMemo(() => stabilityFor(t.GEOID, weights), [t.GEOID, weights]);
  const top = r.top ? typologyById.get(r.top) : null;
  const presetLabel = scoring.presets.find((p) => p.id === matchPreset(weights))?.label ?? null;
  const ex = useExplanation(t, r, weights, stability, presetLabel);
  if (!top) return <div className="rounded-2xl bg-stone-50 p-4 text-body text-slate-700 ring-1 ring-stone-200">{ex.text}</div>;
  return (
    <div className="rounded-2xl p-4 ring-1" style={{ background: `${top.color}14`, boxShadow: `inset 0 0 0 1px ${top.color}40` }}>
      <div className="text-small font-medium text-slate-700">{UI.bestMatch}</div>
      <AnimatePresence mode="wait">
        <motion.div key={top.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
          <div className="font-display text-display font-bold" style={{ color: readableColor(top.color) }}>
            {top.label}
          </div>
          <div className="mt-0.5 text-small text-slate-700">
            {top.long} · <b className="text-slate-900">{matchText(r.topScore)}</b>
          </div>
        </motion.div>
      </AnimatePresence>
      <p className="mt-2.5 text-body text-slate-800">{ex.text}</p>
      <div className="mt-3">
        <StabilityBadge stability={stability} />
      </div>
      <p className="mt-2 text-caption text-slate-600">{ex.source === 'ai' ? `${UI.whyAI(ex.provider ?? 'an AI model')} (${ex.model}).` : `${UI.whyAuto}.`}</p>
    </div>
  );
}

export function TractDetail({ t, r, weights, onClose }: { t: TractProps; r: TractResult; weights: Record<string, number>; onClose?: () => void }) {
  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-stone-100 bg-white/95 px-5 pb-3 pt-4 backdrop-blur">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate font-display text-title font-bold text-slate-900">{tractLabel(t)}</h2>
            <div className="text-small text-slate-600 tnum">
              {tractSubLabel(t)}
              {t.focus && <span className="ml-2 rounded-full bg-violet-50 px-2 py-px text-caption font-semibold text-violet-700 ring-1 ring-violet-200">demo</span>}
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-stone-100 hover:text-slate-900" aria-label="Clear selection">
              <svg viewBox="0 0 20 20" className="h-4 w-4">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="space-y-6 p-5">
        {t.residential ? (
          <>
            <AnswerCard t={t} r={r} weights={weights} />
            <section>
              <SectionTitle right={<InfoTip label="How the match score works" side="bottom">{SCORE_HOW}</InfoTip>} sub="Match score (0–100) combines your priorities with observed data.">
                {UI.howTypesCompare}
              </SectionTitle>
              <TypologyRankList result={r} />
            </section>
          </>
        ) : (
          <div className="hatch rounded-2xl px-4 py-3 text-body text-slate-700 ring-1 ring-stone-200">{UI.notRanked}</div>
        )}
        <PressureCard t={t} />
        <AboutPlace t={t} />
        <Explainer
          tone="card"
          title={
            <span>
              <span className="block">{UI.dataBehind}</span>
              <span className="block text-caption font-normal text-slate-600">The 6 factors, their sources and how they are calculated</span>
            </span>
          }
          right={<ObservedBadge small />}
        >
          <p className="mb-2 text-small text-slate-700">Observed public data, ranked against every residential tract in the city. The violet line on each card shows how much you told us it matters.</p>
          <FactorCards t={t} weights={weights} topTypology={r.top} />
        </Explainer>
        <DataLimitsPanel t={t} />
      </div>
    </div>
  );
}

/** Analysis → Match: search a place, set priorities, read which housing type fits it best and why. */
export default function MatchView() {
  const selectedId = useApp((s) => s.selectedId);
  const weights = useApp((s) => s.weights);
  const metric = useApp((s) => s.metric);
  const lite = useApp((s) => s.lite);
  const layers = useApp((s) => s.layers);
  const scenarios = useApp((s) => s.scenarios);
  const pin = useApp((s) => s.pin);
  const ui = useApp((s) => s.ui);
  const { set, select, setWeights, saveScenario } = useApp.getState();
  const results = useAllResults(weights);
  const paint = usePaint(metric, results);
  const t = selectedId ? tractById.get(selectedId) : null;
  const r = selectedId ? results.get(selectedId) ?? { scores: [], ranking: [], top: null, topScore: null } : null;
  const buildingColor = r?.top ? typologyById.get(r.top)?.color : null;
  const presetName = scoring.presets.find((p) => p.id === matchPreset(weights))?.label;
  const padding = useMemo(() => ({ top: 90, bottom: 90, left: ui.left ? 420 : 70, right: ui.right ? 500 : 70 }), [ui.left, ui.right]);

  return (
    <div className="relative h-full">
      <MapView
        paint={paint}
        selectedId={selectedId}
        buildingColor={buildingColor}
        lite={lite}
        terrain={layers.terrain}
        buildings={layers.buildings}
        padding={padding}
        pin={pin}
        elevationReadout
        onSelect={select}
        idleOrbit
        tooltip={(id) => <MapTooltip id={id} results={results} />}
      />
      <Rail float title={UI.matchTab}>
        <RailSection id="place" title="Find a place">
          <TractSearch value={selectedId} onChange={select} label="Search an address, neighborhood or tract" />
        </RailSection>
        <RailSection id="priorities" title={UI.whatMatters}>
          <WeightPanel weights={weights} onChange={setWeights} hideTitle />
        </RailSection>
        <RailSection id="colorBy" title={UI.colorBy}>
          <MetricPicker value={metric} onChange={(m) => set({ metric: m })} hideTitle />
        </RailSection>
        <RailSection id="save" title={UI.saveCompare} sub="Keep these priorities and see how the map changes under another set.">
          <button
            disabled={scenarios.length >= MAX_SCENARIOS}
            onClick={() => {
              saveScenario(presetName ?? `Custom ${scenarios.length + 1}`, weights);
              set({ mode: 'scenarios', editing: 'B' });
            }}
            className="w-full rounded-xl bg-slate-900 px-3 py-2.5 text-small font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
          >
            Save “{presetName ?? 'Custom mix'}” and compare →
          </button>
        </RailSection>
      </Rail>
      <PanelFrame>{t && r ? <TractDetail t={t} r={r} weights={weights} onClose={() => select(null)} /> : <CitySummary results={results} />}</PanelFrame>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`absolute bottom-3 z-20 transition-[left] duration-200 ${ui.left ? 'left-[364px] xl:left-[384px]' : 'left-3'}`}>
        <Legend metric={metric} buildings={buildingColor} />
      </motion.div>
    </div>
  );
}
