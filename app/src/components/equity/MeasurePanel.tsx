// The measure section beside the map, only about the measure chosen in ①: what it is, a few plain sentences on the
// city picture (lib/equity/explain), tracts per map class, the spread with the city median, the selected tract
// against the city on all six measures, and every ranked tract, most need first (a quarter of the height).
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { tractById, tractLabel } from '../../lib/data';
import { cx } from '../../lib/format';
import { hud, placeById } from '../../lib/place/data';
import { histogram } from '../../lib/explore/summary';
import { MEASURES, measureValue, type AmiPct, type Legend, type MeasureDef, type MeasureId } from '../../lib/equity/measures';
import { classCounts, explainMeasure, needPercentile, type TractValue } from '../../lib/equity/explain';
import { SERIES } from '../charts';
import { nameOf } from './names';

const TINY: Partial<Record<MeasureId, string>> = { burdened: 'Burdened', transit: 'Transit', services: 'Services' };

/** A value without its unit word (the unit is in the header). */
const bare = (s: string) => s.replace(/ (households|jobs|places)$/, '').replace('not available', 'n/a');

function Heading({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-1 flex items-baseline justify-between gap-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{children}</h3>
      {right && <span className="text-[11px] text-slate-400">{right}</span>}
    </div>
  );
}

