# What can be built: zoning capacity (Analysis, Place page)

Added October 2026. Question 2 of the Place page's project card ("Test a project here"), also shown side by side in Compare places. It reads Pittsburgh's zoning code for the selected tract:

- the homes its vacant lots allow by right;
- lived-in lots that could hold more homes than they do;
- the districts present and what each allows for the suggested type;
- the inclusionary housing overlay;
- **Try a lot**: pick a district (those in the tract first, with their lot counts) and a lot size (typed, or the tract's typical vacant lot, the district minimum, 5,000 or 10,000 sq ft, half an acre or an acre). It gives the homes allowed by right, height, stories and floor area, how the district treats each building type, the smallest lot that holds the project's homes in that district, and a button that sends the homes to the project.

It is a reading of the code, not a zoning determination: confirm with the Zoning Administrator. Nothing here enters VisionPitts' scoring. The card is online only.

Standards: `config/zoning_standards.json`, transcribed by hand. Build: `scripts/18_build_zoning_capacity.py` (`src/visionpitts/zoning_capacity.py`) into `app/src/data/lazy/zoning_capacity.json`, with a copy of the standards. Rule in the app: `app/src/lib/zoning/capacity.ts`, held to `tests/fixtures/zoning_capacity_cases.json`. Card: `app/src/components/place/project/BuildCapacity.tsx`.

## Where the rules come from

Read on 2026-10-15 from the City's code on eCode360, which shows it current through 2026-09-16:

| Section | What was taken |
|---|---|
| §903.03 Development Subdistricts (Ord. 10-2025, effective 2025-05-07) | Minimum lot size, setbacks and height for the five densities (VL, L, M, H, VH), separately for the R1D, R1A, R2 and R3 districts and for RM |
| §904.01–§904.04 | NDO, LNC, NDI and UNC: floor area ratio, lot coverage, rear setback, height |
| §911.01–§911.02 Use Table | Which housing uses each district allows: P by right, A administrator exception, S special exception, C conditional use, blank not permitted |
| §912.08 | Accessory dwelling units: only inside an Accessory Dwelling Unit Overlay District |
| §914.02 | Parking minimums and maximums for housing |
| §907.04.A | The inclusionary housing overlay (IZ-O) |
| §925.06 | Contextual setbacks |

Each district row in the standards file names its section and is marked verified. The 18 residential codes on the map (R1D-VL to RM-VH) and the four mixed-use districts are computed. The other 34 codes are listed with the reason they are not computed:

- districts whose height comes from a height map and performance points (UC-MU, UC-E, R-MU);
- downtown (GT-A to GT-E);
- riverfront (RIV-*);
- districts with no housing by right (HC, GI, UI, EMI, P, H);
- special, public realm and planned districts.

A test fails if a code on the zoning map is neither computed nor explained.

What the code says that the older by-right table in `config/zoning_rules.json` did not:

- **Lot size.** Base residential districts set no lot area per home. R1D and R1A allow one home per lot, R2 two, R3 three. RM is limited only by its height and setbacks. The minimum lot size applies to the lot.
- **Multi-unit housing.** Among the residential districts, buildings of four or more homes are allowed by right only in RM. All four mixed-use districts allow them by right.
- **ADUs.** An ADU (under 800 sq ft, accessory to a single-unit home) is allowed only inside an Accessory Dwelling Unit Overlay District. None appears among the 139 overlay areas on the City's published overlay layer. In practice the code allows no ADU anywhere today, and the card says so when it suggests one.
- **Parking.** The parking minimums still stand: one space a home for two-unit, three-unit and multi-unit housing, none for rowhouses, a parking study for elderly housing. The citywide repeal proposed in 2024–2025 is not in the code current through 2026-09-16.

The older table stays as it was, marked unverified, because the scoring data reads it. The new card reads only the new file.

## Homes on one lot

| District | Homes |
|---|---|
| R1D, R1A, R2, R3 | 1, 1, 2 or 3 when the lot meets the district's minimum lot size (6,000, 3,000, 2,400 or 1,200 sq ft from VL to H; none in VH); none below it |
| RM and NDO, LNC, NDI, UNC | the envelope: (frontage − side setbacks) × (depth − front − rear setbacks) × stories, held to the lot coverage and floor area ratio where the district sets them; then floor area × 85% ÷ 850 sq ft |

The 850 sq ft home and the 85% of floor area that is homes rather than halls and stairs are assumptions, printed on the card. RM-VH caps height at 180 ft but not stories; it is read as 18 stories of 10 ft.

Worked by hand, and in the fixture:

- **RM-M lot, 80 × 125 ft:** (80 − 20) × (125 − 25 − 25) = 4,500 sq ft × 4 stories = 18,000 sq ft, × 85% ÷ 850 = 18 homes.
- **LNC lot, 40 × 125 ft:** 40 × 105 = 4,200 sq ft (under 90% coverage) × 3 stories = 12,600, held to a floor area ratio of 2 × 5,000 = 10,000 sq ft, so 10 homes.
- **RM-VL lot 40 ft wide:** its 30 ft side setbacks leave no footprint, so no homes.

For lots on the map, frontage and depth are the short and long sides of the lot's smallest enclosing rectangle, scaled so that they multiply to the lot's area (the assessment's LOTAREA, or the shape's area when that is missing). In the calculator a person types the frontage; left empty, the lot is read as a square. The lot a project needs is the smallest lot, rounded up to 100 sq ft, whose homes by right reach the project's homes, found by halving the search range (`lotFor` in `app/src/lib/zoning/capacity.ts`). In R1D, R1A, R2 and R3 it is the minimum lot up to the district's cap on homes, and past the cap no lot is large enough.

Not modeled:

- contextual setbacks and heights, which let infill match its neighbors (so the district setbacks are the most a lot must give up);
- the compatibility standards of Chapter 916 near lower-density districts;
- slopes, rights of way, easements and lots of record;
- parking, which the calculator shows but does not subtract;
- variances.

## Tract totals

From 142,919 city lots (one per shape whose point is in a city tract; 142,437 with a zoning district at their point), per tract:

- **Vacant lots** (assessment use contains VACANT): count, acres, median size, how many are in computed districts, how many are under their district's minimum lot size, and the homes by right on them, by district family. Also the largest such lot, because one big lot can carry most of an envelope figure. In Hazelwood one 15-acre RM-M lot carries 2,401 of 2,946 homes.
- **More homes on lived-in lots:** residential lots in R2 or R3, at or above the minimum lot size, whose assessed use holds fewer homes than the district allows, and the homes that would add (a single-family house in R2: one more).
- **Districts:** lots by zoning district.
- **IZ-O share:** the share of the tract's area inside the City's inclusionary overlay layer.
- **For the Policy lab** (docs/data/policy_lab.md), the same totals under the minimum lot sizes before May 2025 (`homes_old`, `below_min_old`). Also the homes that lived-in house lots (R1D, R1A, R2, R3, at or above the minimum lot size, homes known) would add under three ideas, each including today's gain:
  - `adu`: an accessory unit beside a single home;
  - `up3`: up to 3 homes a lot;
  - `up4`: up to 4 homes a lot.

  Each idea also has an `_old` version, under the old minimums. Citywide, these add 52,269, 120,263 and 190,089 homes over today's 10,530 gentle-density gain.

Across the city: 16,273 vacant lots in computed districts allow 33,749 homes by right, and 4,365 vacant lots are under their district's minimum lot size. In R2 and R3, 10,295 lived-in lots hold fewer homes than allowed, worth 10,530 more homes. 17 tracts are mostly inside the IZ-O.

Only tract totals are written: no lot, parcel number, owner or address leaves the build.

## Inclusionary housing overlay

§907.04.A: new construction or substantial improvement of 20 or more homes in the IZ-O sets aside at least 10% of them, rounded up. They are for households at or below 50% of area median income to rent, or 80% to own, for 35 years. The overlay's boundary is the City's own feature layer (2,457 acres: Bloomfield, the three Lawrencevilles, Polish Hill, and parts of Oakland). The card applies the set-aside where more than half of the tract is inside, and says to check the site where less is. The citywide affordable housing bonus (Council Bill 2025-1545) was pending, not adopted, on 2026-10-15; it is shown as proposed.

## At the pin (Place online)

An address searched on the Place view, or the pin dragged onto a lot, is read against the same zoning polygons (`lib/zoning/atPin.ts`). A geocoded address often lands on the street centerline, which no district covers. A miss looks 15, 30 and then 50 m around the point in 8 directions, and the nearest ring that reaches a district decides by majority. A district with standards opens Try a lot on it, with the line "District at your pin: …, a map reading; confirm with the Zoning Administrator". One of the 34 districts without standards is named with the reason the standards file gives. The IZ-O is tested at the pin against the overlay outline, simplified at 15 ft (`app/src/data/lazy/izo_overlay.json`, written by step 18). When a pin is in the tract, that reading replaces the tract-share test for the policy row and the pencil's set-aside. The reading lives on the person's project for that tract and is cleared when the pin goes. Nothing about the lot is written by the build: the outline is the City's published overlay boundary.

## Limits

- **Not a determination:** a reading of the code, current through 2026-09-16. Later amendments are not in it.
- **Upper bound:** vacant land is not buildable land, so the vacant-lot homes are a ceiling.
- **Assumed home size:** envelope districts count homes at an assumed size, and the actual building depends on its design, code and parking.
- **Tract test unless a pin is set:** without a pin, the overlay is tested by tract share, not by site.

## Rebuild

```bash
uv run --no-sync python scripts/18_build_zoning_capacity.py            # about 15 s; reads data/raw/parcels and the zoning layers
uv run --no-sync python scripts/18_build_zoning_capacity.py --refresh  # download the IZ-O layer again
```
