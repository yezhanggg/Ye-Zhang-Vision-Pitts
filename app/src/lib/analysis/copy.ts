// Wording of the Analysis tab, in one place. Templates and small formatters only: every number that reaches a
// template was computed by code, and nothing here computes a score.

// ------------------------------------------------------------------ formatters
export const joinAnd = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
/** 5 → "five"; numbers past ten stay digits. */
export const countWord = (n: number) => WORDS[n] ?? String(n);
export const fmtCount = (n: number) => Math.round(n).toLocaleString('en-US');

/** Points on the 0–100 scale, unsigned: whole numbers, one decimal under one point ("0.5", "4", "11"). */
export function pts(v: number): string {
  const a = Math.round(Math.abs(v) * 10) / 10;
  if (a === 0) return '0';
  return a < 1 ? a.toFixed(1) : String(Math.round(Math.abs(v)));
}
/** Points with one decimal, the trailing .0 dropped ("2.3", "1", "0.5"): for close calls, where whole points hide the gap. */
export const pts1 = (v: number): string => Math.abs(v).toFixed(1).replace(/\.0$/, '');
/** "1 point" / "4 points": for the hover tooltips, the only place points are printed on the Analysis tab. */
export const unit = (n: string) => (n === '1' ? 'point' : 'points');

/** Two values in points. When both round to the same whole number they print one decimal (70.2 and 69.7). */
export function pointPair(a: number, b: number): [string, string] {
  const ia = Math.round(a), ib = Math.round(b);
  if (ia !== ib) return [String(ia), String(ib)];
  const da = a.toFixed(1), db = b.toFixed(1);
  return da === db ? [String(ia), String(ib)] : [da, db];
}
/** Two scores (0–1) as points out of 100, with the one-decimal rule. */
export const scorePair = (a: number, b: number) => pointPair(a * 100, b * 100);

// ------------------------------------------------------------------ score and stances
/** The fit is a rank under the reader's stance (a value judgment), so the label says so and carries no number. */
export const fitText = (score: number | null): string => (score == null ? 'No score' : 'Best fit under your stance');

/** The three stances the Analysis tab offers. Balanced stays in the config as the equal-weights reference (Compare scenarios). */
export const APP_STANCES = ['anti_displacement', 'market_led', 'transit_first'] as const;
export type Stance = (typeof APP_STANCES)[number];
export const isStance = (id: string | null | undefined): id is Stance => (APP_STANCES as readonly string[]).includes(id ?? '');

/** One sentence on what each stance means, shown on its card. */
export const STANCE_MEANING: Record<string, string> = {
  anti_displacement: 'Protect the renters who live here now: need and displacement risk decide, market strength counts little.',
  market_led: 'Build where unsubsidized construction can work: market strength decides, need and risk count little.',
  transit_first: 'Put new homes where frequent buses and the T already run: transit access decides.',
  balanced: 'Every factor counts the same: a reference, not a stance.',
};
/** The equal-weights reference, as Compare scenarios and the stance panel name it. */
export const REFERENCE_LABEL = 'Equal weights (reference)';
export const REFERENCE_HINT = 'Equal weights (reference). Choose a stance.';

/** The Advanced disclosure that holds the published weights. */
export const ADVANCED = {
  title: 'Advanced: set your own weights',
  sub: 'Published weights, editable. Custom weights are yours to defend.',
  custom: 'Custom mix',
  footer: 'These are your judgment calls, not data. Scores use them as weights.',
};

/** What each preset's weights do, in plain words. Shown under the stance buttons. */
export const PRESET_NOTE: Record<string, string> = {
  balanced: 'Every factor counts the same. Equal weights are still a choice, not a neutral answer.',
  anti_displacement: 'Weights need and displacement risk most. It ranks building types and protects no one by itself; where risk is low it favors market-rate types.',
  market_led: 'Weights market strength most; need, displacement risk and subsidy eligibility count least.',
  transit_first: 'Weights transit access most; every other factor counts the same.',
};

// ------------------------------------------------------------------ sentence templates
const households = (n: number) => (n === 1 ? '1 household' : `${fmtCount(n)} households`);

