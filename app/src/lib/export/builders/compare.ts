// Comparison report (Analysis > Compare places): both places, the At-a-glance table, what each place would get, why
// they differ (the factor table the screen shows), both map snapshots. Plus the CSV of the At-a-glance rows. Pure: the
// caller hands in the rows the screen computed (components/compare/CompareBlocks glanceRows) and the factor rows.
import { bedroomsWord } from '../../place/bands';
import { capitalize, fmtDollars, fmtHouseholds } from '../../place/format';
import { LEVEL_LABEL, levelPhrase, type PlanLevel } from '../../place/plan';
import type { Recommendation } from '../../place/recommend';
import { STANCE_LABEL, TYPOLOGY_LABEL } from '../../place/thresholds';
import type { Stance, Typology } from '../../place/types';
import type { CsvColumn } from '../csv';
import type { Report, ReportBlock } from '../report';

/** Same shape as CompareBlocks' GlanceRow. */
export interface GlanceLike {
  label: string;
  dir: string;
  kind: 'need' | 'access';
  higherFlagged: boolean;
  a: number | null;
  b: number | null;
  fmt: (v: number) => string;
  na?: string;
  floorZero?: boolean;
  neutral?: boolean;
  unit?: string;
  csvScale?: number;
}

export interface CompareSide {
  name: string;
  geoid: string;
  sub?: string;
  /** Null when the tract has no place measures (a park, a campus, too few households). */
  rec: Recommendation | null;
}

export interface FactorRowText {
  label: string;
  a: string;
  b: string;
  /** Which side the factor favors for the basis type, or null. */
  favors: 'A' | 'B' | null;
}

export interface CompareReportInput {
  a: CompareSide;
  b: CompareSide;
  focus: Stance;
  level: PlanLevel;
  glance: GlanceLike[];
  /** The 2-bedroom rent that fits at the level (one HUD number for the metro). */
  fits: { rent: number; formula: string } | null;
  ami: number;
  /** "Why they differ": the takeaway sentence and the factor rows for the basis type. */
  takeaway?: string;
  /** The plain-sentence rows of "Why they differ" (lib/place/whyDiffer), one sentence per place and topic. */
  why?: { topic: string; a: string | null; b: string | null; both?: string }[];
  basis?: string | null;
  factors?: FactorRowText[];
  typeLabel?: (k: Typology) => string;
  maps?: { a?: string | null; b?: string | null };
  filename?: string;
}

const NA = 'not available';
/** "50% AMI", or "market rate (100% AMI)". */
const fitsWords = (ami: number) => (ami === 100 ? 'market rate (100% AMI)' : `${ami}% AMI`);

export const glanceMark = (r: GlanceLike): 'A' | 'B' | null => {
  if (r.neutral || r.a == null || r.b == null) return null;
  const a = r.floorZero ? Math.max(0, r.a) : r.a,
    b = r.floorZero ? Math.max(0, r.b) : r.b;
  if (r.fmt(a) === r.fmt(b)) return null;
  return a > b === r.higherFlagged ? 'A' : 'B';
};

/** Units for the CSV, from the row's label. */
export function glanceUnit(label: string): string {
  if (/renters|households/i.test(label)) return 'households';
  if (/\brent\b|gap/i.test(label)) return 'USD/month';
  if (/stop/i.test(label)) return 'miles';
  if (/flood/i.test(label)) return '% of land';
  if (/jobs/i.test(label)) return 'jobs';
  if (/services/i.test(label)) return 'places';
  return 'households';
}

const markWord = (r: GlanceLike) => (r.kind === 'need' ? 'more need' : 'better');

