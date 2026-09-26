import { useMemo } from 'react';
import { tractById } from '../../lib/data';
import { useApp, type Level } from '../../lib/store';
import { KEY_VARS, LEVEL_LABEL, LEVEL_LAYER, RELIABILITY, groups, reference, unitSubtitle, unitTitle, variableById, variablesByGroup } from '../../lib/explore/catalog';
import { finite, fmtEstimate, fmtMoe, fmtValue, reliability } from '../../lib/explore/bins';
import { EXPLORE_UI } from '../../lib/explore/copy';
import { useUnit } from '../../lib/explore/remote';
import type { Estimate, UnitFC, VariableDef } from '../../lib/explore/types';
import { cx } from '../../lib/format';
import type { Conf } from '../../lib/types';
import { Button, ConfChip, Dot, Explainer, SectionTitle } from '../primitives';

const CONF_COLOR: Record<Conf, string> = { high: '#10b981', medium: '#f59e0b', low: '#f43f5e' };

/** ▲ / ▼ / ≈ against the city value (2% band). */
function Direction({ a, b }: { a: number | null | undefined; b: number | null | undefined }) {
  if (!finite(a) || !finite(b)) return null;
  const rel = b === 0 ? (a > 0 ? 1 : 0) : (a - b) / Math.abs(b);
  const glyph = rel > 0.02 ? '▲' : rel < -0.02 ? '▼' : '≈';
  const word = rel > 0.02 ? 'higher than' : rel < -0.02 ? 'lower than' : 'about the same as';
  return (
    <span className="ml-1 text-caption text-slate-500" title={`${word} the city value`} aria-label={`${word} the city`}>
      {glyph}
    </span>
  );
}

function KeyRow({ v, e, onMap, onShow }: { v: VariableDef; e: Estimate | undefined; onMap: boolean; onShow: () => void }) {
  const ref = reference(v.id);
  return (
    <tr className="border-t border-stone-100 align-top">
      <td className="px-3 py-1.5">
        <div className="text-slate-800">{v.label}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <ConfChip conf={reliability(e?.cv, RELIABILITY)} />
          <button onClick={onShow} className={cx('text-caption font-semibold', onMap ? 'text-slate-500' : 'text-violet-700 hover:underline')} disabled={onMap}>
            {onMap ? EXPLORE_UI.place.onMap : EXPLORE_UI.place.showOnMap}
          </button>
        </div>
      </td>
      <td className="px-2 py-1.5 text-right tnum">
        <div className="font-semibold text-slate-900">
          {fmtValue(e?.est, v.unit)}
          {v.unit !== 'count' && <Direction a={e?.est} b={ref.city?.est} />}
        </div>
        {typeof e?.moe === 'number' && <div className="text-caption text-slate-600">± {fmtMoe(e.moe, v.unit)}</div>}
      </td>
      <td className="px-2 py-1.5 text-right text-slate-700 tnum">{fmtValue(ref.city?.est, v.unit)}</td>
      <td className="px-3 py-1.5 text-right text-slate-700 tnum">{fmtValue(ref.county?.est, v.unit)}</td>
    </tr>
  );
}

