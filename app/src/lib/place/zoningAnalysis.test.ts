import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FAMILY_RULES, landByGroup, landForType, multiUnitLand } from './zoningAnalysis';
import { placeById } from './data';

describe('zoning analysis', () => {
  it('copies config/zoning_rules.json exactly', () => {
    const cfg = JSON.parse(readFileSync(new URL('../../../../config/zoning_rules.json', import.meta.url), 'utf8'));
    for (const f of cfg.families) expect(FAMILY_RULES[f.id]?.by).toEqual(f.by_type);
    expect(Object.keys(FAMILY_RULES).length).toBe(cfg.families.length);
  });
  it('splits Hazelwood land into groups that add up, and reads where each type is allowed', () => {
    const z = placeById.get('42003562300')!.zoning!;
    const groups = landByGroup(z.shares);
    expect(groups.reduce((s, g) => s + g.share, 0)).toBeCloseTo(1, 1);
    expect(groups[0].id).toBe('parks'); // P 45%
    const dup = landForType(z.shares, 'duplex_triplex');
    expect(dup.yes + dup.conditional + dup.no + dup.unknown).toBeCloseTo(1, 1);
    expect(dup.yes).toBeGreaterThan(0.05); // matches the by-right annotation in place.json
    expect(multiUnitLand(z.shares)).toBeGreaterThanOrEqual(0);
  });
});
