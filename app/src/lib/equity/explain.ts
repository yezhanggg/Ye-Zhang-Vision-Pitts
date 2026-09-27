// Plain sentences and chart inputs for the measure section of Equity & policy. Deterministic templates, one per
// measure, filled from the same tract values the map draws; no scores, no model text.
import { isNum } from '../place/format';
import { median, rankByNeed, type AmiPct, type Legend, type MeasureDef, type MeasureId } from './measures';

export interface TractValue {
  id: string;
  value: number | null;
}

export interface ExplainInput {
  def: MeasureDef;
  ami: AmiPct;
  values: TractValue[];
  nameOf: (id: string) => string;
}

const int = (v: number) => Math.round(v).toLocaleString('en-US');
const perMonth = (v: number) => `$${int(Math.abs(v))} a month`;
const miles = (v: number) => `${v.toFixed(2)} mi`;

/** "A", "A and B", "A, B and C". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The first `n` distinct neighborhood names among the tracts with the most need. */
export function topNames(values: TractValue[], higherIsNeed: boolean, nameOf: (id: string) => string, n = 3): string[] {
  const out: string[] = [];
  for (const r of rankByNeed(values, higherIsNeed)) {
    if (r.value == null) break;
    const name = nameOf(r.id);
    if (!out.includes(name)) out.push(name);
    if (out.length >= n) break;
  }
  return out;
}

const missingNote = (missing: number, what: string) => (missing > 0 ? ` ${int(missing)} ${missing === 1 ? 'tract has' : 'tracts have'} no ${what} and ${missing === 1 ? 'is' : 'are'} left out.` : '');

/** Two or three sentences reading the city picture for one measure. */
export function explainMeasure({ def, ami, values, nameOf }: ExplainInput): string[] {
  const xs = values.map((v) => v.value).filter(isNum);
  const avail = xs.length;
  const missing = values.length - avail;
  if (!avail) return [`No tract has a value for ${def.title.toLowerCase()} yet.`];
  const med = median(xs) as number;
  const top = joinNames(topNames(values, def.higherIsNeed, nameOf));
  const count = (f: (v: number) => boolean) => xs.filter(f).length;

  switch (def.id as MeasureId) {
    case 'rent_gap': {
      const pos = count((v) => v > 0);
      const posMed = median(xs.filter((v) => v > 0));
      if (!pos) return [`Listings for a 2-bedroom already fit ${ami === 100 ? 'a median-income' : `${ami === 80 ? 'an' : 'a'} ${ami}% AMI`} household in all ${int(avail)} tracts with a reliable asking rent.${missingNote(missing, 'reliable asking rent')}`];
      return [
        `Listings ask more than ${ami === 100 ? 'a median-income' : `${ami === 80 ? 'an' : 'a'} ${ami}% AMI`} household can pay in ${int(pos)} of ${int(avail)} tracts with a reliable asking rent.${missingNote(missing, 'reliable asking rent')}`,
        med > 0
          ? `The median gap is ${perMonth(med)}${posMed != null && pos < avail ? `; where there is a gap, it is typically ${perMonth(posMed)}` : ''}.`
          : `In the median tract listings already fit${posMed != null ? `; where there is a gap, it is typically ${perMonth(posMed)}` : ''}.`,
        `The largest gaps are in ${top}.`,
      ];
    }
    case 'burdened': {
      const total = xs.reduce((s, v) => s + v, 0);
      const sorted = [...xs].sort((a, b) => b - a);
      const k = Math.min(10, sorted.length);
      const topShare = total > 0 ? Math.round((sorted.slice(0, k).reduce((s, v) => s + v, 0) / total) * 100) : 0;
      return [
        `About ${int(total)} renter households earning up to half the area median pay more than 30% of income for housing, across ${int(avail)} tracts.${missingNote(missing, 'CHAS count')}`,
        `A typical tract has ${int(med)}; the ${k} tracts with the most hold ${topShare}% of them.`,
        `The most are in ${top}.`,
      ];
    }
    case 'jobs': {
      const half = med / 2;
      const low = count((v) => v < half);
      return [
        `The typical tract's residents have ${int(med)} jobs within a straight-line mile.${missingNote(missing, 'job count')}`,
        `${int(low)} of ${int(avail)} tracts have fewer than half that (under ${int(half)}).`,
        `The fewest jobs nearby are in ${top}.`,
      ];
    }
    case 'school': {
      const far = count((v) => v > 0.5);
      return [
        `The typical resident lives ${miles(med)} from the nearest public school.${missingNote(missing, 'school distance')}`,
        `In ${int(far)} of ${int(avail)} tracts the average resident is more than half a mile away.`,
        `The longest trips are in ${top}.`,
      ];
    }
    case 'transit': {
      const near = count((v) => v <= 0.25);
      const far = count((v) => v > 0.5);
      return [
        `The typical resident lives ${miles(med)} from a stop with a bus or T about every 15 minutes.${missingNote(missing, 'transit distance')}`,
        `${int(near)} of ${int(avail)} tracts are within a quarter mile; ${int(far)} are more than half a mile away.`,
        `The farthest are ${top}.`,
      ];
    }
    case 'services': {
      const none = count((v) => v < 1);
      return [
        `The typical resident has ${med.toFixed(1)} groceries, pharmacies, clinics or libraries within half a mile.${missingNote(missing, 'service count')}`,
        `${int(none)} of ${int(avail)} tracts average fewer than one.`,
        `The fewest are in ${top}.`,
      ];
    }
  }
}

export interface ClassCount {
  color: string;
  label: string;
  count: number;
}

/** Tracts per map class (same order and colors as the map legend), plus the tracts with no value. */
export function classCounts(legend: Legend, values: TractValue[]): { classes: ClassCount[]; missing: number } {
  const counts = legend.items.map(() => 0);
  let missing = 0;
  for (const v of values) {
    const c = legend.classOf(v.value);
    if (c == null) missing++;
    else counts[c]++;
  }
  return { classes: legend.items.map((it, i) => ({ color: it.color, label: it.label, count: counts[i] })), missing };
}

/** 0 = least need, 1 = most need: the share of tracts with a value that have less need than `v`, ties counted half. */
export function needPercentile(v: number | null, xs: number[], higherIsNeed: boolean): number | null {
  if (!isNum(v)) return null;
  const ys = xs.filter(isNum);
  if (ys.length < 2) return null;
  let less = 0,
    same = 0;
  for (const y of ys) {
    if (y === v) same++;
    else if (higherIsNeed ? y < v : y > v) less++;
  }
  return Math.max(0, Math.min(1, (less + Math.max(0, same - 1) / 2) / (ys.length - 1)));
}

/** "Policies on: ADU by right, Rent-gap subsidy — details in ③", or null when every lever is off. */
export function policiesOnLine(levers: { name: string; on: boolean }[]): string | null {
  const on = levers.filter((l) => l.on).map((l) => l.name);
  return on.length ? `Policies on: ${on.join(', ')} — details in ③` : null;
}
