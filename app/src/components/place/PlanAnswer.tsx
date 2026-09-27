// The answer card on Analysis > Match (always open): the suggested housing type(s) under the focusing issue and the
// planning inputs, the rent that fits with its arithmetic, who it serves, the market check and the fixed "You decide"
// line. Everything is lib/place (recommend, needsArithmetic); nothing here is a score.
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { typologyById } from "../../lib/data";
import { DECIDE } from "../../lib/place/copy";
import { bedroomsWord } from "../../lib/place/bands";
import { fmtDollars, fmtHouseholds, capitalize } from "../../lib/place/format";
import { needsArithmetic } from "../../lib/place/needs";
import {
  LEVEL_LABEL,
  levelPhrase,
  type Household,
  type IncomeLevel,
} from "../../lib/place/plan";
import type { Recommendation } from "../../lib/place/recommend";
import { STANCE_LABEL, TYPOLOGY_LABEL } from "../../lib/place/thresholds";
import type { HudTable, PlaceMeasures } from "../../lib/place/types";
import { UI } from "../../lib/copy";
import { Dot, readableColor } from "../primitives";

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="px-3 py-2">
      <dt className="text-caption font-semibold uppercase tracking-wide text-slate-500">
        {k}
      </dt>
      <dd className="mt-0.5 text-small leading-snug text-slate-800">
        {children}
      </dd>
    </div>
  );
}

const HOUSEHOLD_WORD: Record<Household, string> = {
  seniors: "seniors",
  families: "families",
  anyone: "any household",
};

