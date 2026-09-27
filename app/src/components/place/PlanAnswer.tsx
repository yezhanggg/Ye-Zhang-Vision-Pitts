// The answer card on Analysis > Match (always open), kept short: the suggested type and home size, then at most four
// one-line rows with a bold number (rent that fits, who it serves, market, flood when it matters) and a one-line
// "You decide". The long sentences (why, caveats, not-served, homes needed) sit in the collapsed "How we got this".
// Everything is lib/place (recommend, plan); nothing here is a score.
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { typologyById } from "../../lib/data";
import { DECIDE } from "../../lib/place/copy";
import { limitFor } from "../../lib/place/afford";
import { bedroomsWord } from "../../lib/place/bands";
import { fmtDollars, fmtHouseholds, fmtPct100d1, isNum, roundHalfEven } from "../../lib/place/format";
import {
  AGE_LABEL,
  LEVEL_LABEL,
  PLAN_TYPE_LABEL,
  PLAN_TYPE_SHORT,
  TYPE_PERSONS,
  homesLines,
  levelPhrase,
  personsWord,
  sizeHomeWord,
  sizeWord,
  type FixedSize,
  type AgeGroup,
  type HouseholdSize,
  type PlanLevel,
} from "../../lib/place/plan";
import type { Recommendation } from "../../lib/place/recommend";
import { STANCE_LABEL, TYPOLOGY_LABEL } from "../../lib/place/thresholds";
import type { HudTable } from "../../lib/place/types";
import { UI } from "../../lib/copy";
import { Dot, readableColor } from "../primitives";

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 px-3 py-1.5">
      <dt className="w-24 shrink-0 text-caption font-semibold uppercase tracking-wide text-slate-500">{k}</dt>
      <dd className="min-w-0 flex-1 text-small leading-snug text-slate-800 tnum">{children}</dd>
    </div>
  );
}

const B = ({ children }: { children: ReactNode }) => <b className="font-semibold text-slate-900">{children}</b>;
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const levelShort = (l: PlanLevel) => (l === "market" ? ">80% AMI" : LEVEL_LABEL[l]);

/** A short reason (under ~15 words) for "No suggestion here"; the full sentence is in the fold. */
function shortWhy(rec: Recommendation, level: PlanLevel, marketRule: boolean): string {
  const f = rec.floodLimit;
  if (f?.blocked && f.pct != null) return `${fmtPct100d1(f.pct)} of the land is in a FEMA flood zone, above your ${f.limit}% limit.`;
  if (rec.stance === "climate_resilient" && rec.stanceTest.passed !== true && !marketRule) return `${rec.headline}.`;
  if (rec.stance === "transit_first" && rec.stanceTest.passed === false) {
    const d = rec.headline.match(/nearest frequent stop ([\d.]+ miles)/)?.[1];
    return d ? `Nearest frequent stop is ${d} away, beyond your distance.` : "Fails the transit test.";
  }
  // At market rate the reason may be the focus's own test (flood, transit, displacement), not the market test.
  if (marketRule && !/^(No unsubsidized|Market test incomplete)/.test(rec.headline)) return `${rec.headline}.`;
  if (marketRule) return rec.stanceTest.passed === null ? "Market test cannot run: asking rent or home value missing." : "Market test fails: the market does not pay for new homes here.";
  if (!rec.band.available) return `No renters ${levelPhrase(level)} here pay over 30% of income.`;
  if (!rec.tenants.available) return `CHAS counts no households of this size and age ${levelPhrase(level)}.`;
  return "The focus suggests no type here.";
}

