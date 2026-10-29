# The Policy lab (Equity & policy, online)

Added 2026-10-27 and made clearer on 2026-10-28. It is the challenge's **policy simulator**: test zoning changes, tax incentives, density bonuses and an infrastructure investment, and see whether today's zoning allows a housing type. It replaces the four on/off levers online. The offline file keeps the earlier view.

- **Engine:** `app/src/lib/policylab/lab.ts`, tested in `lab.test.ts`.
- **Screen:** `app/src/components/equity/lab/`:
  - `PolicyLab.tsx`: the map and the legend;
  - `LabLevers.tsx`: the left panel;
  - `LabResults.tsx`: the right panel;
  - `ui.ts`: the words and colors.
- **Data:** `zoning_capacity.json` from `scripts/18_build_zoning_capacity.py` (docs/data/zoning_capacity.md).

## How to use it

1. **Start from** one of the packages, or from today's rules.
2. **Pick a test project:** duplex, triplex, fourplex, townhomes, small apartments, apartments or senior housing, market rate or 9% tax credits.
3. **Move the policies**, grouped by the challenge's kinds:
   - zoning;
   - inclusionary housing and its bonus;
   - tax breaks and funding;
   - infrastructure.

   Then set **your values** (the screens) and the **assumptions**.

A violet edge marks each policy moved from today, and each group counts its changes. Under each policy is today's rule and its status: in force, proposed, or an idea to test. The (i) says how the lab uses it and where it comes from.

**The map follows the controls.** "The map shows" offers three maps of your rules and the six need measures:

| Map | What each tract shows | Moved by |
|---|---|---|
| Does the test project work? | Works by right; works with a hearing; breaks even but under the bar; short by the gap a unit (under $50k, $50–150k, $150–250k, over $250k); not allowed; zoning not read; left out by your values; no rent on file. Tracts whose class changed from today are outlined. | The test project, every money policy, your values, and the house-lot idea for a duplex, triplex or fourplex |
| What changed from today | Now works (by right or with a hearing), better off, no change, worse off, stops working, not allowed, zoning not read, left out | The same |
| Homes allowed by right | The count, or its change from today once a zoning policy moves it | Homes on house lots, minimum lot sizes |
| Need (six measures) | Rent gap and cost burden at an income level, jobs, school, transit, services: data, which no policy changes | Nothing |

When you move a policy the current map does not show, the map switches to one that does. For example, minimum lot sizes switch it to homes allowed by right, and parking switches it back. A line under the menu says what the map shows. Clicking a tract picks it without leaving the city view. On a phone, the controls and the results take turns ("See the results"), so the map stays in view.

## The packages

Each starts from today's rules. Missing middle also sets the test building to a triplex; the others keep the test building you chose.

| Package | Policies |
|---|---|
| Today's rules | The rules in force in October 2026 |
| Missing middle | Tests a triplex (3 units, 3 stories, market rate): up to 3 homes on house lots; no parking minimums near frequent transit |
| More affordable homes | The 10% set-aside citywide, a $50k gap subsidy, a $1,500 tax abatement |
| Build near transit | Frequent bus on every line, no parking minimums near it, the 20% height bonus, and build only within ½ mile of frequent transit |
| On the table | The proposals before the City: the height bonus (Bill 2025-1545) and no parking minimums |

## The test project

One building on paper in each of the 128 city tracts with place data:

| Type | Units, stories | Zoning use read |
|---|---|---|
| Duplex | 2, 2 | Two-unit |
| Triplex | 3, 3 | Three-unit |
| Fourplex | 4, 3 | Multi-unit |
| Townhomes | 6, 3 | Single-unit attached, a lot each |
| Small apartments | 12, 3 | Multi-unit |
| Apartments | 40, 4 | Multi-unit |
| Senior | 50, 4, tax credits | Housing for the elderly |

