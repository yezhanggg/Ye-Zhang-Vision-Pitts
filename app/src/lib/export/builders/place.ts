// Place report (Analysis > Place, one tract): the planning inputs, the answer with its arithmetic, the evidence blocks
// as small tables, the map, sources and "You decide". Plus the CSV: one row per measure. Pure: the caller hands in the
// tract, its place measures, the HUD table, the recommendation and the planning inputs the screen used.
import { limitFor, bandLimit4p } from '../../place/afford';
import { DECIDE, SOURCE_LINES } from '../../place/copy';
import { capitalize, fmtDollars, fmtHouseholds, fmtPct100d1, isNum, roundHalfEven } from '../../place/format';
import {
  AGE_LABEL, FLOOD_LABEL, LEVEL_LABEL, MILES_LABEL, PLAN_TYPE_LABEL, PLAN_TYPE_SHORT, TYPE_PERSONS, homesLines, levelPhrase, personsWord, sizeHomeWord, sizeIncomeLine, sizeWord,
  type AgeGroup, type FixedSize, type FloodRisk, type HouseholdSize, type PlanLevel, type TransitMiles,
} from '../../place/plan';
import type { Recommendation } from '../../place/recommend';
import { STANCE_LABEL, TYPOLOGY_LABEL } from '../../place/thresholds';
import type { BandId, HouseholdType, HudTable, PlaceMeasures, Stance, Typology, TypeBandId } from '../../place/types';
import type { CsvColumn } from '../csv';
import type { Report, ReportBlock } from '../report';

export interface PlanInputs {
  focus: Stance;
  level: PlanLevel;
  size: HouseholdSize;
  age: AgeGroup;
  homes: number | null;
  flood: FloodRisk;
  transitMi: TransitMiles;
}

/** Tract fields the report reads (a subset of TractProps). */
export interface PlaceTract {
  GEOID: string;
  name: string;
  neighborhood?: string | null;
  age65_share?: number | null;
  market_pressure?: number | null;
  mva21?: string | null;
  market_direction?: string | null;
  watch_list?: boolean | null;
  flood_share_pct?: number | null;
}

export interface PlaceReportInput {
  t: PlaceTract;
  place: PlaceMeasures;
  hud: HudTable;
  rec: Recommendation;
  plan: PlanInputs;
  /** Display names for housing types (scoring.json labels); defaults to the rules library's lower-case names. */
  typeLabel?: (k: Typology) => string;
  /** PNG data URL of the map, when one could be taken. */
  map?: string | null;
  filename?: string;
}

const BANDS: BandId[] = ['le30', 'b30_50', 'b50_80', 'b80_100', 'gt100'];
const BAND_LABEL: Record<BandId | 'gt80', string> = { le30: '≤ 30% AMI', b30_50: '30–50% AMI', b50_80: '50–80% AMI', b80_100: '80–100% AMI', gt100: '> 100% AMI', gt80: '> 80% AMI' };
const TYPE_BANDS: TypeBandId[] = ['le30', 'b30_50', 'b50_80', 'gt80'];
const TYPE_IDS: HouseholdType[] = ['elderly_alone', 'elderly_family', 'small_family', 'large_family', 'other'];
const TYPE_LABEL: Record<HouseholdType, string> = { elderly_alone: 'Seniors living alone', elderly_family: 'Senior families', small_family: 'Small families (2–4)', large_family: 'Large families (5+)', other: 'Other households' };
const TYPOLOGIES: Typology[] = ['adu', 'duplex_triplex', 'townhome', 'small_apartment', 'senior'];
const STATUS_TEXT = { yes: 'By right', conditional: 'Conditional use', no: 'Not permitted', unknown: 'Unknown' } as const;
const LAND: [string, string][] = [
  ['residential', 'Residential'],
  ['commercial', 'Commercial'],
  ['industrial', 'Industrial'],
  ['institutional', 'Institutional'],
  ['vacant', 'Vacant'],
  ['other', 'Other'],
];
export const LAND_SOURCE = 'Allegheny County property assessments 2026 (class and use of every parcel; share of parcel land area and of parcels)';

