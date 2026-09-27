// The reasoning under the answer, in a fixed order: the because/despite sentence (the rationale of record), what
// separates #1 from #2, how stable the pick is, and what would change it. Every sentence is a library template.
import { useMemo } from 'react';
import { flipPoint, flipSentence } from '../../lib/analysis/flip';
import { needSentence, separatorSentence, whySentence, type Rationale } from '../../lib/analysis/rationale';
import type { Stability } from '../../lib/scoring';
import type { TractProps, Weights } from '../../lib/types';
import { cx } from '../../lib/format';
import { StabilityBadge } from '../TypologyRankList';

export default function WhyBlock({ t, ra, weights, stability, className }: { t: TractProps; ra: Rationale; weights: Weights; stability: Stability | null; className?: string }) {
  const why = whySentence(t, ra);
  const need = needSentence(ra);
  const sep = separatorSentence(ra);
  const fp = useMemo(() => (ra.state === 'clear' || ra.state === 'close' ? flipPoint(t, weights) : null), [t, weights, ra.state]);
  const flip = flipSentence(fp, ra);
  return (
    <div className={cx('space-y-2', className)}>
      <p className="text-body text-slate-800">{why}</p>
      {need && <p className="text-small font-medium text-rose-800">{need}</p>}
      {sep && <p className="text-small text-slate-700">{sep}</p>}
      <StabilityBadge stability={stability} ra={ra} />
      {flip && <p className="text-small text-slate-700">{flip}</p>}
    </div>
  );
}
