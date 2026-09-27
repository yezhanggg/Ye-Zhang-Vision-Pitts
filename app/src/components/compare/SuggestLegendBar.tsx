// One shared, horizontal legend under the two Compare maps: each ranked tract is colored by the housing type the rules
// suggest under the current focusing issue and income level (the Place tab's map coloring).
import { scoring } from "../../lib/data";
import { NO_DATA } from "../../lib/mapStyle";
import type { ReactNode } from "react";
import { Dot } from "../primitives";

export default function SuggestLegendBar({
  focus,
  level,
  counts,
  noneLabel,
  lead,
}: {
  /** A control placed before "Map color" (the Sync maps switch on Compare places). */
  lead?: ReactNode;
  focus: string;
  level: string;
  counts: Record<string, number>;
  noneLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-white px-3 py-2 text-caption text-slate-700 ring-1 ring-stone-200/80">
      {lead}
      <span className="font-semibold text-slate-900">
        Map color: suggested type · {focus} · {level}
      </span>
      {scoring.typologies.map((t) => (
        <span key={t.id} className="inline-flex items-center gap-1.5">
          <Dot color={t.color} size={9} />
          {t.label}
          <span className="text-slate-400 tnum">{counts[t.id] ?? 0}</span>
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5" title={noneLabel}>
        <span
          className="h-2.5 w-3.5 rounded-sm ring-1 ring-stone-300"
          style={{ background: NO_DATA }}
        />
        No suggestion: rule not met{" "}
        <span className="text-slate-400 tnum">{counts.none ?? 0}</span>
      </span>
      {(counts.missing ?? 0) > 0 && (
        <span className="inline-flex items-center gap-1.5" title="The focus's test could not run because a value is missing (usually a reliable asking rent or home value).">
          <span className="h-2.5 w-3.5 rounded-sm ring-1 ring-stone-300 [background:repeating-linear-gradient(45deg,#e7e5e4_0_2px,#fafaf9_2px_4px)]" />
          data missing <span className="text-slate-400 tnum">{counts.missing}</span>
        </span>
      )}
      <span
        className="inline-flex items-center gap-1.5"
        title="Fewer than 25 households: not ranked"
      >
        <span
          className="h-2.5 w-3.5 rounded-sm"
          style={{ background: "#efede9" }}
        />
        Not ranked
      </span>
    </div>
  );
}
