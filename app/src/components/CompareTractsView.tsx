import { useMemo, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { tractById, tractLabel, typologyById } from '../lib/data';
import { compareTakeaway, factorDeltas, stabilityFor, tLabel, useAllResults, type TractResult } from '../lib/derived';
import { usePaint } from '../lib/paint';
import { useApp } from '../lib/store';
import { UI } from '../lib/copy';
import Rail, { RailSection } from './Rail';
import TractSearch from './TractSearch';
import WeightPanel from './WeightPanel';
import MetricPicker from './MetricPicker';
import SyncedMapPair from './SyncedMapPair';
import Legend from './Legend';
import TypologyRankList, { StabilityBadge } from './TypologyRankList';
import FactorDeltaBars from './FactorDeltaBars';
import { MapTooltip } from './MatchView';
import { Dot, SectionTitle } from './primitives';

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

export default function CompareTractsView() {
  const a = useApp((s) => s.selectedId);
  const b = useApp((s) => s.compareId);
  const weights = useApp((s) => s.weights);
  const metric = useApp((s) => s.metric);
  const pin = useApp((s) => s.pin);
  const { set, setWeights } = useApp.getState();
  const results = useAllResults(weights);
  const paint = usePaint(metric, results);
  const ta = a ? tractById.get(a) : null;
  const tb = b ? tractById.get(b) : null;
  const ra = a ? results.get(a) ?? null : null;
  const rb = b ? results.get(b) ?? null : null;
  const rows = useMemo(() => (ta && tb && ra && rb ? factorDeltas(ta, tb, ra, rb) : []), [ta, tb, ra, rb]);
  const takeaway = ta && tb && ra && rb ? compareTakeaway(ta, tb, ra, rb) : 'Pick two places to compare.';
  const sa = useMemo(() => (a ? stabilityFor(a, weights) : null), [a, weights]);
  const sb = useMemo(() => (b ? stabilityFor(b, weights) : null), [b, weights]);
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

  return (
    <div className="flex h-full">
      <Rail title={UI.compareTractsTab}>
        <RailSection id="place" title="Choose two places" sub="Search an address, neighborhood or tract.">
          <div className="space-y-2">
            <TractSearch value={a} onChange={(id) => set({ selectedId: id })} tag="A" tagColor={COLOR_A} showQuickPicks={false} exclude={b} label="Place A" />
            <TractSearch value={b} onChange={(id) => set({ compareId: id })} tag="B" tagColor={COLOR_B} showQuickPicks={false} exclude={a} label="Place B" />
          </div>
          <button onClick={() => set({ selectedId: b, compareId: a })} className="mt-2 w-full rounded-lg py-1.5 text-small font-semibold text-slate-700 hover:bg-stone-100 hover:text-slate-900">
            ⇅ Swap A and B
          </button>
        </RailSection>
        <RailSection id="priorities" title="What matters most? (both places)">
          <WeightPanel weights={weights} onChange={setWeights} compact hideTitle />
        </RailSection>
        <RailSection id="colorBy" title={UI.colorBy}>
          <MetricPicker value={metric} onChange={(m) => set({ metric: m })} hideTitle />
        </RailSection>
      </Rail>
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="relative h-[46%] min-h-[260px]">
          <SyncedMapPair
            a={{ paint, selectedId: a, pin, buildingColor: ra?.top ? typologyById.get(ra.top)?.color : null, tooltip, onSelect: (id) => set({ selectedId: id }), overlay: <MapChip tag="A" color={COLOR_A} title={tractLabel(ta)} sub={topSub(ra)} /> }}
            b={{ paint, selectedId: b, pin, buildingColor: rb?.top ? typologyById.get(rb.top)?.color : null, tooltip, onSelect: (id) => set({ compareId: id }), overlay: <MapChip tag="B" color={COLOR_B} title={tractLabel(tb)} sub={topSub(rb)} /> }}
          >
            <div className="absolute bottom-3 left-3 z-10">
              <Legend metric={metric} compact />
            </div>
          </SyncedMapPair>
        </div>
        <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto bg-[#fbfaf8] px-5 py-4">
          <AnimatePresence mode="wait">
            <motion.div key={takeaway} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="mb-4 flex items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-stone-200/80">
              <span className="mt-0.5 rounded-md bg-slate-900 px-1.5 py-0.5 text-caption font-bold uppercase tracking-wider text-white">Takeaway</span>
              <p className="font-display text-lead font-medium text-slate-900">{takeaway}</p>
            </motion.div>
          </AnimatePresence>
          <div className="grid grid-cols-[1fr_1.25fr_1fr] gap-4">
            <div>
              <SectionTitle
                right={
                  <span className="grid h-6 w-6 place-items-center rounded-md text-small font-bold text-white" style={{ background: COLOR_A }}>
                    A
                  </span>
                }
              >
                {tractLabel(ta)}
              </SectionTitle>
              {ra && ra.top && <TypologyRankList result={ra} compact idPrefix="ra" />}
              <div className="mt-2">{sa && <StabilityBadge stability={sa} compact />}</div>
            </div>
            <div>
              <SectionTitle>Why they differ</SectionTitle>
              {rows.length ? <FactorDeltaBars rows={rows} colorA={COLOR_A} colorB={COLOR_B} labelA={tractLabel(ta)} labelB={tractLabel(tb)} typology={tLabel(ra?.top ?? rb?.top ?? null)} /> : <p className="text-small text-slate-600">Pick two ranked places.</p>}
            </div>
            <div>
              <SectionTitle
                right={
                  <span className="grid h-6 w-6 place-items-center rounded-md text-small font-bold text-white" style={{ background: COLOR_B }}>
                    B
                  </span>
                }
              >
                {tractLabel(tb)}
              </SectionTitle>
              {rb && rb.top && <TypologyRankList result={rb} compact idPrefix="rb" />}
              <div className="mt-2">{sb && <StabilityBadge stability={sb} compact />}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
