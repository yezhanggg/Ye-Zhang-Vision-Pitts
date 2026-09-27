import { describe, expect, it } from 'vitest';
import { ADVANCED, ANALYSIS_COPY, APP_STANCES, PRESET_NOTE, REFERENCE_LABEL, STANCE_MEANING, countWord, fitText, isStance, joinAnd, pointPair, pts, pts1, scorePair } from './copy';

describe('formatters', () => {
  it('points: whole numbers, one decimal under one point', () => {
    expect(pts(11.4)).toBe('11');
    expect(pts(0.52)).toBe('0.5');
    expect(pts(0.96)).toBe('1');
    expect(pts(-4.6)).toBe('5');
    expect(pts(0.001)).toBe('0');
    expect(pts1(2.25)).toBe('2.3');
    expect(pts1(1.0)).toBe('1');
    expect(pts1(0.5)).toBe('0.5');
  });
  it('a pair prints one decimal when both round to the same whole number', () => {
    expect(scorePair(0.702, 0.697)).toEqual(['70.2', '69.7']);
    expect(scorePair(0.745, 0.631)).toEqual(['75', '63']);
    expect(pointPair(12.04, 11.96)).toEqual(['12', '12']);
    expect(pointPair(12.24, 11.96)).toEqual(['12.2', '12.0']);
    expect(pointPair(40, 35)).toEqual(['40', '35']);
  });
  it('words and lists', () => {
    expect(countWord(5)).toBe('five');
    expect(countWord(12)).toBe('12');
    expect(joinAnd(['a'])).toBe('a');
    expect(joinAnd(['a', 'b'])).toBe('a and b');
    expect(joinAnd(['a', 'b', 'c'])).toBe('a, b and c');
  });
});

describe('copy', () => {
  it('labels the fit as a rank under the reader’s stance, without a number', () => {
    expect(fitText(0.744)).toBe('Best fit under your stance');
    expect(fitText(null)).toBe('No score');
  });
  it('offers four stances; Balanced stays a labeled reference', () => {
    expect([...APP_STANCES]).toEqual(['anti_displacement', 'market_led', 'transit_first', 'climate_resilient']);
    expect(isStance('balanced')).toBe(false);
    expect(isStance('market_led')).toBe(true);
    for (const s of APP_STANCES) expect(STANCE_MEANING[s]).toMatch(/\.$/);
    expect(REFERENCE_LABEL).toBe('Equal weights (reference)');
    expect(ADVANCED.title).toBe('Advanced: set your own weights');
  });
  it('says what the anti-displacement stance does and does not do', () => {
    expect(PRESET_NOTE.anti_displacement).toBe('Weights need and displacement risk most. It ranks building types and protects no one by itself; where risk is low it favors market-rate types.');
    expect(Object.keys(PRESET_NOTE)).toEqual(['balanced', 'anti_displacement', 'market_led', 'transit_first']);
  });
  it('writes ranks and words, never points or a share of runs', () => {
    expect(ANALYSIS_COPY.rank.ahead('ADU', 'Market strength', '1')).toBe('Ahead of ADU on Market strength');
    expect(ANALYSIS_COPY.rank.behind('ADU', 'Market strength', '1')).toBe('Behind ADU on Market strength');
    expect(ANALYSIS_COPY.chips.clear('11', 'ADU')).toBe('Clear lead');
    expect(ANALYSIS_COPY.chips.close('0.6', 'Senior housing')).toBe('Close call with Senior housing');
    expect(ANALYSIS_COPY.separator('Affordability need', '40', 'Small apartment', '35', 'Senior housing')).toBe('Affordability need is what separates them: it favors Small apartment over Senior housing.');
    expect(ANALYSIS_COPY.why.next('ADU', '40')).toBe('Next is ADU.');
    expect(ANALYSIS_COPY.why.closeSecond('ADU', '69.7', '70.3')).toBe('ADU is a very close second.');
    expect(ANALYSIS_COPY.why.tie(['ADU', 'Townhome'], '70')).toBe('ADU and Townhome score the same here. This is a tie, not a pick.');
    for (const s of Object.values(ANALYSIS_COPY.stability.words)) expect(s).not.toMatch(/\d/);
    expect(ANALYSIS_COPY.stability.words.solid).toBe('The order holds under small changes to the weights.');
    expect(ANALYSIS_COPY.stability.words.likely).toBe('The order is likely to hold.');
    expect(ANALYSIS_COPY.stability.words.close).toBe('A close call: a small change in the weights flips it.');
  });
  it('keeps the plural right', () => {
    expect(ANALYSIS_COPY.chips.need(1)).toBe('1 renter household at or below 50% AMI');
    expect(ANALYSIS_COPY.why.unranked('Bluff', 0, 25)).toBe('Bluff has 0 households, fewer than 25, so it is shown but not ranked.');
  });
});
