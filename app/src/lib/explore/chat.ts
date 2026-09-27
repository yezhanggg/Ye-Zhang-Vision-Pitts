// The Explore assistant: what it is told, what it suggests, and the conversation.
//
// The model behind /api/chat only rephrases. Everything it is told is a value the tool already shows: census
// estimates for the selected place and the places around it, the city and the county, the matchmaker's read on a
// city tract, and area aggregates of asking rents. The text is built here, in the browser; the endpoint checks that
// every number in the answer can be found in it.
import { create } from 'zustand';
import { FMR_2BR, scoring, tractById } from '../data';
import { allResults, tLabel } from '../derived';
import { pctShort, directionWord, factorName } from '../copy';
import { fmtSignedPct, ordinalSuffix } from '../format';
import { boundsOf, type GeoGeometry } from '../geo';
import { matchPreset, type Level } from '../store';
import type { Weights } from '../types';
import { fmtAnalysis, isAnalysis } from './analysisVars';
import { fmtValue } from './bins';
import { CITY_GEOID, COUNTY_GEOID, LEVEL_LABEL, bundledValues, plainDescription, rentAreaFor, unitSubtitle, unitTitle, variableById } from './catalog';
import { loadValues, remoteEnabled } from './remote';
import { rankOf, topBottom } from './summary';
import type { UnitFC, UnitProps, ValueMap, VariableDef } from './types';

/** Figures listed for every nearby place. */
export const NEAR_VARS = ['pop', 'med_hh_income', 'med_gross_rent', 'med_home_value', 'renter_share', 'rent_burden30_share', 'poverty_share', 'vacancy_share'];
/** Figures listed for the selected place, the city and the county. */
export const PLACE_VARS = [...NEAR_VARS, 'households', 'median_age', 'median_year_built', 'sfd_share', 'units_2_4_share', 'units_5_19_share', 'units_20plus_share', 'bachelors_share', 'unemployment_rate', 'transit_share', 'no_vehicle_share', 'white_nh_share', 'black_nh_share', 'asian_nh_share', 'hispanic_share'];
export const RADIUS_MILES = 3;
/** Eight nearby places are enough to compare with, and every one of them is paid for in tokens. */
const NEAR_CAP = 8;
const NEAR_FLOOR = 5;
/** Nearby places with fewer residents than this (parks, campuses, river land) are left out of a comparison. */
export const MIN_POP = 50;

