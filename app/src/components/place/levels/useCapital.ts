// The Parcel level's Capital run for the project as set on the left: its homes' floor area, rents unit size by unit
// size, the units that count toward tax credits and, for mixed use, the ground floor from the project model; the land
// from the lot the project is read on; the person's Capital changes from the side's project store
// (lib/project/capital). Online only: loaded on demand.
import { useMemo } from 'react';
import { DEFAULTS, planRules } from '../../../lib/pencil/inputs';
import { taxCreditRent, type Level } from '../../../lib/pencil/rents';
import { confUsable } from '../../../lib/place/afford';
import { creditUnits, runCapital, type CapitalContext, type CapitalRun, type RentRow } from '../../../lib/project/capital';
import type { DevType } from '../../../lib/project/devType';
import { useSide, type Side } from '../../../lib/project/side';
import { MIX_LEVELS } from '../../../lib/project/store';
import type { ProjectModel } from '../project/useProjectModel';

const n0 = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;

/** The rent of each unit size at each income level, and where it comes from. */
export function rentRows(m: ProjectModel): RentRow[] {
  const r = m.result;
  const i = m.args.inputs;
  const mk = m.base.place.market;
  const asking = mk?.asking_2br != null && confUsable(mk.asking_conf);
  const rows: RentRow[] = [];
  for (const level of MIX_LEVELS)
    r.counts[level].forEach((units, br) => {
      if (units <= 0) return;
      const rent = r.rents[level][br] ?? 0;
      let source: string;
      if (level === 'mkt') source = r.rents.mkt[br] == null ? 'No asking rent or Small Area FMR here' : `${asking ? 'Asking rent here' : 'ZIP Small Area FMR'}${br === 2 ? '' : ', scaled to size'}`;
      else {
        const t = taxCreditRent(DEFAULTS.mtsp, level as Level, br, i.ua[br]);
        source = !t ? 'No income limit on file' : rent < t.net ? `Market rent, under the ${level}% AMI limit` : `${level}% AMI limit ${n0(t.gross)} less ${n0(i.ua[br])} utilities`;
      }
      rows.push({ level, br, units, rent, source });
    });
  return rows;
}

/** `lotSqft`: the lot the project is read on (useReview capitalLot); null: the land is an example a unit. */
export function capitalContext(m: ProjectModel, devType: DevType, lotSqft: number | null = null): CapitalContext {
  const i = m.args.inputs;
  const c = m.result.counts;
  const netSf = MIX_LEVELS.reduce((s, l) => s + c[l].reduce((x, n, br) => x + n * i.unitSf[br], 0), 0);
  const units = m.mix.homes;
  const affordable = m.result.affordable;
  const P = planRules(i.plan);
  const twoPlus = MIX_LEVELS.reduce((s, l) => s + c[l][2] + c[l][3], 0);
  const sizeSf = i.efficiency > 0 ? netSf / i.efficiency : netSf;
  const cu = creditUnits(c);
  // The ground floor under the homes: the Project input, else the homes' floor plate (their area over the stories above it).
  const stories = m.base.project.stories ?? 1;
  const footprint = Math.round(sizeSf / Math.max(1, stories - 1) / 100) * 100;
  return {
    devType,
    branch: m.branch,
    plan: i.plan,
    units,
    affordable,
    creditUnits: cu.units,
    creditWhy: cu.why,
    large: affordable >= P.large_homes.value && units > 0 && twoPlus / units >= P.large_2br_share.value,
    qctOrDda: m.qctOrDda,
    sizeSf,
    grossRent: m.result.income.find((l) => l.label === 'Gross rent')?.value ?? 0,
    rents: rentRows(m),
    opexPerUnit: i.opexPerHome + i.reservesPerHome,
    price: i.price,
    dscrNeed: i.dscr,
    lotSqft,
    commercialSf: devType === 'mixed' ? (m.base.project.commercialSf ?? footprint) : 0,
  };
}

/** `side`: whose Capital changes to read (default: the side in context). `lotSqft`: the lot it is read on. */
export function useCapital(m: ProjectModel, devType: DevType, side?: Side, lotSqft: number | null = null): CapitalRun {
  const ctx = useSide();
  const over = (side ?? ctx).project((s) => s.capital);
  return useMemo(() => runCapital(capitalContext(m, devType, lotSqft), over), [m, devType, over, lotSqft]);
}

/** Change one Capital input, or (null) go back to the suggestion. */
export function setCapital(side: ReturnType<typeof useSide>, key: string, v: number | null) {
  side.project.setState((s) => {
    const next = { ...(s.capital ?? {}) };
    if (v == null || !Number.isFinite(v)) delete next[key];
    else next[key] = v;
    return { capital: next };
  });
}
