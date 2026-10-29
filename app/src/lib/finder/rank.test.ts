import { describe, expect, it } from 'vitest';
import { readPlace } from '../../components/place/finder/read';
import { rankedTracts } from '../data';
import type { Score } from '../lihtc/score';
import { DEFAULT_ENTRIES } from '../lihtc/store';
import { hud, placeFor } from '../place/data';
import type { PlanLevel } from '../place/plan';
import type { PlaceMeasures } from '../place/types';
import type { Branch } from '../pencil/inputs';
import type { DevType } from '../project/devType';
import { DEFAULT_PROJECT, type ProjectState } from '../project/store';
import { altFor, compareRows, DEFAULT_INPUTS, findPlaces, placeReasons, pointsLine, pointsOf, projectWords, readReasons, rowName, type FinderContext, type FinderRow, type Points } from './rank';

const HAZELWOOD = '42003562300';
const geoids = rankedTracts.map((t) => t.GEOID);

function ctxFor(devType: DevType, level: PlanLevel, homes: number | null, project: ProjectState = { ...DEFAULT_PROJECT, devType }): FinderContext {
  return { geoids, placeFor, read: (geoid: string, place: PlaceMeasures, branch: Branch | null = null) => readPlace({ geoid, place, hud: hud!, level, homes, project, entries: DEFAULT_ENTRIES, devType }, branch) };
}
const AFFORDABLE = ctxFor('affordable', 50, 40);

describe('the filters', () => {
  const p = placeFor(HAZELWOOD)!;
  it('reads flood and QCT before the place is read', () => {
    expect(placeReasons(null, DEFAULT_INPUTS)).toEqual(['no data']);
    expect(placeReasons(p, DEFAULT_INPUTS, HAZELWOOD)).toEqual([]);
    const wet = { ...p, flood: { ...p.flood, fema_sfha_pct: 20 } } as PlaceMeasures;
    expect(placeReasons(wet, { ...DEFAULT_INPUTS, maxFlood: 10 })).toEqual(['flood']);
    const noQct = { ...p, programs: { ...p.programs, qct: false, dda: false } } as PlaceMeasures;
    expect(placeReasons(noQct, { ...DEFAULT_INPUTS, qctOrDda: true })).toEqual(['qct']);
  });
  it('reads the overlay, zoning, depth and cost from the read', () => {
    const r = AFFORDABLE.read(HAZELWOOD, p);
    expect(r.check.verdict).toBe('yes');
    expect(readReasons(r, DEFAULT_INPUTS)).toEqual([]);
    expect(readReasons(r, { ...DEFAULT_INPUTS, overlay: r.m.inIzo ? 'outside' : 'inside' })).toEqual(['overlay']);
    expect(readReasons(r, { ...DEFAULT_INPUTS, minDepth: 1e9, maxCost: 1 })).toEqual(['depth', 'cost']);
    const no = { ...r, check: { ...r.check, verdict: 'no' as const } };
    const hearing = { ...r, check: { ...r.check, verdict: 'hearing' as const } };
    const unknown = { ...r, check: { ...r.check, verdict: 'unknown' as const } };
    expect(readReasons(no, DEFAULT_INPUTS)).toEqual(['zoning']);
    expect(readReasons(unknown, DEFAULT_INPUTS)).toEqual(['code']);
    expect(readReasons(hearing, DEFAULT_INPUTS)).toEqual(['zoning']);
    expect(readReasons(hearing, { ...DEFAULT_INPUTS, hearingOk: true })).toEqual([]);
    expect(readReasons(no, { ...DEFAULT_INPUTS, byRight: false })).toEqual([]);
  });
  it('by right is on by default', () => expect(DEFAULT_INPUTS.byRight).toBe(true));
});

describe('PHFA points in words', () => {
  const score = (total: number, high: number, confirm: number, threshold: number | null): Score =>
    ({ total, max: 205, threshold, short: 0, lost: [], fromPlace: 5, range: { low: total, high }, sections: [{ lines: [{ item: { basis: 'team' }, gain: confirm }, { item: { basis: 'design' }, gain: 40 }] }] }) as unknown as Score;
  it('says how far the minimum is and where the points would come from', () => {
    expect(pointsOf(score(130, 150, 20, 120)).reach).toBe('met');
    expect(pointsOf(score(20, 125, 20, 120)).reach).toBe('choices');
    const confirm = pointsOf(score(20, 90, 100, 120));
    expect(confirm).toMatchObject({ reach: 'confirm', most: 190 });
    expect(pointsLine('nine', confirm)).toBe('9% credits: 20 points now, 120 needed; design and financing choices reach 90, the other 30 must come from site, partner and team lines');
    const no = pointsOf(score(20, 90, 10, 120));
    expect(no).toMatchObject({ reach: 'no', most: 100 });
    expect(pointsLine('nine', no)).toBe("9% credits can't reach PHFA's 120 minimum here: 100 points at most");
    expect(pointsLine('four', pointsOf(score(130, 150, 0, 120)))).toBe("4% + bonds: 130 points, meets PHFA's 120 minimum");
    expect(pointsOf(score(20, 90, 0, null)).reach).toBeNull();
  });
});

