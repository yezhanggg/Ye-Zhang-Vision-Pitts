// What a place brings to the tax credit score sheet: the one line it settles (transit), and the measured figures shown
// next to the lines a person decides. Sun, shade, tree canopy and vacant lots come from data/lazy/site_tract.json
// (scripts/16_build_canopy.py); the rest is the place data the Analysis tab already carries. Loaded with the sheet.
import { qctChangeWords, qctYears } from '../pencil/designations';
import siteJson from '../../data/lazy/site_tract.json';
import { isNum } from '../format';
import { CITY_GEOID, bundledValues } from '../explore/catalog';
import { placeFor } from '../place/data';
import { landForType } from '../place/zoningAnalysis';
import type { PlaceMeasures } from '../place/types';
import type { Facts } from './score';

export interface SiteTract {
  /** Share of land under tree canopy (2020 lidar), 0–1. */
  canopy: number | null;
  canopy_acres: number | null;
  /** Hours of direct sun on the tract's lots, area-weighted: June 21, September 22, December 21. */
  sun: (number | null)[] | null;
  /** Share of the day the lots are in shadow, same three days. */
  shade: (number | null)[] | null;
  lots: number | null;
  /** Lots the county assesses as vacant land (rated lots only). */
  vacant: number | null;
  /** … of 2,000 sq ft or more. */
  vacant_2k: number | null;
  /** … and less than half under trees. */
  vacant_open: number | null;
  vacant_open_acres: number | null;
  /** … and in direct sun for at least half of December 21. */
  vacant_sunny: number | null;
  vacant_sunny_acres: number | null;
  /** Share of lots within half a mile of a transit stop, 0–1. */
  transit_half: number | null;
}
export interface SiteFile {
  built: string;
  days: string[];
  day_hours: number[];
  city: SiteTract;
  median: SiteTract;
  tracts: Record<string, SiteTract>;
}

export const site = siteJson as unknown as SiteFile;
export const siteFor = (geoid: string): SiteTract | null => site.tracts?.[geoid] ?? null;

/** Transit is settled by the place when this share of its lots is within half a mile of a stop (PHFA's distance). */
export const TRANSIT_ALL = 0.995;