Changing the units changes the type to match: 2 is a duplex, 3 a triplex, 4 a fourplex, 5–19 small apartments, 20 or more apartments. Townhomes and senior housing keep their type at any size.

**The bedrooms:**
- **Most types:** split like the tract's renters by household size (HUD CHAS).
- **Senior:** 80% one-bedroom.

**Zoning in a tract:** lots in districts whose use table (§911.02) allows the building, whose homes a lot hold it (the cap in R1D to R3, the envelope in RM and the mixed-use districts) and whose height takes its stories.

| Result | When |
|---|---|
| Allowed by right | Some lots allow it by right |
| Needs a hearing | No lot by right, some with an administrator exception, special exception or conditional use. Housing for the elderly is never by right in Pittsburgh's base districts, so senior housing always needs one. |
| Not allowed | Neither, with at least three quarters of the lots read. The map shows these tracts in amber; the money is still worked out, in case it were allowed. |
| Zoning not read | More lots than that are in districts not computed here (downtown, riverfront, special districts). Pale amber; never counted as working, even where the money works (the answer says how many, to check the code there). |

**What counts as working:** only tracts that allow the building by right. Where it needs a hearing, the money is read as if the hearing were granted and the map shows "works with a hearing" (or its gap); the answer counts those apart. Senior housing, which always needs a hearing, leads with that count.

**Money:** the simple pro forma (docs/data/parcel_level.md):
- **Rents:** the tract's asking rent or Small Area FMR.
- **Land:** $15,000 a unit (an example; the lab has no lot).
- **Loan:** amortized over 30 years (35 with tax credits); operating cost a home a year as set, with no cap.
- **Building cost:** $300 a sq ft (changeable).

It **works** at the bar for the developer's return: 1.5× equity by default, changeable. A project that needs no equity works when its income covers the loan and cash flow stays above zero. A tax credit project works when no gap is left after the credits and cash flow stays above zero for 15 years (no sale, no multiple); the lab assumes it wins the credits. It **breaks even** at 1×. The **gap** is the subsidy a unit that would bring it to the bar.

**Rents with an income limit:** 30% of the income limit for 1.5 people a bedroom (1 for a studio), less the utility allowance (HUD FY2026 MTSP limits). Tax credit homes rent at 60% AMI.

## The policies (today's value first)

