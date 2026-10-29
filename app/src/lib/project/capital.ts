// The Parcel level's Capital (Ye, 2026-10-27): the inputs of the simple pro forma (lib/pencil/simple), each suggested
// for the kind of project unless the person changes it, and the run on the project as set on the left. Revenue is the
// unit mix's rent a year from the pencil's rents (tax credit rents net of utilities; market rents from asking rents or
// Small Area FMRs), shown and editable unit size by unit size; mixed use adds its ground-floor commercial rent. The land
// follows the lot: its area × an example price a sq ft. Operating cost is $ a unit, as entered, with no cap. The loan
// amortizes (0 years: interest only, as the class workbook has it). LIHTC equity is kept to one line: (total − land −
// commercial) × the QCT/DDA boost × the share of units that qualify (60% AMI or below, or an income-averaged mix) ×
// the credit rate × 10 years × the credit price, held to PHFA's 9% cap. Tax credit deals are judged by the gap and the
// cash flow over the 15-year compliance period, with no sale. The historic tax credit, for any kind of housing, is the
// workbook's line: (total − land) × 20% × its price, once the person says the building is a certified historic rehab.
// Online only: loaded on demand.
import { DEFAULTS, planRules, type Plan } from '../pencil/inputs';
import { COMPLIANCE_YEARS, HOLD_YEARS, loanConstant, simpleProForma, yearOne, type SimpleInputs, type SimpleResult } from '../pencil/simple';
import type { DevType } from './devType';
import { MIX_LEVELS, type Counts, type MixLevel } from './store';

export type CapitalKey =
  | 'acquisition' | 'hardPerSf' | 'softRatio' | 'feePct' | 'ltc' | 'rate' | 'amortYears' | 'carryMonths' | 'originationFee' | 'htcRate' | 'htcPrice'
  | 'otherSubsidyPct' | 'deferredFeePct' | 'vacancy' | 'opexPerUnit' | 'revenueGrowth' | 'expenseGrowth' | 'exitCap' | 'price'
  | 'commercialRent' | 'commercialVacancy' | 'commercialCostPerSf';
export type CapitalKind = 'sourced' | 'suggested' | 'yours';

export interface CapitalField {
  key: CapitalKey;
  label: string;
  as: 'usd' | 'pct' | 'num' | 'price';
  step: number;
  /** LIHTC projects only. */
  credits?: boolean;
  /** Only when the historic tax credit is on. */
  historic?: boolean;
  /** Only when a sale is counted (market rate). */
  sale?: boolean;
}

export interface CapitalGroup {
  title: string;
  fields: CapitalField[];
  /** Mixed use only. */
  commercial?: boolean;
}

/** The inputs in the workbook's order: uses, the loan, tax credits and subsidy, operations, the sale. The historic tax
 *  credit itself is a yes/no (htcRate), and LIHTC a 9%/4% pick, above their prices. */