/** What one side would get, as label/value rows (the "What each place would get" card). */
export function getsRows(s: CompareSide, level: PlanLevel, typeLabel: (k: Typology) => string): [string, string][] {
  const rec = s.rec;
  if (!rec) return [['Suggested type', 'No place measures for this tract (a park, a campus or too few households), so there is no suggestion.']];
  const lead = rec.types[0] ?? null;
  const marketLed = rec.stance === 'market_led';
  const tenant = rec.tenants.types[0] ?? null;
  const why = !lead ? (rec.stanceTest.passed === false || marketLed ? rec.stanceTest.sentence : rec.band.available ? rec.notServedWhy : rec.band.reason) : null;
  const rows: [string, string][] = [];
  rows.push(['Suggested type', lead ? `${typeLabel(lead.typology)} · ${capitalize(bedroomsWord(lead.bedrooms).replace(/^a /, ''))} homes${marketLed ? ' at market rents' : ''}` : `No suggestion here${why ? ` — ${why}` : ''}`]);
  if (rec.types.length > 1) rows.push(['Also fits', rec.types.slice(1).map((o) => typeLabel(o.typology)).join(', ')]);
  rows.push(['Rent that fits', rec.price ? `${fmtDollars(rec.price.rent)}/month (${bedroomsWord(rec.price.bedrooms, rec.price.seniorAlone)} at the ${rec.price.pct}% AMI limit; ${rec.price.formula})` : 'No HUD rent limit at this level; the market rent is the price.']);
  rows.push([
    'Who it serves',
    marketLed
      ? lead
        ? `${capitalize(rec.headline.split('; serves ')[1] ?? 'households the market price reaches')}.`
        : 'Nobody new without a subsidy.'
      : tenant
        ? `${fmtHouseholds(tenant.count)} ${tenant.label} ${levelPhrase(level)}, the largest group`
        : rec.tenants.sentence,
  ]);
  return rows;
}

export function buildCompareReport(i: CompareReportInput): Report {
  const lbl = i.typeLabel ?? ((k: Typology) => capitalize(TYPOLOGY_LABEL[k]));
  const A = i.a.name, B = i.b.name;
  const blocks: ReportBlock[] = [
    {
      kind: 'kv',
      rows: [
        ['Place A', `${A}${i.a.sub ? ` (${i.a.sub})` : ''}`],
        ['Place B', `${B}${i.b.sub ? ` (${i.b.sub})` : ''}`],
        ['Focusing issue', STANCE_LABEL[i.focus]],
        ['Income level', LEVEL_LABEL[i.level]],
      ],
    },
  ];
  const leadOf = (s: CompareSide) => (s.rec?.types[0] ? lbl(s.rec.types[0].typology) : 'no suggestion');
  blocks.push({ kind: 'callout', text: `Under ${STANCE_LABEL[i.focus]} at ${LEVEL_LABEL[i.level]}: ${A} — ${leadOf(i.a)}; ${B} — ${leadOf(i.b)}.` });

  // 1. At a glance
  blocks.push({ kind: 'heading', text: '1. At a glance' });
  const rows: (string | number)[][] = [];
  i.glance.forEach((r, idx) => {
    if (idx === 3) rows.push([`2-bedroom rent that fits at ${fitsWords(i.ami)}`, i.fits ? `${fmtDollars(i.fits.rent)}/mo` : NA, i.fits ? `${fmtDollars(i.fits.rent)}/mo` : NA, 'same in both (HUD metro limit)']);
    const m = glanceMark(r);
    rows.push([r.label, r.a == null ? r.na ?? NA : r.fmt(r.a), r.b == null ? r.na ?? NA : r.fmt(r.b), m ? `${m} · ${markWord(r)}` : '—', r.dir]);
  });
  blocks.push({
    kind: 'table',
    columns: ['Measure', `A · ${A}`, `B · ${B}`, 'Marks', 'How it reads'],
    rows,
    align: ['left', 'right', 'right', 'left', 'left'],
    note: `Real values, same definitions on both sides.${i.fits ? ` Rent that fits: ${i.fits.formula}.` : ''} Sources: CHAS 2018–22, Dewey listings, HUD FY2026, PRT GTFS, FEMA NFHL, LODES 2023, OpenStreetMap.`,
  });

  // 2. What each place would get
  blocks.push({ kind: 'heading', text: '2. What each place would get' });
  blocks.push({ kind: 'text', text: `The Place tab's suggestion for each side under ${STANCE_LABEL[i.focus]} at ${LEVEL_LABEL[i.level]}: the rules decide the set; the tool does not choose.` });
  for (const [tag, s] of [['A', i.a], ['B', i.b]] as const) {
    blocks.push({ kind: 'heading', text: `${tag} · ${s.name}`, level: 3 });
    blocks.push({ kind: 'table', columns: ['', ''], rows: getsRows(s, i.level, lbl), align: ['left', 'left'] });
  }

  // 3. Why they differ
  if (i.takeaway || i.factors?.length || i.why?.length) {
    blocks.push({ kind: 'heading', text: '3. Why they differ' });
    if (i.why?.length)
      blocks.push({
        kind: 'table',
        columns: ['', `A · ${A}`, `B · ${B}`],
        rows: i.why.flatMap((w) => [[w.topic, w.a ?? '–', w.b ?? '–'], ...(w.both ? [['', w.both, '']] : [])]),
        align: ['left', 'left', 'left'],
      });
    if (i.takeaway) blocks.push({ kind: 'text', text: i.takeaway });
    if (i.factors?.length)
      blocks.push({
        kind: 'table',
        columns: ['Factor', `A · ${A}`, `B · ${B}`, 'Favors'],
        rows: i.factors.map((f) => [f.label, f.a, f.b, f.favors === 'A' ? A : f.favors === 'B' ? B : '—']),
        align: ['left', 'right', 'right', 'left'],
        note: `Factor values as the screen shows them ("higher than N%" of ranked city tracts), ordered by how much each moves the ${i.basis ?? 'top'} match between the two places. They order types; they do not decide.`,
      });
  }

  blocks.push({ kind: 'callout', text: 'You decide: site, scale, sponsor and financing are yours; this report shows the evidence and the arithmetic.' });
  // Maps
  if (i.maps?.a || i.maps?.b) {
    blocks.push({ kind: 'heading', text: 'Maps' });
    if (i.maps.a) blocks.push({ kind: 'image', src: i.maps.a, caption: `A · ${A}: map colored by the suggested type.` });
    if (i.maps.b) blocks.push({ kind: 'image', src: i.maps.b, caption: `B · ${B}: map colored by the suggested type.` });
  }
  return {
    title: `Comparison report: ${A} and ${B}`,
    subtitle: `${STANCE_LABEL[i.focus]} · ${LEVEL_LABEL[i.level]} · census tracts ${i.a.geoid} and ${i.b.geoid}`,
    blocks,
    sources: [
      'HUD CHAS 2018–22 Table 8 and household type × income band (renter households by AMI band, cost burden)',
      'HUD FY2026 income limits and Small Area Fair Market Rents, Pittsburgh HMFA',
      'Dewey listings 2025–26 (median 2-bedroom asking rent; used at medium or high confidence only)',
      'Pittsburgh Regional Transit GTFS, June 2026 weekday schedule (frequent = at least 64 weekday departures)',
      'FEMA National Flood Hazard Layer (special flood hazard area share of land)',
      'LEHD LODES 2023 (jobs within 1 mile) · OpenStreetMap (services within ½ mile)',
      'Suggestion rules: docs/assumptions.md §11 (lib/place/recommend)',
    ],
    filename: i.filename,
  };
}

