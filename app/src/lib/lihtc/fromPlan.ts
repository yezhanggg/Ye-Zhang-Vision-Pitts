// Score sheet lines the plan itself answers (docs/data/lihtc.md): the unit mix settles the income-targeting and
// large-family lines, and the pencil (when it has run) the financing lines. Each value carries its arithmetic and can
// be overridden on the sheet; a typed entry always wins. Nothing here changes PHFA's rules in score.ts.
import type { Counts, MixLevel } from '../project/store';
import { applies, nextTier, scoreSheet, type Answer, type Answers, type Facts, type Item, type Setup, type Sheet } from './score';

/** The figures of a finished pencil the financing lines read (lib/pencil). */
export interface FinanceFacts {
  /** Total development cost. */
  tdc: number;
  /** Permanent amortizing debt and soft funds from outside the tax credit equity (PHFA's D.4.b numerator). */
  privateSoft: number;
  /** Developer fee and the part of it deferred to close the gap. */
  devFee: number;
  deferredFee: number;
  /** Gap left after every source, before deferring fee. */
  gap: number;
}

export interface PlanFacts {
  homes: number;
  /** Homes at or below 50% of AMI. */
  le50: number;
  /** Homes with an income limit (30, 50, 60, 80% of AMI). */
  affordable: number;
  /** Of those, homes with three or more bedrooms. */
  affordable3: number;
  stories: number | null;
  finance: FinanceFacts | null;
}

const LE50: MixLevel[] = ['30', '50'];
const AFFORDABLE: MixLevel[] = ['30', '50', '60', '80'];
const sum = (c: Counts, levels: MixLevel[], br?: number) => levels.reduce((s, l) => s + (br == null ? c[l].reduce((a, b) => a + b, 0) : c[l][br]), 0);

export function planFacts(c: Counts, stories: number | null, finance: FinanceFacts | null = null): PlanFacts {
  const homes = sum(c, ['30', '50', '60', '80', 'mkt']);
  return { homes, le50: sum(c, LE50), affordable: sum(c, AFFORDABLE), affordable3: sum(c, AFFORDABLE, 3), stories, finance };
}

/** Line ids the plan answers, by what they read. */
export const LE50_LINES = ['B.1', '4.3.1'];
export const LARGE_LINES = ['B.4', '4.3.4.a'];
export const PRIVATE_SOFT_LINES = ['D.4.b'];
export const FEE_LINES = ['4.5.9'];
/** Large-family lines do not apply at this many stories or more (PHFA). */
export const LARGE_MAX_STORIES = 7;

export interface PlanAnswer {
  /** null: the plan cannot answer it (the reason says why). */
  value: Answer;
  formula: string;
}

const pct1 = (x: number) => Math.round(x * 1000) / 10;
const n0 = (v: number) => Math.round(v).toLocaleString('en-US');

/** The plan's answers for one sheet and set-up. */
export function autoAnswers(sheet: Sheet, setup: Setup, f: PlanFacts): Record<string, PlanAnswer> {
  const out: Record<string, PlanAnswer> = {};
  const items = sheet.sections.flatMap((s) => s.items).filter((i) => applies(i, setup));
  for (const item of items) {
    if (LE50_LINES.includes(item.id) && f.homes > 0) {
      const p = pct1(f.le50 / f.homes);
      out[item.id] = { value: p, formula: `${n0(f.le50)} homes at or below 50% AMI ÷ ${n0(f.homes)} homes = ${p}%` };
    } else if (LARGE_LINES.includes(item.id) && f.homes > 0) {
      if (f.stories != null && f.stories >= LARGE_MAX_STORIES) out[item.id] = { value: null, formula: `does not apply: ${f.stories} stories (PHFA allows it only under ${LARGE_MAX_STORIES})` };
      else {
        const p = pct1(f.affordable3 / f.homes);
        out[item.id] = { value: p, formula: `${n0(f.affordable3)} affordable homes with 3+ bedrooms ÷ ${n0(f.homes)} homes = ${p}%` };
      }
    } else if (PRIVATE_SOFT_LINES.includes(item.id) && f.finance && f.finance.tdc > 0) {
      const p = pct1(f.finance.privateSoft / f.finance.tdc);
      out[item.id] = { value: p, formula: `$${n0(f.finance.privateSoft)} loan and soft funds ÷ $${n0(f.finance.tdc)} development cost = ${p}%` };
    } else if (FEE_LINES.includes(item.id) && f.finance && f.finance.devFee > 0) {
      const share = f.finance.deferredFee / f.finance.devFee;
      const id = share < 0.1 ? 'under10' : share <= 0.3 ? '10-30' : null;
      out[item.id] = { value: id, formula: `$${n0(f.finance.deferredFee)} fee reinvested ÷ $${n0(f.finance.devFee)} developer fee = ${pct1(share)}%${id ? '' : ' (over 30%: no points)'}` };
    }
  }
  return out;
}

