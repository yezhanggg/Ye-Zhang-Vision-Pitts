import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MousePointerClick, X } from 'lucide-react';
import type { ExpressionSpecification } from 'maplibre-gl';
import { useApp, type Level } from '../../lib/store';
import type { MapPaint } from '../../lib/paint';
import { LEVEL_LAYER, unitSubtitle, unitTitle, variableById } from '../../lib/explore/catalog';
import { browsePaint, estimates, extent, quantileBreaks } from '../../lib/explore/bins';
import { BOUNDARY_STYLE, EXPLORE_UI } from '../../lib/explore/copy';
import { useGeo, useVariable } from '../../lib/explore/remote';
import { resolveForLevel } from '../../lib/explore/search';
import type { Loaded, UnitProps, ValueMap } from '../../lib/explore/types';
import { analysisPaint, analysisValues, isAnalysis } from '../../lib/explore/analysisVars';
import type { ChatScope } from '../../lib/explore/chat';
import { useAllResults } from '../../lib/derived';
import { cx } from '../../lib/format';
import MapView, { type IntroPhase, type OverlayLayer } from '../MapView';
import IntroOverlay from '../IntroOverlay';
import PanelFrame from '../PanelFrame';
import Rail, { RailSection } from '../Rail';
import TractSearch from '../TractSearch';
import ChatBox from './ChatBox';
import DataLegend from './DataLegend';
import DataPanel from './DataPanel';
import DataTooltip from './DataTooltip';
import ScopeOverview from './ScopeOverview';
import { BoundaryPanel, SettingsPanel } from './LayersPanel';
import PlaceCard from './PlaceCard';
import VariableSummary from './VariableSummary';

/** The built-in tract layers are hidden in Explore; this keeps their paint effect inert. */
const EMPTY_PAINT: MapPaint = { kind: 'cat', palette: ['#e7e5e4'], values: new Map() };
const zoomWidth = (z0: number, w0: number, z1: number, w1: number) => ['interpolate', ['linear'], ['zoom'], z0, w0, z1, w1] as unknown as ExpressionSpecification;

type BoundaryId = 'tracts' | 'bg' | 'zcta' | 'muni' | 'city';
const NEUTRAL_FILL = { color: '#64748b', opacity: 0.08 };
const SKIP_KEY = 'visionpitts.skipIntro';
const readSkip = () => {
  try {
    return localStorage.getItem(SKIP_KEY) === '1';
  } catch {
    return false;
  }
};

/** Line style for a boundary from the shared table; the open boundary gets a slightly heavier line. Casings and name labels follow the table. */
function lineFor(id: BoundaryId, active: boolean): OverlayLayer['line'] {
  const s = BOUNDARY_STYLE[id];
  const [z0, w0, z1, w1] = s.widths;
  const bump = active ? 0.6 : 0;
  return {
    color: s.color,
    width: zoomWidth(z0, w0 + bump, z1, w1 + bump),
    dash: s.dash,
    opacity: 1,
    casing: s.casing ? { color: '#ffffff', width: zoomWidth(z0, w0 + bump + 2.4, z1, w1 + bump + 2.4), opacity: 0.85 } : undefined,
    label: s.labels ? { field: 'name', minzoom: s.labels, color: s.color } : undefined,
  };
}

const indexOf = (features: { properties: UnitProps }[]) => new Map(features.map((f) => [f.properties.GEOID, f.properties]));

