// The project read at every level and on both sides of Compare places: the site it is read on (the lot picked at the
// Parcel level; at the Tract level a lot of the size the project needs in a district here that allows it by right; at
// the ZIP level the same across its tracts), the zoning check on it, the capital run and the review (lib/review), all
// recomputed whenever an input changes; on tax credit paths too small for the site, the same project as Market rate at
// the units that fit (the review offers it only when it works). Plus the ZIP level's model and the fixes' Apply.
// Online only: loaded on demand.
import { useEffect, useMemo } from 'react';
import { pointsOf } from '../../../lib/finder/rank';
import { demandTract, demandZip } from '../../../lib/demand/data';
import { zipById } from '../../../lib/equity/zip';
import { hud as hudTable, placeFor } from '../../../lib/place/data';
import type { HudTable, PlaceMeasures, Typology } from '../../../lib/place/types';
import { zipTracts } from '../../../lib/place/zipView';
import type { CapitalRun } from '../../../lib/project/capital';
import { isHousing, setDevType, type DevType } from '../../../lib/project/devType';
import { scaleCounts } from '../../../lib/project/model';
import type { Side } from '../../../lib/project/side';
import { suggestForLot } from '../../../lib/project/draft';
import { DEFAULT_PROJECT, EXAMPLE_HOMES, MIX_LEVELS, type Counts, type MixLevel, type SiteLot } from '../../../lib/project/store';
import { MIN_CREDIT_UNITS, MULTIPLE_GOOD, reviewProject, type FixAction, type Review, type ReviewInput, type Scope, type TypicalLot } from '../../../lib/review/review';
import { lotFor, STANDARD_BY_CODE, tractCapacity, type TractCapacity } from '../../../lib/zoning/capacity';
import { checkZoning, lotDefaults, storyLimit, type CheckInput, type ZoningCheck } from '../../../lib/zoning/check';
import { scoreSheet } from '../../../lib/lihtc/score';
import { useFinder } from '../../../lib/finder/store';
import { useApp } from '../../../lib/store';
import { lotRead } from '../project/TryLot';
import { projectModel, useProjectModel, type ProjectModel } from '../project/useProjectModel';
import { setLevel } from './LevelSwitch';
import { runCapital } from '../../../lib/project/capital';
import { setFinancingOn, useSide } from '../../../lib/project/side';
import { capitalContext, setCapital } from './useCapital';

/** The building type the suggestion rules speak of, for a project (lib/place/recommend's vocabulary). */
export function devTypeTypology(t: DevType, units: number): Typology {
  if (t === 'senior') return 'senior';
  if (units >= 4) return 'small_apartment';
  if (units >= 2) return 'duplex_triplex';
  return 'townhome';
}

export interface SiteIn {
  district: string | null;
  lotSqft: number;
  frontageFt: number | null;
  depthFt: number | null;
}

/** The zoning check's input for the project as set, on a site. */
export function checkInputFor(m: ProjectModel, devType: DevType, site: SiteIn, inIzo: boolean | null, floodPct: number | null): CheckInput {
  const c = m.mix.counts;
  const units = m.mix.homes;
  const netSf = MIX_LEVELS.reduce((s, l) => s + c[l].reduce((x, n, br) => x + n * m.args.inputs.unitSf[br], 0), 0);
  return {
    ...site,
    devType,
    units: isHousing(devType) ? units : 0,
    stories: m.base.project.stories,
    commercialSf: m.base.project.commercialSf ?? 0,
    avgUnitSf: units > 0 ? netSf / units : 750,
    efficiency: m.args.inputs.efficiency,
    inIzo,
    floodPct,
    openShare: m.base.project.openShare,
  };
}

/** Where the project could go in a tract: among the districts here whose use allows it by right (those within its
 *  height first, then the most common), the lot it needs there, no smaller than the tract's median vacant lot. With no
 *  such district, the typical lot of the most common one (and the check says why it fails). Also how many of the
 *  tract's lots are zoned to allow it by right, and the tract's largest vacant lot. */
