import { describe, expect, it } from 'vitest';
import sheetJson from '../../data/lazy/lihtc_pa.json';
import { emptyCounts } from '../project/store';
import { autoAnswers, FEE_LINES, hints, LARGE_LINES, LE50_LINES, mergeAnswers, mixMoves, planFacts, PRIVATE_SOFT_LINES } from './fromPlan';
import { scoreSheet, type SheetFile, type Setup } from './score';
import { DEFAULT_ENTRIES, answersFor, putAnswer } from './store';

const FILE = sheetJson as unknown as SheetFile;
const adopted = FILE.sheets.find((s) => s.status === 'adopted')!;
const draft = FILE.sheets.find((s) => s.status === 'draft')!;
const general: Setup = { kind: 'new', occupancy: 'general', credit: 'nine' };
const facts = { transit: null };

function mix(le50: number, at60: number, mkt: number, large = 0) {
  const c = emptyCounts();
  c['50'] = [0, le50 - large, 0, large];
  c['60'] = [0, 0, at60, 0];
  c.mkt = [0, mkt, 0, 0];
  return c;
}

describe('lines the plan answers', () => {
  it('names only line ids that exist in each sheet', () => {
    const ids = new Set(FILE.sheets.flatMap((s) => s.sections.flatMap((x) => x.items.map((i) => i.id))));
    for (const id of [...LE50_LINES, ...LARGE_LINES, ...PRIVATE_SOFT_LINES, ...FEE_LINES]) expect(ids.has(id)).toBe(true);
    expect(adopted.sections.flatMap((s) => s.items).some((i) => i.id === 'B.1')).toBe(true);
    expect(draft.sections.flatMap((s) => s.items).some((i) => i.id === '4.3.1')).toBe(true);
  });

  it('income targeting: share of all homes, strict "over" tiers', () => {
    const f = planFacts(mix(5, 40, 5), 4); // 5 of 50 = exactly 10%
    const a = autoAnswers(adopted, general, f);
    expect(a['B.1'].value).toBe(10);
    expect(scoreSheet(adopted, general, mergeAnswers(a, {}), facts).sections.flatMap((s) => s.lines).find((l) => l.item.id === 'B.1')!.points).toBe(0);
    const b = autoAnswers(adopted, general, planFacts(mix(6, 39, 5), 4)); // 12%
    expect(scoreSheet(adopted, general, mergeAnswers(b, {}), facts).sections.flatMap((s) => s.lines).find((l) => l.item.id === 'B.1')!.points).toBe(4);
  });

  it('large families: off at 7 stories and for senior housing', () => {
    const f = planFacts(mix(20, 20, 10, 10), 7);
    expect(autoAnswers(adopted, general, f)['B.4'].value).toBeNull();
    expect(autoAnswers(adopted, general, { ...f, stories: 4 })['B.4'].value).toBe(20);
    expect(autoAnswers(adopted, { ...general, occupancy: 'senior' }, { ...f, stories: 4 })['B.4']).toBeUndefined();
  });

  it('financing lines wait for the pencil', () => {
    const f = planFacts(mix(20, 30, 0), 4);
    expect(autoAnswers(adopted, general, f)['D.4.b']).toBeUndefined();
    const fin = { tdc: 20_000_000, privateSoft: 5_000_000, devFee: 2_000_000, deferredFee: 150_000, gap: 300_000 };
    expect(autoAnswers(adopted, general, { ...f, finance: fin })['D.4.b'].value).toBe(25);
    expect(autoAnswers(draft, general, { ...f, finance: fin })['4.5.9'].value).toBe('under10');
    expect(autoAnswers(draft, general, { ...f, finance: { ...fin, deferredFee: 400_000 } })['4.5.9'].value).toBe('10-30');
    expect(autoAnswers(draft, general, { ...f, finance: { ...fin, deferredFee: 900_000 } })['4.5.9'].value).toBeNull();
    expect(hints(adopted, { ...f, finance: fin })[0].text).toMatch(/is under 25%/);
  });

  it('a typed entry wins over the plan, even an explicit none', () => {
    const a = autoAnswers(adopted, general, planFacts(mix(30, 20, 0), 4));
    expect(mergeAnswers(a, {})['B.1']).toBe(60);
    expect(mergeAnswers(a, { 'B.1': 12 })['B.1']).toBe(12);
    expect(mergeAnswers(a, { 'B.1': null })['B.1']).toBeNull();
  });

  it('mix moves: the smallest change to the next tier and what it adds after caps', () => {
    const f = planFacts(mix(11, 39, 0), 4); // 22%: B.1 earns 8; over 30% earns 12
    const moves = mixMoves(adopted, general, {}, facts, f);
    const b1 = moves.find((m) => m.item.id === 'B.1')!;
    expect(b1.change).toMatch(/^5 more homes at or below 50% AMI \(16 of 50/);
    expect(b1.gain).toBe(4);
    expect(mixMoves(adopted, general, { 'B.1': 22 }, facts, f).find((m) => m.item.id === 'B.1')).toBeUndefined();
  });
});

describe('store keeps an explicit none over a plan value', () => {
  const item = adopted.sections.flatMap((s) => s.items).find((i) => i.id === 'B.1')!;
  it('keeps null when the line has a plan value and forgets on request', () => {
    let e = putAnswer(DEFAULT_ENTRIES, adopted.id, 'g', item, null, true);
    expect(answersFor(e, adopted.id, 'g')).toEqual({ 'B.1': null });
    e = putAnswer(e, adopted.id, 'g', item, undefined, false, true);
    expect(answersFor(e, adopted.id, 'g')).toEqual({});
    expect(answersFor(putAnswer(DEFAULT_ENTRIES, adopted.id, 'g', item, null), adopted.id, 'g')).toEqual({});
  });
});
