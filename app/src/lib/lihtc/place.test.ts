import { describe, expect, it } from 'vitest';
import { HAZELWOOD, NULL_PLACE } from '../place/fixture';
import { TRANSIT_ALL, designations, evidenceFor, factsFor, site, type SiteFile, type SiteTract } from './place';

const GEOID = '42003562300';
const tract = (over: Partial<SiteTract> = {}): SiteTract => ({
  canopy: 0.4123, canopy_acres: 312.4, sun: [9.84, 6.91, 3.62], shade: [0.32, 0.42, 0.6], lots: 2100,
  vacant: 641, vacant_2k: 210, vacant_open: 120, vacant_open_acres: 31.2, vacant_sunny: 54, vacant_sunny_acres: 12.3, transit_half: 1, ...over,
});
const file = (over: Partial<SiteTract> = {}): SiteFile => ({
  built: '2026-10-11', days: ['jun21', 'sep22', 'dec21'], day_hours: [14.5, 12, 9],
  city: tract({ canopy: 0.395, sun: [9.12, 6.28, 3.25] }), median: tract(), tracts: { [GEOID]: tract(over) },
});

describe('what the place settles', () => {
  it('counts transit when nearly every lot is within half a mile of a stop', () => {
    expect(factsFor(GEOID, file())).toEqual({ transit: true });
    expect(factsFor(GEOID, file({ transit_half: TRANSIT_ALL }))).toEqual({ transit: true });
    expect(factsFor(GEOID, file({ transit_half: 0.83 }))).toEqual({ transit: false });
    expect(factsFor(GEOID, file({ transit_half: null }))).toEqual({ transit: null });
    expect(factsFor('42003000000', file())).toEqual({ transit: null });
  });
});

describe('what the place shows next to a line', () => {
  it('states the site figures in plain sentences', () => {
    const e = evidenceFor(GEOID, HAZELWOOD, file());
    expect(e.transit).toBe('Every lot here is within half a mile of a transit stop.');
    expect(e.vacant).toBe('641 lots here are assessed as vacant land; 210 are 2,000 sq ft or larger, and 120 of those are less than half under trees.');
    expect(e.sun).toBe('Lots here get 3.6 of 9 hours of direct sun on December 21 and 9.8 of 14.5 on June 21 (city: 3.3 and 9.1).');
    expect(e.canopy).toBe('Tree canopy covers 41% of the land here (city: 40%).');
  });
  it('says when transit depends on the site', () => {
    expect(evidenceFor(GEOID, HAZELWOOD, file({ transit_half: 0.83 })).transit).toBe('83% of the lots here are within half a mile of a transit stop, so it depends on the site.');
  });
  it('reads need, families and seniors from the place measures', () => {
    const e = evidenceFor(GEOID, HAZELWOOD, file());
    const low = HAZELWOOD.bands.le30.hh! + HAZELWOOD.bands.b30_50.hh!;
    expect(e.need).toContain(`${low.toLocaleString('en-US')} renter households here are at or below 50% of area median income`);
    expect(e.families).toMatch(/renter households of five or more people here are at or below 80% of area median income/);
    expect(e.seniors).toMatch(/renter households aged 62 or over here are at or below 50% of area median income/);
    expect(e.zoning).toMatch(/^Small apartment buildings read as allowed by right on \d+% of the land here/);
  });
  it('compares census shares with the city', () => {
    const e = evidenceFor(GEOID, HAZELWOOD, file());
    expect(e.poverty).toMatch(/^Below the poverty line: \d+% here, \d+% in the city\.$/);
    expect(e.owners).toMatch(/^Owner households: \d+% here, \d+% in the city\.$/);
    expect(e.market).toMatch(/^Median home value: \$[\d,]+ here, \$[\d,]+ in the city\.$/);
  });
  it('leaves out what was not measured', () => {
    const e = evidenceFor('42003000000', NULL_PLACE, file());
    for (const k of ['transit', 'vacant', 'sun', 'canopy', 'need', 'families', 'seniors', 'poverty']) expect(e[k], k).toBeUndefined();
    const part = evidenceFor(GEOID, null, file({ sun: null, canopy: null, vacant: null }));
    expect(part.sun).toBeUndefined();
    expect(part.canopy).toBeUndefined();
    expect(part.vacant).toBeUndefined();
    expect(part.need).toBeUndefined();
  });
});

describe('designations that change the financing, not the score', () => {
  it('reads the federal flags', () => {
    const d = designations(HAZELWOOD);
    expect(d.map((x) => x.key)).toEqual(['qct', 'dda', 'oz']);
    expect(d[0].on).toBe(HAZELWOOD.programs.qct);
    expect(designations(null).every((x) => x.on === null)).toBe(true);
  });
});

describe('the site file that ships', () => {
  it('holds every tract of the place data, with shares on the 0 to 1 scale', async () => {
    const { placeById } = await import('../place/data');
    const ids = Object.keys(site.tracts);
    if (!ids.length) return; // the file is built by scripts/16_build_canopy.py; nothing to check before it has run
    expect(ids.sort()).toEqual([...placeById.keys()].sort());
    expect(site.day_hours).toEqual([14.5, 12, 9]);
    for (const [id, t] of Object.entries(site.tracts)) {
      for (const v of [t.canopy, t.transit_half, ...(t.shade ?? [])]) if (v != null) expect(v >= 0 && v <= 1, id).toBe(true);
      (t.sun ?? []).forEach((v, i) => v != null && expect(v >= 0 && v <= site.day_hours[i], id).toBe(true));
      if (t.vacant != null && t.vacant_2k != null && t.vacant_open != null && t.vacant_sunny != null) expect(t.vacant >= t.vacant_2k && t.vacant_2k >= t.vacant_open && t.vacant_open >= t.vacant_sunny, id).toBe(true);
    }
  });
});
