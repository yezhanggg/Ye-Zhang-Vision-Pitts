import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hud, placeById } from '../place/data';
import type { HudTable, PlaceMeasures } from '../place/types';
import { FAMILY_RULES, RESIDENTIAL_FAMILIES, SMALL_APT_CONDITIONAL_FAMILIES, statusFromShares } from './zoning';
import { buildLegend, burdenedLe50, classOf, fitsRent2br, measureById, measureValue, median, quantileBreaks, rankByNeed, rentGap } from './measures';
import { aduByRight, bonusAffordableHomes, densityBonus, gapCost, largestGaps, rent60TwoBedroom, transitExtension, transitPasses } from './policy';

const HUD: HudTable = {
  metro: {
    name: 'test',
    fy: 2026,
    median: 110400,
    il30: [23200, 26500, 29800, 33100, 38680, 44360, 50040, 55720],
    il50: [38650, 44200, 49700, 55200, 59650, 64050, 68450, 72900],
    il80: [61850, 70650, 79500, 88300, 95400, 102450, 109500, 116600],
    fmr: [1001, 1077, 1299, 1661, 1789],
  },
  safmr: {},
};

function place(over: Partial<PlaceMeasures> = {}): PlaceMeasures {
  const band = { hh: 100, moe: 10, burden30: 50, burden50: 20 };
  const types = {
    elderly_alone: 10,
    elderly_family: 5,
    small_family: 20,
    large_family: 5,
    other: 10,
  };
  return {
    renter_hh: 500,
    bands: {
      le30: { ...band },
      b30_50: { ...band, burden30: 30 },
      b50_80: { ...band, burden30: 10 },
      b80_100: { ...band, burden30: 5 },
      gt100: { ...band, burden30: 0 },
    },
    types: { le30: types, b30_50: types, b50_80: types, gt80: types },
    market: {
      asking_2br: 1500,
      asking_n: 30,
      asking_conf: 'high',
      acs_rent: 1100,
      acs_rent_moe: 50,
      zip: '15207',
      safmr_2br: 1400,
      value_acs: 150000,
      value_acs_moe: 1,
      value_nbr_acs: null,
      sale_median: null,
      sale_n: null,
      sale_nbr_median: null,
      sale_nbr_n: null,
    },
    stock: {
      sfd_share: 0.5,
      units_2_4_share: 0.2,
      units_5_19_share: 0.1,
      units_20plus_share: 0.1,
      vacancy_share: 0.1,
      parcels_2_4: 80,
      vacant_parcels: 150,
    },
    transit: {
      freq_share_qmi: 0.2,
      freq_dist_mi: 0.7,
      any_dist_mi: 0.1,
      departures_qmi: 300,
      departures_pct: null,
    },
    flood: { fema_sfha_pct: 0, fema_zone: null, hand_pct: 0 },
    zoning: {
      shares: { R1D: 0.6, R2: 0.2, P: 0.2 },
      by_type: {
        adu: 'conditional',
        duplex_triplex: 'yes',
        townhome: 'yes',
        small_apartment: 'no',
        senior: 'conditional',
      },
      verified: false,
    },
    programs: { qct: null, dda: null, oz: null, cdbg: null },
    displacement: { score: 0.5, conf: 'high' },
    ...over,
  };
}

describe('zoning table', () => {
  it('matches config/zoning_rules.json for ADUs and small apartments', () => {
    const cfg = JSON.parse(readFileSync(new URL('../../../../config/zoning_rules.json', import.meta.url), 'utf8'));
    for (const f of cfg.families) {
      expect(FAMILY_RULES[f.id], f.id).toEqual({
        adu: f.by_type.adu,
        small_apartment: f.by_type.small_apartment,
      });
    }
    expect(Object.keys(FAMILY_RULES).sort()).toEqual(cfg.families.map((f: { id: string }) => f.id).sort());
  });

  it('reproduces the published by-right status for every tract', () => {
    for (const [id, p] of placeById) {
      if (!p.zoning) continue;
      expect(statusFromShares(p.zoning.shares, 'adu'), id).toBe(p.zoning.by_type.adu);
      expect(statusFromShares(p.zoning.shares, 'small_apartment'), id).toBe(p.zoning.by_type.small_apartment);
    }
  });

  it('applies the 5% land rule after an override', () => {
    expect(statusFromShares({ R1D: 0.04, P: 0.96 }, 'adu', { R1D: 'yes' })).toBe('no');
    expect(statusFromShares({ R1D: 0.05, P: 0.95 }, 'adu', { R1D: 'yes' })).toBe('yes');
    expect(SMALL_APT_CONDITIONAL_FAMILIES.sort()).toEqual(['HC', 'NDI', 'NDO', 'R3']);
    expect([...RESIDENTIAL_FAMILIES]).toEqual(['R1D', 'R1A', 'R2', 'R3', 'RM']);
  });
});

