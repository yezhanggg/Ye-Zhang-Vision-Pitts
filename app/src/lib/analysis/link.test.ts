import { describe, expect, it } from 'vitest';
import { encodeHash } from '../hash';
import { useApp, type AppState } from '../store';
import { canCopy, shareUrl } from './link';

const state = (): AppState => ({ ...useApp.getState(), mode: 'match', lite: false, pin: null });

describe('shareUrl', () => {
  it('writes a page path on the web, keeping any folder and dropping an old hash or query', () => {
    const s = state();
    expect(shareUrl(s, 'https://visionpitts.test/')).toBe('https://visionpitts.test/place');
    expect(shareUrl(s, 'https://visionpitts.test/app/compare?t=1#m=explore')).toBe('https://visionpitts.test/app/place');
    expect(shareUrl({ ...s, mode: 'tracts', selectedId: '42003562300', compareId: '42003140300' }, 'https://x.test/equity')).toBe('https://x.test/compare?t=42003562300&b=42003140300');
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
