// The pure pieces of the project model (components/place/project/useProjectModel): what stays the same for a place
// whatever the size (demand signals, zoning capacity, QCT or DDA, the overlay, market rents, market depth), and the
// project at one size (mix → pencil). The card, Compare places, the size sweep and Find places all run these, so they
// show the same numbers.
import { demandCity, demandTract, demandZip } from '../demand/data';
import { depthHomes, type Depth } from '../demand/depth';
import { signalsFor, type Signal } from '../demand/signals';
import type { DemandUnit } from '../demand/types';
import type { Entries } from '../lihtc/store';
import type { PlanLevel } from '../place/plan';
import type { HudTable, PlaceMeasures } from '../place/types';
import { pencil, type PencilArgs, type PencilResult } from '../pencil/finance';
import { DEFAULTS, planOfSheet, resolveInputs, type Branch, type InputKind } from '../pencil/inputs';
import { qctYears, type QctYears } from '../pencil/designations';
import { marketRents } from '../pencil/rents';
import { tractCapacity, type TractCapacity } from '../zoning/capacity';
import { AFFORDABLE_LEVELS, homesAt, projectMix, type ProjectMix } from './plan';
import { MIX_LEVELS, emptyCounts, total, type Counts, type ProjectState } from './store';

export interface ProjectBase {
  geoid: string;
  place: PlaceMeasures;
  level: PlanLevel;
  project: ProjectState;
  entries: Entries;
  tract: DemandUnit | null;
  zip: DemandUnit | null;
  zipId: string | null;
  signals: Signal[];
  /** QCT on HUD's 2027 list (the next round's) or a Small Area DDA: the 130% boost in the pencil. */
  qctOrDda: boolean;
  qct: QctYears;
  cap: TractCapacity | null;
  inIzo: boolean;
  rents: PencilArgs['marketRents'];
  depth: Depth | null;
}

export function projectBase(geoid: string, place: PlaceMeasures, hud: HudTable, level: PlanLevel, project: ProjectState, entries: Entries): ProjectBase {
  const tract = demandTract(geoid);
  const zipId = tract?.zip ?? place.market?.zip ?? null;
  const zip = demandZip(zipId);
  const cap = tractCapacity(geoid);
  return {
    geoid,
    place,
    level,
    project,
    entries,
    tract,
    zip,
    zipId,
    signals: tract ? signalsFor(tract, zip, demandCity()) : [],
    qctOrDda: qctYears(geoid).y2027 || !!place.programs?.dda,
    qct: qctYears(geoid),
    cap,
    // The pin's reading when there is one (Place online), else the tract's: mostly in the overlay.
    inIzo: project.sites[geoid]?.pin?.izo ?? (cap?.izo_share ?? 0) > 0.5,
    rents: marketRents(place, hud).rents,
    depth: depthHomes(tract),
  };
}

/** A mix scaled to `n` homes, keeping its shares (largest remainder). */
export function scaleCounts(c: Counts, n: number): Counts {
  const now = total(c);
  if (now === 0 || now === n) return c;
  const cells = MIX_LEVELS.flatMap((l) => c[l].map((v, br) => ({ l, br, exact: (v * n) / now })));
  const out = emptyCounts();
  for (const x of cells) out[x.l][x.br] = Math.floor(x.exact);
  let left = n - cells.reduce((s, x) => s + Math.floor(x.exact), 0);
  for (const x of [...cells].sort((a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)))) {
    if (left <= 0) break;
    out[x.l][x.br] += 1;
    left -= 1;
  }
  return out;
}

export interface AtSize {
  mix: ProjectMix;
  args: PencilArgs;
  result: PencilResult;
  kinds: Record<string, InputKind>;
}

/** The financing in force: the person's pick, else tax credits when the mix has homes with an income limit. */
export function branchFor(b: ProjectBase, mix: ProjectMix): { branch: Branch; chosen: boolean } {
  const picked = b.project.pencil.branch;
  if (picked === 'nine' || picked === 'four' || picked === 'market') return { branch: picked, chosen: true };
  return { branch: homesAt(mix.counts, AFFORDABLE_LEVELS) > 0 ? b.entries.setup.credit : 'market', chosen: false };
}

/**
 * The project at `homes` (null: the planning input, or the example). With `scale`, the person's own mix is scaled to
 * that size too; otherwise their own mix keeps its own count. `branch` null: the financing in force.
 */
export function atSize(b: ProjectBase, homes: number | null, branch: Branch | null = null, scale = false): AtSize & { branch: Branch; chosen: boolean } {
  let mix = projectMix(b.project, b.level, homes, b.tract, b.zip);
  if (scale && mix.mode === 'mine' && homes != null) mix = { ...mix, counts: scaleCounts(mix.counts, homes), homes };
  const f = branch ? { branch, chosen: true } : branchFor(b, mix);
  const { inputs, kinds } = resolveInputs(b.project.pencil, f.branch, DEFAULTS, { plan: planOfSheet(b.entries.sheet), senior: b.entries.setup.occupancy === 'senior' });
  const args: PencilArgs = { counts: mix.counts, inputs, marketRents: b.rents, qctOrDda: b.qctOrDda, inOverlay: b.inIzo };
  return { mix, args, result: pencil(args), kinds, ...f };
}
