// Wording of the place blocks A–G (plan §4), in one place. Templates and formats only: every number that reaches a
// template was computed elsewhere in lib/place, and nothing here computes a score.
import { BAND_LABEL, BAND_ORDER, BAND_PHRASE, bandLimit4p, type Ceiling, type MarketTest } from './afford';
import { sumBands, sumTypes, type TargetBand, type TenantProfile, bedroomsWord } from './bands';
import { floodNote, zoningNote, zoningSharesText, ZONING_NOT_CHECKED, ZONING_SUFFIX } from './feasibility';
import { fmtCount, fmtDollars, fmtEst, fmtEstMoe, fmtHouseholds, fmtMiles, fmtScore, fmtShare, isNum, joinAnd, NA, capitalize } from './format';
import { STANCE_LABEL, THRESHOLDS, TYPOLOGIES, TYPOLOGY_LABEL } from './thresholds';
import type { BandId, Bedrooms, HudTable, PlaceMeasures, Stance, Typology } from './types';

export { STANCE_LABEL, TYPOLOGY_LABEL, BAND_LABEL };

// ------------------------------------------------------------------ stances
/** One sentence each: what the stance asks for. */
export const STANCE_MEANING: Record<Stance, string> = {
  anti_displacement: 'Add homes without pushing anyone out: where risk is high, only types that add units without demolition, priced for the households already here.',
  market_led: 'Recommend only what the market pays for today, and say plainly who that leaves out.',
  transit_first: 'Put the densest feasible homes where frequent transit already runs, and fail the place when it does not.',
  climate_resilient: 'Keep new homes out of flood zones and near frequent transit, in attached and multi-unit forms.',
};

/** The stance's preset weights, in words (the digits live in config/scoring.json). */
export const STANCE_WEIGHTS_WORDS: Record<Stance, string> = {
  anti_displacement: 'Weights displacement risk most, need next, market strength least.',
  market_led: 'Weights market strength most; need, displacement risk and subsidy eligibility least.',
  transit_first: 'Weights transit access most; every other factor counts the same.',
  climate_resilient: 'Weights flood exposure most, transit access next, 2–4 unit homes a little more, market strength least.',
};

export const STANCE_CAVEAT: Partial<Record<Stance, string>> = {
  anti_displacement: 'It ranks building types and protects no one by itself; where risk is low it favors market-rate types.',
  market_led: 'It never recommends a subsidized home, so where the market does not pay it recommends nothing.',
  transit_first: 'It reads transit as it runs in June 2026; a service cut or a new line changes the answer.',
  climate_resilient: 'Flood reads FEMA zones only (no future-rain model); embodied carbon is not modeled (no Pittsburgh data).',
};

/** The fixed "You decide" sentence (plan §3). */
export const DECIDE = 'This page does not choose. Site, scale, sponsor, financing, zoning relief and the neighborhood plan are decisions for people; the tool shows the evidence and the arithmetic.';

/** What the tool refuses to pretend to know (plan §3). */
export const REFUSES: string[] = [
  'construction or land cost',
  'whether a project pencils',
  'a site',
  'verified zoning',
  'PHFA scoring',
  'absorption',
  '2026 incomes',
  'who has already been displaced',
];

/** The value judgments behind the stance rules, as printable sentences. */
export const RULES_IN_WORDS: string[] = [
  `Price = 30% of the HUD income limit ÷ 12, at ${THRESHOLDS.persons_per_bedroom} persons per bedroom (a senior living alone = 1 person); gross rent, utility allowance not known.`,
  'Target band = the band with the most renter households paying over 30% of income; ties go to the more severe burden; uncertain when the margin of error exceeds the estimate.',
  `Anti-displacement: risk at or above ${THRESHOLDS.displacement_high} → only types that add homes without demolition, for the ≤50% band, subsidized; below ${THRESHOLDS.displacement_low} → affordable homes through gentle density; between → the target band with the same additive preference.`,
  'Market-led: only what the market pays (asking 2BR at or above the ZIP Fair Market Rent and sales at or above the city median), else "No unsubsidized product is supported here"; always says who is not served.',
  `Transit-first: at least ${fmtShare(THRESHOLDS.transit_share_qmi)} of residents within a quarter mile of a frequent stop (≥ ${THRESHOLDS.frequent_stop_departures} weekday departures) or ≥ ${fmtCount(THRESHOLDS.transit_departures_qmi)} weekday departures within a quarter mile, then the densest feasible type; else "fails the transit test".`,
  `Climate-resilient: FEMA flood-zone land at most ${THRESHOLDS.climate_flood_max_pct}% of the tract (else "not suggested here") and the nearest frequent stop within the planner's transit distance (${THRESHOLDS.climate_transit_default_mi} mile when none is chosen; else "too far from frequent transit"), then attached and multi-unit forms before the ADU. Fewer car trips and less energy per home; embodied carbon is not modeled (no Pittsburgh data).`,
  `Lot pattern: ADUs and 2–4 conversions read as supported at ${fmtShare(THRESHOLDS.lot_units_2_4_share)} of homes in 2–4 unit buildings or ${THRESHOLDS.lot_parcels_2_4} such parcels; new build on vacant land at ${THRESHOLDS.lot_vacant_parcels} vacant parcels, else infill only. Flood: FEMA share above ${THRESHOLDS.flood_check_site_pct}% reads "check the site". Zoning: by right at ${THRESHOLDS.zoning_by_right_share_pct}% land share, unverified. None of these is a gate.`,
  `A for-sale home is within a band's reach at up to ${THRESHOLDS.own_price_to_income} times the band's four-person income limit (a rule of thumb, not underwriting).`,
];

