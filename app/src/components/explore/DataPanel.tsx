import { useApp, type Level } from '../../lib/store';
import { BROWSE_LEVELS, LEVEL_LABEL, LEVEL_LAYER, groups, hasBrowser, isCountyWide, levelMeta, variableById, variablesByGroup } from '../../lib/explore/catalog';
import { isAnalysis, isAnalysisGroup } from '../../lib/explore/analysisVars';
import { EXPLORE_UI, LAYER_ROWS, scopeText } from '../../lib/explore/copy';
import type { Loaded, UnitFC, VariableDef } from '../../lib/explore/types';
import { cx } from '../../lib/format';
import { RailSection } from '../Rail';
import { Dot, Explainer, Segmented } from '../primitives';

function VarRow({ v, on, onPick }: { v: VariableDef; on: boolean; onPick: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onPick} className={cx('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition', on ? 'bg-violet-50 ring-2 ring-violet-500' : 'ring-1 ring-transparent hover:bg-stone-50')}>
      <span className={cx('h-3.5 w-3.5 shrink-0 rounded-full border-2', on ? 'border-violet-600' : 'border-stone-300')} style={on ? { background: 'radial-gradient(circle, #7c3aed 45%, transparent 50%)' } : undefined} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-small font-medium text-slate-900">{v.label}</span>
        <span className="block text-caption text-slate-600 tnum">{v.table_id}</span>
      </span>
      <span className="shrink-0 rounded-md bg-stone-100 px-1.5 py-px text-caption font-semibold text-slate-600 ring-1 ring-stone-200" title={`Unit: ${v.unit}`}>
        {EXPLORE_UI.unitBadge[v.unit]}
      </span>
    </button>
  );
}

/** Data: geography, scope, and the variable catalogue as radio rows grouped by topic. */
export default function DataPanel({ geo }: { geo: Loaded<UnitFC> }) {
  const browse = useApp((s) => s.browse);
  const layers = useApp((s) => s.layers);
  const setBrowse = useApp((s) => s.setBrowse);
  const setLayer = useApp((s) => s.setLayer);
  const set = useApp((s) => s.set);
  const level = browse.level;
  const layerId = LEVEL_LAYER[level];
  const meta = levelMeta(level);
  const n = geo.data.features.length;
  const chip = scopeText(n, LEVEL_LABEL[level].many, geo.source === 'supabase', isCountyWide(level));
  const layerLabel = LAYER_ROWS.find((r) => r.id === layerId)?.label ?? layerId;

  const pickLevel = (l: Level) => {
    setBrowse({ level: l });
    setLayer(LEVEL_LAYER[l], true);
  };
  const pickVariable = (id: string) => {
    if (isAnalysis(variableById.get(id))) {
      setBrowse({ variable: id, level: 'tract' });
      setLayer('tracts', true);
      return;
    }
    setBrowse({ variable: id });
    setLayer(layerId, true);
  };

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
      sub={EXPLORE_UI.dataSub}
      right={
        browse.variable ? (
          <button onClick={() => setBrowse({ variable: null })} className="text-small font-semibold text-violet-700 hover:underline">
            {EXPLORE_UI.clear}
          </button>
        ) : undefined
      }
    >
      <Segmented full value={level} options={BROWSE_LEVELS.map((l) => ({ value: l, label: EXPLORE_UI.levelShort[l] }))} onChange={pickLevel} />
      <div className="mt-2 flex items-center gap-1.5 text-caption text-slate-600" title={`${meta.bundled} bundled with the app · ${meta.total} county-wide when online`}>
        <span className={cx('inline-block h-2 w-2 rounded-full', geo.source === 'supabase' ? 'bg-emerald-500' : 'bg-stone-400')} aria-hidden />
        <span className="tnum">{chip}</span>
      </div>
      {browse.variable && !layers[layerId] && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-caption text-amber-900 ring-1 ring-amber-200" role="status">
          <span>{EXPLORE_UI.turnOn(layerLabel)}</span>
          <button onClick={() => setLayer(layerId, true)} className="shrink-0 font-semibold underline-offset-2 hover:underline">
            {EXPLORE_UI.turnOnButton}
          </button>
        </div>
      )}
      <div className="mt-3 space-y-1.5">
        {groups.map((g, i) => {
          const vars = variablesByGroup(g.id);
          const contains = vars.some((v) => v.id === browse.variable);
          return (
            <Explainer
              key={`${g.id}-${contains ? 'sel' : ''}`}
              tone="card"
              defaultOpen={i === 0 || contains}
              title={
                <span>
                  <span className="block">{g.label}</span>
                  <span className="block text-caption font-normal text-slate-600">
                    {vars.length} variables{isAnalysisGroup(g.id) ? ' · city tracts only' : ''}
                  </span>
                </span>
              }
              right={contains ? <Dot color="#7c3aed" size={8} /> : undefined}
            >
              <div role="radiogroup" aria-label={g.label} className="space-y-0.5">
                {vars.map((v) => (
                  <VarRow key={v.id} v={v} on={v.id === browse.variable} onPick={() => pickVariable(v.id)} />
                ))}
              </div>
            </Explainer>
          );
        })}
      </div>
      <p className="mt-3 text-caption text-slate-600">
        {EXPLORE_UI.footer} ·{' '}
        <button onClick={() => set({ sourcesOpen: true })} className="font-semibold text-violet-700 hover:underline">
          {EXPLORE_UI.sourcesLink}
        </button>
      </p>
    </RailSection>
  );
}
