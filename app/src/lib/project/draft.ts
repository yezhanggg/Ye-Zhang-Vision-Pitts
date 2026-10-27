// The Place tab's inputs before Confirm. The left panel edits these copies (the focusing issue and weights, who you're
// planning for, the project, the tax credit entries and the finder's form); the map and the right panel read the
// shared stores, which change only on Confirm. Until something is edited the copies follow the shared stores (a
// shared link, Compare places' side A). In memory only. Online only: the modules that import this one load on demand.
import { create } from 'zustand';
import { useFinder, finderInputs } from '../finder/store';
import { useLihtc, type Entries } from '../lihtc/store';
import { PLAN_DEFAULTS, usePlan, type PlanState } from '../place/planStore';
import { usePolicy } from '../policy/store';
import { useApp } from '../store';
import type { Weights } from '../types';
import type { Side } from './side';
import { DEFAULT_PROJECT, useProject, type ProjectState } from './store';

export const usePlanDraft = create<PlanState>((set) => ({ ...PLAN_DEFAULTS, setPlan: (p) => set(p) }));
export const useProjectDraft = create<ProjectState>(() => DEFAULT_PROJECT);
export const useLihtcDraft = create<Entries>(() => useLihtc.getState());
export const usePolicyDraft = create(() => usePolicy.getState());
export const useWeightsDraft = create<{ weights: Weights }>(() => ({ weights: useApp.getState().weights }));
/** Something was edited and not confirmed yet. */
export const useDraft = create<{ dirty: boolean }>(() => ({ dirty: false }));

export const SIDE_DRAFT: Side = { plan: usePlanDraft, project: useProjectDraft, lihtc: useLihtcDraft, policy: usePolicyDraft, own: false };

const planOf = (s: PlanState) => {
  const { setPlan: _drop, ...rest } = s;
  return rest;
};

let quiet = false;
const hush = (f: () => void) => {
  quiet = true;
  try {
    f();
  } finally {
    quiet = false;
  }
};

/** Copy the shared settings into the draft (on load, after Confirm, and on Discard). */
export function pullLive() {
  hush(() => {
    usePlanDraft.getState().setPlan(planOf(usePlan.getState()));
    useProjectDraft.setState(structuredClone(useProject.getState()), true);
    useLihtcDraft.setState(structuredClone(useLihtc.getState()), true);
    usePolicyDraft.setState(structuredClone(usePolicy.getState()), true);
    useWeightsDraft.setState({ weights: { ...useApp.getState().weights } });
  });
  useDraft.setState({ dirty: false });
}

/** Apply the draft: the map, the suggestion and the right panel follow. The finder ranks on its confirmed form. */
export function confirmDraft() {
  hush(() => {
    // Inputs the online panel no longer asks for: the household is read from each place, transit is the ½-mile
    // screen, and the flood limit is the flood screen.
    usePlanDraft.getState().setPlan({ size: 'auto', transitMi: 0.5, flood: usePolicyDraft.getState().flood });
    usePlan.getState().setPlan(planOf(usePlanDraft.getState()));
    useProject.setState(structuredClone(useProjectDraft.getState()), true);
    useLihtc.setState(structuredClone(useLihtcDraft.getState()), true);
    usePolicy.setState(structuredClone(usePolicyDraft.getState()), true);
    useApp.getState().setWeights({ ...useWeightsDraft.getState().weights });
    const f = useFinder.getState();
    if (f.open || !useApp.getState().selectedId) useFinder.setState({ open: true, applied: finderInputs(f, usePlan.getState().homes) });
  });
  useDraft.setState({ dirty: false });
}

/** A change that is not an edit (the map read at the pin): made to the shared project and to the draft together, so
 *  Confirm keeps it and nothing waits for Confirm because of it. */
export function setProjectBoth(f: (s: ProjectState) => Partial<ProjectState>) {
  hush(() => {
    useProject.setState(f);
    useProjectDraft.setState(f);
  });
}

/** An entry on the tax credit sheet (a result on the right that takes entries): applied to the shared entries and the
 *  draft together, so it counts at once and Confirm keeps it. */
export function setLihtcBoth(f: (e: Entries) => Partial<Entries>) {
  hush(() => {
    useLihtc.setState(f);
    useLihtcDraft.setState(f);
  });
}

const edited = () => {
  if (!quiet) useDraft.setState({ dirty: true });
};
usePlanDraft.subscribe(edited);
useProjectDraft.subscribe(edited);
useLihtcDraft.subscribe(edited);
usePolicyDraft.subscribe(edited);
useWeightsDraft.subscribe(edited);
useFinder.subscribe((s, prev) => {
  if (s.inputs !== prev.inputs) edited();
});

// The shared settings changed elsewhere: follow them while nothing here waits for Confirm.
const follow = () => {
  if (!quiet && !useDraft.getState().dirty) pullLive();
};
usePlan.subscribe(follow);
useProject.subscribe(follow);
useLihtc.subscribe(follow);
usePolicy.subscribe(follow);
useApp.subscribe((s, prev) => {
  if (s.weights !== prev.weights) follow();
});

pullLive();