export function typicalIn(cap: TractCapacity, m: ProjectModel, devType: DevType, flood: number | null): TypicalLot {
  const units = Math.max(1, m.mix.homes);
  const median = cap.vacant.median_sqft && cap.vacant.median_sqft > 0 ? Math.round(cap.vacant.median_sqft / 100) * 100 : null;
  const largest = cap.vacant.largest ? Math.round((cap.vacant.largest.acres * 43560) / 100) * 100 : null;
  const big = (code: string) => checkZoning(checkInputFor(m, devType, { district: code, lotSqft: 1e7, frontageFt: null, depthFt: null }, null, flood));
  let yes = 0, of = 0;
  const options: { code: string; lots: number; height: boolean; need: number | null }[] = [];
  for (const [code, lots] of Object.entries(cap.districts)) {
    const std = STANDARD_BY_CODE.get(code);
    if (!std) continue;
    of += lots;
    const c = big(code);
    if (c.rows[0]?.tone !== 'yes') continue;
    yes += lots;
    const need = lotFor(std, units);
    options.push({ code, lots, height: c.rows.find((r) => r.key === 'height')?.tone !== 'no', need: need.kind === 'fits' ? need.lotSqft : null });
  }
  const pick = options.filter((o) => o.need != null).sort((a, b) => Number(b.height) - Number(a.height) || b.lots - a.lots)[0];
  if (pick) return { district: pick.code, lotSqft: Math.max(pick.need!, median ?? 0), need: pick.need, median, largest, byRight: { yes, of, unit: 'lots' } };
  const read = lotRead(cap, devTypeTypology(devType, units), units, {});
  return { district: read.district, lotSqft: read.lotSqft, need: null, median, largest, byRight: { yes, of, unit: 'lots' } };
}

export interface ProjectRead {
  scope: Scope;
  /** The lot the project is read on (the Open space input's fit uses it too). */
  site: SiteIn;
  check: ZoningCheck;
  run: CapitalRun;
  review: Review;
  typical: TypicalLot | null;
}

/** The tax credit score as the review reads it: now, at its best case, and (on 9% credits) scored for 4% credits. */
export function scoreFor(m: ProjectModel): ReviewInput['score'] {
  const s = m.sheet.score;
  const four = m.branch === 'nine' ? scoreSheet(m.sheet.sheet, { ...m.sheet.setup, credit: 'four' }, m.sheet.answers, m.sheet.facts) : null;
  return { total: s.total, max: s.max, threshold: s.threshold, short: s.short, high: s.range.high, most: pointsOf(s).most, four: four && { high: pointsOf(four).most, threshold: four.threshold } };
}

/** Market rate at the most units allowed by right that fit here (at most the project's units, at stories within the
 *  height limit), run through the same zoning check and capital stack: whether it works (allowed by right, the loan
 *  covered, 1.5× the equity back). For tax credit projects too small for the site. */
export function marketAlt(m: ProjectModel, hud: HudTable, site: SiteIn, check: ZoningCheck, inIzo: boolean | null, flood: number | null, over: Record<string, number> | undefined): ReviewInput['alt'] {
  const p = m.base.project;
  const std = site.district ? STANDARD_BY_CODE.get(site.district) : undefined;
  const lim = std ? storyLimit(std) : null;
  const stories = p.stories == null ? null : Math.min(p.stories, lim ?? p.stories);
  const { branch: _credit, ...pencil } = p.pencil;
  const at = (units: number) => {
    const mm = projectModel(m.base.geoid, m.base.place, hud, 'market', units, { ...p, devType: 'market', mode: 'suggested', stories, pencil }, m.base.entries, m.base.mixFrom);
    return { mm, c: checkZoning(checkInputFor(mm, 'market', site, inIzo, flood)) };
  };
  let units = Math.max(1, Math.min(m.mix.homes, check.maxUnits ?? m.mix.homes));
  let a = at(units);
  if (a.c.fit && !a.c.fit.fits && a.c.fit.units >= 1 && a.c.fit.units < units) a = at((units = a.c.fit.units));
  const r = runCapital(capitalContext(a.mm, 'market', site.lotSqft > 0 ? site.lotSqft : null), over).result;
  const dscr = r.years[0]?.dscr ?? 0;
  return { units, stories, works: a.c.verdict === 'yes' && dscr >= a.mm.args.inputs.dscr && (r.multiple == null || r.multiple >= MULTIPLE_GOOD), multiple: r.multiple };
}