// ------------------------------------------------------------------ geometry
type LngLat = [number, number];
/** Middle of a shape's bounding box: close enough to say which places lie around another. */
export function centerOf(geometry: GeoGeometry | null | undefined): LngLat {
  const [[w, s], [e, n]] = boundsOf(geometry);
  return [(w + e) / 2, (s + n) / 2];
}
export function milesBetween(a: LngLat, b: LngLat): number {
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad, dLng = (b[0] - a[0]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface Near {
  geoid: string;
  miles: number;
}
/**
 * The places whose centre lies within `radius` miles of the selected one, nearest first, at most `cap`. Large
 * shapes (townships) can have no centre that close; then the `floor` nearest are returned and `widened` says so.
 */
export function nearby(fc: UnitFC, geoid: string, radius = RADIUS_MILES, cap = NEAR_CAP, floor = NEAR_FLOOR): { rows: Near[]; widened: boolean } {
  const me = fc.features.find((f) => f.properties.GEOID === geoid);
  if (!me) return { rows: [], widened: false };
  const c = centerOf(me.geometry);
  const all = fc.features.filter((f) => f.properties.GEOID !== geoid).map((f) => ({ geoid: f.properties.GEOID, miles: milesBetween(c, centerOf(f.geometry)) })).sort((a, b) => a.miles - b.miles);
  const inside = all.filter((r) => r.miles <= radius);
  if (inside.length >= Math.min(3, all.length)) return { rows: inside.slice(0, cap), widened: false };
  return { rows: all.slice(0, floor), widened: true };
}

// ------------------------------------------------------------------ text
export interface PlaceFacts {
  name: string;
  miles?: number;
  values: Record<string, number | null | undefined>;
}
export interface FactsData {
  level: Level;
  cityOnly: boolean;
  selected: PlaceFacts | null;
  /** Lines about the selected place that are not census values (the matchmaker, asking rents). */
  extra: string[];
  near: PlaceFacts[];
  widened: boolean;
  city: Record<string, number | null | undefined>;
  county: Record<string, number | null | undefined>;
  variable: { label: string; description: string; own: string | null; rank: string | null; top: string[]; bottom: string[] } | null;
}

const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
function figure(id: string, v: number | null | undefined): string | null {
  const def = variableById.get(id);
  return def && fin(v) ? `${def.label} ${fmtValue(v, def.unit)}` : null;
}
const figures = (ids: string[], values: PlaceFacts['values']) => ids.map((id) => figure(id, values[id])).filter((s): s is string => !!s);
function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

/** The facts text. Pure: the same data always gives the same text. */
export function composeFacts(d: FactsData): string {
  const { one, many } = LEVEL_LABEL[d.level];
  const out: string[] = [];
  out.push('ABOUT THE MAP');
  out.push(`The map shows ${many} ${d.cityOnly ? 'in the City of Pittsburgh' : 'across Allegheny County, Pennsylvania'}. Census figures are American Community Survey 2020–2024 5-year estimates.`);

  if (d.selected) {
    out.push('', 'SELECTED PLACE', `${d.selected.name}, a ${one.toLowerCase()}`);
    for (const f of figures(PLACE_VARS, d.selected.values)) out.push(`- ${f}`);
    for (const line of d.extra) out.push(`- ${line}`);
    if (d.near.length) {
      out.push('', d.widened ? `NEARBY PLACES (no ${one.toLowerCase()} has its centre within ${RADIUS_MILES} miles of the selected place's centre, so these are the ${d.near.length} nearest, nearest first)` : `NEARBY PLACES (the ${d.near.length} nearest ${many} whose centre lies within ${RADIUS_MILES} miles of the selected place's centre, nearest first)`);
      d.near.forEach((p, i) => out.push(`${i + 1}. ${p.name}, ${(p.miles ?? 0).toFixed(1)} miles: ${figures(NEAR_VARS, p.values).join('; ') || 'no figures'}`));
      out.push('', `HOW THE SELECTED PLACE RANKS AMONG THESE ${d.near.length + 1} PLACES (itself and the nearby ones; 1st = highest)`);
      for (const id of NEAR_VARS) {
        const def = variableById.get(id);
        const own = d.selected.values[id];
        if (!def || !fin(own)) continue;
        const others = d.near.map((p) => p.values[id]).filter(fin);
        const r = rankOf(own, [own, ...others]);
        const mid = median(others);
        if (!r || mid == null) continue;
        out.push(`- ${def.label}: ${fmtValue(own, def.unit)} here, ${ordinalSuffix(r.rank)} of ${r.n}; the middle value of the nearby places is ${fmtValue(mid, def.unit)}`);
      }
    }
  } else {
    out.push('', 'SELECTED PLACE', 'None. Nothing is selected on the map, so only the city and county figures below are available.');
  }

  out.push('', 'CITY AND COUNTY');
  out.push(`City of Pittsburgh: ${figures(d.selected ? NEAR_VARS : PLACE_VARS, d.city).join('; ')}`);
  out.push(`Allegheny County: ${figures(d.selected ? NEAR_VARS : PLACE_VARS, d.county).join('; ')}`);

  if (d.variable) {
    out.push('', 'VARIABLE PAINTED ON THE MAP', `${d.variable.label}: ${d.variable.description}`);
    if (d.variable.own) out.push(`Selected place: ${d.variable.own}${d.variable.rank ? `, ${d.variable.rank}` : ''}`);
    if (d.variable.top.length) out.push(`Highest ${many}: ${d.variable.top.join('; ')}`);
    if (d.variable.bottom.length) out.push(`Lowest ${many}: ${d.variable.bottom.join('; ')}`);
  }
  return out.join('\n');
}

// ------------------------------------------------------------------ loading
export interface ChatScope {
  level: Level;
  cityOnly: boolean;
  fc: UnitFC;
  selected: string | null;
  variable: VariableDef | null;
  values: ValueMap | null;
  weights: Weights;
}

export const placeName = (p: UnitProps | null | undefined, fallback = '') => {
  if (!p) return fallback;
  const sub = unitSubtitle(p);
  return sub ? `${unitTitle(p)} (${sub})` : unitTitle(p);
};

/** Census values of the listed places: the bundle first, the county-wide table for places outside it. */
async function records(level: Level, geoids: string[], vars: string[]): Promise<Map<string, Record<string, number | null>>> {
  const all = bundledValues(level);
  const missing = geoids.some((g) => !all[g]);
  const remote: (ValueMap | null)[] = missing && remoteEnabled() ? await Promise.all(vars.map((v) => loadValues(level, v))) : [];
  const out = new Map<string, Record<string, number | null>>();
  for (const g of geoids) {
    const rec: Record<string, number | null> = {};
    vars.forEach((v, i) => {
      rec[v] = all[g]?.[v]?.[0] ?? remote[i]?.get(g)?.est ?? null;
    });
    out.set(g, rec);
  }
  return out;
}
const referenceRecord = (level: 'city' | 'county', geoid: string) => Object.fromEntries(PLACE_VARS.map((v) => [v, bundledValues(level)[geoid]?.[v]?.[0] ?? null]));

const isTiny = (pop: number | null | undefined) => fin(pop) && pop < MIN_POP;

/** What the matchmaker and the rent listings say about the selected place. */
function extraLines(level: Level, geoid: string, weights: Weights): string[] {
  const out: string[] = [];
  const t = level === 'tract' ? tractById.get(geoid) : undefined;
  if (t) {
    const r = allResults(weights).get(geoid);
    const preset = scoring.presets.find((p) => p.id === matchPreset(weights))?.label ?? 'a custom mix';
    if (t.residential && r?.top) out.push(`best-matching housing type under the current priorities (${preset}): ${tLabel(r.top)}, match score ${Math.round((r.topScore ?? 0) * 100)} out of 100${r.ranking[1] ? `; next is ${tLabel(r.ranking[1])}` : ''}`);
    else out.push('not ranked by the matchmaker: fewer than 25 households live here');
    for (const f of scoring.factors) {
      const v = t[f.id];
      if (fin(v)) out.push(`${lowerFirst(factorName(f.id, f.label))}: ${pctShort(v)} of city tracts`);
    }
    out.push(`housing market: ${t.mva21 ? `type ${t.mva21}` : 'unclassified'} (Reinvestment Fund, 2021), ${directionWord(t.market_direction)} since 2016`);
    out.push(t.watch_list ? 'on the watch list: high need with a rising market' : 'not on the watch list');
  }
  const rent = rentAreaFor(level, geoid);
  if (rent && fin(rent.level)) {
    out.push(`median asking rent for a 2-bedroom, 2025–26: ${fmtValue(rent.level, 'usd')} from ${rent.n} listed units (licensed listings, market-rate lean, information only); the HUD fair market rent is ${fmtValue(FMR_2BR, 'usd')}${fin(rent.growth_existing) ? `; asking rents in buildings listed before 2019 changed ${fmtSignedPct(rent.growth_existing)} since 2019–20` : ''}`);
  }
  return out;
}

export async function buildFacts(s: ChatScope): Promise<string> {
  const props = new Map(s.fc.features.map((f) => [f.properties.GEOID, f.properties]));
  const found = s.selected ? nearby(s.fc, s.selected) : { rows: [], widened: false };
  const ids = s.selected ? [s.selected, ...found.rows.map((r) => r.geoid)] : [];
  const recs = ids.length ? await records(s.level, ids, PLACE_VARS) : new Map<string, Record<string, number | null>>();
  const near = { ...found, rows: found.rows.filter((r) => !isTiny(recs.get(r.geoid)?.pop)) };
  let variable: FactsData['variable'] = null;
  if (s.variable && s.values) {
    const v = s.variable;
    const fmt = (x: number) => (isAnalysis(v) ? fmtAnalysis(v, x) : fmtValue(x, v.unit));
    const label = ([id, x]: [string, number]) => `${placeName(props.get(id), id)} ${fmt(x)}`;
    // Category layers (which type wins, the watch list) have no highest and lowest.
    const ordered = !isAnalysis(v) || v.paint.kind !== 'cat';
    const tb = ordered ? topBottom(s.values, 5) : { top: [], bottom: [] };
    const own = s.selected ? s.values.get(s.selected)?.est : null;
    const r = ordered && fin(own) ? rankOf(own, [...s.values.values()].map((e) => e.est)) : null;
    variable = { label: v.label, description: plainDescription(v), own: fin(own) ? fmt(own) : null, rank: r ? `${ordinalSuffix(r.rank)} of ${r.n} ${LEVEL_LABEL[s.level].many} (1st = highest)` : null, top: tb.top.map(label), bottom: tb.bottom.map(label) };
  }
  return composeFacts({
    level: s.level,
    cityOnly: s.cityOnly,
    selected: s.selected ? { name: placeName(props.get(s.selected), s.selected), values: recs.get(s.selected) ?? {} } : null,
    extra: s.selected ? extraLines(s.level, s.selected, s.weights) : [],
    near: near.rows.map((r) => ({ name: placeName(props.get(r.geoid), r.geoid), miles: r.miles, values: recs.get(r.geoid) ?? {} })),
    widened: near.widened,
    city: referenceRecord('city', CITY_GEOID),
    county: referenceRecord('county', COUNTY_GEOID),
    variable,
  });
}

/** Light prompts offered beside the input once a place is selected. */
export function suggestions(name: string | null, variable: VariableDef | null, level: Level): string[] {
  if (!name) return [];
  const out = [`Describe the neighborhoods around ${name}`, `Compare ${name} with places within ${RADIUS_MILES} miles`];
  if (variable) out.unshift(`How does ${lowerFirst(variable.label)} in ${name} compare with nearby ${LEVEL_LABEL[level].many}?`);
  return out;
}

// ------------------------------------------------------------------ conversation
export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  /** When the question was sent (ms since epoch); the thinking animation runs from here. */
  at: number;
  pending?: boolean;
  /** The service answered but some figure could not be traced to the facts. */
  unchecked?: boolean;
  /** Who wrote the answer ("DeepSeek", "Claude"). */
  provider?: string;
  /** No answer: offline file, service down. Left out of the history sent back. */
  failed?: boolean;
}
interface ChatState {
  messages: ChatMessage[];
  busy: boolean;
  /** `about` names what the question is about (boundary, place, painted variable); the same question about the same thing is answered from memory. */
  ask: (question: string, facts: () => Promise<string>, about?: string) => Promise<void>;
  clear: () => void;
}
/** Answers given in this visit, by what was asked about what. A repeat costs nothing. */
const remembered = new Map<string, Pick<ChatMessage, 'text' | 'provider' | 'unchecked'>>();
const memoKey = (about: string, q: string) => `${about}\n${q.toLowerCase().replace(/\s+/g, ' ').replace(/[?.!]+$/, '')}`;
export const CHAT_COPY = {
  offline: 'The assistant needs the online version of this tool. This offline file still has the map, the data and every summary.',
  down: 'The assistant is not available right now. The summary panel has the same figures.',
  unchecked: 'Some figures in this answer could not be matched to the data. Check them in the summary.',
  poweredBy: (who: string) => `Powered by ${who}`,
  defaultProvider: 'DeepSeek',
};
/** An answer is shown after at least this long, so the thinking animation always has time to read as thinking. */
export const MIN_THINK_MS = 5000;
/** A refusal (offline file, service down) still waits this long, so the box does not flicker. */
export const MIN_FAIL_MS = 900;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, Math.max(0, ms)));
let seq = 0;

