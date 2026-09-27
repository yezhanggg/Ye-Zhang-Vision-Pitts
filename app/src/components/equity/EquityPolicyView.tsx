// Analysis > Equity & policy (mode `scenarios`): the Track 3 equity dashboard (one measure at a time, in real units,
// on a city map and a ranked list) and a policy simulator with four written rules, each shown before → after.
import { useMemo, useState } from 'react';
import { rankedTracts, tractById, tractLabel } from '../../lib/data';
import { useApp } from '../../lib/store';
import { cx } from '../../lib/format';
import type { MapPaint } from '../../lib/paint';
import { hud, placeById } from '../../lib/place/data';
import { ceilingRent } from '../../lib/place/afford';
import { usePlan } from '../../lib/place/planStore';
import { INCOME_LEVELS, LEVEL_LABEL } from '../../lib/place/plan';
import { MEASURES, buildLegend, measureById, measureValue, median, rankByNeed, type AmiPct, type MeasureId } from '../../lib/equity/measures';
import type { Row } from '../../lib/equity/policy';
import MapView from '../MapView';
import { Segmented } from '../primitives';
import PolicySimulator from './PolicySimulator';
import { nameOf } from './names';

interface MeasureRow {
  id: string;
  value: number | null;
}

function MeasurePicker({ value, onChange }: { value: MeasureId; onChange: (id: MeasureId) => void }) {
  return (
    <div role="radiogroup" aria-label="Measure to show" className="grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1 ring-1 ring-stone-200/70">
      {MEASURES.map((m) => {
        const on = m.id === value;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(m.id)}
            className={cx('rounded-lg px-2 py-1.5 text-caption font-semibold transition-colors', on ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' : 'text-slate-600 hover:text-slate-900')}
          >
            {m.short}
          </button>
        );
      })}
    </div>
  );
}

