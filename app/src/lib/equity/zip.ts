// The six Equity & policy measures at ZIP-code (ZCTA) level, from app/src/data/equity_zip.json (scripts/12). CHAS and
// the access measures exist only by tract, so a ZIP's value aggregates the city's residential tracts, weighted by 2020
// housing units; edge ZIPs cover only their city part. The rent gap uses the ZIP's own asking rent (the whole ZIP).
// Same glob-and-raw pattern as the other data modules, so the single-file export inlines the file.
import { isNum } from '../place/format';
import type { HudTable } from '../place/types';
import { MEASURES, fits2br, median, rankByNeed, type AmiPct, type MeasureDef, type MeasureId } from './measures';

export interface ZipRec {
  /** 2020 housing units in the ZIP's city part (the city residential tracts' blocks inside it). */
  hu: number;
  /** Share of the ZIP's 2020 housing units that are in the city part (0–1). */
  share: number;
  /** City tracts that contribute (GEOIDs), the ones with most of their homes inside the ZIP first. */
  tracts: string[];
  /** Under half the ZIP's homes are in the city: the values cover only its city part. */
  edge: boolean;
  /** Burdened renters (over 30% of income) by income level: "30" | "50" | "80" | "100" (above 80%). */
  burdened: Record<string, number | null>;
  jobs: number | null;
  school: number | null;
  transit: number | null;
  services: number | null;
  /** The ZIP's median 2-bedroom asking rent, 2025–26, high or medium confidence only (the whole ZIP, not only its city part). */
  asking: number | null;
}

/** The bundled form (scripts/12, equity_zip.compact): short keys, missing values left out. */
interface ZipRaw {
  h: number;
  p: number;
  t?: number[];
  b?: (number | null)[];
  j?: number;
  s?: number;
  tr?: number;
  sv?: number;
  a?: number;
}

