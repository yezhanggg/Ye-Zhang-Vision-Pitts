// The one control bar of Equity & policy, in the numbered 40 px style of Compare places: ① measure ② income level
// (shared with the Place tab) ③ the four policy levers as switch chips (homes per tract inline when the subsidy is on)
// with the "What these do" pop-up beside them (the policy simulator) ④ export.
import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cx } from '../../lib/format';
import { MEASURES, type AmiPct, type MeasureId } from '../../lib/equity/measures';
import { LEVER_IDS, LEVER_NAME, type LeverId } from '../../lib/equity/export';
import { ToolSeg } from '../compare/ToolbarParts';

/** Shorter measure labels under 1600 px, so the bar stays on one line at 1440. */
const NARROW: Partial<Record<MeasureId, string>> = { burdened: 'Burdened', transit: 'Transit', services: 'Services' };

/** ToolSeg's look (40 px, white active pill) with tighter padding and a narrow label. */
function MeasureSeg({ value, onChange }: { value: MeasureId; onChange: (m: MeasureId) => void }) {
  const [ref, box] = useSlide(value);
  return (
    <div ref={ref} role="radiogroup" aria-label="Measure to show" className="scroll-quiet relative flex h-8 w-full items-stretch gap-0.5 overflow-x-auto rounded-lg bg-stone-100 p-1 ring-1 ring-stone-200/70 [&>button]:shrink-0">
      <SlideBg box={box} className="rounded-md bg-white shadow-sm ring-1 ring-violet-300" />
      {MEASURES.map((m) => {
        const on = m.id === value;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={on}
            data-slide-on={on}
            title={m.title}
            onClick={() => onChange(m.id)}
            className={cx('relative flex-1 whitespace-nowrap rounded-md px-1 text-caption font-semibold transition-colors min-[2100px]:px-2.5 min-[2100px]:text-small', on ? 'text-violet-800' : 'text-slate-600 hover:bg-white/60 hover:text-slate-900')}
          >
            {m.id === 'jobs' ? (
              <>
                <span className="min-[1800px]:hidden">Jobs</span>
                <span className="max-[1799px]:hidden">{m.short}</span>
              </>
            ) : (
              (NARROW[m.id] ?? m.short)
            )}
          </button>
        );
      })}
    </div>
  );
}
import { InfoTip, SlideBg, useSlide } from '../primitives';

/** Lever names that fit one toolbar row below 1800 px (the full name is the button's label and tooltip). */
const LEVER_SHORT: Record<LeverId, string> = { adu: 'ADU by right', bonus: 'Density bonus', voucher: 'Rent subsidy', transit: 'Transit 1 mi' };
/** Below 1800 px, one word each (the full name stays the button's tooltip and accessible name). */
const LEVER_TINY: Record<LeverId, string> = { adu: 'ADU', bonus: 'Density', voucher: 'Subsidy', transit: 'Transit' };

