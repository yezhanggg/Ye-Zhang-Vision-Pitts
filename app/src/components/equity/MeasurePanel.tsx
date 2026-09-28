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
import { cityTakeaway, explainLocal } from '../../lib/equity/local';
import { DRAW, SERIES, SPIN } from '../charts';
import { InfoTip, SPRING_PANEL } from '../primitives';
import type { ReadingState } from '../../lib/equity/reading';
import { Thinking } from '../explore/ChatBox';
import { Sparkles } from 'lucide-react';
import { nameOf } from './names';

/**
 * Which areas the section reads: census tracts (the default, unchanged) or ZIP codes. Everything that names, labels
 * or looks up an area goes through this, so the same charts and lists serve both levels.
 */
export interface AreaKind {
  level: 'tract' | 'zip';
  /** "tract" / "ZIP" (headings: "This tract vs city"). */
  one: string;
  /** "tracts" / "ZIPs" (donut center, counts). */
  many: string;
  /** Main label of an area in the list and the table. */
  label: (id: string) => string;
  /** Grey detail after the label in the list ("Tract 1234" without "Tract", or the ZIP's neighborhoods). */
  listSub: (id: string) => string;
  /** Grey detail after the label in the table header. */
  sub: (id: string) => string;
  /** A measure's value for an area. */
  value: (m: MeasureId, id: string, ami: AmiPct) => number | null;
  /** An amber note under the selected area's name ("Fewer than 25 households, not ranked"), or null. */
  note: (id: string) => string | null;
  /** Rewrites the tract sentences for this level (identity for tracts). */
  words: (s: string) => string;
  /** A short line on how the level is built, shown under the sentences (ZIP level only). */
  info?: string;
}

