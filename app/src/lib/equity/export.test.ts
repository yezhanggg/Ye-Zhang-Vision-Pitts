import { describe, expect, it } from 'vitest';
import { toCsv } from '../export/csv';
import type { HudTable, PlaceMeasures } from '../place/types';
import { measureById } from './measures';
import type { AduResult } from './policy';
import {
  POLICY_COLUMNS,
  buildEquityReport,
  compactDollars,
  equityFacts,
  equityPrompts,
  leverSummaries,
  listNames,
  measureColumns,
  measureRows,
  policyRows,
  type LeverId,
  type PolicyResults,
} from './export';

const HUD: HudTable = {
  metro: {
    name: 'test',
    fy: 2026,
    median: 110400,
    il30: [23200, 26500, 29800, 33100, 38680, 44360, 50040, 55720],
    il50: [38650, 44200, 49700, 55200, 59650, 64050, 68450, 72900],
    il80: [61850, 70650, 79500, 88300, 95400, 102450, 109500, 116600],
    fmr: [1001, 1077, 1299, 1661, 1789],
  },
  safmr: {},
};

const NAMES: Record<string, string> = { a: 'Alpha', b: 'Beta', c: 'Gamma', d: 'Alpha' };
const nameOf = (id: string) => NAMES[id] ?? id;
const info = (id: string) => ({ geoid: id, neighborhood: nameOf(id), tract: `Tract ${id}` });

const adu: AduResult = { before: [], after: ['a', 'b', 'c'], changed: ['a', 'b', 'c'], recBefore: ['a'], recAfter: ['a'], newlyRecommended: [], noteChanged: ['a'] };
const R: PolicyResults = {
  n: 4,
  adu,
  bonus: { before: ['a'], after: ['a', 'b'], changed: ['b'] },
  gaps: {
    top: [
      { id: 'c', asking: 2000, fits: 1242, gap: 758, cost: 758 * 12 * 40, burdened: 100, need: 75800 },
      { id: 'a', asking: 1500, fits: 1242, gap: 258, cost: 258 * 12 * 40, burdened: 50, need: 12900 },
    ],
    total: (758 + 258) * 12 * 40,
    withGap: 2,
    withRent: 3,
  },
  transit: { before: ['a', 'b'], after: ['a', 'b', 'd'], changed: ['d'] },
  homes: 40,
  ami: 50,
  fits: 1242,
  transitLabel: '½ mile',
};
const OFF: Record<LeverId, boolean> = { adu: false, bonus: false, voucher: false, transit: false };

describe('lever summaries', () => {
  it('prints before → after for each lever from the results', () => {
    const l = leverSummaries(R, { ...OFF, adu: true, voucher: true });
    expect(l.map((x) => x.id)).toEqual(['adu', 'bonus', 'voucher', 'transit']);
    expect(l[0]).toMatchObject({ on: true, before: '0', after: '3', headline: '0 → 3 tracts', changed: ['a', 'b', 'c'] });
    expect(l[1]).toMatchObject({ on: false, before: '1', after: '2', headline: '1 → 2 tracts' });
    expect(l[2]).toMatchObject({ before: '$0', after: '$487,680', headline: '$0 → $488K a year', changed: ['c', 'a'] });
    expect(l[2].rule).toContain('× 12 × 40 homes');
    expect(l[2].rule).toContain('$1,242');
    expect(l[3]).toMatchObject({ headline: '2 → 3 tracts pass', changed: ['d'] });
    expect(l[3].rule).toContain('½ mile → 1 mile');
  });
  it('formats compact dollars and name lists', () => {
    expect(compactDollars(6_950_000)).toBe('$6.95M');
    expect(compactDollars(48_768)).toBe('$48.8K');
    expect(compactDollars(512_000)).toBe('$512K');
    expect(compactDollars(900)).toBe('$900');
    expect(listNames(['a', 'd', 'b'], nameOf)).toBe('Alpha, Beta');
    expect(listNames(['a', 'b', 'c'], nameOf, 2)).toBe('Alpha, Beta and 1 more');
    expect(listNames([], nameOf)).toBe('none');
  });
});

