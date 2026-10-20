// The right panel's "Policies and screens" on the online Place tab: the binding rules that apply here, the screens
// switched on with what each found, the types they and the binding rules rule out, and the incentives counted.
// Results only: the switches are under "Policies that apply here" in the left panel. Loaded on demand.
import { cx } from '../../../lib/format';
import { policyRows, type PolicyContext } from '../../../lib/policy/applies';
import { POLICY_BY_ID, STATUS_WORD } from '../../../lib/policy/catalog';
import type { Composed } from '../../../lib/policy/compose';
import type { PolicyState } from '../../../lib/policy/store';
import { editOn } from '../../../lib/project/editStore';
import { TYPOLOGY_LABEL } from '../../../lib/place/thresholds';

const WORD = { true: 'passes', false: 'fails', null: 'cannot run' } as const;
const TONE = { true: 'text-emerald-700', false: 'text-rose-700', null: 'text-slate-500' } as const;

export default function PoliciesCard({ composed, ctx, policy }: { composed: Composed; ctx: PolicyContext | null; policy: PolicyState }) {
  const rows = ctx ? policyRows(ctx, policy) : [];
  const binding = rows.filter((r) => r.policy.kind === 'binding' && r.applies);
  const counted = rows.filter((r) => r.policy.kind === 'funding' && r.on);
  const screens = composed.checks.filter((c) => c.on && c.id !== 'market');
  const market = composed.checks.find((c) => c.id === 'market');
  return (
    <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200/80" data-policies-card>
      <div className="flex items-baseline justify-between gap-2 px-4 pb-1 pt-3.5">
        <h3 className="text-body font-semibold text-slate-900">Policies and screens</h3>
        <button type="button" onClick={() => editOn('policy')} className="text-caption font-medium text-violet-700 hover:text-violet-800">
          Change on the left
        </button>
      </div>
      <div className="space-y-2.5 px-4 pb-4">
        <div>
          <div className="text-caption font-semibold uppercase tracking-wide text-slate-500">Your screens</div>
          {screens.length ? (
            <ul className="mt-1 space-y-1">
              {screens.map((c) => (
                <li key={c.id} className="text-small leading-snug text-slate-800">
                  <b className="font-semibold">{POLICY_BY_ID.get(c.id)?.label}</b> <span className={cx('font-semibold', TONE[String(c.passed) as 'true'])}>{WORD[String(c.passed) as 'true']}</span>
                  <span className="block text-caption text-slate-600">{c.sentence}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-caption leading-snug text-slate-600">None switched on: the suggestion follows renter need at your income level, the lot pattern and the binding rules.</p>
          )}
          {market && <p className="mt-1 text-caption leading-snug text-slate-600">Market check (always shown): {market.sentence}</p>}
        </div>
        {composed.rec.not.length > 0 && (
          <div>
            <div className="text-caption font-semibold uppercase tracking-wide text-slate-500">Ruled out here</div>
            <ul className="mt-1 space-y-0.5 text-caption leading-snug text-slate-700">
              {composed.rec.not.map((n) => (
                <li key={n.typology}>
                  <b className="font-semibold text-slate-900">{TYPOLOGY_LABEL[n.typology]}</b>: {n.because}.
                </li>
              ))}
            </ul>
          </div>
        )}
        {binding.length > 0 && (
          <div>
            <div className="text-caption font-semibold uppercase tracking-wide text-slate-500">Binding rules that apply</div>
            <ul className="mt-1 space-y-0.5 text-caption leading-snug text-slate-700">
              {binding.map((r) => (
                <li key={r.policy.id}>
                  <b className="font-semibold text-slate-900">{r.policy.label}</b> ({r.policy.source}): {r.note}
                </li>
              ))}
            </ul>
          </div>
        )}
        {counted.length > 0 && (
          <div>
            <div className="text-caption font-semibold uppercase tracking-wide text-slate-500">Funding and incentives counted</div>
            <ul className="mt-1 space-y-0.5 text-caption leading-snug text-slate-700">
              {counted.map((r) => (
                <li key={r.policy.id}>
                  <b className="font-semibold text-slate-900">{r.policy.label}</b> <span className="text-slate-500">({STATUS_WORD[r.policy.status]})</span>: {r.note}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
