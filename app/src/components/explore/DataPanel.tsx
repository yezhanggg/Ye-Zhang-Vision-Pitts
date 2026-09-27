import { useApp } from '../../lib/store';
import { LEVEL_LABEL, LEVEL_LAYER, groups, hasBrowser, variablesByGroup } from '../../lib/explore/catalog';
import { isAnalysisGroup } from '../../lib/explore/analysisVars';
import { EXPLORE_UI } from '../../lib/explore/copy';
import type { VariableDef } from '../../lib/explore/types';
import { cx } from '../../lib/format';
import { RailSection } from '../Rail';
import { Dot, Explainer } from '../primitives';
import { LandUseMapSwitch, ZoningMapSwitch } from './LayersPanel';

function VarRow({ v, on, onPick }: { v: VariableDef; on: boolean; onPick: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onPick} className={cx('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition', on ? 'bg-violet-50 ring-2 ring-violet-500' : 'ring-1 ring-transparent hover:bg-stone-50')}>
      <span className={cx('h-3.5 w-3.5 shrink-0 rounded-full border-2', on ? 'border-violet-600' : 'border-stone-300')} style={on ? { background: 'radial-gradient(circle, #7c3aed 45%, transparent 50%)' } : undefined} />
      <span className="min-w-0 flex-1 truncate text-small font-medium text-slate-900">{v.label}</span>
      <span className="shrink-0 rounded-md bg-stone-100 px-1.5 py-px text-caption font-semibold text-slate-600 ring-1 ring-stone-200" title={`Unit: ${v.unit}`}>
        {EXPLORE_UI.unitBadge[v.unit]}
      </span>
    </button>
  );
}

/** Data: the variables of whichever boundary is open, as radio rows grouped by topic. */
export default function DataPanel() {
  const browse = useApp((s) => s.browse);
  const layers = useApp((s) => s.layers);
  const setBrowse = useApp((s) => s.setBrowse);
  const set = useApp((s) => s.set);
  const level = browse.level;
  const open = layers[LEVEL_LAYER[level]];
  // The Analysis layers exist for city tracts only, so they are listed with the tract boundary.
  const shown = groups.filter((g) => level === 'tract' || !isAnalysisGroup(g.id));

  if (!hasBrowser) {
    return (
      <RailSection id="data" title={EXPLORE_UI.data}>
        <p className="rounded-xl bg-stone-100 px-3 py-2 text-small text-slate-700 ring-1 ring-stone-200">{EXPLORE_UI.notBuilt}</p>
      </RailSection>
    );
  }

  return (
    <RailSection
      id="data"
      title={EXPLORE_UI.data}
      sub={open ? EXPLORE_UI.dataSub(LEVEL_LABEL[level].many) : undefined}
      right={
        open && browse.variable ? (
          <button onClick={() => setBrowse({ variable: null })} className="text-small font-semibold text-violet-700 hover:underline">
            {EXPLORE_UI.clear}
          </button>
        ) : undefined
      }
    >
      {!open ? (
        <p className="rounded-xl bg-stone-100 px-3 py-2 text-small text-slate-700 ring-1 ring-stone-200">{EXPLORE_UI.dataClosed}</p>
      ) : (
        <>
          <div className="space-y-1.5">
            {shown.map((g) => {
              const vars = variablesByGroup(g.id);
              const contains = vars.some((v) => v.id === browse.variable);
              return (
                <Explainer
                  key={`${g.id}-${contains ? 'sel' : ''}`}
                  tone="card"
                  defaultOpen={contains}
                  title={
                    <span>
                      <span className="block">{g.label}</span>
                      <span className="block text-caption font-normal text-slate-600">
                        {vars.length} variables{isAnalysisGroup(g.id) ? ` · ${EXPLORE_UI.cityTractsOnly}` : g.id === 'zoning' ? ` · ${EXPLORE_UI.zoningCityOnly}` : ''}
                      </span>
                    </span>
                  }
                  right={contains ? <Dot color="#7c3aed" size={8} /> : undefined}
                >
                  {g.id === 'zoning' && (
                    <div className="mb-1.5">
                      <ZoningMapSwitch id="data-zoning-map" />
                    </div>
                  )}
                  {g.id === 'land' && (
                    <div className="mb-1.5">
                      <LandUseMapSwitch id="data-landuse-map" />
                    </div>
                  )}
                  <div role="radiogroup" aria-label={g.label} className="space-y-0.5">
                    {vars.map((v) => (
                      <VarRow key={v.id} v={v} on={v.id === browse.variable} onPick={() => setBrowse({ variable: v.id })} />
                    ))}
                  </div>
                </Explainer>
              );
            })}
          </div>
          <p className="mt-3 text-caption text-slate-600">
            {EXPLORE_UI.footer} ·{' '}
            <button onClick={() => set({ sourcesOpen: true, detailsTab: 'sources' })} className="font-semibold text-violet-700 hover:underline">
              {EXPLORE_UI.sourcesLink}
            </button>
          </p>
        </>
      )}
    </RailSection>
  );
}
