// The Parcel level's capital answer, from the simple pro forma (lib/pencil/simple): where the money comes from (one
// stacked bar), the rents it collects, what it pays for (bars), the years of net operating income against the loan
// payment, and the end: for market rate the sale in year 7 with what the developer puts in and gets back; for a tax
// credit deal the gap and the developer fee, with no sale (the homes stay income-limited for 15 years). The full
// lines, with their formulas, fold underneath. Online only: loaded on demand.
import { rentKey, type CapitalRun } from '../../../lib/project/capital';
import { Explainer } from '../../primitives';
import { usd, usdShort } from '../project/summary';

const CARD = 'rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200';
const SUB = 'text-caption font-semibold uppercase tracking-wide text-slate-500';
// Categorical, in stack order; validated for every combination the stack can show with a loan (dataviz validator,
// light surface). The gap a tax credit deal still has to fill takes the developer equity's slot and color.
const SOURCE_ORDER = ['Developer equity', 'Gap to fill', 'Loan', 'LIHTC equity', 'Historic tax credit equity', 'Other subsidy', 'Deferred developer fee'];
const SOURCE_COLOR: Record<string, string> = { 'Developer equity': '#eb6834', 'Gap to fill': '#eb6834', Loan: '#2a78d6', 'LIHTC equity': '#1baf7a', 'Historic tax credit equity': '#008300', 'Other subsidy': '#eda100', 'Deferred developer fee': '#e87ba4' };
const USE_COLOR = '#64748b';
const NOI_COLOR = '#7c3aed';
const INK = '#334155';
const MUTED = '#64748b';
const pct = (v: number, d = 1) => `${+(v * 100).toFixed(d)}%`;
export const SIZE_WORD = ['Studio', '1-bed', '2-bed', '3-bed+'];
const YEARS_WORD: Record<number, string> = { 7: 'Seven', 15: 'Fifteen' };

type TileLook = 'good' | 'warn' | 'bad' | 'plain';

/** The Capital takeaway. Tax credit deals: the gap to fill and the cash flow (no sale, no multiple). Market rate: the
 *  multiple of equity. A year of negative cash flow or coverage under 1 is never green. */
export function capitalTile(run: CapitalRun, need: number): { value: string; sub: string; look: TileLook } {
  const r = run.result;
  const y1 = r.years[0];
  const dscr = y1?.dscr ?? 0;
  const neg = r.firstNegative;
  const dscrWords = Number.isFinite(dscr) ? `DSCR ${dscr.toFixed(2)} in year 1` : 'no loan';
  const negWords = neg != null ? `cash flow negative from year ${neg}` : null;
  if (run.credits) {
    const value = r.gap > 0.5 ? `Gap to fill ${usdShort(r.gap)}` : 'No gap';
    if (run.noCredits) return { value, sub: 'no units qualify for tax credits', look: 'bad' };
    if (dscr < 1 || (neg != null && neg <= 10)) return { value, sub: negWords ?? dscrWords, look: 'bad' };
    if (neg != null) return { value, sub: negWords!, look: 'warn' };
    return { value, sub: `${Number.isFinite(dscr) ? `DSCR ${dscr.toFixed(2)}` : 'no loan'} · cash flow ${usdShort(y1.cashFlow)} in year 1`, look: r.gap > 0.5 || dscr < need ? 'warn' : 'good' };
  }
  if (dscr < 1) return { value: 'Loan not covered', sub: `${dscrWords}: income pays ${Math.round(Math.max(0, dscr) * 100)}% of the payment`, look: 'bad' };
  const mult = r.multiple;
  if (mult != null && mult < 1) return { value: 'Loses money', sub: `gets back ${usdShort(r.developerReturn)} on ${usdShort(r.developerEquity)}`, look: 'bad' };
  const value = mult == null ? 'No equity needed' : `${mult.toFixed(2)}× equity`;
  return { value, sub: negWords ?? dscrWords, look: neg != null ? 'bad' : dscr < need || (mult != null && mult < 1.5) ? 'warn' : 'good' };
}

