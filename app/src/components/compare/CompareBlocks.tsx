// Compare places, under the maps: "At a glance" (real values from place.json, A left, B right, the side with more need
// or better access marked per row) and "What each place would get" (the Place tab's recommendation for each side).
import type { ReactNode } from "react";
import { tractLabel, typologyById } from "../../lib/data";
import { cx } from "../../lib/format";
import { ceilingRent } from "../../lib/place/afford";
import { bedroomsWord } from "../../lib/place/bands";
import {
  capitalize,
  fmtDollars,
  fmtHouseholds,
  isNum,
} from "../../lib/place/format";
import { amiOf, levelPhrase, type PlanLevel } from "../../lib/place/plan";
import type { Recommendation } from "../../lib/place/recommend";
import { TYPOLOGY_LABEL } from "../../lib/place/thresholds";
import type { HudTable, PlaceMeasures, Stance } from "../../lib/place/types";
import type { WhyRow } from "../../lib/place/whyDiffer";
import {
  accessOf,
  burdenedLe50,
  rentGap,
  usableAsking,
} from "../../lib/equity/measures";
import type { TractProps } from "../../lib/types";
import { Dot, readableColor } from "../primitives";

export interface SideInfo {
  tag: "A" | "B";
  color: string;
  t: TractProps | null;
  p: PlaceMeasures | null;
  rec: Recommendation | null;
}

/** A section title under the compare maps: a thin left accent that hangs in the gutter (so the text keeps the page's
 *  left edge), a small grey numeral and the title; the only semibold text in the information section. */
