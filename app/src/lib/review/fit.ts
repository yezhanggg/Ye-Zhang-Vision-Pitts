// How a project fits the people around it (Ye, 2026-10-27): the renter households who qualify for its homes with an
// income limit and the share of them the homes would need to fill (the capture rate), its unit mix against the sizes
// of the renter households here, seniors for senior housing, and the households a market-rate project rents to. Tract
// counts are HUD CHAS 2018–22 (the place file's bands and household types); ZIP counts are ACS B25118 cut at the
// income limit. A screen, not a market study. Online only: loaded on demand.
import { CAPTURE } from '../demand/depth';
import { DEMAND } from '../demand/data';
import { belowCut } from '../demand/interp';
import { captureRate, groupShares, householdsByGroup, SIZE_GROUP_LABEL, SIZE_GROUPS, type SizeGroup } from '../demand/mix';
import type { DemandUnit } from '../demand/types';
import { limitFor } from '../place/afford';
import { isNum } from '../place/format';
import type { BandId, HudTable, PlaceMeasures, TypeBandId } from '../place/types';
import { AFFORDABLE_LEVELS, homesAt } from '../project/plan';
import { MIX_LEVELS, type Counts, type MixLevel } from '../project/store';

export type FitTone = 'ok' | 'warn' | 'stop' | 'info';

/** The capture rate's tones: the depth screen's 10% example, and 15%, the top of its range (lib/demand/depth). */
export const captureTone = (rate: number): FitTone => (rate <= CAPTURE.value ? 'ok' : rate <= CAPTURE.high ? 'warn' : 'stop');

export interface CaptureFit {
  /** Homes with an income limit in the mix. */
  homes: number;
  /** The highest income level among them, the one that sets who qualifies. */
  level: MixLevel;
  qualified: number;
  existing: number;
  rate: number | null;
  where: 'tract' | 'zip';
  formula: string;
}

const CHAS_BAND: Partial<Record<MixLevel, BandId>> = { '30': 'le30', '50': 'b30_50', '60': 'b50_80', '80': 'b50_80' };
const BAND_ORDER: BandId[] = ['le30', 'b30_50', 'b50_80', 'b80_100', 'gt100'];
const sumBands = (p: PlaceMeasures, ids: BandId[]) => ids.reduce((s, id) => s + (isNum(p.bands[id]?.hh) ? (p.bands[id].hh as number) : 0), 0);

/** The income limit a level sets for a 3-person household (60% AMI is 1.2 × the 50% limit, as HUD's MTSP tables do). */
export function limitAt(hud: HudTable, level: MixLevel): number | null {
  if (level === 'mkt') return null;
  if (level === '60') {
    const l = limitFor(hud, 50, 3);
    return l == null ? null : l * 1.2;
  }
  return limitFor(hud, Number(level) as 30 | 50 | 80, 3);
}

/** The homes with an income limit against the renter households who qualify: the tract's (CHAS) when the place is
 *  given, else the ZIP's (ACS B25118). Null when the mix has no such homes or nothing is on file. */
export function captureFit(counts: Counts, place: PlaceMeasures | null, demand: DemandUnit | null, hud: HudTable): CaptureFit | null {
  const homes = homesAt(counts, AFFORDABLE_LEVELS);
  const level = (['80', '60', '50', '30'] as MixLevel[]).find((l) => counts[l].some((n) => n > 0));
  if (!homes || !level) return null;
  const existing = demand?.lihtc?.li_units ?? 0;
  if (place) {
    const band = CHAS_BAND[level]!;
    const qualified = sumBands(place, BAND_ORDER.slice(0, BAND_ORDER.indexOf(band) + 1));
    const c = captureRate(homes, qualified, existing);
    return { homes, level, qualified, existing, rate: c.rate, where: 'tract', formula: c.formula };
  }
  const limit = limitAt(hud, level);
  if (!demand || limit == null) return null;
  const cut = belowCut(demand.inc.map((x) => x[0]), DEMAND.edges.income, limit);
  if (!isNum(cut.value)) return null;
  const c = captureRate(homes, cut.value, existing);
  return { homes, level, qualified: cut.value, existing, rate: c.rate, where: 'zip', formula: c.formula };
}

export interface MixFit {
  proposed: Record<SizeGroup, number>;
  area: Record<SizeGroup, number>;
  /** The size group furthest from the renters here, and by how much (share points, signed: + means more of it). */
  worst: { group: SizeGroup; gap: number };
}

/** The project's bedroom shares against the sizes of the renter households here (1–2 people → studio or 1-bedroom,
 *  3–4 → 2-bedroom, 5+ → 3-bedroom, the rule the renters' split uses). */
export function mixFit(counts: Counts, demand: DemandUnit | null): MixFit | null {
  const area = demand ? groupShares(householdsByGroup(demand)) : null;
  const by = (brs: number[]) => MIX_LEVELS.reduce((s, l) => s + brs.reduce((x, b) => x + counts[l][b], 0), 0);
  const n = by([0, 1, 2, 3]);
  if (!area || n === 0) return null;
  const proposed = { small: by([0, 1]) / n, two: by([2]) / n, large: by([3]) / n } as Record<SizeGroup, number>;
  const worst = SIZE_GROUPS.map((g) => ({ group: g, gap: proposed[g] - area[g] })).sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))[0];
  return { proposed, area, worst };
}

export const MIX_GAP_WARN = 0.15;
export const mixWords = (g: SizeGroup) => SIZE_GROUP_LABEL[g].toLowerCase();

const TYPE_BANDS: Record<'30' | '50' | '80' | 'mkt', TypeBandId[]> = { '30': ['le30'], '50': ['le30', 'b30_50'], '80': ['le30', 'b30_50', 'b50_80'], mkt: ['le30', 'b30_50', 'b50_80', 'gt80'] };

/** Elderly renter households (62+, CHAS household types) at or below an income level, for senior housing. */
export function seniorHouseholds(place: PlaceMeasures | null, level: '30' | '50' | '80' | 'mkt'): number | null {
  if (!place?.types) return null;
  return TYPE_BANDS[level].reduce((s, b) => s + (place.types[b]?.elderly_alone ?? 0) + (place.types[b]?.elderly_family ?? 0), 0);
}

/** Renter households above 80% AMI, the ones market-rate homes rent to (tract CHAS). */
export const marketHouseholds = (place: PlaceMeasures | null): number | null => (place ? sumBands(place, ['b80_100', 'gt100']) : null);
