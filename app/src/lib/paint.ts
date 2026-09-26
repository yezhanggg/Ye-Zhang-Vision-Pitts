// Turns a map metric + results into what MapView paints: per-tract values and a palette.
import { useMemo } from 'react';
import { scoring, tracts } from './data';
import type { TractResult } from './derived';
import { BIVARIATE_CLASSES, BIVARIATE_PALETTE, FACTOR_BINS, FACTOR_PALETTE, PRESSURE_PALETTE, RENT_GROWTH_PALETTE, SCORE_PALETTE, pressureClass, rentGrowthClass } from './mapStyle';
import type { MapMetric } from './store';

export interface MapPaint {
  /** seq: binned 0–1 values · cat: category index · relief: elevation tint (no tract fill) */
  kind: 'seq' | 'cat' | 'relief';
  palette: string[];
  values: Map<string, number | null>;
  bins?: number[];
}

const typIndex = new Map(scoring.typologies.map((t, i) => [t.id, i]));
export const TYPOLOGY_COLORS = scoring.typologies.map((t) => t.color);

export function buildPaint(metric: MapMetric, results: Map<string, TractResult>): MapPaint {
  const values = new Map<string, number | null>();
  if (metric.kind === 'pick') {
    for (const [id, r] of results) values.set(id, r.top ? typIndex.get(r.top) ?? null : null);
    return { kind: 'cat', palette: TYPOLOGY_COLORS, values };
  }
  if (metric.kind === 'factor') {
    for (const t of tracts) values.set(t.GEOID, typeof t[metric.id] === 'number' ? (t[metric.id] as number) : null);
    return { kind: 'seq', palette: FACTOR_PALETTE, values, bins: FACTOR_BINS };
  }
  if (metric.kind === 'lens' && metric.id === 'pressure') {
    for (const t of tracts) values.set(t.GEOID, pressureClass(t.market_pressure));
    return { kind: 'cat', palette: PRESSURE_PALETTE, values };
  }
  if (metric.kind === 'lens') {
    for (const t of tracts) {
      const i = t.bivariate_class ? BIVARIATE_CLASSES.indexOf(t.bivariate_class) : -1;
      values.set(t.GEOID, i >= 0 ? i : null);
    }
    return { kind: 'cat', palette: BIVARIATE_PALETTE, values };
  }
  if (metric.kind === 'info') {
    for (const t of tracts) values.set(t.GEOID, rentGrowthClass(t.rent_2br_growth_existing));
    return { kind: 'cat', palette: RENT_GROWTH_PALETTE, values };
  }
  if (metric.kind === 'layer') return { kind: 'relief', palette: [], values };
  for (const [id, r] of results) {
    if (metric.kind === 'top') values.set(id, r.topScore);
    else values.set(id, r.scores.find((s) => s.typology === metric.id)?.score ?? null);
  }
  return { kind: 'seq', palette: SCORE_PALETTE, values };
}

export const usePaint = (metric: MapMetric, results: Map<string, TractResult>) => useMemo(() => buildPaint(metric, results), [metric, results]);
