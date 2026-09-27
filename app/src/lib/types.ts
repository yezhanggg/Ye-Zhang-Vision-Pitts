export type Conf = 'high' | 'medium' | 'low';
export type Weights = Record<string, number>;

export interface FactorDef {
  id: string;
  label: string;
  short: string;
  description: string;
  raw_field: string | null;
  unit: string;
  sources: string[];
  year: number;
  direction_note?: string;
}

export interface Typology {
  id: string;
  label: string;
  long: string;
  color: string;
}

export interface Preset {
  id: string;
  label: string;
  blurb?: string;
  weights: Weights;
}

export interface ScoringConfig {
  version: string;
  scope?: string;
  notes?: string;
  factors: FactorDef[];
  typologies: Typology[];
  fit: {
    label: string;
    matrix: Record<string, Record<string, number>>;
    /** Every cell changed since the previous version, with who proposed it (value judgments stay signed by the author). */
    changes?: { cell: string; from: number | null; to: number; source: string; adopted: string }[];
  };
  scoring: {
    formula?: string;
    stability_draws: number;
    stability_concentration: number;
    stability_seed?: number;
    /** Top two closer than this: a tie, not a pick. */
    tie_margin?: number;
    /** Top two closer than this: a close call. */
    close_margin?: number;
  };
  /** How the observed factors are built (switches read by src/visionpitts/factors.py). */
  factor_options?: {
    subsidy?: { mode: 'graded' | 'flag'; tiers?: Record<string, number> };
    transit?: { basis: 'household' | 'acre'; household_floor?: number };
    flood?: { base_confidence?: Conf; implausible_share_pct?: number };
    displacement?: { eviction_zip_dominant_min?: number };
  };
  presets: Preset[];
  confidence?: { rule: string; levels: string[] };
  pressure?: { label: string; bivariate: string; flat_band: number };
  bins: { note?: string; score: number[] };
}

/** One tract's properties, as written by scripts/04_export_app_data.py. */
export interface TractProps {
  GEOID: string;
  name: string;
  neighborhood: string | null;
  /** Demo-tract label, or null. */
  focus: string | null;
  residential: boolean;
  pgh_share: number;
  need: number | null;
  market_strength: number | null;
  displacement_risk: number | null;
  subsidy_eligible: number | null;
  transit_access: number | null;
  flood_exposure: number | null;
  need_conf: Conf | null;
  market_strength_conf: Conf | null;
  displacement_risk_conf: Conf | null;
  subsidy_eligible_conf: Conf | null;
  transit_access_conf: Conf | null;
  flood_exposure_conf: Conf | null;
  need_count: number | null;
  need_count_cv: number | null;
  mva21: string | null;
  mva16: string | null;
  mva21_score: number | null;
  mva16_score: number | null;
  mva_change: number | null;
  svi_overall: number | null;
  svi_t1: number | null;
  svi_t2: number | null;
  svi_t3: number | null;
  svi_t4: number | null;
  chas_burden_le50_share: number | null;
  eviction_filing_rate: number | null;
  eviction_filings_est: number | null;
  eviction_coverage: number | null;
  eviction_zips: string | null;
  hcv_count: number | null;
  hcv_per_renter: number | null;
  displacement_n: number | null;
  qct: boolean | null;
  dda: boolean | null;
  oz: boolean | null;
  cdbg: boolean | null;
  zcta: string | null;
  transit_departures: number | null;
  transit_departures_per_acre: number | null;
  flood_share_pct: number | null;
  flood_deep_share_pct: number | null;
  veg_cover_land_pct: number | null;
  n_neighbors: number | null;
  market_lag: number | null;
  market_pressure: number | null;
  market_pressure_pct: number | null;
  need_tercile: 'L' | 'M' | 'H' | null;
  market_direction: 'falling' | 'flat' | 'rising' | null;
  bivariate_class: string | null;
  watch_list: boolean;
  pop: number | null;
  households: number | null;
  med_hh_income: number | null;
  med_hh_income_cv: number | null;
  med_gross_rent: number | null;
  med_gross_rent_cv: number | null;
  med_home_value: number | null;
  renter_hh: number | null;
  renter_share: number | null;
  rent_burdened_share: number | null;
  vacancy_share: number | null;
  /** Asking rents (Dewey listings): information only, never scored. Written by scripts/06_build_asking_rents.py. */
  rent_2br_2025_26: number | null;
  /** Distinct 2BR units listed in 2025–26 (the suppression and confidence basis). */
  n_units_2025_26: number | null;
  /** 2BR median growth 2019–20 → 2025–26 for units in buildings first listed before 2019. */
  rent_2br_growth_existing: number | null;
  /** Same growth over every listing (new buildings included). */
  rent_2br_growth_all: number | null;
  /** Bedroom-mix-adjusted level: 1.0 = county typical for the same bedroom count and year. */
  rent_index_2025_26: number | null;
  rent_2br_gt_fmr: boolean | null;
  asking_rents_conf: Conf | null;
  /** Scoring v0.4.0 (optional so older data files still load). */
  senior_demand?: number | null;
  senior_demand_conf?: Conf | null;
  small_multifamily_stock?: number | null;
  small_multifamily_stock_conf?: Conf | null;
  /** Share of residents aged 65 or older (ACS B01001) and its coefficient of variation. */
  age65_share?: number | null;
  age65_share_cv?: number | null;
  /** Share of housing units in 2–4 unit buildings (ACS B25024) and its coefficient of variation. */
  units_2_4_share?: number | null;
  units_2_4_share_cv?: number | null;
  /** Weekday departures within 400 m per household (households floored at 400). */
  transit_departures_per_hh?: number | null;
  /** Largest share of the tract's housing units that sits in one ZIP, and how many ZIPs hold any. */
  eviction_zip_dominant?: number | null;
  eviction_zip_n?: number | null;
  [key: string]: unknown;
}

