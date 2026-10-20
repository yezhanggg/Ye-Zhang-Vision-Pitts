// Does it pencil (docs/data/pencil.md): arithmetic on the person's inputs, not an underwriting. Rents → net operating
// income → the loan it carries → (tax credit branches) eligible basis, credits and equity under PHFA's caps →
// sources against uses → the gap, PHFA's feasibility tests and the federal set-aside; (market branch) yield on cost,
// the rent that breaks even and the land value that is left. Every figure keeps its arithmetic.
import { MIX_LEVELS, type Counts, type MixLevel } from '../project/store';
import { DEFAULTS, type DefaultsFile, type PencilInputs } from './inputs';
import { taxCreditRent, type Level } from './rents';

const usd = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;
const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
const AFFORDABLE: Level[] = ['30', '50', '60', '80'];

export interface Line {
  label: string;
  value: number;
  formula: string;
}

export interface Check {
  label: string;
  ok: boolean | null;
  formula: string;
}

export interface PencilResult {
  branch: PencilInputs['branch'];
  homes: number;
  affordable: number;
  counts: Counts;
  /** Monthly rent used for each level and size (net of utilities for tax credit homes). */
  rents: Record<MixLevel, (number | null)[]>;
  rentNotes: string[];
  income: Line[];
  noi: number;
  loan: Line;
  uses: Line[];
  tdc: number;
  fee: Line | null;
  credits: Line[];
  equity: number;
  sources: Line[];
  gap: number;
  deferredFee: number;
  gapAfterFee: number;
  checks: Check[];
  market: { yieldOnCost: Line; breakEven: Line; residualLand: Line } | null;
  izo: { homes: number; formula: string } | null;
  /** PHFA's per-project credit cap held the annual credits down (9% only). */
  capped: boolean;
  /** What the tax credit sheet reads (lib/lihtc/fromPlan FinanceFacts). */
  finance: { tdc: number; privateSoft: number; devFee: number; deferredFee: number; gap: number } | null;
}

/** Annual debt service on $1: 12 × the monthly payment of a fully amortizing loan. */
export function mortgageConstant(rate: number, years: number): number {
  const r = rate / 12;
  const n = years * 12;
  return r === 0 ? 12 / n : (12 * r) / (1 - (1 + r) ** -n);
}

/** PHFA's developer fee: 15% of the first $10M of the base, 10% after, then the cap. The base is the lesser of cost (less acquisition) and PHFA's maximum basis. */
export function developerFee(cost: number, homes: number, branch: 'nine' | 'four', large: boolean, d: DefaultsFile = DEFAULTS): Line {
  const f = d.phfa.fee;
  const maxBasis = d.phfa.basis_per_home[branch] * homes;
  const base = Math.min(cost, maxBasis);
  const raw = f.first * Math.min(base, f.first_upto) + f.after * Math.max(0, base - f.first_upto);
  const cap = branch === 'four' ? f.cap_four_paid : large ? f.cap_nine_large : f.cap_nine_base;
  const value = Math.min(raw, cap);
  return {
    label: 'Developer fee',
    value,
    formula: `15% × ${usd(Math.min(base, f.first_upto))}${base > f.first_upto ? ` + 10% × ${usd(base - f.first_upto)}` : ''} = ${usd(raw)} on the lesser of cost ${usd(cost)} and PHFA's basis limit ${usd(maxBasis)}${raw > cap ? `, held to the ${usd(cap)} cap` : ''}`,
  };
}