/** Tracts per map class as a donut (same colors as the map legend), with counts beside it. */
function ClassDonut({ legend, values }: { legend: Legend; values: TractValue[] }) {
  const { classes, missing } = classCounts(legend, values);
  const parts = [...classes, ...(missing ? [{ color: '#e7e5e4', label: 'no value', count: missing }] : [])];
  const total = parts.reduce((s, p) => s + p.count, 0);
  const r = 26,
    c = 2 * Math.PI * r;
  let off = 0;
  return (
    <div className="flex items-center gap-3">
      <svg width="68" height="68" viewBox="0 0 68 68" className="shrink-0" role="img" aria-label={parts.map((p) => `${p.label}: ${p.count}`).join(', ')}>
        <circle cx="34" cy="34" r={r} fill="none" stroke="#f1f0ee" strokeWidth="11" />
        {total > 0 &&
          parts.map((p) => {
            if (!p.count) return null;
            const len = (p.count / total) * c;
            const gap = parts.filter((q) => q.count).length > 1 ? 1.5 : 0;
            const el = <circle key={p.label} cx="34" cy="34" r={r} fill="none" stroke={p.color} strokeWidth="11" strokeDasharray={`${Math.max(0, len - gap)} ${c}`} strokeDashoffset={-off} transform="rotate(-90 34 34)" />;
            off += len;
            return el;
          })}
        <text x="34" y="33" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0f172a">
          {total}
        </text>
        <text x="34" y="44" textAnchor="middle" fontSize="8" fill="#64748b">
          tracts
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-px">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5 text-caption leading-[14px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm ring-1 ring-black/10" style={{ background: p.color }} />
            <span className="min-w-0 flex-1 truncate text-slate-600" title={p.label}>
              {p.label}
            </span>
            <span className="shrink-0 font-semibold text-slate-900 tnum">{p.count}</span>
          </li>
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
          <rect key={i} x={P.l + i * bw + 0.75} y={H - P.b - bh} width={Math.max(1, bw - 1.5)} height={bh} rx="1.5" fill={cls == null ? '#cbd5e1' : legend.colors[cls]} stroke="rgba(0,0,0,0.08)">
            <title>{`${def.fmt(h.edges[i])} to ${def.fmt(h.edges[i + 1])}: ${n} tracts`}</title>
          </rect>
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
function SelectedVsCity({ id, ami, medians, measure, allValues, onClose }: { id: string | null; ami: AmiPct; medians: Map<MeasureId, number | null>; measure: MeasureId; allValues: Map<MeasureId, number[]>; onClose: () => void }) {
  const t = id ? tractById.get(id) : undefined;
  const p = id ? (placeById.get(id) ?? null) : null;
  if (!id)
    return (
      <div className="shrink-0">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">City medians, all six measures</h3>
          <span className="text-[11px] text-slate-400">click a tract to compare</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-[3px]">
          {MEASURES.map((m) => (
            <div key={m.id} className={cx('flex items-baseline justify-between gap-2 rounded px-1 py-px text-caption leading-tight', m.id === measure && 'bg-violet-50 ring-1 ring-violet-200')}>
              <span className={m.id === measure ? 'font-semibold text-violet-900' : 'text-slate-600'}>{TINY[m.id] ?? m.short}</span>
              <span className="font-semibold text-slate-900 tnum">{bare(m.fmt(medians.get(m.id) ?? null)).replace('/mo', '')}</span>
            </div>
          ))}
        </div>
      </div>
    );
  return (
    <div data-testid="equity-selected" className="shrink-0">
      <div className="mb-1 flex items-baseline gap-2">
        <h3 className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          This tract vs city · <span className="normal-case tracking-normal text-violet-800">{tractLabel(t)}</span> <span className="font-normal normal-case tracking-normal text-slate-400">{t?.name.replace('Tract ', '')}</span>
        </h3>
        <span className="shrink-0 text-[11px] text-slate-400" title="Bar length: the share of city tracts this tract has more need than. Grey line: the city median.">bar = need rank · line = median</span>
        <button type="button" onClick={onClose} className="grid h-5 w-5 shrink-0 place-items-center rounded text-slate-500 hover:bg-stone-100 hover:text-slate-900" aria-label="Clear the selected tract" title="Clear">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {t && !t.residential && <div className="text-caption text-amber-800">Fewer than 25 households, not ranked.</div>}
      <div className="grid grid-cols-2 gap-x-3 gap-y-[3px]">
        {MEASURES.map((m) => {
          const v = measureValue(m.id, p, hud, ami);
          const pct = needPercentile(v, allValues.get(m.id) ?? [], m.higherIsNeed);
          const cur = m.id === measure;
          return (
            <div key={m.id} className={cx('grid grid-cols-[minmax(0,64px)_1fr_auto] items-center gap-1.5 rounded px-1 py-px text-caption leading-tight', cur && 'bg-violet-50 ring-1 ring-violet-200')} title={`${m.title}: ${m.fmt(v)} here; city median ${m.fmt(medians.get(m.id) ?? null)}`}>
              <span className={cx('truncate', cur ? 'font-semibold text-violet-900' : 'text-slate-600')}>{TINY[m.id] ?? m.short}</span>
              <div className="relative h-2.5 bg-stone-100" role="img" aria-label={pct == null ? 'no value' : `more need than ${Math.round(pct * 100)}% of tracts`}>
                {pct != null && <span className="absolute inset-y-0 left-0" style={{ width: `${Math.max(1.5, pct * 100)}%`, background: SERIES.place, opacity: cur ? 0.9 : 0.6 }} />}
                <span className="absolute -inset-y-[2px] left-1/2 w-px bg-slate-500" aria-hidden />
              </div>
              <span className={cx('text-right tnum', cur ? 'font-semibold text-slate-900' : 'text-slate-700')}>{bare(m.fmt(v)).replace('/mo', '')}</span>
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
  onPick,
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
  onPick: (id: string | null) => void;
}) {
  const list = useRef<HTMLOListElement>(null);
  // Keep the selected tract's row in view.
  useEffect(() => {
    const el = selectedId ? list.current?.querySelector<HTMLElement>(`[data-id="${selectedId}"]`) : null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedId, def.id]);
  const sentences = useMemo(() => explainMeasure({ def, ami, values, nameOf }), [def, ami, values]);
  const [spreadRef, spread] = useSize<HTMLDivElement>();
  const selValue = selectedId ? (values.find((v) => v.id === selectedId)?.value ?? null) : null;
  return (
    <section aria-label="Measure" data-testid="equity-measure" className="flex min-h-0 flex-col overflow-hidden rounded-xl bg-white ring-1 ring-stone-200/80">
      <div className="scroll-quiet min-h-0 flex-1 flex flex-col gap-2 overflow-y-auto px-3.5 pb-2 pt-2">
        <header className="shrink-0">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="min-w-0 text-small font-semibold text-slate-900">{def.title}</h2>
            <span className="shrink-0 text-caption text-slate-500">
              median <b className="font-semibold text-slate-900 tnum">{def.fmt(median)}</b>
            </span>
          </div>
          <p className="mt-0.5 text-caption leading-snug text-slate-600">{def.definition(ami)}</p>
          <p className="mt-0.5 truncate text-[11px] leading-snug text-slate-400" title={`Source: ${def.source}`}>
            {def.unit} · {available} of {n} tracts · {def.source}
          </p>
        </header>
        {policiesLine && <p className="shrink-0 rounded-md bg-violet-50 px-2 py-0.5 text-caption text-violet-900 ring-1 ring-violet-200/70">{policiesLine}</p>}
        <p className="shrink-0 text-small leading-[1.4] text-slate-800" data-testid="equity-explain">
          {sentences.join(' ')}
        </p>
        <div className="shrink-0">
          <Heading right="same colors as the map">Tracts by class</Heading>
          <ClassDonut legend={legend} values={values} />
        </div>
        <div className="flex min-h-[70px] flex-1 flex-col">
          <Heading right={def.higherIsNeed ? 'right = more need' : 'left = more need'}>Spread across tracts</Heading>
          <div ref={spreadRef} className="min-h-[52px] flex-1 overflow-hidden">
            {spread.w > 0 && <Spread def={def} legend={legend} values={values} median={median} selected={selValue} width={spread.w} height={spread.h} />}
          </div>
        </div>
        <SelectedVsCity id={selectedId} ami={ami} medians={medians} measure={def.id} allValues={allValues} onClose={() => onPick(null)} />
      </div>
      <div className="flex min-h-0 shrink-0 basis-[24%] flex-col border-t border-stone-100">
        <div className="flex items-baseline justify-between px-3.5 pb-0.5 pt-1.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Most need first</h3>
          <span className="text-[11px] text-slate-400">{def.higherIsNeed ? 'highest first' : 'lowest first'}</span>
        </div>
        <ol ref={list} className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-2 pb-1.5">
          {ranked.map((r, i) => {
            const t = tractById.get(r.id);
            return (
              <li key={r.id}>
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
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
