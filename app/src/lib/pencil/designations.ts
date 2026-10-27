// HUD's Qualified Census Tracts for 2026 and 2027 (scripts/21_build_designations.py). The pencil's 130% basis boost
// reads 2027: HUD's 2027 lists apply to allocations and bond issues after 2026-12-31, and the next round is 2027's
// (HUD's 730-day rule can keep 2026's for a complete application made earlier). The scored subsidy factor stays on 2026.
import file from '../../data/lazy/designations.json';

interface DesignationsFile {
  notice: { title: string; url: string; effective: string };
  qct: Record<'2026' | '2027', string[]>;
  qct_change: { lose: string[]; gain: string[] };
}

export const DESIGNATIONS = file as unknown as DesignationsFile;
const Q2026 = new Set(DESIGNATIONS.qct['2026']);
const Q2027 = new Set(DESIGNATIONS.qct['2027']);

export interface QctYears {
  y2026: boolean;
  y2027: boolean;
}

export const qctYears = (geoid: string): QctYears => ({ y2026: Q2026.has(geoid), y2027: Q2027.has(geoid) });

/** A line when the tract leaves or joins the list on 2027-01-01, else null. */
export function qctChangeWords(q: QctYears): string | null {
  const on = DESIGNATIONS.notice.effective;
  if (q.y2026 && !q.y2027) return `Leaves HUD's QCT list on ${on}: no 130% boost for allocations or bond issues after 2026-12-31, unless HUD's 730-day rule keeps the 2026 list for a complete application made earlier.`;
  if (!q.y2026 && q.y2027) return `Joins HUD's QCT list on ${on}: the 130% boost applies to allocations and bond issues after 2026-12-31.`;
  return null;
}
