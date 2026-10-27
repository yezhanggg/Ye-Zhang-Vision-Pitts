// The tax credit score sheet on Analysis > Place: Pennsylvania's selection criteria for Low Income Housing Tax Credits
// (PHFA), filled in for the selected place. The place settles one line and informs others; the rest are entered by
// the person planning the development. Both the adopted 2025/2026 sheet and the 2027/2028 draft can be read.
// A result on the right panel (question 3 of the project card) that is also where its lines are entered: an entry here
// applies at once (to the shared entries and the left panel's draft together), with no Confirm.
// Loaded on demand and left out of the offline single file.
import { useMemo, type ReactNode } from 'react';
import { cx } from '../../lib/format';
import { hints, mixMoves, type PlanAnswer, type PlanFacts } from '../../lib/lihtc/fromPlan';
import { SHEET_FILE, type SheetState } from '../../lib/lihtc/sheetState';
import { designations } from '../../lib/lihtc/place';
import { STATUS_OF, STATUS_WORD, TRANSIT_KEY, moves, transitMet, type Answer, type Answers, type Basis, type Item, type Kind, type Line, type Occupancy, type Score } from '../../lib/lihtc/score';
import { clearSheet, putAnswer } from '../../lib/lihtc/store';
import { setLihtcBoth } from '../../lib/project/draft';
import type { PlaceMeasures } from '../../lib/place/types';
import type { TractProps } from '../../lib/types';
import { Explainer } from '../primitives';
import { SourceLine } from './shared';

const FILE = SHEET_FILE;
const BASIS_WORD: Record<Basis, string> = { place: 'the place', lookup: 'look up', site: 'the parcel', design: 'design', partners: 'partners', team: 'team', finance: 'financing' };
const KINDS: { value: Kind; label: string }[] = [
  { value: 'new', label: 'New or rehab' },
  { value: 'preservation', label: 'Preservation' },
];
const RESIDENTS: { value: Occupancy; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'senior', label: 'Senior (62+)' },
];
const FIELD = 'rounded-md border border-stone-300 bg-white px-1.5 py-1 text-small text-slate-900 tnum focus:border-violet-500 focus:outline-none';
const MOVES_SHOWN = 6;
/** Measured facts about the place, in the order they are listed under "What the data here says". */
const FACT_ORDER = ['need', 'families', 'seniors', 'poverty', 'owners', 'market', 'lihtc', 'vacant', 'zoning', 'sun', 'canopy'];

function Meter({ score }: { score: Score }) {
  const at = (v: number) => `${Math.min(100, Math.max(0, (v / score.max) * 100))}%`;
  return (
    <div className="relative mt-2 h-2.5 rounded-full bg-stone-200" role="img" aria-label={`${score.total} of ${score.max} points${score.threshold == null ? '' : `, minimum ${score.threshold}`}`}>
      <div className={cx('h-full rounded-full', score.short > 0 ? 'bg-violet-400' : 'bg-violet-600')} style={{ width: at(score.total) }} />
      {score.threshold != null && <div className="absolute -top-1 h-[18px] w-0.5 rounded bg-slate-900" style={{ left: at(score.threshold) }} />}
    </div>
  );
}

/** The entry control for one line. */
function Entry({ item, value, onChange }: { item: Item; value: Answer; onChange: (v: Answer) => void }) {
  const name = `${item.label} (${item.ref})`;
  if (item.input === 'check') {
    return <input type="checkbox" className="h-4 w-4 accent-violet-600" checked={value === true} onChange={(e) => onChange(e.target.checked)} aria-label={name} />;
  }
  if (item.input === 'choice') {
    return (
      <select className={cx(FIELD, 'w-full')} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value || null)} aria-label={name}>
        <option value="">Not claimed (0)</option>
        {item.options?.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label} ({o.points})
          </option>
        ))}
      </select>
    );
  }
  const points = item.input === 'points';
  const lo = points ? item.min ?? 0 : 0;
  const hi = points ? item.max : item.input === 'percent' ? 100 : undefined;
  return (
    <input
      type="number"
      inputMode="decimal"
      className={cx(FIELD, 'w-[4.5rem] text-right')}
      value={typeof value === 'number' ? value : ''}
      min={lo}
      max={hi}
      step={points ? 1 : 'any'}
      placeholder={points ? 'points' : item.input === 'percent' ? '%' : 'score'}
      onChange={(e) => onChange(e.target.value === '' || !Number.isFinite(Number(e.target.value)) ? null : Number(e.target.value))}
      aria-label={name}
    />
  );
}

