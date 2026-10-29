# The project review

Added 2026-10-27. Every Place level (Parcel, Tract, ZIP code) and each side of Compare places answers with the same review of the project as set on the left. It re-runs on every change of the inputs. Code: `app/src/lib/review/` (`review.ts`, `fit.ts`, `ai.ts`), wired in `app/src/components/place/levels/useReview.ts` and shown by `ProjectResults.tsx`.

## Where the project is read

| Level | Site read |
|---|---|
| Parcel | The county lot picked: its district, area, frontage and depth (lot facts). |
| Tract | Among the tract's districts whose use allows the project by right (those within its height first, then the most common), the lot it needs there (`lotFor`), no smaller than the tract's median vacant lot. When no district allows it, a typical lot of the most common district, so the check says why it fails. |
| ZIP code | The model runs on the ZIP's main tract with the most renters. The mix and the fit follow the ZIP's renters (ACS), and the rents follow the ZIP's own asking rent where it has one. Zoning is read as at the Tract level, and the review counts the tracts where the project is allowed by right. |

The review also reports the share of the tract's lots zoned to allow the project by right, and warns when the lot it needs is bigger than the tract's largest vacant lot.

## The checks

**Zoning**
- Use, units by right and minimum lot: `lib/zoning/check.ts`.
- **Fits on the lot**, at every level: the footprint at these stories against the lot less its open space (held to the coverage limit), and, in RM and the mixed-use districts, the floor area against the envelope. It counts in the verdict. The left panel, the Open space card and the units takeaway use the same numbers.
- Height in feet: stories × 10 ft against the district's limit, alongside its story limit. For example, 9 stories in RM-H is within its 9 stories but 90 ft against an 85 ft limit, so it warns.

**Overlays**
- **IZ-O (§907.04.A):** with 20 or more units, at least 10% (rounded up) at 50% AMI or below.
  - On tax credit or own mixes the review counts the mix's homes at 30% and 50% AMI and stops when they fall short, with a fix.
  - On market financing the pencil applies the set-aside to the rents on its own, and the review says so.
- **Floodplain:** the tract's FEMA share.
- **Historic tax credit:** needs a certified building and a National Park Service-approved rehab. No historic district data is read.

**Fit with the area**
- **Capture:**
  - At Tract and Parcel: homes with an income limit against the renter households at or under the highest level in the mix (HUD CHAS 2018–22), less the tax credit homes already there.
  - At ZIP level: the ZIP's ACS B25118 households cut at the 3-person limit.
  - Tones: 10% or less is ok, up to 15% is a stretch, above 15% is too few. This is the market depth screen's capture range (docs/data/finder.md).
- **Unit mix:**
  - Bedroom shares against renter household sizes: 1–2 people → studio or 1-bedroom, 3–4 → 2-bedroom, 5+ → 3-bedroom.
  - A gap above 15 points warns.
  - An own mix is offered the renters' split.
- **Seniors:** senior units against elderly renter households (62+, CHAS household types) at or under the income level.
- **Market renters:** market units against renter households above 80% AMI. A warning above 15%.
- **Displacement risk:** the HNA score at or above 0.67 with no units carrying an income limit warns, and a fix offers 10% at 50% AMI.

**Money** (the simple pro forma, docs/data/parcel_level.md)
- Year-1 DSCR against the coverage asked for.
- Cash flow in every year of the run (7 years market, 15 tax credit). A negative year stops, or warns on tax credit paths after year 10, as PHFA allows.
- **Market rate:** the multiple of equity against 1.5×. That bar is a common one, not a rule. Below it: the rent a unit a month that would reach it (solved on the same pro forma, holding the loan), and, at 12 units or more, an offer to test the project as Affordable.
- **Tax credits:** no sale and no multiple. The gap to fill after every source, with an offer of added subsidy.
- **Units that earn credits:** only units at 60% AMI or below count (with income averaging and the federal minimum set-aside, docs/data/parcel_level.md). With none, it stops and offers "Use ≤50% AMI".
- **Too small for tax credits:** under 12 units (`MIN_CREDIT_UNITS`) a tax credit project stops, because such deals rarely carry their fixed legal, syndication and compliance costs. No fix cuts a tax credit project below 12 units. Offered instead: Market rate at the most units that fit (only when it works), reading it at the Tract level, and Find places.