describe('measures', () => {
  it('rent gap = usable asking − the 2BR rent that fits (3 persons, 30% of income ÷ 12)', () => {
    expect(fitsRent2br(HUD, 50)).toBe(1242); // 49,700 ÷ 40 = 1,242.5, half to even
    expect(fitsRent2br(HUD, 30)).toBe(745); // 29,800 ÷ 40
    expect(rentGap(place(), HUD, 50)).toBe(1500 - 1242);
    expect(rentGap(place(), HUD, 80)).toBe(1500 - 1988); // 79,500 ÷ 40 = 1,987.5 → 1,988: negative, the market fits
    const low = place({ market: { ...place().market, asking_conf: 'low' } });
    expect(rentGap(low, HUD, 50)).toBeNull();
  });

  it('burdened renters at or below 50% AMI add the two lowest bands', () => {
    expect(burdenedLe50(place())).toBe(80);
    const p = place();
    p.bands.b30_50.burden30 = null;
    expect(burdenedLe50(p)).toBeNull();
  });

  it('reads the access block null-safely', () => {
    expect(measureValue('jobs', place(), HUD, 50)).toBeNull();
    const p = {
      ...place(),
      access: { jobs_1mi: 4200, school_mi: 0.4, services_halfmi: 3 },
    } as PlaceMeasures;
    expect(measureValue('jobs', p, HUD, 50)).toBe(4200);
    expect(measureValue('school', p, HUD, 50)).toBe(0.4);
    expect(measureValue('services', p, HUD, 50)).toBe(3);
    expect(measureValue('transit', p, HUD, 50)).toBe(0.7);
    expect(measureValue('rent_gap', null, HUD, 50)).toBeNull();
  });

  it('median, need ranking, breaks and classes', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBeNull();
    const rows = [{ value: 1 }, { value: null }, { value: 3 }, { value: 2 }];
    expect(rankByNeed(rows, true).map((r) => r.value)).toEqual([3, 2, 1, null]);
    expect(rankByNeed(rows, false).map((r) => r.value)).toEqual([1, 2, 3, null]);
    const xs = Array.from({ length: 100 }, (_, i) => i);
    expect(quantileBreaks(xs, 5, 5)).toEqual([20, 40, 60, 80]);
    expect(classOf(19, [20, 40])).toBe(0);
    expect(classOf(20, [20, 40])).toBe(1);
    expect(classOf(99, [20, 40])).toBe(2);
  });

  it('the rent-gap legend keeps "already fits" in its own class', () => {
    const lg = buildLegend(measureById.get('rent_gap')!, [-100, -5, 0, 50, 100, 150, 200, 300, 400, 500]);
    expect(lg.classOf(-100)).toBe(0);
    expect(lg.classOf(0)).toBe(0);
    expect(lg.classOf(1)).toBe(1);
    expect(lg.items[0].label).toMatch(/already fits/);
    expect(lg.items.length).toBe(lg.colors.length);
    const jobs = buildLegend(measureById.get('jobs')!, [100, 1000, 5000, 20000, 60000]);
    // fewer jobs = more need = darker
    expect(jobs.colors[0]).toBe('#8f2d2a');
  });
});

