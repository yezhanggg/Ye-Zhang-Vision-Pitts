import { describe, expect, it } from 'vitest';
import { openFit } from '../policy/sun';
import { emptyCounts } from '../project/store';
import { checkZoning, lotDefaults, lotFit, type CheckInput } from './check';
import { STANDARD_BY_CODE } from './capacity';

const base: CheckInput = { district: 'RM-M', lotSqft: 20000, frontageFt: 100, depthFt: 200, devType: 'affordable', units: 40, stories: 4, commercialSf: 0, avgUnitSf: 750, efficiency: 0.85, inIzo: false, floodPct: 0 };

describe('the zoning answer for a project on a lot', () => {
  it('multi-unit homes in RM-M within the envelope: allowed by right', () => {
    const c = checkZoning(base);
    expect(c.verdict).toBe('yes');
    expect(c.maxUnits).toBeGreaterThanOrEqual(40);
    expect(c.rows.map((r) => r.key)).toEqual(['use', 'density', 'height', 'lot', 'floor', 'parking']);
  });

  it('too many homes or too tall: not allowed as is', () => {
    expect(checkZoning({ ...base, units: 400 }).verdict).toBe('no');
    expect(checkZoning({ ...base, stories: 9 }).rows.find((r) => r.key === 'height')?.tone).toBe('no');
  });

  it('an apartment building in a single-unit district is not allowed; one home is', () => {
    expect(checkZoning({ ...base, district: 'R1D-M', lotSqft: 5000 }).verdict).toBe('no');
    expect(checkZoning({ ...base, district: 'R1D-M', lotSqft: 5000, units: 1, stories: 2 }).verdict).toBe('yes');
  });

  it('senior housing reads the elderly housing uses (a special exception in R1D)', () => {
    expect(checkZoning({ ...base, district: 'R1D-M', lotSqft: 5000, units: 1, stories: 2, devType: 'senior' }).verdict).toBe('hearing');
  });

  it('commercial and mixed use: allowed in a mixed-use district, not in a residential one', () => {
    expect(checkZoning({ ...base, district: 'LNC', devType: 'commercial', units: 0, commercialSf: 5000, stories: 2 }).rows[0].tone).toBe('yes');
    expect(checkZoning({ ...base, devType: 'commercial', units: 0, commercialSf: 5000 }).verdict).toBe('no');
    expect(checkZoning({ ...base, devType: 'mixed', commercialSf: 3000 }).rows[0].tone).toBe('no');
  });

  it('says what the site asks of the project: inclusionary homes and the floodplain', () => {
    const c = checkZoning({ ...base, inIzo: true, floodPct: 2.5 });
    expect(c.rows.find((r) => r.key === 'izo')?.text).toMatch(/Required: 4 of the units at 50% AMI/);
    expect(c.rows.find((r) => r.key === 'flood')?.tone).toBe('info');
    expect(c.verdict).toBe('yes');
  });

  it('a district without standards here: check the code', () => {
    expect(checkZoning({ ...base, district: 'P' }).verdict).toBe('unknown');
    expect(checkZoning({ ...base, district: null }).verdict).toBe('unknown');
  });

  it('fits on the lot: the footprint against the lot less its open space, the Open space card’s own numbers', () => {
    // A 2,800 sq ft R1A-H lot (Hazelwood): 40 units over 4 stories need far more ground than the lot has.
    const lot = { ...base, district: 'R1A-H', lotSqft: 2800, frontageFt: 45, depthFt: 63, avgUnitSf: 794 };
    const c = checkZoning(lot);
    const row = c.rows.find((r) => r.key === 'floor')!;
    expect(row).toMatchObject({ tone: 'no', title: 'Fits on the lot' });
    const counts = emptyCounts();
    counts['50'] = [0, 27, 11, 2];
    const card = openFit(counts, 40, 4, [550, 750, 950, 1150], 0.85, 2800, 0.15, null);
    const avg = (27 * 750 + 11 * 950 + 2 * 1150) / 40;
    const f = lotFit({ ...lot, avgUnitSf: avg }, STANDARD_BY_CODE.get('R1A-H')!, null);
    expect(f.homesThatFit).toBe(card.homesThatFit);
    expect(f.footprint).toBeCloseTo(card.footprint, 6);
    expect(f.room).toBe(card.room);
    expect(c.fit!.units).toBe(c.fit!.homesThatFit);
    expect(row.text).toContain(`about ${c.fit!.units} units fit at 4 stories`);
    expect(c.verdict).toBe('no');
    // One home on it fits.
    expect(checkZoning({ ...lot, units: 1, stories: 2 }).rows.find((r) => r.key === 'floor')?.tone).toBe('yes');
  });

  it('in an envelope district the floor area must also fit the envelope', () => {
    const c = checkZoning({ ...base, units: 60 });
    expect(c.fit!.envelope).not.toBeNull();
    expect(c.fit!.fits).toBe(c.fit!.floorNeed <= c.fit!.envelope! && c.fit!.footprint <= c.fit!.room);
    expect(c.rows.find((r) => r.key === 'floor')?.text).toMatch(/envelope/);
  });

  it('a picked lot suggests units and stories that fit it, within the district', () => {
    const d = { lotSqft: 2800, frontageFt: 45, depthFt: 63, avgUnitSf: 794, efficiency: 0.85, homes: 40, most: 4 };
    expect(lotDefaults({ ...d, district: 'R1A-H' })).toEqual({ units: 1, stories: 2 });
    const rm = lotDefaults({ ...d, district: 'RM-M', lotSqft: 18600, frontageFt: null, depthFt: null })!;
    expect(rm.units).toBeLessThanOrEqual(40);
    expect(rm.stories).toBeLessThanOrEqual(4);
    expect(checkZoning({ ...base, district: 'RM-M', lotSqft: 18600, frontageFt: null, depthFt: null, units: rm.units, stories: rm.stories, avgUnitSf: 794 }).verdict).toBe('yes');
    expect(lotDefaults({ ...d, district: 'P' })).toBeNull();
    expect(lotDefaults({ ...d, district: 'R1D-L', lotSqft: 2000 })).toBeNull();
  });
});
