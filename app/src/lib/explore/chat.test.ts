import { describe, expect, it } from 'vitest';
import { composeFacts, milesBetween, nearby, suggestions, type FactsData } from './chat';
import { plainDescription } from './catalog';
import type { UnitFC } from './types';

// Squares 0.01° wide whose south-west corners sit at the given offsets (in degrees) from downtown Pittsburgh.
const square = (id: string, dx: number, dy: number) => {
  const x = -80 + dx, y = 40.44 + dy;
  return { type: 'Feature' as const, properties: { GEOID: id, name: `Unit ${id}`, pgh_share: 1 }, geometry: { type: 'Polygon' as const, coordinates: [[[x, y], [x + 0.01, y], [x + 0.01, y + 0.01], [x, y + 0.01], [x, y]]] } };
};
const fc = (...f: ReturnType<typeof square>[]): UnitFC => ({ type: 'FeatureCollection', features: f });

describe('milesBetween', () => {
  it('is about 69 miles per degree of latitude', () => {
    expect(milesBetween([-80, 40], [-80, 41])).toBeGreaterThan(68.9);
    expect(milesBetween([-80, 40], [-80, 41])).toBeLessThan(69.2);
  });
});

describe('nearby', () => {
  it('keeps the places within 3 miles, nearest first, and leaves the selected one out', () => {
    // 0.02° of latitude is about 1.4 miles, 0.03° about 2.1, 0.1° about 6.9
    const r = nearby(fc(square('a', 0, 0), square('far', 0, 0.1), square('c', 0, 0.03), square('b', 0, 0.02), square('d', 0, -0.025)), 'a');
    expect(r.widened).toBe(false);
    expect(r.rows.map((x) => x.geoid)).toEqual(['b', 'd', 'c']);
    expect(r.rows[0].miles).toBeGreaterThan(1.3);
    expect(r.rows[0].miles).toBeLessThan(1.5);
  });
  it('falls back to the nearest places when none is that close, and says so', () => {
    const r = nearby(fc(square('a', 0, 0), square('b', 0, 0.2), square('c', 0, 0.3)), 'a');
    expect(r.widened).toBe(true);
    expect(r.rows.map((x) => x.geoid)).toEqual(['b', 'c']);
  });
  it('returns nothing for a place that is not on the map', () => {
    expect(nearby(fc(square('a', 0, 0)), 'zz').rows).toEqual([]);
  });
});

describe('composeFacts', () => {
  const base: FactsData = {
    level: 'tract',
    cityOnly: true,
    selected: { name: 'Hazelwood (Tract 5623)', values: { pop: 4000, med_gross_rent: 1000, renter_share: 0.523 } },
    extra: ['on the watch list: high need with a rising market'],
    near: [
      { name: 'Greenfield (Tract 1517)', miles: 1.42, values: { med_gross_rent: 1300 } },
      { name: 'Glen Hazel (Tract 5629)', miles: 0.8, values: { med_gross_rent: 900 } },
    ],
    widened: false,
    city: { med_gross_rent: 1261 },
    county: { med_gross_rent: 1180 },
    variable: null,
  };
  it('lists the place, the nearby places with their distance, the rank and the references', () => {
    const t = composeFacts(base);
    expect(t).toContain('The map shows tracts in the City of Pittsburgh');
    expect(t).toContain('Hazelwood (Tract 5623), a census tract');
    expect(t).toContain('- Median gross rent $1,000');
    expect(t).toContain('- Renter households 52.3%');
    expect(t).toContain('- on the watch list: high need with a rising market');
    expect(t).toContain('1. Greenfield (Tract 1517), 1.4 miles: Median gross rent $1,300');
    expect(t).toContain('- Median gross rent: $1,000 here, 2nd of 3; the middle value of the nearby places is $1,100');
    expect(t).toContain('City of Pittsburgh: Median gross rent $1,261');
    expect(t).not.toContain('VARIABLE PAINTED');
  });
  it('says so when nothing is selected or the nearby places are further than 3 miles', () => {
    expect(composeFacts({ ...base, selected: null, near: [], extra: [] })).toContain('Nothing is selected on the map');
    expect(composeFacts({ ...base, widened: true })).toContain('so these are the 2 nearest');
  });
});

describe('suggestions', () => {
  it('offers prompts only once a place is selected', () => {
    expect(suggestions(null, null, 'tract')).toEqual([]);
    expect(suggestions('Hazelwood', null, 'tract')).toEqual(['Describe the neighborhoods around Hazelwood', 'Compare Hazelwood with places within 3 miles']);
  });
});

describe('plainDescription', () => {
  it('drops the census table numbers and keeps the rest', () => {
    expect(plainDescription({ description: 'Median gross rent (rent plus utilities) of renter-occupied units paying cash rent, in dollars (B25064).' })).toBe('Median gross rent (rent plus utilities) of renter-occupied units paying cash rent, in dollars.');
    expect(plainDescription({ description: 'Share below the poverty line (C17002; B17001 is not published for block groups).' })).toBe('Share below the poverty line.');
    expect(plainDescription({ description: 'Median year built (B25035). Structures built before 1940 are reported as 1939.' })).toBe('Median year built. Structures built before 1940 are reported as 1939.');
  });
});
