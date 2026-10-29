import { describe, expect, it } from 'vitest';
import { demandTract } from '../demand/data';
import { hud, placeById } from '../place/data';
import { runCapital, type CapitalContext } from '../project/capital';
import { emptyCounts, type Counts } from '../project/store';
import { checkZoning, type CheckInput } from '../zoning/check';
import { captureFit, captureTone, mixFit } from './fit';
import { MIN_CREDIT_UNITS, rentForMultiple, reviewProject, verdictWord, type ReviewInput } from './review';

const geoid = [...placeById.keys()].find((g) => demandTract(g) && (placeById.get(g)!.bands.le30.hh ?? 0) > 200)!;
const place = placeById.get(geoid)!;
const demand = demandTract(geoid);
const counts = (level: '30' | '50' | '60' | '80' | 'mkt', row: [number, number, number, number]): Counts => ({ ...emptyCounts(), [level]: row });
const site: CheckInput = { district: 'RM-M', lotSqft: 20000, frontageFt: 100, depthFt: 200, devType: 'affordable', units: 40, stories: 4, commercialSf: 0, avgUnitSf: 750, efficiency: 0.85, inIzo: false, floodPct: 0 };
const ctx: CapitalContext = { devType: 'market', branch: 'market', plan: 'adopted', units: 40, affordable: 0, large: false, qctOrDda: false, sizeSf: 36000, grossRent: 40 * 1500 * 12, opexPerUnit: 6850, price: 0.88, dscrNeed: 1.2 };

function input(p: Partial<ReviewInput> & { site?: Partial<CheckInput> }): ReviewInput {
  const c = p.counts ?? counts('50', [0, 16, 16, 8]);
  const units = p.units ?? 40;
  const devType = p.devType ?? 'affordable';
  return {
    scope: 'parcel',
    devType,
    level: 50,
    counts: c,
    units,
    mixMode: 'suggested',
    stories: 4,
    check: checkZoning({ ...site, devType, units, ...p.site }),
    inIzo: false,
    market: false,
    floodPct: 0,
    place,
    demand,
    hud: hud!,
    capital: null,
    dscrNeed: 1.2,
    displacement: null,
    typical: null,
    ...p,
  };
}

