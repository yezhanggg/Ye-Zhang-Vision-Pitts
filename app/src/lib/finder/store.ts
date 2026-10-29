// Find places for a project: the filters the person set, the places they shortlisted, and whether the finder is open.
// The project itself is the one on the left (lib/project/store, the planning inputs), never a copy. In memory only (a
// session), so opening a place and coming back keeps the list.
import { create } from 'zustand';
import { DEFAULT_INPUTS, type FinderInputs } from './rank';

export interface FinderState {
  open: boolean;
  /** The filters as set. */
  inputs: FinderInputs;
  shortlist: string[];
  more: boolean;
  /** The filters the list is ranked on: the form as it stood a moment after the last edit (PlaceRail); null until the finder opens. */
  applied: FinderInputs | null;
}

export const useFinder = create<FinderState>(() => ({ open: false, inputs: DEFAULT_INPUTS, shortlist: [], more: false, applied: null }));

export const setInputs = (patch: Partial<FinderInputs>) => useFinder.setState((s) => ({ inputs: { ...s.inputs, ...patch } }));

/** Two at most: the second pick replaces the older one. */
export const toggleShortlist = (geoid: string) =>
  useFinder.setState((s) => ({ shortlist: s.shortlist.includes(geoid) ? s.shortlist.filter((g) => g !== geoid) : [...s.shortlist, geoid].slice(-2) }));

/** The filters as they stand. */
export const finderInputs = (s: FinderState): FinderInputs => s.inputs;
