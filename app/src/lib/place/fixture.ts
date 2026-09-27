// Synthetic fixture for the place rules: three places shaped like Hazelwood, Homewood North and Squirrel Hill North,
// with the realist's computed values from the plan (§6 and the worked examples). Values not in the plan are made up to
// be plausible and are marked "synthetic" below. Not real data: the app reads app/src/data/place.json.
import type { HudTable, PlaceMeasures } from './types';

/** HUD FY2026, Pittsburgh HMFA. Sizes 1–4 as published in the plan; sizes 5–8 follow HUD's family-size factors (synthetic). */
export const FIXTURE_HUD: HudTable = {
  metro: {
    name: 'Pittsburgh, PA HUD Metro FMR Area',
    fy: 2026,
    median: 110400,
    il30: [23200, 26500, 29800, 33100, 35750, 38400, 41050, 43700],
    il50: [38650, 44200, 49700, 55200, 59650, 64050, 68450, 72900],
    il80: [61850, 70650, 79500, 88300, 95400, 102450, 109500, 116600],
    fmr: [1055, 1160, 1299, 1610, 1780],
  },
  // 2BR values from the plan; other bedrooms synthetic.
  safmr: {
    '15207': [1100, 1180, 1350, 1680, 1860],
    '15208': [1220, 1310, 1500, 1870, 2070],
    '15217': [1320, 1420, 1620, 2020, 2230],
  },
  // City-wide median valid residential sale since 2023, from scripts/10 (6,193 sales).
  city: { sale_median: 255000, sale_n: 6193 },
};

/** City median home value from meta.city_medians.med_home_value (ACS 2020–24). */
export const FIXTURE_CITY_MEDIAN_VALUE = 207850;

export const HAZELWOOD: PlaceMeasures = {
  renter_hh: 720,
  bands: {
    le30: { hh: 435, moe: 171, burden30: 350, burden50: 280 },
    b30_50: { hh: 155, moe: 95, burden30: 110, burden50: 30 },
    b50_80: { hh: 100, moe: 73, burden30: 0, burden50: 0 },
    b80_100: { hh: 10, moe: 15, burden30: 0, burden50: 0 },
    gt100: { hh: 25, moe: 30, burden30: 0, burden50: 0 },
  },
  types: {
    le30: { elderly_alone: 165, elderly_family: 40, small_family: 150, large_family: 0, other: 80 },
    // 30–50%, 50–80% and >80% rows are synthetic (sum to the band households).
    b30_50: { elderly_alone: 35, elderly_family: 20, small_family: 60, large_family: 10, other: 30 },
    b50_80: { elderly_alone: 15, elderly_family: 10, small_family: 45, large_family: 10, other: 20 },
    gt80: { elderly_alone: 0, elderly_family: 5, small_family: 20, large_family: 0, other: 10 },
  },
  market: {
    asking_2br: 1150, asking_n: 66, asking_conf: 'high',
    acs_rent: 644, acs_rent_moe: 271, zip: '15207', safmr_2br: 1350,
    value_acs: 89100, value_acs_moe: 15400, value_nbr_acs: 261000,
    sale_median: null, sale_n: null, sale_nbr_median: null, sale_nbr_n: null,
  },
  stock: { sfd_share: 0.61, units_2_4_share: 0.06, units_5_19_share: 0.12, units_20plus_share: 0.1, vacancy_share: 0.17, parcels_2_4: null, vacant_parcels: 640 },
  transit: { freq_share_qmi: 0.65, freq_dist_mi: 0.21, any_dist_mi: 0.08, departures_qmi: 650, departures_pct: 0.46 },
  flood: { fema_sfha_pct: 9.6, fema_zone: 'AE', hand_pct: 17.1 },
  zoning: {
    shares: { P: 44.7, 'RIV-GI': 12.4, 'R1A-H': 10.4, H: 10.0, 'R1D-M': 7.4, 'RM-M': 6.6, LNC: 1.6, R2: 1.0 },
    by_type: { adu: 'conditional', duplex_triplex: 'yes', townhome: 'yes', small_apartment: 'yes', senior: 'conditional' },
    verified: false,
  },
  programs: { qct: true, dda: false, oz: true, cdbg: true },
  displacement: { score: 0.717, conf: 'medium' },
};

