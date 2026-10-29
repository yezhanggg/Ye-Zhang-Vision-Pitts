# Place in three levels, and real lots at the Parcel level

Added October 27, 2026. Online only: the offline single file keeps the earlier Place page.

Analysis > Place works at three levels, picked at the top of the left panel. Every level has the same project inputs, in numbered groups that apply at once (`app/src/components/place/levels/levels.ts`). The right panel answers them in the same order.

| Level | Left panel | Where the project is read |
|---|---|---|
| **Parcel**: one specific project on one real site | 1 Site (the lot picked) · 2 Project (development type, then units or floor area, stories, income level, unit mix) · 3 Capital · 4 Open space · 5 Policies | The lot picked |
| **Tract**: a neighborhood | 1 Project · 2 Capital · 3 Open space · 4 Policies | A lot of the size the project needs, in a district there that allows it |
| **ZIP code**: a wider area | 1 Project · 2 Capital · 3 Open space · 4 Policies | The ZIP's main tract with the most renters, its mix and rents from the ZIP |

The answer is the same at every level ([project_review.md](project_review.md)): the verdict, four takeaways (zoning, size against what is allowed by right, capital, tax credit score or developer equity), the review, the capital stack, the tax credit score (not at ZIP level), what you are studying, and open space and sun.

Before a site is picked, the Parcel level offers **Find places for a project** ([finder.md](finder.md)). It ranks places by whether the project pencils, so it sits with the money.

The level is held for the session, not in the link. A link that carries a pin opens on the Parcel level. At the Parcel level the map draws lots, not census tracts.

## Development type and the zoning check

The Project step starts with the development type: **Market**, **Affordable**, **Senior**, **Mixed use** (homes over ground-floor commercial) or **Commercial** (`app/src/lib/project/devType.ts`). The type sets the income levels on offer (none to pick for market rate), the residents (Senior: 62 and older) and the financing that follows (tax credits where homes carry an income limit). Commercial, and the commercial floor of mixed use, get the zoning check only, with no money test (Ye, October 27, 2026).

As the type and size change, the right panel says whether zoning allows the project as set (`app/src/lib/zoning/check.ts`): **Allowed by right**, **Needs a hearing**, **Not allowed as is** or **Check the code** (no district read). The checklist reads the use (by type and number of units), the density by right, the height in stories, the lot size, the floor area the envelope holds, and, as information, the inclusionary overlay, parking and the flood zone. It is a reading of the zoning code, not a zoning determination.

## Policies: what applies, and what you want to study

The Policies step has two parts (`app/src/components/place/levels/Policies.tsx`), at all three levels:
- **Applies here** is read automatically: binding rules (the inclusionary and floodplain overlays) and what the place is eligible for (the QCT/DDA basis boost, the height bonus for affordable homes, a neighborhood plan).
- **I want to study** lists what the person may want to be eligible for or take into account: PHFA's draft plan, the Affordable Housing Bonus, the Housing Opportunity Fund, the tax abatement, parking near transit, displacement risk, frequent transit and the flood zone. Each one checked shows its result on the right under **What you are studying**.

## Capital: a simple pro forma

Capital follows Ye's class skeleton financing model (LAW 667, In Class Exercise Skeleton Financing Model_v2): one page of uses, sources, years of operations and, for market rate, a sale (`app/src/lib/pencil/simple.ts`, tested against the workbook's own numbers in `simple.test.ts`). It runs at every level, on the lot the project is read on.

| Part | How |
|---|---|
| Uses | Land (acquisition) · hard cost = $ a sq ft × the homes' gross floor area · commercial space = its sq ft × its build cost (mixed use) · soft cost = a share of land, hard and commercial cost · financing = loan × rate ÷ 12 × months of construction + an origination fee · developer fee = a share of all of those · total |
| Sources | Loan = loan-to-cost × (land + hard + commercial + soft) · LIHTC equity (tax credit paths) · historic tax credit equity = (total − land) × 20% × its price, the workbook's HTC line, for a certified historic rehab of any kind of housing · other subsidy = a share of the total · deferred developer fee = a share of the fee · what is left: **developer equity** (market) or **Gap to fill** (tax credits) |
| Operations | Revenue = the unit mix's rent a year after vacancy, plus commercial rent after its vacancy, growing 2% a year · operating cost = $ a unit a year × units, growing 3% · NOI · debt service = the full loan payment · DSCR · cash flow. Market rate: years 1–7. Tax credits: years 1–15, the compliance period |
| Sale and return (market rate only) | Sale price = year-7 NOI ÷ the exit cap · less the loan balance still owed · the developer gets back the cash flow, the net sale and the fee paid · multiple of equity. Tax credit deals keep the homes: no sale and no multiple |

