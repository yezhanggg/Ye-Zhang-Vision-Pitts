// Tracts whose top two types are close: a pale wash and a dashed outline on the "Which type wins" map.
import { scoring } from '../data';
import type { TractResult } from '../derived';
import { topMargin } from '../scoring';
import type { FC, TractFeature } from '../types';
import { CLOSE } from './rationale';

const closeEps = () => scoring.scoring.close_margin ?? CLOSE;

/** Ranked tracts whose #1–#2 gap is under eps (ties included), in result order. */
export function closeCallIds(results: Map<string, TractResult>, eps = closeEps()): string[] {
  const out: string[] = [];
  for (const [id, r] of results) {
    const m = topMargin(r.scores);
    if (r.top && m != null && m < eps) out.push(id);
  }
  return out;
}

/** The close-call tracts as a feature collection for an overlay layer. */
export function closeCallFC(results: Map<string, TractResult>, fc: FC<TractFeature>, eps = closeEps()): { type: 'FeatureCollection'; features: TractFeature[] } {
  const ids = new Set(closeCallIds(results, eps));
  return { type: 'FeatureCollection', features: fc.features.filter((f) => ids.has(f.properties.GEOID)) };
}

/** Overlay settings for MapView (`overlays` prop): pale wash, dashed outline, not interactive. */
export function closeCallOverlay(results: Map<string, TractResult>, fc: FC<TractFeature>, eps = closeEps()) {
  return {
    id: 'close-calls',
    data: closeCallFC(results, fc, eps),
    idField: 'GEOID',
    fill: { color: '#ffffff', opacity: 0.45 },
    line: { color: '#475569', width: 1.2, dash: [2, 2], opacity: 0.9 },
    interactive: false as const,
  };
}
