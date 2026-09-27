// "Why they differ" on Compare places, in plain sentences: the same rules the Place tab runs, read side by side.
// Every sentence is built from the two recommendations and place.json; nothing here scores or ranks.
import { bedroomsWord } from "./bands";
import { lotPattern } from "./feasibility";
import { capitalize, fmtHouseholds, isNum } from "./format";
import { levelPhrase, type PlanLevel } from "./plan";
import type { Recommendation } from "./recommend";
import { TYPOLOGY_LABEL } from "./thresholds";
import type { PlaceMeasures } from "./types";

export interface WhySide {
  name: string;
  p: PlaceMeasures | null;
  rec: Recommendation | null;
}

/** One topic: a short label, a sentence for each place, and an optional line that compares the two. */
export interface WhyRow {
  topic: string;
  a: string | null;
  b: string | null;
  both?: string;
}

/** Drops the worked arithmetic in parentheses (the Place tab shows it) so the sentence reads in one pass. */
export const plain = (s: string) =>
  s
    .replace(/\s*\([^()]*\)/g, "")
    .replace(/(?:\$[\d,.]+|[\d.]+%?) − (?:\$[\d,.]+|[\d.]+%?) = /g, "")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();

const sentence = (s: string) => {
  const t = capitalize(plain(s));
  return /[.!?]$/.test(t) ? t : `${t}.`;
};
const typeLabel = (k: string) =>
  TYPOLOGY_LABEL[k as keyof typeof TYPOLOGY_LABEL] ?? k;
/** First clause of a type's "because" (before the lot and zoning notes). */
const firstClause = (s: string) => plain(s.split(";")[0] ?? s);

/** "3.6 times", "about the same", or null when either is missing. */
function ratio(
  a: number | null | undefined,
  b: number | null | undefined,
  nameA: string,
  nameB: string,
  what: string,
): string | undefined {
  if (!isNum(a) || !isNum(b) || a <= 0 || b <= 0) return undefined;
  const hi = Math.max(a, b),
    lo = Math.min(a, b);
  if (hi / lo < 1.15)
    return `Both places have about the same number of ${what}.`;
  const [big, small] = a >= b ? [nameA, nameB] : [nameB, nameA];
  const r = hi / lo;
  return `${big} has ${r >= 10 ? Math.round(r) : r.toFixed(1)} times as many ${what} as ${small}.`;
}

function outcome(s: WhySide): string | null {
  const rec = s.rec;
  if (!rec)
    return s.p
      ? null
      : "No place measures here (a park, a campus or too few households), so no suggestion.";
  const lead = rec.types[0];
  if (!lead)
    return rec.headline ? sentence(rec.headline) : "No suggestion here.";
  const also = rec.types.slice(1).map((t) => typeLabel(t.typology));
  return `${capitalize(typeLabel(lead.typology))}: ${firstClause(lead.because)}.${
    also.length ? ` Also fits ${also.join(", ")}.` : ""
  }`;
}

function need(s: WhySide, level: PlanLevel): string | null {
  const rec = s.rec;
  if (!rec) return null;
  const { hh, burdened } = rec.band;
  const top = rec.tenants.types[0];
  const parts: string[] = [];
  if (isNum(hh))
    parts.push(
      `${fmtHouseholds(hh)} renter households ${levelPhrase(level)}${isNum(burdened) ? `, ${fmtHouseholds(burdened)} of them paying over 30% of income` : ""}.`,
    );
  if (top && top.count > 0) {
    const br = rec.types[0]?.bedrooms ?? rec.tenants.bedrooms;
    parts.push(
      `The largest group is ${fmtHouseholds(top.count)} ${top.label}, so each home is ${bedroomsWord(br, rec.tenants.seniorAlone)}.`,
    );
  }
  return parts.length ? parts.join(" ") : sentence(rec.tenants.sentence);
}

/** The same lot-pattern test as the recommendation (feasibility.lotPattern): 2–4 unit share or parcel count, and
 *  vacant parcels, each against its printed mark. */
function land(p: PlaceMeasures | null): string | null {
  const s = p?.stock;
  if (!s) return null;
  const lp = lotPattern(p!);
  const vac = s.vacant_parcels,
    share = s.units_2_4_share,
    parcels = s.parcels_2_4;
  const bits: string[] = [];
  if (isNum(vac))
    bits.push(
      lp.vacantLand
        ? `${fmtHouseholds(vac)} vacant parcels, so new buildings can go on empty land`
        : `${fmtHouseholds(vac)} vacant parcels, so a new building would replace something`,
    );
  if (lp.smallBuildings != null) {
    const pct = isNum(share)
      ? Math.round(share <= 1 ? share * 100 : share)
      : null;
    const facts = [
      pct != null ? `${pct}% of homes in 2–4 unit buildings` : null,
      isNum(parcels)
        ? `${fmtHouseholds(parcels)} parcels with 2–4 units`
        : null,
    ]
      .filter(Boolean)
      .join(" and ");
    bits.push(
      lp.smallBuildings
        ? `${facts}, enough small buildings for conversions and ADUs`
        : `${facts}, too few small buildings for conversions to be common`,
    );
  }
  return bits.length ? `${capitalize(bits.join("; "))}.` : null;
}

function place(p: PlaceMeasures | null): string | null {
  const d = p?.transit?.freq_dist_mi,
    f = p?.flood?.fema_sfha_pct;
  const bits: string[] = [];
  if (isNum(d))
    bits.push(
      `the nearest frequent stop is ${d.toFixed(2)} mi away${d <= 0.25 ? ", a short walk" : d > 0.5 ? ", a long walk" : ""}`,
    );
  if (isNum(f))
    bits.push(
      f <= 0
        ? "no land in a FEMA flood zone"
        : `${f.toFixed(1)}% of land in a FEMA flood zone`,
    );
  return bits.length ? `${capitalize(plain(bits.join("; ")))}.` : null;
}

/** The rows for "Why they differ", most decisive first. Rows where neither side has anything to say are dropped. */
export function whyTheyDiffer(
  A: WhySide,
  B: WhySide,
  level: PlanLevel,
): WhyRow[] {
  const la = A.rec?.types[0]?.typology ?? null,
    lb = B.rec?.types[0]?.typology ?? null;
  const same = la && lb && la === lb;
  const rows: WhyRow[] = [
    {
      topic: "What each gets",
      a: outcome(A),
      b: outcome(B),
      both: same
        ? `Both get ${typeLabel(la)}; the differences below change the size, the rent and who it serves, not the type.`
        : undefined,
    },
    {
      topic: "The focus rule",
      a: A.rec ? sentence(A.rec.stanceTest.sentence) : null,
      b: B.rec ? sentence(B.rec.stanceTest.sentence) : null,
    },
    {
      topic: "Who needs homes",
      a: need(A, level),
      b: need(B, level),
      both: ratio(
        A.rec?.band.hh,
        B.rec?.band.hh,
        A.name,
        B.name,
        `renter households ${levelPhrase(level)}`,
      ),
    },
    {
      topic: "What the market asks",
      a: A.rec ? sentence(A.rec.market.sentence) : null,
      b: B.rec ? sentence(B.rec.market.sentence) : null,
    },
    { topic: "Land and buildings", a: land(A.p), b: land(B.p) },
    { topic: "Transit and flood", a: place(A.p), b: place(B.p) },
  ];
  return rows.filter((r) => r.a || r.b || r.both);
}
