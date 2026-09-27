// Pure builders for the Equity & policy tab: the one-line lever summaries (card headers, chat facts, exports), the
// two CSV tables, the printable report and the facts handed to the question box. Same data as the screen, no scores.
import type { CsvColumn } from '../export/csv';
import type { Report, ReportBlock } from '../export/report';
import type { HudTable } from '../place/types';
import { MEASURES, measureValue, type AmiPct, type MeasureDef, type MeasureId } from './measures';
import { BONUS_AFFORDABLE_SHARE, type AduResult, type GapCost, type Row } from './policy';
import { RESIDENTIAL_FAMILIES, SMALL_APT_CONDITIONAL_FAMILIES } from './zoning';

export type LeverId = 'adu' | 'bonus' | 'voucher' | 'transit';
export const LEVER_IDS: LeverId[] = ['adu', 'bonus', 'voucher', 'transit'];
export const LEVER_NAME: Record<LeverId, string> = {
  adu: 'ADU by right',
  bonus: 'Density bonus',
  voucher: 'Rent-gap subsidy',
  transit: 'Transit extension',
};

interface Flip {
  before: string[];
  after: string[];
  changed: string[];
}
export interface PolicyResults {
  /** Ranked tracts the levers run over. */
  n: number;
  adu: AduResult;
  bonus: Flip;
  gaps: { top: GapCost[]; total: number; withGap: number };
  transit: Flip;
  /** Subsidy inputs. */
  homes: number;
  ami: AmiPct;
  /** The 2-bedroom rent that fits at `ami`, $/month. */
  fits: number | null;
  /** Place-tab transit distance, printed ("½ mile"). */
  transitLabel: string;
}

export interface LeverSummary {
  id: LeverId;
  name: string;
  on: boolean;
  rule: string;
  /** What is counted before → after. */
  measure: string;
  before: string;
  after: string;
  /** Short result for a card header: "0 → 107 tracts". */
  headline: string;
  /** Tracts the lever changes (outlined on the map when on). */
  changed: string[];
}

const $ = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

export function leverSummaries(r: PolicyResults, on: Record<LeverId, boolean>): LeverSummary[] {
  const pct = Math.round(BONUS_AFFORDABLE_SHARE * 100);
  return [
    {
      id: 'adu',
      name: LEVER_NAME.adu,
      on: on.adu,
      rule: `In ${RESIDENTIAL_FAMILIES.join(', ')} districts: ADU conditional use → by right. A tract counts when ≥ 5% of its land is in a by-right district.`,
      measure: 'Tracts where an ADU is by right',
      before: String(r.adu.before.length),
      after: String(r.adu.after.length),
      headline: `${r.adu.before.length} → ${plural(r.adu.after.length, 'tract')}`,
      changed: r.adu.changed,
    },
    {
      id: 'bonus',
      name: LEVER_NAME.bonus,
      on: on.bonus,
      rule: `In ${SMALL_APT_CONDITIONAL_FAMILIES.join(', ')} districts: small apartment conditional → by right when ≥ ${pct}% of homes rent at or below the 60% AMI 2-bedroom rent.`,
      measure: 'Tracts where a small apartment is by right',
      before: String(r.bonus.before.length),
      after: String(r.bonus.after.length),
      headline: `${r.bonus.before.length} → ${plural(r.bonus.after.length, 'tract')}`,
      changed: r.bonus.changed,
    },
    {
      id: 'voucher',
      name: LEVER_NAME.voucher,
      on: on.voucher,
      rule: `yearly cost = max(0, asking − fits) × 12 × ${r.homes} homes, in the ${r.gaps.top.length} largest-gap tracts; fits = 2-bedroom rent at ${r.ami}% AMI = ${r.fits == null ? 'not available' : $(r.fits)}.`,
      measure: `Yearly subsidy, ${r.homes} homes in each of the ${r.gaps.top.length} largest-gap tracts`,
      before: '$0',
      after: $(r.gaps.total),
      headline: `$0 → ${compactDollars(r.gaps.total)} a year`,
      changed: r.gaps.top.map((g) => g.id),
    },
    {
      id: 'transit',
      name: LEVER_NAME.transit,
      on: on.transit,
      rule: `Transit-first passes when the average resident lives within D of a stop with ≥ 64 weekday departures. D: ${r.transitLabel} → 1 mile.`,
      measure: 'Tracts that pass the Transit-first test',
      before: String(r.transit.before.length),
      after: String(r.transit.after.length),
      headline: `${r.transit.before.length} → ${plural(r.transit.after.length, 'tract')} pass`,
      changed: r.transit.changed,
    },
  ];
}

