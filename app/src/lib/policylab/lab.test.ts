import { describe, expect, it } from 'vitest';
import { bonusPoints, changeClass, costRange, leverEffects, rentAt, resultClass, runScenario, START, TEST_TYPES, TODAY, type Scenario, type TractOutcome } from './lab';

const today: Scenario = START;
const typed = (t: keyof typeof TEST_TYPES, more: Partial<Scenario> = {}): Scenario => ({ ...today, type: t, units: TEST_TYPES[t].units, stories: TEST_TYPES[t].stories, devType: TEST_TYPES[t].devType, ...more });

describe('the Policy lab', () => {
  const base = runScenario(today);
  it('runs the test project in every tract with data, and counts homes by right', () => {
    expect(base.tracts.length).toBeGreaterThan(100);
    expect(base.summary.tested).toBeGreaterThan(40);
    expect(base.summary.capacity).toBeGreaterThan(30000);
  });

  it('IZ-O rents: 30% of the 50% AMI limit for 1.5 people a bedroom, less the utility allowance', () => {
    // 2BR: 3 people, $49,700 × 30% ÷ 12 = $1,242.50, less $171 = $1,072 (rounded)
    expect(rentAt(50, 2)).toBe(Math.round((49700 * 0.3) / 12 - 171));
    expect(rentAt(30, 1)).toBeLessThan(rentAt(50, 1));
  });

  it('zoning: the old lot minimums allow fewer homes by right; more homes on house lots allow more', () => {
    expect(runScenario({ ...today, lots: 'pre2025' }).summary.capacity).toBeLessThan(base.summary.capacity);
    const adu = runScenario({ ...today, houseLots: 'adu' }).summary.capacity;
    const three = runScenario({ ...today, houseLots: 'three' }).summary.capacity;
    const four = runScenario({ ...today, houseLots: 'four' }).summary.capacity;
    expect(adu).toBeGreaterThan(base.summary.capacity);
    expect(three).toBeGreaterThan(adu);
    expect(four).toBeGreaterThan(three);
  });

  it('up to 3 homes on house lots lets a triplex be built by right in more tracts, and leaves a 40-unit building alone', () => {
    const now = runScenario(typed('triplex')).summary.allowed;
    expect(runScenario(typed('triplex', { houseLots: 'three' })).summary.allowed).toBeGreaterThan(now);
    expect(runScenario({ ...today, houseLots: 'three' }).summary.allowed).toBe(base.summary.allowed);
  });

  it('senior housing needs a hearing everywhere (§911.02), so it is never by right', () => {
    const s = runScenario(typed('senior')).summary;
    expect(s.allowed).toBe(0);
    expect(s.hearing).toBeGreaterThan(0);
    expect(s.tested).toBeGreaterThan(0);
  });

  it('a citywide 20% set-aside never opens more tracts to a market project than none at all', () => {
    const off = runScenario({ ...today, izWhere: 'off' }).summary;
    const city20 = runScenario({ ...today, izWhere: 'citywide', izShare: 0.2 }).summary;
    expect(city20.works).toBeLessThanOrEqual(off.works);
    expect(city20.medianGap!).toBeGreaterThan(off.medianGap!);
  });

  it('the bonus is optional: it never closes a tract that works without it', () => {
    expect(bonusPoints(0.1)).toBe(2);
    expect(bonusPoints(0.2)).toBe(6);
    expect(runScenario({ ...today, bonus: 0.15 }).summary.works).toBeGreaterThanOrEqual(base.summary.works);
  });

  it('parking: removing the minimums near transit lands between keeping and removing them', () => {
    const keep = base.summary.medianGap!;
    const near = runScenario({ ...today, parking: 'transit' }).summary.medianGap!;
    const none = runScenario({ ...today, parking: 'remove' }).summary.medianGap!;
    expect(near).toBeLessThan(keep);
    expect(none).toBeLessThanOrEqual(near);
  });

  it('a frequent bus on every line brings tracts back inside a transit screen', () => {
    const screen = runScenario({ ...today, transitMi: 0.25 }).summary;
    expect(screen.screened).toBeGreaterThan(0);
    expect(runScenario({ ...today, transitMi: 0.25, frequentBus: true }).summary.screened).toBeLessThan(screen.screened);
  });

  it("each moved policy gets its own verdict, read against your rules without it", () => {
    const s: Scenario = { ...today, parking: 'remove', lots: 'pre2025' };
    const fx = leverEffects(s, runScenario(s));
    expect(fx.map((f) => f.id).sort()).toEqual(['lots', 'parking']);
    expect(fx.find((f) => f.id === 'lots')!.capacity).toBeLessThan(0);
    expect(fx.find((f) => f.id === 'parking')!.verdict).toBe('works');
    expect(fx.find((f) => f.id === 'parking')!.better).toBeGreaterThan(0);
    expect(fx.find((f) => f.id === 'lots')!.verdict).toBe('backfires');
    const plan = leverEffects({ ...today, plan: 'draft' }, runScenario({ ...today, plan: 'draft' }))[0];
    expect(plan.verdict).toBe('none');
    expect(plan.sentence).toContain('tax credit');
  });

  it('the map classes: graded results and the change from today', () => {
    const t = (o: Partial<TractOutcome>): TractOutcome => ({ ...base.tracts[0], status: 'fails', multiple: 0.4, gap: 200000, ...o });
    expect(resultClass(t({ status: 'works', gap: 0 }))).toBe('works');
    expect(resultClass(t({ multiple: 1.2 }))).toBe('close');
    expect(resultClass(t({ gap: 40000 }))).toBe('gap50');
    expect(resultClass(t({ gap: 300000 }))).toBe('gapMore');
    expect(resultClass(t({ status: 'zoning' }))).toBe('zoning');
    expect(changeClass(t({}), t({ status: 'works', multiple: 1.6, gap: 0 }))).toBe('nowWorks');
    expect(changeClass(t({}), t({ multiple: 0.45, gap: 180000 }))).toBe('better');
    expect(changeClass(t({}), t({ multiple: 0.402, gap: 199500 }))).toBe('same');
    expect(changeClass(t({ status: 'zoning' }), t({}))).toBe('better');
    expect(changeClass(t({ status: 'zoning' }), t({ status: 'zoning' }))).toBe('zoning');
    expect(resultClass(t({ status: 'unread', pencils: true }))).toBe('unread');
    expect(resultClass(t({ status: 'hearing', pencils: true }))).toBe('hearingWorks');
    expect(resultClass(t({ status: 'hearing', gap: 40000 }))).toBe('gap50');
    expect(changeClass(t({ status: 'hearing' }), t({ status: 'fails', multiple: 0.4 }))).toBe('better');
  });

  it('works counts by right only: zoning not read and a hearing are kept apart', () => {
    const m = base.summary;
    expect(m.works).toBe(base.tracts.filter((t) => t.status === 'works').length);
    expect(base.tracts.filter((t) => t.status === 'unread').length).toBe(m.unread);
    expect(base.tracts.some((t) => t.status === 'unread' && resultClass(t) === 'works')).toBe(false);
    const senior = runScenario(typed('senior'));
    expect(senior.summary.works).toBe(0);
    expect(senior.summary.worksHearing).toBe(senior.tracts.filter((t) => resultClass(t) === 'hearingWorks').length);
  });

  it('turning the set-aside off reads as a trade-off: fewer homes with an income limit are asked', () => {
    const s: Scenario = { ...today, izWhere: 'off' };
    const iz = leverEffects(s, runScenario(s))[0];
    expect(base.summary.asked).toBeGreaterThan(0);
    expect(iz.sentence).toContain('asked of the test buildings');
    expect(iz.verdict).not.toBe('works');
  });

  it('two policies that close the same gap: neither reads as "no effect"', () => {
    const one: Scenario = typed('senior', { subsidy: 50000 });
    const alone = leverEffects(one, runScenario(one))[0];
    const both: Scenario = { ...one, abatement: 3000 };
    const fx = leverEffects(both, runScenario(both));
    if (alone.verdict !== 'none') expect(fx.find((f) => f.id === 'subsidy')!.verdict).not.toBe('none');
    for (const f of fx) if (f.verdict === 'overlap') expect(f.sentence).toContain('On its own');
  });

  it('a bonus taken somewhere but changing nothing else is "no effect", not an overlap', () => {
    const s: Scenario = { ...today, bonus: 0.2 };
    const fx = leverEffects(s, runScenario(s))[0];
    expect(fx.verdict).not.toBe('overlap');
  });

  it('the range: higher building costs never open more tracts', () => {
    const r = costRange(today);
    expect(r.dearer).toBeLessThanOrEqual(base.summary.works);
    expect(r.cheaper).toBeGreaterThanOrEqual(base.summary.works);
    expect(TODAY.izWhere).toBe('izo');
  });
});
