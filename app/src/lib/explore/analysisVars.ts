// Analysis-mode data as Explore layers: the VisionPitts answer under each of the three stances, HUD income
// bands (AMI), market pressure and the watch list, asking rents (licensed aggregates, information only) and the
// measured values behind the analysis. Concrete values only: no percentile ranks, no 0–100 scores. All of it exists for the 128 city tracts only, so these layers force the tract level. Values are read
// straight from the bundled tract properties (and, for scores, from the same engine the Analysis section runs);
// nothing is recomputed in Python.
import { hasAskingRents, scoring, tractById, tracts } from '../data';
import { allResults, type TractResult } from '../derived';
import { presetWeights } from '../store';
import { placeFor } from '../place/data';
import type { Weights } from '../types';
import { PRESSURE_HOW, pctShort } from '../copy';
import { BIVARIATE_CLASSES, BIVARIATE_PALETTE, PRESSURE_LABELS, PRESSURE_PALETTE, pressureClass } from '../mapStyle';
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
  { id: 'an_answer', label: 'Best fit by stance' },
  { id: 'an_ami', label: 'Income bands (AMI)' },
  { id: 'an_rents', label: 'Rents' },
  { id: 'an_lens', label: 'Market dynamics' },
  { id: 'an_land', label: 'Land use' },
  { id: 'an_inputs', label: 'Measured values' },
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

// The default answer: which housing type fits best under each published stance (fixed weights, not the sliders).
const STANCES: { id: string; label: string }[] = [
  { id: 'anti_displacement', label: 'Anti-displacement' },
  { id: 'market_led', label: 'Market-led' },
  { id: 'transit_first', label: 'Transit-first' },
];
const stanceWeights = new Map<string, Weights>();
const stanceResults = (id: string) => {
  if (!stanceWeights.has(id)) stanceWeights.set(id, presetWeights(id));
  return allResults(stanceWeights.get(id)!);
};
const answerVars: AnalysisVar[] = STANCES.filter((st) => scoring.presets.some((p) => p.id === st.id)).map((st) =>
  def(`an_answer_${st.id}`, st.label, 'an_answer', 'class', 'Answer', `Housing type that fits best under the ${st.label} stance. A starting point, not a decision; Analysis shows the evidence and the rent arithmetic.`, { kind: 'cat', palette: scoring.typologies.map((t) => t.color), labels: scoring.typologies.map((t) => t.label) }, (t) => {
    const top = stanceResults(st.id).get(t.GEOID)?.top;
    return top ? typIndex.get(top) ?? null : null;
  }, { classOf: (v) => v }),
);

