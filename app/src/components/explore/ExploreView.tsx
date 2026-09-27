import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { ExpressionSpecification } from 'maplibre-gl';
import { useApp, type Level } from '../../lib/store';
import type { MapPaint } from '../../lib/paint';
import { LEVEL_LABEL, LEVEL_LAYER, isCountyWide, unitSubtitle, unitTitle, variableById } from '../../lib/explore/catalog';
import { browsePaint, estimates, extent, quantileBreaks } from '../../lib/explore/bins';
import { BOUNDARY_STYLE, EXPLORE_UI, scopeText } from '../../lib/explore/copy';
import { useGeo, useVariable } from '../../lib/explore/remote';
import { resolveForLevel } from '../../lib/explore/search';
import type { Loaded, UnitProps, ValueMap } from '../../lib/explore/types';
import { analysisPaint, analysisValues, isAnalysis } from '../../lib/explore/analysisVars';
import { useAllResults } from '../../lib/derived';
import { cx } from '../../lib/format';
import MapView, { type IntroPhase, type OverlayLayer } from '../MapView';
import IntroOverlay from '../IntroOverlay';
import PanelFrame from '../PanelFrame';
import Rail, { RailSection } from '../Rail';
import TractSearch from '../TractSearch';
import DataLegend from './DataLegend';
import DataPanel from './DataPanel';
import DataTooltip from './DataTooltip';
import ScopeOverview from './ScopeOverview';
import LayersPanel from './LayersPanel';
import PlaceCard from './PlaceCard';
import VariableSummary from './VariableSummary';

/** The built-in tract layers are hidden in Explore; this keeps their paint effect inert. */
const EMPTY_PAINT: MapPaint = { kind: 'cat', palette: ['#e7e5e4'], values: new Map() };
const zoomWidth = (z0: number, w0: number, z1: number, w1: number) => ['interpolate', ['linear'], ['zoom'], z0, w0, z1, w1] as unknown as ExpressionSpecification;