export const useChat = create<ChatState>((set, get) => ({
  messages: [],
  busy: false,
  clear: () => set({ messages: [] }),
  ask: async (question, facts, about) => {
    const q = question.trim();
    if (!q || get().busy) return;
    const before = get().messages;
    // The last finished exchange gives a follow-up question its context; more would only cost tokens.
    const history: { role: 'user' | 'assistant'; text: string }[] = [];
    for (let i = 0; i + 1 < before.length; i++) {
      const a = before[i], b = before[i + 1];
      if (a.role === 'user' && b.role === 'assistant' && !b.failed && !b.pending) history.push({ role: 'user', text: a.text }, { role: 'assistant', text: b.text });
    }
    const key = about ? memoKey(about, q) : null;
    const answerId = (seq += 2);
    const at = Date.now();
    set({ busy: true, messages: [...before, { id: answerId - 1, role: 'user', text: q, at }, { id: answerId, role: 'assistant', text: '', at, pending: true }] });
    // Every outcome waits for its minimum, counted from the moment the question was sent.
    const finish = async (m: Partial<ChatMessage>) => {
      await wait((m.failed ? MIN_FAIL_MS : MIN_THINK_MS) - (Date.now() - at));
      set({ busy: false, messages: get().messages.map((x) => (x.id === answerId ? { ...x, pending: false, ...m } : x)) });
    };
    const known = key ? remembered.get(key) : undefined;
    if (known) return finish(known);
    if (typeof fetch !== 'function' || (typeof location !== 'undefined' && location.protocol === 'file:')) return finish({ text: CHAT_COPY.offline, failed: true });
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: q, facts: await facts(), history: history.slice(-2) }) });
      const j = (await res.json().catch(() => null)) as { ok?: boolean; text?: string; provider?: string; checked?: boolean } | null;
      if (j?.ok && j.text) {
        const answer = { text: j.text, provider: j.provider, unchecked: j.checked === false };
        if (key && !answer.unchecked) remembered.set(key, answer);
        await finish(answer);
      } else await finish({ text: CHAT_COPY.down, failed: true });
    } catch {
      await finish({ text: CHAT_COPY.down, failed: true });
    }
  },
}));