export interface ProjectReadArgs {
  scope: Scope;
  m: ProjectModel;
  devType: DevType;
  /** The tract's measures (null at the ZIP level: the model's own). */
  place: PlaceMeasures | null;
  hud: HudTable;
  lot?: SiteLot;
  zip?: string | null;
  /** The Capital inputs the person changed. */
  over?: Record<string, number>;
}

/** The project read on its site, without React: the hook below and Find places (finder/read) both call it, so a row
 *  and the place it opens say the same. */
export function projectRead({ scope, m, devType, place, hud, lot, zip, over }: ProjectReadArgs): ProjectRead {
  const geoid = m.base.geoid;
  const site = m.base.project.sites[geoid] ?? {};
  const flood = (place ?? m.base.place).flood?.fema_sfha_pct ?? null;
  const inIzo = site.pin?.izo ?? m.base.inIzo;
  let siteIn: SiteIn;
  let typical: TypicalLot | null = null;
  if (scope === 'parcel') siteIn = { district: lot?.district ?? site.district ?? null, lotSqft: lot?.sqft ?? site.lotSqft ?? 0, frontageFt: lot?.frontageFt ?? site.frontageFt ?? null, depthFt: lot?.depthFt ?? null };
  else if (scope === 'tract' && m.cap) {
    typical = typicalIn(m.cap, m, devType, flood);
    siteIn = { district: typical.district, lotSqft: typical.lotSqft, frontageFt: null, depthFt: null };
  } else if (scope === 'zip' && zip) {
    // The ZIP: the typical lot in its main tract with the most renters, and how many of its tracts allow it there.
    let yes = 0, of = 0;
    for (const g of zipTracts(zip).main) {
      const cap = tractCapacity(g);
      if (!cap) continue;
      const t = typicalIn(cap, m, devType, flood);
      const c = checkZoning(checkInputFor(m, devType, { district: t.district, lotSqft: t.lotSqft, frontageFt: null, depthFt: null }, null, flood));
      if (c.verdict === 'unknown') continue;
      of += 1;
      if (c.verdict === 'yes') yes += 1;
    }
    const here = m.cap ? typicalIn(m.cap, m, devType, flood) : null;
    typical = here ? { ...here, byRight: { yes, of, unit: 'tracts' } } : null;
    siteIn = { district: typical?.district ?? null, lotSqft: typical?.lotSqft ?? 0, frontageFt: null, depthFt: null };
  } else siteIn = { district: site.district ?? null, lotSqft: site.lotSqft ?? 0, frontageFt: null, depthFt: null };
  const check = checkZoning(checkInputFor(m, devType, siteIn, scope === 'zip' ? false : inIzo, flood));
  // The capital run on the same site: its land follows the lot (capitalLot reads it the same way for the inputs).
  const run = runCapital(capitalContext(m, devType, siteIn.lotSqft > 0 ? siteIn.lotSqft : null), over);
  const credits = isHousing(devType) && m.mix.homes > 0 && run.credits;
  const review = reviewProject({
    scope,
    devType,
    level: m.base.level,
    counts: m.mix.counts,
    units: m.mix.homes,
    mixMode: m.mix.mode,
    stories: m.base.project.stories,
    check,
    inIzo: scope === 'zip' ? false : inIzo,
    market: m.branch === 'market',
    floodPct: flood,
    place: scope === 'zip' ? null : (place ?? m.base.place),
    demand: scope === 'zip' ? m.base.mixFrom : m.tract,
    hud,
    capital: isHousing(devType) && m.mix.homes > 0 ? run : null,
    dscrNeed: m.args.inputs.dscr,
    displacement: scope === 'zip' ? null : ((place ?? m.base.place).displacement?.score ?? null),
    typical,
    score: scope === 'zip' || m.branch === 'market' ? null : scoreFor(m),
    alt: credits && Math.min(m.mix.homes, check.maxUnits ?? Infinity, check.fit?.units ?? Infinity) < MIN_CREDIT_UNITS ? marketAlt(m, hud, siteIn, check, scope === 'zip' ? false : inIzo, flood, over) : null,
  });
  return { scope, site: siteIn, check, run, review, typical };
}

