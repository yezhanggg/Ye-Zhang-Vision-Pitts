// "Does it pencil": the project's sources and uses on the person's own numbers (lib/pencil). Arithmetic, not an
// underwriting. Example inputs are labeled as examples; PHFA's caps, the credit rates, HUD's MTSP rents and HACP's
// utility allowances carry their sources. The inputs (PencilInputs) sit in the left panel; the result (Pencil) in the
// right.
import { cx } from '../../../lib/format';
import { downloadCsv, exportFilename, toCsv } from '../../../lib/export/csv';
import type { PencilArgs, PencilResult } from '../../../lib/pencil/finance';
import { sensitivity } from '../../../lib/pencil/grid';
import { DEFAULTS, planRules, type Branch, type InputKind, type PencilInputs } from '../../../lib/pencil/inputs';
import { useSide } from '../../../lib/project/side';
import { BEDROOM_LABEL, MIX_LEVEL_LABEL, MIX_LEVELS } from '../../../lib/project/store';
import { Explainer } from '../../primitives';
import { SourceLine, Table } from '../shared';

const usd = (v: number) => `${v < 0 ? '−' : ''}$${Math.abs(Math.round(v)).toLocaleString('en-US')}`;
const FIELD = 'w-24 rounded-md border border-stone-300 bg-white px-1.5 py-0.5 text-right text-small text-slate-900 tnum focus:border-violet-500 focus:outline-none';
const TAG: Record<InputKind, string> = { sourced: 'sourced', example: 'example', yours: 'yours' };
const TAG_CLASS: Record<InputKind, string> = { sourced: 'bg-emerald-50 text-emerald-800 ring-emerald-200', example: 'bg-amber-50 text-amber-900 ring-amber-200', yours: 'bg-violet-50 text-violet-800 ring-violet-200' };

type Field = { key: keyof PencilInputs; label: string; as: 'usd' | 'pct' | 'num' | 'price'; step: number; markets?: boolean; credits?: boolean };
const FIELDS: { group: string; fields: Field[] }[] = [
  { group: 'Cost', fields: [{ key: 'hardPerSf', label: 'Hard cost a gross sq ft', as: 'usd', step: 5 }, { key: 'softShare', label: 'Soft cost, of hard', as: 'pct', step: 1 }, { key: 'landPerHome', label: 'Land a home', as: 'usd', step: 1000 }, { key: 'efficiency', label: 'Net ÷ gross floor area', as: 'pct', step: 1 }] },
  { group: 'Operating', fields: [{ key: 'vacancy', label: 'Vacancy', as: 'pct', step: 0.5 }, { key: 'opexPerHome', label: 'Operating cost a home a year', as: 'usd', step: 100 }, { key: 'reservesPerHome', label: 'Reserves a home a year', as: 'usd', step: 25 }] },
  { group: 'Loan', fields: [{ key: 'rate', label: 'Interest rate', as: 'pct', step: 0.125 }, { key: 'amortYears', label: 'Amortization, years', as: 'num', step: 5 }, { key: 'dscr', label: 'Debt service coverage', as: 'num', step: 0.05 }] },
  { group: 'Credits and other funds', fields: [{ key: 'price', label: 'Credit price', as: 'price', step: 0.01, credits: true }, { key: 'ineligibleShare', label: 'Ineligible cost share', as: 'pct', step: 1, credits: true }, { key: 'softCommitted', label: 'Soft funds committed', as: 'usd', step: 50000, credits: true }, { key: 'softFunds', label: 'Soft funds applied for or expected', as: 'usd', step: 50000, credits: true }, { key: 'targetYield', label: 'Target yield on cost', as: 'pct', step: 0.25, markets: true }] },
];
const ESSENTIAL = ['hardPerSf', 'landPerHome', 'price', 'softCommitted', 'softFunds'];
const ESSENTIAL_MARKET = ['hardPerSf', 'landPerHome', 'targetYield'];
const shown = (f: Field, v: number) => (f.as === 'pct' ? +(v * 100).toFixed(3) : v);
const shownText = (f: Field, v: number) => (f.as === 'pct' ? `${shown(f, v)}%` : f.as === 'usd' ? usd(v) : f.as === 'price' ? `$${v.toFixed(2)}` : String(v));
const stored = (f: Field, v: number) => (f.as === 'pct' ? v / 100 : v);

