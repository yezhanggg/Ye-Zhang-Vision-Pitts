// "Types that pass your screens": the online Place view's suggestion, built from the place rules (lib/place/recommend)
// without a single focusing issue. The base is the need at the income level: the under-served renters, the lot
// pattern and the rent that fits, read without the displacement branch. Then the binding rules apply (no ADU overlay
// is mapped; senior housing only for senior residents) and each screen switched on narrows the set (displacement
// risk, frequent transit within ½ mile, most flood-zone land). At market rate the market check always applies.
// Loaded on demand, never in the offline file.
import { G } from '../place/copy';
import { capitalize, fmtMiles, isNum } from '../place/format';
import { bedroomsWord } from '../place/bands';
import { FLOOD_LABEL, LEVEL_LABEL, type PlanLevel } from '../place/plan';
import { recommend, type RecommendOptions, type Recommendation } from '../place/recommend';
import { THRESHOLDS, TYPOLOGY_LABEL } from '../place/thresholds';
import type { HudTable, PlaceMeasures, Stance, Typology } from '../place/types';
import type { PolicyState } from './store';

export const TRANSIT_SCREEN_MI = 0.5;

/** "no screens" or "screens: displacement, transit ½ mi, flood ≤5%". */
export function screensWords(s: PolicyState): string {
  const on = [s.displacement && 'displacement', s.transit && 'transit ½ mi', s.flood !== 'any' && `flood ${FLOOD_LABEL[s.flood]}`].filter(Boolean);
  return on.length ? `screens: ${on.join(', ')}` : 'no screens';
}

export interface ComposeInput {
  level: PlanLevel;
  /** Residents: senior 62+ (PHFA occupancy "senior") or general. */
  senior: boolean;
  fitOrder?: Typology[];
  demand?: RecommendOptions['demand'];
}

export interface ScreenCheck {
  id: 'displacement' | 'transit' | 'flood' | 'market';
  on: boolean;
  passed: boolean | null;
  sentence: string;
}

export interface Composed {
  rec: Recommendation;
  checks: ScreenCheck[];
  /** Why nothing is suggested, in a short line, or null when something is. */
  why: string | null;
}

/** The place with its displacement score hidden, so the rules read the need without the displacement branch. */
const withoutDisplacement = (p: PlaceMeasures): PlaceMeasures => (p?.displacement ? { ...p, displacement: { ...p.displacement, score: null } } : p);

function transitCheck(p: PlaceMeasures, on: boolean): ScreenCheck {
  const d = p?.transit?.freq_dist_mi;
  if (!isNum(d)) return { id: 'transit', on, passed: null, sentence: 'Distance to the nearest frequent stop is not available; the transit screen cannot run.' };
  const passed = d <= TRANSIT_SCREEN_MI;
  return {
    id: 'transit',
    on,
    passed,
    sentence: passed
      ? `The nearest frequent stop (a bus or T every 15 minutes) is ${fmtMiles(d)} from where the average resident lives, within ½ mile.`
      : `The nearest frequent stop is ${fmtMiles(d)} from where the average resident lives, beyond ½ mile (${(d - TRANSIT_SCREEN_MI).toFixed(2)} miles too far).`,
  };
}