export const CAPITAL_GROUPS: CapitalGroup[] = [
  {
    title: 'Uses: what it costs',
    fields: [
      { key: 'acquisition', label: 'Land price', as: 'usd', step: 10000 },
      { key: 'hardPerSf', label: 'Hard cost, $ a sq ft', as: 'usd', step: 5 },
      { key: 'softRatio', label: 'Soft cost, % of land + hard', as: 'pct', step: 1 },
      { key: 'feePct', label: 'Developer fee, % of cost', as: 'pct', step: 0.5 },
    ],
  },
  {
    title: 'The loan',
    fields: [
      { key: 'ltc', label: 'Loan-to-cost', as: 'pct', step: 5 },
      { key: 'rate', label: 'Interest rate', as: 'pct', step: 0.25 },
      { key: 'amortYears', label: 'Amortization, years', as: 'num', step: 5 },
      { key: 'carryMonths', label: 'Construction period, months', as: 'num', step: 1 },
    ],
  },
  {
    title: 'Tax credits and subsidy',
    fields: [
      { key: 'price', label: 'LIHTC price, $ a credit', as: 'price', step: 0.01, credits: true },
      { key: 'htcPrice', label: 'Historic credit price, $ a credit', as: 'price', step: 0.01, historic: true },
      { key: 'otherSubsidyPct', label: 'Other subsidy, % of total cost', as: 'pct', step: 1 },
      { key: 'deferredFeePct', label: 'Developer fee deferred', as: 'pct', step: 5 },
    ],
  },
  {
    title: 'Operations',
    fields: [
      { key: 'vacancy', label: 'Vacancy', as: 'pct', step: 1 },
      { key: 'opexPerUnit', label: 'Operating cost, $ a unit a year', as: 'usd', step: 100 },
    ],
  },
  {
    title: 'Ground-floor commercial',
    commercial: true,
    fields: [
      { key: 'commercialRent', label: 'Rent, $ a sq ft a year', as: 'usd', step: 1 },
      { key: 'commercialVacancy', label: 'Commercial vacancy', as: 'pct', step: 1 },
      { key: 'commercialCostPerSf', label: 'Build cost, $ a sq ft', as: 'usd', step: 5 },
    ],
  },
  {
    title: 'Sale',
    fields: [{ key: 'exitCap', label: 'Exit cap rate, sale in year 7', as: 'pct', step: 0.25, sale: true }],
  },
];
/** Folded under "More". */
export const CAPITAL_MORE: CapitalField[] = [
  { key: 'originationFee', label: 'Loan origination fee', as: 'pct', step: 0.25 },
  { key: 'revenueGrowth', label: 'Rent growth a year', as: 'pct', step: 0.5 },
  { key: 'expenseGrowth', label: 'Expense growth a year', as: 'pct', step: 0.5 },
];

/** The federal historic tax credit: 20% of qualified rehabilitation cost. */
export const HTC_RATE = 0.2;
/** Land an example price a sq ft of lot (no assessed values): the person enters the asking price. */
export const LAND_PER_SF = 20;
/** Ground-floor commercial examples: rent a sq ft a year on a net lease, and its vacancy. */
export const COMMERCIAL_RENT = 18;
export const COMMERCIAL_VACANCY = 0.1;
/** The highest income level a tax credit unit can carry, and the average an income-averaged mix must keep (§42(g)). */
export const CREDIT_AMI = 60;

/** One unit size at one income level: its units, the monthly rent the pencil uses and where it comes from. */
export interface RentRow {
  level: MixLevel;
  /** 0 studio, 1, 2, 3 or more bedrooms. */
  br: number;
  units: number;
  rent: number;
  source: string;
}
export const rentKey = (r: Pick<RentRow, 'level' | 'br'>) => `rent:${r.level}:${r.br}`;

export interface CapitalContext {
  devType: DevType;
  /** Tax credit financing, and which credits. */
  branch: 'market' | 'nine' | 'four';
  plan: Plan;
  units: number;
  /** Homes with an income limit. */
  affordable: number;
  /** Units that count toward tax credits (creditUnits); unset: every unit with an income limit. */
  creditUnits?: number;
  /** Why no unit counts toward tax credits, when none does. */
  creditWhy?: string | null;
  /** PHFA's higher 9% cap applies (enough affordable homes, enough of them two bedrooms or more). */
  large: boolean;
  qctOrDda: boolean;
  /** Gross floor area of the homes, sq ft. */
  sizeSf: number;
  /** The unit mix's rent a year, before vacancy (the rent rows' sum when they are given). */
  grossRent: number;
  /** The rent of each unit size, editable one by one. */
  rents?: RentRow[];
  /** Operating cost and reserves a unit a year (the pencil's): the suggested operating cost. */
  opexPerUnit: number;
  /** The pencil's credit price for the branch. */
  price: number;
  /** The coverage a lender asks for (the pencil's: PHFA's 1.15 on tax credit paths). Sizes the suggested loan. */
  dscrNeed: number;
  /** The lot the project is read on, sq ft (a parcel's own; at a tract or ZIP, a lot of the size it needs). Unset:
   *  the land is an example a unit. */
  lotSqft?: number | null;
  /** Ground-floor commercial, sq ft (mixed use). */
  commercialSf?: number;
}

interface Suggestion {
  value: number;
  kind: Exclude<CapitalKind, 'yours'>;
  note: string;
}

