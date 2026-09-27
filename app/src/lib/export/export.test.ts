import { describe, expect, it } from 'vitest';
import { exportFilename, slugify, toCsv } from './csv';
import { renderReportHtml, isNumericCell, type Report } from './report';
import { buildPlaceReport, placeMeasureRows, MEASURE_COLUMNS, zoningPercents } from './builders/place';
import { buildCompareReport, glanceCsvRows, glanceUnit, type GlanceLike } from './builders/compare';
import { buildLayerReport, buildPlaceProfileReport, csvValue, layerCsvRows, noScoreSuffix, profileCsvRows, topBottomUnits, type LayerReportInput } from './builders/layer';
import { FIXTURE_HUD as hud, HAZELWOOD, SQUIRREL_HILL_NORTH } from '../place/fixture';
import { suggestAll } from '../place/suggest';
import { PLAN_DEFAULTS } from '../place/planStore';

const BOM = '﻿';
const plan = { ...PLAN_DEFAULTS };
const recs = suggestAll(new Map([['a', HAZELWOOD], ['b', SQUIRREL_HILL_NORTH]]), hud, plan.focus, plan);
const tract = { GEOID: '42003562300', name: 'Tract 5623', neighborhood: 'Hazelwood', age65_share: 0.25, mva21: 'H', watch_list: true };

const allText = (r: Report) => JSON.stringify(r.blocks) + r.title + (r.subtitle ?? '');

describe('toCsv', () => {
  it('starts with a BOM, uses CRLF and quotes per RFC 4180', () => {
    const csv = toCsv([{ a: 'plain', b: 'has, comma', c: 'say "hi"', d: 'two\nlines' }, { a: null, b: 3.5, c: true, d: undefined }], [
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B, label' },
      { key: 'c', label: 'C' },
      { key: 'd', label: 'D' },
    ]);
    expect(csv.startsWith(BOM)).toBe(true);
    const body = csv.slice(1);
    expect(body).toBe('A,"B, label",C,D\r\nplain,"has, comma","say ""hi""","two\nlines"\r\n,3.5,yes,\r\n');
  });
  it('never writes JSON blobs and applies column formatters', () => {
    const csv = toCsv([{ o: { x: 1 }, n: 1234.5 }], [{ key: 'o', label: 'o' }, { key: 'n', label: 'n', format: (v) => `$${v}` }]);
    expect(csv).not.toContain('{');
    expect(csv).toContain('$1234.5');
  });
  it('names files visionpitts-{kind}-{slug}-{date}', () => {
    expect(exportFilename('place', 'Squirrel Hill North', 'csv', new Date(2026, 8, 27))).toBe('visionpitts-place-squirrel-hill-north-2026-09-27.csv');
    expect(slugify('Hazelwood vs Café & Co.')).toBe('hazelwood-vs-cafe-and-co');
  });
});

describe('renderReportHtml', () => {
  it('escapes text, right-aligns numeric columns and prints the footer', () => {
    const html = renderReportHtml({ title: 'A <b>', blocks: [{ kind: 'table', columns: ['Name', 'Value'], rows: [['x', '$1,200'], ['y', 3]] }], sources: ['S1'] }, new Date(2026, 8, 27));
    expect(html).toContain('A &lt;b&gt;');
    expect(html).toContain('<td class="right">$1,200</td>');
    expect(html).toContain('evidence, not a decision — decisions belong to people');
    expect(html).toContain('City of Pittsburgh');
    expect(html).toContain('September 27, 2026');
    expect(isNumericCell('±171')).toBe(false);
    expect(isNumericCell('12.5%')).toBe(true);
  });
});

describe('buildPlaceReport', () => {
  const rec = recs.get('a')!;
  const r = buildPlaceReport({ t: tract, place: HAZELWOOD, hud, rec, plan });
  it('has the inputs, the answer, the evidence tables and You decide', () => {
    const text = allText(r);
    expect(r.title).toBe('Place report: Hazelwood');
    for (const s of ['Planning inputs', 'The answer', 'Affordability by income band', 'Who lives here', 'Market rent and home values', 'Transit and access', 'Flood', 'Zoning and programs', 'You decide', 'Rent that fits', '× 30% ÷ 12']) expect(text).toContain(s);
    expect(r.sources?.length).toBeGreaterThan(5);
  });
  it('shows values, never scores out of 100', () => {
    expect(allText(r)).not.toMatch(/\/\s*100/);
  });
  it('writes one CSV row per measure with units and sources', () => {
    const rows = placeMeasureRows(tract, HAZELWOOD, hud);
    expect(rows.length).toBeGreaterThan(40);
    expect(rows.every((x) => x.unit && x.source && x.section)).toBe(true);
    const csv = toCsv(rows as unknown as Record<string, unknown>[], MEASURE_COLUMNS);
    expect(csv.split('\r\n')[0]).toBe(`${BOM}geoid,place,section,measure,value,unit,margin_of_error,source`);
    expect(csv).not.toContain('[object');
  });
  it('reads zoning shares as fractions or percents', () => {
    expect(zoningPercents({ R1D: 0.6, LNC: 0.4 })[0]).toEqual(['R1D', 60]);
    expect(zoningPercents({ R1D: 60, LNC: 40 })[0]).toEqual(['R1D', 60]);
  });
});

