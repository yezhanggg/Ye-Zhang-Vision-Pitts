import { describe, expect, it } from 'vitest';
import { tractBounds } from '../data';
import { cityBounds, farZoom, zoomToFit } from '../farView';
import type { Bounds } from '../geo';
import { CITY_BASE, PITCH_ALLOWANCE, centerFor, cityView, fits, project, shownPitch, viewFor, type Pad, type View } from './framing';

const PAD: Pad = { top: 90, right: 500, bottom: 90, left: 420 };
const inside = ([x, y]: [number, number], w: number, h: number, pad: Pad, tol = 0.5) => x >= pad.left - tol && x <= w - pad.right + tol && y >= pad.top - tol && y <= h - pad.bottom + tol;
const corners = ([[w, s], [e, n]]: Bounds): [number, number][] => [[w, s], [w, n], [e, s], [e, n]];

describe('project and centerFor', () => {
  const v: View = { center: [-79.985, 40.44], zoom: 11, pitch: 0, bearing: 0 };
  it('puts the center at the middle of the map and east to the right, north up', () => {
    expect(project(v.center, v, 1000, 800)).toEqual([500, 400]);
    const [x, y] = project([-79.9, 40.5], v, 1000, 800);
    expect(x).toBeGreaterThan(500);
    expect(y).toBeLessThan(400);
  });
  it('is the inverse of centerFor under pitch and bearing: the target lands at the center of the padded box', () => {
    const target: [number, number] = [-79.95, 40.45];
    for (const [pitch, bearing] of [[0, 0], [50, -15], [60, 30]]) {
      const center = centerFor(target, 11.2, pitch, bearing, 900, PAD);
      const [x, y] = project(target, { center, zoom: 11.2, pitch, bearing }, 1440, 900);
      expect(x).toBeCloseTo((PAD.left + 1440 - PAD.right) / 2, 6);
      expect(y).toBeCloseTo((PAD.top + 900 - PAD.bottom) / 2, 6);
    }
  });
  it('a pitched camera shows the far side smaller than the near side', () => {
    const tilted: View = { ...v, pitch: 50 };
    const near = project([-79.985, 40.4], tilted, 1000, 800)[1] - 400;
    const far = 400 - project([-79.985, 40.48], tilted, 1000, 800)[1];
    expect(near).toBeGreaterThan(far);
  });
});

describe('cityView fits the whole city inside the padded box', () => {
  it.each([
    [1440, 900],
    [1280, 720],
  ])('at %i×%i with the Match panels open', (w, h) => {
    const b = cityBounds()!;
    expect(b).not.toBeNull();
    const v = cityView(w, h, PAD)!;
    expect(v).not.toBeNull();
    expect(v.pitch).toBe(CITY_BASE.pitch);
    expect(v.bearing).toBe(CITY_BASE.bearing);
    // the pitch the map will show: flat below the far-view threshold
    const shown: View = { ...v, pitch: shownPitch(v, w, h) };
    for (const c of corners(b)) expect(inside(project(c, shown, w, h), w, h, PAD), `${c} at ${w}×${h}`).toBe(true);
    expect(fits(b, shown, w, h, PAD)).toBe(true);
    // every tract, so the East End is not under the right panel and nothing hides under the left one
    for (const [id, tb] of tractBounds) for (const c of corners(tb)) expect(inside(project(c, shown, w, h), w, h, PAD), `${id} at ${w}×${h}`).toBe(true);
    // the box is used: the city spans at least 85% of the tighter dimension
    const xs = corners(b).map((c) => project(c, shown, w, h)[0]), ys = corners(b).map((c) => project(c, shown, w, h)[1]);
    const iw = w - PAD.left - PAD.right, ih = h - PAD.top - PAD.bottom;
    expect(Math.max((Math.max(...xs) - Math.min(...xs)) / iw, (Math.max(...ys) - Math.min(...ys)) / ih)).toBeGreaterThan(0.85);
  });
  it('gives back the pitch allowance and never zooms in past the flat fit', () => {
    const b = cityBounds()!;
    const v = cityView(1440, 900, PAD)!;
    const flat = zoomToFit(b, 1440 - PAD.left - PAD.right, 900 - PAD.top - PAD.bottom);
    expect(v.zoom).toBeLessThanOrEqual(flat - PITCH_ALLOWANCE + 1e-9);
    expect(v.zoom).toBeGreaterThan(flat - PITCH_ALLOWANCE - 1);
    const upright = cityView(1440, 900, PAD, { ...CITY_BASE, pitch: 0 })!;
    expect(upright.zoom).toBeGreaterThan(v.zoom);
  });
  it('the panels-hidden view is above the far-view threshold and still fits when pitched', () => {
    const b = cityBounds()!;
    const pad: Pad = { top: 90, right: 70, bottom: 90, left: 70 };
    const v = cityView(1440, 900, pad)!;
    expect(v.zoom).toBeGreaterThan(farZoom(1440, 900) as number);
    expect(fits(b, v, 1440, 900, pad)).toBe(true);
  });
  it('ignores a padding that leaves no room, and returns null without a size', () => {
    const b: Bounds = [[-80.1, 40.36], [-79.86, 40.5]];
    const v = viewFor(b, 800, 600, { top: 300, right: 500, bottom: 300, left: 400 }, { ...CITY_BASE, pitch: 0 });
    expect(fits(b, v, 800, 600, { top: 0, right: 0, bottom: 0, left: 0 })).toBe(true);
    expect(cityView(0, 0, PAD)).toBeNull();
  });
});