export function SourcesBar({ run }: { run: CapitalRun }) {
  const r = run.result;
  const parts = SOURCE_ORDER.map((label) => r.sources.find((s) => s.label === label)).filter((s): s is NonNullable<typeof s> => !!s && s.value > 0);
  const whole = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <>
      <div className="mt-2 flex h-4 overflow-hidden rounded-md" style={{ gap: 2 }} role="img" aria-label={parts.map((p) => `${p.label} ${usd(p.value)}`).join(', ')}>
        {parts.map((p) => (
          <div key={p.label} style={{ width: `${(p.value / whole) * 100}%`, background: SOURCE_COLOR[p.label] }} title={`${p.label}: ${usd(p.value)} (${pct(p.value / r.total, 0)})`} />
        ))}
      </div>
      <ul className="mt-2 space-y-1">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5 text-caption text-slate-700">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SOURCE_COLOR[p.label] }} />
            <span className="min-w-0 flex-1 truncate">{p.label}</span>
            <span className="text-slate-500 tnum">{pct(p.value / r.total, 0)}</span>
            <span className="font-semibold text-slate-900 tnum" style={{ minWidth: 52, textAlign: 'right' }}>
              {usdShort(p.value)}
            </span>
          </li>
        ))}
      </ul>
      {r.creditsCould != null && <p className="mt-1.5 text-caption leading-snug text-slate-600">LIHTC sized to need: {usdShort(parts.find((p) => p.label === 'LIHTC equity')?.value ?? 0)} of the {usdShort(r.creditsCould)} the project could claim.</p>}
      {run.noCredits && <p className="mt-1.5 text-caption leading-snug text-rose-700">No tax credits. {run.noCredits}.</p>}
      {r.developerEquity < -1 && <p className="mt-1.5 text-caption leading-snug text-slate-600">The loan and other sources exceed the cost by {usdShort(-r.developerEquity)}: the developer puts in nothing.</p>}
    </>
  );
}

/** The monthly rent of each unit size and where it comes from; the ground floor's rent for mixed use. */
function Rents({ run }: { run: CapitalRun }) {
  const i = run.inputs;
  const comm = i.commercialSf ?? 0;
  return (
    <ul className="mt-1 divide-y divide-stone-100" data-capital-rents>
      {run.rents.map((x) => (
        <li key={rentKey(x)} className="py-1">
          <div className="flex items-baseline justify-between gap-2 text-small text-slate-800">
            <span>
              {SIZE_WORD[x.br]}, {x.level === 'mkt' ? 'market' : `${x.level}% AMI`} · {x.units} unit{x.units === 1 ? '' : 's'}
            </span>
            <span className="font-semibold text-slate-900 tnum">{usd(x.rent)}</span>
          </div>
          <div className="text-caption leading-snug text-slate-500">{x.kind === 'yours' ? `Yours; ${x.source.charAt(0).toLowerCase()}${x.source.slice(1)}: ${usd(x.sourced)}` : x.source}</div>
        </li>
      ))}
      {comm > 0 && (
        <li className="py-1">
          <div className="flex items-baseline justify-between gap-2 text-small text-slate-800">
            <span>Commercial · {comm.toLocaleString('en-US')} sq ft</span>
            <span className="font-semibold text-slate-900 tnum">{usd(((i.commercialRent ?? 0) * comm) / 12)}</span>
          </div>
          <div className="text-caption leading-snug text-slate-500">
            {usd(i.commercialRent ?? 0)} a sq ft a year, net lease, {pct(i.commercialVacancy ?? 0, 0)} vacancy; an example
          </div>
        </li>
      )}
    </ul>
  );
}