/** Homes the IZ-O converts to 50% AMI in a market-rate mix (10%, rounded up, at 20 homes or more), taken from the largest size group. */
export function applyInclusionary(c: Counts, inOverlay: boolean): { counts: Counts; homes: number } {
  const homes = MIX_LEVELS.reduce((s, l) => s + c[l].reduce((a, b) => a + b, 0), 0);
  const set = inOverlay && homes >= 20 ? Math.ceil(homes * 0.1) : 0;
  const have = c['30'].concat(c['50']).reduce((a, b) => a + b, 0);
  const need = Math.max(0, set - have);
  if (need === 0) return { counts: c, homes: 0 };
  const out = Object.fromEntries(MIX_LEVELS.map((l) => [l, [...c[l]]])) as Counts;
  let left = need;
  while (left > 0) {
    const from = (['mkt', '80', '60'] as MixLevel[]).find((l) => out[l].some((n) => n > 0));
    if (!from) break;
    const br = out[from].indexOf(Math.max(...out[from]));
    out[from][br] -= 1;
    out['50'][br] += 1;
    left -= 1;
  }
  return { counts: out, homes: need - left };
}

export interface PencilArgs {
  counts: Counts;
  inputs: PencilInputs;
  marketRents: [number, number, number, number] | null;
  /** QCT or DDA: the 130% boost applies by law. */
  qctOrDda: boolean;
  /** Most of the tract is in the IZ-O. */
  inOverlay: boolean;
  d?: DefaultsFile;
}

