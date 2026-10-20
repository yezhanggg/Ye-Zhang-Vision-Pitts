// One-line answers for the four project questions, shared by the Place page's project card (its row headlines) and
// Compare places (its side-by-side rows), so both say the same thing in the same words.
import type { ShareKey } from '../../../lib/demand/types';
import { fmtCount, fmtShare, isNum } from '../../../lib/place/format';
import type { ProjectMix } from '../../../lib/project/plan';
import type { SizeRow } from '../../../lib/project/size';
import { AFFORDABLE_LEVELS, homesAt, homesOfSize } from '../../../lib/project/plan';
import type { ProjectModel } from './useProjectModel';

export type Tone = 'good' | 'bad' | 'plain';
export interface Headline {
  value: string;
  sub: string;
  tone: Tone;
}

export const usd = (v: number) => `${v < 0 ? '−' : ''}$${Math.abs(Math.round(v)).toLocaleString('en-US')}`;
/** Dollars in thousands or millions, for headlines. */
export const usdShort = (v: number) => {
  const a = Math.abs(v);
  const s = a >= 1e6 ? `$${(a / 1e6).toFixed(a >= 1e7 ? 1 : 2)}M` : a >= 1e3 ? `$${Math.round(a / 1e3)}k` : `$${Math.round(a)}`;
  return v < 0 ? `−${s}` : s;
};

/** "27 × 0–1BR · 11 × 2BR · 2 × 3BR+": the project's homes by size. */
export function mixWords(mix: ProjectMix): string {
  const c = mix.counts;
  const parts: [number, string][] = [
    [homesOfSize(c, 0) + homesOfSize(c, 1), '0–1BR'],
    [homesOfSize(c, 2), '2BR'],
    [homesOfSize(c, 3), '3BR+'],
  ];
  return parts.map(([n, l]) => `${n} × ${l}`).join(' · ');
}

/** A tract share from the demand signals, as a percent. */
export function signalShare(m: ProjectModel, key: ShareKey): string {
  const s = m.signals.find((x) => x.key === key)?.tract;
  return s && isNum(s[0]) ? fmtShare(s[0]) : 'n/a';
}

export function needHeadline(m: ProjectModel, leadLabel: string | null): Headline {
  return {
    value: leadLabel ?? 'No type suggested',
    sub: `Renters ${signalShare(m, 'renter')} · one-person renters ${signalShare(m, 'one_person')} · ${mixWords(m.mix)}`,
    tone: 'plain',
  };
}

export function buildHeadline(m: ProjectModel): Headline {
  if (!m.cap) return { value: 'Not read here', sub: 'No zoning capacity for this tract', tone: 'plain' };
  const v = m.cap.vacant;
  return {
    value: `${fmtCount(v.homes)} homes`,
    sub: `by right on ${fmtCount(v.computed)} vacant lots${m.cap.gentle.homes > 0 ? ` · +${fmtCount(m.cap.gentle.homes)} on lived-in lots` : ''}${m.inIzo ? ' · inclusionary overlay' : ''}`,
    tone: 'plain',
  };
}

export function scoreHeadline(m: ProjectModel): Headline {
  const s = m.sheet.score;
  const market = m.branch === 'market';
  const spread = s.range.low === s.range.high ? '' : `range ${s.range.low}–${s.range.high} · `;
  const sub = spread + (s.threshold == null ? `${s.fromPlace} from the place` : s.short > 0 ? `${s.short} short of PHFA's ${s.threshold} minimum` : `meets PHFA's ${s.threshold} minimum`);
  return { value: `${s.total} of ${s.max}`, sub: market ? `market rate: no credits applied for · ${sub}` : sub, tone: market || s.threshold == null ? 'plain' : s.short > 0 ? 'bad' : 'good' };
}

export function pencilHeadline(m: ProjectModel): Headline {
  const r = m.result;
  if (r.homes === 0) return { value: 'No homes', sub: 'set the homes or the mix', tone: 'plain' };
  if (m.branch === 'market' && r.market) {
    const y = r.market.yieldOnCost.value;
    return { value: `${(y * 100).toFixed(1)}% yield`, sub: `target ${(m.args.inputs.targetYield * 100).toFixed(1)}% · breaks even at ${usd(r.market.breakEven.value)} a month`, tone: y >= m.args.inputs.targetYield ? 'good' : 'bad' };
  }
  const affordable = homesAt(r.counts, AFFORDABLE_LEVELS);
  if (r.gap <= 0) return { value: `${usdShort(-r.gap)} surplus`, sub: `${usdShort(r.tdc)} to build · ${m.exampleCount} example inputs`, tone: 'good' };
  return {
    value: `${usdShort(r.gap)} gap`,
    sub: `${affordable > 0 ? `${usdShort(r.gap / affordable)} a home with an income limit · ` : ''}${usdShort(Math.max(0, r.gapAfterFee))} after deferring fee`,
    tone: 'bad',
  };
}

/** One size's result in words: "$1.2M to spare", "$300k gap, covered by deferring fee", "6.1% yield (target 6.5%)". */
export function sizeWords(row: SizeRow): string {
  const r = row.run.result;
  if (r.branch === 'market' && r.market) {
    const y = r.market.yieldOnCost.value;
    return `${(y * 100).toFixed(1)}% yield (target ${(row.run.args.inputs.targetYield * 100).toFixed(1)}%)`;
  }
  if (r.gap <= 0) return `${usdShort(-r.gap)} to spare`;
  if (row.tier === 'closes') return `${usdShort(r.gap)} gap, under half the fee`;
  if (row.tier === 'close') return `${usdShort(r.gap)} gap, covered by deferring fee`;
  return `${usdShort(r.gapAfterFee)} gap after deferring fee`;
}

/** "148 points (131–160) · minimum 125". */
export function pointsWords(p: { total: number; low: number; high: number; threshold: number | null }): string {
  const range = p.low === p.high ? '' : ` (${p.low}–${p.high})`;
  return `${p.total} points${range}${p.threshold != null ? ` · minimum ${p.threshold}` : ''}`;
}

export const AWARD_NOTE = 'Chance of award is not modeled: PHFA does not publish past scores.';
