import { describe, expect, it } from 'vitest';
import { prng } from '../scoring';
import type { Weights } from '../types';
import { ANALYSIS_COPY as C } from './copy';
import {
  CLOSE,
  EPS_LIFT,
  TIE,
  factorGaps,
  guardChips,
  needGuard,
  needSentence,
  pickCounts,
  rankLine,
  rationale,
  reasonsFor,
  resultWith,
  scoredOn,
  separator,
  separatorSentence,
  tiedWith,
  valuePhrase,
  whySentence,
} from './rationale';
import { CFG, FACTORS, cfgOf, flatTract, ones, part, resultOf, tractOf } from './testkit';

const W = ones();

describe('valuePhrase', () => {
  it('words the value, never the fit direction', () => {
    expect(valuePhrase('flood_exposure', 0.98, CFG)).toBe('a lot of flood-prone land');
    expect(valuePhrase('flood_exposure', 0.1, CFG)).toBe('little flood-prone land');
    expect(valuePhrase('market_strength', 0.9, CFG)).toBe('a strong housing market');
    expect(valuePhrase('market_strength', 0.2, CFG)).toBe('a weaker housing market');
  });
  it('grades subsidy eligibility in three steps, and falls back to the label for an unknown factor', () => {
    expect(valuePhrase('subsidy_eligible', 1, CFG)).toBe(C.subsidy.full);
    expect(valuePhrase('subsidy_eligible', 0.5, CFG)).toBe(C.subsidy.partial);
    expect(valuePhrase('subsidy_eligible', 0, CFG)).toBe(C.subsidy.none);
    const flag = cfgOf(FACTORS, undefined, undefined, { factor_options: { subsidy: { mode: 'flag' } } });
    expect(valuePhrase('subsidy_eligible', 1, flag)).toBe('subsidy eligibility');
    const odd = cfgOf(['need', 'walk_score'], { a: { need: 1, walk_score: 1 } }, [['a', 'A']]);
    expect(valuePhrase('walk_score', 0.9, odd)).toBe('walk score');
  });
});

describe('reasonsFor: the direction rule in all four quadrants', () => {
  // Townhome's fit row: market +1, flood −1, subsidy +0.1 (graded), the rest near-neutral here.
  it('d = −1 & x = .98 → despite; d = +1 & x = .2 → despite', () => {
    const t = flatTract(0.5, { flood_exposure: 0.98, market_strength: 0.2 });
    const { because, despite } = reasonsFor(resultWith(t, W, CFG), 'townhome', undefined, CFG);
    expect(because).toEqual([]);
    expect(despite.map((r) => [r.factor, r.phrase])).toEqual([
      ['flood_exposure', 'a lot of flood-prone land'],
      ['market_strength', 'a weaker housing market'],
    ]);
    for (const r of despite) expect(r.lift).toBeLessThan(-EPS_LIFT);
  });
  it('d = −1 & x = .1 → because; d = +1 & x = .9 → because', () => {
    const t = flatTract(0.5, { flood_exposure: 0.05, market_strength: 0.9 });
    const { because, despite } = reasonsFor(resultWith(t, W, CFG), 'townhome', undefined, CFG);
    expect(despite).toEqual([]);
    expect(because.map((r) => [r.factor, r.phrase])).toEqual([
      ['flood_exposure', 'little flood-prone land'],
      ['market_strength', 'a strong housing market'],
    ]);
    for (const r of because) expect(r.lift).toBeGreaterThan(EPS_LIFT);
  });
  it('a graded subsidy at exactly .5 has lift 0 and lands in neither list', () => {
    const t = flatTract(0.5, { subsidy_eligible: 0.5, need: 0.9 });
    const r = resultWith(t, W, CFG);
    for (const k of ['small_apartment', 'senior']) {
      const { because, despite } = reasonsFor(r, k, undefined, CFG);
      expect([...because, ...despite].some((x) => x.factor === 'subsidy_eligible')).toBe(false);
    }
    const full = reasonsFor(resultWith(flatTract(0.5, { subsidy_eligible: 1 }), W, CFG), 'senior', undefined, CFG);
    expect(full.because[0]).toMatchObject({ factor: 'subsidy_eligible', phrase: C.subsidy.full });
    const none = reasonsFor(resultWith(flatTract(0.5, { subsidy_eligible: 0 }), W, CFG), 'senior', undefined, CFG);
    expect(none.despite[0]).toMatchObject({ factor: 'subsidy_eligible', phrase: C.subsidy.none });
  });
  it('sorts by lift and honours the caps', () => {
    const t = flatTract(0.5, { market_strength: 0.95, flood_exposure: 0.05, transit_access: 0.9, displacement_risk: 0.9 });
    const all = reasonsFor(resultWith(t, W, CFG), 'townhome', undefined, CFG);
    expect(all.because.length).toBe(3);
    expect(all.because[0].lift).toBeGreaterThanOrEqual(all.because[1].lift);
    expect(all.despite.map((r) => r.factor)).toEqual(['displacement_risk']);
    const capped = reasonsFor(resultWith(t, W, CFG), 'townhome', { because: 2, despite: 0 }, CFG);
    expect(capped.because.length).toBe(2);
    expect(capped.despite.length).toBe(0);
  });
});

