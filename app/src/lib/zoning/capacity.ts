// What a lot allows by right under Pittsburgh's zoning (docs/data/zoning_capacity.md): the same rule as
// src/visionpitts/zoning_capacity.py, held to the same fixture (tests/fixtures/zoning_capacity_cases.json).
// R1D, R1A, R2 and R3 cap homes per lot; RM and the mixed-use districts are limited by their envelope.
import standardsFile from '../../data/lazy/zoning_standards.json';
import capacityFile from '../../data/lazy/zoning_capacity.json';

export type UseStatus = 'P' | 'P/S' | 'A' | 'S' | 'C' | 'N';
export type UseKey = 'single_detached' | 'single_attached' | 'two_unit' | 'three_unit' | 'multi_unit' | 'elderly_limited' | 'elderly_general';

export interface DistrictStandard {
  code: string;
  family: string;
  kind: 'residential' | 'mixed';
  section: string;
  min_lot_sqft: number;
  max_homes: number | null;
  front_ft: number;
  rear_ft: number;
  ext_side_ft: number;
  side_total_ft: number;
  max_height_ft: number | null;
  max_stories: number | null;
  max_far: number | null;
  max_coverage: number | null;
  uses: Record<UseKey, UseStatus>;
  verified: boolean;
  notes: string[];
  near_transit?: { max_far: number; max_height_ft: number; max_stories: number };
}

export interface Standards {
  code: string;
  url: string;
  current_through: string;
  read_on: string;
  sources: { section: string; url: string; note?: string }[];
  legend: Record<string, string>;
  use_labels: Record<UseKey, string>;
  density_note: string;
  contextual_note: string;
  adu: { rule: string; mapped: boolean; checked: string };
  parking: { section: string; rules: { use: string; min_per_home: number | null; max_per_home: number | null; note?: string }[]; reductions: string; reform: string };
  inclusionary: { section: string; min_homes: number; share: number; ami_rental: number; ami_owner: number; years: number; rule: string; areas_source: string; proposed: string };
  not_computed: Record<string, string>;
  districts: DistrictStandard[];
}

export interface TractCapacity {
  lots: number;
  vacant: { lots: number; acres: number; median_sqft: number | null; computed: number; below_min: number; homes: number; by_family: Record<string, number>; largest: { acres: number; homes: number; district: string } | null; homes_old?: number; below_min_old?: number };
  /** `homes_old`: under the minimum lot sizes before May 2025 (the Policy lab's before/after). `adu`, `up3`, `up4`: the Policy lab's
   *  house-lot ideas (an accessory unit beside a single home, or up to 3 or 4 homes a lot), today's gain included. */
  gentle: { lots: number; homes: number; homes_old?: number; adu?: number; up3?: number; up4?: number; adu_old?: number; up3_old?: number; up4_old?: number };
  districts: Record<string, number>;
  izo_share: number | null;
}

export interface CapacityFile {
  built: string;
  current_through: string;
  url: string;
  assumptions: { home_sqft: number; efficiency: number; story_ft: number };
  tracts: Record<string, TractCapacity>;
}

export const STANDARDS = standardsFile as unknown as Standards;
export const CAPACITY = capacityFile as unknown as CapacityFile;
export const STANDARD_BY_CODE = new Map(STANDARDS.districts.map((d) => [d.code, d]));
export const tractCapacity = (geoid: string): TractCapacity | null => CAPACITY.tracts[geoid] ?? null;

export const storiesOf = (s: DistrictStandard, storyFt = CAPACITY.assumptions.story_ft): number | null =>
  s.max_stories ?? (s.max_height_ft ? Math.floor(s.max_height_ft / storyFt) : null);

/** Rough floor area allowed: buildable footprint × stories, held to lot coverage and FAR where the district sets them. */
export function envelope(s: DistrictStandard, lotSqft: number, frontageFt: number, depthFt: number): number {
  const width = Math.max(0, frontageFt - (s.side_total_ft ?? 0));
  const deep = Math.max(0, depthFt - (s.front_ft ?? 0) - (s.rear_ft ?? 0));
  let footprint = width * deep;
  if (s.max_coverage) footprint = Math.min(footprint, s.max_coverage * lotSqft);
  let floorArea = footprint * (storiesOf(s) ?? 0);
  if (s.max_far) floorArea = Math.min(floorArea, s.max_far * lotSqft);
  return floorArea;
}

export interface ByRight {
  homes: number;
  below_min: boolean;
  computed: boolean;
  floor_area: number | null;
  /** The arithmetic in words. */
  formula: string;
}

const n0 = (v: number) => Math.round(v).toLocaleString('en-US');