/** Right panel for a selected unit: headline table against city and county, every variable by group, and the way into Match. */
export default function PlaceCard({ selected, fc }: { selected: { level: Level; geoid: string }; fc: UnitFC }) {
  const { level, geoid } = selected;
  const browse = useApp((s) => s.browse);
  const set = useApp((s) => s.set);
  const setBrowse = useApp((s) => s.setBrowse);
  const setLayer = useApp((s) => s.setLayer);
  const setMode = useApp((s) => s.setMode);
  const props = useMemo(() => fc.features.find((f) => f.properties.GEOID === geoid)?.properties ?? null, [fc, geoid]);
  const unit = useUnit(level, geoid);
  const share = props?.pgh_share;
  const sub = unitSubtitle(props);
  const isCityTract = level === 'tract' && tractById.has(geoid);
  const show = (id: string) => {
    setBrowse({ variable: id, level });
    setLayer(LEVEL_LAYER[level], true);
  };
  const painted = (id: string) => browse.variable === id && browse.level === level;

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-stone-100 bg-white/95 px-5 pb-3 pt-4 backdrop-blur">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate font-display text-title font-bold text-slate-900">{props ? unitTitle(props) : geoid}</h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-slate-600 tnum">
              {sub && <span>{sub}</span>}
              <span className="rounded-full bg-stone-100 px-2 py-px text-caption font-semibold text-slate-700 ring-1 ring-stone-200">{LEVEL_LABEL[level].one}</span>
              {typeof share === 'number' && share < 0.995 && <span className="text-caption">{EXPLORE_UI.insideCity(Math.max(1, Math.round(share * 100)))}</span>}
              {unit.source === 'supabase' && <span className="text-caption text-emerald-700">online</span>}
            </div>
          </div>
          <button onClick={() => setBrowse({ selected: null })} className="rounded-lg p-1.5 text-slate-500 hover:bg-stone-100 hover:text-slate-900" aria-label={EXPLORE_UI.place.close}>
            <svg viewBox="0 0 20 20" className="h-4 w-4">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      <div className="space-y-6 p-5">
        {isCityTract && (
          <Button className="w-full" onClick={() => {
            set({ selectedId: geoid });
            setMode('match');
          }}>
            {EXPLORE_UI.place.openMatch}
          </Button>
        )}
        <section>
          <SectionTitle sub="Estimate with its 90% margin · ▲▼ against the city value">{EXPLORE_UI.place.keyTable}</SectionTitle>
          {unit.loading && !unit.values ? (
            <div className="rounded-xl bg-stone-50 px-3 py-6 text-center text-small text-slate-600 ring-1 ring-stone-200">Loading county-wide values…</div>
          ) : !unit.values ? (
            <div className="hatch rounded-xl px-3 py-3 text-small text-slate-700 ring-1 ring-stone-200">No values for this unit. County-wide values need the online data; over file:// only the city subset is available.</div>
          ) : (
            <div className="overflow-hidden rounded-xl ring-1 ring-stone-200">
              <table className="w-full text-small">
                <thead className="bg-stone-50 text-caption font-semibold text-slate-700">
                  <tr>
                    <th className="px-3 py-1.5 text-left font-semibold">Variable</th>
                    <th className="px-2 py-1.5 text-right font-semibold">{EXPLORE_UI.place.thisPlace}</th>
                    <th className="px-2 py-1.5 text-right font-semibold">{EXPLORE_UI.place.city}</th>
                    <th className="px-3 py-1.5 text-right font-semibold">{EXPLORE_UI.place.county}</th>
                  </tr>
                </thead>
                <tbody>
                  {KEY_VARS.map((id) => {
                    const v = variableById.get(id);
                    if (!v) return null;
                    return <KeyRow key={id} v={v} e={unit.values?.[id]} onMap={painted(id)} onShow={() => show(id)} />;
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {unit.values && (
          <Explainer
            tone="card"
            title={
              <span>
                <span className="block">{EXPLORE_UI.place.allVars}</span>
                <span className="block text-caption font-normal text-slate-600">{EXPLORE_UI.place.allVarsSub}</span>
              </span>
            }
          >
            <div className="space-y-2 pt-1">
              {groups.map((g) => (
                <Explainer key={g.id} title={g.label}>
                  <ul className="divide-y divide-stone-100">
                    {variablesByGroup(g.id).map((v) => {
                      const e = unit.values?.[v.id];
                      const r = reliability(e?.cv, RELIABILITY);
                      const on = painted(v.id);
                      return (
                        <li key={v.id} className="flex items-center gap-2 py-1.5 text-small">
                          <Dot color={r ? CONF_COLOR[r] : '#d6d3d1'} size={8} />
                          <span className="min-w-0 flex-1" title={r ? `Reliability: ${r}` : 'No reliability (no value)'}>
                            <span className="block truncate text-slate-800">{v.label}</span>
                            <span className="block text-caption text-slate-600 tnum">{fmtEstimate(e, v.unit)}</span>
                          </span>
                          <button onClick={() => show(v.id)} className={cx('shrink-0 rounded-full px-2 py-0.5 text-caption font-semibold ring-1 transition', on ? 'bg-violet-600 text-white ring-violet-700' : 'bg-white text-violet-700 ring-violet-200 hover:bg-violet-50')}>
                            {on ? EXPLORE_UI.place.onMap : EXPLORE_UI.place.showOnMap}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </Explainer>
              ))}
            </div>
          </Explainer>
        )}
        <p className="text-caption text-slate-600">
          {EXPLORE_UI.footer} · {unit.source === 'supabase' ? 'county-wide values (online)' : 'bundled city subset'} ·{' '}
          <button onClick={() => set({ sourcesOpen: true })} className="font-semibold text-violet-700 hover:underline">
            {EXPLORE_UI.sourcesLink}
          </button>
        </p>
      </div>
    </div>
  );
}
