// Find places for a project: what the person described, the places they shortlisted, and whether the finder is open.
// In memory only (a session), so opening a place and coming back keeps the list.
import { create } from 'zustand';
import { DEFAULT_INPUTS, type FinderInputs } from './rank';

export interface FinderState {
  open: boolean;
  /** Inputs the person set; homes left null follow the planning input. */
  inputs: FinderInputs;
  homesSet: boolean;
  shortlist: string[];
  more: boolean;
  /** The inputs of the last Confirm (the list is ranked on these); null until the first. */
  applied: FinderInputs | null;
}

export const useFinder = create<FinderState>(() => ({ open: false, inputs: DEFAULT_INPUTS, homesSet: false, shortlist: [], more: false, applied: null }));

export const setInputs = (patch: Partial<FinderInputs>) =>
  useFinder.setState((s) => ({ inputs: { ...s.inputs, ...patch }, homesSet: s.homesSet || 'min' in patch || 'max' in patch }));

/** Two at most: the second pick replaces the older one. */
export const toggleShortlist = (geoid: string) =>
  useFinder.setState((s) => ({ shortlist: s.shortlist.includes(geoid) ? s.shortlist.filter((g) => g !== geoid) : [...s.shortlist, geoid].slice(-2) }));

/** Homes from the planning input when the person has not set the finder's own: half to one and a half times it. */
export function homesFrom(plan: number | null): [number, number] {
  if (plan == null || plan <= 0) return [DEFAULT_INPUTS.min, DEFAULT_INPUTS.max];
  return [Math.max(4, Math.ceil(plan / 2)), Math.max(Math.ceil(plan / 2) + 1, Math.ceil(plan * 1.5))];
}

/** The finder's inputs as they stand (homes follow the planning input until set here). */
export function finderInputs(s: FinderState, planHomes: number | null): FinderInputs {
  const [min, max] = homesFrom(planHomes);
  return s.homesSet ? s.inputs : { ...s.inputs, min, max };
}