describe('policy levers', () => {
  const rows = [
    { id: 'a', p: place() },
    {
      id: 'b',
      p: place({
        zoning: {
          shares: { P: 0.97, R1D: 0.03 },
          by_type: {
            adu: 'no',
            duplex_triplex: 'no',
            townhome: 'no',
            small_apartment: 'no',
            senior: 'no',
          },
          verified: false,
        },
      }),
    },
    {
      id: 'c',
      p: place({
        zoning: {
          shares: { R3: 0.3, RM: 0.02, P: 0.68 },
          by_type: {
            adu: 'conditional',
            duplex_triplex: 'yes',
            townhome: 'yes',
            small_apartment: 'conditional',
            senior: 'conditional',
          },
          verified: false,
        },
        transit: {
          freq_share_qmi: 0.6,
          freq_dist_mi: 0.2,
          any_dist_mi: 0.1,
          departures_qmi: 100,
          departures_pct: null,
        },
      }),
    },
  ];

  it('ADU by right: residential land at 5% or more turns ADUs to by right', () => {
    const r = aduByRight(rows, HUD);
    expect(r.before).toEqual([]);
    expect(r.changed).toEqual(['a', 'c']);
    // The Anti-displacement rules list ADUs whatever the zoning (zoning is an annotation, never a gate).
    expect(r.newlyRecommended).toEqual([]);
    expect(r.noteChanged).toEqual(['a', 'c']);
  });

  it('density bonus: conditional small-apartment districts go by right', () => {
    const r = densityBonus(rows);
    expect(r.changed).toEqual(['c']);
    const r60 = rent60TwoBedroom(HUD)!;
    expect(r60.limit60).toBe(59640);
    expect(r60.rent).toBe(1491);
    expect(r60.formula).toBe('$49,700 × 1.2 = $59,640 a year; $59,640 × 30% ÷ 12 = $1,491 a month');
    expect(bonusAffordableHomes(40)).toBe(4);
    expect(bonusAffordableHomes(12)).toBe(2);
  });

  it('voucher cost = max(0, asking − fits) × 12 × homes', () => {
    expect(gapCost('a', place(), HUD, 50, 40)!.cost).toBe((1500 - 1242) * 12 * 40);
    expect(gapCost('a', place(), HUD, 80, 40)!.cost).toBe(0);
    const g = largestGaps(rows, HUD, 50, 40, 2);
    expect(g.top.length).toBe(2);
    expect(g.total).toBe(2 * 258 * 12 * 40);
  });

  it('transit extension: within 1 mile counts as served', () => {
    expect(transitPasses(rows[2].p, 0.25)).toBe(true);
    expect(transitPasses(rows[0].p, 0.5)).toBe(false);
    expect(transitPasses(rows[0].p, 1)).toBe(true);
    const r = transitExtension(rows, 0.5);
    expect(r.before).toEqual(['c']);
    expect(r.changed).toEqual(['a', 'b']);
    expect(transitExtension(rows, 1).changed).toEqual([]);
  });

  it('runs on the real data when present', () => {
    if (!hud || placeById.size === 0) return;
    const real = [...placeById].map(([id, p]) => ({ id, p }));
    const r = aduByRight(real, hud);
    expect(r.changed.length).toBeGreaterThan(0);
    expect(transitExtension(real, 0.5).changed.every((id) => (placeById.get(id)!.transit.freq_dist_mi ?? 9) <= 1)).toBe(true);
  });
});

describe('rent-gap subsidy order', () => {
  it('funds the tracts where gap × burdened renters is largest', async () => {
    const { largestGaps } = await import('./policy');
    const { rankedTracts } = await import('../data');
    const { hud, placeById } = await import('../place/data');
    const rows = rankedTracts.filter((t) => placeById.has(t.GEOID)).map((t) => ({ id: t.GEOID, p: placeById.get(t.GEOID)! }));
    const g = largestGaps(rows, hud, 50, 40);
    for (let i = 1; i < g.top.length; i++) expect(g.top[i - 1].need).toBeGreaterThanOrEqual(g.top[i].need);
    expect(g.top.every((x) => x.gap > 0)).toBe(true);
    expect(g.total).toBe(g.top.reduce((s, x) => s + Math.max(0, x.gap) * 12 * 40, 0));
  });
});