// HUD income bands (CHAS 2018–22 renter households by share of area median income), from place.json.
type BandKey = 'le30' | 'b30_50' | 'b50_80' | 'b80_100' | 'gt100';
const band = (k: BandKey, f: 'hh' | 'burden30' | 'burden50') => (t: TractProps) => num(placeFor(t.GEOID)?.bands?.[k]?.[f] ?? null);
const renterShare = (keys: BandKey[]) => (t: TractProps) => {
  const p = placeFor(t.GEOID);
  if (!p?.bands) return null;
  const all = (['le30', 'b30_50', 'b50_80', 'b80_100', 'gt100'] as BandKey[]).reduce((a, k) => a + (p.bands[k]?.hh ?? 0), 0);
  const part = keys.reduce((a, k) => a + (p.bands[k]?.hh ?? 0), 0);
  return all > 0 ? part / all : null;
};
const CHAS = 'HUD CHAS 2018–22, renter households by income.';
const amiVars: AnalysisVar[] = [
  def('an_ami_le30', 'Renters ≤30% AMI', 'an_ami', 'count', 'CHAS', `${CHAS} 30% AMI = $33,100 for a family of four (HUD FY2026).`, { kind: 'quantile' }, band('le30', 'hh')),
  def('an_ami_30_50', 'Renters 30–50% AMI', 'an_ami', 'count', 'CHAS', `${CHAS} 50% AMI = $55,200 for a family of four.`, { kind: 'quantile' }, band('b30_50', 'hh')),
  def('an_ami_50_80', 'Renters 50–80% AMI', 'an_ami', 'count', 'CHAS', `${CHAS} 80% AMI = $88,300 for a family of four.`, { kind: 'quantile' }, band('b50_80', 'hh')),
  def('an_ami_le50_share', 'Renters ≤50% AMI, share', 'an_ami', 'share', 'CHAS', `${CHAS} Renters at or below 50% AMI ÷ all renters.`, { kind: 'quantile' }, renterShare(['le30', 'b30_50'])),
  def('an_ami_le30_burden50', '≤30% AMI paying over half of income', 'an_ami', 'count', 'CHAS', `${CHAS} Severely cost-burdened extremely low-income renters.`, { kind: 'quantile' }, band('le30', 'burden50')),
];
const lensVars: AnalysisVar[] = [
  def('an_market_pressure', 'Neighbor pressure', 'an_lens', 'class', 'Lens', PRESSURE_HOW, { kind: 'cat', palette: PRESSURE_PALETTE, labels: PRESSURE_LABELS }, field('market_pressure'), { classOf: (v) => pressureClass(v) }),
  def('an_bivariate', 'Need × market trend', 'an_lens', 'class', 'Lens', 'Need level crossed with the market trend since 2016 (MVA). High need + rising market = watch list.', { kind: 'cat', palette: BIVARIATE_PALETTE, labels: BIVARIATE_LABELS }, (t) => {
    const i = t.bivariate_class ? BIVARIATE_CLASSES.indexOf(t.bivariate_class) : -1;
    return i >= 0 ? i : null;
  }, { classOf: (v) => v }),
  def('an_watch_list', 'Watch list', 'an_lens', 'flag', 'Lens', 'High need and a rising market: where displacement risk from new market-rate homes is highest.', { kind: 'cat', palette: ['#e7e5e4', '#c8321f'], labels: ['Not on the watch list', 'Watch list: high need, rising market'] }, (t) => (t.residential ? (t.watch_list ? 1 : 0) : null), { classOf: (v) => v }),
];
const mkt = (k: 'asking_2br' | 'acs_rent' | 'safmr_2br') => (t: TractProps) => num(placeFor(t.GEOID)?.market?.[k] ?? null);
const rentVars: AnalysisVar[] = [
  def('an_rent_acs', 'Median rent paid', 'an_rents', 'usd', 'ACS', 'ACS 2020–24 median gross rent (rent + utilities) that current renters pay, subsidized homes included.', { kind: 'quantile' }, (t) => mkt('acs_rent')(t) ?? field('med_gross_rent')(t)),
  def('an_rent_fmr', 'Fair Market Rent, 2BR', 'an_rents', 'usd', 'HUD', 'HUD FY2026 Small Area Fair Market Rent for a 2-bedroom in the tract’s ZIP code: the most a housing voucher pays.', { kind: 'quantile' }, mkt('safmr_2br')),
  ...(hasAskingRents
    ? [def('an_rent_2br', 'Asking rent, 2BR', 'an_rents', 'usd', 'Listings', 'Median 2-bedroom asking rent in 2025–26 rental listings (market-rate; hidden where fewer than 10 units).', { kind: 'quantile' }, field('rent_2br_2025_26'), { conf: confOf('asking_rents_conf') })]
    : []),
];
const inputVars: AnalysisVar[] = [
  def('an_eviction_rate', 'Evictions per 100 renters', 'an_inputs', 'rate', 'Input', 'Eviction filings per year (2023–25 average) per 100 renter households; spread from ZIP codes, so an estimate.', { kind: 'quantile' }, field('eviction_filing_rate')),
  def('an_hcv_per_renter', 'Vouchers per renter', 'an_inputs', 'share', 'Input', 'HUD housing vouchers ÷ renter households (suppressed by HUD where 10 or fewer).', { kind: 'quantile' }, field('hcv_per_renter')),
  def('an_transit_departures', 'Bus and T departures', 'an_inputs', 'count', 'Input', 'Weekday departures from stops within a quarter mile (PRT schedule, June 2026).', { kind: 'quantile' }, field('transit_departures')),
  def('an_transit_freq', 'Near frequent transit', 'an_inputs', 'share', 'Input', 'Share of residents within a quarter mile of a stop served every 15 minutes or better.', { kind: 'quantile' }, (t) => num(placeFor(t.GEOID)?.transit?.freq_share_qmi ?? null)),
  def('an_flood_fema', 'Flood zone land', 'an_inputs', 'share', 'Input', 'Share of land in a FEMA special flood hazard area (1% annual chance).', { kind: 'quantile' }, (t) => { const v = num(placeFor(t.GEOID)?.flood?.fema_sfha_pct ?? null); return v == null ? null : v / 100; }),
  def('an_age65', 'Age 65+', 'an_inputs', 'share', 'Input', 'Share of residents aged 65 or older (ACS 2020–24).', { kind: 'quantile' }, field('age65_share')),
  def('an_units_2_4', '2–4 unit homes', 'an_inputs', 'share', 'Input', 'Share of homes in buildings with 2 to 4 units (ACS 2020–24).', { kind: 'quantile' }, field('units_2_4_share')),
  def('an_veg_cover', 'Green cover', 'an_inputs', 'rate', 'Input', 'Percent of land with vegetation (NAIP 2022).', { kind: 'quantile' }, field('veg_cover_land_pct')),
  def('an_svi', 'Social vulnerability', 'an_inputs', 'pct', 'Input', 'CDC Social Vulnerability Index 2022, percentile within Pennsylvania (higher = more vulnerable).', { kind: 'quantile' }, field('svi_overall')),
];