// ------------------------------------------------------------------ CSV
export const GLANCE_COLUMNS: CsvColumn[] = [
  { key: 'measure', label: 'measure' },
  { key: 'direction', label: 'direction' },
  { key: 'a', label: 'place_a' },
  { key: 'b', label: 'place_b' },
  { key: 'unit', label: 'unit' },
  { key: 'marked', label: 'marked_side' },
  { key: 'a_name', label: 'place_a_name' },
  { key: 'b_name', label: 'place_b_name' },
  { key: 'a_geoid', label: 'place_a_geoid' },
  { key: 'b_geoid', label: 'place_b_geoid' },
];

const round = (v: number | null) => (v == null ? null : Math.round(v * 100) / 100);

export function glanceCsvRows(i: Pick<CompareReportInput, 'a' | 'b' | 'glance' | 'fits' | 'ami'>): Record<string, unknown>[] {
  const base = { a_name: i.a.name, b_name: i.b.name, a_geoid: i.a.geoid, b_geoid: i.b.geoid };
  const out: Record<string, unknown>[] = [];
  i.glance.forEach((r, idx) => {
    if (idx === 3) out.push({ measure: `2-bedroom rent that fits at ${fitsWords(i.ami)}`, direction: 'same in both (HUD metro limit)', a: i.fits?.rent ?? null, b: i.fits?.rent ?? null, unit: 'USD/month', marked: '', ...base });
    const m = glanceMark(r);
    const k = r.csvScale ?? 1;
    out.push({ measure: r.label, direction: r.dir, a: round(r.a == null ? null : r.a * k), b: round(r.b == null ? null : r.b * k), unit: r.unit ?? glanceUnit(r.label), marked: m ? `${m} (${markWord(r)})` : '', ...base });
  });
  return out;
}