const round = (v: number, step: number) => Math.round(v / step) * step;
const n0 = (v: number) => Math.round(v).toLocaleString('en-US');

/** Units that count toward tax credits: those at 60% AMI or below, or every unit with an income limit when the mix
 *  income-averages (at least 40% of units, averaging 60% AMI or less); none under the federal minimum set-aside
 *  (20% of units at 50% AMI or 40% at 60%). */
export function creditUnits(c: Counts): { units: number; why: string | null } {
  const at = (ls: MixLevel[]) => ls.reduce((s, l) => s + c[l].reduce((a, b) => a + b, 0), 0);
  const all = MIX_LEVELS.reduce((s, l) => s + c[l].reduce((a, b) => a + b, 0), 0);
  const limited = at(['30', '50', '60', '80']);
  const avg = limited > 0 ? (['30', '50', '60', '80'] as const).reduce((s, l) => s + Number(l) * at([l]), 0) / limited : 0;
  if (all <= 0) return { units: 0, why: null };
  if (limited / all >= 0.4 && avg <= CREDIT_AMI) return { units: limited, why: null };
  const low = at(['30', '50', '60']);
  if (low === 0) return { units: 0, why: limited > 0 ? `Units must be at ${CREDIT_AMI}% AMI or below to earn tax credits; these are at 80%` : 'No units carry an income limit' };
  if (at(['30', '50']) / all >= 0.2 || low / all >= 0.4) return { units: low, why: null };
  return { units: 0, why: `Under the federal minimum for tax credits: 20% of units at 50% AMI or 40% at ${CREDIT_AMI}% (${low} of ${all})` };
}

/** Starting values for the kind of project: rules of thumb labeled "suggested", PHFA's underwriting values "sourced" on
 *  tax credit paths. No AI call. */
export function suggestCapital(c: CapitalContext): Record<CapitalKey, Suggestion> {
  const credits = c.branch !== 'market';
  const mixed = c.devType === 'mixed' && (c.commercialSf ?? 0) > 0;
  const u = DEFAULTS.underwriting;
  const inp = (k: string) => DEFAULTS.inputs[k].value as number;
  const note = (k: string) => DEFAULTS.inputs[k].note;
  const s = (value: number, note: string): Suggestion => ({ value, kind: 'suggested', note });
  const src = (value: number, note: string): Suggestion => ({ value, kind: 'sourced', note });
  const vacancy = credits ? src(u.vacancy.value, `PHFA underwriting, ${u.vacancy.ref}`) : s(c.devType === 'mixed' ? 0.07 : 0.06, 'A market-rate rule of thumb; check the area’s vacancy');
  const months = c.devType === 'mixed' ? 20 : c.devType === 'affordable' ? 18 : c.devType === 'senior' ? 16 : 14;
  const lot = c.lotSqft != null && c.lotSqft > 0 ? c.lotSqft : null;
  return {
    acquisition: lot
      ? s(round(lot * LAND_PER_SF, 1000), `${n0(lot)} sq ft lot × $${LAND_PER_SF} a sq ft, an example: enter the asking price`)
      : s(inp('land_per_home') * c.units, `$${inp('land_per_home').toLocaleString('en-US')} a unit, an example: enter the asking price`),
    hardPerSf: s(inp('hard_per_sf'), note('hard_per_sf')),
    softRatio: s(credits ? 0.25 : 0.2, credits ? 'Tax credit deals carry more legal, syndication and reserve cost' : 'Design, permits, insurance, legal'),
    feePct: s(credits ? 0.1 : 0.04, credits ? 'PHFA allows up to 15% of the first $10M of cost less land' : 'A market-rate rule of thumb'),
    ltc: s(c.branch === 'nine' ? 0.2 : c.branch === 'four' ? 0.45 : c.devType === 'mixed' ? 0.6 : 0.65, credits ? (c.branch === 'four' ? '4% deals carry tax-exempt bonds, so a larger loan' : 'Credit equity pays most of a 9% deal; the loan is small') : 'A construction-to-permanent loan for market-rate rental'),
    rate: s(credits ? inp('rate') : 0.07, credits ? note('rate') : 'A market-rate loan rule of thumb'),
    amortYears: s(credits ? inp('amort_years') : 30, `Years to pay off the loan${credits ? ' on a tax credit deal' : ''}; 0 = interest only, as in the class workbook`),
    carryMonths: s(months, 'A typical construction period for this kind of project'),
    originationFee: s(0.01, 'One point at closing'),
    htcRate: s(0, 'Only for a certified historic building being rehabilitated: listed on the National Register or contributing to a registered historic district, with the rehab approved by the National Park Service'),
    htcPrice: s(0.82, 'The class workbook’s historic credit price; ask a syndicator for a current one'),
    otherSubsidyPct: s(0, 'Gap funds such as URA, HOME or the Housing Trust Fund, once committed'),
    deferredFeePct: s(credits ? 0.25 : 0, credits ? 'PHFA’s draft plan scores 10–30% deferred as Pass-Basic' : 'Market-rate fees are usually paid in full'),
    vacancy,
    opexPerUnit: s(Math.round(c.opexPerUnit), 'The pencil’s operating cost with property taxes, plus replacement reserves'),
    revenueGrowth: credits ? src(u.income_trend.value, `PHFA underwriting, ${u.income_trend.ref}`) : s(u.income_trend.value, 'A rule of thumb'),
    expenseGrowth: credits ? src(u.expense_trend.value, `PHFA underwriting, ${u.expense_trend.ref}`) : s(u.expense_trend.value, 'A rule of thumb'),
    exitCap: s(credits ? 0.07 : c.devType === 'mixed' ? 0.065 : 0.06, 'Sale price = year-7 net operating income ÷ this rate'),
    price: s(c.price, 'Ask a syndicator for a current price'),
    commercialRent: s(mixed ? COMMERCIAL_RENT : 0, 'A neighborhood ground-floor rent on a net lease, an example: check local listings'),
    commercialVacancy: s(mixed ? COMMERCIAL_VACANCY : 0, 'Ground-floor space sits empty more often than homes'),
    // Filled with the hard cost in force (runCapital).
    commercialCostPerSf: s(mixed ? inp('hard_per_sf') : 0, 'The homes’ hard cost, an example'),
  };
}

