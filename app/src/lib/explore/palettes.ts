// Theme ramps for the Explore data browser: each topic gets its own five-class, light → dark ramp so a glance at
// the map says what kind of number it is (money green, rent violet, hardship red …). Most ramps are ColorBrewer
// sequential schemes (colorblind-safe); a few shares where "above or below the city" is the point use a two-color
// diverging ramp centred on the city value. Categorical Analysis layers (best fit, market classes) keep their own palettes.
import type { VariableDef } from './types';

export type ThemeId = 'money' | 'rent' | 'stress' | 'ami' | 'people' | 'age' | 'stock' | 'transit' | 'flood' | 'green' | 'edu' | 'landRes' | 'landCom' | 'landInd' | 'landVacant' | 'diverging';

export const THEME_PALETTES: Record<ThemeId, string[]> = {
  /** Greens: money that is good for residents (income, home value). */
  money: ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'],
  /** Purples: rents and housing costs. */
  rent: ['#f2f0f7', '#cbc9e2', '#9e9ac8', '#756bb1', '#54278f'],
  /** Reds: stress and hardship. */
  stress: ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'],
  /** Orange–red: HUD income bands (AMI). */
  ami: ['#fef0d9', '#fdcc8a', '#fc8d59', '#e34a33', '#b30000'],
  /** Blue–purple: people and demographics. */
  people: ['#edf8fb', '#b3cde3', '#8c96c6', '#8856a7', '#810f7c'],
  /** Amber: age. */
  age: ['#fff7bc', '#fee391', '#fec44f', '#ec7014', '#993404'],
  /** Teal: housing stock and tenure. */
  stock: ['#e0f3f1', '#a8dcd4', '#5fb8ad', '#2a8a83', '#0b5752'],
  /** Blues: transit and commuting. */
  transit: ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'],
  /** Cyan → deep blue: flood exposure. */
  flood: ['#e0f7fa', '#98dbe8', '#41b6c4', '#1d6fb0', '#0c2c84'],
  /** Yellow-green: green cover. */
  green: ['#ffffcc', '#d9f0a3', '#addd8e', '#78c679', '#238443'],
  /** Indigo: education and work. */
  edu: ['#eef0fb', '#c3c9f0', '#8d97de', '#5a62c2', '#2f3585'],
  /** Land-use yellows: residential land (the zoning map's residential color family). */
  landRes: ['#fffbe0', '#fdeea0', '#f9d45c', '#e8a91c', '#a86b06'],
  /** Land-use reds: commercial land. */
  landCom: ['#fde8ea', '#f7b3bd', '#ec6f84', '#c8324d', '#86102a'],
  /** Land-use purples: industrial land. */
  landInd: ['#f1eef6', '#cfc6df', '#a697c2', '#7a669e', '#4d3a6e'],
  /** Land-use browns/tans: vacant land and lots. */
  landVacant: ['#f7f0e6', '#e3cfae', '#c9a576', '#a0703f', '#6b4220'],
  /** Orange (below the city) ↔ teal (above the city), neutral middle class around the city value. */
  diverging: ['#c85a12', '#f3b27a', '#f5f0d8', '#7cc3b8', '#0f766e'],
};

const BY_ID: Record<string, ThemeId> = {
  // Money, good for residents
  med_hh_income: 'money', per_capita_income: 'money', med_home_value: 'money',
  // Rent and costs
  med_gross_rent: 'rent', an_rent_acs: 'rent', an_rent_fmr: 'rent', an_rent_2br: 'rent',
  // Stress and hardship
  poverty_share: 'stress', rent_burden30_share: 'stress', rent_burden50_share: 'stress', owner_burden30_share: 'stress',
  an_eviction_rate: 'stress', vacancy_share: 'stress', unemployment_rate: 'stress', an_svi: 'stress', an_ami_le30_burden50: 'stress',
  // Income bands (AMI) and vouchers
  an_ami_le30: 'ami', an_ami_30_50: 'ami', an_ami_50_80: 'ami', an_ami_le50_share: 'ami', an_hcv_per_renter: 'ami',
  // People and demographics
  pop: 'people', households: 'people', under18_share: 'people',
  white_nh_share: 'people', black_nh_share: 'people', asian_nh_share: 'people', hispanic_share: 'people',
  median_age: 'age', age65_share: 'age', an_age65: 'age',
  // Housing stock and tenure
  housing_units: 'stock', median_year_built: 'stock', sfd_share: 'stock', units_2_4_share: 'stock', units_5_19_share: 'stock',
  units_20plus_share: 'stock', an_units_2_4: 'stock', renter_hh: 'stock', owner_hh: 'stock',
  renter_share: 'diverging', pop_renter_share: 'diverging',
  // Transit and commuting
  transit_share: 'transit', walk_share: 'transit', bike_share: 'transit', no_vehicle_share: 'transit', drive_alone_share: 'transit',
  wfh_share: 'transit', an_transit_departures: 'transit', an_transit_freq: 'transit',
  // Environment
  an_flood_fema: 'flood', an_flood_screen: 'flood', an_veg_cover: 'green',
  // Land use (parcels)
  an_land_res: 'landRes', an_land_com: 'landCom', an_land_ind: 'landInd', an_land_vacant: 'landVacant', an_land_vacant_lots: 'landVacant',
  // Education and work
  bachelors_share: 'edu', lfpr: 'edu',
};

/** Fallback by catalogue group, for variables added later. */
const BY_GROUP: Record<string, ThemeId> = {
  population: 'people', race: 'people', income: 'money', work_edu: 'edu', stock: 'stock', tenure: 'stock', cost: 'rent',
  commute: 'transit', an_ami: 'ami', an_rents: 'rent', an_inputs: 'stock', an_land: 'landVacant',
};

export function themeOf(variable: Pick<VariableDef, 'id' | 'group'> | null | undefined): ThemeId {
  if (!variable) return 'transit';
  return BY_ID[variable.id] ?? BY_GROUP[variable.group] ?? (/flood/.test(variable.id) ? 'flood' : 'transit');
}

/** The five-color ramp (light → dark, or low ↔ high around the city for diverging variables) for a variable. */
export const themePalette = (variable: Pick<VariableDef, 'id' | 'group'> | null | undefined): string[] => THEME_PALETTES[themeOf(variable)];

/** True when the variable is painted as above/below the city value. */
export const isDiverging = (variable: Pick<VariableDef, 'id' | 'group'> | null | undefined) => themeOf(variable) === 'diverging';
