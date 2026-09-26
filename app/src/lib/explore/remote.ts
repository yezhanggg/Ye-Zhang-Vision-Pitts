// County-wide data from Supabase, layered over the bundled city subset.
// Every hook returns the bundled data at once (source 'bundled', scope 'city') and swaps to the Supabase rows
// (source 'supabase', scope 'county') when they arrive. Any failure keeps the bundle and logs once per session.
import { useEffect, useMemo, useState } from 'react';
import { tractById } from '../data';
import { restGet, supabase } from '../supabase';
import { bundledGeo, bundledValues, levelMeta, reference, unitValues, valuesFor } from './catalog';
import type { DataSource, Estimate, GeoLevel, Loaded, Scope, UnitFC, UnitFeature, ValueMap } from './types';

let unavailable = false;
function markUnavailable(): void {
  if (unavailable) return;
  unavailable = true;
  console.info('[explore] supabase unavailable, using bundled city subset');
}
/** True while the project is configured and no request has failed this session. */
export const remoteEnabled = () => !!supabase && !unavailable;
/** Whether the online scope is on the table at all (null over file:// or without keys). */
export const remoteConfigured = () => !!supabase;

interface GeoRow {
  geoid: string;
  name: string;
  tract: string | null;
  pgh_share: number | null;
  geom: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown } | null;
}
interface ValueRow {
  geoid: string;
  est: number | null;
  moe: number | null;
  cv: number | null;
}
interface UnitRow extends ValueRow {
  var: string;
}

const geoPromises = new Map<GeoLevel, Promise<UnitFC | null>>();
const geoResults = new Map<GeoLevel, UnitFC>();
/** County-wide geometry for a level, or null (bundled already complete, offline, empty table, error). Memoized. */
export function loadGeo(level: GeoLevel): Promise<UnitFC | null> {
  let p = geoPromises.get(level);
  if (!p) {
    p = (async () => {
      if (!remoteEnabled()) return null;
      const meta = levelMeta(level);
      if (meta.total <= meta.bundled) return null;
      try {
        const rows = await restGet<GeoRow>('geo_units', { level: `eq.${level}`, select: 'geoid,name,tract,pgh_share,geom', order: 'geoid' });
        if (!rows.length) throw new Error(`geo_units has no ${level} rows`);
        const features: UnitFeature[] = [];
        for (const r of rows) {
          if (!r.geom) continue;
          const local = level === 'tract' ? tractById.get(r.geoid) : undefined;
          features.push({
            type: 'Feature',
            properties: { GEOID: r.geoid, name: r.name, tract: r.tract, pgh_share: r.pgh_share, ...(local ? { neighborhood: local.neighborhood, residential: local.residential, focus: local.focus } : {}) },
            geometry: r.geom,
          });
        }
        const fc: UnitFC = { type: 'FeatureCollection', features };
        geoResults.set(level, fc);
        return fc;
      } catch {
        markUnavailable();
        return null;
      }
    })();
    geoPromises.set(level, p);
  }
  return p;
}

const valuePromises = new Map<string, Promise<ValueMap | null>>();
const valueResults = new Map<string, ValueMap>();
/** County-wide values of one variable at a level, or null. Memoized per level:variable. */
export function loadValues(level: GeoLevel, varId: string): Promise<ValueMap | null> {
  const key = `${level}:${varId}`;
  let p = valuePromises.get(key);
  if (!p) {
    p = (async () => {
      if (!remoteEnabled()) return null;
      const meta = levelMeta(level);
      if (meta.total <= meta.bundled) return null;
      try {
        const rows = await restGet<ValueRow>('acs_values', { level: `eq.${level}`, var: `eq.${varId}`, select: 'geoid,est,moe,cv', order: 'geoid' });
        if (!rows.length) throw new Error(`acs_values has no ${key} rows`);
        const m: ValueMap = new Map();
        for (const r of rows) m.set(r.geoid, { est: r.est, moe: r.moe, cv: r.cv });
        valueResults.set(key, m);
        return m;
      } catch {
        markUnavailable();
        return null;
      }
    })();
    valuePromises.set(key, p);
  }
  return p;
}

