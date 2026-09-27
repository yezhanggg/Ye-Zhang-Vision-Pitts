import { describe, expect, it } from 'vitest';
import { hasPlaceData, hud, hudUsable, placeById, placeFor } from './data';
import { FIXTURE_HUD } from './fixture';

describe('place data loader', () => {
  it('loads whatever is on disk and never throws when the files are missing', () => {
    expect(placeById).toBeInstanceOf(Map);
    expect(typeof hasPlaceData).toBe('boolean');
    expect(placeFor('nope')).toBeNull();
    if (hud) {
      expect(hud.metro.il50.length).toBeGreaterThanOrEqual(4);
      expect(hud.metro.fy).toBe(2026);
    }
    if (placeById.size > 0) {
      const [geoid, p] = [...placeById.entries()][0];
      expect(placeFor(geoid)).toBe(p);
      expect(p.bands).toBeDefined();
      expect(p.market).toBeDefined();
      expect(p.transit).toBeDefined();
    }
    expect(hasPlaceData).toBe(placeById.size > 0 && hud != null);
  });
  it('hudUsable checks the four-person limits', () => {
    expect(hudUsable(FIXTURE_HUD)).toBe(true);
    expect(hudUsable(null)).toBe(false);
    expect(hudUsable({ metro: { il30: [], il50: [1, 2], il80: [] } } as never)).toBe(false);
  });
});
