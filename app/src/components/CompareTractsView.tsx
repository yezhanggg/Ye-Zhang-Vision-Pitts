// Analysis > Compare places: two places side by side under one focusing issue and income level. A header with the two
// pickers and the focus, two independent maps colored by the suggested type, then three blocks: the real measures,
// what each place would get, and (folded) the scoring detail behind "Why they differ".
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  rankedTracts,
  scoring,
  tractById,
  tractLabel,
  tractSubLabel,
  typologyById,
} from "../lib/data";
import {
  compareTakeaway,
  stabilityFor,
  tLabel,
  useAllResults,
  type TractResult,
} from "../lib/derived";
import { TYPOLOGY_COLORS, type MapPaint } from "../lib/paint";
import { matchPreset, useApp } from "../lib/store";
import { cx, fmtInt } from "../lib/format";
import {
  compareMessage,
  compareState,
  factorDeltasSafe,
} from "../lib/analysis/compare";
import {
  guardChips,
  rationale,
  whySentence,
  type GuardChip,
  type Rationale,
} from "../lib/analysis/rationale";
import { stabilityBand, stabilityText } from "../lib/analysis/stability";
import { APP_STANCES } from "../lib/analysis/copy";
import { hasPlaceData, hud as hudTable, placeById } from "../lib/place/data";
import { LEVEL_LABEL, PLAN_LEVELS, type PlanLevel } from "../lib/place/plan";
import { usePlan } from "../lib/place/planStore";
import type { Recommendation } from "../lib/place/recommend";
import { suggestAll } from "../lib/place/suggest";
import { whyTheyDiffer } from "../lib/place/whyDiffer";
import type { Stance, Typology } from "../lib/place/types";
import type { Stability } from "../lib/scoring";
import type { TractProps } from "../lib/types";
import TractSearch from "./TractSearch";
import SyncedMapPair from "./SyncedMapPair";
import TypologyRankList from "./TypologyRankList";
import FactorDeltaBars from "./FactorDeltaBars";
import PanelTitle from "./analysis/PanelTitle";
import FocusSegmented, { focusLabel } from "./compare/FocusSegmented";
import SuggestLegendBar from "./compare/SuggestLegendBar";
import { StepLabel, ToolSeg } from "./compare/ToolbarParts";
import {
  AtAGlance,
  SectionHead,
  WhatEachGets,
  WhyParagraphs,
  glanceRows,
  type SideInfo,
} from "./compare/CompareBlocks";
import ExportMenu from "./export/ExportMenu";
import {
  buildCompareReport,
  GLANCE_COLUMNS,
  glanceCsvRows,
  type CompareReportInput,
} from "../lib/export/builders/compare";
import { downloadCsv, exportFilename, toCsv } from "../lib/export/csv";
import { getMap, registerMap } from "../lib/export/mapRegistry";
import { mapSnapshot, printReport } from "../lib/export/report";
import { fLabel } from "../lib/derived";
import { pctShort } from "../lib/copy";
import { Chevron, Dot, Segmented } from "./primitives";

export const COLOR_A = "#7c3aed";
export const COLOR_B = "#0f766e";

export function MapChip({
  tag,
  color,
  title,
  sub,
  className = "left-2.5 top-2.5",
}: {
  tag: string;
  color: string;
  title: string;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "pointer-events-none absolute z-10 flex items-center gap-2 rounded-xl bg-white/95 py-1.5 pl-1.5 pr-3 shadow-lg ring-1 ring-black/5 backdrop-blur",
        className,
      )}
    >
      <span
        className="grid h-6 w-6 place-items-center rounded-lg text-small font-bold text-white"
        style={{ background: color }}
      >
        {tag}
      </span>
      <div className="leading-tight">
        <div className="text-small font-semibold text-slate-900">{title}</div>
        {sub && <div className="text-caption text-slate-700">{sub}</div>}
      </div>
    </div>
  );
}

