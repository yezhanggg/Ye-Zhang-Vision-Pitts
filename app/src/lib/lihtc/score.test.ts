import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TRANSIT_KEY, applies, itemPoints, moves, nextTier, scoreSheet, tierPoints, tierWords, type Answers, type Facts, type Item, type Setup, type Sheet, type SheetFile } from './score';

const file = JSON.parse(readFileSync(new URL('../../data/lazy/lihtc_pa.json', import.meta.url), 'utf8')) as SheetFile;
const adopted = file.sheets.find((s) => s.id === 'pa-2025-2026')!;
const draft = file.sheets.find((s) => s.id === 'pa-2027-2028-draft')!;
const NEW: Setup = { kind: 'new', occupancy: 'general', credit: 'nine' };
const NEAR: Facts = { transit: true };
const FAR: Facts = { transit: false };
const item = (sheet: Sheet, id: string): Item => sheet.sections.flatMap((s) => s.items).find((i) => i.id === id)!;
const line = (sheet: Sheet, id: string, answers: Answers, setup = NEW, facts = FAR) => scoreSheet(sheet, setup, answers, facts).sections.flatMap((s) => s.lines).find((l) => l.item.id === id)!;

describe('the sheets as transcribed', () => {
  it('add up to the totals PHFA states', () => {
    expect(adopted.max).toBe(232);
    expect(adopted.sections.reduce((t, s) => t + s.max, 0)).toBe(232);
    expect(draft.max).toBe(205);
    expect(draft.sections.reduce((t, s) => t + s.max, 0)).toBe(205);
  });
  it('carry a rule, a reference and a known basis on every line, with ids used once', () => {
    for (const sheet of file.sheets) {
      const items = sheet.sections.flatMap((s) => s.items);
      expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
      for (const i of items) {
        expect(i.rule.length, i.id).toBeGreaterThan(5);
        expect(i.ref, i.id).toBeTruthy();
        expect(Object.keys(file.bases), i.id).toContain(i.basis);
        if (i.input === 'choice') expect(Math.max(...i.options!.map((o) => o.points)), i.id).toBe(i.max);
        if (i.input === 'percent' || i.input === 'score') expect(Math.max(...i.tiers!.map((t) => t.points)), i.id).toBe(i.max);
      }
      for (const g of sheet.groups ?? []) for (const id of g.ids) expect(items.some((i) => i.id === id), id).toBe(true);
    }
  });
  it('name the minimum for each kind of application', () => {
    expect(scoreSheet(adopted, NEW, {}, FAR).threshold).toBe(125);
    expect(scoreSheet(adopted, { ...NEW, kind: 'preservation' }, {}, FAR).threshold).toBe(110);
    expect(scoreSheet(adopted, { ...NEW, credit: 'four' }, {}, FAR).threshold).toBe(110);
    expect(scoreSheet(draft, NEW, {}, FAR).threshold).toBe(120);
  });
});

describe('the most a development can reach', () => {
  it('2025/2026: 231 for new general occupancy, since section A offers new construction 36', () => {
    const s = scoreSheet(adopted, NEW, {}, FAR);
    expect(s.sections.map((x) => x.max)).toEqual([36, 62, 35, 93, 5]);
    expect(s.max).toBe(231);
  });
  it('2025/2026: preservation reaches 232, senior housing loses the large-family line', () => {
    expect(scoreSheet(adopted, { ...NEW, kind: 'preservation' }, {}, FAR).max).toBe(232);
    expect(scoreSheet(adopted, { ...NEW, occupancy: 'senior' }, {}, FAR).max).toBe(221);
  });
  it('2027/2028 draft: 205, and 200 for senior housing', () => {
    expect(scoreSheet(draft, NEW, {}, FAR).max).toBe(205);
    expect(scoreSheet(draft, { ...NEW, occupancy: 'senior' }, {}, FAR).max).toBe(200);
  });
  it('shows only the lines that apply', () => {
    expect(applies(item(adopted, 'A.1.c'), NEW)).toBe(false);
    expect(applies(item(adopted, 'A.1.c'), { ...NEW, occupancy: 'senior' })).toBe(true);
    expect(applies(item(adopted, 'A.2.g'), NEW)).toBe(false);
    expect(applies(item(adopted, 'B.1'), NEW)).toBe(true);
  });
});

