// The Parcel level's capital test, kept simple (Ye, 2026-10-27): the skeleton financing model from Ye's LAW 667 class
// (In Class Exercise Skeleton Financing Model_v2), one page of uses, sources, a 7-year operating projection and an
// exit. The homes' rents from the unit mix are the revenue; vacancy is added, as Ye asked for it. Arithmetic on
// your inputs, not an underwriting. Online only: loaded on demand.
//
//   Uses      acquisition · hard = $/sq ft × size · commercial space = its sq ft × its $/sq ft (mixed use)
//             soft = ratio × (acquisition + hard + commercial)
//             financing = loan × rate ÷ 12 × months of interest carry + origination fee × loan
//             developer fee = % × (acquisition + hard + commercial + soft + financing) · total = the sum
//   Sources   loan = loan-to-cost × (acquisition + hard + commercial + soft)
//             LIHTC equity (affordable), sized to need: never more than the cost the other sources leave, as PHFA
//             sizes credits; the commercial space stays out of its basis · historic tax credit equity (a certified
//             historic rehab) = (total − acquisition) × 20% × price, as the workbook has it · other subsidy = % × total
//             deferred developer fee = % × fee · developer equity (market) or the gap to fill (tax credits) = the rest
//   Operating revenue (year 1) = gross rent × (1 − vacancy) + commercial rent × (1 − its vacancy), growing yearly;
//             expense = operating cost a unit × units (or the workbook's ratio × revenue), growing yearly
//             NOI = revenue − expense · debt service = loan × the mortgage constant (amortizing), or loan × rate when
//             the amortization is 0 (interest only, as the workbook has it) · DSCR · cash flow = NOI − debt service
//   Exit      sale price = last-year NOI ÷ exit cap · net sale = sale price − the loan still owed
//             developer return = cash flows + net sale + developer fee paid · multiple = return ÷ developer equity
//             Tax credit deals keep the homes for the compliance period: no sale is counted and no multiple.

import { mortgageConstant } from './finance';

export const HOLD_YEARS = 7;
/** Tax credit deals: the 15-year compliance period. */
export const COMPLIANCE_YEARS = 15;

export interface SimpleInputs {
  /** Gross floor area, sq ft. */
  sizeSf: number;
  hardPerSf: number;
  /** Soft cost as a share of acquisition and hard cost. */
  softRatio: number;
  /** Developer fee as a share of acquisition, hard, soft and financing cost. */
  feePct: number;
  acquisition: number;
  /** Loan as a share of acquisition, hard and soft cost. */
  ltc: number;
  rate: number;
  /** Years the loan amortizes over; 0 or unset: interest only (the class workbook). */
  amortYears?: number;
  /** Months of interest carry (the construction period). */
  carryMonths: number;
  originationFee: number;
  /** The historic tax credit rate on (total − acquisition): 0.2 for a certified historic rehab, 0 otherwise. */
  htcRate: number;
  /** What an investor pays for a dollar of historic tax credit. */
  htcPrice: number;
  otherSubsidyPct: number;
  deferredFeePct: number;
  /** Gross rent a year before vacancy. */
  grossRent: number;
  vacancy: number;
  /** The workbook's expense as a share of revenue; unused when `opexPerUnit` is set. */
  expenseRatio?: number;
  /** Operating cost and reserves a unit a year, and the units: year-1 expense = the two multiplied. */
  opexPerUnit?: number;
  units?: number;
  revenueGrowth: number;
  expenseGrowth: number;
  exitCap: number;
  /** Years projected (default 7). */
  years?: number;
  /** Count a sale at the end (default true); false for tax credit deals, which keep the homes. */
  sale?: boolean;
  /** Ground-floor commercial (mixed use): sq ft, rent $ a sq ft a year on a net lease, its vacancy, build $ a sq ft. */
  commercialSf?: number;
  commercialRent?: number;
  commercialVacancy?: number;
  commercialCostPerSf?: number;
}

export interface Line {
  label: string;
  value: number;
  formula: string;
}

