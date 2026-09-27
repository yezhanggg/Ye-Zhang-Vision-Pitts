// Details > Calculations: every number and rule on the Analysis tab, written as the formula the code runs. Thresholds,
// HUD limits and medians are read from the same modules the views use, so this page cannot drift from the code.
import type { ReactNode } from 'react';
import { hud } from '../../lib/place/data';
import { ceilingRent } from '../../lib/place/afford';
import { CITY_MEDIAN_HOME_VALUE } from '../../lib/place/context';
import { FLOOD_LIMIT_PCT } from '../../lib/place/plan';
import { THRESHOLDS } from '../../lib/place/thresholds';
import { HUD_3P_ADJ, fits2br } from '../../lib/equity/measures';
import { BONUS_AFFORDABLE_SHARE, rent60TwoBedroom } from '../../lib/equity/policy';
import { BY_RIGHT_SHARE } from '../../lib/equity/zoning';

const usd = (x: number | null | undefined) => (x == null ? 'not available' : `$${Math.round(x).toLocaleString('en-US')}`);
const pct = (x: number) => `${Math.round(x * 100)}%`;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-body font-semibold text-slate-900">{title}</h3>
      <dl className="divide-y divide-stone-200/70 border-y border-stone-200/70">{children}</dl>
    </section>
  );
}

/** One calculation: its name, then the formula and a worked example or note. */
function Calc({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="grid gap-x-4 py-1.5 text-small leading-snug sm:grid-cols-[200px_minmax(0,1fr)]">
      <dt className="text-slate-600">{name}</dt>
      <dd className="text-slate-800">{children}</dd>
    </div>
  );
}

const F = ({ children }: { children: ReactNode }) => <span className="font-medium text-slate-900">{children}</span>;