/** Census tracts: the section exactly as it always read. */
export const TRACT_AREA: AreaKind = {
  level: 'tract',
  one: 'tract',
  many: 'tracts',
  label: (id) => tractLabel(tractById.get(id)),
  listSub: (id) => tractById.get(id)?.name.replace('Tract ', '') ?? '',
  sub: (id) => tractById.get(id)?.name ?? '',
  value: (m, id, ami) => measureValue(m, placeById.get(id) ?? null, hud, ami),
  note: (id) => {
    const t = tractById.get(id);
    return t && !t.residential ? 'Fewer than 25 households, not ranked.' : null;
  },
  words: (x) => x,
};


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
function ClassDonut({ legend, values, size = 68, many = 'tracts' }: { legend: Legend; values: TractValue[]; size?: number; many?: string }) {
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
          {many}
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

function Spread({ def, legend, values, median, selected, width, height, many = 'tracts' }: { def: MeasureDef; legend: Legend; values: TractValue[]; median: number | null; selected: number | null; width: number; height: number; many?: string }) {
  const lite = useApp((s) => s.lite);
  const h = useMemo(() => histogram(values.map((v) => v.value), 16), [values]);
  const W = Math.max(120, width),
    H = Math.max(52, Math.min(220, height)),
    P = { l: 2, r: 2, t: 25, b: 14 };
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
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" role="img" aria-label={`${def.title} across ${h.n} ${many}; city median ${def.fmt(median)}`}>
      {h.counts.map((n, i) => {
        const mid = (h.edges[i] + h.edges[i + 1]) / 2;
        const cls = legend.classOf(mid);
        const bh = (n / maxC) * (H - P.t - P.b);
        return (
          <motion.rect key={i} x={P.l + i * bw + 0.75} width={Math.max(1, bw - 1.5)} rx="1.5" fill={cls == null ? '#cbd5e1' : legend.colors[cls]} stroke="rgba(0,0,0,0.08)" initial={lite ? false : { height: 0, y: H - P.b }} animate={{ height: bh, y: H - P.b - bh }} transition={{ ...DRAW, delay: lite ? 0 : i * 0.025 }}>
            <title>{`${def.fmt(h.edges[i])} to ${def.fmt(h.edges[i + 1])}: ${n} ${many}`}</title>
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
            {/* Two close markers: the labels stack on two lines instead of overlapping. */}
            <text x={x} y={near && i === 1 ? P.t - 15 : P.t - 4} textAnchor={anchor} fontSize="9.5" fontWeight="600" fill={m.color}>
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
function SelectedVsCity({ id, ami, medians, measure, allValues, onClose, area }: { id: string | null; ami: AmiPct; medians: Map<MeasureId, number | null>; measure: MeasureId; allValues: Map<MeasureId, number[]>; onClose: () => void; area: AreaKind }) {
  const tractLevel = area.level === 'tract';
  const note = id ? area.note(id) : null;
  const grid = id ? 'grid grid-cols-[minmax(0,118px)_minmax(0,1fr)_76px_64px] items-center gap-x-2.5' : 'grid grid-cols-[minmax(0,1fr)_88px] items-center gap-x-2.5';
  const val = (m: (typeof MEASURES)[number], v: number | null) => bare(m.fmt(v)).replace('/mo', '');
  return (
    <div data-testid={id ? 'equity-selected' : undefined} className="shrink-0">
      <div className="mb-1.5 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {id ? `This ${area.one} vs city` : tractLevel ? 'City medians' : 'City medians by ZIP'}
            <InfoTip label="How to read this table" width={250}>
              {tractLevel
                ? id
                  ? 'Bar length: the share of city tracts this tract has more need than. Grey line: the middle tract. The highlighted row is the measure on the map.'
                  : 'The median tract on each of the six measures. Click a tract on the map or in the list to compare it with these.'
                : id
                  ? 'Bar length: the share of city ZIP codes this ZIP has more need than. Grey line: the middle ZIP. City column: the median ZIP. The highlighted row is the measure on the map.'
                  : 'The median ZIP code on each of the six measures. Click a ZIP on the map or in the list to compare it with these.'}
            </InfoTip>
          </h3>
          {id ? (
            <div className="truncate text-body font-semibold text-violet-900">
              {area.label(id)} <span className="text-small font-normal text-slate-500">{area.sub(id)}</span>
            </div>
          ) : (
            <div className="text-small text-slate-500">Click a {tractLevel ? 'tract' : 'ZIP'} to compare it with the city.</div>
          )}
        </div>
        {id && (
          <button type="button" onClick={onClose} className="grid h-6 w-6 shrink-0 place-items-center rounded text-slate-500 hover:bg-stone-100 hover:text-slate-900" aria-label={`Clear the selected ${area.one}`} title="Clear">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {note && <div className="mb-1 text-caption text-amber-800">{note}</div>}
      <div className={cx(grid, 'border-b border-stone-200/80 pb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400')}>
        <span>Measure</span>
        {id && <span>Need rank</span>}
        {id && <span className="text-right">This {area.one}</span>}
        <span className="text-right">City</span>
      </div>
      <div className="divide-y divide-stone-100">
        {MEASURES.map((m) => {
          const v = id ? area.value(m.id, id, ami) : null;
          const pct = id ? needPercentile(v, allValues.get(m.id) ?? [], m.higherIsNeed) : null;
          const cur = m.id === measure;
          return (
            <div key={m.id} className={cx(grid, 'rounded py-1.5 text-small', cur && 'bg-violet-50/80')} title={id ? `${m.title}: ${m.fmt(v)} here; city median ${m.fmt(medians.get(m.id) ?? null)}` : m.title}>
              <span className={cx('truncate pl-1', cur ? 'font-semibold text-violet-900' : 'text-slate-700')}>{m.short}</span>
              {id && (
                <div className="relative h-3 bg-stone-100" role="img" aria-label={pct == null ? 'no value' : `more need than ${Math.round(pct * 100)}% of ${area.many}`}>
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
  onAskInsight,
  onPick,
  wide = false,
  chat,
  chatOpen = false,
  area = TRACT_AREA,
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
  /** Writes an Insight on request (shown as a button when none is showing). */
  onAskInsight?: () => void;
  onPick: (id: string | null) => void;
  /** The chat is hidden: two columns, larger charts, the ranking at full height. */
  wide?: boolean;
  /** VisionPitts-Chat, shown in the right column when open (it stays mounted while closed). */
  chat?: React.ReactNode;
  chatOpen?: boolean;
  /** Tracts (default) or ZIP codes. */
  area?: AreaKind;
}) {
  const lite = useApp((s) => s.lite);
  const listRef = useRef<HTMLOListElement>(null);
  // The middle column goes back to the top whenever a new measure is picked (with or without the chat open).
  const colRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    colRef.current?.scrollTo({ top: 0 });
  }, [def.id]);
  // When the Insight started writing (the thinking mark's status words run from here, as in the chat).
  const loadingSince = useRef(Date.now());
  const wasLoading = useRef(false);
  if (reading?.status === 'loading' && !wasLoading.current) loadingSince.current = Date.now();
  wasLoading.current = reading?.status === 'loading';
  // Keep the selected tract's row in view.
  useEffect(() => {
    const el = selectedId ? listRef.current?.querySelector<HTMLElement>(`[data-id="${selectedId}"]`) : null;
    const list = listRef.current;
    // Scroll the list only (scrollIntoView would also scroll the page and the columns around it).
    if (el && list) {
      const top = el.offsetTop - list.offsetTop;
      if (top < list.scrollTop || top + el.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = Math.max(0, top - list.clientHeight / 2);
    }
  }, [selectedId, def.id]);
  // At ZIP level a ZIP is named with its main neighborhood ("ZIP 15222 (Central Business District)").
  const zipWithPlace = (id: string) => {
    const place = area.listSub(id).split(/,| \+/)[0]?.trim();
    return place ? `${area.label(id)} (${place})` : area.label(id);
  };
  const sentences = useMemo(() => explainMeasure({ def, ami, values, nameOf: area.level === 'tract' ? nameOf : zipWithPlace }).map(area.words), [def, ami, values, area]);
  const [spreadRef, spread] = useSize<HTMLDivElement>();
  const selValue = selectedId ? (values.find((v) => v.id === selectedId)?.value ?? null) : null;
  // Charts replay whenever the measure or the income level changes.
  const replay = `${def.id}-${ami}-${area.level}`;
  const move = lite ? { duration: 0 } : SPRING_PANEL;

  const header = (
    <header className="shrink-0">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className={cx('flex min-w-0 items-center gap-1 font-semibold text-slate-900', wide ? 'text-body' : 'text-small')}>
          {def.title}
          <InfoTip label={`About ${def.title.toLowerCase()}`} width={300} side="bottom">
            <span className="block">{def.definition(ami)}</span>
            <span className="mt-1 block text-white/75">
              {def.unit} · {available} of {n} {area.level === 'tract' ? 'tracts' : 'ZIP codes'} have a value · Source: {area.level === 'zip' && def.id === 'rent_gap' ? def.source.replace('Dewey listings', "Dewey listings for the whole ZIP") : def.source}
            </span>
          </InfoTip>
        </h2>
        <span className="shrink-0 text-caption text-slate-500">
          median <b className="font-semibold text-slate-900 tnum">{def.fmt(median)}</b>
        </span>
      </div>
    </header>
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
  const insightShown = reading && reading.status !== 'idle' && reading.status !== 'off';
  const readingBlock = insightShown ? (
      <div className="shrink-0 border-t border-stone-100 pt-2.5" data-testid="equity-reading">
        <h3 className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <Sparkles className="h-3 w-3 text-violet-500" /> VisionPitts Insight
          <InfoTip label="About VisionPitts Insight" width={250}>
            Written by VisionPitts-Chat (DeepSeek) from this tab's numbers. It is shown only when every number in it matches the tool's data.
          </InfoTip>
        </h3>
        {reading.status === 'loading' ? (
          <Thinking since={loadingSince.current} />
        ) : (
          <p className="text-small leading-relaxed text-slate-700">{reading.status === 'ok' ? reading.text : ''}</p>
        )}
      </div>
    ) : onAskInsight && reading?.status !== 'off' ? (
      <div className="shrink-0 border-t border-stone-100 pt-2.5" data-testid="equity-reading-ask">
        <button
          type="button"
          onClick={onAskInsight}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-caption font-semibold text-white shadow-sm transition-[background-color,transform] hover:bg-violet-700 active:scale-[0.97]"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Get VisionPitts Insight
        </button>
        <span className="ml-2 align-middle">
          <InfoTip label="About VisionPitts Insight" width={250}>
            A short reading of this measure and place written by VisionPitts-Chat (DeepSeek) from the numbers on this page. It is shown only when every number in it matches the tool's data. It writes itself when a policy is on.
          </InfoTip>
        </span>
      </div>
    ) : null;
  // Two short paragraphs: the citywide pattern with a takeaway, then the selected area against its surroundings (or
  // where need clusters when nothing is selected), with a takeaway.
  const local = useMemo(
    () => explainLocal({ def, ami, values, level: area.level, selectedId, nameOf: area.level === 'tract' ? nameOf : zipWithPlace, many: area.level === 'tract' ? 'tracts' : 'ZIP codes' }),
    [def, ami, values, area, selectedId],
  );
  const explain = (
    <motion.div key={`x-${replay}`} initial={lite ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={move} className={cx('shrink-0 space-y-2 text-slate-800', wide ? 'text-body leading-relaxed' : 'text-small leading-[1.4]')}>
      <p data-testid="equity-explain">
        {sentences.join(' ')} <span className="text-slate-600">{area.words(cityTakeaway(def.id, ami))}</span>
      </p>
      <p data-testid="equity-local">{local}</p>
    </motion.div>
  );
  const areaInfo = area.info ? (
    <p className="shrink-0 rounded-md bg-sky-50 px-2 py-1 text-caption leading-snug text-sky-900 ring-1 ring-sky-200/70" data-testid="equity-zip-note">
      {area.info}
    </p>
  ) : null;
  const donut = (
    <div className="shrink-0">
      <Heading right={`How many ${area.level === 'tract' ? 'tracts' : 'ZIP codes'} fall in each map class, in the same colors as the map legend.`}>{area.level === 'tract' ? 'Tracts by class' : 'ZIP codes by class'}</Heading>
      <ClassDonut key={`d-${replay}`} legend={legend} values={values} size={wide ? 104 : 68} many={area.many} />
    </div>
  );
  const spreadBlock = (
    <div className={cx('flex flex-col', wide ? 'h-[210px] shrink-0' : 'min-h-[70px] flex-1')}>
      <Heading right={`How the ${area.level === 'tract' ? 'tracts' : 'ZIP codes'} spread across values; ${def.higherIsNeed ? 'further right' : 'further left'} means more need. The dashed line is the city median; the violet line is the selected ${area.level === 'tract' ? 'tract' : 'ZIP'}.`}>{area.level === 'tract' ? 'Spread across tracts' : 'Spread across ZIP codes'}</Heading>
      <div ref={spreadRef} className="min-h-0 flex-1 overflow-hidden">
        {spread.w > 0 && <Spread key={`s-${replay}`} def={def} legend={legend} values={values} median={median} selected={selValue} width={spread.w} height={spread.h} many={area.level === 'tract' ? 'tracts' : 'ZIP codes'} />}
      </div>
    </div>
  );
  const selected = <SelectedVsCity id={selectedId} ami={ami} medians={medians} measure={def.id} allValues={allValues} onClose={() => onPick(null)} area={area} />;
  const list = (
    <>
      <div className="px-3.5 pb-0.5 pt-1.5">
        <Heading right={area.level === 'tract' ? `Every ranked tract, ${def.higherIsNeed ? 'highest' : 'lowest'} value first. Click a row to select the tract on the map.` : `Every ranked ZIP code, ${def.higherIsNeed ? 'highest' : 'lowest'} value first. Click a row to select the ZIP on the map.`}>Most need first</Heading>
      </div>
      <ol key={`l-${replay}`} ref={listRef} className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-2 pb-1.5">
        {ranked.map((r, i) => {
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
                  {area.label(r.id)} <span className="text-slate-400">{area.listSub(r.id)}</span>
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
    // the selected tract against the city, and the ranked list. With VisionPitts-Chat open, the tract table and the
    // list move under the charts and the chat takes the right column.
    const box = 'rounded-xl bg-white ring-1 ring-stone-200/80';
    const selectedBlock = (
      <div key="sel" className={cx('shrink-0 px-1 pb-0.5 pt-1', chatOpen && 'rounded-xl bg-white px-3.5 pb-2.5 pt-3 ring-1 ring-stone-200/80')}>
        {selected}
      </div>
    );
    const listBlock = (
      <div key="list" className={cx(box, 'flex min-h-0 flex-col overflow-hidden pt-1', chatOpen ? 'h-[340px] shrink-0' : 'flex-1')}>
        {list}
      </div>
    );
    return (
      <section aria-label="Measure" data-testid="equity-measure" className="grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] gap-2.5 max-sm:grid-cols-1">
        <div ref={colRef} className="scroll-quiet flex min-h-0 flex-col gap-2.5 overflow-y-auto">
          <div className={cx(box, 'flex shrink-0 flex-col gap-2.5 px-4 pb-3.5 pt-3')}>
            {header}
            {explain}
            {areaInfo}
            {policies}
            {readingBlock}
          </div>
          <div className={cx(box, 'flex shrink-0 flex-col gap-3 overflow-hidden px-4 pb-3 pt-3')}>
            {donut}
            {spreadBlock}
          </div>
          {chatOpen && selectedBlock}
          {chatOpen && listBlock}
        </div>
        <div className="flex min-h-0 flex-col gap-2.5">
          {!chatOpen && selectedBlock}
          {!chatOpen && listBlock}
          {chat && (
            <div key="chat" className={cx('min-h-0 flex-1 flex-col', chatOpen ? 'flex' : 'hidden')}>
              {chat}
            </div>
          )}
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
        {areaInfo}
        {donut}
        {spreadBlock}
        {selected}
      </div>
      <div className="flex min-h-0 shrink-0 basis-[24%] flex-col border-t border-stone-100">{list}</div>
    </section>
  );
}