export const ANALYSIS_COPY = {
  subsidy: {
    full: 'full subsidy eligibility (a tax-credit area)',
    partial: 'partial subsidy eligibility (community-development or Opportunity Zone area only)',
    none: 'no subsidy designation',
  },
  why: {
    lead: (top: string, place: string) => `${top} fits ${place} best under your stance`,
    because: (phrases: string[]) => ` because this place has ${joinAnd(phrases)}`,
    despite: (phrases: string[]) => `, despite ${joinAnd(phrases)}`,
    noReason: (types: number) => `, though no single factor stands out. It is the least penalized of the ${countWord(types)} types here.`,
    // Ranks and words: the runner-up is named, its score is not (the digits live in the hover tooltips of the bars).
    next: (second: string, _s2: string) => `Next is ${second}.`,
    closeSecond: (second: string, _s2: string, _s1: string) => `${second} is a very close second.`,
    onlyScored: 'No other type has a fit rule for the factors switched on.',
    tie: (names: string[], _s: string) => `${joinAnd(names)} score the same here. This is a tie, not a pick.`,
    singleFactor: (factor: string) => `Only ${factor} is switched on, so each score is just this place's rank on it. Turn on one more factor to tell the types apart.`,
    /** Several factors are on, but this place has a value for one of them only. */
    singleFactorData: (factor: string) => `Of the factors switched on, only ${factor} has data here, so each score is just this place's rank on it.`,
    zeroWeights: 'Every factor is set to zero, so nothing can be ranked. Turn at least one factor up, or pick a stance.',
    noData: (place: string, factors: string[]) => `${place} has no data for ${factors.length ? joinAnd(factors) : 'the factors switched on'}, so no housing type can be ranked. Turn on a factor that has data here.`,
    noFit: (factors: string[]) => `No housing type has a fit rule for ${factors.length ? joinAnd(factors) : 'the factors switched on'}, so nothing can be ranked. Turn on one more factor.`,
    unranked: (place: string, n: number | null, min: number) =>
      n == null ? `${place} has fewer than ${min} households, so it is shown but not ranked.` : `${place} has ${households(n)}, fewer than ${min}, so it is shown but not ranked.`,
    needGuard: (n: number) => {
      const tail = '50% of the area median income or less, so a match for low-income renters says little about this tract.';
      if (Math.round(n) === 0) return `No renter households here earn ${tail}`;
      if (Math.round(n) === 1) return `Only 1 renter household here earns ${tail}`;
      return `Only ${fmtCount(n)} renter households here earn ${tail}`;
    },
  },
  /** In words: the factor and the direction. The points (a, b) stay in the hover tooltips of the gap bars. */
  separator: (factor: string, _a: string, top: string, _b: string, second: string) => `${factor} is what separates them: it favors ${top} over ${second}.`,
  flip: {
    move: (factor: string, from: string, to: string, newTop: string) => `What would change the answer: moving ${factor} from “${from}” to “${to}” makes ${newTop} the best match.`,
    /** Both stops carry the same word, so the slider values are given instead. */
    nudge: (factor: string, from: string, to: string, word: string, newTop: string) => `What would change the answer: moving ${factor} from ${from} to ${to} (still “${word}”) makes ${newTop} the best match.`,
    none: (top: string) => `What would change the answer: no single slider does. ${top} stays the best match wherever one priority is moved.`,
  },
  rank: {
    ahead: (second: string, factor: string, _d: string) => `Ahead of ${second} on ${factor}`,
    behind: (top: string, factor: string, _d: string) => `Behind ${top} on ${factor}`,
    helpedHeld: (b: string | null, d: string | null) => (b && d ? `Helped by ${b}; held back by ${d}` : b ? `Helped by ${b}` : d ? `Held back by ${d}` : 'No factor stands out'),
    tied: (others: string[]) => `Tied with ${joinAnd(others)}`,
    unscored: (type: string) => `${type}: not scored. It has no fit rule for the factors switched on.`,
  },
  stability: {
    labels: { solid: 'Solid pick', likely: 'Likely pick', close: 'Close call' } as Record<'solid' | 'likely' | 'close', string>,
    // Words only: the share of draws stays out of the interface (it read as a precision the method does not have).
    words: {
      solid: 'The order holds under small changes to the weights.',
      likely: 'The order is likely to hold.',
      close: 'A close call: a small change in the weights flips it.',
    } as Record<'solid' | 'likely' | 'close', string>,
    how: (draws: string, typical: string) =>
      `We nudge the weights at random ${draws} times and re-score this place each time. The sentence says how often the same housing type stays on top: most of the time, more than half, or less. Each nudge is small: a factor that holds a quarter of the decision typically moves by about ${typical} percentage points. It tests the weights only, not errors in the data. A close call means a small change in the weights could change the answer.`,
    howNone: 'Fewer than two factors are switched on with data here, so there are no weights to nudge and nothing to test.',
  },
  chips: {
    scored: (n: number, m: number) => `Scored on ${n} of ${m} factors`,
    scoredDetail: (missing: string[], off: string[]) => [missing.length ? `No data here: ${joinAnd(missing)}.` : '', off.length ? `Switched off: ${joinAnd(off)}.` : ''].filter(Boolean).join(' '),
    need: (n: number) => `${Math.round(n) === 1 ? '1 renter household' : `${fmtCount(n)} renter households`} at or below 50% AMI`,
    needUnknown: 'Low-income renter count not available',
    tie: 'Tie',
    // The lead in words; the points (d) stay in the tooltips.
    close: (_d: string, second: string) => `Close call with ${second}`,
    clear: (_d: string, _second: string) => 'Clear lead',
  },
  compare: {
    needTwo: 'Pick two places to compare.',
    unranked: (place: string, which: 'A' | 'B', n: number | null, min: number) =>
      `${place} is not ranked (${n == null ? `fewer than ${min} households` : `${households(n)}, fewer than ${min}`}). Pick another place for ${which}.`,
    noScore: (place: string, which: 'A' | 'B') => `${place} has no data for the factors switched on, so it cannot be ranked. Pick another place for ${which}.`,
    noData: (place: string) => `No data for ${place}: not compared`,
    noDataBoth: 'No data for either place: not compared',
  },
  scenarios: {
    edited: (preset: string) => `${preset} (edited)`,
    alreadySaved: (name: string) => `Already saved as ${name}.`,
  },
  link: {
    copy: 'Copy link',
    copied: 'Link copied',
    fileOnly: 'This link opens only on this computer.',
  },
  pickSummary: (ties: number) => (ties === 0 ? 'No ties.' : ties === 1 ? '1 of these is a tie, not a pick.' : `${fmtCount(ties)} of these are ties, not picks.`),
};
