// The value judgments behind the place rules (plan §3), printed in one place so the UI and the docs can show them.
import type { Bedrooms, HouseholdType, Stance, Typology } from './types';

export const THRESHOLDS = {
  /** Weekday departures at a stop for it to count as frequent (one bus or T every 15 minutes over 16 hours). */
  frequent_stop_departures: 64,
  /** Transit-first passes at this share of residents within a quarter mile of a frequent stop … */
  transit_share_qmi: 0.5,
  /** … or at this many weekday departures within a quarter mile. */
  transit_departures_qmi: 1000,
  /** Anti-displacement: at or above → additive types only, for the ≤50% band, subsidized. */
  displacement_high: 0.67,
  /** Anti-displacement: below → affordable homes through gentle density. */
  displacement_low: 0.33,
  /** Anti-displacement at high risk serves these bands. */
  anti_displacement_high_bands: ['le30', 'b30_50'] as const,
  /** Market-led requires asking 2BR ≥ SAFMR and the sale median (ACS value when sales are null) ≥ the city median. */
  market_asking_at_least_safmr: true,
  market_value_at_least_city_median: true,
  /** A for-sale home is within reach when its price is at most this many times the band's income limit (a rule of thumb, not underwriting). */
  own_price_to_income: 3,
  /** Lot pattern supports ADUs and 2–4 conversions at this share of units in 2–4 unit buildings … */
  lot_units_2_4_share: 0.1,
  /** … or at this many 2–4 unit parcels. */
  lot_parcels_2_4: 50,
  /** New build on vacant land needs this many vacant parcels; below it the place reads "infill only". */
  lot_vacant_parcels: 100,
  /** FEMA flood-zone share above which multi-unit types read "check the site". */
  flood_check_site_pct: 15,
  /** Flood word cut points on the FEMA share, in percent. */
  flood_minor_below_pct: 5,
  flood_moderate_upto_pct: 15,
  /** Zoning by-right annotation applies at this district land share (already applied in the data). */
  zoning_by_right_share_pct: 5,
  /** Persons per bedroom for the rent ceiling (HUD convention); a studio counts one person, a senior alone one person. */
  persons_per_bedroom: 1.5,
  /** Share of income spent on gross rent at the ceiling. */
  rent_share_of_income: 0.3,
  /** The asking-rent confidence that the market test accepts. */
  asking_conf_min: 'medium' as const,
  /** A band's margin of error at or above this share of its estimate prints "±". */
  moe_flag_share: 0.5,
} as const;

/** From densest to least dense; Transit-first leads with the densest feasible type. */
export const DENSITY_ORDER: Typology[] = ['small_apartment', 'senior', 'townhome', 'duplex_triplex', 'adu'];

/** Fallback fit order per stance when the UI supplies none (the UI normally passes scoreTract's order under the stance preset). */
export const DEFAULT_FIT_ORDER: Record<Stance, Typology[]> = {
  anti_displacement: ['senior', 'small_apartment', 'adu', 'duplex_triplex', 'townhome'],
  market_led: ['townhome', 'small_apartment', 'duplex_triplex', 'adu', 'senior'],
  transit_first: ['small_apartment', 'senior', 'townhome', 'duplex_triplex', 'adu'],
};

export const STANCES: Stance[] = ['anti_displacement', 'market_led', 'transit_first'];
export const TYPOLOGIES: Typology[] = ['adu', 'duplex_triplex', 'townhome', 'small_apartment', 'senior'];

export const TYPOLOGY_LABEL: Record<Typology, string> = {
  adu: 'ADU',
  duplex_triplex: 'duplex / triplex',
  townhome: 'townhome',
  small_apartment: 'small apartment',
  senior: 'senior housing',
};

export const STANCE_LABEL: Record<Stance, string> = {
  anti_displacement: 'Anti-displacement',
  market_led: 'Market-led',
  transit_first: 'Transit-first',
};

/** Which household types each building type is built for (sets the bedrooms and the "because" line). */
export const SERVES: Record<Typology, HouseholdType[]> = {
  adu: ['elderly_alone', 'other'],
  duplex_triplex: ['small_family', 'large_family', 'other'],
  townhome: ['small_family', 'large_family'],
  small_apartment: ['other', 'small_family', 'elderly_alone', 'elderly_family'],
  senior: ['elderly_alone', 'elderly_family'],
};

/** Bedrooms a household type needs (plan §3: elderly alone → 1BR senior; small family → 2BR; large family → 3BR; other → studio/1BR). */
export const TYPE_BEDROOMS: Record<HouseholdType, Bedrooms> = {
  elderly_alone: 1,
  elderly_family: 1,
  small_family: 2,
  large_family: 3,
  other: 1,
};

/** Bedrooms a building type carries when no tenant type steers it. */
export const TYPOLOGY_BEDROOMS: Record<Typology, Bedrooms> = {
  adu: 1,
  duplex_triplex: 2,
  townhome: 2,
  small_apartment: 1,
  senior: 1,
};

export const HOUSEHOLD_TYPE_LABEL: Record<HouseholdType, string> = {
  elderly_alone: 'seniors living alone',
  elderly_family: 'senior families',
  small_family: 'small families',
  large_family: 'large families',
  other: 'other households',
};

/** Household types in tie-break order: the residual "other" never leads on a tie. */
export const HOUSEHOLD_TYPE_ORDER: HouseholdType[] = ['elderly_alone', 'small_family', 'large_family', 'elderly_family', 'other'];