export const HOMEWOOD_NORTH: PlaceMeasures = {
  renter_hh: 680,
  bands: {
    le30: { hh: 290, moe: 93, burden30: 170, burden50: 115 },
    b30_50: { hh: 205, moe: 99, burden30: 90, burden50: 20 },
    b50_80: { hh: 105, moe: 86, burden30: 15, burden50: 0 },
    b80_100: { hh: 30, moe: 30, burden30: 0, burden50: 0 },
    gt100: { hh: 50, moe: 45, burden30: 0, burden50: 0 },
  },
  types: {
    le30: { elderly_alone: 100, elderly_family: 30, small_family: 90, large_family: 20, other: 50 },
    b30_50: { elderly_alone: 105, elderly_family: 15, small_family: 50, large_family: 10, other: 25 },
    // 50–80% and >80% rows are synthetic.
    b50_80: { elderly_alone: 20, elderly_family: 10, small_family: 40, large_family: 10, other: 25 },
    gt80: { elderly_alone: 10, elderly_family: 10, small_family: 30, large_family: 5, other: 25 },
  },
  market: {
    asking_2br: 1250, asking_n: 31, asking_conf: 'medium',
    acs_rent: 501, acs_rent_moe: 282, zip: '15208', safmr_2br: 1500,
    value_acs: 58000, value_acs_moe: 12000, value_nbr_acs: 85400,
    sale_median: 45000, sale_n: 13, sale_nbr_median: 130000, sale_nbr_n: 40,
  },
  stock: { sfd_share: 0.55, units_2_4_share: 0.09, units_5_19_share: 0.1, units_20plus_share: 0.08, vacancy_share: 0.25, parcels_2_4: 82, vacant_parcels: 1008 },
  transit: { freq_share_qmi: 0.35, freq_dist_mi: 0.34, any_dist_mi: 0.1, departures_qmi: 618, departures_pct: 0.44 },
  flood: { fema_sfha_pct: 1.9, fema_zone: null, hand_pct: 31.8 },
  zoning: {
    shares: { 'R2-L': 51.5, 'RM-M': 15.6, UI: 14.6, P: 8.1, RP: 5.1, LNC: 3.9 },
    by_type: { adu: 'conditional', duplex_triplex: 'yes', townhome: 'conditional', small_apartment: 'yes', senior: 'yes' },
    verified: false,
  },
  programs: { qct: true, dda: false, oz: false, cdbg: true },
  displacement: { score: 0.614, conf: 'low' },
};

export const SQUIRREL_HILL_NORTH: PlaceMeasures = {
  renter_hh: 630,
  bands: {
    le30: { hh: 50, moe: 45, burden30: 20, burden50: 15 },
    b30_50: { hh: 115, moe: 66, burden30: 110, burden50: 100 },
    b50_80: { hh: 50, moe: 46, burden30: 50, burden50: 10 },
    b80_100: { hh: 65, moe: 50, burden30: 40, burden50: 0 },
    gt100: { hh: 350, moe: 119, burden30: 20, burden50: 0 },
  },
  types: {
    le30: { elderly_alone: 20, elderly_family: 0, small_family: 10, large_family: 0, other: 20 },
    b30_50: { elderly_alone: 45, elderly_family: 0, small_family: 25, large_family: 0, other: 45 },
    b50_80: { elderly_alone: 30, elderly_family: 0, small_family: 5, large_family: 0, other: 15 },
    // >80% row is synthetic.
    gt80: { elderly_alone: 60, elderly_family: 40, small_family: 150, large_family: 20, other: 145 },
  },
  market: {
    asking_2br: 1895, asking_n: 166, asking_conf: 'high',
    acs_rent: 2054, acs_rent_moe: 169, zip: '15217', safmr_2br: 1620,
    value_acs: 621700, value_acs_moe: 40000, value_nbr_acs: 688300,
    sale_median: 766066, sale_n: 89, sale_nbr_median: 586000, sale_nbr_n: 120,
  },
  stock: { sfd_share: 0.4, units_2_4_share: 0.286, units_5_19_share: 0.15, units_20plus_share: 0.12, vacancy_share: 0.06, parcels_2_4: 156, vacant_parcels: 34 },
  transit: { freq_share_qmi: 0.96, freq_dist_mi: 0.05, any_dist_mi: 0.04, departures_qmi: 985, departures_pct: 0.7 },
  flood: { fema_sfha_pct: 0, fema_zone: null, hand_pct: 8.5 },
  zoning: {
    shares: { 'R2-L': 35.6, 'R1D-L': 19.4, 'RM-M': 17.0, 'R1D-VL': 15.4, P: 8.0, LNC: 2.5 },
    by_type: { adu: 'conditional', duplex_triplex: 'yes', townhome: 'conditional', small_apartment: 'yes', senior: 'yes' },
    verified: false,
  },
  programs: { qct: false, dda: false, oz: false, cdbg: false },
  displacement: { score: 0.287, conf: 'low' },
};

