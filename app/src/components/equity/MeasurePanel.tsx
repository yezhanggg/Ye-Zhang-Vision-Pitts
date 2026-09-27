// The measure section beside the map, only about the measure chosen in ①: what it is, a few plain sentences on the
// city picture (lib/equity/explain), tracts per map class, the spread with the city median, the selected tract
// against the city on all six measures, and every ranked tract, most need first (a quarter of the height).
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../../lib/store';
import { tractById, tractLabel } from '../../lib/data';
import { cx } from '../../lib/format';
import { hud, placeById } from '../../lib/place/data';
import { histogram } from '../../lib/explore/summary';
import { MEASURES, measureValue, type AmiPct, type Legend, type MeasureDef, type MeasureId } from '../../lib/equity/measures';
import { classCounts, explainMeasure, needPercentile, type TractValue } from '../../lib/equity/explain';
import { DRAW, SERIES, SPIN } from '../charts';
import { InfoTip, SPRING_PANEL } from '../primitives';
import type { ReadingState } from '../../lib/equity/reading';
import { Sparkles } from 'lucide-react';
import { nameOf } from './names';


/** A value without its unit word (the unit is in the header). */
const bare = (s: string) => s.replace(/ (households|jobs|places)$/, '').replace('not available', 'n/a');

/** A section heading: a short label, with any explanation behind a small ⓘ (clean by default, details on hover). */
function Heading({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-1 flex items-center gap-1">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{children}</h3>
      {right && (
        <InfoTip label={`About ${typeof children === 'string' ? children.toLowerCase() : 'this chart'}`} width={240}>
          {right}
        </InfoTip>
      )}
    </div>
  );
}

