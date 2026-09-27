// Analysis-mode data as Explore layers: the six factor percentiles, match scores under the current priorities,
// market pressure and the watch list, asking rents (licensed aggregates, information only) and the raw factor
// inputs. All of it exists for the 128 city tracts only, so these layers force the tract level. Values are read
// straight from the bundled tract properties (and, for scores, from the same engine the Analysis section runs);
// nothing is recomputed in Python.
import { hasAskingRents, scoring, tractById, tracts } from '../data';
import type { TractResult } from '../derived';
import { FACTOR_COPY, PRESSURE_HOW, RENT_HOW, SCORE_HOW, factorName, pctShort } from '../copy';
import { BIVARIATE_CLASSES, BIVARIATE_PALETTE, FACTOR_BINS, FACTOR_PALETTE, PRESSURE_LABELS, PRESSURE_PALETTE, RENT_GROWTH_LABELS, RENT_GROWTH_PALETTE, SCORE_PALETTE, pressureClass, rentGrowthClass } from '../mapStyle';
import type { MapPaint } from '../paint';
import type { Conf, TractProps } from '../types';
import { fmtValue } from './bins';
import type { GroupDef, Unit, ValueMap, VariableDef } from './types';

export type AnalysisPaint = { kind: 'seq'; palette: string[]; bins: number[] } | { kind: 'cat'; palette: string[]; labels: string[] } | { kind: 'quantile' };

export interface AnalysisVar extends VariableDef {
  source: 'analysis';
  paint: AnalysisPaint;
  /** The value for one tract (null when the tract is not ranked or the field is missing). */
  read: (t: TractProps, results: Map<string, TractResult>) => number | null;
  /** For `cat` paints: the class index of a value. */
  classOf?: (v: number) => number | null;
  /** Confidence tag shown beside the value, when the field carries one. */
  conf?: (t: TractProps) => Conf | null;
}

export const isAnalysis = (v: VariableDef | null | undefined): v is AnalysisVar => !!v && (v as AnalysisVar).source === 'analysis';

export const ANALYSIS_GROUPS: GroupDef[] = [
  { id: 'an_match', label: 'Match under your priorities' },
  { id: 'an_factors', label: 'The six factors, ranked city-wide' },
  { id: 'an_lens', label: 'Market pressure & watch list' },
  { id: 'an_rents', label: 'Asking rents (licensed listings, information only)' },
  { id: 'an_inputs', label: 'Factor inputs (raw values)' },
];
const ANALYSIS_GROUP_IDS = new Set(ANALYSIS_GROUPS.map((g) => g.id));
export const isAnalysisGroup = (groupId: string) => ANALYSIS_GROUP_IDS.has(groupId);

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const field = (k: string) => (t: TractProps) => num(t[k]);
const confOf = (k: string) => (t: TractProps) => (t[k] as Conf | null | undefined) ?? null;
const typIndex = new Map(scoring.typologies.map((t, i) => [t.id, i]));
const BIVARIATE_LABELS = BIVARIATE_CLASSES.map((c) => {
  const [need, dir] = c.split('-');
  const n = need === 'L' ? 'Low need' : need === 'M' ? 'Middle need' : 'High need';
  return `${n} · market ${dir}`;
});

let sortSeed = 1000;
function def(id: string, label: string, group: string, unit: Unit, table: string, description: string, paint: AnalysisPaint, read: AnalysisVar['read'], extra: Partial<Pick<AnalysisVar, 'classOf' | 'conf'>> = {}): AnalysisVar {
  return { id, label, group, unit, kind: 'analysis', num: [], den: null, table_id: table, description, sort: sortSeed++, source: 'analysis', paint, read, ...extra };
}

