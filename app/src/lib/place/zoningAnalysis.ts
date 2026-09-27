// Zoning analysis for the Place card: what the land in a tract is zoned for, in plain groups, and on how much of it
// each housing type is allowed by right or needs a hearing. The district-family table is a copy of
// config/zoning_rules.json (an UNVERIFIED reading of Title 9; a test keeps the copy in step with the config).
import type { Typology, ZoningStatus } from './types';

export interface FamilyRule {
  label: string;
  group: GroupId;
  by: Record<Typology, ZoningStatus>;
}
export type GroupId = 'res' | 'mixed' | 'ind' | 'parks' | 'hill' | 'planned';

export const FAMILY_RULES: Record<string, FamilyRule> = {
  R1D: { label: "Single-unit detached residential", group: 'res', by: { adu: 'conditional', duplex_triplex: 'no', townhome: 'no', small_apartment: 'no', senior: 'conditional' } },
  R1A: { label: "Single-unit attached residential", group: 'res', by: { adu: 'conditional', duplex_triplex: 'no', townhome: 'yes', small_apartment: 'no', senior: 'conditional' } },
  R2: { label: "Two-unit residential", group: 'res', by: { adu: 'conditional', duplex_triplex: 'yes', townhome: 'yes', small_apartment: 'no', senior: 'conditional' } },
  R3: { label: "Three-unit residential", group: 'res', by: { adu: 'conditional', duplex_triplex: 'yes', townhome: 'yes', small_apartment: 'conditional', senior: 'conditional' } },
  RM: { label: "Multi-unit residential", group: 'res', by: { adu: 'conditional', duplex_triplex: 'yes', townhome: 'yes', small_apartment: 'yes', senior: 'yes' } },
  H: { label: "Hillside", group: 'hill', by: { adu: 'unknown', duplex_triplex: 'conditional', townhome: 'conditional', small_apartment: 'no', senior: 'unknown' } },
  LNC: { label: "Local neighborhood commercial", group: 'mixed', by: { adu: 'unknown', duplex_triplex: 'yes', townhome: 'yes', small_apartment: 'yes', senior: 'yes' } },
  NDO: { label: "Neighborhood office", group: 'mixed', by: { adu: 'unknown', duplex_triplex: 'yes', townhome: 'yes', small_apartment: 'conditional', senior: 'conditional' } },
  UNC: { label: "Urban neighborhood commercial", group: 'mixed', by: { adu: 'unknown', duplex_triplex: 'yes', townhome: 'yes', small_apartment: 'yes', senior: 'yes' } },
  HC: { label: "Highway commercial", group: 'mixed', by: { adu: 'no', duplex_triplex: 'no', townhome: 'no', small_apartment: 'conditional', senior: 'conditional' } },
  UI: { label: "Urban industrial", group: 'ind', by: { adu: 'no', duplex_triplex: 'conditional', townhome: 'conditional', small_apartment: 'yes', senior: 'conditional' } },
  NDI: { label: "Neighborhood industrial", group: 'ind', by: { adu: 'no', duplex_triplex: 'no', townhome: 'no', small_apartment: 'conditional', senior: 'conditional' } },
  GI: { label: "General industrial", group: 'ind', by: { adu: 'no', duplex_triplex: 'no', townhome: 'no', small_apartment: 'no', senior: 'no' } },
  RIV: { label: "Riverfront mixed", group: 'mixed', by: { adu: 'no', duplex_triplex: 'conditional', townhome: 'yes', small_apartment: 'yes', senior: 'yes' } },
  GT: { label: "Golden Triangle and Urban Center", group: 'mixed', by: { adu: 'no', duplex_triplex: 'no', townhome: 'conditional', small_apartment: 'yes', senior: 'yes' } },
  P: { label: "Parks and open space", group: 'parks', by: { adu: 'no', duplex_triplex: 'no', townhome: 'no', small_apartment: 'no', senior: 'no' } },
  PLANNED: { label: "Planned, institutional and special", group: 'planned', by: { adu: 'unknown', duplex_triplex: 'unknown', townhome: 'unknown', small_apartment: 'unknown', senior: 'unknown' } },
};

export const GROUPS: { id: GroupId; label: string; color: string }[] = [
  { id: 'res', label: 'Residential', color: '#f2b544' },
  { id: 'mixed', label: 'Mixed use / commercial', color: '#e2688f' },
  { id: 'ind', label: 'Industrial', color: '#8f74b0' },
  { id: 'parks', label: 'Parks', color: '#5fae5a' },
  { id: 'hill', label: 'Hillside', color: '#a47148' },
  { id: 'planned', label: 'Planned / institutional', color: '#8fa9c6' },
];

/** District-family land shares as fractions (the file stores fractions; a 0–100 file is scaled down). */
export function fractions(shares: Record<string, number> | null | undefined): [string, number][] {
  const rows = Object.entries(shares ?? {}).filter((e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1]) && e[1] > 0);
  const scale = rows.length && Math.max(...rows.map(([, v]) => v)) > 1 ? 100 : 1;
  return rows.map(([k, v]) => [k, v / scale]);
}

/** Land by plain group, largest first (families not in the table count as planned / institutional). */
export function landByGroup(shares: Record<string, number> | null | undefined): { id: GroupId; label: string; color: string; share: number }[] {
  const sum = new Map<GroupId, number>();
  for (const [fam, v] of fractions(shares)) {
    const g = FAMILY_RULES[fam]?.group ?? 'planned';
    sum.set(g, (sum.get(g) ?? 0) + v);
  }
  return GROUPS.map((g) => ({ ...g, share: sum.get(g.id) ?? 0 })).filter((g) => g.share > 0).sort((a, b) => b.share - a.share);
}

/** Share of the tract's zoned land where a type is by right, needs a hearing (conditional use), is not allowed, or has no rule. */
export function landForType(shares: Record<string, number> | null | undefined, t: Typology): Record<ZoningStatus, number> {
  const out: Record<ZoningStatus, number> = { yes: 0, conditional: 0, no: 0, unknown: 0 };
  for (const [fam, v] of fractions(shares)) out[FAMILY_RULES[fam]?.by[t] ?? 'unknown'] += v;
  return out;
}

/** Share of land in districts that allow three or more homes on a lot (R3, RM and the mixed-use districts). */
export function multiUnitLand(shares: Record<string, number> | null | undefined): number {
  return fractions(shares).reduce((s, [fam, v]) => s + (['R3', 'RM', 'LNC', 'UNC', 'NDO', 'RIV', 'GT'].includes(fam) ? v : 0), 0);
}
