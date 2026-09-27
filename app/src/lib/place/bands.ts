// Target band and tenant profile (plan §3). Both read CHAS counts as published; nothing is modelled.
import { BAND_LABEL, BAND_ORDER, BAND_PHRASE } from './afford';
import { fmtEst, fmtHouseholds, isNum, joinAnd, NA } from './format';
import { HOUSEHOLD_TYPE_LABEL, HOUSEHOLD_TYPE_ORDER, TYPE_BEDROOMS } from './thresholds';
import type { Band, BandId, Bedrooms, HouseholdType, PlaceMeasures, TypeBandId } from './types';

export interface TargetBand {
  band: BandId;
  /** The band's margin of error exceeds its estimate. */
  uncertain: boolean;
  runnerUp: BandId | null;
  /** Renter households in the band paying more than 30% of income. */
  burdened: number | null;
  hh: number | null;
  reason: string;
  /** False when no band carries a cost-burden count (the band then defaults to ≤30% and nothing is claimed). */
  available: boolean;
  /** True when the reader chose the band. */
  overridden: boolean;
}

const bandOf = (p: PlaceMeasures, id: BandId): Band | null => p?.bands?.[id] ?? null;

/** Bands ranked by renter households paying >30%; ties go to the more severe burden, then to the lower band. */
export function rankBands(p: PlaceMeasures): BandId[] {
  return BAND_ORDER.filter((id) => isNum(bandOf(p, id)?.burden30)).sort((a, b) => {
    const A = bandOf(p, a)!, B = bandOf(p, b)!;
    if (B.burden30! !== A.burden30!) return B.burden30! - A.burden30!;
    const a50 = A.burden50 ?? -1, b50 = B.burden50 ?? -1;
    if (b50 !== a50) return b50 - a50;
    return BAND_ORDER.indexOf(a) - BAND_ORDER.indexOf(b);
  });
}

/** "435 renter households at or below 30% of area median income, 350 of them paying more than 30% of income", or the not-available wording. */
export function bandFigures(p: PlaceMeasures, band: BandId): string {
  const b = bandOf(p, band);
  if (!b || !isNum(b.hh)) return `${BAND_LABEL[band]}: renter households ${NA}`;
  const burdened = isNum(b.burden30) ? fmtHouseholds(b.burden30) : NA;
  return `${fmtEst(b.hh, b.moe)} renter households ${BAND_PHRASE[band]}, ${burdened} of them paying more than 30% of income`;
}

/** The band with the most renter households paying over 30% of income (plan §3); a reader's choice overrides. */
export function targetBand(p: PlaceMeasures, override?: BandId): TargetBand {
  const ranked = rankBands(p);
  const counted = ranked.length > 0;
  /** Under-served on the evidence: some band has renter households paying more than 30% of income. */
  const available = counted && (bandOf(p, ranked[0])!.burden30 ?? 0) > 0;
  const band = override ?? ranked[0] ?? 'le30';
  const b = bandOf(p, band);
  const hh = isNum(b?.hh) ? b!.hh : null;
  const burdened = isNum(b?.burden30) ? b!.burden30 : null;
  const uncertain = isNum(hh) && isNum(b?.moe) ? b!.moe! > hh : !isNum(hh);
  const runnerUp = ranked.find((id) => id !== band) ?? null;
  let reason: string;
  if (override) {
    reason = `Band chosen by you: ${bandFigures(p, band)}.`;
  } else if (!counted) {
    reason = `Cost-burden counts by income band are ${NA} here, so no band is under-served on the evidence; ≤30% AMI is shown as the default.`;
  } else if (!available) {
    const renters = p?.renter_hh;
    reason = isNum(renters) && renters === 0 ? 'CHAS counts no renter households here, so no band is under-served on the evidence.' : `CHAS counts no renter households paying more than 30% of income here, in any band${isNum(renters) ? ` (${fmtHouseholds(renters)} renter households)` : ''}, so no band is under-served on the evidence.`;
  } else {
    const next = runnerUp ? ` (next: ${BAND_LABEL[runnerUp]} with ${fmtHouseholds(bandOf(p, runnerUp)?.burden30)})` : '';
    reason = `${bandFigures(p, band)}: the most of any band${next}.`;
    if (uncertain) reason += ` The margin of error (±${fmtHouseholds(b?.moe)}) exceeds the estimate, so this call is uncertain${runnerUp ? `; ${BAND_LABEL[runnerUp]} is the runner-up` : ''}.`;
  }
  return { band, uncertain, runnerUp, burdened, hh, reason, available, overridden: !!override };
}

