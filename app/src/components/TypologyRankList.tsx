import { LayoutGroup, motion } from 'motion/react';
import { scoring, typologyById } from '../lib/data';
import { ANALYSIS_COPY as C } from '../lib/analysis/copy';
import { closeMargin, rankLine, rationale, reasonsFor, separator, tiedWith, tieMargin, typeLabel, type AnswerState, type Rationale } from '../lib/analysis/rationale';
import { bandOf, stabilityBand, stabilityHow, stabilityText } from '../lib/analysis/stability';
import type { TractResult } from '../lib/derived';
import { topMargin, type Stability } from '../lib/scoring';
import { useApp } from '../lib/store';
import { cx } from '../lib/format';
import type { TractProps, Weights } from '../lib/types';
import { Dot, Explainer } from './primitives';

const SPRING = { type: 'spring' as const, stiffness: 320, damping: 30 };

/** A rationale from the result alone (no tract or weights at hand): enough for the rank lines and the tie marks. */
function fromResult(r: TractResult): Rationale {
  const margin = topMargin(r.scores);
  const state: AnswerState = !r.top ? 'no_data' : margin == null ? 'clear' : margin < tieMargin() ? 'tie' : margin < closeMargin() ? 'close' : 'clear';
  const second = r.ranking[1] ?? null;
  const { because, despite } = r.top ? reasonsFor(r, r.top) : { because: [], despite: [] };
  return {
    state,
    top: r.top,
    second,
    topScore: r.topScore,
    secondScore: second ? (r.scores.find((s) => s.typology === second)?.score ?? null) : null,
    margin,
    tied: state === 'tie' ? tiedWith(r, tieMargin()) : [],
    unscored: scoring.typologies.map((t) => t.id).filter((k) => (r.scores.find((s) => s.typology === k)?.score ?? null) == null),
    because,
    despite,
    separator: state !== 'tie' && r.top && second ? separator(r, r.top, second) : null,
    scored: { n: 0, m: scoring.factors.length, missing: [], off: [] },
    need: { count: null, low: false },
    singleFactor: null,
  };
}

/** Competition ranks: types within the tie margin of the one above share its number. */
function ranksOf(r: TractResult): number[] {
  const eps = tieMargin();
  const out: number[] = [];
  let prev: number | null = null;
  r.ranking.forEach((k, i) => {
    const s = r.scores.find((x) => x.typology === k)?.score ?? 0;
    out.push(i > 0 && prev != null && prev - s < eps ? out[i - 1] : i + 1);
    prev = s;
  });
  return out;
}

/** The rank in words for the row's line ("Best fit", "Second", …), used when the rationale has no line for it. */
const RANK_WORDS = ['Best fit', 'Second', 'Third', 'Fourth', 'Fifth'];

/**
 * The ranking list as ranks and words: the rank number, the type, a bar for its fit and one line on what separates
 * it. No score is printed; the bar's tooltip carries it for anyone who asks. `ra` (the rationale of record) gives
 * each row its line; without it the list computes one from `t` and `weights`, or from the result alone.
 * Compact mode (the compare views) keeps the bars and drops the lines.
 */
