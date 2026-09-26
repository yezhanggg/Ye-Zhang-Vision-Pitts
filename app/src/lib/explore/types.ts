// Types for the Explore data browser: the ACS variable catalogue, per-geography values and unit geometry.
import type { Conf, FC } from '../types';

/** Every geography the pipeline publishes. County and city are single units used as reference lines. */
export type GeoLevel = 'tract' | 'bg' | 'zcta' | 'county' | 'city';
/** Geographies the map can paint (same literal union as `Level` in lib/store). */
export type BrowseLevel = 'tract' | 'bg' | 'zcta';
/** Same literal union as `LayerId` in lib/store. */
export type LayerKey = 'buildings' | 'terrain' | 'tracts' | 'bg' | 'zcta' | 'county' | 'city';

export type Unit = 'count' | 'usd' | 'share' | 'years' | 'age';
export type VarKind = 'median' | 'sum' | 'share';

export interface VariableDef {
  id: string;
  label: string;
  group: string;
  unit: Unit;
  kind: VarKind;
  num: string[];
  den: string | null;
  table_id: string;
  description: string;
  sort: number;
}

export interface GroupDef {
  id: string;
  label: string;
}

export interface LevelMeta {
  bundled: number;
  total: number;
}

export interface CatalogueMeta {
  acs_year?: number;
  vintage?: string;
  built_at?: string;
  moe_level?: number;
  reliability?: { high: number; medium: number };
  levels?: Partial<Record<GeoLevel, LevelMeta>>;
}

export interface Catalogue {
  meta: CatalogueMeta;
  groups: GroupDef[];
  variables: VariableDef[];
}

/** `[estimate, margin of error (90%), coefficient of variation]`, each null when unpublished. */
export type Triple = [number | null, number | null, number | null];
/** Bundled shape of acs_<level>.json: geoid → variable id → triple. */
export type ValuesByGeoid = Record<string, Record<string, Triple>>;

export interface Estimate {
  est: number | null;
  moe: number | null;
  cv: number | null;
}
/** One variable's estimates keyed by geoid. */
export type ValueMap = Map<string, Estimate>;

export interface UnitProps {
  GEOID: string;
  name: string;
  /** Parent tract (block groups only). */
  tract?: string | null;
  /** Share of the unit's area inside the City of Pittsburgh (1 = entirely inside). */
  pgh_share: number | null;
  /** City tracts carry their neighborhood name. */
  neighborhood?: string | null;
  [key: string]: unknown;
}
export interface UnitFeature {
  type: 'Feature';
  properties: UnitProps;
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
}
export type UnitFC = FC<UnitFeature>;

export type DataSource = 'bundled' | 'supabase';
/** City subset (bundled) or the whole county (online). */
export type Scope = 'city' | 'county';
export interface Loaded<T> {
  data: T;
  source: DataSource;
  scope: Scope;
}

export type Reliability = Conf;
