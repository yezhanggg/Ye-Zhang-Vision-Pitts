// The share link: the current state as a URL, and whether copying it makes sense.
import { basePath, encodeHash, pathFromHash } from '../hash';
import type { AppState } from '../store';

function currentBase(): string {
  try {
    return window.location.href.replace(/#.*$/, '');
  } catch {
    return '';
  }
}

/** A link to the current state: on the web a page path (…/compare?t=…), over file:// the hash form. */
export function shareUrl(state: AppState, base?: string): string {
  const url = (base ?? currentBase()).replace(/#.*$/, '');
  const m = url.match(/^(https?:\/\/[^/?]+)([^?]*)/);
  if (!m) return `${url}#${encodeHash(state)}`;
  return `${m[1]}${basePath(m[2] || '/')}${pathFromHash(encodeHash(state))}`;
}

/** A link is worth copying only when it opens elsewhere: never over file:// (the URL is a path on this computer). */
export function canCopy(protocol: string): boolean {
  return protocol === 'http:' || protocol === 'https:';
}
