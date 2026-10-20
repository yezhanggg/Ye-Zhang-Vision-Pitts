// Unit mix from who rents here (docs/assumptions.md §15). Renter households by size map to home sizes with the rule
// the answer card already uses (lib/place/plan SIZE_RULE: 1–2 people → 1-bedroom, 3–4 → 2-bedroom, 5 or more →
// 3-bedroom), so the mix and the card never disagree. Studios are left to the person planning: the census does not
// split one-person households by the size of home they want.
import { fmtCount, fmtShare, isNum } from '../place/format';
import { belowCut, type BelowCut } from './interp';
import type { DemandUnit, EM, RentGroup } from './types';

/** Home-size groups of the mix: 1-bedroom or smaller, 2-bedroom, 3 or more bedrooms. */
export type SizeGroup = 'small' | 'two' | 'large';
export const SIZE_GROUPS: SizeGroup[] = ['small', 'two', 'large'];
export const SIZE_GROUP_LABEL: Record<SizeGroup, string> = { small: 'Studio or 1-bedroom', two: '2-bedroom', large: '3 or more bedrooms' };
export const SIZE_GROUP_HOUSEHOLDS: Record<SizeGroup, string> = { small: '1–2 people', two: '3–4 people', large: '5 or more people' };
export const SIZE_GROUP_SHORT: Record<SizeGroup, string> = { small: '0–1 BR', two: '2 BR', large: '3+ BR' };
/** Which B25009 sizes (index 0 = one person) and B25042 bedroom counts (index 0 = no bedroom) belong to each group. */
const SIZE_IDX: Record<SizeGroup, number[]> = { small: [0, 1], two: [2, 3], large: [4, 5, 6] };
const BR_IDX: Record<SizeGroup, number[]> = { small: [0, 1], two: [2], large: [3, 4, 5] };

export interface GroupCount {
  group: SizeGroup;
  value: number | null;
  moe: number | null;
}

function sumEm(parts: EM[], idx: number[]): { value: number | null; moe: number | null } {
  const xs = idx.map((i) => parts[i]);
  if (xs.some((x) => !x || !isNum(x[0]))) return { value: null, moe: null };
  const value = xs.reduce((s, x) => s + (x[0] as number), 0);
  const moe = xs.every((x) => isNum(x[1])) ? Math.sqrt(xs.reduce((s, x) => s + (x[1] as number) ** 2, 0)) : null;
  return { value, moe };
}

/** Renter households in each home-size group (B25009). */
export const householdsByGroup = (u: DemandUnit): GroupCount[] => SIZE_GROUPS.map((g) => ({ group: g, ...sumEm(u.size, SIZE_IDX[g]) }));
/** Renter homes in each home-size group (B25042). */
export const homesByGroup = (u: DemandUnit): GroupCount[] => SIZE_GROUPS.map((g) => ({ group: g, ...sumEm(u.br, BR_IDX[g]) }));

/** Shares of renter households by group; null when any part is missing or there are no renters. */
export function groupShares(counts: GroupCount[]): Record<SizeGroup, number> | null {
  if (counts.some((c) => !isNum(c.value))) return null;
  const total = counts.reduce((s, c) => s + (c.value as number), 0);
  if (total <= 0) return null;
  return Object.fromEntries(counts.map((c) => [c.group, (c.value as number) / total])) as Record<SizeGroup, number>;
}

export interface MixLine {
  group: SizeGroup;
  homes: number;
  /** "52% × 40 = 20.8" */
  formula: string;
}

/**
 * `n` homes split by the shares, by largest remainder: everyone gets the whole part of n × share, and the homes left
 * over go to the largest fractions (ties in group order: small, two, large). Always sums to n.
 */
