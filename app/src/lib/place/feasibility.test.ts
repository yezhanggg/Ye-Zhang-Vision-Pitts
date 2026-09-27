import { describe, expect, it } from 'vitest';
import { floodNote, floodWord, lotPattern, zoningNote, zoningSharesText, ZONING_NOT_CHECKED } from './feasibility';
import { HAZELWOOD, HOMEWOOD_NORTH, NULL_PLACE, SQUIRREL_HILL_NORTH, ZERO_PLACE } from './fixture';

describe('lotPattern', () => {
  it('Hazelwood: 6% in 2–4 unit buildings (infill-scale), 640 vacant parcels (new build without demolition)', () => {
    const l = lotPattern(HAZELWOOD);
    expect(l.smallBuildings).toBe(false);
    expect(l.vacantLand).toBe(true);
    expect(l.infillOnly).toBe(false);
    expect(l.additive).toEqual(['townhome', 'small_apartment', 'senior']);
    expect(l.notes[0]).toContain('6% of homes are in 2–4 unit buildings (the mark is 10%)');
    expect(l.notes[0]).toContain('2–4 unit parcels not counted');
    expect(l.notes[1]).toContain('640 vacant parcels (the mark is 100)');
  });
  it('Homewood North: 82 parcels carry the small-building rule; 1,008 vacant parcels', () => {
    const l = lotPattern(HOMEWOOD_NORTH);
    expect(l.smallBuildings).toBe(true);
    expect(l.additive).toEqual(['adu', 'duplex_triplex', 'townhome', 'small_apartment', 'senior']);
    expect(l.notes[1]).toContain('1,008 vacant parcels');
  });
  it('Squirrel Hill North: 29% in 2–4 unit buildings, 34 vacant parcels → infill only', () => {
    const l = lotPattern(SQUIRREL_HILL_NORTH);
    expect(l.additive).toEqual(['adu', 'duplex_triplex']);
    expect(l.infillOnly).toBe(true);
    expect(l.notes[1]).toContain('infill only');
  });
  it('nulls: nothing additive, infill only, notes say not available', () => {
    const l = lotPattern(NULL_PLACE);
    expect(l.additive).toEqual([]);
    expect(l.infillOnly).toBe(true);
    expect(l.notes.join(' ')).toContain('not available');
    expect(lotPattern({} as never).additive).toEqual([]);
  });
});

describe('floodNote', () => {
  it('words from the FEMA share', () => {
    expect(floodWord(0)).toBe('none');
    expect(floodWord(1.9)).toBe('minor');
    expect(floodWord(9.6)).toBe('moderate');
    expect(floodWord(15)).toBe('moderate');
    expect(floodWord(15.1)).toBe('high');
    expect(floodWord(null)).toBe('unknown');
  });
  it('Hazelwood: moderate 9.6%, terrain 17.1%, no site check', () => {
    const f = floodNote(HAZELWOOD);
    expect(f.word).toBe('moderate');
    expect(f.checkSite).toBe(false);
    expect(f.sentence).toContain('9.6%');
    expect(f.sentence).toContain('Terrain screen reads 17.1% low-lying (medium confidence)');
  });
  it('Homewood North: FEMA 1.9% minor beside HAND 31.8%', () => {
    const f = floodNote(HOMEWOOD_NORTH);
    expect(f.word).toBe('minor');
    expect(f.sentence).toContain('1.9%');
    expect(f.sentence).toContain('31.8%');
  });
  it('Squirrel Hill North: none', () => {
    expect(floodNote(SQUIRREL_HILL_NORTH).word).toBe('none');
    expect(floodNote(SQUIRREL_HILL_NORTH).sentence).toContain('no flood zone');
  });
  it('check the site above 15%', () => {
    const p = structuredClone(HAZELWOOD);
    p.flood.fema_sfha_pct = 22.5;
    const f = floodNote(p);
    expect(f.word).toBe('high');
    expect(f.checkSite).toBe(true);
    expect(f.sentence).toContain('check the site');
  });
  it('nulls read not available', () => {
    const f = floodNote(NULL_PLACE);
    expect(f.word).toBe('unknown');
    expect(f.checkSite).toBe(false);
    expect(f.sentence).toContain('not available');
  });
});

describe('zoningNote', () => {
  it('always suffixed unverified when zoning exists', () => {
    for (const t of ['adu', 'duplex_triplex', 'townhome', 'small_apartment', 'senior'] as const) {
      expect(zoningNote(HAZELWOOD, t).sentence).toMatch(/\(unverified: confirm in Title 9\)$/);
    }
    expect(zoningNote(HAZELWOOD, 'duplex_triplex').status).toBe('yes');
    expect(zoningNote(HAZELWOOD, 'adu').status).toBe('conditional');
    expect(zoningNote(HAZELWOOD, 'adu').sentence).toContain('conditional use');
  });
  it('not checked when zoning is null, without the suffix', () => {
    const z = zoningNote(NULL_PLACE, 'adu');
    expect(z.status).toBe('not_checked');
    expect(z.sentence).toBe(ZONING_NOT_CHECKED);
    expect(z.sentence).not.toContain('unverified');
  });
  it('district shares as whole percents, largest first, whether stored as percents or fractions', () => {
    expect(zoningSharesText(HAZELWOOD)).toBe('P 45%, RIV-GI 12%, R1A-H 10%, H 10%, R1D-M 7%, RM-M 7%');
    expect(zoningSharesText(ZERO_PLACE)).toBe('RIV 51%, GI 28%, H 21%, GT 0%, PLANNED 0%');
    expect(zoningSharesText(NULL_PLACE)).toBeNull();
    expect(zoningNote(ZERO_PLACE, 'adu').status).toBe('unknown');
    expect(zoningNote(ZERO_PLACE, 'adu').sentence).toContain('no rule on file');
  });
});
