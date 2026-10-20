// Which screens and optional incentives are switched on (lib/policy/catalog). The Place tab and Compare's side A share
// one copy; Compare's side B and the Place tab's draft have their own (lib/project/side, lib/project/draft). In
// memory only. Binding rules have no switch: they always apply where the place's data says they do.
import { create } from 'zustand';
import type { FloodRisk } from '../place/plan';

/** Incentives with a switch: shown in the results as counted when on. */
export type OptionalId = 'ahb' | 'hof' | 'abatement' | 'parking';

export interface PolicyState {
  displacement: boolean;
  transit: boolean;
  /** The most flood-zone land accepted; 'any' is the screen switched off. */
  flood: FloodRisk;
  on: Partial<Record<OptionalId, boolean>>;
}

export const DEFAULT_POLICY: PolicyState = { displacement: false, transit: false, flood: 'any', on: {} };

export const usePolicy = create<PolicyState>(() => DEFAULT_POLICY);
