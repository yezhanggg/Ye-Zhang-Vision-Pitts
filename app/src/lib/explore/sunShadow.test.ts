import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { bitAddress, clockLabel, compassWord, decodeGrayPng, dialPoint, evict, interpSun, lodFor, nearestDay, pageUrl, parseFine, pagesNeeded, parseManifest, quadMatrix, stepAt, sunToLight, tileBox, visibleChunks, type ShadowDay, type ShadowManifest } from './sunShadow';
import { sunShadowUnavailable } from './sunShadowStore';

const steps = (n: number) => Array.from({ length: n }, (_, i) => ({ min: 480 + 30 * i, label: '', az: 120 + 10 * i, el: 5 + i, shade: 0.5 - 0.01 * i }));
const day = (id: string, n: number): ShadowDay => ({ id, label: id, date: '2026-12-21', pages: Math.ceil(n / 8), steps: steps(n) });
const manifest = (): ShadowManifest => ({
  version: 1, source: 's', engine: 'e', built: '2026-10-08', cellFt: 6, grid: { z: 13, px: 2048 }, bitsPerPage: 8, stepMinutes: 30, hoursNoData: 255,
  chunks: [[2274, 3087], [2275, 3087], [2276, 3087], [2275, 3088], [2276, 3088]],
  overview: { x0: 2273, y0: 3086, nx: 6, ny: 5, w: 1536, h: 1280 },
  paths: { page: '{day}/{x}_{y}_p{p}.png', hours: '{day}/{x}_{y}_h.png', overviewPage: '{day}/ov_p{p}.png', overviewHours: '{day}/ov_h.png' },
  days: [day('jun21', 29), day('dec21', 18)], bytes: 1,
});

describe('manifest', () => {
  it('accepts what the pipeline writes', () => {
    expect(parseManifest(JSON.parse(JSON.stringify(manifest())))?.days.length).toBe(2);
  });
  it('rejects anything it cannot draw', () => {
    expect(parseManifest(null)).toBeNull();
    expect(parseManifest({ ...manifest(), version: 2 })).toBeNull();
    expect(parseManifest({ ...manifest(), days: [] })).toBeNull();
    expect(parseManifest({ ...manifest(), days: [{ ...day('x', 18), pages: 2 }] })).toBeNull();
    expect(parseManifest({ ...manifest(), chunks: [[1, 'a']] })).toBeNull();
  });
  it('builds page addresses from the templates', () => {
    const m = manifest();
    expect(pageUrl(m, '/data/shadow/', 'dec21', [2275, 3088], 2)).toBe('/data/shadow/dec21/2275_3088_p2.png');
    expect(pageUrl(m, '/data/shadow/', 'dec21', [2275, 3088], 'hours')).toBe('/data/shadow/dec21/2275_3088_h.png');
    expect(pageUrl(m, '', 'jun21', null, 0)).toBe('jun21/ov_p0.png');
    expect(pageUrl(m, '', 'jun21', null, 'hours')).toBe('jun21/ov_h.png');
  });
});

