import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { ExpressionSpecification } from 'maplibre-gl';
import { useApp, type Level } from '../../lib/store';
import type { MapPaint } from '../../lib/paint';
import { LEVEL_LABEL, LEVEL_LAYER, unitSubtitle, unitTitle, variableById } from '../../lib/explore/catalog';
import { browsePaint, estimates, extent, quantileBreaks } from '../../lib/explore/bins';
import { EXPLORE_UI, scopeText } from '../../lib/explore/copy';
import { useGeo, useVariable } from '../../lib/explore/remote';
import { resolveForLevel } from '../../lib/explore/search';
import type { UnitProps } from '../../lib/explore/types';
import MapView, { type OverlayLayer } from '../MapView';
import Rail, { RailSection } from '../Rail';
import TractSearch from '../TractSearch';
import DataLegend from './DataLegend';
import DataPanel from './DataPanel';
import DataTooltip from './DataTooltip';
import ExploreIntro from './ExploreIntro';
import LayersPanel from './LayersPanel';
import PlaceCard from './PlaceCard';
import VariableSummary from './VariableSummary';

/** The built-in tract layers are hidden in Explore; this keeps their paint effect inert. */
const EMPTY_PAINT: MapPaint = { kind: 'cat', palette: ['#e7e5e4'], values: new Map() };
const PADDING = { top: 90, bottom: 90, left: 70, right: 500 };
const zoomWidth = (z0: number, w0: number, z1: number, w1: number) => ['interpolate', ['linear'], ['zoom'], z0, w0, z1, w1] as unknown as ExpressionSpecification;

type BoundaryId = 'tracts' | 'bg' | 'zcta' | 'county' | 'city';
const BOUNDARIES: BoundaryId[] = ['tracts', 'bg', 'zcta', 'county', 'city'];
const LEVEL_OF: Record<BoundaryId, Level | null> = { tracts: 'tract', bg: 'bg', zcta: 'zcta', county: null, city: null };
const LINE: Record<BoundaryId, OverlayLayer['line']> = {
  tracts: { color: '#64748b', width: zoomWidth(10, 0.6, 15, 1.2) },
  bg: { color: '#94a3b8', width: zoomWidth(11, 0.5, 15, 1), dash: [2, 2] },
  zcta: { color: '#0f766e', width: 1.5, dash: [4, 3] },
  county: { color: '#0f172a', width: 2 },
  city: { color: '#7c3aed', width: 2.5 },
};
const NEUTRAL_FILL = { color: '#64748b', opacity: 0.08 };

const indexOf = (features: { properties: UnitProps }[]) => new Map(features.map((f) => [f.properties.GEOID, f.properties]));

export default function ExploreView() {
  const layers = useApp((s) => s.layers);
  const browse = useApp((s) => s.browse);
  const lite = useApp((s) => s.lite);
  const pin = useApp((s) => s.pin);
  const hoverId = useApp((s) => s.hoverId);
  const setBrowse = useApp((s) => s.setBrowse);
  const set = useApp((s) => s.set);

  const geo = { tracts: useGeo('tract'), bg: useGeo('bg'), zcta: useGeo('zcta'), county: useGeo('county'), city: useGeo('city') };
  const level = browse.level;
  const browseGeo = geo[LEVEL_LAYER[level]];
  const variable = browse.variable ? variableById.get(browse.variable) ?? null : null;
  const loaded = useVariable(level, variable?.id ?? null);
  const values = loaded?.data ?? null;
  const online = loaded ? loaded.source === 'supabase' : browseGeo.source === 'supabase';

  const breaks = useMemo(() => (values ? quantileBreaks(estimates(values), 5) : []), [values]);
  const ext = useMemo(() => (values ? extent(estimates(values)) : null), [values]);
  const fillPaint = useMemo(() => (values ? browsePaint(values, breaks) : null), [values, breaks]);
  const browseIndex = useMemo(() => indexOf(browseGeo.data.features), [browseGeo.data]);
  const selectedFC = browse.selected ? geo[LEVEL_LAYER[browse.selected.level]].data : null;
  const selectedProps = useMemo(() => (browse.selected && selectedFC ? indexOf(selectedFC.features).get(browse.selected.geoid) ?? null : null), [browse.selected, selectedFC]);
  const resolve = useMemo(() => resolveForLevel(level, browseGeo.data), [level, browseGeo.data]);
  const scope = scopeText(values ? values.size : browseGeo.data.features.length, LEVEL_LABEL[level].many, online);

  const overlays = useMemo<OverlayLayer[]>(() => {
    const out: OverlayLayer[] = [];
    for (const id of BOUNDARIES) {
      if (!layers[id]) continue;
      const lv = LEVEL_OF[id];
      const selectedHere = browse.selected && browse.selected.level === lv ? browse.selected.geoid : null;
      const base: OverlayLayer = { id, data: geo[id].data, idField: 'GEOID', line: LINE[id], selectedId: selectedHere };
      if (lv && lv === level) {
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
  }, [layers, level, browse.selected, fillPaint, browseIndex, variable, values, geo.tracts.data, geo.bg.data, geo.zcta.data, geo.county.data, geo.city.data, setBrowse]);

  const panelKey = browse.selected ? `place:${browse.selected.level}:${browse.selected.geoid}` : variable ? `var:${variable.id}` : 'intro';

  return (
    <div className="flex h-full">
      <Rail>
        <RailSection title="Search" step={1}>
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
        <RailSection title={EXPLORE_UI.layers} step={2} sub={EXPLORE_UI.layersSub}>
          <LayersPanel />
        </RailSection>
        <DataPanel geo={browseGeo} />
      </Rail>
      <main className="relative min-w-0 flex-1">
        <MapView
          paint={EMPTY_PAINT}
          selectedId={null}
          baseTracts={false}
          lite={lite}
          terrain={layers.terrain}
          terrainAlways={layers.terrain}
          buildings={layers.buildings}
          pin={pin}
          elevationReadout
          overlays={overlays}
          onHover={(id) => {
            if (useApp.getState().hoverId !== id) set({ hoverId: id });
          }}
          padding={PADDING}
        />
        <div className="scroll-quiet absolute bottom-3 right-3 top-3 z-20 w-[440px] overflow-y-auto rounded-2xl bg-white/95 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.25)] ring-1 ring-black/5 backdrop-blur">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={panelKey} initial={lite ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={lite ? undefined : { opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
              {browse.selected && selectedFC ? <PlaceCard selected={browse.selected} fc={selectedFC} /> : variable && loaded ? <VariableSummary variable={variable} level={level} values={loaded} /> : <ExploreIntro />}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="absolute bottom-3 left-3 z-20">
          <DataLegend variable={variable} level={level} values={values} breaks={breaks} ext={ext} hoverId={hoverId} layers={layers} scope={scope} />
        </div>
      </main>
    </div>
  );
}