describe('the project review', () => {
  it('too many units for the lot: stops, and offers the units allowed by right', () => {
    const r = reviewProject(input({ units: 400, site: { units: 400 }, counts: counts('50', [0, 160, 160, 80]) }));
    expect(r.verdict).toBe('no');
    const fix = r.fixes.find((f) => f.key === 'units')!;
    expect(fix.action).toEqual({ kind: 'units', value: checkZoning({ ...site, units: 400 }).maxUnits });
  });

  it('height in feet: 9 stories at 10 ft is over RM-H’s 85 ft even inside its 9 stories', () => {
    const r = reviewProject(input({ stories: 9, site: { district: 'RM-H', stories: 9 } }));
    const h = r.findings.find((f) => f.key === 'height')!;
    expect(h.tone).toBe('warn');
    expect(h.text).toMatch(/90 ft, over the 85 ft limit/);
    expect(r.fixes.find((f) => f.key === 'stories')?.action).toEqual({ kind: 'stories', value: 8 });
  });

  it('the IZ-O asks for 10% at 50% AMI: an 80% AMI mix falls short and gets a fix; market rate has it applied', () => {
    const short = reviewProject(input({ inIzo: true, level: 80, counts: counts('80', [0, 16, 16, 8]) }));
    expect(short.findings.find((f) => f.key === 'izo')?.tone).toBe('stop');
    expect(short.fixes.find((f) => f.key === 'izo')?.action).toEqual({ kind: 'izo', homes: 4 });
    const met = reviewProject(input({ inIzo: true }));
    expect(met.findings.find((f) => f.key === 'izo')?.tone).toBe('ok');
    const market = reviewProject(input({ inIzo: true, devType: 'market', market: true, level: 'market', counts: counts('mkt', [0, 16, 16, 8]) }));
    expect(market.findings.find((f) => f.key === 'izo')?.text).toMatch(/4 of 40 units rent at 50% AMI/);
  });

  it('capture: the homes against the renters who qualify, toned at 10% and 15%', () => {
    expect(captureTone(0.08)).toBe('ok');
    expect(captureTone(0.12)).toBe('warn');
    expect(captureTone(0.2)).toBe('stop');
    const c = captureFit(counts('30', [0, 20, 15, 5]), place, demand, hud!)!;
    expect(c.where).toBe('tract');
    expect(c.qualified).toBe(place.bands.le30.hh);
    expect(c.rate).toBeCloseTo(40 / (c.qualified - c.existing), 8);
  });

  it('unit mix: all one-bedrooms against the renters here is flagged, and an own mix is offered the renters’ split', () => {
    const f = mixFit(counts('50', [0, 40, 0, 0]), demand)!;
    expect(f.proposed.small).toBe(1);
    const r = reviewProject(input({ counts: counts('50', [0, 40, 0, 0]), mixMode: 'mine' }));
    expect(r.findings.find((x) => x.key === 'mix')?.tone).toBe(Math.abs(f.worst.gap) > 0.15 ? 'warn' : 'ok');
    if (Math.abs(f.worst.gap) > 0.15) expect(r.fixes.some((x) => x.action?.kind === 'mix')).toBe(true);
  });

  it('money: a losing market deal says so and works out the rent it needs for 1.5×', () => {
    const thin = runCapital({ ...ctx, grossRent: 40 * 1000 * 12 });
    const r = reviewProject(input({ devType: 'market', market: true, level: 'market', counts: counts('mkt', [0, 16, 16, 8]), capital: thin }));
    expect(r.findings.find((f) => f.key === 'return')?.tone).not.toBe('ok');
    const need = rentForMultiple(thin, 40)!;
    expect(need).toBeGreaterThan(1000);
    expect(r.fixes.find((f) => f.key === 'rent')?.label).toContain(`$${Math.round(need).toLocaleString('en-US')}`);
  });

  it('the verdict: works when nothing warns, changes on a warning, no on a stop', () => {
    expect(reviewProject(input({ units: 400, site: { units: 400 } })).verdict).toBe('no');
    const unknown = reviewProject(input({ site: { district: 'UC-MU' } }));
    expect(['unknown', 'no']).toContain(unknown.verdict);
    expect(reviewProject(input({})).line.length).toBeGreaterThan(10);
  });

  const credit = runCapital({ ...ctx, devType: 'affordable', branch: 'nine', affordable: 40, grossRent: 40 * 1000 * 12, dscrNeed: 1.15 });
  const tiny = { district: 'R1A-H', lotSqft: 2800, frontageFt: 45, depthFt: 63 };

  it('a building too big for the lot stops it, with the units and stories that would fit', () => {
    const r = reviewProject(input({ devType: 'market', market: true, level: 'market', counts: counts('mkt', [0, 16, 16, 8]), site: { district: 'RM-M', lotSqft: 6000, frontageFt: null, depthFt: null } }));
    const fit = r.findings.find((f) => f.key === 'floor')!;
    expect(fit).toMatchObject({ tone: 'stop', title: 'Fits on the lot' });
    expect(r.verdict).toBe('no');
    expect(r.fixes.some((f) => f.key === 'units' && /fit the lot|allowed by right/.test(f.label))).toBe(true);
  });

  it('tax credit paths: no unit cut below the floor; Market rate, the Tract level and Find places instead', () => {
    const alt = { units: 1, stories: 3, works: true, multiple: 1.62 };
    const r = reviewProject(input({ capital: credit, site: tiny, alt }));
    expect(r.fixes.some((f) => f.action?.kind === 'units' && f.action.value < MIN_CREDIT_UNITS)).toBe(false);
    expect(r.fixes.map((f) => f.key)).toEqual(['market', 'tract', 'finder']);
    expect(r.fixes[0].action).toEqual({ kind: 'switch', devType: 'market', units: 1, stories: 3 });
    expect(r.findings.find((f) => f.key === 'small')?.tone).toBe('info');
    // Market rate is offered only when it works there.
    expect(reviewProject(input({ capital: credit, site: tiny, alt: { ...alt, works: false } })).fixes.some((f) => f.key === 'market')).toBe(false);
    // Market rate projects keep the cut.
    const m = reviewProject(input({ devType: 'market', market: true, level: 'market', counts: counts('mkt', [0, 16, 16, 8]), site: tiny }));
    expect(m.fixes.find((f) => f.key === 'units')?.action).toEqual({ kind: 'units', value: 1 });
  });

  it('a tax credit project under the floor does not work as is, even when its numbers do', () => {
    const one = runCapital({ ...ctx, devType: 'affordable', branch: 'nine', units: 1, affordable: 1, sizeSf: 900, grossRent: 1000 * 12, dscrNeed: 1.15 });
    const r = reviewProject(input({ units: 1, counts: counts('50', [0, 1, 0, 0]), capital: one, site: { ...tiny, units: 1, stories: 2 }, stories: 2 }));
    expect(r.findings.find((f) => f.key === 'small')).toMatchObject({ tone: 'stop', title: 'Too small for tax credits' });
    expect(r.verdict).toBe('no');
    expect(r.fixes.find((f) => f.key === 'tract')?.action).toEqual({ kind: 'scope', value: 'tract', units: 40 });
    expect(r.fixes.find((f) => f.key === 'finder')?.action).toEqual({ kind: 'finder', units: 40 });
  });

  it('credits that cannot be won: below the minimum even at the best case does not work; within reach says what is missing', () => {
    const no = reviewProject(input({ capital: credit, score: { total: 20, max: 205, threshold: 120, short: 100, high: 90, four: { high: 90, threshold: 120 } } }));
    const f = no.findings.find((x) => x.key === 'score')!;
    expect(f.tone).toBe('stop');
    expect(f.text).toMatch(/Scores at most 90 of PHFA's 120 here, even with every line on the score sheet at its top/);
    expect(verdictWord(no.verdict)).toBe("Doesn't work as is");
    expect(no.fixes.some((x) => x.key === 'sheet')).toBe(true);
    expect(no.fixes.some((x) => x.key === 'four')).toBe(false);
    // 4% credits with a lower minimum the project can reach: offered.
    const four = reviewProject(input({ capital: credit, score: { total: 20, max: 205, threshold: 125, short: 105, high: 115, four: { high: 115, threshold: 110 } } }));
    expect(four.fixes.find((x) => x.key === 'four')?.action).toEqual({ kind: 'branch', value: 'four' });
    // Design and financing reach 90, but the team, partner and site lines can close it: not a stop.
    const confirm = reviewProject(input({ capital: credit, score: { total: 20, max: 205, threshold: 120, short: 100, high: 90, most: 150 } }));
    expect(confirm.findings.find((x) => x.key === 'score')).toMatchObject({ tone: 'warn' });
    expect(confirm.findings.find((x) => x.key === 'score')!.text).toMatch(/the other 30 must come from team, partner and site lines/);
    expect(confirm.findings.filter((x) => x.tone === 'stop').map((x) => x.key)).not.toContain('score');
    // Within reach: works with changes, and says the credits are not won yet.
    const reach = reviewProject(input({ capital: credit, score: { total: 20, max: 205, threshold: 120, short: 100, high: 130 } }));
    expect(reach.findings.find((x) => x.key === 'score')).toMatchObject({ tone: 'warn' });
    expect(reach.findings.find((x) => x.key === 'score')!.text).toMatch(/needs 100 more .* not won yet/);
    expect(reach.verdict).not.toBe('works');
  });
});

describe('the money review (lib/project/capital)', () => {
  const credit: CapitalContext = { ...ctx, devType: 'affordable', branch: 'nine', affordable: 40, grossRent: 40 * 1000 * 12, opexPerUnit: 7000, dscrNeed: 1.15 };
  const money = (r: ReturnType<typeof reviewProject>) => r.findings.filter((f) => f.area === 'money');
  it('cash flow that turns negative in a later year stops it and offers the loan that keeps it positive', () => {
    const run = runCapital(credit, { ltc: 0.4 });
    const r = reviewProject(input({ capital: run }));
    const f = r.findings.find((x) => x.key === 'cashflow')!;
    expect(f.text).toMatch(new RegExp(`^Cash flow turns negative in year ${run.result.firstNegative} `));
    expect(f.tone).toBe(run.result.firstNegative! <= 10 ? 'stop' : 'warn');
    expect(r.fixes.find((x) => x.key === 'cashflow')?.action).toMatchObject({ kind: 'capital', key: 'ltc' });
    expect(reviewProject(input({ capital: runCapital(credit) })).findings.find((x) => x.key === 'cashflow')?.tone).toBe('ok');
  });
  it('80% AMI gets no tax credits: a stop with "Use ≤50% AMI", and the gap shows', () => {
    const run = runCapital({ ...credit, creditUnits: 0, creditWhy: 'tax credit units must be at 60% AMI or below; these are at 80%' });
    const r = reviewProject(input({ level: 80, counts: counts('80', [0, 16, 16, 8]), capital: run }));
    expect(r.findings.find((x) => x.key === 'eligible')).toMatchObject({ tone: 'stop', text: expect.stringMatching(/60% AMI or below/) });
    expect(r.fixes.find((x) => x.key === 'eligible')).toMatchObject({ label: 'Use ≤50% AMI', action: { kind: 'ami', value: 50 } });
    expect(r.findings.find((x) => x.key === 'gap')?.tone).toBe('warn');
    expect(r.verdict).toBe('no');
  });
  it('a tax credit deal is judged by its gap, never by a multiple or a sale; the fix closes the whole gap', () => {
    const run = runCapital({ ...credit, creditUnits: 20 });
    const r = reviewProject(input({ capital: run }));
    expect(money(r).some((x) => x.key === 'return')).toBe(false);
    const fix = r.fixes.find((x) => x.key === 'gap') ?? null;
    const gap = r.findings.find((x) => x.key === 'gap')!;
    expect(gap.text).toMatch(/still to find after the loan, LIHTC equity and deferred developer fee/);
    expect(run.result.gap).toBeGreaterThan(0);
    expect(fix?.label).toBe(`Add $${(run.result.gap / 1e6).toFixed(1)}M other subsidy`);
    const v = (fix!.action as { value: number }).value;
    expect(runCapital({ ...credit, creditUnits: 20 }, { otherSubsidyPct: v }).result.gap).toBeLessThan(1);
  });
});