const FACTOR_IDS = scoring.factors.map((f) => f.id);
const scoreVars: AnalysisVar[] = [
  def('an_top_score', 'Best-match score', 'an_match', 'score', 'Match', `${SCORE_HOW} Painted for the priorities set in Analysis.`, { kind: 'seq', palette: SCORE_PALETTE, bins: scoring.bins.score }, (t, r) => num(r.get(t.GEOID)?.topScore)),
  def('an_pick', 'Which housing type wins', 'an_match', 'class', 'Match', 'The housing type with the highest match score in each tract under the current priorities.', { kind: 'cat', palette: scoring.typologies.map((t) => t.color), labels: scoring.typologies.map((t) => t.label) }, (t, r) => {
    const top = r.get(t.GEOID)?.top;
    return top ? typIndex.get(top) ?? null : null;
  }, { classOf: (v) => v }),
  ...scoring.typologies.map((k) => def(`an_score_${k.id}`, `${k.label}: match score`, 'an_match', 'score', 'Match', `Match score (0–100) of ${k.label.toLowerCase()} under the current priorities. ${k.long}.`, { kind: 'seq', palette: SCORE_PALETTE, bins: scoring.bins.score }, (t, r) => num(r.get(t.GEOID)?.scores.find((s) => s.typology === k.id)?.score))),
];
const factorVars: AnalysisVar[] = FACTOR_IDS.map((f) => {
  const c = FACTOR_COPY[f];
  const label = factorName(f, scoring.factors.find((x) => x.id === f)?.label);
  return def(`an_${f}`, label, 'an_factors', 'pct', 'Factor', c ? `${c.meaning} ${c.how}` : label, { kind: 'seq', palette: FACTOR_PALETTE, bins: FACTOR_BINS }, field(f), { conf: confOf(`${f}_conf`) });
});
const lensVars: AnalysisVar[] = [
  def('an_market_pressure', 'Market pressure from neighbors', 'an_lens', 'class', 'Lens', PRESSURE_HOW, { kind: 'cat', palette: PRESSURE_PALETTE, labels: PRESSURE_LABELS }, field('market_pressure'), { classOf: (v) => pressureClass(v) }),
  def('an_bivariate', 'Need × market change (2016→2021)', 'an_lens', 'class', 'Lens', 'Need tercile crossed with the direction of the housing market since 2016. High need with a rising market is the watch list.', { kind: 'cat', palette: BIVARIATE_PALETTE, labels: BIVARIATE_LABELS }, (t) => {
    const i = t.bivariate_class ? BIVARIATE_CLASSES.indexOf(t.bivariate_class) : -1;
    return i >= 0 ? i : null;
  }, { classOf: (v) => v }),
  def('an_watch_list', 'Watch list', 'an_lens', 'flag', 'Lens', 'Tracts in the top third for need whose own market has been rising since 2016: adding market-rate homes here without protections is most likely to displace current renters.', { kind: 'cat', palette: ['#e7e5e4', '#c8321f'], labels: ['Not on the watch list', 'Watch list: high need, rising market'] }, (t) => (t.residential ? (t.watch_list ? 1 : 0) : null), { classOf: (v) => v }),
];
const rentVars: AnalysisVar[] = hasAskingRents
  ? [
      def('an_rent_2br', 'Median 2BR asking rent, 2025–26', 'an_rents', 'usd', 'Rents', RENT_HOW, { kind: 'quantile' }, field('rent_2br_2025_26'), { conf: confOf('asking_rents_conf') }),
      def('an_rent_growth_existing', 'Asking-rent growth, existing stock', 'an_rents', 'class', 'Rents', 'Median 2BR asking rent, 2019–20 → 2025–26, for units in buildings listed before 2019, so new buildings cannot read as repricing.', { kind: 'cat', palette: RENT_GROWTH_PALETTE, labels: RENT_GROWTH_LABELS }, field('rent_2br_growth_existing'), { classOf: (v) => rentGrowthClass(v), conf: confOf('asking_rents_conf') }),
      def('an_rent_growth_all', 'Asking-rent growth, all listings', 'an_rents', 'class', 'Rents', 'Median 2BR asking rent, 2019–20 → 2025–26, over every listing (new buildings included).', { kind: 'cat', palette: RENT_GROWTH_PALETTE, labels: RENT_GROWTH_LABELS }, field('rent_2br_growth_all'), { classOf: (v) => rentGrowthClass(v), conf: confOf('asking_rents_conf') }),
      def('an_rent_index', 'Rent level vs county (mix-adjusted)', 'an_rents', 'ratio', 'Rents', 'Median of each listed unit’s rent divided by the county median for the same bedroom count and year; 1.0 = county-typical.', { kind: 'quantile' }, field('rent_index_2025_26'), { conf: confOf('asking_rents_conf') }),
      def('an_rent_units', 'Distinct units listed, 2025–26', 'an_rents', 'count', 'Rents', 'Distinct 2-bedroom units with at least one listing in 2025–26; the basis for suppression and confidence.', { kind: 'quantile' }, field('n_units_2025_26')),
    ]
  : [];
