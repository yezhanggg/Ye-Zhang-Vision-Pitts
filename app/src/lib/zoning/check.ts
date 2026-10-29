// Is the project allowed on this lot? The Parcel level's zoning answer: the development type against the district's
// uses, the units against the homes allowed by right on the lot, the stories against the height limit, the lot
// against the minimum lot size and whether the building fits on the lot (its footprint against the lot less the open
// space and the coverage limit, the Open space card's own arithmetic, and for envelope districts the floor area
// against the envelope); then what the site asks of the project (the inclusionary overlay, parking, the floodplain).
// The same transcribed standards as the rest of the app (config/zoning_standards.json); a reading of the code, not a
// zoning determination. Also the units and stories a picked lot suggests (lotDefaults). Loaded on demand.
import { DEFAULT_OPEN_SHARE, openFit, type OpenFit } from '../policy/sun';
import type { DevType } from '../project/devType';
import { emptyCounts } from '../project/store';
import { CAPACITY, homesByRight, inclusionaryHomes, STANDARD_BY_CODE, STANDARDS, storiesOf, type DistrictStandard, type UseKey, type UseStatus } from './capacity';

export type Tone = 'yes' | 'hearing' | 'no' | 'info' | 'unknown';

export interface CheckRow {
  key: 'use' | 'density' | 'height' | 'lot' | 'floor' | 'izo' | 'parking' | 'flood';
  tone: Tone;
  title: string;
  text: string;
}

export interface ZoningCheck {
  /** The worst of the use, density, height, lot size and floor area rows. */
  verdict: 'yes' | 'hearing' | 'no' | 'unknown';
  district: string | null;
  /** Homes allowed by right on the lot (housing types), null where the district is not computed. */
  maxUnits: number | null;
  /** Whether the building fits on the lot (housing types on a computed district), and the units that would. */
  fit: LotFit | null;
  rows: CheckRow[];
}

export interface CheckInput {
  district: string | null;
  lotSqft: number;
  frontageFt: number | null;
  depthFt: number | null;
  devType: DevType;
  units: number;
  stories: number | null;
  /** Commercial floor area, sq ft (mixed use and commercial). */
  commercialSf: number;
  /** Average net sq ft a home and net-to-gross, for the floor area the homes need. */
  avgUnitSf: number;
  efficiency: number;
  /** The inclusionary overlay at the pin (null: not read). */
  inIzo: boolean | null;
  /** Share of the tract's land in the 1%-a-year flood zone, percent (the lot itself is not read). */
  floodPct: number | null;
  /** Open space as a share of the lot (the Open space input); 15% when not given. */
  openShare?: number;
}

export interface LotFit extends OpenFit {
  stories: number;
  /** Floor area the homes and any commercial space need, and the district's envelope (envelope districts only). */
  floorNeed: number;
  envelope: number | null;
  /** Units that fit at these stories: the footprint test, and the envelope where there is one. */
  units: number;
}

/** Does the building fit on the lot? The Open space card's test (lib/policy/sun openFit: the footprint at these stories
 *  against the lot less its open space, held to the coverage limit), with every home at the mix's average size, then
 *  the floor area against the envelope in districts limited by one. */
export function lotFit(i: Pick<CheckInput, 'units' | 'avgUnitSf' | 'efficiency' | 'stories' | 'lotSqft' | 'openShare' | 'commercialSf' | 'devType'>, s: DistrictStandard, envelope: number | null): LotFit {
  const counts = emptyCounts();
  counts.mkt[1] = i.units;
  const st = Math.max(1, i.stories ?? 1);
  const o = openFit(counts, i.units, st, [i.avgUnitSf, i.avgUnitSf, i.avgUnitSf, i.avgUnitSf], i.efficiency, i.lotSqft, i.openShare ?? DEFAULT_OPEN_SHARE, s.max_coverage);
  const shop = i.devType === 'mixed' || i.devType === 'commercial' ? i.commercialSf : 0;
  const floorNeed = i.units * o.grossPerHome + shop;
  const byEnvelope = envelope == null ? Infinity : Math.max(0, Math.floor((envelope - shop) / o.grossPerHome));
  return { ...o, stories: st, floorNeed, envelope, fits: o.fits && (envelope == null || floorNeed <= envelope), units: Math.min(o.homesThatFit, byEnvelope) };
}