export default function AnalysisCalculations() {
  const m = hud?.metro;
  const c30 = hud ? ceilingRent(hud, 30, 2) : null;
  const c50 = hud ? ceilingRent(hud, 50, 2) : null;
  const c80 = hud ? ceilingRent(hud, 80, 2) : null;
  const mkt = fits2br(hud, 100);
  const r60 = rent60TwoBedroom(hud);
  const T = THRESHOLDS;

  return (
    <div className="space-y-6">
      <p className="text-small text-slate-700">
        How every number and suggestion on the Analysis tab is computed. Observed data are counts and measurements; the marks (thresholds) are value judgments, printed here so they can be argued with. Checked on 27 Sep 2026 by recomputing each value from the published data.
      </p>

      <Section title="Shared inputs">
        <Calc name="Income limits">
          HUD FY{m?.fy ?? 2026} income limits for the {m?.name ?? 'Pittsburgh HMFA'}; area median family income <F>{usd(m?.median)}</F>. Limits are read by household size (1 to 8 people); a half size (1.5 people) is the mean of its two neighbours.
        </Calc>
        <Calc name="Rent that fits">
          <F>income limit × 30% ÷ 12</F>, a gross rent (utilities included; the utility allowance is not known). A 2-bedroom uses the 3-person limit: at 30% AMI {c30?.formula}; at 50% {c50?.formula}; at 80% {c80?.formula}.
        </Calc>
        <Calc name="Market rate">
          Place tab: no HUD ceiling applies above 80% AMI; the market rent is the price. Compare and Equity: a household at the area median, <F>median × {pct(HUD_3P_ADJ)} (HUD's 3-person adjustment) × 30% ÷ 12</F> = {mkt?.formula ?? 'not available'}.
        </Calc>
        <Calc name="Household size">
          Your chosen size, or "Any" (sized for the largest group here): the CHAS household type with the most renters at your level sets it (seniors alone and single adults 1; senior families 2; small families 2–4, priced at 3; large families 5 or more, priced at 5). Age group is the householder's age bracket (ACS B25007: 15–24, 25–34, 35–44, 45–54, 55–64, 65–74, 75+); CHAS splits age only at 62, so brackets under 62 and 55–64 keep the CHAS under-62 types (single adults, small and large families; no senior housing) and 65–74 and 75+ keep the 62+ types (seniors alone and senior couples; senior housing allowed). The bracket's renter householders (all incomes, ACS) are shown beside the CHAS counts. Home size: 1–2 people a 1-bedroom (1 person may use a studio), 3–4 a 2-bedroom, 5+ a 3-bedroom.
        </Calc>
        <Calc name="Renters by income">
          HUD CHAS 2018–22 Table 8 renter households by band (≤30, 30–50, 50–80, 80–100, &gt;100% of HUD area median). A level counts <F>every band at or below it</F>; market rate counts the two bands above 80%. Burdened = paying more than 30% of income (includes those paying more than half).
        </Calc>
        <Calc name="Asking rent">Median 2-bedroom asking rent from Dewey listings 2025–26, used only at {T.asking_conf_min} or high confidence (enough listings); otherwise "too few listings".</Calc>
        <Calc name="Frequent transit">
          A stop is frequent with at least <F>{T.frequent_stop_departures} weekday departures</F> (about every 15 minutes over 16 hours; PRT GTFS June 2026). Distance = straight-line miles from each 2020 census block to its nearest frequent stop, averaged over the tract's residents.
        </Calc>
        <Calc name="Flood">
          <F>FEMA special flood hazard area ÷ tract land area</F> (FEMA's 1%-a-year, or 100-year, flood zone; National Flood Hazard Layer; land only). Words: none at 0%, minor under {T.flood_minor_below_pct}%, moderate up to {T.flood_moderate_upto_pct}%, high above. Your flood limit (no suggestion above it): None {FLOOD_LIMIT_PCT.none}%, ≤{FLOOD_LIMIT_PCT.le5}%, ≤{FLOOD_LIMIT_PCT.le15}%, or Any (no limit).
        </Calc>
        <Calc name="Lot pattern">
          Conversions and ADUs fit when at least <F>{pct(T.lot_units_2_4_share)}</F> of homes are in 2–4 unit buildings or at least <F>{T.lot_parcels_2_4}</F> parcels hold 2–4 units. New buildings can go on empty land with at least <F>{T.lot_vacant_parcels}</F> vacant parcels; otherwise "infill only". Annotations, never a gate.
        </Calc>
        <Calc name="Home value">
          Like with like: the tract's sale median since 2023 against the city sale median ({usd(hud?.city?.sale_median)}) when the tract has at least <F>{T.min_sales} sales</F>; otherwise the ACS median value against the ACS city median ({usd(CITY_MEDIAN_HOME_VALUE)}).
        </Calc>
        <Calc name="Zoning">
          A type is "by right" in a tract when districts that allow it by right cover at least {pct(BY_RIGHT_SHARE)} of its land (WPRDC zoning; the district table is unverified against Title 9). "Not by right on most of the land" otherwise.
        </Calc>
      </Section>

      <Section title="Place: what to build, at what price, for whom">
        <Calc name="Under-served renters">Renters at or below your level, and how many pay more than 30% of income. With no burdened renters, the need-driven focuses suggest nothing.</Calc>
        <Calc name="Price">The rent that fits for the household size at your level's top limit (the LIHTC convention). At ≤50% the ≤30% renters pay less: the market sentence says when listings reach the top of the level but not the ≤30% band.</Calc>
        <Calc name="Market test">
          2-bedroom asking rent against the level's 2-bedroom rent that fits. At or below: the market reaches it on turnover. Above, with the rent that fits under the ZIP Small Area Fair Market Rent and the asking rent within it: a voucher reaches it. Otherwise the gap = <F>asking − fits</F> a month.
        </Calc>
        <Calc name="Anti-displacement">
          Displacement risk (0–1) ≥ <F>{T.displacement_high}</F>: only types that add homes without demolition (ADU, duplex / triplex; senior and small apartment only with vacant land), for households ≤50% AMI, subsidized; no townhome. Below <F>{T.displacement_low}</F>: affordable homes through gentle density. In between: the same additive preference. At market rate with high risk: no market-rate homes.
        </Calc>
        <Calc name="Market-led">
          Passes when <F>asking 2-bedroom ≥ ZIP Fair Market Rent</F> and <F>home value ≥ city median</F>; then market-rate types (never senior housing), each at its usual size (ADU 1-bedroom, duplex and townhome 2-bedroom). Prints who the price leaves out.
        </Calc>
        <Calc name="Transit-first">Passes when the nearest frequent stop is within your distance (¼, ½ or 1 mile); then the densest feasible type first; no ADU.</Calc>
        <Calc name="Climate-resilient">
          Passes when FEMA flood-zone land ≤ <F>{T.climate_flood_max_pct}%</F> and the nearest frequent stop is within your distance (default {T.climate_transit_default_mi} mile); then attached and multi-unit forms first.
        </Calc>
        <Calc name="Order of types">Inside the set the rule allows: types that fit the household first, then the weighted scoring order under that focus. The scoring never adds or removes a type.</Calc>
        <Calc name="Homes you plan">Homes reached = min(homes, qualifying households); share = homes ÷ qualifying. Yearly gap = max(0, asking − fits) × 12 × homes.</Calc>
      </Section>

      <Section title="Compare places">
        <Calc name="At a glance">
          Renters ≤50% AMI = ≤30% + 30–50% bands; burdened = their renters paying over 30%; rent gap = asking − fits at your level (market rate uses the area-median rent above); nearest frequent stop; FEMA flood-zone land; jobs within a straight-line mile (LODES 2023); groceries, pharmacies, clinics and libraries within ½ mile (OpenStreetMap); vacant, residential and multi-unit-zoned land shares.
        </Calc>
        <Calc name="Shading">
          The side with more need or better access is tinted in its color. A rent gap at or below $0 counts as $0 (the market already fits), so two negative gaps shade neither side. Residential land has no better side and is never shaded.
        </Calc>
        <Calc name="What each gets">The Place rules above, run for each place with the same focus and level.</Calc>
        <Calc name="Why they differ">The same rules read side by side; "N times as many" = larger ÷ smaller renter count at your level ("about the same" under 1.15×).</Calc>
        <Calc name="Scoring ranks">
          The weighted ranking behind "Scoring detail": score = <F>Σ w·c ÷ Σ w·|d|</F>, where d is a type's fit to a factor (from the fit table) and c = d·x when d ≥ 0, |d|·(1 − x) when d &lt; 0, with x the tract's percentile on that factor. It only orders types and can differ from the rules.
        </Calc>
      </Section>

      <Section title="Equity & policy">
        <Calc name="Rent gap">2-bedroom asking rent − rent that fits at your level. Tracts with a low-confidence asking rent are left out, not set to $0. The rent that fits includes utilities and listings usually do not, so the real gap is larger by the utility cost.</Calc>
        <Calc name="Burdened renters">Renters ≤50% AMI paying more than 30% of income (a count, so larger tracts can rank higher).</Calc>
        <Calc name="Jobs, school, transit, services">Jobs within a straight-line mile; miles to the nearest public school; miles to the nearest frequent stop; groceries, pharmacies, clinics and libraries within ½ mile.</Calc>
        <Calc name="Medians and classes">City medians use only the tracts with a value. Map classes are fixed breaks per measure; "$0 or less" is its own class for the rent gap. The "need rank" bar is the share of tracts with less need.</Calc>
        <Calc name="ADU by right">Counts tracts where an ADU is by right today and after allowing ADUs by right in every residential district (by right = at least {pct(BY_RIGHT_SHARE)} of the land).</Calc>
        <Calc name="Density bonus">
          Small apartments by right where they need a hearing today, if <F>{pct(BONUS_AFFORDABLE_SHARE)}</F> of the homes rent at 60% AMI. HUD's 60% limit = 1.2 × the 50% limit: {r60 ? `${r60.formula} for a 2-bedroom` : 'not available'}. The 10% share is this tool's example, not a city rule.
        </Calc>
        <Calc name="Rent-gap subsidy">Yearly cost = <F>max(0, asking − fits) × 12 × homes</F>, summed over the 10 tracts with the largest <F>gap × burdened renters ≤50% AMI</F> (where the gap meets the most households). A gross estimate: no administration, rents held at today's asking level.</Calc>
        <Calc name="Wider transit standard">Counts the tracts that pass Transit-first at your distance and at 1 mile. It changes the standard, not the network: no stops or routes are added.</Calc>
      </Section>
    </div>
  );
}
