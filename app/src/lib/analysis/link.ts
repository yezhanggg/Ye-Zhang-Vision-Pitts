// The share link: the current state as a URL, and whether copying it makes sense.
import { encodeHash } from '../hash';
import type { AppState } from '../store';

function currentBase(): string {
  try {
    return window.location.href.replace(/#.*$/, '');
  } catch {
    return '';
  }
}

/** `base` (the page URL, default the current one) with the state in the hash. */
export function shareUrl(state: AppState, base?: string): string {
  return `${(base ?? currentBase()).replace(/#.*$/, '')}#${encodeHash(state)}`;
}

/** A link is worth copying only when it opens elsewhere: never over file:// (the URL is a path on this computer). */
export function canCopy(protocol: string): boolean {
  return protocol === 'http:' || protocol === 'https:';
}
