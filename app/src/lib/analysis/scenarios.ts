// Naming and de-duplicating saved scenarios (sets of priorities).
import type { Preset, Scenario, Weights } from '../types';
import { ANALYSIS_COPY as C } from './copy';

const EDITED = ' (edited)';
const EPS = 1e-6;

/** Same weight on every listed factor (a missing weight counts as 0). */
export function sameWeightsAs(a: Weights, b: Weights, ids: string[]): boolean {
  return ids.every((f) => Math.abs((a[f] ?? 0) - (b[f] ?? 0)) < EPS);
}

/** The preset these weights match, if any. A preset that predates a factor weighs it 1, as shared links do. */
export function presetFor(w: Weights, presets: Preset[], ids: string[]): Preset | null {
  return presets.find((p) => ids.every((f) => Math.abs((p.weights[f] ?? 1) - (w[f] ?? 0)) < EPS)) ?? null;
}

/** The saved scenario with these exact weights, or null. */
export function findDuplicate(scenarios: Scenario[], w: Weights, ids: string[]): Scenario | null {
  return scenarios.find((s) => sameWeightsAs(s.weights, w, ids)) ?? null;
}

/**
 * The name a scenario should carry after its weights changed. A preset's label while the weights match that preset;
 * "{Preset} (edited)" once they leave it (and no second "(edited)" after further edits); back to the label when they
 * return. Names the user typed are never touched. An empty name gets the matching preset's label, or stays empty.
 */
export function nextName(current: string, w: Weights, presets: Preset[], ids: string[]): string {
  const hit = presetFor(w, presets, ids);
  if (!current.trim()) return hit?.label ?? '';
  const base = current.endsWith(EDITED) ? current.slice(0, -EDITED.length) : current;
  const named = presets.find((p) => p.label === base);
  if (!named) return current;
  return hit ? hit.label : C.scenarios.edited(named.label);
}

/** `name`, or "name 2", "name 3"… when another scenario (not `selfId`) already has it. */
export function uniqueName(name: string, scenarios: Scenario[], selfId?: string): string {
  const taken = new Set(scenarios.filter((s) => s.id !== selfId).map((s) => s.name));
  if (!taken.has(name)) return name;
  for (let i = 2; ; i++) if (!taken.has(`${name} ${i}`)) return `${name} ${i}`;
}

export const alreadySaved = (s: Scenario) => C.scenarios.alreadySaved(s.name);
