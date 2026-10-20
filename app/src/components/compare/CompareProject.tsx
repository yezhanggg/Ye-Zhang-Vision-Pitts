// Compare places, section 4: the project tested on the Place tab, in both places side by side. The same homes, mix
// rule, financing and inputs (lib/project, lib/lihtc entries), read through the same model as the Place tab's project
// card, so a change on either tab shows on both. With separate settings (lib/compare/store) side B reads its own
// copy (lib/project/side). Loaded on demand and left out of the offline single file.
import type { ReactNode } from "react";
import { cx } from "../../lib/format";
import { hud } from "../../lib/place/data";
import { capitalize, fmtCount, fmtShare, isNum } from "../../lib/place/format";
import { LEVEL_LABEL } from "../../lib/place/plan";
import { SIDE_A, type Side } from "../../lib/project/side";
import { TYPOLOGY_LABEL } from "../../lib/place/thresholds";
import { SIGNAL_SHORT } from "../../lib/demand/signals";
import type { ShareKey } from "../../lib/demand/types";
import { STANDARD_BY_CODE } from "../../lib/zoning/capacity";
import { statusFor } from "../place/project/TryLot";
import {
  buildHeadline,
  mixWords,
  needHeadline,
  pencilHeadline,
  scoreHeadline,
  usd,
  type Headline,
} from "../place/project/summary";
import {
  useProjectModel,
  type ProjectModel,
} from "../place/project/useProjectModel";
import { PlaceHead, SectionHead, type SideInfo } from "./CompareBlocks";

const FINANCING = { nine: "9% tax credits", four: "4% credits + bonds", market: "market rate" } as const;
const TONE = { good: "text-emerald-700", bad: "text-rose-700", plain: "text-slate-900" } as const;
const GRID = "grid grid-cols-[104px_minmax(0,1fr)_minmax(0,1fr)] gap-x-4";

type Cell = ReactNode;
interface RowDef {
  label: string;
  a: Cell;
  b: Cell;
  title?: string;
}

const Head = ({ h }: { h: Headline | null }) =>
  h ? <span className={cx("font-semibold tnum", TONE[h.tone])}>{h.value}</span> : <span className="text-slate-400">—</span>;

function share(m: ProjectModel | null, key: ShareKey): Cell {
  const s = m?.signals.find((x) => x.key === key);
  if (!s?.tract || !isNum(s.tract[0])) return <span className="text-slate-400">n/a</span>;
  return (
    <span className={cx("tnum", s.dir && s.from === "tract" && "font-semibold text-violet-800")}>
      {fmtShare(s.tract[0])}
      {isNum(s.tract[1]) && <span className="text-caption font-normal text-slate-500"> ±{Math.round(s.tract[1] * 100)}</span>}
      {s.dir && s.from === "tract" && (s.dir === "up" ? " ↑" : " ↓")}
    </span>
  );
}

/** Lots in the place's districts that allow the suggested type by right. */
function leadByRight(m: ProjectModel | null, side: SideInfo): Cell {
  const lead = side.rec?.lead;
  if (!m?.cap || !lead) return <span className="text-slate-400">—</span>;
  if (lead === "adu") return "ADU overlay only (none mapped)";
  const entries = Object.entries(m.cap.districts);
  const yes = entries.filter(([c]) => STANDARD_BY_CODE.has(c) && statusFor(c, lead).tone === "yes").reduce((s, [, n]) => s + n, 0);
  const all = entries.reduce((s, [, n]) => s + n, 0);
  return `${capitalize(TYPOLOGY_LABEL[lead])}: ${fmtCount(yes)} of ${fmtCount(all)} lots`;
}

function feasibility(m: ProjectModel | null): Cell {
  if (!m) return <span className="text-slate-400">—</span>;
  if (m.branch === "market") return <span className="text-slate-500">n/a (market rate)</span>;
  const c = m.result.checks.find((x) => /feasibility/i.test(x.label));
  if (!c || c.ok == null) return <span className="text-slate-500">n/a</span>;
  return <span className={c.ok ? "text-emerald-700" : "text-rose-700"}>{c.ok ? "✓ passes" : "✗ fails"}</span>;
}