const unitsWord = (n: number) => `${n} unit${n === 1 ? '' : 's'}`;
const fitRow = (i: CheckInput, f: LotFit): CheckRow => {
  const open = `${Math.round((i.openShare ?? DEFAULT_OPEN_SHARE) * 100)}% open space`;
  const env = f.envelope != null ? `; ${n0(f.floorNeed)} sq ft of floor area against the ${n0(f.envelope)} sq ft envelope` : '';
  const that = `about ${unitsWord(f.units)} fit at ${f.stories} stor${f.stories === 1 ? 'y' : 'ies'}`;
  if (f.fits) return { key: 'floor', tone: 'yes', title: 'Fits on the lot', text: `A ${n0(f.footprint)} sq ft footprint (${unitsWord(i.units)} over ${f.stories} stories) fits the ${n0(f.room)} sq ft left after ${open}${env}.` };
  if (f.footprint > f.room) return { key: 'floor', tone: 'no', title: 'Fits on the lot', text: `${unitsWord(i.units)} over ${f.stories} stories need a ${n0(f.footprint)} sq ft footprint; the lot has ${n0(f.room)} sq ft after ${open}${coverageWords(i)}: ${that}.` };
  return { key: 'floor', tone: 'no', title: 'Fits on the lot', text: `About ${n0(f.floorNeed)} sq ft of floor area needed, over the ${n0(f.envelope!)} sq ft envelope: ${that}.` };
};
const coverageWords = (i: CheckInput) => {
  const c = i.district ? STANDARD_BY_CODE.get(i.district)?.max_coverage : null;
  return c ? ` and ${Math.round(c * 100)}% coverage` : '';
};

const RANK: UseStatus[] = ['P', 'P/S', 'A', 'S', 'C', 'N'];
const STATUS_TONE: Record<UseStatus, Tone> = { P: 'yes', 'P/S': 'yes', A: 'hearing', S: 'hearing', C: 'hearing', N: 'no' };
const STATUS_TEXT: Record<UseStatus, string> = {
  P: 'allowed by right',
  'P/S': 'by right on lots 35 ft wide or narrower, a special exception on wider lots',
  A: 'needs an administrator exception (§922.08)',
  S: 'needs a special exception from the Zoning Board (§922.07)',
  C: 'needs conditional use approval from City Council (§922.06)',
  N: 'not allowed',
};
const best = (s: DistrictStandard, keys: UseKey[]): UseStatus => keys.map((k) => s.uses[k]).sort((a, b) => RANK.indexOf(a) - RANK.indexOf(b))[0] ?? 'N';
const n0 = (v: number) => Math.round(v).toLocaleString('en-US');

/** The use rows a number of homes needs. */
function homeUse(units: number): { keys: UseKey[]; word: string } {
  if (units <= 1) return { keys: ['single_detached', 'single_attached'], word: 'One unit' };
  if (units === 2) return { keys: ['two_unit'], word: 'Two units' };
  if (units === 3) return { keys: ['three_unit'], word: 'Three units' };
  return { keys: ['multi_unit'], word: `${units} units in one building` };
}

function useRow(s: DistrictStandard, t: DevType, units: number): CheckRow {
  const mixedDistrict = s.kind === 'mixed';
  const commercialWord = mixedDistrict ? 'allowed in this mixed-use district (a general reading; confirm the use in §911.02)' : 'not allowed in a residential district';
  if (t === 'commercial') return { key: 'use', tone: mixedDistrict ? 'yes' : 'no', title: 'Use', text: `Commercial space is ${commercialWord}.` };
  const housing = t === 'senior' ? { keys: ['elderly_limited', 'elderly_general'] as UseKey[], word: 'Housing for the elderly' } : homeUse(units);
  const st = best(s, housing.keys);
  const homes = { tone: STATUS_TONE[st], text: `${housing.word}: ${STATUS_TEXT[st]} in ${s.code}.` };
  if (t !== 'mixed') return { key: 'use', tone: homes.tone, title: 'Use', text: homes.text };
  const tone: Tone = !mixedDistrict ? 'no' : homes.tone;
  return { key: 'use', tone, title: 'Use', text: `${homes.text} Ground-floor commercial is ${commercialWord}.` };
}

