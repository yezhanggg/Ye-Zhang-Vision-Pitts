import { describe, expect, it } from 'vitest';
import { emptyCounts } from '../project/store';
import { applyInclusionary, developerFee, mortgageConstant, pencil } from './finance';
import { sensitivity } from './grid';
import { DEFAULTS, resolveInputs } from './inputs';
import { mtspLimit, taxCreditRent } from './rents';

const nine = resolveInputs({}, 'nine').inputs;

function mix50(homes: [number, number, number, number]) {
  const c = emptyCounts();
  c['50'] = homes;
  return c;
}

describe('rents', () => {
  it('tax credit rent: 30% of the MTSP limit at 1.5 persons a bedroom, rounded down, less utilities', () => {
    // 2BR = 3 persons; 60% MTSP 3-person limit $59,640 → $1,491 gross − $171 = $1,320.
    expect(mtspLimit(DEFAULTS.mtsp, '60', 3)).toBe(59640);
    expect(taxCreditRent(DEFAULTS.mtsp, '60', 2, 171)).toMatchObject({ gross: 1491, net: 1320 });
    // 1BR = 1.5 persons: the mean of the 1 and 2 person 50% limits, (38,650 + 44,200) ÷ 2 = 41,425 → $1,035.
    expect(taxCreditRent(DEFAULTS.mtsp, '50', 1, 0)!.gross).toBe(1035);
    // A studio counts one person.
    expect(taxCreditRent(DEFAULTS.mtsp, '30', 0, 0)!.gross).toBe(Math.floor((23190 * 0.3) / 12));
  });
  it("gross rents equal PHFA's published 2026 maximum rents for Allegheny County, studio to 3BR", () => {
    // PHFA, Low Income Housing Tax Credit Program income limits / rents, 2026 (MTXR041, run 5/04/2026, effective 5/01/2026).
    const PHFA = { '30': [579, 621, 745, 861], '50': [966, 1035, 1242, 1435], '60': [1159, 1242, 1491, 1722], '80': [1546, 1657, 1988, 2297] } as const;
    for (const [level, row] of Object.entries(PHFA) as [keyof typeof PHFA, readonly number[]][])
      row.forEach((rent, br) => expect(taxCreditRent(DEFAULTS.mtsp, level, br, 0)!.gross).toBe(rent));
  });
  it('60% MTSP is 1.2 times 50% for every household size', () => {
    DEFAULTS.mtsp.l['50'].forEach((v, k) => expect(DEFAULTS.mtsp.l['60'][k]).toBe(Math.round(v * 1.2)));
  });
});

describe('the parts', () => {
  it('mortgage constant', () => {
    expect(mortgageConstant(0.06, 30)).toBeCloseTo(0.071946, 5);
    expect(mortgageConstant(0, 10)).toBeCloseTo(0.1);
  });
  it('developer fee: 15% then 10%, on the lesser of cost and the basis limit, then the cap', () => {
    expect(developerFee(8_000_000, 40, 'nine', false).value).toBe(1_200_000);
    expect(developerFee(12_000_000, 60, 'nine', true).value).toBe(1_700_000); // 1.5M + 0.2M, under the 2.0M cap
    expect(developerFee(30_000_000, 100, 'nine', false).value).toBe(1_750_000); // the cap binds
    expect(developerFee(30_000_000, 20, 'four', false).value).toBe(0.15 * 7_600_000); // base held to 20 × $380,000
  });
  it('IZ-O: 10% of 20 or more homes, rounded up, moved to 50% AMI', () => {
    const c = emptyCounts();
    c.mkt = [0, 15, 6, 0];
    expect(applyInclusionary(c, true).homes).toBe(3);
    expect(applyInclusionary(c, false).homes).toBe(0);
    c.mkt = [0, 10, 9, 0];
    expect(applyInclusionary(c, true).homes).toBe(0);
  });
});

