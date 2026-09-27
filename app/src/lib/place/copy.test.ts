import { describe, expect, it } from 'vitest';
import { targetBand } from './bands';
import {
  DECIDE, REFUSES, RULES_IN_WORDS, SOURCE_LINES, STANCE_CAVEAT, STANCE_MEANING, affordabilitySentence, affordabilityTable, displacementSentence,
  floodSentence, marketSentence, programsLine, transitSentence, whoLivesHereSentence, zoningLine,
} from './copy';
import { FIXTURE_HUD as hud, HAZELWOOD, HOMEWOOD_NORTH, NULL_PLACE, SQUIRREL_HILL_NORTH, ZERO_PLACE } from './fixture';
import { fmtDollars, fmtEst, fmtEstMoe, fmtMiles, fmtShare, moeFlag } from './format';
import { THRESHOLDS } from './thresholds';

describe('formats', () => {
  it('dollars, shares, miles, ± at half the estimate', () => {
    expect(fmtDollars(1243)).toBe('$1,243');
    expect(fmtDollars(null)).toBe('not available');
    expect(fmtShare(0.654)).toBe('65%');
    expect(fmtMiles(0.21)).toBe('0.21 miles');
    expect(moeFlag(435, 171)).toBe(false);
    expect(moeFlag(155, 95)).toBe(true);
    expect(fmtEst(435, 171)).toBe('435');
    expect(fmtEst(155, 95)).toBe('155 ±95');
    expect(fmtEstMoe(435, 171)).toBe('435 ±171');
    expect(fmtEst(null, null)).toBe('not available');
  });
});

describe('stance words and fixed sentences', () => {
  it('one meaning per stance, the anti-displacement caveat, the fixed decide line, the refusals', () => {
    expect(Object.keys(STANCE_MEANING)).toEqual(['anti_displacement', 'market_led', 'transit_first', 'climate_resilient']);
    expect(STANCE_CAVEAT.anti_displacement).toContain('where risk is low it favors market-rate types');
    expect(DECIDE).toBe('This page does not choose. Site, scale, sponsor, financing, zoning relief and the neighborhood plan are decisions for people; the tool shows the evidence and the arithmetic.');
    expect(REFUSES).toContain('whether a project pencils');
    expect(REFUSES).toContain('verified zoning');
    expect(REFUSES.length).toBe(8);
    expect(RULES_IN_WORDS.join(' ')).toContain(String(THRESHOLDS.displacement_high));
    expect(SOURCE_LINES.A).toContain('HUD CHAS 2018–22 Table 8');
    expect(SOURCE_LINES.A).toContain('HUD FY2026 income limits');
  });
});

describe('block A', () => {
  it('Hazelwood sentence and table', () => {
    const s = affordabilitySentence(HAZELWOOD, targetBand(HAZELWOOD));
    expect(s).toBe('720 renter households live here. 435 earn at most 30% of area median income; 350 of them pay more than 30% of income and 280 pay more than half.');
    const rows = affordabilityTable(HAZELWOOD, hud);
    expect(rows.map((r) => r.hhText)).toEqual(['435 ±171', '155 ±95', '100 ±73', '10 ±15', '25 ±30']);
    expect(rows.map((r) => r.limitText)).toEqual(['up to $33,100', 'up to $55,200', 'up to $88,300', 'up to $110,400', 'above $110,400']);
    expect(rows.map((r) => r.flagged)).toEqual([false, true, true, true, true]);
  });
  it('Squirrel Hill North: the 30–50% band with ±', () => {
    const s = affordabilitySentence(SQUIRREL_HILL_NORTH, targetBand(SQUIRREL_HILL_NORTH));
    expect(s).toContain('115 ±66 earn at most 50% of area median income; 110 of them pay more than 30% of income and 100 pay more than half.');
  });
  it('a zero-renter tract and a tract with renters but no burden', () => {
    expect(affordabilitySentence(ZERO_PLACE, targetBand(ZERO_PLACE))).toBe('CHAS counts no renter households here.');
    const p = structuredClone(ZERO_PLACE);
    p.renter_hh = 40;
    p.bands.gt100.hh = 40;
    expect(affordabilitySentence(p, targetBand(p))).toBe('40 renter households live here. CHAS counts none of them paying more than 30% of income, in any band.');
    expect(zoningLine(ZERO_PLACE)).toContain('Zoning here: RIV 51%, GI 28%, H 21%');
  });
  it('nulls', () => {
    expect(affordabilitySentence(NULL_PLACE, targetBand(NULL_PLACE))).toContain('not available');
    expect(affordabilityTable(NULL_PLACE, null).every((r) => r.hhText === 'not available' && r.limitText === 'not available')).toBe(true);
  });
});

describe('blocks B–F', () => {
  it('who lives here', () => {
    expect(whoLivesHereSentence(HAZELWOOD)).toBe('Of the 590 renters at or below 50% AMI, 260 are seniors (200 living alone), 210 small families, 10 large families, 110 other.');
    expect(whoLivesHereSentence(NULL_PLACE)).toContain('not available');
  });
  it('market rent and home values', () => {
    const s = marketSentence(HAZELWOOD);
    expect(s).toContain('Listings ask $1,150 for a 2-bedroom (66 listings, high confidence); residents pay a median $644 ±271 (census, includes subsidized homes).');
    expect(s).toContain('Fair Market Rent for ZIP 15207: $1,350 for a 2-bedroom.');
    expect(s).toContain('Median home value $89,100; next door $261,000.');
    expect(s).toContain('Sales since 2023: not available.');
    expect(marketSentence(HOMEWOOD_NORTH)).toContain('Sales since 2023: median $45,000 (13 sales); next door $130,000 (40 sales).');
    expect(marketSentence(NULL_PLACE)).toContain('not available');
  });
  it('transit', () => {
    expect(transitSentence(HAZELWOOD)).toBe('65% of residents live within a quarter mile of a frequent stop (one bus or T every 15 minutes or better); the nearest frequent stop is 0.21 miles; 650 weekday departures within a quarter mile.');
    expect(transitSentence(NULL_PLACE)).toContain('not available');
  });
  it('flood', () => {
    expect(floodSentence(HOMEWOOD_NORTH)).toContain('Flood: minor. FEMA maps 1.9% of the land in a flood zone.');
    expect(floodSentence(HOMEWOOD_NORTH)).toContain('Terrain screen reads 31.8% low-lying (medium confidence).');
  });
  it('zoning and programs stay two lines', () => {
    const z = zoningLine(HAZELWOOD);
    expect(z).toContain('Zoning here: P 45%, RIV-GI 12%');
    expect(z).toContain('by right: duplex / triplex, townhome and small apartment');
    expect(z).toContain('conditional: ADU and senior housing');
    expect(z).toContain('(unverified: confirm in Title 9)');
    expect(zoningLine(NULL_PLACE)).toBe('Zoning: not checked by this tool.');
    expect(programsLine(HAZELWOOD)).toBe('Programs: QCT yes · DDA no · Opportunity Zone yes · CDBG yes');
    expect(programsLine(NULL_PLACE)).toBe('Programs: QCT not available · DDA not available · Opportunity Zone not available · CDBG not available');
  });
  it('displacement', () => {
    expect(displacementSentence(HAZELWOOD)).toBe('Displacement risk score 0.72 (high; marks at 0.33 and 0.67; medium confidence).');
    expect(displacementSentence(NULL_PLACE)).toContain('not available');
  });
});
