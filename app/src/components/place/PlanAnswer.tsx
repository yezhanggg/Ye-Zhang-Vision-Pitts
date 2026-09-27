// The answer card on Analysis > Match (always open), kept short: the suggested type and home size, then at most four
// one-line rows with a short label and a bold number (rent, serves, market, flood when it matters). Each row's
// formula or explanation sits behind a small ⓘ; the long sentences (why, caveats, not-served, homes needed, "you
// decide") sit in the collapsed "Details".
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
  AGE_WORDS,
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
import { Dot, InfoTip, readableColor } from "../primitives";

/** One line: short label, value, and an optional ⓘ with the formula or the explanation. */
function Row({ k, info, children }: { k: string; info?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5">
      <dt className="w-16 shrink-0 text-caption font-semibold uppercase tracking-wide text-slate-500">{k}</dt>
      <dd className="min-w-0 flex-1 truncate text-small text-slate-800 tnum">{children}</dd>
      {info && (
        <InfoTip label={`About ${k.toLowerCase()}`} width={250} align="end">
          {info}
        </InfoTip>
      )}
    </div>
  );
}

const B = ({ children }: { children: ReactNode }) => <b className="font-semibold text-slate-900">{children}</b>;
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const levelShort = (l: PlanLevel) => (l === "market" ? ">80% AMI" : LEVEL_LABEL[l]);

