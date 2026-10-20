import { describe, expect, it } from 'vitest';
import { depthHomes } from './depth';
import type { DemandUnit } from './types';

const unit = (depth: DemandUnit['depth'], li: number | null) => ({ depth, lihtc: li == null ? null : { mile: { li_units: li } } }) as unknown as DemandUnit;

describe('depthHomes', () => {
  it('subtracts the tax credit homes within the mile and applies the capture rate', () => {
    const d = depthHomes(unit({ tracts: 3, le50: 3000, b50_80: 1200, le60: 3400 }, 400))!;
    expect(d.open).toBe(3000);
    expect([d.low, d.homes, d.high]).toEqual([150, 300, 450]);
    expect(d.formula).toContain('3 tracts');
  });
  it('never goes below zero and is null without the field', () => {
    expect(depthHomes(unit({ tracts: 1, le50: 10, b50_80: 0, le60: 10 }, 50))!.homes).toBe(0);
    expect(depthHomes(unit(null, 0))).toBeNull();
    expect(depthHomes(null)).toBeNull();
  });
});