export default function PlanAnswer({
  rec,
  hud,
  level,
  size,
  age,
  homes,
}: {
  rec: Recommendation;
  hud: HudTable;
  level: PlanLevel;
  size: HouseholdSize;
  age: AgeGroup;
  homes: number | null;
}) {
  const lead = rec.types[0] ?? null;
  const color = lead ? (typologyById.get(lead.typology)?.color ?? "#64748b") : "#94a3b8";
  const others = rec.types.slice(1);
  const atMarket = level === "market";
  const marketRule = rec.stance === "market_led" || atMarket;
  // Market-led at a HUD level: the product is market-rate, so the card shows its price and who that price serves,
  // not the HUD rent and the under-served tenants (those stay in the details as "not served").
  const marketLedView = rec.stance === "market_led" && !atMarket;
  // The price the rules wrote into the headline: "at the $1,895 asked for a 2-bedroom" or "at the $295,000 sale median".
  const productPrice = marketLedView && lead ? (rec.headline.match(/\) (at the .+?|at market (?:rents|prices));/)?.[1] ?? null) : null;
  const servesWords = marketLedView ? (rec.headline.split("; serves ")[1] ?? null) : null;
  const price = rec.price;
  const two = rec.twoBedroom;
  const m = rec.market;
  const mr = rec.marketRent;
  const flood = rec.floodLimit;
  const ageWord = age === "any" ? "" : age === "senior62" ? ", 62+" : ", under 62";
  // 'auto': the size this place's largest group sets (rec.household); explicit sizes pass through.
  const auto = size === "auto";
  const autoType = auto ? (rec.household?.type ?? null) : null;
  const eff: FixedSize = size === "auto" ? (rec.household?.size ?? 3) : size;
  const effPersons = autoType ? TYPE_PERSONS[autoType] : personsWord(eff);
  const whoShort = autoType ? `${PLAN_TYPE_SHORT[autoType]} (largest group)${ageWord}` : `${sizeWord(eff)} household${ageWord}`;
  const tenants = rec.tenants.types;
  const tenantTotal = tenants.reduce((a, t) => a + t.count, 0);
  const tenantWords = autoType ? PLAN_TYPE_LABEL[autoType] : tenants.length ? tenants.map((t) => PLAN_TYPE_SHORT[t.type]).join(" + ") : "households";
  const bare = !lead && !marketRule && !flood?.blocked && (!rec.band.available || !rec.tenants.available);
  // Market rate: 30% of the 80% AMI limit for this size is the least a household above 80% AMI can pay.
  const l80 = limitFor(hud, 80, Math.min(eff, 8));
  const floor80 = isNum(l80) ? roundHalfEven(l80 / 40) : null;
  const showFlood = !!flood && (flood.blocked || (flood.pct ?? 0) >= 1);
  const homesText =
    homes != null
      ? homesLines(
          homes,
          rec.tenants.available ? tenantTotal : isNum(rec.band.hh) ? 0 : null,
          `qualifying ${autoType ? PLAN_TYPE_LABEL[autoType] : `${sizeWord(eff)} households`}${age === "any" ? "" : age === "senior62" ? " 62 and older" : " under 62"} ${levelPhrase(level)}`,
          level,
          m.askingUsed,
          two?.rent ?? null,
        )
      : null;

  // The long form, for the fold: every sentence the rules wrote, plus the size rule and caveats.
  const details: string[] = [
    rec.band.reason,
    rec.tenants.sentence,
    atMarket
      ? `Rent: ${mr.words}. No HUD rent ceiling applies above 80% AMI; the market rent is the price.${floor80 != null && isNum(l80) ? ` A ${sizeWord(eff)} household above 80% AMI earns more than ${fmtDollars(l80)}, so 30% of income is more than ${fmtDollars(l80)} × 30% ÷ 12 = ${fmtDollars(floor80)} a month.` : ""}`
      : price
        ? `Rent that fits: ${fmtDollars(price.limit)} (the HUD ${price.pct}% AMI limit for a ${price.persons}-person household${eff === 5 ? "; 5+ uses the 5-person limit" : ""}${autoType === "small_family" ? "; small families are 2–4 people, priced at 3" : ""}) × 30% ÷ 12 = ${fmtDollars(price.rent)} a month, gross rent (utilities not known).`
        : "HUD income limits are not available.",
    atMarket ? "" : m.sentence,
    rec.stanceTest.sentence,
    flood ? `Flood: ${flood.sentence}` : "",
    rec.notServedWhy ? `Not served: ${rec.notServedWhy}.` : "",
    ...rec.not.map((n) => `Not ${TYPOLOGY_LABEL[n.typology]}: ${n.because}.`),
    ...(homesText ? [homesText.served, homesText.gap] : []),
    DECIDE,
  ].filter(Boolean);

  return (
    <div className="overflow-hidden rounded-2xl ring-1" style={{ background: `${color}12`, boxShadow: `inset 0 0 0 1px ${color}45` }}>
      <div className="px-4 pb-3 pt-3.5">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="text-small font-semibold text-slate-700">{UI.bestMatch}</div>
          <div className="text-caption text-slate-600">
            {STANCE_LABEL[rec.stance]} · {auto ? "largest group" : sizeWord(size)} · {AGE_LABEL[age].toLowerCase()} · {LEVEL_LABEL[level]}
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={`${lead?.typology ?? "none"}-${lead?.bedrooms ?? ""}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}>
            {lead ? (
              <>
                <div className="mt-0.5 font-display text-display font-bold leading-tight" style={{ color: readableColor(color) }}>
                  {typologyById.get(lead.typology)?.label ?? TYPOLOGY_LABEL[lead.typology]}
                </div>
                <div className="text-small text-slate-700">
                  {marketLedView
                    ? `${cap(bedroomsWord(lead.bedrooms).replace(/^a /, ""))}${lead.typology === "townhome" ? " for sale" : " homes"} · market rate`
                    : `${cap(sizeHomeWord(eff).replace(/^a /, ""))} homes · ${whoShort} · ${marketRule ? "market rent" : LEVEL_LABEL[level]}`}
                </div>
              </>
            ) : (
              <>
                <div className="mt-0.5 font-display text-title font-bold leading-tight text-slate-800">No suggestion here</div>
                <p className="mt-0.5 text-small leading-snug text-slate-700">{shortWhy(rec, level, marketRule)}</p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
        {others.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-caption text-slate-700">
            <span>Also fits:</span>
            {others.map((o) => (
              <span key={o.typology} className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 ring-1 ring-stone-200">
                <Dot color={typologyById.get(o.typology)?.color ?? "#999"} size={8} />
                {typologyById.get(o.typology)?.label ?? TYPOLOGY_LABEL[o.typology]}
              </span>
            ))}
          </div>
        )}
      </div>
      <dl className="divide-y divide-stone-100 border-t border-stone-200/70 bg-white py-0.5">
        {!bare && (
          <>
            <Row k={marketLedView && lead ? "Price" : "Rent that fits"}>
              {marketLedView && lead ? (
                productPrice ? <>{cap(productPrice)} · market rate, no HUD ceiling</> : <>market rate</>
              ) : atMarket ? (
                mr.rent != null ? (
                  <>
                    <B>{fmtDollars(mr.rent)}/mo</B> market asks · no HUD ceiling
                  </>
                ) : (
                  <>Market rent not available</>
                )
              ) : price ? (
                <>
                  {fmtDollars(price.limit)} × 30% ÷ 12 = <B>{fmtDollars(price.rent)}/mo</B>, {effPersons}
                </>
              ) : (
                <>HUD limits not available</>
              )}
            </Row>
            <Row k="Who it serves">
              {marketLedView && lead ? (
                <>households {servesWords ?? "the market price reaches"}; not the {fmtHouseholds(tenantTotal)} {tenantWords} {levelShort(level)}</>
              ) : rec.tenants.available ? (
                <>
                  <B>{fmtHouseholds(tenantTotal)}</B> {tenantWords} {levelShort(level)}
                  {autoType ? " (the largest group here)" : ""}
                </>
              ) : (
                <>
                  <B>0</B> {tenantWords} {levelShort(level)} on file
                </>
              )}
            </Row>
            <Row k="Market">
              {atMarket ? (
                mr.rent != null && floor80 != null ? (
                  <>
                    asks <B>{fmtDollars(mr.rent)}</B> · needs <B>{fmtDollars(mr.rent * 40)}</B> a year ({fmtDollars(mr.rent)} × 12 ÷ 30%)
                  </>
                ) : (
                  <>not available</>
                )
              ) : m.askingUsed != null && two ? (
                m.askingUsed <= two.rent ? (
                  <>
                    asks <B>{fmtDollars(m.askingUsed)}</B> · <B>{fmtDollars(two.rent - m.askingUsed)}</B> below what fits
                    {price && price.bedrooms !== 2 ? " a 2-bedroom" : ""}
                  </>
                ) : (
                  <>
                    asks <B>{fmtDollars(m.askingUsed)}</B> · gap <B>{fmtDollars(m.askingUsed - two.rent)}/mo</B> over {fmtDollars(two.rent)} (utilities not included, so the real gap is larger)
                    {price && price.bedrooms !== 2 ? " (2-bedroom)" : ""}
                    {m.verdict === "needs_subsidy" ? " · needs subsidy" : ""}
                  </>
                )
              ) : (
                <>asking rent not available</>
              )}
            </Row>
            {showFlood && flood?.pct != null && (
              <Row k="Flood">
                <B>{fmtPct100d1(flood.pct)}</B> of land in a flood zone · {flood.blocked ? `above your ${flood.limit}% limit` : flood.limit != null ? `within your ${flood.limit}% limit` : "no limit set"}
              </Row>
            )}
          </>
        )}
        <Row k="You decide">
          <span className="italic text-slate-700">Site, scale, sponsor and financing are yours; this shows the evidence.</span>
        </Row>
      </dl>
      <details className="group border-t border-stone-200/70 bg-white">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-caption font-semibold text-slate-600 hover:text-slate-900">
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden />
          How we got this
        </summary>
        <ul className="space-y-1.5 px-4 pb-3 text-caption leading-snug text-slate-700">
          {details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

