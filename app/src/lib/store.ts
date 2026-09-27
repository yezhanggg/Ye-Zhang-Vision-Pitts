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
export type Level = 'tract' | 'bg' | 'zcta' | 'muni';
export const LEVELS: Level[] = ['tract', 'bg', 'zcta', 'muni'];
export type LayerId = 'buildings' | 'terrain' | 'hillshade' | 'tracts' | 'bg' | 'zcta' | 'muni' | 'county' | 'city';
export const LAYER_IDS: LayerId[] = ['buildings', 'terrain', 'hillshade', 'tracts', 'bg', 'zcta', 'muni', 'county', 'city'];
export type Layers = Record<LayerId, boolean>;
/** The map layer that carries a browse level. */
export const LAYER_FOR_LEVEL: Record<Level, LayerId> = { tract: 'tracts', bg: 'bg', zcta: 'zcta', muni: 'muni' };
/** The boundaries of Explore. One is open at a time; the Data list and the summary follow the open one. */
export const BOUNDARY_LAYERS: LayerId[] = ['tracts', 'bg', 'zcta', 'muni'];
const LEVEL_FOR_LAYER: Partial<Record<LayerId, Level>> = { tracts: 'tract', bg: 'bg', zcta: 'zcta', muni: 'muni' };
/** Analysis layers (ids `an_*`) exist for city tracts only. */
export const isAnalysisId = (id: string | null | undefined) => !!id && id.startsWith('an_');
/**
 * Keeps `keep` as the only open boundary (none when null). `city` is the "Pittsburgh only" switch: it limits the
 * shapes to the city and draws the city limits. Municipalities all lie outside the city, so opening them turns it off.
 */
export function exclusiveLayers(layers: Layers, keep: LayerId | null): Layers {
  const out: Layers = { ...layers, county: false };
  for (const id of BOUNDARY_LAYERS) out[id] = id === keep;
  if (keep === 'muni') out.city = false;
  return out;
}

export interface Browse {
  level: Level;
  /** Catalogue variable id painted on the map, or null. */
  variable: string | null;
  /** Unit opened in the place card. */
  selected: { level: Level; geoid: string } | null;
}

// ------------------------------------------------------------------ layout: floating panels and their sections
/** Collapsible sections of the left panel. Explore uses search/layers (Boundary)/data/settings; the Analysis views use the rest. */
export type SectionId = 'search' | 'layers' | 'data' | 'settings' | 'place' | 'priorities' | 'colorBy' | 'save' | 'compare';
export type SectionState = 'open' | 'collapsed' | 'hidden';
export const SECTION_IDS: SectionId[] = ['search', 'layers', 'data', 'settings', 'place', 'priorities', 'colorBy', 'save', 'compare'];
export const SECTION_LABELS: Record<SectionId, string> = {
  search: 'Search',
  layers: 'Boundary',
  data: 'Data',
  settings: 'Settings',
  place: 'Find a place',
  priorities: 'What matters most',
  colorBy: 'Color the map by',
  save: 'Save & compare',
  compare: 'Scenarios',
};
/** Sections each mode shows, in panel order (the Panels menu lists these). */
export const SECTIONS_FOR_MODE: Record<Mode, SectionId[]> = {
  explore: ['search', 'layers', 'data', 'settings'],
  match: ['place', 'priorities', 'colorBy', 'save'],
  tracts: ['place', 'priorities', 'colorBy'],
  scenarios: ['place', 'compare', 'priorities'],
};
export interface UiState {
  /** Left panel shown (Explore, Match: floating card; compare views: docked column). */
  left: boolean;
  /** Right summary panel shown (Explore, Match). */
  right: boolean;
  sections: Record<SectionId, SectionState>;
}
const UI_KEY = 'visionpitts.ui';
/** Everything open except Settings, which most visits never need. */
export const defaultUi = (): UiState => ({ left: true, right: true, sections: Object.fromEntries(SECTION_IDS.map((id) => [id, id === 'settings' ? 'collapsed' : 'open'])) as Record<SectionId, SectionState> });
/** Layout preferences persist per browser; never in the URL. Anything unreadable falls back to the defaults. */
function readUi(): UiState {
  const d = defaultUi();
  try {
    const raw = localStorage.getItem(UI_KEY);
    if (!raw) return d;
    const p = JSON.parse(raw) as Partial<UiState>;
    const sections = { ...d.sections };
    for (const id of SECTION_IDS) {
      const v = p.sections?.[id];
      if (v === 'open' || v === 'collapsed' || v === 'hidden') sections[id] = v;
    }
    return { left: p.left !== false, right: p.right !== false, sections };
  } catch {
    return d;
  }
}
function writeUi(ui: UiState) {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(ui));
  } catch {
    /* private mode or no storage */
  }
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

