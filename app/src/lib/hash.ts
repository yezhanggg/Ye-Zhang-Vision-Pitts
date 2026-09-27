// The shareable part of the state lives in the URL hash.
//   Explore:  m=explore  L=<layers on>  g=<level>  v=<variable>  u=<level:geoid>  p=<pin>  lite=1
//             (one boundary is open at a time: the level being browsed decides which; `city` in L = "Pittsburgh only")
//   Analysis: m=match|tracts|scenarios  t  b  w  s  sa  sb  c  L  p  lite
// parseHash / encodeHash are pure so they can be unit-tested; readHash / startHashSync wire them to the store.
import { activeFactorIds, scoring, tractById } from './data';
import {
  defaultLayers,
  exclusiveLayers,
  isAnalysisId,
  LAYER_FOR_LEVEL,
  LAYER_IDS,
  LEVELS,
  MAX_SCENARIOS,
  MODES,
  sectionOf,
  useApp,
  type AppState,
  type Browse,
  type LayerId,
  type Layers,
  type Level,
  type MapMetric,
  type Mode,
} from './store';
import type { Pin, Scenario, Weights } from './types';

const encW = (w: Weights) => activeFactorIds.map((f) => `${f}:${+(w[f] ?? 0).toFixed(2)}`).join(',');
function decW(s: string | null): Weights | null {
  if (!s) return null;
  const w: Weights = {};
  for (const part of s.split(',')) {
    const [k, v] = part.split(':');
    const n = Number(v);
    if (k && Number.isFinite(n)) w[k] = Math.max(0, Math.min(5, n));
  }
  for (const f of activeFactorIds) if (!(f in w)) w[f] = 1;
  return w;
}
const encMetric = (m: MapMetric) => (m.kind === 'top' || m.kind === 'pick' ? m.kind : `${m.kind}.${m.id}`);
function decMetric(s: string | null): MapMetric | null {
  if (!s) return null;
  if (s === 'top' || s === 'pick') return { kind: s };
  const [k, id] = s.split('.');
  if (k === 'typology' && scoring.typologies.some((t) => t.id === id)) return { kind: 'typology', id };
  if (k === 'factor' && activeFactorIds.includes(id)) return { kind: 'factor', id };
  if (k === 'lens' && (id === 'pressure' || id === 'bivariate')) return { kind: 'lens', id };
  if (k === 'info' && id === 'rent_growth_existing') return { kind: 'info', id };
  if (k === 'layer' && id === 'elevation') return { kind: 'layer', id };
  return null;
}
export const encPin = (p: Pin) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)},${encodeURIComponent(p.label)}`;
export function decPin(s: string | null): Pin | null {
  if (!s) return null;
  const [lng, lat, ...rest] = s.split(',');
  const x = Number(lng), y = Number(lat);
  if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 180 || Math.abs(y) > 90) return null;
  let label = rest.join(',');
  try {
    label = decodeURIComponent(label);
  } catch {
    /* keep raw */
  }
  return { lng: x, lat: y, label: label.slice(0, 120) };
}

const isLevel = (s: string | null): s is Level => !!s && (LEVELS as string[]).includes(s);
const isLayer = (s: string): s is LayerId => (LAYER_IDS as string[]).includes(s);
/** Variable ids are validated by the Explore catalogue at render time; here only the shape is checked. */
const VAR_RE = /^[a-z][a-z0-9_]{0,40}$/;
const GEOID_RE = /^\d{5,12}$/;

const encLayers = (l: Layers) => LAYER_IDS.filter((id) => l[id]).join(',');
function decLayers(s: string | null): Layers | null {
  if (s == null) return null;
  const on = new Set(s.split(',').filter(isLayer));
  const out = {} as Layers;
  for (const id of LAYER_IDS) out[id] = on.has(id);
  return out;
}

/** Pure: hash string (without '#') → state patch. Unknown or malformed values are dropped, never thrown. */
export function parseHash(h: string): Partial<AppState> {
  const q = new URLSearchParams(h.replace(/^#/, ''));
  const patch: Partial<AppState> = {};
  const hasExplore = ['L', 'g', 'v', 'u'].some((k) => q.has(k));
  let mode = q.get('m') as Mode | null;
  // Links written before the Explore/Analysis split used m=explore for the matchmaker.
  if (mode === 'explore' && !hasExplore && (q.has('c') || q.has('w'))) mode = 'match';
  if (mode && MODES.includes(mode)) {
    patch.mode = mode;
    if (mode !== 'explore') patch.lastAnalysis = mode;
    // A link into the app skips the landing page and the globe intro.
    patch.view = 'app';
    patch.introDone = true;
  }
  const t = q.get('t');
  if (t && tractById.has(t)) patch.selectedId = t;
  const b = q.get('b');
  if (b && tractById.has(b)) patch.compareId = b;
  const w = decW(q.get('w'));
  if (w) patch.weights = w;
  const sc = q.get('s');
  if (sc) {
    const scenarios: Scenario[] = sc.split('|').slice(0, MAX_SCENARIOS).map((chunk, i) => {
      const [name, ws] = chunk.split('~');
      return { id: `s_h${i}`, name: decodeURIComponent(name || `Scenario ${i + 1}`), weights: decW(ws) ?? {} };
    });
    if (scenarios.length) {
      patch.scenarios = scenarios;
      const a = Number(q.get('sa') ?? 0), bb = Number(q.get('sb') ?? 1);
      patch.scenA = scenarios[Math.min(a, scenarios.length - 1)].id;
      patch.scenB = scenarios[Math.min(bb, scenarios.length - 1)].id;
    }
  }
  const metric = decMetric(q.get('c'));
  if (metric) patch.metric = metric;
  const pin = decPin(q.get('p'));
  if (pin) patch.pin = pin;
  const layers = decLayers(q.get('L'));
  if (layers) patch.layers = layers;
  const browse: Partial<Browse> = {};
  const g = q.get('g');
  if (isLevel(g)) browse.level = g;
  const v = q.get('v');
  if (v && VAR_RE.test(v)) browse.variable = v;
  const u = q.get('u');
  if (u) {
    const [lvl, geoid] = u.split(':');
    if (isLevel(lvl) && geoid && GEOID_RE.test(geoid)) browse.selected = { level: lvl, geoid };
  }
  if (Object.keys(browse).length) {
    const b: Browse = { level: 'tract', variable: null, selected: null, ...browse };
    // The selected unit decides the boundary; Analysis layers exist for tracts only.
    if (b.selected) b.level = b.selected.level;
    else if (isAnalysisId(b.variable)) b.level = 'tract';
    if (b.level !== 'tract' && isAnalysisId(b.variable)) b.variable = null;
    patch.browse = b;
    patch.browsePanel = !!(b.selected || b.variable);
  }
  if (q.get('lite') === '1') {
    patch.lite = true;
    patch.layers = { ...(patch.layers ?? defaultLayers(true)), terrain: false };
  }
  // One boundary at a time. Links written before that rule may list several; the browsed level wins.
  if (patch.layers || patch.browse) {
    const b = patch.browse;
    const id = LAYER_FOR_LEVEL[b?.level ?? 'tract'];
    const base = patch.layers ?? defaultLayers(!!patch.lite);
    const open = !q.has('L') || base[id] || !!b?.variable || !!b?.selected;
    patch.layers = exclusiveLayers(base, open ? id : null);
  }
  return patch;
}

/** Pure: state → hash string (without '#'). Explore and Analysis write only the params they use. */
export function encodeHash(s: AppState): string {
  const q = new URLSearchParams();
  q.set('m', s.mode);
  if (sectionOf(s.mode) === 'explore') {
    q.set('L', encLayers(s.layers));
    if (s.browse.level !== 'tract') q.set('g', s.browse.level);
    if (s.browse.variable) q.set('v', s.browse.variable);
    if (s.browse.selected) q.set('u', `${s.browse.selected.level}:${s.browse.selected.geoid}`);
  } else {
    if (s.selectedId) q.set('t', s.selectedId);
    if (s.compareId) q.set('b', s.compareId);
    q.set('w', encW(s.weights));
    q.set('s', s.scenarios.map((x) => `${encodeURIComponent(x.name)}~${encW(x.weights)}`).join('|'));
    q.set('sa', String(Math.max(0, s.scenarios.findIndex((x) => x.id === s.scenA))));
    q.set('sb', String(Math.max(0, s.scenarios.findIndex((x) => x.id === s.scenB))));
    q.set('c', encMetric(s.metric));
    q.set('L', encLayers(s.layers));
  }
  if (s.pin) q.set('p', encPin(s.pin));
  if (s.lite) q.set('lite', '1');
  return q.toString();
}

/** Restore state from the hash. Returns true when the hash carried any state. */
export function readHash(): boolean {
  let h = '';
  try {
    h = window.location.hash.replace(/^#/, '');
  } catch {
    return false;
  }
  if (!h) return false;
  const patch = parseHash(h);
  useApp.setState(patch);
  return Object.keys(patch).length > 0;
}

export function startHashSync() {
  let timer: number | undefined;
  let last = '';
  return useApp.subscribe((s) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      try {
        if (s.view === 'landing') {
          if (last !== '') history.replaceState(null, '', window.location.pathname + window.location.search);
          last = '';
          return;
        }
        const next = encodeHash(s);
        if (next === last) return;
        last = next;
        history.replaceState(null, '', `#${next}`);
      } catch {
        /* file:// in some browsers */
      }
    }, 250);
  });
}