export function factsFor(geoid: string, file: SiteFile = site): Facts {
  const share = file.tracts?.[geoid]?.transit_half;
  return { transit: isNum(share) ? share >= TRANSIT_ALL : null };
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const int = (v: number) => Math.round(v).toLocaleString('en-US');
const hrs = (v: number) => (Math.round(v * 10) / 10).toFixed(1);
const est = (level: 'tract' | 'city', geoid: string, id: string): number | null => {
  const v = bundledValues(level)[geoid]?.[id]?.[0];
  return isNum(v) ? v : null;
};
const sum = (...v: (number | null | undefined)[]) => (v.every(isNum) ? (v as number[]).reduce((a, b) => a + b, 0) : null);

/** "31% here, 19% in the city" for a census share. */
function vsCity(geoid: string, id: string, f: (v: number) => string): string | null {
  const here = est('tract', geoid, id);
  const city = est('city', CITY_GEOID, id);
  if (here == null) return null;
  return city == null ? `${f(here)} here` : `${f(here)} here, ${f(city)} in the city`;
}

/** Short measured facts about the place, keyed the way the sheet's lines ask for them. A missing key means "not measured". */
export function evidenceFor(geoid: string, place: PlaceMeasures | null = placeFor(geoid) ?? null, file: SiteFile = site): Record<string, string> {
  const out: Record<string, string> = {};
  const s = file.tracts?.[geoid] ?? null;
  const city = file.city;

  if (s && isNum(s.transit_half)) {
    out.transit = s.transit_half >= TRANSIT_ALL ? 'Every lot here is within half a mile of a transit stop.' : `${pct(s.transit_half)} of the lots here are within half a mile of a transit stop, so it depends on the site.`;
  }
  const poverty = vsCity(geoid, 'poverty_share', pct);
  if (poverty) out.poverty = `Below the poverty line: ${poverty}.`;
  const renters = est('tract', geoid, 'renter_share');
  const cityRenters = est('city', CITY_GEOID, 'renter_share');
  if (renters != null) out.owners = `Owner households: ${pct(1 - renters)} here${cityRenters != null ? `, ${pct(1 - cityRenters)} in the city` : ''}.`;
  const value = vsCity(geoid, 'med_home_value', (v) => `$${int(v)}`);
  if (value) out.market = `Median home value: ${value}.`;

  if (place) {
    const low = sum(place.bands?.le30?.hh, place.bands?.b30_50?.hh);
    const burdened = sum(place.bands?.le30?.burden30, place.bands?.b30_50?.burden30);
    if (low != null) out.need = `${int(low)} renter households here are at or below 50% of area median income${burdened != null ? `; ${int(burdened)} of them pay more than 30% of income for housing` : ''}.`;
    const large = sum(place.types?.le30?.large_family, place.types?.b30_50?.large_family, place.types?.b50_80?.large_family);
    if (large != null) out.families = `${large > 0 ? int(large) : 'No'} renter households of five or more people here are at or below 80% of area median income (HUD estimate).`;
    const elderly = sum(place.types?.le30?.elderly_alone, place.types?.le30?.elderly_family, place.types?.b30_50?.elderly_alone, place.types?.b30_50?.elderly_family);
    const old = vsCity(geoid, 'age65_share', pct);
    if (elderly != null) out.seniors = `${int(elderly)} renter households aged 62 or over here are at or below 50% of area median income${old ? `. Aged 65 and over: ${old}` : ''}.`;
    if (place.zoning?.shares) {
      const z = landForType(place.zoning.shares, 'small_apartment');
      out.zoning = `Small apartment buildings read as allowed by right on ${pct(z.yes)} of the land here and by special approval on ${pct(z.conditional)} (an unverified reading of the city zoning map).`;
    }
  }

  if (s) {
    if (isNum(s.vacant) && isNum(s.vacant_2k) && isNum(s.vacant_open)) {
      out.vacant = `${int(s.vacant)} lots here are assessed as vacant land; ${int(s.vacant_2k)} are 2,000 sq ft or larger, and ${int(s.vacant_open)} of those are less than half under trees.`;
    }
    const d = file.day_hours;
    if (s.sun && isNum(s.sun[0]) && isNum(s.sun[2])) {
      const c = city?.sun && isNum(city.sun[0]) && isNum(city.sun[2]) ? ` (city: ${hrs(city.sun[2])} and ${hrs(city.sun[0])})` : '';
      out.sun = `Lots here get ${hrs(s.sun[2])} of ${d[2]} hours of direct sun on December 21 and ${hrs(s.sun[0])} of ${d[0]} on June 21${c}.`;
    }
    if (isNum(s.canopy)) out.canopy = `Tree canopy covers ${pct(s.canopy)} of the land here${isNum(city?.canopy) ? ` (city: ${pct(city.canopy)})` : ''}.`;
  }
  return out;
}

/** The federal and state place designations that change the financing rather than the score. */
export function designations(place: PlaceMeasures | null, geoid?: string): { key: string; label: string; on: boolean | null; note: string }[] {
  const p = place?.programs;
  const q = geoid ? qctYears(geoid) : null;
  const change = q ? qctChangeWords(q) : null;
  return [
    { key: 'qct', label: q ? 'Qualified Census Tract (HUD 2027 list)' : 'Qualified Census Tract', on: q ? q.y2027 : (p?.qct ?? null), note: `Eligible basis counts at 130%. More equity, no points.${change ? ` ${change}` : ''}` },
    { key: 'dda', label: 'Difficult Development Area', on: p?.dda ?? null, note: 'Eligible basis counts at 130%. More equity, no points.' },
    { key: 'oz', label: 'Opportunity Zone', on: p?.oz ?? null, note: 'PHFA names Opportunity Zones among the programs that can back the community revitalization lines.' },
  ];
}
