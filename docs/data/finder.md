# Find places for a project, and three ways to pay for it

Added October 2026. Code: `app/src/lib/project/size.ts` (the size sweep), `app/src/lib/project/paths.ts` (the paths), `app/src/lib/finder/rank.ts` and `app/src/components/place/finder/read.ts` (Find places), `app/src/lib/demand/depth.ts` (market depth), `app/src/lib/project/report.ts` (the project in the place PDF and CSV). Market depth data: `src/visionpitts/demand.py` `tract_depth`, written into `app/src/data/lazy/demand.json` by `scripts/17_build_demand.py`. Choices: [assumptions §18](../assumptions.md).

These are screening tools. They rerun the project card's own model (mix → pencil → tax credit sheet) and never add a factor to the scoring.

## The size sweep

The same project is tested at a range of sizes.

**The range.** It starts from the person's own range: on the project card a third of the homes to twice them, and never fewer than 12. (Find places no longer sweeps sizes: it reads the project at its own units, below.) Two bounds can cut the top of that range:

- **By-right homes:** homes zoning allows by right on vacant and lived-in lots (`zoning_capacity.json`, tract totals).
- **Market depth:** applies to tax credit paths only (below).

If a bound falls below the bottom of the range, the person's range is tested as it is. The result is then marked as above that bound.

**The sizes.** Eleven evenly spaced sizes are run, ends included. Each edge of the sizes that close is then found exactly by halving the interval between a size that closes and one that does not. If any sizes in the middle fail to close, the sweep does not report them: it reports the span from the first closing size to the last.

**Tiers.** They come from the pencil's own PHFA tests:

| Tier | Tax credits | Market rate |
|---|---|---|
| closes | the gap PHFA counts (soft funds not yet committed are gap) under 50% of the developer fee, and cash flow at or above zero in years 1–10 (PHFA's feasibility tests) | yield on cost at or above the target |
| over PHFA's limit | gap covered only by deferring more than half the fee (gap after deferral ≤ 0), which PHFA does not accept | — |
| gap | otherwise, or negative cash flow before year 11 | otherwise |

Only "closes" counts as closing in the sweep. Until 2026-10-21 the middle tier was called "close call" and counted as closing.

**The right size** is the largest size that closes inside the range. The sweep also names what holds it there, as one of:

- your range
- the homes zoning allows by right
- market depth
- PHFA's per-project credit cap (the next size up is capped)
- the gap itself

## Market depth

```
renters at or below 60% AMI = Σ over city tracts within a mile (CHAS Table 8 renters ≤ 30% + 30–50% + ⅓ × 50–80%)
open households             = that − HUD tax credit homes within the same mile
market depth (homes)        = floor(open households × 10%)     (5% and 15% shown as the low and high)
```

- **Which tracts count:** a tract counts when its representative point lies inside the one-mile buffer of the tract's edge. That is the same buffer the tax credit supply count uses.
- **The 60% line:** CHAS has no 60% cut, so 60% is a straight line across the 50–80% band.
- **City tracts only:** places at the city edge read low.
- **Capture rate:** 10% is an example input, not a market study.

## Three ways to pay for it

On "Does it pencil" the project runs as 9% credits, 4% credits with bonds and market rate.

**What each path shows:**
- the result at the person's size
- the sizes that close and the largest one
- PHFA points against the minimum, for credit paths only

**The order is a printed rule:**
1. Paths that close at the person's size come first.
2. Then the smaller gap a home.
3. Then more points above PHFA's minimum.

The card says "You decide". The path in use is marked; the person picks one under Financing in the left panel, where each option names its tier at the person's homes.

## PHFA points as a range

Each line's basis maps to one of three words:

| Status | Bases |
|---|---|
| from the data | place, lookup |
| your choice | design, finance |
| to confirm | site, partners, team |

The range of the total comes from the same caps (`scoreSheet` in `lib/lihtc/score.ts`):
- **Low** drops the points on lines still "to confirm".
- **High** raises every "your choice" line to its maximum.

**Chance of award is not modeled.** PHFA publishes award lists but no past scores, so no base rate can be drawn from them. The minimum only qualifies an application; credits go to the highest scores.

## Find places for a project

On Analysis > Place, at the Parcel level before a site is picked, "Or find places for a project" opens the finder (it ranks places by whether the project pencils, so it sits with the money). The ranked list is in the right panel's start card. Code: `app/src/lib/finder/rank.ts` (filters, order, words), `app/src/components/place/finder/read.ts` (one place read), `FinderCard.tsx` (the list and the filters).

Changed 2026-10-28 after planner and developer reviews: the finder no longer has a project of its own.

**The project is the one on the left.** The Project group above the finder sets it: development type, units, stories, income level and unit mix. The Capital inputs apply as well. The financing follows the project as Place reads it: market rate for Market, otherwise tax credits where units carry an income limit. The finder group mirrors the LIHTC pick (9% credits or 4% credits + bonds) and writes the same setting as Capital does. A Commercial project gets no list, since it has a zoning check only. The list waits 0.3 s after the last change, then reads every place again.

**Each place is read as the Tract view reads it** (`readPlace`, which mirrors `useProjectRead` with scope `tract`):
- the project model at the project's units;
- the site: a lot the size the project needs, in a district there that allows it by right (`typicalIn`);
- the zoning check on that lot;
- the capital stack on that lot (`runCapital` / `capitalContext`), with the person's Capital changes;
- the review and its verdict.

A test (`finder/read.test.ts`) renders the Tract view's hook and holds the two reads equal. Clicking a row opens that tract at the Tract level, in Test a project mode, with the same project, so the row and the place show the same zoning, money and verdict.

**The filters** (left panel):
- **Allowed by right on a lot here**, on by default. This is the zoning check the Tract view runs, on the standards transcribed from the City's code (`config/zoning_standards.json`, every row verified; see [zoning_capacity.md](zoning_capacity.md)). A tract whose lot falls in a district that is not computed (downtown, riverfront, some mixed-use and planned districts) is left out as "district not computed". The older family table in `place.json` (`zoning.by_type`, marked unverified) is no longer read here.
- Count a hearing (conditional use, special exception) as allowed.
- QCT or DDA only.
- Inside or outside the inclusionary overlay, read as the project reads it (the pin, else most of the tract).
- Least market depth.
- Most cost a unit (the capital stack's total ÷ units).
- How many places to show.

The flood and transit screens under Policies that apply here filter the list too. Places left out are counted by reason; when a filter alone holds out fewer than it counts, the count says so, e.g. "62 not allowed by right (40 by that alone)".

**The order (printed under the list):**
1. The review's verdict: works, works with changes, doesn't work as is, district not computed.
2. On tax credit paths, how far PHFA's minimum is: met; within reach of the design and financing lines; reached only with the site, partner and team lines still to confirm; out of reach even with every line at its top.
3. Fewer findings to fix: stops first, then warnings.
4. Less money a unit still to find. On tax credit paths this is the gap after every source. At market rate it is the equity a 1.5× return would not pay back; below zero, it is a cushion.
5. More PHFA points from the place.
6. The lower cost a unit.

**Each row shows:**
- **Name:** the neighborhood and the tract, e.g. "Bloomfield · Tract 802", since a neighborhood can hold several tracts.
- **Verdict:** as the review gives it.
- **Zoning and capital:** the Tract view's zoning and capital tiles, word for word. On tax credit paths, the row adds the LIHTC equity used against the amount the project could claim. Every row gives the cost a unit.
- **Tax credit line:** what PHFA's minimum asks and where the points would come from. For example: "9% credits: 20 points now, 120 needed; design and financing choices reach 90, the other 30 must come from site, partner and team lines". When the bound is out of reach: "9% credits can't reach PHFA's 120 minimum here: 100 points at most". The bound adds every point the lines still to confirm could add to the score's high end. That makes it an upper bound, so "can't reach" is always true when it is shown. When most rows share the line, it is printed once above them.
- **4% path:** where 9% credits need more than the design and financing choices, the 4% path is read as well, with the financing switched. Its capital tile and points are shown, e.g. "4% + bonds instead: Gap to fill $6.92M · 10 points, 120 needed".
- **To fix:** the review's findings to fix, by title.
- **Drivers:** 2BR market rent against the tax credit rent, the QCT/DDA basis boost, and market depth.
- **The type the current stance suggests.**

Rows can be shortlisted, and two shortlisted places open in Compare places.

**One filter away** (`findPlaces` `nearMisses`, `relax`): places that fail exactly one filter are read the same way. A test holds each count equal to re-running the finder without that filter. A place failing two filters or more before it is read is not read.

**Student tracts: not handled.** The full-time student rule makes most student households ineligible for tax credit homes. The data in this repository has no student count: no school enrollment (ACS B14001/B14007), no group quarters population (B26001) and no college population. The only nearby measure is renter householders aged 15–24 (ACS B25007, in `demand.json`). It runs high in Oakland: 645 of 839 renter householders in Central Oakland, Tract 405. Age is not student status, though, so the finder does not flag or demote these tracts. Doing that needs B14007 (enrollment in college or graduate school by age) per tract in `src/visionpitts/acs.py`, and then a rule for what share counts as "mostly students".

## Dates and the stamp

**The stamp.** The project card and the finder say when the place was screened and how old the data is: the oldest of `demand.json`, the pencil defaults and the tax credit sheet. They add "Screening estimate, not a commitment of funds."

**PHFA's next dates** sit in `lihtc_pa.json` `dates`, with the date they were checked. Checked 2026-10-20:
- **Plan status:** the 2027/2028 plan was a board-approved draft (posted 2026-07-13). Its §9 sets the 2027 9% application deadline at 3:00 p.m. on 2027-02-17.
- **4% with bonds:** applications are taken on a rolling basis until 2027-07-01 or until PHFA's volume cap is used up.
- **Re-check:** the dates once PHFA adopts the plan.

## The place export

While the project card is open, the place's PDF carries "The project tested here" and its CSV carries `Project` rows:
- the setup
- the three paths
- PHFA points
- PHFA's key dates
- the stamp

Compare places' PDF adds "Your project in each place" before the maps, and its CSV adds `Project:` rows. Both are the same nine rows the section shows, A and B side by side.
