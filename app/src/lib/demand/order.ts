// Renter demand orders the building types inside what the stance allows (docs/assumptions.md §15). Each type is
// favored by named signals; a type's score is how many of them the place shows. Higher scores go first and ties keep
// the weighted fit order. The stance rules still decide which types are suggested at all; Transit-first and
// Climate-resilient keep their own fixed orders (densest first; attached and multi-unit first).
import { TYPOLOGY_LABEL } from '../place/thresholds';
import type { Stance, Typology } from '../place/types';
import { DEMAND } from './data';
import { signalsFor, SIGNAL_LABEL, type Direction, type Signal } from './signals';
import type { ShareKey } from './types';

/** The value judgment: which signals favor which building type. */
export const FAVORED_BY: Record<Typology, { key: ShareKey; dir: Direction }[]> = {
  small_apartment: [{ key: 'one_person', dir: 'up' }, { key: 'renter', dir: 'up' }],
  adu: [{ key: 'one_person', dir: 'up' }, { key: 'renter', dir: 'down' }],
  senior: [{ key: 'age65', dir: 'up' }],
  townhome: [{ key: 'large5', dir: 'up' }, { key: 'renter', dir: 'down' }],
  duplex_triplex: [{ key: 'large5', dir: 'up' }, { key: 'small_bldg', dir: 'up' }],
};

/** Stances whose own rule fixes the order; demand is shown there but does not reorder. */
export const FIXED_ORDER_STANCES: Stance[] = ['transit_first', 'climate_resilient'];

export interface TypeScore {
  typology: Typology;
  score: number;
  because: Signal[];
}

export function scoreTypes(signals: Signal[]): Record<Typology, TypeScore> {
  const by = new Map(signals.map((s) => [s.key, s]));
  const out = {} as Record<Typology, TypeScore>;
  for (const [t, wants] of Object.entries(FAVORED_BY) as [Typology, { key: ShareKey; dir: Direction }[]][]) {
    const because = wants.flatMap((w) => {
      const s = by.get(w.key);
      return s && s.dir === w.dir ? [s] : [];
    });
    out[t] = { typology: t, score: because.length, because };
  }
  return out;
}

/** The fit order re-sorted by demand score; ties keep the fit order (what recommend() does inside the suggested set). */
export function demandOrder(fitOrder: Typology[], scores: Record<Typology, TypeScore>): Typology[] {
  return fitOrder.map((t, i) => ({ t, i, s: scores[t]?.score ?? 0 })).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.t);
}

/** Every place's demand signals per type, for recommend(). */
export function demandScores(): Map<string, Partial<Record<Typology, number>>> {
  const out = new Map<string, Partial<Record<Typology, number>>>();
  for (const [geoid, tract] of Object.entries(DEMAND.tracts)) {
    const scores = scoreTypes(signalsFor(tract, DEMAND.zips[tract.zip ?? ''] ?? null, DEMAND.city));
    out.set(geoid, Object.fromEntries(Object.values(scores).map((x) => [x.typology, x.score])));
  }
  return out;
}

/** One line on why demand puts `a` ahead of `b` (both scored), for the card. */
export function aheadBecause(a: TypeScore, b: TypeScore): string {
  const why = a.because.map((s) => `${SIGNAL_LABEL[s.key].toLowerCase()} ${s.dir === 'up' ? 'above' : 'below'} the city${s.from === 'zip' ? ' (ZIP code)' : ''}`);
  return `${TYPOLOGY_LABEL[a.typology]} (${a.score} signal${a.score === 1 ? '' : 's'}: ${why.join('; ') || 'none'}) ahead of ${TYPOLOGY_LABEL[b.typology]} (${b.score})`;
}