function LineRow({ line, answers, evidence, near, onAnswer, plan, typed, onUsePlan }: { line: Line; answers: Answers; evidence: Record<string, string>; near: boolean; onAnswer: (item: Item | typeof TRANSIT_KEY, v: Answer) => void; plan?: PlanAnswer; typed: boolean; onUsePlan: () => void }) {
  const { item } = line;
  const facts = (item.evidence ?? []).map((k) => evidence[k]).filter(Boolean);
  const wide = item.input === 'choice';
  const control =
    item.input === 'auto' ? (
      <input type="checkbox" className="h-4 w-4 accent-violet-600" checked={near} onChange={(e) => onAnswer(TRANSIT_KEY, e.target.checked)} aria-label={`${item.label} (${item.ref})`} />
    ) : (
      <Entry item={item} value={answers[item.id]} onChange={(v) => onAnswer(item, v)} />
    );
  return (
    <div className="py-2">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-small font-medium leading-snug text-slate-900">
            {item.label} <span className="text-caption font-normal text-slate-500">{item.ref} · {BASIS_WORD[item.basis]}, {STATUS_WORD[STATUS_OF[item.basis]]}</span>
          </div>
          <p className="mt-0.5 text-caption leading-snug text-slate-600">{item.rule}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          {!wide && control}
          <span className={cx('text-caption tnum', line.counted !== 0 ? 'font-semibold text-violet-800' : 'text-slate-500')}>
            {line.counted} of {item.max}
          </span>
        </div>
      </div>
      {wide && <div className="mt-1">{control}</div>}
      {plan && !typed && <p className="mt-1 text-caption leading-snug text-violet-900">From your plan: {plan.formula}.</p>}
      {plan && typed && (
        <p className="mt-1 text-caption leading-snug text-slate-600">
          Your entry. The plan says {plan.formula}.{' '}
          <button type="button" className="font-medium text-violet-700 underline hover:text-violet-900" onClick={onUsePlan}>
            Use the plan
          </button>
        </p>
      )}
      {item.requires === 'transit' && !near && <p className="mt-1 text-caption leading-snug text-amber-900">Scores only when the site is within half a mile of a transit stop (the check at the top of this sheet).</p>}
      {line.points !== line.counted && <p className="mt-1 text-caption leading-snug text-amber-900">A cap on this part of the sheet holds this line to {line.counted}.</p>}
      {line.next && line.next.gain > 0 && line.points > 0 && (
        <p className="mt-1 text-caption leading-snug text-slate-700">
          Next step: {line.next.need} adds {line.next.gain}.
        </p>
      )}
      {facts.map((f) => (
        <p key={f} className="mt-1 text-caption leading-snug text-violet-900">
          {f}
        </p>
      ))}
      {item.link && (
        <a className="mt-1 inline-block text-caption font-medium text-violet-700 underline hover:text-violet-900" href={item.link.url} target="_blank" rel="noreferrer">
          {item.link.label}
        </a>
      )}
    </div>
  );
}

