// What each policy says about one place and one project: whether it applies here, whether it is counted, and a line
// for the results (lib/policy/catalog). Binding rules read the place's data; screens and incentives follow the
// switches (lib/policy/store). Loaded on demand.
import { isNum } from '../place/format';
import type { PlaceMeasures } from '../place/types';
import type { Branch } from '../pencil/inputs';
import { inclusionaryHomes, type TractCapacity } from '../zoning/capacity';
import { PERF_DISTRICTS, POLICIES, type Policy } from './catalog';
import type { PolicyState } from './store';

export interface PolicyRow {
  policy: Policy;
  /** The place's data says it applies here (null: cannot tell). */
  applies: boolean | null;
  /** Counted in the results: binding rules that apply, incentives and screens switched on. */
  on: boolean;
  note: string;
}

export interface PolicyContext {
  label: string;
  place: PlaceMeasures | null;
  cap: TractCapacity | null;
  homes: number;
  branch: Branch;
  qctOrDda: boolean;
  /** Tax credit score: points, maximum and the minimum. */
  score: { total: number; max: number; threshold: number | null } | null;
  draftSheet: boolean;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function policyRows(c: PolicyContext, s: PolicyState): PolicyRow[] {
  const fema = c.place?.flood?.fema_sfha_pct;
  const izo = c.cap?.izo_share ?? null;
  const perf = c.cap ? Object.entries(c.cap.districts).filter(([d]) => PERF_DISTRICTS.some((x) => d.startsWith(x))) : [];
  const credits = c.branch !== 'market';
  const row = (id: Policy['id'], applies: boolean | null, on: boolean, note: string): PolicyRow => ({ policy: POLICIES.find((p) => p.id === id)!, applies, on, note });
  const set = isNum(izo) && izo > 0.5 ? inclusionaryHomes(c.homes, true) : 0;
  return [
    row(
      'izo',
      isNum(izo) ? izo > 0 : null,
      isNum(izo) && izo > 0.5,
      !isNum(izo) ? 'Overlay share not available for this tract.' : izo > 0.5 ? `In the overlay (${pct(izo)} of the tract). Your ${c.homes} homes: ${set > 0 ? `${set} at or below 50% AMI` : 'under the 20-home threshold'}.` : izo > 0 ? `${pct(izo)} of the tract is in the overlay: check whether the site is.` : 'Not in the overlay.',
    ),
    row('fpo', isNum(fema) ? fema > 0 : null, isNum(fema) && fema > 0, isNum(fema) ? (fema > 0 ? `${fema.toFixed(1)}% of the tract's land is in the 1%-a-year flood zone: a building there must sit 18 in above the base flood elevation.` : "None of the tract's land is in the 1%-a-year flood zone.") : 'Flood-zone share not available.'),
    row('adu', true, true, 'No ADU overlay is mapped, so ADUs are not suggested.'),
    row('phfa', credits, credits && !c.draftSheet, credits ? (c.score ? `Counted: ${c.score.total} of ${c.score.max} points${c.score.threshold != null ? `, minimum ${c.score.threshold}` : ''}${c.draftSheet ? ' (scored on the draft sheet below)' : ''}.` : 'Counted when the score sheet loads.') : 'Not counted: the project is market rate.'),
    row('qct', c.qctOrDda, c.qctOrDda && credits, c.qctOrDda ? (credits ? '130% eligible basis, applied in the pencil.' : 'A QCT or DDA; applies only to tax credit projects.') : 'Not a QCT or DDA: no basis boost.'),
    row('perf', perf.length > 0, perf.length > 0, perf.length ? `Eligible districts here: ${perf.map(([d, n]) => `${d} (${n} lots)`).join(', ')}.` : 'No eligible district (RIV, UPR, UC-E, R-MU, UC-MU) in this tract.'),
    row('phfa_draft', credits, credits && c.draftSheet, c.draftSheet ? 'Counted: the score uses the 2027/2028 draft sheet.' : 'Off: the score uses the adopted sheet.'),
    row('ahb', null, !!s.on.ahb, s.on.ahb ? 'Counted as a possibility only: the bill is not adopted, and no points are added here.' : 'Off.'),
    row('hof', null, !!s.on.hof, s.on.hof ? 'Counted: enter the gap funding you expect as Soft funds under Pencil inputs.' : 'Off.'),
    row('abatement', null, !!s.on.abatement, s.on.abatement ? 'Noted only: terms are not verified, so operating costs are not reduced here.' : 'Off.'),
    row('parking', null, !!s.on.parking, s.on.parking ? 'Noted only: the reduction is not verified, and parking is not costed in the pencil.' : 'Off.'),
    row('plan', /Bluff/.test(c.label) ? true : null, /Bluff/.test(c.label), /Bluff/.test(c.label) ? 'The Uptown / EcoInnovation District Plan (adopted 2017) covers Uptown.' : "Check the City's neighborhood plans for this area."),
  ];
}