export interface SimpleResult {
  uses: Line[];
  total: number;
  sources: Line[];
  loan: number;
  /** Total − the other sources: what the developer puts in (market) or the gap to fill (tax credits). */
  developerEquity: number;
  years: { revenue: number; expense: number; noi: number; debtService: number; dscr: number; cashFlow: number }[];
  /** Year-1 operations: the homes' rent after vacancy, commercial rent after vacancy, operating cost. */
  income: Line[];
  /** Debt service a year: the full payment (the interest when interest only). */
  debtService: number;
  /** The first year cash flow falls below zero, or null. */
  firstNegative: number | null;
  /** A sale counted at the end (market); tax credit deals keep the homes. */
  saleCounted: boolean;
  salePrice: number;
  /** The loan still owed at the sale (all of it when interest only). */
  payoff: number;
  netSale: number;
  feePaid: number;
  developerReturn: number;
  /** Developer return ÷ developer equity; null when the developer puts in nothing or no sale is counted. */
  multiple: number | null;
  /** Tax credit deals: what is still to find after every source (0 when covered). */
  gap: number;
  /** The LIHTC equity the project could claim when it was held to need, else null. */
  creditsCould: number | null;
}

const usd = (v: number) => `${v < 0 ? '−' : ''}$${Math.abs(Math.round(v)).toLocaleString('en-US')}`;
const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
const n0 = (v: number) => Math.round(v).toLocaleString('en-US');

/** Debt service a year on $1 of loan: the amortizing payment, or the rate when interest only (0 years). */
export const loanConstant = (rate: number, amortYears = 0) => (amortYears > 0 ? mortgageConstant(rate, amortYears) : rate);

/** The loan still owed after `years` of monthly payments (all of it when interest only). */
export function balanceAfter(loan: number, rate: number, amortYears: number, years: number): number {
  if (amortYears <= 0 || loan <= 0) return loan;
  const n = amortYears * 12;
  const p = Math.min(n, years * 12);
  const r = rate / 12;
  if (r === 0) return loan * (1 - p / n);
  return (loan * ((1 + r) ** n - (1 + r) ** p)) / ((1 + r) ** n - 1);
}

/** Year-1 revenue and expense as the pro forma counts them. */
export function yearOne(i: SimpleInputs): { homes: number; commercial: number; revenue: number; expense: number } {
  const homes = i.grossRent * (1 - i.vacancy);
  const commercial = (i.commercialSf ?? 0) * (i.commercialRent ?? 0) * (1 - (i.commercialVacancy ?? 0));
  const revenue = homes + commercial;
  const expense = i.opexPerUnit != null ? i.opexPerUnit * (i.units ?? 0) : revenue * (i.expenseRatio ?? 0);
  return { homes, commercial, revenue, expense };
}

/** `creditEquity(total, acquisition, excluded)`: the LIHTC equity a project gets (null for market rate); `excluded` is
 *  the commercial space's share of the cost, kept out of the basis. */
