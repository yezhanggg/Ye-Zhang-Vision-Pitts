// The bundled data browser: variable catalogue, city-subset values and geometry for every geography.
// Everything is inlined at build time (same glob mechanism as lib/data.ts), so the single-file export works over file://.
import { tractsFC } from '../data';
import { ANALYSIS_GROUPS, ANALYSIS_VARS } from './analysisVars';
import type { BrowseLevel, Catalogue, Estimate, GeoLevel, GroupDef, HistoryBundle, LayerKey, LevelMeta, RentAreas, Triple, UnitFC, UnitProps, ValueMap, ValuesByGeoid, VariableDef } from './types';
import type { Series } from './summary';

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
/** Census variables (the ACS catalogue). */
export const acsVariables: VariableDef[] = [...(catalogue.variables ?? [])].sort((a, b) => a.sort - b.sort).map((v) => ({ ...v, source: 'acs' as const }));
/** Every browseable variable: the census catalogue, then the Analysis layers (city tracts only). */
export const variables: VariableDef[] = [...acsVariables, ...ANALYSIS_VARS];
export const variableById = new Map<string, VariableDef>(variables.map((v) => [v.id, v]));
/** Ids of the census variables (the ones a unit's value record carries). */
export const variableIds = acsVariables.map((v) => v.id);
export const groups: GroupDef[] = [...(catalogue.groups ?? []), ...ANALYSIS_GROUPS];
export const variablesByGroup = (groupId: string) => variables.filter((v) => v.group === groupId);
/** False until scripts/07_build_acs_levels.py and the export have run; the panel then shows a note instead of a list. */
export const hasBrowser = variables.length > 0 && groups.length > 0;

/** The twelve variables on the place card's headline table, in display order. */
export const KEY_VARS = ['pop', 'households', 'med_hh_income', 'poverty_share', 'renter_share', 'med_gross_rent', 'med_home_value', 'rent_burden30_share', 'vacancy_share', 'median_year_built', 'transit_share', 'no_vehicle_share'];

export const CITY_GEOID = '4261000';
export const COUNTY_GEOID = '42003';
export const GEO_LEVELS: GeoLevel[] = ['tract', 'bg', 'zcta', 'muni', 'county', 'city'];
export const BROWSE_LEVELS: BrowseLevel[] = ['tract', 'bg', 'zcta', 'muni'];
export const LEVEL_LAYER: Record<BrowseLevel, Extract<LayerKey, 'tracts' | 'bg' | 'zcta' | 'muni'>> = { tract: 'tracts', bg: 'bg', zcta: 'zcta', muni: 'muni' };
export const LEVEL_LABEL: Record<GeoLevel, { one: string; many: string; short: string }> = {
  tract: { one: 'Census tract', many: 'tracts', short: 'Tracts' },
  bg: { one: 'Block group', many: 'block groups', short: 'Block groups' },
  zcta: { one: 'ZIP code', many: 'ZIP codes', short: 'ZIP codes' },
  muni: { one: 'Municipality', many: 'municipalities', short: 'Municipalities' },
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

/** True when the bundle already holds every county unit of a level (municipalities), so nothing is city-only. */
export const isCountyWide = (level: GeoLevel) => {
  const m = levelMeta(level);
  return m.total <= m.bundled;
};
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

/**
 * A variable's description without the census table numbers ("(B25064)", "(C17002; B17001 is not …)"). Explore shows
 * this; the Sources window keeps the table of every variable with its table number.
 */
export const plainDescription = (v: Pick<VariableDef, 'description'>) => v.description.replace(/\s*\([^()]*\b[A-Z]{1,2}\d{4,5}[A-Z]?\b[^()]*\)/g, '').trim();

/** Display name: city tracts show the neighborhood, everything else its published name. */
export const unitTitle = (p: UnitProps | null | undefined) => (!p ? '—' : p.neighborhood ? String(p.neighborhood) : p.name);
export const unitSubtitle = (p: UnitProps | null | undefined) => (p?.neighborhood ? p.name : null);

// ------------------------------------------------------------------ history (ACS 2014–2024) and rent series
const EMPTY_HISTORY: HistoryBundle = { meta: { years: [], vars: [], band_vars: [], first_2020_vintage: 2020, xw_flag: 0.9 }, levels: {}, xw_dominant: {} };
export const history = load<HistoryBundle>('acs_history', EMPTY_HISTORY);
export const HISTORY_YEARS = history.meta.years ?? [];
export const hasHistory = HISTORY_YEARS.length > 0;
/** True when the variable has a bundled 2014–2024 series. */
export const hasHistoryFor = (varId: string) => hasHistory && history.meta.vars.includes(varId);

/** The bundled series of one variable for one unit, or null. */
export function historyFor(level: GeoLevel, geoid: string, varId: string): Series | null {
  const rec = history.levels[level]?.[geoid]?.[varId];
  if (!rec) return null;
  return { years: HISTORY_YEARS, est: rec[0], moe: rec[1] };
}
/** City and county series of a variable (both are bundled in full). */
export const referenceSeries = (varId: string) => ({ city: historyFor('city', CITY_GEOID, varId), county: historyFor('county', COUNTY_GEOID, varId) });
/** The carried-tract flag: below the threshold, the 2014–2019 values came from several 2010 tracts. */
export const xwDominant = (geoid: string): number | null => history.xw_dominant[geoid] ?? null;

const rentAreasRaw = (import.meta.glob('../../data/asking_rents_areas.json', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>)['../../data/asking_rents_areas.json'];
export const rentAreas: RentAreas = (() => {
  try {
    return rentAreasRaw ? (JSON.parse(rentAreasRaw) as RentAreas) : { years: [], levels: {} };
  } catch {
    return { years: [], levels: {} };
  }
})();
/** Yearly 2BR asking-rent aggregates for a tract, ZIP code or municipality, or null. */
export const rentAreaFor = (level: GeoLevel, geoid: string) => rentAreas.levels[level]?.[geoid] ?? null;
