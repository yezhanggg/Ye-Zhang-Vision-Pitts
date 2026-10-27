# Find places for a project, and three ways to pay for it

Added October 2026. Code: `app/src/lib/project/size.ts` (the size sweep), `app/src/lib/project/paths.ts` (the paths), `app/src/lib/finder/rank.ts` (the ranking), `app/src/lib/demand/depth.ts` (market depth), `app/src/lib/project/report.ts` (the project in the place PDF and CSV). Market depth data: `src/visionpitts/demand.py` `tract_depth`, written into `app/src/data/lazy/demand.json` by `scripts/17_build_demand.py`. Choices: [assumptions §18](../assumptions.md).

These are screening tools. They rerun the project card's own model (mix → pencil → tax credit sheet) and never add a factor to the scoring.

## The size sweep

The same project is tested at a range of sizes.

**The range.** It starts from the person's own range: the finder's "Homes from … to", or on the project card a third of the homes to twice them, and never fewer than 12. Two bounds can cut the top of that range:

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

On Analysis > Place, before a place is picked, "Or find places for a project" opens the finder. Its form is the section "Find places for a project" in the left panel; the ranked list is in the right panel's start card and is ranked again on Confirm. The flood and transit screens under Policies that apply here filter it.

**The project:**
- homes from–to
- financing: 9% or 4%, 9%, 4%, or market rate
- building type
- highest cost a home
- how many places to show
- the planning level, taken from "Who you're planning for"

**More filters:**
- allowed by right on at least 5% of the land (the unverified by-right table; a conditional use counts when ticked)
- most land in a FEMA flood zone
- QCT or DDA only
- inside or outside the inclusionary overlay
- least market depth

**How places are tested.** Every one of the 114 ranked tracts is swept. "9% or 4%" keeps the better credit by the rule below. Places left out are counted by reason.

**The order (printed under the list):**
1. Tier: closes, then over PHFA's limit, then gap.
2. Places whose range zoning and market depth left whole come first.
3. The smaller gap a home at the reference size (headroom counts below zero). The reference size is the right size; otherwise the largest size that closes; otherwise the size with the smallest gap a home.
4. More PHFA points from the place.
5. The lower cost a home.

**Each row shows:**
- its rank and tier
- the sizes that close and the cost a home
- PHFA points against the minimum
- the drivers in words: 2BR market rent against the tax credit rent, QCT/DDA basis boost, homes by right, market depth, and the credit cap when it binds
- the type the current stance suggests

Rows can be shortlisted, and two shortlisted places open in Compare places.

**One filter away** (`findPlaces` `nearMisses`, `relax`): places that fail exactly one filter are run through the same model, and one line under "Left out" says how many each filter alone holds out, e.g. "71 held out only by “not a QCT or DDA”". A test holds each count equal to re-running the finder without that filter. A place failing two filters or more is not run. With the transit screen on, the line also counts places it alone holds out.

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
