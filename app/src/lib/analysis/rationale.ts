// Why a housing type comes first, in words that cannot contradict the numbers.
//
// The direction rule rests on one identity from lib/scoring.ts: a factor's lift, w·(c − c0)/den with c0 the
// contribution at x = 0.5, is positive exactly when the tract's value pushes in the direction the type's fit rule
// wants. "Because" lists positive lift, "despite" lists negative lift, and the wording of every reason comes from
// the VALUE (high or low, or the subsidy grade), never from the fit direction. Pure functions with an optional
// config argument (the shipped config by default), so tests run on small synthetic configs. lib/derived.ts is untouched.
import { FACTOR_COPY, factorName } from '../copy';
import { scoring, tractLabel } from '../data';
import type { TractResult } from '../derived';
import { isTie, rank, scoreTract, topMargin, type Part } from '../scoring';
import type { ScoringConfig, TractProps, Weights } from '../types';
import { ANALYSIS_COPY as C, joinAnd, pointPair, pts, pts1, scorePair } from './copy';

/** Lift below this (one point on the 0–100 scale) is neither a reason for nor against. */
export const EPS_LIFT = 0.01;
/** Top two closer than this: a tie, not a pick. */
export const TIE = 0.005;
/** Top two closer than this: a close call. */
export const CLOSE = 0.03;
/** Fewer low-income renter households than this and a match for them says little. */
export const NEED_MIN = 25;
/** Tracts with fewer households than this are shown but not ranked (the pipeline's rule). */
export const HOUSEHOLD_MIN = 25;
const SUBSIDY = 'subsidy_eligible';

export type AnswerState = 'unranked' | 'zero_weights' | 'no_data' | 'tie' | 'close' | 'clear';

export interface Reason {
  factor: string;
  x: number;
  d: number;
  w: number;
  lift: number;
  contrib: number;
  phrase: string;
  side: 'because' | 'despite';
}

/** One factor's contribution to two typologies, in points on the 0–100 scale. */
export interface Separator {
  factor: string;
  top: number;
  second: number;
  delta: number;
}