/** CHAS household types carry no 80–100 split: both top bands read from >80%. */
export const typeBandFor = (band: BandId): TypeBandId => (band === 'b80_100' || band === 'gt100' ? 'gt80' : band);

export const TYPE_BAND_PHRASE: Record<TypeBandId, string> = {
  le30: 'at or below 30% AMI',
  b30_50: 'at 30–50% AMI',
  b50_80: 'at 50–80% AMI',
  gt80: 'above 80% AMI (CHAS does not split 80–100% from above 100%)',
};

export interface TenantType {
  type: HouseholdType;
  label: string;
  count: number;
}

export interface TenantProfile {
  /** Largest types first (zero counts dropped); the residual "other" never leads on a tie. */
  types: TenantType[];
  /** Bedrooms from the largest type (elderly alone → 1BR; small family → 2BR; large family → 3BR; other → 1BR). */
  bedrooms: Bedrooms;
  /** The largest type is seniors living alone (a one-person household for the rent ceiling). */
  seniorAlone: boolean;
  sentence: string;
  available: boolean;
}

/** Household types in a band, sorted; counts read as published (non-numbers count as missing, not zero). */
export function typesIn(p: PlaceMeasures, band: BandId): TenantType[] {
  const rec = p?.types?.[typeBandFor(band)];
  if (!rec) return [];
  return HOUSEHOLD_TYPE_ORDER.filter((t) => isNum(rec[t]) && rec[t] > 0)
    .map((t) => ({ type: t, label: HOUSEHOLD_TYPE_LABEL[t], count: rec[t] }))
    .sort((a, b) => b.count - a.count || HOUSEHOLD_TYPE_ORDER.indexOf(a.type) - HOUSEHOLD_TYPE_ORDER.indexOf(b.type));
}

/** Who lives in the band: the largest household types, and the bedrooms the largest one needs. */
export function tenantProfile(p: PlaceMeasures, band: BandId): TenantProfile {
  const types = typesIn(p, band);
  const rec = p?.types?.[typeBandFor(band)];
  const anyNumber = !!rec && HOUSEHOLD_TYPE_ORDER.some((t) => isNum(rec[t]));
  if (types.length === 0) {
    return {
      types,
      bedrooms: 1,
      seniorAlone: false,
      sentence: anyNumber ? `CHAS counts no renter households ${TYPE_BAND_PHRASE[typeBandFor(band)]} by type here.` : `Household types ${TYPE_BAND_PHRASE[typeBandFor(band)]} are ${NA}.`,
      available: false,
    };
  }
  const lead = types[0];
  const parts = types.map((t) => `${fmtHouseholds(t.count)} ${t.label}`);
  const total = types.reduce((s, t) => s + t.count, 0);
  const phrase = TYPE_BAND_PHRASE[typeBandFor(band)];
  const sentence = `${phrase[0].toUpperCase()}${phrase.slice(1)}, CHAS counts ${joinAnd(parts)} (${fmtHouseholds(total)} renter households by type). The largest group, ${lead.label}, sets the home size: ${bedroomsWord(TYPE_BEDROOMS[lead.type], lead.type === 'elderly_alone')}.`;
  return { types, bedrooms: TYPE_BEDROOMS[lead.type], seniorAlone: lead.type === 'elderly_alone', sentence, available: true };
}

export function bedroomsWord(br: Bedrooms, seniorAlone = false): string {
  const base = br === 0 ? 'a studio' : br === 1 ? 'a 1-bedroom' : `a ${br}-bedroom`;
  return seniorAlone ? `${base} for one person` : base;
}

/** Households summed over bands (nulls skipped; null when every band is null). */
export function sumBands(p: PlaceMeasures, ids: BandId[]): { hh: number | null; burden30: number | null; burden50: number | null } {
  const pick = (k: keyof Band) => {
    const vals = ids.map((id) => bandOf(p, id)?.[k]).filter(isNum);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  };
  return { hh: pick('hh'), burden30: pick('burden30'), burden50: pick('burden50') };
}

/** Household types summed over bands (type bands; b80_100 and gt100 both read gt80 once). */
export function sumTypes(p: PlaceMeasures, ids: BandId[]): Partial<Record<HouseholdType, number>> | null {
  const tb = Array.from(new Set(ids.map(typeBandFor)));
  const out: Partial<Record<HouseholdType, number>> = {};
  let any = false;
  for (const t of HOUSEHOLD_TYPE_ORDER) {
    const vals = tb.map((id) => p?.types?.[id]?.[t]).filter(isNum);
    if (vals.length) {
      out[t] = vals.reduce((a, b) => a + b, 0);
      any = true;
    }
  }
  return any ? out : null;
}
