// Data files in src/data are read at build time (Vite inlines them), so the single-file export works over file://.
// A missing file never breaks the build: each loader has a fallback.
import { decodeBuildings } from './buildingsCodec';
import { featureAt, type IndexedFeature } from './geo';
import type { AskingRentsContext, FC, FocusDef, Meta, NeighborhoodFeature, ScoringConfig, SourceDef, TractFeature, TractProps } from './types';

const raw = import.meta.glob('../data/*.json', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

function load<T>(name: string, fallback: T): T {
  const text = raw[`../data/${name}.json`];
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    console.warn(`[data] could not parse ${name}.json`, e);
    return fallback;
  }
}

export const scoring = load<ScoringConfig>('scoring', {
  version: '0',
  factors: [],
  typologies: [],
  fit: { label: '', matrix: {} },
  scoring: { stability_draws: 200, stability_concentration: 25 },
  presets: [],
  bins: { score: [0, 0.4, 0.5, 0.6, 0.7, 0.8, 1] },
});
export const tractsFC = load<FC<TractFeature>>('tracts', { type: 'FeatureCollection', features: [] });
export const neighborhoodsFC = load<FC<NeighborhoodFeature>>('neighborhoods', { type: 'FeatureCollection', features: [] });
export const buildingsFC = decodeBuildings(load<unknown>('buildings', null));
export const sources = load<SourceDef[]>('sources', []);
export const focusDefs = load<FocusDef[]>('focus', []);
export const meta = load<Meta>('meta', {});
/** County / city asking-rent trend; empty when step 6 has not run (the layer then hides itself). */
export const askingRents = load<AskingRentsContext>('asking_rents', {});

export const tracts: TractProps[] = tractsFC.features.map((f) => f.properties);
export const tractById = new Map<string, TractProps>(tracts.map((t) => [t.GEOID, t]));
/** Demo tracts in demo order (the first is the hero). */
export const focusTracts: TractProps[] = focusDefs.map((f) => tractById.get(f.geoid)).filter((t): t is TractProps => !!t);
export const rankedTracts = tracts.filter((t) => t.residential);

/** Factors with at least one value; the others get no slider. */
export const activeFactors = scoring.factors.filter((f) => tracts.some((t) => typeof t[f.id] === 'number'));
export const activeFactorIds = activeFactors.map((f) => f.id);
export const factorById = new Map(scoring.factors.map((f) => [f.id, f]));
export const typologyById = new Map(scoring.typologies.map((t) => [t.id, t]));
export const sourceById = new Map(sources.map((s) => [s.id, s]));
export const fieldAvailable = (field: string) => tracts.some((t) => typeof t[field] === 'number');
/** True when the Dewey asking-rent information layer was built (any tract has a 2025–26 level or a growth value). */
export const hasAskingRents = fieldAvailable('rent_2br_2025_26') || fieldAvailable('rent_2br_growth_existing');
export const FMR_2BR = askingRents.fmr_2br_fy2026 ?? 1299;

// ------------------------------------------------------------------ geometry helpers
function bounds(geom: { type: string; coordinates: unknown }): [[number, number], [number, number]] {
  let w = 180, s = 90, e = -180, n = -90;
  const walk = (c: unknown) => {
    if (Array.isArray(c) && typeof c[0] === 'number') {
      const [x, y] = c as number[];
      if (x < w) w = x;
      if (x > e) e = x;
      if (y < s) s = y;
      if (y > n) n = y;
    } else if (Array.isArray(c)) c.forEach(walk);
  };
  walk(geom.coordinates);
  return [[w, s], [e, n]];
}

export const tractBounds = new Map<string, [[number, number], [number, number]]>(tractsFC.features.map((f) => [f.properties.GEOID, bounds(f.geometry)]));
const indexed: IndexedFeature[] = tractsFC.features.map((f) => ({ id: f.properties.GEOID, geometry: f.geometry, bounds: tractBounds.get(f.properties.GEOID)! }));
/** Tract under a point, or null when outside the city set. */
export const tractAt = (lng: number, lat: number) => featureAt(lng, lat, indexed);

/** Buildings per tract: total and how many have a guessed height (for the data-limits panel). */
export const buildingStats = (() => {
  const m = new Map<string, { total: number; estimated: number }>();
  for (const f of buildingsFC.features) {
    const p = f.properties;
    const s = m.get(p.GEOID) ?? { total: 0, estimated: 0 };
    s.total++;
    if (p.src === 'default') s.estimated++;
    m.set(p.GEOID, s);
  }
  return m;
})();

// ------------------------------------------------------------------ labels
export const tractLabel = (t: TractProps | null | undefined) => (!t ? '—' : t.neighborhood ?? t.name);
export const tractSubLabel = (t: TractProps | null | undefined) => (!t ? '' : `${t.name} · Pittsburgh`);