/** $1,234,567 → "$1.23M", $45,600 → "$45.6K"; under $1,000 as is. */
export function compactDollars(v: number): string {
  const a = Math.abs(v);
  const s = v < 0 ? '−' : '';
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(a >= 1e8 ? 0 : 2)}M`;
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(a >= 1e5 ? 0 : 1)}K`;
  return `${s}$${Math.round(a)}`;
}

/** Unique names in order, the first `n`, then "and N more". */
export function listNames(ids: string[], nameOf: (id: string) => string, n = Infinity): string {
  const names = [...new Set(ids.map(nameOf))];
  if (!names.length) return 'none';
  return names.length <= n ? names.join(', ') : `${names.slice(0, n).join(', ')} and ${names.length - n} more`;
}

// ---------------------------------------------------------------- CSV
export interface TractInfo {
  geoid: string;
  neighborhood: string;
  tract: string;
}

const round = (v: number | null, d: number) => (v == null ? null : Math.round(v * 10 ** d) / 10 ** d);
const DECIMALS: Record<MeasureId, number> = { rent_gap: 0, burdened: 0, jobs: 0, school: 2, transit: 2, services: 1 };

export function measureColumns(ami: AmiPct, levers: LeverSummary[]): CsvColumn[] {
  return [
    { key: 'geoid', label: 'GEOID' },
    { key: 'neighborhood', label: 'Neighborhood' },
    { key: 'tract', label: 'Tract' },
    { key: 'rent_gap', label: `Rent gap at ${ami}% AMI ($ per month)` },
    { key: 'burdened', label: 'Burdened renters at or below 50% AMI (households)' },
    { key: 'jobs', label: 'Jobs within 1 mile' },
    { key: 'school', label: 'Miles to a public school' },
    { key: 'transit', label: 'Miles to frequent transit' },
    { key: 'services', label: 'Services within ½ mile' },
    ...levers.filter((l) => l.on).map((l) => ({ key: `lever_${l.id}`, label: `Changed by ${l.name}` })),
  ];
}

export function measureRows(rows: Row[], info: (id: string) => TractInfo, hud: HudTable | null, ami: AmiPct, levers: LeverSummary[]): Record<string, unknown>[] {
  const active = levers.filter((l) => l.on).map((l) => ({ id: l.id, set: new Set(l.changed) }));
  return rows.map(({ id, p }) => {
    const out: Record<string, unknown> = { ...info(id) };
    for (const m of MEASURES) out[m.id] = round(measureValue(m.id, p, hud, ami), DECIMALS[m.id]);
    for (const a of active) out[`lever_${a.id}`] = a.set.has(id) ? 'yes' : 'no';
    return out;
  });
}

export const POLICY_COLUMNS: CsvColumn[] = [
  { key: 'name', label: 'Lever' },
  { key: 'status', label: 'Switched on' },
  { key: 'rule', label: 'Rule' },
  { key: 'measure', label: 'What is counted' },
  { key: 'before', label: 'Before' },
  { key: 'after', label: 'After' },
  { key: 'affected', label: 'Tracts affected' },
  { key: 'neighborhoods', label: 'Neighborhoods affected' },
];