describe('separator', () => {
  it('per-factor deltas sum to the score margin, and the separator is the largest in favor of the top', () => {
    const t = tractOf({ need: 0.85, market_strength: 0.3, displacement_risk: 0.7, subsidy_eligible: 1, transit_access: 0.9, flood_exposure: 0.2, senior_demand: 0.4, small_multifamily_stock: 0.6 });
    const r = resultWith(t, W, CFG);
    const [a, b] = r.ranking;
    const gaps = factorGaps(r, a, b);
    const sa = r.scores.find((s) => s.typology === a)!.score as number, sb = r.scores.find((s) => s.typology === b)!.score as number;
    expect(gaps.reduce((s, g) => s + g.delta, 0)).toBeCloseTo((sa - sb) * 100, 9);
    expect(gaps.length).toBe(FACTORS.length);
    const sep = separator(r, a, b)!;
    expect(sep.factor).toBe(gaps[0].factor);
    expect(sep.delta).toBeGreaterThan(0);
    expect(gaps.every((g) => g.delta <= sep.delta)).toBe(true);
  });
  it('is null when nothing favors a, or a side is unscored', () => {
    const r = resultOf([
      ['a', 0.6, [part('need', 0.6, 1, 0.6, 0.1)]],
      ['b', 0.6, [part('need', 0.6, 1, 0.6, 0.1)]],
      ['c', null],
    ]);
    expect(separator(r, 'a', 'b')).toBeNull();
    expect(separator(r, 'a', 'c')).toBeNull();
  });
});

describe('scoredOn and needGuard', () => {
  it('counts 7 of 8 with one null value, and lists what is missing and what is off', () => {
    const t = flatTract(0.5, { market_strength: null });
    expect(scoredOn(t, W, CFG)).toEqual({ n: 7, m: 8, missing: ['market_strength'], off: [] });
    expect(scoredOn(t, { ...W, transit_access: 0 }, CFG)).toEqual({ n: 6, m: 8, missing: ['market_strength'], off: ['transit_access'] });
    expect(scoredOn(t, {}, CFG).off.length).toBe(8);
  });
  it('guards at 0 and 24, not at 25, and not without a count', () => {
    expect(needGuard(tractOf({}, { need_count: 0 }))).toEqual({ count: 0, low: true });
    expect(needGuard(tractOf({}, { need_count: 24 }))).toEqual({ count: 24, low: true });
    expect(needGuard(tractOf({}, { need_count: 25 }))).toEqual({ count: 25, low: false });
    expect(needGuard(tractOf({}, { need_count: null }))).toEqual({ count: null, low: false });
    expect(needSentence(rationale(tractOf({}, { need_count: 0 }), resultOf([]), W, CFG))).toBe(C.why.needGuard(0));
    expect(C.why.needGuard(0)).toMatch(/^No renter households here earn 50% of the area median income or less/);
    expect(C.why.needGuard(8)).toBe('Only 8 renter households here earn 50% of the area median income or less, so a match for low-income renters says little about this tract.');
  });
});