/** Every field null: the rules must read "not available" and never throw. */
export const NULL_PLACE: PlaceMeasures = {
  renter_hh: null,
  bands: {
    le30: { hh: null, moe: null, burden30: null, burden50: null },
    b30_50: { hh: null, moe: null, burden30: null, burden50: null },
    b50_80: { hh: null, moe: null, burden30: null, burden50: null },
    b80_100: { hh: null, moe: null, burden30: null, burden50: null },
    gt100: { hh: null, moe: null, burden30: null, burden50: null },
  },
  // The contract types these as numbers; a pipeline that has no CHAS row writes nulls, which the rules treat as missing.
  types: {
    le30: { elderly_alone: null, elderly_family: null, small_family: null, large_family: null, other: null } as unknown as PlaceMeasures['types']['le30'],
    b30_50: { elderly_alone: null, elderly_family: null, small_family: null, large_family: null, other: null } as unknown as PlaceMeasures['types']['le30'],
    b50_80: { elderly_alone: null, elderly_family: null, small_family: null, large_family: null, other: null } as unknown as PlaceMeasures['types']['le30'],
    gt80: { elderly_alone: null, elderly_family: null, small_family: null, large_family: null, other: null } as unknown as PlaceMeasures['types']['le30'],
  },
  market: {
    asking_2br: null, asking_n: null, asking_conf: null, acs_rent: null, acs_rent_moe: null, zip: null, safmr_2br: null,
    value_acs: null, value_acs_moe: null, value_nbr_acs: null, sale_median: null, sale_n: null, sale_nbr_median: null, sale_nbr_n: null,
  },
  stock: { sfd_share: null, units_2_4_share: null, units_5_19_share: null, units_20plus_share: null, vacancy_share: null, parcels_2_4: null, vacant_parcels: null },
  transit: { freq_share_qmi: null, freq_dist_mi: null, any_dist_mi: null, departures_qmi: null, departures_pct: null },
  flood: { fema_sfha_pct: null, fema_zone: null, hand_pct: null },
  zoning: null,
  programs: { qct: null, dda: null, oz: null, cdbg: null },
  displacement: { score: null, conf: null },
};

/** A downtown / park tract as the real place.json writes it: zero renters with a margin of error, fractions for zoning shares, a frequent stop at the door. */
export const ZERO_PLACE: PlaceMeasures = {
  ...structuredClone(NULL_PLACE),
  renter_hh: 0,
  bands: {
    le30: { hh: 0, moe: 11, burden30: 0, burden50: 0 },
    b30_50: { hh: 0, moe: 11, burden30: 0, burden50: 0 },
    b50_80: { hh: 0, moe: 11, burden30: 0, burden50: 0 },
    b80_100: { hh: 0, moe: 11, burden30: 0, burden50: 0 },
    gt100: { hh: 0, moe: 11, burden30: 0, burden50: 0 },
  },
  types: {
    le30: { elderly_alone: 0, elderly_family: 0, small_family: 0, large_family: 0, other: 0 },
    b30_50: { elderly_alone: 0, elderly_family: 0, small_family: 0, large_family: 0, other: 0 },
    b50_80: { elderly_alone: 0, elderly_family: 0, small_family: 0, large_family: 0, other: 0 },
    gt80: { elderly_alone: 0, elderly_family: 0, small_family: 0, large_family: 0, other: 0 },
  },
  market: { ...structuredClone(NULL_PLACE.market), asking_n: 0, asking_conf: 'low', zip: '15219', safmr_2br: 1380, value_nbr_acs: 233100 },
  transit: { freq_share_qmi: 1, freq_dist_mi: 0.05, any_dist_mi: 0.05, departures_qmi: 1049, departures_pct: null },
  flood: { fema_sfha_pct: null, fema_zone: null, hand_pct: 58.4 },
  zoning: {
    shares: { H: 0.2096, GI: 0.278, RIV: 0.507, GT: 0.0034, PLANNED: 0.002 },
    by_type: { adu: 'unknown', duplex_triplex: 'conditional', townhome: 'yes', small_apartment: 'yes', senior: 'yes' },
    verified: false,
  },
  programs: { qct: false, dda: false, oz: false, cdbg: null },
};

export const FIXTURE_PLACES: Record<string, PlaceMeasures> = {
  hazelwood: HAZELWOOD,
  homewood_north: HOMEWOOD_NORTH,
  squirrel_hill_north: SQUIRREL_HILL_NORTH,
};
