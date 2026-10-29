// The three levels of Analysis > Place (Ye, 2026-10-27): the same project inputs at every level (type, units, income,
// mix, capital, open space, policies); a parcel reads them on the lot picked, a tract on its typical lot, a ZIP code
// across its tracts. What each level asks for on the left, as a table, so the panels stay in step.
// Online only: loaded on demand.
import type { PlaceArea } from '../../../lib/place/zipView';

export type Level = PlaceArea;

export const LEVELS: { id: Level; label: string; line: string }[] = [
  { id: 'parcel', label: 'Parcel', line: 'Test the project on one real lot.' },
  { id: 'tract', label: 'Tract', line: 'Test it in a neighborhood, on its typical lot.' },
  { id: 'zip', label: 'ZIP code', line: "Test it across a ZIP code's tracts." },
];

export type InputGroup = 'site' | 'who' | 'project' | 'money' | 'open' | 'policy' | 'finder';

export const INPUT_TITLE: Record<InputGroup, string> = {
  site: 'Site',
  who: "Who it's for",
  project: 'Project',
  money: 'Capital',
  open: 'Open space',
  policy: 'Policies',
  finder: 'Find places for this project',
};

/** The numbered groups of the left panel at a level, with or without a place picked. */
export function inputsFor(level: Level, picked: boolean): InputGroup[] {
  if (level === 'parcel') return picked ? ['site', 'project', 'money', 'open', 'policy'] : ['project', 'finder'];
  return ['project', 'money', 'open', 'policy'];
}

export type Answer = 'need' | 'build' | 'score' | 'pencil' | 'open';

/** The project questions on the right at a level (Tract and ZIP: no tax credit sheet and no pencil). */
export function answersFor(level: Level): Answer[] {
  return level === 'parcel' ? ['build', 'pencil', 'score', 'open'] : ['need', 'build', 'open'];
}

/** Which left group holds the inputs behind a question ("Change … on the left"). */
export const GROUP_OF: Record<Answer | 'setup' | 'policy', InputGroup> = { need: 'project', build: 'site', score: 'money', pencil: 'money', open: 'open', setup: 'project', policy: 'policy' };
