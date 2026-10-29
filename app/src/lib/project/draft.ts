// Changes that are not typed in the left panel but made on the page: the map read at the pin, a lot picked at the
// Parcel level (lib/parcel/pick), an entry on the tax credit sheet. They go straight to the shared stores.
// (Until 2026-10-27 the Place tab's left panel edited a draft that waited for a Confirm button; these helpers wrote to
// the draft too. Ye found Compare's apply-at-once inputs easier, so the draft is gone and they keep their names.)
// Online only: the modules that import this one load on demand.
import { useLihtc, type Entries } from '../lihtc/store';
import type { Side } from './side';
import { DEFAULT_PROJECT, useProject, type ProjectState } from './store';

/** A change to the project made by the page itself (the map read at the pin, a lot picked). */
export function setProjectBoth(f: (s: ProjectState) => Partial<ProjectState>) {
  useProject.setState(f);
}

/** An entry on the tax credit sheet (a result on the right that takes entries). */
export function setLihtcBoth(f: (e: Entries) => Partial<Entries>) {
  useLihtc.setState(f);
}

const restored = new Set<string>();

/** A lot picked at the Parcel level suggests units and stories that fit it (lib/zoning/check lotDefaults), once per
 *  lot, never over the person's own: the units only while they are the example or the last lot's suggestion (and the
 *  mix is not the person's own), the stories only while they are the default or the last suggestion. The type stays
 *  the person's choice; the review explains what the lot allows. */
export function suggestForLot(side: Side, lot: string, d: { units: number; stories: number } | null) {
  const p = side.project.getState();
  if (p.suggested?.lot === lot) {
    // After a reload the units (session only) are back to the example while the suggestion (saved) stays: once.
    if (!restored.has(lot) && p.suggested.units != null && p.mode !== 'mine' && side.plan.getState().homes == null) side.plan.getState().setPlan({ homes: p.suggested.units });
    restored.add(lot);
    return;
  }
  restored.add(lot);
  if (!d) return;
  const was = p.suggested;
  const homes = side.plan.getState().homes;
  const unitsFree = p.mode !== 'mine' && (homes == null || (was?.units != null && homes === was.units));
  const storiesFree = was ? was.stories != null && p.stories === was.stories : p.stories === DEFAULT_PROJECT.stories;
  side.project.setState({ ...(storiesFree ? { stories: d.stories } : {}), suggested: { lot, units: unitsFree ? d.units : null, stories: storiesFree ? d.stories : null } });
  if (unitsFree) side.plan.getState().setPlan({ homes: d.units });
}

/** Leaving the Parcel level: the lot's suggestion belongs to the lot, so units and stories it set go back to the example
 *  (values the person typed stay), and the next lot pick suggests again. */
export function dropLotSuggestion(side: Side) {
  const p = side.project.getState();
  const was = p.suggested;
  if (!was) return;
  if (was.units != null && p.mode !== 'mine' && side.plan.getState().homes === was.units) side.plan.getState().setPlan({ homes: null });
  side.project.setState({ ...(was.stories != null && p.stories === was.stories ? { stories: DEFAULT_PROJECT.stories } : {}), suggested: undefined });
  restored.delete(was.lot);
}