const CHIP_TONE: Record<GuardChip["tone"], string> = {
  neutral: "text-slate-600",
  warn: "text-amber-800",
  alert: "text-rose-700",
  tie: "text-slate-900 font-medium",
};

/** The three guard chips (factors scored, low-income renter count, lead) as one small row. */
function ChipRow({ chips }: { chips: GuardChip[] }) {
  if (!chips.length) return null;
  return (
    <ul
      className="flex flex-wrap gap-x-3 gap-y-0.5"
      aria-label="Checks on this ranking"
    >
      {chips.map((c) => (
        <li
          key={c.id}
          className={cx("text-caption", CHIP_TONE[c.tone])}
          title={c.detail}
        >
          {c.text}
        </li>
      ))}
    </ul>
  );
}

const BAND_TONE = {
  solid: "text-emerald-800",
  likely: "text-amber-800",
  close: "text-rose-700",
};

/** Strips the score parentheticals a shared sentence may carry: "(70/100)", "(70 vs 65)". */
export const wordsOnly = (s: string) =>
  s.replace(/ \((?:\d+\/100|\d+ vs \d+)\)/g, "");

/** The stability sentence for one side, or nothing on a tie, with zero draws or when the sampled top is not the pick. */
function StabilityLine({ s, ra }: { s: Stability | null; ra: Rationale }) {
  const band = stabilityBand(s, ra);
  const text = stabilityText(band);
  if (!text) return null;
  return <p className={cx("text-caption", BAND_TONE[band.band])}>{text}</p>;
}

/** One side's column under the maps: its ranking, the guard chips and the stability line; or why it has no ranking. */
function Side({
  tag,
  color,
  t,
  r,
  ra,
  s,
  idPrefix,
}: {
  tag: "A" | "B";
  color: string;
  t: TractProps | null;
  r: TractResult | null;
  ra: Rationale | null;
  s: Stability | null;
  idPrefix: string;
}) {
  return (
    <div>
      <PanelTitle
        right={
          <span
            className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-caption font-bold text-white"
            style={{ background: color }}
          >
            {tag}
          </span>
        }
      >
        {tractLabel(t)}
      </PanelTitle>
      {r && r.top && ra ? (
        <>
          <TypologyRankList result={r} compact idPrefix={idPrefix} />
          <div className="mt-2 space-y-1.5">
            <ChipRow chips={guardChips(ra)} />
            <StabilityLine s={s} ra={ra} />
          </div>
        </>
      ) : t && ra ? (
        <p className="text-caption text-slate-600">{whySentence(t, ra)}</p>
      ) : null}
    </div>
  );
}

const STANCE_IDS: readonly string[] = (
  APP_STANCES as readonly string[]
).includes("climate_resilient")
  ? APP_STANCES
  : [...APP_STANCES, "climate_resilient"];
const isStance = (s: string | null): s is Stance =>
  !!s && STANCE_IDS.includes(s);
const TYPOLOGY_INDEX = new Map(scoring.typologies.map((t, i) => [t.id, i]));

function SuggestTip({
  id,
  rec,
}: {
  id: string;
  rec: Recommendation | null | undefined;
}) {
  const t = tractById.get(id);
  if (!t) return null;
  const lead = rec?.types[0]?.typology ?? null;
  return (
    <div className="max-w-64">
      <div className="font-semibold">{tractLabel(t)}</div>
      <div className="text-caption text-white/75">{tractSubLabel(t)}</div>
      {!t.residential ? (
        <div className="mt-1 text-white/80">
          Not ranked (
          {typeof t.households === "number"
            ? `${fmtInt(t.households)} households, `
            : ""}
          fewer than 25)
        </div>
      ) : lead ? (
        <div className="mt-1 flex items-center gap-1.5">
          <Dot color={typologyById.get(lead)?.color ?? "#999"} size={9} />
          <span>
            Suggested: <b>{typologyById.get(lead)?.label ?? lead}</b>
          </span>
        </div>
      ) : (
        <div className="mt-1 text-white/80">
          {rec ? "No suggestion at this level" : "No place data"}
        </div>
      )}
      <div className="mt-1 text-caption text-white/70">
        Click to put it on this side
      </div>
    </div>
  );
}

