# Tax credit score sheet (Analysis, Place page)

Added October 2026. A self-scoring sheet for Pennsylvania's Low Income Housing Tax Credits, filled in for the
selected place. It is not a score from the Pennsylvania Housing Finance Agency (PHFA), and it is not a prediction of
an award. Nothing in it enters VisionPitts' own scoring.

## Where the rules come from

Read on 2026-10-11 from phfa.org:

| Sheet | Document | Dated | Status |
|---|---|---|---|
| 2025/2026 | [2025 & 2026 Qualified Allocation Plan](https://www.phfa.org/forms/multifamily_application_guidelines/guidelines/2025/2025-mpg-03.pdf), Exhibit SC2025/2026 | 2024-12-19 | Adopted |
| 2025/2026 | [Tab 3, Selection Criteria Self-Scoring](https://www.phfa.org/forms/multifamily_application_guidelines/submission/tab_03/tab_03.pdf) | 2024-12-04 | In use |
| 2027/2028 | [Draft Qualified Allocation Plan for public comment](https://www.phfa.org/forms/multifamily_news/news/2026/2027-2028-draft-qap.pdf), section 4 | 2026-07-13 | Draft |

The draft's [hearing notice](https://www.phfa.org/forms/public_hearing_notice/2027-2028-QAP-PH-Notice.pdf) set the
hearing for July 29, 2026 and took written comments until August 14, 2026. No adopted 2027/2028 plan was found on
PHFA's site on the day of reading, so the draft is shown as a draft.

The points, tiers and caps are PHFA's, transcribed by hand into `app/src/data/lazy/lihtc_pa.json`. Two things in
that file are this project's reading and not PHFA's wording: the short text of each rule, and the `basis` of each
line (who or what decides it: the place, a score to look up, the parcel, the design, partners, the team, the
financing).

## The two sheets

| | 2025/2026 (adopted) | 2027/2028 (draft) |
|---|---|---|
| Total | 232 points | 205 points |
| Minimum for 9% credits | 125 (new construction or substantial rehabilitation), 110 (preservation) | 120 |
| Minimum for 4% credits | 110 | "the minimum threshold points" (120) |
| How a line scores | Points on a scale | Pass or fail: Pass-Exceed 10, Pass-Basic 5, Fail 0 |
| Community and economic impact | 37 | 30 |
| Resident population and services | 62 | 45 |
| Development characteristics | 35 | 20 |
| Development team and process | 93 | 70 (team and commitment of funds) |
| Noncompliance | up to 10 taken away | 20 |
| Cost | suspended (10, not in the 232) | 20 (cost efficiency) |
| Complete application | 5 | none |

What changes for a site in the draft: Passive House, Zero Energy Ready Home and residential infill no longer score;
transit and walkability score only together (within half a mile of a stop and a Walk Score above 75, for 5); the
underserved-area line is read from a score on PHFA's PolicyMap instead of from the market study.

## What the place settles, and what it only informs

| Line | 2025/2026 | 2027/2028 draft | From the place |
|---|---|---|---|
| Transit-oriented design | A.2.d, 2 points | 4.2.3, with walkability | Measured: share of the tract's lots within 2,640 ft (straight line) of a transit stop. Counted when at least 99.5% of lots are; otherwise left to the person, with the share shown. Can be overridden for a site. |
| Walkability | A.2.e, up to 2 | 4.2.3 | Not measured. Walk Score is a commercial product; the sheet takes the number and links to walkscore.com. |
| Area of opportunity | A.1.a, up to 13 | 4.2.1, PolicyMap score | Not scored here. The tract's poverty rate, owner share and home value are shown next to the line. |
| School performance | A.1.b, up to 2 | not in the draft | Not measured. The sheet takes the proficiency percentage. |
| Smart site selection | C.1, up to 10 | 4.4.1 and 4.4.2, 5 each | Not decided by the tract. Vacant lots of 2,000 sq ft or more, and how many are mostly open, are shown next to the infill line. |
| Zoning approvals | D.3, up to 10 | not scored | Not decided by the tract. The share of land where small apartment buildings read as allowed is shown (unverified reading of the zoning map). |
| Energy and green building | C.2, C.3 | 4.4.3, 4.4.4 | Not decided by the tract. Hours of sun and tree canopy are shown. PHFA gives no points for sun or trees themselves. |
| 130% basis | not points | not points | Qualified Census Tract and Difficult Development Area flags from the place data. More equity, no points. |
| Pool | urban | urban | PHFA lists the City of Pittsburgh as an urban area, so the urban tiers are used throughout. |

Everything else on the sheet (unit mix, services, accessibility, team, financing) is entered by the person.

## What the plan answers (`app/src/lib/lihtc/fromPlan.ts`; added October 15, 2026)

The rest of the project card (the unit mix in "Who needs it" and the pencil) answers some lines itself. Each such line shows "From your plan" with its arithmetic. A number typed on the line always wins, even an explicit "none", and "Use the plan" brings the plan value back.

| Line | 2025/2026 | 2027/2028 draft | From |
|---|---|---|---|
| Homes at or below 50% AMI | B.1 | 4.3.1 | homes at 30% or 50% AMI ÷ all homes in the mix, market-rate homes included |
| Homes for large families | B.4 | 4.3.4.a | affordable homes with 3 or more bedrooms ÷ all homes. Not answered at 7 stories or more; senior housing does not see the line at all |
| Private capital and soft debt | D.4.b | | the pencil's permanent loan and soft funds ÷ total development cost |
| Commitment of funds | | 4.5.9 | the pencil's deferred developer fee ÷ developer fee: under 10% or 10–30% |

Every tier keeps PHFA's strict "over", so exactly 10% of homes at 50% AMI earns nothing on B.1.

Two lines are only hinted at, because they need documents the arithmetic cannot supply. D.4.a "fully funded" (a gap under 25% of the developer fee) needs every commitment in place. A.2.c and A.2.i "mixed income" need a shown financial benefit and are not allowed with income averaging.

**Changes to your mix that score.** For the income-targeting and large-family lines the plan answers, the sheet finds the smallest change to the mix that reaches the line's next step. It rescores the whole sheet with PHFA's caps and lists the change with what it adds, for example "5 more affordable homes with 3+ bedrooms (7 of 40, over 15%): +6".

**Tax credit homes nearby.** HUD's property database, through the demand file of step 17, gives the tax credit homes in the tract, within a mile and placed in service in the last 20 years. They are shown beside A.1.a and A.1.c (2025/2026) and 4.2.1 (draft): PHFA's own market-study and PolicyMap reading asks how much affordable housing is already there and how recent it is. They add no points.

Left typed on purpose:

- **4.7.1** (cost against the round's median), known only after the round closes;
- **Third-party scores:** PolicyMap and Walk Score;
- **A.1.b school score,** 2 points on the adopted sheet only. The repo has no public school feeder boundaries.

## How the sheet adds up (`app/src/lib/lihtc/score.ts`)

1. Each line earns points from its entry: a check earns the line's points, a choice earns its option's points, a
   number earns the best step it reaches (`over` is strictly more than, `from` is at least), and a few lines take
   points directly.
2. Shared ceilings are applied: 2025/2026 caps smart site selection (C.1) at 10, C.1 to C.3 together at 30, the
   development team (D.1) at 41 and commitment of funds (D.4) at 27. In the draft the housing authority subsidy
   counts only when the large-family line does not pass.
3. Each section is held to its maximum, and the sections are summed.
4. "To score higher" lists every open line with what raising that line alone to its top would add to the total, caps
   included, largest first. A tiered line also shows its next step.

The most a development can reach is computed the same way with every line at its top: 231 for new general-occupancy
housing on the 2025/2026 sheet (section A offers new construction 36 of its 37), 232 for preservation, 221 for
senior housing (no large-family line), and 205 (200 for senior housing) on the draft.

Entries about the project stay when another place is picked. Entries about the site (transit, Walk Score, school
score, the kind of parcel) are kept per place. They are saved in the browser only.

## Oddities in PHFA's own documents, kept visible

- The 2025/2026 minimum for 9% credits is 125 in the scoring table and on the self-scoring sheet, and 120 in
  sections 4.3 and 4.5 of the plan. The sheet uses 125.
- The self-scoring sheet totals section D as 91 in one place and 93 in another; its lines add up to 93.
- The 2025/2026 table for minority, women's and veteran business participation (D.2) lists 1 or 2 points per firm
  type while capping the line at 15. The sheet takes the points as entered, up to 15.
- The draft's summary table still carries the old exhibit name, and its text for section 4.4 mentions 35 points where
  the table gives 20. The sheet follows the table.

## Limits

- A self-score. PHFA scores every application, and several lines are PHFA's judgment of documents.
- Passing the minimum does not win credits. Awards go to the highest scores within each pool and preference.
- The draft can change before adoption. Check PHFA's site before relying on it.
- The tract is not the site. One line is measured for the tract; a parcel at its edge can differ, which is why the
  transit line can be overridden.
- Suburban and rural tiers, and the non-participating-jurisdiction tiers for soft funding, are not shown: the app
  covers the City of Pittsburgh.
- The sheet is not in the offline single file (`export/index.html`), which has no room for it.

## Checks

`app/src/lib/lihtc/score.test.ts` (20 tests): the transcribed sections add up to 232 and 205; every choice and tier
reaches its line's maximum; the minimums by kind of application; the maximums above; tier edges (10% earns nothing,
10.1% earns 4; a Walk Score of 70 earns 1 and 80 earns 2); each cap; the transit override; and that a full sheet
reaches the maximum with no open lines.