// ------------------------------------------------------------------ source lines ("Source · vintage · calculation")
export const SOURCE_LINES = {
  A: 'HUD CHAS 2018–22 Table 8 · HUD FY2026 income limits · counts as published, four-person limit beside each band',
  B: 'HUD CHAS 2018–22 household type × income band · ACS 2020–24 · counts as published',
  C: 'Dewey listings 2025–26 (2BR median) · ACS 2020–24 gross rent and home value · HUD FY2026 SAFMR · Allegheny County sales since 2023 · MVA 2021',
  D: `PRT GTFS June 2026 · 2020 census blocks · frequent = at least ${THRESHOLDS.frequent_stop_departures} weekday departures at the stop`,
  E: 'FEMA NFHL flood zones · HAND on USGS 3DEP (terrain screen) · shares of land',
  F: 'WPRDC zoning districts (land share) · HUD QCT/DDA 2026 · Treasury Opportunity Zones · City CDBG areas',
  G: 'the rules in docs/assumptions.md §11 · value judgments with printed thresholds · fit order = scoreTract under the stance preset',
} as const;

// ------------------------------------------------------------------ block A: affordability by AMI band
export function affordabilitySentence(p: PlaceMeasures, target: TargetBand): string {
  const renters = p?.renter_hh;
  if (isNum(renters) && renters === 0) return 'CHAS counts no renter households here.';
  const head = isNum(renters) ? `${fmtHouseholds(renters)} renter households live here.` : `Renter households: ${NA}.`;
  if (!target.available && !target.overridden) {
    return isNum(p?.bands?.le30?.hh) ? `${head} CHAS counts none of them paying more than 30% of income, in any band.` : `${head} Renter households by income band are ${NA}.`;
  }
  const b = p?.bands?.[target.band];
  if (!b || !isNum(b.hh)) return `${head} The ${BAND_LABEL[target.band]} band is ${NA}.`;
  const s30 = isNum(b.burden30) ? fmtHouseholds(b.burden30) : NA;
  const s50 = isNum(b.burden50) ? fmtHouseholds(b.burden50) : NA;
  return `${head} ${fmtEst(b.hh, b.moe)} earn ${target.band === 'gt100' ? 'more than' : 'at most'} ${bandCapWord(target.band)} of area median income; ${s30} of them pay more than 30% of income and ${s50} pay more than half.`;
}

/** "30%", "50%", "80%", "100%" or "100%" for >100. */
export const bandCapWord = (band: BandId): string => ({ le30: '30%', b30_50: '50%', b50_80: '80%', b80_100: '100%', gt100: '100%' })[band];

export interface AffordabilityRow {
  band: BandId;
  label: string;
  hh: number | null;
  moe: number | null;
  /** "435 ±171" whenever a margin of error exists. */
  hhText: string;
  burden30: number | null;
  burden50: number | null;
  /** Four-person income that caps the band; null above 100%. */
  limit4p: number | null;
  limitText: string;
  flagged: boolean;
}

export function affordabilityTable(p: PlaceMeasures, hud: HudTable | null): AffordabilityRow[] {
  return BAND_ORDER.map((band) => {
    const b = p?.bands?.[band];
    const limit4p = hud ? bandLimit4p(hud, band) : null;
    return {
      band,
      label: BAND_LABEL[band],
      hh: isNum(b?.hh) ? b!.hh : null,
      moe: isNum(b?.moe) ? b!.moe : null,
      hhText: fmtEstMoe(b?.hh, b?.moe),
      burden30: isNum(b?.burden30) ? b!.burden30 : null,
      burden50: isNum(b?.burden50) ? b!.burden50 : null,
      limit4p,
      limitText: band === 'gt100' ? (isNum(hud?.metro.median) ? `above ${fmtDollars(hud!.metro.median)}` : NA) : limit4p == null ? NA : `up to ${fmtDollars(limit4p)}`,
      flagged: isNum(b?.hh) && isNum(b?.moe) && b!.moe! >= THRESHOLDS.moe_flag_share * b!.hh!,
    };
  });
}