const inputVars: AnalysisVar[] = [
  def('an_need_count', 'Renter households at ≤50% AMI', 'an_inputs', 'count', 'Input', 'HUD CHAS 2018–22: renter households earning at most 50% of the area median income. The count behind the need factor.', { kind: 'quantile' }, field('need_count')),
  def('an_eviction_rate', 'Eviction filings per 100 renter households', 'an_inputs', 'rate', 'Input', 'Eviction Lab filings 2023–25 (mean year), apportioned from ZIP codes to tracts by housing units: an estimate, not a tract observation.', { kind: 'quantile' }, field('eviction_filing_rate')),
  def('an_hcv_per_renter', 'Housing vouchers per renter household', 'an_inputs', 'share', 'Input', 'HUD Housing Choice Vouchers (tenant- and project-based) divided by ACS renter households. Suppressed by HUD where 10 or fewer.', { kind: 'quantile' }, field('hcv_per_renter')),
  def('an_transit_departures', 'Transit departures per acre (weekday)', 'an_inputs', 'rate', 'Input', 'Pittsburgh Regional Transit departures on a representative Wednesday at stops within 400 m, per acre of tract land.', { kind: 'quantile' }, field('transit_departures_per_acre')),
  def('an_flood_share', 'Land in the flood screening footprint (%)', 'an_inputs', 'rate', 'Input', 'Share of tract land inside a terrain-based (HAND) inundation footprint. Not a FEMA floodplain.', { kind: 'quantile' }, field('flood_share_pct')),
  def('an_veg_cover', 'Vegetation cover, % of land', 'an_inputs', 'rate', 'Input', 'NAIP 2022 vegetation cover (NDVI above 0.1) as a share of land area; a first heat and greenness signal, not a canopy product.', { kind: 'quantile' }, field('veg_cover_land_pct')),
  def('an_svi', 'Social vulnerability (CDC SVI)', 'an_inputs', 'pct', 'Input', 'CDC/ATSDR Social Vulnerability Index 2022 overall percentile within Pennsylvania.', { kind: 'quantile' }, field('svi_overall')),
];

export const ANALYSIS_VARS: AnalysisVar[] = [...scoreVars, ...factorVars, ...lensVars, ...rentVars, ...inputVars];
export const analysisVarById = new Map(ANALYSIS_VARS.map((v) => [v.id, v]));

/** The variable's value for every city tract, as a ValueMap (no margins: these are not survey estimates). */
export function analysisValues(v: AnalysisVar, results: Map<string, TractResult>): ValueMap {
  const m: ValueMap = new Map();
  for (const t of tracts) m.set(t.GEOID, { est: v.read(t, results), moe: null, cv: null });
  return m;
}

/** Fixed-palette paint (factors, scores, classes); null for quantile variables, which use the browse ramp. */
export function analysisPaint(v: AnalysisVar, values: ValueMap): MapPaint | null {
  if (v.paint.kind === 'quantile') return null;
  const out = new Map<string, number | null>();
  for (const [id, e] of values) {
    if (e.est == null) out.set(id, null);
    else out.set(id, v.paint.kind === 'cat' ? (v.classOf ? v.classOf(e.est) : e.est) : e.est);
  }
  return v.paint.kind === 'cat' ? { kind: 'cat', palette: v.paint.palette, values: out } : { kind: 'seq', palette: v.paint.palette, values: out, bins: v.paint.bins };
}

/** Display text for one value of an analysis variable. */
export function fmtAnalysis(v: AnalysisVar, x: number | null | undefined): string {
  if (x == null || !Number.isFinite(x)) return '—';
  switch (v.unit) {
    case 'pct':
      return pctShort(x);
    case 'score':
      return `${Math.round(x * 100)} / 100`;
    case 'class': {
      const i = v.classOf ? v.classOf(x) : x;
      return i != null && v.paint.kind === 'cat' ? v.paint.labels[i] ?? '—' : '—';
    }
    case 'flag':
      return x ? 'Yes' : 'No';
    case 'rate':
      return x >= 10 ? x.toFixed(0) : x >= 1 ? x.toFixed(1) : x.toFixed(2);
    case 'ratio':
      return `${x.toFixed(2)}×`;
    default:
      return fmtValue(x, v.unit);
  }
}

/** Confidence tag for a tract on this variable, when it carries one. */
export const analysisConf = (v: AnalysisVar, geoid: string): Conf | null => {
  const t = tractById.get(geoid);
  return t && v.conf ? v.conf(t) : null;
};

/** Class counts for a categorical variable (legend and summary). */
export function classCounts(v: AnalysisVar, values: ValueMap): number[] {
  if (v.paint.kind !== 'cat') return [];
  const counts = v.paint.labels.map(() => 0);
  for (const e of values.values()) {
    if (e.est == null) continue;
    const i = v.classOf ? v.classOf(e.est) : e.est;
    if (i != null && counts[i] != null) counts[i]++;
  }
  return counts;
}
