// The equity dashboard's six measures: one real value per tract, in real units, with its definition and source.
// Nothing is scored or weighted here; a missing value stays missing ("not available").
import { ceilingRent, confUsable } from '../place/afford';
import { isNum } from '../place/format';
import type { HudTable, PlaceMeasures } from '../place/types';

/** The access block another pipeline step adds to place.json; every field may be null or the block absent. */
export interface PlaceAccess {
  jobs_1mi: number | null;
  jobs_1mi_pct?: number | null;
  school_mi: number | null;
  elem_mi?: number | null;
  grocery_mi?: number | null;
  services_halfmi: number | null;
}

/** Income level: a share of area median income; 100 is "market rate", a household at the area median. */
export type AmiPct = 30 | 50 | 80 | 100;
/** HUD's family-size adjustment for 3 people (90% of the 4-person median), used for the market-rate reference. */
export const HUD_3P_ADJ = 0.9;
/** Words for an income level: "50% AMI", or "market rate (100% AMI)". */
export const amiWords = (ami: AmiPct): string => (ami === 100 ? 'market rate (100% AMI)' : `${ami}% AMI`);
export type MeasureId = 'rent_gap' | 'burdened' | 'jobs' | 'school' | 'transit' | 'services';

export interface MeasureDef {
  id: MeasureId;
  /** Short label for the picker. */
  short: string;
  title: string;
  definition: (ami: AmiPct) => string;
  unit: string;
  source: string;
  /** True when a larger value means more need (rent gap, burdened renters, miles); false for jobs and services. */
  higherIsNeed: boolean;
  /** Rounding step for the legend's break values. */
  step: number;
  fmt: (v: number | null | undefined) => string;
}

const dollars = (v: number) => `${v < 0 ? '−' : ''}$${Math.abs(Math.round(v)).toLocaleString('en-US')}`;
const NA = 'not available';

export const MEASURES: MeasureDef[] = [
  {
    id: 'rent_gap',
    short: 'Rent gap',
    title: 'Rent gap for a 2-bedroom',
    definition: (ami) => `What listings ask for a 2-bedroom, minus the rent a 3-person household ${ami === 100 ? 'at the area median income (market rate)' : `at ${ami}% of area median income`} can pay (30% of income). Below $0 means the market already fits. Listings usually exclude utilities and the rent that fits includes them, so the real gap is larger.`,
    unit: '$ per month',
    source: 'Asking rents: Dewey listings 2025–26 (high or medium confidence only) · Income limits: HUD FY2026, Pittsburgh HMFA',
    higherIsNeed: true,
    step: 25,
    fmt: (v) => (isNum(v) ? `${dollars(v)}/mo` : NA),
  },
  {
    id: 'burdened',
    short: 'Burdened renters',
    title: 'Renters at or below 50% AMI paying over 30%',
    definition: () => 'Renter households earning up to half the area median income that spend more than 30% of income on housing (the ≤30% and 30–50% bands added together).',
    unit: 'households',
    source: 'HUD CHAS 2018–2022, Table 8 (HAMFI bands)',
    higherIsNeed: true,
    step: 5,
    fmt: (v) => (isNum(v) ? `${Math.round(v).toLocaleString('en-US')} households` : NA),
  },
  {
    id: 'jobs',
    short: 'Jobs ≤1 mi',
    title: 'Jobs within 1 mile',
    definition: () => 'Jobs at workplaces within a straight-line mile of home, averaged over residents (weighted by 2020 block population). Fewer jobs nearby means more need.',
    unit: 'jobs',
    source: 'Census LEHD LODES 8, workplace jobs 2023 (all jobs)',
    higherIsNeed: false,
    step: 100,
    fmt: (v) => (isNum(v) ? `${Math.round(v).toLocaleString('en-US')} jobs` : NA),
  },
  {
    id: 'school',
    short: 'School',
    title: 'Miles to a public school',
    definition: () => 'Straight-line miles from home to the nearest open public school, averaged over residents. Farther means more need.',
    unit: 'miles',
    source: 'NCES Common Core of Data, 2024 school directory',
    higherIsNeed: true,
    step: 0.05,
    fmt: (v) => (isNum(v) ? `${v.toFixed(2)} mi` : NA),
  },
  {
    id: 'transit',
    short: 'Frequent transit',
    title: 'Miles to frequent transit',
    definition: () => 'Straight-line miles from home to the nearest stop with at least 64 weekday departures (a bus or T about every 15 minutes), averaged over residents. Farther means more need.',
    unit: 'miles',
    source: 'Pittsburgh Regional Transit GTFS static feed, June 2026',
    higherIsNeed: true,
    step: 0.05,
    fmt: (v) => (isNum(v) ? `${v.toFixed(2)} mi` : NA),
  },
  {
    id: 'services',
    short: 'Services ≤½ mi',
    title: 'Services within ½ mile',
    definition: () => 'Groceries, pharmacies, health clinics and libraries within a straight-line half mile of home, averaged over residents. Fewer means more need.',
    unit: 'places',
    source: 'OpenStreetMap via Overpass',
    higherIsNeed: false,
    step: 0.5,
    fmt: (v) => (isNum(v) ? `${v.toFixed(1)} places` : NA),
  },
];

