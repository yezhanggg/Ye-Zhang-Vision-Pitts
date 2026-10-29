// The project in a place's PDF and CSV (lib/export/builders/place `placeExtra`). Tract level: the setup, the three
// financing paths, PHFA points against the minimum, PHFA's next dates and the screening stamp. Parcel level
// (capitalReport): the setup, the zoning reading and the simple pro forma. Built from the same model the project
// card shows; loaded only with the card, so the offline single file carries none of it. capitalReport serves the
// Parcel and Tract levels' card (place/levels): it leads with the project, its verdict and inputs.
import type { MeasureRow } from '../export/builders/place';
import type { ReportBlock } from '../export/report';
import type { Branch } from '../pencil/inputs';
import { SHEET_FILE } from '../lihtc/sheetState';
import type { ProjectMix } from './plan';
import { comparePaths, LEAD_RULE, PATH_LABEL, type PathRow } from './paths';
import type { ProjectBase } from './model';
import { closesWords, LIMIT_WORD, TIER_WORD } from './size';
import { SCREENING_NOTE, stamp } from './stamp';
import type { CapitalRun } from './capital';

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

export interface CapitalReportInput {
  geoid: string;
  name: string;
  /** The lot's label, when a county lot is picked. */
  lot: string | null;
  /** Where the project is read: the lot picked, or a typical lot in the tract. */
  site: string;
  typeLabel: string;
  housing: boolean;
  units: number;
  stories: number | null;
  /** The left panel's inputs in words, in its order. */
  inputs: [string, string][];
  /** The unit mix: units by income level and size (studio, 1, 2, 3+ bedrooms). */
  mix: { level: string; row: number[] }[];
  /** The review: its verdict, the reason, every finding and the fixes it offers. */
  verdict: string;
  line: string;
  findings: { tone: string; title: string; text: string }[];
  fixes: string[];
  zoning: { verdict: string; district: string | null };
  /** The tax credit self-score (tax credit paths): now, PHFA's minimum, and the best case. */
  score: { total: number; max: number; threshold: number | null; high: number } | null;
  run: CapitalRun;
}

const money = (v: number) => `${v < 0 ? '−' : ''}$${Math.abs(Math.round(v)).toLocaleString('en-US')}`;

const SIZES = ['Studio', '1BR', '2BR', '3BR+'];
const TONE_WORD: Record<string, string> = { stop: 'Does not meet it', warn: 'Watch', info: 'To know', ok: 'Meets it' };

/** The project at the Parcel and Tract levels in the PDF and CSV: the project tested first (its verdict and why, the
 *  inputs, the unit mix with its rents), then the review's findings and fixes, the tax credit score and the simple pro
 *  forma (lib/pencil/simple), the same numbers the card shows. Commercial gets the zoning reading only. */
