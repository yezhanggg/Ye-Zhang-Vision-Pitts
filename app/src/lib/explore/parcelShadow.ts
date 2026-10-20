// Shadow by parcel: the pure half. scripts/15_build_parcel_shadow.py lays the county's lots over the shadow run and
// writes, per chunk of the run's grid, a GeoJSON file of lots (each with its share of the day in shadow for the three
// days) and a file of profile bytes (the share of the lot in shadow at every half hour). Everything here is
// arithmetic on that layout, so it can be tested without a map.
import type { ExpressionSpecification } from 'maplibre-gl';
import { NO_DATA } from '../mapStyle';
import { HOURS_RAMP, hexRgb, type LngLatBox } from './sunShadow';

export interface ParcelDay {
  id: string;
  label: string;
  /** Half-hour steps in the day. */
  steps: number;
  /** Clock minutes of the first step. */
  first: number;
}
export interface ParcelChunk {
  key: string;
  lots: number;
  /** The true extent of the chunk's lots; a lot sits whole in the chunk that holds its center, so this can reach past the chunk's own tile. */
  box: LngLatBox;
}
export interface ParcelManifest {
  /** Lots are drawn from this map zoom. */
  minZoom: number;
  /** Lots with fewer cells than this are not rated. */
  minCells: number;
  stepMinutes: number;
  /** Assessed use classes; a lot's `u` is an index into this list. */
  uses: string[];
  days: ParcelDay[];
  /** The profile byte that means "not rated". */
  noData: number;
  paths: { lots: string; profile: string };
  chunks: ParcelChunk[];
  lots: number;
}