// ------------------------------------------------------------------ block B: who lives here
export function whoLivesHereSentence(p: PlaceMeasures): string {
  const types = sumTypes(p, ['le30', 'b30_50']);
  const hh = sumBands(p, ['le30', 'b30_50']).hh;
  if (!types) return `Household types at or below 50% AMI are ${NA}.`;
  const e = (types.elderly_alone ?? 0) + (types.elderly_family ?? 0);
  const n = isNum(hh) ? fmtHouseholds(hh) : fmtHouseholds(Object.values(types).reduce((a, b) => a + (b ?? 0), 0));
  const alone = types.elderly_alone ?? 0;
  return `Of the ${n} renters at or below 50% AMI, ${fmtHouseholds(e)} are seniors (${fmtHouseholds(alone)} living alone), ${fmtHouseholds(types.small_family ?? 0)} small families, ${fmtHouseholds(types.large_family ?? 0)} large families, ${fmtHouseholds(types.other ?? 0)} other.`;
}

// ------------------------------------------------------------------ block C: market rent and home values
export function marketSentence(p: PlaceMeasures): string {
  const m = p?.market;
  const parts: string[] = [];
  if (isNum(m?.asking_2br)) parts.push(`Listings ask ${fmtDollars(m!.asking_2br)} for a 2-bedroom (${isNum(m!.asking_n) ? `${fmtCount(m!.asking_n)} listings` : 'listing count not available'}${m!.asking_conf ? `, ${m!.asking_conf} confidence` : ''})`);
  else parts.push(`Asking rent for a 2-bedroom ${NA}`);
  parts[0] += isNum(m?.acs_rent) ? `; residents pay a median ${fmtDollars(m!.acs_rent)}${isNum(m!.acs_rent_moe) ? ` ±${fmtDollars(m!.acs_rent_moe).slice(1)}` : ''} (census, includes subsidized homes).` : `; the census median rent is ${NA}.`;
  parts.push(isNum(m?.safmr_2br) ? `Fair Market Rent for ${m!.zip ? `ZIP ${m!.zip}` : 'this ZIP'}: ${fmtDollars(m!.safmr_2br)} for a 2-bedroom.` : `Fair Market Rent for this ZIP ${NA}.`);
  parts.push(isNum(m?.value_acs) ? `Median home value ${fmtDollars(m!.value_acs)}; next door ${isNum(m!.value_nbr_acs) ? fmtDollars(m!.value_nbr_acs) : NA}.` : `Median home value ${NA}.`);
  if (isNum(m?.sale_median)) parts.push(`Sales since 2023: median ${fmtDollars(m!.sale_median)} (${fmtCount(m!.sale_n)} sales); next door ${isNum(m!.sale_nbr_median) ? `${fmtDollars(m!.sale_nbr_median)} (${fmtCount(m!.sale_nbr_n)} sales)` : NA}.`);
  else parts.push(`Sales since 2023: ${NA}.`);
  return parts.join(' ');
}

// ------------------------------------------------------------------ block D: transit
export const FREQUENT_STOP_DEFINITION = 'one bus or T every 15 minutes or better';

export function transitSentence(p: PlaceMeasures): string {
  const t = p?.transit;
  const share = isNum(t?.freq_share_qmi) ? `${fmtShare(t!.freq_share_qmi)} of residents live within a quarter mile of a frequent stop (${FREQUENT_STOP_DEFINITION})` : `Share of residents within a quarter mile of a frequent stop ${NA}`;
  const dist = isNum(t?.freq_dist_mi) ? `the nearest frequent stop is ${fmtMiles(t!.freq_dist_mi)}` : `distance to the nearest frequent stop ${NA}`;
  const dep = isNum(t?.departures_qmi) ? `${fmtCount(t!.departures_qmi)} weekday departures within a quarter mile` : `weekday departures within a quarter mile ${NA}`;
  return `${share}; ${dist}; ${dep}.`;
}

// ------------------------------------------------------------------ block E: flood
export const floodSentence = (p: PlaceMeasures): string => floodNote(p).sentence;