function Block({ n, title, A, B, rows }: { n: number; title: string; A: SideInfo; B: SideInfo; rows: RowDef[] }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-small font-semibold text-slate-900">
        <span className="mr-1 font-normal text-slate-400 tnum">{n}</span>
        {title}
      </div>
      <div className={cx(GRID, "items-end")}>
        <div />
        <PlaceHead s={A} align="left" />
        <PlaceHead s={B} align="left" />
      </div>
      <div className="divide-y divide-stone-200/70 border-b border-stone-200/70">
        {rows.map((r) => (
          <div key={r.label} className={cx(GRID, "min-h-[30px] py-1.5")} title={r.title}>
            <div className="text-small leading-snug text-slate-600">{r.label}</div>
            <div className="min-w-0 text-small leading-snug text-slate-900">{r.a}</div>
            <div className="min-w-0 text-small leading-snug text-slate-900">{r.b}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CompareProject({ A, B, sideA = SIDE_A, sideB = SIDE_A, stacked = false }: { A: SideInfo; B: SideInfo; sideA?: Side; sideB?: Side; /** One block under another (the results panel), not two columns. */ stacked?: boolean }) {
  const ma = useProjectModel(A.t?.GEOID, A.p, hud, sideA);
  const mb = useProjectModel(B.t?.GEOID, B.p, hud, sideB);
  const level = sideA.plan((s) => s.level);
  const own = sideB !== sideA;
  if (!ma && !mb) return null;
  const any = (ma ?? mb)!;
  const both = (f: (m: ProjectModel, s: SideInfo) => Cell): [Cell, Cell] => [ma ? f(ma, A) : "—", mb ? f(mb, B) : "—"];
  const head = (f: (m: ProjectModel, s: SideInfo) => Headline): [Cell, Cell] => [<Head h={ma ? f(ma, A) : null} />, <Head h={mb ? f(mb, B) : null} />];
  const leadOf = (s: SideInfo) => (s.rec?.lead ? capitalize(TYPOLOGY_LABEL[s.rec.lead]) : null);
  const row = (label: string, [a, b]: [Cell, Cell], title?: string): RowDef => ({ label, a, b, title });

  const words = (m: ProjectModel) => `${m.mix.homes} homes${m.mix.mode === "mine" ? " (own mix)" : ""}, ${FINANCING[m.branch]}`;
  const homes = any.mix.mode === "mine" ? `your own mix of ${any.mix.homes} homes` : `${any.mix.homes} homes at ${LEVEL_LABEL[level]}${any.mix.example ? " (example)" : ""}, split like each place's renters`;

  return (
    <section className="mt-6 border-t border-stone-200/80 pt-5" aria-label="Your project in each place" data-compare-project>
      <SectionHead
        n={4}
        title="Your project in each place"
        sub={
          own
            ? `Each side's own project: A ${ma ? words(ma) : "—"}; B ${mb ? words(mb) : "—"}. Change them under each map.`
            : `The Place tab's project, tested in both places: ${homes}, ${FINANCING[any.branch]}. Change it under map A or on the Place tab; both follow.`
        }
      />
      <div className={cx("grid gap-x-8 gap-y-6", !stacked && "sm:grid-cols-2")}>
        <Block
          n={1}
          title="Who needs it"
          A={A}
          B={B}
          rows={[
            row("Demand puts first", both((m, s) => needHeadline(m, leadOf(s)).value)),
            row(SIGNAL_SHORT.renter, [share(ma, "renter"), share(mb, "renter")], "Tract share with its 90% margin of error; bold with an arrow when it differs from the city by more than its mark and its margin"),
            row(SIGNAL_SHORT.one_person, [share(ma, "one_person"), share(mb, "one_person")]),
            row("Unit mix", both((m) => mixWords(m.mix))),
          ]}
        />
        <Block
          n={2}
          title="What can be built"
          A={A}
          B={B}
          rows={[
            row("By right, vacant", head(buildHeadline), "An upper bound: slopes, rights of way, lots of record and parking are not checked"),
            row("On lived-in lots", both((m) => (m.cap ? `+${fmtCount(m.cap.gentle.homes)} homes` : "—"))),
            row("Type by right", both((m, s) => leadByRight(m, s))),
            row("Inclusionary", both((m) => ((m.cap?.izo_share ?? 0) >= 0.005 ? `${Math.round(m.cap!.izo_share! * 100)}% of the tract` : "none"))),
          ]}
        />
        <Block
          n={3}
          title="Tax credit score"
          A={A}
          B={B}
          rows={[
            row("Score", both((m) => {
              const h = scoreHeadline(m);
              return (
                <>
                  <Head h={h} /> <span className="text-caption text-slate-600">{m.sheet.score.short > 0 ? `${m.sheet.score.short} short` : m.sheet.score.threshold != null ? "meets minimum" : ""}</span>
                </>
              );
            })),
            row("From the place", both((m) => `${m.sheet.score.fromPlace}`)),
            row("Basis boost", both((m) => (m.qctOrDda ? "130% (QCT or DDA)" : "none"))),
            row("Credit homes, 1 mi", both((m) => (m.tract?.lihtc?.mile ? fmtCount(m.tract.lihtc.mile.li_units) : "n/a"))),
          ]}
        />
        <Block
          n={4}
          title="Does it pencil"
          A={A}
          B={B}
          rows={[
            ...(own ? [row("Financing", both((m) => FINANCING[m.branch]))] : []),
            row(any.branch === "market" ? "Yield on cost" : "Gap or surplus", head(pencilHeadline)),
            row("Cost a home", both((m) => (m.result.homes > 0 ? usd(m.result.tdc / m.result.homes) : "—"))),
            row(any.branch === "market" ? "Break-even rent" : "PHFA feasibility", any.branch === "market" ? both((m) => (m.result.market ? `${usd(m.result.market.breakEven.value)} a month` : "—")) : [feasibility(ma), feasibility(mb)]),
            row("Example inputs", both((m) => `${m.exampleCount} of ${Object.keys(m.kinds).length}`), "Inputs no public source gives for a site: replace them under Pencil inputs"),
          ]}
        />
      </div>
    </section>
  );
}