export function pencil(a: PencilArgs): PencilResult {
  const d = a.d ?? DEFAULTS;
  const i = a.inputs;
  const market = i.branch === 'market';
  const izo = market ? applyInclusionary(a.counts, a.inOverlay) : { counts: a.counts, homes: 0 };
  const c = izo.counts;
  const homes = MIX_LEVELS.reduce((s, l) => s + c[l].reduce((x, y) => x + y, 0), 0);
  const affordable = AFFORDABLE.reduce((s, l) => s + c[l].reduce((x, y) => x + y, 0), 0);
  const rentNotes: string[] = [];

  // ---- rents
  const rents = {} as Record<MixLevel, (number | null)[]>;
  for (const l of MIX_LEVELS) {
    rents[l] = [0, 1, 2, 3].map((br) => {
      const m = a.marketRents?.[br] ?? null;
      if (l === 'mkt') return m;
      const r = taxCreditRent(d.mtsp, l as Level, br, i.ua[br]);
      if (!r) return null;
      return m != null ? Math.min(r.net, m) : r.net;
    });
  }
  let gpr = 0;
  for (const l of MIX_LEVELS) c[l].forEach((n, br) => (gpr += n * (rents[l][br] ?? 0) * 12));
  const egi = gpr * (1 - i.vacancy);
  const opex = homes * (i.opexPerHome + i.reservesPerHome);
  const noi = egi - opex;
  const income: Line[] = [
    { label: 'Gross rent', value: gpr, formula: 'homes × monthly rent × 12, by income level and size' },
    { label: 'Effective gross income', value: egi, formula: `${usd(gpr)} × (1 − ${pct(i.vacancy, 0)} vacancy)` },
    { label: 'Operating cost and reserves', value: opex, formula: `${homes} homes × (${usd(i.opexPerHome)} + ${usd(i.reservesPerHome)})` },
    { label: 'Net operating income', value: noi, formula: `${usd(egi)} − ${usd(opex)}` },
  ];
  if (c.mkt.some((n) => n > 0) && !a.marketRents) rentNotes.push('Market homes collect nothing: no asking rent or Small Area FMR is on file here.');

  // ---- debt
  const k = mortgageConstant(i.rate, i.amortYears);
  const loanValue = Math.max(0, noi / i.dscr / k);
  const loan: Line = { label: 'Permanent loan', value: loanValue, formula: `${usd(noi)} ÷ ${i.dscr} coverage ÷ ${k.toFixed(4)} (${pct(i.rate, 2)}, ${i.amortYears} years)` };

  // ---- uses
  const netSf = MIX_LEVELS.reduce((s, l) => s + c[l].reduce((x, n, br) => x + n * i.unitSf[br], 0), 0);
  const grossSf = netSf / i.efficiency;
  const hard = grossSf * i.hardPerSf;
  const soft = hard * i.softShare;
  const land = homes * i.landPerHome;
  const twoPlus = MIX_LEVELS.reduce((s, l) => s + c[l][2] + c[l][3], 0);
  const large = affordable >= d.phfa.large_homes.value && homes > 0 && twoPlus / homes >= d.phfa.large_2br_share.value;
  const fee = market ? null : developerFee(hard + soft, homes, i.branch as 'nine' | 'four', large, d);
  const uses: Line[] = [
    { label: 'Land', value: land, formula: `${homes} homes × ${usd(i.landPerHome)}` },
    { label: 'Hard cost', value: hard, formula: `${Math.round(netSf).toLocaleString('en-US')} net sq ft ÷ ${i.efficiency} = ${Math.round(grossSf).toLocaleString('en-US')} gross sq ft × ${usd(i.hardPerSf)}` },
    { label: 'Soft cost', value: soft, formula: `${usd(hard)} × ${pct(i.softShare, 0)}` },
    ...(fee ? [fee] : []),
  ];
  const tdc = uses.reduce((s, u) => s + u.value, 0);

  // ---- credits (tax credit branches)
  const credits: Line[] = [];
  let equity = 0;
  const checks: Check[] = [];
  let capped = false;
  if (!market) {
    const br = i.branch as 'nine' | 'four';
    const depreciable = (hard + soft) * (1 - i.ineligibleShare);
    const capBasis = d.phfa.basis_per_home[br] * homes;
    const basisNoFee = Math.min(depreciable, capBasis);
    const eligible = basisNoFee + (fee?.value ?? 0);
    const boostOn = a.qctOrDda || (br === 'nine' && i.stateBoost);
    const boost = boostOn ? d.credit.boost.value : 1;
    const unitShare = homes > 0 ? affordable / homes : 0;
    const affSf = AFFORDABLE.reduce((s, l) => s + c[l].reduce((x, n, b) => x + n * i.unitSf[b], 0), 0);
    const floorShare = netSf > 0 ? affSf / netSf : 0;
    const af = Math.min(unitShare, floorShare);
    const qualified = eligible * boost * af;
    const rate = d.credit[br].rate;
    const annualRaw = qualified * rate;
    const cap = br === 'nine' ? (large ? d.phfa.credit_cap.large : d.phfa.credit_cap.base) : Infinity;
    const annual = Math.min(annualRaw, cap);
    capped = annualRaw > cap;
    equity = annual * d.credit.credit_years.value * i.price;
    credits.push(
      { label: 'Eligible basis', value: eligible, formula: `(${usd(hard)} + ${usd(soft)}) × (1 − ${pct(i.ineligibleShare, 0)} ineligible) = ${usd(depreciable)}${depreciable > capBasis ? `, held to PHFA's ${usd(d.phfa.basis_per_home[br])} a home (${usd(capBasis)})` : ''}, + ${usd(fee?.value ?? 0)} fee` },
      { label: 'Qualified basis', value: qualified, formula: `${usd(eligible)} × ${boost}${boostOn ? (a.qctOrDda ? ' (QCT or DDA)' : ' (state boost)') : ''} × ${pct(af)} applicable fraction (lesser of ${pct(unitShare)} of homes and ${pct(floorShare)} of floor area)` },
      { label: 'Annual credits', value: annual, formula: `${usd(qualified)} × ${pct(rate, 0)} = ${usd(annualRaw)}${annualRaw > cap ? `, held to PHFA's ${usd(cap)} cap` : ''}` },
      { label: 'Tax credit equity', value: equity, formula: `${usd(annual)} × ${d.credit.credit_years.value} years × $${i.price.toFixed(2)}` },
    );
    // Federal set-aside: 20/50, 40/60, or income averaging (at least 40% of homes, average at most 60%, none above 80%).
    const at = (ls: Level[]) => ls.reduce((s, l) => s + c[l].reduce((x, y) => x + y, 0), 0);
    const avg = affordable > 0 ? AFFORDABLE.reduce((s, l) => s + Number(l) * c[l].reduce((x, y) => x + y, 0), 0) / affordable : 0;
    const t2050 = homes > 0 && at(['30', '50']) / homes >= 0.2;
    const t4060 = homes > 0 && at(['30', '50', '60']) / homes >= 0.4;
    const tIA = homes > 0 && affordable / homes >= 0.4 && avg <= 60;
    checks.push({ label: 'Federal minimum set-aside', ok: t2050 || t4060 || tIA, formula: `20% at 50% AMI: ${at(['30', '50'])} of ${homes}${t2050 ? ' (met)' : ''}; 40% at 60%: ${at(['30', '50', '60'])}${t4060 ? ' (met)' : ''}; income averaging: ${affordable} homes averaging ${avg.toFixed(0)}% AMI${tIA ? ' (met)' : ''}` });
    if (c['80'].some((n) => n > 0) && !tIA) checks.push({ label: '80% AMI homes', ok: false, formula: 'Homes at 80% AMI count toward the credit only under income averaging, which this mix does not meet' });
    if (br === 'four') {
      const need = d.credit.bond_test.value * (eligible + land);
      checks.push({ label: 'Bond test', ok: null, formula: `tax-exempt bonds of at least ${pct(d.credit.bond_test.value, 0)} × (${usd(eligible)} basis + ${usd(land)} land) = ${usd(need)}` });
    }
  }

  // ---- sources and gap
  const sources: Line[] = [loan, ...(market ? [] : [{ label: 'Tax credit equity', value: equity, formula: credits[credits.length - 1]?.formula ?? '' }]), ...(i.softFunds > 0 ? [{ label: 'Soft funds you expect', value: i.softFunds, formula: 'your entry' }] : [])];
  const total = sources.reduce((s, x) => s + x.value, 0);
  const gap = tdc - total;
  const deferredFee = fee ? Math.min(Math.max(0, gap), fee.value) : 0;
  const gapAfterFee = gap - deferredFee;
  if (fee) {
    const g = Math.max(0, gap);
    checks.push(
      { label: 'PHFA feasibility', ok: g < d.phfa.feasible_gap_share.value * fee.value, formula: `gap ${usd(g)} against 50% of the ${usd(fee.value)} fee (${usd(0.5 * fee.value)})` },
      { label: 'Fully funded (D.4.a)', ok: g < d.phfa.funded_gap_share.value * fee.value, formula: `gap ${usd(g)} against 25% of the fee (${usd(0.25 * fee.value)}); commitments still needed` },
    );
  }

  // ---- market branch
  let marketOut: PencilResult['market'] = null;
  if (market) {
    const y = tdc > 0 ? noi / tdc : 0;
    const needGpr = (i.targetYield * tdc + opex) / (1 - i.vacancy);
    const be = homes > 0 ? needGpr / 12 / homes : 0;
    const residual = noi / i.targetYield - (hard + soft);
    marketOut = {
      yieldOnCost: { label: 'Yield on cost', value: y, formula: `${usd(noi)} ÷ ${usd(tdc)} = ${pct(y, 2)} against your ${pct(i.targetYield, 2)} target` },
      breakEven: { label: 'Average rent that breaks even', value: be, formula: `(${pct(i.targetYield, 2)} × ${usd(tdc)} + ${usd(opex)}) ÷ (1 − ${pct(i.vacancy, 0)}) ÷ 12 ÷ ${homes} homes` },
      residualLand: { label: 'Land value the rents support', value: residual, formula: `${usd(noi)} ÷ ${pct(i.targetYield, 2)} − (${usd(hard)} + ${usd(soft)})` },
    };
  }

  return {
    branch: i.branch, homes, affordable, counts: c, rents, rentNotes, income, noi, loan, uses, tdc, fee, credits, equity, sources, gap, deferredFee, gapAfterFee, checks, market: marketOut,
    izo: izo.homes > 0 ? { homes: izo.homes, formula: `${izo.homes} homes moved to 50% AMI: the IZ-O asks 10% of ${homes} homes, rounded up (§907.04.A)` } : null,
    capped,
    finance: fee ? { tdc, privateSoft: loanValue + i.softFunds, devFee: fee.value, deferredFee, gap } : null,
  };
}
