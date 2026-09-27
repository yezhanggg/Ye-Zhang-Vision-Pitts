// The by-right table the pipeline uses (config/zoning_rules.json, UNVERIFIED reading of Title 9), for the two building
// types the policy simulator changes, and the same aggregation the pipeline runs (place_measures.zoning_by_type):
// "yes" when at least 5% of the tract's land lies in families where the type is by right, else "conditional" at 5% in
// conditional families, else "unknown", else "no". A test checks this copy against the config and against place.json.
import type { PlaceMeasures, ZoningStatus } from '../place/types';

export type SimType = 'adu' | 'small_apartment';

/** District family → by-right status for ADUs and small apartments (copied from config/zoning_rules.json). */
export const FAMILY_RULES: Record<string, Record<SimType, ZoningStatus>> = {
  R1D: { adu: 'conditional', small_apartment: 'no' },
  R1A: { adu: 'conditional', small_apartment: 'no' },
  R2: { adu: 'conditional', small_apartment: 'no' },
  R3: { adu: 'conditional', small_apartment: 'conditional' },
  RM: { adu: 'conditional', small_apartment: 'yes' },
  H: { adu: 'unknown', small_apartment: 'no' },
  LNC: { adu: 'unknown', small_apartment: 'yes' },
  NDO: { adu: 'unknown', small_apartment: 'conditional' },
  UNC: { adu: 'unknown', small_apartment: 'yes' },
  HC: { adu: 'no', small_apartment: 'conditional' },
  UI: { adu: 'no', small_apartment: 'yes' },
  NDI: { adu: 'no', small_apartment: 'conditional' },
  GI: { adu: 'no', small_apartment: 'no' },
  RIV: { adu: 'no', small_apartment: 'yes' },
  GT: { adu: 'no', small_apartment: 'yes' },
  P: { adu: 'no', small_apartment: 'no' },
  PLANNED: { adu: 'unknown', small_apartment: 'unknown' },
};

/** The residential district families (single-unit detached and attached, two-unit, three-unit, multi-unit). */
export const RESIDENTIAL_FAMILIES = ['R1D', 'R1A', 'R2', 'R3', 'RM'] as const;

/** Families where small apartments are conditional use today. */
export const SMALL_APT_CONDITIONAL_FAMILIES = Object.entries(FAMILY_RULES)
  .filter(([, r]) => r.small_apartment === 'conditional')
  .map(([k]) => k);

export const BY_RIGHT_SHARE = 0.05;

/** Shares as fractions (the file stores fractions; a file on 0–100 is scaled down). */
function fractions(shares: Record<string, number>): [string, number][] {
  const rows = Object.entries(shares ?? {}).filter((e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1]));
  const scale = rows.length && Math.max(...rows.map(([, v]) => v)) > 1 ? 100 : 1;
  return rows.map(([k, v]) => [k, v / scale]);
}

/** The by-right status for a type from the land shares, with some families overridden (the policy change). */
export function statusFromShares(shares: Record<string, number>, t: SimType, override: Partial<Record<string, ZoningStatus>> = {}): ZoningStatus {
  const tally: Record<ZoningStatus, number> = {
    yes: 0,
    conditional: 0,
    no: 0,
    unknown: 0,
  };
  for (const [fam, share] of fractions(shares)) {
    const status = override[fam] ?? FAMILY_RULES[fam]?.[t] ?? 'unknown';
    tally[status] += share;
  }
  if (tally.yes >= BY_RIGHT_SHARE) return 'yes';
  if (tally.conditional >= BY_RIGHT_SHARE) return 'conditional';
  if (tally.unknown >= BY_RIGHT_SHARE) return 'unknown';
  return 'no';
}

/** Share of the tract's land (0–1) in the given families. */
export function landShareIn(p: PlaceMeasures | null | undefined, families: readonly string[]): number {
  if (!p?.zoning?.shares) return 0;
  return fractions(p.zoning.shares)
    .filter(([k]) => families.includes(k))
    .reduce((s, [, v]) => s + v, 0);
}
