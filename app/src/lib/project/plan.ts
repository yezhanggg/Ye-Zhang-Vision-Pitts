// The unit mix the project cards use: the person's own grid ("mine"), or the place's suggestion ("suggested"): every
// home at the planning level, split by size in proportion to the renter households here (lib/demand/mix).
import { groupShares, householdsByGroup, recommendedMix, type MixLine } from '../demand/mix';
import type { DemandUnit } from '../demand/types';
import type { PlanLevel } from '../place/plan';
import { EXAMPLE_HOMES, MIX_LEVELS, levelOf, suggestedCounts, total, type Counts, type MixLevel, type ProjectState } from './store';

export interface ProjectMix {
  counts: Counts;
  homes: number;
  /** "Homes needed" was empty, so the suggested mix is for the example number of homes. */
  example: boolean;
  mode: ProjectState['mode'];
  /** The suggested split with its arithmetic; null for the person's own mix or when household sizes are missing. */
  lines: MixLine[] | null;
  /** Whose household sizes split the suggestion. */
  from: 'tract' | 'zip' | null;
}

export function projectMix(state: ProjectState, level: PlanLevel, homesInput: number | null, tract: DemandUnit | null, zip: DemandUnit | null): ProjectMix {
  if (state.mode === 'mine') return { counts: state.counts, homes: total(state.counts), example: false, mode: 'mine', lines: null, from: null };
  const n = homesInput != null && homesInput > 0 ? Math.round(homesInput) : EXAMPLE_HOMES;
  const example = !(homesInput != null && homesInput > 0);
  const tractShares = tract ? groupShares(householdsByGroup(tract)) : null;
  const shares = tractShares ?? (zip ? groupShares(householdsByGroup(zip)) : null);
  const from = tractShares ? 'tract' : shares ? 'zip' : null;
  const lv = levelOf(level);
  if (!shares) return { counts: suggestedCounts(lv, 0, n, 0), homes: n, example, mode: 'suggested', lines: null, from };
  const lines = recommendedMix(n, shares);
  const by = Object.fromEntries(lines.map((l) => [l.group, l.homes])) as Record<'small' | 'two' | 'large', number>;
  return { counts: suggestedCounts(lv, by.small, by.two, by.large), homes: n, example, mode: 'suggested', lines, from };
}

/** Homes at each level, and at each size, in a mix. */
export const homesAt = (c: Counts, levels: MixLevel[]): number => levels.reduce((s, l) => s + c[l].reduce((a, b) => a + b, 0), 0);
export const homesOfSize = (c: Counts, br: 0 | 1 | 2 | 3, levels: MixLevel[] = MIX_LEVELS): number => levels.reduce((s, l) => s + c[l][br], 0);
/** Levels whose homes carry an income limit (everything but market rate). */
export const AFFORDABLE_LEVELS: MixLevel[] = ['30', '50', '60', '80'];
