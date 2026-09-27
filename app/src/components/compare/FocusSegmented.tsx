// The focusing issue as one compact 40 px segmented control (Compare places toolbar, short labels only). The stances come from APP_STANCES
// (lib/analysis/copy), their label and line from place/FocusPicker when it lists them; picking one applies the same
// published preset. No Balanced / equal-weights option.
import { APP_STANCES } from "../../lib/analysis/copy";
import type { Stance } from "../../lib/place/types";
import { FOCUS } from "../place/FocusPicker";
import { ToolSeg } from "./ToolbarParts";

const FALLBACK: Record<string, { label: string; line: string }> = {
  anti_displacement: {
    label: "Anti-displacement",
    line: "Keep current renters housed",
  },
  market_led: { label: "Market-led", line: "Build what the market supports" },
  transit_first: {
    label: "Transit-first",
    line: "Homes near frequent transit",
  },
  climate_resilient: {
    label: "Climate-resilient",
    line: "Out of flood zones, near transit",
  },
};

export const focusLabel = (id: string): string =>
  FOCUS.find((f) => f.id === id)?.label ?? FALLBACK[id]?.label ?? id;

/** Short toolbar labels (the full label and line stay in the tooltip). */
const SHORT: Record<string, string> = { climate_resilient: "Climate" };

export default function FocusSegmented({
  value,
  onChange,
}: {
  value: Stance;
  onChange: (s: Stance) => void;
}) {
  const ids = (APP_STANCES as readonly string[]).includes("climate_resilient")
    ? [...APP_STANCES]
    : [...APP_STANCES, "climate_resilient"];
  const options = ids.map((id) => {
    const f = FOCUS.find((x) => x.id === id);
    const label = f?.label ?? FALLBACK[id]?.label ?? id;
    return {
      value: id as Stance,
      label: SHORT[id] ?? label,
      title: `${label}: ${f?.line ?? FALLBACK[id]?.line ?? ""}`,
    };
  });
  return (
    <ToolSeg
      label="Focusing issue"
      value={value}
      options={options}
      onChange={onChange}
    />
  );
}
