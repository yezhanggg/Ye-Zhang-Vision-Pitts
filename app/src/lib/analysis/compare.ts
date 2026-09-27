// Compare tracts without counting a missing value as an edge, and say plainly when a side cannot be compared.
import { scoring, tractLabel } from '../data';
import type { TractResult } from '../derived';
import type { ScoringConfig, TractProps, Weights } from '../types';
import { ANALYSIS_COPY as C } from './copy';
import { HOUSEHOLD_MIN } from './rationale';

export interface SafeDeltaRow {
  factor: string;
  a: number | null;
  b: number | null;
  /** a − b, or null when a side has no value. */
  delta: number | null;
  /** The factor's contribution to the basis type in A minus in B (score points, 0–1), or null when a side has no value. */
  gap: number | null;
  missing: 'a' | 'b' | 'both' | null;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Per-factor A−B rows for every factor in the config, largest |gap| first, rows with a missing side last (in config
 * order). `basis` is the type whose contributions are compared: A's top pick, else B's.
 */
export function factorDeltasSafe(ta: TractProps, tb: TractProps, ra: TractResult, rb: TractResult, basis?: string, cfg: ScoringConfig = scoring): SafeDeltaRow[] {
  const k = basis ?? ra.top ?? rb.top ?? null;
  const sa = ra.scores.find((s) => s.typology === k), sb = rb.scores.find((s) => s.typology === k);
  const rows = cfg.factors.map((f, i) => {
    const va = ta[f.id], vb = tb[f.id];
    const a = isNum(va) ? va : null, b = isNum(vb) ? vb : null;
    if (a == null || b == null) return { row: { factor: f.id, a, b, delta: null, gap: null, missing: a == null && b == null ? 'both' : a == null ? 'a' : 'b' } as SafeDeltaRow, i };
    const ca = sa?.parts.find((p) => p.factor === f.id)?.contrib ?? 0, cb = sb?.parts.find((p) => p.factor === f.id)?.contrib ?? 0;
    return { row: { factor: f.id, a, b, delta: a - b, gap: ca - cb, missing: null } as SafeDeltaRow, i };
  });
  return rows
    .sort((x, y) => {
      if (x.row.gap == null || y.row.gap == null) return x.row.gap == null && y.row.gap == null ? x.i - y.i : x.row.gap == null ? 1 : -1;
      return Math.abs(y.row.gap) - Math.abs(x.row.gap) || x.i - y.i;
    })
    .map((x) => x.row);
}

/** The text for a row that cannot be compared, or null when both sides have a value. */
export function missingText(row: SafeDeltaRow, ta: TractProps, tb: TractProps): string | null {
  if (!row.missing) return null;
  if (row.missing === 'both') return C.compare.noDataBoth;
  return C.compare.noData(tractLabel(row.missing === 'a' ? ta : tb));
}

export type CompareState = 'need_two' | 'a_unranked' | 'b_unranked' | 'zero_weights' | 'ok';

const rankedTop = (t: TractProps | null, r: TractResult | null) => !!t && t.residential && !!r?.top;

/** Which message the compare view needs, checked in this order: two places, A ranked, B ranked, some weight on. */
export function compareState(ta: TractProps | null, tb: TractProps | null, ra: TractResult | null, rb: TractResult | null, w: Weights, cfg: ScoringConfig = scoring): CompareState {
  if (!ta || !tb || ta.GEOID === tb.GEOID) return 'need_two';
  const zero = cfg.factors.length > 0 && cfg.factors.every((f) => !((w[f.id] ?? 0) > 0));
  if (!ta.residential) return 'a_unranked';
  if (!tb.residential) return 'b_unranked';
  if (zero) return 'zero_weights';
  if (!rankedTop(ta, ra)) return 'a_unranked';
  if (!rankedTop(tb, rb)) return 'b_unranked';
  return 'ok';
}

/** The sentence for a state, or null when the comparison can be shown. */
export function compareMessage(state: CompareState, ta: TractProps | null, tb: TractProps | null): string | null {
  if (state === 'ok') return null;
  if (state === 'need_two') return C.compare.needTwo;
  if (state === 'zero_weights') return C.why.zeroWeights;
  const which = state === 'a_unranked' ? 'A' : 'B';
  const t = which === 'A' ? ta : tb;
  if (!t) return C.compare.needTwo;
  if (t.residential) return C.compare.noScore(tractLabel(t), which);
  return C.compare.unranked(tractLabel(t), which, isNum(t.households) ? t.households : null, HOUSEHOLD_MIN);
}