describe('time', () => {
  it('splits a moment into two steps and a fraction', () => {
    expect(stepAt(0, 18)).toEqual({ k: 0, next: 1, frac: 0 });
    expect(stepAt(2.25, 18)).toEqual({ k: 2, next: 3, frac: 0.25 });
    expect(stepAt(17, 18)).toEqual({ k: 17, next: 17, frac: 0 });
    expect(stepAt(99, 18)).toEqual({ k: 17, next: 17, frac: 0 });
    expect(stepAt(-3, 18)).toEqual({ k: 0, next: 1, frac: 0 });
    expect(stepAt(NaN, 18).k).toBe(0);
  });
  it('finds the page and bit of a step', () => {
    expect(bitAddress(0, 8)).toEqual({ page: 0, bit: 0 });
    expect(bitAddress(7, 8)).toEqual({ page: 0, bit: 7 });
    expect(bitAddress(8, 8)).toEqual({ page: 1, bit: 0 });
    expect(bitAddress(28, 8)).toEqual({ page: 3, bit: 4 });
  });
  it('needs two pages only across a page boundary', () => {
    expect(pagesNeeded(3.5, 18, 8)).toEqual([0]);
    expect(pagesNeeded(7.5, 18, 8)).toEqual([0, 1]);
    expect(pagesNeeded(8, 18, 8)).toEqual([1]);
    expect(pagesNeeded(17, 18, 8)).toEqual([2]);
  });
  it('moves the sun between steps', () => {
    const d = day('dec21', 18);
    expect(interpSun(d, 0)).toEqual({ min: 480, az: 120, el: 5, shade: 0.5 });
    const mid = interpSun(d, 1.5);
    expect(mid.min).toBe(525);
    expect(mid.az).toBeCloseTo(135);
    expect(mid.el).toBeCloseTo(6.5);
    expect(mid.shade).toBeCloseTo(0.485);
  });
  it('opens on the published day nearest today', () => {
    const m = { days: [{ ...day('jun21', 29), date: '2026-06-21' }, { ...day('sep22', 24), date: '2026-09-22' }, { ...day('dec21', 18), date: '2026-12-21' }] };
    expect(nearestDay(m, new Date(2026, 9, 7))).toBe('sep22');
    expect(nearestDay(m, new Date(2027, 0, 15))).toBe('dec21'); // across the new year
    expect(nearestDay(m, new Date(2026, 4, 1))).toBe('jun21');
  });
  it('writes clock times and sky sides', () => {
    expect(clockLabel(0)).toBe('12:00 AM');
    expect(clockLabel(525)).toBe('8:45 AM');
    expect(clockLabel(750)).toBe('12:30 PM');
    expect(clockLabel(1230)).toBe('8:30 PM');
    expect(compassWord(0)).toBe('north');
    expect(compassWord(183)).toBe('south');
    expect(compassWord(236)).toBe('southwest');
    expect(compassWord(350)).toBe('north');
  });
});

describe('sun', () => {
  it('turns azimuth and elevation into a map light', () => {
    expect(sunToLight(180, 26)).toEqual([1.15, 180, 64]);
    expect(sunToLight(64, 3)).toEqual([1.15, 64, 80]); // held off the horizon
    expect(sunToLight(-90, 90)).toEqual([1.15, 270, 0]);
  });
  it('places the sun on the dial', () => {
    const noon = dialPoint(180, 45, 0, 20);
    expect(noon.x).toBeCloseTo(0);
    expect(noon.y).toBeCloseTo(10); // south is down, halfway to the rim
    const east = dialPoint(90, 0, 0, 20);
    expect(east.x).toBeCloseTo(20);
    expect(east.y).toBeCloseTo(0);
    const turned = dialPoint(90, 0, 90, 20); // map turned so east is up
    expect(turned.x).toBeCloseTo(0);
    expect(turned.y).toBeCloseTo(-20);
    expect(dialPoint(10, 90, 0, 20).x).toBeCloseTo(0);
  });
});

