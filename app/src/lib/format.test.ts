import { describe, expect, it } from 'vitest';
import { fmtSignedPct } from './format';

describe('fmtSignedPct', () => {
  it('rounds to a whole percent and signs it', () => {
    expect(fmtSignedPct(0.213)).toBe('+21%');
    expect(fmtSignedPct(-0.05)).toBe('−5%');
    expect(fmtSignedPct(0)).toBe('0%');
    expect(fmtSignedPct(0.004)).toBe('0%');
  });
  it('shows a dash for missing values', () => {
    expect(fmtSignedPct(null)).toBe('—');
    expect(fmtSignedPct(undefined)).toBe('—');
    expect(fmtSignedPct(Number.NaN)).toBe('—');
  });
});