export function policyRows(levers: LeverSummary[], nameOf: (id: string) => string): Record<string, unknown>[] {
  return levers.map((l) => ({
    name: l.name,
    status: l.on ? 'yes' : 'no',
    rule: l.rule,
    measure: l.measure,
    before: l.before,
    after: l.after,
    affected: l.changed.length,
    neighborhoods: listNames(l.changed, nameOf),
  }));
}

// ---------------------------------------------------------------- report
export interface RankedValue {
  id: string;
  value: number | null;
}

export interface EquityReportInput {
  ami: AmiPct;
  /** True when the Place tab is on market rate and this tab reads it as 80%. */
  marketAs80: boolean;
  def: MeasureDef;
  median: number | null;
  available: number;
  n: number;
  ranked: RankedValue[];
  levers: LeverSummary[];
  info: (id: string) => TractInfo;
  map?: string | null;
  footer?: string;
  filename?: string;
}

export const LEAVE_OUT = [
  'Zoning changes say where a type becomes legal, not whether anyone builds it; the counts are tracts, not homes.',
  'The zoning table behind levers 1 and 2 is an unverified reading of Title 9 (config/zoning_rules.json).',
  'The subsidy uses today’s asking rents from listings with high or medium confidence; tracts without one are left out, not guessed.',
  'Distances are straight lines from 2020 census block points, averaged over residents, not walking routes.',
];

export function buildEquityReport(x: EquityReportInput): Report {
  const nameOf = (id: string) => x.info(id).neighborhood;
  const top = x.ranked.filter((r) => r.value != null).slice(0, 20);
  const blocks: ReportBlock[] = [
    {
      kind: 'kv',
      rows: [
        ['Income level', `${x.ami}% of area median income${x.marketAs80 ? ' (the Place tab is on market rate, read here as 80%)' : ''}`],
        ['Measure', x.def.title],
        ['Units', x.def.unit],
        ['City median', x.def.fmt(x.median)],
        ['Tracts with a value', `${x.available} of ${x.n}`],
      ],
    },
    { kind: 'text', text: x.def.definition(x.ami) },
  ];
  if (x.map) blocks.push({ kind: 'image', src: x.map, caption: `${x.def.title} by census tract; darker = more need. Tracts changed by the levers switched on are outlined.` });
  blocks.push(
    { kind: 'heading', text: `Most need first: top ${top.length} of ${x.available}` },
    {
      kind: 'table',
      columns: ['#', 'Neighborhood', 'Tract', x.def.short],
      align: ['right', 'left', 'left', 'right'],
      rows: top.map((r, i) => [i + 1, nameOf(r.id), x.info(r.id).tract, x.def.fmt(r.value)]),
      note: x.def.higherIsNeed ? 'Highest value first.' : 'Lowest value first.',
    },
    { kind: 'heading', text: 'Policy simulator' },
  );
  x.levers.forEach((l, i) => {
    blocks.push(
      { kind: 'heading', text: `${i + 1} · ${l.name} (${l.on ? 'switched on' : 'off'})` },
      { kind: 'text', text: `Rule: ${l.rule}` },
      {
        kind: 'kv',
        rows: [
          [l.measure, `${l.before} → ${l.after}`],
          ['Tracts affected', String(l.changed.length)],
          ['Neighborhoods', listNames(l.changed, nameOf)],
        ],
      },
    );
  });
  blocks.push({ kind: 'callout', text: `What these levers leave out: ${LEAVE_OUT.join(' ')}` });
  return {
    title: 'Equity & policy',
    subtitle: `${x.def.title} · ${x.ami}% AMI · ${x.n} city tracts with at least 25 households`,
    blocks,
    sources: [...new Set(MEASURES.map((m) => `${m.title}: ${m.source}`))].concat('Zoning: City of Pittsburgh zoning districts with an unverified reading of Title 9 by-right rules'),
    footer: x.footer,
    filename: x.filename,
  };
}

