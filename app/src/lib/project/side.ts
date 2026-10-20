// Whose settings a project card or an editor reads and writes. The Place tab and side A of Compare places use the
// shared stores (lib/place/planStore, lib/project/store, the tax credit entries); side B of Compare uses its own copy
// once "Separate settings" is on (lib/compare/store), so one place can be read under two sets of settings.
// Online only: the modules that import this one load on demand.
import { createContext, useContext } from 'react';
import { create } from 'zustand';
import { useLihtc, type Entries } from '../lihtc/store';
import { DEFAULT_POLICY, usePolicy } from '../policy/store';
import { PLAN_DEFAULTS, usePlan, type PlanState } from '../place/planStore';
import type { Branch } from '../pencil/inputs';
import { DEFAULT_PROJECT, useProject, type ProjectState } from './store';

export interface Side {
  plan: typeof usePlan;
  project: typeof useProject;
  /** The tax credit entries this side writes (side B shares A's). */
  lihtc: typeof useLihtc;
  /** The screens and incentives switched on (lib/policy). */
  policy: typeof usePolicy;
  /** Side B with its own settings: its financing picks the credit its tax credit sheet is scored for. */
  own: boolean;
}

export const SIDE_A: Side = { plan: usePlan, project: useProject, lihtc: useLihtc, policy: usePolicy, own: false };

/** Side B's planning inputs and project (session only, never saved). */
export const usePlanB = create<PlanState>((set) => ({ ...PLAN_DEFAULTS, setPlan: (p) => set(p) }));
export const useProjectB = create<ProjectState>(() => DEFAULT_PROJECT);
export const usePolicyB = create(() => DEFAULT_POLICY);
export const SIDE_B: Side = { plan: usePlanB, project: useProjectB, lihtc: useLihtc, policy: usePolicyB, own: true };

export const SideContext = createContext<Side>(SIDE_A);
export const useSide = () => useContext(SideContext);

/** Copy side A's settings to side B (when Compare's settings are split, B starts where A is). */
export function copyAToB() {
  const { setPlan: _keep, ...plan } = usePlan.getState();
  usePlanB.getState().setPlan(plan);
  useProjectB.setState(structuredClone(useProject.getState()), true);
  usePolicyB.setState(structuredClone(usePolicy.getState()), true);
}

/** Pick the financing on a side: the pencil's branch and, on the shared side, the tax credit sheet's credit. */
export function setFinancingOn(side: Side, b: Branch) {
  side.project.setState((s) => ({ pencil: { ...s.pencil, branch: b } }));
  if (!side.own && b !== 'market') side.lihtc.setState((e) => ({ setup: { ...e.setup, credit: b } }));
}

/** The tax credit entries as a side reads them: side B's chosen credit and residents replace the shared ones. */
export function entriesFor(side: Side, entries: Entries, project: ProjectState, senior?: boolean): Entries {
  if (!side.own) return entries;
  const b = project.pencil.branch;
  const credit = b === 'nine' || b === 'four' ? b : entries.setup.credit;
  const occupancy = senior == null ? entries.setup.occupancy : senior ? 'senior' : 'general';
  return { ...entries, setup: { ...entries.setup, credit, occupancy } };
}
