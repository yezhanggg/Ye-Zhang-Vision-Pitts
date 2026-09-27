// The four levers' results for the Equity & policy tab, computed once and shared by the toolbar, the cards, the map
// outline, the question box and the exports.
import { useMemo } from 'react';
import { hud } from '../../lib/place/data';
import { usePlan } from '../../lib/place/planStore';
import { MILES_LABEL } from '../../lib/place/plan';
import { fitsRent2br, type AmiPct } from '../../lib/equity/measures';
import { aduByRight, densityBonus, largestGaps, transitExtension, type Row } from '../../lib/equity/policy';
import { leverSummaries, type LeverId, type PolicyResults } from '../../lib/equity/export';

export function usePolicy(rows: Row[], ami: AmiPct, homes: number, on: Record<LeverId, boolean>) {
  // The plan's own level (market stays market), the same one the Place tab's recommendation uses.
  const level = usePlan((s) => s.level);
  const size = usePlan((s) => s.size);
  const age = usePlan((s) => s.age);
  const transitMi = usePlan((s) => s.transitMi);
  const adu = useMemo(() => aduByRight(rows, hud, { level, size, age }), [rows, level, size, age]);
  const bonus = useMemo(() => densityBonus(rows), [rows]);
  const gaps = useMemo(() => largestGaps(rows, hud, ami, homes), [rows, ami, homes]);
  const transit = useMemo(() => transitExtension(rows, transitMi, 1), [rows, transitMi]);
  const results: PolicyResults = useMemo(
    () => ({ n: rows.length, adu, bonus, gaps, transit, homes, ami, fits: fitsRent2br(hud, ami), transitLabel: MILES_LABEL[transitMi] }),
    [rows.length, adu, bonus, gaps, transit, homes, ami, transitMi],
  );
  const levers = useMemo(() => leverSummaries(results, on), [results, on]);
  const flips = useMemo(() => {
    const s = new Set<string>();
    for (const l of levers) if (l.on) l.changed.forEach((id) => s.add(id));
    return s;
  }, [levers]);
  return { results, levers, flips, transitMi };
}
