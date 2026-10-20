// The pencil's inputs (docs/data/pencil.md): app/src/data/lazy/pencil_defaults.json carries PHFA's caps, the credit
// rates, HUD's MTSP limits and HACP's utility allowances (sourced) and example costs; the person's own numbers
// (lib/project/store, `pencil`) replace any of them.
import file from '../../data/lazy/pencil_defaults.json';

export type Branch = 'nine' | 'four' | 'market';
export type InputKind = 'sourced' | 'example' | 'yours';
type Quad = [number, number, number, number];

export interface DefaultsFile {
  read_on: string;
  sources: Record<string, { title: string; url: string }>;
  credit: { nine: { rate: number; ref: string }; four: { rate: number; ref: string }; boost: { value: number; ref: string }; credit_years: { value: number; ref: string }; bond_test: { value: number; ref: string } };
  phfa: {
    basis_per_home: { nine: number; four: number; ref: string };
    credit_cap: { base: number; large: number; supportive: number; ref: string };
    fee: { first: number; first_upto: number; after: number; cap_nine_base: number; cap_nine_large: number; cap_four_paid: number; ref: string };
    feasible_gap_share: { value: number; ref: string };
    funded_gap_share: { value: number; ref: string };
    large_homes: { value: number; ref: string };
    large_2br_share: { value: number; ref: string };
  };
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
  softFunds: number;
  stateBoost: boolean;
  targetYield: number;
  ua: Quad;
}

/** Input key → the defaults-file key it reads (the credit price depends on the branch). */
const KEYS: Record<Exclude<keyof PencilInputs, 'branch' | 'ua' | 'price'>, string> = {
  hardPerSf: 'hard_per_sf', softShare: 'soft_share', landPerHome: 'land_per_home', unitSf: 'unit_sf', efficiency: 'efficiency', vacancy: 'vacancy',
  opexPerHome: 'opex_per_home', reservesPerHome: 'reserves_per_home', rate: 'rate', amortYears: 'amort_years', dscr: 'dscr', ineligibleShare: 'ineligible_share',
  softFunds: 'soft_funds', stateBoost: 'state_boost', targetYield: 'target_yield',
};

export type Overrides = Record<string, number | string | boolean | number[] | null | undefined>;

/** The inputs in force, and where each came from. */
export function resolveInputs(overrides: Overrides, branch: Branch, d: DefaultsFile = DEFAULTS): { inputs: PencilInputs; kinds: Record<string, InputKind> } {
  const kinds: Record<string, InputKind> = {};
  const pick = <T,>(key: string, fallback: T): T => {
    const v = overrides[key];
    if (v !== undefined && v !== null && v !== '') {
      kinds[key] = 'yours';
      return v as T;
    }
    kinds[key] = 'example';
    return fallback;
  };
  const out: Record<string, unknown> = { branch };
  for (const [k, fk] of Object.entries(KEYS)) out[k] = pick(k, d.inputs[fk].value);
  out.price = pick('price', d.inputs[branch === 'four' ? 'price_four' : 'price_nine'].value);
  const ua = overrides.ua;
  out.ua = Array.isArray(ua) && ua.length === 4 && ua.every((x) => typeof x === 'number') ? ua : d.ua.by_br;
  kinds.ua = Array.isArray(ua) ? 'yours' : 'sourced';
  return { inputs: out as unknown as PencilInputs, kinds };
}
