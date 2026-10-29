// The policies across a ZIP code (Analysis > Place, ZIP level): for each rule read from the data, in how many of the
// ZIP's main city tracts it applies, from the same policyRows as a single tract. Financing lines are left out: the
// ZIP level tests no project. Loaded on demand.
import { tractById, tractLabel } from '../data';
import { qctYears } from '../pencil/designations';
import { placeFor } from '../place/data';
import { zipTracts } from '../place/zipView';
import { tractCapacity } from '../zoning/capacity';
import { policyRows } from './applies';
import type { Policy } from './catalog';
import { DEFAULT_POLICY } from './store';

/** A tract counts as in the inclusionary overlay from this share up: smaller shares are slivers along the overlay's
 *  edge where the two maps meet, not land in it. */
export const IZO_MIN_SHARE = 0.01;

/** Rules whose "applies" is read from each tract's data. */
const COUNTED: Policy['id'][] = ['izo', 'fpo', 'qct', 'perf'];

export interface ZipPolicyCount {
  tracts: number;
  /** Policy id → tracts where it applies (null where a tract cannot tell). */
  applies: Partial<Record<Policy['id'], number>>;
}

export function zipPolicyCounts(zip: string, tractsOf: (z: string) => string[] = (z) => zipTracts(z).main): ZipPolicyCount {
  const ids = tractsOf(zip).filter((g) => tractById.has(g));
  const applies: Partial<Record<Policy['id'], number>> = {};
  for (const g of ids) {
    const place = placeFor(g);
    const rows = policyRows({ label: tractLabel(tractById.get(g)), place, cap: tractCapacity(g), homes: 0, branch: 'nine', qctOrDda: qctYears(g).y2027 || !!place?.programs?.dda, score: null, draftSheet: false }, DEFAULT_POLICY);
    for (const r of rows) {
      const hit = r.policy.id === 'izo' ? (tractCapacity(g)?.izo_share ?? 0) >= IZO_MIN_SHARE : r.applies;
      if (COUNTED.includes(r.policy.id) && hit) applies[r.policy.id] = (applies[r.policy.id] ?? 0) + 1;
    }
  }
  return { tracts: ids.length, applies };
}

/** "in 2 of 5 tracts" for a counted rule; the ADU overlay is "none mapped"; financing lines show nothing. */
export function zipPolicyWords(c: ZipPolicyCount, id: Policy['id']): string | null {
  if (id === 'adu') return 'none mapped';
  if (!COUNTED.includes(id) || c.tracts === 0) return null;
  const n = c.applies[id] ?? 0;
  return n === 0 ? `in no tract of ${c.tracts}` : `in ${n} of ${c.tracts} tracts`;
}
