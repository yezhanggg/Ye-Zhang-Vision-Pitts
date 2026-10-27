// Three ways to pay for the project (lib/project/paths): 9% credits, 4% credits with bonds and market rate, each at the
// person's size and swept for the sizes at which it closes. The order follows a printed rule; the person picks under
// Financing in the left panel.
// Loaded on demand with the project card, never in the offline single file.
import { useMemo } from 'react';
import { cx } from '../../../lib/format';
import type { Branch } from '../../../lib/pencil/inputs';
import type { ProjectBase } from '../../../lib/project/model';
import { comparePaths, LEAD_RULE, PATH_LABEL } from '../../../lib/project/paths';
import { closesWords, LIMIT_WORD, TIER_WORD } from '../../../lib/project/size';
import { SourceLine } from '../shared';
import { AWARD_NOTE, pointsWords, sizeWords } from './summary';

const TONE = { closes: 'text-emerald-700', close: 'text-slate-900', gap: 'text-rose-700' } as const;

export default function Paths({ base, homes, stories, branch }: { base: ProjectBase; homes: number; stories: number | null; branch: Branch }) {
  const rows = useMemo(() => comparePaths(base, homes, stories), [base, homes, stories]);
  return (
    <div data-paths>
      <div className="text-small font-semibold text-slate-900">Three ways to pay for it</div>
      <div className="mt-2 divide-y divide-stone-200/70 overflow-hidden rounded-xl bg-white ring-1 ring-stone-200/80">
        {rows.map((r) => {
          const on = r.branch === branch;
          return (
            <div key={r.branch} className={cx('px-3 py-2', on && 'bg-violet-50/60')}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-small font-semibold text-slate-900">{PATH_LABEL[r.branch]}</span>
                <span className={cx('shrink-0 text-small font-semibold tnum', TONE[r.yours.tier])}>{TIER_WORD[r.yours.tier]}</span>
              </div>
              <div className="mt-0.5 text-caption leading-snug text-slate-600">
                At {homes} homes: {sizeWords(r.yours)}. Swept {r.sweep.range[0]}–{r.sweep.range[1]}: {closesWords(r.sweep)}
                {r.sweep.rightSize != null && `; largest ${r.sweep.rightSize}, held by ${LIMIT_WORD[r.sweep.limit]}`}.
                {r.sweep.cut && ` Above ${r.sweep.cut === 'zoning' ? `the ${r.sweep.bounds.zoning} homes zoning allows by right` : `market depth (${r.sweep.bounds.depth} homes)`} at every size tested.`}
              </div>
              <div className="mt-0.5 flex items-baseline justify-between gap-2">
                <span className="text-caption text-slate-600 tnum">{r.points ? `PHFA: ${pointsWords(r.points)}` : 'No tax credit score'}</span>
                {on && <span className="text-caption text-slate-500">In use</span>}
              </div>
            </div>
          );
        })}
      </div>
      <SourceLine className="mt-1.5">
        {LEAD_RULE} You decide: the order follows that rule, not a recommendation; pick under Financing on the left. Closes = the gap PHFA counts (soft funds not yet committed are gap) is under half the developer fee, and cash flow stays at or above zero in years 1–10; over PHFA's limit = covered only by deferring more than half the fee. {AWARD_NOTE}
      </SourceLine>
    </div>
  );
}
