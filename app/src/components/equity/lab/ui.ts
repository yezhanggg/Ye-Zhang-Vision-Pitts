// The Policy lab's shared words, colors and formats (PolicyLab, LabLevers, LabResults). Online only.
import type { MeasureId } from '../../../lib/equity/measures';
import { EXAMPLES, LEVER_KEYS, moved, TEST_TYPES, type ChangeClass, type LeverId, type ResultClass, type Scenario, type Summary, type TestType } from '../../../lib/policylab/lab';

/** What the map shows: the test project under your rules, its change from today, homes by right, or a need measure. */
export type Layer = 'result' | 'change' | 'capacity' | MeasureId;
export const isNeed = (l: Layer): l is MeasureId => l !== 'result' && l !== 'change' && l !== 'capacity';

export const FIELD = 'w-full rounded-lg border border-stone-300 bg-white px-2 py-1 text-small text-slate-900 tnum focus:border-violet-500 focus:outline-none';
export const CARD = 'rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200';
export const SUB = 'text-caption font-semibold uppercase tracking-wide text-slate-500';
export const TODAY_COLOR = '#94a3b8';
export const YOURS = '#7c3aed';

export const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
export const usdK = (v: number) => (v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${Math.round(v / 1000)}k`);
export const plural = (n: number, one: string, many = `${one}s`) => `${n0(n)} ${n === 1 ? one : many}`;

export const RESULT_COLOR: Record<ResultClass, string> = {
  works: '#047857',
  hearingWorks: '#0891b2',
  close: '#6ee7b7',
  gap50: '#fecdd3',
  gap150: '#fb7185',
  gap250: '#e11d48',
  gapMore: '#881337',
  zoning: '#f59e0b',
  unread: '#fde68a',
  screened: '#94a3b8',
  nodata: '#e7e5e4',
};
/** Readable text colors for the result words (the light map colors are too pale for text). */
export const RESULT_TEXT: Record<ResultClass, string> = { works: '#047857', hearingWorks: '#0e7490', close: '#047857', gap50: '#e11d48', gap150: '#e11d48', gap250: '#be123c', gapMore: '#881337', zoning: '#b45309', unread: '#92400e', screened: '#475569', nodata: '#64748b' };
export const RESULT_WORD: Record<ResultClass, string> = {
  works: 'Works by right',
  hearingWorks: 'Works with a hearing',
  close: 'Breaks even, under the bar',
  gap50: 'Short under $50k a unit',
  gap150: 'Short $50k–$150k a unit',
  gap250: 'Short $150k–$250k a unit',
  gapMore: 'Short over $250k a unit',
  zoning: 'Not allowed',
  unread: 'Zoning not read',
  screened: 'Left out by your values',
  nodata: 'No rent on file',
};
export const CHANGE_COLOR: Record<ChangeClass, string> = {
  nowWorks: '#047857',
  better: '#6ee7b7',
  same: '#d6d3d1',
  worse: '#fb7185',
  stops: '#9f1239',
  zoning: '#f59e0b',
  unread: '#fde68a',
  screened: '#94a3b8',
  nodata: '#f5f5f4',
};
export const CHANGE_WORD: Record<ChangeClass, string> = {
  nowWorks: 'Now works',
  better: 'Better off',
  same: 'No change',
  worse: 'Worse off',
  stops: 'Stops working',
  zoning: 'Not allowed',
  unread: 'Zoning not read',
  screened: 'Left out by your values',
  nodata: 'No rent on file',
};

/** Homes allowed by right: the count, or its change from today. */
export const CAP_BINS = { colors: ['#f5f5f4', '#ccfbf1', '#5eead4', '#14b8a6', '#0f766e'], words: ['None', '1–100', '101–300', '301–1,000', 'Over 1,000'] };
export const capBin = (v: number) => (v <= 0 ? 0 : v <= 100 ? 1 : v <= 300 ? 2 : v <= 1000 ? 3 : 4);
export const CAP_CHANGE = { colors: ['#be123c', '#fda4af', '#e7e5e4', '#99f6e4', '#2dd4bf', '#0f766e'], words: ['100 or more fewer', '1–99 fewer', 'No change', '1–500 more', '501–1,500 more', 'Over 1,500 more'] };
export const capChangeBin = (d: number) => (d <= -100 ? 0 : d < 0 ? 1 : d === 0 ? 2 : d <= 500 ? 3 : d <= 1500 ? 4 : 5);

/** Short names on the type buttons. */
export const TYPE_SHORT: Record<TestType, string> = { duplex: 'Duplex', triplex: 'Triplex', fourplex: 'Fourplex', townhomes: 'Townhomes', small: 'Small apt.', apartments: 'Apartments', senior: 'Senior' };
export const TYPE_TIP: Record<TestType, string> = {
  duplex: 'Two homes in one building: by right in R2, R3 and RM',
  triplex: 'Three homes in one building: by right in R3 and RM',
  fourplex: 'Four homes in one building: a multi-unit building, by right in RM and the mixed-use districts',
  townhomes: 'Attached homes, each on its own lot: by right from R1A up',
  small: 'A small apartment building',
  apartments: 'An apartment building',
  senior: 'Housing for people 62 and older: always needs a zoning exception or hearing (§911.02)',
};

/** "A 40-unit building (market rate)". */
export function projectName(s: Pick<Scenario, 'type' | 'units' | 'devType'>): string {
  const t = s.type;
  const what = t === 'duplex' || t === 'triplex' || t === 'fourplex' ? `A ${TEST_TYPES[t].label.toLowerCase()}` : t === 'townhomes' ? `${s.units} townhomes` : t === 'senior' ? `A ${s.units}-unit senior building` : `A ${s.units}-unit apartment building`;
  return `${what} (${s.devType === 'market' ? 'market rate' : '9% tax credits'})`;
}

export const EVIDENCE = {
  text: 'In practice: by early 2025, 35 of the 116 IZ homes expected in Lawrenceville were occupied; the City Controller found the effect on production inconclusive (few projects).',
  url: 'https://www.pittsburghpa.gov/files/assets/city/v/1/controller/special-report-inclusionary-zoning.pdf',
};

export const anyMoved = (s: Scenario) => (Object.keys(LEVER_KEYS) as LeverId[]).some((id) => moved(s, id));
const was = (a: number, b: number, f: (v: number) => string = n0) => (a === b ? '' : ` (today ${f(a)})`);

/** The answer in a few sentences. Works counts by right only; a hearing or zoning not read is said apart. */
export function answer(s: Scenario, today: Summary, yours: Summary, range: { cheaper: number; dearer: number }): { lead: string; lines: string[]; notes: string[] } {
  const any = anyMoved(s);
  const rules = any ? ' under your rules' : ' under today’s rules';
  const lead =
    yours.allowed || !yours.hearing
      ? `${projectName(s)} works by right in ${yours.works} of ${yours.tracts} tracts${rules}${any ? was(today.works, yours.works) || ', the same as today' : ''}.`
      : `${projectName(s)} is allowed by right nowhere${rules}: it needs a zoning hearing in ${plural(yours.hearing, 'tract')}.`;
  const credits = s.devType === 'affordable';
  const allowed = yours.allowed
    ? `Zoning allows it by right in ${plural(yours.allowed, 'tract')}${was(today.allowed, yours.allowed)}${yours.hearing ? `, and with a hearing in ${n0(yours.hearing)} more` : ''}.`
    : yours.hearing
      ? ''
      : 'Zoning allows it by right nowhere.';
  const hearing = yours.worksHearing
    ? `With a hearing, it would ${yours.allowed ? 'also ' : ''}work in ${plural(yours.worksHearing, 'tract')}${was(today.worksHearing, yours.worksHearing)}.`
    : !yours.allowed && yours.hearing
      ? 'Even with a hearing, the money falls short everywhere.'
      : '';
  const unread = yours.unread ? `Zoning isn’t read in ${plural(yours.unread, 'tract')} (downtown, riverfront, special districts)${yours.unreadPencils ? `; the money would work in ${n0(yours.unreadPencils)} of them: check the code there` : ''}.` : '';
  const gap = yours.medianGap != null ? `Where it falls short, the median gap is ${usdK(yours.medianGap)} a unit${today.medianGap != null && Math.abs(today.medianGap - yours.medianGap) >= 1000 ? ` (today ${usdK(today.medianGap)})` : ''}.` : '';
  const room = `Zoning room: ${n0(yours.capacity)} homes allowed by right${was(today.capacity, yours.capacity)}.`;
  const cost =
    range.cheaper === range.dearer
      ? `The count holds if building costs $${EXAMPLES.costSpread} a sq ft more or less.`
      : `It works in ${range.dearer} to ${range.cheaper} tracts if building costs $${EXAMPLES.costSpread} a sq ft more or less${credits && range.dearer < range.cheaper / 2 ? ': 9% credits are capped, so above a cost they can’t fill the gap anywhere' : ''}.`;
  const win = credits ? 'This assumes the project wins 9% credits, which are competitive: PHFA scores each site (Place shows the score).' : '';
  const hint = any ? '' : 'Pick a policy on the left, or start from a package, to test it.';
  const lines = [allowed, hearing, unread, gap, room, cost, win, hint].filter(Boolean);
  /** What the headline numbers don't say: the hearing, unread zoning, the cost range, the credits. */
  const notes = [hearing, unread, cost, win, hint].filter(Boolean);
  return { lead, lines, notes };
}
