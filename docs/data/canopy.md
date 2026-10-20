# Tree canopy, and sun, shade and trees on the Place page

Added October 2026. Information only: nothing here enters a score.

## What it adds

| Where | What |
|---|---|
| Explore, Data, "Tree canopy (2020 lidar)" | One variable, **Tree canopy**: the share of an area's land under tree canopy, for tracts, block groups, ZIP codes, municipalities, the city and the county, county-wide |
| The same group, **Canopy map** switch | The canopy itself drawn in green over the map, for the city |
| Analysis, Place page, "Sun, shade and trees" | Hours of direct sun on the tract's lots in three seasons, tree canopy, and how many vacant lots are large, open and sunny |
| Analysis, Place page, tax credit score sheet | The same figures shown next to the lines they bear on, and the one line the place settles (transit within half a mile) |

Code: `src/visionpitts/canopy.py`, `scripts/16_build_canopy.py`, `tests/test_canopy.py`; in the app
`app/src/lib/explore/catalog.ts` (the variable), `canopyStore.ts` and `canopyLayer.ts` (the map),
`app/src/components/place/SiteConditions.tsx` and `app/src/lib/lihtc/place.ts` (the Place page).

## Source, and how it is read

PASDA, [Allegheny County - Tree Canopy Change, 2015-2020](https://www.pasda.psu.edu/uci/DataSummary.aspx?dataset=1235)
(Tree Pittsburgh and the University of Vermont; lidar flown in fall 2019 and spring 2020; 570,207 polygons;
downloaded 2026-10-11 to the git-ignored `data/raw/canopy/`).

The file is published as a change file, but it carries no change class: only shapes and their areas. Its metadata
text is the older 2010 to 2015 study's. So what the shapes are had to be established:

| Check | This file | Published | |
|---|---|---|---|
| Canopy inside Penn Hills | 6,530 acres | 6,524 acres in 2020 (Tree Pittsburgh's figure, as reported in the local press) | within 0.1% |
| All shapes | 240,983 acres, 50.6% of the county | about 251,000 acres implied for 2020 by press figures (255,109 in 2015, less a net loss of 4,116) | 4% lower |

The file is therefore read as the **2020 tree canopy extent**: the municipal figure, which comes from the 2020
study itself, matches closely. The county total sits 4% under what the press figures imply; the 2015 figure comes
from the earlier study, which mapped canopy by a different method, so the two are not strictly comparable. Both
published figures were taken from news reports, not from Tree Pittsburgh's own tables. The script stops without
writing anything if Penn Hills is off by more than 1.5%.

## Canopy share by area

The canopy shapes are laid over each unit exactly: a shape wholly inside counts with its full area, a shape across
the edge with the area of the part inside. 6,949 invalid shapes are repaired first.

    canopy share = canopy area / land area            (never more than 1)
    land area    = the unit's polygon area x land / (land + water)

Land and water are the Census figures of the same unit. ZIP code areas come without them, so a ZIP code's share is
of its whole area, water included; the variable's description says so. A unit that reaches past the county line is
measured on its part inside the county, and gets no figure when less than half of it is inside (67 of 170 ZIP codes;
all 32 ZIP codes in the city have one).

| Level | Units with a figure | Lowest | Median | Highest |
|---|---|---|---|---|
| Tract | 394 of 394 | 4.4% | 42.1% | 84.9% |
| Block group | 1,062 of 1,062 | 3.7% | 40.3% | 84.9% |
| ZIP code | 103 of 170 | 6.4% | 42.6% | 77.0% |
| Municipality | 129 of 129 | 9.9% | 44.8% | 78.9% |
| City of Pittsburgh | | | 39.5% | |
| Allegheny County | | | 51.5% | |

City: 14,000 acres of canopy on 35,430 acres of land (37.5% of the city polygon with its rivers). Lowest city tracts:
Bloomfield 4.4%, Chateau 5.7%, Central Lawrenceville 6.1%. Highest: tract 9804 in Perry North 84.9% and tract 9803
in Squirrel Hill South 83.8%.

Outputs: `data/processed/canopy_<level>.csv` (tracked) and `app/src/data/online/canopy.json` (every county unit;
bundled by the online build only). County-wide values are served from that file, not from the database.

Checked independently of `canopy.py`: four tracts recounted straight from the raw shapes match the tables to the
last digit shown (Hazelwood 414.1 acres, 54.0%).

## The canopy map

Ordinary web-map tiles, 512 pixels, zoom 11 to 15, over the same extent as the sun-and-shadow layer. The zoom 15
grid is the shadow run's own grid (about 6 ft): a cell is canopy when its center is inside a canopy shape. Each lower
zoom averages 2 x 2 pixels, so from far away a pixel's opacity is the share of it under trees.

646 tiles, 12.3 MB, in `app/public/data/canopy/` (not git-ignored: the canopy is public data about no one's
property in particular). The map switch appears with the variable; if the tiles are not on a copy of the site, the
switch says so and stays off.

Checks the script repeats on every run: canopy cells inside the city come to 14,015 acres against 14,000 exact
(+0.11%); 20,000 random cells looked up against the raw shapes on the State Plane side all agree, which a one-cell
shift would not survive.

## Sun, shade and trees on the Place page

`app/src/data/lazy/site_tract.json`, one record for each of the 128 city tracts and one for the city:

| Field | Meaning |
|---|---|
| `canopy`, `canopy_acres` | Share of land under canopy, and acres (as above) |
| `sun`, `shade` | Hours of direct sun, and the share of the day in shadow, on the tract's lots for June 21, September 22 and December 21: the lots of [shadow by parcel](shadow.md), weighted by area |
| `vacant` | Rated lots the county assesses as vacant land |
| `vacant_2k` | ... of 2,000 sq ft or more |
| `vacant_open` | ... and less than half under tree canopy |
| `vacant_sunny` | ... and in direct sun for at least half of December 21 (4.5 of 9 hours) |
| `transit_half` | Share of all lots whose center point is within 2,640 ft, straight line, of a Pittsburgh Regional Transit stop (all 6,388 stops in the June 2026 feed) |

Canopy on a lot is counted on the same 6 ft cells as its shadow: canopy cells / cells, with no figure under 10
cells. The per-lot table is `nopush/canopy/parcel_canopy.csv` (git-ignored, like the shadow tables).

City totals: of 22,028 rated vacant lots, 15,474 are 2,000 sq ft or more, 6,996 of those are mostly open (983
acres), and 1,518 of those get at least half a winter day of sun (362 acres). Many vacant lots in Pittsburgh are
wooded hillsides, which is what the "open" step screens for. 121 of 128 tracts have every lot within half a mile of
a stop and two more are above 99.5%, so the score sheet counts the transit line in 123 tracts. The lowest is tract
5653 (Hays) at 60%.

## Limits

- The canopy is as of the 2019 to 2020 lidar. Trees planted or lost since are not in it.
- The lidar method picks up some power lines, poles and building edges as canopy (stated in the source's own
  abstract).
- The 2,000 sq ft, half-canopy and half-day marks are screening choices, not rules from any program. They are
  constants in `canopy.py`.
- "Vacant" is the county's assessment class. It says nothing about ownership, liens, slope or whether a lot can be
  bought.
- Sun figures inherit every limit of the shadow layer: a 2015 surface, trees as solid objects, clear sky.
- The half-mile transit distance is a straight line from the lot's center, to any stop, whatever its service.
- None of this is in the offline single file.

## Rebuild

    uv run python scripts/16_build_canopy.py     # about 3 minutes, about 4 GB of memory

It needs the canopy file in `data/raw/canopy/`. With the shadow run (`nopush/shadow/out/`) it also writes the tiles
and the lot table; with the shadow-by-parcel tables (`nopush/shadow/parcels/`) it fills the sun and vacant-lot
fields. Without them it writes what it can and says what it skipped.
