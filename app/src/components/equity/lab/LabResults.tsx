// The Policy lab's right panel, kept short: the answer in one sentence with three headline numbers (today and yours)
// and its caveats; what each policy you moved does; the tract picked; the other numbers as a plain table; what is data
// and what is assumed; the second opinion. Online only.
import { Fragment, useState, type ReactNode } from 'react';
import { tractById, tractLabel } from '../../../lib/data';
import { cx } from '../../../lib/format';
import { EXAMPLES, LEVER_LABEL, moved, resultClass, VERDICT_WORD, type LeverEffect, type Scenario, type Summary, type TractOutcome, type Verdict } from '../../../lib/policylab/lab';
import { useSecondOpinion } from '../../../lib/review/ai';
import { useApp } from '../../../lib/store';
import { answer, CARD, EVIDENCE, n0, plural, RESULT_TEXT, RESULT_WORD, usdK } from './ui';

const VERDICT_CLASS: Record<Verdict, string> = { works: 'bg-emerald-50 text-emerald-800 ring-emerald-200', tradeoff: 'bg-amber-50 text-amber-900 ring-amber-200', none: 'bg-stone-100 text-slate-500 ring-stone-200', backfires: 'bg-rose-50 text-rose-700 ring-rose-200', overlap: 'bg-stone-100 text-slate-500 ring-stone-200' };
const VERDICT_TIP: Record<Verdict, string> = { works: 'Gains only', tradeoff: 'Some gains, some losses', none: 'Nothing changes', backfires: 'Losses only', overlap: 'Your other choices already do this' };

/** Green when your rules move it the good way, red the other way, plain when unchanged. */
const tone = (today: number | null, yours: number | null, better: 'up' | 'down') =>
  today == null || yours == null || today === yours ? 'text-slate-900' : (better === 'up' ? yours > today : yours < today) ? 'text-emerald-700' : 'text-rose-700';

/** One headline number: yours big, today under it when it differs. */
function Tile({ label, today, yours, fmt = n0, better }: { label: string; today: number | null; yours: number | null; fmt?: (v: number) => string; better: 'up' | 'down' }) {
  return (
    <div className="rounded-xl bg-stone-50 px-2.5 py-2">
      <div className="text-caption leading-snug text-slate-600">{label}</div>
      <div className={cx('tnum mt-0.5 text-title font-semibold leading-none', tone(today, yours, better))}>{yours == null ? '—' : fmt(yours)}</div>
      {today !== yours && <div className="tnum mt-1 text-caption text-slate-500">today {today == null ? '—' : fmt(today)}</div>}
    </div>
  );
}

