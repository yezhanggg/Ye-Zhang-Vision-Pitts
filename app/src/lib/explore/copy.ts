// Copy for the Explore data browser, in one place so wording stays consistent.
import type { LayerKey, Unit } from './types';
import { ordinalSuffix } from '../format';

export const EXPLORE_UI = {
  search: 'Search an address, neighborhood, tract or ZIP',
  searchPlaceholder: 'Address, neighborhood, tract or ZIP',
  outsideScope: (scope: 'city' | 'county') => (scope === 'county' ? 'That place is outside Allegheny County.' : 'That place is outside the City of Pittsburgh. Online county-wide data is unavailable right now.'),
  layers: 'Boundary',
  layersSub: 'One at a time',
  cityOnly: { label: 'Pittsburgh only', caption: 'Show only places inside the City of Pittsburgh', muni: 'Municipalities are all outside Pittsburgh' },
  settings: 'Settings',
  settingsSub: 'How the map looks',
  data: 'Data',
  dataSub: (many: string) => `Color the ${many} by one variable`,
  dataClosed: 'Open a boundary to see its data.',
  cityTractsOnly: 'Pittsburgh tracts only',
  terrainOffWhenLite: 'Off while your system asks for reduced motion',
  hint: 'Click any boundary on the map to see a summary of that place.',
  hintClose: 'Close this tip',
  summaryTab: 'Summary',
  chat: {
    ask: 'Ask about the map',
    askAbout: (name: string) => `Ask about ${name}`,
    about: (name: string) => `About ${name} and the places around it`,
    aboutNone: 'Click a place first for answers about it',
    prompts: 'Suggested questions',
    answers: 'Answers',
    clear: 'Clear the answers',
    thinking: 'Writing the answer',
  },
  unitBadge: { count: 'count', usd: '$', share: '%', years: 'year', age: 'yrs', pct: '0–100', score: '/100', class: 'class', flag: 'yes/no', rate: 'rate', ratio: '×' } as Record<Unit, string>,
  clear: 'Clear',
  footer: 'Source: American Community Survey 2020–2024, 5-year estimates',
  sourcesLink: 'All sources →',
  notBuilt: 'Data browser not built. Run scripts/07_build_acs_levels.py, then the app export, to bundle the census variables.',
  clickForDetails: 'Click for a summary',
  flatHint: 'Hold ⌘ (Command) with the pointer over the map for a flat, top-down view. Release to tilt back.',
  flatChip: 'Flat view · release ⌘ to tilt back',
  analysisOnly: 'Pittsburgh tracts only · the same values the Analysis section shows',
  analysisPriorities: (preset: string | null) => (preset ? `Under your current priorities (${preset})` : 'Under your current priorities (custom mix)'),
  analysisSwitch: 'Analysis layers exist for city tracts only. Picking one switches the map to tracts.',
  noData: 'no data',
  insideCity: (pct: number) => `${pct}% inside the city`,
  intro: {
    kicker: 'Explore',
    title: 'Browse the census, one shape at a time.',
    analysis: 'Analysis →',
    analysisSub: 'Rank the housing types that fit a tract, compare tracts, compare priorities.',
  },
  place: {
    thisPlace: 'This place',
    city: 'City',
    county: 'County',
    allVars: 'All variables',
    allVarsSub: 'Every census figure for this place, by topic',
    showOnMap: 'Show on map',
    onMap: 'On the map',
    openMatch: 'Open in Analysis → Match',
    openMatchSub: 'Rank the housing types that fit this tract',
    close: 'Close this place',
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
  charts: {
    thisPlace: 'This place',
    city: 'City of Pittsburgh',
    county: 'Allegheny County',
    acsWindows: 'ACS 5-year estimates: each point covers five years and neighbouring points share four (2014 = 2010–14 … 2024 = 2020–24). Dollars as published for each vintage, not inflation-adjusted. Band = 90% margin of error.',
    carried: 'Values before 2020 were carried from 2010 tracts to this 2020 tract by housing units; this tract was assembled from several, so treat the early years with care.',
    rentSeries: 'Median 2-bedroom asking rent by scrape year (licensed Dewey listings, one observation per unit per month; years with fewer than 10 distinct units are hidden). Information only.',
    noHistory: 'No 2014–2024 series for this variable.',
    source: 'ACS 2020–2024 5-year',
    tenure: 'Who lives here: renters and owners',
    structure: 'Housing stock by building size',
    race: 'Race and ethnicity',
    burden: 'Housing cost burden',
    commute: 'How people get to work',
    incomeRent: 'Income and rent over time',
    analysis: 'What the matchmaker says',
    rents: 'Asking rents',
    overview: 'At a glance',
    distribution: 'How this compares',
    rank: (rank: number, n: number, many: string) => `${ordinalSuffix(rank)} of ${n} ${many}`,
    clickToSelect: 'Click a row to open it',
    topFive: 'Highest',
    bottomFive: 'Lowest',
  },
  legend: {
    noData: 'No data',
    hovered: 'Hovered',
  },
};

type Row = { id: LayerKey; label: string; caption: string };
/** The boundaries, one open at a time. */
export const BOUNDARY_ROWS: Row[] = [
  { id: 'tracts', label: 'Census tracts', caption: 'Neighborhood-sized areas' },
  { id: 'bg', label: 'Block groups', caption: 'Smaller pieces of a tract' },
  { id: 'zcta', label: 'ZIP codes', caption: 'Postal ZIP code areas' },
  { id: 'muni', label: 'Municipalities', caption: 'Boroughs and townships around Pittsburgh' },
];
/** How the map looks. */
export const SETTING_ROWS: Row[] = [
  { id: 'buildings', label: 'Buildings', caption: '3D footprints from OpenStreetMap and Overture' },
  { id: 'terrain', label: 'Terrain', caption: '3D relief and contour lines (USGS 3DEP)' },
  { id: 'hillshade', label: 'Hill shading', caption: 'Shaded relief over the basemap' },
];

/** Boundary styles shared by the map overlays and the legend swatches. `widths` = [zoom0, width0, zoom1, width1]. */
export interface BoundaryStyle {
  color: string;
  widths: [number, number, number, number];
  /** Stroke width of the legend swatch. */
  legendWidth: number;
  dash?: number[];
  /** Draw a white casing under the line so it reads over tract lines, buildings and hills. */
  casing?: boolean;
  /** Label each shape with its `name` from this zoom on. */
  labels?: number;
  label: string;
}
export const BOUNDARY_STYLE: Record<'tracts' | 'bg' | 'zcta' | 'muni' | 'county' | 'city', BoundaryStyle> = {
  tracts: { color: '#475569', widths: [10, 0.8, 15, 1.6], legendWidth: 1.4, label: 'Census tracts' },
  bg: { color: '#94a3b8', widths: [11, 0.6, 15, 1.2], legendWidth: 1, dash: [2, 2], label: 'Block groups' },
  zcta: { color: '#0f766e', widths: [10, 2, 14, 3.5], legendWidth: 2.5, dash: [6, 3], casing: true, labels: 11, label: 'ZIP codes' },
  muni: { color: '#b45309', widths: [9, 1.8, 14, 3], legendWidth: 2.5, casing: true, labels: 10, label: 'Municipalities' },
  county: { color: '#0f172a', widths: [8, 2, 14, 3], legendWidth: 2.5, label: 'County' },
  city: { color: '#7c3aed', widths: [9, 2.2, 14, 3.2], legendWidth: 3, casing: true, label: 'City limits' },
};
