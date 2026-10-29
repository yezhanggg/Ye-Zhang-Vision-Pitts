// Words for a side of Compare places at the level both sides are read at (lib/compare/store): its name in the heads
// and the export, what it waits for before its project is read, and why a lot cannot go on a side. Pure.
// Online only: loaded on demand with Compare places.
import { zipName } from '../../lib/equity/zip';
import { lotName } from '../../lib/explore/parcelShadow';
import type { PlaceArea } from '../../lib/place/zipView';

export type Tag = 'A' | 'B';

/** A side's name: its ZIP code, its lot and tract, or its tract. */
export function sideName(level: PlaceArea, tag: Tag, tract: string | null, lot: { label: string } | null | undefined, zip: string | null): string {
  if (level === 'zip') return zip ? zipName(zip) : `Place ${tag}`;
  if (level === 'parcel' && lot) return tract ? `${lotName(lot.label)} · ${tract}` : lotName(lot.label);
  return tract ?? `Place ${tag}`;
}

/** What a side still needs before its project is read. */
export function sideWait(level: PlaceArea, tag: Tag): string {
  return level === 'parcel' ? `Click a lot on ${tag}’s map.` : level === 'zip' ? `Pick a ZIP code above ${tag}’s map.` : 'Pick a place.';
}

/** Under one set of settings a tract keeps one lot, so a lot in the other side's tract cannot go on this side. */
export function lotClash(tag: Tag, lotTract: string, selectedId: string | null, compareId: string | null, separate: boolean): string | null {
  const other = tag === 'A' ? compareId : selectedId;
  if (separate || lotTract !== other) return null;
  return `That lot is in ${tag === 'A' ? 'B' : 'A'}’s tract. To compare two lots in one tract, set B’s settings to Its own.`;
}

/** The line under the level switch. */
export const LEVEL_NOTE: Record<PlaceArea, string> = {
  parcel: 'A real lot on each side: zoom in on each map and click a lot.',
  tract: 'A neighborhood on each side, read on its typical lot.',
  zip: 'A ZIP code on each side, read across its tracts. Pick one above each map.',
};

/** The sub line of "The project in each place". */
export const RESULTS_SUB: Record<PlaceArea, string> = {
  parcel: 'Each side’s project on the lot picked on its map; recomputed as you change either side.',
  tract: 'Each side’s project on a lot of the size it needs, in a district there that allows it; recomputed as you change either side.',
  zip: 'Each side’s project across its ZIP code, on a typical lot in its main tract, its mix split by the ZIP’s renters; recomputed as you change either side.',
};
