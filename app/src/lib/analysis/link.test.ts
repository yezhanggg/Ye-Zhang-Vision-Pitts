import { describe, expect, it } from 'vitest';
import { encodeHash } from '../hash';
import { useApp, type AppState } from '../store';
import { canCopy, shareUrl } from './link';

const state = (): AppState => ({ ...useApp.getState(), mode: 'match', lite: false, pin: null });

describe('shareUrl', () => {
  it('puts the encoded state in the hash of the base URL, replacing any hash there', () => {
    const s = state();
    expect(shareUrl(s, 'https://visionpitts.test/app/')).toBe(`https://visionpitts.test/app/#${encodeHash(s)}`);
    expect(shareUrl(s, 'https://visionpitts.test/app/?x=1#m=explore&L=tracts')).toBe(`https://visionpitts.test/app/?x=1#${encodeHash(s)}`);
    expect(shareUrl(s, 'https://visionpitts.test/')).toContain('#m=match');
  });
  it('falls back to an empty base without a window', () => {
    const s = state();
    expect(shareUrl(s)).toBe(`#${encodeHash(s)}`);
  });
});

describe('canCopy', () => {
  it('is false over file:// and true on the web', () => {
    expect(canCopy('file:')).toBe(false);
    expect(canCopy('https:')).toBe(true);
    expect(canCopy('http:')).toBe(true);
    expect(canCopy('about:')).toBe(false);
    expect(canCopy('')).toBe(false);
  });
});
