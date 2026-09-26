import { create } from 'zustand';
import { activeFactorIds, focusTracts, scoring, tractById } from './data';
import type { Pin, Scenario, Weights } from './types';

/** Top-level sections: Explore (data browser) and Analysis (Match, Compare tracts, Compare scenarios). */
export type Mode = 'explore' | 'match' | 'tracts' | 'scenarios';
export type AnalysisMode = Exclude<Mode, 'explore'>;
export const MODES: Mode[] = ['explore', 'match', 'tracts', 'scenarios'];
export const sectionOf = (m: Mode): 'explore' | 'analysis' => (m === 'explore' ? 'explore' : 'analysis');

export type MapMetric =
  | { kind: 'top' } // score of the best-matching typology (sequential)
  | { kind: 'pick' } // which typology wins (categorical)
  | { kind: 'typology'; id: string } // one typology's score
  | { kind: 'factor'; id: string } // one observed factor (percentile)
  | { kind: 'lens'; id: 'pressure' | 'bivariate' } // anti-displacement lens (observed, derived)
  | { kind: 'info'; id: 'rent_growth_existing' } // information layer (licensed listing data), never scored
  | { kind: 'layer'; id: 'elevation' }; // terrain tint, for reference

// ------------------------------------------------------------------ Explore: layers and the data browser
/** Geographies the data browser can paint. County and city are single values shown as reference lines. */
export type Level = 'tract' | 'bg' | 'zcta';
export const LEVELS: Level[] = ['tract', 'bg', 'zcta'];
export type LayerId = 'buildings' | 'terrain' | 'tracts' | 'bg' | 'zcta' | 'county' | 'city';
export const LAYER_IDS: LayerId[] = ['buildings', 'terrain', 'tracts', 'bg', 'zcta', 'county', 'city'];
export type Layers = Record<LayerId, boolean>;
/** The map layer that carries a browse level. */
export const LAYER_FOR_LEVEL: Record<Level, LayerId> = { tract: 'tracts', bg: 'bg', zcta: 'zcta' };

export interface Browse {
  level: Level;
  /** Catalogue variable id painted on the map, or null. */
  variable: string | null;
  /** Unit opened in the place card. */
  selected: { level: Level; geoid: string } | null;
}

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

export const defaultLayers = (lite = liteDefault): Layers => ({ buildings: true, terrain: !lite, tracts: true, bg: false, zcta: false, county: false, city: true });
export const defaultBrowse = (): Browse => ({ level: 'tract', variable: null, selected: null });

export interface AppState {
  mode: Mode;
  /** Last Analysis sub-tab, so the Analysis button returns to it. */
  lastAnalysis: AnalysisMode;
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
  sourcesOpen: boolean;
  layers: Layers;
  browse: Browse;
  /** Unit under the cursor in Explore (for the legend tick). */
  hoverId: string | null;
  set: (p: Partial<AppState>) => void;
  setMode: (m: Mode) => void;
  select: (id: string | null) => void;
  setWeights: (w: Weights) => void;
  applyPreset: (id: string) => void;
  setScenarioWeights: (which: 'A' | 'B', w: Weights) => void;
  saveScenario: (name: string, w: Weights) => void;
  removeScenario: (id: string) => void;
  setLayer: (id: LayerId, on: boolean) => void;
  setBrowse: (p: Partial<Browse>) => void;
}

const initialScenarios = defaultScenarios();

export const useApp = create<AppState>((set, get) => ({
  mode: 'explore',
  lastAnalysis: 'match',
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
  sourcesOpen: false,
  layers: defaultLayers(),
  browse: defaultBrowse(),
  hoverId: null,
  set: (p) => set(p),
  setMode: (mode) => {
    const s = get();
    const patch: Partial<AppState> = { mode };
    if (mode !== 'explore') patch.lastAnalysis = mode;
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
  setLayer: (id, on) => {
    const s = get();
    const patch: Partial<AppState> = { layers: { ...s.layers, [id]: on } };
    if (id === 'terrain' && on && s.lite) patch.lite = false;
    set(patch);
  },
  setBrowse: (p) => {
    const s = get();
    const browse: Browse = { ...s.browse, ...p };
    const patch: Partial<AppState> = { browse };
    // Choosing a level or a variable turns that level's map layer on so the choice is visible.
    if ((p.level && p.level !== s.browse.level) || (p.variable && !s.browse.variable)) {
      const layer = LAYER_FOR_LEVEL[browse.level];
      if (!s.layers[layer]) patch.layers = { ...s.layers, [layer]: true };
    }
    // A selected city tract is also the Analysis tract, so "Open in Analysis" lands on it.
    if (p.selected && p.selected.level === 'tract' && tractById.has(p.selected.geoid)) patch.selectedId = p.selected.geoid;
    set(patch);
  },
}));
