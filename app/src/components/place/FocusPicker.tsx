// "Focusing issue" on Analysis > Match: three choices, one short line each. Picking one applies that stance's
// published preset (store.applyPreset), which only orders types inside the suggested set; the rules do the rest.
import { cx } from '../../lib/format';
import type { Stance } from '../../lib/place/types';

export const FOCUS: { id: Stance; label: string; line: string }[] = [
  { id: 'anti_displacement', label: 'Anti-displacement', line: 'Keep current renters housed' },
  { id: 'market_led', label: 'Market-led', line: 'Build what the market supports' },
  { id: 'transit_first', label: 'Transit-first', line: 'Homes near frequent transit' },
];

export default function FocusPicker({ value, onChange }: { value: Stance; onChange: (s: Stance) => void }) {
  return (
    <div className="grid gap-1.5" role="radiogroup" aria-label="Focusing issue">
      {FOCUS.map((f) => {
        const on = value === f.id;
        return (
          <button key={f.id} type="button" role="radio" aria-checked={on} onClick={() => onChange(f.id)} className={cx('flex items-center gap-2.5 rounded-xl px-3 py-2 text-left ring-1 transition', on ? 'bg-violet-50 ring-2 ring-violet-500' : 'bg-white ring-stone-200 hover:ring-stone-300')}>
            <span className={cx('h-3.5 w-3.5 shrink-0 rounded-full border-2', on ? 'border-violet-600 bg-[radial-gradient(circle,#7c3aed_45%,transparent_50%)]' : 'border-stone-300')} aria-hidden />
            <span className="min-w-0">
              <span className="block text-small font-semibold leading-tight text-slate-900">{f.label}</span>
              <span className="block text-caption leading-snug text-slate-600">{f.line}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
