// The bundled data browser: variable catalogue, city-subset values and geometry for every geography.
// Everything is inlined at build time (same glob mechanism as lib/data.ts), so the single-file export works over file://.
import { tractsFC } from '../data';
import type { BrowseLevel, Catalogue, Estimate, GeoLevel, GroupDef, LayerKey, LevelMeta, Triple, UnitFC, UnitProps, ValueMap, ValuesByGeoid, VariableDef } from './types';

const raw = import.meta.glob('../../data/{acs_,geo_}*.json', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

function load<T>(name: string, fallback: T): T {
  const text = raw[`../../data/${name}.json`];
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    console.warn(`[explore] could not parse ${name}.json`, e);
    return fallback;
  }
}

const EMPTY_FC: UnitFC = { type: 'FeatureCollection', features: [] };

export const catalogue = load<Catalogue>('acs_variables', { meta: {}, groups: [], variables: [] });
export const variables: VariableDef[] = [...(catalogue.variables ?? [])].sort((a, b) => a.sort - b.sort);
export const variableById = new Map<string, VariableDef>(variables.map((v) => [v.id, v]));
export const variableIds = variables.map((v) => v.id);
export const groups: GroupDef[] = catalogue.groups ?? [];
export const variablesByGroup = (groupId: string) => variables.filter((v) => v.group === groupId);
/** False until scripts/07_build_acs_levels.py and the export have run; the panel then shows a note instead of a list. */
export const hasBrowser = variables.length > 0 && groups.length > 0;

/** The twelve variables on the place card's headline table, in display order. */
export const KEY_VARS = ['pop', 'households', 'med_hh_income', 'poverty_share', 'renter_share', 'med_gross_rent', 'med_home_value', 'rent_burden30_share', 'vacancy_share', 'median_year_built', 'transit_share', 'no_vehicle_share'];

export const CITY_GEOID = '4261000';
export const COUNTY_GEOID = '42003';
export const GEO_LEVELS: GeoLevel[] = ['tract', 'bg', 'zcta', 'county', 'city'];
export const BROWSE_LEVELS: BrowseLevel[] = ['tract', 'bg', 'zcta'];
export const LEVEL_LAYER: Record<BrowseLevel, Extract<LayerKey, 'tracts' | 'bg' | 'zcta'>> = { tract: 'tracts', bg: 'bg', zcta: 'zcta' };
export const LEVEL_LABEL: Record<GeoLevel, { one: string; many: string; short: string }> = {
  tract: { one: 'Census tract', many: 'tracts', short: 'Tracts' },
  bg: { one: 'Block group', many: 'block groups', short: 'Block groups' },
  zcta: { one: 'ZIP code', many: 'ZIP codes', short: 'ZIP codes' },
  county: { one: 'County', many: 'counties', short: 'County' },
  city: { one: 'City', many: 'cities', short: 'City' },
};
/** CV thresholds for the reliability chip (from the catalogue, with the documented defaults). */
export const RELIABILITY = catalogue.meta?.reliability ?? { high: 0.15, medium: 0.3 };

const valuesCache: Partial<Record<GeoLevel, ValuesByGeoid>> = {};
/** City-subset values for a geography: geoid → variable → [est, moe, cv]. */
export function bundledValues(level: GeoLevel): ValuesByGeoid {
  return (valuesCache[level] ??= load<ValuesByGeoid>(`acs_${level}`, {}));
}

const geoCache: Partial<Record<GeoLevel, UnitFC>> = {};
/** City-subset geometry; tracts reuse tracts.json (properties include neighborhood, residential and focus). */
export function bundledGeo(level: GeoLevel): UnitFC {
  if (level === 'tract') return tractsFC as unknown as UnitFC;
  return (geoCache[level] ??= load<UnitFC>(`geo_${level}`, EMPTY_FC));
}

/** Bundled vs county-wide counts for the scope chip. Falls back to what is on disk when the catalogue lacks meta. */
export function levelMeta(level: GeoLevel): LevelMeta {
  const m = catalogue.meta?.levels?.[level];
  const n = Object.keys(bundledValues(level)).length || bundledGeo(level).features.length;
  return { bundled: m?.bundled ?? n, total: m?.total ?? n };
}

export const toEstimate = (t: Triple | null | undefined): Estimate => ({ est: t?.[0] ?? null, moe: t?.[1] ?? null, cv: t?.[2] ?? null });

/** One variable across every unit of a bundled level. */
export function valuesFor(all: ValuesByGeoid, varId: string): ValueMap {
  const m: ValueMap = new Map();
  for (const geoid in all) m.set(geoid, toEstimate(all[geoid]?.[varId]));
  return m;
}

/** Every variable for one unit, or null when the unit is not in the bundle. */
export function unitValues(all: ValuesByGeoid, geoid: string): Record<string, Estimate> | null {
  const row = all[geoid];
  if (!row) return null;
  const out: Record<string, Estimate> = {};
  for (const id of variableIds) out[id] = toEstimate(row[id]);
  return out;
}

/** City and county values of a variable (both are complete in the bundle). */
export function reference(varId: string | null): { city: Estimate | null; county: Estimate | null } {
  if (!varId) return { city: null, county: null };
  const c = bundledValues('city')[CITY_GEOID]?.[varId];
  const k = bundledValues('county')[COUNTY_GEOID]?.[varId];
  return { city: c ? toEstimate(c) : null, county: k ? toEstimate(k) : null };
}

/** Display name: city tracts show the neighborhood, everything else its published name. */
export const unitTitle = (p: UnitProps | null | undefined) => (!p ? '—' : p.neighborhood ? String(p.neighborhood) : p.name);
export const unitSubtitle = (p: UnitProps | null | undefined) => (p?.neighborhood ? p.name : null);
