// Sun for open space (docs/data/shadow.md): the tract figures from scripts/20_build_sun_tract.py, and the project's fit
// check (does the building plus its open space fit on the lot). Loaded on demand.
import sunFile from '../../data/lazy/sun_tract.json';
import type { Counts } from '../project/store';
import { MIX_LEVELS } from '../project/store';

export interface SunGroup {
  lots: number;
  acres: number;
  sun_h: { jun: number; sep: number; dec: number };
  bre: number;
  bre_acres: number;
  winter2: number;
  ceqr6: number;
  ceqr4: number;
}
interface SunFile {
  built: string;
  yardstick: { bre_hours: number; rule: string; ceqr_lawn: number; ceqr_planted: number };
  city: { vacant?: SunGroup; park?: SunGroup };
  tracts: Record<string, { vacant?: SunGroup; park?: SunGroup }>;
}

export const SUN = sunFile as unknown as SunFile;
export const sunFor = (geoid: string) => SUN.tracts[geoid] ?? null;

export type OpenType = 'private' | 'shared' | 'public';
export const OPEN_TYPE_LABEL: Record<OpenType, string> = { private: 'Private yards', shared: 'Shared courtyard', public: 'Publicly accessible' };
export const DEFAULT_OPEN_SHARE = 0.15;

export interface OpenFit {
  /** Gross floor area a home: the mix's net sq ft ÷ the net-to-gross efficiency. */
  grossPerHome: number;
  footprint: number;
  open: number;
  /** Most the building may cover: the lot less the open space, and the district's coverage limit if it has one. */
  room: number;
  fits: boolean;
  /** Homes that fit at these stories when it does not. */
  homesThatFit: number;
  formula: string;
}

/** Does the building, at the mix and stories, leave the open space on the lot? */
export function openFit(counts: Counts, homes: number, stories: number, unitSf: number[], efficiency: number, lotSqft: number, openShare: number, maxCoverage: number | null): OpenFit {
  const bySize = [0, 1, 2, 3].map((b) => MIX_LEVELS.reduce((s, l) => s + counts[l][b], 0));
  const n = bySize.reduce((a, b) => a + b, 0);
  const net = n > 0 ? bySize.reduce((s, k, b) => s + k * unitSf[b], 0) / n : unitSf[2];
  const grossPerHome = net / efficiency;
  const st = Math.max(1, stories);
  const footprint = (homes * grossPerHome) / st;
  const open = lotSqft * openShare;
  const room = Math.min(lotSqft - open, maxCoverage != null ? lotSqft * maxCoverage : Infinity);
  const fits = footprint <= room;
  const homesThatFit = Math.max(0, Math.floor((room * st) / grossPerHome));
  const r = (x: number) => Math.round(x).toLocaleString('en-US');
  const formula = `${homes} homes × ${r(grossPerHome)} gross sq ft ÷ ${st} stories = ${r(footprint)} sq ft of footprint; room on the lot: ${r(lotSqft)} − ${r(open)} open space${maxCoverage != null ? `, at most ${Math.round(maxCoverage * 100)}% coverage` : ''} = ${r(room)} sq ft`;
  return { grossPerHome, footprint, open, room, fits, homesThatFit, formula };
}