/** A small labeled dropdown for the sheet's settings. */
function Pick<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <label className="block min-w-0">
      <span className="text-caption text-slate-600">{label}</span>
      <select className={cx(FIELD, 'mt-0.5 w-full truncate text-caption')} value={value} onChange={(e) => onChange(e.target.value as T)} aria-label={label}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const Row = ({ k, children }: { k: ReactNode; children: ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3 px-2.5 py-1.5">
    <dt className="text-slate-700">{k}</dt>
    <dd className="text-right font-medium text-slate-900">{children}</dd>
  </div>
);

export default function TaxCreditSheet({ t, place, plan, state, market }: { t: TractProps; place: PlaceMeasures; /** The project's mix and pencil, which answer some lines. */ plan: PlanFacts; state: SheetState; /** The pencil is market rate: the sheet is shown for the last credit picked. */ market: boolean }) {
  const { sheet, setup, facts, evidence, typed, auto, answers, score } = state;
  const mixChanges = useMemo(() => mixMoves(sheet, setup, typed, facts, plan), [plan, sheet, setup, typed, facts]);
  const planHints = useMemo(() => hints(sheet, plan), [plan, sheet]);
  const open = useMemo(() => moves(score), [score]);
  const near = transitMet(answers, facts);
  const transitLine = score.sections.flatMap((s) => s.lines).find((l) => l.item.auto === 'transit' || l.item.requires === 'transit');
  const entered = Object.keys(typed).length > 0;
  // Each measured fact with the open lines it bears on (lines a person decides; the fact informs, it does not score).
  const told = useMemo(() => {
    const lines = score.sections.flatMap((s) => s.lines).filter((l) => l.item.input !== 'auto');
    return FACT_ORDER.filter((k) => evidence[k]).map((k) => ({ key: k, fact: evidence[k], lines: lines.filter((l) => l.item.evidence?.includes(k)) })).filter((x) => x.lines.length > 0);
  }, [score, evidence]);
  const credit = sheet.thresholds.find((x) => x.id === setup.credit);
  // The mix changes that score and the open lines, in one list, largest gain first.
  const mixIds = new Set(mixChanges.map((m) => m.item.id));
  const ways = [
    ...mixChanges.map((m) => ({ key: `mix-${m.item.id}`, gain: m.gain, text: m.change as ReactNode, ref: m.item.ref, mix: true })),
    ...open
      .filter((l) => !mixIds.has(l.item.id))
      .map((l) => ({
        key: l.item.id,
        gain: l.gain,
        text: (
          <>
            {l.item.label}
            {l.next && l.next.gain > 0 && l.next.gain < l.gain && <span className="text-slate-600"> (next step: {l.next.need}, +{l.next.gain})</span>}
          </>
        ) as ReactNode,
        ref: `${l.item.ref} · ${BASIS_WORD[l.item.basis]}, ${STATUS_WORD[STATUS_OF[l.item.basis]]}`,
        mix: false,
      })),
  ]
    .sort((x, y) => y.gain - x.gain)
    .slice(0, MOVES_SHOWN + mixChanges.length);

  const onAnswer = (item: Item | typeof TRANSIT_KEY, v: Answer) => setLihtcBoth((e) => putAnswer(e, sheet.id, t.GEOID, item, v, item !== TRANSIT_KEY && auto[item.id] != null));
  const followPlan = (item: Item) => setLihtcBoth((e) => putAnswer(e, sheet.id, t.GEOID, item, undefined, false, true));
  const setSetup = (p: Partial<typeof setup>) => setLihtcBoth((e) => ({ setup: { ...e.setup, ...p } }));
  const sheetName = (x: typeof sheet) => (x.status === 'adopted' ? `${x.label} adopted` : x.label);
  const lineRows = (s: (typeof score.sections)[number]) => (
    <div className="divide-y divide-stone-100">
      {s.lines.map((l) => (
        <LineRow key={l.item.id} line={l} answers={answers} evidence={evidence} near={near} onAnswer={onAnswer} plan={auto[l.item.id]} typed={typed[l.item.id] !== undefined} onUsePlan={() => followPlan(l.item)} />
      ))}
    </div>
  );
  // Each PHFA section folds, named first with PHFA's own letter or number after it (A–F on the adopted sheet, 4.2–4.7
  // on the draft).
  const sections = () =>
    score.sections.map((s) => (
      <Explainer
        key={s.section.id}
        tone="card"
        title={
          <span className="block text-small leading-snug">
            {s.section.label} <span className="font-normal text-slate-500">(PHFA section {s.section.id})</span>
          </span>
        }
        right={
          <span className="shrink-0 text-small text-slate-700 tnum">
            {s.points} of {s.max}
          </span>
        }
      >
        {lineRows(s)}
      </Explainer>
    ));

  return (
    <div className="space-y-2.5" data-tax-credit-sheet>
      <p className="text-caption text-slate-600">
        {sheetName(sheet)} sheet · {KINDS.find((k) => k.value === setup.kind)?.label} · {RESIDENTS.find((k) => k.value === setup.occupancy)?.label} residents. Enter the lines in the sections below; each entry counts at once.
      </p>
      <div className="flex items-end justify-between gap-2">
        <div className="w-1/2">
          <Pick label="Development" value={setup.kind} onChange={(kind) => setSetup({ kind })} options={KINDS} />
        </div>
        {entered && (
          <button type="button" className="text-caption font-medium text-violet-700 underline hover:text-violet-900" onClick={() => setLihtcBoth((e) => clearSheet(e, sheet.id, t.GEOID))}>
            Clear entries
          </button>
        )}
      </div>
      {sheet.status === 'draft' && <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-caption leading-snug text-amber-900 ring-1 ring-amber-200">{sheet.remarks[0]}</p>}
      {market && <p className="rounded-lg bg-stone-100 px-2.5 py-1.5 text-caption leading-snug text-slate-700">The pencil is market rate, so no credits are applied for. The sheet below is scored for {credit?.label ?? 'credits'}; pick 9% or 4% under Financing to test a tax credit deal.</p>}

      <div>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-display font-bold leading-none text-slate-900 tnum">{score.total}</span>
          <span className="text-small text-slate-600">of {score.max} points · {credit?.label ?? setup.credit}</span>
        </div>
        <Meter score={score} />
        {score.threshold != null && (
          <p className="mt-1.5 text-small leading-snug text-slate-800">
            {score.short > 0 ? (
              <>
                <b className="font-semibold text-slate-900">{score.short} short</b> of PHFA’s minimum of {score.threshold}.
              </>
            ) : (
              <>
                At or above PHFA’s minimum of <b className="font-semibold text-slate-900">{score.threshold}</b>.
              </>
            )}{' '}
            <span className="text-caption text-slate-600">The minimum only qualifies; credits go to the highest scores. A self-score: PHFA scores every application.</span>
          </p>
        )}
        <p className="mt-1 text-caption leading-snug text-slate-600">
          Range {score.range.low}–{score.range.high}: low drops the lines still {STATUS_WORD.confirm} (the parcel, partners, the team); high adds every point still open as {STATUS_WORD.choice} (design, financing). Chance of award is not modeled: PHFA does not publish past scores.
        </p>
      </div>

      <dl className="divide-y divide-stone-100 overflow-hidden rounded-xl bg-white text-small ring-1 ring-stone-200/80">
        <Row
          k={
            <>
              Site within half a mile of a transit stop
              <span className="block text-caption leading-snug text-slate-600">
                {evidence.transit ?? 'Not measured for this place.'}
                {transitLine && (transitLine.item.auto ? ` Worth ${transitLine.item.max} points (${transitLine.item.ref}).` : ` Needed, with a Walk Score above 75, for ${transitLine.item.max} points (${transitLine.item.ref}).`)}
              </span>
            </>
          }
        >
          <input type="checkbox" className="h-4 w-4 accent-violet-600" checked={near} onChange={(e) => onAnswer(TRANSIT_KEY, e.target.checked)} aria-label="Site within half a mile of a transit stop" />
        </Row>
        {designations(place, t.GEOID).map((d) => (
          <Row
            key={d.key}
            k={
              <>
                {d.label}
                {d.on && <span className="block text-caption leading-snug text-slate-600">{d.note}</span>}
              </>
            }
          >
            {d.on == null ? 'not available' : d.on ? 'Yes' : 'No'}
          </Row>
        ))}
        <Row k="Points from lines the place decides">
          <span className="tnum">{score.fromPlace}</span>
        </Row>
      </dl>

      {(mixChanges.length > 0 || open.length > 0 || planHints.length > 0) && (
        <div>
          <h4 className="text-caption font-semibold uppercase tracking-wide text-slate-500">Ways to add points, largest first</h4>
          <ol className="mt-1 divide-y divide-stone-100 overflow-hidden rounded-xl bg-white ring-1 ring-stone-200/80">
            {ways.map((w) => (
              <li key={w.key} className="flex items-baseline gap-2 px-2.5 py-1.5 text-small">
                <span className="w-9 shrink-0 font-semibold text-violet-800 tnum">+{w.gain}</span>
                <span className="min-w-0 flex-1 leading-snug text-slate-800">
                  {w.text}
                  {w.mix && <span className="ml-1 rounded bg-violet-50 px-1 text-[10px] font-semibold text-violet-800 ring-1 ring-violet-200">your mix</span>}
                </span>
                <span className="shrink-0 text-caption text-slate-500">{w.ref}</span>
              </li>
            ))}
            {planHints.map((h) => (
              <li key={h.ref} className="px-2.5 py-1.5 text-caption leading-snug text-slate-700">
                {h.text} <span className="text-slate-500">({h.ref})</span>
              </li>
            ))}
          </ol>
          <p className="mt-1 text-caption text-slate-600">Lines marked “your mix” are read from the unit mix{plan.finance ? ' and the pencil' : ''}; a number typed on a line always wins. Every line is in the sections below.</p>
        </div>
      )}

      <div className="space-y-1.5">
        {told.length > 0 && (
          <Explainer title={`What the data here says (${told.length})`}>
            <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl bg-white ring-1 ring-stone-200/80">
              {told.map((x) => (
                <li key={x.key} className="px-2.5 py-1.5">
                  <p className="text-small leading-snug text-slate-800">{x.fact}</p>
                  <p className="mt-0.5 text-caption leading-snug text-slate-500">Bears on {x.lines.map((l) => `${l.item.label} (${l.item.ref}, up to ${l.item.max})`).join('; ')}.</p>
                </li>
              ))}
            </ul>
          </Explainer>
        )}
        {sections()}
        {score.lost.length > 0 && (
          <p className="px-1 text-caption leading-snug text-amber-900">
            Caps in force: {score.lost.map((l) => `${l.label} (${l.lost} not counted)`).join('; ')}.
          </p>
        )}
        <Explainer title="Notes on this sheet">
          <ul className="list-disc space-y-1 pl-4 text-caption leading-snug text-slate-700">
            {sheet.remarks.map((r) => (
              <li key={r}>{r}</li>
            ))}
            <li>{FILE.pool.why}</li>
            <li>{FILE.what}</li>
          </ul>
        </Explainer>
      </div>
      <SourceLine className="px-1">
        Source · {FILE.pool.label} ·{' '}
        {sheet.sources.map((s, i) => (
          <span key={s.url}>
            {i > 0 && ' · '}
            <a className="underline hover:text-slate-800" href={s.url} target="_blank" rel="noreferrer">
              {s.title}
            </a>
          </span>
        ))}{' '}
        · read on {FILE.retrieved}.
      </SourceLine>
    </div>
  );
}
