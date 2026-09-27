// Layer report (Explore, a data variable painted): what the layer is, the legend, the map, the city and county
// reference values, the highest and lowest units and the sources. Plus the CSV of the layer for every unit shown, and
// the Explore place profile (one place, every variable). Pure: the caller hands in formatted inputs.
import type { CsvColumn } from '../csv';
import type { Report, ReportBlock } from '../report';

export type UnitKind = 'count' | 'usd' | 'share' | 'years' | 'age' | 'pct' | 'score' | 'class' | 'flag' | 'rate' | 'ratio';

export interface LayerUnit {
  geoid: string;
  name: string;
  /** Second line (a tract's number under its neighborhood name). */
  sub?: string | null;
  est: number | null;
  moe: number | null;
}

export interface LegendRow {
  color: string;
  label: string;
  count: number;
}

export interface LayerReportInput {
  variable: { id: string; label: string; unit: UnitKind; description: string; table_id: string; group: string; analysis?: boolean };
  level: { one: string; many: string };
  units: LayerUnit[];
  /** Display text for a value in the variable's unit. */
  fmt: (v: number | null | undefined) => string;
  /** Display text for a margin of error, or null when the layer has none. */
  fmtMoe?: ((v: number | null | undefined) => string) | null;
  legend: LegendRow[];
  city?: number | null;
  county?: number | null;
  scope?: 'city' | 'county';
  sources: string[];
  map?: string | null;
  filename?: string;
  /** Rows in each of the highest and lowest tables (default 10). */
  k?: number;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Scores are shown as plain 0–100 values, never "/ 100". */
export const noScoreSuffix = (s: string) => s.replace(/\s*\/\s*100\b/g, '');

export function topBottomUnits(units: LayerUnit[], k = 10): { top: LayerUnit[]; bottom: LayerUnit[] } {
  const rows = units.filter((u) => isNum(u.est)).sort((a, b) => (b.est as number) - (a.est as number) || a.geoid.localeCompare(b.geoid));
  return { top: rows.slice(0, k), bottom: rows.slice(-k).reverse() };
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function buildLayerReport(i: LayerReportInput): Report {
  const v = i.variable;
  const fmt = (x: number | null | undefined) => noScoreSuffix(i.fmt(x));
  const vals = i.units.map((u) => u.est).filter(isNum);
  const k = i.k ?? 10;
  const tb = topBottomUnits(i.units, k);
  const unitName = (u: LayerUnit) => (u.sub && u.sub !== u.name ? `${u.name} (${u.sub})` : u.name);
  const showMoe = !!i.fmtMoe && i.units.some((u) => isNum(u.moe));
  const rankTable = (rows: LayerUnit[], start: (idx: number) => number): (string | number)[][] =>
    rows.map((u, idx) => [String(start(idx)), unitName(u), fmt(u.est), ...(showMoe ? [isNum(u.moe) ? `± ${i.fmtMoe!(u.moe)}` : '—'] : [])]);
  const withValue = vals.length;
  // Classes and yes/no layers have no order: no lowest, median, highest or ranking tables.
  const categorical = v.unit === 'class' || v.unit === 'flag';
  const blocks: ReportBlock[] = [
    { kind: 'text', text: v.description },
    {
      kind: 'kv',
      rows: [
        ['Geography', `${i.level.one} (${i.scope === 'county' ? 'Allegheny County' : 'City of Pittsburgh'})`],
        [`${i.level.many[0].toUpperCase()}${i.level.many.slice(1)} with a value`, `${withValue.toLocaleString('en-US')} of ${i.units.length.toLocaleString('en-US')}`],
        ...((i.city != null || i.county != null)
          ? ([
              ['City of Pittsburgh', fmt(i.city)],
              ['Allegheny County', fmt(i.county)],
            ] as [string, string][])
          : []),
        ...(categorical
          ? []
          : ([
              ['Lowest', fmt(vals.length ? Math.min(...vals) : null)],
              [`Median ${i.level.one.toLowerCase()}`, fmt(median(vals))],
              ['Highest', fmt(vals.length ? Math.max(...vals) : null)],
            ] as [string, string][])),
        ['Source table', v.table_id],
      ],
    },
  ];
  if (i.legend.length) {
    blocks.push({ kind: 'heading', text: 'Legend' });
    blocks.push({
      kind: 'table',
      columns: ['Class', i.level.many[0].toUpperCase() + i.level.many.slice(1)],
      rows: i.legend.map((l) => [noScoreSuffix(l.label), l.count]),
      swatches: i.legend.map((l) => l.color),
      align: ['left', 'right'],
      note: v.analysis ? 'Classes as the map draws them.' : 'Five classes with about the same number of places in each (the map\'s legend); places without a value are grey.',
    });
  }
  if (i.map) blocks.push({ kind: 'image', src: i.map, caption: `${v.label} by ${i.level.one.toLowerCase()}, as shown on the map.` });
  if (tb.top.length && !categorical) {
    const head = ['#', i.level.one, v.label, ...(showMoe ? ['Margin of error (90%)'] : [])];
    const align: ('left' | 'right')[] = ['right', 'left', 'right', ...(showMoe ? (['right'] as const) : [])];
    blocks.push({ kind: 'heading', text: `Highest ${Math.min(k, tb.top.length)}` });
    blocks.push({ kind: 'table', columns: head, rows: rankTable(tb.top, (idx) => idx + 1), align });
    blocks.push({ kind: 'heading', text: `Lowest ${Math.min(k, tb.bottom.length)}` });
    blocks.push({ kind: 'table', columns: head, rows: rankTable(tb.bottom, (idx) => withValue - idx), align, note: `Ranked among the ${withValue} ${i.level.many} with a value; 1 = highest.${showMoe ? ' Survey estimates: neighbors in the ranking often overlap within their margins of error.' : ''}` });
  }
  return {
    title: `Layer report: ${v.label}`,
    subtitle: `${v.group} · ${i.level.one} · ${i.scope === 'county' ? 'Allegheny County' : 'City of Pittsburgh'}`,
    blocks,
    sources: i.sources,
    filename: i.filename,
  };
}

// ------------------------------------------------------------------ CSV of the layer
/** A value in CSV units: shares and 0–1 percentiles as percents, everything else as is. */
export function csvValue(v: number | null | undefined, unit: UnitKind): { value: number | null; unit: string } {
  const val = isNum(v) ? v : null;
  const r = (x: number | null, d: number) => (x == null ? null : Math.round(x * 10 ** d) / 10 ** d);
  switch (unit) {
    case 'usd':
      return { value: r(val, 0), unit: 'USD' };
    case 'share':
      return { value: r(val == null ? null : val * 100, 2), unit: '%' };
    case 'pct':
      return { value: r(val == null ? null : val * 100, 1), unit: 'percentile (0–100)' };
    case 'score':
      return { value: r(val == null ? null : val * 100, 1), unit: 'match (0–100)' };
    case 'count':
      return { value: r(val, 2), unit: 'count' };
    case 'years':
      return { value: r(val, 0), unit: 'year' };
    case 'age':
      return { value: r(val, 1), unit: 'years' };
    case 'flag':
      return { value: val, unit: '1 = yes, 0 = no' };
    case 'class':
      return { value: val, unit: 'class' };
    default:
      return { value: r(val, 3), unit };
  }
}

export const LAYER_COLUMNS: CsvColumn[] = [
  { key: 'geoid', label: 'geoid' },
  { key: 'name', label: 'name' },
  { key: 'detail', label: 'detail' },
  { key: 'value', label: 'value' },
  { key: 'moe', label: 'margin_of_error_90' },
  { key: 'unit', label: 'unit' },
  { key: 'label', label: 'value_label' },
  { key: 'variable', label: 'variable' },
  { key: 'source', label: 'source' },
];

export function layerCsvRows(i: Pick<LayerReportInput, 'variable' | 'units' | 'fmt' | 'sources'>): Record<string, unknown>[] {
  const src = i.sources[0] ?? '';
  return [...i.units]
    .sort((a, b) => a.geoid.localeCompare(b.geoid))
    .map((u) => {
      const cv = csvValue(u.est, i.variable.unit);
      const moe = csvValue(u.moe, i.variable.unit);
      return { geoid: u.geoid, name: u.name, detail: u.sub && u.sub !== u.name ? u.sub : '', value: cv.value, moe: moe.value, unit: cv.unit, label: isNum(u.est) ? noScoreSuffix(i.fmt(u.est)) : '', variable: i.variable.label, source: src };
    });
}

// ------------------------------------------------------------------ Explore place profile
export interface ProfileVar {
  group: string;
  id: string;
  label: string;
  unit: UnitKind;
  est: number | null;
  moe: number | null;
  city: number | null;
  county: number | null;
  /** Display texts. */
  text: string;
  moeText?: string | null;
  cityText: string;
  countyText: string;
  source: string;
}

export interface PlaceProfileInput {
  name: string;
  sub?: string | null;
  geoid: string;
  levelOne: string;
  /** Share of the unit's area inside the city (0–1), when under 1. */
  insideCity?: number | null;
  vars: ProfileVar[];
  /** The variable painted on the map, with its rank among peers when the screen shows one. */
  focus?: { label: string; text: string; rank?: string | null; description?: string } | null;
  map?: string | null;
  sources: string[];
  filename?: string;
}

export function buildPlaceProfileReport(i: PlaceProfileInput): Report {
  const blocks: ReportBlock[] = [];
  blocks.push({
    kind: 'kv',
    rows: [
      ['Geography', i.levelOne],
      ['GEOID', i.geoid],
      ...(i.sub ? ([['Also known as', i.sub]] as [string, string][]) : []),
      ...(isNum(i.insideCity) && i.insideCity < 0.995 ? ([['Inside the City of Pittsburgh', `${Math.max(1, Math.round(i.insideCity * 100))}% of its area`]] as [string, string][]) : []),
    ],
  });
  if (i.focus) {
    blocks.push({ kind: 'callout', text: `${i.focus.label}: ${noScoreSuffix(i.focus.text)}${i.focus.rank ? ` · ${i.focus.rank}` : ''}.${i.focus.description ? ` ${i.focus.description}` : ''}` });
  }
  if (i.map) blocks.push({ kind: 'image', src: i.map, caption: `${i.name} on the map.` });
  const groups = [...new Set(i.vars.map((v) => v.group))];
  const anyMoe = i.vars.some((v) => v.moeText);
  for (const g of groups) {
    const rows = i.vars.filter((v) => v.group === g);
    blocks.push({ kind: 'heading', text: g, level: 3 });
    blocks.push({
      kind: 'table',
      columns: ['Measure', 'This place', ...(anyMoe ? ['± MOE (90%)'] : []), 'City', 'County'],
      rows: rows.map((v) => [v.label, noScoreSuffix(v.text), ...(anyMoe ? [v.moeText ?? '—'] : []), noScoreSuffix(v.cityText), noScoreSuffix(v.countyText)]),
      align: ['left', 'right', ...(anyMoe ? (['right'] as const) : []), 'right', 'right'],
    });
  }
  return { title: `Place profile: ${i.name}`, subtitle: `${i.levelOne}${i.sub ? ` · ${i.sub}` : ''} · ${i.geoid}`, blocks, sources: i.sources, filename: i.filename };
}

export const PROFILE_COLUMNS: CsvColumn[] = [
  { key: 'geoid', label: 'geoid' },
  { key: 'place', label: 'place' },
  { key: 'group', label: 'group' },
  { key: 'variable_id', label: 'variable_id' },
  { key: 'variable', label: 'variable' },
  { key: 'value', label: 'value' },
  { key: 'moe', label: 'margin_of_error_90' },
  { key: 'unit', label: 'unit' },
  { key: 'city', label: 'city_of_pittsburgh' },
  { key: 'county', label: 'allegheny_county' },
  { key: 'source', label: 'source' },
];

export function profileCsvRows(i: Pick<PlaceProfileInput, 'name' | 'geoid' | 'vars'>): Record<string, unknown>[] {
  return i.vars.map((v) => {
    const c = csvValue(v.est, v.unit);
    return { geoid: i.geoid, place: i.name, group: v.group, variable_id: v.id, variable: v.label, value: c.value, moe: csvValue(v.moe, v.unit).value, unit: c.unit, city: csvValue(v.city, v.unit).value, county: csvValue(v.county, v.unit).value, source: v.source };
  });
}
