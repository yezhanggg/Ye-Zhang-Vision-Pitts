// Sun and shadow: the pure half. The shadows are cast offline (scripts/13, src/visionpitts/shadow.py) and published
// as map pages: for each day, each chunk of the city (a zoom-13 map tile; 12 ft cells, and 6 ft cells for close zoom) has a few
// 8-bit grayscale PNGs in which every bit is one half-hour step (1 = in shadow), plus one "hours" page counting the
// sunlit steps. Everything here is arithmetic on that layout, so it can be tested without a map.

export interface ShadowStep {
  /** Clock minutes after local midnight. */
  min: number;
  label: string;
  /** Sun azimuth, degrees clockwise from north. */
  az: number;
  /** Sun elevation, degrees above the horizon. */
  el: number;
  /** Share of the surface in shadow at this step, 0..1. */
  shade: number;
}
export interface ShadowDay {
  id: string;
  label: string;
  date: string;
  pages: number;
  steps: ShadowStep[];
}
export interface ShadowManifest {
  version: number;
  source: string;
  engine: string;
  built: string;
  cellFt: number;
  grid: { z: number; px: number };
  bitsPerPage: number;
  stepMinutes: number;
  hoursNoData: number;
  chunks: [number, number][];
  overview: { x0: number; y0: number; nx: number; ny: number; w: number; h: number };
  paths: { page: string; hours: string; overviewPage: string; overviewHours: string };
  days: ShadowDay[];
  bytes: number;
}

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** The manifest when it has everything the layer reads, otherwise null. */
export function parseManifest(json: unknown): ShadowManifest | null {
  const m = json as Partial<ShadowManifest> | null;
  if (!m || m.version !== 1 || !m.grid || !num(m.grid.z) || !num(m.grid.px) || !num(m.bitsPerPage) || !num(m.stepMinutes)) return null;
  if (!Array.isArray(m.chunks) || !m.chunks.every((c) => Array.isArray(c) && num(c[0]) && num(c[1]))) return null;
  if (!m.overview || !num(m.overview.x0) || !num(m.overview.nx) || !m.paths || !Array.isArray(m.days) || !m.days.length) return null;
  for (const d of m.days) {
    if (!d || typeof d.id !== 'string' || !Array.isArray(d.steps) || d.steps.length < 2) return null;
    if (d.pages !== Math.ceil(d.steps.length / m.bitsPerPage)) return null;
    if (!d.steps.every((s) => s && num(s.min) && num(s.az) && num(s.el))) return null;
  }
  return m as ShadowManifest;
}

/** The two steps a moment falls between and how far along it is. `t` is a fractional step index, clamped to the day. */
export function stepAt(t: number, n: number): { k: number; next: number; frac: number } {
  const c = Math.min(Math.max(Number.isFinite(t) ? t : 0, 0), n - 1);
  const k = Math.min(Math.floor(c), n - 1);
  const next = Math.min(k + 1, n - 1);
  return { k, next, frac: next === k ? 0 : c - k };
}

/** Which page holds a step, and which bit of its bytes. */
export const bitAddress = (k: number, bitsPerPage: number) => ({ page: Math.floor(k / bitsPerPage), bit: k % bitsPerPage });

/** The pages a moment needs (one, or two when the two steps straddle a page boundary). */
export function pagesNeeded(t: number, n: number, bitsPerPage: number): number[] {
  const { k, next } = stepAt(t, n);
  const a = bitAddress(k, bitsPerPage).page, b = bitAddress(next, bitsPerPage).page;
  return a === b ? [a] : [a, b];
}

/** Sun position and shadow share at a moment, between the two steps around it. */
export function interpSun(day: ShadowDay, t: number): { min: number; az: number; el: number; shade: number } {
  const { k, next, frac } = stepAt(t, day.steps.length);
  const a = day.steps[k], b = day.steps[next];
  const mix = (x: number, y: number) => x + (y - x) * frac;
  return { min: mix(a.min, b.min), az: mix(a.az, b.az), el: mix(a.el, b.el), shade: mix(a.shade ?? 0, b.shade ?? 0) };
}

/** The published day closest to today in the calendar (year ignored), so the layer opens on the current season. */
export function nearestDay(m: Pick<ShadowManifest, 'days'>, today: Date): string {
  const doy = (d: Date) => (Date.UTC(2001, d.getMonth(), d.getDate()) - Date.UTC(2001, 0, 1)) / 86400000;
  const now = doy(today);
  let best = m.days[0].id, gap = Infinity;
  for (const d of m.days) {
    const [, mo, da] = d.date.split('-').map(Number);
    const diff = Math.abs(doy(new Date(2001, mo - 1, da)) - now);
    const g = Math.min(diff, 365 - diff);
    if (g < gap) [best, gap] = [d.id, g];
  }
  return best;
}

