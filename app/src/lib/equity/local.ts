// The second paragraph of the Equity & policy explanation: the selected area against the areas around it (or, with
// nothing selected, how the highest-need areas cluster), and a takeaway for each measure. Deterministic, from the same
// values the map draws; "around it" = the nearest areas by the middle of their outlines, within two miles.
import { tractBounds } from '../data';
import { boundsOf, type GeoGeometry } from '../geo';
import { bundledGeo } from '../explore/catalog';
import { isNum } from '../place/format';
import { median, rankByNeed, type AmiPct, type MeasureDef, type MeasureId } from './measures';
import type { TractValue } from './explain';

export type Level = 'tract' | 'zip';
type LngLat = [number, number];

const cache: Partial<Record<Level, Map<string, LngLat>>> = {};
const mid = (b: [[number, number], [number, number]]): LngLat => [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2];

/** The middle of each area's outline (tracts from the tract bounds, ZIPs from the bundled ZCTA shapes). */
export function centers(level: Level): Map<string, LngLat> {
  if (cache[level]) return cache[level]!;
  const m = new Map<string, LngLat>();
  if (level === 'tract') for (const [id, b] of tractBounds) m.set(id, mid(b));
  else for (const f of bundledGeo('zcta').features) m.set(String(f.properties.GEOID), mid(boundsOf(f.geometry as GeoGeometry)));
  return (cache[level] = m);
}

/** Miles between two points (flat-earth, fine at city scale). */
const miles = (a: LngLat, b: LngLat) => Math.hypot((a[0] - b[0]) * 53, (a[1] - b[1]) * 69);

/** The nearest areas with a value, within `maxMi` (at most `k`). */
export function nearby(id: string, level: Level, pool: Set<string>, k = 5, maxMi = 2): string[] {
  const c = centers(level);
  const here = c.get(id);
  if (!here) return [];
  return [...pool]
    .filter((x) => x !== id && c.has(x))
    .map((x) => ({ x, d: miles(here, c.get(x)!) }))
    .filter((o) => o.d <= maxMi)
    .sort((a, b) => a.d - b.d)
    .slice(0, k)
    .map((o) => o.x);
}

const join = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const uniq = (xs: string[]) => [...new Set(xs)];

/** Citywide takeaway, one per measure (the end of the first paragraph). */
export function cityTakeaway(id: MeasureId, ami: AmiPct): string {
  const who = ami === 100 ? 'median-income households' : `households at ${ami}% AMI`;
  switch (id) {
    case 'rent_gap':
      return `Takeaway: for ${who}, the market alone is not enough where the gap is large; help goes furthest where a large gap meets many burdened renters, which is what the rent-gap subsidy lever tests.`;
    case 'burdened':
      return 'Takeaway: these are the places where the most households are already stretched, so keeping existing rents and adding income-restricted homes matters most here.';
    case 'jobs':
      return 'Takeaway: where few jobs are within a mile, residents depend on the bus or a car to reach work, so new homes do more near job centers or frequent transit.';
    case 'school':
      return 'Takeaway: long trips to school weigh most on families, so family-sized homes fit best where a school is close.';
    case 'transit':
      return 'Takeaway: new homes far from frequent service add car trips; homes near frequent stops let residents reach jobs and services without a car.';
    case 'services':
      return 'Takeaway: where groceries, pharmacies and clinics are out of walking reach, new homes need everyday services alongside them.';
  }
}

export interface LocalInput {
  def: MeasureDef;
  ami: AmiPct;
  values: TractValue[];
  level: Level;
  selectedId: string | null;
  nameOf: (id: string) => string;
  /** "tracts" or "ZIP codes". */
  many: string;
}

