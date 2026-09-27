import { describe, expect, it } from 'vitest';
import { cityBounds, farZoom, grow, isFar, zoomToFit } from './farView';
import type { Bounds } from './geo';

describe('grow', () => {
  it('adds the miles on every side, wider in longitude than in latitude', () => {
    const b: Bounds = [[-80.1, 40.36], [-79.86, 40.5]];
    const [[w, s], [e, n]] = grow(b, 5);
    expect(n - 40.5).toBeCloseTo(5 / 69.05, 4);
    expect(40.36 - s).toBeCloseTo(5 / 69.05, 4);
    expect(-80.1 - w).toBeCloseTo(e + 79.86, 6);
    expect(-80.1 - w).toBeGreaterThan(n - 40.5);
  });
});

describe('zoomToFit', () => {
  it('fits the whole world in 512 pixels at zoom 0 and needs one more level for twice the pixels', () => {
    const half: Bounds = [[-90, -45], [90, 45]];
    const z = zoomToFit(half, 512, 512);
    expect(z).toBeCloseTo(1, 5);
    expect(zoomToFit(half, 1024, 1024)).toBeCloseTo(2, 5);
  });
  it('is limited by the tighter side', () => {
    const wide: Bounds = [[-80.2, 40.4], [-79.8, 40.45]];
    expect(zoomToFit(wide, 1000, 1000)).toBe(zoomToFit(wide, 1000, 5000));
    expect(zoomToFit(wide, 500, 1000)).toBeLessThan(zoomToFit(wide, 1000, 1000));
  });
});

describe('farZoom and isFar', () => {
  it('puts the threshold of a laptop-sized map between zoom 10 and 11, below the opening view', () => {
    expect(cityBounds()).not.toBeNull();
    const z = farZoom(1440, 900) as number;
    expect(z).toBeGreaterThan(10);
    expect(z).toBeLessThan(11.3);
    // more land around the city means zooming out further
    expect(farZoom(1440, 900, 10) as number).toBeLessThan(z);
  });
  it('turns far below the threshold and needs the slack to come back', () => {
    expect(isFar(10.4, 10.5, false)).toBe(true);
    expect(isFar(10.6, 10.5, false)).toBe(false);
    expect(isFar(10.6, 10.5, true)).toBe(true);
    expect(isFar(10.8, 10.5, true)).toBe(false);
  });
});

import { spotlightRings } from '../components/MapView';
describe('spotlight shade', () => {
  const area = (r: number[][]) => r.reduce((a, _, i) => { const j = (i + r.length - 1) % r.length; return a + (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]); }, 0);
  it('cuts the selected shape out of a world-sized ring, wound the other way', () => {
    const cw = [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]];
    const ccw = [...cw].reverse();
    for (const hole of [cw, ccw]) {
      const rings = spotlightRings({ type: 'Polygon', coordinates: [hole] });
      expect(rings).toHaveLength(2);
      expect(Math.sign(area(rings[1]))).toBe(-Math.sign(area(rings[0])));
    }
    expect(spotlightRings({ type: 'MultiPolygon', coordinates: [[cw], [ccw]] })).toHaveLength(3);
  });
});
