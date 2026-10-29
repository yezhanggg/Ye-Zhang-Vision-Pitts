// Find places reads each tract without React (finder/read); the Tract view reads it with a hook (levels/useReview
// useProjectRead). They must say the same, so a row and the place it opens agree: this renders the hook on the server
// and compares the two for a few projects and places.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEFAULT_ENTRIES } from '../../../lib/lihtc/store';
import { hud, placeFor } from '../../../lib/place/data';
import type { PlanLevel } from '../../../lib/place/plan';
import type { DevType } from '../../../lib/project/devType';
import { SIDE_A } from '../../../lib/project/side';
import { DEFAULT_PROJECT, type ProjectState } from '../../../lib/project/store';
import { create } from 'zustand';
import { useProjectRead, type ProjectRead } from '../levels/useReview';
import { projectModel } from '../project/useProjectModel';
import { readPlace } from './read';

const HAZELWOOD = '42003562300';
const OAKLAND = '42003040500';
const LAWRENCEVILLE = '42003090200';

function hookRead(geoid: string, level: PlanLevel, homes: number, project: ProjectState, devType: DevType): ProjectRead {
  const place = placeFor(geoid)!;
  const m = projectModel(geoid, place, hud!, level, homes, project, DEFAULT_ENTRIES);
  // A side whose project store starts at this project (a server render reads a store's initial state).
  const side = { ...SIDE_A, project: create<ProjectState>(() => project) };
  let out: ProjectRead | null = null;
  const Probe = () => {
    out = useProjectRead({ scope: 'tract', m, devType, place, hud: hud!, side });
    return null;
  };
  renderToString(createElement(Probe));
  return out!;
}

const CASES: [string, DevType, PlanLevel, number, ProjectState][] = [
  ['affordable, 40 units, 9%', 'affordable', 50, 40, { ...DEFAULT_PROJECT, devType: 'affordable', pencil: { branch: 'nine' } }],
  ['affordable, 8 units', 'affordable', 50, 8, { ...DEFAULT_PROJECT, devType: 'affordable' }],
  ['market fourplex, 3 stories', 'market', 'market', 4, { ...DEFAULT_PROJECT, devType: 'market', stories: 3 }],
  ['senior, 60 units, a Capital change', 'senior', 30, 60, { ...DEFAULT_PROJECT, devType: 'senior', capital: { hardPerSf: 260 } }],
];

describe('a Find places row reads a place as the Tract view does', () => {
  for (const [name, devType, level, homes, project] of CASES)
    it(name, () => {
      for (const geoid of [HAZELWOOD, OAKLAND, LAWRENCEVILLE]) {
        const hook = hookRead(geoid, level, homes, project, devType);
        const row = readPlace({ geoid, place: placeFor(geoid)!, hud: hud!, level, homes, project, entries: DEFAULT_ENTRIES, devType });
        expect(row.site).toEqual(hook.site);
        expect(row.check).toEqual(hook.check);
        expect(row.run.result).toEqual(hook.run.result);
        expect(row.review).toEqual(hook.review);
        expect(row.typical).toEqual(hook.typical);
      }
    });
});

describe('readPlace', () => {
  it('switches the financing as the Financing pick does', () => {
    const args = { geoid: HAZELWOOD, place: placeFor(HAZELWOOD)!, hud: hud!, level: 50 as PlanLevel, homes: 40, project: { ...DEFAULT_PROJECT, devType: 'affordable' as const }, entries: DEFAULT_ENTRIES, devType: 'affordable' as DevType };
    expect(readPlace(args).m.branch).toBe('nine');
    const four = readPlace(args, 'four');
    expect(four.m.branch).toBe('four');
    expect(four.m.sheet.setup.credit).toBe('four');
  });
});
