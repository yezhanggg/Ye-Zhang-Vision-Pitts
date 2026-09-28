import { describe, expect, it } from 'vitest';
import { cityTakeaway, explainLocal, nearby } from './local';
import { MEASURES, measureById, measureValue } from './measures';
import { hud, placeById } from '../place/data';
import { rankedTracts, tractById, tractLabel } from '../data';

const nameOf = (id: string) => tractLabel(tractById.get(id));
const valuesFor = (m: Parameters<typeof measureValue>[0]) => rankedTracts.filter((t) => placeById.has(t.GEOID)).map((t) => ({ id: t.GEOID, value: measureValue(m, placeById.get(t.GEOID)!, hud, 50) }));

describe('neighborhood explanations', () => {
  it('finds nearby tracts for Hazelwood within two miles', () => {
    const pool = new Set(rankedTracts.map((t) => t.GEOID));
    const near = nearby('42003562300', 'tract', pool);
    expect(near.length).toBeGreaterThan(0);
    expect(near).not.toContain('42003562300');
  });
  it('compares the selected tract with the city and its surroundings, and ends with a takeaway', () => {
    const s = explainLocal({ def: measureById.get('rent_gap')!, ami: 50, values: valuesFor('rent_gap'), level: 'tract', selectedId: '42003562300', nameOf, many: 'tracts' });
    expect(s).toMatch(/^Hazelwood reads /);
    expect(s).toMatch(/nearest tracts/);
    expect(s).toMatch(/Takeaway: /);
  });
  it('says how need clusters when nothing is selected', () => {
    const s = explainLocal({ def: measureById.get('burdened')!, ami: 50, values: valuesFor('burdened'), level: 'tract', selectedId: null, nameOf, many: 'tracts' });
    expect(s).toMatch(/^Need is (concentrated|partly clustered|spread out)/);
    expect(s).toMatch(/Select a tract/);
  });
  it('has a citywide takeaway for every measure', () => {
    for (const m of MEASURES) expect(cityTakeaway(m.id, 50)).toMatch(/^Takeaway: /);
  });
});
