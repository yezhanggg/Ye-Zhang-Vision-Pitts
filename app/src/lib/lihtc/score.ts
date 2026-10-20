// The tax credit score sheet: the pure half. PHFA's selection criteria are data (data/lazy/lihtc_pa.json, transcribed
// from the Qualified Allocation Plan and the Tab 3 self-scoring sheet); this file only adds up what has been entered,
// applies PHFA's caps, and says what each open line could still add. Nothing here predicts what PHFA will award.

export type Kind = 'new' | 'preservation';
export type Occupancy = 'general' | 'senior';
export type Credit = 'nine' | 'four';
/** Who or what decides a line (this project's reading, not PHFA's wording). */
export type Basis = 'place' | 'lookup' | 'site' | 'design' | 'partners' | 'team' | 'finance';

/** A step on a line scored from a number: `over` is strictly more than, `from` is at least. */
export interface Tier {
  over?: number;
  from?: number;
  points: number;
}
export interface Option {
  id: string;
  label: string;
  points: number;
}
export interface Item {
  id: string;
  label: string;
  max: number;
  /** Below zero only on a deduction line. */
  min?: number;
  basis: Basis;
  /** auto: read from the place; check: yes or no; choice: one option; percent and score: a number through `tiers`; points: entered as points. */
  input: 'auto' | 'check' | 'choice' | 'percent' | 'score' | 'points';
  kind?: Kind[];
  occupancy?: Occupancy[];
  unit?: string;
  tiers?: Tier[];
  options?: Option[];
  auto?: 'transit';
  /** A place fact the line also needs, whatever number is entered. */
  requires?: 'transit';
  rule: string;
  ref: string;
  evidence?: string[];
  link?: { label: string; url: string };
}
export interface Section {
  id: string;
  label: string;
  max: number;
  items: Item[];
}
/** Lines that share a ceiling (`max`), or of which only the best one counts (`best`). */
export interface Group {
  ids: string[];
  max?: number;
  best?: boolean;
  label: string;
}
export interface Sheet {
  id: string;
  label: string;
  status: 'adopted' | 'draft';
  title: string;
  sources: { title: string; url: string }[];
  max: number;
  thresholds: { id: Credit; label: string; points: Record<Kind, number> }[];
  remarks: string[];
  sections: Section[];
  groups?: Group[];
}
export interface SheetFile {
  version: string;
  what: string;
  retrieved: string;
  pool: { id: string; label: string; why: string };
  bases: Record<Basis, string>;
  /** PHFA's next deadlines, as checked on `checked`; `status` says whether they come from an adopted plan. */
  dates?: { checked: string; status: string; items: KeyDate[] };
  sheets: Sheet[];
}

export interface KeyDate {
  credit: Credit;
  label: string;
  /** ISO date, or null for a rule with no fixed date. */
  date: string | null;
  note: string;
  ref: string;
  url: string;
}

export interface Setup {
  kind: Kind;
  occupancy: Occupancy;
  credit: Credit;
}
/** check: true or false; choice: the option's id; percent, score and points: a number. */
export type Answer = boolean | number | string | null | undefined;
export type Answers = Record<string, Answer>;
/** What the place itself settles. null = not measured. */
export interface Facts {
  transit: boolean | null;
}
/** The answer key that overrides the measured transit fact for a particular site. */
export const TRANSIT_KEY = '@transit';

export const applies = (item: Item, s: Pick<Setup, 'kind' | 'occupancy'>) => (!item.kind || item.kind.includes(s.kind)) && (!item.occupancy || item.occupancy.includes(s.occupancy));

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const passes = (t: Tier, v: number) => (t.over != null ? v > t.over : t.from != null ? v >= t.from : false);

/** Points for a number on a tiered line: the best step it reaches. */
export function tierPoints(tiers: Tier[], v: number): number {
  let best = 0;
  for (const t of tiers) if (passes(t, v) && t.points > best) best = t.points;
  return best;
}