/** Plan values under the typed entries: a typed entry, even an explicit "none", always wins. */
export function mergeAnswers(auto: Record<string, PlanAnswer>, typed: Answers): Answers {
  const out: Answers = {};
  for (const [id, a] of Object.entries(auto)) if (a.value != null) out[id] = a.value;
  return { ...out, ...typed };
}

export interface Hint {
  ref: string;
  text: string;
}

/** Lines the arithmetic informs but cannot tick (they need documents). */
export function hints(sheet: Sheet, f: PlanFacts): Hint[] {
  const ids = new Set(sheet.sections.flatMap((s) => s.items.map((i) => i.id)));
  const out: Hint[] = [];
  if (ids.has('D.4.a') && f.finance && f.finance.devFee > 0) {
    const ok = f.finance.gap < 0.25 * f.finance.devFee;
    out.push({ ref: 'D.4.a', text: `Fully funded: the pencil's gap of $${n0(Math.max(0, f.finance.gap))} is ${ok ? 'under' : 'not under'} 25% of the $${n0(f.finance.devFee)} developer fee ($${n0(0.25 * f.finance.devFee)}). The line also needs every funding commitment in place.` });
  }
  if ((ids.has('A.2.c') || ids.has('A.2.i')) && f.homes > 0 && f.affordable < f.homes) out.push({ ref: 'A.2.c', text: `Mixed income: ${n0(f.homes - f.affordable)} of ${n0(f.homes)} homes are market rate. PHFA also asks for a shown financial benefit, and not with income averaging.` });
  return out;
}

export interface MixMove {
  item: Item;
  /** "3 more homes at or below 50% AMI" */
  change: string;
  gain: number;
}

/**
 * The smallest change to the mix that reaches each income-targeting or large-family line's next step, with what it
 * adds to the total once PHFA's caps are applied. Only lines the plan answers and the person has not typed over.
 */
export function mixMoves(sheet: Sheet, setup: Setup, typed: Answers, facts: Facts, f: PlanFacts): MixMove[] {
  if (f.homes <= 0) return [];
  const auto = autoAnswers(sheet, setup, f);
  const base = mergeAnswers(auto, typed);
  const now = scoreSheet(sheet, setup, base, facts).total;
  const out: MixMove[] = [];
  for (const item of sheet.sections.flatMap((s) => s.items).filter((i) => applies(i, setup) && i.tiers && auto[i.id]?.value != null && typed[i.id] === undefined)) {
    const large = LARGE_LINES.includes(item.id);
    if (!large && !LE50_LINES.includes(item.id)) continue;
    const have = large ? f.affordable3 : f.le50;
    const next = nextTier(item.tiers ?? [], (have / f.homes) * 100);
    if (!next) continue;
    const step = next.tier;
    const mark = step.over ?? step.from ?? 0;
    const need = step.over != null ? Math.floor((mark / 100) * f.homes) + 1 : Math.ceil((mark / 100) * f.homes);
    const more = need - have;
    if (more <= 0 || need > f.homes) continue;
    const gain = scoreSheet(sheet, setup, { ...base, [item.id]: pct1(need / f.homes) }, facts).total - now;
    if (gain <= 0) continue;
    const change = large ? `${more} more affordable home${more === 1 ? '' : 's'} with 3+ bedrooms (${need} of ${f.homes}, ${step.over != null ? 'over' : 'at least'} ${mark}%)` : `${more} more home${more === 1 ? '' : 's'} at or below 50% AMI (${need} of ${f.homes}, ${step.over != null ? 'over' : 'at least'} ${mark}%)`;
    out.push({ item, change, gain });
  }
  return out.sort((a, b) => b.gain - a.gain);
}
