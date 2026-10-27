// The pencil's inputs (docs/data/pencil.md): app/src/data/lazy/pencil_defaults.json carries PHFA's caps (the adopted
// plan and the 2027/2028 draft), PHFA's underwriting values, the credit rates, HUD's MTSP limits and HACP's utility
// allowances (sourced) and example costs; the person's own numbers (lib/project/store, `pencil`) replace any of them.
import file from '../../data/lazy/pencil_defaults.json';

export type Branch = 'nine' | 'four' | 'market';
/** Which PHFA plan sets the caps: the one the tax credit sheet is scored on (lib/lihtc/store `sheet`). */
export type Plan = 'adopted' | 'draft';
type Ref = { value: number; ref: string };
export interface PlanRules {
  label: string;
  basis_per_home: { nine: number | null; four: number | null; four_over_35?: number; ref: string };
  credit_cap: { base: number; large: number; supportive: number; ref: string };
  fee: { first: number; first_upto: number; after: number; cap_nine_base: number; cap_nine_large: number; cap_nine_supportive: number; cap_four_paid: number; cap_four_per_home?: number; ref: string };
  feasible_gap_share: Ref;
  funded_gap_share: Ref;
  large_homes: Ref;
  large_2br_share: Ref;
  commitment?: { exceed: number; basic: number; ref: string };
  pools?: { ref: string };
}
export type InputKind = 'sourced' | 'example' | 'yours';
type Quad = [number, number, number, number];

export interface DefaultsFile {
  read_on: string;
  sources: Record<string, { title: string; url: string }>;
  credit: { nine: { rate: number; ref: string }; four: { rate: number; ref: string }; boost: { value: number; ref: string }; credit_years: { value: number; ref: string }; bond_test: { value: number; ref: string } };
  phfa: PlanRules;
  phfa_draft: PlanRules;
  plans: { adopted: { sheet: string; label: string }; draft: { sheet: string; label: string; next_round: string; adopted: boolean; ref: string } };
  underwriting: { vacancy: Ref; reserves_general: Ref; reserves_senior: Ref; dscr: Ref; income_trend: Ref; expense_trend: Ref; positive_years: Ref; fee_repaid_years: Ref };
  set_aside: { ref: string };
  ua: { by_br: Quad; ref: string; source: string };
  inputs: Record<string, { value: number | number[] | boolean; unit: string; kind: 'example'; note: string }>;
  mtsp: { area: string; fy: number; median: number; l: Record<'30' | '50' | '60' | '80', number[]> };
}

export const DEFAULTS = file as unknown as DefaultsFile;

export interface PencilInputs {
  branch: Branch;
  hardPerSf: number;
  softShare: number;
  landPerHome: number;
  unitSf: Quad;
  efficiency: number;
  vacancy: number;
  opexPerHome: number;
  reservesPerHome: number;
  rate: number;
  amortYears: number;
  dscr: number;
  price: number;
  ineligibleShare: number;
  /** Soft funds applied for or expected: PHFA counts them as gap until committed. */
  softFunds: number;
  /** Soft funds committed in writing. */
  softCommitted: number;
  stateBoost: boolean;
  /** In the supportive housing preference (its caps apply if awarded). */
  supportive: boolean;
  plan: Plan;
  incomeTrend: number;
  expenseTrend: number;
  targetYield: number;
  ua: Quad;
}

/** Input key → the defaults-file key it reads (the credit price depends on the branch). */
const KEYS: Record<Exclude<keyof PencilInputs, 'branch' | 'ua' | 'price' | 'plan' | 'incomeTrend' | 'expenseTrend'>, string> = {
  hardPerSf: 'hard_per_sf', softShare: 'soft_share', landPerHome: 'land_per_home', unitSf: 'unit_sf', efficiency: 'efficiency', vacancy: 'vacancy',
  opexPerHome: 'opex_per_home', reservesPerHome: 'reserves_per_home', rate: 'rate', amortYears: 'amort_years', dscr: 'dscr', ineligibleShare: 'ineligible_share',
  softFunds: 'soft_funds', softCommitted: 'soft_committed', stateBoost: 'state_boost', supportive: 'supportive', targetYield: 'target_yield',
};
/** Inputs PHFA's underwriting sets for tax credit paths (Tab 2), sourced unless the person changes them. */
const UNDERWRITTEN = new Set(['vacancy', 'reservesPerHome', 'dscr']);

/** The rules of a plan. */
export const planRules = (plan: Plan, d: DefaultsFile = DEFAULTS): PlanRules => (plan === 'draft' ? d.phfa_draft : d.phfa);
/** The plan a tax credit sheet id stands for. */
export const planOfSheet = (sheet: string, d: DefaultsFile = DEFAULTS): Plan => (sheet === d.plans.draft.sheet ? 'draft' : 'adopted');

export type Overrides = Record<string, number | string | boolean | number[] | null | undefined>;

/** The inputs in force, and where each came from. Tax credit paths take PHFA's underwriting values (vacancy, reserves
 *  by residents, coverage) as sourced defaults; market rate keeps the examples. `plan` sets the caps. */
export function resolveInputs(overrides: Overrides, branch: Branch, d: DefaultsFile = DEFAULTS, ctx: { plan?: Plan; senior?: boolean } = {}): { inputs: PencilInputs; kinds: Record<string, InputKind> } {
  const kinds: Record<string, InputKind> = {};
  const pick = <T,>(key: string, fallback: T, kind: InputKind = 'example'): T => {
    const v = overrides[key];
    if (v !== undefined && v !== null && v !== '') {
      kinds[key] = 'yours';
      return v as T;
    }
    kinds[key] = kind;
    return fallback;
  };
  const u = d.underwriting;
  const phfa: Record<string, number> = { vacancy: u.vacancy.value, reservesPerHome: (ctx.senior ? u.reserves_senior : u.reserves_general).value, dscr: u.dscr.value };
  const out: Record<string, unknown> = { branch, plan: ctx.plan ?? 'adopted', incomeTrend: u.income_trend.value, expenseTrend: u.expense_trend.value };
  for (const [k, fk] of Object.entries(KEYS)) out[k] = branch !== 'market' && UNDERWRITTEN.has(k) ? pick(k, phfa[k], 'sourced') : pick(k, d.inputs[fk].value);
  out.price = pick('price', d.inputs[branch === 'four' ? 'price_four' : 'price_nine'].value);
  const ua = overrides.ua;
  out.ua = Array.isArray(ua) && ua.length === 4 && ua.every((x) => typeof x === 'number') ? ua : d.ua.by_br;
  kinds.ua = Array.isArray(ua) ? 'yours' : 'sourced';
  return { inputs: out as unknown as PencilInputs, kinds };
}
