// "Who you're planning for" on Analysis > Match: values, not weights. A household (size and age group), an income
// level, how many homes (optional), the flood risk you accept and a distance to frequent transit. Short labels only;
// how each choice is used lives in Details > Data & method ("Planning inputs", PlanningInputsSection). Held in
// lib/place/planStore (session only).
import { useId } from 'react';
import { cx } from '../../lib/format';
import { SlideBg, useSlide } from '../primitives';
import { useApp } from '../../lib/store';
import { hud } from '../../lib/place/data';
import {
  AGE_GROUPS, AGE_LABEL, FLOOD_LABEL, FLOOD_RISKS, HOUSEHOLD_SIZES, LEVEL_LABEL, MILES_LABEL, PLAN_LEVELS, SIZE_LABEL,
  TRANSIT_MILES, ceilingForSize, personsWord, type HouseholdSize, type PlanLevel,
} from '../../lib/place/plan';
import { usePlan } from '../../lib/place/planStore';

/** One short caption: "≤50% AMI: up to $49,700 (3 people) · rent $1,242". Largest group prices at 3 people. */
function incomeCaption(level: PlanLevel, size: HouseholdSize): string | null {
  if (level === 'market') return 'Above 80% AMI · rent is what the market asks';
  if (!hud) return null;
  const n = size === 'auto' ? 3 : size;
  const c = ceilingForSize(hud, level, n);
  if (!c) return null;
  const f = (x: number) => `$${Math.round(x).toLocaleString('en-US')}`;
  return `${LEVEL_LABEL[level]}: up to ${f(c.limit)} (${personsWord(n)}) · rent ${f(c.rent)}`;
}

/** Opens Details > Data & method at the planning-inputs section. */
export function openPlanningDetails() {
  useApp.getState().set({ sourcesOpen: true, detailsTab: 'sources' });
  window.setTimeout(() => document.getElementById('planning-inputs')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 350);
}

function Segmented<T extends string | number>({ label, options, value, onChange, text, cols, template }: { label: string; options: T[]; value: T; onChange: (v: T) => void; text: (v: T) => string; cols?: number; template?: string }) {
  const [slideRef, box] = useSlide(value);
  return (
    <div>
      <div className="mb-1 text-caption font-medium text-slate-600">{label}</div>
      <div ref={slideRef} className="relative grid gap-0.5 rounded-lg bg-stone-100 p-0.5" style={{ gridTemplateColumns: template ?? `repeat(${cols ?? options.length}, minmax(0, 1fr))` }} role="radiogroup" aria-label={label}>
        <SlideBg box={box} className="rounded-md bg-white shadow-sm ring-1 ring-stone-200" />
        {options.map((o) => {
          const on = o === value;
          return (
            <button key={String(o)} type="button" role="radio" aria-checked={on} data-slide-on={on} onClick={() => onChange(o)} className={cx('relative rounded-md px-1.5 py-1 text-small font-medium transition-colors', on ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900')}>
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
  const { level, size, age, homes, flood, transitMi, setPlan } = usePlan();
  const caption = incomeCaption(level, size);
  return (
    <div className="space-y-3">
      <Segmented label="Household size" options={HOUSEHOLD_SIZES} value={size} onChange={(v) => setPlan({ size: v })} text={(v) => SIZE_LABEL[v]} template="2.6fr repeat(5, minmax(0, 1fr))" />
      <Segmented label="Age group" options={AGE_GROUPS} value={age} onChange={(v) => setPlan({ age: v })} text={(v) => AGE_LABEL[v]} />
      <div>
        <Segmented label="Income level" options={PLAN_LEVELS} value={level} onChange={(v) => setPlan({ level: v })} text={(v) => LEVEL_LABEL[v]} cols={2} />
        {caption && <p className="mt-1 text-caption leading-snug text-slate-600 tnum">{caption}</p>}
      </div>
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
      <Segmented label="Flood risk you accept" options={FLOOD_RISKS} value={flood} onChange={(v) => setPlan({ flood: v })} text={(v) => FLOOD_LABEL[v]} template="1.5fr 1.1fr 0.6fr" />
      <Segmented label="Frequent transit within" options={TRANSIT_MILES} value={transitMi} onChange={(v) => setPlan({ transitMi: v })} text={(v) => MILES_LABEL[v]} />
      <button type="button" onClick={openPlanningDetails} className={cx('text-caption font-semibold text-violet-700 hover:text-violet-900 hover:underline')}>
        How each choice is used →
      </button>
    </div>
  );
}
