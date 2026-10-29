// "Capital" at the Parcel level: the simple pro forma's inputs (lib/project/capital) in the workbook's order. Uses (land,
// hard and soft cost, developer fee), the loan, tax credits and subsidy (LIHTC 9% or 4% for affordable projects, the
// historic tax credit as a yes or no, other subsidy, the deferred fee), operations, the rents unit size by unit size,
// mixed use's ground-floor commercial and, for market rate, the sale. The credits work out from the cost on their own.
// Origination and the growth rates fold under "More". Each value is suggested for this kind of project (or sourced
// from PHFA's underwriting, HUD's income limits or the area's rents) until the person changes it. The land follows the
// lot the results read (useReview capitalLot), so both sides show the same run. Online only: loaded on demand.
import { cx } from '../../../lib/format';
import { CAPITAL_GROUPS, CAPITAL_MORE, HTC_RATE, rentKey, type CapitalField, type CapitalKind } from '../../../lib/project/capital';
import type { DevType } from '../../../lib/project/devType';
import { setFinancingOn, useSide } from '../../../lib/project/side';
import type { Scope } from '../../../lib/review/review';
import { Explainer } from '../../primitives';
import { Segmented } from '../PlanInputs';
import type { ProjectModel } from '../project/useProjectModel';
import { SIZE_WORD } from './CapitalCard';
import { setCapital, useCapital } from './useCapital';
import { capitalLot } from './useReview';

const FIELD = 'w-24 rounded-md border border-stone-300 bg-white px-1.5 py-0.5 text-right text-small text-slate-900 tnum focus:border-violet-500 focus:outline-none';
const TAG_CLASS: Record<CapitalKind, string> = { sourced: 'bg-emerald-50 text-emerald-800 ring-emerald-200', suggested: 'bg-amber-50 text-amber-900 ring-amber-200', yours: 'bg-violet-50 text-violet-800 ring-violet-200' };

type As = CapitalField['as'];
const shown = (as: As, v: number) => (as === 'pct' ? +(v * 100).toFixed(3) : as === 'usd' ? Math.round(v) : v);
const stored = (as: As, v: number) => (as === 'pct' ? v / 100 : v);

function Row({ label, as, step, value, kind, note, onChange }: { label: string; as: As; step: number; value: number; kind: CapitalKind; note: string; onChange: (v: number | null) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 py-1 text-small text-slate-800">
      <span className="min-w-0">
        {label}{' '}
        <span className={cx('rounded px-1 py-px text-[10px] font-semibold ring-1', TAG_CLASS[kind])} title={note}>
          {kind}
        </span>
        {kind === 'yours' && (
          <button type="button" className="ml-1 text-caption text-violet-700 underline" onClick={(e) => (e.preventDefault(), onChange(null))}>
            reset
          </button>
        )}
      </span>
      <input type="number" step={step} className={FIELD} value={Number.isFinite(value) ? shown(as, value) : ''} onChange={(e) => onChange(e.target.value === '' ? null : stored(as, Number(e.target.value)))} aria-label={label} />
    </label>
  );
}

const SUB = 'text-caption font-semibold uppercase tracking-wide text-slate-500';

/** `scope`: the level the results read the project at (the land follows that lot). */
export default function CapitalInputs({ m, devType, scope }: { m: ProjectModel; devType: DevType; scope: Scope }) {
  const side = useSide();
  const lot = side.project((s) => s.sites[m.base.geoid]?.lot);
  const run = useCapital(m, devType, undefined, capitalLot(scope, m, devType, lot));
  const credits = run.credits;
  const historic = run.inputs.htcRate > 0;
  const commercial = (run.inputs.commercialSf ?? 0) > 0;
  const valueOf = (f: CapitalField) => (f.key === 'price' ? run.price : (run.inputs[f.key as keyof typeof run.inputs] as number));
  const row = (f: CapitalField) => <Row key={f.key} label={f.label} as={f.as} step={f.step} value={valueOf(f)} kind={run.kinds[f.key]} note={run.notes[f.key]} onChange={(v) => setCapital(side, f.key, v)} />;
  const showing = (f: CapitalField) => (!f.credits || credits) && (!f.historic || historic) && (!f.sale || !credits);
  return (
    <div className="space-y-3" data-capital>
      {CAPITAL_GROUPS.filter((g) => (!g.commercial || commercial) && g.fields.some(showing)).map((g) => (
        <div key={g.title}>
          <div className={SUB}>{g.title}</div>
          {g.title === 'Tax credits and subsidy' && (
            <div className="mt-1 space-y-2">
              {credits && <Segmented label="Low-income housing tax credit (LIHTC)" options={['nine', 'four'] as const} value={m.branch === 'four' ? 'four' : 'nine'} onChange={(b) => setFinancingOn(side, b)} text={(b) => (b === 'nine' ? '9% credits' : '4% credits + bonds')} cols={2} />}
              <Segmented label="Historic tax credit" options={['no', 'yes'] as const} value={historic ? 'yes' : 'no'} onChange={(v) => setCapital(side, 'htcRate', v === 'yes' ? HTC_RATE : null)} text={(v) => (v === 'yes' ? 'Certified historic rehab' : 'No')} cols={2} info={run.notes.htcRate} />
              <p className="text-caption leading-snug text-slate-500">
                The credits work out from the cost: {credits ? 'LIHTC = eligible cost × units at 60% AMI or below × credit rate × 10 years × price; ' : ''}historic = (total − land) × 20% × price.
              </p>
            </div>
          )}
          <div className="divide-y divide-stone-100">{g.fields.filter(showing).map(row)}</div>
          {g.title === 'Operations' && run.rents.length > 0 && (
            <div className="mt-2">
              <div className={SUB}>Rents a month</div>
              <div className="divide-y divide-stone-100">
                {run.rents.map((x) => (
                  <Row key={rentKey(x)} label={`${SIZE_WORD[x.br]}, ${x.level === 'mkt' ? 'market' : `${x.level}% AMI`} · ${x.units} unit${x.units === 1 ? '' : 's'}`} as="usd" step={10} value={x.rent} kind={x.kind} note={`${x.source}: $${Math.round(x.sourced).toLocaleString('en-US')}`} onChange={(v) => setCapital(side, rentKey(x), v)} />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
      <Explainer title="More">
        <div className="divide-y divide-stone-100">{CAPITAL_MORE.map(row)}</div>
      </Explainer>
    </div>
  );
}
