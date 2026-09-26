import { describe, expect, it } from 'vitest';
import { verifyNumbers } from './explain';

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
  it('rejects any number the model made up', () => {
    const t = 'Small apartment ranks first with 590 low-income renter households and a 0.71 score.';
    const r = verifyNumbers(t, payload);
    expect(r.ok).toBe(false);
    expect(r.unmatched).toEqual(['590']);
  });
});