function Answer({ s, today, yours, range }: { s: Scenario; today: Summary; yours: Summary; range: { cheaper: number; dearer: number } }) {
  const a = answer(s, today, yours, range);
  return (
    <section className={CARD} data-lab-answer>
      <p className="text-body font-semibold leading-snug text-slate-900">{a.lead}</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Tile label="Tracts where it works" today={today.works} yours={yours.works} better="up" />
        <Tile label="Tracts zoning allows it" today={today.allowed} yours={yours.allowed} better="up" />
        <Tile label="Gap a unit (median)" today={today.medianGap} yours={yours.medianGap} fmt={usdK} better="down" />
      </div>
      {a.notes.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-4 text-caption leading-snug text-slate-600">
          {a.notes.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The rest of today against yours, as a plain table. Rows that are zero both ways are left out. */
function Outcomes({ today, yours }: { today: Summary; yours: Summary }) {
  const rows: [string, string, number | null, number | null, 'up' | 'down', ((v: number) => string)?][] = [
    ['Works with a hearing', 'Allowed only with a zoning hearing, which it may not win; the money read as if granted', today.worksHearing, yours.worksHearing, 'up'],
    ['At least breaks even', `Of ${yours.tested} tracts tested: the developer gets back at least what it puts in`, today.breakEven, yours.breakEven, 'up'],
    ['Homes allowed by right', 'Zoning room on vacant lots and house lots citywide: what the code allows, not what gets built', today.capacity, yours.capacity, 'up'],
    ['Income-limited homes', 'In one test building in each tract where it works: not a citywide forecast', today.affordable, yours.affordable, 'up'],
    ['…at high displacement risk', 'Income-limited homes in working tracts with an HNA displacement score of 0.67 or more', today.riskAffordable, yours.riskAffordable, 'up'],
    ['Market-only, high risk', 'Working tracts at high displacement risk where the project has no income-limited homes', today.riskMarketOnly, yours.riskMarketOnly, 'down'],
    ['Works near frequent transit', `Within ${EXAMPLES.nearMi} mile of a stop served every 15 minutes`, today.nearTransit, yours.nearTransit, 'up'],
    ['Works in a flood zone', `More than ${EXAMPLES.floodPct}% of the land in FEMA’s 1%-a-year flood zone`, today.inFlood, yours.inFlood, 'down'],
  ];
  const shown = rows.filter(([, , t, y]) => (t ?? 0) !== 0 || (y ?? 0) !== 0);
  return (
    <section className={CARD} data-lab-outcomes>
      <div className="text-caption" style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', columnGap: 14, rowGap: 6 }}>
        <span className="text-small font-semibold text-slate-900">More numbers</span>
        <span className="text-right font-semibold text-slate-500">Today</span>
        <span className="text-right font-semibold text-violet-700">Yours</span>
        {shown.map(([label, def, t, y, better, fmt = n0]) => (
          <Fragment key={label}>
            <span className="text-slate-700" title={def}>{label}</span>
            <span className="tnum text-right text-slate-500">{t == null ? '—' : fmt(t)}</span>
            <span className={cx('tnum text-right font-semibold', tone(t, y, better))}>{y == null ? '—' : fmt(y)}</span>
          </Fragment>
        ))}
      </div>
      {yours.screened > 0 && <p className="mt-2 text-caption leading-snug text-slate-600">{plural(yours.screened, 'tract')} left out by your values.</p>}
    </section>
  );
}

function Effects({ fx, iz }: { fx: LeverEffect[]; iz: boolean }) {
  if (!fx.length) return null;
  return (
    <section className={CARD} data-lab-effects>
      <h3 className="text-small font-semibold text-slate-900">What each policy does</h3>
      <ul className="mt-1 divide-y divide-stone-100">
        {fx.map((f) => (
          <li key={f.id} className="py-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-small font-medium text-slate-900">{LEVER_LABEL[f.id]}</span>
              <span title={VERDICT_TIP[f.verdict]} className={cx('rounded px-1.5 py-px text-caption font-semibold ring-1', VERDICT_CLASS[f.verdict])}>{VERDICT_WORD[f.verdict]}</span>
            </div>
            <p className="text-caption leading-snug text-slate-600">{f.sentence}</p>
          </li>
        ))}
      </ul>
      {iz && (
        <a href={EVIDENCE.url} target="_blank" rel="noreferrer" className="mt-1 block text-caption leading-snug text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">
          {EVIDENCE.text}
        </a>
      )}
    </section>
  );
}

/** One side of the tract's comparison: the result in big words, then the gap or the return. */
function Side({ label, x, accent }: { label: string; x: TractOutcome | undefined; accent: string }) {
  const k = x ? resultClass(x) : null;
  return (
    <div className="rounded-xl bg-stone-50 px-3 py-2.5" style={{ boxShadow: `inset 0 3px 0 ${accent}` }}>
      <div className="text-caption font-semibold uppercase tracking-wide" style={{ color: accent }}>
        {label}
      </div>
      <div className="mt-1 text-lead font-semibold leading-tight" style={{ color: k ? RESULT_TEXT[k] : '#64748b' }}>
        {k ? RESULT_WORD[k] : '—'}
      </div>
      <div className="tnum mt-1 text-small text-slate-700">{!x ? '' : x.gap == null ? (x.multiple != null ? `Return ${x.multiple.toFixed(2)}×` : '') : x.gap === 0 ? `No gap${x.multiple != null ? ` · return ${x.multiple.toFixed(2)}×` : ''}` : `Short ${usdK(x.gap)} a unit`}</div>
    </div>
  );
}

/** The tract clicked on the map: today against your rules, side by side, then the details. */
function TractCard({ t, was0 }: { t: TractOutcome; was0: TractOutcome | undefined }) {
  const z = (x: TractOutcome) => (x.zoning.status === 'unknown' ? 'not read here' : x.zoning.lots ? `by right on ${n0(x.zoning.lots)} of ${n0(x.zoning.of)} lots` : x.zoning.hearing ? `hearing needed, ${n0(x.zoning.hearing)} lots` : 'not allowed');
  const rows: [string, (x: TractOutcome) => ReactNode][] = [
    ['Units', (x) => `${x.units}${x.affordable ? `, ${x.affordable} income-limited` : ''}${x.bonus ? ' (bonus)' : ''}`],
    ['Zoning', z],
    ['Homes by right', (x) => n0(x.capacity)],
  ];
  return (
    <section className="rounded-2xl bg-white px-4 py-3 ring-2 ring-violet-200" data-lab-tract>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-lead font-bold text-slate-900">{tractLabel(tractById.get(t.geoid))}</h3>
        <button type="button" onClick={() => useApp.getState().select(null)} className="rounded-md px-1 text-slate-500 hover:text-slate-900" aria-label="Clear the tract">
          ×
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Side label="Today" x={was0} accent="#64748b" />
        <Side label="Your rules" x={t} accent="#7c3aed" />
      </div>
      <p className="mt-2 text-small leading-snug text-slate-800">{t.why}.{t.highRisk ? ' High displacement risk here.' : ''}</p>
      <div className="mt-2 text-caption text-slate-700" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', columnGap: 10, rowGap: 3 }}>
        <span />
        <span className="font-semibold text-slate-500">Today</span>
        <span className="font-semibold text-violet-700">Your rules</span>
        {rows.map(([k, f]) => (
          <Fragment key={k}>
            <span className="text-slate-500">{k}</span>
            <span className="tnum">{was0 ? f(was0) : '—'}</span>
            <span className="tnum text-slate-900">{f(t)}</span>
          </Fragment>
        ))}
      </div>
    </section>
  );
}

const KINDS: [string, string][] = [
  ['Data', 'Asking rents or HUD Small Area FMR; renters by household size (HUD CHAS); zoning districts and lots (City zoning, county parcels and assessments); frequent transit (GTFS); the flood zone (FEMA); displacement risk (HNA).'],
  ['Rules in force', 'The IZ-O (§907.04.A); minimum lot sizes (§903.03, Bill 2025-1579); the use table (§911.02); parking (§914.02); PHFA’s adopted plan; HUD FY2026 income limits.'],
  ['Proposals and ideas', 'The height bonus (Bill 2025-1545) and removing parking minimums are proposed. More homes on house lots, parking near transit, the frequent bus, the abatement and the subsidy are ideas to test.'],
  ['Examples', 'Building cost, the bar for the developer’s return and the parking space (changeable under Assumptions); $15,000 of land a unit; 850 sq ft a home for lot capacity; 10 ft a story; tax credit homes at 60% AMI; the loan paid off over 30 years (35 with tax credits).'],
  ['Your values', 'The screens: displacement risk, distance to frequent transit, flood zone.'],
  ['What this is', 'The simple pro forma in each tract with its asking rent (or Small Area FMR) and its renters’ split. A screen of policy, not a feasibility study.'],
  ['Not modeled', 'How land prices, rents or builders respond to a policy; competition for 9% credits; whether a lot can carry the bonus height; how many allowed homes get built.'],
];

function Kinds() {
  const [open, setOpen] = useState(false);
  return (
    <section className={CARD} data-lab-kinds>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-2 text-left text-small font-semibold text-slate-900">
        What is data, and what is assumed
        <span className="text-slate-500">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <dl className="mt-1.5 space-y-1.5 text-caption leading-snug">
          {KINDS.map(([k, v]) => (
            <div key={k}>
              <dt className="font-semibold text-slate-900">{k}</dt>
              <dd className="text-slate-600">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function Opinion({ facts }: { facts: string }) {
  const { state, ask } = useSecondOpinion(facts, 'Give your second opinion on this policy scenario: what works, what does not, and one change to test.');
  return (
    <section className={CARD} data-lab-opinion>
      {state.status === 'ok' ? (
        <>
          <h3 className="text-small font-semibold text-violet-700">Second opinion (Claude)</h3>
          <p className="mt-1 text-small leading-snug text-slate-800" style={{ whiteSpace: 'pre-line' }}>{state.text}</p>
        </>
      ) : state.status === 'off' ? (
        <p className="text-caption leading-snug text-slate-600">{state.why}</p>
      ) : (
        <button type="button" onClick={ask} disabled={state.status === 'loading'} className="text-caption font-medium text-violet-700 hover:text-violet-800">
          {state.status === 'loading' ? 'Reading the scenario…' : 'Ask for a second opinion on this scenario (AI)'}
        </button>
      )}
    </section>
  );
}

export default function LabResults({ s, today, yours, fx, range, picked, pickedToday, facts }: { s: Scenario; today: Summary; yours: Summary; fx: LeverEffect[]; range: { cheaper: number; dearer: number }; picked: TractOutcome | undefined; pickedToday: TractOutcome | undefined; facts: string }) {
  return (
    <div className="space-y-3 p-5" aria-label="Results">
      {/* The tract clicked comes first: today against your rules, big. */}
      {picked ? <TractCard t={picked} was0={pickedToday} /> : <p className="px-1 text-caption leading-snug text-slate-500">Click a tract on the map to compare it today and under your rules.</p>}
      <Answer s={s} today={today} yours={yours} range={range} />
      <Effects fx={fx} iz={moved(s, 'iz') || moved(s, 'bonus')} />
      <Outcomes today={today} yours={yours} />
      <Kinds />
      <Opinion facts={facts} />
    </div>
  );
}
