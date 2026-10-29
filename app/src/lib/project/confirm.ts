// Test a project on the Place tab waits for Confirm (Ye, 2026-10-29): the left panel's inputs change at once, but the
// right panel shows the project's results only for the inputs last confirmed; until then (or after any change) it
// shows the place itself (at the Parcel level, the lot and its zoning). A confirmation is the inputs as a key: the
// level, the place (and the lot), the project, the planning inputs and the policies. The tax credit sheet's entries
// sit on the right and are left out, so editing them never hides the results. Session only: every visit starts
// unconfirmed. Compare places applies its inputs at once and does not use this.
// Online only: the modules that import this one load on demand.
import { useMemo } from 'react';
import { create } from 'zustand';
import { usePlan, type PlanState } from '../place/planStore';
import { useZipView } from '../place/zipView';
import { usePolicy, type PolicyState } from '../policy/store';
import { useApp } from '../store';
import { useProject, type ProjectState } from './store';

export const useConfirm = create<{ key: string | null }>(() => ({ key: null }));

/** The inputs as one string: equal keys, equal results. */
export function confirmKey(p: ProjectState, plan: PlanState, pol: PolicyState, area: string, geoid: string | null, zip: string | null): string {
  const { sites, suggested: _lot, ...project } = p;
  const lot = geoid ? sites[geoid]?.lot : undefined;
  const at = area === 'zip' ? `zip:${zip ?? ''}` : `${area}:${geoid ?? ''}${area === 'parcel' && lot ? `:${lot.chunk}:${lot.row}` : ''}`;
  const { setPlan: _fn, ...planIn } = plan;
  return JSON.stringify([at, project, planIn, pol]);
}

const keyNow = () => {
  const z = useZipView.getState();
  return confirmKey(useProject.getState(), usePlan.getState(), usePolicy.getState(), z.area, useApp.getState().selectedId, z.zip);
};

/** Confirm the inputs as they stand (the Confirm button, and an Apply on the right, which is a choice made there). */
export function confirmNow() {
  useConfirm.setState({ key: keyNow() });
}

/** Whether the right panel may show the results: the inputs are the ones confirmed. `ever`: something was confirmed
 *  this visit (so a mismatch reads "changed" rather than "not yet"). */
export function useConfirmed(): { confirmed: boolean; ever: boolean } {
  const project = useProject();
  const plan = usePlan();
  const pol = usePolicy();
  const area = useZipView((s) => s.area);
  const zip = useZipView((s) => s.zip);
  const geoid = useApp((s) => s.selectedId);
  const key = useConfirm((s) => s.key);
  const now = useMemo(() => confirmKey(project, plan, pol, area, geoid, zip), [project, plan, pol, area, geoid, zip]);
  return { confirmed: key === now, ever: key != null };
}
