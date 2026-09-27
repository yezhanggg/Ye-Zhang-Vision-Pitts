// The land-use map: each area of the open boundary colored by its main land use (the class with the largest share of
// parcel land, county property assessments 2026). A map layer like the zoning districts, off by default; turning one
// of the two on turns the other off, since both color the same ground.
import { useMemo } from 'react';
import { create } from 'zustand';
import type { MapPaint } from '../paint';
import { bundledValues } from './catalog';
import { useVariable } from './remote';
import type { BrowseLevel } from './types';
import { useZoningLayer } from './zoning';

export const LAND_CLASSES = [
  { id: 'lu_residential', label: 'Residential', color: '#f2c94c' },
  { id: 'lu_commercial', label: 'Commercial', color: '#e0457b' },
  { id: 'lu_industrial', label: 'Industrial', color: '#8f74b0' },
  { id: 'lu_institutional', label: 'Institutional & public', color: '#5b8fd6' },
  { id: 'lu_vacant', label: 'Vacant', color: '#9ccb6b' },
] as const;
export const LAND_OPACITY = 0.72;

/** Index of the class with the largest share, or null when the area has no land-use figures. */
export function mainUse(shares: (number | null | undefined)[]): number | null {
  let best = -1, max = 0;
  shares.forEach((v, i) => {
    if (typeof v === 'number' && Number.isFinite(v) && v > max) {
      max = v;
      best = i;
    }
  });
  return best < 0 ? null : best;
}

export const useLandUseLayer = create<{ on: boolean; set: (on: boolean) => void }>((set) => ({
  on: false,
  set: (on) => {
    if (on) useZoningLayer.getState().set(false);
    set({ on });
  },
}));

/** Turn the zoning map on or off, turning the land-use map off first (they share the ground). */
export function setZoningMap(on: boolean) {
  if (on) useLandUseLayer.setState({ on: false });
  useZoningLayer.getState().set(on);
}

/**
 * geoid → main-use class for every unit of the open boundary: the bundled values, then the county-wide ones when
 * they load. Nothing is requested while the layer is off.
 */
export function useLandUseClasses(level: BrowseLevel, cityOnly: boolean, enabled: boolean): Map<string, number | null> {
  const ids = LAND_CLASSES.map((c) => (enabled ? c.id : null));
  const loaded = [useVariable(level, ids[0], cityOnly), useVariable(level, ids[1], cityOnly), useVariable(level, ids[2], cityOnly), useVariable(level, ids[3], cityOnly), useVariable(level, ids[4], cityOnly)];
  return useMemo(() => {
    const out = new Map<string, number | null>();
    if (!enabled) return out;
    const bundled = bundledValues(level);
    const geoids = new Set<string>(Object.keys(bundled));
    for (const l of loaded) if (l) for (const g of l.data.keys()) geoids.add(g);
    for (const g of geoids) out.set(g, mainUse(LAND_CLASSES.map((c, i) => loaded[i]?.data.get(g)?.est ?? bundled[g]?.[c.id]?.[0] ?? null)));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, level, ...loaded.map((l) => l?.data)]);
}

export const landUsePaint = (classes: Map<string, number | null>): MapPaint => ({ kind: 'cat', palette: LAND_CLASSES.map((c) => c.color), values: classes });
