import { LayoutGroup, motion } from 'motion/react';
import { scoring, typologyById } from '../lib/data';
import { STABILITY_HOW, stabilityWords } from '../lib/copy';
import { reasons, type TractResult } from '../lib/derived';
import type { Stability } from '../lib/scoring';
import { useApp } from '../lib/store';
import { cx } from '../lib/format';
import { AnimatedNumber, Dot, Explainer } from './primitives';

const SPRING = { type: 'spring' as const, stiffness: 320, damping: 30 };
const f100 = (v: number) => (v * 100).toFixed(0);

export default function TypologyRankList({ result, compact, idPrefix = 'r' }: { result: TractResult; compact?: boolean; idPrefix?: string }) {
  const lite = useApp((s) => s.lite);
  const trans = lite ? { duration: 0 } : SPRING;
  return (
    <LayoutGroup id={idPrefix}>
      <ol className={compact ? 'space-y-1' : 'space-y-1.5'}>
        {result.ranking.map((k, i) => {
          const t = typologyById.get(k)!;
          const score = result.scores.find((s) => s.typology === k)?.score ?? null;
          const top = i === 0 && score != null;
          const why = compact ? '' : reasons(result, k);
          return (
            <motion.li key={k} layout="position" transition={trans} className={cx('relative overflow-hidden rounded-xl px-3 ring-1', compact ? 'py-1.5' : 'py-2', top ? 'bg-white shadow-sm' : 'bg-white/60 ring-stone-200/70')} style={{ boxShadow: top ? `0 0 0 1.5px ${t.color}, 0 4px 14px -6px ${t.color}66` : undefined }}>
              <div className="flex items-center gap-2.5">
                <span className={cx('w-4 text-center font-display text-small font-bold tnum', top ? 'text-slate-900' : 'text-slate-600')}>{i + 1}</span>
                <Dot color={t.color} size={compact ? 10 : 12} />
                <div className="min-w-0 flex-1">
                  <div className={cx('truncate font-semibold text-slate-900', compact ? 'text-small' : 'text-body')}>{t.label}</div>
                  {!compact && <div className="text-caption text-slate-600">{why ? <>Why: {why}</> : t.long}</div>}
                </div>
                <span className={cx('shrink-0 text-right tnum', top ? 'text-slate-900' : 'text-slate-700')}>
                  <AnimatedNumber value={score} format={f100} className={cx('font-display font-semibold', compact ? 'text-small' : 'text-lead')} />
                  <span className="text-caption text-slate-600"> / 100{compact ? '' : ' match'}</span>
                </span>
              </div>
              <div className={cx('ml-[46px] overflow-hidden rounded-full bg-stone-100', compact ? 'mt-1 h-1' : 'mt-1.5 h-1.5')}>
                <motion.div className="h-full rounded-full" style={{ background: t.color }} initial={false} animate={{ width: `${(score ?? 0) * 100}%` }} transition={lite ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 30 }} />
              </div>
            </motion.li>
          );
        })}
      </ol>
    </LayoutGroup>
  );
}

const TONE = {
  solid: { cls: 'bg-emerald-50 text-emerald-900 ring-emerald-200', bar: '#10b981' },
  likely: { cls: 'bg-amber-50 text-amber-900 ring-amber-200', bar: '#f59e0b' },
  close: { cls: 'bg-rose-50 text-rose-900 ring-rose-200', bar: '#f43f5e' },
};

/** "Solid pick. Stays #1 in 9 of 10 small changes to your priorities." */
export function StabilityBadge({ stability, compact }: { stability: Stability | null; compact?: boolean }) {
  if (!stability) return null;
  const w = stabilityWords(stability.share);
  const tone = TONE[w.tone];
  const runnerUp = Object.entries(stability.counts).filter(([k]) => k !== stability.top).sort((a, b) => b[1] - a[1])[0];
  return (
    <div className={cx('rounded-xl px-3 py-2 ring-1', tone.cls)}>
      <div className="text-small">
        <b>{w.label}.</b> Stays #1 in <AnimatedNumber value={w.n} format={(v) => v.toFixed(0)} className="font-semibold" /> of 10 small changes to your priorities.
      </div>
      <div className="mt-1.5 flex gap-0.5" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <motion.span key={i} className="h-1.5 flex-1 rounded-full" initial={false} animate={{ backgroundColor: i < w.n ? tone.bar : 'rgba(255,255,255,0.8)' }} transition={{ duration: 0.25, delay: i * 0.02 }} />
        ))}
      </div>
      {!compact && (
        <>
          {runnerUp && w.n < 10 && <div className="mt-1 text-caption">Otherwise usually {typologyById.get(runnerUp[0])?.label}.</div>}
          <Explainer title="How this is calculated" className="mt-1">
            <p className="text-caption text-slate-700">
              {STABILITY_HOW} (Technical: {stability.draws} Dirichlet draws around your weights, concentration {scoring.scoring.stability_concentration}; exact share {Math.round(stability.share * 100)}%.)
            </p>
          </Explainer>
        </>
      )}
    </div>
  );
}
