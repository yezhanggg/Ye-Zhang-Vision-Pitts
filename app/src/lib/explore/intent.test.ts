import { describe, expect, it } from 'vitest';
import { classify, unitMatches } from './intent';
import type { UnitFC } from './types';

describe('classify', () => {
  it('reads short names and codes as a place search', () => {
    for (const t of ['Hazelwood', 'ross township', '15207', 'Tract 5623', 'Squirrel Hill South', 'mt washington']) expect(classify(t).kind).toBe('place');
  });
  it('reads a house number and a street as an address', () => {
    expect(classify('4800 Forbes Ave')).toEqual({ kind: 'address', query: '4800 Forbes Ave' });
    expect(classify('  414 Grant St, Pittsburgh ').kind).toBe('address');
  });
  it('reads questions and requests for words as questions', () => {
    for (const t of ['What is the median rent here?', 'compare Hazelwood with Greenfield', 'Describe the neighborhoods around Hazelwood', 'is this on the watch list', 'how many renters', 'Hazelwood?', 'rent and income in the places near the river']) expect(classify(t).kind).toBe('question');
  });
  it('treats a search said as a sentence as a search, and keeps only the place', () => {
    expect(classify('go to Hazelwood')).toEqual({ kind: 'place', query: 'Hazelwood' });
    expect(classify('where is Ross township?')).toEqual({ kind: 'place', query: 'Ross township' });
    expect(classify('find 4800 Forbes Ave')).toEqual({ kind: 'address', query: '4800 Forbes Ave' });
    expect(classify('show me how rents changed in the last ten years').kind).toBe('question');
  });
  it('has nothing to do with an empty box', () => {
    expect(classify('   ')).toEqual({ kind: 'place', query: '' });
  });
});

describe('unitMatches', () => {
  const f = (GEOID: string, name: string, neighborhood?: string) => ({ type: 'Feature' as const, properties: { GEOID, name, pgh_share: 1, ...(neighborhood ? { neighborhood } : {}) }, geometry: { type: 'Polygon' as const, coordinates: [] } });
  const fc: UnitFC = { type: 'FeatureCollection', features: [f('1', 'Ross township'), f('2', 'Rosslyn Farms borough'), f('3', 'Penn Hills township'), f('4', 'Tract 5623', 'Hazelwood'), f('5', 'ZIP 15207')] };
  it('matches names, neighborhoods and codes, names that start with the text first', () => {
    expect(unitMatches('ross', fc).map((m) => m.geoid)).toEqual(['1', '2']);
    expect(unitMatches('hazel', fc)).toEqual([{ geoid: '4', label: 'Hazelwood', sub: 'Tract 5623' }]);
    expect(unitMatches('15207', fc).map((m) => m.geoid)).toEqual(['5']);
    expect(unitMatches('5623', fc).map((m) => m.geoid)).toEqual(['4']);
    expect(unitMatches('hills', fc).map((m) => m.geoid)).toEqual(['3']);
  });
  it('waits for two characters and returns nothing for no match', () => {
    expect(unitMatches('r', fc)).toEqual([]);
    expect(unitMatches('zzz', fc)).toEqual([]);
  });
});