export function simpleProForma(i: SimpleInputs, creditEquity: (total: number, acquisition: number, excluded: number) => { value: number; formula: string } | null = () => null): SimpleResult {
  const hard = i.hardPerSf * i.sizeSf;
  const commSf = i.commercialSf ?? 0;
  const commercial = commSf * (i.commercialCostPerSf ?? 0);
  const soft = i.softRatio * (i.acquisition + hard + commercial);
  const costForLoan = i.acquisition + hard + commercial + soft;
  const loan = i.ltc * costForLoan;
  const carry = loan * (i.rate / 12) * i.carryMonths;
  const orig = i.originationFee * loan;
  const financing = carry + orig;
  const fee = i.feePct * (i.acquisition + hard + commercial + soft + financing);
  const total = i.acquisition + hard + commercial + soft + fee + financing;
  const uses: Line[] = [
    { label: 'Acquisition (land)', value: i.acquisition, formula: 'your land price for the lot' },
    { label: 'Hard cost', value: hard, formula: `${usd(i.hardPerSf)} a sq ft × ${n0(i.sizeSf)} sq ft` },
    ...(commercial > 0 ? [{ label: 'Commercial space', value: commercial, formula: `${usd(i.commercialCostPerSf ?? 0)} a sq ft × ${n0(commSf)} sq ft` }] : []),
    { label: 'Soft cost', value: soft, formula: `${pct(i.softRatio)} × (acquisition + hard cost${commercial > 0 ? ' + commercial' : ''})` },
    { label: 'Developer fee', value: fee, formula: `${pct(i.feePct, 1)} × (acquisition + hard + soft + financing)` },
    { label: 'Financing cost', value: financing, formula: `interest carry ${usd(carry)} (${usd(loan)} × ${pct(i.rate, 2)} ÷ 12 × ${i.carryMonths} months) + origination ${usd(orig)} (${pct(i.originationFee, 1)})` },
  ];
  const sale = i.sale ?? true;
  const credits = creditEquity(total, i.acquisition, commercial * (1 + i.softRatio) * (1 + i.feePct));
  const other = i.otherSubsidyPct * total;
  const deferred = i.deferredFeePct * fee;
  const htc = Math.max(0, total - i.acquisition) * i.htcRate * i.htcPrice;
  const room = Math.max(0, total - loan - other - deferred - htc);
  const held = !!credits && credits.value > room;
  const creditValue = credits ? Math.min(credits.value, room) : 0;
  const left = total - creditValue - htc - loan - other - deferred;
  const equity = Math.abs(left) < 0.5 ? 0 : left;
  const amort = i.amortYears ?? 0;
  const k = loanConstant(i.rate, amort);
  const sources: Line[] = [
    { label: 'Loan', value: loan, formula: `${pct(i.ltc)} loan-to-cost × ${usd(costForLoan)} (acquisition + hard + ${commercial > 0 ? 'commercial + ' : ''}soft); ${amort > 0 ? `${amort} years at ${pct(i.rate, 2)}` : 'interest only'}` },
    ...(credits && creditValue > 0 ? [{ label: 'LIHTC equity', value: creditValue, formula: `${credits.formula}${held ? `; held to ${usd(room)}, what the cost needs (credits are sized to need)` : ''}` }] : []),
    ...(htc > 0 ? [{ label: 'Historic tax credit equity', value: htc, formula: `(${usd(total)} total − ${usd(i.acquisition)} land) × ${pct(i.htcRate)} credit × $${i.htcPrice.toFixed(2)} a credit` }] : []),
    ...(other > 0 ? [{ label: 'Other subsidy', value: other, formula: `${pct(i.otherSubsidyPct)} × ${usd(total)} total` }] : []),
    ...(deferred > 0 ? [{ label: 'Deferred developer fee', value: deferred, formula: `${pct(i.deferredFeePct)} × ${usd(fee)} fee` }] : []),
    sale ? { label: 'Developer equity', value: equity, formula: 'total − the other sources' } : { label: 'Gap to fill', value: equity, formula: 'total − the other sources: subsidy still to find' },
  ];
  const one = yearOne(i);
  const income: Line[] = [
    { label: 'Rent from the homes', value: one.homes, formula: `${usd(i.grossRent)} a year × (1 − ${pct(i.vacancy, 1)} vacancy)` },
    ...(one.commercial > 0 ? [{ label: 'Commercial rent', value: one.commercial, formula: `${n0(commSf)} sq ft × ${usd(i.commercialRent ?? 0)} a sq ft × (1 − ${pct(i.commercialVacancy ?? 0)} vacancy), net lease` }] : []),
    { label: 'Operating cost and reserves', value: one.expense, formula: i.opexPerUnit != null ? `${usd(i.opexPerUnit)} a unit × ${i.units ?? 0} units` : `${pct(i.expenseRatio ?? 0)} of revenue` },
  ];
  const span = Math.max(1, Math.round(i.years ?? HOLD_YEARS));
  const years: SimpleResult['years'] = [];
  const debtService = loan * k;
  let revenue = one.revenue;
  let expense = one.expense;
  for (let y = 0; y < span; y++) {
    if (y > 0) {
      revenue *= 1 + i.revenueGrowth;
      expense *= 1 + i.expenseGrowth;
    }
    const noi = revenue - expense;
    years.push({ revenue, expense, noi, debtService, dscr: debtService > 0 ? noi / debtService : Infinity, cashFlow: noi - debtService });
  }
  const neg = years.findIndex((y) => y.cashFlow < -0.5);
  const payoff = balanceAfter(loan, i.rate, amort, span);
  const salePrice = sale && i.exitCap > 0 ? years[span - 1].noi / i.exitCap : 0;
  const netSale = sale ? salePrice - payoff : 0;
  const feePaid = fee - deferred;
  const developerReturn = years.reduce((s, y) => s + y.cashFlow, 0) + netSale + feePaid;
  return {
    uses, total, sources, loan, developerEquity: equity, years, income, debtService, firstNegative: neg < 0 ? null : neg + 1, saleCounted: sale, salePrice, payoff, netSale, feePaid, developerReturn,
    multiple: sale && equity > 0 ? developerReturn / equity : null,
    gap: sale ? 0 : Math.max(0, equity),
    creditsCould: held ? credits!.value : null,
  };
}