describe('buildCompareReport', () => {
  const glance: GlanceLike[] = [
    { label: 'Renter households at or below 50% AMI', dir: 'more = more need', kind: 'need', higherFlagged: true, a: 590, b: 165, fmt: (v) => String(v) },
    { label: 'Burdened renters', dir: 'more = more need', kind: 'need', higherFlagged: true, a: 460, b: 130, fmt: (v) => String(v) },
    { label: '2-bedroom asking rent', dir: 'higher = harder to afford', kind: 'need', higherFlagged: true, a: 1150, b: null, fmt: (v) => `$${v}/mo`, na: 'too few listings' },
    { label: 'Rent gap at 50% AMI (asking − fits)', dir: 'bigger = more need', kind: 'need', higherFlagged: true, a: -92, b: null, fmt: (v) => `$${v}/mo` },
    { label: 'Nearest frequent stop', dir: 'closer = better access', kind: 'access', higherFlagged: false, a: 0.22, b: 0.14, fmt: (v) => `${v} mi` },
  ];
  const input = { a: { name: 'Hazelwood', geoid: 'a', rec: recs.get('a')! }, b: { name: 'Squirrel Hill North', geoid: 'b', rec: recs.get('b')! }, focus: plan.focus, level: plan.level, glance, fits: { rent: 1242, formula: '$49,700 × 30% ÷ 12 = $1,242' }, ami: 50, factors: [{ label: 'Transit access', a: 'higher than 60%', b: 'higher than 54%', favors: 'A' as const }] };
  it('has both places, the glance table with the fits row, what each gets and why', () => {
    const r = buildCompareReport(input);
    const text = allText(r);
    for (const s of ['Hazelwood', 'Squirrel Hill North', '1. At a glance', '2. What each place would get', '3. Why they differ', '2-bedroom rent that fits at 50% AMI', 'too few listings']) expect(text).toContain(s);
    const table = r.blocks.find((b) => b.kind === 'table' && b.columns[0] === 'Measure');
    expect(table && table.kind === 'table' && table.rows.length).toBe(6);
  });
  it('CSV has A and B columns with units', () => {
    const rows = glanceCsvRows(input);
    expect(rows[0]).toMatchObject({ a: 590, b: 165, unit: 'households', marked: 'A (more need)' });
    expect(rows[5]).toMatchObject({ unit: 'miles', marked: 'B (better)' });
    expect(glanceUnit('Rent gap at 50% AMI (asking − fits)')).toBe('USD/month');
  });
});

describe('buildLayerReport', () => {
  const units = Array.from({ length: 25 }, (_, i) => ({ geoid: `g${String(i).padStart(2, '0')}`, name: `Unit ${i}`, est: i === 3 ? null : i * 100, moe: 10 }));
  const input: LayerReportInput = {
    variable: { id: 'med_gross_rent', label: 'Median gross rent', unit: 'usd', description: 'Median gross rent.', table_id: 'B25064', group: 'Rent' },
    level: { one: 'Census tract', many: 'tracts' },
    units,
    fmt: (v) => (v == null ? '—' : `$${v}`),
    fmtMoe: (v) => `$${v}`,
    legend: [{ color: '#eee', label: '$0 or less', count: 1 }],
    city: 1261,
    county: 1153,
    sources: ['ACS B25064'],
  };
  it('has definition, legend, reference values and top and bottom 10', () => {
    const r = buildLayerReport(input);
    const text = allText(r);
    for (const s of ['Median gross rent.', 'Legend', 'City of Pittsburgh', '$1261', 'Highest 10', 'Lowest 10']) expect(text).toContain(s);
    const tb = topBottomUnits(units, 10);
    expect(tb.top[0].est).toBe(2400);
    expect(tb.bottom[0].est).toBe(0);
  });
  it('drops ranking tables for class layers and "/ 100" from scores', () => {
    const r = buildLayerReport({ ...input, variable: { ...input.variable, unit: 'class' } });
    expect(allText(r)).not.toContain('Highest 10');
    expect(noScoreSuffix('72 / 100')).toBe('72');
  });
  it('CSV: one row per unit shown, with MOE and unit, shares as percents', () => {
    const rows = layerCsvRows(input);
    expect(rows).toHaveLength(25);
    expect(rows[3]).toMatchObject({ value: null, label: '' });
    expect(rows[1]).toMatchObject({ value: 100, moe: 10, unit: 'USD', source: 'ACS B25064' });
    expect(csvValue(0.4231, 'share')).toEqual({ value: 42.31, unit: '%' });
  });
  it('place profile groups every variable against the city and county', () => {
    const vars = [{ group: 'Rent', id: 'r', label: 'Median rent', unit: 'usd' as const, est: 644, moe: 271, city: 1261, county: 1153, text: '$644', moeText: '$271', cityText: '$1,261', countyText: '$1,153', source: 'ACS B25064' }];
    const r = buildPlaceProfileReport({ name: 'Hazelwood', geoid: 'g', levelOne: 'Census tract', vars, sources: ['ACS'] });
    expect(allText(r)).toContain('$1,261');
    expect(profileCsvRows({ name: 'Hazelwood', geoid: 'g', vars })[0]).toMatchObject({ value: 644, city: 1261, unit: 'USD' });
  });
});
