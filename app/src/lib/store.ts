import { create } from 'zustand';
import { activeFactorIds, focusTracts, scoring } from './data';
import type { Pin, Scenario, Weights } from './types';

export type Mode = 'explore' | 'tracts' | 'scenarios';
export type MapMetric =
  | { kind: 'top' } // score of the best-matching typology (sequential)
  | { kind: 'pick' } // which typology wins (categorical)
  | { kind: 'typology'; id: string } // one typology's score
  | { kind: 'factor'; id: string } // one observed factor (percentile)
  | { kind: 'lens'; id: 'pressure' | 'bivariate' } // anti-displacement lens (observed, derived)
  | { kind: 'layer'; id: 'elevation' }; // terrain tint, for reference

export const SCENARIO_COLORS = ['#7c3aed', '#0f766e', '#c2410c', '#be185d'];
export const MAX_SCENARIOS = 4;

export const presetWeights = (id: string): Weights => {
  const p = scoring.presets.find((q) => q.id === id) ?? scoring.presets[0];
  const w: Weights = {};
  for (const f of activeFactorIds) w[f] = p?.weights[f] ?? 1;
  return w;
};

export function matchPreset(weights: Weights): string | null {
  for (const p of scoring.presets) if (activeFactorIds.every((f) => Math.abs((p.weights[f] ?? 1) - (weights[f] ?? 0)) < 1e-6)) return p.id;
  return null;
}

function defaultScenarios(): Scenario[] {
  const ids = scoring.presets.map((p) => p.id);
  const a = ids[0] ?? 'balanced';
  const b = ids.includes('anti_displacement') ? 'anti_displacement' : ids[1] ?? a;
  const mk = (id: string): Scenario => ({ id: `s_${id}`, name: scoring.presets.find((p) => p.id === id)?.label ?? id, weights: presetWeights(id) });
  return a === b ? [mk(a)] : [mk(a), mk(b)];
}

let liteDefault = false;
try {
  liteDefault = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
} catch {
  /* no window in tests */
}

export interface AppState {
  view: 'landing' | 'app';
  introNonce: number;
  introDone: boolean;
  mode: Mode;
  selectedId: string | null;
  compareId: string | null;
  weights: Weights;
  scenarios: Scenario[];
  scenA: string;
  scenB: string;
  editing: 'A' | 'B';
  metric: MapMetric;
  pin: Pin | null;
  lite: boolean;
  terrain: boolean;
  sourcesOpen: boolean;
  set: (p: Partial<AppState>) => void;
  setMode: (m: Mode) => void;
  select: (id: string | null) => void;
  setWeights: (w: Weights) => void;
  applyPreset: (id: string) => void;
  setScenarioWeights: (which: 'A' | 'B', w: Weights) => void;
  saveScenario: (name: string, w: Weights) => void;
  removeScenario: (id: string) => void;
}

const initialScenarios = defaultScenarios();

export const useApp = create<AppState>((set, get) => ({
  view: 'landing',
  introNonce: 0,
  introDone: false,
  mode: 'explore',
  selectedId: null,
  compareId: null,
  weights: presetWeights(scoring.presets[0]?.id ?? 'balanced'),
  scenarios: initialScenarios,
  scenA: initialScenarios[0].id,
  scenB: (initialScenarios[1] ?? initialScenarios[0]).id,
  editing: 'B',
  metric: { kind: 'top' },
  pin: null,
  lite: liteDefault,
  terrain: !liteDefault,
  sourcesOpen: false,
  set: (p) => set(p),
  setMode: (mode) => {
    const s = get();
    const patch: Partial<AppState> = { mode };
    if (mode === 'tracts' && !s.compareId) {
      const others = focusTracts.filter((t) => t.GEOID !== s.selectedId);
      patch.compareId = others[0]?.GEOID ?? null;
      if (!s.selectedId) patch.selectedId = others[1]?.GEOID ?? null;
    }
    if (mode === 'scenarios' && !s.selectedId) patch.selectedId = focusTracts[0]?.GEOID ?? null;
    set(patch);
  },
  select: (id) => set({ selectedId: id }),
  setWeights: (weights) => set({ weights }),
  applyPreset: (id) => set({ weights: presetWeights(id) }),
  setScenarioWeights: (which, w) => {
    const s = get();
    const target = which === 'A' ? s.scenA : s.scenB;
    set({ scenarios: s.scenarios.map((sc) => (sc.id === target ? { ...sc, weights: w } : sc)) });
  },
  saveScenario: (name, w) => {
    const s = get();
    if (s.scenarios.length >= MAX_SCENARIOS) return;
    const sc: Scenario = { id: `s_${Date.now().toString(36)}`, name, weights: { ...w } };
    set({ scenarios: [...s.scenarios, sc], scenB: sc.id });
  },
  removeScenario: (id) => {
    const s = get();
    if (s.scenarios.length <= 1) return;
    const rest = s.scenarios.filter((x) => x.id !== id);
    set({ scenarios: rest, scenA: s.scenA === id ? rest[0].id : s.scenA, scenB: s.scenB === id ? (rest[1] ?? rest[0]).id : s.scenB });
  },
}));
