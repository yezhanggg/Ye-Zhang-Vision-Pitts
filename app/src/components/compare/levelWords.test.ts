import { describe, expect, it } from 'vitest';
import { lotClash, sideName, sideWait } from './levelWords';

describe('Compare places at a level', () => {
  it('names a side by its ZIP code, its lot or its tract', () => {
    expect(sideName('zip', 'A', 'Hazelwood', null, '15207')).toBe('ZIP 15207');
    expect(sideName('zip', 'B', 'Hazelwood', null, null)).toBe('Place B');
    expect(sideName('parcel', 'A', 'Hazelwood', { label: '56-K-100' }, null)).toBe('Lot 56-K-100 · Hazelwood');
    expect(sideName('parcel', 'A', 'Hazelwood', undefined, null)).toBe('Hazelwood');
    expect(sideName('tract', 'B', null, { label: '1-A-1' }, '15207')).toBe('Place B');
  });
  it('says what a side waits for', () => {
    expect(sideWait('parcel', 'B')).toBe('Click a lot on B’s map.');
    expect(sideWait('zip', 'A')).toBe('Pick a ZIP code above A’s map.');
  });
  it('keeps one lot per tract under one set of settings', () => {
    expect(lotClash('B', 'g1', 'g1', 'g2', false)).toMatch(/A’s tract/);
    expect(lotClash('A', 'g2', 'g1', 'g2', false)).toMatch(/B’s tract/);
    expect(lotClash('B', 'g1', 'g1', 'g2', true)).toBeNull();
    expect(lotClash('B', 'g3', 'g1', 'g2', false)).toBeNull();
  });
});
