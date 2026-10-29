// The project a person is testing on the Place page: its unit mix (homes by income level and size), its building, and
// the pencil's inputs. The number of homes is the planning input "Homes needed" (lib/place/planStore). Saved in this
// browser only, never in the URL. The mix follows the place ("suggested") until the person edits it ("mine").
import { create } from 'zustand';
import type { PlanLevel } from '../place/plan';

export type MixLevel = '30' | '50' | '60' | '80' | 'mkt';
export const MIX_LEVELS: MixLevel[] = ['30', '50', '60', '80', 'mkt'];
export const MIX_LEVEL_LABEL: Record<MixLevel, string> = { '30': '30% AMI', '50': '50% AMI', '60': '60% AMI', '80': '80% AMI', mkt: 'Market' };
/** Homes with 0 (studio), 1, 2 and 3 or more bedrooms. */
export type Row = [number, number, number, number];
export type Counts = Record<MixLevel, Row>;
export const BEDROOM_LABEL = ['Studio', '1BR', '2BR', '3BR+'] as const;

export interface Site {
  district?: string;
  lotSqft?: number | null;
  frontageFt?: number | null;
  /** What the map reads at the search or dropped pin (lib/zoning/atPin, Place online): the district under it, whether it
   *  has standards here, and whether the pin is in the IZ-O. Cleared when the pin goes. */
  pin?: { code: string | null; computed: boolean; near: boolean; why: string | null; izo: boolean | null };
  /** The county lot picked at the Parcel level (lib/parcel/lots): where it is on the map, what it is and its facts.
   *  Picking it fills `district`, `lotSqft` and `frontageFt`, which stay editable. */
  lot?: SiteLot;
}

export interface SiteLot {
  /** The By parcel chunk and row it is drawn from (the map outlines it). */
  chunk: string;
  row: number;
  /** The county's lot and block label, e.g. "29-S-32". */
  label: string;
  /** Assessed use class: residential, commercial, industrial, vacant, institutional, other or unrecorded. */
  use: string;
  /** Where the pin sits on it. */
  point: [number, number];
  /** Lot area: the assessment's LOTAREA when the lot facts have it, else the shape's own area. */
  sqft: number;
  district: string | null;
  frontageFt: number | null;
  depthFt: number | null;
  /** Homes on the lot today, from the assessed use; null when the use does not say. */
  existing: number | null;
  /** Percent of each day (June 21, September 22, December 21) in shadow; null where the lot is not rated. */
  shade: (number | null)[];
}

export interface ProjectState {
  mode: 'suggested' | 'mine';
  counts: Counts;
  /** Stories of the building (B.4 and 4.3.4.a do not apply at 7 or more). */
  stories: number | null;
  sites: Record<string, Site>;
  /** Pencil inputs the person changed, by key (lib/pencil); the rest come from the defaults file. */
  pencil: Record<string, number | string | boolean | null>;
  /** Open space as a share of the lot (lib/policy/sun), and who uses it. */
  openShare: number;
  openType: 'private' | 'shared' | 'public';
  /** The kind of development at the Parcel level (lib/project/devType); unset: read from the planning inputs. */
  devType?: 'market' | 'affordable' | 'senior' | 'mixed' | 'commercial';
  /** Commercial floor area, sq ft (mixed use: the ground floor; commercial: the building). Zoning check only. */
  commercialSf?: number | null;
  /** The Parcel level's Capital inputs the person changed, by key (lib/project/capital); the rest are suggested. */
  capital?: Record<string, number>;
  /** The units and stories the last lot picked suggested (lib/project/draft suggestForLot), each null where the person's
   *  own value was kept; `lot` names the lot (chunk:row). */
  suggested?: { lot: string; units: number | null; stories: number | null };
}

export const EMPTY_ROW: Row = [0, 0, 0, 0];
export const emptyCounts = (): Counts => ({ '30': [...EMPTY_ROW], '50': [...EMPTY_ROW], '60': [...EMPTY_ROW], '80': [...EMPTY_ROW], mkt: [...EMPTY_ROW] });
/** Homes when "Homes needed" is empty: an example, labeled as one on the card. */
export const EXAMPLE_HOMES = 40;

export const DEFAULT_PROJECT: ProjectState = { mode: 'suggested', counts: emptyCounts(), stories: 4, sites: {}, pencil: {}, openShare: 0.15, openType: 'shared' };

/** The planning level as the mix level its homes go in. */
export const levelOf = (level: PlanLevel): MixLevel => (level === 'market' ? 'mkt' : (String(level) as MixLevel));

export const total = (c: Counts): number => MIX_LEVELS.reduce((s, l) => s + c[l].reduce((a, b) => a + b, 0), 0);

/** Homes in the suggested mix: all at the planning level, split by size (1-bedroom or smaller, 2, 3+; no studios). */
export function suggestedCounts(level: MixLevel, small: number, two: number, large: number): Counts {
  const c = emptyCounts();
  c[level] = [0, small, two, large];
  return c;
}

const KEY = 'visionpitts.project.v1';

function validCounts(c: unknown): c is Counts {
  return !!c && typeof c === 'object' && MIX_LEVELS.every((l) => {
    const r = (c as Record<string, unknown>)[l];
    return Array.isArray(r) && r.length === 4 && r.every((x) => typeof x === 'number' && Number.isFinite(x) && x >= 0);
  });
}

export function parseProject(raw: string | null): ProjectState {
  try {
    const s = raw ? (JSON.parse(raw) as Partial<ProjectState>) : null;
    if (!s || typeof s !== 'object') return DEFAULT_PROJECT;
    return {
      mode: s.mode === 'mine' ? 'mine' : 'suggested',
      counts: validCounts(s.counts) ? s.counts : emptyCounts(),
      stories: typeof s.stories === 'number' && Number.isFinite(s.stories) && s.stories > 0 ? s.stories : DEFAULT_PROJECT.stories,
      sites: s.sites && typeof s.sites === 'object' ? s.sites : {},
      pencil: s.pencil && typeof s.pencil === 'object' ? s.pencil : {},
      openShare: typeof s.openShare === 'number' && s.openShare >= 0 && s.openShare < 1 ? s.openShare : DEFAULT_PROJECT.openShare,
      openType: s.openType === 'private' || s.openType === 'public' ? s.openType : 'shared',
      ...(['market', 'affordable', 'senior', 'mixed', 'commercial'].includes(s.devType as string) ? { devType: s.devType } : {}),
      ...(typeof s.commercialSf === 'number' && Number.isFinite(s.commercialSf) && s.commercialSf >= 0 ? { commercialSf: s.commercialSf } : {}),
      ...(s.capital && typeof s.capital === 'object' ? { capital: Object.fromEntries(Object.entries(s.capital).filter(([, v]) => typeof v === 'number' && Number.isFinite(v))) } : {}),
      ...(s.suggested && typeof s.suggested === 'object' && typeof s.suggested.lot === 'string' ? { suggested: { lot: s.suggested.lot, units: typeof s.suggested.units === 'number' ? s.suggested.units : null, stories: typeof s.suggested.stories === 'number' ? s.suggested.stories : null } } : {}),
    };
  } catch {
    return DEFAULT_PROJECT;
  }
}

function load(): ProjectState {
  try {
    return parseProject(typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY));
  } catch {
    return DEFAULT_PROJECT;
  }
}

export const useProject = create<ProjectState>(() => load());

useProject.subscribe((s) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private window or full storage: the project lasts for the session */
  }
});
