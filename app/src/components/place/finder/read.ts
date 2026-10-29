// One place read as the Tract view reads it: the project model at the project's units, then the same read the Tract
// view's hook makes (place/levels/useReview projectRead, scope 'tract': the site, the zoning check, the capital run and
// the review). Find places ranks these reads, so a row and the place it opens show the same answer;
// finder/read.test.ts holds the two equal. Online only: loaded on demand.
import type { Entries } from '../../../lib/lihtc/store';
import type { PlanLevel } from '../../../lib/place/plan';
import type { HudTable, PlaceMeasures } from '../../../lib/place/types';
import type { Branch } from '../../../lib/pencil/inputs';
import type { DevType } from '../../../lib/project/devType';
import type { ProjectState } from '../../../lib/project/store';
import { projectRead, type ProjectRead } from '../levels/useReview';
import { projectModel, type ProjectModel } from '../project/useProjectModel';

export interface PlaceRead extends ProjectRead {
  m: ProjectModel;
  devType: DevType;
}

export interface ReadArgs {
  geoid: string;
  place: PlaceMeasures;
  hud: HudTable;
  level: PlanLevel;
  homes: number | null;
  project: ProjectState;
  entries: Entries;
  devType: DevType;
}

/** The place read with the project as set, or (`branch`) with its financing switched as Financing on the left does. */
export function readPlace(a: ReadArgs, branch: Branch | null = null): PlaceRead {
  const project = branch ? { ...a.project, pencil: { ...a.project.pencil, branch } } : a.project;
  const entries = branch && branch !== 'market' ? { ...a.entries, setup: { ...a.entries.setup, credit: branch } } : a.entries;
  const m = projectModel(a.geoid, a.place, a.hud, a.level, a.homes, project, entries);
  return { ...projectRead({ scope: 'tract', m, devType: a.devType, place: a.place, hud: a.hud, over: project.capital }), m, devType: a.devType };
}