/**
 * Hill shading is off by default so the basemap stays evenly toned; 3D relief and contours follow the Terrain layer.
 * Explore opens on census tracts with "Pittsburgh only" (`city`) on.
 */
export const defaultLayers = (lite = liteDefault): Layers => ({ buildings: true, terrain: !lite, hillshade: false, tracts: true, bg: false, zcta: false, muni: false, county: false, city: true });
export const defaultBrowse = (): Browse => ({ level: 'tract', variable: null, selected: null });

export interface AppState {
  /** Landing page first; deep links (any hash with a mode) open the app directly. */
  view: 'landing' | 'app';
  /** Incremented by the landing page's Open button; the globe intro plays once per increment. */
  introNonce: number;
  introDone: boolean;
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
  /** Explore's summary panel. Per visit, not stored: it opens when there is something to show and folds away after. */
  browsePanel: boolean;
  /** The "click a boundary" hint was closed. Per visit: it comes back each time the tool is opened. */
  hintClosed: boolean;
  ui: UiState;
  set: (p: Partial<AppState>) => void;
  setUi: (p: Partial<UiState>) => void;
  setSection: (id: SectionId, state: SectionState) => void;
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

/** Explore's summary panel opens when a new unit or variable gives it something to show, and folds away when nothing is left. */
function panelAfter(was: boolean, before: Browse, after: Browse): boolean {
  const has = !!(after.selected || after.variable);
  if (has && (after.selected !== before.selected || after.variable !== before.variable)) return true;
  if (!has && (before.selected || before.variable)) return false;
  return was;
}

export const useApp = create<AppState>((set, get) => ({
  view: 'landing',
  introNonce: 0,
  introDone: false,
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
  browsePanel: false,
  hintClosed: false,
  ui: readUi(),
  set: (p) => set(p),
  setUi: (p) => {
    const ui = { ...get().ui, ...p };
    writeUi(ui);
    set({ ui });
  },
  setSection: (id, state) => {
    const s = get();
    const ui = { ...s.ui, sections: { ...s.ui.sections, [id]: state } };
    writeUi(ui);
    set({ ui });
  },
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
  select: (id) => {
    const s = get();
    set(id && !s.ui.right ? { selectedId: id, ui: { ...s.ui, right: true } } : { selectedId: id });
  },
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
    const level = LEVEL_FOR_LAYER[id];
    if (level) {
      // A boundary: opening one closes the others and the data follows it; closing it clears what was painted.
      const same = level === s.browse.level;
      const browse: Browse = on
        ? { level, variable: same || (level === 'tract' ? true : !isAnalysisId(s.browse.variable)) ? s.browse.variable : null, selected: same ? s.browse.selected : null }
        : { level: s.browse.level, variable: null, selected: null };
      set({ layers: exclusiveLayers(s.layers, on ? id : null), browse, browsePanel: panelAfter(s.browsePanel, s.browse, browse) });
      return;
    }
    if (id === 'city') {
      // "Pittsburgh only". Municipalities all lie outside the city, so it stays off while they are open.
      if (on && s.layers.muni) return;
      const sel = s.browse.selected;
      const keep = !on || !sel || (sel.level === 'tract' && tractById.has(sel.geoid));
      const browse: Browse = keep ? s.browse : { ...s.browse, selected: null };
      set({ layers: { ...s.layers, city: on }, browse, browsePanel: panelAfter(s.browsePanel, s.browse, browse) });
      return;
    }
    const patch: Partial<AppState> = { layers: { ...s.layers, [id]: on } };
    if (id === 'terrain' && on && s.lite) patch.lite = false;
    set(patch);
  },
  setBrowse: (p) => {
    const s = get();
    const browse: Browse = { ...s.browse, ...p };
    // The selected unit and an Analysis layer decide the boundary; anything that no longer fits it is dropped.
    if (p.selected) browse.level = p.selected.level;
    else if (p.variable && isAnalysisId(p.variable)) browse.level = 'tract';
    if (browse.selected && browse.selected.level !== browse.level) browse.selected = null;
    if (browse.level !== 'tract' && isAnalysisId(browse.variable)) browse.variable = null;
    const patch: Partial<AppState> = { browse, browsePanel: panelAfter(s.browsePanel, s.browse, browse) };
    // Choosing a level, a variable or a unit opens that level's boundary (and only that one).
    const layer = LAYER_FOR_LEVEL[browse.level];
    if ((browse.level !== s.browse.level || p.variable || p.selected) && BOUNDARY_LAYERS.some((id) => s.layers[id] !== (id === layer))) patch.layers = exclusiveLayers(s.layers, layer);
    // A selected city tract is also the Analysis tract, so "Open in Analysis" lands on it.
    if (p.selected && p.selected.level === 'tract' && tractById.has(p.selected.geoid)) patch.selectedId = p.selected.geoid;
    set(patch);
  },
}));
