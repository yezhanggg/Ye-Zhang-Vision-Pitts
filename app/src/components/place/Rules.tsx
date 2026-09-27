// The rules' output for block G (plan §3): lib/place/recommend under the current stance, shown as labeled lines
// with their arithmetic printed, closed by the fixed "You decide" sentence and what the tool refuses to pretend.
// Nothing here computes a rule; it lays out what the library returns and hands the target band to blocks A and B.
import { useMemo } from 'react';
import { APP_STANCES } from '../../lib/analysis/copy';
import { scoring } from '../../lib/data';
import type { TractResult } from '../../lib/derived';
import { BAND_LABEL } from '../../lib/place/afford';
import { typeBandFor } from '../../lib/place/bands';
import { DECIDE, REFUSES } from '../../lib/place/copy';
import { hud as hudTable } from '../../lib/place/data';
import { NA } from '../../lib/place/format';
import { recommend, type Recommendation } from '../../lib/place/recommend';
import { STANCE_LABEL } from '../../lib/place/thresholds';
import type { BandId, HudTable, PlaceMeasures, Stance, TypeBandId, Typology } from '../../lib/place/types';
import { cx } from '../../lib/format';

/** The fixed sentences come from lib/place/copy so the docs, the About page and this block print the same words. */
export const YOU_DECIDE = DECIDE;
export const NOT_CLAIMED = `Not claimed here: ${REFUSES.slice(0, -1).join(', ')}, or ${REFUSES[REFUSES.length - 1]}.`;

export interface RuleLine {
  key: string;
  label: string;
  text: string;
  tone?: 'plain' | 'warn' | 'fixed';
}

export interface RulesOut {
  stance: Stance;
  /** The recommendation of record, or null without a HUD table. */
  rec: Recommendation | null;
  targetBand: BandId | null;
  typeBand: TypeBandId | null;
  /** Appended to block A's sentence when the target band is uncertain. */
  targetNote: string | null;
  lines: RuleLine[];
}

const isStance = (s: string | null): s is Stance => !!s && (APP_STANCES as readonly string[]).includes(s);

/** Labels lib/place/copy puts in front of its lines ("Under-served here: …"); the rest are the stance test and the refusals. */
const LABELS = ['Under-served here', 'Main tenants the data shows', 'Price that serves them', 'Types that can deliver this (fit rules, a value judgment)', 'Types that can deliver this', 'Not served by this option', 'You decide'];

/** One library line → label + text. Lines with no known label are the stance test (a rule) or a "Not X, because …" line. */
export function toRuleLine(line: string, i: number, stance: Stance, rec: Recommendation): RuleLine {
  for (const l of LABELS) {
    if (line.startsWith(`${l}: `)) {
      const text = line.slice(l.length + 2);
      const key = `${l.split(' ')[0].toLowerCase()}${i}`;
      if (l === 'You decide') return { key, label: l, text, tone: 'fixed' };
      if (l === 'Under-served here') return { key, label: l, text, tone: rec.band.uncertain ? 'warn' : 'plain' };
      if (l === 'Not served by this option') return { key, label: l, text, tone: 'warn' };
      return { key, label: l, text };
    }
  }
  if (/^Not [a-z0-9–]/.test(line)) return { key: `not${i}`, label: 'Not recommended', text: line };
  return { key: `rule${i}`, label: `${STANCE_LABEL[stance]} rule`, text: line, tone: rec.stanceTest.passed === false ? 'warn' : 'plain' };
}

/** Everything block G prints under the current stance (the first stance when the weights match none). */
export function computeRules(place: PlaceMeasures, r: TractResult, current: string | null, fitOrders: Record<string, string[]>, override?: BandId, hud: HudTable | null = hudTable): RulesOut {
  const stance: Stance = isStance(current) ? current : APP_STANCES[0];
  if (!hud) {
    return {
      stance,
      rec: null,
      targetBand: null,
      typeBand: null,
      targetNote: null,
      lines: [
        { key: 'nohud', label: `${STANCE_LABEL[stance]} rule`, text: `HUD income limits ${NA}, so the rent ceiling, the market test and the stance rules do not run.`, tone: 'warn' },
        { key: 'decide', label: 'You decide', text: YOU_DECIDE, tone: 'fixed' },
        { key: 'refuse', label: 'Refuses to pretend', text: NOT_CLAIMED, tone: 'fixed' },
      ],
    };
  }
  const fitOrder = (fitOrders[stance] ?? r.ranking) as Typology[];
  const rec = recommend(place, hud, stance, { fitOrder, band: override });
  const lines: RuleLine[] = [];
  for (const [i, l] of rec.lines.entries()) {
    const line = toRuleLine(l, i, stance, rec);
    // Every row reads as sentences: a capital to start, a full stop to end (the library's clauses carry neither).
    line.text = line.text.charAt(0).toUpperCase() + line.text.slice(1);
    if (!/[.!?)]$/.test(line.text)) line.text += '.';
    const prev = lines[lines.length - 1];
    // The "Not X, because …" sentences share one row.
    if (prev && prev.label === 'Not recommended' && line.label === 'Not recommended') prev.text += ` ${line.text}`;
    else lines.push(line);
  }
  lines.push({ key: 'refuse', label: 'Refuses to pretend', text: NOT_CLAIMED, tone: 'fixed' });
  const b = rec.band;
  return {
    stance,
    rec,
    targetBand: b.available || b.overridden ? b.band : null,
    typeBand: typeBandFor(b.band),
    targetNote: b.uncertain && b.available && (b.hh ?? 0) > 0 ? `The ${BAND_LABEL[b.band]} count is uncertain (margin of error above the estimate)${b.runnerUp ? `; ${BAND_LABEL[b.runnerUp]} is the runner-up` : ''}.` : null,
    lines,
  };
}

export function useRules(place: PlaceMeasures, r: TractResult, current: string | null, fitOrders: Record<string, string[]>, override?: BandId, hud: HudTable | null = hudTable): RulesOut {
  return useMemo(() => computeRules(place, r, current, fitOrders, override, hud), [place, r, current, fitOrders, override, hud]);
}

const TONE: Record<NonNullable<RuleLine['tone']>, string> = { plain: 'text-slate-800', warn: 'text-amber-900', fixed: 'text-slate-700 italic' };

/** The rules' lines as a list: label, then the sentence with its arithmetic. */
export default function Rules({ rules }: { rules: RulesOut }) {
  return (
    <dl className="divide-y divide-stone-100 overflow-hidden rounded-xl bg-white ring-1 ring-stone-200/80">
      {rules.lines.map((l) => (
        <div key={l.key} className="px-3 py-2">
          <dt className="text-caption font-semibold uppercase tracking-wide text-slate-500">{l.label}</dt>
          <dd className={cx('mt-0.5 text-small leading-snug', TONE[l.tone ?? 'plain'])}>{l.text}</dd>
        </div>
      ))}
      <div className="px-3 py-1.5 text-caption text-slate-500">Stance: {scoring.presets.find((p) => p.id === rules.stance)?.label ?? rules.stance} · rules in lib/place/recommend, thresholds in lib/place/thresholds, printed in each line.</div>
    </dl>
  );
}
