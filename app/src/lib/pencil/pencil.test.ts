import { describe, expect, it } from 'vitest';
import { emptyCounts } from '../project/store';
import { tierOf, TIER_WORD } from '../project/size';
import { applyInclusionary, developerFee, feeCap, mortgageConstant, pencil } from './finance';
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
    // Tax credit paths take PHFA's underwriting values: 5% vacancy, $500 reserves (general), 1.15 coverage.
    expect(r.noi).toBeCloseTo(gpr * 0.95 - 40 * (6500 + 500), 6);
    // The loan is the lesser of the coverage test and the debt that keeps years 1–10 at or above zero (+2% / +3%).
    const k = mortgageConstant(0.0625, 35);
    let low = r.noi;
    for (let y = 1; y < 10; y++) low = Math.min(low, gpr * 0.95 * 1.02 ** y - 40 * 7000 * 1.03 ** y);
    expect(r.loan.value).toBeCloseTo(Math.max(0, Math.min(r.noi / 1.15 / k, low / k)), 6);
    expect(r.operating!.years[0]).toBeCloseTo(r.noi - r.loan.value * k, 6);
    expect(r.checks.find((c) => c.label === 'Cash flow, years 1–10')!.ok).toBe(true);
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
  it('soft funds not yet committed are gap to PHFA, shown with the gap if they come', () => {
    const a = { counts, marketRents: [900, 1100, 1400, 1700] as [number, number, number, number], qctOrDda: true, inOverlay: false };
    const exp = pencil({ ...a, inputs: { ...nine, softFunds: 1_000_000 } });
    const com = pencil({ ...a, inputs: { ...nine, softCommitted: 1_000_000 } });
    expect(exp.gap).toBeCloseTo(r.gap, 4);
    expect(exp.gapIfExpected).toBeCloseTo(r.gap - 1_000_000, 4);
    expect(com.gap).toBeCloseTo(r.gap - 1_000_000, 4);
  });
  it('40 homes at 30% AMI in a QCT with $4M expected does not close (rents cannot carry the operating cost)', () => {
    const c = emptyCounts();
    c['30'] = [0, 20, 15, 5];
    const x = pencil({ counts: c, inputs: { ...nine, softFunds: 4_000_000 }, marketRents: [900, 1100, 1400, 1700], qctOrDda: true, inOverlay: false });
    expect(x.noi).toBeLessThan(0);
    expect(x.rentNotes.join(' ')).toMatch(/operating subsidy/);
    expect(tierOf(x, nine.targetYield)).not.toBe('closes');
    expect(TIER_WORD.close).toBe("over PHFA's limit");
  });
  it('headroom: credits sized to need, not money to keep', () => {
    const rich = pencil({ counts, inputs: { ...nine, hardPerSf: 150, softCommitted: 2_000_000 }, marketRents: [900, 1100, 1400, 1700], qctOrDda: true, inOverlay: false });
    expect(rich.gap).toBeLessThan(0);
    expect(rich.headroom).toBeCloseTo(-rich.gap, 4);
    expect(rich.needAnnual! * 10 * 0.88).toBeCloseTo(rich.equity + rich.gap, 2);
  });
  it('the 2027/2028 draft: higher caps, 65 homes for large, no 9% basis limit, 4% fee by home', () => {
    expect(feeCap('nine', 40, false, false, 'draft')).toBe(1_900_000);
    expect(feeCap('nine', 70, true, false, 'draft')).toBe(2_300_000);
    expect(feeCap('nine', 40, false, true, 'draft')).toBe(2_100_000);
    expect(feeCap('nine', 40, false, true, 'adopted')).toBe(2_000_000);
    expect(feeCap('four', 300, false, false, 'draft')).toBe(3_000_000);
    expect(feeCap('four', 300, false, false, 'adopted')).toBe(2_550_000);
    // No basis limit in the draft: the fee base is the cost.
    expect(developerFee(12_000_000, 20, 'nine', false, DEFAULTS, 'draft').value).toBe(1_700_000);
    expect(developerFee(12_000_000, 20, 'nine', false, DEFAULTS, 'adopted').value).toBe(0.15 * 6_400_000);
    // Large at 60 adopted, 65 draft (51% 2BR+): 62 affordable homes, all 2BR.
    const c = emptyCounts();
    c['60'] = [0, 0, 62, 0];
    const base = { counts: c, marketRents: null, qctOrDda: false, inOverlay: false };
    const big = { ...nine, hardPerSf: 600 };
    expect(pencil({ ...base, inputs: { ...big, plan: 'adopted' } }).credits[2].value).toBe(1_800_000);
    expect(pencil({ ...base, inputs: { ...big, plan: 'draft' } }).credits[2].value).toBe(1_850_000);
  });
  it('inputs: your entries win and are marked yours', () => {
    const { inputs, kinds } = resolveInputs({ hardPerSf: 250 }, 'four');
    expect(inputs.hardPerSf).toBe(250);
    expect(kinds.hardPerSf).toBe('yours');
    expect(inputs.price).toBe(0.85);
    expect(kinds.ua).toBe('sourced');
    expect(kinds.vacancy).toBe('sourced');
    expect(inputs.vacancy).toBe(0.05);
    expect(resolveInputs({}, 'nine', DEFAULTS, { senior: true }).inputs.reservesPerHome).toBe(375);
    expect(resolveInputs({}, 'market').kinds.vacancy).toBe('example');
  });
});
