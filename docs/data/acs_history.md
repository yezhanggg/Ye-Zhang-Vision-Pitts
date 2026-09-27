# ACS history 2014–2024 in the Explore panels

What `scripts/09_build_acs_history.py` and `src/visionpitts/acs_history.py` produce, and how the charts should be read. Everything here is descriptive context; nothing enters a score.

## What is built

| item | value |
|---|---|
| Vintages | ACS 5-year estimates with end years 2014 … 2024 (eleven windows: 2010–14 … 2020–24) |
| Geographies | 2020 tracts (394), ZIP code tabulation areas (170), the 129 municipalities other than Pittsburgh, Allegheny County, the City of Pittsburgh. Block groups are left out: pre-2020 vintages use 2010 block groups and the samples are too small to carry. |
| Variables | The same 37 catalogue variables as the current year, derived with the same code (`acs_levels.derive`): medians as published, sums with root-sum-square margins, shares with the ACS proportion margin. |
| County-wide tables | `data/processed/acs_history_<level>.csv`, one row per unit-year, `{var}`, `{var}_moe`, `{var}_cv` per variable, plus `xw_dominant` for tracts. |
| Bundled in the app | `app/src/data/acs_history.json` (483 KB): 14 variables × 11 years for the 128 city tracts, the 32 city ZIP codes, all 129 municipalities, the county and the city. Margins are bundled for six variables only (income, gross rent, home value, renter share, poverty share, renters paying 30%+), which the charts draw with a band. |
| Raw cache | `data/raw/acs/acs5_<year>_<level>.csv` (git-ignored), one file per level and vintage, so a rebuild needs no API calls. |

The variable code list is stable across the whole span: every catalogue stem exists in the 2014, 2017, 2019 and 2020 APIs, which was checked before the build.

## Geography reconciliation

- **2020 and later** (end years 2020–2024) are published on 2020 geography and join on GEOID.
- **2014–2019 tracts** are published on 2010 tracts. They are carried to 2020 tracts with the housing-unit block crosswalk of the main pipeline (`geo.crosswalk()`): every 2020 block sits in one 2010 tract, so a 2010 tract's 2020 housing units split among 2020 tracts.
  - Counts (all B-table cells that feed sums and shares) are apportioned: `est20 = Σ w · est10` with `w` = the share of the 2010 tract's housing units inside the 2020 tract; `moe20 = sqrt(Σ (w · moe10)²)`.
  - Medians (income, per-capita income, gross rent, home value, year built, age) are housing-unit-weighted means of the contributing 2010 tracts, renormalised over the tracts that have a value; `moe = sqrt(Σ (v · moe10)²)` with `v` the weights.
  - Shares are derived **after** the carry, so their margins keep the ACS proportion formula.
  - `xw_dominant` is the largest share of a 2020 tract's housing that came from one 2010 tract. 19 of the 128 city tracts sit below 0.9; the app says so under their charts.
- **ZIP codes** join on the five-digit code. A 2010 ZCTA code that vanished in 2020 simply has no later value.
- **Municipalities, county, city** keep their GEOIDs across the span.

## How to read the charts

- Each point is a five-year estimate; neighbouring points share four of their five years, so the lines are smooth by construction. Compare non-overlapping windows (2014, 2019, 2024) when you want independent readings.
- Dollar figures are in each vintage's own dollars, not inflation-adjusted.
- The band is the 90% margin of error of the place; the city and county lines carry margins too small to draw.
- Carried tract values (2014–2019) are approximations where a 2020 tract was assembled from several 2010 tracts; the panel flags those tracts.
- Reliability chips use the same coefficient-of-variation rule as the current year (high < 15%, medium ≤ 30%, low above).

## Tests

`tests/test_acs_history.py` covers the crosswalk weights (rows and columns sum to one), count conservation and margin combination under `carry_counts`, the renormalised weighted mean under `carry_means`, the per-vintage ZCTA query, and the bundle shape (margins only for the band variables, nothing imputed).