export default function ExploreView() {
  const layers = useApp((s) => s.layers);
  const browse = useApp((s) => s.browse);
  const lite = useApp((s) => s.lite);
  const pin = useApp((s) => s.pin);
  const hoverId = useApp((s) => s.hoverId);
  const left = useApp((s) => s.ui.left);
  const panelOpen = useApp((s) => s.browsePanel);
  const hintClosed = useApp((s) => s.hintClosed);
  const setBrowse = useApp((s) => s.setBrowse);
  const set = useApp((s) => s.set);
  // The globe → Pittsburgh flight plays once after the landing page's Open button (not on deep links, not with reduced motion).
  const [intro] = useState(() => useApp.getState().introNonce > 0 && !useApp.getState().introDone && !readSkip() && !lite);
  const [phase, setPhase] = useState<IntroPhase>(intro ? 'spin' : 'done');
  const [skip, setSkip] = useState(0);

  // One boundary is open at a time (or none). "Pittsburgh only" keeps its shapes to the city and draws the city limits.
  const level: Level = browse.level;
  const layerId = LEVEL_LAYER[level];
  const open = layers[layerId];
  const cityOnly = layers.city && level !== 'muni';
  const browseGeo = useGeo(level, cityOnly);
  const cityGeo = useGeo('city');
  const variable = open && browse.variable ? variableById.get(browse.variable) ?? null : null;
  const analysis = isAnalysis(variable) ? variable : null;
  const selected = open ? browse.selected : null;
  // Analysis layers are computed in the browser from the tract properties and the current priorities.
  const weights = useApp((s) => s.weights);
  const results = useAllResults(weights);
  const loadedAcs = useVariable(level, analysis ? null : variable?.id ?? null, cityOnly);
  const loaded = useMemo<Loaded<ValueMap> | null>(() => {
    if (!analysis) return loadedAcs;
    if (level !== 'tract') return null;
    return { data: analysisValues(analysis, results), source: 'bundled', scope: 'city' };
  }, [analysis, level, results, loadedAcs]);
  const values = loaded?.data ?? null;

  const fixedPaint = useMemo(() => (analysis && values ? analysisPaint(analysis, values) : null), [analysis, values]);
  const breaks = useMemo(() => (values && !fixedPaint ? quantileBreaks(estimates(values), 5) : []), [values, fixedPaint]);
  const ext = useMemo(() => (values && !fixedPaint ? extent(estimates(values)) : null), [values, fixedPaint]);
  const fillPaint = useMemo(() => fixedPaint ?? (values ? browsePaint(values, breaks) : null), [fixedPaint, values, breaks]);
  const browseIndex = useMemo(() => indexOf(browseGeo.data.features), [browseGeo.data]);
  const selectedProps = selected ? browseIndex.get(selected.geoid) ?? null : null;
  const resolve = useMemo(() => resolveForLevel(level, browseGeo.data), [level, browseGeo.data]);
  // The map keeps its focus clear of whichever panels are open.
  const padding = useMemo(() => ({ top: 90, bottom: 90, left: left ? 420 : 70, right: panelOpen ? 500 : 70 }), [left, panelOpen]);

  const overlays = useMemo<OverlayLayer[]>(() => {
    const out: OverlayLayer[] = [];
    if (open) {
      out.push({
        id: layerId,
        data: browseGeo.data,
        idField: 'GEOID',
        line: lineFor(layerId, true),
        selectedId: selected?.geoid ?? null,
        fill: fillPaint ? { paint: fillPaint } : NEUTRAL_FILL,
        interactive: true,
        zoomTo: true,
        tooltip: (gid) => <DataTooltip geoid={gid} props={browseIndex.get(gid) ?? null} variable={variable} estimate={values?.get(gid)} />,
        onSelect: (geoid) => setBrowse({ selected: { level, geoid } }),
      });
    }
    if (cityOnly) out.push({ id: 'city', data: cityGeo.data, idField: 'GEOID', line: lineFor('city', false), selectedId: null });
    return out;
  }, [open, layerId, level, cityOnly, browseGeo.data, cityGeo.data, selected, fillPaint, browseIndex, variable, values, setBrowse]);

  const chat = useMemo<ChatScope>(() => ({ level, cityOnly, fc: browseGeo.data, selected: selected?.geoid ?? null, variable, values, weights }), [level, cityOnly, browseGeo.data, selected, variable, values, weights]);
  const panelKey = selected ? `place:${selected.level}:${selected.geoid}:${variable?.id ?? ''}` : variable ? `var:${variable.id}` : 'overview';
  const showHint = phase === 'done' && open && !variable && !selected && !hintClosed;

  return (
    <div className="relative h-full">
      <MapView
        paint={EMPTY_PAINT}
        selectedId={null}
        baseTracts={false}
        lite={lite}
        terrain={layers.terrain}
        terrainAlways={layers.terrain}
        buildings={layers.buildings}
        hillshade={layers.hillshade}
        pin={pin}
        elevationReadout
        overlays={overlays}
        onHover={(id) => {
          if (useApp.getState().hoverId !== id) set({ hoverId: id });
        }}
        padding={padding}
        intro={intro}
        skipSignal={skip}
        onIntroPhase={(p) => {
          setPhase(p);
          if (p === 'done') set({ introDone: true });
        }}
      />
      <IntroOverlay
        phase={phase}
        onSkip={() => {
          try {
            localStorage.setItem(SKIP_KEY, '1');
          } catch {
            /* private mode */
          }
          setSkip((n) => n + 1);
        }}
      />
      {phase === 'done' && (
        <Rail float title={EXPLORE_UI.intro.kicker}>
          <RailSection id="search" title="Search">
            <TractSearch
              value={selected?.geoid ?? null}
              onChange={(geoid) => setBrowse({ selected: { level, geoid } })}
              label={EXPLORE_UI.search}
              placeholder={EXPLORE_UI.searchPlaceholder}
              showQuickPicks={false}
              resolve={resolve}
              currentLabel={selectedProps ? [unitTitle(selectedProps), unitSubtitle(selectedProps)].filter(Boolean).join(' · ') : null}
              outsideText={EXPLORE_UI.outsideScope(browseGeo.scope)}
            />
          </RailSection>
          <RailSection id="layers" title={EXPLORE_UI.layers} sub={EXPLORE_UI.layersSub}>
            <BoundaryPanel />
          </RailSection>
          <DataPanel />
          <RailSection id="settings" title={EXPLORE_UI.settings} sub={EXPLORE_UI.settingsSub}>
            <SettingsPanel />
          </RailSection>
        </Rail>
      )}
      {/* Right column: the question box on top, the summary (or its small tab) underneath. */}
      {phase === 'done' && (
        <div className="pointer-events-none absolute bottom-3 right-3 top-3 z-20 flex w-[440px] flex-col items-end gap-2">
          <ChatBox scope={chat} />
          <PanelFrame inline open={panelOpen} onToggle={(o) => set({ browsePanel: o })} title={EXPLORE_UI.summaryTab}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={panelKey} initial={lite ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={lite ? undefined : { opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
                {selected ? <PlaceCard selected={selected} fc={browseGeo.data} variable={variable} values={loaded} /> : variable && loaded ? <VariableSummary variable={variable} level={level} values={loaded} fc={browseGeo.data} /> : <ScopeOverview />}
              </motion.div>
            </AnimatePresence>
          </PanelFrame>
        </div>
      )}
      <AnimatePresence>
        {showHint && (
          <motion.div key="hint" initial={lite ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute left-1/2 top-16 z-20 -translate-x-1/2" role="status">
            <div className="flex items-center gap-2 rounded-full bg-slate-900/90 py-1.5 pl-3.5 pr-1.5 text-small font-medium text-white shadow-lg backdrop-blur">
              <MousePointerClick className="h-4 w-4 shrink-0 text-violet-200" />
              <span className="whitespace-nowrap">{EXPLORE_UI.hint}</span>
              <button onClick={() => set({ hintClosed: true })} className="grid h-6 w-6 place-items-center rounded-full text-white/70 hover:bg-white/15 hover:text-white" aria-label={EXPLORE_UI.hintClose} title={EXPLORE_UI.hintClose}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {phase === 'done' && variable && values && (
          <motion.div key="legend" initial={lite ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cx('absolute bottom-3 z-20 transition-[left] duration-200', left ? 'left-[364px] xl:left-[384px]' : 'left-3')}>
            <DataLegend variable={variable} level={level} values={values} breaks={breaks} ext={ext} hoverId={hoverId} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
