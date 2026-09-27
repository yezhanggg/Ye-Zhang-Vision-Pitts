// The one control bar of Equity & policy, in the numbered 40 px style of Compare places: ① measure ② income level
// (shared with the Place tab) ③ the four policy levers as switch chips (homes per tract inline when the subsidy is on)
// with the "What these do" pop-up beside them (the policy simulator) ④ export.
import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cx } from '../../lib/format';
import { MEASURES, type AmiPct, type MeasureId } from '../../lib/equity/measures';
import { LEVER_IDS, LEVER_NAME, type LeverId } from '../../lib/equity/export';
import { StepLabel, ToolSeg } from '../compare/ToolbarParts';

/** Shorter measure labels under 1600 px, so the bar stays on one line at 1440. */
const NARROW: Partial<Record<MeasureId, string>> = { burdened: 'Burdened', transit: 'Transit', services: 'Services' };

/** ToolSeg's look (40 px, white active pill) with tighter padding and a narrow label. */
function MeasureSeg({ value, onChange }: { value: MeasureId; onChange: (m: MeasureId) => void }) {
  return (
    <div role="radiogroup" aria-label="Measure to show" className="inline-flex h-10 items-stretch gap-0.5 rounded-lg bg-stone-100 p-1 ring-1 ring-stone-200/70">
      {MEASURES.map((m) => {
        const on = m.id === value;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={on}
            title={m.title}
            onClick={() => onChange(m.id)}
            className={cx('whitespace-nowrap rounded-md px-2.5 text-small font-semibold transition-colors', on ? 'bg-white text-violet-800 shadow-sm ring-1 ring-violet-300' : 'text-slate-600 hover:bg-white/60 hover:text-slate-900')}
          >
            {NARROW[m.id] ? (
              <>
                <span className="min-[1600px]:hidden">{NARROW[m.id]}</span>
                <span className="max-[1599px]:hidden">{m.short}</span>
              </>
            ) : (
              m.short
            )}
          </button>
        );
      })}
    </div>
  );
}
import { InfoTip } from '../primitives';

function LeverChips({ on, onToggle, homesText, onHomes }: { on: Record<LeverId, boolean>; onToggle: (id: LeverId) => void; homesText: string; onHomes: (v: string) => void }) {
  return (
    <div role="group" aria-label="Policy levers" data-tour="equity-levers" className="inline-flex h-10 items-stretch gap-0.5 rounded-lg bg-stone-100 p-1 ring-1 ring-stone-200/70">
      {LEVER_IDS.map((id) => {
        const v = on[id];
        return (
          <div key={id} className={cx('flex items-center rounded-md transition-colors', v ? 'bg-white shadow-sm ring-1 ring-violet-300' : '')}>
            <button
              type="button"
              role="switch"
              aria-checked={v}
              aria-label={LEVER_NAME[id]}
              onClick={() => onToggle(id)}
              className={cx('flex h-full items-center gap-1 whitespace-nowrap rounded-md px-2 text-small min-[1600px]:gap-1.5 font-semibold transition-colors', v ? 'text-violet-800' : 'text-slate-600 hover:bg-white/60 hover:text-slate-900')}
            >
              <span aria-hidden className={cx('h-2 w-2 rounded-full min-[1600px]:hidden', v ? 'bg-violet-700' : 'ring-[1.5px] ring-inset ring-slate-400')} />
              <span className={cx('grid h-3.5 w-3.5 place-items-center rounded-[4px] ring-1 max-[1599px]:hidden', v ? 'bg-violet-700 ring-violet-700' : 'bg-white ring-stone-300')}>{v && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />}</span>
              {LEVER_NAME[id]}
            </button>
            {id === 'voucher' && v && (
              <label title="Homes per tract" className="mr-1 flex items-center gap-1 text-caption text-slate-600">
                <span className="max-[1599px]:hidden">×</span>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={homesText}
                  onChange={(e) => onHomes(e.target.value)}
                  aria-label="Homes per tract"
                  className="h-6 w-12 rounded bg-stone-50 px-1 text-right text-caption font-semibold text-slate-900 ring-1 ring-stone-300 tnum focus:outline-none focus:ring-violet-400"
                />
                <span className="max-[1599px]:hidden">homes</span>
              </label>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function EquityToolbar({
  measure,
  onMeasure,
  level,
  onLevel,
  marketAs80,
  fitsFormula,
  on,
  onToggle,
  homesText,
  onHomes,
  about,
  policySlot,
  exportSlot,
}: {
  measure: MeasureId;
  onMeasure: (m: MeasureId) => void;
  level: AmiPct;
  onLevel: (l: AmiPct) => void;
  marketAs80: boolean;
  fitsFormula: string | null;
  on: Record<LeverId, boolean>;
  onToggle: (id: LeverId) => void;
  homesText: string;
  onHomes: (v: string) => void;
  about: ReactNode;
  /** The policy simulator pop-up button, beside the lever chips. */
  policySlot?: ReactNode;
  exportSlot: ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-end gap-x-3 gap-y-2 min-[1600px]:gap-x-5 rounded-xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-stone-200/80" aria-label="Equity and policy settings">
      <div>
        <StepLabel n={1}>
          <span className="flex items-center gap-1">
            Measure
            <InfoTip label="About the equity measures" side="bottom" width={320}>
              {about}
            </InfoTip>
          </span>
        </StepLabel>
        <MeasureSeg value={measure} onChange={onMeasure} />
      </div>
      <div>
        <StepLabel n={2}>
          <span className="flex items-center gap-1">
            Income
            <InfoTip label="About the income level" side="bottom" width={280}>
              <span className="block">Shared with the Place tab. The rent gap and the subsidy use the 2-bedroom rent a 3-person household at this level can pay.</span>
              {fitsFormula && <span className="mt-1 block text-white/80">At {level}% AMI: {fitsFormula} a month.</span>}
              {marketAs80 && <span className="mt-1 block text-amber-200">The Place tab is on market rate (no HUD ceiling), so this tab reads it as 80% AMI.</span>}
            </InfoTip>
            {marketAs80 && <span className="rounded bg-amber-100 px-1 text-[10px] font-bold normal-case tracking-normal text-amber-900">market → 80%</span>}
          </span>
        </StepLabel>
        <ToolSeg
          label="Income level"
          value={String(level)}
          onChange={(v) => onLevel(Number(v) as AmiPct)}
          options={([30, 50, 80] as AmiPct[]).map((l) => ({ value: String(l), label: `≤${l}%`, title: `≤${l}% of area median income (shared with the Place tab)` }))}
        />
      </div>
      <div>
        <StepLabel n={3}>
          <span className="flex items-center gap-2">
            <span>
              Policies <span className="font-medium normal-case tracking-normal text-slate-500">· Policy simulator</span>
            </span>
            {policySlot}
          </span>
        </StepLabel>
        <LeverChips on={on} onToggle={onToggle} homesText={homesText} onHomes={onHomes} />
      </div>
      <div className="ml-auto">
        <StepLabel n={4}>Export</StepLabel>
        {exportSlot}
      </div>
    </div>
  );
}
