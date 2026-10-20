// The tax credit sheet for one place as the Place page and Compare places read it: the sheet chosen, the person's
// entries for the place, the lines the project's mix and pencil answer, and the score. One function so both pages
// show the same total.
import sheetJson from '../../data/lazy/lihtc_pa.json';
import type { PlaceMeasures } from '../place/types';
import { autoAnswers, mergeAnswers, type PlanAnswer, type PlanFacts } from './fromPlan';
import { evidenceFor, factsFor } from './place';
import { scoreSheet, type Answers, type Facts, type Score, type Sheet, type SheetFile } from './score';
import { answersFor, type Entries } from './store';

export const SHEET_FILE = sheetJson as unknown as SheetFile;

export interface SheetState {
  sheet: Sheet;
  setup: Entries['setup'];
  facts: Facts;
  evidence: Record<string, string>;
  typed: Answers;
  auto: Record<string, PlanAnswer>;
  answers: Answers;
  score: Score;
}

export function sheetState(entries: Entries, geoid: string, place: PlaceMeasures, plan: PlanFacts | null, extraEvidence?: Record<string, string>): SheetState {
  const sheet = SHEET_FILE.sheets.find((s) => s.id === entries.sheet) ?? SHEET_FILE.sheets[0];
  const setup = entries.setup;
  const facts = factsFor(geoid);
  const evidence = { ...evidenceFor(geoid, place), ...(extraEvidence ?? {}) };
  const typed = answersFor(entries, sheet.id, geoid);
  const auto = plan ? autoAnswers(sheet, setup, plan) : {};
  const answers = mergeAnswers(auto, typed);
  return { sheet, setup, facts, evidence, typed, auto, answers, score: scoreSheet(sheet, setup, answers, facts) };
}