describe('rationale states', () => {
  const t = tractOf({}, { neighborhood: 'Hazelwood' });
  it('tie at a margin of .004, close at .006, clear at .03', () => {
    const mk = (s2: number) => resultOf([['small_apartment', 0.704], ['senior', s2], ['townhome', 0.5]]);
    const tie = rationale(t, mk(0.7), W, CFG);
    expect(tie.state).toBe('tie');
    expect(tie.tied).toEqual(['small_apartment', 'senior']);
    expect(tie.separator).toBeNull();
    expect(tiedWith(mk(0.7), TIE)).toEqual(['small_apartment', 'senior']);
    expect(tiedWith(mk(0.69))).toEqual([]);
    expect(whySentence(t, tie, CFG)).toBe('Small apartment and Senior housing score the same here. This is a tie, not a pick.');
    expect(separatorSentence(tie, CFG)).toBeNull();
    expect(rankLine(mk(0.7), 'small_apartment', tie, CFG)).toBe('Tied with Senior housing');
    expect(rankLine(mk(0.7), 'senior', tie, CFG)).toBe('Tied with Small apartment');
    expect(rationale(t, mk(0.698), W, CFG).state).toBe('close');
    expect(rationale(t, mk(0.704 - CLOSE - 0.001), W, CFG).state).toBe('clear');
  });
  it('zero weights: nothing is ranked, and the sentence says why', () => {
    const zero: Weights = ones(FACTORS, 0);
    const ra = rationale(flatTract(0.7), resultWith(flatTract(0.7), zero, CFG), zero, CFG);
    expect(ra.state).toBe('zero_weights');
    expect(ra.scored.off.length).toBe(8);
    expect(whySentence(t, ra, CFG)).toBe('Every factor is set to zero, so nothing can be ranked. Turn at least one factor up, or pick a stance.');
    expect(rankLine(resultOf([]), 'adu', ra, CFG)).toBe('');
    expect(guardChips(ra, CFG).find((c) => c.id === 'lead')).toBeUndefined();
  });
  it('single factor: a tie among the types with a rule for it, the rest unscored', () => {
    const w: Weights = { ...ones(FACTORS, 0), need: 1 };
    const tr = tractOf({ need: 0.8 }, { neighborhood: 'Oakland' });
    const r = resultWith(tr, w, CFG);
    const ra = rationale(tr, r, w, CFG);
    expect(ra.singleFactor).toBe('need');
    expect(ra.state).toBe('tie');
    expect(ra.unscored).toEqual(['townhome']);
    expect(ra.tied.sort()).toEqual(['adu', 'duplex_triplex', 'senior', 'small_apartment']);
    const s = whySentence(tr, ra, CFG);
    expect(s).toContain('score the same here. This is a tie, not a pick.');
    expect(s).toContain('Only Affordability need is switched on, so each score is just this place\'s rank on it. Turn on one more factor to tell the types apart.');
    expect(rankLine(r, 'townhome', ra, CFG)).toBe('Townhome: not scored. It has no fit rule for the factors switched on.');
  });
  it('single factor by data: several switched on, one with a value here', () => {
    const w: Weights = { ...ones(FACTORS, 0), need: 1, market_strength: 1 };
    const tr = tractOf({ need: 0.8, market_strength: null });
    const ra = rationale(tr, resultWith(tr, w, CFG), w, CFG);
    expect(ra.singleFactor).toBe('need');
    expect(whySentence(tr, ra, CFG)).toContain('Of the factors switched on, only Affordability need has data here');
  });
  it('no data on the factors switched on', () => {
    const w: Weights = { ...ones(FACTORS, 0), market_strength: 1 };
    const tr = tractOf({ need: 0.8, market_strength: null });
    const ra = rationale(tr, resultWith(tr, w, CFG), w, CFG);
    expect(ra.state).toBe('no_data');
    expect(whySentence(tr, ra, CFG)).toBe('Testville has no data for Market strength, so no housing type can be ranked. Turn on a factor that has data here.');
  });
  it('unranked: the household count and the rule', () => {
    const park = tractOf({}, { residential: false, households: 0, neighborhood: 'Squirrel Hill South', name: 'Tract 9803' });
    const ra = rationale(park, resultWith(park, W, CFG), W, CFG);
    expect(ra.state).toBe('unranked');
    expect(whySentence(park, ra, CFG)).toBe('Squirrel Hill South has 0 households, fewer than 25, so it is shown but not ranked.');
    expect(whySentence(tractOf({}, { residential: false, households: 1 }), ra, CFG)).toBe('Testville has 1 household, fewer than 25, so it is shown but not ranked.');
    expect(whySentence(tractOf({}, { residential: false, households: null }), ra, CFG)).toBe('Testville has fewer than 25 households, so it is shown but not ranked.');
    expect(guardChips(ra, CFG)).toEqual([]);
  });
});