describe('a line', () => {
  it('scores a number through its steps, with "over" strict and "from" inclusive', () => {
    const b1 = item(adopted, 'B.1').tiers!;
    expect([10, 10.1, 20, 20.5, 40, 50, 50.1, 100].map((v) => tierPoints(b1, v))).toEqual([0, 4, 4, 8, 12, 16, 20, 20]);
    const walk = item(adopted, 'A.2.e').tiers!;
    expect([69, 70, 79, 80].map((v) => tierPoints(walk, v))).toEqual([0, 1, 1, 2]);
    const school = item(adopted, 'A.1.b').tiers!;
    expect([69.9, 70, 80, 80.1].map((v) => tierPoints(school, v))).toEqual([0, 1, 1, 2]);
    expect([15, 15.1, 20.1, 25.1].map((v) => tierPoints(item(adopted, 'B.4').tiers!, v))).toEqual([0, 6, 8, 10]);
  });
  it('names the next step', () => {
    const b4 = item(adopted, 'B.4');
    expect(nextTier(b4.tiers!, null)?.points).toBe(6);
    expect(nextTier(b4.tiers!, 22)?.points).toBe(10);
    expect(nextTier(b4.tiers!, 30)).toBeNull();
    expect(tierWords({ over: 25, points: 10 }, '% of units')).toBe('over 25%');
    expect(tierWords({ from: 70, points: 1 }, 'Walk Score')).toBe('70 or more');
  });
  it('reads a check, a choice and entered points', () => {
    expect(itemPoints(item(adopted, 'B.5'), { 'B.5': true }, FAR)).toBe(5);
    expect(itemPoints(item(adopted, 'B.5'), {}, FAR)).toBe(0);
    expect(itemPoints(item(adopted, 'C.3'), { 'C.3': 'passive' }, FAR)).toBe(10);
    expect(itemPoints(item(adopted, 'C.3'), { 'C.3': 'zerh' }, FAR)).toBe(8);
    expect(itemPoints(item(adopted, 'C.3'), { 'C.3': 'nothing' }, FAR)).toBe(0);
    expect(itemPoints(item(adopted, 'A.1.a'), { 'A.1.a': 99 }, FAR)).toBe(13);
    expect(itemPoints(item(adopted, 'D.5'), { 'D.5': -4 }, FAR)).toBe(-4);
    expect(itemPoints(item(adopted, 'D.5'), { 'D.5': -40 }, FAR)).toBe(-10);
    expect(itemPoints(item(adopted, 'D.5'), { 'D.5': 3 }, FAR)).toBe(0);
  });
  it('takes transit from the place unless the site says otherwise', () => {
    const tod = item(adopted, 'A.2.d');
    expect(itemPoints(tod, {}, NEAR)).toBe(2);
    expect(itemPoints(tod, {}, FAR)).toBe(0);
    expect(itemPoints(tod, {}, { transit: null })).toBe(0);
    expect(itemPoints(tod, { [TRANSIT_KEY]: false }, NEAR)).toBe(0);
    expect(itemPoints(tod, { [TRANSIT_KEY]: true }, FAR)).toBe(2);
  });
  it('2027/2028 draft: walkability scores only together with transit', () => {
    const both = item(draft, '4.2.3');
    expect(itemPoints(both, { '4.2.3': 76 }, NEAR)).toBe(5);
    expect(itemPoints(both, { '4.2.3': 75 }, NEAR)).toBe(0);
    expect(itemPoints(both, { '4.2.3': 90 }, FAR)).toBe(0);
    expect(line(draft, '4.2.3', { '4.2.3': 90 }, NEW, FAR).next).toBeNull();
    expect(line(draft, '4.2.3', {}, NEW, NEAR).next).toEqual({ need: 'over 75', gain: 5 });
  });
});