export function capitalReport(i: CapitalReportInput): { blocks: ReportBlock[]; rows: MeasureRow[] } {
  const r = i.run.result;
  const rents = i.housing ? (i.run.rents ?? []).filter((x) => x.units > 0) : [];
  const mixRows = i.mix.filter((m) => m.row.some((n) => n > 0));
  const sc = i.score;
  const scoreWords = sc ? `${sc.total} of ${sc.max} points${sc.threshold != null ? `; PHFA's minimum ${sc.threshold}; at best ${sc.high} with every design and financing choice` : ''}` : null;
  const blocks: ReportBlock[] = [
    { kind: 'heading', text: `The project tested: ${i.typeLabel}${i.housing ? `, ${i.units} units` : ''}` },
    { kind: 'callout', text: `${i.verdict}. ${i.line}` },
    { kind: 'kv', rows: [['Site', i.site], ...i.inputs] },
  ];
  if (rents.length) blocks.push({ kind: 'table', columns: ['Unit', 'Units', 'Rent a month', 'Where it comes from'], rows: rents.map((x) => [`${SIZES[x.br]}, ${x.level === 'mkt' ? 'market' : `${x.level}% AMI`}`, x.units, money(x.rent), x.source]), align: ['left', 'right', 'right', 'left'] });
  else if (mixRows.length) blocks.push({ kind: 'table', columns: ['Income level', ...SIZES], rows: mixRows.map((m) => [m.level, ...m.row]), align: ['left', 'right', 'right', 'right', 'right'] });
  blocks.push(
    { kind: 'heading', text: 'Project review', level: 3 },
    { kind: 'list', items: [...i.findings.map((f) => `${TONE_WORD[f.tone] ?? f.tone} · ${f.title}: ${f.text}`), 'A reading of the zoning code and public data, not a zoning determination or a market study: confirm with the Zoning Administrator.'] },
  );
  if (i.fixes.length) blocks.push({ kind: 'heading', text: 'Try', level: 3 }, { kind: 'list', items: i.fixes });
  if (scoreWords) blocks.push({ kind: 'kv', rows: [['Tax credit score', scoreWords]] });
  const base = { geoid: i.geoid, place: i.name, section: 'Project', moe: null };
  const RULES = 'project review (rules)';
  const rows: MeasureRow[] = [
    { ...base, measure: 'Verdict', value: i.verdict, unit: '', source: RULES },
    { ...base, measure: 'Verdict reason', value: i.line, unit: '', source: RULES },
    { ...base, measure: 'Site', value: i.site, unit: '', source: i.lot ? 'county lot files' : 'typical lot in the tract' },
    ...i.inputs.map(([k, v]): MeasureRow => ({ ...base, measure: `Input: ${k}`, value: v, unit: '', source: 'your entry or suggested' })),
    { ...base, measure: 'Zoning district', value: i.zoning.district ?? 'not read', unit: '', source: 'City zoning districts (WPRDC)' },
    { ...base, measure: 'Zoning reading', value: i.zoning.verdict, unit: '', source: 'Title Nine, read here' },
    ...mixRows.flatMap((m) => m.row.map((n, br): MeasureRow | null => (n > 0 ? { ...base, measure: `Unit mix: ${m.level}, ${SIZES[br]}`, value: n, unit: 'units', source: 'your entry or suggested' } : null)).filter((x): x is MeasureRow => x != null)),
    ...rents.map((x): MeasureRow => ({ ...base, measure: `Rent a month: ${SIZES[x.br]}, ${x.level === 'mkt' ? 'market' : `${x.level}% AMI`}`, value: Math.round(x.rent), unit: 'dollars a month', source: x.source })),
    ...(sc ? [
      { ...base, measure: 'Tax credit score', value: sc.total, unit: 'points', source: `self-score, of ${sc.max}` },
      { ...base, measure: "Tax credit score: PHFA's minimum", value: sc.threshold, unit: 'points', source: 'PHFA score sheet' },
      { ...base, measure: 'Tax credit score: best case', value: sc.high, unit: 'points', source: 'every design and financing line at its top' },
    ] : []),
    ...i.findings.map((f): MeasureRow => ({ ...base, measure: `Review: ${f.title}`, value: f.text, unit: f.tone, source: RULES })),
    ...i.fixes.map((f, k): MeasureRow => ({ ...base, measure: `Try ${k + 1}`, value: f, unit: '', source: RULES })),
  ];
  if (!i.housing || i.units <= 0) return { blocks, rows };
  const y1 = r.years[0];
  blocks.push(
    { kind: 'heading', text: 'Capital: a simple pro forma', level: 3 },
    { kind: 'table', columns: ['Uses', 'Amount', 'How'], rows: [...r.uses.map((u) => [u.label, money(u.value), u.formula]), ['Total', money(r.total), '']], align: ['left', 'right', 'left'] },
    { kind: 'table', columns: ['Sources', 'Amount', 'How'], rows: r.sources.map((s) => [s.label, money(s.value), s.formula]), align: ['left', 'right', 'left'] },
    {
      kind: 'table',
      columns: ['Year', 'Revenue', 'Expenses', 'NOI', 'Debt service', 'DSCR', 'Cash flow'],
      rows: r.years.map((v, n) => [String(n + 1), money(v.revenue), money(v.expense), money(v.noi), money(v.debtService), Number.isFinite(v.dscr) ? v.dscr.toFixed(2) : '—', money(v.cashFlow)]),
      align: ['left', 'right', 'right', 'right', 'right', 'right', 'right'],
      note: 'Revenue is the unit mix’s rent after vacancy.',
    },
    r.saleCounted
      ? { kind: 'kv', rows: [['Sale in year 7', `${money(r.salePrice)} (year-7 NOI ÷ ${+(i.run.inputs.exitCap * 100).toFixed(2)}% cap)`], ['Net of the loan', money(r.netSale)], ['Developer equity', money(Math.max(0, r.developerEquity))], ['Developer gets back', `${money(r.developerReturn)} (cash flow + net sale + fee paid)`], ['Multiple of equity', r.multiple == null ? 'no equity put in' : `${r.multiple.toFixed(2)}×`]] }
      : { kind: 'kv', rows: [['Gap to fill', r.gap > 0.5 ? money(r.gap) : 'none'], ['Cash flow over the years shown', money(r.years.reduce((t, y) => t + y.cashFlow, 0))]] },
    { kind: 'text', text: 'Arithmetic on your inputs and suggested values, not an underwriting.' },
  );
  const src = 'simple pro forma on suggested and your inputs';
  rows.push(
    { ...base, measure: 'Total development cost', value: Math.round(r.total), unit: 'dollars', source: src },
    ...r.sources.map((s): MeasureRow => ({ ...base, measure: `Source: ${s.label}`, value: Math.round(s.value), unit: 'dollars', source: src })),
    { ...base, measure: 'Net operating income, year 1', value: Math.round(y1.noi), unit: 'dollars', source: src },
    { ...base, measure: 'Debt service coverage, year 1', value: Number.isFinite(y1.dscr) ? +y1.dscr.toFixed(2) : null, unit: 'ratio', source: src },
    ...(r.saleCounted
      ? [
          { ...base, measure: 'Sale price, year 7', value: Math.round(r.salePrice), unit: 'dollars', source: src },
          { ...base, measure: 'Multiple of developer equity', value: r.multiple == null ? 'no equity put in' : +r.multiple.toFixed(2), unit: r.multiple == null ? '' : 'ratio', source: src },
        ]
      : r.sources.some((x) => x.label === 'Gap to fill') ? [] : [{ ...base, measure: 'Gap to fill', value: Math.round(r.gap), unit: 'dollars', source: src }]),
  );
  return { blocks, rows };
}