export interface Rationale {
  state: AnswerState;
  top: string | null;
  second: string | null;
  topScore: number | null;
  secondScore: number | null;
  margin: number | null;
  /** Typologies within the tie margin of the top, top first; empty unless the state is a tie. */
  tied: string[];
  /** Typologies with no score: no fit rule for the factors switched on. */
  unscored: string[];
  /** Every reason for the top pick, strongest first (the sentence uses the first two). */
  because: Reason[];
  /** Every reason against it, strongest first (the sentence uses the first). */
  despite: Reason[];
  separator: Separator | null;
  scored: { n: number; m: number; missing: string[]; off: string[] };
  need: { count: number | null; low: boolean };
  /** The only factor with a value and a weight here, when there is just one. */
  singleFactor: string | null;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export const tieMargin = (cfg: ScoringConfig = scoring) => cfg.scoring.tie_margin ?? TIE;
export const closeMargin = (cfg: ScoringConfig = scoring) => cfg.scoring.close_margin ?? CLOSE;

// ------------------------------------------------------------------ labels
export const typeLabel = (k: string | null | undefined, cfg: ScoringConfig = scoring): string => (k ? cfg.typologies.find((t) => t.id === k)?.label ?? k : '—');
export const factorLabel = (f: string, cfg: ScoringConfig = scoring): string => factorName(f, cfg.factors.find((x) => x.id === f)?.label ?? f.replace(/_/g, ' '));

/** Scores, ranking and top pick for one tract under a weight set, like derived.resultFor but for any config. */
export function resultWith(t: TractProps, w: Weights, cfg: ScoringConfig = scoring): TractResult {
  if (!t.residential) return { scores: [], ranking: [], top: null, topScore: null };
  const scores = scoreTract(t, w, cfg);
  const ranking = rank(scores);
  const top = ranking[0] ?? null;
  return { scores, ranking, top, topScore: top ? (scores.find((s) => s.typology === top)!.score as number) : null };
}

// ------------------------------------------------------------------ reasons
/** Wording from the VALUE: high or low phrase, or the subsidy grade. Never from the fit direction. */
export function valuePhrase(factor: string, x: number, cfg: ScoringConfig = scoring): string {
  if (factor === SUBSIDY && cfg.factor_options?.subsidy?.mode !== 'flag') return x >= 0.75 ? C.subsidy.full : x >= 0.25 ? C.subsidy.partial : C.subsidy.none;
  const c = FACTOR_COPY[factor];
  if (!c) return factorLabel(factor, cfg).toLowerCase();
  return x >= 0.5 ? c.high : c.low;
}

const reason = (p: Part, side: Reason['side'], cfg: ScoringConfig): Reason => ({ factor: p.factor, x: p.x, d: p.d, w: p.w, lift: p.lift, contrib: p.contrib, phrase: valuePhrase(p.factor, p.x, cfg), side });

/** Reasons for and against typology k: positive lift (strongest first) and negative lift (strongest first). */
export function reasonsFor(r: TractResult, k: string, max: { because: number; despite: number } = { because: Infinity, despite: Infinity }, cfg: ScoringConfig = scoring): { because: Reason[]; despite: Reason[] } {
  const s = r.scores.find((x) => x.typology === k);
  if (!s || s.score == null) return { because: [], despite: [] };
  const because = s.parts.filter((p) => p.lift > EPS_LIFT).sort((a, b) => b.lift - a.lift).slice(0, max.because).map((p) => reason(p, 'because', cfg));
  const despite = s.parts.filter((p) => p.lift < -EPS_LIFT).sort((a, b) => a.lift - b.lift).slice(0, max.despite).map((p) => reason(p, 'despite', cfg));
  return { because, despite };
}

/** Every factor's contribution to a and to b in points, largest difference in favor of a first. The deltas sum to the score gap × 100. */
export function factorGaps(r: TractResult, a: string, b: string): Separator[] {
  const sa = r.scores.find((s) => s.typology === a), sb = r.scores.find((s) => s.typology === b);
  if (!sa || !sb || sa.score == null || sb.score == null) return [];
  const ids = [...new Set([...sa.parts.map((p) => p.factor), ...sb.parts.map((p) => p.factor)])];
  return ids
    .map((f) => {
      const top = (sa.parts.find((p) => p.factor === f)?.contrib ?? 0) * 100;
      const second = (sb.parts.find((p) => p.factor === f)?.contrib ?? 0) * 100;
      return { factor: f, top, second, delta: top - second };
    })
    .sort((x, y) => y.delta - x.delta);
}

/** The factor with the largest contribution difference in favor of a, or null when none favors a. */
export function separator(r: TractResult, a: string, b: string): Separator | null {
  const g = factorGaps(r, a, b)[0];
  return g && g.delta > 1e-9 ? g : null;
}

/** Typologies within eps of the top score, top first; empty when the top stands alone. */
export function tiedWith(r: TractResult, eps = TIE): string[] {
  if (!r.top || r.topScore == null) return [];
  const top = r.topScore;
  const ids = r.ranking.filter((k) => {
    const s = r.scores.find((x) => x.typology === k)?.score;
    return s != null && top - s < eps;
  });
  return ids.length >= 2 ? ids : [];
}

/** n = factors with a value here AND a weight above zero; m = every factor in the config. */
export function scoredOn(t: TractProps, w: Weights, cfg: ScoringConfig = scoring): Rationale['scored'] {
  const ids = cfg.factors.map((f) => f.id);
  const on = (f: string) => (w[f] ?? 0) > 0;
  return {
    n: ids.filter((f) => isNum(t[f]) && on(f)).length,
    m: ids.length,
    missing: ids.filter((f) => !isNum(t[f])),
    off: ids.filter((f) => !on(f)),
  };
}

/** Renter households at or below 50% AMI, and whether there are too few for the match to mean much. */
export function needGuard(t: TractProps, min = NEED_MIN): Rationale['need'] {
  const count = isNum(t.need_count) ? t.need_count : null;
  return { count, low: count != null && count < min };
}

/** Typology ids in config order that have no score. */
const unscoredOf = (r: TractResult, cfg: ScoringConfig) => cfg.typologies.map((t) => t.id).filter((k) => (r.scores.find((s) => s.typology === k)?.score ?? null) == null);

// ------------------------------------------------------------------ the rationale
export function rationale(t: TractProps, r: TractResult, w: Weights, cfg: ScoringConfig = scoring): Rationale {
  const scored = scoredOn(t, w, cfg);
  const need = needGuard(t);
  const base: Rationale = { state: 'clear', top: null, second: null, topScore: null, secondScore: null, margin: null, tied: [], unscored: [], because: [], despite: [], separator: null, scored, need, singleFactor: null };
  if (!t.residential) return { ...base, state: 'unranked' };
  if (scored.m > 0 && scored.off.length === scored.m) return { ...base, state: 'zero_weights' };
  const singleFactor = scored.n === 1 ? cfg.factors.map((f) => f.id).find((f) => isNum(t[f]) && (w[f] ?? 0) > 0) ?? null : null;
  if (!r.top || r.topScore == null) return { ...base, state: 'no_data', unscored: unscoredOf(r, cfg), singleFactor };
  const margin = topMargin(r.scores);
  const state: AnswerState = margin == null ? 'clear' : margin < tieMargin(cfg) ? 'tie' : margin < closeMargin(cfg) ? 'close' : 'clear';
  const second = r.ranking[1] ?? null;
  const secondScore = second ? r.scores.find((s) => s.typology === second)?.score ?? null : null;
  const { because, despite } = reasonsFor(r, r.top, undefined, cfg);
  return {
    state,
    top: r.top,
    second,
    topScore: r.topScore,
    secondScore,
    margin,
    tied: state === 'tie' ? tiedWith(r, tieMargin(cfg)) : [],
    unscored: unscoredOf(r, cfg),
    because,
    despite,
    separator: state !== 'tie' && second ? separator(r, r.top, second) : null,
    scored,
    need,
    singleFactor,
  };
}

// ------------------------------------------------------------------ sentences
/** The single-factor sentence, when only one factor is on (or has data here) and the config has more. */
function singleFactorSentence(ra: Rationale, cfg: ScoringConfig): string | null {
  if (!ra.singleFactor || ra.scored.m < 2) return null;
  const label = factorLabel(ra.singleFactor, cfg);
  return ra.scored.off.length === ra.scored.m - 1 ? C.why.singleFactor(label) : C.why.singleFactorData(label);
}

/** The why sentence for every state. Reasons after "because" always have positive lift; after "despite", negative. */
export function whySentence(t: TractProps, ra: Rationale, cfg: ScoringConfig = scoring): string {
  const place = tractLabel(t);
  if (ra.state === 'unranked') return C.why.unranked(place, isNum(t.households) ? t.households : null, HOUSEHOLD_MIN);
  if (ra.state === 'zero_weights') return C.why.zeroWeights;
  if (ra.state === 'no_data') {
    const on = cfg.factors.map((f) => f.id).filter((f) => !ra.scored.off.includes(f));
    if (ra.scored.n === 0) return C.why.noData(place, on.filter((f) => ra.scored.missing.includes(f)).map((f) => factorLabel(f, cfg)));
    return C.why.noFit(on.filter((f) => !ra.scored.missing.includes(f)).map((f) => factorLabel(f, cfg)));
  }
  const single = singleFactorSentence(ra, cfg);
  const parts: string[] = [];
  if (ra.state === 'tie') {
    parts.push(C.why.tie(ra.tied.map((k) => typeLabel(k, cfg)), String(Math.round((ra.topScore ?? 0) * 100))));
  } else {
    const b = ra.because.slice(0, 2).map((x) => x.phrase), d = ra.despite.slice(0, 1).map((x) => x.phrase);
    let s = C.why.lead(typeLabel(ra.top, cfg), place);
    if (b.length) s += C.why.because(b) + (d.length ? C.why.despite(d) : '') + '.';
    else s += C.why.noReason(cfg.typologies.length);
    parts.push(s);
    if (ra.second && ra.secondScore != null && ra.topScore != null) {
      const [s1, s2] = scorePair(ra.topScore, ra.secondScore);
      parts.push(ra.state === 'close' ? C.why.closeSecond(typeLabel(ra.second, cfg), s2, s1) : C.why.next(typeLabel(ra.second, cfg), String(Math.round(ra.secondScore * 100))));
    } else if (ra.unscored.length) parts.push(C.why.onlyScored);
  }
  if (single) parts.push(single);
  return parts.join(' ');
}

/** "What separates them: …", or null when nothing does (tie, one type scored, not ranked). */
export function separatorSentence(ra: Rationale, cfg: ScoringConfig = scoring): string | null {
  if (!ra.separator || !ra.top || !ra.second) return null;
  const [a, b] = pointPair(ra.separator.top, ra.separator.second);
  return C.separator(factorLabel(ra.separator.factor, cfg), a, typeLabel(ra.top, cfg), b, typeLabel(ra.second, cfg));
}

/** The need-guard sentence, or null when the count is fine or unknown. */
export function needSentence(ra: Rationale): string | null {
  return ra.need.low && ra.need.count != null ? C.why.needGuard(ra.need.count) : null;
}

/** One line under a typology in the ranking list. Empty when nothing is ranked. */
export function rankLine(r: TractResult, k: string, ra: Rationale, cfg: ScoringConfig = scoring): string {
  if (ra.state === 'unranked' || ra.state === 'zero_weights' || ra.state === 'no_data') return '';
  const label = typeLabel(k, cfg);
  if (ra.unscored.includes(k) || (r.scores.find((s) => s.typology === k)?.score ?? null) == null) return C.rank.unscored(label);
  if (ra.state === 'tie' && ra.tied.includes(k)) return C.rank.tied(ra.tied.filter((x) => x !== k).map((x) => typeLabel(x, cfg)));
  if (ra.separator && ra.second && k === ra.top) return C.rank.ahead(typeLabel(ra.second, cfg), factorLabel(ra.separator.factor, cfg), pts(ra.separator.delta));
  if (ra.separator && ra.top && k === ra.second) return C.rank.behind(typeLabel(ra.top, cfg), factorLabel(ra.separator.factor, cfg), pts(ra.separator.delta));
  const { because, despite } = reasonsFor(r, k, { because: 1, despite: 1 }, cfg);
  return C.rank.helpedHeld(because[0]?.phrase ?? null, despite[0]?.phrase ?? null);
}

// ------------------------------------------------------------------ guard chips
export interface GuardChip {
  id: 'scored' | 'need' | 'lead';
  text: string;
  /** neutral: fine · warn: a data gap (amber) · alert: the score should be greyed (rose) · tie: a tie, not a pick */
  tone: 'neutral' | 'warn' | 'alert' | 'tie';
  detail?: string;
}

/** The three chips under the answer: factors scored, low-income renter count, and the lead over the runner-up. */
export function guardChips(ra: Rationale, cfg: ScoringConfig = scoring): GuardChip[] {
  if (ra.state === 'unranked') return [];
  const out: GuardChip[] = [];
  const gap = ra.scored.missing.filter((f) => !ra.scored.off.includes(f));
  out.push({
    id: 'scored',
    text: C.chips.scored(ra.scored.n, ra.scored.m),
    tone: gap.length ? 'warn' : 'neutral',
    detail: C.chips.scoredDetail(gap.map((f) => factorLabel(f, cfg)), ra.scored.off.map((f) => factorLabel(f, cfg))) || undefined,
  });
  out.push(ra.need.count == null ? { id: 'need', text: C.chips.needUnknown, tone: 'neutral' } : { id: 'need', text: C.chips.need(ra.need.count), tone: ra.need.low ? 'alert' : 'neutral', detail: needSentence(ra) ?? undefined });
  if (ra.state === 'tie') out.push({ id: 'lead', text: C.chips.tie, tone: 'tie', detail: joinAnd(ra.tied.map((k) => typeLabel(k, cfg))) });
  else if ((ra.state === 'close' || ra.state === 'clear') && ra.second && ra.margin != null) {
    const second = typeLabel(ra.second, cfg);
    out.push({ id: 'lead', text: ra.state === 'close' ? C.chips.close(pts1(ra.margin * 100), second) : C.chips.clear(pts(ra.margin * 100), second), tone: 'neutral' });
  }
  return out;
}

// ------------------------------------------------------------------ city summary
/** Best-match counts over a result set (ties counted for the type listed first, as on the map) and how many of those are ties. */
export function pickCounts(results: Map<string, TractResult>, eps = TIE): { counts: Record<string, number>; ties: number } {
  const counts: Record<string, number> = {};
  let ties = 0;
  for (const r of results.values()) {
    if (!r.top) continue;
    counts[r.top] = (counts[r.top] ?? 0) + 1;
    if (isTie(r.scores, eps)) ties++;
  }
  return { counts, ties };
}