**Tax credit score** (tax credit paths; not scored at ZIP level, because PHFA scores a site)
- `high`: the score with every design and financing line at its top. `most`: every line at its top, the team, partner and site lines included (`pointsOf` in `lib/finder/rank.ts`).
- `most` under PHFA's minimum: a stop. The place holds it back, so it doesn't work as is.
- `high` under the minimum but `most` at or above it: works with changes; the other points must come from team, partner and site lines.
- Otherwise: it needs the missing points from commitments on the score sheet.
- The credits are "not won yet" until the minimum is met.

## Verdict and fixes

**Verdict:**
- Doesn't work as is: any stop.
- Check the code: the district is not computed.
- Works with changes: any warning.
- Works: neither of these.

The line under the verdict is the first stop, or else the first warning, in the order zoning, height, overlays, money, fit.

**Fixes** are computed changes, at most three, with the ones that answer a stop first:
- the units allowed by right or that fit the lot (never under 12 on tax credit paths);
- the stories within the height, or the stories that fit the lot;
- the units needed at 50% AMI (an own mix; market and mixed-use projects keep market financing);
- the loan sized to the income;
- the renters' split;
- the type;
- added subsidy;
- ≤50% AMI, when no unit earns credits;
- on tax credit paths: Market rate, the Tract level, 4% credits and bonds, the score sheet, Find places.

The rent a market project needs is shown as a number, with nothing to apply.

## Second opinion (AI)

On a click, the review's inputs, verdict, findings and fixes go to `api/chat.ts` in mode `review`:
- **Model:** Claude, `claude-haiku-5-5` unless `REVIEW_MODEL` is set.
- **Answer:** at most 90 words: one sentence, two risks, one change to try.
- **Numbers:** they go through the chat's number check.
- **Role:** the rules set the verdict; the model only reads it.

It needs `ANTHROPIC_API_KEY` on the deployment, and says so when it is missing. It is cached per facts for the visit and is off in the offline file.

## Limits

A reading of the code and public data, not a zoning determination or a market study:
- Districts that are not computed (height maps, downtown, riverfront, special and planned districts) say so.
- Lot coverage and FAR exist only where the standards set them.
- No historic, height-map or parking-reduction overlays are read.
- The IZ-O is read at the pin, or at the tract's share when there is no pin.

## Browse

Above the inputs, **Browse | Test a project** switches every level between testing a project and a short overview of the place (`components/place/levels/Overview.tsx`). The overview shows, top to bottom:

1. **Best fit:**
   - **Type:** the suggestion rules at the project's income level and residents, ordered by the Balanced weights. It is the same suggested type as the fit order, Explore's "Suggested here" and Compare. On a lot, the first suggested type the lot allows by right.
   - **Size:** 1 unit for an ADU, 3 for a duplex or triplex, 6 for townhomes. Apartments and senior housing use the market depth: 8–40 units for apartments, 20–60 for senior housing.
   - **Mix:** the renters' split.
2. **Income:** renters by income band, with the cost-burdened among them (tract: CHAS; ZIP: ACS cut at HUD's limits).
3. **Rent:** the 2-bed asking rent and the median rent paid, against what a 2-bed household can pay at 30, 50 and 80% AMI.
4. **Renters:** household sizes, seniors 65+, people living alone.
5. **Ten-year trend:** the change in renter households, median rent and household income (the median of all households), with the ACS years.
6. **Zoning:** the tract's vacant lots and the homes they allow by right; on a lot, what that lot allows.

"Test this project" carries the type, income level, size and stories into the inputs and switches to Test a project.