export function checkZoning(i: CheckInput): ZoningCheck {
  const code = i.district;
  const s = code ? STANDARD_BY_CODE.get(code) : undefined;
  if (!code || !s) {
    const why = code ? STANDARDS.not_computed[code] : null;
    return {
      verdict: 'unknown',
      district: code,
      maxUnits: null,
      fit: null,
      rows: [{ key: 'use', tone: 'unknown', title: 'Use', text: code ? `District ${code} is not computed here${why ? `: ${why}` : ''}. Check with the Zoning Administrator.` : 'No zoning district was read for this lot.' }],
    };
  }
  const housing = i.devType !== 'commercial';
  const rows: CheckRow[] = [useRow(s, i.devType, i.units)];
  const by = homesByRight(s, i.lotSqft, i.frontageFt, i.depthFt);
  if (housing) {
    rows.push(
      by.below_min
        ? { key: 'density', tone: 'no', title: 'Units', text: `The lot is under ${s.code}'s minimum, so no units by right.` }
        : by.homes >= i.units
          ? { key: 'density', tone: 'yes', title: 'Units', text: `${i.units} of up to ${n0(by.homes)} unit${by.homes === 1 ? '' : 's'} allowed by right on this lot.` }
          : { key: 'density', tone: 'no', title: 'Units', text: `${i.units} units is over the ${n0(by.homes)} allowed by right here${s.max_homes ? ` (${s.family} allows ${s.max_homes} a lot)` : ''}; more needs a variance.` },
    );
  }
  const maxStories = storiesOf(s);
  if (i.stories != null && maxStories != null)
    rows.push(i.stories <= maxStories ? { key: 'height', tone: 'yes', title: 'Height', text: `${i.stories} stories, within ${s.code}'s ${maxStories} (${s.max_height_ft} ft).` } : { key: 'height', tone: 'no', title: 'Height', text: `${i.stories} stories is over ${s.code}'s ${maxStories} (${s.max_height_ft} ft).` });
  if (s.min_lot_sqft > 0) rows.push(i.lotSqft >= s.min_lot_sqft ? { key: 'lot', tone: 'yes', title: 'Lot size', text: `${n0(i.lotSqft)} sq ft meets the ${n0(s.min_lot_sqft)} sq ft minimum.` } : { key: 'lot', tone: 'no', title: 'Lot size', text: `${n0(i.lotSqft)} sq ft is under the ${n0(s.min_lot_sqft)} sq ft minimum.` });
  const envelope = !s.max_homes && by.floor_area != null ? by.floor_area : null;
  const fit = housing && i.units > 0 && i.lotSqft > 0 && !by.below_min ? lotFit(i, s, envelope) : null;
  if (fit) rows.push(fitRow(i, fit));
  else if (envelope != null && i.commercialSf > 0 && !housing)
    rows.push(i.commercialSf <= envelope ? { key: 'floor', tone: 'yes', title: 'Floor area', text: `About ${n0(i.commercialSf)} sq ft needed, within the ${n0(envelope)} sq ft envelope.` } : { key: 'floor', tone: 'no', title: 'Floor area', text: `About ${n0(i.commercialSf)} sq ft needed, over the ${n0(envelope)} sq ft envelope.` });
  const z = STANDARDS.inclusionary;
  if (housing && i.inIzo) {
    const set = inclusionaryHomes(i.units, true);
    rows.push({ key: 'izo', tone: 'info', title: 'Inclusionary overlay', text: set > 0 ? `Required: ${set} of the units at ${z.ami_rental}% AMI for ${z.years} years (${z.section}).` : `The lot is in the overlay; under ${z.min_homes} units nothing is set aside.` });
  }
  const park = STANDARDS.parking.rules.find((r) => r.use === 'Multi-unit');
  if (housing && i.units >= 4 && park?.min_per_home != null) rows.push({ key: 'parking', tone: 'info', title: 'Parking', text: `At least ${n0(i.units * park.min_per_home)} spaces (${STANDARDS.parking.section}); not costed here.` });
  if (i.floodPct != null && i.floodPct > 0) rows.push({ key: 'flood', tone: 'info', title: 'Floodplain', text: `${i.floodPct.toFixed(1)}% of the tract is in the 1%-a-year flood zone: if the lot is, build 18 in above the base flood elevation.` });
  const gate = rows.filter((r) => r.key === 'use' || r.key === 'density' || r.key === 'height' || r.key === 'lot' || r.key === 'floor').map((r) => r.tone);
  const verdict = gate.includes('no') ? 'no' : gate.includes('hearing') ? 'hearing' : 'yes';
  return { verdict, district: code, maxUnits: housing ? (by.below_min ? 0 : by.homes) : null, fit, rows };
}

export const VERDICT_WORD: Record<ZoningCheck['verdict'], string> = { yes: 'Allowed by right', hearing: 'Needs a hearing', no: 'Not allowed as is', unknown: 'Check the code' };

/** Most stories a district allows: its story limit and its height limit at the app's story height. */
export function storyLimit(s: DistrictStandard): number | null {
  const v = Math.min(s.max_stories ?? Infinity, s.max_height_ft ? Math.floor(s.max_height_ft / CAPACITY.assumptions.story_ft) : Infinity);
  return Number.isFinite(v) ? v : null;
}

/** The units and stories a picked lot suggests (Ye, 2026-10-28): the stories the district allows, no more than `most`
 *  (the example's), the units allowed by right capped by what fits at those stories and by `homes` (the example's),
 *  then the fewest stories, two at least, that still hold them. Null where the district is not computed or the lot is
 *  under its minimum. */
export function lotDefaults(a: { district: string | null; lotSqft: number; frontageFt: number | null; depthFt: number | null; avgUnitSf: number; efficiency: number; openShare?: number; homes: number; most: number }): { units: number; stories: number } | null {
  const s = a.district ? STANDARD_BY_CODE.get(a.district) : undefined;
  if (!s || !(a.lotSqft > 0)) return null;
  const by = homesByRight(s, a.lotSqft, a.frontageFt, a.depthFt);
  if (by.below_min || by.homes < 1) return null;
  const envelope = !s.max_homes && by.floor_area != null ? by.floor_area : null;
  const top = Math.max(1, Math.min(a.most, storyLimit(s) ?? a.most));
  const at = (units: number, stories: number) => lotFit({ ...a, units, stories, commercialSf: 0, devType: 'affordable' }, s, envelope);
  const units = Math.max(1, Math.min(a.homes, by.homes, at(1, top).units));
  for (let st = Math.min(2, top); st < top; st++) if (at(units, st).fits) return { units, stories: st };
  return { units, stories: top };
}