export function recommendedMix(n: number, shares: Record<SizeGroup, number>): MixLine[] {
  const total = Math.max(0, Math.round(n));
  const raw = SIZE_GROUPS.map((g, i) => ({ g, i, x: total * shares[g] }));
  const lines = raw.map((r) => ({ ...r, homes: Math.floor(r.x) }));
  let left = total - lines.reduce((s, l) => s + l.homes, 0);
  for (const l of [...lines].sort((a, b) => b.x - Math.floor(b.x) - (a.x - Math.floor(a.x)) || a.i - b.i)) {
    if (left <= 0) break;
    l.homes += 1;
    left -= 1;
  }
  return lines.map((l) => ({ group: l.g, homes: l.homes, formula: `${fmtShare(shares[l.g])} × ${total} = ${l.x.toFixed(1)}` }));
}

export interface GroupCompare {
  group: SizeGroup;
  households: GroupCount;
  homes: GroupCount;
  /** households − homes when the gap is wider than the two margins combined; else null (cannot tell). */
  gap: number | null;
  sentence: string;
}

/**
 * Households of a size against homes of the matching size. Both describe the same occupied homes, so a gap says how
 * today's renters are housed (smaller households in larger homes, or the reverse), not that homes are missing.
 */
export function compareGroups(u: DemandUnit): GroupCompare[] {
  const hh = householdsByGroup(u);
  const homes = homesByGroup(u);
  return SIZE_GROUPS.map((g, i) => {
    const a = hh[i];
    const b = homes[i];
    if (!isNum(a.value) || !isNum(b.value)) return { group: g, households: a, homes: b, gap: null, sentence: 'not available' };
    const d = a.value - b.value;
    const m = isNum(a.moe) && isNum(b.moe) ? Math.sqrt(a.moe ** 2 + b.moe ** 2) : null;
    const clear = m != null && Math.abs(d) > m;
    const sentence = clear
      ? `${fmtCount(a.value)} − ${fmtCount(b.value)} = ${fmtCount(Math.abs(d))} more ${d > 0 ? 'households of ' + SIZE_GROUP_HOUSEHOLDS[g] + ' than homes of this size' : 'homes of this size than households of ' + SIZE_GROUP_HOUSEHOLDS[g]}`
      : 'within the margins of error';
    return { group: g, households: a, homes: b, gap: clear ? d : null, sentence };
  });
}

const RENT_GROUP_OF: Record<0 | 1 | 2 | 3, RentGroup> = { 0: '0', 1: '1', 2: '2', 3: '3' };

export interface BelowRent extends BelowCut {
  /** Renter homes of that size paying cash rent, and those paying none. */
  withRent: number | null;
  noCash: number | null;
}

/** Renter homes of a size whose gross rent is below `rent` (B25068 brackets, straight line inside the bracket). */
export function belowRent(u: DemandUnit, bedrooms: 0 | 1 | 2 | 3, rent: number, edges: (number | null)[]): BelowRent {
  const g = RENT_GROUP_OF[bedrooms];
  const counts = u.rent_br[g].map((x) => x[0]);
  const cut = belowCut(counts, edges, rent);
  const withRent = counts.every(isNum) ? (counts as number[]).reduce((s, c) => s + c, 0) : null;
  const noCash = u.rent_nocash[Number(g)]?.[0] ?? null;
  return { ...cut, withRent, noCash };
}

export interface Capture {
  rate: number | null;
  formula: string;
}

/**
 * Proposed affordable homes as a share of the renter households who qualify, after the tax credit homes already there
 * (each of those already houses a qualifying household). Null when nothing is left to capture.
 */
export function captureRate(proposed: number, qualified: number | null, existing: number | null): Capture {
  if (!isNum(qualified) || proposed <= 0) return { rate: null, formula: '' };
  const pool = qualified - (existing ?? 0);
  if (pool <= 0) return { rate: null, formula: `${fmtCount(qualified)} − ${fmtCount(existing ?? 0)} = ${fmtCount(pool)}: no qualifying households left over` };
  const rate = proposed / pool;
  const poolText = isNum(existing) && existing > 0 ? `(${fmtCount(qualified)} − ${fmtCount(existing)} tax credit homes)` : fmtCount(qualified);
  return { rate, formula: `${fmtCount(proposed)} ÷ ${poolText} = ${fmtShare(rate)}` };
}
