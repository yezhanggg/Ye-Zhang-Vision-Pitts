// A 5 × 5 sensitivity table: hard cost a square foot against the credit price (tax credit branches: the gap) or
// against market rents (market branch: yield on cost). The middle cell is the base case.
import { pencil, type PencilArgs } from './finance';

export const COST_STEPS = [-0.2, -0.1, 0, 0.1, 0.2];
export const PRICE_STEPS = [-0.06, -0.03, 0, 0.03, 0.06];
export const RENT_STEPS = [-0.1, -0.05, 0, 0.05, 0.1];

export interface Grid {
  rows: number[];
  cols: number[];
  rowLabel: string;
  colLabel: string;
  measure: 'gap' | 'yield';
  cells: number[][];
}

export function sensitivity(base: PencilArgs): Grid {
  const market = base.inputs.branch === 'market';
  const rows = COST_STEPS.map((s) => base.inputs.hardPerSf * (1 + s));
  const cols = market ? RENT_STEPS : PRICE_STEPS.map((s) => base.inputs.price + s);
  const cells = rows.map((hardPerSf) =>
    cols.map((col) => {
      const inputs = { ...base.inputs, hardPerSf, ...(market ? {} : { price: col }) };
      const marketRents = market && base.marketRents ? (base.marketRents.map((r) => r * (1 + col)) as [number, number, number, number]) : base.marketRents;
      const r = pencil({ ...base, inputs, marketRents });
      return market ? r.market!.yieldOnCost.value : r.gap;
    }),
  );
  return { rows, cols, rowLabel: 'Hard cost a gross sq ft', colLabel: market ? 'Market rents' : 'Credit price', measure: market ? 'yield' : 'gap', cells };
}