export const measureById = new Map(MEASURES.map((m) => [m.id, m]));

export const accessOf = (p: PlaceMeasures | null | undefined): PlaceAccess | null => (p as (PlaceMeasures & { access?: PlaceAccess | null }) | null | undefined)?.access ?? null;

/** The 2-bedroom rent that fits at `ami` (30% of the 3-person limit, monthly). */
export const fitsRent2br = (hud: HudTable | null, ami: AmiPct): number | null => fits2br(hud, ami)?.rent ?? null;

/** The 2-bedroom rent that fits and its arithmetic. At market rate (100): the HUD median income × 0.9 (3 people). */
export function fits2br(hud: HudTable | null, ami: AmiPct): { rent: number; formula: string } | null {
  if (!hud) return null;
  if (ami !== 100) {
    const c = ceilingRent(hud, ami, 2);
    return c ? { rent: c.rent, formula: c.formula } : null;
  }
  const med = hud.metro?.median;
  if (!isNum(med)) return null;
  const income = med * HUD_3P_ADJ;
  const rent = Math.round(income / 40);
  const $ = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;
  return { rent, formula: `${$(med)} × 90% (3 people) × 30% ÷ 12 = ${$(rent)}` };
}

/** The asking 2-bedroom rent when its confidence is medium or better, else null (a low-confidence rent is not used). */
export function usableAsking(p: PlaceMeasures | null | undefined): number | null {
  const m = p?.market;
  return isNum(m?.asking_2br) && confUsable(m?.asking_conf) ? m!.asking_2br! : null;
}

/** asking − fits, $/month; negative when the market already fits. */
export function rentGap(p: PlaceMeasures | null | undefined, hud: HudTable | null, ami: AmiPct): number | null {
  const a = usableAsking(p),
    f = fitsRent2br(hud, ami);
  return a != null && f != null ? a - f : null;
}

export function burdenedLe50(p: PlaceMeasures | null | undefined): number | null {
  const a = p?.bands?.le30?.burden30,
    b = p?.bands?.b30_50?.burden30;
  return isNum(a) && isNum(b) ? a + b : null;
}

export function measureValue(id: MeasureId, p: PlaceMeasures | null | undefined, hud: HudTable | null, ami: AmiPct): number | null {
  if (!p) return null;
  const acc = accessOf(p);
  const v =
    id === 'rent_gap'
      ? rentGap(p, hud, ami)
      : id === 'burdened'
        ? burdenedLe50(p)
        : id === 'jobs'
          ? acc?.jobs_1mi
          : id === 'school'
            ? acc?.school_mi
            : id === 'transit'
              ? p.transit?.freq_dist_mi
              : acc?.services_halfmi;
  return isNum(v) ? v : null;
}

export function median(values: number[]): number | null {
  const xs = values.filter(isNum).sort((a, b) => a - b);
  if (!xs.length) return null;
  const m = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[m] : (xs[m - 1] + xs[m]) / 2;
}