function LeverChips({ on, onToggle, homesText, onHomes }: { on: Record<LeverId, boolean>; onToggle: (id: LeverId) => void; homesText: string; onHomes: (v: string) => void }) {
  return (
    <div role="group" aria-label="Policy levers" data-tour="equity-levers" className="scroll-quiet flex h-8 w-full items-stretch gap-0.5 overflow-x-auto rounded-lg bg-stone-100 p-1 ring-1 ring-stone-200/70 [&>div]:shrink-0">
      {LEVER_IDS.map((id) => {
        const v = on[id];
        return (
          <div key={id} className={cx('flex flex-1 items-center justify-center rounded-md transition-colors', v ? 'bg-white shadow-sm ring-1 ring-violet-300' : '')}>
            <button
              type="button"
              role="switch"
              aria-checked={v}
              aria-label={LEVER_NAME[id]}
              onClick={() => onToggle(id)}
              title={LEVER_NAME[id]}
              className={cx('flex h-full flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-md px-1 text-caption font-semibold transition-colors min-[2100px]:gap-1.5 min-[2100px]:px-2 min-[2100px]:text-small', v ? 'text-violet-800' : 'text-slate-600 hover:bg-white/60 hover:text-slate-900')}
            >
              <span aria-hidden className={cx('h-2 w-2 rounded-full min-[1800px]:hidden', v ? 'bg-violet-700' : 'ring-[1.5px] ring-inset ring-slate-400')} />
              <span className={cx('grid h-3.5 w-3.5 place-items-center rounded-[4px] ring-1 max-[1799px]:hidden', v ? 'bg-violet-700 ring-violet-700' : 'bg-white ring-stone-300')}>{v && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />}</span>
              <span className="min-[1800px]:hidden">{LEVER_TINY[id]}</span>
              <span className="max-[1799px]:hidden">{LEVER_SHORT[id]}</span>
            </button>
            {id === 'voucher' && v && (
              <label title="Homes per tract" className="mr-0.5 flex items-center gap-1 text-caption text-slate-600">
                <span className="max-[1799px]:hidden">×</span>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={homesText}
                  onChange={(e) => onHomes(e.target.value)}
                  aria-label="Homes per tract"
                  className="h-5 w-10 rounded bg-stone-50 px-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none text-right text-caption font-semibold text-slate-900 ring-1 ring-stone-300 tnum focus:outline-none focus:ring-violet-400"
                />
                <span className="max-[1799px]:hidden">homes</span>
              </label>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** A step's number and name on the same line as its controls, so a first-time reader knows what each group sets. */
function Step({ n, word, children }: { n: number; word: string; children?: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-slate-600">
      <span className="grid h-4 w-4 place-items-center rounded-full bg-slate-900 text-[10px] font-bold leading-none text-white">{n}</span>
      <span>{word}</span>
      {children}
    </div>
  );
}

const Divider = () => <span aria-hidden className="h-6 w-px shrink-0 bg-stone-200 max-[1599px]:hidden" />;

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
  chatSlot,
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
  /** Show or hide the chat column, beside Export. */
  chatSlot?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-nowrap items-center gap-x-1.5 gap-y-1.5 min-[1600px]:gap-x-2 overflow-x-auto rounded-xl max-[1399px]:flex-wrap max-[1399px]:overflow-visible bg-white px-3 py-1.5 shadow-sm ring-1 ring-stone-200/80 min-[1800px]:gap-x-4" aria-label="Equity and policy settings">
      <div className="flex min-w-fit flex-[6_1_0%] items-center gap-1 min-[1600px]:gap-1.5">
        <Step n={1} word="Measure">
          <InfoTip label="About the equity measures" side="bottom" width={320}>
            {about}
          </InfoTip>
        </Step>
        <div className="min-w-fit flex-1">
          <MeasureSeg value={measure} onChange={onMeasure} />
        </div>
      </div>
      <Divider />
      <div className="flex shrink-0 items-center gap-1 min-[1600px]:gap-1.5">
        <Step n={2} word="Income">
          <InfoTip label="About the income level" side="bottom" width={280}>
            <span className="block">Shared with the Place tab. The rent gap and the subsidy use the 2-bedroom rent a 3-person household at this level can pay.</span>
            {fitsFormula && <span className="mt-1 block text-white/80">At {level === 100 ? 'market rate (the area median income)' : `${level}% AMI`}: {fitsFormula} a month.</span>}
            {marketAs80 && <span className="mt-1 block text-amber-200">The Place tab is on market rate (no HUD ceiling), so this tab reads it as 80% AMI.</span>}
          </InfoTip>
        </Step>
        <ToolSeg
          compact
          label="Income level"
          value={String(level)}
          onChange={(v) => onLevel(Number(v) as AmiPct)}
          options={([30, 50, 80, 100] as AmiPct[]).map((l) => (l === 100 ? { value: '100', label: 'Market', title: 'Market rate: a household at the area median income (shared with the Place tab)' } : { value: String(l), label: `≤${l}%`, title: `≤${l}% of area median income (shared with the Place tab)` }))}
        />
      </div>
      <Divider />
      <div className="flex min-w-fit flex-[7_1_0%] items-center gap-1 min-[1600px]:gap-1.5">
        <Step n={3} word="Policies">{policySlot}</Step>
        <div className="min-w-fit flex-1">
          <LeverChips on={on} onToggle={onToggle} homesText={homesText} onHomes={onHomes} />
        </div>
      </div>
      <Divider />
      <div className="flex shrink-0 items-center gap-1 min-[1600px]:gap-1.5">
        <Step n={4} word="Export" />
        {exportSlot}
        {chatSlot}
      </div>
    </div>
  );
}