describe('chunks', () => {
  const m = manifest();
  it('draws nothing far out, the overview mid-way, chunks close in', () => {
    expect(lodFor(9)).toBe('none');
    expect(lodFor(11.6)).toBe('overview');
    expect(lodFor(13.5)).toBe('chunks');
    expect(lodFor(16)).toBe('chunks');
  });
  it('switches to the fine pages close in, only where they are published', () => {
    expect(lodFor(15.4, 15.5)).toBe('chunks');
    expect(lodFor(15.5, 15.5)).toBe('fine');
    expect(lodFor(17, null)).toBe('chunks');
    expect(lodFor(12, 15.5)).toBe('overview');
    const fine = parseFine({ version: 1, px: 2048, cellFt: 6, minZoom: 15.5, page: 'fine/{day}/{x}_{y}_p{p}.png', bytes: 1 });
    expect(fine?.px).toBe(2048);
    expect(pageUrl(manifest(), '/d/', 'dec21', [2275, 3088], 1, fine)).toBe('/d/fine/dec21/2275_3088_p1.png');
    expect(pageUrl(manifest(), '/d/', 'dec21', [2275, 3088], 'hours', fine)).toBe('/d/dec21/2275_3088_h.png'); // hours stay regular
    expect(pageUrl(manifest(), '/d/', 'dec21', null, 0, fine)).toBe('/d/dec21/ov_p0.png');
    expect(parseFine(null)).toBeNull();
    expect(parseFine({ version: 1, px: 2048, minZoom: 15.5, page: 'x.png' })).toBeNull();
  });
  it('picks the chunks in view, nearest first', () => {
    // Downtown sits in chunk 2275_3088
    const got = visibleChunks({ west: -80.02, south: 40.43, east: -79.97, north: 40.46 }, [-79.9959, 40.4406], m, 9);
    expect(got[0]).toEqual([2275, 3088]);
    expect(got.every(([x, y]) => m.chunks.some(([cx, cy]) => cx === x && cy === y))).toBe(true);
    expect(visibleChunks({ west: -80.02, south: 40.43, east: -79.97, north: 40.46 }, [-79.9959, 40.4406], m, 1)).toEqual([[2275, 3088]]);
    expect(visibleChunks({ west: -75.2, south: 39.9, east: -75.1, north: 40 }, [-75.15, 39.95], m, 9)).toEqual([]);
  });
  it('gives a tile box in world units', () => {
    const [x, y, s] = tileBox(13, 2275, 3088);
    expect(s).toBeCloseTo(1 / 8192, 12);
    expect(x).toBeCloseTo((-79.9959 + 180) / 360, 3);
    expect(y).toBeGreaterThan(0.37);
    expect(y).toBeLessThan(0.38);
  });
  it('carries a unit square onto the tile through the map matrix', () => {
    // a matrix that scales by 2 and shifts by (10, 20)
    const main = [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1, 0, 10, 20, 0, 1];
    const q = quadMatrix(main, [0.25, 0.5, 0.125, 0.25]);
    const at = (u: number, v: number) => [q[0] * u + q[4] * v + q[12], q[1] * u + q[5] * v + q[13]];
    expect(at(0, 0)).toEqual([10.5, 21]);
    expect(at(1, 1)).toEqual([10.75, 21.5]);
  });
  it('drops the least recently used pages first and never one in use', () => {
    const e = [{ key: 'a', bytes: 4, used: 1 }, { key: 'b', bytes: 4, used: 5 }, { key: 'c', bytes: 4, used: 3 }];
    expect(evict(e, 12, new Set())).toEqual([]);
    expect(evict(e, 8, new Set())).toEqual(['a']);
    expect(evict(e, 4, new Set(['a']))).toEqual(['c', 'b']);
    expect(evict(e, 0, new Set(['a', 'b', 'c']))).toEqual([]);
  });
});

describe('pages', () => {
  // the same bytes the pipeline writes (src/visionpitts/shadow.py png_gray): no filter, one IDAT, no color chunks
  function png(width: number, height: number, px: number[]): ArrayBuffer {
    const rows = Buffer.alloc(height * (width + 1));
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) rows[y * (width + 1) + 1 + x] = px[y * width + x];
    const chunk = (kind: string, data: Buffer) => {
      const head = Buffer.alloc(8);
      head.writeUInt32BE(data.length, 0);
      head.write(kind, 4, 'latin1');
      return Buffer.concat([head, data, Buffer.alloc(4)]); // the reader does not check the CRC
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    const all = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
    return all.buffer.slice(all.byteOffset, all.byteOffset + all.length) as ArrayBuffer;
  }
  it('reads back every bit', async () => {
    const px = [0, 1, 2, 4, 8, 16, 32, 64, 128, 255, 170, 85];
    const got = await decodeGrayPng(png(4, 3, px));
    expect(got.width).toBe(4);
    expect(got.height).toBe(3);
    expect(Array.from(got.data)).toEqual(px);
  });
  it('refuses anything else', async () => {
    await expect(decodeGrayPng(new ArrayBuffer(40))).rejects.toThrow();
  });
});

describe('availability', () => {
  it('is off in the offline single file and from disk', () => {
    expect(sunShadowUnavailable('file:', 'production')).toBeTruthy();
    expect(sunShadowUnavailable('https:', 'export')).toBeTruthy();
    expect(sunShadowUnavailable('https:', 'production')).toBeNull();
    expect(sunShadowUnavailable('http:', 'development')).toBeNull();
  });
});
