// Compare places: whether A and B share one set of settings or each has its own. Side A always uses the Place tab's settings; with "Separate" on, side B uses its own copy
// (lib/project/side), which starts as a copy of A. Also the level both sides are read at (Parcel | Tract | ZIP code, as
// on the Place tab) and each side's ZIP code: nothing picked to start, Tract level. In memory only.
import { create } from 'zustand';
import { focusTracts } from '../data';
import { pickLot } from '../parcel/pick';
import { dropLotSuggestion } from '../project/draft';
import { useZipView, type PlaceArea } from '../place/zipView';
import { useApp } from '../store';
import { copyAToB, SIDE_A, SIDE_B } from '../project/side';

export interface CompareSettings {
  separate: boolean;
  /** Parcel | Tract | ZIP code, for both sides. */
  level: PlaceArea;
  /** Each side's ZIP code at the ZIP level. */
  zipA: string | null;
  zipB: string | null;
}

export const useCompare = create<CompareSettings>(() => ({ separate: false, level: 'tract', zipA: null, zipB: null }));

/** Split or join the settings. Splitting copies A's to B; joining with the same place on both sides moves B to another,
 *  and otherwise keeps the lot B picked on its own settings. */
export function setSeparate(on: boolean) {
  if (on === useCompare.getState().separate) return;
  if (on) copyAToB();
  else {
    const { selectedId, compareId } = useApp.getState();
    if (selectedId && selectedId === compareId) useApp.setState({ compareId: focusTracts.find((t) => t.GEOID !== selectedId)?.GEOID ?? null });
    else if (compareId) {
      const lot = SIDE_B.project.getState().sites[compareId]?.lot;
      if (lot) pickLot(lot, { side: SIDE_A });
    }
  }
  useCompare.setState({ separate: on });
}

/** Read both sides at a level. Leaving Parcel: the units and stories a lot suggested go back (as on the Place tab),
 *  except on A while the Place tab itself is at Parcel. */
export function setCompareLevel(level: PlaceArea) {
  const was = useCompare.getState().level;
  if (level === was) return;
  if (was === 'parcel') {
    dropLotSuggestion(SIDE_B);
    if (useZipView.getState().area !== 'parcel') dropLotSuggestion(SIDE_A);
  }
  useCompare.setState({ level });
}

/** Section 1 of the comparison ("The project in each place") in words, published by the screen so the PDF and the CSV
 *  print what it shows: the one-line answer, then label / A / B rows (verdict, zoning, size, capital, tax credits,
 *  the capital stack, the renters who qualify, and the checks that differ). */
export interface ProjectRows {
  answer: string | null;
  rows: [string, string, string][];
}

export const useCompareRead = create<ProjectRows>(() => ({ answer: null, rows: [] }));