const NA = '—';
const money = (v: number | null | undefined) => (isNum(v) ? fmtDollars(v) : NA);
const count = (v: number | null | undefined) => (isNum(v) ? fmtHouseholds(v) : NA);
const share = (v: number | null | undefined, d = 0) => (isNum(v) ? `${(v * 100).toFixed(d)}%` : NA);
const pct = (v: number | null | undefined, d = 1) => (isNum(v) ? `${v.toFixed(d)}%` : NA);
const miles = (v: number | null | undefined) => (isNum(v) ? `${v.toFixed(2)} mi` : NA);
const yn = (v: boolean | null | undefined) => (v == null ? NA : v ? 'Yes' : 'No');

/** Zoning shares arrive as 0–1 fractions or 0–100 percents; always return percents. */
export function zoningPercents(shares: Record<string, number> | null | undefined): [string, number][] {
  const rows = Object.entries(shares ?? {}).filter(([, v]) => isNum(v)) as [string, number][];
  const total = rows.reduce((a, [, v]) => a + v, 0);
  const scale = total > 0 && total <= 1.5 ? 100 : 1;
  return rows.map(([k, v]) => [k, v * scale] as [string, number]).sort((a, b) => b[1] - a[1]);
}

type LandUse = Partial<Record<string, number | null>> & { parcel_shares?: Partial<Record<string, number | null>> | null; vacant_lots?: number | null; parcels?: number | null };
const landUseOf = (p: PlaceMeasures): LandUse | null => (p as PlaceMeasures & { land_use?: LandUse | null }).land_use ?? null;
type Access = { jobs_1mi?: number | null; school_mi?: number | null; elem_mi?: number | null; grocery_mi?: number | null; services_halfmi?: number | null };
const accessOf = (p: PlaceMeasures): Access | null => (p as PlaceMeasures & { access?: Access | null }).access ?? null;

export const placeName = (t: PlaceTract) => t.neighborhood ?? t.name;

