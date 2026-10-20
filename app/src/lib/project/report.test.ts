import { describe, expect, it } from 'vitest';
import { buildPlaceReport, placeExtra, placeMeasureRows } from '../export/builders/place';
import { DEFAULT_ENTRIES } from '../lihtc/store';
import { hud, placeFor } from '../place/data';
import { projectBase } from './model';
import { projectMix } from './plan';
import { projectReport } from './report';
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