describe('sentences from a hand-written close result (70.3 against 69.7, never printed)', () => {
  const t = flatTract(0.5, { neighborhood: 'Hazelwood', need_count: 590 });
  const r = resultOf([
    ['small_apartment', 0.703, [part('need', 0.8, 1, 0.4, 0.15), part('flood_exposure', 0.9, -0.5, 0.303, -0.2)]],
    ['senior', 0.697, [part('need', 0.8, 0.3, 0.35, 0.05), part('flood_exposure', 0.9, -1, 0.347, -0.25)]],
    ['townhome', 0.4, [part('need', 0.8, 0, 0, 0), part('flood_exposure', 0.9, -1, 0.4, -0.3)]],
    ['adu', null],
  ]);
  const ra = rationale(t, r, W, CFG);
  it('is a close call with one decimal on both scores', () => {
    expect(ra.state).toBe('close');
    expect(whySentence(t, ra, CFG)).toBe(
      'Small apartment fits Hazelwood best under your stance because this place has many low-income renters, despite a lot of flood-prone land. Senior housing is a very close second.',
    );
  });
  it('names the separating factor in words, the points staying in the tooltips', () => {
    expect(ra.separator).toMatchObject({ factor: 'need' });
    expect(ra.separator!.delta).toBeCloseTo(5, 9);
    expect(separatorSentence(ra, CFG)).toBe('Affordability need is what separates them: it favors Small apartment over Senior housing.');
  });
  it('rank lines: #1 ahead, #2 behind on the same factor (no points), #3 helped and held, unscored named', () => {
    expect(rankLine(r, 'small_apartment', ra, CFG)).toBe('Ahead of Senior housing on Affordability need');
    expect(rankLine(r, 'senior', ra, CFG)).toBe('Behind Small apartment on Affordability need');
    expect(rankLine(r, 'townhome', ra, CFG)).toBe('Held back by a lot of flood-prone land');
    expect(rankLine(r, 'adu', ra, CFG)).toBe('ADU: not scored. It has no fit rule for the factors switched on.');
  });
  it('guard chips: scored, need, lead', () => {
    const chips = guardChips(ra, CFG);
    expect(chips.map((c) => c.text)).toEqual(['Scored on 8 of 8 factors', '590 renter households at or below 50% AMI', 'Close call with Senior housing']);
    expect(chips.map((c) => c.tone)).toEqual(['neutral', 'neutral', 'neutral']);
    const short = guardChips(rationale(flatTract(0.5, { market_strength: null, need_count: 8 }), r, W, CFG), CFG);
    expect(short[0]).toMatchObject({ text: 'Scored on 7 of 8 factors', tone: 'warn', detail: 'No data here: Market strength.' });
    expect(short[1]).toMatchObject({ text: '8 renter households at or below 50% AMI', tone: 'alert' });
  });
});

describe('clear and no-reason sentences', () => {
  it('clear: two reasons, one despite, then the runner-up', () => {
    const t = tractOf({ need: 0.2, market_strength: 0.95, displacement_risk: 0.2, subsidy_eligible: 0, transit_access: 0.5, flood_exposure: 0.05, senior_demand: 0.5, small_multifamily_stock: 0.5 }, { neighborhood: 'Squirrel Hill North' });
    const r = resultWith(t, W, CFG);
    const ra = rationale(t, r, W, CFG);
    expect(ra.state).toBe('clear');
    expect(ra.top).toBe('townhome');
    const s = whySentence(t, ra, CFG);
    expect(s).toMatch(/^Townhome fits Squirrel Hill North best under your stance because this place has .+ and .+, despite no subsidy designation\. Next is .+\.$/);
    expect(s).toContain('a strong housing market');
    expect(separatorSentence(ra, CFG)).toMatch(/^.+ is what separates them: it favors Townhome over .+\.$/);
  });
  it('no reason stands out: the least penalized of the types', () => {
    const r = resultOf([
      ['townhome', 0.5, [part('need', 0.5, 0, 0, 0), part('flood_exposure', 0.5, -1, 0.5, 0)]],
      ['adu', 0.4, [part('need', 0.5, 0.3, 0.1, 0), part('flood_exposure', 0.5, -0.8, 0.3, -0.1)]],
    ]);
    const t = tractOf({}, { neighborhood: 'Bluff' });
    const ra = rationale(t, r, W, cfgOf(FACTORS, undefined, [['townhome', 'Townhome'], ['adu', 'ADU']]));
    expect(ra.because).toEqual([]);
    expect(whySentence(t, ra, cfgOf(FACTORS, undefined, [['townhome', 'Townhome'], ['adu', 'ADU']]))).toBe(
      'Townhome fits Bluff best under your stance, though no single factor stands out. It is the least penalized of the two types here. Next is ADU.',
    );
  });
  it('one type scored: no runner-up, says so', () => {
    const w: Weights = { ...ones(FACTORS, 0), senior_demand: 1 };
    const t = tractOf({ senior_demand: 0.9 });
    const ra = rationale(t, resultWith(t, w, CFG), w, CFG);
    expect(ra.top).toBe('senior');
    expect(ra.second).toBeNull();
    expect(ra.unscored.length).toBe(4);
    expect(whySentence(t, ra, CFG)).toBe(
      'Senior housing fits Testville best under your stance because this place has many residents aged 65 or older. No other type has a fit rule for the factors switched on. Only Residents 65 and over is switched on, so each score is just this place\'s rank on it. Turn on one more factor to tell the types apart.',
    );
  });
});