describe('a whole pencil, by hand', () => {
  const counts = mix50([0, 20, 15, 5]);
  const r = pencil({ counts, inputs: nine, marketRents: [900, 1100, 1400, 1700], qctOrDda: true, inOverlay: false });
  it('rents, income and the loan', () => {
    // 1BR at 50%: $1,035 − $133 = $902; 2BR: 49,700 × .3 ÷ 12 = $1,242 − $171 = $1,071; 3BR (4.5 persons) mean of 55,200 and 59,650 = 57,425 → $1,435 − $210 = $1,225.
    expect(r.rents['50'].slice(1)).toEqual([902, 1071, 1225]);
    const gpr = (20 * 902 + 15 * 1071 + 5 * 1225) * 12;
    expect(r.income[0].value).toBe(gpr);
    expect(r.noi).toBeCloseTo(gpr * 0.93 - 40 * (6500 + 350), 6);
    expect(r.loan.value).toBeCloseTo(r.noi / 1.2 / mortgageConstant(0.0625, 35), 6);
  });
  it('costs, credits and the gap', () => {
    const net = 20 * 700 + 15 * 950 + 5 * 1200;
    const hard = (net / 0.85) * 300;
    expect(r.uses.find((u) => u.label === 'Hard cost')!.value).toBeCloseTo(hard, 6);
    // Cost (hard + 25% soft) is above PHFA's basis limit of 40 × $320,000 = $12.8M, so the fee base is $12.8M:
    // 15% × $10M + 10% × $2.8M = $1.78M, held to the $1.75M cap (under 60 affordable homes).
    const fee = 1_750_000;
    expect(hard * 1.25).toBeGreaterThan(12_800_000);
    expect(r.fee!.value).toBe(fee);
    // Eligible basis: (hard + soft) × 90% held to $12.8M, plus the fee; × 1.3 (QCT) × 100% applicable fraction × 9%.
    const eligible = Math.min(hard * 1.25 * 0.9, 12_800_000) + fee;
    const annual = Math.min(eligible * 1.3 * 1 * 0.09, 1_700_000);
    expect(annual).toBe(1_700_000); // PHFA's per-project cap binds here
    expect(r.credits[2].value).toBeCloseTo(annual, 4);
    expect(r.equity).toBeCloseTo(annual * 10 * 0.88, 4);
    expect(r.gap).toBeCloseTo(r.tdc - r.loan.value - r.equity, 4);
    expect(r.checks[0]).toMatchObject({ label: 'Federal minimum set-aside', ok: true });
    expect(r.finance!.devFee).toBeCloseTo(fee, 4);
  });
  it('the grid middle is the base case', () => {
    const g = sensitivity({ counts, inputs: nine, marketRents: [900, 1100, 1400, 1700], qctOrDda: true, inOverlay: false });
    expect(g.cells[2][2]).toBeCloseTo(r.gap, 6);
    expect(g.cells[0][2]).toBeLessThan(g.cells[4][2]); // cheaper building, smaller gap
  });
  it('market branch: yield on cost and the IZ-O set-aside', () => {
    const c = emptyCounts();
    c.mkt = [0, 20, 10, 0];
    const m = pencil({ counts: c, inputs: resolveInputs({}, 'market').inputs, marketRents: [900, 1300, 1700, 2000], qctOrDda: false, inOverlay: true });
    expect(m.izo!.homes).toBe(3);
    expect(m.fee).toBeNull();
    expect(m.market!.yieldOnCost.value).toBeCloseTo(m.noi / m.tdc, 9);
    expect(m.finance).toBeNull();
  });
  it('inputs: your entries win and are marked yours', () => {
    const { inputs, kinds } = resolveInputs({ hardPerSf: 250 }, 'four');
    expect(inputs.hardPerSf).toBe(250);
    expect(kinds.hardPerSf).toBe('yours');
    expect(inputs.price).toBe(0.85);
    expect(kinds.ua).toBe('sourced');
  });
});