export interface CapitalRun {
  inputs: SimpleInputs;
  price: number;
  kinds: Record<CapitalKey, CapitalKind>;
  notes: Record<CapitalKey, string>;
  result: SimpleResult;
  credits: boolean;
  /** The rents in force, each with its kind (sourced, or yours). */
  rents: (RentRow & { kind: CapitalKind; sourced: number })[];
  /** Why a tax credit deal gets no credits (no unit at 60% AMI or below, or under the minimum set-aside), else null. */
  noCredits: string | null;
}

const usd = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;
const pct = (v: number) => `${+(v * 100).toFixed(1)}%`;

/** The simple pro forma on the project, with the person's changes over the suggestions. Rent overrides are keyed
 *  `rent:<level>:<bedrooms>` (rentKey). */
export function runCapital(c: CapitalContext, overrides: Record<string, number> = {}): CapitalRun {
  const sug = suggestCapital(c);
  const kinds = {} as Record<CapitalKey, CapitalKind>;
  const notes = {} as Record<CapitalKey, string>;
  const v = {} as Record<CapitalKey, number>;
  const mine = (k: string) => typeof overrides[k] === 'number' && Number.isFinite(overrides[k]);
  for (const k of Object.keys(sug) as CapitalKey[]) {
    v[k] = mine(k) ? overrides[k] : sug[k].value;
    kinds[k] = mine(k) ? 'yours' : sug[k].kind;
    notes[k] = sug[k].note;
  }
  if (!mine('commercialCostPerSf') && sug.commercialCostPerSf.value > 0) v.commercialCostPerSf = v.hardPerSf;
  const rents = (c.rents ?? []).map((r) => ({ ...r, sourced: r.rent, rent: mine(rentKey(r)) ? overrides[rentKey(r)] : r.rent, kind: (mine(rentKey(r)) ? 'yours' : 'sourced') as CapitalKind }));
  const grossRent = c.rents ? rents.reduce((s, r) => s + r.units * r.rent * 12, 0) : c.grossRent;
  const credits = c.branch !== 'market';
  const commercialSf = c.devType === 'mixed' ? Math.max(0, c.commercialSf ?? 0) : 0;
  const base: SimpleInputs = {
    ...v,
    sizeSf: c.sizeSf,
    grossRent,
    units: c.units,
    years: credits ? COMPLIANCE_YEARS : HOLD_YEARS,
    sale: !credits,
    commercialSf,
  };
  // The suggested loan is the one year-1 income carries at the coverage a lender asks for, up to the type's usual
  // loan-to-cost; on tax credit paths also held so cash flow stays above zero through the compliance period (PHFA
  // sizes the mortgage to positive cash flow). Floored to a whole percent so the coverage holds.
  if (kinds.ltc !== 'yours') {
    const cost = (v.acquisition + v.hardPerSf * c.sizeSf + commercialSf * v.commercialCostPerSf) * (1 + v.softRatio);
    const one = yearOne(base);
    let low = Infinity;
    if (credits) for (let y = 0; y < COMPLIANCE_YEARS; y++) low = Math.min(low, one.revenue * (1 + v.revenueGrowth) ** y - one.expense * (1 + v.expenseGrowth) ** y);
    const k = loanConstant(v.rate, v.amortYears);
    const carries = Math.max(0, Math.min((one.revenue - one.expense) / c.dscrNeed, low));
    const carried = cost > 0 && k > 0 && c.dscrNeed > 0 ? carries / k / cost : 0;
    const most = sug.ltc.value;
    if (carried < most) {
      v.ltc = Math.floor(carried * 100) / 100;
      notes.ltc = `Sized so year-1 income covers the payment ${c.dscrNeed.toFixed(2)}×${credits ? ', with cash flow above zero for 15 years' : ''}; up to ${pct(most)} for this kind of project.`;
    }
  }
  const inputs: SimpleInputs = { ...base, ltc: v.ltc };
  const cu = c.creditUnits ?? c.affordable;
  const noCredits = credits && c.units > 0 && cu <= 0 ? (c.creditWhy ?? 'No units qualify for tax credits') : null;
  const creditEquity = (total: number, land: number, excluded: number) => {
    if (!credits || c.units <= 0 || cu <= 0) return null;
    const br = c.branch as 'nine' | 'four';
    const P = planRules(c.plan);
    const boost = c.qctOrDda ? DEFAULTS.credit.boost.value : 1;
    const share = Math.min(1, cu / c.units);
    const rate = DEFAULTS.credit[br].rate;
    const raw = Math.max(0, total - land - excluded) * boost * share * rate;
    const cap = br === 'nine' ? Math.max(P.credit_cap.base, c.large ? P.credit_cap.large : 0) : Infinity;
    const annual = Math.min(raw, cap);
    const years = DEFAULTS.credit.credit_years.value;
    return {
      value: annual * years * v.price,
      formula: `(${usd(total)} − ${usd(land)} land${excluded > 0 ? ` − ${usd(excluded)} commercial` : ''})${boost !== 1 ? ` × ${boost} (QCT or DDA)` : ''} × ${pct(share)} of units at ${CREDIT_AMI}% AMI or below × ${pct(rate)} = ${usd(raw)} a year${raw > cap ? `, held to PHFA’s ${usd(cap)} cap` : ''}; × ${years} years × $${v.price.toFixed(2)}`,
    };
  };
  return { inputs, price: v.price, kinds, notes, result: simpleProForma(inputs, creditEquity), credits, rents, noCredits };
}

/** The loan-to-cost at which cash flow stays at or above zero in every year of the run (null: no loan does). */
export function ltcForCashFlow(run: CapitalRun): number | null {
  const r = run.result;
  const low = Math.min(...r.years.map((y) => y.noi));
  if (low <= 0) return null;
  const k = loanConstant(run.inputs.rate, run.inputs.amortYears);
  const i = run.inputs;
  const cost = (i.acquisition + i.hardPerSf * i.sizeSf + (i.commercialSf ?? 0) * (i.commercialCostPerSf ?? 0)) * (1 + i.softRatio);
  return cost > 0 && k > 0 ? Math.floor((low / k / cost) * 100) / 100 : null;
}
