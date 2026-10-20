// The shape of app/src/data/lazy/demand.json (scripts/17_build_demand.py, src/visionpitts/demand.py).
/** [estimate, 90% margin of error]; either may be null. */
export type EM = [number | null, number | null];
export type Reliability = 'high' | 'medium' | 'low' | null;
/** [share 0–1, 90% margin of error, reliability]. */
export type Share = [number | null, number | null, Reliability];
export type ShareKey = 'renter' | 'one_person' | 'large5' | 'age65' | 'small_bldg';
export type RentGroup = '0' | '1' | '2' | '3';

export interface Supply {
  projects: number;
  li_units: number;
  /** Placed in service in the last `recent_years`. */
  li_units_recent: number;
  /** Placed in service at least `use_years` ago. */
  li_units_past30: number;
  /** Reaching `use_years` within five years of `as_of`. */
  li_units_end_5y: number;
  no_year: number;
}

export interface NearbyProject {
  name: string;
  yr: number | null;
  li: number | null;
  n: number | null;
  credit: string | null;
  bond: boolean;
  mi: number;
}

export interface DemandUnit {
  renters: EM;
  households: EM;
  /** Renter households of 1, 2, 3, 4, 5, 6, 7+ people (B25009). */
  size: EM[];
  /** Renter homes with 0, 1, 2, 3, 4, 5+ bedrooms (B25042). */
  br: EM[];
  /** Renter homes with cash rent by bedroom group (0, 1, 2, 3+) and rent bracket (B25068). */
  rent_br: Record<RentGroup, EM[]>;
  rent_nocash: EM[];
  /** Renter households in 11 income brackets (B25118). */
  inc: EM[];
  inc_med: EM;
  rent_med: EM;
  /** Renter homes by building size (B25032). */
  struct: EM[];
  /** Renter householders by age (B25007). */
  age: EM[];
  shares: Record<ShareKey, Share>;
  rent_to_income: number | null;
  /** Growth from the ACS history: [2014, 2024]. */
  g: { renters: [number | null, number | null]; rent: [number | null, number | null]; income: [number | null, number | null] } | null;
  lihtc: (Supply & { mile?: Supply; nearby?: NearbyProject[] }) | null;
  zip?: string | null;
  /** Renter households at or below 60% AMI in the city tracts within a mile (CHAS bands; 60% interpolated). Tracts only. */
  depth?: { tracts: number; le50: number; b50_80: number; le60: number } | null;
}

export interface DemandFile {
  built: string;
  acs: string;
  growth_years: [number, number];
  edges: { income: (number | null)[]; rent: (number | null)[] };
  labels: { structure: string[]; age: string[] };
  lihtc: { retrieved?: string | null; properties?: number; use_years: number; recent_years: number; as_of: number };
  city: DemandUnit;
  zips: Record<string, DemandUnit>;
  tracts: Record<string, DemandUnit>;
}
