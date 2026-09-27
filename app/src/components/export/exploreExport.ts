// Glue between the Explore screens and the pure layer / place-profile builders: reads the same catalogue, reference
// values and breaks the map and legend use, and turns them into builder inputs.
import { useApp } from '../../lib/store';
import { LEVEL_LABEL, catalogue, groups, reference, unitSubtitle, unitTitle, variablesByGroup } from '../../lib/explore/catalog';
import { classify, divergingBreaks, estimates, fmtMoe, fmtValue, paletteFor, quantileBreaks } from '../../lib/explore/bins';
import { classCounts, fmtAnalysis, isAnalysis, isAnalysisGroup } from '../../lib/explore/analysisVars';
import { isDiverging, themePalette } from '../../lib/explore/palettes';
import { rankOf } from '../../lib/explore/summary';
import { EXPLORE_UI } from '../../lib/explore/copy';
import type { BrowseLevel, Estimate, Loaded, UnitFC, ValueMap, VariableDef } from '../../lib/explore/types';
import { exportFilename, downloadCsv, toCsv } from '../../lib/export/csv';
import { getMap } from '../../lib/export/mapRegistry';
import { mapSnapshot, printReport } from '../../lib/export/report';
import {
  LAYER_COLUMNS, PROFILE_COLUMNS, buildLayerReport, buildPlaceProfileReport, layerCsvRows, profileCsvRows,
  type LayerReportInput, type LegendRow, type PlaceProfileInput, type ProfileVar, type UnitKind,
} from '../../lib/export/builders/layer';
import type { ExportItem } from './ExportMenu';

const vintage = catalogue.meta?.vintage ?? '2020-2024 5-year';
const acsSource = (table: string) => `U.S. Census Bureau, American Community Survey ${vintage.replace('-', '–')} estimates, table ${table}; margins of error at the 90% level`;
const BOUNDARIES = 'Census cartographic boundary files 2023 (2020 tracts, block groups, ZCTAs, county subdivisions); City of Pittsburgh neighborhoods (WPRDC) for tract names';

export function layerSources(v: VariableDef): string[] {
  if (isAnalysis(v)) return [`VisionPitts analysis layer (${v.table_id}), Pittsburgh tracts only: ${v.description}`, 'Place measures: HUD CHAS 2018–22, HUD FY2026 limits, Dewey listings 2025–26, PRT GTFS June 2026, FEMA NFHL, Allegheny County assessments 2026', BOUNDARIES];
  return [acsSource(v.table_id), BOUNDARIES];
}

const fmtOf = (v: VariableDef) => (x: number | null | undefined) => (isAnalysis(v) ? fmtAnalysis(v, x) : fmtValue(x, v.unit));

/** The legend rows the map draws for this layer. */
export function layerLegend(v: VariableDef, values: ValueMap): LegendRow[] {
  const ests = estimates(values);
  if (isAnalysis(v) && v.paint.kind === 'cat') {
    const counts = classCounts(v, values);
    const pal = v.paint.palette;
    return v.paint.labels.map((label, i) => ({ color: pal[i], label, count: counts[i] ?? 0 }));
  }
  if (isAnalysis(v) && v.paint.kind === 'seq') {
    const { palette, bins } = v.paint;
    const n = palette.length;
    return palette.map((color, i) => {
      const lo = bins[i] ?? i / n, hi = bins[i + 1] ?? (i + 1) / n;
      const count = ests.filter((x) => typeof x === 'number' && x >= lo && (i === n - 1 ? x <= hi : x < hi)).length;
      return { color, label: `${Math.round(lo * 100)}–${Math.round(hi * 100)}`, count };
    });
  }
  const breaks = isDiverging(v) ? divergingBreaks(ests, reference(v.id).city?.est) : quantileBreaks(ests, 5);
  const pal = paletteFor(breaks.length + 1, themePalette(v));
  const f = (x: number) => fmtValue(x, v.unit);
  const counts = pal.map(() => 0);
  for (const x of ests) {
    const k = classify(x, breaks);
    if (k != null) counts[k]++;
  }
  return pal.map((color, i) => ({
    color,
    label: breaks.length === 0 ? 'All values' : i === 0 ? `${f(breaks[0])} or less` : i === breaks.length ? `More than ${f(breaks[i - 1])}` : `${f(breaks[i - 1])} – ${f(breaks[i])}`,
    count: counts[i],
  }));
}

const crop = () => {
  const s = useApp.getState();
  return { top: 70, bottom: 30, left: s.ui.left ? 390 : 0, right: s.browsePanel ? 470 : 0 };
};