| Policy | Today | Options | Status | How it enters |
|---|---|---|---|---|
| Homes on house lots | 1 (R1), 2 (R2) or 3 (R3) homes; no ADU anywhere (no ADU overlay mapped) | + ADU, up to 3, up to 4 | Idea to test | Homes by right on lived-in house lots at or above the minimum lot size: + ADU adds a unit beside a single home (or today's gain where larger); up to 3 or 4 lets each lot hold that many. Up to 3 or 4 also allows a duplex, triplex or fourplex by right on house lots. |
| Minimum lot sizes | Today's (Bill 2025-1579, May 2025) | Before May 2025: 8,000 / 5,000 / 3,200 / 1,800 sq ft (the old very-high 1,200 is an assumption) | In force | Homes by right on vacant and house lots |
| Parking minimums | Kept: 1 space a home for 2 or more homes (§914.02) | None within ½ mile of frequent transit; none | Removal proposed 2024–25; near transit is an idea | Required spaces × the parking cost, added to land. Townhomes need none. Senior housing needs a parking study, not costed. |
| Inclusionary requirement | IZ-O (tracts more than half inside): 10% at 50% AMI from 20 units (§907.04.A) | Off, IZ-O, citywide; 5–30%; any size; 30/50/60/80% AMI | In force | Market test projects of the minimum size or more set homes aside, from the largest size first |
| Height bonus | Off | 10/15/20% at 50% AMI earns 2/4/6 performance points, 15 ft a point (30/60/90 ft) | Proposed (Bill 2025-1545) | Where no set-aside is required. 10-ft floors and units in proportion, taken only where the taller building does better. An upper bound: the lot and the market must carry the height. Offered from the requirement's minimum size (an assumption). |
| Tax abatement | Off | $1,500 or $3,000 a home a year | Idea to test (like LERTA) | Off the operating cost every year |
| Gap subsidy | None | $25k, $50k, $100k a home with an income limit | Idea to test | Other subsidy in the stack |
| PHFA plan | Adopted 2025/2026 | 2027/2028 draft | In force | The 9% credit cap (tax credit projects only) |
| Frequent bus on every line | Today's service: 110 of 128 tracts within ½ mile of frequent transit | Every line every 15 minutes: all 128 | Idea to test | A tract's nearest stop counts as frequent. Changes parking near transit, the transit screen and the climate count. Rents and land prices stay as they are. |

**Your values (the screens).** Today none apply. Each leaves tracts out:
- **Displacement:** no market-only project at high displacement risk (HNA score ≥ 0.67).
- **Transit:** frequent transit within ½ or 1 mile.
- **Flood:** no more than 5% of the land in the FEMA flood zone.

**Assumptions.** These apply to today's rules and yours alike:
- the bar for the developer's return: 1.25×, 1.5× or 2×;
- building cost: $250, $300 or $350 a sq ft;
- a parking space: $5k surface, $15k mixed or $30k garage.

**Simple first (2026-10-29).** The left panel opens with six on/off switches (up to 3 homes on house lots, no parking minimums, set-aside citywide, the 20% height bonus, a $50k gap subsidy, frequent bus on every line; off is today's rule) and the test building's type and financing. Everything else (packages, each policy's levels, your values, assumptions, size) is under **More options**.

**Controls, kept short (2026-10-29).** Each policy shows a status tag (In force, Proposed, Idea, Your value) and a few words on today's rule; the (i) holds the full rule, its source and how the lab uses it. Packages carry a one-line summary.

## The results

**The answer** is one sentence, then three headline numbers (yours, with today under them when they differ): tracts where it works by right, tracts where zoning allows it by right, and the median gap a unit. Notes below say what those numbers don't. The full answer, used by the second opinion, covers:
- where the building works by right, against today (or, for senior housing, where it needs a hearing);
- where zoning allows it by right, or only with a hearing, and where it would work with a hearing;
- the tracts whose zoning is not read, and in how many of them the money would work;
- the median gap where it falls short;
- the homes allowed by right;
- **how sure:** the tracts where it works if building costs $50 a sq ft more or less (for tax credit projects, a note when the 9% credit cap makes the count fall off);
- for tax credit projects, that the lab assumes the project wins 9% credits.

**More numbers:** a plain table, today and yours, below the policy verdicts and the tract picked. Rows that are zero both ways are left out. Each row's definition shows on hover.

| Group | Rows |
|---|---|
| The test project | Tracts where it works by right; where it works with a hearing (when any); where it breaks even (of those tested: allowed by right or with a hearing); where zoning allows it by right; the median gap a unit |
| Homes | Homes allowed by right; homes with an income limit in the test buildings (one in each tract where it works, by right or with a hearing: a count of test buildings, not a forecast) |
| Who gains | Income-limited homes in working tracts at high displacement risk; market-only projects there |
| Climate | Working tracts within ½ mile of frequent transit (fewer car trips); working tracts in a flood zone |

**What each policy does** (shown once a policy is moved; the verdict's meaning shows on hover): each moved policy's part in your rules, read as your rules with and without it. With one policy moved, that is the policy against today. Better and worse are read tract by tract, as on the "What changed" map: on the developer's return when it moves 0.01× or more (0.1× where it works both ways), else on the gap a unit when it moves $1,000 or more.

| Verdict | When |
|---|---|
| Helps | Gains only: more tracts work (by right or with a hearing) or allow it by right, more homes with an income limit asked of the test buildings or built where it works, more homes by right, fewer tracts left out, tracts better off (and, for the bus, more working tracts near transit) |
| Trade-off | Some gains and some losses. Turning the set-aside off is one: fewer homes with an income limit are asked. A screen that changes anything is always a trade-off: a value chosen. |
| Hurts | Losses only |
| Overlaps | Nothing moves with your other choices, but it does on its own: two policies closing the same gap (a subsidy and an abatement, say). The line says what it does alone. |
| No effect | Nothing moves, alone or with the rest. The line says why, for example "only tax credit projects use the PHFA plan" or "the taller building does no better anywhere, so no developer would take it". |

**The tract picked:** today and your rules side by side:
- the result;
- the return;
- the gap a unit;
- the units and income-limited homes (and whether the bonus was taken);
- zoning (lots by right, or with a hearing);
- homes by right;
- frequent transit;
- why.

**What is data, and what is assumed** (a fold):

| Kind | What it covers |
|---|---|
| Data | Rents, renters, zoning and lots, transit, flood, displacement risk |
| Rules in force | IZ-O, lot minimums, the use table, parking, PHFA, HUD limits |
| Proposals and ideas | The bonus and parking repeal (proposed); the rest are ideas |
| Examples | Building cost, the bar, parking, land a unit, 850 sq ft a home, 10 ft a story, 60% AMI |
| Your values | The screens |
| Not modeled | See Limits |

**What happened in practice** (shown when the inclusionary requirement or the bonus moves): the City Controller's June 2025 special report on inclusionary zoning. By early 2025, 35 of the 116 IZ homes expected in Lawrenceville were occupied, and the effect on production was inconclusive.

**Second opinion:** Claude Haiku, on a click, reads the scenario's facts. See docs/data/project_review.md.

**Export:** a CSV of every tract, today and with your rules:
- result and change;
- why;
- units and income-limited homes;
- return and gap;
- zoning;
- homes by right;
- transit and risk.

## Readings at the defaults

On 2026-10-28, with today's rules (amortizing loan, operating cost not capped):
- **Market-rate 40-unit, 4-story building:**
  - Zoning allows it by right in 60 tracts and not in 55; in 13 the zoning is not read.
  - It works by right in 1 tract. In 2 of the 13 not read the money would work, but they are not counted: check the code there.
  - The median gap where it falls short is about $240k a unit.
  - If building cost $50 a sq ft less or more, it would work in 0 to 1 tracts.
  - New construction at Pittsburgh asking rents rarely pencils at market rate, so most policies move the gap rather than the count.
- **Removing parking minimums:** the building is better off in 60 tracts, by about $18k a unit; still 1 works.
- **The old lot minimums:** they take 7,390 homes by right away (44,279 → 36,889).
- **A 20% set-aside citywide:** a trade-off. It asks 1,024 homes with an income limit across the test buildings (68 today), and the building works in 1 fewer tract and is worse off in 55.
- **Up to 3 homes on house lots:**
  - It adds 120,263 homes of zoning room (44,279 → 164,542), on lots that exist and are lived in. That is room, not homes built.
  - A triplex becomes allowed by right in 116 tracts, from 105.
- **The height bonus:** a market-rate developer takes it in 6 tracts, but nothing else changes.
- **Senior housing with tax credits:** never allowed by right. It needs a hearing in 60 tracts and is not allowed in 55. Even with a hearing it falls short everywhere, by a median of about $15k a unit; a $50k gap subsidy a home makes it work with a hearing in 59.

## Limits

This is a policy screen, not a feasibility study:
- **Scale:** one test project, one rent a tract.
- **Zoning:** read from the tract's lots by district, not from a lot of the size the project needs.
- **Credits:** 9% credits are competitive, and the lab does not ration them.
- **Examples:** parking cost, the abatement and subsidy amounts, the bar and building cost.
- **The bonus:** assumes the lot can carry the height.
- **No market response:** land prices, rents and builders do not respond to a policy or to the bus.
- **Room, not homes built:** homes allowed by right are not a forecast of homes built.