/** One place under the screens. */
export function composeRec(p: PlaceMeasures, hud: HudTable, input: ComposeInput, s: PolicyState): Composed {
  const { level, senior } = input;
  const opts: RecommendOptions = { level, size: 'auto', age: senior ? 'senior62' : 'any', flood: s.flood, transitMiles: TRANSIT_SCREEN_MI, fitOrder: input.fitOrder, demand: input.demand };
  const score = p?.displacement?.score;
  const high = isNum(score) && score >= THRESHOLDS.displacement_high;
  const atMarket = level === 'market';
  // The rules underneath: market rate reads the market test (or, screened and at high risk, the displacement rule
  // that blocks market-rate homes); an income level reads the need, with or without the displacement branch.
  const stance: Stance = atMarket && !(s.displacement && high) ? 'market_led' : 'anti_displacement';
  const base = recommend(s.displacement || atMarket ? p : withoutDisplacement(p), hud, stance, opts);

  const checks: ScreenCheck[] = [];
  checks.push(
    s.displacement
      ? { id: 'displacement', on: true, passed: base.stanceTest.passed, sentence: atMarket && !high ? `Displacement risk here is ${isNum(score) ? score.toFixed(2) : 'not available'}, below the ${THRESHOLDS.displacement_high} mark: market-rate homes are not ruled out.` : base.stanceTest.sentence }
      : { id: 'displacement', on: false, passed: null, sentence: `Off. Displacement score here: ${isNum(score) ? score.toFixed(2) : 'not available'}.` },
  );
  const transit = transitCheck(p, s.transit);
  checks.push(transit);
  const fl = base.floodLimit;
  checks.push({ id: 'flood', on: s.flood !== 'any', passed: fl ? !fl.blocked : null, sentence: fl ? fl.sentence : `Off. ${isNum(p?.flood?.fema_sfha_pct) ? `${p.flood.fema_sfha_pct.toFixed(1)}% of the tract's land is in FEMA's 1%-a-year flood zone.` : 'Flood-zone share not available.'}` });
  checks.push({ id: 'market', on: true, passed: atMarket ? base.stanceTest.passed : null, sentence: atMarket ? base.stanceTest.sentence : base.market.sentence });

  // Binding rules and the residents, then the screens.
  const not = [...base.not];
  let types = base.types;
  if (types.some((t) => t.typology === 'adu')) {
    types = types.filter((t) => t.typology !== 'adu');
    not.push({ typology: 'adu', because: 'an ADU needs an ADU overlay district (§912.08), and none is mapped in the city' });
  }
  // Renter householders 65 and older (ACS B25007), so the line says how many residents the setting leaves out.
  const ra = p?.renter_age;
  const all = ra ? ra.reduce<number>((a, v) => a + (v ?? 0), 0) : 0;
  const old = ra && all > 0 ? `; ${Math.round((((ra[5] ?? 0) + (ra[6] ?? 0)) / all) * 100)}% of renter households here are 65 or older` : '';
  if (!senior && types.some((t) => t.typology === 'senior')) {
    types = types.filter((t) => t.typology !== 'senior');
    not.push({ typology: 'senior', because: `it is for ages 62 and older and Residents is set to General${old}. Pick Senior under Residents (or Development type) to include it` });
  }
  let why: string | null = null;
  if (s.transit && transit.passed === false && types.length) {
    types = [];
    why = `No frequent stop within ½ mile (nearest ${fmtMiles(p?.transit?.freq_dist_mi)}).`;
  }
  const lead = types[0]?.typology ?? null;
  if (!lead && !why && !fl?.blocked) {
    if (base.types.length && base.types.every((t) => t.typology === 'adu' || (!senior && t.typology === 'senior')))
      why = base.types.every((t) => t.typology === 'adu') ? 'Only an ADU fits here, and no ADU overlay is mapped.' : `Only senior housing fits here${old}. Pick Senior under Residents to include it.`;
  }

  const on = checks.filter((c) => c.on && c.id !== 'market');
  const stanceTest = {
    passed: lead ? true : on.some((c) => c.passed === false) ? false : base.stanceTest.passed,
    sentence: on.length ? `Your screens: ${on.map((c) => c.sentence).join(' ')}` : 'No screens switched on: the suggestion follows renter need at your income level, the lot pattern and the binding rules.',
  };
  const headline = lead
    ? lead === base.lead
      ? base.headline
      : `${capitalize(TYPOLOGY_LABEL[lead])} (${bedroomsWord(types[0].bedrooms).replace(/^a /, '')}) for households ${LEVEL_LABEL[level]}${base.price ? ` at $${Math.round(base.price.rent).toLocaleString('en-US')} a month` : ''}`
    : (why ?? base.headline);
  const typesLine = /^Types (that can deliver|the market pays)/;
  const baseNot = new Set(G.not(base.not));
  const lines = base.lines
    .map((l) => (l === base.stanceTest.sentence ? stanceTest.sentence : typesLine.test(l) ? G.types(types, stance).replace('none under this stance', 'none passes your screens and the binding rules') : l))
    .filter((l) => !baseNot.has(l));
  const notServedAt = lines.findIndex((l) => l.startsWith('Not served'));
  lines.splice(notServedAt < 0 ? lines.length : notServedAt, 0, ...G.not(not));
  return {
    rec: { ...base, types, lead, not, headline, stanceTest, lines, notServedWhy: why ? `nothing is suggested: ${why.replace(/\.$/, '')}` : base.notServedWhy },
    checks,
    why,
  };
}

/** Every place under the screens (the online Place map paints each lead). */
export function composeAll(places: Map<string, PlaceMeasures>, hud: HudTable, input: Omit<ComposeInput, 'fitOrder' | 'demand'>, s: PolicyState, fitOrders?: Map<string, Typology[]>, demand?: Map<string, RecommendOptions['demand']> | null): Map<string, Composed> {
  const out = new Map<string, Composed>();
  for (const [id, p] of places) out.set(id, composeRec(p, hud, { ...input, fitOrder: fitOrders?.get(id), demand: demand?.get(id) }, s));
  return out;
}
