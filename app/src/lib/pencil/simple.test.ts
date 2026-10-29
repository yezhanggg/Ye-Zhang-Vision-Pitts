import { describe, expect, it } from 'vitest';
import { balanceAfter, loanConstant, simpleProForma, type SimpleInputs } from './simple';

// Ye's class workbook (LAW 667, In Class Exercise Skeleton Financing Model_v2), the Community Center case: NMTC + HTC.
const sheet: SimpleInputs = {
  sizeSf: 20000,
  hardPerSf: 370,
  softRatio: 0.33,
  feePct: 0.03,
  acquisition: 2_000_000,
  ltc: 0.2,
  rate: 0.07,
  carryMonths: 18,
  originationFee: 0.01,
  htcRate: 0.2,
  htcPrice: 0.82,
  otherSubsidyPct: 0.2,
  deferredFeePct: 0.5,
  grossRent: 20000 * 19,
  vacancy: 0,
  expenseRatio: 0.15,
  revenueGrowth: 0.02,
  expenseGrowth: 0.03,
  exitCap: 0.065,
};
// The sheet's NMTC line rides in the credit slot; its HTC line is the model's own historic tax credit.
const nmtc = (total: number) => ({ value: total * 0.39 * 0.86, formula: 'NMTC' });

describe('the simple pro forma matches the class workbook', () => {
  const r = simpleProForma(sheet, nmtc);
  it('uses: hard, soft, fee, financing and the total', () => {
    expect(r.uses.map((u) => Math.round(u.value))).toEqual([2_000_000, 7_400_000, 3_102_000, 383_686, 287_546]);
    expect(r.total).toBeCloseTo(13_173_232.38, 1);
  });
  it('sources: loan, credits, subsidy, deferred fee and developer equity as the plug', () => {
    expect(r.loan).toBeCloseTo(2_500_400, 6);
    const by = Object.fromEntries(r.sources.map((s) => [s.label, s.value]));
    expect(r.sources.map((s) => s.label)).toEqual(['Loan', 'LIHTC equity', 'Historic tax credit equity', 'Other subsidy', 'Deferred developer fee', 'Developer equity']);
    expect(by['Historic tax credit equity']).toBeCloseTo(1_832_410.11, 1);
    expect(by['Other subsidy']).toBeCloseTo(2_634_646.48, 1);
    expect(by['Deferred developer fee']).toBeCloseTo(191_843.19, 1);
    expect(r.developerEquity).toBeCloseTo(1_595_630.46, 1);
    expect(r.sources.reduce((s, x) => s + x.value, 0)).toBeCloseTo(r.total, 4);
  });
  it('operations: NOI, interest-only debt service, DSCR and cash flow over 7 years', () => {
    expect(r.years[0]).toMatchObject({ revenue: 380_000, expense: 57_000, noi: 323_000 });
    expect(r.years[0].debtService).toBeCloseTo(175_028, 4);
    expect(r.years[0].dscr).toBeCloseTo(1.8454, 3);
    expect(r.years[6].noi).toBeCloseTo(359_880.74, 1);
    expect(r.years.reduce((s, y) => s + y.cashFlow, 0)).toBeCloseTo(1_163_071.34, 1);
  });
  it('exit: sale price at the exit cap; the interest-only loan is owed in full at sale', () => {
    expect(r.salePrice).toBeCloseTo(5_536_626.74, 1);
    expect(r.netSale).toBeCloseTo(5_536_626.74 - 2_500_400, 1);
    expect(r.feePaid).toBeCloseTo(191_843.19, 1);
    expect(r.multiple!).toBeCloseTo(r.developerReturn / r.developerEquity, 8);
  });
  it('no historic tax credit unless the rate is set', () => {
    const none = simpleProForma({ ...sheet, htcRate: 0 }, nmtc);
    expect(none.sources.some((s) => s.label === 'Historic tax credit equity')).toBe(false);
    expect(none.developerEquity).toBeCloseTo(1_595_630.46 + 1_832_410.11, 1);
  });
  it('vacancy comes off the revenue first', () => {
    expect(simpleProForma({ ...sheet, vacancy: 0.1 }).years[0].revenue).toBeCloseTo(342_000, 6);
  });
});

describe('the simple pro forma beyond the workbook', () => {
  it('an amortizing loan: the full payment is the debt service and the sale repays what is still owed', () => {
    const am = simpleProForma({ ...sheet, amortYears: 35, rate: 0.0625 });
    const k = (12 * (0.0625 / 12)) / (1 - (1 + 0.0625 / 12) ** -420);
    expect(am.debtService).toBeCloseTo(am.loan * k, 6);
    expect(am.years[0].dscr).toBeCloseTo(am.years[0].noi / (am.loan * k), 8);
    expect(am.payoff).toBeCloseTo(balanceAfter(am.loan, 0.0625, 35, 7), 6);
    expect(am.payoff).toBeLessThan(am.loan);
    expect(am.netSale).toBeCloseTo(am.salePrice - am.payoff, 6);
    expect(loanConstant(0.07)).toBe(0.07);
  });
  it('the balance after the full term is zero; interest only owes it all', () => {
    expect(balanceAfter(1_000_000, 0.06, 30, 30)).toBeCloseTo(0, 4);
    expect(balanceAfter(1_000_000, 0.06, 0, 7)).toBe(1_000_000);
  });
  it('operating cost a unit, a longer run and no sale (a tax credit deal)', () => {
    const r = simpleProForma({ ...sheet, opexPerUnit: 5000, units: 10, years: 15, sale: false });
    expect(r.years).toHaveLength(15);
    expect(r.years[0].expense).toBe(50_000);
    expect(r.saleCounted).toBe(false);
    expect(r.salePrice).toBe(0);
    expect(r.multiple).toBeNull();
    expect(r.sources[r.sources.length - 1].label).toBe('Gap to fill');
  });
  it('the first year cash flow falls below zero', () => {
    const r = simpleProForma({ ...sheet, ltc: 0.6, amortYears: 30, expenseRatio: 0.4, expenseGrowth: 0.06 });
    const i = r.years.findIndex((y) => y.cashFlow < 0);
    expect(r.firstNegative).toBe(i < 0 ? null : i + 1);
  });
});
