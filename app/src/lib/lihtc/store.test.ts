import { describe, expect, it } from 'vitest';
import { TRANSIT_KEY, type Item } from './score';
import { DEFAULT_ENTRIES, answersFor, clearSheet, putAnswer } from './store';

const line = (id: string, basis: Item['basis'], input: Item['input'] = 'check'): Item => ({ id, label: id, max: 5, basis, input, rule: 'rule text', ref: id });
const SHEET = 'pa-2025-2026';
const A = '42003562300';
const B = '42003050100';

describe('entries on the score sheet', () => {
  it('keep project entries across places and site entries per place', () => {
    let e = putAnswer(DEFAULT_ENTRIES, SHEET, A, line('B.5', 'design'), true);
    e = putAnswer(e, SHEET, A, line('A.2.e', 'lookup', 'score'), 82);
    e = putAnswer(e, SHEET, A, line('C.1.b', 'site'), true);
    expect(answersFor(e, SHEET, A)).toEqual({ 'B.5': true, 'A.2.e': 82, 'C.1.b': true });
    expect(answersFor(e, SHEET, B)).toEqual({ 'B.5': true });
    expect(answersFor(e, 'pa-2027-2028-draft', A)).toEqual({});
  });
  it('clear an entry when it is emptied or unchecked', () => {
    let e = putAnswer(DEFAULT_ENTRIES, SHEET, A, line('B.5', 'design'), true);
    e = putAnswer(e, SHEET, A, line('B.1', 'design', 'percent'), 40);
    e = putAnswer(e, SHEET, A, line('B.5', 'design'), false);
    e = putAnswer(e, SHEET, A, line('B.1', 'design', 'percent'), null);
    expect(answersFor(e, SHEET, A)).toEqual({});
  });
  it('keep "not near transit" for a site, since it overrides a measured yes', () => {
    let e = putAnswer(DEFAULT_ENTRIES, SHEET, A, TRANSIT_KEY, false);
    expect(answersFor(e, SHEET, A)).toEqual({ [TRANSIT_KEY]: false });
    expect(answersFor(e, SHEET, B)).toEqual({});
    e = putAnswer(e, SHEET, A, TRANSIT_KEY, true);
    expect(answersFor(e, SHEET, A)).toEqual({ [TRANSIT_KEY]: true });
  });
  it('do not change the entries they started from', () => {
    const before = JSON.stringify(DEFAULT_ENTRIES);
    putAnswer(DEFAULT_ENTRIES, SHEET, A, line('B.5', 'design'), true);
    expect(JSON.stringify(DEFAULT_ENTRIES)).toBe(before);
  });
  it('clear one sheet for one place and leave the rest', () => {
    let e = putAnswer(DEFAULT_ENTRIES, SHEET, A, line('B.5', 'design'), true);
    e = putAnswer(e, SHEET, A, line('A.2.e', 'lookup', 'score'), 82);
    e = putAnswer(e, SHEET, B, line('A.2.e', 'lookup', 'score'), 55);
    e = putAnswer(e, 'pa-2027-2028-draft', A, line('4.2.4', 'design'), true);
    const cleared = clearSheet(e, SHEET, A);
    expect(answersFor(cleared, SHEET, A)).toEqual({});
    expect(answersFor(cleared, SHEET, B)).toEqual({ 'A.2.e': 55 });
    expect(answersFor(cleared, 'pa-2027-2028-draft', A)).toEqual({ '4.2.4': true });
  });
});
