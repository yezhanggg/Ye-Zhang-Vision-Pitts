// The stability sentence: how often the top pick survives random nudges to the weights (lib/scoring.rankStability),
// in words only. The share is banded (solid / likely / close); the digits never reach the interface, because a share
// of random draws read as a precision the method does not have. Nothing is shown on a tie, because a tie has no pick
// to be stable.
import type { Stability } from '../scoring';
import { ANALYSIS_COPY as C, fmtCount } from './copy';
import type { Rationale } from './rationale';

export type Band = 'solid' | 'likely' | 'close';
export const SOLID = 0.75, LIKELY = 0.55;
/** Kept for callers that still ask: digits are never shown, whatever the number of draws. */
export const DIGITS_MIN_DRAWS = Infinity;
/** A share this close to a rounding boundary (.05, .15, …) would print as a range; kept for `digitsFor`. */
export const BOUNDARY_SLACK = 0.03;

export const bandOf = (share: number): Band => (share >= SOLID ? 'solid' : share >= LIKELY ? 'likely' : 'close');

/** Tenths of the share, as one digit or a range near a rounding boundary. Not rendered since update 3; kept for tests and tools. */
export function digitsFor(share: number): [number] | [number, number] {
  const x = Math.max(0, Math.min(1, share)) * 10;
  const lo = Math.floor(x);
  if (lo >= 10) return [10];
  const boundary = (lo + 0.5) / 10;
  return Math.abs(share - boundary) < BOUNDARY_SLACK - 1e-12 ? [lo, lo + 1] : [Math.round(x)];
}

export function stabilityBand(s: Stability | null, ra: Rationale): { band: Band; label: string; digits: null; show: boolean } {
  const share = s?.share ?? 0;
  const band = bandOf(share);
  const show = !!s && s.draws > 0 && (ra.state === 'clear' || ra.state === 'close') && s.top === ra.top;
  return { band, label: C.stability.labels[band], digits: null, show };
}

/** The sentence, or null when it is hidden. Words per band, never a count. */
export function stabilityText(b: ReturnType<typeof stabilityBand>): string | null {
  if (!b.show) return null;
  return C.stability.words[b.band];
}

/** How the test is made, with the real number of draws and the size of a typical nudge. */
export function stabilityHow(draws: number, concentration: number): string {
  if (!(draws > 0)) return C.stability.howNone;
  // Dirichlet(κ·p): the standard deviation of a component with share p is sqrt(p(1−p)/(κ+1)); quoted for p = 1/4.
  const sd = Math.sqrt((0.25 * 0.75) / (Math.max(concentration, 0) + 1)) * 100;
  return C.stability.how(fmtCount(draws), String(Math.max(1, Math.round(sd))));
}