export default function PlanAnswer({
  rec,
  place,
  hud,
  level,
  household,
  homes,
}: {
  rec: Recommendation;
  place: PlaceMeasures;
  hud: HudTable;
  level: IncomeLevel;
  household: Household;
  homes: number | null;
}) {
  const lead = rec.types[0] ?? null;
  const color = lead
    ? (typologyById.get(lead.typology)?.color ?? "#64748b")
    : "#94a3b8";
  const others = rec.types.slice(1);
  const needs =
    homes != null
      ? needsArithmetic(place, hud, {
          homes,
          population: household === "anyone" ? "all" : household,
          band: level,
        })
      : null;
  const tenant = rec.tenants.types[0] ?? null;
  const tenantTotal = rec.tenants.types.reduce((a, t) => a + t.count, 0);
  const marketLed = rec.stance === "market_led";
  const price = rec.price;
  const two = rec.twoBedroom;
  const m = rec.market;
  // Nobody at this level to plan for (a park, a campus, or no seniors / families here): the reason and "You decide" only.
  const bare =
    !lead && !marketLed && (!rec.band.available || !rec.tenants.available);
  const why = !lead
    ? rec.stanceTest.passed === false || marketLed
      ? rec.stanceTest.sentence
      : rec.band.available
        ? rec.notServedWhy
        : rec.band.reason
    : null;

  return (
    <div
      className="overflow-hidden rounded-2xl ring-1"
      style={{
        background: `${color}12`,
        boxShadow: `inset 0 0 0 1px ${color}45`,
      }}
    >
      <div className="px-4 pb-3 pt-3.5">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="text-small font-semibold text-slate-700">
            {UI.bestMatch}
          </div>
          <div className="text-caption text-slate-600">
            {STANCE_LABEL[rec.stance]} · {LEVEL_LABEL[level]} ·{" "}
            {HOUSEHOLD_WORD[household]}
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${lead?.typology ?? "none"}-${lead?.bedrooms ?? ""}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
          >
            {lead ? (
              <>
                <div
                  className="mt-0.5 font-display text-display font-bold leading-tight"
                  style={{ color: readableColor(color) }}
                >
                  {typologyById.get(lead.typology)?.label ??
                    TYPOLOGY_LABEL[lead.typology]}
                </div>
                <div className="text-small text-slate-700">
                  {capitalize(bedroomsWord(lead.bedrooms).replace(/^a /, ""))}{" "}
                  homes
                  {rec.tenants.seniorAlone && lead.bedrooms === 1 && !marketLed
                    ? " for one person"
                    : ""}
                  {marketLed ? " at market rents" : ""}
                </div>
              </>
            ) : (
              <>
                <div className="mt-0.5 font-display text-title font-bold leading-tight text-slate-800">
                  No suggestion here
                </div>
                <p className="mt-1 text-small leading-snug text-slate-700">
                  {why}
                </p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
        {others.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-caption text-slate-700">
            <span>Also fits:</span>
            {others.map((o) => (
              <span
                key={o.typology}
                className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 ring-1 ring-stone-200"
              >
                <Dot
                  color={typologyById.get(o.typology)?.color ?? "#999"}
                  size={8}
                />
                {typologyById.get(o.typology)?.label ??
                  TYPOLOGY_LABEL[o.typology]}
              </span>
            ))}
          </div>
        )}
      </div>
      <dl className="divide-y divide-stone-100 border-t border-stone-200/70 bg-white">
        {bare ? null : price ? (
          <Row k="Rent that fits">
            <b className="text-slate-900 tnum">
              {fmtDollars(price.rent)}/month = {fmtDollars(price.limit)} × 30% ÷
              12
            </b>
            <span className="text-slate-600">
              {" "}
              ({bedroomsWord(price.bedrooms, price.seniorAlone)} at the{" "}
              {price.pct}% AMI limit
              {price.limitFormula ? `; limit ${price.limitFormula}` : ""}; gross
              rent, utilities not known)
            </span>
          </Row>
        ) : (
          <Row k="Rent that fits">
            No HUD rent limit applies at this level; the market rent is the
            price.
          </Row>
        )}
        {!bare && (
          <>
            <Row k="Who it serves">
              {marketLed ? (
                lead ? (
                  <>
                    {capitalize(
                      rec.headline.split("; serves ")[1] ??
                        "households the market price reaches",
                    )}
                    .
                  </>
                ) : (
                  <>Nobody new without a subsidy.</>
                )
              ) : tenant ? (
                <>
                  <b className="text-slate-900 tnum">
                    {fmtHouseholds(tenant.count)} {tenant.label}
                  </b>{" "}
                  {levelPhrase(level)}
                  {household !== "anyone" && rec.tenants.types.length > 1 && (
                    <span className="text-slate-600">
                      {" "}
                      (
                      {rec.tenants.types
                        .map((t) => fmtHouseholds(t.count))
                        .join(" + ")}{" "}
                      = {fmtHouseholds(tenantTotal)}{" "}
                      {household === "seniors" ? "senior" : "family"} renter
                      households)
                    </span>
                  )}
                  {household === "anyone" && (
                    <span className="text-slate-600">, the largest group</span>
                  )}
                </>
              ) : (
                <>{rec.tenants.sentence}</>
              )}
            </Row>
            <Row k="Market check">
              {m.askingUsed != null && two ? (
                m.gap && m.gap > 0 ? (
                  <>
                    Listings ask{" "}
                    <b className="text-slate-900">{fmtDollars(m.askingUsed)}</b>{" "}
                    for a 2-bedroom; the rent that fits a 2-bedroom is{" "}
                    {fmtDollars(two.rent)}. Gap{" "}
                    <b className="text-slate-900 tnum">
                      {fmtDollars(m.askingUsed)} − {fmtDollars(two.rent)} ={" "}
                      {fmtDollars(m.gap)}/month
                    </b>
                    {m.verdict === "needs_subsidy"
                      ? ": new homes at this rent need a voucher or project-based subsidy."
                      : "."}
                  </>
                ) : (
                  <>
                    Listings ask{" "}
                    <b className="text-slate-900">{fmtDollars(m.askingUsed)}</b>{" "}
                    for a 2-bedroom, at or below the {fmtDollars(two.rent)} that
                    fits ({fmtDollars(two.rent)} − {fmtDollars(m.askingUsed)} ={" "}
                    {fmtDollars(two.rent - m.askingUsed)} of room): the market
                    already reaches this level on turnover.
                  </>
                )
              ) : (
                <>{m.sentence}</>
              )}
            </Row>
          </>
        )}
        {needs && !bare && (
          <Row k={`${fmtHouseholds(homes)} homes needed`}>
            <ul className="space-y-0.5">
              <li>{needs.lines[1]}</li>
              <li>{needs.servedRatio}</li>
              <li>{needs.gapSentence}</li>
            </ul>
          </Row>
        )}
        <Row k="You decide">
          <span className="italic text-slate-700">{DECIDE}</span>
        </Row>
      </dl>
    </div>
  );
}
