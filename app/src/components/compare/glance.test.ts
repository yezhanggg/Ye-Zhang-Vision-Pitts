import { describe, expect, it } from 'vitest';
import { glanceFlag, glanceRows } from './CompareBlocks';
import { hud, placeById } from '../../lib/place/data';

describe('At a glance marking', () => {
  const base = { label: 'x', dir: '', kind: 'need' as const, higherFlagged: true, fmt: (v: number) => String(Math.round(v)) };
  it('does not mark a side when both rent gaps are at or below $0', () => {
    expect(glanceFlag({ ...base, a: -838, b: -93, floorZero: true })).toBeNull();
    expect(glanceFlag({ ...base, a: -92, b: 653, floorZero: true })).toBe('b');
  });
  it('never marks a neutral row', () => {
    expect(glanceFlag({ ...base, a: 0.6, b: 0.2, neutral: true })).toBeNull();
  });
  it('uses the area median income at market rate', () => {
    const g = glanceRows(placeById.get('42003562300')!, placeById.get('42003140300')!, hud, 'market');
    expect(g.ami).toBe(100);
    expect(g.fits?.rent).toBe(Math.round((hud!.metro.median * 0.9) / 40));
    expect(g.rows[3].label).toContain('market rate');
  });
});
