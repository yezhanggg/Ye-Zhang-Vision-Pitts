// The shareable part of the state lives in the URL hash: mode, tracts, weights, scenarios, map layer, pin, lite.
import { activeFactorIds, scoring, tractById } from './data';
import { MAX_SCENARIOS, useApp, type MapMetric, type Mode } from './store';
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

/** Restore state from the hash. Returns true when the hash pointed into the app (skips the landing page). */
export function readHash(): boolean {
  let h = '';
  try {
    h = window.location.hash.replace(/^#/, '');
  } catch {
    return false;
  }
  if (!h) return false;
  const q = new URLSearchParams(h);
  const patch: Record<string, unknown> = {};
  const mode = q.get('m') as Mode | null;
  if (mode && ['explore', 'tracts', 'scenarios'].includes(mode)) {
    patch.mode = mode;
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
  if (q.get('lite') === '1') {
    patch.lite = true;
    patch.terrain = false;
  }
  useApp.setState(patch);
  return Boolean(patch.selectedId || patch.mode);
}

export function startHashSync() {
  let timer: number | undefined;
  return useApp.subscribe((s) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      try {
        if (s.view === 'landing') {
          history.replaceState(null, '', window.location.pathname + window.location.search);
          return;
        }
        const q = new URLSearchParams();
        q.set('m', s.mode);
        if (s.selectedId) q.set('t', s.selectedId);
        if (s.compareId) q.set('b', s.compareId);
        q.set('w', encW(s.weights));
        q.set('s', s.scenarios.map((x) => `${encodeURIComponent(x.name)}~${encW(x.weights)}`).join('|'));
        q.set('sa', String(Math.max(0, s.scenarios.findIndex((x) => x.id === s.scenA))));
        q.set('sb', String(Math.max(0, s.scenarios.findIndex((x) => x.id === s.scenB))));
        q.set('c', encMetric(s.metric));
        if (s.pin) q.set('p', encPin(s.pin));
        if (s.lite) q.set('lite', '1');
        history.replaceState(null, '', `#${q.toString()}`);
      } catch {
        /* file:// in some browsers */
      }
    }, 250);
  });
}