/** The review for the project as set, on the side in context. `place` is the tract's (null at the ZIP level). */
export function useProjectRead(a: { scope: Scope; m: ProjectModel; devType: DevType; place: PlaceMeasures | null; hud: HudTable; lot?: SiteLot; zip?: string | null; side?: Side }): ProjectRead;
export function useProjectRead(a: { scope: Scope; m: ProjectModel | null; devType: DevType; place: PlaceMeasures | null; hud: HudTable; lot?: SiteLot; zip?: string | null; side?: Side }): ProjectRead | null;
export function useProjectRead({ scope, m, devType, place, hud, lot, zip, side }: { scope: Scope; m: ProjectModel | null; devType: DevType; place: PlaceMeasures | null; hud: HudTable; lot?: SiteLot; zip?: string | null; side?: Side }): ProjectRead | null {
  const ctx = useSide();
  const over = (side ?? ctx).project((s) => s.capital);
  return useMemo(() => (m ? projectRead({ scope, m, devType, place, hud, lot, zip, over }) : null), [scope, m, devType, place, hud, lot, zip, over]);
}

/** The lot area the capital run reads at a level, as useProjectRead reads the site: the lot picked (a parcel), else a
 *  lot of the size the project needs in the tract (a tract, or a ZIP's main tract). */
export function capitalLot(scope: Scope, m: ProjectModel, devType: DevType, lot?: SiteLot): number | null {
  const site = m.base.project.sites[m.base.geoid] ?? {};
  const sqft = scope === 'parcel' ? (lot?.sqft ?? site.lotSqft ?? 0) : m.cap ? typicalIn(m.cap, m, devType, m.base.place.flood?.fema_sfha_pct ?? null).lotSqft : scope === 'tract' ? (site.lotSqft ?? 0) : 0;
  return sqft > 0 ? sqft : null;
}

/** The ZIP level's model: the project run on the ZIP's main tract with the most renters, its mix split by the ZIP's
 *  renters, and the ZIP's own asking rent where it has one. */
export function useZipModel(zip: string | null, side?: Side): ProjectModel | null {
  const rep = useMemo(() => {
    if (!zip) return null;
    const main = zipTracts(zip).main.filter((g) => placeFor(g));
    return main.sort((a, b) => (demandTract(b)?.renters[0] ?? 0) - (demandTract(a)?.renters[0] ?? 0))[0] ?? null;
  }, [zip]);
  const place = useMemo(() => {
    const p = rep ? placeFor(rep) : null;
    const asking = zip ? zipById.get(zip)?.asking : null;
    return p && asking ? { ...p, market: { ...p.market, asking_2br: asking, asking_conf: 'medium' as const, zip: zip! } } : p;
  }, [rep, zip]);
  const mixFrom = useMemo(() => demandZip(zip), [zip]);
  return useProjectModel(rep, place, hudTable, side, mixFrom);
}

/** A mix with `homes` of its units moved to 50% AMI, from market rate first, then 80% and 60%, largest size first. */
export function withHomesAt50(c: Counts, homes: number): Counts {
  const out = Object.fromEntries(MIX_LEVELS.map((l) => [l, [...c[l]]])) as Counts;
  let left = homes - out['30'].concat(out['50']).reduce((a, b) => a + b, 0);
  while (left > 0) {
    const from = (['mkt', '80', '60'] as MixLevel[]).find((l) => out[l].some((n) => n > 0));
    if (!from) break;
    const br = out[from].indexOf(Math.max(...out[from]));
    out[from][br] -= 1;
    out['50'][br] += 1;
    left -= 1;
  }
  return out;
}

