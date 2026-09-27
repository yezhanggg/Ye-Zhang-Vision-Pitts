// The shareable part of the state lives in the URL hash, kept short and readable: only what differs from the
// defaults is written, and separators (, : ~ |) stay unescaped.
//   Explore:  m=explore  L=<layers on>  g=<level>  v=<variable>  u=<level:geoid>  p=<pin>  lite=1
//             (one boundary is open at a time: the level being browsed decides which; `city` in L = "Pittsburgh only")
//   Analysis: m=place|compare|equity (older links: match|tracts|scenarios)  t  b  w (a preset id or factor:weight
//             pairs)  s  sa  sb  c  L  p  lite
// parseHash / encodeHash are pure so they can be unit-tested; readHash / startHashSync wire them to the store.
import { activeFactorIds, scoring, tractById } from './data';
import {
  defaultLayers,
  matchPreset,
  presetWeights,
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
  if (scoring.presets.some((p) => p.id === s)) return presetWeights(s);
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
  let mode = (READ_MODE[q.get('m') ?? ''] ?? q.get('m')) as Mode | null;
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

/** The page names written in links (readable), and the names read back (both the new and the older ones). */
const WRITE_MODE: Record<Mode, string> = { explore: 'explore', match: 'place', tracts: 'compare', scenarios: 'equity' };
const READ_MODE: Record<string, Mode> = { place: 'match', compare: 'tracts', equity: 'scenarios' };

/** Encode a value but keep the separators this format uses readable. */
const enc = (v: string) => encodeURIComponent(v).replace(/%2C/gi, ',').replace(/%3A/gi, ':').replace(/%7C/gi, '|').replace(/%7E/gi, '~');

const sameLayers = (a: Layers, b: Layers) => LAYER_IDS.every((id) => !!a[id] === !!b[id]);
const sameWeights = (a: Weights, b: Weights) => activeFactorIds.every((f) => Math.abs((a[f] ?? 0) - (b[f] ?? 0)) < 1e-6);
const sameScenarios = (a: Scenario[], b: Scenario[]) => a.length === b.length && a.every((x, i) => x.name === b[i].name && sameWeights(x.weights, b[i].weights));

/** Pure: state → hash string (without '#'). Only what differs from the app's defaults is written. */
export function encodeHash(s: AppState): string {
  const d = useApp.getInitialState();
  const q: [string, string][] = [['m', WRITE_MODE[s.mode] ?? s.mode]];
  if (sectionOf(s.mode) === 'explore') {
    if (!sameLayers(s.layers, exclusiveLayers(defaultLayers(s.lite), LAYER_FOR_LEVEL[s.browse.level]))) q.push(['L', encLayers(s.layers)]);
    if (s.browse.level !== 'tract') q.push(['g', s.browse.level]);
    if (s.browse.variable) q.push(['v', s.browse.variable]);
    if (s.browse.selected) q.push(['u', `${s.browse.selected.level}:${s.browse.selected.geoid}`]);
  } else {
    if (s.selectedId) q.push(['t', s.selectedId]);
    if (s.compareId && s.mode === 'tracts') q.push(['b', s.compareId]); // place B only matters on Compare places
    if (!sameWeights(s.weights, d.weights)) q.push(['w', matchPreset(s.weights) ?? encW(s.weights)]);
    const defaultScen = sameScenarios(s.scenarios, d.scenarios);
    if (!defaultScen) q.push(['s', s.scenarios.map((x) => `${encodeURIComponent(x.name)}~${encW(x.weights)}`).join('|')]);
    const ia = Math.max(0, s.scenarios.findIndex((x) => x.id === s.scenA));
    const ib = Math.max(0, s.scenarios.findIndex((x) => x.id === s.scenB));
    const da = Math.max(0, d.scenarios.findIndex((x) => x.id === d.scenA));
    const db = Math.max(0, d.scenarios.findIndex((x) => x.id === d.scenB));
    if (!defaultScen || ia !== da) q.push(['sa', String(ia)]);
    if (!defaultScen || ib !== db) q.push(['sb', String(ib)]);
    if (encMetric(s.metric) !== encMetric(d.metric)) q.push(['c', encMetric(s.metric)]);
    if (!sameLayers(s.layers, defaultLayers(s.lite))) q.push(['L', encLayers(s.layers)]);
  }
  if (s.pin) q.push(['p', encPin(s.pin)]);
  if (s.lite) q.push(['lite', '1']);
  return q.map(([k, v]) => `${k}=${k === 's' || k === 'p' ? v.replace(/&/g, '%26').replace(/#/g, '%23').replace(/=/g, '%3D') : enc(v)}`).join('&');
}

// ---------------------------------------------------------------- page paths on the web
// On the web the state reads as a normal path: /explore, /place, /compare?t=…&b=…, /equity. The offline file
// (file://) keeps the hash form, since a path there would point at a file on disk. Old #m=… links still open.
const PAGES = ['explore', 'place', 'compare', 'equity'] as const;
const PAGE_RE = new RegExp(`(?:^|/)(${PAGES.join('|')})/?$`);

/** The site's base path: "/" on the deployment, or a folder prefix, without the page name. */
export function basePath(pathname: string): string {
  const b = pathname.replace(PAGE_RE, '/');
  return b.endsWith('/') ? b : `${b}/`;
}

/** "m=compare&t=1&b=2" → "compare?t=1&b=2" (relative to the base path). */
export function pathFromHash(hash: string): string {
  const [first, ...rest] = hash.split('&');
  const page = first.startsWith('m=') ? first.slice(2) : 'explore';
  return rest.length ? `${page}?${rest.join('&')}` : page;
}

/** The hash-form state carried by a path URL ("/compare" + "?t=1" → "m=compare&t=1"), or "" when the path names no page. */
export function hashFromPath(pathname: string, search: string): string {
  const m = pathname.match(PAGE_RE);
  if (!m) return '';
  const q = search.replace(/^\?/, '');
  return q ? `m=${m[1]}&${q}` : `m=${m[1]}`;
}

const onWeb = () => {
  try {
    return window.location.protocol === 'http:' || window.location.protocol === 'https:';
  } catch {
    return false;
  }
};

/** Restore state from the URL (a page path on the web, or the hash). Returns true when the URL carried any state. */
export function readHash(): boolean {
  let h = '';
  try {
    h = window.location.hash.replace(/^#/, '') || (onWeb() ? hashFromPath(window.location.pathname, window.location.search) : '');
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
        const web = onWeb();
        const base = basePath(window.location.pathname);
        if (s.view === 'landing') {
          if (last !== '' || window.location.hash || (web && hashFromPath(window.location.pathname, window.location.search))) history.replaceState(null, '', web ? base : window.location.pathname + window.location.search);
          last = '';
          return;
        }
        const next = encodeHash(s);
        if (next === last) return;
        last = next;
        history.replaceState(null, '', web ? `${base}${pathFromHash(next)}` : `#${next}`);
      } catch {
        /* file:// in some browsers */
      }
    }, 250);
  });
}