const raw = import.meta.glob('../../data/equity_zip.json', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const num = (v: unknown): number | null => (isNum(v) ? v : null);

export function parseZipFile(text: string | undefined): Map<string, ZipRec> {
  const out = new Map<string, ZipRec>();
  if (!text) return out;
  try {
    const d = JSON.parse(text) as { z?: Record<string, ZipRaw> };
    for (const [z, r] of Object.entries(d.z ?? {})) {
      const b = r.b ?? [];
      out.set(z, {
        hu: r.h ?? 0,
        share: r.p ?? 0,
        tracts: (r.t ?? []).map((t) => `42003${String(t).padStart(6, '0')}`),
        edge: (r.p ?? 0) < 0.5,
        burdened: { '30': num(b[0]), '50': num(b[1]), '80': num(b[2]), '100': num(b[3]) },
        jobs: num(r.j),
        school: num(r.s),
        transit: num(r.tr),
        services: num(r.sv),
        asking: num(r.a),
      });
    }
  } catch (e) {
    console.warn('[equity] could not parse equity_zip.json', e);
  }
  return out;
}

export const zipById: Map<string, ZipRec> = parseZipFile(raw['../../data/equity_zip.json']);
/** A ZIP is ranked when its city part holds at least this many 2020 homes (tracts: 25 households). */
export const MIN_ZIP_HOMES = 25;
export const zipRanked = (r: ZipRec | null | undefined): boolean => !!r && r.tracts.length > 0 && r.hu >= MIN_ZIP_HOMES;
/** ZIPs with enough homes in the city's residential tracts (the ones ranked and colored). */
export const rankedZips: string[] = [...zipById.entries()].filter(([, r]) => zipRanked(r)).map(([z]) => z);
export const hasZipData = rankedZips.length > 0;

/** Plain note shown with every ZIP view. */
export const ZIP_NOTE =
  "ZIP values are aggregates of the city's census tracts, weighted by housing units; edge ZIPs cover only their city part. The rent gap uses the ZIP's own asking rent (the whole ZIP).";

/** A measure's value for a ZIP in the tract measure's units; null when missing. Rent gap = ZIP asking − fits2br(hud, ami). */
export function zipValue(measure: MeasureId, zip: string, ami: AmiPct, hud: HudTable | null, file: Map<string, ZipRec> = zipById): number | null {
  const r = file.get(zip);
  if (!r || !zipRanked(r)) return null;
  let v: number | null | undefined;
  if (measure === 'rent_gap') {
    const a = r.asking,
      f = fits2br(hud, ami)?.rent;
    v = a != null && isNum(f) ? a - f : null;
  } else if (measure === 'burdened') v = r.burdened?.[String(ami)];
  else v = r[measure];
  return isNum(v) ? v : null;
}

/** "ZIP 15222", "ZIP 15106 (city part)". */
export const zipName = (zip: string, file: Map<string, ZipRec> = zipById) => `ZIP ${zip}${file.get(zip)?.edge ? ' (city part)' : ''}`;

/** The neighborhoods of the tracts that carry most of the ZIP's city homes (by the tract's share inside the ZIP). */
export function zipPlaces(zip: string, labelOf: (tract: string) => string, n = 2, file: Map<string, ZipRec> = zipById): string {
  const r = file.get(zip);
  if (!r) return '';
  const names: string[] = [];
  for (const t of r.tracts) {
    const name = labelOf(t);
    if (name && !names.includes(name)) names.push(name);
    if (names.length >= n) break;
  }
  const more = new Set(r.tracts.map(labelOf)).size - names.length;
  return names.join(', ') + (more > 0 ? ` +${more}` : '');
}

/** One line on how the ZIP was built: "4,187 city homes (100% of the ZIP) from 3 tracts". */
export function zipCoverage(zip: string, file: Map<string, ZipRec> = zipById): string {
  const r = file.get(zip);
  if (!r) return '';
  if (!zipRanked(r)) return r.hu ? `Only ${r.hu} city ${r.hu === 1 ? 'home' : 'homes'}, not ranked` : 'No homes in the city’s ranked tracts';
  const n = r.tracts.length;
  return `${r.hu.toLocaleString('en-US')} city homes (${Math.round(r.share * 100)}% of the ZIP) from ${n} ${n === 1 ? 'tract' : 'tracts'}`;
}

/** Tract sentences read for ZIP codes ("tracts" → "ZIP codes"). */
export const zipWords = (s: string) =>
  s
    .replace(/\btracts\b/g, 'ZIP codes')
    .replace(/\btract's\b/g, "ZIP code's")
    .replace(/\btract\b/g, 'ZIP code');

export interface ZipFactsInput {
  def: MeasureDef;
  ami: AmiPct;
  hud: HudTable | null;
  selected: string | null;
  file?: Map<string, ZipRec>;
}

/** Facts for VisionPitts-Chat at ZIP level, appended to the tract facts (the levers stay tract-based). */
export function zipFacts({ def, ami, hud, selected, file = zipById }: ZipFactsInput): string {
  const ids = [...file.entries()].filter(([, r]) => zipRanked(r)).map(([z]) => z);
  const rows = ids.map((id) => ({ id, value: zipValue(def.id, id, ami, hud, file) }));
  const xs = rows.map((r) => r.value).filter(isNum);
  const med = median(xs);
  const out = [
    'LEVEL SHOWN ON THE MAP AND IN THE MEASURE SECTION: ZIP codes (ZCTAs), not tracts.',
    ZIP_NOTE,
    `ZIP median of ${def.title} over ${xs.length} of ${ids.length} ZIP codes with a value: ${def.fmt(med)}.`,
  ];
  const top = rankByNeed(rows, def.higherIsNeed).filter((r) => r.value != null).slice(0, 10);
  out.push(`ZIP codes, most need first (${def.higherIsNeed ? 'highest' : 'lowest'} value first), top ${top.length}:`);
  top.forEach((r, i) => out.push(`${i + 1}. ${zipName(r.id, file)}: ${def.fmt(r.value)} (${zipCoverage(r.id, file)})`));
  if (selected && file.has(selected)) {
    out.push(`Selected ZIP ${zipName(selected, file)} (${zipCoverage(selected, file)}), value here vs ZIP median:`);
    for (const m of MEASURES) {
      const all = ids.map((id) => zipValue(m.id, id, ami, hud, file)).filter(isNum);
      out.push(`- ${m.title}: ${m.fmt(zipValue(m.id, selected, ami, hud, file))} here; ZIP median ${m.fmt(median(all))}`);
    }
  }
  out.push('The four policy levers below are computed for census tracts, not ZIP codes.');
  return out.join('\n');
}
