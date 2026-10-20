// The project in a place's PDF and CSV (lib/export/builders/place `placeExtra`): the setup, the three financing paths,
// PHFA points against the minimum, PHFA's next dates and the screening stamp. Built from the same model the project
// card shows; loaded only with the card, so the offline single file carries none of it.
import type { MeasureRow } from '../export/builders/place';
import type { ReportBlock } from '../export/report';
import type { Branch } from '../pencil/inputs';
import { SHEET_FILE } from '../lihtc/sheetState';
import type { ProjectMix } from './plan';
import { comparePaths, LEAD_RULE, PATH_LABEL, type PathRow } from './paths';
import type { ProjectBase } from './model';
import { closesWords, LIMIT_WORD, TIER_WORD } from './size';
import { SCREENING_NOTE, stamp } from './stamp';

export interface ProjectReportInput {
  base: ProjectBase;
  name: string;
  mix: ProjectMix;
  stories: number | null;
  branch: Branch;
  /** One-line words for a size's result (components/place/project/summary sizeWords). */
  words: (row: PathRow['yours']) => string;
  points: (p: NonNullable<PathRow['points']>) => string;
}

const AWARD = 'Chance of award is not modeled: PHFA does not publish past scores.';

export function projectReport(i: ProjectReportInput): { blocks: ReportBlock[]; rows: MeasureRow[] } {
  const paths = comparePaths(i.base, i.mix.homes, i.stories);
  const dates = SHEET_FILE.dates;
  const blocks: ReportBlock[] = [
    { kind: 'heading', text: 'The project tested here' },
    { kind: 'text', text: `${stamp()}. ${SCREENING_NOTE}` },
    { kind: 'kv', rows: [['Homes', `${i.mix.homes}${i.mix.example ? ' (example)' : ''}`], ['Stories', i.stories == null ? 'not set' : String(i.stories)], ['Financing in use', PATH_LABEL[i.branch]]] },
    { kind: 'heading', text: 'Three ways to pay for it', level: 3 },
    {
      kind: 'table',
      columns: ['Path', `At ${i.mix.homes} homes`, 'Sizes that close', 'PHFA points'],
      rows: paths.map((p) => [PATH_LABEL[p.branch], `${TIER_WORD[p.yours.tier]}: ${i.words(p.yours)}`, `${closesWords(p.sweep)}${p.sweep.rightSize != null ? `; largest ${p.sweep.rightSize} (${LIMIT_WORD[p.sweep.limit]})` : ''}`, p.points ? i.points(p.points) : '—']),
      align: ['left', 'left', 'left', 'left'],
      note: `${LEAD_RULE} ${AWARD}`,
    },
  ];
  if (dates) blocks.push({ kind: 'heading', text: 'PHFA key dates', level: 3 }, { kind: 'list', items: [...dates.items.map((d) => `${d.date ?? 'Rule'}: ${d.label}; ${d.note} (${d.ref})`), `Checked ${dates.checked}. ${dates.status}`] });

  const base = { geoid: i.base.geoid, place: i.name, section: 'Project', moe: null };
  const rows: MeasureRow[] = [
    { ...base, measure: 'Homes tested', value: i.mix.homes, unit: 'homes', source: i.mix.example ? 'example' : 'your entry' },
    { ...base, measure: 'Financing in use', value: PATH_LABEL[i.branch], unit: '', source: 'your entry' },
    ...paths.flatMap((p): MeasureRow[] => [
      { ...base, measure: `${PATH_LABEL[p.branch]}: result at ${i.mix.homes} homes`, value: TIER_WORD[p.yours.tier], unit: '', source: 'pencil on example and your inputs' },
      { ...base, measure: `${PATH_LABEL[p.branch]}: gap before deferring fee`, value: Math.round(p.yours.gap), unit: 'dollars', source: 'pencil on example and your inputs' },
      { ...base, measure: `${PATH_LABEL[p.branch]}: largest size that closes`, value: p.sweep.rightSize, unit: 'homes', source: closesWords(p.sweep) },
      ...(p.points ? [{ ...base, measure: `${PATH_LABEL[p.branch]}: PHFA points`, value: p.points.total, unit: 'points', source: `range ${p.points.low}–${p.points.high}; minimum ${p.points.threshold ?? 'none'}; self-score` }] : []),
    ]),
  ];
  return { blocks, rows };
}