// ---------------------------------------------------------------- question box
export interface EquityFactsInput {
  ami: AmiPct;
  def: MeasureDef;
  median: number | null;
  available: number;
  n: number;
  ranked: RankedValue[];
  levers: LeverSummary[];
  nameOf: (id: string) => string;
  tractOf: (id: string) => string;
  /** The selected tract's six values beside the city medians. */
  selected?: { id: string; values: { def: MeasureDef; value: number | null; median: number | null }[] } | null;
}

/** Plain lines appended to the question box's facts, so answers can cite this tab's numbers (and are checked against them). */
export function equityFacts(x: EquityFactsInput): string {
  const out = ['EQUITY & POLICY TAB (computed by this tool from the tract data)'];
  out.push(`Income level: ${x.ami}% of area median income. Measure on the map: ${x.def.title} (${x.def.unit}). ${x.def.definition(x.ami)}`);
  out.push(`City median over the ${x.n} ranked city tracts: ${x.def.fmt(x.median)}; ${x.available} of ${x.n} tracts have a value.`);
  const top = x.ranked.filter((r) => r.value != null).slice(0, 10);
  out.push(`Most need first (${x.def.higherIsNeed ? 'highest' : 'lowest'} value first), top ${top.length}:`);
  top.forEach((r, i) => out.push(`${i + 1}. ${x.nameOf(r.id)} (${x.tractOf(r.id)}): ${x.def.fmt(r.value)}`));
  if (x.selected) {
    out.push(`Selected tract ${x.nameOf(x.selected.id)} (${x.tractOf(x.selected.id)}), value here vs city median:`);
    for (const v of x.selected.values) out.push(`- ${v.def.title}: ${v.def.fmt(v.value)} here; city median ${v.def.fmt(v.median)}`);
  }
  out.push('POLICY SIMULATOR (four written rules; before → after from the same tract data)');
  for (const l of x.levers) {
    out.push(`- ${l.name} (${l.on ? 'switched on' : 'off'}): ${l.measure}: ${l.before} → ${l.after}; ${l.changed.length} tracts affected: ${listNames(l.changed, x.nameOf, 12)}. Rule: ${l.rule}`);
  }
  return out.join('\n');
}

/** Three questions that fit the current measure, the selected tract and the levers switched on. */
export function equityPrompts(def: MeasureDef, ami: AmiPct, levers: LeverSummary[], selectedName: string | null): string[] {
  const first: Record<MeasureId, string> = {
    rent_gap: `Which neighborhoods have the largest rent gap at ${ami}% AMI?`,
    burdened: 'Which neighborhoods have the most cost-burdened renters?',
    jobs: 'Which neighborhoods have the fewest jobs within a mile?',
    school: 'Which neighborhoods are farthest from a public school?',
    transit: 'Which neighborhoods are farthest from frequent transit?',
    services: 'Which neighborhoods have the fewest services within half a mile?',
  };
  // A Pittsburgh question beyond the table, for the box to look up.
  const topic: Record<MeasureId, string> = {
    rent_gap: 'What Pittsburgh programs help renters close a rent gap?',
    burdened: 'What help exists in Pittsburgh for cost-burdened renters?',
    jobs: "Where are Pittsburgh's largest job centers?",
    school: 'How are public schools spread across Pittsburgh?',
    transit: 'Which Pittsburgh bus routes run about every 15 minutes?',
    services: 'Which Pittsburgh neighborhoods lack a grocery store?',
  };
  const lever: Record<LeverId, string> = {
    adu: 'What changes if ADUs are allowed by right?',
    bonus: 'What does the density bonus change?',
    voucher: 'What would the rent-gap subsidy cost, and where?',
    transit: 'What does the transit extension change?',
  };
  const on = levers.find((l) => l.on);
  const second = selectedName ? `How does ${selectedName} compare with the city on ${def.short.toLowerCase()}?` : topic[def.id];
  const third = on ? lever[on.id] : selectedName ? topic[def.id] : 'Which lever reaches the most tracts?';
  return [first[def.id], second, third];
}
