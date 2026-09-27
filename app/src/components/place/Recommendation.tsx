// Block G: the recommendation. First the rules' output (lib/place/recommend, value judgments with their thresholds
// printed), then "Fit order under this stance" (the weighted order as ranks and words, headed by the best fit), then
// "Under each stance" (three rows). The page does not choose: the fixed "You decide" line closes the rules.
import type { ReactNode } from 'react';
import type { Rationale } from '../../lib/analysis/rationale';
import type { TractResult } from '../../lib/derived';
import type { TractProps, Weights } from '../../lib/types';
import { SectionTitle, ValuesBadge } from '../primitives';
import FitOrder from './FitOrder';
import StanceTable, { type StanceRow } from './StanceTable';
import { SourceLine } from './shared';

export default function Recommendation({ t, r, ra, weights, rules, needs, stanceRows, currentStance, onPickStance, source }: { t: TractProps; r: TractResult; ra: Rationale; weights: Weights; rules?: ReactNode; needs?: ReactNode; stanceRows?: StanceRow[]; currentStance: string | null; onPickStance?: (stance: string) => void; source?: ReactNode }) {
  return (
    <section>
      <SectionTitle right={<ValuesBadge label="Under your stance" />} sub="Rules with their thresholds printed, then the weighted fit order. A value judgment, signed by whoever adopts it.">
        Recommendation
      </SectionTitle>
      <div className="space-y-4">
        {rules}
        {needs}
        <div>
          <div className="mb-1.5 text-body font-semibold text-slate-900">Fit order under this stance</div>
          <FitOrder t={t} r={r} ra={ra} weights={weights} />
        </div>
        {stanceRows && stanceRows.length > 0 && <StanceTable rows={stanceRows} current={currentStance} onPick={onPickStance} />}
        <SourceLine>{source ?? <>Rules · docs/assumptions.md §11 and Project Details &amp; Sources › Calculations print every threshold · Fit order · lib/scoring under the stance’s published weights (config/scoring.json) · Nothing here is observed data.</>}</SourceLine>
      </div>
    </section>
  );
}
