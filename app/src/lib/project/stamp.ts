// When a project was screened and how old its data is, for the project card, Find places and the place export: the
// screening date is today; the data date is the oldest of the files the project reads (demand, pencil defaults, the
// tax credit sheet).
import { DEMAND } from '../demand/data';
import { SHEET_FILE } from '../lihtc/sheetState';
import { DEFAULTS } from '../pencil/inputs';

export const SCREENING_NOTE = 'Screening estimate, not a commitment of funds.';

export function dataBuilt(): string {
  return [DEMAND.built, DEFAULTS.read_on, SHEET_FILE.retrieved].filter(Boolean).sort()[0] ?? '';
}

const day = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
export const dateWords = day;

/** "Screened Oct 20, 2026 · data from Oct 11, 2026". */
export function stamp(today: Date = new Date()): string {
  const t = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const b = dataBuilt();
  return `Screened ${day(t)}${b ? ` · data from ${day(b)}` : ''}`;
}
