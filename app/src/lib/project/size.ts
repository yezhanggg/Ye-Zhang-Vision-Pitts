// The size sweep (docs/data/finder.md): the same project tested at a range of sizes, to say at which sizes it closes,
// the largest size that closes inside the range the place allows (the right size), and what stops it growing.
//
// The range: the person's own (fewest to most homes), cut by the homes zoning allows by right on vacant and lived-in
// lots (lib/zoning/capacity) and, for tax credit financing, by market depth (lib/demand/depth). About ten sizes are
// run across it, then each edge of the closing sizes is found exactly by halving.
//
// Tiers, from PHFA's own feasibility tests (lib/pencil/finance checks): "closes" when the gap PHFA counts (soft funds
// not yet committed are gap) is under half the developer fee and cash flow stays at or above zero in years 1–10;
// "over PHFA's limit" when deferring more of the fee would cover the gap but PHFA would not accept it; otherwise "gap".
// Only "closes" counts as closing in the size sweep. Market rate closes when the yield on cost reaches the target.
import type { PencilResult } from '../pencil/finance';
import type { Branch } from '../pencil/inputs';
import { atSize, type AtSize, type ProjectBase } from './model';

export type Tier = 'closes' | 'close' | 'gap';
export type Limit = 'your range' | 'zoning' | 'depth' | 'credit cap' | 'gap';

export const TIER_WORD: Record<Tier, string> = { closes: 'closes', close: "over PHFA's limit", gap: 'gap' };
export const LIMIT_WORD: Record<Limit, string> = {
  'your range': 'your largest size',
  zoning: 'homes zoning allows by right here',
  depth: 'market depth',
  'credit cap': "PHFA's credit cap per project",
  gap: 'the gap grows with size',
};

export interface SizeRow {
  homes: number;
  tier: Tier;
  /** Gap before deferring fee; below zero is headroom (credits not needed). */
  gap: number;
  run: AtSize;
}

export interface Bounds {
  yours: [number, number];
  zoning: number | null;
  depth: number | null;
}

export interface Sweep {
  branch: Branch;
  bounds: Bounds;
  /** The range tested: yours, cut by zoning and depth. `cut` names the bound that made it empty (then yours is tested). */
  range: [number, number];
  cut: 'zoning' | 'depth' | null;
  closesAt: [number, number] | null;
  rightSize: number | null;
  limit: Limit;
  /** The row at the right size; else the largest size that closes; else the size with the smallest gap a home. */
  best: SizeRow;
  rows: SizeRow[];
}

export function tierOf(r: PencilResult, targetYield: number): Tier {
  if (r.homes === 0) return 'gap';
  if (r.branch === 'market') return r.market && r.market.yieldOnCost.value >= targetYield ? 'closes' : 'gap';
  if (r.checks.find((c) => c.label === 'Cash flow, years 1–10')?.ok === false) return 'gap';
  if (r.checks.find((c) => c.label === 'PHFA feasibility')?.ok) return 'closes';
  return r.gapAfterFee <= 0 ? 'close' : 'gap';
}

const passes = (t: Tier) => t === 'closes';

/** Sizes to run across a range: both ends and about `n` steps between. */
export function grid(lo: number, hi: number, n = 10): number[] {
  if (hi <= lo) return [lo];
  const out = new Set<number>();
  for (let k = 0; k <= n; k++) out.add(Math.round(lo + ((hi - lo) * k) / n));
  return [...out].sort((a, b) => a - b);
}

export function bounds(b: ProjectBase, branch: Branch, yours: [number, number]): Bounds {
  const zoning = b.cap ? b.cap.vacant.homes + b.cap.gentle.homes : null;
  return { yours, zoning, depth: branch === 'market' ? null : b.depth?.homes ?? null };
}

export function sweepSizes(b: ProjectBase, branch: Branch, yours: [number, number], n = 10): Sweep {
  const bd = bounds(b, branch, yours);
  const lo0 = Math.max(1, Math.round(yours[0]));
  const hi0 = Math.max(lo0, Math.round(yours[1]));
  const caps: [number, 'zoning' | 'depth'][] = [];
  if (bd.zoning != null) caps.push([bd.zoning, 'zoning']);
  if (bd.depth != null) caps.push([bd.depth, 'depth']);
  const tight = caps.filter(([v]) => v < hi0).sort((a, b) => a[0] - b[0])[0] ?? null;
  const cut = tight && tight[0] < lo0 ? tight[1] : null;
  const range: [number, number] = cut ? [lo0, hi0] : [lo0, tight ? tight[0] : hi0];

  const memo = new Map<number, SizeRow>();
  const run = (h: number): SizeRow => {
    let row = memo.get(h);
    if (!row) {
      const r = atSize(b, h, branch, true);
      row = { homes: h, tier: tierOf(r.result, r.args.inputs.targetYield), gap: r.result.gap, run: r };
      memo.set(h, row);
    }
    return row;
  };
  /** The edge between a passing size and a failing one: the passing size next to the failing one. */
  const edge = (pass: number, fail: number): number => {
    while (Math.abs(fail - pass) > 1) {
      const mid = Math.round((pass + fail) / 2);
      if (passes(run(mid).tier)) pass = mid;
      else fail = mid;
    }
    return pass;
  };

  const sizes = grid(range[0], range[1], n);
  const rows = sizes.map(run);
  const ok = rows.filter((r) => passes(r.tier));
  let closesAt: [number, number] | null = null;
  if (ok.length) {
    const first = ok[0].homes;
    const last = ok[ok.length - 1].homes;
    const below = sizes[sizes.indexOf(first) - 1];
    const above = sizes[sizes.indexOf(last) + 1];
    closesAt = [below != null ? edge(first, below) : first, above != null ? edge(last, above) : last];
  }
  const rightSize = closesAt && !cut ? closesAt[1] : null;
  let limit: Limit = 'gap';
  if (rightSize != null) {
    if (rightSize < range[1]) limit = run(rightSize + 1).run.result.capped ? 'credit cap' : 'gap';
    else limit = tight && tight[0] === range[1] ? tight[1] : 'your range';
  }
  const perHome = (r: SizeRow) => r.gap / Math.max(1, r.homes);
  const best = rightSize != null ? run(rightSize) : closesAt ? run(closesAt[1]) : rows.reduce((a, r) => (perHome(r) < perHome(a) ? r : a), rows[0]);
  return { branch, bounds: bd, range, cut, closesAt, rightSize, limit, best, rows: [...memo.values()].sort((a, b) => a.homes - b.homes) };
}

/** "closes at 24–40 homes", "closes at 40 homes", "no size from 12 to 60 closes". */
export function closesWords(s: Sweep): string {
  if (!s.closesAt) return `no size from ${s.range[0]} to ${s.range[1]} homes closes`;
  const [a, z] = s.closesAt;
  return a === z ? `closes at ${a} homes` : `closes at ${a}–${z} homes`;
}