describe('compareRows', () => {
  const pts = (reach: Points['reach'], fromPlace = 0): Points => ({ total: 0, high: 0, most: 0, threshold: 120, fromPlace, reach });
  const row = (o: Partial<FinderRow>): FinderRow => ({ geoid: 'x', verdict: 'changes', stops: 0, warns: 0, points: null, gapPerUnit: 0, costPerUnit: 0, fix: [], drivers: [], read: null as never, ...o });
  it('orders by verdict, PHFA reach, fewer fixes, money still to find, place points, then cost', () => {
    expect(compareRows(row({ verdict: 'works', gapPerUnit: 9e9 }), row({ verdict: 'changes', gapPerUnit: -9e9 }))).toBeLessThan(0);
    expect(compareRows(row({ points: pts('choices') }), row({ points: pts('no'), stops: 0, warns: 0 }))).toBeLessThan(0);
    expect(compareRows(row({ stops: 1 }), row({ warns: 3 }))).toBeGreaterThan(0);
    expect(compareRows(row({ gapPerUnit: -100 }), row({ gapPerUnit: 100 }))).toBeLessThan(0);
    expect(compareRows(row({ points: pts('confirm', 10) }), row({ points: pts('confirm', 5) }))).toBeLessThan(0);
    expect(compareRows(row({ costPerUnit: 1 }), row({ costPerUnit: 2 }))).toBeLessThan(0);
  });
});

describe('findPlaces', () => {
  it('reads every ranked tract with the project and returns them in rule order', () => {
    const r = findPlaces(AFFORDABLE, DEFAULT_INPUTS);
    expect(r.tested).toBe(geoids.length);
    expect(r.rows.length + Object.values(r.excluded).reduce((a, b) => a + (b ?? 0), 0)).toBe(r.tested);
    for (let k = 1; k < r.rows.length; k++) expect(compareRows(r.rows[k - 1], r.rows[k])).toBeLessThanOrEqual(0);
    // The project as set: 40 units on 9% credits, every row allowed by right and carrying its points.
    expect(r.project).toMatchObject({ devType: 'affordable', units: 40, level: 50, branch: 'nine' });
    expect(projectWords(r.project!)).toBe('Affordable · 40 units · 4 stories · ≤50% AMI · 9% credits');
    expect(r.rows.every((x) => x.read.check.verdict === 'yes' && x.read.m.mix.homes === 40 && x.points != null)).toBe(true);
  });
  it('the by-right filter filters: dropping it adds exactly the places it alone held out', () => {
    const on = findPlaces(AFFORDABLE, DEFAULT_INPUTS);
    const off = findPlaces(AFFORDABLE, { ...DEFAULT_INPUTS, byRight: false });
    expect((on.excluded.zoning ?? 0) + (on.excluded.code ?? 0)).toBeGreaterThan(0);
    expect(off.rows.length - on.rows.length).toBe((on.relax.zoning ?? 0) + (on.relax.code ?? 0));
  });
  it('a row money is the capital run, and Hazelwood claims part of its credits', () => {
    const h = findPlaces({ ...AFFORDABLE, geoids: [HAZELWOOD] }, DEFAULT_INPUTS).rows[0];
    const res = h.read.run.result;
    expect(h.costPerUnit).toBeCloseTo(res.total / 40, 6);
    expect(res.sources.some((s) => s.label === 'LIHTC equity')).toBe(true);
  });
  it('market rate: no PHFA points, and each place has its own rents and money', () => {
    const r = findPlaces(ctxFor('market', 'market', 4, { ...DEFAULT_PROJECT, devType: 'market', stories: 3 }), { ...DEFAULT_INPUTS, byRight: false });
    expect(r.project).toMatchObject({ branch: 'market', units: 4 });
    expect(projectWords(r.project!)).toBe('Market · 4 units · 3 stories · Market rate');
    expect(r.rows.every((x) => x.points == null)).toBe(true);
    const rents = new Set(r.rows.map((x) => Math.round(x.read.run.inputs.grossRent)));
    const money = new Set(r.rows.map((x) => Math.round(x.gapPerUnit)));
    expect(rents.size).toBeGreaterThan(20);
    expect(money.size).toBeGreaterThan(20);
  });
  it('shows the 4% path where 9% credits need more than the project choices', () => {
    const row = findPlaces({ ...AFFORDABLE, geoids: [HAZELWOOD] }, DEFAULT_INPUTS).rows[0];
    const alt = altFor(row, AFFORDABLE.read);
    if (row.points!.reach === 'confirm' || row.points!.reach === 'no') expect(alt?.read.m.branch).toBe('four');
    else expect(alt).toBeNull();
  });
  it('near misses: one filter away, and dropping that filter alone adds exactly them', () => {
    const i = { ...DEFAULT_INPUTS, qctOrDda: true, overlay: 'outside' as const };
    const r = findPlaces(AFFORDABLE, i);
    for (const reason of ['qct', 'overlay'] as const) {
      const without = findPlaces(AFFORDABLE, reason === 'qct' ? { ...i, qctOrDda: false } : { ...i, overlay: 'any' });
      expect(without.rows.length - r.rows.length).toBe(r.relax[reason] ?? 0);
      const joined = new Set(without.rows.map((x) => x.geoid));
      for (const m of r.nearMisses.filter((x) => x.reason === reason)) expect(joined.has(m.row.geoid)).toBe(true);
    }
    for (let k = 1; k < r.nearMisses.length; k++) expect(compareRows(r.nearMisses[k - 1].row, r.nearMisses[k].row)).toBeLessThanOrEqual(0);
  });
});

describe('rowName', () => {
  it('names the tract when a neighborhood holds several', () => {
    expect(rowName('42003080200')).toBe('Bloomfield · Tract 802');
    expect(rowName('nope')).toBe('nope');
  });
});