/** The answer rows, as the answer card on screen shows them. */
export function answerRows(i: PlaceReportInput): { lead: string | null; headline: string; others: string[]; rows: [string, string][]; details: string[] } {
  const { rec, hud, plan } = i;
  const lbl = i.typeLabel ?? ((k: Typology) => capitalize(TYPOLOGY_LABEL[k]));
  const { level, size, age } = plan;
  const lead = rec.types[0] ?? null;
  const atMarket = level === 'market';
  const marketRule = rec.stance === 'market_led' || atMarket;
  const price = rec.price;
  const two = rec.twoBedroom;
  const m = rec.market;
  const mr = rec.marketRent;
  const flood = rec.floodLimit;
  const auto = size === 'auto';
  const autoType = auto ? rec.household?.type ?? null : null;
  const eff: FixedSize = size === 'auto' ? rec.household?.size ?? 3 : size;
  const effPersons = autoType ? TYPE_PERSONS[autoType] : personsWord(eff);
  const ageWord = age === 'any' ? '' : age === 'senior62' ? ', 62+' : ', under 62';
  const whoShort = autoType ? `${PLAN_TYPE_SHORT[autoType]} (largest group)${ageWord}` : `${sizeWord(eff)} household${ageWord}`;
  const tenants = rec.tenants.types;
  const tenantTotal = tenants.reduce((a, t) => a + t.count, 0);
  const tenantWords = autoType ? PLAN_TYPE_LABEL[autoType] : tenants.length ? tenants.map((t) => PLAN_TYPE_SHORT[t.type]).join(' + ') : 'households';
  const levelShort = level === 'market' ? '>80% AMI' : LEVEL_LABEL[level];
  const l80 = limitFor(hud, 80, Math.min(eff, 8));
  const floor80 = isNum(l80) ? roundHalfEven(l80 / 40) : null;

  const headline = lead ? `${capitalize(sizeHomeWord(eff).replace(/^a /, ''))} homes · ${whoShort} · ${marketRule ? 'market rent' : LEVEL_LABEL[level]}` : 'No suggestion here';
  const rows: [string, string][] = [];
  rows.push(['Suggested type', lead ? lbl(lead.typology) : 'No suggestion here']);
  if (!lead) rows.push(['Why not', capitalize(rec.stanceTest.passed === false || marketRule ? rec.stanceTest.sentence : rec.band.available ? rec.notServedWhy || rec.tenants.sentence : rec.band.reason)]);
  if (rec.types.length > 1) rows.push(['Also fits', rec.types.slice(1).map((o) => lbl(o.typology)).join(', ')]);
  rows.push([
    'Rent that fits',
    atMarket ? (mr.rent != null ? `${fmtDollars(mr.rent)}/mo market asks · no HUD ceiling` : 'Market rent not available') : price ? `${fmtDollars(price.limit)} × 30% ÷ 12 = ${fmtDollars(price.rent)}/mo, ${effPersons}` : 'HUD limits not available',
  ]);
  rows.push(['Who it serves', rec.tenants.available ? `${fmtHouseholds(tenantTotal)} ${tenantWords} ${levelShort}${autoType ? ' (the largest group here)' : ''}` : `0 ${tenantWords} ${levelShort} on file`]);
  rows.push([
    'Market',
    atMarket
      ? mr.rent != null && floor80 != null
        ? `Asks ${fmtDollars(mr.rent)} · needs ${fmtDollars(mr.rent * 40)} a year (${fmtDollars(mr.rent)} × 12 ÷ 30%)`
        : 'Not available'
      : m.askingUsed != null && two
        ? m.askingUsed <= two.rent
          ? `Asks ${fmtDollars(m.askingUsed)} · ${fmtDollars(two.rent - m.askingUsed)} below what fits${price && price.bedrooms !== 2 ? ' a 2-bedroom' : ''}`
          : `Asks ${fmtDollars(m.askingUsed)} · gap ${fmtDollars(m.askingUsed - two.rent)}/mo over ${fmtDollars(two.rent)}${price && price.bedrooms !== 2 ? ' (2-bedroom)' : ''}${m.verdict === 'needs_subsidy' ? ' · needs subsidy' : ''}`
        : 'Asking rent not available',
  ]);
  if (flood && flood.pct != null) rows.push(['Flood', `${fmtPct100d1(flood.pct)} of land in a FEMA flood zone · ${flood.blocked ? `above your ${flood.limit}% limit` : flood.limit != null ? `within your ${flood.limit}% limit` : 'no limit set'}`]);

  const homesText =
    plan.homes != null
      ? homesLines(
          plan.homes,
          rec.tenants.available ? tenantTotal : isNum(rec.band.hh) ? 0 : null,
          `qualifying ${autoType ? PLAN_TYPE_LABEL[autoType] : `${sizeWord(eff)} households`}${age === 'any' ? '' : age === 'senior62' ? ' 62 and older' : ' under 62'} ${levelPhrase(level)}`,
          level,
          m.askingUsed,
          two?.rent ?? null,
        )
      : null;
  const details = [
    rec.band.reason,
    rec.tenants.sentence,
    atMarket
      ? `Rent: ${mr.words}. No HUD rent ceiling applies above 80% AMI; the market rent is the price.${floor80 != null && isNum(l80) ? ` A ${sizeWord(eff)} household above 80% AMI earns more than ${fmtDollars(l80)}, so 30% of income is more than ${fmtDollars(l80)} × 30% ÷ 12 = ${fmtDollars(floor80)} a month.` : ''}`
      : price
        ? `Rent that fits: ${fmtDollars(price.limit)} (the HUD ${price.pct}% AMI limit for a ${price.persons}-person household${eff === 5 ? '; 5+ uses the 5-person limit' : ''}${autoType === 'small_family' ? '; small families are 2–4 people, priced at 3' : ''}) × 30% ÷ 12 = ${fmtDollars(price.rent)} a month, gross rent (utilities not known).`
        : 'HUD income limits are not available.',
    atMarket ? '' : m.sentence,
    rec.stanceTest.sentence,
    flood ? `Flood: ${flood.sentence}` : '',
    rec.notServedWhy ? `Not served: ${rec.notServedWhy}.` : '',
    ...rec.not.map((n) => `Not ${TYPOLOGY_LABEL[n.typology]}: ${n.because}.`),
    ...(homesText ? [homesText.served, homesText.gap] : []),
  ]
    .filter(Boolean)
    .map((s) => capitalize(s.trim()));
  return { lead: lead ? lbl(lead.typology) : null, headline, others: rec.types.slice(1).map((o) => lbl(o.typology)), rows, details };
}