export interface TractFeature {
  type: 'Feature';
  properties: TractProps;
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
}

export interface FC<F> {
  type: 'FeatureCollection';
  features: F[];
}

export interface NeighborhoodProps {
  name: string;
  tract: string | null;
  c: [number, number];
}
export type NeighborhoodFeature = { type: 'Feature'; properties: NeighborhoodProps; geometry: { type: string; coordinates: unknown } };

export interface BuildingProps {
  h: number;
  src: 'overture_height' | 'overture_floors' | 'assessment_stories' | 'accessory' | 'default' | string;
  GEOID: string;
  yb?: number | null;
}

export interface SourceDef {
  id: string;
  name: string;
  url: string;
  vintage: string;
  geography: string;
  method?: string;
  caveats?: string;
}

export interface FocusDef {
  geoid: string;
  label: string;
  neighborhood?: string;
}

export interface Meta {
  built_at?: string;
  scope?: string;
  n_tracts?: number;
  n_residential?: number | null;
  scoring_version?: string;
  city_medians?: Record<string, number | null>;
  factor_coverage?: Record<string, number>;
  confidence_counts?: Record<string, Record<string, number>>;
  watch_list_count?: number | null;
  building_height_share?: Record<string, number>;
  asking_rents?: { n_with_rent_2025_26: number; n_with_growth_existing: number; n_with_growth_all: number; n_above_fmr: number; confidence_counts: Record<string, number> } | null;
  /** HUD FY figures for the Pittsburgh metro, read from the HUD workbooks by src/visionpitts/hud.py. */
  hud?: { hmfa?: string; fy?: number; fmr_2br?: number | null; median_family_income?: number | null; ami_30_4p?: number | null; ami_50_4p?: number | null; ami_80_4p?: number | null } | null;
  /** Best-match counts by typology over ranked tracts, per preset id. */
  winners?: Record<string, Record<string, number>>;
  /** Per preset: how many ranked tracts have a #1–#2 gap under each threshold, ties, and the median gap. */
  margins?: Record<string, { lt05: number; lt03: number; lt02: number; ties: number; median: number | null }>;
  /** Ranked tracts at each subsidy grade (keys '1', '0.5', '0'). */
  subsidy_tiers?: Record<string, number>;
  hcv_suppressed_ranked?: number | null;
  flood_over_50?: number | null;
}

/** County / city asking-rent context (app/src/data/asking_rents.json, from scripts/06_build_asking_rents.py). */
export interface RentTrendYear {
  median_2br: number | null;
  n_units: number;
  n_unit_months: number;
}
export interface RentPooled {
  median_2019_20: number | null;
  median_2025_26: number | null;
  n_units_2019_20: number;
  n_units_2025_26: number;
  growth: number | null;
}
export interface AskingRentsContext {
  source?: string;
  license?: string;
  fmr_2br_fy2026?: number;
  years?: number[];
  county?: Record<string, RentTrendYear>;
  city?: Record<string, RentTrendYear>;
  growth?: Record<'county' | 'city', { all: RentPooled; existing: RentPooled }>;
  thresholds?: { min_units_cell: number; min_units_pooled: number; conf_units: Record<string, number>; existing_before: number };
  coverage?: { n_city_tracts: number; n_with_rent_2025_26: number; n_with_growth_existing: number; n_with_growth_all: number };
  built_at?: string;
}

export interface Scenario {
  id: string;
  name: string;
  weights: Weights;
}

export interface Pin {
  lng: number;
  lat: number;
  label: string;
}