type BoundaryId = 'tracts' | 'bg' | 'zcta' | 'muni' | 'county' | 'city';
const BOUNDARIES: BoundaryId[] = ['tracts', 'bg', 'zcta', 'muni', 'county', 'city'];
const LEVEL_OF: Record<BoundaryId, Level | null> = { tracts: 'tract', bg: 'bg', zcta: 'zcta', muni: 'muni', county: null, city: null };
const NEUTRAL_FILL = { color: '#64748b', opacity: 0.08 };
const SKIP_KEY = 'visionpitts.skipIntro';
const readSkip = () => {
  try {
    return localStorage.getItem(SKIP_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Line style for a boundary from the shared table. The level being browsed gets a slightly heavier line; the
 * other browseable levels step back a little so the active one reads first. Casings and name labels follow the table.
 */
function lineFor(id: BoundaryId, active: boolean, dim: boolean): OverlayLayer['line'] {
  const s = BOUNDARY_STYLE[id];
  const [z0, w0, z1, w1] = s.widths;
  const bump = active ? 0.6 : 0;
  return {
    color: s.color,
    width: zoomWidth(z0, w0 + bump, z1, w1 + bump),
    dash: s.dash,
    opacity: dim ? 0.75 : 1,
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
  const ui = useApp((s) => s.ui);
  const setBrowse = useApp((s) => s.setBrowse);
  const set = useApp((s) => s.set);
  // The globe → Pittsburgh flight plays once after the landing page's Open button (not on deep links, not with reduced motion).
  const [intro] = useState(() => useApp.getState().introNonce > 0 && !useApp.getState().introDone && !readSkip() && !lite);
  const [phase, setPhase] = useState<IntroPhase>(intro ? 'spin' : 'done');
  const [skip, setSkip] = useState(0);

  const geo = { tracts: useGeo('tract'), bg: useGeo('bg'), zcta: useGeo('zcta'), muni: useGeo('muni'), county: useGeo('county'), city: useGeo('city') };
  const level = browse.level;
  const browseGeo = geo[LEVEL_LAYER[level]];
  const variable = browse.variable ? variableById.get(browse.variable) ?? null : null;
  const analysis = isAnalysis(variable) ? variable : null;
  // Analysis layers are computed in the browser from the tract properties and the current priorities.
  const weights = useApp((s) => s.weights);
  const results = useAllResults(weights);
  const loadedAcs = useVariable(level, analysis ? null : variable?.id ?? null);
  const loaded = useMemo<Loaded<ValueMap> | null>(() => {
    if (!analysis) return loadedAcs;
    if (level !== 'tract') return null;
    return { data: analysisValues(analysis, results), source: 'bundled', scope: 'city' };
  }, [analysis, level, results, loadedAcs]);
  const values = loaded?.data ?? null;
  const online = loaded ? loaded.source === 'supabase' : browseGeo.source === 'supabase';

  const fixedPaint = useMemo(() => (analysis && values ? analysisPaint(analysis, values) : null), [analysis, values]);
  const breaks = useMemo(() => (values && !fixedPaint ? quantileBreaks(estimates(values), 5) : []), [values, fixedPaint]);
  const ext = useMemo(() => (values && !fixedPaint ? extent(estimates(values)) : null), [values, fixedPaint]);
  const fillPaint = useMemo(() => fixedPaint ?? (values ? browsePaint(values, breaks) : null), [fixedPaint, values, breaks]);
  const browseIndex = useMemo(() => indexOf(browseGeo.data.features), [browseGeo.data]);
  const selectedFC = browse.selected ? geo[LEVEL_LAYER[browse.selected.level]].data : null;
  const selectedProps = useMemo(() => (browse.selected && selectedFC ? indexOf(selectedFC.features).get(browse.selected.geoid) ?? null : null), [browse.selected, selectedFC]);
  const resolve = useMemo(() => resolveForLevel(level, browseGeo.data), [level, browseGeo.data]);
  const scope = scopeText(values ? values.size : browseGeo.data.features.length, LEVEL_LABEL[level].many, online, isCountyWide(level));
  // The map keeps its focus clear of whichever panels are open.
  const padding = useMemo(() => ({ top: 90, bottom: 90, left: ui.left ? 420 : 70, right: ui.right ? 500 : 70 }), [ui.left, ui.right]);

  const overlays = useMemo<OverlayLayer[]>(() => {
    const out: OverlayLayer[] = [];
    for (const id of BOUNDARIES) {
      if (!layers[id]) continue;
      const lv = LEVEL_OF[id];
      const active = lv !== null && lv === level;
      const selectedHere = browse.selected && browse.selected.level === lv ? browse.selected.geoid : null;
      const base: OverlayLayer = { id, data: geo[id].data, idField: 'GEOID', line: lineFor(id, active, lv !== null && !active), selectedId: selectedHere };
      if (active) {
        out.push({
          ...base,
          fill: fillPaint ? { paint: fillPaint } : NEUTRAL_FILL,
          interactive: true,
          zoomTo: true,
          tooltip: (gid) => <DataTooltip level={lv} geoid={gid} props={browseIndex.get(gid) ?? null} variable={variable} estimate={values?.get(gid)} />,
          onSelect: (geoid) => setBrowse({ selected: { level: lv, geoid } }),
        });
      } else out.push(base);
    }
    return out;
    // geo.* are the only other inputs and change identity only when their data does
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, level, browse.selected, fillPaint, browseIndex, variable, values, geo.tracts.data, geo.bg.data, geo.zcta.data, geo.muni.data, geo.county.data, geo.city.data, setBrowse]);

  const panelKey = browse.selected ? `place:${browse.selected.level}:${browse.selected.geoid}` : variable ? `var:${variable.id}` : 'intro';

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
              value={browse.selected?.geoid ?? null}
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
            <LayersPanel />
          </RailSection>
          <DataPanel geo={browseGeo} />
        </Rail>
      )}
      <PanelFrame show={phase === 'done'}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={panelKey} initial={lite ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={lite ? undefined : { opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
            {browse.selected && selectedFC ? <PlaceCard selected={browse.selected} fc={selectedFC} variable={variable} values={loaded} /> : variable && loaded ? <VariableSummary variable={variable} level={level} values={loaded} fc={browseGeo.data} /> : <ScopeOverview />}
          </motion.div>
        </AnimatePresence>
      </PanelFrame>
      <AnimatePresence>
        {phase === 'done' && (
          <motion.div key="legend" initial={lite ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cx('absolute bottom-3 z-20 transition-[left] duration-200', ui.left ? 'left-[364px] xl:left-[384px]' : 'left-3')}>
            <DataLegend variable={variable} level={level} values={values} breaks={breaks} ext={ext} hoverId={hoverId} layers={layers} scope={scope} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