function RankTable({ rows, fmt, selectedId, onPick }: { rows: MeasureRow[]; fmt: (v: number | null) => string; selectedId: string | null; onPick: (id: string) => void }) {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, 10);
  return (
    <div>
      <ol className="divide-y divide-stone-100 rounded-lg bg-white ring-1 ring-stone-200/80">
        {shown.map((r, i) => {
          const t = tractById.get(r.id);
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onPick(r.id)}
                className={cx('flex w-full items-baseline gap-2 px-2.5 py-1 text-left text-small hover:bg-stone-50', r.id === selectedId && 'bg-violet-50')}
              >
                <span className="w-6 shrink-0 text-right text-caption text-slate-500 tnum">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium text-slate-900">{tractLabel(t)}</span> <span className="text-caption text-slate-500">{t?.name.replace('Tract ', 'tract ')}</span>
                </span>
                <span className="shrink-0 font-semibold text-slate-900 tnum">{fmt(r.value)}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={() => setAll(!all)} className="mt-1 text-caption font-semibold text-violet-700 hover:text-violet-900">
        {all ? 'Show the top 10 only' : `Show all ${rows.length} ranked tracts`}
      </button>
    </div>
  );
}

/** All six measures for the selected tract beside the city median. */
function TractCard({ id, ami, medians, onClose }: { id: string; ami: AmiPct; medians: Map<MeasureId, number | null>; onClose: () => void }) {
  const t = tractById.get(id);
  const p = placeById.get(id) ?? null;
  return (
    <div className="pointer-events-auto absolute left-3 top-3 z-10 w-[300px] rounded-xl bg-white/97 p-3 shadow-lg ring-1 ring-black/5 backdrop-blur">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-display text-body font-bold text-slate-900">{tractLabel(t)}</div>
          <div className="text-caption text-slate-500">
            {t?.name}
            {t && !t.residential ? ' · fewer than 25 households, not ranked' : ''}
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-md px-1.5 text-small text-slate-500 hover:bg-stone-100 hover:text-slate-900" aria-label="Close">
          ×
        </button>
      </div>
      <table className="mt-2 w-full text-caption">
        <thead>
          <tr className="text-slate-500">
            <th className="pb-1 text-left font-medium">Measure</th>
            <th className="pb-1 text-right font-medium">Here</th>
            <th className="pb-1 text-right font-medium">City median</th>
          </tr>
        </thead>
        <tbody>
          {MEASURES.map((m) => (
            <tr key={m.id} className="border-t border-stone-100">
              <td className="py-1 pr-2 text-slate-700">{m.short}</td>
              <td className="py-1 text-right font-semibold text-slate-900 tnum">{m.fmt(measureValue(m.id, p, hud, ami))}</td>
              <td className="py-1 text-right text-slate-600 tnum">{m.fmt(medians.get(m.id) ?? null)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1.5 text-caption text-slate-500">Rent gap at {ami}% AMI. Medians over the 114 ranked tracts.</p>
    </div>
  );
}

export default function EquityPolicyView({ active = true }: { active?: boolean }) {
  const selectedId = useApp((s) => s.selectedId);
  const lite = useApp((s) => s.lite);
  const select = useApp((s) => s.select);
  const level = usePlan((s) => s.level) as AmiPct;
  const setPlan = usePlan((s) => s.setPlan);
  const [measure, setMeasure] = useState<MeasureId>('rent_gap');
  const [flips, setFlips] = useState<Set<string>>(new Set());
  const def = measureById.get(measure)!;

  const rows: Row[] = useMemo(() => rankedTracts.filter((t) => placeById.has(t.GEOID)).map((t) => ({ id: t.GEOID, p: placeById.get(t.GEOID)! })), []);
  const medians = useMemo(() => new Map(MEASURES.map((m) => [m.id, median(rows.map((r) => measureValue(m.id, r.p, hud, level)).filter((v): v is number => v != null))])), [rows, level]);
  const values = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        value: measureValue(measure, r.p, hud, level),
      })),
    [rows, measure, level],
  );
  const ranked = useMemo(() => rankByNeed(values, def.higherIsNeed), [values, def]);
  const legend = useMemo(
    () =>
      buildLegend(
        def,
        values.map((v) => v.value).filter((v): v is number => v != null),
      ),
    [def, values],
  );
  const paint: MapPaint = useMemo(
    () => ({
      kind: 'cat',
      palette: legend.colors,
      values: new Map(values.map((v) => [v.id, legend.classOf(v.value)])),
    }),
    [legend, values],
  );
  const valueById = useMemo(() => new Map(values.map((v) => [v.id, v.value])), [values]);
  const available = values.filter((v) => v.value != null).length;
  const fits = hud ? ceilingRent(hud, level, 2) : null;
  const med = medians.get(measure) ?? null;

  if (!hud || placeById.size === 0) {
    return (
      <div className="grid h-full place-items-center pt-14 text-small text-slate-600">The place measures (place.json and the HUD table) are not built yet, so the equity dashboard cannot run.</div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#fbfaf8] pt-[96px]" data-active={active ? 'true' : 'false'}>
      <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto border-t border-stone-200/70">
        <div className="mx-auto max-w-[1440px] px-4 pb-12 pt-3">
          <header className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-3xl">
              <h1 className="font-display text-title font-bold text-slate-900">Equity dashboard</h1>
              <p className="text-small text-slate-600">
                Where rents outrun what people earn, and how close people live to jobs, schools, frequent transit and everyday services. One measure at a time, in real units, for the {rows.length}{' '}
                city tracts with at least 25 households. Darker = more need.
              </p>
            </div>
            <div className="text-right">
              <div className="mb-1 text-caption font-semibold text-slate-700">Income level for "what fits" (shared with the Place tab)</div>
              <Segmented
                size="xs"
                label="Income level"
                value={String(level)}
                onChange={(v) => setPlan({ level: Number(v) as AmiPct })}
                options={INCOME_LEVELS.map((l) => ({
                  value: String(l),
                  label: LEVEL_LABEL[l],
                }))}
              />
              {fits && (
                <div className="mt-1 text-caption text-slate-500">
                  2-bedroom that fits at {level}% AMI: {fits.formula} a month
                </div>
              )}
            </div>
          </header>

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]" aria-label="Equity dashboard">
            <div className="relative h-[560px] overflow-hidden rounded-2xl ring-1 ring-stone-200/80">
              <MapView
                paint={paint}
                selectedId={selectedId}
                flips={flips}
                lite={lite}
                terrain={false}
                buildings={false}
                hillshade={false}
                onSelect={select}
                tooltip={(id) => (
                  <div className="max-w-64">
                    <div className="font-semibold">{nameOf(id)}</div>
                    <div className="text-caption text-white/75">{tractById.get(id)?.name}</div>
                    <div className="mt-1">
                      {def.short}: <b>{tractById.get(id)?.residential ? def.fmt(valueById.get(id) ?? null) : 'not ranked'}</b>
                    </div>
                  </div>
                )}
              />
              {selectedId && <TractCard id={selectedId} ami={level} medians={medians} onClose={() => select(null)} />}
              <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-xl bg-white/95 px-3 py-2 shadow-lg ring-1 ring-black/5">
                <div className="mb-1 text-caption font-semibold text-slate-800">
                  {def.title} ({def.unit})
                </div>
                <ul className="space-y-0.5">
                  {legend.items.map((it) => (
                    <li key={it.label} className="flex items-center gap-1.5 text-caption text-slate-700">
                      <span className="inline-block h-3 w-4 rounded-sm ring-1 ring-black/10" style={{ background: it.color }} />
                      {it.label}
                    </li>
                  ))}
                  <li className="flex items-center gap-1.5 text-caption text-slate-500">
                    <span className="inline-block h-3 w-4 rounded-sm bg-[#e7e5e4] ring-1 ring-black/10" />
                    no data or not ranked
                  </li>
                  {flips.size > 0 && (
                    <li className="flex items-center gap-1.5 text-caption text-slate-700">
                      <span className="inline-block h-3 w-4 rounded-sm ring-2 ring-slate-900" />
                      changed by the levers switched on ({flips.size})
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-2.5">
              <MeasurePicker value={measure} onChange={setMeasure} />
              <div className="rounded-xl bg-white p-3 ring-1 ring-stone-200/80">
                <h2 className="font-display text-lead font-bold text-slate-900">{def.title}</h2>
                <p className="mt-0.5 text-small text-slate-700">{def.definition(level)}</p>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-caption">
                  <dt className="text-slate-500">Units</dt>
                  <dd className="text-slate-800">{def.unit}</dd>
                  <dt className="text-slate-500">City median</dt>
                  <dd className="font-semibold text-slate-900 tnum">
                    {def.fmt(med)}{' '}
                    <span className="font-normal text-slate-500">
                      ({available} of {rows.length} tracts have a value)
                    </span>
                  </dd>
                  <dt className="text-slate-500">Source</dt>
                  <dd className="text-slate-700">{def.source}</dd>
                </dl>
              </div>
              <div>
                <h3 className="mb-1 text-small font-semibold text-slate-900">Most need first {def.higherIsNeed ? '(highest value)' : '(lowest value)'}</h3>
                <RankTable rows={ranked} fmt={def.fmt} selectedId={selectedId} onPick={select} />
              </div>
            </div>
          </section>

          <PolicySimulator rows={rows} ami={level} selectedId={selectedId} onFlips={setFlips} />
        </div>
      </div>
    </div>
  );
}