describe('pickCounts', () => {
  it('counts every top pick and how many of them are ties', () => {
    const results = new Map([
      ['1', resultOf([['townhome', 0.7], ['adu', 0.5]])],
      ['2', resultOf([['townhome', 0.7], ['adu', 0.698]])],
      ['3', resultOf([['senior', 0.6], ['adu', 0.58]])],
      ['4', resultOf([])],
    ]);
    expect(pickCounts(results)).toEqual({ counts: { townhome: 2, senior: 1 }, ties: 1 });
  });
});

describe('property: no sentence puts a non-positive-lift phrase after "because" or a positive one after "despite"', () => {
  it('holds over 400 random tracts and weight sets', () => {
    const rng = prng(2026);
    const stops = Array.from({ length: 41 }, (_, i) => i / 10);
    let sentencesWithBecause = 0;
    for (let n = 0; n < 400; n++) {
      const values: Record<string, number | null> = {};
      for (const f of FACTORS) values[f] = rng() < 0.1 ? null : f === 'subsidy_eligible' ? [0, 0.5, 1][Math.floor(rng() * 3)] : Math.round(rng() * 100) / 100;
      const w: Weights = Object.fromEntries(FACTORS.map((f) => [f, rng() < 0.15 ? 0 : stops[Math.floor(rng() * stops.length)]]));
      const t = tractOf(values, { need_count: Math.floor(rng() * 800) });
      const r = resultWith(t, w, CFG);
      const ra = rationale(t, r, w, CFG);
      const s = whySentence(t, ra, CFG);
      if (ra.top) {
        const top = r.scores.find((x) => x.typology === ra.top)!;
        const bad = top.parts.filter((p) => p.lift <= EPS_LIFT).map((p) => valuePhrase(p.factor, p.x, CFG));
        const good = top.parts.filter((p) => p.lift > EPS_LIFT).map((p) => valuePhrase(p.factor, p.x, CFG));
        const at = s.indexOf(' because this place has ');
        if (at >= 0) {
          sentencesWithBecause++;
          const rest = s.slice(at + ' because this place has '.length);
          const cut = rest.indexOf(', despite ');
          const because = cut >= 0 ? rest.slice(0, cut) : rest.slice(0, rest.indexOf('. ') >= 0 ? rest.indexOf('. ') : rest.length);
          for (const phrase of bad) expect(because, s).not.toContain(phrase);
          if (cut >= 0) {
            const despite = rest.slice(cut + ', despite '.length, rest.indexOf('. ', cut) >= 0 ? rest.indexOf('. ', cut) : rest.length);
            for (const phrase of good) expect(despite, s).not.toContain(phrase);
          }
        }
        for (const x of ra.because) expect(x.lift).toBeGreaterThan(EPS_LIFT);
        for (const x of ra.despite) expect(x.lift).toBeLessThan(-EPS_LIFT);
        // rank lines: "Helped by" names a positive-lift phrase of that type, "held back by" a negative one
        for (const k of r.ranking) {
          const line = rankLine(r, k, ra, CFG);
          const parts = r.scores.find((x) => x.typology === k)!.parts;
          const m = /^(?:Helped by (.+?))?(?:; )?(?:[Hh]eld back by (.+))?$/.exec(line);
          if (m && (m[1] || m[2])) {
            if (m[1]) expect(parts.some((p) => p.lift > EPS_LIFT && valuePhrase(p.factor, p.x, CFG) === m[1]), line).toBe(true);
            if (m[2]) expect(parts.some((p) => p.lift < -EPS_LIFT && valuePhrase(p.factor, p.x, CFG) === m[2]), line).toBe(true);
          }
        }
      }
    }
    expect(sentencesWithBecause).toBeGreaterThan(100);
  });
});
