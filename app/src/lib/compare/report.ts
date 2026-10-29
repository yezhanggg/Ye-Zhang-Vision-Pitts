// The Compare places export, in the screen's order (online only; the offline file keeps lib/export/builders/compare
// as it is). The PDF opens with section 1, "The project in each place" (verdicts, zoning, size, capital, tax credits,
// the capital stacks, the renters who qualify and the checks that differ), then At a glance, What each place would get
// and Why they differ, numbered as on screen, with a line saying whose reading it is. The CSV carries the same
// project rows first, then the At-a-glance rows, each with its source and years.
import { glanceMark, glanceUnit, type CompareReportInput, type GlanceLike } from '../export/builders/compare';
import type { CsvColumn } from '../export/csv';
import type { Report, ReportBlock } from '../export/report';
import type { ProjectRows } from './store';

/** Whose reading this is: the tool's, from public data; never the City's. */
export const READING = "VisionPitts' reading of public data. Not a City of Pittsburgh document or decision.";

const PROJECT_SOURCE = 'VisionPitts project read: zoning code check, simple pro forma and review, on each side’s settings';

/** Where an At-a-glance row comes from, and its years. */
export function glanceSource(label: string): [string, string] {
  if (/renter households|burdened/i.test(label)) return ['HUD CHAS Table 8', '2018–22'];
  if (/asking rent/i.test(label)) return ['Dewey rental listings (median 2-bedroom asking rent)', '2025–26'];
  if (/rent that fits/i.test(label)) return ['HUD income limits, Pittsburgh HMFA', 'FY2026'];
  if (/rent gap/i.test(label)) return ['Dewey rental listings; HUD income limits', '2025–26; FY2026'];
  if (/frequent stop/i.test(label)) return ['Pittsburgh Regional Transit GTFS', 'June 2026 feed'];
  if (/flood/i.test(label)) return ['FEMA National Flood Hazard Layer', 'effective as of Sept. 2026'];
  if (/jobs/i.test(label)) return ['LEHD LODES 8 workplace jobs', '2023'];
  if (/services/i.test(label)) return ['OpenStreetMap everyday services', 'July 2026'];
  if (/zoned/i.test(label)) return ['City of Pittsburgh zoning districts (WPRDC)', 'Sept. 2026'];
  if (/land/i.test(label)) return ['Allegheny County property assessments (WPRDC)', '2026'];
  return ['', ''];
}

/** "1. At a glance" → "2. At a glance": the report's sections move down one for the project section. */
const renumber = (b: ReportBlock): ReportBlock => (b.kind === 'heading' && /^\d+\. /.test(b.text) ? { ...b, text: b.text.replace(/^(\d+)\. /, (_, n) => `${Number(n) + 1}. `) } : b);

/** The comparison report in the screen's order: the project in each place first. */
export function followScreen(r: Report, read: ProjectRows, a: string, b: string): Report {
  const blocks = r.blocks.map(renumber);
  const first = blocks.findIndex((x) => x.kind === 'heading' && /^2\. /.test(x.text));
  const project: ReportBlock[] = read.rows.length
    ? [
        { kind: 'heading', text: '1. The project in each place' },
        ...(read.answer ? [{ kind: 'callout' as const, text: read.answer }] : []),
        { kind: 'table', columns: ['', `A · ${a}`, `B · ${b}`], rows: read.rows, align: ['left', 'left', 'left'], note: 'Each side’s project on a lot of the size it needs, in a district there that allows it, as on screen. Example cost inputs are labeled on the Place tab.' },
      ]
    : [];
  blocks.splice(first < 0 ? blocks.length : first, 0, ...project);
  blocks.unshift({ kind: 'text', text: READING });
  return { ...r, blocks, sources: [PROJECT_SOURCE, ...(r.sources ?? [])] };
}

// ------------------------------------------------------------------ CSV
export const COMPARE_COLUMNS: CsvColumn[] = [
  { key: 'section', label: 'section' },
  { key: 'measure', label: 'measure' },
  { key: 'a', label: 'place_a' },
  { key: 'b', label: 'place_b' },
  { key: 'unit', label: 'unit' },
  { key: 'direction', label: 'direction' },
  { key: 'marked', label: 'marked_side' },
  { key: 'source', label: 'source' },
  { key: 'years', label: 'years' },
  { key: 'a_name', label: 'place_a_name' },
  { key: 'b_name', label: 'place_b_name' },
  { key: 'a_geoid', label: 'place_a_geoid' },
  { key: 'b_geoid', label: 'place_b_geoid' },
];

const round = (v: number | null) => (v == null ? null : Math.round(v * 100) / 100);
const fitsWords = (ami: number) => (ami === 100 ? 'market rate (100% AMI)' : `${ami}% AMI`);
const markWord = (r: GlanceLike) => (r.kind === 'need' ? 'more need' : 'better');

/** The project rows (as on screen), then the At-a-glance rows, each with its source and years. */
export function compareCsvRows(i: Pick<CompareReportInput, 'a' | 'b' | 'glance' | 'fits' | 'ami'>, read: ProjectRows): Record<string, unknown>[] {
  const base = { a_name: i.a.name, b_name: i.b.name, a_geoid: i.a.geoid, b_geoid: i.b.geoid };
  const out: Record<string, unknown>[] = read.rows.map(([measure, a, b]) => ({ section: 'The project in each place', measure, a, b, unit: 'words', direction: '', marked: '', source: PROJECT_SOURCE, years: 'as of today', ...base }));
  i.glance.forEach((r, idx) => {
    if (idx === 3) {
      const [source, years] = glanceSource('rent that fits');
      out.push({ section: 'At a glance', measure: `2-bedroom rent that fits at ${fitsWords(i.ami)}`, a: i.fits?.rent ?? null, b: i.fits?.rent ?? null, unit: 'USD/month', direction: 'same in both (HUD metro limit)', marked: '', source, years, ...base });
    }
    const m = glanceMark(r);
    const k = r.csvScale ?? 1;
    const [source, years] = glanceSource(r.label);
    out.push({ section: 'At a glance', measure: r.label, a: round(r.a == null ? null : r.a * k), b: round(r.b == null ? null : r.b * k), unit: r.unit ?? glanceUnit(r.label), direction: r.dir, marked: m ? `${m} (${markWord(r)})` : '', source, years, ...base });
  });
  return out;
}
