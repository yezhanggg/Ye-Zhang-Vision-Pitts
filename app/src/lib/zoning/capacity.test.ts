import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CAPACITY, districtName, homesByRight, inclusionaryHomes, lotFor, STANDARD_BY_CODE, STANDARDS } from './capacity';

const fixture = JSON.parse(readFileSync(fileURLToPath(new URL('../../../../tests/fixtures/zoning_capacity_cases.json', import.meta.url)), 'utf8'));

describe('homes by right', () => {
  it('matches the Python rule case for case', () => {
    expect(fixture.assumptions).toEqual(CAPACITY.assumptions);
    for (const c of fixture.cases) {
      const r = homesByRight(STANDARD_BY_CODE.get(c.code), c.lot_sqft, c.frontage_ft, c.depth_ft);
      expect([c.code, r.homes, r.below_min, r.floor_area]).toEqual([c.code, c.homes, c.below_min, c.floor_area]);
    }
  });
  it('caps homes per lot in the R districts and needs the minimum lot', () => {
    expect(homesByRight(STANDARD_BY_CODE.get('R2-M'), 2400).homes).toBe(2);
    expect(homesByRight(STANDARD_BY_CODE.get('R2-M'), 2399).below_min).toBe(true);
    expect(homesByRight(STANDARD_BY_CODE.get('R3-L'), 9000).homes).toBe(3);
  });
  it('the inclusionary set-aside starts at 20 homes and rounds up', () => {
    expect(inclusionaryHomes(19, true)).toBe(0);
    expect(inclusionaryHomes(20, true)).toBe(2);
    expect(inclusionaryHomes(21, true)).toBe(3);
    expect(inclusionaryHomes(50, false)).toBe(0);
  });
  it('every standard names its section and is marked verified', () => {
    for (const d of STANDARDS.districts) {
      expect(d.section).toMatch(/^§90[34]\./);
      expect(d.verified).toBe(true);
    }
  });
});

describe('lot for a number of homes', () => {
  it('is the smallest lot that holds them, and no smaller lot does', () => {
    for (const code of ['RM-M', 'RM-H', 'LNC', 'UNC', 'NDO']) {
      const s = STANDARD_BY_CODE.get(code)!;
      for (const n of [4, 12, 40]) {
        const need = lotFor(s, n);
        expect(need.kind).toBe('fits');
        if (need.kind !== 'fits') continue;
        expect(homesByRight(s, need.lotSqft).homes).toBeGreaterThanOrEqual(n);
        expect(homesByRight(s, need.lotSqft - 200).homes).toBeLessThan(n);
      }
    }
  });
  it('R districts: the minimum lot up to their cap, and the cap beyond it', () => {
    const r2 = STANDARD_BY_CODE.get('R2-M')!;
    expect(lotFor(r2, 2)).toEqual({ kind: 'fits', lotSqft: 2400 });
    expect(lotFor(r2, 3)).toEqual({ kind: 'cap', max: 2 });
    expect(lotFor(r2, 0)).toEqual({ kind: 'none' });
  });
  it('names districts in words', () => {
    expect(districtName('R1D-VL')).toBe('Single-unit detached, very low density');
    expect(districtName('LNC')).toBe('Local neighborhood commercial');
    for (const d of STANDARDS.districts) expect(districtName(d.code)).not.toBe(d.code);
  });
});