export default function TypologyRankList({ result, compact, idPrefix = 'r', ra: given, t, weights }: { result: TractResult; compact?: boolean; idPrefix?: string; ra?: Rationale; t?: TractProps; weights?: Weights }) {
  const lite = useApp((s) => s.lite);
  const trans = lite ? { duration: 0 } : SPRING;
  const ra = given ?? (t && weights ? rationale(t, result, weights) : fromResult(result));
  const ranks = ranksOf(result);
  const unscored = ra.unscored.filter((k) => !result.ranking.includes(k) && (result.scores.find((s) => s.typology === k)?.score ?? null) == null);
  return (
    <LayoutGroup id={idPrefix}>
      <ol className={compact ? 'space-y-1' : 'space-y-1.5'}>
        {result.ranking.map((k, i) => {
          const ty = typologyById.get(k)!;
          const score = result.scores.find((s) => s.typology === k)?.score ?? null;
          const top = i === 0 && score != null;
          const line = compact ? '' : rankLine(result, k, ra) || RANK_WORDS[ranks[i] - 1] || ty.long;
          const tip = score == null ? undefined : `${ty.label}: fit ${Math.round(score * 100)} of 100 under these weights`;
          return (
            <motion.li key={k} layout="position" transition={trans} title={tip} className={cx('relative overflow-hidden rounded-xl px-3 ring-1', compact ? 'py-1.5' : 'py-2', top ? 'bg-white shadow-sm' : 'bg-white/60 ring-stone-200/70')} style={{ boxShadow: top ? `0 0 0 1.5px ${ty.color}, 0 4px 14px -6px ${ty.color}66` : undefined }}>
              <div className="flex items-center gap-2.5">
                <span className={cx('w-4 text-center font-display text-small font-bold tnum', top ? 'text-slate-900' : 'text-slate-600')}>{ranks[i]}</span>
                <Dot color={ty.color} size={compact ? 10 : 12} />
                <div className="min-w-0 flex-1">
                  <div className={cx('flex items-center gap-1.5 font-semibold text-slate-900', compact ? 'text-small' : 'text-body')}>
                    <span className="truncate">{ty.label}</span>
                    {ra.tied.includes(k) && <span className="shrink-0 rounded-full bg-slate-100 px-1.5 text-caption font-semibold text-slate-800 ring-1 ring-slate-300">tie</span>}
                    {!compact && top && !ra.tied.includes(k) && <span className="shrink-0 rounded-full bg-violet-50 px-1.5 text-caption font-semibold text-violet-700 ring-1 ring-violet-200">best fit</span>}
                  </div>
                  {!compact && <div className="text-caption text-slate-600">{line}</div>}
                </div>
              </div>
              <div className={cx('ml-[46px] overflow-hidden rounded-full bg-stone-100', compact ? 'mt-1 h-1' : 'mt-1.5 h-1.5')} aria-hidden>
                <motion.div className="h-full rounded-full" style={{ background: ty.color }} initial={false} animate={{ width: `${(score ?? 0) * 100}%` }} transition={lite ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 30 }} />
              </div>
            </motion.li>
          );
        })}
        {unscored.map((k) => {
          const ty = typologyById.get(k);
          if (!ty) return null;
          return (
            <li key={k} className={cx('hatch relative overflow-hidden rounded-xl px-3 ring-1 ring-stone-200/70', compact ? 'py-1.5' : 'py-2')}>
              <div className="flex items-center gap-2.5">
                <span className="w-4 text-center font-display text-small font-bold text-slate-400">–</span>
                <Dot color={ty.color} size={compact ? 10 : 12} />
                <div className="min-w-0 flex-1">
                  <div className={cx('truncate font-semibold text-slate-700', compact ? 'text-small' : 'text-body')}>{ty.label}</div>
                  {!compact && <div className="text-caption text-slate-600">{C.rank.unscored(typeLabel(k))}</div>}
                </div>
                <span className="shrink-0 text-caption text-slate-500">not scored</span>
              </div>
            </li>
          );
        })}
      </ol>
    </LayoutGroup>
  );
}

const TONE = {
  solid: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
  likely: 'bg-amber-50 text-amber-900 ring-amber-200',
  close: 'bg-rose-50 text-rose-900 ring-rose-200',
};

/** Without a rationale (the compare views): the band from the share, hidden at zero draws. */
function bandAlone(s: Stability): ReturnType<typeof stabilityBand> {
  const band = bandOf(s.share);
  return { band, label: C.stability.labels[band], digits: null, show: s.draws > 0 };
}

/** One sentence in words on whether the order survives small changes to the weights. Hidden on a tie or with no draws. */
export function StabilityBadge({ stability, compact, ra }: { stability: Stability | null; compact?: boolean; ra?: Rationale }) {
  if (!stability) return null;
  const b = ra ? stabilityBand(stability, ra) : bandAlone(stability);
  const text = stabilityText(b);
  if (!b.show || !text) return null;
  const runnerUp = Object.entries(stability.counts).filter(([k]) => k !== stability.top).sort((a, b) => b[1] - a[1])[0];
  return (
    <div className={cx('rounded-xl px-3 py-2 ring-1', TONE[b.band])}>
      <div className="text-small">{text}</div>
      {!compact && (
        <>
          {runnerUp && stability.share < 1 && <div className="mt-1 text-caption">Otherwise usually {typologyById.get(runnerUp[0])?.label}.</div>}
          <Explainer title="How this is tested" className="mt-1">
            <p className="text-caption text-slate-700">{stabilityHow(stability.draws, scoring.scoring.stability_concentration)}</p>
          </Explainer>
        </>
      )}
    </div>
  );
}