/** Rows sorted from most need to least; missing values last. */
export function rankByNeed<T extends { value: number | null }>(rows: T[], higherIsNeed: boolean): T[] {
  return [...rows].sort((a, b) => {
    if (a.value == null && b.value == null) return 0;
    if (a.value == null) return 1;
    if (b.value == null) return -1;
    return higherIsNeed ? b.value - a.value : a.value - b.value;
  });
}

const roundTo = (v: number, step: number) => Math.round(Math.round(v / step) * step * 1e6) / 1e6;

/** Quantile break values (k classes → up to k−1 breaks), rounded to `step`, strictly increasing. */
export function quantileBreaks(values: number[], k: number, step: number): number[] {
  const xs = values.filter(isNum).sort((a, b) => a - b);
  if (xs.length < 2) return [];
  const out: number[] = [];
  for (let i = 1; i < k; i++) {
    const q = xs[Math.min(xs.length - 1, Math.floor((i / k) * xs.length))];
    const r = roundTo(q, step);
    if (r > xs[0] && (!out.length || r > out[out.length - 1])) out.push(r);
  }
  return out;
}

/** Class index for a value against ascending breaks: 0 below the first break … breaks.length at or above the last. */
export function classOf(v: number, breaks: number[]): number {
  let i = 0;
  while (i < breaks.length && v >= breaks[i]) i++;
  return i;
}

/** Light to dark = less to more need. */
/** Need ramp, light to deep violet (the app's accent), so the selection spotlight's shade reads over every class. */
export const NEED_PALETTE = ['#f4f0fe', '#ddd3fb', '#c0acf5', '#9e82ea', '#7c58d8', '#5a36b0'];
/** "$0 or less: the market already fits": a calm teal, apart from the need ramp. */
export const FITS_COLOR = '#9fd8c7';

export interface Legend {
  /** Per tract: palette index into `colors`, or null (no data). */
  classOf: (v: number | null) => number | null;
  colors: string[];
  items: { color: string; label: string }[];
}

/**
 * The map classes for a measure: quantile breaks over the ranked tracts' values, colored by need. The rent gap puts
 * "$0 or less" (the market already fits) in its own green class and splits the positive gaps into quantiles.
 */
export function buildLegend(def: MeasureDef, values: number[], k = 5): Legend {
  const fmt = (v: number) => def.fmt(v).replace(/\/mo$| households$| jobs$| places$/, '');
  const xs = values.filter(isNum);
  if (def.id === 'rent_gap') {
    const pos = xs.filter((v) => v > 0);
    const breaks = quantileBreaks(pos, k - 1, def.step);
    const n = breaks.length + 1;
    const colors = [FITS_COLOR, ...NEED_PALETTE.slice(NEED_PALETTE.length - n)];
    const items = [{ color: FITS_COLOR, label: '$0 or less: the market already fits' }];
    const lows = [0, ...breaks];
    for (let i = 0; i < n; i++) {
      const lo = lows[i],
        hi = breaks[i];
      items.push({
        color: colors[i + 1],
        label: hi == null ? `${fmt(lo)} or more` : `${i === 0 ? 'over ' : ''}${fmt(lo)} to under ${fmt(hi)}`,
      });
    }
    return {
      classOf: (v) => (v == null ? null : v <= 0 ? 0 : 1 + classOf(v, breaks)),
      colors,
      items,
    };
  }
  const breaks = quantileBreaks(xs, k, def.step);
  const n = breaks.length + 1;
  const ramp = NEED_PALETTE.slice(NEED_PALETTE.length - Math.max(n, 1));
  const colors = def.higherIsNeed ? ramp : [...ramp].reverse();
  const items: { color: string; label: string }[] = [];
  for (let i = 0; i < n; i++) {
    const lo = breaks[i - 1],
      hi = breaks[i];
    const label = lo == null && hi == null ? 'all values' : lo == null ? `under ${fmt(hi)}` : hi == null ? `${fmt(lo)} or more` : `${fmt(lo)} to under ${fmt(hi)}`;
    items.push({ color: colors[i], label });
  }
  return {
    classOf: (v) => (v == null ? null : classOf(v, breaks)),
    colors,
    items,
  };
}
