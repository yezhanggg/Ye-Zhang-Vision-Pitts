import { describe, expect, it } from 'vitest';
import { placeZips, zipTracts } from '../place/zipView';
import { tractCapacity } from '../zoning/capacity';
import { IZO_MIN_SHARE, zipPolicyCounts, zipPolicyWords } from './zipCounts';

describe('policies across a ZIP code', () => {
  it('counts the tracts where each rule from the data applies', () => {
    const zip = placeZips.find((z) => zipTracts(z).main.length >= 2)!;
    const c = zipPolicyCounts(zip);
    expect(c.tracts).toBe(zipTracts(zip).main.length);
    const izo = zipTracts(zip).main.filter((g) => (tractCapacity(g)?.izo_share ?? 0) >= IZO_MIN_SHARE).length;
    expect(c.applies.izo ?? 0).toBe(izo);
    for (const n of Object.values(c.applies)) expect(n).toBeLessThanOrEqual(c.tracts);
  });

  it('does not count slivers of the inclusionary overlay along its edge (15207: Hazelwood, Greenfield)', () => {
    expect(zipPolicyCounts('15207').applies.izo ?? 0).toBe(0);
  });

  it('words: "in N of M tracts", none mapped for ADUs, nothing for financing lines', () => {
    const c = { tracts: 5, applies: { izo: 2 } };
    expect(zipPolicyWords(c, 'izo')).toBe('in 2 of 5 tracts');
    expect(zipPolicyWords(c, 'fpo')).toBe('in no tract of 5');
    expect(zipPolicyWords(c, 'adu')).toBe('none mapped');
    expect(zipPolicyWords(c, 'phfa')).toBeNull();
  });
});