// Land use from the county assessment (class and use of every parcel), place.json `land_use` (Tier 2 build).
type LandUseKey = 'residential' | 'commercial' | 'industrial' | 'vacant' | 'institutional' | 'other' | 'vacant_lots';
type LandUse = Partial<Record<LandUseKey, number | null>>;
const landUse = (k: LandUseKey) => (t: TractProps) => num((placeFor(t.GEOID) as { land_use?: LandUse | null } | null)?.land_use?.[k] ?? null);
const LAND = 'Allegheny County property assessments (2026), share of parcel land (lot area) in the tract.';
const landVars: AnalysisVar[] = [
  def('an_land_res', 'Residential land', 'an_land', 'share', 'Parcels', `${LAND} Homes of every size, apartment buildings and public housing.`, { kind: 'quantile' }, landUse('residential')),
  def('an_land_com', 'Commercial land', 'an_land', 'share', 'Parcels', `${LAND} Shops, offices, mixed retail with homes above, parking.`, { kind: 'quantile' }, landUse('commercial')),
  def('an_land_ind', 'Industrial land', 'an_land', 'share', 'Parcels', `${LAND} Warehouses and manufacturing.`, { kind: 'quantile' }, landUse('industrial')),
  def('an_land_vacant', 'Vacant land', 'an_land', 'share', 'Parcels', `${LAND} Parcels assessed as vacant land (residential, commercial or industrial).`, { kind: 'quantile' }, landUse('vacant')),
  def('an_land_vacant_lots', 'Vacant lots', 'an_land', 'count', 'Parcels', 'Number of parcels the county assesses as vacant land (Allegheny County property assessments, 2026).', { kind: 'quantile' }, landUse('vacant_lots')),
];

export const ANALYSIS_VARS: AnalysisVar[] = [...answerVars, ...amiVars, ...lensVars, ...rentVars, ...inputVars, ...landVars];
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
