// "Who you're planning for" on Analysis > Match: values, not weights. An income level (with its HUD dollars), a
// household, how many homes (optional) and a distance to frequent transit. Held in lib/place/planStore (session only).
import { useId } from 'react';
import { cx } from '../../lib/format';
import { hud } from '../../lib/place/data';
import { HOUSEHOLD_LABEL, HOUSEHOLDS, INCOME_LEVELS, LEVEL_LABEL, MILES_LABEL, TRANSIT_MILES, levelIncomeLine } from '../../lib/place/plan';
import { usePlan } from '../../lib/place/planStore';

function Segmented<T extends string | number>({ label, options, value, onChange, text }: { label: string; options: T[]; value: T; onChange: (v: T) => void; text: (v: T) => string }) {
  return (
    <div>
      <div className="mb-1 text-caption font-medium text-slate-600">{label}</div>
      <div className="grid rounded-lg bg-stone-100 p-0.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }} role="radiogroup" aria-label={label}>
        {options.map((o) => {
          const on = o === value;
          return (
            <button key={String(o)} type="button" role="radio" aria-checked={on} onClick={() => onChange(o)} className={cx('rounded-md px-1.5 py-1 text-small font-medium transition', on ? 'bg-white text-slate-900 shadow-sm ring-1 ring-stone-200' : 'text-slate-600 hover:text-slate-900')}>
              {text(o)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function PlanInputs() {
  const id = useId();
  const { level, household, homes, transitMi, setPlan } = usePlan();
  return (
    <div className="space-y-3">
      <div>
        <Segmented label="Income level" options={INCOME_LEVELS} value={level} onChange={(v) => setPlan({ level: v })} text={(v) => LEVEL_LABEL[v]} />
        <p className="mt-1 text-caption leading-snug text-slate-700 tnum">{levelIncomeLine(hud, level)}</p>
      </div>
      <Segmented label="Household" options={HOUSEHOLDS} value={household} onChange={(v) => setPlan({ household: v })} text={(v) => HOUSEHOLD_LABEL[v]} />
      <label className="block" htmlFor={`${id}-homes`}>
        <span className="mb-1 block text-caption font-medium text-slate-600">Homes needed (optional)</span>
        <input
          id={`${id}-homes`}
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          placeholder="e.g. 40"
          value={homes ?? ''}
          onChange={(e) => {
            const n = e.target.value.trim() === '' ? null : Number(e.target.value);
            setPlan({ homes: n != null && Number.isFinite(n) && n > 0 ? Math.round(n) : null });
          }}
          className="w-full rounded-lg bg-white px-2.5 py-1.5 text-small text-slate-900 ring-1 ring-stone-300 tnum focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </label>
      <Segmented label="Frequent transit within" options={TRANSIT_MILES} value={transitMi} onChange={(v) => setPlan({ transitMi: v })} text={(v) => MILES_LABEL[v]} />
    </div>
  );
}
