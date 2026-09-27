// Analysis > Place at ZIP level. Suggestions are made per census tract; a ZIP shows its profile (from
// equity_zip.json, scripts/12: tract aggregates weighted by 2020 housing units, edge ZIPs cover only their city part)
// and the city tracts whose main ZIP it is (the ZIP holding most of the tract's 2020 homes, `m` in the file).
// Reads lib/equity/zip (the parsed ZIP records) without changing it. Session state only (never the URL).
import { create } from 'zustand';
import { zipById, zipRanked } from '../equity/zip';
import { isNum } from './format';
import { amiOf, type PlanLevel } from './plan';

export type PlaceArea = 'tract' | 'zip';

interface ZipViewState {
  area: PlaceArea;
  zip: string | null;
  set: (p: Partial<Pick<ZipViewState, 'area' | 'zip'>>) => void;
}

export const useZipView = create<ZipViewState>((set) => ({ area: 'tract', zip: null, set: (p) => set(p) }));

export const ZIP_SUGGEST_NOTE = 'Suggestions are made for census tracts; a ZIP shows the tracts inside it.';

/** The extra fields scripts/12 writes for the Place view: m (positions in t of the tracts whose main ZIP this is), r (renters at 30/50/80/100). */
interface ZipExtra {
  main: string[];
  renters: Record<string, number | null>;
}

const raw = import.meta.glob('../../data/equity_zip.json', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

export function parseZipExtra(text: string | undefined): Map<string, ZipExtra> {
  const out = new Map<string, ZipExtra>();
  if (!text) return out;
  try {
    const d = JSON.parse(text) as { z?: Record<string, { t?: number[]; m?: number[]; r?: (number | null)[] }> };
    for (const [z, r] of Object.entries(d.z ?? {})) {
      const t = (r.t ?? []).map((x) => `42003${String(x).padStart(6, '0')}`);
      const rn = r.r ?? [];
      const n = (v: unknown) => (isNum(v) ? v : null);
      out.set(z, { main: (r.m ?? []).map((i) => t[i]).filter(Boolean), renters: { '30': n(rn[0]), '50': n(rn[1]), '80': n(rn[2]), '100': n(rn[3]) } });
    }
  } catch (e) {
    console.warn('[place] could not parse equity_zip.json', e);
  }
  return out;
}

export const zipExtra: Map<string, ZipExtra> = parseZipExtra(raw['../../data/equity_zip.json']);
/** Tract → its main ZIP (most of its 2020 homes). */
export const mainZipOf: Map<string, string> = new Map([...zipExtra].flatMap(([z, e]) => e.main.map((t) => [t, z] as [string, string])));
/** ZIPs with city tracts to list. */
export const placeZips: string[] = [...zipById.entries()].filter(([z, r]) => zipRanked(r) && (zipExtra.get(z)?.main.length ?? 0) > 0).map(([z]) => z);
export const hasPlaceZips = placeZips.length > 0;

/** The equity_zip key for a plan level: market rate reads the renters above 80% AMI ("100"). */
export const zipLevelKey = (level: PlanLevel): string => (level === 'market' ? '100' : String(amiOf(level)));

/** City tracts whose main ZIP is `zip`, and the others that have some homes in it. */
export function zipTracts(zip: string): { main: string[]; partly: string[] } {
  const main = zipExtra.get(zip)?.main ?? [];
  const all = zipById.get(zip)?.tracts ?? [];
  return { main, partly: all.filter((t) => !main.includes(t)) };
}
