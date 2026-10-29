// Policies at every level of the Place tab, in two parts (Ye, 2026-10-27). "Applies here" is read from the place's
// data and shown on its own: rules the site must meet and programs it is eligible for. "I want to study" is the
// person's list of incentives, programs and screens to weigh; each one picked shows its result on the right
// (StudyCard). Online only: loaded on demand.
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../../../lib/format';
import { FLOOD_LABEL, type FloodRisk } from '../../../lib/place/plan';
import { policyRows, type PolicyContext, type PolicyRow } from '../../../lib/policy/applies';
import { POLICIES, STATUS_WORD, type Policy, type PolicyStatus } from '../../../lib/policy/catalog';
import type { Composed } from '../../../lib/policy/compose';
import type { OptionalId, PolicyState } from '../../../lib/policy/store';
import { zipPolicyWords, type ZipPolicyCount } from '../../../lib/policy/zipCounts';
import { SHEET_FILE } from '../../../lib/lihtc/sheetState';
import { useSide } from '../../../lib/project/side';
import { Segmented } from '../PlanInputs';

const DRAFT_SHEET = SHEET_FILE.sheets.find((x) => x.status === 'draft')?.id ?? null;
const ADOPTED_SHEET = SHEET_FILE.sheets.find((x) => x.status === 'adopted')?.id ?? SHEET_FILE.sheets[0].id;
const POLICY = (id: Policy['id']) => POLICIES.find((p) => p.id === id)!;
const STATUS_CLASS: Record<PolicyStatus, string> = {
  adopted: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  federal: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  draft: 'bg-amber-50 text-amber-900 ring-amber-200',
  proposed: 'bg-amber-50 text-amber-900 ring-amber-200',
  study: 'bg-violet-50 text-violet-800 ring-violet-200',
  unverified: 'bg-stone-100 text-slate-600 ring-stone-200',
  assumption: 'bg-stone-100 text-slate-600 ring-stone-200',
};
const Badge = ({ status }: { status: PolicyStatus }) => <span className={cx('shrink-0 rounded px-1 py-px text-[10px] font-semibold ring-1', STATUS_CLASS[status])}>{STATUS_WORD[status]}</span>;
const SUB = 'text-caption font-semibold uppercase tracking-wide text-slate-500';

/** What each rule read from the data means for a site, in a few words. */
const AUTO: { id: Policy['id']; kind: 'required' | 'eligible'; words: string }[] = [
  { id: 'izo', kind: 'required', words: 'Set aside 10% of 20+ homes at 50% AMI' },
  { id: 'fpo', kind: 'required', words: 'Build above the flood elevation where the lot is in the flood zone' },
  { id: 'qct', kind: 'eligible', words: '130% basis boost for tax credits' },
  { id: 'perf', kind: 'eligible', words: 'Extra height for affordable homes' },
  { id: 'plan', kind: 'eligible', words: 'A neighborhood plan covers this area' },
];

/** The incentives, programs and screens a person can choose to weigh. */
const STUDY: Policy['id'][] = ['phfa_draft', 'ahb', 'hof', 'abatement', 'parking', 'displacement', 'transit', 'flood'];

function isOn(id: Policy['id'], pol: PolicyState, sheet: string): boolean {
  if (id === 'displacement') return pol.displacement;
  if (id === 'transit') return pol.transit;
  if (id === 'flood') return pol.flood !== 'any';
  if (id === 'phfa_draft') return sheet === DRAFT_SHEET;
  return !!pol.on[id as OptionalId];
}

function AutoRow({ kind, label, words, state }: { kind: 'required' | 'eligible'; label: string; words: string; state?: string | null }) {
  return (
    <li className="flex items-start gap-2 py-1.5">
      {kind === 'required' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-label="Required" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-label="Eligible" />}
      <span className="min-w-0 flex-1">
        <span className="block text-small font-medium text-slate-900">{label}</span>
        <span className="block text-caption leading-snug text-slate-600">{state ? `${state} · ${words}` : words}</span>
      </span>
    </li>
  );
}