function UsesBars({ run }: { run: CapitalRun }) {
  const uses = run.result.uses;
  const max = Math.max(1, ...uses.map((u) => u.value));
  return (
    <ul className="mt-1 space-y-1">
      {uses.map((u) => (
        <li key={u.label} className="flex items-center gap-2 text-caption text-slate-700" title={`${u.label}: ${usd(u.value)} = ${u.formula}`}>
          <span className="shrink-0 truncate" style={{ width: 118 }}>
            {u.label}
          </span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200">
            <span className="block h-full rounded-full" style={{ width: `${(Math.max(0, u.value) / max) * 100}%`, background: USE_COLOR }} />
          </span>
          <span className="font-semibold text-slate-900 tnum" style={{ minWidth: 52, textAlign: 'right' }}>
            {usdShort(u.value)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Net operating income a year as bars, the loan payment as a dashed line: the gap between them is cash flow. */
function YearsChart({ run }: { run: CapitalRun }) {
  const years = run.result.years;
  const W = 300, H = 104, top = 14, bottom = 16;
  const ds = years[0]?.debtService ?? 0;
  const hi = Math.max(1, ds, ...years.map((y) => y.noi));
  const lo = Math.min(0, ...years.map((y) => y.noi));
  const y = (v: number) => top + ((hi - v) / (hi - lo)) * (H - top - bottom);
  const slot = W / years.length;
  const bw = slot * 0.56;
  const base = y(0);
  const bar = (x: number, v: number) => {
    const t = y(v), r = Math.min(4, Math.abs(base - t));
    return v >= 0 ? `M${x},${base}V${t + r}Q${x},${t} ${x + r},${t}H${x + bw - r}Q${x + bw},${t} ${x + bw},${t + r}V${base}Z` : `M${x},${base}V${t - r}Q${x},${t} ${x + r},${t}H${x + bw - r}Q${x + bw},${t} ${x + bw},${t - r}V${base}Z`;
  };
  const labeled = (i: number) => years.length <= 8 || i % 2 === 0 || i === years.length - 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Net operating income, years 1 to ${years.length}: ${years.map((v) => usdShort(v.noi)).join(', ')}; debt service ${usdShort(ds)} a year`}>
      <line x1={0} x2={W} y1={base} y2={base} stroke="#e7e5e4" strokeWidth={1} />
      {years.map((v, i) => {
        const x = i * slot + (slot - bw) / 2;
        return (
          <g key={i}>
            <title>{`Year ${i + 1}: net operating income ${usd(v.noi)}, debt service ${usd(v.debtService)}, cash flow ${usd(v.cashFlow)}${Number.isFinite(v.dscr) ? `, DSCR ${v.dscr.toFixed(2)}` : ''}`}</title>
            <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
            <path d={bar(x, v.noi)} fill={v.cashFlow >= -0.5 ? NOI_COLOR : '#e11d48'} />
            {labeled(i) && <text x={x + bw / 2} y={H - 3} textAnchor="middle" fontSize={10} fill={MUTED}>{`Y${i + 1}`}</text>}
            {(i === 0 || i === years.length - 1) && (
              <text x={i === 0 ? x : x + bw} y={Math.min(y(v.noi), base) - 3} textAnchor={i === 0 ? 'start' : 'end'} fontSize={10} fontWeight={600} fill={INK}>
                {usdShort(v.noi)}
              </text>
            )}
          </g>
        );
      })}
      {ds > 0 && <line x1={0} x2={W} y1={y(ds)} y2={y(ds)} stroke={INK} strokeWidth={1.5} strokeDasharray="4 3" />}
    </svg>
  );
}

function YearsTable({ run }: { run: CapitalRun }) {
  const cols: [string, (v: CapitalRun['result']['years'][number]) => string][] = [
    ['Revenue', (v) => usdShort(v.revenue)],
    ['Expenses', (v) => usdShort(v.expense)],
    ['NOI', (v) => usdShort(v.noi)],
    ['Debt service', (v) => usdShort(v.debtService)],
    ['DSCR', (v) => (Number.isFinite(v.dscr) ? v.dscr.toFixed(2) : '—')],
    ['Cash flow', (v) => usdShort(v.cashFlow)],
  ];
  return (
    <table className="w-full text-caption tnum">
      <thead>
        <tr className="text-slate-500">
          <th className="text-left font-normal">Year</th>
          {cols.map(([h]) => (
            <th key={h} className="text-right font-normal">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {run.result.years.map((v, i) => (
          <tr key={i} className={v.cashFlow < -0.5 ? 'text-rose-700' : 'text-slate-800'}>
            <td>{i + 1}</td>
            {cols.map(([h, f]) => (
              <td key={h} className="text-right">
                {f(v)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Lines({ title, lines, total, totalLabel = 'Total' }: { title: string; lines: CapitalRun['result']['uses']; total: number; totalLabel?: string }) {
  return (
    <div>
      <div className={SUB}>{title}</div>
      <ul className="mt-1 divide-y divide-stone-100">
        {lines.map((l) => (
          <li key={l.label} className="py-1">
            <div className="flex items-baseline justify-between gap-2 text-small text-slate-800">
              <span>{l.label}</span>
              <span className="font-semibold text-slate-900 tnum">{usd(l.value)}</span>
            </div>
            <div className="text-caption leading-snug text-slate-500">{l.formula}</div>
          </li>
        ))}
        <li className="flex items-baseline justify-between gap-2 py-1 text-small font-semibold text-slate-900">
          <span>{totalLabel}</span>
          <span className="tnum">{usd(total)}</span>
        </li>
      </ul>
    </div>
  );
}

/** What the developer puts in against what comes back over the seven years and the sale. */
function ReturnBars({ run }: { run: CapitalRun }) {
  const r = run.result;
  const rows = [
    { label: 'Puts in', value: Math.max(0, r.developerEquity), color: SOURCE_COLOR['Developer equity'] },
    { label: 'Gets back', value: r.developerReturn, color: INK },
  ];
  const max = Math.max(1, ...rows.map((x) => x.value));
  return (
    <ul className="mt-1 space-y-1">
      {rows.map((x) => (
        <li key={x.label} className="flex items-center gap-2 text-caption text-slate-700">
          <span className="shrink-0" style={{ width: 64 }}>
            {x.label}
          </span>
          <span className="h-4 flex-1">
            <span className="block h-full rounded-md" style={{ width: `${(Math.max(0, x.value) / max) * 100}%`, background: x.color }} />
          </span>
          <span className="font-semibold text-slate-900 tnum" style={{ minWidth: 52, textAlign: 'right' }}>
            {usdShort(x.value)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Market rate: the sale in year 7 and the return on the developer's equity. */
function Sale({ run }: { run: CapitalRun }) {
  const r = run.result;
  const i = run.inputs;
  const last = r.years[r.years.length - 1];
  const amort = i.amortYears ?? 0;
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className={SUB}>Sale in year {r.years.length} and return</span>
        {r.multiple != null && <span className="text-small font-semibold text-slate-900 tnum">{r.multiple >= 0 ? `${r.multiple.toFixed(2)}× equity` : 'Loses money'}</span>}
      </div>
      <p className="mt-1 text-caption leading-snug text-slate-700 tnum">
        Sells for <b className="font-semibold text-slate-900">{usdShort(r.salePrice)}</b> ({usdShort(last.noi)} ÷ {pct(i.exitCap, 2)} cap), less the {usdShort(r.payoff)} {amort > 0 ? 'still owed on the loan' : 'loan'}: <b className="font-semibold text-slate-900">{usdShort(r.netSale)}</b>.
      </p>
      {r.developerEquity > 0 ? <ReturnBars run={run} /> : <p className="mt-1 text-caption text-slate-700 tnum">{r.developerReturn >= 0 ? `With nothing put in, the developer gets back ${usdShort(r.developerReturn)}.` : `With nothing put in, the developer still loses ${usdShort(-r.developerReturn)}: the income does not carry the loan.`}</p>}
    </div>
  );
}

/** A tax credit deal: no sale; the developer earns the fee, part of it deferred and paid from cash flow. */
function Fee({ run }: { run: CapitalRun }) {
  const r = run.result;
  const fee = r.uses.find((u) => u.label === 'Developer fee')?.value ?? 0;
  const deferred = r.sources.find((s) => s.label === 'Deferred developer fee')?.value ?? 0;
  const cash = r.years.reduce((s, v) => s + Math.max(0, v.cashFlow), 0);
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className={SUB}>Developer fee</span>
        <span className="text-small font-semibold text-slate-900 tnum">{usdShort(fee)}</span>
      </div>
      <p className="mt-1 text-caption leading-snug text-slate-700 tnum">
        {usdShort(r.feePaid)} paid at closing
        {deferred > 0 ? `; ${usdShort(deferred)} deferred, ${cash >= deferred ? `repaid from ${usdShort(cash)} of cash flow` : `and ${r.years.length} years of cash flow (${usdShort(cash)}) do not repay it`}` : ''}. No sale is counted: the homes stay income-limited for {r.years.length} years.
      </p>
    </div>
  );
}

export default function CapitalCard({ run }: { run: CapitalRun }) {
  const r = run.result;
  const i = run.inputs;
  const y1 = r.years[0];
  const n = r.years.length;
  const cash = r.years.reduce((s, v) => s + v.cashFlow, 0);
  const amort = i.amortYears ?? 0;
  return (
    <section className={CARD} data-capital-stack>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-small font-semibold text-slate-900">Capital stack</h3>
        <span className="text-small font-semibold text-slate-900 tnum">{usdShort(r.total)} total cost</span>
      </div>
      <SourcesBar run={run} />

      {run.rents.length > 0 && (
        <div className="mt-3">
          <div className={SUB}>Rents a month</div>
          <Rents run={run} />
        </div>
      )}

      <div className="mt-3">
        <div className={SUB}>What it pays for</div>
        <UsesBars run={run} />
      </div>

      <div className="mt-3">
        <div className={SUB}>{YEARS_WORD[n] ?? n} years of operations</div>
        <div className="mt-1 flex items-center gap-3 text-caption text-slate-700">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: NOI_COLOR }} />
            Net operating income
          </span>
          {r.debtService > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block shrink-0" style={{ width: 14, borderTop: `2px dashed ${INK}` }} />
              {amort > 0 ? 'Loan payment' : 'Interest only'} {usdShort(r.debtService)} a year
            </span>
          )}
        </div>
        <YearsChart run={run} />
        <dl className="mt-1 grid grid-cols-3 gap-2 rounded-lg bg-stone-50 px-2.5 py-1.5 text-caption">
          <div>
            <dt className="text-slate-500">NOI, year 1</dt>
            <dd className="font-semibold text-slate-900 tnum">{usdShort(y1.noi)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">DSCR, year 1</dt>
            <dd className="font-semibold text-slate-900 tnum">{Number.isFinite(y1.dscr) ? y1.dscr.toFixed(2) : 'no loan'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Cash flow, {n} years</dt>
            <dd className="font-semibold text-slate-900 tnum">{usdShort(cash)}</dd>
          </div>
        </dl>
        {r.firstNegative != null && <p className="mt-1.5 text-caption leading-snug text-rose-700">Cash flow turns negative in year {r.firstNegative} ({usdShort(r.years[r.firstNegative - 1].cashFlow)}).</p>}
      </div>

      {r.saleCounted ? <Sale run={run} /> : <Fee run={run} />}

      <div className="mt-2 space-y-1.5">
        <Explainer title="Year by year">
          <YearsTable run={run} />
        </Explainer>
        <Explainer title="Sources and uses in full">
          <div className="space-y-3">
            <Lines title="Uses" lines={r.uses} total={r.total} />
            <Lines title="Sources" lines={r.sources} total={r.sources.reduce((s, x) => s + x.value, 0)} />
            <Lines title="Operations, year 1" lines={r.income} total={y1.noi} totalLabel="Net operating income" />
            <p className="text-caption leading-snug text-slate-500">
              {r.saleCounted ? `Gets back = cash flow ${usd(cash)} + net sale ${usd(r.netSale)} + developer fee paid ${usd(r.feePaid)}. ` : 'A tax credit deal: judged by the gap and the cash flow, with no sale. '}
              {amort > 0 ? `The loan amortizes over ${amort} years${r.saleCounted ? `; ${usd(r.payoff)} is still owed at the sale` : ''}.` : `The loan is interest only${r.saleCounted ? ', so all of it is repaid at the sale' : ''}.`} Arithmetic on your inputs, not an underwriting.
            </p>
          </div>
        </Explainer>
      </div>
    </section>
  );
}
