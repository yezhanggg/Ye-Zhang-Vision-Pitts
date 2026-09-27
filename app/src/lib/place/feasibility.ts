// Feasibility annotations (plan §3): lot pattern, flood word, zoning by-right note. Annotations, never a gate.
import { fmtCount, fmtPct100, fmtPct100d1, fmtShare, isNum, NA } from './format';
import { THRESHOLDS, TYPOLOGY_LABEL } from './thresholds';
import type { PlaceMeasures, Typology } from './types';

export type { Typology };

export interface LotPattern {
  /** Types the lot pattern supports adding without demolition: ADU and 2–4 on the small-building pattern; new build on vacant land. */
  additive: Typology[];
  /** Fewer than the vacant-parcel mark (or no count): new buildings replace something. */
  infillOnly: boolean;
  notes: string[];
  smallBuildings: boolean | null;
  vacantLand: boolean | null;
}

export function lotPattern(p: PlaceMeasures): LotPattern {
  const s = p?.stock;
  const share = s?.units_2_4_share ?? null, parcels = s?.parcels_2_4 ?? null, vacant = s?.vacant_parcels ?? null;
  const notes: string[] = [];
  let smallBuildings: boolean | null = null;
  if (isNum(share) || isNum(parcels)) {
    smallBuildings = (isNum(share) && share >= THRESHOLDS.lot_units_2_4_share) || (isNum(parcels) && parcels >= THRESHOLDS.lot_parcels_2_4);
    const shareText = isNum(share) ? `${fmtShare(share)} of homes are in 2–4 unit buildings (the mark is ${fmtShare(THRESHOLDS.lot_units_2_4_share)})` : `share of homes in 2–4 unit buildings ${NA}`;
    const parcelText = isNum(parcels) ? `${fmtCount(parcels)} parcels hold 2–4 units (the mark is ${THRESHOLDS.lot_parcels_2_4})` : `2–4 unit parcels not counted`;
    notes.push(smallBuildings ? `${shareText}; ${parcelText}: the lot pattern supports ADUs and 2–4 conversions.` : `${shareText}; ${parcelText}: ADUs and 2–4 conversions are infill-scale here.`);
  } else {
    notes.push(`Share of homes in 2–4 unit buildings and 2–4 unit parcels are ${NA}.`);
  }
  let vacantLand: boolean | null = null;
  if (isNum(vacant)) {
    vacantLand = vacant >= THRESHOLDS.lot_vacant_parcels;
    notes.push(vacantLand ? `${fmtCount(vacant)} vacant parcels (the mark is ${THRESHOLDS.lot_vacant_parcels}): new homes can go on vacant land without demolition.` : `${fmtCount(vacant)} vacant parcels (the mark is ${THRESHOLDS.lot_vacant_parcels}): infill only; a new building replaces something.`);
  } else {
    notes.push(`Vacant-parcel count ${NA}; new build reads as infill only.`);
  }
  const additive: Typology[] = [];
  if (smallBuildings) additive.push('adu', 'duplex_triplex');
  if (vacantLand) additive.push('townhome', 'small_apartment', 'senior');
  return { additive, infillOnly: !vacantLand, notes, smallBuildings, vacantLand };
}

export type FloodWord = 'none' | 'minor' | 'moderate' | 'high' | 'unknown';

export interface FloodNote {
  word: FloodWord;
  sentence: string;
  /** FEMA share above the mark: multi-unit types read "check the site". */
  checkSite: boolean;
}

export function floodWord(fema: number | null | undefined): FloodWord {
  if (!isNum(fema)) return 'unknown';
  if (fema <= 0) return 'none';
  if (fema < THRESHOLDS.flood_minor_below_pct) return 'minor';
  if (fema <= THRESHOLDS.flood_moderate_upto_pct) return 'moderate';
  return 'high';
}

/** One word from the FEMA flood-zone share (none / minor < 5% / moderate 5–15% / high > 15%), then the terrain screen. */
export function floodNote(p: PlaceMeasures): FloodNote {
  const fema = p?.flood?.fema_sfha_pct ?? null, hand = p?.flood?.hand_pct ?? null, zone = p?.flood?.fema_zone ?? null;
  const word = floodWord(fema);
  const terrain = isNum(hand) ? `Terrain screen reads ${fmtPct100d1(hand)} low-lying (medium confidence).` : `Terrain screen ${NA}.`;
  const checkSite = isNum(fema) && fema > THRESHOLDS.flood_check_site_pct;
  let head: string;
  if (word === 'unknown') head = `FEMA flood-zone share ${NA}.`;
  else if (word === 'none') head = `Flood: none. FEMA maps no flood zone here.`;
  else head = `Flood: ${word}. FEMA maps ${fmtPct100d1(fema)} of the land in a flood zone${zone ? ` (zone ${zone})` : ''}.`;
  const check = checkSite ? ` Above ${THRESHOLDS.flood_check_site_pct}%: check the site before a multi-unit building.` : '';
  return { word, sentence: `${head}${check} ${terrain}`.trim(), checkSite };
}

export type ZoningNoteStatus = 'yes' | 'conditional' | 'no' | 'unknown' | 'not_checked';

export const ZONING_SUFFIX = '(unverified: confirm in Title 9)';
export const ZONING_NOT_CHECKED = 'Zoning: not checked by this tool.';

/** By-right annotation from the unverified district table; suffixed "(unverified: confirm in Title 9)" whenever zoning exists. */
export function zoningNote(p: PlaceMeasures, t: Typology): { status: ZoningNoteStatus; sentence: string } {
  const z = p?.zoning;
  if (!z) return { status: 'not_checked', sentence: ZONING_NOT_CHECKED };
  const status = z.by_type?.[t] ?? 'unknown';
  const label = TYPOLOGY_LABEL[t];
  const cap = label[0].toUpperCase() + label.slice(1);
  const share = `${fmtPct100(THRESHOLDS.zoning_by_right_share_pct)} of the land`;
  const body =
    status === 'yes' ? `${cap}: by right in districts covering at least ${share} here`
    : status === 'conditional' ? `${cap}: conditional use in districts covering at least ${share} here`
    : status === 'no' ? `${cap}: not by right in any district covering ${share} here`
    : `${cap}: no rule on file for the districts here`;
  return { status, sentence: `${body} ${ZONING_SUFFIX}` };
}

/** District shares on 0–100 whichever way the file stores them (fractions when the largest share is at most 1). */
export function zoningSharesPct(p: PlaceMeasures): [string, number][] {
  const shares = p?.zoning?.shares;
  if (!shares) return [];
  const rows = Object.entries(shares).filter((e): e is [string, number] => isNum(e[1]) && e[1] > 0);
  const scale = rows.length && Math.max(...rows.map(([, v]) => v)) <= 1 ? 100 : 1;
  return rows.map(([k, v]) => [k, v * scale] as [string, number]).sort((a, b) => b[1] - a[1]);
}

/** "P 45%, RIV-GI 12%, R1A-H 10% …": the largest districts by land share, whole percent. */
export function zoningSharesText(p: PlaceMeasures, top = 6): string | null {
  const rows = zoningSharesPct(p).slice(0, top);
  return rows.length ? rows.map(([k, v]) => `${k} ${fmtPct100(v)}`).join(', ') : null;
}