/** Tracts per map class as a donut (same colors as the map legend), with counts beside it. */
function ClassDonut({ legend, values, size = 68 }: { legend: Legend; values: TractValue[]; size?: number }) {
  const lite = useApp((s) => s.lite);
  const { classes, missing } = classCounts(legend, values);
  const parts = [...classes, ...(missing ? [{ color: '#e7e5e4', label: 'no value', count: missing }] : [])];
  const total = parts.reduce((s, p) => s + p.count, 0);
  const r = 26,
    c = 2 * Math.PI * r;
  let off = 0;
  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 68 68" className="shrink-0" role="img" aria-label={parts.map((p) => `${p.label}: ${p.count}`).join(', ')}>
        <circle cx="34" cy="34" r={r} fill="none" stroke="#f1f0ee" strokeWidth="11" />
        <motion.g style={{ originX: '34px', originY: '34px' }} initial={lite ? false : { rotate: -240, opacity: 0.25 }} animate={{ rotate: 0, opacity: 1 }} transition={SPIN}>
          {total > 0 &&
            parts.map((p, i) => {
              if (!p.count) return null;
              const len = (p.count / total) * c;
              const gap = parts.filter((q) => q.count).length > 1 ? 1.5 : 0;
              const el = <motion.circle key={p.label} cx="34" cy="34" r={r} fill="none" stroke={p.color} strokeWidth="11" strokeDashoffset={-off} transform="rotate(-90 34 34)" initial={lite ? false : { strokeDasharray: `0 ${c}` }} animate={{ strokeDasharray: `${Math.max(0, len - gap)} ${c}` }} transition={{ ...DRAW, delay: lite ? 0 : 0.1 + i * 0.07 }} />;
              off += len;
              return el;
            })}
        </motion.g>
        <text x="34" y="33" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0f172a">
          {total}
        </text>
        <text x="34" y="44" textAnchor="middle" fontSize="8" fill="#64748b">
          tracts
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-px">
        {parts.map((p, i) => (
          <motion.li key={p.label} initial={lite ? false : { opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...DRAW, delay: lite ? 0 : 0.15 + i * 0.05 }} className="flex items-center gap-1.5 text-caption leading-[14px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm ring-1 ring-black/10" style={{ background: p.color }} />
            <span className="min-w-0 flex-1 truncate text-slate-600" title={p.label}>
              {p.label}
            </span>
            <span className="shrink-0 font-semibold text-slate-900 tnum">{p.count}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

/** The spread across tracts, bars in the map's class colors, the city median dashed and the selected tract in violet. */
/** The element's content size, kept current. */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

function Spread({ def, legend, values, median, selected, width, height }: { def: MeasureDef; legend: Legend; values: TractValue[]; median: number | null; selected: number | null; width: number; height: number }) {
  const lite = useApp((s) => s.lite);
  const h = useMemo(() => histogram(values.map((v) => v.value), 16), [values]);
  const W = Math.max(120, width),
    H = Math.max(52, Math.min(220, height)),
    P = { l: 2, r: 2, t: 13, b: 14 };
  if (h.edges.length < 2) return <div className="hatch rounded-md px-2 py-3 text-caption text-slate-600">Too few values to draw.</div>;
  const lo = h.edges[0],
    hi = h.edges[h.edges.length - 1];
  const maxC = Math.max(...h.counts, 1);
  const bw = (W - P.l - P.r) / h.counts.length;
  const xOf = (v: number) => P.l + ((v - lo) / (hi - lo || 1)) * (W - P.l - P.r);
  const short = (v: number) => bare(def.fmt(v)).replace('/mo', '');
  type Mark = { v: number; label: string; color: string };
  const marks = ([
    median != null ? { v: median, label: `median ${short(median)}`, color: SERIES.city } : null,
    selected != null ? { v: selected, label: 'selected', color: SERIES.place } : null,
  ] as (Mark | null)[]).filter((m): m is Mark => !!m);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" role="img" aria-label={`${def.title} across ${h.n} tracts; city median ${def.fmt(median)}`}>
      {h.counts.map((n, i) => {
        const mid = (h.edges[i] + h.edges[i + 1]) / 2;
        const cls = legend.classOf(mid);
        const bh = (n / maxC) * (H - P.t - P.b);
        return (
          <motion.rect key={i} x={P.l + i * bw + 0.75} width={Math.max(1, bw - 1.5)} rx="1.5" fill={cls == null ? '#cbd5e1' : legend.colors[cls]} stroke="rgba(0,0,0,0.08)" initial={lite ? false : { height: 0, y: H - P.b }} animate={{ height: bh, y: H - P.b - bh }} transition={{ ...DRAW, delay: lite ? 0 : i * 0.025 }}>
            <title>{`${def.fmt(h.edges[i])} to ${def.fmt(h.edges[i + 1])}: ${n} tracts`}</title>
          </motion.rect>
        );
      })}
      {marks.map((m, i) => {
        const x = xOf(m.v);
        const anchor = x > W * 0.8 ? 'end' : x < W * 0.2 ? 'start' : 'middle';
        const near = marks.length === 2 && Math.abs(xOf(marks[0].v) - xOf(marks[1].v)) < 60;
        return (
          <g key={m.label}>
            <line x1={x} x2={x} y1={P.t - 1} y2={H - P.b} stroke={m.color} strokeWidth="1.5" strokeDasharray={i === 0 ? '3 2' : undefined} />
            <text x={x + (near ? (i === 0 ? -3 : 3) : 0)} y={P.t - 4} textAnchor={near ? (i === 0 ? 'end' : 'start') : anchor} fontSize="9.5" fontWeight="600" fill={m.color}>
              {m.label}
            </text>
          </g>
        );
      })}
      <text x={P.l} y={H - 2} fontSize="9.5" fill="#64748b">
        {short(lo)}
      </text>
      <text x={W - P.r} y={H - 2} textAnchor="end" fontSize="9.5" fill="#64748b">
        {short(hi)}
      </text>
    </svg>
  );
}

/** The selected tract on all six measures: where it ranks among the city's tracts (right = more need), the city median at the middle tick. */
/** The six measures as a readable table: measure, need-rank bar, this tract's value, the city median. With no tract
 *  selected it shows the city medians and asks for a click. */
function SelectedVsCity({ id, ami, medians, measure, allValues, onClose }: { id: string | null; ami: AmiPct; medians: Map<MeasureId, number | null>; measure: MeasureId; allValues: Map<MeasureId, number[]>; onClose: () => void }) {
  const t = id ? tractById.get(id) : undefined;
  const p = id ? (placeById.get(id) ?? null) : null;
  const grid = id ? 'grid grid-cols-[minmax(0,118px)_minmax(0,1fr)_76px_64px] items-center gap-x-2.5' : 'grid grid-cols-[minmax(0,1fr)_88px] items-center gap-x-2.5';
  const val = (m: (typeof MEASURES)[number], v: number | null) => bare(m.fmt(v)).replace('/mo', '');
  return (
    <div data-testid={id ? 'equity-selected' : undefined} className="shrink-0">
      <div className="mb-1.5 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {id ? 'This tract vs city' : 'City medians'}
            <InfoTip label="How to read this table" width={250}>
              {id
                ? 'Bar length: the share of city tracts this tract has more need than. Grey line: the middle tract. The highlighted row is the measure on the map.'
                : 'The median tract on each of the six measures. Click a tract on the map or in the list to compare it with these.'}
            </InfoTip>
          </h3>
          {id ? (
            <div className="truncate text-body font-semibold text-violet-900">
              {tractLabel(t)} <span className="text-small font-normal text-slate-500">{t?.name}</span>
            </div>
          ) : (
            <div className="text-small text-slate-500">Click a tract to compare it with the city.</div>
          )}
        </div>
        {id && (
          <button type="button" onClick={onClose} className="grid h-6 w-6 shrink-0 place-items-center rounded text-slate-500 hover:bg-stone-100 hover:text-slate-900" aria-label="Clear the selected tract" title="Clear">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {t && !t.residential && <div className="mb-1 text-caption text-amber-800">Fewer than 25 households, not ranked.</div>}
      <div className={cx(grid, 'border-b border-stone-200/80 pb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400')}>
        <span>Measure</span>
        {id && <span>Need rank</span>}
        {id && <span className="text-right">This tract</span>}
        <span className="text-right">City</span>
      </div>
      <div className="divide-y divide-stone-100">
        {MEASURES.map((m) => {
          const v = id ? measureValue(m.id, p, hud, ami) : null;
          const pct = id ? needPercentile(v, allValues.get(m.id) ?? [], m.higherIsNeed) : null;
          const cur = m.id === measure;
          return (
            <div key={m.id} className={cx(grid, 'rounded py-1.5 text-small', cur && 'bg-violet-50/80')} title={id ? `${m.title}: ${m.fmt(v)} here; city median ${m.fmt(medians.get(m.id) ?? null)}` : m.title}>
              <span className={cx('truncate pl-1', cur ? 'font-semibold text-violet-900' : 'text-slate-700')}>{m.short}</span>
              {id && (
                <div className="relative h-3 bg-stone-100" role="img" aria-label={pct == null ? 'no value' : `more need than ${Math.round(pct * 100)}% of tracts`}>
                  {pct != null && <motion.span className="absolute inset-y-0 left-0" style={{ background: SERIES.place, opacity: cur ? 0.9 : 0.55 }} initial={{ width: '0%' }} animate={{ width: `${Math.max(1.5, pct * 100)}%` }} transition={DRAW} />}
                  <span className="absolute -inset-y-[3px] left-1/2 w-px bg-slate-500" aria-hidden />
                </div>
              )}
              {id && <span className={cx('text-right tnum', cur ? 'font-semibold text-slate-900' : 'font-medium text-slate-800')}>{val(m, v)}</span>}
              <span className="pr-1 text-right text-slate-500 tnum">{val(m, medians.get(m.id) ?? null)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MeasurePanel({
  def,
  ami,
  median,
  available,
  n,
  ranked,
  values,
  legend,
  medians,
  allValues,
  selectedId,
  policiesLine,
  policyTexts = [],
  reading,
  onPick,
  wide = false,
}: {
  def: MeasureDef;
  ami: AmiPct;
  median: number | null;
  available: number;
  n: number;
  ranked: TractValue[];
  values: TractValue[];
  legend: Legend;
  medians: Map<MeasureId, number | null>;
  allValues: Map<MeasureId, number[]>;
  selectedId: string | null;
  policiesLine: string | null;
  /** One paragraph per policy that is on (lib/equity/explain.explainPolicies). */
  policyTexts?: { id: string; name: string; text: string }[];
  /** VisionPitts-Chat's reading of the tab, shown only when it passed the number check. */
  reading?: ReadingState;
  onPick: (id: string | null) => void;
  /** The chat is hidden: two columns, larger charts, the ranking at full height. */
  wide?: boolean;
}) {
  const lite = useApp((s) => s.lite);
  const listRef = useRef<HTMLOListElement>(null);
  // Keep the selected tract's row in view.
  useEffect(() => {
    const el = selectedId ? listRef.current?.querySelector<HTMLElement>(`[data-id="${selectedId}"]`) : null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedId, def.id]);
  const sentences = useMemo(() => explainMeasure({ def, ami, values, nameOf }), [def, ami, values]);
  const [spreadRef, spread] = useSize<HTMLDivElement>();
  const selValue = selectedId ? (values.find((v) => v.id === selectedId)?.value ?? null) : null;
  // Charts replay whenever the measure or the income level changes.
  const replay = `${def.id}-${ami}`;
  const move = lite ? { duration: 0 } : SPRING_PANEL;

  const header = (
    <motion.header layout="position" transition={move} className="shrink-0">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className={cx('flex min-w-0 items-center gap-1 font-semibold text-slate-900', wide ? 'text-body' : 'text-small')}>
          {def.title}
          <InfoTip label={`About ${def.title.toLowerCase()}`} width={300} side="bottom">
            <span className="block">{def.definition(ami)}</span>
            <span className="mt-1 block text-white/75">
              {def.unit} · {available} of {n} tracts have a value · Source: {def.source}
            </span>
          </InfoTip>
        </h2>
        <span className="shrink-0 text-caption text-slate-500">
          median <b className="font-semibold text-slate-900 tnum">{def.fmt(median)}</b>
        </span>
      </div>
    </motion.header>
  );
  const policies = policyTexts.length ? (
    <div className="shrink-0 space-y-1.5 rounded-lg bg-violet-50/70 px-3 py-2.5 ring-1 ring-violet-200/70" data-testid="equity-policy-effects">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-violet-800">What the policies change</h3>
      {policyTexts.map((p) => (
        <p key={p.id} className="text-small leading-snug text-slate-800">
          <span className="font-semibold text-violet-900">{p.name}.</span> {p.text}
        </p>
      ))}
    </div>
  ) : policiesLine ? (
    <p className="shrink-0 rounded-md bg-violet-50 px-2 py-0.5 text-caption text-violet-900 ring-1 ring-violet-200/70">{policiesLine}</p>
  ) : null;
  const readingBlock =
    reading && reading.status !== 'idle' && reading.status !== 'off' ? (
      <div className="shrink-0 border-t border-stone-100 pt-2.5" data-testid="equity-reading">
        <h3 className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <Sparkles className="h-3 w-3 text-violet-500" /> In plain words
          <InfoTip label="About this reading" width={250}>
            Written by VisionPitts-Chat (DeepSeek) from this tab's numbers. It is shown only when every number in it matches the tool's data.
          </InfoTip>
        </h3>
        {reading.status === 'loading' ? (
          <div className="space-y-1.5" aria-label="Writing">
            <div className="h-3 w-full animate-pulse rounded bg-stone-100" />
            <div className="h-3 w-11/12 animate-pulse rounded bg-stone-100" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-stone-100" />
          </div>
        ) : (
          <p className="text-small leading-relaxed text-slate-700">{reading.status === 'ok' ? reading.text : ''}</p>
        )}
      </div>
    ) : null;
  const explain = (
    <motion.p key={`x-${replay}`} layout="position" initial={lite ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={move} className={cx('shrink-0 text-slate-800', wide ? 'text-body leading-relaxed' : 'text-small leading-[1.4]')} data-testid="equity-explain">
      {sentences.join(' ')}
    </motion.p>
  );
  const donut = (
    <motion.div layout="position" transition={move} className="shrink-0">
      <Heading right="How many tracts fall in each map class, in the same colors as the map legend.">Tracts by class</Heading>
      <ClassDonut key={`d-${replay}`} legend={legend} values={values} size={wide ? 104 : 68} />
    </motion.div>
  );
  const spreadBlock = (
    <motion.div layout="position" transition={move} className={cx('flex flex-col', wide ? 'min-h-[180px] flex-1' : 'min-h-[70px] flex-1')}>
      <Heading right={`How the tracts spread across values; ${def.higherIsNeed ? 'further right' : 'further left'} means more need. The dashed line is the city median; the violet line is the selected tract.`}>Spread across tracts</Heading>
      <div ref={spreadRef} className="min-h-[52px] flex-1 overflow-hidden">
        {spread.w > 0 && <Spread key={`s-${replay}`} def={def} legend={legend} values={values} median={median} selected={selValue} width={spread.w} height={spread.h} />}
      </div>
    </motion.div>
  );
  const selected = <SelectedVsCity id={selectedId} ami={ami} medians={medians} measure={def.id} allValues={allValues} onClose={() => onPick(null)} />;
  const list = (
    <>
      <div className="px-3.5 pb-0.5 pt-1.5">
        <Heading right={`Every ranked tract, ${def.higherIsNeed ? 'highest' : 'lowest'} value first. Click a row to select the tract on the map.`}>Most need first</Heading>
      </div>
      <ol key={`l-${replay}`} ref={listRef} className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-2 pb-1.5">
        {ranked.map((r, i) => {
          const t = tractById.get(r.id);
          return (
            <motion.li key={r.id} initial={lite || i > 24 ? false : { opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...DRAW, delay: lite ? 0 : Math.min(i, 24) * 0.018 }}>
              <button
                type="button"
                data-rank-row
                data-id={r.id}
                onClick={() => onPick(r.id)}
                className={cx('flex w-full items-baseline gap-2 rounded px-1.5 py-px text-left hover:bg-stone-50', r.id === selectedId && 'bg-violet-50 ring-1 ring-violet-200')}
              >
                <span className="w-5 shrink-0 text-right text-[11px] text-slate-400 tnum">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-caption text-slate-800">
                  {tractLabel(t)} <span className="text-slate-400">{t?.name.replace('Tract ', '')}</span>
                </span>
                <span className={cx('shrink-0 text-caption font-semibold tnum', r.value == null ? 'font-normal text-slate-400' : 'text-slate-900')}>{r.value == null ? 'n/a' : bare(def.fmt(r.value))}</span>
              </button>
            </motion.li>
          );
        })}
      </ol>
    </>
  );

  if (wide) {
    // Four boxes with room between them, so each part reads on its own: what the measure is and says, its charts,
    // the selected tract against the city, and the ranked list.
    const box = 'rounded-xl bg-white ring-1 ring-stone-200/80';
    return (
      <section aria-label="Measure" data-testid="equity-measure" className="grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] gap-2.5 max-sm:grid-cols-1">
        <div className="scroll-quiet flex min-h-0 flex-col gap-2.5 overflow-y-auto">
          <div className={cx(box, 'flex shrink-0 flex-col gap-2.5 px-4 pb-3.5 pt-3')}>
            {header}
            {explain}
            {policies}
            {readingBlock}
          </div>
          <div className={cx(box, 'flex min-h-[260px] flex-1 flex-col gap-3 px-4 pb-3 pt-3')}>
            {donut}
            {spreadBlock}
          </div>
        </div>
        <div className="flex min-h-0 flex-col gap-2.5">
          <motion.div layout="position" transition={move} className="shrink-0 px-1 pb-0.5 pt-1">
            {selected}
          </motion.div>
          <div className={cx(box, 'flex min-h-0 flex-1 flex-col overflow-hidden pt-1')}>{list}</div>
        </div>
      </section>
    );
  }
  return (
    <section aria-label="Measure" data-testid="equity-measure" className="flex min-h-0 flex-col overflow-hidden rounded-xl bg-white ring-1 ring-stone-200/80">
      <div className="scroll-quiet min-h-0 flex-1 flex flex-col gap-2 overflow-y-auto px-3.5 pb-2 pt-2">
        {header}
        {policies}
        {explain}
        {donut}
        {spreadBlock}
        {selected}
      </div>
      <div className="flex min-h-0 shrink-0 basis-[24%] flex-col border-t border-stone-100">{list}</div>
    </section>
  );
}
