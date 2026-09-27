// Place measures: the data contract for app/src/data/place.json and app/src/data/hud_2026.json (plan §2).
// Built by scripts/10_build_place_measures.py; consumed by lib/place/* and components/place/*.
// Every field may be null: the copy then reads "not available" and nothing is imputed.
import type { Conf } from '../types';

export type { Conf };

/** Renter households in an AMI band (CHAS Table 8, HAMFI): estimate, margin of error, paying >30% and >50% of income. */
export interface Band {
  hh: number | null;
  moe: number | null;
  burden30: number | null;
  burden50: number | null;
}

export type BandId = 'le30' | 'b30_50' | 'b50_80' | 'b80_100' | 'gt100';
/** CHAS household type × band carries no 80–100 split, so the top band is >80%. */
export type TypeBandId = 'le30' | 'b30_50' | 'b50_80' | 'gt80';
export type HouseholdType = 'elderly_alone' | 'elderly_family' | 'small_family' | 'large_family' | 'other';
export type HouseholdTypes = Record<HouseholdType, number>;

export type Stance = 'anti_displacement' | 'market_led' | 'transit_first';
export type Bedrooms = 0 | 1 | 2 | 3;
export type Typology = 'adu' | 'duplex_triplex' | 'townhome' | 'small_apartment' | 'senior';
export type ZoningStatus = 'yes' | 'conditional' | 'no' | 'unknown';

export interface PlaceMarket {
  asking_2br: number | null;
  asking_n: number | null;
  asking_conf: Conf | null;
  acs_rent: number | null;
  acs_rent_moe: number | null;
  zip: string | null;
  safmr_2br: number | null;
  value_acs: number | null;
  value_acs_moe: number | null;
  value_nbr_acs: number | null;
  sale_median: number | null;
  sale_n: number | null;
  sale_nbr_median: number | null;
  sale_nbr_n: number | null;
}

export interface PlaceStock {
  sfd_share: number | null;
  units_2_4_share: number | null;
  units_5_19_share: number | null;
  units_20plus_share: number | null;
  vacancy_share: number | null;
  parcels_2_4: number | null;
  vacant_parcels: number | null;
}

/** Frequent = at least 64 weekday departures at the stop (one bus or T every 15 minutes over a 16-hour day). */
export interface PlaceTransit {
  freq_share_qmi: number | null;
  freq_dist_mi: number | null;
  any_dist_mi: number | null;
  departures_qmi: number | null;
  departures_pct: number | null;
}

export interface PlaceFlood {
  fema_sfha_pct: number | null;
  fema_zone: string | null;
  hand_pct: number | null;
}

export interface PlaceZoning {
  /** District → share of land, in percent (0–100). */
  shares: Record<string, number>;
  /** By-right annotation per typology from the unverified table, applied at ≥ 5% land share. */
  by_type: Record<Typology, ZoningStatus>;
  verified: false;
}

export interface PlacePrograms {
  qct: boolean | null;
  dda: boolean | null;
  oz: boolean | null;
  cdbg: boolean | null;
}

export interface PlaceMeasures {
  renter_hh: number | null;
  bands: Record<BandId, Band>;
  types: Record<TypeBandId, HouseholdTypes>;
  market: PlaceMarket;
  stock: PlaceStock;
  transit: PlaceTransit;
  flood: PlaceFlood;
  zoning: PlaceZoning | null;
  programs: PlacePrograms;
  displacement: { score: number | null; conf: Conf | null };
}

/** HUD FY2026 income limits for the Pittsburgh HMFA, by household size (index 0 = 1 person … 7 = 8 persons), and FMR / SAFMR by bedrooms (index 0 = studio … 4 = 4BR). */
export interface HudTable {
  metro: {
    name: string;
    fy: number;
    median: number;
    il30: number[];
    il50: number[];
    il80: number[];
    fmr: number[];
  };
  safmr: Record<string, number[]>;
  /** City-wide median valid residential sale since 2023 (compare with a tract's sale median, never with ACS values). */
  city?: { sale_median: number | null; sale_n: number | null };
}

export type PlaceFile = Record<string, PlaceMeasures>;