const unitPromises = new Map<string, Promise<Record<string, Estimate> | null>>();
const unitResults = new Map<string, Record<string, Estimate>>();
/** Every variable for one unit that is not in the bundle (a county unit), or null. */
export function loadUnit(level: GeoLevel, geoid: string): Promise<Record<string, Estimate> | null> {
  const key = `${level}:${geoid}`;
  let p = unitPromises.get(key);
  if (!p) {
    p = (async () => {
      if (!remoteEnabled()) return null;
      try {
        const rows = await restGet<UnitRow>('acs_values', { level: `eq.${level}`, geoid: `eq.${geoid}`, select: 'var,est,moe,cv', order: 'var' });
        if (!rows.length) return null;
        const out: Record<string, Estimate> = {};
        for (const r of rows) out[r.var] = { est: r.est, moe: r.moe, cv: r.cv };
        unitResults.set(key, out);
        return out;
      } catch {
        markUnavailable();
        return null;
      }
    })();
    unitPromises.set(key, p);
  }
  return p;
}

// ------------------------------------------------------------------ hooks
const online = <T,>(data: T): Loaded<T> => ({ data, source: 'supabase' as DataSource, scope: 'county' as Scope });
const bundled = <T,>(data: T): Loaded<T> => ({ data, source: 'bundled' as DataSource, scope: 'city' as Scope });

/** Geometry for a level: bundled first, county-wide when Supabase answers. */
export function useGeo(level: GeoLevel): Loaded<UnitFC> {
  const snapshot = (l: GeoLevel) => {
    const r = geoResults.get(l);
    return { level: l, ...(r ? online(r) : bundled(bundledGeo(l))) };
  };
  const [state, setState] = useState(() => snapshot(level));
  useEffect(() => {
    let live = true;
    const s = snapshot(level);
    setState((prev) => (prev.level === level && prev.data === s.data ? prev : s));
    if (s.source === 'supabase' || !remoteEnabled()) return;
    void loadGeo(level).then((fc) => {
      if (live && fc) setState({ level, ...online(fc) });
    });
    return () => {
      live = false;
    };
  }, [level]);
  return state;
}

const bundledValueCache = new Map<string, ValueMap>();
function bundledVariable(level: GeoLevel, varId: string): ValueMap {
  const key = `${level}:${varId}`;
  let m = bundledValueCache.get(key);
  if (!m) {
    m = valuesFor(bundledValues(level), varId);
    bundledValueCache.set(key, m);
  }
  return m;
}

/** One variable's values at a level, or null without a variable. Same bundled → online swap as useGeo. */
export function useVariable(level: GeoLevel, varId: string | null): Loaded<ValueMap> | null {
  const key = varId ? `${level}:${varId}` : null;
  const snapshot = (k: string | null) => {
    if (!k || !varId) return null;
    const r = valueResults.get(k);
    return { key: k, ...(r ? online(r) : bundled(bundledVariable(level, varId))) };
  };
  const [state, setState] = useState(() => snapshot(key));
  useEffect(() => {
    let live = true;
    const s = snapshot(key);
    setState((prev) => (prev?.key === s?.key && prev?.data === s?.data ? prev : s));
    if (!s || !varId || s.source === 'supabase' || !remoteEnabled()) return;
    void loadValues(level, varId).then((m) => {
      if (live && m) setState({ key: s.key, ...online(m) });
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state && state.key === key ? state : snapshot(key);
}

export interface UnitState {
  key: string | null;
  values: Record<string, Estimate> | null;
  source: DataSource;
  loading: boolean;
}
/** Every variable for one unit: bundled when the unit is in the city subset, otherwise fetched. */
export function useUnit(level: GeoLevel | null, geoid: string | null): UnitState {
  const key = level && geoid ? `${level}:${geoid}` : null;
  const snapshot = (k: string | null): UnitState => {
    if (!k || !level || !geoid) return { key: k, values: null, source: 'bundled', loading: false };
    const local = unitValues(bundledValues(level), geoid);
    if (local) return { key: k, values: local, source: 'bundled', loading: false };
    const r = unitResults.get(k);
    if (r) return { key: k, values: r, source: 'supabase', loading: false };
    return { key: k, values: null, source: 'bundled', loading: remoteEnabled() };
  };
  const [state, setState] = useState(() => snapshot(key));
  useEffect(() => {
    let live = true;
    const s = snapshot(key);
    setState((prev) => (prev.key === s.key && prev.values === s.values && prev.loading === s.loading ? prev : s));
    if (!s.loading || !level || !geoid) return;
    void loadUnit(level, geoid).then((v) => {
      if (live) setState({ key: s.key, values: v, source: v ? 'supabase' : 'bundled', loading: false });
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state.key === key ? state : snapshot(key);
}

/** City and county values for a variable (complete in the bundle, so no request). */
export function useReference(varId: string | null): { city: Estimate | null; county: Estimate | null } {
  return useMemo(() => reference(varId), [varId]);
}
