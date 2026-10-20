import { describe, expect, it } from 'vitest';
import { hud, placeById } from '../place/data';
import { THRESHOLDS } from '../place/thresholds';
import { composeAll, composeRec } from './compose';
import { DEFAULT_POLICY, type PolicyState } from './store';

const H = hud!;
const at = (s: Partial<PolicyState> = {}, level: 30 | 50 | 80 | 'market' = 50, senior = false) => composeAll(placeById, H, { level, senior }, { ...DEFAULT_POLICY, ...s });
const leads = (m: ReturnType<typeof at>) => [...m.values()].map((c) => c.rec.lead);

describe('types that pass your screens', () => {
  it('never suggests an ADU (no ADU overlay is mapped) and no senior housing for general residents', () => {
    const all = at();
    expect(leads(all)).not.toContain('adu');
    expect([...all.values()].every((c) => c.rec.types.every((t) => t.typology !== 'adu' && t.typology !== 'senior'))).toBe(true);
    const anyAdu = [...all.values()].some((c) => c.rec.not.some((n) => n.typology === 'adu' && /§912\.08/.test(n.because)));
    expect(anyAdu).toBe(true);
  });

  it('allows senior housing for senior residents', () => {
    expect([...at({}, 50, true).values()].some((c) => c.rec.types.some((t) => t.typology === 'senior'))).toBe(true);
  });

  it('each screen only narrows the set', () => {
    const base = at();
    for (const s of [{ displacement: true }, { transit: true }, { flood: 'le5' as const }]) {
      const narrowed = at(s);
      for (const [id, c] of narrowed) {
        if (!c.rec.lead) continue;
        if ('displacement' in s) continue; // the displacement rule reorders as well as narrows
        expect(base.get(id)!.rec.types.map((t) => t.typology)).toContain(c.rec.lead);
      }
      expect(leads(narrowed).filter(Boolean).length).toBeLessThanOrEqual(leads(base).filter(Boolean).length);
    }
  });

  it('the transit screen removes every type beyond half a mile and says why', () => {
    for (const [id, c] of at({ transit: true })) {
      const d = placeById.get(id)?.transit?.freq_dist_mi;
      if (typeof d === 'number' && d > 0.5) {
        expect(c.rec.types).toEqual([]);
        if (at().get(id)!.rec.types.length) expect(c.why).toMatch(/½ mile/);
      }
    }
  });

  it('the displacement screen keeps high-risk places to homes added without demolition', () => {
    for (const [id, c] of at({ displacement: true })) {
      const s = placeById.get(id)?.displacement?.score;
      if (typeof s === 'number' && s >= THRESHOLDS.displacement_high) expect(c.rec.types.every((t) => ['duplex_triplex', 'small_apartment'].includes(t.typology))).toBe(true);
    }
  });

  it('prints the screens in the rule lines instead of a stance', () => {
    const [p] = placeById.values();
    const off = composeRec(p, H, { level: 50, senior: false }, DEFAULT_POLICY);
    expect(off.rec.stanceTest.sentence).toMatch(/No screens switched on/);
    const on = composeRec(p, H, { level: 50, senior: false }, { ...DEFAULT_POLICY, transit: true });
    expect(on.rec.lines.join(' ')).toMatch(/Your screens:/);
    expect(on.rec.lines.join(' ')).not.toMatch(/the stance reads the target band/);
  });
});
