import { describe, expect, it } from 'vitest';
import { mortgageConstant } from '../pencil/finance';
import { DEFAULTS } from '../pencil/inputs';
import { creditUnits, HTC_RATE, LAND_PER_SF, ltcForCashFlow, rentKey, runCapital, suggestCapital, type CapitalContext } from './capital';
import { emptyCounts, type Counts } from './store';

const market: CapitalContext = { devType: 'market', branch: 'market', plan: 'adopted', units: 40, affordable: 0, large: false, qctOrDda: false, sizeSf: 36000, grossRent: 40 * 1500 * 12, opexPerUnit: 6850, price: 0.88, dscrNeed: 1.2 };
const credits: CapitalContext = { ...market, devType: 'affordable', branch: 'nine', affordable: 40, grossRent: 40 * 1000 * 12, opexPerUnit: 7000, dscrNeed: 1.15 };
const mix = (rows: Partial<Counts>): Counts => ({ ...emptyCounts(), ...rows });
const sum = (r: ReturnType<typeof runCapital>) => r.result.sources.reduce((s, x) => s + x.value, 0);

describe('Capital at the Parcel level', () => {
  it('suggests by type: a bigger loan for market rate, PHFA underwriting sourced on tax credit paths', () => {
    const m = suggestCapital(market);
    const c = suggestCapital(credits);
    expect(m.ltc.value).toBeGreaterThan(c.ltc.value);
    expect(m.vacancy.kind).toBe('suggested');
    expect(c.vacancy).toMatchObject({ value: DEFAULTS.underwriting.vacancy.value, kind: 'sourced' });
    expect(c.deferredFeePct.value).toBeGreaterThan(0);
    expect(m.deferredFeePct.value).toBe(0);
    expect(m.amortYears.value).toBe(30);
    expect(c.amortYears.value).toBe(35);
  });
  it('the land follows the lot: its area × an example $ a sq ft, the same at any number of units', () => {
    const lot = { ...market, lotSqft: 2800 };
    expect(suggestCapital(lot).acquisition.value).toBe(2800 * LAND_PER_SF);
    expect(suggestCapital({ ...lot, units: 12 }).acquisition.value).toBe(2800 * LAND_PER_SF);
    expect(suggestCapital({ ...lot, units: 1 }).acquisition.value).toBe(2800 * LAND_PER_SF);
    expect(suggestCapital(lot).acquisition.note).toMatch(/2,800 sq ft lot .* an example: enter the asking price/);
    // No lot read: the old example a unit.
    expect(suggestCapital(market).acquisition.value).toBe(40 * (DEFAULTS.inputs.land_per_home.value as number));
  });
  it('operating cost is $ a unit with no cap: deep rents do not shrink it, and the cash flow says so', () => {
    const deep = runCapital({ ...credits, grossRent: 40 * 450 * 12 });
    expect(deep.result.years[0].expense).toBe(40 * 7000);
    expect(deep.result.firstNegative).toBe(1);
    expect(deep.result.years[0].noi).toBeLessThan(0);
    const fine = runCapital(market);
    expect(fine.result.years[0].expense).toBe(40 * 6850);
    expect(fine.result.firstNegative).toBeNull();
  });
  it('your changes win and say so; the rest stay suggested', () => {
    const r = runCapital(market, { ltc: 0.5, acquisition: 1_000_000 });
    expect(r.inputs.ltc).toBe(0.5);
    expect(r.kinds.ltc).toBe('yours');
    expect(r.kinds.rate).toBe('suggested');
    expect(r.result.uses[0].value).toBe(1_000_000);
    expect(r.result.loan).toBeCloseTo(0.5 * (1_000_000 + r.result.uses[1].value + r.result.uses[2].value), 4);
  });
  it('market rate has no tax credit equity; the developer equity closes the stack', () => {
    const r = runCapital(market, { ltc: 0.6 });
    expect(r.result.sources.map((s) => s.label)).toEqual(['Loan', 'Developer equity']);
    expect(sum(r)).toBeCloseTo(r.result.total, 4);
    expect(r.result.saleCounted).toBe(true);
    expect(r.result.years).toHaveLength(7);
  });
  it('the loan amortizes: debt service is the full payment and the suggested loan is what year-1 income carries', () => {
    const thin = runCapital({ ...market, grossRent: 40 * 900 * 12 });
    expect(thin.inputs.ltc).toBeLessThan(suggestCapital(market).ltc.value);
    expect(thin.result.debtService).toBeCloseTo(thin.result.loan * mortgageConstant(0.07, 30), 4);
    expect(thin.result.years[0].dscr).toBeGreaterThanOrEqual(1.2);
    // The payoff at the sale is what is still owed, less than the loan.
    expect(thin.result.payoff).toBeLessThan(thin.result.loan);
    expect(thin.result.payoff).toBeGreaterThan(0.8 * thin.result.loan);
    const rich = runCapital({ ...market, grossRent: 40 * 4000 * 12 });
    expect(rich.inputs.ltc).toBe(suggestCapital(market).ltc.value);
    expect(runCapital({ ...market, grossRent: 40 * 900 * 12 }, { ltc: 0.7 }).inputs.ltc).toBe(0.7);
  });
  it('0 years is interest only, as the class workbook has it', () => {
    const io = runCapital(market, { amortYears: 0, ltc: 0.6 });
    expect(io.result.debtService).toBeCloseTo(io.result.loan * io.inputs.rate, 4);
    expect(io.result.payoff).toBeCloseTo(io.result.loan, 4);
    const am = runCapital(market, { ltc: 0.6 });
    expect(am.result.debtService).toBeGreaterThan(io.result.debtService);
  });
  it('the historic tax credit is off until asked for, then (total − land) × 20% × price, and LIHTC makes room for it', () => {
    expect(runCapital(market).result.sources.some((s) => s.label === 'Historic tax credit equity')).toBe(false);
    const r = runCapital(market, { htcRate: HTC_RATE, ltc: 0.6 });
    const htc = r.result.sources.find((s) => s.label === 'Historic tax credit equity')!.value;
    expect(htc).toBeCloseTo((r.result.total - r.inputs.acquisition) * 0.2 * 0.82, 4);
    expect(r.kinds.htcRate).toBe('yours');
    const both = runCapital({ ...credits, qctOrDda: true }, { ltc: 0.5, htcRate: HTC_RATE });
    expect(both.result.sources.map((s) => s.label)).toEqual(['Loan', 'LIHTC equity', 'Historic tax credit equity', 'Deferred developer fee', 'Gap to fill']);
    expect(sum(both)).toBeCloseTo(both.result.total, 4);
  });
  it('tax credits are sized to need: never more than the cost the other sources leave', () => {
    const r = runCapital({ ...credits, qctOrDda: true }, { ltc: 0.75 });
    expect(r.result.creditsCould).not.toBeNull();
    expect(r.result.developerEquity).toBeCloseTo(0, 4);
    expect(r.result.gap).toBe(0);
    expect(sum(r)).toBeCloseTo(r.result.total, 4);
  });
  it('tax credit equity: (total − land) × the share of units at 60% AMI or below × 9% × 10 × price, held to the 9% cap', () => {
    const r = runCapital({ ...credits, creditUnits: 20 }, { ltc: 0 });
    const land = r.inputs.acquisition;
    const want = Math.min((r.result.total - land) * 0.5 * 0.09, DEFAULTS.phfa.credit_cap.base) * 10 * 0.88;
    expect(r.result.sources.find((s) => s.label === 'LIHTC equity')!.value).toBeCloseTo(want, 4);
    const big = runCapital({ ...credits, sizeSf: 200_000, units: 200, affordable: 200, qctOrDda: true }, { ltc: 0 });
    expect(big.result.sources.find((s) => s.label === 'LIHTC equity')!.value).toBeCloseTo(DEFAULTS.phfa.credit_cap.base * 10 * 0.88, 4);
  });
  it('units count toward credits at 60% AMI or below, or income-averaged; none at 80% or under the set-aside', () => {
    expect(creditUnits(mix({ '50': [0, 16, 16, 8] })).units).toBe(40);
    expect(creditUnits(mix({ '80': [0, 16, 16, 8] }))).toMatchObject({ units: 0, why: expect.stringMatching(/60% AMI or below/) });
    // Income averaging: 20 at 30% and 20 at 80% average 55%.
    expect(creditUnits(mix({ '30': [0, 10, 10, 0], '80': [0, 10, 10, 0] })).units).toBe(40);
    // 2 of 40 at 50% AMI: under the 20/50 and 40/60 minimums.
    expect(creditUnits(mix({ '50': [0, 2, 0, 0], mkt: [0, 20, 18, 0] }))).toMatchObject({ units: 0, why: expect.stringMatching(/federal minimum/) });
    // 80% AMI: no credits, and the gap shows.
    const at80 = runCapital({ ...credits, creditUnits: 0, creditWhy: 'these are at 80%' }, { ltc: 0.2 });
    expect(at80.noCredits).toBe('these are at 80%');
    expect(at80.result.sources.some((s) => s.label === 'LIHTC equity')).toBe(false);
    expect(at80.result.gap).toBeGreaterThan(0.5 * at80.result.total);
  });
  it('tax credit deals run 15 years with no sale and no multiple; the rest is the gap to fill', () => {
    const r = runCapital({ ...credits, creditUnits: 10 }, { ltc: 0.2 });
    expect(r.result.years).toHaveLength(15);
    expect(r.result.saleCounted).toBe(false);
    expect(r.result.salePrice).toBe(0);
    expect(r.result.multiple).toBeNull();
    expect(r.result.sources[r.result.sources.length - 1].label).toBe('Gap to fill');
    expect(r.result.gap).toBeCloseTo(r.result.developerEquity, 6);
    // The fix closes it exactly: other subsidy of the gap's share of the cost.
    const closed = runCapital({ ...credits, creditUnits: 10 }, { ltc: 0.2, otherSubsidyPct: r.result.gap / r.result.total });
    expect(closed.result.gap).toBeLessThan(1);
  });
  it('the suggested tax credit loan keeps cash flow above zero for the 15 years', () => {
    const r = runCapital({ ...credits, grossRent: 40 * 1100 * 12 });
    expect(r.result.firstNegative).toBeNull();
    expect(r.result.years[0].dscr).toBeGreaterThanOrEqual(1.15);
  });
  it('ltcForCashFlow: the loan at which no year runs negative', () => {
    const r = runCapital(credits, { ltc: 0.4 });
    expect(r.result.firstNegative).not.toBeNull();
    const ltc = ltcForCashFlow(r)!;
    expect(runCapital(credits, { ltc }).result.firstNegative).toBeNull();
    expect(runCapital(credits, { ltc: ltc + 0.02 }).result.firstNegative).not.toBeNull();
  });
  it('mixed use: ground-floor rent in revenue, its build cost in uses, kept out of the credit basis', () => {
    const plain = runCapital({ ...credits, devType: 'mixed' }, { ltc: 0 });
    const mixed = runCapital({ ...credits, devType: 'mixed', commercialSf: 5000 }, { ltc: 0 });
    expect(mixed.result.uses.find((u) => u.label === 'Commercial space')!.value).toBe(5000 * 300);
    expect(mixed.result.income.find((l) => l.label === 'Commercial rent')!.value).toBeCloseTo(5000 * 18 * 0.9, 6);
    expect(mixed.result.years[0].noi - plain.result.years[0].noi).toBeCloseTo(5000 * 18 * 0.9, 6);
    const credit = (r: typeof plain) => r.result.sources.find((s) => s.label === 'LIHTC equity')!.value;
    expect(credit(mixed)).toBeLessThanOrEqual(credit(plain) * 1.02);
    expect(sum(mixed)).toBeCloseTo(mixed.result.total, 4);
    // Not mixed use: no commercial line even with a floor area.
    expect(runCapital({ ...credits, commercialSf: 5000 }).result.uses.some((u) => u.label === 'Commercial space')).toBe(false);
  });
  it('rents are shown size by size and editable: yours replaces the sourced rent in the revenue', () => {
    const rents = [
      { level: '50' as const, br: 1, units: 30, rent: 1000, source: '50% AMI limit' },
      { level: '50' as const, br: 2, units: 10, rent: 1200, source: '50% AMI limit' },
    ];
    const r = runCapital({ ...credits, rents });
    expect(r.inputs.grossRent).toBe((30 * 1000 + 10 * 1200) * 12);
    const mine = runCapital({ ...credits, rents }, { [rentKey(rents[0])]: 900 });
    expect(mine.rents[0]).toMatchObject({ rent: 900, sourced: 1000, kind: 'yours' });
    expect(mine.inputs.grossRent).toBe((30 * 900 + 10 * 1200) * 12);
  });
});
