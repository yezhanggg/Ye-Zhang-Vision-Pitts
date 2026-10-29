// The kind of development tested at the Parcel level (Ye, 2026-10-27): market-rate, affordable or senior housing,
// mixed use (homes over ground-floor commercial) or commercial. It sets the income levels on offer, the residents
// (senior), the financing that follows (tax credits where homes carry an income limit) and the capital inputs'
// suggested starting values. Commercial and the commercial part of mixed use get the zoning check only, no money test.
// Online only: loaded on demand.
import type { PlanLevel } from '../place/plan';
import type { Side } from './side';
import type { ProjectState } from './store';

export type DevType = 'market' | 'affordable' | 'senior' | 'mixed' | 'commercial';

export const DEV_TYPES: { id: DevType; label: string; line: string }[] = [
  { id: 'market', label: 'Market', line: 'Market-rate rental homes' },
  { id: 'affordable', label: 'Affordable', line: 'Homes with an income limit, usually with tax credits' },
  { id: 'senior', label: 'Senior', line: 'Homes for residents 62 and older' },
  { id: 'mixed', label: 'Mixed use', line: 'Homes over ground-floor commercial space' },
  { id: 'commercial', label: 'Commercial', line: 'Shops or offices, no homes (zoning check only)' },
];

export const DEV_TYPE_LABEL = Object.fromEntries(DEV_TYPES.map((t) => [t.id, t.label])) as Record<DevType, string>;

export const isHousing = (t: DevType) => t !== 'commercial';

/** The income levels a type offers; market-rate housing has none to pick. */
export function levelsFor(t: DevType): PlanLevel[] {
  if (t === 'market') return ['market'];
  if (t === 'affordable') return [30, 50, 80];
  if (t === 'commercial') return [];
  return [30, 50, 80, 'market'];
}

const DEV_IDS = DEV_TYPES.map((t) => t.id);
export const isDevType = (v: unknown): v is DevType => typeof v === 'string' && (DEV_IDS as string[]).includes(v);

/** The type in force: the one picked, else read from the planning inputs (senior residents, market rate, affordable). */
export function devTypeOf(project: Pick<ProjectState, 'devType'>, level: PlanLevel, senior: boolean): DevType {
  if (isDevType(project.devType)) return project.devType;
  return senior ? 'senior' : level === 'market' ? 'market' : 'affordable';
}

/** Pick a type: the income level moves into the type's range, senior residents follow, and the financing follows the
 *  mix again (tax credits where homes carry an income limit, market rate otherwise). */
export function setDevType(side: Side, t: DevType) {
  side.project.setState((s) => {
    const { branch: _follow, ...pencil } = s.pencil;
    return { devType: t, pencil, commercialSf: t === 'mixed' || t === 'commercial' ? (s.commercialSf ?? (t === 'mixed' ? 3000 : 10000)) : s.commercialSf };
  });
  const plan = side.plan.getState();
  const levels = levelsFor(t);
  if (levels.length && !levels.includes(plan.level)) plan.setPlan({ level: levels.includes(50) ? 50 : levels[0] });
  const senior = t === 'senior';
  plan.setPlan({ age: senior ? 'senior62' : 'any' });
  if (!side.own) side.lihtc.setState((e) => ({ setup: { ...e.setup, occupancy: senior ? 'senior' : 'general' } }));
}
