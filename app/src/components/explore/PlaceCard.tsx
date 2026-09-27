import { useMemo } from 'react';
import { useApp, type Level } from '../../lib/store';
import { LEVEL_LABEL, groups, unitSubtitle, unitTitle, variablesByGroup } from '../../lib/explore/catalog';
import { fmtValue } from '../../lib/explore/bins';
import { isAnalysisGroup } from '../../lib/explore/analysisVars';
import { EXPLORE_UI } from '../../lib/explore/copy';
import { useUnit } from '../../lib/explore/remote';
import type { Loaded, UnitFC, ValueMap, VariableDef } from '../../lib/explore/types';
import PlaceSummary, { VariableDetail } from './PlaceSummary';
import { Explainer } from '../primitives';
import ExportMenu from '../export/ExportMenu';
import { profileExportItems } from '../export/exploreExport';

/**
 * Right panel for a selected place. With a variable painted it shows that variable for this place and nothing
 * else; without one it shows the summary of everything, with every variable one click away at the bottom.
 */
export default function PlaceCard({ selected, fc, variable = null, values = null }: { selected: { level: Level; geoid: string }; fc: UnitFC; variable?: VariableDef | null; values?: Loaded<ValueMap> | null }) {
  const { level, geoid } = selected;
  const set = useApp((s) => s.set);
  const setBrowse = useApp((s) => s.setBrowse);
  const props = useMemo(() => fc.features.find((f) => f.properties.GEOID === geoid)?.properties ?? null, [fc, geoid]);
  const unit = useUnit(level, geoid);
  const share = props?.pgh_share;
  const sub = unitSubtitle(props);
  const loading = unit.loading && !unit.values;

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-stone-100 bg-white/95 px-5 pb-3 pt-4 backdrop-blur">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate font-display text-title font-bold text-slate-900">{props ? unitTitle(props) : geoid}</h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-slate-600 tnum">
              {sub && <span>{sub}</span>}
              <span className="rounded-full bg-stone-100 px-2 py-px text-caption font-semibold text-slate-700 ring-1 ring-stone-200">{LEVEL_LABEL[level].one}</span>
              {level !== 'muni' && typeof share === 'number' && share < 0.995 && <span className="text-caption">{EXPLORE_UI.insideCity(Math.max(1, Math.round(share * 100)))}</span>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ExportMenu items={profileExportItems(level, geoid, props, unit.values, variable, values)} />
          <button onClick={() => setBrowse({ selected: null })} className="rounded-lg p-1.5 text-slate-500 hover:bg-stone-100 hover:text-slate-900" aria-label={EXPLORE_UI.place.close} title={EXPLORE_UI.place.close}>
            <svg viewBox="0 0 20 20" className="h-4 w-4">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          </div>
        </div>
      </div>
      <div className="space-y-5 p-4">
        {variable ? (
          <VariableDetail level={level} geoid={geoid} variable={variable} values={values} unit={unit.values} />
        ) : loading ? (
          <div className="rounded-xl bg-stone-50 px-3 py-6 text-center text-small text-slate-600 ring-1 ring-stone-200">Loading…</div>
        ) : !unit.values ? (
          <div className="hatch rounded-xl px-3 py-3 text-small text-slate-700 ring-1 ring-stone-200">No figures for this place. Places outside Pittsburgh need the online version.</div>
        ) : (
          <>
            <PlaceSummary level={level} geoid={geoid} unit={unit.values} />
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
                {groups.filter((g) => !isAnalysisGroup(g.id)).map((g) => (
                  <Explainer key={g.id} title={g.label}>
                    <ul className="divide-y divide-stone-100">
                      {variablesByGroup(g.id).map((v) => (
                        <li key={v.id} className="flex items-center gap-2 py-1.5 text-small">
                          <span className="min-w-0 flex-1 truncate text-slate-800">{v.label}</span>
                          <span className="shrink-0 font-semibold text-slate-900 tnum">{fmtValue(unit.values?.[v.id]?.est, v.unit)}</span>
                          <button onClick={() => setBrowse({ variable: v.id })} className="shrink-0 rounded-full bg-white px-2 py-0.5 text-caption font-semibold text-violet-700 ring-1 ring-violet-200 transition hover:bg-violet-50">
                            {EXPLORE_UI.place.showOnMap}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </Explainer>
                ))}
              </div>
            </Explainer>
          </>
        )}
        <p className="text-caption text-slate-600">
          {variable && variable.source === 'analysis' ? EXPLORE_UI.analysisOnly : variable ? EXPLORE_UI.sourceOf(variable.source) : EXPLORE_UI.footer} ·{' '}
          <button onClick={() => set({ sourcesOpen: true, detailsTab: 'sources' })} className="font-semibold text-violet-700 hover:underline">
            {EXPLORE_UI.sourcesLink}
          </button>
        </p>
      </div>
    </div>
  );
}
