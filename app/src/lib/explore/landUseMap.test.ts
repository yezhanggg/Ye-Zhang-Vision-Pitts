import { describe, expect, it } from 'vitest';
import { mainUse, setZoningMap, useLandUseLayer } from './landUseMap';
import { useZoningLayer } from './zoning';

describe('land-use map', () => {
  it('picks the class with the largest share, and nothing without figures', () => {
    expect(mainUse([0.3, 0.1, 0, 0.5, 0.1])).toBe(3);
    expect(mainUse([null, null, null, null, null])).toBeNull();
    expect(mainUse([0, 0, 0, 0, 0])).toBeNull();
  });
  it('and the zoning map take turns', () => {
    useLandUseLayer.getState().set(true);
    expect(useLandUseLayer.getState().on).toBe(true);
    setZoningMap(true);
    expect(useZoningLayer.getState().on).toBe(true);
    expect(useLandUseLayer.getState().on).toBe(false);
    useLandUseLayer.getState().set(true);
    expect(useZoningLayer.getState().on).toBe(false);
  });
});
