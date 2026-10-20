// Financing paths compared (docs/data/finder.md): the same project paid for three ways (9% credits, 4% credits with
// bonds, market rate), each at the person's size and swept for its own right size (lib/project/size). The order is a
// printed rule, not a pick: paths that close at the person's size come first, then the smaller gap a home, then more
// points above PHFA's minimum. The person decides; the table only lays the paths side by side.
import { planFacts } from '../lihtc/fromPlan';
import { sheetState } from '../lihtc/sheetState';
import type { Branch } from '../pencil/inputs';
import type { ProjectBase } from './model';
import { sweepSizes, type SizeRow, type Sweep, type Tier } from './size';

export const PATHS: Branch[] = ['nine', 'four', 'market'];
export const PATH_LABEL: Record<Branch, string> = { nine: '9% credits', four: '4% + bonds', market: 'Market rate' };
export const LEAD_RULE = 'Order: paths that close at your size first, then the smaller gap a home, then more points above PHFA’s minimum.';

export interface PathPoints {
  total: number;
  low: number;
  high: number;
  threshold: number | null;
}

export interface PathRow {
  branch: Branch;
  sweep: Sweep;
  /** The project at the person's own size. */
  yours: SizeRow;
  points: PathPoints | null;
}

const TIER_ORDER: Record<Tier, number> = { closes: 0, close: 1, gap: 2 };
const above = (p: PathPoints | null) => (p && p.threshold != null ? p.total - p.threshold : -Infinity);

export function comparePathRows(a: PathRow, b: PathRow): number {
  return (
    TIER_ORDER[a.yours.tier] - TIER_ORDER[b.yours.tier] ||
    a.yours.gap / Math.max(1, a.yours.homes) - b.yours.gap / Math.max(1, b.yours.homes) ||
    above(b.points) - above(a.points)
  );
}

/** The range each path is swept over around the person's size: a third of it to twice it (12 at least). */
export const pathRange = (homes: number): [number, number] => [Math.max(4, Math.ceil(homes / 3)), Math.max(12, homes * 2)];

export function comparePaths(b: ProjectBase, homes: number, stories: number | null): PathRow[] {
  const rows = PATHS.map((branch): PathRow => {
    const sweep = sweepSizes(b, branch, pathRange(homes));
    const yours = sweepSizes(b, branch, [homes, homes], 1).best;
    let points: PathPoints | null = null;
    if (branch !== 'market') {
      const r = yours.run.result;
      const entries = { ...b.entries, setup: { ...b.entries.setup, credit: branch } };
      const s = sheetState(entries, b.geoid, b.place, planFacts(r.counts, stories, r.finance)).score;
      points = { total: s.total, low: s.range.low, high: s.range.high, threshold: s.threshold };
    }
    return { branch, sweep, yours, points };
  });
  return rows.sort(comparePathRows);
}