export function inputRows(plan: PlanInputs): [string, string][] {
  return [
    ['Focusing issue', STANCE_LABEL[plan.focus]],
    ['Income level', LEVEL_LABEL[plan.level]],
    ['Household size', plan.size === 'auto' ? 'Largest group here' : personsWord(plan.size)],
    ['Age group', AGE_LABEL[plan.age]],
    ['Homes needed', plan.homes != null ? fmtHouseholds(plan.homes) : 'Not set'],
    ['Flood risk accepted', FLOOD_LABEL[plan.flood]],
    ['Frequent transit within', MILES_LABEL[plan.transitMi]],
  ];
}

function bandLimitText(b: BandId, hud: HudTable): string {
  if (b === 'gt100') return isNum(hud.metro?.median) ? `above ${fmtDollars(hud.metro.median)}` : NA;
  const v = bandLimit4p(hud, b);
  return v == null ? NA : `up to ${fmtDollars(v)}`;
}

/** Evidence blocks as small tables (headings at level 3). */
export function evidenceBlocks(t: PlaceTract, p: PlaceMeasures, hud: HudTable): ReportBlock[] {
  const out: ReportBlock[] = [];
  const fy = hud.metro?.fy ?? 2026;
  // A. Affordability
  out.push({ kind: 'heading', text: 'Affordability by income band', level: 3 });
  out.push({
    kind: 'table',
    columns: ['AMI band', `4-person limit (FY${fy})`, 'Renter households', '± MOE', 'Paying > 30%', 'Paying > 50%'],
    rows: BANDS.map((id) => {
      const b = p.bands?.[id];
      return [BAND_LABEL[id], bandLimitText(id, hud), count(b?.hh), isNum(b?.moe) ? `±${fmtHouseholds(b!.moe)}` : NA, count(b?.burden30), count(b?.burden50)];
    }),
    align: ['left', 'right', 'right', 'right', 'right', 'right'],
    note: `${count(p.renter_hh)} renter households in all. ${SOURCE_LINES.A}.`,
  });
  // B. Who lives here
  const anyTypes = TYPE_BANDS.some((id) => TYPE_IDS.some((k) => isNum(p.types?.[id]?.[k])));
  out.push({ kind: 'heading', text: 'Who lives here', level: 3 });
  if (anyTypes) {
    out.push({
      kind: 'table',
      columns: ['Renter household type', ...TYPE_BANDS.map((id) => BAND_LABEL[id])],
      rows: TYPE_IDS.map((k) => [TYPE_LABEL[k], ...TYPE_BANDS.map((id) => count(p.types?.[id]?.[k]))]),
      note: `Seniors = householder 62 or older in CHAS; CHAS gives no 80–100% split.${isNum(t.age65_share) ? ` Across the whole tract, ${share(t.age65_share)} of residents are 65 or older.` : ''} ${SOURCE_LINES.B}.`,
    });
  } else out.push({ kind: 'text', text: 'Household types by income band: not available for this tract.' });
  // C. Market
  const m = p.market;
  out.push({ kind: 'heading', text: 'Market rent and home values', level: 3 });
  out.push({
    kind: 'table',
    columns: ['Measure', 'Value'],
    rows: [
      ['2-bedroom asking rent (listings)', isNum(m.asking_2br) ? `${fmtDollars(m.asking_2br)}${isNum(m.asking_n) ? ` · ${fmtHouseholds(m.asking_n)} units` : ''}${m.asking_conf ? ` · ${m.asking_conf} confidence` : ''}` : NA],
      ['Median rent paid (census)', isNum(m.acs_rent) ? `${fmtDollars(m.acs_rent)}${isNum(m.acs_rent_moe) ? ` ±${fmtHouseholds(m.acs_rent_moe)}` : ''}` : NA],
      [`2-bedroom Small Area FMR, ZIP ${m.zip ?? NA} (FY${fy})`, money(m.safmr_2br)],
      ['Median home value (census)', isNum(m.value_acs) ? `${fmtDollars(m.value_acs)}${isNum(m.value_acs_moe) ? ` ±${fmtHouseholds(m.value_acs_moe)}` : ''}` : NA],
      ['Median home value, neighboring tracts', money(m.value_nbr_acs)],
      ['Median sale price since 2023', isNum(m.sale_median) ? `${fmtDollars(m.sale_median)}${isNum(m.sale_n) ? ` · ${fmtHouseholds(m.sale_n)} sales` : ''}` : NA],
      ['Median sale price, neighboring tracts', isNum(m.sale_nbr_median) ? `${fmtDollars(m.sale_nbr_median)}${isNum(m.sale_nbr_n) ? ` · ${fmtHouseholds(m.sale_nbr_n)} sales` : ''}` : NA],
      ['Homes in 2–4 unit buildings', share(p.stock?.units_2_4_share)],
      ['Vacant homes', share(p.stock?.vacancy_share)],
      ['Market type (MVA 2021)', t.mva21 ? `Type ${t.mva21}` : 'Unclassified'],
      ['Watch list (high need, rising market)', t.watch_list ? 'Yes' : 'No'],
    ],
    align: ['left', 'right'],
    note: `Asking rents skew to market-rate listings and are information only. ${SOURCE_LINES.C}.`,
  });
  // D. Transit (+ access when present)
  const x = p.transit;
  const acc = accessOf(p);
  out.push({ kind: 'heading', text: 'Transit and access', level: 3 });
  out.push({
    kind: 'table',
    columns: ['Measure', 'Value'],
    rows: [
      ['Residents within ¼ mile of a frequent stop', share(x?.freq_share_qmi)],
      ['Nearest frequent stop', miles(x?.freq_dist_mi)],
      ['Nearest stop of any kind', miles(x?.any_dist_mi)],
      ['Weekday departures within ¼ mile', count(x?.departures_qmi)],
      ...(acc
        ? ([
            ['Jobs within 1 mile', count(acc.jobs_1mi)],
            ['Services within ½ mile', isNum(acc.services_halfmi) ? acc.services_halfmi.toFixed(1) : NA],
            ['Nearest grocery', miles(acc.grocery_mi)],
            ['Nearest elementary school', miles(acc.elem_mi)],
          ] as [string, string][])
        : []),
    ],
    align: ['left', 'right'],
    note: `Frequent = one bus or T every 15 minutes or better. ${SOURCE_LINES.D}.${acc ? ' Jobs: LODES 2023; services and grocery: OpenStreetMap.' : ''}`,
  });
  // E. Flood
  const f = p.flood;
  const hand = isNum(f?.hand_pct) ? f.hand_pct : isNum(t.flood_share_pct) ? t.flood_share_pct : null;
  out.push({ kind: 'heading', text: 'Flood', level: 3 });
  out.push({
    kind: 'table',
    columns: ['Measure', 'Value'],
    rows: [
      ['Land in a FEMA special flood hazard area', isNum(f?.fema_sfha_pct) ? `${pct(f.fema_sfha_pct)}${f.fema_zone ? ` · zone ${f.fema_zone}` : ''}` : NA],
      ['Terrain screen: low-lying land (HAND)', pct(hand)],
    ],
    align: ['left', 'right'],
    note: `Neither models stormwater; check the site before citing. ${SOURCE_LINES.E}.`,
  });
  // F. Zoning and programs
  const z = p.zoning;
  out.push({ kind: 'heading', text: 'Zoning and programs', level: 3 });
  if (z) {
    const shares = zoningPercents(z.shares).filter(([, v]) => v >= 1);
    out.push({
      kind: 'table',
      columns: ['Zoning district', 'Share of land'],
      rows: shares.length ? shares.map(([k, v]) => [k, `${Math.round(v)}%`]) : [['No district over 1%', NA]],
      align: ['left', 'right'],
    });
    out.push({
      kind: 'table',
      columns: ['Housing type', 'By-right annotation (unverified)'],
      rows: TYPOLOGIES.map((k) => [capitalize(TYPOLOGY_LABEL[k]), STATUS_TEXT[z.by_type?.[k] ?? 'unknown']]),
      note: 'Annotations only, never a gate: confirm in Title 9 of the Pittsburgh Code before relying on them.',
    });
  } else out.push({ kind: 'text', text: 'Zoning: not checked by this tool.' });
  const pr = p.programs;
  out.push({
    kind: 'table',
    columns: ['Program', 'Applies'],
    rows: [
      ['Qualified Census Tract (QCT)', yn(pr?.qct)],
      ['Difficult Development Area (DDA)', yn(pr?.dda)],
      ['Opportunity Zone', yn(pr?.oz)],
      ['CDBG area', yn(pr?.cdbg)],
    ],
    note: `Programs are what the subsidy factor reads; they are not zoning. ${SOURCE_LINES.F}.`,
  });
  // Land use
  const lu = landUseOf(p);
  if (lu) {
    out.push({ kind: 'heading', text: 'Land use', level: 3 });
    out.push({
      kind: 'table',
      columns: ['Land use', 'Share of land', 'Share of parcels'],
      rows: LAND.map(([k, label]) => [label, share(lu[k] as number | null, 1), share(lu.parcel_shares?.[k] ?? null, 1)]),
      note: `${count(lu.parcels)} parcels, ${count(lu.vacant_lots)} vacant lots. ${LAND_SOURCE}.`,
    });
  }
  return out;
}

