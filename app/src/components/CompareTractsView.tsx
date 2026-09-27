import { useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { tractById, tractLabel, tractsFC, typologyById } from '../lib/data';
import { compareTakeaway, stabilityFor, tLabel, useAllResults, type TractResult } from '../lib/derived';
import { usePaint } from '../lib/paint';
import { useApp } from '../lib/store';
import { UI } from '../lib/copy';
import { cx } from '../lib/format';
import { closeCallOverlay } from '../lib/analysis/closeCalls';
import { compareMessage, compareState, factorDeltasSafe } from '../lib/analysis/compare';
import { guardChips, rationale, whySentence, type GuardChip, type Rationale } from '../lib/analysis/rationale';
import { stabilityBand, stabilityText } from '../lib/analysis/stability';
import type { Stability } from '../lib/scoring';
import type { TractProps } from '../lib/types';
import Rail, { RailSection } from './Rail';
import TractSearch from './TractSearch';
import WeightPanel from './WeightPanel';
import MetricPicker from './MetricPicker';
import SyncedMapPair from './SyncedMapPair';
import Legend from './Legend';
import TypologyRankList from './TypologyRankList';
import FactorDeltaBars from './FactorDeltaBars';
import AnalysisChat from './AnalysisChat';
import { MapTooltip } from './MatchView';
import PanelTitle from './analysis/PanelTitle';
import { Dot, Segmented } from './primitives';

export const COLOR_A = '#7c3aed';
export const COLOR_B = '#0f766e';

export function MapChip({ tag, color, title, sub }: { tag: string; color: string; title: string; sub?: ReactNode }) {
  return (
    <div className="pointer-events-none absolute left-2.5 top-2.5 z-10 flex items-center gap-2 rounded-xl bg-white/95 py-1.5 pl-1.5 pr-3 shadow-lg ring-1 ring-black/5 backdrop-blur">
      <span className="grid h-6 w-6 place-items-center rounded-lg text-small font-bold text-white" style={{ background: color }}>
        {tag}
      </span>
      <div className="leading-tight">
        <div className="text-small font-semibold text-slate-900">{title}</div>
        {sub && <div className="text-caption text-slate-700">{sub}</div>}
      </div>
    </div>
  );
}

const CHIP_TONE: Record<GuardChip['tone'], string> = {
  neutral: 'bg-stone-100 text-slate-700 ring-stone-200',
  warn: 'bg-amber-50 text-amber-900 ring-amber-200',
  alert: 'bg-rose-50 text-rose-900 ring-rose-200',
  tie: 'bg-slate-800 text-white ring-slate-800',
};

/** The three guard chips (factors scored, low-income renter count, lead) as one small row. */
function ChipRow({ chips }: { chips: GuardChip[] }) {
  if (!chips.length) return null;
  return (
    <ul className="flex flex-wrap gap-1" aria-label="Checks on this ranking">
      {chips.map((c) => (
        <li key={c.id} className={cx('rounded-full px-2 py-0.5 text-caption font-medium ring-1', CHIP_TONE[c.tone])} title={c.detail}>
          {c.text}
        </li>
      ))}
    </ul>
  );
}

const BAND_TONE = { solid: 'bg-emerald-50 text-emerald-900 ring-emerald-200', likely: 'bg-amber-50 text-amber-900 ring-amber-200', close: 'bg-rose-50 text-rose-900 ring-rose-200' };

/** Strips the score parentheticals a shared sentence may carry: "(70/100)", "(70 vs 65)". */
export const wordsOnly = (s: string) => s.replace(/ \((?:\d+\/100|\d+ vs \d+)\)/g, '');

/** The stability sentence for one side, or nothing on a tie, with zero draws or when the sampled top is not the pick. */
function StabilityLine({ s, ra }: { s: Stability | null; ra: Rationale }) {
  const band = stabilityBand(s, ra);
  const text = stabilityText(band);
  if (!text) return null;
  return <p className={cx('rounded-lg px-2.5 py-1.5 text-caption ring-1', BAND_TONE[band.band])}>{text}</p>;
}

/** One side's column under the maps: its ranking, the guard chips and the stability line; or why it has no ranking. */
function Side({ tag, color, t, r, ra, s, idPrefix }: { tag: 'A' | 'B'; color: string; t: TractProps | null; r: TractResult | null; ra: Rationale | null; s: Stability | null; idPrefix: string }) {
  return (
    <div>
      <PanelTitle
        right={
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-caption font-bold text-white" style={{ background: color }}>
            {tag}
          </span>
        }
      >
        {tractLabel(t)}
      </PanelTitle>
      {r && r.top && ra ? (
        <>
          <TypologyRankList result={r} compact idPrefix={idPrefix} />
          <div className="mt-2 space-y-1.5">
            <ChipRow chips={guardChips(ra)} />
            <StabilityLine s={s} ra={ra} />
          </div>
        </>
      ) : t && ra ? (
        <p className="text-caption text-slate-600">{whySentence(t, ra)}</p>
      ) : null}
    </div>
  );
}

export default function CompareTractsView({ active = true }: { active?: boolean }) {
  const a = useApp((s) => s.selectedId);
  const b = useApp((s) => s.compareId);
  const weights = useApp((s) => s.weights);
  const metric = useApp((s) => s.metric);
  const pin = useApp((s) => s.pin);
  const lite = useApp((s) => s.lite);
  const { set, setWeights } = useApp.getState();
  const results = useAllResults(weights);
  const paint = usePaint(metric, results);
  const ta = a ? tractById.get(a) ?? null : null;
  const tb = b ? tractById.get(b) ?? null : null;
  const ra = a ? results.get(a) ?? null : null;
  const rb = b ? results.get(b) ?? null : null;
  const raA = useMemo(() => (ta && ra ? rationale(ta, ra, weights) : null), [ta, ra, weights]);
  const raB = useMemo(() => (tb && rb ? rationale(tb, rb, weights) : null), [tb, rb, weights]);
  const state = compareState(ta, tb, ra, rb, weights);
  const message = compareMessage(state, ta, tb);
  /** Both sides present and ranked under some weight: the only case with bars. */
  const pair = useMemo(() => (state === 'ok' && ta && tb && ra && rb ? { ta, tb, ra, rb } : null), [state, ta, tb, ra, rb]);
  const ok = !!pair;

  // The type whose match is compared: A's top pick, or the reader's choice when the two tops differ.
  const topA = ra?.top ?? null, topB = rb?.top ?? null;
  const [basisChoice, setBasisChoice] = useState<string | null>(null);
  const basis = ok && basisChoice && (basisChoice === topA || basisChoice === topB) ? basisChoice : topA ?? topB;
  const rows = useMemo(() => (pair ? factorDeltasSafe(pair.ta, pair.tb, pair.ra, pair.rb, basis ?? undefined) : []), [pair, basis]);
  // Ranks and words on the Analysis tab: the takeaway's score parentheticals ("(70/100)", "(70 vs 65)") are dropped
  // here, since lib/derived is shared with Explore and is not edited for it.
  const takeaway = wordsOnly(message ?? (pair ? compareTakeaway(pair.ta, pair.tb, pair.ra, pair.rb) : compareMessage('need_two', ta, tb)!));
  const sa = useMemo(() => (a ? stabilityFor(a, weights) : null), [a, weights]);
  const sb = useMemo(() => (b ? stabilityFor(b, weights) : null), [b, weights]);
  const overlays = useMemo(() => (metric.kind === 'pick' ? [closeCallOverlay(results, tractsFC)] : undefined), [metric.kind, results]);
  const topSub = (r: TractResult | null) =>
    r?.top ? (
      <span className="inline-flex items-center gap-1">
        <Dot color={typologyById.get(r.top)!.color} size={8} />
        Best match: {typologyById.get(r.top)!.label}
      </span>
    ) : (
      'Not ranked'
    );
  const tooltip = (id: string) => <MapTooltip id={id} results={results} />;
  const basisLabel = tLabel(basis);

  return (
    <MotionConfig reducedMotion={!active || lite ? 'always' : 'user'}>
      <div className="flex h-full">
        <Rail title={UI.compareTractsTab}>
          <AnalysisChat compact />
          <RailSection id="place" title="Choose two places" sub="Search an address, neighborhood or tract.">
            <div className="space-y-2">
              <TractSearch value={a} onChange={(id) => set({ selectedId: id })} tag="A" tagColor={COLOR_A} showQuickPicks={false} exclude={b} label="Place A" />
              <TractSearch value={b} onChange={(id) => set({ compareId: id })} tag="B" tagColor={COLOR_B} showQuickPicks={false} exclude={a} label="Place B" />
            </div>
            <button onClick={() => set({ selectedId: b, compareId: a })} className="mt-2 w-full rounded-lg py-1.5 text-small font-semibold text-slate-700 hover:bg-stone-100 hover:text-slate-900">
              ⇅ Swap A and B
            </button>
          </RailSection>
          <RailSection id="priorities" title="Stance (both places)">
            <WeightPanel weights={weights} onChange={setWeights} compact hideTitle />
          </RailSection>
          <RailSection id="colorBy" title={UI.colorBy}>
            <MetricPicker value={metric} onChange={(m) => set({ metric: m })} hideTitle />
          </RailSection>
        </Rail>
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="relative h-[63%] min-h-[380px] shrink-0">
            <SyncedMapPair
              a={{ paint, selectedId: a, pin, overlays, buildingColor: ra?.top ? typologyById.get(ra.top)?.color : null, tooltip, onSelect: (id) => set({ selectedId: id }), overlay: <MapChip tag="A" color={COLOR_A} title={tractLabel(ta)} sub={topSub(ra)} /> }}
              b={{ paint, selectedId: b, pin, overlays, buildingColor: rb?.top ? typologyById.get(rb.top)?.color : null, tooltip, onSelect: (id) => set({ compareId: id }), overlay: <MapChip tag="B" color={COLOR_B} title={tractLabel(tb)} sub={topSub(rb)} /> }}
            >
              <div className="absolute bottom-3 left-3 z-10">
                <Legend metric={metric} compact />
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
            <div className="grid grid-cols-[1fr_1.35fr_1fr] gap-3">
              <Side tag="A" color={COLOR_A} t={ta} r={ra} ra={raA} s={sa} idPrefix="ra" />
              <div>
                <PanelTitle
                  sub={ok ? `Comparing the ${basisLabel} match in both places` : undefined}
                  right={
                    ok && topA && topB && topA !== topB ? (
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
                  Why they differ
                </PanelTitle>
                {pair && rows.length ? <FactorDeltaBars rows={rows} ta={pair.ta} tb={pair.tb} colorA={COLOR_A} colorB={COLOR_B} labelA={tractLabel(ta)} labelB={tractLabel(tb)} typology={basisLabel} /> : <p className="text-caption text-slate-600">{message ?? compareMessage('need_two', ta, tb)}</p>}
              </div>
              <Side tag="B" color={COLOR_B} t={tb} r={rb} ra={raB} s={sb} idPrefix="rb" />
            </div>
          </div>
        </main>
      </div>
    </MotionConfig>
  );
}
