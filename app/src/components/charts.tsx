// Small hand-drawn charts for the summary panels: inline SVG and divs, no chart library, so the single-file export
// stays small. Marks are thin, colours follow the entity (place / city / county) in a fixed order, every multi-series
// chart carries a legend, and text stays in text colours. Animations are skipped under Reduce motion (`lite`).
import { useId, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../lib/store';
import { niceTicks, type Histogram as HistogramData } from '../lib/explore/summary';
import type { Conf } from '../lib/types';
import { ConfChip } from './primitives';

/** Fixed series colours, validated for colour-vision separation: this place, the city, the county. */
export const SERIES = { place: '#7c3aed', city: '#eb6834', county: '#1baf7a' } as const;
/** Composition hues in a fixed order (segments are labelled directly, so colour is never the only cue). */
export const PARTS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#a8a29e'] as const;
const GRID = '#e7e5e4';
const INK = '#334155';
const MUTED = '#64748b';

export const fmtK = (v: number) => (Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : Math.abs(v) >= 10_000 ? `${Math.round(v / 1000)}k` : Math.round(v).toLocaleString('en-US'));

function Caption({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-caption leading-snug text-slate-600">{children}</p>;
}

function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-caption text-slate-700">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <svg width="16" height="8" aria-hidden>
            <line x1="1" y1="4" x2="15" y2="4" stroke={it.color} strokeWidth="2" strokeDasharray={it.dashed ? '3 2' : undefined} strokeLinecap="round" />
          </svg>
          {it.label}
        </span>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ stat tile
export function StatTile({ label, value, sub, delta, conf }: { label: string; value: string; sub?: string; delta?: { dir: 'up' | 'down' | 'same'; text: string } | null; conf?: Conf | null }) {
  return (
    <div className="bg-white px-3 py-2">
      <div className="text-caption text-slate-600">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-lead font-semibold text-slate-900 tnum">{value}</span>
        {delta && (
          <span className="text-caption text-slate-400" title={delta.text}>
            {delta.dir === 'up' ? '▲' : delta.dir === 'down' ? '▼' : '≈'}
          </span>
        )}
      </div>
      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-caption text-slate-600 tnum">
        {sub && <span>{sub}</span>}
        {conf && <ConfChip conf={conf} />}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ bars against references
export interface BarRow {
  label: string;
  value: number | null;
  moe?: number | null;
  color: string;
}
/** Horizontal bars on one scale: this place beside the city and the county, values printed at the end. */
export function BarCompare({ rows, fmt, max }: { rows: BarRow[]; fmt: (v: number) => string; max?: number }) {
  const lite = useApp((s) => s.lite);
  const top = max ?? Math.max(...rows.map((r) => (r.value ?? 0) + (r.moe ?? 0)), 0);
  const scale = top > 0 ? 100 / top : 0;
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[88px_1fr_64px] items-center gap-2 text-small">
          <span className="truncate text-slate-700">{r.label}</span>
          <div className="relative h-2.5 overflow-visible rounded-full bg-stone-100" role="img" aria-label={`${r.label}: ${r.value == null ? 'no value' : fmt(r.value)}`}>
            {r.value != null && <motion.div className="h-full rounded-r-[4px] rounded-l-full" style={{ background: r.color }} initial={lite ? false : { width: 0 }} animate={{ width: `${Math.min(100, r.value * scale)}%` }} transition={{ type: 'spring', stiffness: 220, damping: 30 }} />}
            {r.value != null && r.moe != null && r.moe > 0 && <span className="absolute top-1/2 h-3 -translate-y-1/2 border-x border-slate-500/70" style={{ left: `${Math.max(0, (r.value - r.moe) * scale)}%`, width: `${Math.min(100, 2 * r.moe * scale)}%` }} aria-hidden />}
          </div>
          <span className="text-right font-semibold text-slate-900 tnum">{r.value == null ? '—' : fmt(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ stacked composition
export interface StackRow {
  label: string;
  values: (number | null)[];
}
/** 100% stacked bars, one per row, with a 2px gap between segments and direct labels on the larger ones. */
export function StackedBar({ parts, rows, caption }: { parts: { id: string; label: string; color: string }[]; rows: StackRow[]; caption?: ReactNode }) {
  return (
    <div>
      <div className="space-y-1.5">
        {rows.map((r) => {
          const total = r.values.reduce<number>((s, v) => s + (v ?? 0), 0);
          return (
            <div key={r.label} className="grid grid-cols-[88px_1fr] items-center gap-2 text-small">
              <span className="truncate text-slate-700">{r.label}</span>
              <div className="flex h-5 gap-[2px] overflow-hidden rounded-[4px]" role="img" aria-label={`${r.label}: ${parts.map((p, i) => `${p.label} ${r.values[i] == null ? '—' : `${Math.round((r.values[i] as number) * 100)}%`}`).join(', ')}`}>
                {total > 0 ? (
                  parts.map((p, i) => {
                    const v = r.values[i];
                    if (v == null || v <= 0) return null;
                    const w = (v / total) * 100;
                    return (
                      <div key={p.id} className="flex items-center justify-center overflow-hidden text-[11px] font-semibold text-white" style={{ width: `${w}%`, background: p.color }} title={`${p.label}: ${Math.round(v * 100)}%`}>
                        {w >= 12 && `${Math.round(v * 100)}%`}
                      </div>
                    );
                  })
                ) : (
                  <div className="hatch w-full" />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Legend items={parts.map((p) => ({ label: p.label, color: p.color }))} />
      {caption && <Caption>{caption}</Caption>}
    </div>
  );
}

// ------------------------------------------------------------------ donut
/** One share as a donut (two to four parts), with the headline share in the middle. */
export function Donut({ parts, center, sub }: { parts: { label: string; value: number | null; color: string }[]; center: string; sub?: string }) {
  const r = 34, c = 2 * Math.PI * r;
  const known = parts.filter((p) => p.value != null && p.value > 0) as { label: string; value: number; color: string }[];
  const total = known.reduce((s, p) => s + p.value, 0);
  let offset = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width="92" height="92" viewBox="0 0 92 92" role="img" aria-label={parts.map((p) => `${p.label} ${p.value == null ? '—' : `${Math.round(p.value * 100)}%`}`).join(', ')}>
        <circle cx="46" cy="46" r={r} fill="none" stroke={GRID} strokeWidth="12" />
        {total > 0 &&
          known.map((p) => {
            const len = (p.value / total) * c;
            const el = <circle key={p.label} cx="46" cy="46" r={r} fill="none" stroke={p.color} strokeWidth="12" strokeDasharray={`${Math.max(0, len - 2)} ${c - Math.max(0, len - 2)}`} strokeDashoffset={-offset} transform="rotate(-90 46 46)" />;
            offset += len;
            return el;
          })}
        <text x="46" y="44" textAnchor="middle" fontSize="15" fontWeight="700" fill="#0f172a">
          {center}
        </text>
        {sub && (
          <text x="46" y="58" textAnchor="middle" fontSize="9" fill={MUTED}>
            {sub}
          </text>
        )}
      </svg>
      <div className="space-y-1 text-small">
        {parts.map((p) => (
          <div key={p.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
            <span className="text-slate-700">{p.label}</span>
            <span className="ml-auto font-semibold text-slate-900 tnum">{p.value == null ? '—' : `${Math.round(p.value * 100)}%`}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ line chart
export interface LineSeries {
  id: string;
  label: string;
  color: string;
  values: (number | null)[];
  /** Optional 90% margins for a band around this series. */
  moe?: (number | null)[] | null;
  dashed?: boolean;
}
const W = 400, H = 150, PAD = { l: 44, r: 10, t: 10, b: 22 };
/** Multi-series line over years: one axis, thin lines, hover crosshair with every series' value, gaps for nulls. */
export function LineChart({ years, series, fmt, caption }: { years: number[]; series: LineSeries[]; fmt: (v: number) => string; caption?: ReactNode }) {
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();
  const all: number[] = [];
  for (const s of series) s.values.forEach((v, i) => {
    if (v != null && Number.isFinite(v)) {
      all.push(v);
      const m = s.moe?.[i];
      if (m != null) all.push(v + m, Math.max(0, v - m));
    }
  });
  if (all.length === 0 || years.length < 2) return <div className="hatch rounded-lg px-3 py-4 text-caption text-slate-600">No values to draw.</div>;
  const ticks = niceTicks(Math.min(...all), Math.max(...all), 3);
  const lo = ticks[0], hi = ticks[ticks.length - 1];
  const x = (i: number) => PAD.l + (i / (years.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD.t - PAD.b);
  const path = (vals: (number | null)[]) => {
    let d = '', pen = false;
    vals.forEach((v, i) => {
      if (v == null || !Number.isFinite(v)) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    });
    return d;
  };
  const band = (s: LineSeries) => {
    if (!s.moe) return null;
    const up: string[] = [], down: string[] = [];
    s.values.forEach((v, i) => {
      const m = s.moe?.[i];
      if (v == null || m == null || !Number.isFinite(v)) return;
      up.push(`${x(i).toFixed(1)},${y(v + m).toFixed(1)}`);
      down.unshift(`${x(i).toFixed(1)},${y(Math.max(lo, v - m)).toFixed(1)}`);
    });
    return up.length > 1 ? `M${up.join(' L')} L${down.join(' L')} Z` : null;
  };
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (years.length - 1));
    setHover(Math.max(0, Math.min(years.length - 1, i)));
  };
  const labelYears = years.filter((_, i) => i === 0 || i === years.length - 1 || i % 3 === 0);
  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-labelledby={id} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          <title id={id}>{series.map((s) => s.label).join(', ')} by year</title>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" />
              <text x={PAD.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill={MUTED}>
                {fmt(t)}
              </text>
            </g>
          ))}
          {labelYears.map((yr) => (
            <text key={yr} x={x(years.indexOf(yr))} y={H - 6} textAnchor="middle" fontSize="10" fill={MUTED}>
              {yr}
            </text>
          ))}
          {series.map((s) => {
            const b = band(s);
            return b ? <path key={`${s.id}-band`} d={b} fill={s.color} opacity="0.12" /> : null;
          })}
          {series.map((s) => (
            <path key={s.id} d={path(s.values)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? '4 3' : undefined} />
          ))}
          {hover != null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke={INK} strokeWidth="1" strokeDasharray="2 2" />
              {series.map((s) => {
                const v = s.values[hover];
                return v == null || !Number.isFinite(v) ? null : <circle key={s.id} cx={x(hover)} cy={y(v)} r="4" fill={s.color} stroke="#fff" strokeWidth="2" />;
              })}
            </g>
          )}
        </svg>
        {hover != null && (
          <div className="pointer-events-none absolute top-1 rounded-lg bg-slate-900/92 px-2.5 py-1.5 text-caption text-white shadow-lg" style={{ left: `${(x(hover) / W) * 100}%`, transform: x(hover) > W * 0.6 ? 'translateX(-105%)' : 'translateX(8px)' }}>
            <div className="font-semibold">{years[hover]}</div>
            {series.map((s) => {
              const v = s.values[hover];
              const m = s.moe?.[hover];
              return (
                <div key={s.id} className="flex items-center gap-1.5 tnum">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.label}: <b>{v == null || !Number.isFinite(v) ? '—' : fmt(v)}</b>
                  {m != null && v != null && <span className="text-white/70">± {fmt(m)}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {series.length > 1 && <Legend items={series.map((s) => ({ label: s.label, color: s.color, dashed: s.dashed }))} />}
      {caption && <Caption>{caption}</Caption>}
    </div>
  );
}

// ------------------------------------------------------------------ histogram
/** Distribution of one variable across the level's units, with this unit and the city / county marked. */
export function HistogramChart({ data, fmt, marker, refs, many }: { data: HistogramData; fmt: (v: number) => string; marker?: { value: number; label: string } | null; refs?: { label: string; value: number | null; color: string }[]; many: string }) {
  const HH = 96, P = { l: 6, r: 6, t: 14, b: 18 };
  if (data.edges.length < 2) return <div className="hatch rounded-lg px-3 py-4 text-caption text-slate-600">Too few values to draw.</div>;
  const lo = data.edges[0], hi = data.edges[data.edges.length - 1];
  const maxC = Math.max(...data.counts, 1);
  const xOf = (v: number) => P.l + ((v - lo) / (hi - lo || 1)) * (W - P.l - P.r);
  const k = data.counts.length;
  const bw = (W - P.l - P.r) / k;
  const markerBin = marker && Number.isFinite(marker.value) ? Math.min(k - 1, Math.max(0, Math.floor(((marker.value - lo) / (hi - lo || 1)) * k))) : null;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${HH}`} className="block w-full" role="img" aria-label={`Distribution across ${data.n} ${many}`}>
        {data.counts.map((c, i) => (
          <rect key={i} x={P.l + i * bw + 1} y={P.t + (1 - c / maxC) * (HH - P.t - P.b)} width={Math.max(1, bw - 2)} height={(c / maxC) * (HH - P.t - P.b)} rx="2" fill={markerBin === i ? SERIES.place : '#cbd5e1'}>
            <title>{`${fmt(data.edges[i])} to ${fmt(data.edges[i + 1])}: ${c} ${many}`}</title>
          </rect>
        ))}
        {refs?.map((r, i) => {
          if (r.value == null || !Number.isFinite(r.value)) return null;
          const rv = r.value;
          const others = refs.map((o) => o.value).filter((v, j): v is number => j !== i && v != null && Number.isFinite(v));
          const close = others.some((v) => Math.abs(xOf(v) - xOf(rv)) < 34);
          // when two reference lines sit close, the first label leans left and the second right
          const anchor = close ? (i === 0 ? 'end' : 'start') : 'middle';
          const dx = close ? (i === 0 ? -3 : 3) : 0;
          return (
            <g key={r.label}>
              <line x1={xOf(rv)} x2={xOf(rv)} y1={P.t - 2} y2={HH - P.b} stroke={r.color} strokeWidth="2" strokeDasharray="3 2" />
              <text x={xOf(rv) + dx} y={P.t - 4} textAnchor={anchor} fontSize="9" fill={INK}>
                {r.label}
              </text>
            </g>
          );
        })}
        <text x={P.l} y={HH - 5} fontSize="10" fill={MUTED}>
          {fmt(lo)}
        </text>
        <text x={W - P.r} y={HH - 5} textAnchor="end" fontSize="10" fill={MUTED}>
          {fmt(hi)}
        </text>
      </svg>
      {marker && <Caption>Violet bar: {marker.label}. Dashed lines: the city and county values.</Caption>}
    </div>
  );
}

// ------------------------------------------------------------------ rank / percentile bar
/** A 0–1 value as a plain filled bar (no knob, so it never reads as a slider). */
export function RankBar({ pct, label, color = SERIES.place }: { pct: number | null; label?: string; color?: string }) {
  if (pct == null) return <div className="hatch h-2 rounded-full" />;
  return (
    <div className="relative h-2.5 bg-stone-100" role="img" aria-label={label ?? `${Math.round(pct * 100)}%`}>
      <div className="absolute inset-y-0 left-0" style={{ width: `${Math.max(2, pct * 100)}%`, background: color, opacity: 0.8 }} />
    </div>
  );
}
