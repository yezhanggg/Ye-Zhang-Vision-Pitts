// Renter demand signals per building type for every place (lib/demand/order, docs/assumptions.md §15), passed to
// recommend() to order the suggested set. The demand data loads on demand in the online app only; the offline single
// file keeps the weighted fit order.
import { useEffect, useState } from 'react';
import type { Typology } from './types';

export type DemandScores = Map<string, Partial<Record<Typology, number>>>;
let loaded: DemandScores | null = null;

export function useDemandScores(): DemandScores | null {
  const [scores, setScores] = useState(loaded);
  useEffect(() => {
    if (import.meta.env.MODE !== 'export' && !loaded) void import('../demand/order').then((m) => setScores((loaded = m.demandScores())));
  }, []);
  return scores;
}
