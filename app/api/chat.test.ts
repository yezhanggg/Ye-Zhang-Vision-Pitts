import { afterEach, describe, expect, it, vi } from 'vitest';
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

describe('scope', () => {
  it('tells the model the scope, the one-sentence decline and how to label general background', async () => {
    const { SYSTEM, DECLINE, GENERAL_LABEL } = await import('./chat');
    expect(SYSTEM).toContain('Scope: Pittsburgh and Allegheny County housing');
    expect(SYSTEM).toContain(`"${DECLINE}"`);
    expect(SYSTEM).toContain(`${GENERAL_LABEL}: `);
    expect(SYSTEM).toMatch(/facts first|FACTS given at the start of the conversation first/);
    expect(DECLINE).toBe('I can only help with Pittsburgh housing and the data in VisionPitts.');
  });
  it('pre-checks only obviously off-topic questions and stays permissive for places and housing words', async () => {
    const { offTopic } = await import('./chat');
    expect(offTopic('Give me a recipe for chocolate cake')).toBe(true);
    expect(offTopic('Write a poem about the ocean')).toBe(true);
    expect(offTopic('Write me some python code to sort a list')).toBe(true);
    expect(offTopic('Who won the world cup?')).toBe(true);
    // housing words, Pittsburgh, and places named in the facts keep it in scope
    expect(offTopic('Write a poem about rent in Pittsburgh')).toBe(false);
    expect(offTopic('Any good cooking classes in Hazelwood?', FACTS)).toBe(false);
    expect(offTopic('Tell me a joke about Greenfield', FACTS)).toBe(false);
    // no off-topic marker: always left to the model
    expect(offTopic('What is Squirrel Hill like?')).toBe(false);
    expect(offTopic('Who is the mayor?')).toBe(false);
    expect(offTopic('What is the zip code of Squirrel Hill?')).toBe(false);
  });
});

describe('handler', () => {
  const run = async (body: unknown) => {
    const { default: handler } = await import('./chat');
    let out: { status: number; body: Record<string, unknown> } = { status: 0, body: {} };
    await handler({ method: 'POST', body }, { status: (n: number) => ({ json: (b: unknown) => (out = { status: n, body: b as Record<string, unknown> }) }) });
    return out;
  };
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  it('declines an off-topic question in one sentence without calling the model', async () => {
    vi.stubEnv('DEEPSEEK_API_KEY', 'k');
    const fetchStub = vi.fn();
    vi.stubGlobal('fetch', fetchStub);
    const r = await run({ question: 'Give me a recipe for lasagna', facts: FACTS });
    expect(fetchStub).not.toHaveBeenCalled();
    expect(r.body).toMatchObject({ ok: true, text: 'I can only help with Pittsburgh housing and the data in VisionPitts.', checked: true, declined: true });
  });
  it('sends an in-scope question to the model with the scope rule in the system prompt', async () => {
    vi.stubEnv('DEEPSEEK_API_KEY', 'k');
    vi.stubEnv('EXPLAIN_PROVIDER', 'deepseek');
    let sent: { messages: { role: string; content: string }[] } | null = null;
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: { body: string }) => {
      sent = JSON.parse(init.body);
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'Median gross rent in Hazelwood is $1,012.\nGeneral background (not from VisionPitts data): rents depend on many things.' } }], usage: {} }) };
    }));
    const r = await run({ question: 'What drives rent in Hazelwood?', facts: FACTS });
    expect(sent!.messages[0].role).toBe('system');
    expect(sent!.messages[0].content).toContain('I can only help with Pittsburgh housing and the data in VisionPitts.');
    expect(r.body).toMatchObject({ ok: true, checked: true });
    expect(String(r.body.text)).toContain('General background (not from VisionPitts data)');
  });
});
