# Who needs it: renter demand, unit mix and tax credit supply (Analysis, Place page)

Added October 2026. Question 1 of the Place page's project card ("Test a project here"), also shown side by side in Compare places. For the selected tract it reads who rents there, in the tract's ZIP code and in the city. It turns that into an order for the suggested building types and a unit mix for the planned number of homes. It also shows how today's renters are housed, what their homes rent for, how deep the qualifying market is and which tax credit homes are already nearby. Nothing here enters VisionPitts' scoring. The card is online only; the offline single file has no room for it.

Built by `scripts/17_build_demand.py` (`src/visionpitts/demand.py`) into `app/src/data/lazy/demand.json`. Rules: `app/src/lib/demand/` (`signals.ts`, `order.ts`, `mix.ts`, `interp.ts`). Card: `app/src/components/place/project/DemandMix.tsx`; ZIP view: `ZipDemand.tsx`.

## Sources

| Table | What it gives |
|---|---|
| ACS 2020–2024 B25009, tenure by household size | Renter households of 1 to 7+ people |
| B25042, tenure by bedrooms | Renter-occupied homes with 0 to 5+ bedrooms |
| B25068, bedrooms by gross rent | Renter homes by size and rent bracket |
| B25118, tenure by household income | Renter households in 11 income brackets |
| B25119, median income by tenure; B25064, median gross rent | Rent over renter income |
| B25032, tenure by units in structure | Renter homes in 1–4 unit buildings |
| B25007, tenure by age of householder | Renter householders 65 and older |
| ACS 2010–2014 and 2020–2024 (step 09's history files) | Renter households then and now (households × renter share, on 2020 tracts) |
| HUD Low-Income Housing Tax Credit property database | Tax credit properties in Allegheny County: homes, year placed in service, credit type, location |

The levels are the 128 city tracts, the 32 city ZIP codes (census ZCTAs, read whole, including any part outside the city) and the city. Before a fetch is used, the script checks 17 stem numbers against the labels in the API's variable list and stops if any changed. It also checks that renters by size, bedrooms, income and age each add up to the city's 72,332 renter households, and that every tract's renters by size add up to its renter total.

From HUD's layer only property fields are read: name, city, ZIP, homes, homes by bedroom, years, credit and bond flags, target population, location. The contact, company and telephone fields are never requested. The layer held 215 Allegheny County properties with 7,378 tax credit homes when read; 102 of them, with 3,845 homes, are in the city.

## Demand signals

Five shares, each with the ACS proportion margin of error (90%):

| Signal | Share | Mark |
|---|---|---|
| Renting households | renter households ÷ all households (B25009) | 5 points |
| One-person renters | 1-person ÷ renter households (B25009) | 5 points |
| Renters, 5+ people | 5, 6 and 7+ person ÷ renter households (B25009) | 2 points |
| Renters 65+ | householders 65 and over ÷ renter householders (B25007) | 5 points |
| Renters in 1–4 units | homes in 1-unit (detached and attached), 2 and 3–4 unit buildings ÷ renter homes (B25032) | 10 points |

City values: renting households 52.3%, one-person renters 52.3%, renters of 5+ people 4.3%, renter householders 65+ 13.9%, renter homes in 1–4 unit buildings 52.8%.

A signal reads "above" or "below" the city only when the gap is at least the mark and larger than the tract's margin of error. The city's own margin is under a point and is ignored. Where the tract cannot tell (inside the mark, or a margin too wide), the tract's ZIP code is read the same way and the card says so. Tract margins are wide: one-person renters, for example, are ±20 points in Hazelwood. Without the ZIP fallback most tracts would read "near the city" on most signals.

Renter growth since 2014 and rent over renter income are shown in the same table, greyed. They never count: the growth has no margin of error (two surveys, the earlier one moved onto 2020 tracts), and rent over income is a ratio of two medians.

## Building type order

Each type is favored by named signals. This is a value judgment, printed on the card:

| Type | Favored by |
|---|---|
| Small apartment | one-person renters above the city; renting households above the city |
| ADU | one-person renters above the city; renting households below the city |
| Senior housing | renter householders 65+ above the city |
| Townhome | renters of 5+ people above the city; renting households below the city |
| Duplex / triplex | renters of 5+ people above the city; renter homes in 1–4 unit buildings above the city |

A type's score is how many of its signals the place shows. In `recommend()` (`app/src/lib/place/recommend.ts`) the score orders the types the stance allows: more signals first. Then come the household type CHAS counts most of at the income level, then the weighted fit order. With the household left on "Any", the CHAS household's own preference (seniors first, families first) gives way to demand. A household the reader chose still comes first. Transit-first and Climate-resilient keep their own fixed orders, and the stance rules still decide which types are suggested at all (tested: the set never changes, only its order).

On the city's 128 tracts at 50% AMI under Anti-displacement, demand changes the lead type in 44 of the 114 places with a suggestion. Under Market-led it changes 18 of 28. The map and the Compare page use the same order. The offline single file keeps the weighted order, because it does not carry the demand data.

## Unit mix

Renter households by size map to home sizes with the rule the answer card already uses: 1–2 people → 1-bedroom, 3–4 → 2-bedroom, 5 or more → 3-bedroom. The suggested mix for N homes ("Homes needed", or an example of 40 when that box is empty) splits N in proportion to the tract's renter households in those three groups, or the ZIP code's where the tract has none. The split uses largest remainders, so it always adds up to N. Every home starts at the planning income level. Studios are left to the person planning: the census does not split one-person households by the size of home they want. "My mix" replaces the suggestion with a grid of homes by income level (30, 50, 60, 80% AMI and market) and size (studio, 1, 2, 3+ bedrooms). The tax credit sheet and the pencil read that grid. It is kept in the browser only.

## How renters are housed today

Renter households of 1–2, 3–4 and 5+ people (B25009) beside renter homes with 0–1, 2 and 3+ bedrooms (B25042), each with its margin of error. Both tables describe the same occupied homes, so a difference says how today's renters are housed (for example small households in larger homes). It is not a count of missing homes. The card names a difference only when it is wider than the two margins of error combined.

## Homes renting below the rent that fits

For each size, the renter homes whose gross rent is below the rent that fits at the planning level (`ceilingRent`, the same figure as the answer card). B25068's brackets are under $300, $300–499, $500–749, $750–999, $1,000–1,499 and $1,500 or more. Homes in whole brackets below the line count fully; the bracket the line falls in counts by a straight line; the open top bracket is never split, so a line above $1,500 gives "at least".

## How deep the qualifying market is

A capture rate: the mix's homes with an income limit ÷ (qualifying renter households − tax credit homes already there).

- **ZIP code:** renter households under the 3-person income limit at the mix's highest level, from B25118 by a straight line inside the bracket (60% AMI = 50% limit × 1.2).
- **Tract:** CHAS renter households at or below that level (30, 50 or 80% only; CHAS has no 60% band).

It is a screen, not a market study. It does not know who would move in from elsewhere or which existing homes compete.

## Tax credit homes nearby

Tax credit homes in the tract, within a mile of its edge, and the ten nearest properties to its center (name, year placed in service, homes, credit type, miles). Within the mile the card also counts:

- homes placed in service in the last 20 years (PHFA asks how much affordable housing was built in the past 20 years);
- homes at least 30 years past placement;
- homes reaching 30 years within five years.

Each tract also carries `depth`: renter households at or below 60% AMI in the city tracts within the same mile (CHAS Table 8 bands from `place.json`; 60% interpolated as ≤ 50% plus a third of the 50–80% band). Find places and the size sweep turn it into market depth ([finder.md](finder.md)).

Thirty years is the federal 15-year compliance period plus 15 years of extended use. It is an assumption: properties placed before 1990 had less, and some carry longer terms. HUD's 8888 and 9999 years count as unknown.

## Limits

- **Margins:** tract figures are survey estimates with wide margins. The ZIP fallback reads a larger area that may include suburbs.
- **Ages differ:** the growth figure compares two surveys ten years apart, the earlier one moved onto 2020 tracts.
- **HUD lags:** the HUD file trails new awards by a year or more.
- **Not a market study:** the capture rate and the "below the rent that fits" counts are screens, not a market study, an absorption forecast or an appraisal.

## Rebuild

```bash
uv run --no-sync python scripts/17_build_demand.py             # cached ACS and HUD files; checks labels online
uv run --no-sync python scripts/17_build_demand.py --refresh   # refetch both
```