const SwapIcon = () => (
  <svg
    viewBox="0 0 20 20"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M4 7h11l-3-3M16 13H5l3 3" />
  </svg>
);

export default function CompareTractsView({
  active = true,
}: {
  active?: boolean;
}) {
  const a = useApp((s) => s.selectedId);
  const b = useApp((s) => s.compareId);
  const weights = useApp((s) => s.weights);
  const pin = useApp((s) => s.pin);
  const lite = useApp((s) => s.lite);
  const { set, applyPreset } = useApp.getState();
  const plan = usePlan();
  const results = useAllResults(weights);

  // The focusing issue, as on the Place tab: the stance the weights match, else the last one picked. Equal weights
  // are not a stance, so arriving on them applies the current focus once.
  const preset = matchPreset(weights);
  useEffect(() => {
    if (preset === "balanced")
      useApp.getState().applyPreset(usePlan.getState().focus);
    else if (isStance(preset) && preset !== usePlan.getState().focus)
      usePlan.getState().setPlan({ focus: preset });
  }, [preset]);
  const focus: Stance = isStance(preset) ? preset : plan.focus;
  const pickFocus = (s: Stance) => {
    plan.setPlan({ focus: s });
    applyPreset(s);
  };

  // The suggested type everywhere (the Place tab's recommend(), same inputs); the fit order only orders inside the set.
  const fitOrders = useMemo(
    () => new Map([...results].map(([id, r]) => [id, r.ranking as Typology[]])),
    [results],
  );
  const suggestions = useMemo(() => {
    if (!hasPlaceData || !hudTable) return new Map<string, Recommendation>();
    try {
      return suggestAll(placeById, hudTable, focus, plan, fitOrders);
    } catch (e) {
      console.warn("[compare] suggestions failed for", focus, e);
      return new Map<string, Recommendation>();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    focus,
    plan.level,
    plan.size,
    plan.age,
    plan.flood,
    plan.transitMi,
    fitOrders,
  ]);
  const { paint, counts } = useMemo(() => {
    const values = new Map<string, number | null>();
    const counts: Record<string, number> = { none: 0 };
    for (const t of rankedTracts) {
      const lead = suggestions.get(t.GEOID)?.types[0]?.typology ?? null;
      values.set(t.GEOID, lead ? (TYPOLOGY_INDEX.get(lead) ?? null) : null);
      counts[lead ?? "none"] = (counts[lead ?? "none"] ?? 0) + 1;
    }
    return {
      paint: { kind: "cat", palette: TYPOLOGY_COLORS, values } as MapPaint,
      counts,
    };
  }, [suggestions]);

  const ta = a ? (tractById.get(a) ?? null) : null;
  const tb = b ? (tractById.get(b) ?? null) : null;
  const ra = a ? (results.get(a) ?? null) : null;
  const rb = b ? (results.get(b) ?? null) : null;
  const recA = a ? (suggestions.get(a) ?? null) : null;
  const recB = b ? (suggestions.get(b) ?? null) : null;
  const raA = useMemo(
    () => (ta && ra ? rationale(ta, ra, weights) : null),
    [ta, ra, weights],
  );
  const raB = useMemo(
    () => (tb && rb ? rationale(tb, rb, weights) : null),
    [tb, rb, weights],
  );
  const state = compareState(ta, tb, ra, rb, weights);
  const message = compareMessage(state, ta, tb);
  const pair = useMemo(
    () => (state === "ok" && ta && tb && ra && rb ? { ta, tb, ra, rb } : null),
    [state, ta, tb, ra, rb],
  );
  const ok = !!pair;

  const topA = ra?.top ?? null,
    topB = rb?.top ?? null;
  const [basisChoice, setBasisChoice] = useState<string | null>(null);
  const basis =
    ok && basisChoice && (basisChoice === topA || basisChoice === topB)
      ? basisChoice
      : (topA ?? topB);
  const rows = useMemo(
    () =>
      pair
        ? factorDeltasSafe(
            pair.ta,
            pair.tb,
            pair.ra,
            pair.rb,
            basis ?? undefined,
          )
        : [],
    [pair, basis],
  );
  const takeaway = wordsOnly(
    message ??
      (pair
        ? compareTakeaway(pair.ta, pair.tb, pair.ra, pair.rb)
        : compareMessage("need_two", ta, tb)!),
  );
  const why = useMemo(
    () =>
      ta && tb
        ? whyTheyDiffer(
            {
              name: tractLabel(ta),
              p: placeById.get(ta.GEOID) ?? null,
              rec: recA,
            },
            {
              name: tractLabel(tb),
              p: placeById.get(tb.GEOID) ?? null,
              rec: recB,
            },
            plan.level as PlanLevel,
          )
        : [],
    [ta, tb, recA, recB, plan.level],
  );
  const [detail, setDetail] = useState(false);
  // Each map is controlled on its own unless the reader turns "Sync maps" on (zoom only; remembered in this browser).
  const [mapSync, setMapSync] = useState<boolean>(() => {
    try {
      return localStorage.getItem("visionpitts.compare.mapSync") === "1";
    } catch {
      return false;
    }
  });
  const toggleMapSync = () =>
    setMapSync((v) => {
      try {
        localStorage.setItem("visionpitts.compare.mapSync", v ? "0" : "1");
      } catch {
        /* storage blocked: the toggle still works for this visit */
      }
      return !v;
    });
  const sa = useMemo(
    () => (a && detail ? stabilityFor(a, weights) : null),
    [a, weights, detail],
  );
  const sb = useMemo(
    () => (b && detail ? stabilityFor(b, weights) : null),
    [b, weights, detail],
  );
  const basisLabel = tLabel(basis);
  const level = plan.level as PlanLevel;

  const A: SideInfo = {
    tag: "A",
    color: COLOR_A,
    t: ta,
    p: a ? (placeById.get(a) ?? null) : null,
    rec: recA,
  };
  const B: SideInfo = {
    tag: "B",
    color: COLOR_B,
    t: tb,
    p: b ? (placeById.get(b) ?? null) : null,
    rec: recB,
  };
  const chipSub = (t: TractProps | null, rec: Recommendation | null) => {
    if (!t) return "Choose a place above";
    const lead = rec?.types[0]?.typology ?? null;
    if (!lead)
      return !t.residential
        ? "Not ranked (fewer than 25 households)"
        : "No suggestion at this level";
    return (
      <span className="inline-flex items-center gap-1">
        <Dot color={typologyById.get(lead)?.color ?? "#64748b"} size={8} />
        Suggested: {typologyById.get(lead)?.label ?? lead}
      </span>
    );
  };
  const noneLabel =
    focus === "market_led"
      ? "the market test fails or cannot run"
      : focus === "transit_first"
        ? "no under-served renters at this level, or frequent transit too far"
        : "no under-served renters at this level";
  const tipOf = (id: string) => (
    <SuggestTip id={id} rec={suggestions.get(id)} />
  );
  const leadColor = (rec: Recommendation | null) =>
    rec?.types[0]
      ? (typologyById.get(rec.types[0].typology)?.color ?? null)
      : null;

  // Export: the comparison report (PDF via print) and the At-a-glance rows as CSV.
  const exportInput = (): CompareReportInput | null => {
    if (!ta || !tb) return null;
    const g = glanceRows(A.p, B.p, hudTable, level);
    const subsidyShort = (x: number) =>
      x >= 0.75
        ? "fully eligible"
        : x >= 0.25
          ? "partly eligible"
          : "not eligible";
    const val = (x: number | null, f: string) =>
      x == null
        ? "no data"
        : f === "subsidy_eligible"
          ? subsidyShort(x)
          : pctShort(x);
    return {
      a: { name: tractLabel(ta), sub: ta.name, geoid: ta.GEOID, rec: recA },
      b: { name: tractLabel(tb), sub: tb.name, geoid: tb.GEOID, rec: recB },
      focus,
      level,
      glance: g.rows,
      fits: g.fits ? { rent: g.fits.rent, formula: g.fits.formula } : null,
      ami: g.ami,
      takeaway: ok ? `On the scoring ranks: ${takeaway}` : takeaway,
      why,
      basis: ok ? basisLabel : null,
      factors: pair
        ? rows.map((r) => ({
            label: fLabel(r.factor),
            a: val(r.a, r.factor),
            b: val(r.b, r.factor),
            favors:
              r.gap == null || Math.abs(r.gap) < 0.002
                ? null
                : r.gap > 0
                  ? ("A" as const)
                  : ("B" as const),
          }))
        : [],
      typeLabel: (k) => typologyById.get(k)?.label ?? k,
    };
  };
  const exportSlug = ta && tb ? `${tractLabel(ta)} vs ${tractLabel(tb)}` : "";

  return (
    <MotionConfig reducedMotion={!active || lite ? "always" : "user"}>
      <div className="flex h-full flex-col bg-[#fbfaf8] pt-[96px]">
        <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto">
          <div className="w-full px-4 pb-12 pt-3 sm:px-5">
            <header className="mb-3">
              <h1 className="font-display text-title font-bold text-slate-900">
                Compare places
              </h1>
              <p className="text-small text-slate-600">
                Two places side by side: the same measures, the same focus, what
                differs.
              </p>
              <div
                className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-stone-200/80"
                data-tour="compare"
                aria-label="Compare settings"
              >
                <div className="min-w-0 flex-1 basis-[520px]">
                  <StepLabel n={1}>Places</StepLabel>
                  <div className="flex items-center gap-1.5">
                    <div className="min-w-0 max-w-[440px] flex-1">
                      <TractSearch
                        dense
                        value={a}
                        onChange={(id) => set({ selectedId: id })}
                        tag="A"
                        tagColor={COLOR_A}
                        showQuickPicks={false}
                        exclude={b}
                        label="Place A"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => set({ selectedId: b, compareId: a })}
                      title="Swap A and B"
                      aria-label="Swap A and B"
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-slate-600 ring-1 ring-stone-300 hover:bg-stone-50 hover:text-slate-900"
                    >
                      <SwapIcon />
                    </button>
                    <div className="min-w-0 max-w-[440px] flex-1">
                      <TractSearch
                        dense
                        value={b}
                        onChange={(id) => set({ compareId: id })}
                        tag="B"
                        tagColor={COLOR_B}
                        showQuickPicks={false}
                        exclude={a}
                        label="Place B"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <StepLabel n={2}>Focus</StepLabel>
                  <FocusSegmented value={focus} onChange={pickFocus} />
                </div>
                <div>
                  <StepLabel n={3}>Income</StepLabel>
                  <ToolSeg
                    label="Income level"
                    value={String(level)}
                    onChange={(v) =>
                      plan.setPlan({
                        level: (v === "market" ? v : Number(v)) as PlanLevel,
                      })
                    }
                    options={PLAN_LEVELS.map((l) => ({
                      value: String(l),
                      label: l === "market" ? "Market" : `≤${l}%`,
                      title: `${LEVEL_LABEL[l]} (shared with the Place tab)`,
                    }))}
                  />
                </div>
                <div className="ml-auto self-end pb-1">
                  <ExportMenu
                    size="md"
                    items={[
                      {
                        label: "Report (PDF)",
                        hint:
                          ta && tb
                            ? "Both places, the tables and both maps"
                            : "Choose two places first",
                        disabled: !ta || !tb,
                        onSelect: async () => {
                          const input = exportInput();
                          if (!input) return;
                          const crop = { top: 0, bottom: 0, left: 0, right: 0 };
                          const mapA = await mapSnapshot(getMap("compare-a"), {
                            crop,
                          });
                          const mapB = await mapSnapshot(getMap("compare-b"), {
                            crop,
                          });
                          printReport(
                            buildCompareReport({
                              ...input,
                              maps: { a: mapA, b: mapB },
                              filename: exportFilename(
                                "comparison",
                                exportSlug,
                                "pdf",
                              ),
                            }),
                          );
                        },
                      },
                      {
                        label: "Data (CSV)",
                        hint:
                          ta && tb
                            ? "At-a-glance rows, A and B columns"
                            : "Choose two places first",
                        disabled: !ta || !tb,
                        onSelect: () => {
                          const input = exportInput();
                          if (!input) return;
                          downloadCsv(
                            exportFilename("comparison", exportSlug, "csv"),
                            toCsv(glanceCsvRows(input), GLANCE_COLUMNS),
                          );
                        },
                      },
                    ]}
                  />
                </div>
              </div>
            </header>

            {message && (
              <p
                className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-small text-amber-900 ring-1 ring-amber-200"
                role="status"
              >
                {message}
              </p>
            )}

            <div className="relative h-[62vh] min-h-[400px]">
              <SyncedMapPair
                syncZoom={mapSync}
                className="relative grid h-full grid-cols-2 gap-3"
                a={{
                  paint,
                  selectedId: a,
                  pin,
                  buildingColor: leadColor(recA),
                  tooltip: tipOf,
                  onSelect: (id) => set({ selectedId: id }),
                  onMapReady: registerMap("compare-a"),
                  overlay: (
                    <MapChip
                      tag="A"
                      color={COLOR_A}
                      title={ta ? tractLabel(ta) : "Place A"}
                      sub={chipSub(ta, recA)}
                    />
                  ),
                }}
                b={{
                  paint,
                  selectedId: b,
                  pin,
                  buildingColor: leadColor(recB),
                  tooltip: tipOf,
                  onSelect: (id) => set({ compareId: id }),
                  onMapReady: registerMap("compare-b"),
                  overlay: (
                    <MapChip
                      tag="B"
                      color={COLOR_B}
                      title={tb ? tractLabel(tb) : "Place B"}
                      sub={chipSub(tb, recB)}
                    />
                  ),
                }}
              />
            </div>
            <div className="mt-2">
              <SuggestLegendBar
                lead={
                  <button
                    type="button"
                    role="switch"
                    aria-checked={mapSync}
                    onClick={toggleMapSync}
                    title="On: zooming one map zooms the other. Each map still pans on its own."
                    className={cx(
                      "inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 ring-1 transition-colors",
                      mapSync
                        ? "bg-slate-900 text-white ring-slate-900"
                        : "bg-white text-slate-700 ring-stone-300 hover:ring-slate-400",
                    )}
                  >
                    <span
                      className={cx(
                        "relative h-3.5 w-6 rounded-full transition-colors",
                        mapSync ? "bg-white/30" : "bg-stone-200",
                      )}
                    >
                      <span
                        className={cx(
                          "absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-all",
                          mapSync ? "left-3" : "left-0.5",
                        )}
                      />
                    </span>
                    Sync maps
                  </button>
                }
                focus={focusLabel(focus)}
                level={LEVEL_LABEL[level]}
                counts={counts}
                noneLabel={noneLabel}
              />
            </div>

            {/* The information under the maps: At a glance on the left; what each place would get and why they
                differ on the right (stacked below 1440 px). Hairline rules and whitespace separate sections. */}
            <div className="mt-6 grid gap-x-8 gap-y-6 border-t border-stone-200/80 pt-5 min-[1440px]:grid-cols-[minmax(0,55fr)_minmax(0,45fr)]">
              {(ta || tb) && (
                <section className="min-w-0" aria-label="At a glance">
                  <SectionHead
                    n={1}
                    title="At a glance"
                    sub="Real values for each place, same definitions on both sides."
                  />
                  <AtAGlance A={A} B={B} hud={hudTable} level={level} />
                </section>
              )}

              <div className="flex min-w-0 flex-col gap-6 min-[1440px]:border-l min-[1440px]:border-stone-200/80 min-[1440px]:pl-8">
                {(ta || tb) && (
                  <section
                    className="border-t border-stone-200/80 pt-5 min-[1440px]:border-t-0 min-[1440px]:pt-0"
                    aria-label="What each place would get"
                  >
                    <SectionHead
                      n={2}
                      title="What each place would get"
                      sub={`The Place tab's suggestion under ${focusLabel(focus)} at ${LEVEL_LABEL[level]}.`}
                    />
                    <WhatEachGets A={A} B={B} level={level} stance={focus} />
                  </section>
                )}

                <section
                  className={cx(
                    "flex min-h-0 flex-col min-[1440px]:flex-1",
                    (ta || tb) && "border-t border-stone-200/80 pt-5",
                  )}
                  aria-label="Why they differ"
                >
                  <SectionHead
                    n={3}
                    title="Why they differ"
                    sub="The rules behind each suggestion, read side by side. Scroll for more."
                    right={
                      <button
                        type="button"
                        onClick={() => setDetail(!detail)}
                        aria-expanded={detail}
                        className="inline-flex items-center gap-0.5 pt-0.5 text-caption text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900 hover:decoration-slate-500"
                      >
                        Scoring detail
                        <Chevron
                          className={cx(
                            "h-3.5 w-3.5 transition-transform",
                            detail && "rotate-180",
                          )}
                        />
                      </button>
                    }
                  />
                  <WhyParagraphs
                    A={A}
                    B={B}
                    rows={ta && tb ? why : []}
                    closing={
                      <>
                        {ok && (
                          <span className="text-slate-500">
                            On the scoring ranks:{" "}
                          </span>
                        )}
                        {takeaway}
                      </>
                    }
                  />
                </section>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {detail && (
                <motion.section
                  key="detail"
                  aria-label="Scoring detail"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-6 grid grid-cols-[1fr_1.35fr_1fr] gap-8 border-t border-stone-200/80 pt-5">
                    <Side
                      tag="A"
                      color={COLOR_A}
                      t={ta}
                      r={ra}
                      ra={raA}
                      s={sa}
                      idPrefix="ra"
                    />
                    <div>
                      <PanelTitle
                        sub={
                          ok
                            ? `For the ${basisLabel} match in both places`
                            : undefined
                        }
                        right={
                          ok && topA && topB && topA !== topB ? (
                            <Segmented
                              size="xs"
                              label="Which housing type to compare"
                              value={basis}
                              onChange={setBasisChoice}
                              options={[topA, topB].map((k) => ({
                                value: k,
                                label: (
                                  <span className="inline-flex items-center gap-1">
                                    <Dot
                                      color={
                                        typologyById.get(k)?.color ?? "#64748b"
                                      }
                                      size={7}
                                    />
                                    {tLabel(k)}
                                  </span>
                                ),
                              }))}
                            />
                          ) : undefined
                        }
                      >
                        Factor by factor
                      </PanelTitle>
                      {pair && rows.length ? (
                        <FactorDeltaBars
                          rows={rows}
                          ta={pair.ta}
                          tb={pair.tb}
                          colorA={COLOR_A}
                          colorB={COLOR_B}
                          labelA={tractLabel(ta)}
                          labelB={tractLabel(tb)}
                          typology={basisLabel}
                        />
                      ) : (
                        <p className="text-caption text-slate-600">
                          {message ?? compareMessage("need_two", ta, tb)}
                        </p>
                      )}
                    </div>
                    <Side
                      tag="B"
                      color={COLOR_B}
                      t={tb}
                      r={rb}
                      ra={raB}
                      s={sb}
                      idPrefix="rb"
                    />
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
