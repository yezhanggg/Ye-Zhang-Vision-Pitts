import { describe, expect, it } from 'vitest';
import { pickProvider, verifyNumbers } from './explain';

const payload = {
  tract: { geoid: '42003562300', name: 'Tract 5623', neighborhood: 'Hazelwood', watch_list: true, residential: true },
  presetLabel: 'Anti-displacement',
  weights: { need: 2 },
  factors: [{ id: 'need', label: 'Affordability need', percentile: 0.92, confidence: 'medium' }],
  ranking: [
    { typology: 'small_apartment', label: 'Small apartment', score: 0.7134 },
    { typology: 'senior', label: 'Senior housing', score: 0.6902 },
  ],
  parts: [{ factor: 'need', label: 'Affordability need', percentile: 0.92, lift_pts: 8.4, wants: 'high' as const }],
  stability: { share: 0.83, draws: 200 },
};

describe('verifyNumbers', () => {
  it('accepts text whose numbers all come from the payload', () => {
    const t = 'Small apartment ranks first (0.71) ahead of Senior housing (0.69). Need at the 92nd percentile adds +8.4 points. It stays first in 8 of 10 nudges.';
    expect(verifyNumbers(t, payload)).toEqual({ ok: true, unmatched: [] });
  });
  it('accepts what the prompt states: the clamped 99th percentile and the tract number in the name', () => {
    const p = { ...payload, factors: [...payload.factors, { id: 'subsidy_eligible', label: 'Subsidy eligibility', percentile: 1, confidence: 'high' }], parts: [...payload.parts, { factor: 'subsidy_eligible', label: 'Subsidy eligibility', percentile: 1, lift_pts: 11.9, wants: 'high' as const }] };
    const t = 'In Hazelwood (Tract 5623), small apartment ranks first at 0.71. Subsidy eligibility at the 99th percentile adds 11.9 points, and the pick holds in 8 of 10 nudges.';
    expect(verifyNumbers(t, p)).toEqual({ ok: true, unmatched: [] });
    // the same tract number is not a licence for other figures
    expect(verifyNumbers('Tract 5623 has 1,240 renters.', p).unmatched).toEqual(['240']);
  });
  it('rejects any number the model made up', () => {
    const t = 'Small apartment ranks first with 590 low-income renter households and a 0.71 score.';
    const r = verifyNumbers(t, payload);
    expect(r.ok).toBe(false);
    expect(r.unmatched).toEqual(['590']);
  });
});

describe('pickProvider', () => {
  it('uses DeepSeek when its key is set, Claude otherwise, and nothing without a key', () => {
    expect(pickProvider({})).toBeNull();
    expect(pickProvider({ ANTHROPIC_API_KEY: 'a' })).toMatchObject({ id: 'anthropic', label: 'Claude', model: 'claude-sonnet-5' });
    expect(pickProvider({ DEEPSEEK_API_KEY: 'd' })).toMatchObject({ id: 'deepseek', label: 'DeepSeek', model: 'deepseek-flash' });
    expect(pickProvider({ DEEPSEEK_API_KEY: 'd', ANTHROPIC_API_KEY: 'a' })?.id).toBe('deepseek');
  });
  it('honours EXPLAIN_PROVIDER and EXPLAIN_MODEL', () => {
    expect(pickProvider({ DEEPSEEK_API_KEY: 'd', ANTHROPIC_API_KEY: 'a', EXPLAIN_PROVIDER: 'anthropic' })?.id).toBe('anthropic');
    expect(pickProvider({ ANTHROPIC_API_KEY: 'a', EXPLAIN_PROVIDER: 'deepseek' })).toBeNull();
    expect(pickProvider({ DEEPSEEK_API_KEY: 'd', EXPLAIN_MODEL: 'deepseek-v4-pro' })?.model).toBe('deepseek-v4-pro');
  });
});