export function homesByRight(s: DistrictStandard | null | undefined, lotSqft: number, frontageFt?: number | null, depthFt?: number | null, a = CAPACITY.assumptions): ByRight {
  if (!s || !(lotSqft > 0)) return { homes: 0, below_min: false, computed: false, floor_area: null, formula: '' };
  if (lotSqft < (s.min_lot_sqft ?? 0)) return { homes: 0, below_min: true, computed: true, floor_area: null, formula: `${n0(lotSqft)} sq ft is under the ${n0(s.min_lot_sqft)} sq ft minimum lot` };
  if (s.max_homes) return { homes: s.max_homes, below_min: false, computed: true, floor_area: null, formula: `${s.family} allows ${s.max_homes} home${s.max_homes === 1 ? '' : 's'} on a lot of at least ${n0(s.min_lot_sqft)} sq ft` };
  const side = Math.sqrt(lotSqft);
  const f = frontageFt ?? side;
  const d = depthFt ?? side;
  const fa = envelope(s, lotSqft, f, d);
  const homes = Math.floor((fa * a.efficiency) / a.home_sqft);
  const width = Math.max(0, f - s.side_total_ft);
  const deep = Math.max(0, d - s.front_ft - s.rear_ft);
  const parts = [`(${n0(f)} − ${n0(s.side_total_ft)}) × (${n0(d)} − ${n0(s.front_ft)} − ${n0(s.rear_ft)}) = ${n0(width * deep)} sq ft`];
  if (s.max_coverage) parts.push(`held to ${Math.round(s.max_coverage * 100)}% coverage`);
  parts.push(`× ${storiesOf(s)} stories`);
  if (s.max_far) parts.push(`held to FAR ${s.max_far}:1 (${n0(s.max_far * lotSqft)} sq ft)`);
  return { homes, below_min: false, computed: true, floor_area: Math.round(fa), formula: `${parts.join(', ')} = ${n0(fa)} sq ft; × ${Math.round(a.efficiency * 100)}% ÷ ${n0(a.home_sqft)} sq ft = ${homes} homes` };
}

/** Inclusionary homes the IZ-O asks of a project of `homes` (none under the minimum), rounded up. */
export function inclusionaryHomes(homes: number, inOverlay: boolean): number {
  const z = STANDARDS.inclusionary;
  return inOverlay && homes >= z.min_homes ? Math.ceil(homes * z.share) : 0;
}

const FAMILY_NAME: Record<string, string> = {
  R1D: 'Single-unit detached',
  R1A: 'Single-unit attached',
  R2: 'Two-unit',
  R3: 'Three-unit',
  RM: 'Multi-unit',
  NDO: 'Neighborhood office',
  LNC: 'Local neighborhood commercial',
  NDI: 'Neighborhood industrial',
  UNC: 'Urban neighborhood commercial',
};
const DENSITY_NAME: Record<string, string> = { VL: 'very low density', L: 'low density', M: 'moderate density', H: 'high density', VH: 'very high density' };

/** A district's name in words, from its code (Title Nine's district names and density subdistricts). */
export function districtName(code: string): string {
  const [family, density] = code.split('-');
  const name = FAMILY_NAME[family] ?? code;
  return density && DENSITY_NAME[density] ? `${name}, ${DENSITY_NAME[density]}` : name;
}

export type LotNeed = { kind: 'fits'; lotSqft: number } | { kind: 'cap'; max: number } | { kind: 'none' };

/**
 * The smallest lot (square unless a frontage is given, rounded up to 100 sq ft) that holds `homes` by right in a
 * district: the minimum lot where homes per lot are capped, else the envelope searched by halving.
 */
export function lotFor(s: DistrictStandard, homes: number, frontageFt: number | null = null, a = CAPACITY.assumptions): LotNeed {
  if (!(homes > 0)) return { kind: 'none' };
  if (s.max_homes) return homes <= s.max_homes ? { kind: 'fits', lotSqft: Math.max(100, Math.ceil((s.min_lot_sqft || 100) / 100) * 100) } : { kind: 'cap', max: s.max_homes };
  const holds = (lot: number) => homesByRight(s, lot, frontageFt, frontageFt ? lot / frontageFt : null, a).homes >= homes;
  let hi = Math.max(1000, s.min_lot_sqft || 0);
  while (!holds(hi)) {
    hi *= 2;
    if (hi > 50_000_000) return { kind: 'none' };
  }
  let lo = 0;
  while (hi - lo > 100) {
    const mid = Math.floor((lo + hi) / 2);
    if (holds(mid)) hi = mid;
    else lo = mid;
  }
  return { kind: 'fits', lotSqft: Math.ceil(hi / 100) * 100 };
}
