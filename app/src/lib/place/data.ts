// Loads app/src/data/place.json and app/src/data/hud_2026.json (plan §2) with its own glob, so lib/data.ts is untouched.
// Either file may be missing (the pipeline has not run): the maps are then empty and `hasPlaceData` is false.
import type { HudTable, PlaceFile, PlaceMeasures } from './types';

const raw = import.meta.glob('../../data/{place,hud_2026}.json', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

function load<T>(name: string, fallback: T): T {
  const text = raw[`../../data/${name}.json`];
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    console.warn(`[place] could not parse ${name}.json`, e);
    return fallback;
  }
}

const placeFile = load<PlaceFile>('place', {});
const hudFile = load<HudTable | null>('hud_2026', null);

/** True when the HUD table has the four-person limits the rules need. */
export function hudUsable(h: HudTable | null | undefined): h is HudTable {
  return !!h && !!h.metro && Array.isArray(h.metro.il30) && Array.isArray(h.metro.il50) && Array.isArray(h.metro.il80) && h.metro.il50.length >= 4;
}

export const placeById: Map<string, PlaceMeasures> = new Map(Object.entries(placeFile ?? {}));
export const hud: HudTable | null = hudUsable(hudFile) ? hudFile : null;
export const hasPlaceData: boolean = placeById.size > 0 && hud != null;

export function placeFor(geoid: string): PlaceMeasures | null {
  return placeById.get(geoid) ?? null;
}
