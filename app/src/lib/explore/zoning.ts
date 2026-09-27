// The city zoning map (WPRDC districts dissolved by code, scripts/10_build_place_measures.py --tier2) as an Explore
// overlay: one categorical fill by district family, off by default. The file is inlined at build time like the other
// bundled data; a missing file leaves the layer empty. The by-right statuses are an UNVERIFIED reading of Title 9.
import { create } from 'zustand';
import type { MapPaint } from '../paint';

export type ZoningStatus = 'yes' | 'conditional' | 'no' | 'unknown';
export const ZONING_TYPES = ['adu', 'duplex_triplex', 'townhome', 'small_apartment', 'senior'] as const;
export type ZoningType = (typeof ZONING_TYPES)[number];

export interface ZoningProps extends Record<ZoningType, ZoningStatus> {
  code: string;
  family: string;
  family_label: string;
  zfam: string;
}
export interface ZoningFC {
  type: 'FeatureCollection';
  features: { type: 'Feature'; properties: ZoningProps & Record<string, unknown>; geometry: { type: string; coordinates: unknown } }[];
}

const raw = import.meta.glob('../../data/zoning_districts.json', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
function load(): ZoningFC {
  const text = raw['../../data/zoning_districts.json'];
  if (!text) return { type: 'FeatureCollection', features: [] };
  try {
    return JSON.parse(text) as ZoningFC;
  } catch (e) {
    console.warn('[zoning] could not parse zoning_districts.json', e);
    return { type: 'FeatureCollection', features: [] };
  }
}
export const zoningFC: ZoningFC = load();
export const hasZoning = zoningFC.features.length > 0;
export const zoningByCode = new Map(zoningFC.features.map((f) => [f.properties.code, f.properties]));

/** Display families, legend order: residential light → dark by density, then mixed/commercial reds, industry, parks, planned, hillside. */
export const ZONING_FAMILIES: { id: string; label: string; color: string }[] = [
  { id: 'res_single', label: 'Residential single-unit', color: '#fde68a' },
  { id: 'res_2_3', label: 'Residential 2–3 unit', color: '#fbbf24' },
  { id: 'res_multi', label: 'Residential multi-unit', color: '#e8730c' },
  { id: 'mixed', label: 'Neighborhood commercial / mixed use', color: '#ec6fa6' },
  { id: 'commercial', label: 'Commercial / downtown', color: '#c81e3a' },
  { id: 'industrial', label: 'Industrial', color: '#8f74b0' },
  { id: 'parks', label: 'Parks and open space', color: '#5fae5a' },
  { id: 'planned', label: 'Planned / institutional', color: '#8fa9c6' },
  { id: 'hillside', label: 'Hillside', color: '#a47148' },
];
const familyIndex = new Map(ZONING_FAMILIES.map((f, i) => [f.id, i]));

/** Feature-state paint: each district code → its family's class index. */
export const zoningPaint: MapPaint = {
  kind: 'cat',
  palette: ZONING_FAMILIES.map((f) => f.color),
  values: new Map(zoningFC.features.map((f) => [f.properties.code, familyIndex.get(f.properties.family) ?? null])),
};

/** Number of district codes in each family (shown in the legend). */
export const zoningCodesPerFamily: number[] = ZONING_FAMILIES.map((fam) => zoningFC.features.filter((f) => f.properties.family === fam.id).length);

const TYPE_SHORT: Record<ZoningType, string> = {
  adu: 'ADU',
  duplex_triplex: 'duplex/triplex',
  townhome: 'townhome',
  small_apartment: 'small apartment',
  senior: 'senior housing',
};

/** "duplex/triplex, small apartment" — the building types the (unverified) table reads as allowed by right. */
export function byRightList(p: Pick<ZoningProps, ZoningType>, status: ZoningStatus = 'yes'): string[] {
  return ZONING_TYPES.filter((t) => p[t] === status).map((t) => TYPE_SHORT[t]);
}

/** One-line tooltip text: "RM-M · Residential multi-unit · by right: duplex/triplex, …". */
export function zoningLine(p: ZoningProps): string {
  const yes = byRightList(p);
  return `${p.code} · ${p.family_label} · by right: ${yes.length ? yes.join(', ') : 'no housing types'}`;
}
export const ZONING_CAVEAT = 'unverified: confirm in Title 9';

/** On/off for the zoning overlay, kept out of the app store (not part of the link). */
export const useZoningLayer = create<{ on: boolean; set: (on: boolean) => void }>((set) => ({ on: false, set: (on) => set({ on }) }));