export function buildPlaceReport(i: PlaceReportInput): Report {
  const { t, place, hud, rec, plan } = i;
  const name = placeName(t);
  const ans = answerRows(i);
  const blocks: ReportBlock[] = [
    { kind: 'callout', text: ans.lead ? `Suggested: ${ans.lead} — ${ans.headline}.` : `No suggestion here under ${STANCE_LABEL[rec.stance]} at ${LEVEL_LABEL[plan.level]}.` },
    { kind: 'heading', text: 'Planning inputs' },
    { kind: 'kv', rows: inputRows(plan) },
    { kind: 'text', text: `${sizeIncomeLine(hud, plan.level, plan.size)}.` },
    { kind: 'heading', text: 'The answer' },
    { kind: 'table', columns: ['', ''], rows: ans.rows, align: ['left', 'left'] },
    { kind: 'heading', text: 'How we got this', level: 3 },
    { kind: 'list', items: ans.details },
  ];
  if (i.map) blocks.push({ kind: 'image', src: i.map, caption: `${name}: map colored by the suggested housing type under ${STANCE_LABEL[plan.focus]} at ${LEVEL_LABEL[plan.level]}.` });
  blocks.push({ kind: 'heading', text: 'Evidence' }, ...evidenceBlocks(t, place, hud));
  blocks.push({ kind: 'heading', text: 'You decide' }, { kind: 'callout', text: DECIDE });
  return {
    title: `Place report: ${name}`,
    subtitle: `${t.name} · Pittsburgh · census tract ${t.GEOID}`,
    blocks,
    sources: [
      `Affordability — ${SOURCE_LINES.A}`,
      `Who lives here — ${SOURCE_LINES.B}`,
      `Market — ${SOURCE_LINES.C}`,
      `Transit — ${SOURCE_LINES.D}`,
      `Flood — ${SOURCE_LINES.E}`,
      `Zoning and programs — ${SOURCE_LINES.F}`,
      `Land use — ${LAND_SOURCE}`,
      `Suggestion — ${SOURCE_LINES.G}`,
    ],
    filename: i.filename,
  };
}

