// Basemap, elevation tiles, contour protocol and the color expressions shared by every map.
import type { ExpressionSpecification, StyleSpecification } from 'maplibre-gl';
import maplibregl from 'maplibre-gl';
import mlcontour from 'maplibre-contour';

export const BASEMAP_URL = 'https://tiles.openfreemap.org/styles/positron';
export const AWS_TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const MAPTERHORN_TILEJSON = 'https://tiles.mapterhorn.com/tilejson.json';

export const PGH_CENTER: [number, number] = [-79.985, 40.44];
export const PGH_VIEW = { center: PGH_CENTER, zoom: 11.6, pitch: 50, bearing: -15 };
export const HERO_VIEW = { center: [-79.992, 40.4418] as [number, number], zoom: 14.6, pitch: 62, bearing: -30 };

export const VIOLET = 'rgb(124,58,237)';
export const NO_DATA = '#e7e5e4';

/** Match scores 0–1: warm ramp, never blue. One color per bin in scoring.bins.score. */
export const SCORE_PALETTE = ['#fdf4e3', '#fbdcaa', '#f6b26b', '#e9824a', '#cc5234', '#8f2d2a'];
/** Observed factor percentiles: a green family so they never read as scores. */
export const FACTOR_PALETTE = ['#f3f8ec', '#d6ebc4', '#a8d59a', '#6fb87a', '#3a9163', '#1d5f48'];
export const FACTOR_BINS = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1];
/** Market pressure: moss (neighbors weaker) → grey → ember (neighbors stronger). */
export const PRESSURE_PALETTE = ['#2f7f62', '#8fc0a5', '#d8d3c8', '#efa16a', '#c8321f'];
export const PRESSURE_BREAKS = [-0.25, -0.08, 0.08, 0.25];
export const PRESSURE_LABELS = ['Neighbors much weaker', 'Neighbors weaker', 'About the same', 'Neighbors stronger', 'Much stronger: pressure spilling in'];
/** 3×3 need tercile × market direction. Rows L, M, H; columns falling, flat, rising. */
export const BIVARIATE_CLASSES = ['L-falling', 'L-flat', 'L-rising', 'M-falling', 'M-flat', 'M-rising', 'H-falling', 'H-flat', 'H-rising'];
export const BIVARIATE_PALETTE = ['#cfe8dd', '#e9e6df', '#f9d6b8', '#8fc7ad', '#c9bfd0', '#f0a06a', '#3f9b7a', '#8f6aa8', '#c8321f'];
/** Asking-rent growth (existing stock), an information layer: one cool class for a fall, then a blue ramp so it never reads as a score or a factor. Breaks are shares (0.15 = +15%). */
export const RENT_GROWTH_BREAKS = [0, 0.15, 0.3, 0.45];
export const RENT_GROWTH_PALETTE = ['#9fcfae', '#e6eef8', '#b6cce8', '#7ea4d4', '#3d6cb3'];
export const RENT_GROWTH_LABELS = ['Fell', '0 to +15%', '+15 to +30%', '+30 to +45%', 'More than +45%'];
/** Hypsometric tint for the Elevation layer: [feet, color]. */
export const ELEV_STOPS_FT: [number, string][] = [
  [700, '#eef2ea'], [850, '#d9e3cf'], [950, '#bfd1b0'], [1050, '#9fb98f'], [1150, '#7c9a6e'], [1250, '#5b7a53'], [1350, '#435c3e'],
];
export const M_TO_FT = 3.28084;

function classOf(v: number | null | undefined, breaks: number[]): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  let i = 0;
  while (i < breaks.length && v > breaks[i]) i++;
  return i;
}
export const pressureClass = (v: number | null | undefined) => classOf(v, PRESSURE_BREAKS);
/** 0 = fell (growth ≤ 0), then one class per RENT_GROWTH_BREAKS step; null = no value (suppressed or no listings). */
export const rentGrowthClass = (v: number | null | undefined) => classOf(v, RENT_GROWTH_BREAKS);