/** The left panel's policies group. `ctx` reads one place; `counts` reads a ZIP code's tracts. */
export function PolicyPicker({ ctx, counts }: { ctx: PolicyContext | null; counts?: ZipPolicyCount | null }) {
  const side = useSide();
  const pol = side.policy();
  const sheet = side.lihtc((e) => e.sheet);
  const rows: PolicyRow[] = ctx ? policyRows({ ...ctx, draftSheet: sheet === DRAFT_SHEET }, pol) : [];
  const auto = counts
    ? AUTO.filter((a) => (counts.applies[a.id] ?? 0) > 0).map((a) => ({ ...a, state: zipPolicyWords(counts, a.id) }))
    : AUTO.filter((a) => rows.find((r) => r.policy.id === a.id)?.applies === true).map((a) => ({ ...a, state: null }));
  const set = (id: Policy['id'], v: boolean) => {
    if (id === 'displacement') side.policy.setState({ displacement: v });
    else if (id === 'transit') side.policy.setState({ transit: v });
    else if (id === 'flood') side.policy.setState({ flood: v ? 'le5' : 'any' });
    else if (id === 'phfa_draft') side.lihtc.setState({ sheet: v && DRAFT_SHEET ? DRAFT_SHEET : ADOPTED_SHEET });
    else side.policy.setState((s) => ({ on: { ...s.on, [id]: v } }));
  };
  return (
    <div className="space-y-3" data-policy-picker>
      <div>
        <div className={SUB}>Applies here</div>
        {auto.length ? (
          <ul className="divide-y divide-stone-100">
            {auto.map((a) => (
              <AutoRow key={a.id} kind={a.kind} label={POLICY(a.id).label} words={a.words} state={a.state} />
            ))}
          </ul>
        ) : (
          <p className="pt-1 text-small text-slate-600">{ctx || counts ? 'No special rule or program applies here.' : 'Pick a place to see what applies.'}</p>
        )}
      </div>
      <div>
        <div className={SUB}>I want to study</div>
        <ul className="divide-y divide-stone-100">
          {STUDY.filter((id) => id !== 'phfa_draft' || DRAFT_SHEET).map((id) => {
            const p = POLICY(id);
            const on = isOn(id, pol, sheet);
            return (
              <li key={id} className="py-1.5" title={`${p.rule}\n\nSource: ${p.source}`}>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 accent-violet-600" checked={on} onChange={(e) => set(id, e.target.checked)} />
                  <span className="min-w-0 flex-1 truncate text-small text-slate-900">{p.label}</span>
                  <Badge status={p.status} />
                </label>
                {id === 'flood' && on && (
                  <div className="pt-1.5" style={{ paddingLeft: 24 }}>
                    <Segmented label="Most flood-zone land" options={['none', 'le5', 'le15'] as FloodRisk[]} value={pol.flood} onChange={(v) => side.policy.setState({ flood: v })} text={(v) => FLOOD_LABEL[v]} cols={3} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

const PASS_ICON = { true: <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />, false: <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />, null: <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> } as const;

/** The right panel's results for what the person chose to study: each screen's finding, each program's note. */
export function StudyCard({ composed, ctx, policy, sheet }: { composed: Composed; ctx: PolicyContext | null; policy: PolicyState; sheet: string }) {
  const rows = ctx ? policyRows({ ...ctx, draftSheet: sheet === DRAFT_SHEET }, policy) : [];
  const picked = STUDY.filter((id) => isOn(id, policy, sheet));
  const items: { id: string; icon: ReactNode; label: string; text: string }[] = picked.map((id) => {
    const check = composed.checks.find((c) => c.id === id);
    if (check) return { id, icon: PASS_ICON[String(check.passed) as 'true'], label: POLICY(id).label, text: check.sentence };
    const r = rows.find((x) => x.policy.id === id);
    return { id, icon: <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />, label: POLICY(id).label, text: r?.note ?? POLICY(id).rule };
  });
  return (
    <section className="rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200" data-study-card>
      <h3 className="text-small font-semibold text-slate-900">What you are studying</h3>
      {items.length ? (
        <ul className="mt-1 divide-y divide-stone-100">
          {items.map((it) => (
            <li key={it.id} className="flex items-start gap-2 py-1.5">
              {it.icon}
              <span className="min-w-0 flex-1">
                <span className="block text-small font-medium text-slate-900">{it.label}</span>
                <span className="block text-caption leading-snug text-slate-600">{it.text}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-small text-slate-600">Nothing picked. Choose incentives or screens under Policies on the left.</p>
      )}
    </section>
  );
}