/** Suggest units and stories for the lot picked (lib/zoning/check lotDefaults), once per lot and never over the
 *  person's own values (lib/project/draft suggestForLot). Safe to call from both panels. */
export function useLotDefaults(m: ProjectModel | null, devType: DevType, lot: SiteLot | undefined) {
  const side = useSide();
  const key = lot ? `${lot.chunk}:${lot.row}` : null;
  useEffect(() => {
    if (!m || !lot || !key || !isHousing(devType)) return;
    // Already suggested for this lot: suggestForLot only puts the units back after a reload.
    if (side.project.getState().suggested?.lot === key) return suggestForLot(side, key, null);
    const c = checkInputFor(m, devType, { district: lot.district, lotSqft: lot.sqft, frontageFt: lot.frontageFt, depthFt: lot.depthFt }, null, null);
    const d = lotDefaults({ ...c, homes: EXAMPLE_HOMES, most: DEFAULT_PROJECT.stories ?? 4 });
    if (d) suggestForLot(side, key, d);
  }, [key, m, lot, devType, side]);
}

/** Apply a fix to the side's inputs. */
export function applyFix(side: Side, m: ProjectModel, devType: DevType, a: FixAction) {
  switch (a.kind) {
    case 'units':
      if (m.mix.mode === 'mine') side.project.setState({ counts: scaleCounts(m.mix.counts, a.value) });
      else side.plan.getState().setPlan({ homes: a.value });
      return;
    case 'stories':
      side.project.setState({ stories: a.value });
      return;
    case 'izo':
      // An own mix with the homes at 50% AMI; market rate and mixed use keep market financing (no tax credits).
      side.project.setState((s) => ({ mode: 'mine', counts: withHomesAt50(m.mix.counts, a.homes), pencil: devType === 'market' || devType === 'mixed' ? { ...s.pencil, branch: 'market' } : s.pencil }));
      return;
    case 'capital':
      setCapital(side, a.key, a.value);
      return;
    case 'devType':
      setDevType(side, a.value);
      return;
    case 'mix':
      side.project.setState({ mode: 'suggested' });
      return;
    case 'switch':
      setDevType(side, a.devType);
      side.project.setState({ mode: 'suggested', ...(a.stories != null ? { stories: a.stories } : {}) });
      side.plan.getState().setPlan({ homes: a.units });
      return;
    case 'branch':
      setFinancingOn(side, a.value);
      return;
    case 'scope':
      if (a.units != null) applyFix(side, m, devType, { kind: 'units', value: a.units });
      setLevel(a.value);
      return;
    case 'finder': {
      // Find places sits in the Parcel level's start card: leave the place (the lot stays saved) and open it.
      if (a.units != null) applyFix(side, m, devType, { kind: 'units', value: a.units });
      setLevel('parcel');
      useApp.getState().set({ pin: null });
      useApp.getState().select(null);
      useFinder.setState((f) => ({ open: true, applied: f.applied ?? f.inputs }));
      if (!useApp.getState().ui.left) useApp.getState().setUi({ left: true });
      return;
    }
    case 'sheet': {
      const root = document.querySelector('[data-view][data-active="true"]') ?? document;
      const card = root.querySelector('[data-credit-meter]');
      (card?.querySelector('button[aria-expanded="false"]') as HTMLButtonElement | null)?.click();
      card?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      return;
    }
    case 'ami': {
      // An own mix: its 60% and 80% AMI units move to the level; otherwise the income level changes.
      const c = m.mix.counts;
      const to = String(a.value) as MixLevel;
      if (m.mix.mode === 'mine') side.project.setState({ counts: { ...c, '60': [0, 0, 0, 0], '80': [0, 0, 0, 0], [to]: c[to].map((n, br) => n + c['60'][br] + c['80'][br]) as Counts['50'] } });
      else side.plan.getState().setPlan({ level: a.value });
      return;
    }
  }
}
