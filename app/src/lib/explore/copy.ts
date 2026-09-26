// Copy for the Explore data browser, in one place so wording stays consistent.
import type { BrowseLevel, LayerKey, Unit } from './types';

export const EXPLORE_UI = {
  search: 'Search an address, neighborhood, tract or ZIP',
  searchPlaceholder: 'Address, neighborhood, tract or ZIP',
  outsideScope: (scope: 'city' | 'county') => (scope === 'county' ? 'That place is outside Allegheny County.' : 'That place is outside the City of Pittsburgh. Online county-wide data is unavailable right now.'),
  layers: 'Layers',
  layersSub: 'What the map shows',
  data: 'Data',
  dataSub: 'Color the shapes by a census variable',
  reduceMotion: { label: 'Reduce motion', caption: 'No camera flights, tweens or 3D terrain' },
  terrainOffWhenLite: 'Off while Reduce motion is on',
  levelShort: { tract: 'Tracts', bg: 'Block groups', zcta: 'ZIP codes' } as Record<BrowseLevel, string>,
  unitBadge: { count: 'count', usd: '$', share: '%', years: 'year', age: 'yrs' } as Record<Unit, string>,
  clear: 'Clear',
  bundled: 'bundled',
  online: 'county-wide · online',
  footer: 'ACS 2020–2024 5-year · estimate ± 90% margin of error',
  sourcesLink: 'Sources & method →',
  turnOn: (layer: string) => `Turn on the ${layer} layer to see this on the map`,
  turnOnButton: 'Turn it on',
  notBuilt: 'Data browser not built. Run scripts/07_build_acs_levels.py, then the app export, to bundle the census variables.',
  clickForDetails: 'Click for details',
  noData: 'no data',
  insideCity: (pct: number) => `${pct}% inside the city`,
  intro: {
    kicker: 'Explore',
    title: 'Browse the census, one shape at a time.',
    steps: ['Turn on the layers you want to see: buildings, terrain, tracts, block groups, ZIP codes.', 'Pick a variable under Data to color the map; hover a shape for its value and margin of error.', 'Click a shape for its full profile next to the city and county.'],
    analysis: 'Analysis →',
    analysisSub: 'Rank the housing types that fit a tract, compare tracts, compare priorities.',
  },
  place: {
    thisPlace: 'This place',
    city: 'City',
    county: 'County',
    keyTable: 'Key figures',
    allVars: 'All variables',
    allVarsSub: 'Every published variable, by group',
    showOnMap: 'Show on map',
    onMap: 'On the map',
    openMatch: 'Open in Analysis → Match',
    openMatchSub: 'Rank the housing types that fit this tract',
    close: 'Close place card',
    vsCity: 'vs city',
  },
  summary: {
    unitsWithData: (n: number, total: number, many: string) => `${n.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} ${many} have a value`,
    reliability: 'Reliability of the values',
    reliabilityHow: 'From the coefficient of variation (margin of error ÷ 1.645 ÷ estimate): under 15% high, up to 30% medium, above that low. Small areas and rare groups have wide margins.',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    none: 'Not rated',
  },
  legend: {
    noData: 'No data',
    hovered: 'Hovered',
    boundaries: 'Boundaries',
  },
};

export const LAYER_ROWS: { id: LayerKey; label: string; caption: string }[] = [
  { id: 'buildings', label: 'Buildings', caption: '3D footprints from OpenStreetMap and Overture' },
  { id: 'terrain', label: 'Terrain', caption: 'Hillshade, contours and relief (USGS 3DEP)' },
  { id: 'tracts', label: 'Census tracts', caption: '128 city tracts' },
  { id: 'bg', label: 'Block groups', caption: '314 city block groups' },
  { id: 'zcta', label: 'ZIP codes', caption: '32 ZCTAs that touch the city' },
  { id: 'county', label: 'County', caption: 'Allegheny County outline' },
  { id: 'city', label: 'City', caption: 'Pittsburgh city limits' },
];

/** Line styles shared by the map overlays and the legend swatches. */
export const BOUNDARY_STYLE: Record<'tracts' | 'bg' | 'zcta' | 'county' | 'city', { color: string; width: number; dash?: number[]; label: string }> = {
  tracts: { color: '#64748b', width: 1.2, label: 'Census tracts' },
  bg: { color: '#94a3b8', width: 1, dash: [2, 2], label: 'Block groups' },
  zcta: { color: '#0f766e', width: 1.5, dash: [4, 3], label: 'ZIP codes' },
  county: { color: '#0f172a', width: 2, label: 'County' },
  city: { color: '#7c3aed', width: 2.5, label: 'City limits' },
};

/** "128 city tracts · bundled" or "394 tracts · county-wide · online". */
export const scopeText = (n: number, many: string, online: boolean) => (online ? `${n.toLocaleString('en-US')} ${many} · ${EXPLORE_UI.online}` : `${n.toLocaleString('en-US')} city ${many} · ${EXPLORE_UI.bundled}`);