export function layerInput(v: VariableDef, level: BrowseLevel, loaded: Loaded<ValueMap>, fc: UnitFC | null | undefined): LayerReportInput {
  const index = new Map((fc?.features ?? []).map((f) => [f.properties.GEOID, f.properties]));
  const ref = isAnalysis(v) ? { city: null, county: null } : reference(v.id);
  const units = [...loaded.data].map(([geoid, e]) => {
    const p = index.get(geoid);
    return { geoid, name: p ? unitTitle(p) : geoid, sub: unitSubtitle(p), est: e.est, moe: e.moe };
  });
  return {
    variable: { id: v.id, label: v.label, unit: v.unit as UnitKind, description: v.description.replace(/\s+/g, ' ').trim(), table_id: v.table_id, group: groups.find((g) => g.id === v.group)?.label ?? v.group, analysis: isAnalysis(v) },
    level: LEVEL_LABEL[level],
    units,
    fmt: fmtOf(v),
    fmtMoe: isAnalysis(v) ? null : (x) => fmtMoe(x, v.unit),
    legend: layerLegend(v, loaded.data),
    city: ref.city?.est ?? null,
    county: ref.county?.est ?? null,
    scope: loaded.scope,
    sources: layerSources(v),
  };
}

export function layerExportItems(v: VariableDef, level: BrowseLevel, loaded: Loaded<ValueMap>, fc: UnitFC | null | undefined): ExportItem[] {
  const many = LEVEL_LABEL[level].many;
  return [
    {
      label: 'Report (PDF)',
      hint: 'Definition, legend, map, highest and lowest 10',
      onSelect: async () => {
        const map = await mapSnapshot(getMap('explore'), { crop: crop() });
        printReport(buildLayerReport({ ...layerInput(v, level, loaded, fc), map, filename: exportFilename('layer', `${v.label} ${many}`, 'pdf') }));
      },
    },
    {
      label: 'Data (CSV)',
      hint: `Every ${LEVEL_LABEL[level].one.toLowerCase()} shown, with margins of error`,
      onSelect: () => downloadCsv(exportFilename('layer', `${v.label} ${many}`, 'csv'), toCsv(layerCsvRows(layerInput(v, level, loaded, fc)), LAYER_COLUMNS)),
    },
  ];
}

// ------------------------------------------------------------------ place profile
export function profileInput(level: BrowseLevel, geoid: string, props: { neighborhood?: unknown; name: string; pgh_share: number | null } | null, unit: Record<string, Estimate> | null, variable: VariableDef | null, values: Loaded<ValueMap> | null): PlaceProfileInput {
  const vars: ProfileVar[] = [];
  for (const g of groups) {
    if (isAnalysisGroup(g.id)) continue;
    for (const v of variablesByGroup(g.id)) {
      const e = unit?.[v.id] ?? null;
      const ref = reference(v.id);
      vars.push({
        group: g.label,
        id: v.id,
        label: v.label,
        unit: v.unit as UnitKind,
        est: e?.est ?? null,
        moe: e?.moe ?? null,
        city: ref.city?.est ?? null,
        county: ref.county?.est ?? null,
        text: fmtValue(e?.est, v.unit),
        moeText: e?.moe != null ? fmtMoe(e.moe, v.unit) : null,
        cityText: fmtValue(ref.city?.est, v.unit),
        countyText: fmtValue(ref.county?.est, v.unit),
        source: acsSource(v.table_id),
      });
    }
  }
  const name = props ? unitTitle(props as never) : geoid;
  let focus: PlaceProfileInput['focus'] = null;
  if (variable) {
    const own = values?.data.get(geoid) ?? (isAnalysis(variable) ? null : unit?.[variable.id] ?? null);
    const rank = values ? rankOf(own?.est, estimates(values.data)) : null;
    focus = { label: variable.label, text: fmtOf(variable)(own?.est), rank: rank ? EXPLORE_UI.charts.rank(rank.rank, rank.n, LEVEL_LABEL[level].many) : null, description: variable.description.replace(/\s*\([^()]*\b[A-Z]{1,2}\d{4,5}[A-Z]?\b[^()]*\)/g, '').trim() };
  }
  return {
    name,
    sub: unitSubtitle(props as never),
    geoid,
    levelOne: LEVEL_LABEL[level].one,
    insideCity: level === 'muni' ? null : props?.pgh_share ?? null,
    vars,
    focus,
    sources: [`U.S. Census Bureau, American Community Survey ${vintage.replace('-', '–')} estimates (the table for each measure is in the CSV); margins of error at the 90% level`, ...(variable && isAnalysis(variable) ? layerSources(variable).slice(0, 1) : []), BOUNDARIES],
  };
}

export function profileExportItems(level: BrowseLevel, geoid: string, props: Parameters<typeof profileInput>[2], unit: Record<string, Estimate> | null, variable: VariableDef | null, values: Loaded<ValueMap> | null): ExportItem[] {
  const name = () => (props ? unitTitle(props as never) : geoid);
  return [
    {
      label: 'Report (PDF)',
      hint: unit ? 'Place profile: every measure against the city and county' : 'Figures still loading',
      disabled: !unit,
      onSelect: async () => {
        const map = await mapSnapshot(getMap('explore'), { crop: crop() });
        printReport(buildPlaceProfileReport({ ...profileInput(level, geoid, props, unit, variable, values), map, filename: exportFilename('profile', name(), 'pdf') }));
      },
    },
    {
      label: 'Data (CSV)',
      hint: 'Every measure for this place, with city and county',
      disabled: !unit,
      onSelect: () => downloadCsv(exportFilename('profile', name(), 'csv'), toCsv(profileCsvRows(profileInput(level, geoid, props, unit, variable, values)), PROFILE_COLUMNS)),
    },
  ];
}
