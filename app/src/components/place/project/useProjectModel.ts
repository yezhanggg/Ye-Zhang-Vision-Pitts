// The project tested in one place, computed once for the Place page's project card and for each side of Compare
// places: the unit mix, the zoning read, the pencil and the tax credit sheet, from the same inputs (the planning
// inputs, the project store and the tax credit entries), so both pages show the same numbers.
import { useMemo } from 'react';
import { DEMAND } from '../../../lib/demand/data';
import { scoreTypes } from '../../../lib/demand/order';
import type { Signal } from '../../../lib/demand/signals';
import type { DemandUnit } from '../../../lib/demand/types';
import { planFacts, type PlanFacts } from '../../../lib/lihtc/fromPlan';
import { sheetState, type SheetState } from '../../../lib/lihtc/sheetState';
import type { Entries } from '../../../lib/lihtc/store';
import { fmtCount } from '../../../lib/place/format';
import { isSeniorAge, type PlanLevel } from '../../../lib/place/plan';
import type { HudTable, PlaceMeasures } from '../../../lib/place/types';
import type { PencilArgs, PencilResult } from '../../../lib/pencil/finance';
import type { Branch, InputKind } from '../../../lib/pencil/inputs';
import { atSize, projectBase, type ProjectBase } from '../../../lib/project/model';
import type { ProjectMix } from '../../../lib/project/plan';
import { entriesFor, setFinancingOn, SIDE_A, useSide, type Side } from '../../../lib/project/side';
import type { ProjectState } from '../../../lib/project/store';
import type { TractCapacity } from '../../../lib/zoning/capacity';

export interface ProjectModel {
  /** What stays the same at every size (lib/project/model): the size sweep and the paths table start from it. */
  base: ProjectBase;
  tract: DemandUnit | null;
  zip: DemandUnit | null;
  zipId: string | null;
  signals: Signal[];
  scores: ReturnType<typeof scoreTypes>;
  mix: ProjectMix;
  branch: Branch;
  /** The person picked the financing; otherwise it follows the mix (tax credits when it has homes with an income limit). */
  branchChosen: boolean;
  qctOrDda: boolean;
  cap: TractCapacity | null;
  inIzo: boolean;
  kinds: Record<string, InputKind>;
  exampleCount: number;
  args: PencilArgs;
  result: PencilResult;
  facts: PlanFacts;
  sheet: SheetState;
}

export function projectModel(geoid: string, place: PlaceMeasures, hud: HudTable, level: PlanLevel, homes: number | null, project: ProjectState, entries: Entries, mixFrom: DemandUnit | null = null): ProjectModel {
  const b = projectBase(geoid, place, hud, level, project, entries, mixFrom);
  const { mix, args, result, kinds, branch, chosen } = atSize(b, homes);
  const facts = planFacts(mix.counts, project.stories, result.finance);
  const lt = b.tract?.lihtc;
  const evidence = lt?.mile
    ? { lihtc: `Tax credit homes (HUD): ${fmtCount(lt.li_units)} in the tract and ${fmtCount(lt.mile.li_units)} within a mile of it; ${fmtCount(lt.mile.li_units_recent)} of those within the mile were placed in service ${DEMAND.lihtc.as_of - DEMAND.lihtc.recent_years} or later.` }
    : undefined;
  return {
    base: b,
    tract: b.tract,
    zip: b.zip,
    zipId: b.zipId,
    signals: b.signals,
    scores: scoreTypes(b.signals),
    mix,
    branch,
    branchChosen: chosen,
    qctOrDda: b.qctOrDda,
    cap: b.cap,
    inIzo: b.inIzo,
    kinds,
    exampleCount: Object.values(kinds).filter((k) => k === 'example').length,
    args,
    result,
    facts,
    sheet: sheetState(entries, geoid, place, facts, evidence),
  };
}

/** The model for a place, or null while the place or HUD table is missing. `side` (default: the one in context) says
 *  whose settings it reads: the shared ones, or Compare's side B. `mixFrom`: the renters the suggested mix follows when
 *  not the tract's (the ZIP level). */
export function useProjectModel(geoid: string | null | undefined, place: PlaceMeasures | null | undefined, hud: HudTable | null | undefined, side?: Side, mixFrom: DemandUnit | null = null): ProjectModel | null {
  const ctx = useSide();
  const s = side ?? ctx;
  const level = s.plan((x) => x.level);
  const homes = s.plan((x) => x.homes);
  const project = s.project();
  const shared = s.lihtc();
  const senior = s.plan((x) => isSeniorAge(x.age));
  const entries = useMemo(() => entriesFor(s, shared, project, senior), [s, shared, project, senior]);
  return useMemo(() => (geoid && place && hud ? projectModel(geoid, place, hud, level, homes, project, entries, mixFrom) : null), [geoid, place, hud, level, homes, project, entries, mixFrom]);
}

/** Pick the financing on the shared settings: the pencil's branch, and the tax credit sheet's credit when it is a credit. */
export function setFinancing(b: Branch) {
  setFinancingOn(SIDE_A, b);
}
