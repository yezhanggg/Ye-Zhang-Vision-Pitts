import { describe, expect, it } from 'vitest';
import { proseOnly } from './reading';
import { explainPolicies } from './explain';
import { measureById } from './measures';

describe('equity reading and policy explanations', () => {
  it('keeps the prose and drops bullet lists or headings the model appends', () => {
    expect(proseOnly('First line.\nSecond **line**.\n\n• City median: $219/mo\n• Tracts: 83')).toBe('First line. Second line.');
    expect(proseOnly('## Heading\nText')).toBe('');
  });
  it('writes one paragraph per lever that is on, with its reach among the highest-need tracts', () => {
    const def = measureById.get('rent_gap')!;
    const values = [
      { id: 'a', value: 900 },
      { id: 'b', value: 500 },
      { id: 'c', value: -50 },
    ];
    const levers = [
      { id: 'adu', name: 'ADU by right', on: true, before: '0', after: '2', changed: ['a', 'c'] },
      { id: 'bonus', name: 'Density bonus', on: false, before: '1', after: '1', changed: [] },
    ];
    const out = explainPolicies({ def, values, levers, nameOf: (id) => id.toUpperCase(), topN: 2 });
    expect(out).toHaveLength(1);
    expect(out[0].text).toContain('in 2 more tracts (0 → 2 tracts where an ADU is by right)');
    expect(out[0].text).toContain('1 of the 2 tracts with the most need on rent gap for a 2-bedroom are among them, including A.');
    expect(explainPolicies({ def, values, levers: levers.map((l) => ({ ...l, on: false })), nameOf: String })).toEqual([]);
  });
});