// ------------------------------------------------------------------ block F: zoning and programs (two lines, never merged)
export function zoningLine(p: PlaceMeasures): string {
  if (!p?.zoning) return ZONING_NOT_CHECKED;
  const shares = zoningSharesText(p);
  const byRight = TYPOLOGIES.filter((t) => zoningNote(p, t).status === 'yes').map((t) => TYPOLOGY_LABEL[t]);
  const conditional = TYPOLOGIES.filter((t) => zoningNote(p, t).status === 'conditional').map((t) => TYPOLOGY_LABEL[t]);
  const bits: string[] = [];
  if (byRight.length) bits.push(`by right: ${joinAnd(byRight)}`);
  if (conditional.length) bits.push(`conditional: ${joinAnd(conditional)}`);
  if (!bits.length) bits.push('no by-right rule on file for the districts here');
  return `Zoning here: ${shares ?? `district shares ${NA}`}; ${bits.join('; ')} ${ZONING_SUFFIX}.`;
}

const yesNo = (v: boolean | null | undefined) => (v === true ? 'yes' : v === false ? 'no' : NA);

export function programsLine(p: PlaceMeasures): string {
  const g = p?.programs;
  return `Programs: QCT ${yesNo(g?.qct)} · DDA ${yesNo(g?.dda)} · Opportunity Zone ${yesNo(g?.oz)} · CDBG ${yesNo(g?.cdbg)}`;
}

export const DISPLACEMENT_WORD = (score: number | null | undefined): string => (!isNum(score) ? NA : score >= THRESHOLDS.displacement_high ? 'high' : score < THRESHOLDS.displacement_low ? 'low' : 'medium');

export function displacementSentence(p: PlaceMeasures): string {
  const d = p?.displacement;
  if (!isNum(d?.score)) return `Displacement risk score ${NA}.`;
  return `Displacement risk score ${fmtScore(d!.score)} (${DISPLACEMENT_WORD(d!.score)}; marks at ${THRESHOLDS.displacement_low} and ${THRESHOLDS.displacement_high}${d!.conf ? `; ${d!.conf} confidence` : ''}).`;
}

// ------------------------------------------------------------------ block G: recommendation lines
export const G = {
  underServed: (target: TargetBand) => `Under-served here: ${target.reason}`,
  tenants: (t: TenantProfile) => `Main tenants the data shows: ${t.sentence}`,
  /** "Price that serves them: $23,200 × 30% ÷ 12 = $580 a month (a 1-bedroom for one person at 30% AMI; gross rent, utility allowance not known)" */
  price: (c: Ceiling | null, band: BandId, also: Ceiling | null, twoBr: Ceiling | null, market: MarketTest, caveat: string): string => {
    if (!c) {
      const ref = twoBr ? ` For reference, the 2-bedroom ceiling at 80% AMI is ${twoBr.formula}.` : '';
      return `Price that serves them: no HUD rent ceiling applies ${BAND_PHRASE[band]}; the market rent is the price.${ref} ${market.sentence}`;
    }
    const lim = c.limitFormula ? `${c.limitFormula}; ` : '';
    let s = `Price that serves them: ${lim}${c.formula} a month (${bedroomsWord(c.bedrooms, c.seniorAlone)} at ${c.pct}% AMI; ${caveat})`;
    if (also && also.rent !== c.rent) s += `; at ${also.pct}% AMI ${also.limitFormula ? `${also.limitFormula}; ` : ''}${also.formula}`;
    s += '.';
    if (twoBr) s += ` For a 2-bedroom the ceiling is ${twoBr.limitFormula ? `${twoBr.limitFormula}; ` : ''}${twoBr.formula}. ${market.sentence}`;
    return s;
  },
  types: (xs: { typology: Typology; because: string; bedrooms: Bedrooms }[], stance?: Stance) => {
    const label = stance === 'market_led' ? 'Types the market pays for here (fit rules, a value judgment)' : 'Types that can deliver this (fit rules, a value judgment)';
    return xs.length ? `${label}: ${xs.map((x) => `${capitalize(TYPOLOGY_LABEL[x.typology])}, ${bedroomsWord(x.bedrooms).replace(/^a /, '')} — ${x.because}`).join(' · ')}` : `${label}: none under this stance.`;
  },
  not: (xs: { typology: Typology; because: string }[]) => xs.map((x) => `Not ${TYPOLOGY_LABEL[x.typology]}, because ${x.because}`),
  notServed: (bands: BandId[], why: string) => (bands.length ? `Not served by this option: ${joinAnd(bands.map((b) => BAND_LABEL[b]))}${why ? ` (${why})` : ''}.` : `Not served by this option: ${why || 'no band, on the arithmetic above'}.`),
  decide: `You decide: ${DECIDE}`,
};