describe('caps', () => {
  it('2025/2026: site selection counts 10 at most, and C.1 to C.3 together 30', () => {
    const site = { 'C.1.a': true, 'C.1.b': true, 'C.1.c': true };
    const s = scoreSheet(adopted, NEW, site, FAR);
    expect(s.sections[2].points).toBe(10);
    expect(s.lost.reduce((t, l) => t + l.lost, 0)).toBe(12);
    const all = scoreSheet(adopted, NEW, { ...site, 'C.2': true, 'C.3': 'passive', 'C.4': true }, FAR);
    expect(all.sections[2].points).toBe(35);
    expect(scoreSheet(adopted, NEW, { 'C.1.c': true, 'C.2': true, 'C.3': 'passive' }, FAR).sections[2].points).toBe(30);
  });
  it('a capped line offers no further gain', () => {
    const l = line(adopted, 'C.1.a', { 'C.1.c': true });
    expect(l.points).toBe(0);
    expect(l.gain).toBe(0);
    expect(line(adopted, 'C.1.c', { 'C.1.b': true }).gain).toBe(3);
  });
  it('2027/2028 draft: the housing authority subsidy counts only when large-family units do not pass', () => {
    expect(scoreSheet(draft, NEW, { '4.3.4.b': true }, FAR).sections[1].points).toBe(5);
    expect(scoreSheet(draft, NEW, { '4.3.4.a': 20, '4.3.4.b': true }, FAR).sections[1].points).toBe(5);
    expect(scoreSheet(draft, NEW, { '4.3.4.a': 30, '4.3.4.b': true }, FAR).sections[1].points).toBe(10);
    expect(line(draft, '4.3.4.b', { '4.3.4.a': 30 }).gain).toBe(0);
  });
  it('a deduction lowers the total and can be won back', () => {
    const s = scoreSheet(adopted, NEW, { 'B.5': true, 'D.5': -6 }, FAR);
    expect(s.total).toBe(-1);
    expect(line(adopted, 'D.5', { 'D.5': -6 }).gain).toBe(6);
  });
});

describe('the whole sheet', () => {
  it('an empty sheet scores what the place brings', () => {
    const none = scoreSheet(adopted, NEW, {}, FAR);
    expect(none.total).toBe(0);
    expect(none.short).toBe(125);
    const near = scoreSheet(adopted, NEW, {}, NEAR);
    expect(near.total).toBe(2);
    expect(near.fromPlace).toBe(2);
    expect(near.short).toBe(123);
  });
  it('a full sheet reaches the maximum and is not short', () => {
    const answers: Answers = {};
    for (const i of adopted.sections.flatMap((s) => s.items)) {
      if (i.input === 'check') answers[i.id] = true;
      else if (i.input === 'choice') answers[i.id] = [...i.options!].sort((a, b) => b.points - a.points)[0].id;
      else if (i.input === 'percent' || i.input === 'score') answers[i.id] = 100;
      else if (i.input === 'points') answers[i.id] = i.max;
    }
    const s = scoreSheet(adopted, NEW, answers, NEAR);
    expect(s.total).toBe(231);
    expect(s.short).toBe(0);
    expect(moves(s)).toEqual([]);
  });
  it('lists the open lines largest first', () => {
    const m = moves(scoreSheet(adopted, NEW, {}, NEAR));
    expect(m[0].item.id).toBe('B.1');
    expect(m[0].gain).toBe(20);
    expect(m[1].item.id).toBe('D.1.f');
    expect(m.every((l, i) => i === 0 || l.gain <= m[i - 1].gain)).toBe(true);
    expect(m.some((l) => l.item.id === 'A.2.d')).toBe(false);
    expect(moves(scoreSheet(adopted, NEW, {}, NEAR), 3)).toHaveLength(3);
  });
  it('a partly filled line says what the next step adds', () => {
    const l = line(adopted, 'B.1', { 'B.1': 35 });
    expect(l.points).toBe(12);
    expect(l.gain).toBe(8);
    expect(l.next).toEqual({ need: 'over 40%', gain: 4 });
  });
});