Choices that go beyond the workbook (whose sources also carry New Markets Tax Credits, left out here because they fund community facilities and commercial space, not rental housing):
- **Vacancy** comes off the rent first, as Ye asked.
- **The loan amortizes.** "Amortization, years" starts at 35 on tax credit paths and 30 for market rate. 0 makes it interest only, as the class workbook has it. The full payment drives the DSCR, the cash flow and the loan sizing. At the sale the payoff is the balance still owed (all of the loan when interest only).
- **Operating cost** is $ a unit a year as entered, with no cap.
- **LIHTC equity** is one line: (total − land − commercial) × 130% in a QCT or DDA × the share of units that count × the credit rate (9% or 4%) × 10 years × the credit price, held to PHFA's 9% cap. It is sized to need, as PHFA does: never more than the cost the other sources leave, the historic credit included.
- **Units that count toward credits** (`creditUnits`): units at 60% AMI or below. With income averaging (at least 40% of units with an income limit, averaging 60% AMI or less), every unit with an income limit counts. Under the federal minimum set-aside (20% of units at 50% AMI or 40% at 60%), none count. Units at 80% AMI earn no credits, so the gap shows.
- **The historic credit** is not sized to need. It is off until the person says the building is a certified historic rehab (on the National Register or contributing to a registered district, with the rehab approved by the National Park Service), and its price starts at the workbook's $0.82.
- **Mixed use** adds ground-floor commercial: the Project input "Ground-floor commercial, sq ft" (3,000 by default; else the homes' footprint), an example rent of $18 a sq ft a year on a net lease, 10% vacancy, and a build cost equal to the homes' hard cost. It is kept out of the credit basis.

The left panel groups the inputs in the workbook's order: uses, the loan, tax credits and subsidy, operations, ground-floor commercial (mixed use), and the sale (market rate), with origination and the growth rates under More. The rent of each unit size is listed with its source (asking rent or ZIP Small Area FMR for market units; the AMI limit less utilities for income-limited units), and each rent can be changed.

Every input starts as a value **suggested** for the development type (`app/src/lib/project/capital.ts`; no AI call), or **sourced** from PHFA's underwriting on tax credit paths (5% vacancy, 2% and 3% trends), until the person changes it (**yours**, with a reset):

| Input | Market | Mixed use | Affordable or senior |
|---|---|---|---|
| Land | the lot's sq ft × $20 (an example: enter the asking price); $15,000 a unit when there is no lot area | same | same |
| Construction cost | $300 a gross sq ft (the pencil's example) | same | same |
| Construction period | 14 months | 20 months | 18 (affordable) or 16 (senior) months |
| Loan-to-cost, at most | 65% | 60% | 20% with 9% credits, 45% with 4% credits and bonds |
| Interest rate | 7% | 7% | 6.25% |
| Amortization | 30 years | 30 years | 35 years |
| Vacancy | 6% | 7% | 5% (PHFA, sourced) |
| Operating cost | $6,850 a unit a year (the pencil's $6,500 plus $350 reserves) | same | $7,000 (PHFA's $500 reserves; $6,875 for senior, $375) |
| Exit cap | 6% | 6.5% | none (no sale) |
| Ground-floor commercial | none | $18 a sq ft a year, 10% vacancy, the homes' hard cost | none |
| Soft cost, developer fee, deferred fee | 20%, 4%, none | same | 25%, 10%, 25% |
| Historic tax credit | off; $0.82 a credit when on | same | same |

The land follows the lot the project is read on: at the Parcel level the lot picked, at the Tract and ZIP levels the lot the project needs there. It is the same at any unit count.

The suggested loan is the smaller of that loan-to-cost and the loan whose full payment year-1 income covers at the coverage a lender asks for (1.20, or PHFA's 1.15 on tax credit paths). On tax credit paths it is also held so cash flow stays above zero for 15 years. So the suggested stack starts out covered.

The Capital takeaway:
- **Market rate:** **Loan not covered** when year-1 DSCR is under 1, **Loses money** when the developer gets back less than they put in, **No equity needed** when the other sources cover the cost, and the multiple of equity otherwise.
- **Tax credits:** **Gap to fill $X** or **No gap**. Until the tax credit score meets PHFA's minimum it reads **No gap if credits are won**: amber, or red when even every line on the score sheet at its top cannot reach the minimum.
- Any year with negative cash flow, or a DSCR under 1, keeps the tile from green and adds a finding to the review.

The place's PDF and CSV carry the same numbers (`capitalReport` in `app/src/lib/project/report.ts`). The PDF leads with the project tested, its verdict, its inputs and the rent table. The CSV adds the verdict, inputs, unit mix, rents, the tax credit score (minimum and best case), findings and fixes. Find places keeps the full pencil (sources and uses under PHFA's rules, [pencil.md](pencil.md)).

## Parcels in Explore

Explore lists **Parcels** with the boundaries, one open at a time (`app/src/components/explore/ParcelsSwitch.tsx`, `ParcelsBoundary.tsx`). Turning it on closes the other boundaries and zooms in to where lots show. A click on a lot shows its facts. With Sun and shadow on, the lots show their sun ("By parcel"). Sun and shadow, like the variables, is listed under Data only once a boundary (or Parcels) is open.

## Picking a lot

There are three ways to pick a site:
- **Click a lot on the map.** Lots show from zoom 14.5, with vacant lots tinted.
- **Search an address.**
- **Drag the pin.**

For an address or a pin, the lot is the smallest one holding the point. If no lot holds it, the nearest lot within 30 m is taken, because geocoded addresses fall on the street in front.

Picking a lot fills the site's district, lot area and frontage, which stay editable. It also moves the tract selection to the lot's tract. It suggests units and stories that fit the lot, marked suggested, but never over values the person typed (`suggestForLot` in `app/src/lib/project/draft.ts`). Leaving the Parcel level puts the example back. Phones load no lot outlines, because a dense chunk is several megabytes, but the address box still finds a lot there.

Code:
- `app/src/lib/parcel/lots.ts`: finding a lot at a point, and reading its facts.
- `app/src/lib/parcel/usePlaceLots.tsx`: the lot layer on the map.
- `app/src/lib/parcel/pick.ts`: picking a lot.
- `app/src/components/place/levels/`: the three levels.

## The lot files

**Shapes:** `app/public/data/parcel-shadow/` (`scripts/15_build_parcel_shadow.py`, [shadow.md](shadow.md)). These are the county's lot outlines, about 58 MB in 23 chunks. Each lot carries:
- its county lot and block label;
- its assessed use class;
- its shape area;
- its share of three days in shadow.

**Facts:** `app/public/data/parcel-lots/` (`scripts/22_build_lot_facts.py`, `src/visionpitts/lot_facts.py`). About 4 MB, in the same 23 chunks and keyed by the lot label. 142,366 labelled lots; 142,160 have a district. For each lot:
- **District:** the one at the lot's representative point, from the City's full-resolution zoning map (the same reading as `zoning_capacity.city_lots`).
- **Lot area:** the assessment's LOTAREA, else the shape's own area.
- **Frontage and depth:** the short and long sides of the lot's smallest rotated rectangle, scaled to its area (`zoning_capacity.lot_dims`). This is a rough reading of an irregular lot.
- **Homes today:** from the assessed use (single family 1 through four family 4). Unknown for other uses.

A lot goes into the chunk that holds its representative point, using the z13 web map tile (`parcel_shadow.tile_xy`). A test holds every labelled lot in the shapes to having facts in the same chunk.

Rerun step 22 after the parcels, the assessments or the zoning map change. Rerun step 15 when the shadow run changes.

## Privacy

These are lot facts only:
- lot number, area, use class, zoning district, rough shape, homes today and sun;
- never a parcel ID, an owner, an address on record, a value or a sale.

Ye chose to publish real lots on 2026-10-27, and the README's privacy line names this exception to "census tracts or larger".

## Limits

- **District:** the district at the lot's center. A lot split by a district line reads one side.
- **Frontage and depth:** a rectangle reading, not a survey. Corner and flag lots read poorly.
- **Homes today:** read from the assessed use. Apartment buildings show as "not recorded".
- **Inclusionary overlay at the pin:** a reading on the City's simplified outline, so a pin within a few feet of its edge can read either way.
- **Lot sun:** the whole lot seen from above (roof, yard and trees together), from the 2015 surface.
- **ZIP counts:** the ZIP level counts a tract as in the inclusionary overlay only from 1% of its area. Smaller shares are slivers where the two maps meet.

## Explore: Parcels (2026-10-29)

Under Boundary, **Parcels** draws the county lots from close zoom. Clicking a lot fills the right panel with its facts and zoning (the same card as Place's Site and zoning) and a **Test a project on this lot** button that opens it in Place at the Parcel level. With Parcels open the Data layers work by lot: the **land-use map** colors each lot by its own assessed use (grey: other or no record), the **zoning map** shows through lot outlines, **sun and shadow** reads by lot, and the **canopy map** draws over them. Census figures are counted by area, so they need a boundary.