function Lines({ rows, total }: { rows: { label: string; value: number; formula: string }[]; total?: string }) {
  return (
    <Table
      head={['', '']}
      rows={[
        ...rows.map((r) => ({ key: r.label, title: r.formula, cells: [r.label, usd(r.value)] })),
        ...(total ? [{ key: 'total', strong: true, cells: [total, usd(rows.reduce((s, r) => s + r.value, 0))] }] : []),
      ]}
    />
  );
}

export default function Pencil({ name, result, args, kinds, branch, qctOrDda, qctNote }: { name: string; result: PencilResult; args: PencilArgs; kinds: Record<string, InputKind>; branch: Branch; qctOrDda: boolean; qctNote?: string | null }) {
  const r = result;
  const market = branch === 'market';
  const grid = sensitivity(args);
  const perHome = r.affordable > 0 ? r.gap / r.affordable : null;
  const exampleCount = Object.values(kinds).filter((k) => k === 'example').length;

  const csv = () => {
    const rows = [
      ...r.uses.map((u) => ({ part: 'Use', item: u.label, value: Math.round(u.value), how: u.formula })),
      ...r.sources.map((u) => ({ part: 'Source', item: u.label, value: Math.round(u.value), how: u.formula })),
      { part: 'Result', item: 'Gap', value: Math.round(r.gap), how: 'uses − sources' },
      ...r.income.map((u) => ({ part: 'Operating', item: u.label, value: Math.round(u.value), how: u.formula })),
      ...r.credits.map((u) => ({ part: 'Credits', item: u.label, value: Math.round(u.value), how: u.formula })),
      ...r.checks.map((c) => ({ part: 'Check', item: c.label, value: c.ok == null ? '' : c.ok ? 'yes' : 'no', how: c.formula })),
      ...MIX_LEVELS.flatMap((l) => r.counts[l].map((n, br) => (n > 0 ? { part: 'Rent', item: `${MIX_LEVEL_LABEL[l]} ${BEDROOM_LABEL[br]} (${n} homes)`, value: r.rents[l][br] ?? '', how: 'monthly' } : null)).filter(Boolean) as Record<string, unknown>[]),
    ];
    downloadCsv(exportFilename('pencil', name, 'csv'), toCsv(rows, [{ key: 'part', label: 'Part' }, { key: 'item', label: 'Item' }, { key: 'value', label: 'Value' }, { key: 'how', label: 'How' }]));
  };

  return (
    <div className="space-y-2.5" data-pencil>
      {exampleCount > 0 && (
        <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-caption leading-snug text-amber-900 ring-1 ring-amber-200">
          {exampleCount} inputs are examples, not facts about this site: replace them under Pencil inputs on the left. Arithmetic on your inputs, not an underwriting.
        </p>
      )}
      <div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-stone-200/70 ring-1 ring-stone-200/70">
          {market && r.market ? (
            <>
              <div className="bg-white px-3 py-2" title={r.market.yieldOnCost.formula}>
                <div className="text-caption text-slate-600">Yield on cost</div>
                <div className={cx('text-lead font-semibold tnum', r.market.yieldOnCost.value >= args.inputs.targetYield ? 'text-emerald-700' : 'text-rose-700')}>{(r.market.yieldOnCost.value * 100).toFixed(2)}%</div>
                <div className="text-caption text-slate-500">target {(args.inputs.targetYield * 100).toFixed(2)}%</div>
              </div>
              <div className="bg-white px-3 py-2" title={r.market.breakEven.formula}>
                <div className="text-caption text-slate-600">Average rent that breaks even</div>
                <div className="text-lead font-semibold text-slate-900 tnum">{usd(r.market.breakEven.value)}</div>
                <div className="text-caption text-slate-500">a month, across all homes</div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white px-3 py-2">
                <div className="text-caption text-slate-600">{r.gap > 0 ? 'Gap PHFA counts' : 'Headroom'}</div>
                <div className={cx('text-lead font-semibold tnum', r.gap > 0 ? 'text-rose-700' : 'text-emerald-700')}>{usd(Math.abs(r.gap))}</div>
                <div className="text-caption text-slate-500">{perHome != null && r.gap > 0 ? `${usd(perHome)} a home with an income limit` : r.gap > 0 ? 'uses − committed sources' : 'credits not needed, not money to keep'}</div>
              </div>
              <div className="bg-white px-3 py-2">
                <div className="text-caption text-slate-600">After deferring developer fee</div>
                <div className={cx('text-lead font-semibold tnum', r.gapAfterFee > 0 ? 'text-rose-700' : 'text-slate-900')}>{usd(Math.max(0, r.gapAfterFee))}</div>
                <div className="text-caption text-slate-500">{usd(r.deferredFee)} of {usd(r.fee?.value ?? 0)} fee deferred</div>
              </div>
            </>
          )}
        </div>

        {!market && r.expected > 0 && (
          <p className="mt-1.5 text-caption leading-snug text-slate-700">
            If the {usd(r.expected)} applied for or expected comes: {r.gapIfExpected > 0 ? `a ${usd(r.gapIfExpected)} gap` : `${usd(-r.gapIfExpected)} headroom`}. PHFA counts it as gap until it is committed in writing.
          </p>
        )}
        {!market && r.needAnnual != null && (
          <p className="mt-1 text-caption leading-snug text-slate-700">
            PHFA would issue about {usd(r.needAnnual)} a year ({Math.round((r.needAnnual / Math.max(1, r.maxAnnual)) * 100)}% of the most this project can get): credits are sized to need, so the headroom is not money you keep.
          </p>
        )}
        {r.izo && <p className="mt-1.5 text-caption leading-snug text-amber-900">{r.izo.formula}.</p>}
        {r.rentNotes.map((n) => (
          <p key={n} className="mt-1 text-caption text-rose-800">
            {n}
          </p>
        ))}
        {r.checks.length > 0 && (
          <ul className="mt-2 space-y-1 text-caption leading-snug text-slate-700">
            {r.checks.map((c) => (
              <li key={c.label} className="flex gap-1.5">
                <span className={cx('shrink-0 font-semibold', c.ok == null ? 'text-slate-500' : c.ok ? 'text-emerald-700' : 'text-rose-700')}>{c.ok == null ? '•' : c.ok ? '✓' : '✗'}</span>
                <span>
                  <b className="font-medium text-slate-800">{c.label}:</b> {c.formula}
                </span>
              </li>
            ))}
          </ul>
        )}
        {!market && (
          <p className="mt-1.5 text-caption text-slate-600">
            Caps and fees: PHFA {planRules(r.plan).label}
            {r.plan === 'draft' && !DEFAULTS.plans.draft.adopted ? ' (not adopted yet; the 2027-02-17 round runs under it once adopted)' : ''}. Switch it under Policies that apply here.
          </p>
        )}
        {!market && (
          <p className="mt-1.5 text-caption text-slate-600">
            Basis boost: {qctOrDda ? "130%, because the tract is a QCT on HUD's 2027 list or a Small Area DDA." : args.inputs.stateBoost ? '130% by PHFA waiver (your setting).' : "none (not a QCT on HUD's 2027 list or a DDA)."}
            {qctNote ? ` ${qctNote}` : ''}
          </p>
        )}
      </div>

      <div className="space-y-1.5 px-0.5">
        <Explainer title="Uses and sources" right={<span className="text-caption text-slate-600 tnum">{usd(r.tdc)} cost · {usd(r.homes > 0 ? r.tdc / r.homes : 0)} a home</span>}>
          <h4 className="text-caption font-semibold uppercase tracking-wide text-slate-500">Uses</h4>
          <Lines rows={r.uses} total="Total development cost" />
          <h4 className="mt-2 text-caption font-semibold uppercase tracking-wide text-slate-500">Sources</h4>
          <Lines rows={r.sources} total="Total sources" />
        </Explainer>
        <Explainer title={`Inputs (${exampleCount} examples)`}>
          <div className="space-y-2">
            {FIELDS.map((g) => (
              <div key={g.group}>
                <div className="text-caption font-semibold text-slate-600">{g.group}</div>
                <div className="mt-0.5 divide-y divide-stone-100">
                  {g.fields
                    .filter((f) => (market ? !f.credits : !f.markets))
                    .map((f) => {
                      const kind = kinds[f.key] ?? 'example';
                      return (
                        <div key={f.key} className="flex items-baseline justify-between gap-2 py-1 text-small text-slate-800">
                          <span className="min-w-0">
                            {f.label} <span className={cx('rounded px-1 py-px text-[10px] font-semibold ring-1', TAG_CLASS[kind])}>{TAG[kind]}</span>
                          </span>
                          <span className="shrink-0 tnum">{shownText(f, args.inputs[f.key] as number)}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
            <p className="text-caption text-slate-600">Change them under Pencil inputs on the left. Home sizes (net sq ft): {args.inputs.unitSf.join(', ')} for studio to 3BR+ (example). Utility allowances: {args.inputs.ua.map((x) => `$${x}`).join(', ')} ({DEFAULTS.ua.ref}, sourced).</p>
          </div>
        </Explainer>

        <Explainer title="Rents and operating income">
          <Table
            caption="Monthly rents used"
            head={['', ...BEDROOM_LABEL]}
            rows={MIX_LEVELS.filter((l) => r.counts[l].some((n) => n > 0)).map((l) => ({ key: l, cells: [MIX_LEVEL_LABEL[l], ...r.rents[l].map((x, br) => (r.counts[l][br] > 0 ? (x == null ? 'n/a' : usd(x)) : '—'))] }))}
          />
          <p className="mt-1 text-caption leading-snug text-slate-600">Tax credit homes: 30% of the HUD FY{DEFAULTS.mtsp.fy} MTSP income limit ÷ 12 at 1.5 persons a bedroom, less utilities, never above the market rent for the size. Market homes: the tract's asking rent scaled by the ZIP's Small Area FMR ratios.</p>
          <Lines rows={r.income} />
          <Lines rows={[r.loan]} />
        </Explainer>

        {!market && r.credits.length > 0 && (
          <Explainer title="Tax credits">
            <Lines rows={r.credits} />
            <p className="mt-1 text-caption leading-snug text-slate-600">Hover a row for its arithmetic. {DEFAULTS.phfa.basis_per_home.ref}; {DEFAULTS.phfa.credit_cap.ref}; {DEFAULTS.phfa.fee.ref}.</p>
          </Explainer>
        )}

        <Explainer title="Sensitivity">
          <div className="overflow-x-auto rounded-xl ring-1 ring-stone-200/80">
            <table className="w-full text-caption tnum">
              <thead>
                <tr className="bg-stone-50 text-slate-600">
                  <th className="px-1.5 py-1 text-left font-medium">{grid.rowLabel}</th>
                  {grid.cols.map((c, j) => (
                    <th key={j} className="px-1.5 py-1 text-right font-medium">
                      {grid.measure === 'gap' ? `$${c.toFixed(2)}` : `${c >= 0 ? '+' : '−'}${Math.abs(c * 100).toFixed(0)}%`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {grid.cells.map((row, i) => (
                  <tr key={i}>
                    <td className="px-1.5 py-1 text-slate-700">${Math.round(grid.rows[i])}</td>
                    {row.map((v, j) => (
                      <td key={j} className={cx('px-1.5 py-1 text-right', i === 2 && j === 2 && 'font-semibold ring-1 ring-inset ring-violet-400', grid.measure === 'gap' ? (v > 0 ? 'text-rose-700' : 'text-emerald-700') : v >= args.inputs.targetYield ? 'text-emerald-700' : 'text-rose-700')}>
                        {grid.measure === 'gap' ? usd(v) : `${(v * 100).toFixed(1)}%`}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-caption text-slate-600">{grid.measure === 'gap' ? 'The gap (red) or headroom (green) as hard cost and the credit price move.' : 'Yield on cost as hard cost and market rents move; green meets your target.'} The outlined cell is the base case.</p>
        </Explainer>

        <SourceLine className="px-1">
          Source · {Object.values(DEFAULTS.sources).map((s, i) => (
            <span key={s.url}>
              {i > 0 && '; '}
              <a className="underline hover:text-slate-800" href={s.url} target="_blank" rel="noreferrer">
                {s.title}
              </a>
            </span>
          ))}{' '}
          · read {DEFAULTS.read_on} · Not financial advice · docs/data/pencil.md, docs/assumptions.md §17 ·{' '}
          <button type="button" onClick={csv} className="font-medium text-violet-700 underline hover:text-violet-900">
            Project sheet (CSV)
          </button>
        </SourceLine>
      </div>
    </div>
  );
}

/** The pencil's inputs, for the left panel: each one tagged sourced, example or yours, with a reset for yours. */
export function PencilInputs({ args, kinds, branch, qctOrDda }: { args: PencilArgs; kinds: Record<string, InputKind>; branch: Branch; qctOrDda: boolean }) {
  const side = useSide();
  const market = branch === 'market';
  const setInput = (key: string, v: number | null) => side.project.setState((s) => ({ pencil: { ...s.pencil, [key]: v } }));
  // The four a developer sets first, then every other input, grouped as before; nothing is folded away.
  const essential = new Set<string>(market ? ESSENTIAL_MARKET : ESSENTIAL);
  const groups = [
    { group: 'Essentials', fields: FIELDS.flatMap((g) => g.fields).filter((f) => essential.has(f.key)) },
    ...FIELDS.map((g) => ({ group: `More inputs · ${g.group.toLowerCase()}`, fields: g.fields.filter((f) => !essential.has(f.key)) })),
  ].filter((g) => g.fields.length);
  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.group}>
          <div className="text-caption font-semibold text-slate-600">{g.group}</div>
          <div className="mt-1 divide-y divide-stone-100">
            {g.fields
              .filter((f) => (market ? !f.credits : !f.markets))
              .map((f) => {
                const v = args.inputs[f.key] as number;
                const kind = kinds[f.key] ?? 'example';
                return (
                  <label key={f.key} className="flex items-center justify-between gap-2 py-1 text-small text-slate-800">
                    <span className="min-w-0">
                      {f.label}{' '}
                      <span className={cx('rounded px-1 py-px text-[10px] font-semibold ring-1', TAG_CLASS[kind])}>{TAG[kind]}</span>
                      {kind === 'yours' && (
                        <button type="button" className="ml-1 text-caption text-violet-700 underline" onClick={(e) => (e.preventDefault(), setInput(f.key, null))}>
                          reset
                        </button>
                      )}
                    </span>
                    <input type="number" step={f.step} className={FIELD} value={shown(f, v)} onChange={(e) => setInput(f.key, e.target.value === '' ? null : stored(f, Number(e.target.value)))} aria-label={f.label} />
                  </label>
                );
              })}
          </div>
        </div>
      ))}
      {!market && (
        <label className="flex items-center gap-2 text-small text-slate-800">
          <input type="checkbox" className="h-4 w-4 accent-violet-600" checked={args.inputs.stateBoost} disabled={branch !== 'nine' || qctOrDda} onChange={(e) => side.project.setState((s) => ({ pencil: { ...s.pencil, stateBoost: e.target.checked } }))} />
          PHFA state basis boost by waiver (9% only; a QCT or DDA has it already)
        </label>
      )}
      {!market && (
        <label className="flex items-center gap-2 text-small text-slate-800">
          <input type="checkbox" className="h-4 w-4 accent-violet-600" checked={args.inputs.supportive} onChange={(e) => side.project.setState((s) => ({ pencil: { ...s.pencil, supportive: e.target.checked } }))} />
          Supportive housing preference (25% of homes set aside, Urban pool; its caps apply if awarded)
        </label>
      )}
    </div>
  );
}
