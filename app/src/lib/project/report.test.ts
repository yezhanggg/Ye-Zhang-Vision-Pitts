import { describe, expect, it } from 'vitest';
import { buildPlaceReport, placeExtra, placeMeasureRows } from '../export/builders/place';
import { DEFAULT_ENTRIES } from '../lihtc/store';
import { hud, placeFor } from '../place/data';
import { projectBase } from './model';
import { projectMix } from './plan';
import { runCapital } from './capital';
import { capitalReport, projectReport } from './report';
import { DEFAULT_PROJECT } from './store';

const G = '42003562300';

describe('projectReport', () => {
  const base = projectBase(G, placeFor(G)!, hud!, 50, DEFAULT_PROJECT, DEFAULT_ENTRIES);
  const mix = projectMix(DEFAULT_PROJECT, 50, 30, base.tract, base.zip);
  const r = projectReport({ base, name: 'Hazelwood', mix, stories: 4, branch: 'nine', words: () => 'w', points: () => 'p' });
  it('lays out the three paths, the dates and the stamp', () => {
    const table = r.blocks.find((b) => b.kind === 'table');
    expect(table && table.kind === 'table' && table.rows).toHaveLength(3);
    expect(r.blocks.some((b) => b.kind === 'text' && b.text.startsWith('Screened'))).toBe(true);
    expect(r.blocks.some((b) => b.kind === 'list' && b.items.some((x) => x.includes('2027-02-17')))).toBe(true);
    expect(r.rows.every((x) => x.geoid === G && x.section === 'Project')).toBe(true);
  });
  it('rides along in the place export only while registered, and only for its place', () => {
    const t = { GEOID: G, name: 'Hazelwood' } as never;
    placeExtra.at = (g) => (g === G ? r : undefined);
    try {
      expect(placeMeasureRows(t, placeFor(G)!, hud).filter((x) => x.section === 'Project').length).toBe(r.rows.length);
      expect(placeMeasureRows({ GEOID: 'x', name: 'x' } as never, placeFor(G)!, hud).some((x) => x.section === 'Project')).toBe(false);
    } finally {
      delete placeExtra.at;
    }
    expect(placeMeasureRows(t, placeFor(G)!, hud).some((x) => x.section === 'Project')).toBe(false);
    expect(typeof buildPlaceReport).toBe('function');
  });
});

describe('capitalReport', () => {
  const run = runCapital({ devType: 'affordable', branch: 'nine', plan: 'adopted', units: 40, affordable: 40, large: false, qctOrDda: false, sizeSf: 37353, grossRent: 40 * 1000 * 12, opexPerUnit: 7000, price: 0.88, dscrNeed: 1.15 });
  const r = capitalReport({
    geoid: G,
    name: 'Hazelwood',
    lot: 'Lot 56-P-285-0-1',
    site: 'Lot 56-P-285-0-1 · 2,800 sq ft · R1A-H',
    typeLabel: 'Affordable',
    housing: true,
    units: 40,
    stories: 4,
    inputs: [['Development type', 'Affordable'], ['Units', '40'], ['Stories', '4']],
    mix: [{ level: '50% AMI', row: [0, 27, 11, 2] }, { level: 'Market', row: [0, 0, 0, 0] }],
    verdict: "Doesn't work as is",
    line: 'Use: 40 units in one building: not allowed in R1A-H.',
    findings: [{ tone: 'stop', title: 'Use', text: '40 units in one building: not allowed in R1A-H.' }],
    fixes: ['Read it at Tract level, on a lot sized for it'],
    zoning: { verdict: 'Not allowed as is', district: 'R1A-H' },
    score: { total: 20, max: 205, threshold: 120, high: 90 },
    run,
  });
  it('leads with the project, its verdict and inputs, then the review, the score and the pro forma', () => {
    expect(r.blocks[0]).toEqual({ kind: 'heading', text: 'The project tested: Affordable, 40 units' });
    expect(r.blocks[1]).toEqual({ kind: 'callout', text: "Doesn't work as is. Use: 40 units in one building: not allowed in R1A-H." });
    expect(r.blocks[2].kind === 'kv' && r.blocks[2].rows[0]).toEqual(['Site', 'Lot 56-P-285-0-1 · 2,800 sq ft · R1A-H']);
    expect(r.blocks.some((b) => b.kind === 'list' && b.items[0].startsWith('Does not meet it · Use:'))).toBe(true);
  });
  it('the CSV carries the verdict, inputs, unit mix, score and findings in the right columns', () => {
    const by = (m: string) => r.rows.find((x) => x.measure === m);
    expect(by('Verdict')?.value).toBe("Doesn't work as is");
    expect(by('Input: Units')?.value).toBe('40');
    expect(by('Zoning district')).toMatchObject({ value: 'R1A-H', source: 'City zoning districts (WPRDC)' });
    expect(by('Zoning reading')?.value).toBe('Not allowed as is');
    expect(by('Unit mix: 50% AMI, 1BR')).toMatchObject({ value: 27, unit: 'units' });
    expect(by('Tax credit score')?.value).toBe(20);
    expect(by('Tax credit score: best case')?.value).toBe(90);
    expect(by('Review: Use')).toMatchObject({ unit: 'stop' });
    expect(by('Try 1')?.value).toBe('Read it at Tract level, on a lot sized for it');
    expect(r.rows.every((x) => x.value !== null || x.measure.startsWith('Tax credit score'))).toBe(true);
    if (run.rents.length) expect(r.rows.some((x) => x.measure.startsWith('Rent a month:'))).toBe(true);
  });
});