// ------------------------------------------------------------------ CSV: one row per measure
export interface MeasureRow {
  geoid: string;
  place: string;
  section: string;
  measure: string;
  value: number | string | null;
  unit: string;
  moe: number | null;
  source: string;
}

export const MEASURE_COLUMNS: CsvColumn[] = [
  { key: 'geoid', label: 'geoid' },
  { key: 'place', label: 'place' },
  { key: 'section', label: 'section' },
  { key: 'measure', label: 'measure' },
  { key: 'value', label: 'value' },
  { key: 'unit', label: 'unit' },
  { key: 'moe', label: 'margin_of_error' },
  { key: 'source', label: 'source' },
];

const r100 = (v: number | null | undefined, d = 1) => (isNum(v) ? Math.round(v * 100 * 10 ** d) / 10 ** d : null);

export function placeMeasureRows(t: PlaceTract, p: PlaceMeasures, hud: HudTable | null): MeasureRow[] {
  const out: MeasureRow[] = [];
  const base = { geoid: t.GEOID, place: placeName(t) };
  const add = (section: string, measure: string, value: number | string | null | undefined, unit: string, source: string, moe: number | null = null) =>
    out.push({ ...base, section, measure, value: value ?? null, unit, moe: isNum(moe) ? moe : null, source });
  const A = 'HUD CHAS 2018–22 Table 8';
  add('Affordability', 'Renter households', p.renter_hh, 'households', A);
  for (const id of BANDS) {
    const b = p.bands?.[id];
    add('Affordability', `Renter households ${BAND_LABEL[id]}`, b?.hh, 'households', A, b?.moe ?? null);
    add('Affordability', `Renter households ${BAND_LABEL[id]} paying over 30% of income`, b?.burden30, 'households', A);
    add('Affordability', `Renter households ${BAND_LABEL[id]} paying over 50% of income`, b?.burden50, 'households', A);
  }
  if (hud) for (const id of BANDS) {
    add('HUD income limits', `4-person income limit, ${BAND_LABEL[id]}${id === 'gt100' ? ' (area median)' : ''}`, id === 'gt100' ? hud.metro?.median : bandLimit4p(hud, id), 'USD/year', `HUD FY${hud.metro?.fy ?? 2026} income limits, Pittsburgh HMFA`);
  }
  for (const id of TYPE_BANDS) for (const k of TYPE_IDS) add('Who lives here', `${TYPE_LABEL[k]}, ${BAND_LABEL[id]}`, p.types?.[id]?.[k], 'renter households', 'HUD CHAS 2018–22 household type × income band');
  add('Who lives here', 'Residents 65 or older', r100(t.age65_share), '%', 'ACS 2020–24 B01001');
  const m = p.market;
  const C = 'Dewey listings 2025–26';
  add('Market', '2-bedroom asking rent', m.asking_2br, 'USD/month', C);
  add('Market', '2-bedroom asking rent: units listed', m.asking_n, 'units', C);
  add('Market', '2-bedroom asking rent: confidence', m.asking_conf, 'text', C);
  add('Market', 'Median gross rent (census)', m.acs_rent, 'USD/month', 'ACS 2020–24 B25064', m.acs_rent_moe);
  add('Market', `2-bedroom Small Area FMR (ZIP ${m.zip ?? '—'})`, m.safmr_2br, 'USD/month', `HUD FY${hud?.metro?.fy ?? 2026} SAFMR`);
  add('Market', 'Median home value (census)', m.value_acs, 'USD', 'ACS 2020–24 B25077', m.value_acs_moe);
  add('Market', 'Median home value, neighboring tracts', m.value_nbr_acs, 'USD', 'ACS 2020–24 B25077');
  add('Market', 'Median sale price since 2023', m.sale_median, 'USD', 'Allegheny County sales since 2023');
  add('Market', 'Sales since 2023', m.sale_n, 'sales', 'Allegheny County sales since 2023');
  add('Market', 'Median sale price since 2023, neighboring tracts', m.sale_nbr_median, 'USD', 'Allegheny County sales since 2023');
  add('Market', 'Market type', t.mva21 ?? null, 'text', 'Reinvestment Fund MVA 2021');
  add('Market', 'On the watch list (high need, rising market)', t.watch_list == null ? null : t.watch_list ? 'yes' : 'no', 'yes/no', 'VisionPitts watch list (need and market direction)');
  const S = 'ACS 2020–24 B25024 / B25002';
  add('Housing stock', 'Single-family detached homes', r100(p.stock?.sfd_share), '%', S);
  add('Housing stock', 'Homes in 2–4 unit buildings', r100(p.stock?.units_2_4_share), '%', S);
  add('Housing stock', 'Homes in 5–19 unit buildings', r100(p.stock?.units_5_19_share), '%', S);
  add('Housing stock', 'Homes in 20+ unit buildings', r100(p.stock?.units_20plus_share), '%', S);
  add('Housing stock', 'Vacant homes', r100(p.stock?.vacancy_share), '%', S);
  add('Housing stock', 'Parcels with 2–4 units', p.stock?.parcels_2_4, 'parcels', 'Allegheny County property assessments');
  add('Housing stock', 'Vacant parcels', p.stock?.vacant_parcels, 'parcels', 'Allegheny County property assessments');
  const D = 'PRT GTFS June 2026 · 2020 census blocks';
  add('Transit', 'Residents within ¼ mile of a frequent stop', r100(p.transit?.freq_share_qmi), '%', D);
  add('Transit', 'Nearest frequent stop', p.transit?.freq_dist_mi, 'miles', D);
  add('Transit', 'Nearest stop of any kind', p.transit?.any_dist_mi, 'miles', D);
  add('Transit', 'Weekday departures within ¼ mile', p.transit?.departures_qmi, 'departures', D);
  const acc = accessOf(p);
  if (acc) {
    add('Access', 'Jobs within 1 mile', acc.jobs_1mi, 'jobs', 'LODES 2023');
    add('Access', 'Services within ½ mile', acc.services_halfmi, 'places', 'OpenStreetMap');
    add('Access', 'Nearest grocery', acc.grocery_mi, 'miles', 'OpenStreetMap');
    add('Access', 'Nearest school', acc.school_mi, 'miles', 'OpenStreetMap');
    add('Access', 'Nearest elementary school', acc.elem_mi, 'miles', 'OpenStreetMap');
  }
  add('Flood', 'Land in a FEMA special flood hazard area', p.flood?.fema_sfha_pct, '%', 'FEMA NFHL');
  add('Flood', 'FEMA flood zone', p.flood?.fema_zone, 'text', 'FEMA NFHL');
  add('Flood', 'Terrain screen: low-lying land (HAND)', isNum(p.flood?.hand_pct) ? p.flood.hand_pct : t.flood_share_pct ?? null, '%', 'HAND on USGS 3DEP');
  if (p.zoning) {
    for (const [k, v] of zoningPercents(p.zoning.shares)) add('Zoning', `Land in zoning district ${k}`, Math.round(v * 10) / 10, '%', 'WPRDC zoning districts');
    for (const k of TYPOLOGIES) add('Zoning', `${capitalize(TYPOLOGY_LABEL[k])}: by-right annotation (unverified)`, STATUS_TEXT[p.zoning.by_type?.[k] ?? 'unknown'].toLowerCase(), 'text', 'Reading of Title 9, unverified');
  }
  add('Programs', 'Qualified Census Tract', p.programs?.qct == null ? null : p.programs.qct ? 'yes' : 'no', 'yes/no', 'HUD QCT 2026');
  add('Programs', 'Difficult Development Area', p.programs?.dda == null ? null : p.programs.dda ? 'yes' : 'no', 'yes/no', 'HUD DDA 2026');
  add('Programs', 'Opportunity Zone', p.programs?.oz == null ? null : p.programs.oz ? 'yes' : 'no', 'yes/no', 'U.S. Treasury Opportunity Zones');
  add('Programs', 'CDBG area', p.programs?.cdbg == null ? null : p.programs.cdbg ? 'yes' : 'no', 'yes/no', 'City of Pittsburgh CDBG areas 2018');
  const lu = landUseOf(p);
  if (lu) {
    for (const [k, label] of LAND) {
      add('Land use', `${label} land`, r100(lu[k] as number | null), '% of land', LAND_SOURCE);
      add('Land use', `${label} parcels`, r100(lu.parcel_shares?.[k] ?? null), '% of parcels', LAND_SOURCE);
    }
    add('Land use', 'Vacant lots', lu.vacant_lots, 'parcels', LAND_SOURCE);
    add('Land use', 'Parcels', lu.parcels, 'parcels', LAND_SOURCE);
  }
  return out;
}