// The three days by season. The fall day stands for spring as well: the sun is as high around March 20, and
// crosses the sky about a quarter of an hour later on the clock.
export const SEASONS: Record<string, { name: string; note: string }> = {
  jun21: { name: 'Summer', note: 'June 21, the longest day of the year' },
  sep22: { name: 'Spring / Fall', note: 'September 22. Around March 20 the sun takes the same path about 15 minutes later.' },
  dec21: { name: 'Winter', note: 'December 21, the shortest day of the year' },
};

/** "2:30 PM" from minutes after midnight, to the minute. */
export function clockLabel(minutes: number): string {
  const m = Math.round(minutes);
  const h = Math.floor(m / 60) % 24;
  return `${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
/** The side of the sky an azimuth is on, in a word. */
export const compassWord = (az: number) => COMPASS[Math.round((((az % 360) + 360) % 360) / 45) % 8];

/**
 * MapLibre light position [radial, azimuthal, polar] for the sun, with the light anchored to the map: azimuth is
 * clockwise from north, polar is the angle down from straight overhead. The polar angle stops short of the horizon
 * so roofs do not go black at sunrise and sunset.
 */
export function sunToLight(az: number, el: number): [number, number, number] {
  return [1.15, ((az % 360) + 360) % 360, Math.min(80, Math.max(0, 90 - el))];
}
/** MapLibre's own light, for putting things back. */
export const DEFAULT_LIGHT = { anchor: 'viewport', position: [1.15, 210, 30], color: '#ffffff', intensity: 0.5 } as const;

/** Where the sun sits on a round dial of radius r: the rim is the horizon, the center is straight overhead, and up is the top of the map. */
export function dialPoint(az: number, el: number, bearing: number, r: number): { x: number; y: number } {
  const d = r * (1 - Math.min(90, Math.max(0, el)) / 90);
  const a = ((az - bearing) * Math.PI) / 180;
  return { x: d * Math.sin(a), y: -d * Math.cos(a) };
}

// ------------------------------------------------------------------ map tiles
const mercX = (lng: number) => (lng + 180) / 360;
const mercY = (lat: number) => (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2;

export interface LngLatBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** A tile's box in Web Mercator world units (0..1 across the world, y down): [x0, y0, size]. */
export const tileBox = (z: number, x: number, y: number): [number, number, number] => [x / 2 ** z, y / 2 ** z, 1 / 2 ** z];

/** The optional close-zoom level: the same chunks at a finer cell size, in a folder of their own. */
export interface FineLevel {
  px: number;
  cellFt: number;
  /** Map zoom from which these pages are drawn instead of the regular ones. */
  minZoom: number;
  /** Page address template, like the manifest's own. */
  page: string;
}
export function parseFine(json: unknown): FineLevel | null {
  const f = json as Partial<FineLevel> & { version?: number } | null;
  if (!f || f.version !== 1 || !num(f.px) || !num(f.minZoom) || typeof f.page !== 'string' || !f.page.includes('{day}')) return null;
  return { px: f.px, cellFt: num(f.cellFt) ? f.cellFt : 0, minZoom: f.minZoom, page: f.page };
}

export type Lod = 'none' | 'overview' | 'chunks' | 'fine';
/**
 * What to draw at a zoom: nothing when the city is a dot, the citywide overview, the chunks over it, or (close in,
 * when the fine level is published) the fine chunks over those.
 */
export function lodFor(zoom: number, fineMinZoom?: number | null): Lod {
  if (zoom < 10) return 'none';
  if (zoom < 13.5) return 'overview';
  return fineMinZoom != null && zoom >= fineMinZoom ? 'fine' : 'chunks';
}

/** The chunks that touch the view, nearest the center first, at most `max`. */
export function visibleChunks(box: LngLatBox, center: [number, number], m: Pick<ShadowManifest, 'chunks' | 'grid'>, max: number): [number, number][] {
  const n = 2 ** m.grid.z;
  const x0 = Math.floor(mercX(box.west) * n), x1 = Math.floor(mercX(box.east) * n);
  const y0 = Math.floor(mercY(box.north) * n), y1 = Math.floor(mercY(box.south) * n);
  const cx = mercX(center[0]) * n - 0.5, cy = mercY(center[1]) * n - 0.5;
  return m.chunks
    .filter(([x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1)
    .map(([x, y]) => ({ x, y, d: (x - cx) ** 2 + (y - cy) ** 2 }))
    .sort((a, b) => a.d - b.d)
    .slice(0, max)
    .map(({ x, y }) => [x, y] as [number, number]);
}

/**
 * The 4x4 matrix (column-major, as WebGL takes it) that carries a unit square onto a tile box and then through the
 * map's own matrix. Multiplied here in full precision; a tile's world coordinates lose too many digits as 32-bit floats.
 */
export function quadMatrix(main: ArrayLike<number>, box: readonly [number, number, number, number]): Float32Array {
  const [x, y, w, h] = box;
  const out = new Float32Array(16);
  for (let r = 0; r < 4; r++) {
    out[r] = main[r] * w;
    out[4 + r] = main[4 + r] * h;
    out[8 + r] = main[8 + r];
    out[12 + r] = main[r] * x + main[4 + r] * y + main[12 + r];
  }
  return out;
}

export function pageUrl(m: ShadowManifest, base: string, day: string, chunk: [number, number] | null, page: number | 'hours', fine?: FineLevel | null): string {
  const tpl = fine && chunk && page !== 'hours' ? fine.page : chunk ? (page === 'hours' ? m.paths.hours : m.paths.page) : page === 'hours' ? m.paths.overviewHours : m.paths.overviewPage;
  return base + tpl.replace('{day}', day).replace('{x}', String(chunk?.[0])).replace('{y}', String(chunk?.[1])).replace('{p}', String(page));
}

/** Keys to drop, least recently used first, until what is kept fits the budget. Anything in `keep` stays. */
export function evict(entries: { key: string; bytes: number; used: number }[], budget: number, keep: Set<string>): string[] {
  let total = entries.reduce((s, e) => s + e.bytes, 0);
  const out: string[] = [];
  for (const e of [...entries].sort((a, b) => a.used - b.used)) {
    if (total <= budget) break;
    if (keep.has(e.key)) continue;
    out.push(e.key);
    total -= e.bytes;
  }
  return out;
}

// ------------------------------------------------------------------ page decoding
/**
 * The pixels of a page. The pipeline writes plain 8-bit grayscale PNGs (no filtering, no color chunks) and this reads
 * exactly that, with the browser's own inflate. Decoding here instead of through an <img> keeps every bit as written;
 * image decoding may apply color management, and one changed bit is one wrong half hour.
 */
export async function decodeGrayPng(buf: ArrayBuffer): Promise<{ width: number; height: number; data: Uint8Array }> {
  const bytes = new Uint8Array(buf);
  const view = new DataView(buf);
  if (bytes.length < 33 || view.getUint32(0) !== 0x89504e47) throw new Error('not a PNG');
  let pos = 8, width = 0, height = 0;
  const idat: Uint8Array[] = [];
  while (pos + 8 <= bytes.length) {
    const len = view.getUint32(pos);
    const kind = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
    if (kind === 'IHDR') {
      width = view.getUint32(pos + 8);
      height = view.getUint32(pos + 12);
      if (bytes[pos + 16] !== 8 || bytes[pos + 17] !== 0 || bytes[pos + 20] !== 0) throw new Error('not an 8-bit grayscale PNG');
    } else if (kind === 'IDAT') idat.push(bytes.subarray(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }
  const stream = new Blob(idat as BlobPart[]).stream().pipeThrough(new DecompressionStream('deflate'));
  const raw = new Uint8Array(await new Response(stream).arrayBuffer());
  if (raw.length !== height * (width + 1)) throw new Error('unexpected PNG size');
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const at = y * (width + 1);
    if (raw[at] !== 0) throw new Error('filtered PNG rows are not supported');
    data.set(raw.subarray(at + 1, at + 1 + width), y * width);
  }
  return { width, height, data };
}

// ------------------------------------------------------------------ colors
/** Shadow tint (slate) and how dark it gets. */
export const SHADOW_COLOR: [number, number, number] = [15 / 255, 23 / 255, 42 / 255];
export const SHADOW_ALPHA = 0.46;
/** Hours of direct sun, from none (deep indigo) to all day (pale yellow). */
export const HOURS_RAMP = ['#1e1b4b', '#5b3a8c', '#b5557a', '#f0925f', '#fde68a'];
export const HOURS_ALPHA = 0.8;
export const hexRgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
