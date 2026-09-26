import { useMemo } from 'react';
import { useApp } from '../../lib/store';
import { LEVEL_LABEL, RELIABILITY, groups } from '../../lib/explore/catalog';
import { fmtMoe, fmtValue, reliability, reliabilityMix } from '../../lib/explore/bins';
import { EXPLORE_UI, scopeText } from '../../lib/explore/copy';
import { useReference } from '../../lib/explore/remote';
import type { BrowseLevel, Estimate, Loaded, ValueMap, VariableDef } from '../../lib/explore/types';
import { ConfChip, InfoTip, SectionTitle } from '../primitives';

const KIND_WORD = { median: 'Median · margin as published', sum: 'Sum of counts · root-sum-square margin', share: 'Share · ACS proportion margin' } as const;
const MIX = [
  { key: 'high', label: EXPLORE_UI.summary.high, color: '#10b981' },
  { key: 'medium', label: EXPLORE_UI.summary.medium, color: '#f59e0b' },
  { key: 'low', label: EXPLORE_UI.summary.low, color: '#f43f5e' },
  { key: 'none', label: EXPLORE_UI.summary.none, color: '#e7e5e4' },
] as const;

function RefStat({ k, e, variable }: { k: string; e: Estimate | null; variable: VariableDef }) {
  return (
    <div className="bg-white px-3 py-2">
      <div className="text-caption text-slate-600">{k}</div>
      <div className="text-lead font-semibold text-slate-900 tnum">{fmtValue(e?.est, variable.unit)}</div>
      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-caption text-slate-600 tnum">
        {typeof e?.moe === 'number' && <span>± {fmtMoe(e.moe, variable.unit)}</span>}
        <ConfChip conf={reliability(e?.cv, RELIABILITY)} />
      </div>
    </div>
  );
}

/** Right panel while a variable is painted and nothing is selected: what it is, city and county values, reliability. */
export default function VariableSummary({ variable, level, values }: { variable: VariableDef; level: BrowseLevel; values: Loaded<ValueMap> }) {
  const setBrowse = useApp((s) => s.setBrowse);
  const ref = useReference(variable.id);
  const mix = useMemo(() => reliabilityMix(values.data, RELIABILITY), [values.data]);
  const group = groups.find((g) => g.id === variable.group)?.label ?? variable.group;
  const many = LEVEL_LABEL[level].many;
  return (
    <div className="space-y-5 p-5">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-small font-semibold text-violet-700">{group}</div>
            <h2 className="mt-1 font-display text-title font-bold text-slate-900">{variable.label}</h2>
          </div>
          <button onClick={() => setBrowse({ variable: null })} className="shrink-0 rounded-lg px-2 py-1 text-small font-semibold text-slate-600 hover:bg-stone-100 hover:text-slate-900">
            {EXPLORE_UI.clear}
          </button>
        </div>
        <p className="mt-2 text-body text-slate-700">{variable.description}</p>
        <p className="mt-1 text-caption text-slate-600 tnum">
          {variable.table_id} · {KIND_WORD[variable.kind] ?? variable.kind}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-stone-200/70 ring-1 ring-stone-200/70">
        <RefStat k="City of Pittsburgh" e={ref.city} variable={variable} />
        <RefStat k="Allegheny County" e={ref.county} variable={variable} />
      </div>
      <section>
        <SectionTitle sub={EXPLORE_UI.summary.unitsWithData(mix.withData, mix.total, many)}>
          <span className="flex items-center gap-1">
            {EXPLORE_UI.summary.reliability}
            <InfoTip label="How reliability is judged">{EXPLORE_UI.summary.reliabilityHow}</InfoTip>
          </span>
        </SectionTitle>
        <div className="flex h-3 overflow-hidden rounded-full ring-1 ring-black/5" role="img" aria-label={MIX.map((m) => `${m.label} ${mix[m.key]}`).join(', ')}>
          {MIX.map((m) => (mix[m.key] > 0 ? <div key={m.key} style={{ background: m.color, width: `${(mix[m.key] / Math.max(1, mix.total)) * 100}%` }} /> : null))}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-caption text-slate-700">
          {MIX.map((m) => (
            <span key={m.key} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: m.color }} />
              {m.label} <span className="font-semibold text-slate-900 tnum">{mix[m.key]}</span>
            </span>
          ))}
        </div>
      </section>
      <p className="text-caption text-slate-600 tnum">
        {scopeText(values.data.size, many, values.source === 'supabase')} · {EXPLORE_UI.footer}
      </p>
    </div>
  );
}
