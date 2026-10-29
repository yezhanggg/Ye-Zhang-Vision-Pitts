// The three levels of Analysis > Place (Ye, 2026-10-27): the same project inputs at every level (type, units, income,
// mix, capital, open space, policies, what to study); Capital and Open space can be turned off; a parcel reads them on the lot picked, a tract on its typical lot, a ZIP code
// across its tracts. What each level asks for on the left, as a table, so the panels stay in step.
// Online only: loaded on demand.
import type { PlaceArea } from '../../../lib/place/zipView';

export type Level = PlaceArea;

export const LEVELS: { id: Level; label: string; line: string }[] = [
  { id: 'parcel', label: 'Parcel', line: 'Test the project on one real lot.' },
  { id: 'tract', label: 'Tract', line: 'Test it in a neighborhood, on its typical lot.' },
  { id: 'zip', label: 'ZIP code', line: "Test it across a ZIP code's tracts." },
];

export type InputGroup = 'who' | 'project' | 'money' | 'open' | 'policy' | 'study' | 'finder';

export const INPUT_TITLE: Record<InputGroup, string> = {
  who: "Who it's for",
  project: 'Project',
  money: 'Capital',
  open: 'Open space',
  policy: 'Policies',
  study: 'I want to study',
  finder: 'Find places for this project',
};

/** The numbered groups of the left panel at a level, with or without a place picked. */
export function inputsFor(level: Level, picked: boolean): InputGroup[] {
  // The Parcel level's lot (Site) shows on the right, with its zoning (LotZoning), in Browse and in Test.
  if (level === 'parcel') return picked ? ['project', 'money', 'open', 'policy', 'study'] : ['project', 'finder'];
  return ['project', 'money', 'open', 'policy', 'study'];
}

export type Answer = 'need' | 'build' | 'score' | 'pencil' | 'open';

/** The project questions on the right at a level (Tract and ZIP: no tax credit sheet and no pencil). */
export function answersFor(level: Level): Answer[] {
  return level === 'parcel' ? ['build', 'pencil', 'score', 'open'] : ['need', 'build', 'open'];
}

/** Which left group holds the inputs behind a question ("Change … on the left"). */
export const GROUP_OF: Record<Answer | 'setup' | 'policy', InputGroup> = { need: 'project', build: 'project', score: 'money', pencil: 'money', open: 'open', setup: 'project', policy: 'policy' };