// ------------------------------------------------------------------ elevation tiles
export interface DemConfig {
  tiles: string[];
  tileSize: number;
  maxzoom: number;
  encoding: 'terrarium';
  attribution: string;
  name: 'mapterhorn' | 'aws';
}
export const AWS_DEM: DemConfig = { tiles: [AWS_TERRARIUM], tileSize: 256, maxzoom: 15, encoding: 'terrarium', attribution: 'Elevation: AWS Terrain Tiles', name: 'aws' };

let demPromise: Promise<DemConfig> | null = null;
/** Mapterhorn (USGS 3DEP in the US, 512 px tiles to z16); AWS Terrarium when unreachable. */
export function loadDemConfig(): Promise<DemConfig> {
  demPromise ??= (async () => {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 4000);
      const r = await fetch(MAPTERHORN_TILEJSON, { signal: ctl.signal });
      clearTimeout(timer);
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as { tiles?: string[]; tileSize?: number; maxzoom?: number; encoding?: string };
      if (!j.tiles?.length || (j.encoding && j.encoding !== 'terrarium')) throw new Error('unexpected tilejson');
      return { tiles: j.tiles, tileSize: j.tileSize ?? 512, maxzoom: Math.min(j.maxzoom ?? 16, 16), encoding: 'terrarium', attribution: '© Mapterhorn · USGS 3DEP', name: 'mapterhorn' } as DemConfig;
    } catch {
      console.info('[map] Mapterhorn elevation unavailable, using AWS Terrarium tiles');
      return AWS_DEM;
    }
  })();
  return demPromise;
}

// ------------------------------------------------------------------ contours
const demSources = new Map<string, InstanceType<typeof mlcontour.DemSource>>();
/** Contour vector tiles computed in the browser from the same elevation tiles (inline worker: works in the single file). */
export function contourSourceUrl(dem: DemConfig): string {
  let ds = demSources.get(dem.tiles[0]);
  if (!ds) {
    ds = new mlcontour.DemSource({ url: dem.tiles[0], encoding: 'terrarium', maxzoom: Math.min(dem.maxzoom, dem.tileSize >= 512 ? 13 : 14), worker: true, cacheSize: 64, timeoutMs: 10000 });
    ds.setupMaplibre(maplibregl);
    demSources.set(dem.tiles[0], ds);
  }
  return ds.contourProtocolUrl({
    multiplier: M_TO_FT,
    thresholds: { 13: [20, 100], 15: [10, 50] },
    elevationKey: 'ele',
    levelKey: 'level',
    contourLayer: 'contours',
    overzoom: dem.tileSize >= 512 ? 0 : 1,
  });
}

// ------------------------------------------------------------------ basemap
export const FALLBACK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#eef0f2' } }],
};

let stylePromise: Promise<StyleSpecification> | null = null;
export function loadBasemapStyle(): Promise<StyleSpecification> {
  stylePromise ??= (async () => {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 7000);
      const r = await fetch(BASEMAP_URL, { signal: ctl.signal });
      clearTimeout(timer);
      if (!r.ok) throw new Error(String(r.status));
      return (await r.json()) as StyleSpecification;
    } catch (e) {
      console.warn('[map] basemap unavailable, using a plain background', e);
      return FALLBACK_STYLE;
    }
  })();
  return stylePromise;
}

// ------------------------------------------------------------------ expressions
/** Sequential fill from feature-state `v` (0–1, −1 = no data) with fixed breaks. */
export function seqExpression(palette: string[], bins: number[]): ExpressionSpecification {
  const v = ['coalesce', ['feature-state', 'v'], -1];
  const step: unknown[] = ['step', v, palette[0]];
  for (let i = 1; i < palette.length; i++) step.push(bins[i], palette[i]);
  return ['case', ['<', v, 0], NO_DATA, step] as unknown as ExpressionSpecification;
}

/** Categorical fill from feature-state `k` (category index, −1 = no data). */
export function catExpression(colors: string[]): ExpressionSpecification {
  const m: unknown[] = ['match', ['coalesce', ['feature-state', 'k'], -1]];
  colors.forEach((c, i) => m.push(i, c));
  m.push(NO_DATA);
  return m as unknown as ExpressionSpecification;
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
