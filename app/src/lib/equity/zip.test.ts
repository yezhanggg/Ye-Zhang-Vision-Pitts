import { describe, expect, it } from 'vitest';
import type { HudTable } from '../place/types';
import { fits2br, measureById } from './measures';
import { hasZipData, parseZipFile, rankedZips, zipById, zipCoverage, zipFacts, zipName, zipValue, zipWords, type ZipRec } from './zip';

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

const rec = (over: Partial<ZipRec> = {}): ZipRec => ({
  hu: 1000,
  share: 0.9,
  tracts: ['42003000100', '42003000200'],
  edge: false,
  burdened: { '30': 100, '50': 150, '80': 180, '100': 20 },
  jobs: 5000,
  school: 0.4,
  transit: 0.3,
  services: 2.5,
  asking: 1800,
  ...over,
});

const FILE = new Map<string, ZipRec>([
  ['15001', rec()],
  ['15002', rec({ edge: true, share: 0.2, asking: null, jobs: null })],
  ['15003', rec({ hu: 0, tracts: [], burdened: { '30': null, '50': null, '80': null, '100': null }, jobs: null })],
]);

describe('zipValue', () => {
  it('reads each measure in the tract units', () => {
    expect(zipValue('burdened', '15001', 30, HUD, FILE)).toBe(100);
    expect(zipValue('burdened', '15001', 50, HUD, FILE)).toBe(150);
    expect(zipValue('burdened', '15001', 100, HUD, FILE)).toBe(20);
    expect(zipValue('jobs', '15001', 50, HUD, FILE)).toBe(5000);
    expect(zipValue('school', '15001', 50, HUD, FILE)).toBe(0.4);
    expect(zipValue('transit', '15001', 50, HUD, FILE)).toBe(0.3);
    expect(zipValue('services', '15001', 50, HUD, FILE)).toBe(2.5);
  });
  it('rent gap = the ZIP asking rent minus the same rent that fits as the tracts', () => {
    for (const ami of [30, 50, 80, 100] as const) expect(zipValue('rent_gap', '15001', ami, HUD, FILE)).toBe(1800 - fits2br(HUD, ami)!.rent);
    expect(zipValue('rent_gap', '15001', 50, null, FILE)).toBeNull();
  });
  it('drops a missing asking rent, missing values and ZIPs with no city homes', () => {
    expect(zipValue('rent_gap', '15002', 50, HUD, FILE)).toBeNull();
    expect(zipValue('jobs', '15002', 50, HUD, FILE)).toBeNull();
    expect(zipValue('burdened', '15003', 50, HUD, FILE)).toBeNull();
    expect(zipValue('school', '15003', 50, HUD, FILE)).toBeNull();
    expect(zipValue('school', '99999', 50, HUD, FILE)).toBeNull();
    const tiny = new Map([['15004', rec({ hu: 12 })]]);
    expect(zipValue('school', '15004', 50, HUD, tiny)).toBeNull();
    expect(zipCoverage('15004', tiny)).toBe('Only 12 city homes, not ranked');
  });
});

describe('labels and facts', () => {
  it('names edge ZIPs as their city part and says how each was built', () => {
    expect(zipName('15001', FILE)).toBe('ZIP 15001');
    expect(zipName('15002', FILE)).toBe('ZIP 15002 (city part)');
    expect(zipCoverage('15001', FILE)).toBe('1,000 city homes (90% of the ZIP) from 2 tracts');
    expect(zipWords("The typical tract's residents; 3 of 9 tracts; a tract")).toBe("The typical ZIP code's residents; 3 of 9 ZIP codes; a ZIP code");
  });
  it('facts name the level and keep the levers tract-based', () => {
    const f = zipFacts({ def: measureById.get('burdened')!, ami: 50, hud: HUD, selected: '15001', file: FILE });
    expect(f).toMatch(/ZIP codes \(ZCTAs\), not tracts/);
    expect(f).toMatch(/1\. ZIP 15001: 150 households/);
    expect(f).toMatch(/Selected ZIP ZIP 15001/);
    expect(f).toMatch(/computed for census tracts/);
  });
  it('parses the compact bundle and a missing or broken file', () => {
    const m = parseZipFile('{"z":{"15222":{"h":4187,"p":1,"t":[20300,241300],"b":[182,335,null,176],"j":85637,"s":0.26,"tr":0.1,"a":3009},"15260":{"h":0,"p":0}}}');
    const r = m.get('15222')!;
    expect(r.tracts).toEqual(['42003020300', '42003241300']);
    expect(r.burdened).toEqual({ '30': 182, '50': 335, '80': null, '100': 176 });
    expect([r.jobs, r.school, r.transit, r.services, r.asking, r.edge]).toEqual([85637, 0.26, 0.1, null, 3009, false]);
    expect(m.get('15260')!.edge).toBe(true);
    expect(zipValue('jobs', '15260', 50, HUD, m)).toBeNull();
    expect(parseZipFile(undefined).size).toBe(0);
    expect(parseZipFile('{').size).toBe(0);
  });
});

describe('bundled equity_zip.json', () => {
  it('has the city ZIPs with values in range', () => {
    if (!hasZipData) return;
    expect(rankedZips.length).toBeGreaterThan(20);
    for (const z of rankedZips) {
      const r = zipById.get(z)!;
      expect(r.hu).toBeGreaterThanOrEqual(25);
      expect(r.share).toBeLessThanOrEqual(1);
      expect(r.edge).toBe(r.share < 0.5);
      expect(r.tracts.every((t) => /^42003\d{6}$/.test(t))).toBe(true);
      if (r.school != null) expect(r.school).toBeLessThan(5);
    }
  });
});
