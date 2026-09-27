import { bundledValues, reference, CITY_GEOID } from '../../lib/explore/catalog';
import { PARTS, StackedBar } from '../charts';

const LAND = [
  ['lu_residential', 'Residential'],
  ['lu_commercial', 'Commercial'],
  ['lu_industrial', 'Industrial'],
  ['lu_institutional', 'Institutional & public'],
  ['lu_vacant', 'Vacant'],
] as const;
const est = (v: [number | null, number | null, number | null] | undefined) => v?.[0] ?? null;

/** Headline for the fold: vacant land and lots in this tract (county property assessments). */
export function landHeadline(geoid: string): string {
  const r = bundledValues('tract')[geoid];
  const vacant = est(r?.lu_vacant), lots = est(r?.vacant_lots);
  if (vacant == null) return 'not available';
  return `${(vacant * 100).toFixed(1)}% vacant land${lots != null ? ` · ${Math.round(lots).toLocaleString('en-US')} vacant lots` : ''}`;
}

/** Share of parcel land by assessed use: this tract against the city and the county. */
export default function LandUse({ geoid }: { geoid: string }) {
  const r = bundledValues('tract')[geoid];
  const row = (label: string, pick: (id: string) => number | null) => {
    const vals = LAND.map(([id]) => pick(id));
    const known = vals.reduce<number>((s, v) => s + (v ?? 0), 0);
    return { label, values: [...vals, vals.every((v) => v == null) ? null : Math.max(0, 1 - known)] };
  };
  const rows = [
    row('This tract', (id) => est(r?.[id])),
    row('City', (id) => reference(id).city?.est ?? est(bundledValues('city')[CITY_GEOID]?.[id])),
    row('County', (id) => reference(id).county?.est ?? null),
  ];
  const parts = [...LAND.map(([id, label], i) => ({ id, label, color: PARTS[i] })), { id: 'other', label: 'Other', color: PARTS[5] }];
  return <StackedBar parts={parts} rows={rows} caption="Share of parcel land by assessed use. Allegheny County property assessments, 2026. Other = utilities, railroads, agriculture and unclassed parcels. Information only, not scored." />;
}