/** The second paragraph: the selected area against its surroundings, or where need clusters when none is selected. */
export function explainLocal({ def, values, level, selectedId, nameOf, many }: LocalInput): string {
  const withValue = values.filter((v) => isNum(v.value));
  const pool = new Set(withValue.map((v) => v.id));
  const byId = new Map(withValue.map((v) => [v.id, v.value as number]));
  const cityMed = median(withValue.map((v) => v.value as number));
  const fmt = (v: number) => def.fmt(v);
  const more = (a: number, b: number) => (def.higherIsNeed ? a > b : a < b);
  const one = many === 'tracts' ? 'tract' : 'ZIP';

  if (selectedId && byId.has(selectedId) && cityMed != null) {
    const v = byId.get(selectedId)!;
    const name = nameOf(selectedId);
    const near = nearby(selectedId, level, pool);
    const nearVals = near.map((x) => byId.get(x)!).filter(isNum);
    const nearMed = median(nearVals);
    const nearNames = join(uniq(near.map((x) => nameOf(x))).filter((n) => n !== name).slice(0, 3));
    const close = Math.abs(v - cityMed) < Math.abs(cityMed) * 0.05 + 1e-9;
    const tier: Tier = close ? 'typical' : more(v, cityMed) ? 'more' : 'less';
    const vsCity = close ? 'close to' : tier === 'more' ? 'more need than' : 'less need than';
    const parts = [`${name} reads ${fmt(v)}, ${vsCity} the city's middle ${one} (${fmt(cityMed)}).`];
    if (nearMed != null && nearVals.length) {
      const vsNear = Math.abs(v - nearMed) < Math.abs(nearMed) * 0.1 + 1e-9 ? 'much like' : more(v, nearMed) ? 'needier than' : 'better placed than';
      parts.push(`The ${nearVals.length} nearest ${many}${nearNames ? `, including ${nearNames},` : ''} have a middle value of ${fmt(nearMed)}, so ${name} is ${vsNear} its surroundings.`);
      parts.push(localTakeaway(def.id, tier, vsNear === 'needier than', name, one));
    } else parts.push(localTakeaway(def.id, tier, false, name, one));
    return parts.join(' ');
  }

  // Nothing selected: do the highest-need areas sit together?
  const top = rankByNeed(withValue, def.higherIsNeed).slice(0, 10).map((v) => v.id);
  const topSet = new Set(top);
  const clustered = top.filter((id) => nearby(id, level, topSet, 3, 1.2).length > 0);
  const hubs = uniq(clustered.map((x) => nameOf(x))).slice(0, 3);
  const spread =
    clustered.length >= 6
      ? `Need is concentrated: ${clustered.length} of the ${top.length} highest-need ${many} sit next to another one, around ${join(hubs)}.`
      : clustered.length >= 2
        ? `Need is partly clustered: ${clustered.length} of the ${top.length} highest-need ${many} sit next to another one (around ${join(hubs)}); the rest are spread across the city.`
        : `Need is spread out: the ${top.length} highest-need ${many} rarely sit next to each other, so no single district holds the problem.`;
  return `${spread} ${clustered.length >= 2 ? 'Takeaway: work in those clusters reaches many high-need places at once.' : 'Takeaway: a citywide rule reaches these places better than a district plan.'} Select a ${one} to compare it with the places around it.`;
}

type Tier = 'more' | 'less' | 'typical';

function localTakeaway(id: MeasureId, tier: Tier, standsOut: boolean, name: string, one: string): string {
  const edge = standsOut ? ' (needier than the places around it)' : '';
  if (tier === 'typical')
    return `Takeaway: ${name} is typical of the city on this measure${standsOut ? ' but needier than the places around it, so it matters locally' : ''}; other measures say more about what it needs.`;
  const needier = tier === 'more';
  void one;
  switch (id) {
    case 'rent_gap':
      return needier ? `Takeaway: listings in ${name} are out of reach at this income${edge}; new homes here need a subsidy or income limits to serve these renters.` : `Takeaway: listings in ${name} are within reach on turnover; the task here is keeping those rents as the area changes.`;
    case 'burdened':
      return needier ? `Takeaway: many renters in ${name} are stretched${edge}; it is a strong candidate for protection and income-restricted homes.` : `Takeaway: fewer renters in ${name} are stretched than in the typical place; other places come first on this measure.`;
    case 'jobs':
      return needier ? `Takeaway: ${name} has few jobs within a mile${edge}; frequent transit matters more here than more homes.` : `Takeaway: ${name} is close to jobs, a good place for more homes.`;
    case 'school':
      return needier ? `Takeaway: schools are farther from ${name}${edge}; smaller homes fit better than family-sized ones.` : `Takeaway: schools are close to ${name}, which suits family-sized homes.`;
    case 'transit':
      return needier ? `Takeaway: frequent service is far from ${name}${edge}; more homes here mean more car trips unless service improves.` : `Takeaway: ${name} is close to frequent service, a good place for more homes.`;
    case 'services':
      return needier ? `Takeaway: few everyday services are within walking distance of ${name}${edge}; homes here work better with services alongside.` : `Takeaway: ${name} has everyday services within walking distance, a good place for more homes.`;
  }
}