/** What a lot carries: row in its chunk (also its id on the map), county lot label, use class, square feet, cells, and per day `s0..` (percent of the day in shadow to one decimal, -1 = not rated) and `m0..` (percent of the day when at least half the lot is in shadow). */
export type LotProps = { i: number; lot: string; u: number; sf: number; n: number } & Record<string, number | string>;
export interface LotFeature {
  type: 'Feature';
  properties: LotProps;
  geometry: { type: string; coordinates: unknown };
}
export interface LotCollection {
  type: 'FeatureCollection';
  features: LotFeature[];
}

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** The manifest when it has everything the layer reads, otherwise null. `shadowDays` (the shadow run's own days) must match day for day. */
export function parseParcelManifest(json: unknown, shadowDays?: { id: string; steps: unknown[] }[]): ParcelManifest | null {
  const m = json as (Partial<Omit<ParcelManifest, 'chunks' | 'noData'>> & { version?: number; chunks?: unknown; profile?: { noData?: unknown } }) | null;
  if (!m || m.version !== 1 || !num(m.minZoom) || !num(m.stepMinutes) || !Array.isArray(m.uses) || !Array.isArray(m.days) || !m.days.length) return null;
  if (!m.days.every((d) => d && typeof d.id === 'string' && num(d.steps) && d.steps > 0)) return null;
  if (shadowDays && (shadowDays.length !== m.days.length || !m.days.every((d, i) => d.id === shadowDays[i].id && d.steps === shadowDays[i].steps.length))) return null;
  if (!m.paths || typeof m.paths.lots !== 'string' || typeof m.paths.profile !== 'string' || !num(m.profile?.noData)) return null;
  if (!Array.isArray(m.chunks) || !m.chunks.every((c) => Array.isArray(c) && c.length === 7 && c.every(num))) return null;
  const chunks = (m.chunks as number[][]).map(([x, y, lots, west, south, east, north]) => ({ key: `${x}_${y}`, lots, box: { west, south, east, north } }));
  return { minZoom: m.minZoom, minCells: num(m.minCells) ? m.minCells : 0, stepMinutes: m.stepMinutes, uses: m.uses, days: m.days, noData: m.profile!.noData as number, paths: m.paths, chunks, lots: num(m.lots) ? m.lots : 0 };
}

export const chunkUrl = (base: string, template: string, key: string) => {
  const [x, y] = key.split('_');
  return base + template.replace('{x}', x).replace('{y}', y);
};

/** The chunks with lots that can be in the view, nearest the center first, at most `max`. */
export function chunksToLoad(view: LngLatBox, center: [number, number], chunks: ParcelChunk[], max: number): ParcelChunk[] {
  const squeeze = Math.cos((center[1] * Math.PI) / 180);
  return chunks
    .filter((c) => c.box.west <= view.east && c.box.east >= view.west && c.box.south <= view.north && c.box.north >= view.south)
    .map((c) => {
      // distance from the center to the nearest point of the chunk's extent (zero inside it)
      const dx = (Math.max(c.box.west - center[0], 0, center[0] - c.box.east)) * squeeze;
      const dy = Math.max(c.box.south - center[1], 0, center[1] - c.box.north);
      return { c, d: dx * dx + dy * dy };
    })
    .sort((a, b) => a.d - b.d || (a.c.key < b.c.key ? -1 : 1))
    .slice(0, max)
    .map(({ c }) => c);
}

/** A chunk's lots when the file is what the manifest says: that many features, each with its row as `i`. Otherwise null. */
export function prepareChunk(json: unknown, lots: number): LotCollection | null {
  const fc = json as Partial<LotCollection> | null;
  if (!fc || fc.type !== 'FeatureCollection' || !Array.isArray(fc.features) || fc.features.length !== lots) return null;
  for (let i = 0; i < fc.features.length; i++) if (fc.features[i]?.properties?.i !== i || !fc.features[i].geometry) return null;
  return fc as LotCollection;
}

// ------------------------------------------------------------------ colors
/** Classes of shadow share on the map: ten steps of ten percent. */
export const SHADE_STEPS = 10;
const hex2 = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');

/** One color per class, from no shadow (pale yellow) to shadow all day (deep indigo): the hours-of-sun ramp, read the other way. */
export function shadeColors(n = SHADE_STEPS): string[] {
  const stops = [...HOURS_RAMP].reverse().map(hexRgb);
  return Array.from({ length: n }, (_, i) => {
    const at = n > 1 ? (i / (n - 1)) * (stops.length - 1) : 0;
    const a = Math.min(Math.floor(at), stops.length - 2), f = at - a;
    return '#' + stops[a].map((v, k) => hex2(v + (stops[a + 1][k] - v) * f)).join('');
  });
}

/** The class of a percent, or -1 when the lot is not rated. */
export function shadeClass(pct: number, n = SHADE_STEPS): number {
  if (!num(pct) || pct < 0) return -1;
  return Math.min(n - 1, Math.floor((pct * n) / 100));
}

const fillExprs = new Map<number, ExpressionSpecification>();
/** Fill color read from a lot's own `s<day>`; the same object every time for a day, so the map can tell nothing changed. */
export function shadeFillExpr(day: number): ExpressionSpecification {
  let e = fillExprs.get(day);
  if (!e) {
    const v = ['number', ['get', `s${day}`], -1];
    const colors = shadeColors();
    const step: unknown[] = ['step', v, colors[0]];
    for (let i = 1; i < colors.length; i++) step.push((i * 100) / colors.length, colors[i]);
    e = ['case', ['<', v, 0], NO_DATA, step] as unknown as ExpressionSpecification;
    fillExprs.set(day, e);
  }
  return e;
}

// ------------------------------------------------------------------ a lot's figures
/** Percent of the day in shadow on a day, or null when the lot is not rated. */
export function shadeOf(p: LotProps, day: number): number | null {
  const v = p[`s${day}`];
  return num(v) && v >= 0 ? v : null;
}
/** Percent of the day when at least half the lot is in shadow, or null. */
export function mostlyOf(p: LotProps, day: number): number | null {
  const v = p[`m${day}`];
  return num(v) && v >= 0 ? v : null;
}
/** Hours of direct sun behind a shadow share: the part of the day's steps left over. */
export const sunHours = (pct: number, day: ParcelDay, stepMinutes: number) => ((1 - pct / 100) * day.steps * stepMinutes) / 60;

/** Where each day starts in a row of profile bytes. */
export function stepOffsets(days: ParcelDay[]): number[] {
  let at = 0;
  return days.map((d) => {
    const here = at;
    at += d.steps;
    return here;
  });
}

/** One lot's profile for one day (percent of the lot in shadow at each step), or null when the file does not hold it or the lot is not rated. */
export function curveRow(bytes: Uint8Array, lots: number, row: number, m: Pick<ParcelManifest, 'days' | 'noData'>, day: number): number[] | null {
  const width = m.days.reduce((s, d) => s + d.steps, 0);
  if (bytes.length !== lots * width || !Number.isInteger(row) || row < 0 || row >= lots || !m.days[day]) return null;
  const at = row * width + stepOffsets(m.days)[day];
  const out = Array.from(bytes.subarray(at, at + m.days[day].steps));
  return out.some((v) => v === m.noData || v > 100) ? null : out;
}

/** An SVG line and the area under it for a day's profile, in a box `w` by `h` (0% along the bottom, 100% along the top). */
export function curvePath(values: number[], w: number, h: number): { line: string; area: string } {
  if (values.length < 2) return { line: '', area: '' };
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * w).toFixed(1)} ${(h - (Math.min(100, Math.max(0, v)) / 100) * h).toFixed(1)}`);
  const line = 'M' + pts.join('L');
  return { line, area: `${line}L${w.toFixed(1)} ${h.toFixed(1)}L0.0 ${h.toFixed(1)}Z` };
}

// ------------------------------------------------------------------ words
const USE_LABELS: Record<string, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  industrial: 'Industrial',
  vacant: 'Vacant land',
  institutional: 'Institutional or public',
  other: 'Other use',
  unrecorded: 'No assessment record',
};
export const useLabel = (m: Pick<ParcelManifest, 'uses'>, u: number) => USE_LABELS[m.uses[u]] ?? 'Other use';

/** "3,250 sq ft", or acres from one acre up. */
export function lotSize(sqft: number): string {
  if (!num(sqft) || sqft <= 0) return '';
  if (sqft >= 43560) return `${(sqft / 43560).toFixed(sqft >= 435600 ? 0 : 1)} acres`;
  return `${Math.round(sqft).toLocaleString('en-US')} sq ft`;
}

/** "Lot 102-P-193", the county's lot and block label; some shapes (common ground) have none. */
export const lotName = (lot: string) => (lot ? `Lot ${lot}` : 'Lot without a number');
