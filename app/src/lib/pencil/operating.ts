// Fifteen years of cash flow on PHFA's underwriting trends (Tab 2: income +2% and expenses +3% a year, fixed debt
// service), for the two operating tests a tax credit deal faces: cash flow at least zero in years 1–10 (PHFA's
// threshold, draft §3.4.2), and the deferred developer fee repaid from cash flow by year 15 (investor practice, shown
// only). Arithmetic on the year-one figures the pencil already has.

export interface Operating {
  /** Cash flow after debt service, years 1–15. */
  years: number[];
  /** The first year cash flow falls below zero, or null. */
  firstNegative: number | null;
  /** Cash flow at least zero through `positiveYears`. */
  positive: boolean;
  /** Cash flow summed over the years, and whether it repays the deferred fee by the last one. */
  cumulative: number;
  repaysFee: boolean;
}

export function cashFlow(egi: number, opex: number, debtService: number, deferredFee: number, incomeTrend: number, expenseTrend: number, positiveYears = 10, span = 15): Operating {
  const years: number[] = [];
  for (let y = 0; y < span; y++) years.push(egi * (1 + incomeTrend) ** y - opex * (1 + expenseTrend) ** y - debtService);
  const neg = years.findIndex((v) => v < 0);
  const cumulative = years.reduce((s, v) => s + v, 0);
  return { years, firstNegative: neg < 0 ? null : neg + 1, positive: neg < 0 || neg >= positiveYears, cumulative, repaysFee: cumulative >= deferredFee };
}