describe('CSV builders', () => {
  const p = { market: { asking_2br: 1500, asking_conf: 'high' }, transit: { freq_dist_mi: 0.7123 }, access: { jobs_1mi: 1234.4, school_mi: 0.456, services_halfmi: 2.34 } } as unknown as PlaceMeasures;
  const rows = [
    { id: 'a', p },
    { id: 'b', p: {} as PlaceMeasures },
  ];
  it('writes all six measures and a column per active lever', () => {
    const levers = leverSummaries(R, { ...OFF, adu: true, transit: true });
    const cols = measureColumns(50, levers);
    expect(cols.map((c) => c.key)).toEqual(['geoid', 'neighborhood', 'tract', 'rent_gap', 'burdened', 'jobs', 'school', 'transit', 'services', 'lever_adu', 'lever_transit']);
    expect(cols.find((c) => c.key === 'rent_gap')?.label).toBe('Rent gap at 50% AMI ($ per month)');
    const out = measureRows(rows, info, HUD, 50, levers);
    // fits at 50% (3 persons): 49,700 × 30% ÷ 12 = 1,242.5 → the rent gap is 1,500 − fits, rounded
    expect(out[0]).toMatchObject({ geoid: 'a', neighborhood: 'Alpha', tract: 'Tract a', jobs: 1234, school: 0.46, transit: 0.71, services: 2.3, lever_adu: 'yes', lever_transit: 'no' });
    expect(typeof out[0].rent_gap).toBe('number');
    expect(out[1]).toMatchObject({ rent_gap: null, jobs: null, lever_adu: 'yes' });
    const csv = toCsv(out, cols);
    expect(csv.split('\r\n')[0]).toContain('Changed by ADU by right');
  });
  it('writes one policy row per lever', () => {
    const out = policyRows(leverSummaries(R, OFF), nameOf);
    expect(out).toHaveLength(4);
    expect(out[0]).toMatchObject({ name: 'ADU by right', status: 'no', before: '0', after: '3', affected: 3, neighborhoods: 'Alpha, Beta, Gamma' });
    expect(toCsv(out, POLICY_COLUMNS).split('\r\n')[0]).toBe('﻿Lever,Switched on,Rule,What is counted,Before,After,Tracts affected,Neighborhoods affected');
  });
});

describe('report and facts', () => {
  const def = measureById.get('rent_gap')!;
  const ranked = [
    { id: 'c', value: 758 },
    { id: 'a', value: 258 },
    { id: 'b', value: null },
  ];
  const levers = leverSummaries(R, { ...OFF, bonus: true });
  it('builds the report with the measure, the top tracts, every lever and sources', () => {
    const r = buildEquityReport({ ami: 50, marketAs80: true, def, median: 258, available: 2, n: 4, ranked, levers, info, map: 'data:image/png;base64,x' });
    expect(r.title).toBe('Equity & policy');
    const kinds = r.blocks.map((b) => b.kind);
    expect(kinds).toContain('image');
    const table = r.blocks.find((b) => b.kind === 'table');
    expect(table && table.kind === 'table' && table.rows).toEqual([
      [1, 'Gamma', 'Tract c', '$758/mo'],
      [2, 'Alpha', 'Tract a', '$258/mo'],
    ]);
    const heads = r.blocks.filter((b) => b.kind === 'heading').map((b) => (b.kind === 'heading' ? b.text : ''));
    expect(heads).toContain('2 · Density bonus (switched on)');
    expect(heads).toContain('1 · ADU by right (off)');
    expect(JSON.stringify(r.blocks)).toContain('read here as 80%');
    expect(r.sources?.length).toBeGreaterThanOrEqual(6);
  });
  it('leaves the image out when there is no snapshot', () => {
    const r = buildEquityReport({ ami: 30, marketAs80: false, def, median: null, available: 0, n: 4, ranked: [], levers, info, map: null });
    expect(r.blocks.some((b) => b.kind === 'image')).toBe(false);
  });
  it('writes facts the answer can be checked against', () => {
    const f = equityFacts({ ami: 50, def, median: 258, available: 2, n: 4, ranked, levers, nameOf, tractOf: (id) => `Tract ${id}` });
    expect(f).toContain('City median over the 2 ranked city tracts with a value: $258/mo');
    expect(f).toContain('1. Gamma (Tract c): $758/mo');
    expect(f).not.toContain('3. Beta');
    expect(f).toContain('Density bonus (switched on): Tracts where a small apartment is by right: 1 → 2');
  });
  it('suggests questions that follow the measure, the levers and the selection', () => {
    expect(equityPrompts(def, 50, levers, null)).toEqual(['Which neighborhoods have the largest rent gap at 50% AMI?', 'What Pittsburgh programs help renters close a rent gap?', 'What does the density bonus change?']);
    const p = equityPrompts(measureById.get('transit')!, 30, leverSummaries(R, { ...OFF, adu: true }), 'Hazelwood');
    expect(p).toEqual(['Which neighborhoods are farthest from frequent transit?', 'How does Hazelwood compare with the city on frequent transit?', 'What changes if ADUs are allowed by right?']);
  });
});