export function SectionHead({
  n,
  title,
  sub,
  right,
}: {
  n: number;
  title: string;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-2.5 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
      <div className="-ml-3 min-w-0 border-l-2 border-slate-800 pl-2.5">
        <h2 className="font-display text-body font-semibold leading-snug text-slate-900">
          <span className="mr-1.5 font-normal tnum text-slate-400">{n}</span>
          {title}
        </h2>
        {sub && <p className="mt-0.5 text-caption text-slate-500">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** Hex color with an alpha suffix ("14" is about 8%), for the tint on the favored side's cell. */
export const tint = (hex: string, a = "14") =>
  /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${a}` : hex;

/** A place's column header: its letter and name in its color over a 2px rule of the same color. */
export function PlaceHead({
  s,
  align = "right",
}: {
  s: Pick<SideInfo, "tag" | "color" | "t">;
  align?: "left" | "right";
}) {
  return (
    <div
      className={cx(
        "truncate border-b-2 pb-1 text-caption font-medium",
        align === "right" ? "text-right" : "text-left",
      )}
      style={{ color: s.color, borderColor: s.color }}
      title={tractLabel(s.t)}
    >
      {s.tag}
      <span className="mx-1 text-slate-300">·</span>
      {s.t ? tractLabel(s.t) : "Choose a place"}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------- 1

type Kind = "need" | "access";

export interface GlanceRow {
  label: string;
  /** Which way the row reads, in words. */
  dir: string;
  kind: Kind;
  /** True when the larger value is the flagged side (more need, or better access). */
  higherFlagged: boolean;
  a: number | null;
  b: number | null;
  fmt: (v: number) => string;
  /** Text when a side's value is missing. */
  na?: string;
}

const money = (v: number) =>
  `${v < 0 ? "−" : ""}$${Math.abs(Math.round(v)).toLocaleString("en-US")}`;
const hh = (v: number) => `${Math.round(v).toLocaleString("en-US")}`;
const renterLe50 = (p: PlaceMeasures | null) => {
  const x = p?.bands?.le30?.hh,
    y = p?.bands?.b30_50?.hh;
  return isNum(x) && isNum(y) ? x + y : isNum(x) ? x : isNum(y) ? y : null;
};

/** Which side a row marks (more need, or better access), or null when equal or missing. */
export const glanceFlag = (r: GlanceRow): "a" | "b" | null => {
  if (r.a == null || r.b == null || r.fmt(r.a) === r.fmt(r.b)) return null;
  return r.a > r.b === r.higherFlagged ? "a" : "b";
};

/** The At-a-glance rows (real values, A and B) and the 2-bedroom rent that fits; shared with the comparison export. */
export function glanceRows(
  Ap: PlaceMeasures | null,
  Bp: PlaceMeasures | null,
  hud: HudTable | null,
  level: PlanLevel,
) {
  const ami = amiOf(level);
  const fits = hud ? ceilingRent(hud, ami, 2) : null;
  const base: GlanceRow[] = [
    {
      label: `Renter households at or below 50% AMI`,
      dir: "more = more need",
      kind: "need",
      higherFlagged: true,
      a: renterLe50(Ap),
      b: renterLe50(Bp),
      fmt: hh,
    },
    {
      label: "Burdened renters (≤50% AMI, paying over 30%)",
      dir: "more = more need",
      kind: "need",
      higherFlagged: true,
      a: burdenedLe50(Ap),
      b: burdenedLe50(Bp),
      fmt: hh,
    },
    {
      label: "2-bedroom asking rent",
      dir: "higher = harder to afford",
      kind: "need",
      higherFlagged: true,
      a: usableAsking(Ap),
      b: usableAsking(Bp),
      fmt: (v) => `${money(v)}/mo`,
      na: "too few listings",
    },
    {
      label: `Rent gap at ${ami}% AMI (asking − fits)`,
      dir: "bigger = more need",
      kind: "need",
      higherFlagged: true,
      a: rentGap(Ap, hud, ami),
      b: rentGap(Bp, hud, ami),
      fmt: (v) => `${money(v)}/mo`,
      na: "no usable asking rent",
    },
    {
      label: "Nearest frequent stop",
      dir: "closer = better access",
      kind: "access",
      higherFlagged: false,
      a: Ap?.transit?.freq_dist_mi ?? null,
      b: Bp?.transit?.freq_dist_mi ?? null,
      fmt: (v) => `${v.toFixed(2)} mi`,
    },
    {
      label: "FEMA flood-zone land",
      dir: "less = safer to build",
      kind: "access",
      higherFlagged: false,
      a: Ap?.flood?.fema_sfha_pct ?? null,
      b: Bp?.flood?.fema_sfha_pct ?? null,
      fmt: (v) => `${v.toFixed(1)}%`,
    },
    {
      label: "Jobs within 1 mile",
      dir: "more = better access",
      kind: "access",
      higherFlagged: true,
      a: accessOf(Ap)?.jobs_1mi ?? null,
      b: accessOf(Bp)?.jobs_1mi ?? null,
      fmt: hh,
    },
    {
      label: "Services within ½ mile",
      dir: "more = better access",
      kind: "access",
      higherFlagged: true,
      a: accessOf(Ap)?.services_halfmi ?? null,
      b: accessOf(Bp)?.services_halfmi ?? null,
      fmt: (v) => v.toFixed(1),
    },
  ];
  const rows = base.map((r) => ({
    ...r,
    a: isNum(r.a) ? r.a : null,
    b: isNum(r.b) ? r.b : null,
  }));

  return { ami, fits, rows };
}

/** One grid for every row under the maps: measure label, then A and B values right-aligned. */
export const GLANCE_GRID =
  "grid grid-cols-[minmax(200px,520px)_minmax(104px,168px)_minmax(104px,168px)] gap-x-3";

/** Row groups for display only; `glanceRows()` keeps its order for the export. Index 3 (rent gap) follows the fits row. */
const GROUPS: { label: string; idx: (number | "fits")[] }[] = [
  { label: "Affordability", idx: [0, 1, 2, "fits", 3] },
  { label: "Access", idx: [4, 6, 7] },
  { label: "Risk", idx: [5] },
];

function Value({
  text,
  muted,
  shade,
  color,
}: {
  text: string;
  muted?: boolean;
  /** Tint the cell in the place's color: this side has more need, or better access. */
  shade?: boolean;
  color?: string;
}) {
  return (
    <div
      className={cx(
        "flex h-full items-center justify-end px-2 tnum",
        muted
          ? "text-caption text-slate-400"
          : "text-small font-medium text-slate-900",
      )}
      style={shade && color ? { background: tint(color, "1f") } : undefined}
    >
      {text}
    </div>
  );
}

function Measure({
  label,
  note,
  title,
}: {
  label: ReactNode;
  note?: ReactNode;
  title?: string;
}) {
  return (
    <div
      className="min-w-0 py-1.5 text-small leading-snug text-slate-600"
      title={title}
    >
      {label}
      {note && (
        <span className="ml-1.5 whitespace-nowrap text-[11px] text-slate-500">
          {note}
        </span>
      )}
    </div>
  );
}

export function AtAGlance({
  A,
  B,
  hud,
  level,
}: {
  A: SideInfo;
  B: SideInfo;
  hud: HudTable | null;
  level: PlanLevel;
}) {
  const { ami, fits, rows } = glanceRows(A.p, B.p, hud, level);
  const fitsText = fits ? `${fmtDollars(fits.rent)}/mo` : "not available";

  const line = (i: number | "fits") => {
    if (i === "fits")
      return (
        <div key="fits" className={cx(GLANCE_GRID, "min-h-[30px]")}>
          <Measure
            label={`2-bedroom rent that fits at ${ami}% AMI`}
            note="same in both, HUD limit"
            title={fits ? fits.formula : "HUD table not loaded"}
          />
          <Value text={fitsText} muted={!fits} />
          <Value text={fitsText} muted={!fits} />
        </div>
      );
    const r = rows[i];
    const f = glanceFlag(r);
    const val = (v: number | null, side: "a" | "b", s: SideInfo) => (
      <Value
        text={v == null ? (r.na ?? "not available") : r.fmt(v)}
        muted={v == null}
        shade={f === side}
        color={s.color}
      />
    );
    return (
      <div key={r.label} className={cx(GLANCE_GRID, "min-h-[30px]")}>
        <Measure label={r.label} note={r.dir} />
        {val(r.a, "a", A)}
        {val(r.b, "b", B)}
      </div>
    );
  };

  return (
    <div className="max-w-[880px]">
      <div className={cx(GLANCE_GRID, "items-end")}>
        <div className="pb-1 text-caption text-slate-500">Measure</div>
        <PlaceHead s={A} />
        <PlaceHead s={B} />
      </div>
      {GROUPS.map((g) => (
        <div key={g.label}>
          <div className="pb-0.5 pt-3 text-[11px] uppercase tracking-wide text-slate-500">
            {g.label}
          </div>
          <div className="divide-y divide-stone-200/70 border-y border-stone-200/70">
            {g.idx.map(line)}
          </div>
        </div>
      ))}
      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        Shading marks the place with more need, better access or less flood
        land, in that place's color. Sources: CHAS 2018–22, Dewey listings, HUD
        FY2026, PRT GTFS, FEMA NFHL, LODES 2023, OpenStreetMap.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------- 2

type GetsCells = {
  type: ReactNode;
  size: ReactNode;
  rent: ReactNode;
  who: ReactNode;
};

const dash = <span className="text-slate-400">–</span>;
const note = (t: ReactNode) => (
  <span className="block text-[11px] leading-snug text-slate-500">{t}</span>
);

function getsCells(s: SideInfo, level: PlanLevel): GetsCells {
  const rec = s.rec;
  if (!s.t)
    return {
      type: <span className="text-slate-500">Choose a place</span>,
      size: dash,
      rent: dash,
      who: dash,
    };
  if (!rec)
    return {
      type: (
        <>
          <span className="font-medium text-slate-900">No suggestion</span>
          {note(
            "No place measures for this tract (a park, a campus or too few households).",
          )}
        </>
      ),
      size: dash,
      rent: dash,
      who: dash,
    };
  const lead = rec.types[0] ?? null;
  const color = lead
    ? (typologyById.get(lead.typology)?.color ?? "#64748b")
    : "#94a3b8";
  const marketLed = rec.stance === "market_led";
  const tenant = rec.tenants.types[0] ?? null;
  const tLabel = (k: string) =>
    typologyById.get(k)?.label ??
    TYPOLOGY_LABEL[k as keyof typeof TYPOLOGY_LABEL] ??
    k;
  const why = !lead
    ? rec.stanceTest.passed === false || marketLed
      ? rec.stanceTest.sentence
      : rec.band.available
        ? rec.notServedWhy
        : rec.band.reason
    : null;
  return {
    type: lead ? (
      <>
        <span
          className="inline-flex items-center gap-1.5 font-medium"
          style={{ color: readableColor(color) }}
        >
          <Dot color={color} size={8} />
          {tLabel(lead.typology)}
        </span>
        {rec.types.length > 1 &&
          note(
            `also fits ${rec.types
              .slice(1)
              .map((o) => tLabel(o.typology))
              .join(", ")}`,
          )}
      </>
    ) : (
      <>
        <span className="font-medium text-slate-900">No suggestion here</span>
        {why && note(why)}
      </>
    ),
    size: lead ? (
      <span className="text-slate-800">
        {capitalize(bedroomsWord(lead.bedrooms).replace(/^a /, ""))} homes
        {marketLed ? " at market rents" : ""}
      </span>
    ) : (
      dash
    ),
    rent: rec.price ? (
      <span title={rec.price.formula}>
        <span className="font-medium tnum text-slate-900">
          {fmtDollars(rec.price.rent)}/mo
        </span>
        {note(
          `${bedroomsWord(rec.price.bedrooms, rec.price.seniorAlone)} at the ${rec.price.pct}% AMI limit`,
        )}
      </span>
    ) : (
      <span className="text-slate-700">
        Market rent{note("no HUD limit at this level")}
      </span>
    ),
    who: marketLed ? (
      <span className="text-slate-800">
        {lead
          ? `${capitalize(
              rec.headline.split("; serves ")[1] ??
                "households the market price reaches",
            )}.`
          : "Nobody new without a subsidy."}
      </span>
    ) : tenant ? (
      <span className="text-slate-800">
        <span className="font-medium tnum text-slate-900">
          {fmtHouseholds(tenant.count)}
        </span>{" "}
        {tenant.label}
        {note(`${levelPhrase(level)}, the largest group`)}
      </span>
    ) : (
      <span className="text-slate-700">{rec.tenants.sentence}</span>
    ),
  };
}

/** "What each place would get" as two columns, A and B, sharing one set of row labels. */
export function WhatEachGets({
  A,
  B,
  level,
}: {
  A: SideInfo;
  B: SideInfo;
  level: PlanLevel;
  stance?: Stance;
}) {
  const a = getsCells(A, level),
    b = getsCells(B, level);
  const rowsOf: { label: string; k: keyof GetsCells }[] = [
    { label: "Suggested type", k: "type" },
    { label: "Home size", k: "size" },
    { label: "Rent that fits", k: "rent" },
    { label: "Who it serves", k: "who" },
  ];
  const grid = "grid grid-cols-[104px_minmax(0,1fr)_minmax(0,1fr)] gap-x-4";
  return (
    <div>
      <div className={cx(grid, "items-end")}>
        <div className="pb-1 text-caption text-slate-500" />
        <PlaceHead s={A} align="left" />
        <PlaceHead s={B} align="left" />
      </div>
      <div className="divide-y divide-stone-200/70 border-b border-stone-200/70">
        {rowsOf.map((r) => (
          <div key={r.k} className={cx(grid, "min-h-[30px] py-1.5")}>
            <div className="text-small leading-snug text-slate-600">
              {r.label}
            </div>
            <div className="min-w-0 text-small leading-snug">{a[r.k]}</div>
            <div className="min-w-0 text-small leading-snug">{b[r.k]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------- 3

/** "Why they differ" as short paragraphs in a scrolling box: a topic, then one sentence per place led by the place's
 *  name in its color, and a grey line comparing the two when the numbers allow it. The scoring-rank sentence closes it.
 *  Built by lib/place/whyDiffer from the same rules as the suggestions. */
export function WhyParagraphs({
  A,
  B,
  rows,
  closing,
}: {
  A: SideInfo;
  B: SideInfo;
  rows: WhyRow[];
  closing?: ReactNode;
}) {
  const who = (s: SideInfo) => (
    <span className="font-medium" style={{ color: s.color }}>
      {s.tag} · {s.t ? tractLabel(s.t) : "Place " + s.tag}:{" "}
    </span>
  );
  return (
    <div
      className="max-h-[340px] overflow-y-auto overscroll-contain border-y border-stone-200/70 py-2 pr-3 [scrollbar-width:thin] min-[1440px]:max-h-none min-[1440px]:min-h-[120px] min-[1440px]:flex-1 min-[1440px]:basis-0"
      tabIndex={0}
      aria-label="Why they differ, scrollable"
    >
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.topic}>
            <div className="text-caption text-slate-500">{r.topic}</div>
            {r.a && (
              <p className="mt-0.5 text-small leading-snug text-slate-800">
                {who(A)}
                {r.a}
              </p>
            )}
            {r.b && (
              <p className="mt-1 text-small leading-snug text-slate-800">
                {who(B)}
                {r.b}
              </p>
            )}
            {r.both && (
              <p className="mt-1 text-caption leading-snug text-slate-500">
                {r.both}
              </p>
            )}
          </div>
        ))}
        {closing && (
          <p className="text-small leading-snug text-slate-600">{closing}</p>
        )}
      </div>
    </div>
  );
}