/** The next step above a number: what it takes and what the line would then score. */
export function nextTier(tiers: Tier[], v: number | null): { tier: Tier; points: number } | null {
  const now = v == null ? 0 : tierPoints(tiers, v);
  const above = tiers.filter((t) => t.points > now).sort((a, b) => a.points - b.points);
  return above.length ? { tier: above[0], points: above[0].points } : null;
}

/** "over 25", "70 or more" */
export const tierWords = (t: Tier, unit = '') => {
  const u = unit.startsWith('%') ? '%' : '';
  return t.over != null ? `over ${t.over}${u}` : `${t.from}${u} or more`;
};

/** Whether the site is within half a mile of a transit stop: the entry for this site if there is one, else the measured fact. */
export const transitMet = (answers: Answers, facts: Facts) => (typeof answers[TRANSIT_KEY] === 'boolean' ? (answers[TRANSIT_KEY] as boolean) : facts.transit === true);

/** Points one line earns from its answer, before any cap. */
export function itemPoints(item: Item, answers: Answers, facts: Facts): number {
  const a = answers[item.id];
  switch (item.input) {
    case 'auto':
      return item.auto === 'transit' && transitMet(answers, facts) ? item.max : 0;
    case 'check':
      return a === true ? item.max : 0;
    case 'choice':
      return item.options?.find((o) => o.id === a)?.points ?? 0;
    case 'percent':
    case 'score':
      if (!num(a)) return 0;
      if (item.requires === 'transit' && !transitMet(answers, facts)) return 0;
      return tierPoints(item.tiers ?? [], a);
    case 'points':
      return num(a) ? Math.min(item.max, Math.max(item.min ?? 0, Math.round(a))) : 0;
  }
}

/** The most a line can earn. */
const topOf = (item: Item) => item.max;

interface Tally {
  counted: Map<string, number>;
  sections: number[];
  total: number;
  lost: { label: string; lost: number }[];
}

/** Add up raw line points through PHFA's caps: shared ceilings first, then each section's maximum. */
function tally(sheet: Sheet, setup: Setup, raw: Map<string, number>): Tally {
  const counted = new Map(raw);
  const lost: Tally['lost'] = [];
  for (const g of sheet.groups ?? []) {
    const ids = g.ids.filter((id) => counted.has(id));
    if (g.best) {
      const top = Math.max(0, ...ids.map((id) => counted.get(id)!));
      let kept = false;
      let cut = 0;
      for (const id of ids) {
        const p = counted.get(id)!;
        if (p === top && !kept) kept = true;
        else if (p > 0) {
          cut += p;
          counted.set(id, 0);
        }
      }
      if (cut) lost.push({ label: g.label, lost: cut });
    } else if (g.max != null) {
      let over = ids.reduce((s, id) => s + counted.get(id)!, 0) - g.max;
      if (over > 0) lost.push({ label: g.label, lost: over });
      for (let i = ids.length - 1; i >= 0 && over > 0; i--) {
        const p = counted.get(ids[i])!;
        const take = Math.min(p, over);
        counted.set(ids[i], p - take);
        over -= take;
      }
    }
  }
  const sections = sheet.sections.map((s) => {
    const sum = s.items.filter((i) => applies(i, setup)).reduce((t, i) => t + (counted.get(i.id) ?? 0), 0);
    if (sum > s.max) lost.push({ label: `${s.label} counts ${s.max} points at most`, lost: sum - s.max });
    return Math.min(sum, s.max);
  });
  return { counted, sections, total: sections.reduce((a, b) => a + b, 0), lost };
}

export interface Line {
  item: Item;
  /** Points the answer earns on its own line. */
  points: number;
  /** Points that count after the caps. */
  counted: number;
  /** What raising this line alone to its top would add to the total, caps included. */
  gain: number;
  /** For a tiered line: the next step and what it would add. */
  next: { need: string; gain: number } | null;
}
export interface SectionScore {
  section: Section;
  points: number;
  /** The most this section can reach for this kind of development. */
  max: number;
  lines: Line[];
}
export interface Score {
  sections: SectionScore[];
  total: number;
  /** The most this kind of development can reach on the sheet. */
  max: number;
  /** PHFA's minimum for the credit applied for, or null when the sheet names none. */
  threshold: number | null;
  /** Points still missing to the minimum (0 when it is met). */
  short: number;
  /** Points entered that a cap took away. */
  lost: { label: string; lost: number }[];
  /** Points that come from lines the place decides. */
  fromPlace: number;
  /**
   * The total's spread: `low` drops lines a site visit, partners or the team must confirm; `high` adds every point the
   * project's own choices (design, financing) could still reach. Not a chance of award: PHFA publishes no past scores.
   */
  range: { low: number; high: number };
}

