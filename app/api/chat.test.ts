import { describe, expect, it } from 'vitest';
import { FACTS_ACK, LIMITS, buildMessages, checkNumbers, clean, pickProvider, tidy } from './chat';

const FACTS = `SELECTED PLACE
Hazelwood (Census Tract 5623), census tract
Median household income: $38,750
Median gross rent: $1,012
Renter households: 52.3%
NEARBY PLACES (centre within 3 miles, nearest first)
Greenfield (Census Tract 1517), 1.4 miles: median gross rent $1,261`;

describe('checkNumbers', () => {
  it('passes figures quoted from the facts, with or without separators, and rounded', () => {
    const t = 'Hazelwood (Tract 5623) has a median rent of $1,012 and an income of $38750. About 52% of households rent. Greenfield, 1.4 miles away, is higher at $1,261.';
    expect(checkNumbers(t, [FACTS])).toEqual({ ok: true, unmatched: [] });
  });
  it('passes the numbers of the question and small counts', () => {
    expect(checkNumbers('• 2 places sit within 3 miles.', [FACTS, 'compare within 3 miles'])).toEqual({ ok: true, unmatched: [] });
  });
  it('flags a figure the model worked out or made up', () => {
    const r = checkNumbers('Greenfield rents are $249 higher, about 24.6% more.', [FACTS]);
    expect(r.ok).toBe(false);
    expect(r.unmatched).toEqual(['249', '24.6']);
  });
});

describe('clean', () => {
  it('bounds the question and keeps a well-formed history', () => {
    const p = clean({ question: ` ${'x'.repeat(900)} `, facts: FACTS, history: [{ role: 'user', text: 'old' }, { role: 'assistant', text: 'older' }, { role: 'user', text: 'a' }, { role: 'assistant', text: 'b' }] });
    expect(p?.question.length).toBe(LIMITS.question);
    expect(p?.history).toEqual([{ role: 'user', text: 'a' }, { role: 'assistant', text: 'b' }]);
  });
  it('drops a history that does not alternate, and rejects missing or oversized input', () => {
    expect(clean({ question: 'q', facts: FACTS, history: [{ role: 'assistant', text: 'b' }] })?.history).toEqual([]);
    expect(clean({ question: '', facts: FACTS })).toBeNull();
    expect(clean({ question: 'q' })).toBeNull();
    expect(clean({ question: 'q', facts: 'x'.repeat(LIMITS.facts + 1) })).toBeNull();
    expect(clean('nope')).toBeNull();
  });
});

describe('buildMessages, tidy, pickProvider', () => {
  it('puts the facts first, so a second question about the same place repeats the same opening', () => {
    const a = buildMessages({ question: 'What is the rent?', facts: FACTS, history: [{ role: 'user', text: 'a' }, { role: 'assistant', text: 'b' }] });
    const b = buildMessages({ question: 'And the income?', facts: FACTS });
    expect(a.map((m) => m.role)).toEqual(['user', 'assistant', 'user', 'assistant', 'user']);
    expect(a[0].text.startsWith('FACTS\nSELECTED PLACE')).toBe(true);
    expect(a[1].text).toBe(FACTS_ACK);
    expect(a[4].text).toBe('QUESTION\nWhat is the rent?');
    expect(b.slice(0, 2)).toEqual(a.slice(0, 2));
    expect(b).toHaveLength(3);
  });
  it('strips markdown the interface would show as symbols', () => {
    expect(tidy('## Rent\n**Hazelwood** is lower.\n- Greenfield is higher.')).toBe('Rent\nHazelwood is lower.\n• Greenfield is higher.');
  });
  it('prefers DeepSeek flash, and answers null without a key', () => {
    expect(pickProvider({})).toBeNull();
    expect(pickProvider({ DEEPSEEK_API_KEY: 'k', ANTHROPIC_API_KEY: 'a' })?.model).toBe('deepseek-flash');
    expect(pickProvider({ ANTHROPIC_API_KEY: 'a' })?.id).toBe('anthropic');
  });
});
