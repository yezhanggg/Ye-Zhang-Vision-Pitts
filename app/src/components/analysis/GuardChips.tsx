// The three checks under the answer: factors scored, low-income renter count, and the lead over the runner-up.
// Text and tone come from lib/analysis/rationale.guardChips; nothing here computes a number.
import type { GuardChip } from '../../lib/analysis/rationale';
import { cx } from '../../lib/format';

const TONE: Record<GuardChip['tone'], string> = {
  neutral: 'bg-white/90 text-slate-700 ring-stone-200',
  warn: 'bg-amber-50 text-amber-900 ring-amber-200',
  alert: 'bg-rose-50 text-rose-900 ring-rose-200',
  tie: 'bg-slate-100 text-slate-900 ring-slate-300',
};

export default function GuardChips({ chips, className }: { chips: GuardChip[]; className?: string }) {
  if (!chips.length) return null;
  // A data gap is worth a line of its own; the need sentence is printed by the answer card.
  const notes = chips.filter((c) => c.tone === 'warn' && c.detail).map((c) => c.detail as string);
  return (
    <div className={className}>
      <ul className="flex flex-wrap gap-1.5" aria-label="Checks on this answer">
        {chips.map((c) => (
          <li key={c.id} title={c.detail} className={cx('rounded-full px-2 py-0.5 text-caption font-semibold ring-1 tnum', TONE[c.tone])}>
            {c.text}
          </li>
        ))}
      </ul>
      {notes.length > 0 && <p className="mt-1.5 text-caption text-amber-900/90">{notes.join(' ')}</p>}
    </div>
  );
}