/** Who settles a line, in three words for the sheet and the paths table. */
export type Status = 'data' | 'choice' | 'confirm';
export const STATUS_OF: Record<Basis, Status> = { place: 'data', lookup: 'data', design: 'choice', finance: 'choice', site: 'confirm', partners: 'confirm', team: 'confirm' };
export const STATUS_WORD: Record<Status, string> = { data: 'from the data', choice: 'your choice', confirm: 'to confirm' };

/** The whole sheet for one development: every line that applies, the totals, and what each open line could add. */
export function scoreSheet(sheet: Sheet, setup: Setup, answers: Answers, facts: Facts): Score {
  const items = sheet.sections.flatMap((s) => s.items).filter((i) => applies(i, setup));
  const raw = new Map(items.map((i) => [i.id, itemPoints(i, answers, facts)]));
  const now = tally(sheet, setup, raw);
  const best = tally(sheet, setup, new Map(items.map((i) => [i.id, topOf(i)])));
  const withLine = (id: string, points: number) => tally(sheet, setup, new Map(raw).set(id, points)).total;

  const sections = sheet.sections.map((section, k) => ({
    section,
    points: now.sections[k],
    max: best.sections[k],
    lines: section.items
      .filter((i) => applies(i, setup))
      .map((item): Line => {
        const points = raw.get(item.id)!;
        const gain = Math.max(0, withLine(item.id, topOf(item)) - now.total);
        let next: Line['next'] = null;
        if (item.tiers && !(item.requires === 'transit' && !transitMet(answers, facts))) {
          const a = answers[item.id];
          const step = nextTier(item.tiers, num(a) ? a : null);
          if (step) next = { need: tierWords(step.tier, item.unit), gain: Math.max(0, withLine(item.id, step.points) - now.total) };
        }
        return { item, points, counted: now.counted.get(item.id)!, gain, next };
      }),
  }));
  const threshold = sheet.thresholds.find((t) => t.id === setup.credit)?.points[setup.kind] ?? null;
  const fromPlace = sections.flatMap((s) => s.lines).filter((l) => l.item.basis === 'place' || l.item.basis === 'lookup').reduce((t, l) => t + l.counted, 0);
  const low = tally(sheet, setup, new Map(items.map((i) => [i.id, STATUS_OF[i.basis] === 'confirm' ? Math.min(0, raw.get(i.id)!) : raw.get(i.id)!]))).total;
  const high = tally(sheet, setup, new Map(items.map((i) => [i.id, STATUS_OF[i.basis] === 'choice' ? Math.max(raw.get(i.id)!, topOf(i)) : raw.get(i.id)!]))).total;
  return { sections, total: now.total, max: best.total, threshold, short: threshold == null ? 0 : Math.max(0, threshold - now.total), lost: now.lost, fromPlace, range: { low: Math.min(low, now.total), high: Math.max(high, now.total) } };
}

/** Open lines, largest gain first; ties keep the sheet's order. */
export function moves(score: Score, limit = Infinity): Line[] {
  return score.sections
    .flatMap((s) => s.lines)
    .filter((l) => l.gain > 0)
    .map((l, i) => ({ l, i }))
    .sort((a, b) => b.l.gain - a.l.gain || a.i - b.i)
    .slice(0, limit)
    .map(({ l }) => l);
}

/** Lines whose answer belongs to the site rather than to the project (they change when the place changes). */
export const isSiteLine = (item: Item) => item.basis === 'place' || item.basis === 'lookup' || item.basis === 'site';