/** A short reason (under ~15 words) for "No suggestion here"; the full sentence is in the fold. */
function shortWhy(rec: Recommendation, level: PlanLevel, marketRule: boolean): string {
  const f = rec.floodLimit;
  if (f?.blocked && f.pct != null) return `${fmtPct100d1(f.pct)} of land in the flood zone, over your ${f.limit === 0 ? "none" : `${f.limit}%`} limit.`;
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
  const ageWord = age === "any" ? "" : `, ${AGE_LABEL[age]}`;
  // 'auto': the size this place's largest group sets (rec.household); explicit sizes pass through.
  const auto = size === "auto";
  const autoType = auto ? (rec.household?.type ?? null) : null;
  const eff: FixedSize = size === "auto" ? (rec.household?.size ?? 3) : size;
  const effPersons = autoType ? TYPE_PERSONS[autoType] : personsWord(eff);
  const whoShort = autoType ? PLAN_TYPE_SHORT[autoType] : `${sizeWord(eff)} household${ageWord}`;
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
          `qualifying ${autoType ? PLAN_TYPE_LABEL[autoType] : `${sizeWord(eff)} households`}${AGE_WORDS[age] ? ` ${AGE_WORDS[age]}` : ""} ${levelPhrase(level)}`,
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

  const context = [STANCE_LABEL[rec.stance], auto ? "" : personsWord(size as FixedSize), age === "any" ? "" : AGE_LABEL[age], LEVEL_LABEL[level]].filter(Boolean).join(" · ");
  const over = m.askingUsed != null && two ? m.askingUsed - two.rent : null;

  return (
    <div className="overflow-hidden rounded-2xl ring-1" style={{ background: `${color}12`, boxShadow: `inset 0 0 0 1px ${color}45` }}>
      <div className="px-4 pb-3 pt-3.5">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="flex items-center gap-1 text-small font-semibold text-slate-700">
            {UI.bestMatch}
            <InfoTip label="About this answer" side="bottom" align="start" width={250}>
              Evidence, not a decision: site, scale, sponsor and financing are yours.
            </InfoTip>
          </div>
          <div className="text-caption text-slate-600">{context}</div>
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
                    ? `${cap(bedroomsWord(lead.bedrooms).replace(/^a /, ""))}${lead.typology === "townhome" ? " for sale" : ""} · market rate`
                    : `${cap(sizeHomeWord(eff).replace(/^a /, ""))} · ${whoShort}`}
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
      {!bare && (
        <dl className="divide-y divide-stone-100 border-t border-stone-200/70 bg-white py-0.5">
          {marketLedView && lead ? (
            <Row k="Price" info="Market rate: no HUD rent ceiling applies to what the market builds.">
              {productPrice ? cap(productPrice.replace(/^at the /, "")) : "market rate"}
            </Row>
          ) : atMarket ? (
            <Row k="Rent" info="Above 80% AMI no HUD ceiling applies: the rent is what the market asks.">
              {mr.rent != null ? (
                <>
                  <B>{fmtDollars(mr.rent)}/mo</B> market
                </>
              ) : (
                "not available"
              )}
            </Row>
          ) : (
            <Row
              k="Rent"
              info={
                price ? (
                  <>
                    Rent that fits: {fmtDollars(price.limit)} × 30% ÷ 12 = {fmtDollars(price.rent)}. HUD {price.pct}% AMI limit for {effPersons}; gross rent (utilities not known).
                  </>
                ) : undefined
              }
            >
              {price ? (
                <>
                  <B>{fmtDollars(price.rent)}/mo</B> fits
                </>
              ) : (
                "HUD limits not available"
              )}
            </Row>
          )}
          <Row
            k="Serves"
            info={
              marketLedView && lead
                ? `Households ${servesWords ?? "the market price reaches"}; not the ${fmtHouseholds(tenantTotal)} ${tenantWords} ${levelShort(level)}.`
                : autoType
                  ? `The largest group here: ${PLAN_TYPE_LABEL[autoType]} ${levelShort(level)} (HUD CHAS renter households).`
                  : "HUD CHAS renter households of this size and age."
            }
          >
            {marketLedView && lead ? (
              <>households {servesWords ? servesWords.replace(/^households /, "") : "the market price reaches"}</>
            ) : (
              <>
                <B>{rec.tenants.available ? fmtHouseholds(tenantTotal) : "0"}</B> {autoType ? PLAN_TYPE_SHORT[autoType] : tenantWords} {levelShort(level)}
              </>
            )}
          </Row>
          <Row
            k="Market"
            info={
              atMarket
                ? mr.rent != null
                  ? `Income needed: ${fmtDollars(mr.rent)} × 12 ÷ 30% = ${fmtDollars(mr.rent * 40)} a year. ${mr.words}.`
                  : undefined
                : over != null && two
                  ? `2-bedroom asking rent vs. the ${fmtDollars(two.rent)} that fits a 2-bedroom${over > 0 ? "; utilities not included, so the real gap is larger" : ""}.`
                  : undefined
            }
          >
            {atMarket ? (
              mr.rent != null ? (
                <>
                  needs <B>{fmtDollars(mr.rent * 40)}</B>/yr income
                </>
              ) : (
                "not available"
              )
            ) : over != null && m.askingUsed != null ? (
              over <= 0 ? (
                <>
                  asks <B>{fmtDollars(m.askingUsed)}</B> · <B>{fmtDollars(-over)}</B> under
                </>
              ) : (
                <>
                  asks <B>{fmtDollars(m.askingUsed)}</B> · gap <B>{fmtDollars(over)}/mo</B>
                  {m.verdict === "needs_subsidy" ? " · subsidy" : ""}
                </>
              )
            ) : (
              "asking rent not available"
            )}
          </Row>
          {showFlood && flood?.pct != null && (
            <Row k="Flood" info="Share of the tract's land in FEMA's 1%-a-year (100-year) flood zone, against the limit you chose.">
              <B>{fmtPct100d1(flood.pct)}</B> of land · {flood.blocked ? `over ${flood.limit === 0 ? "none" : `${flood.limit}%`} limit` : flood.limit != null ? `within ${flood.limit}%` : "no limit"}
            </Row>
          )}
        </dl>
      )}
      <details className="group border-t border-stone-200/70 bg-white">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-caption font-semibold text-slate-600 hover:text-slate-900">
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" aria-hidden />
          Details
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
