# Factor methods and data reconciliation

How `src/visionpitts/ingest.py` and `factors.py` turn public sources into the six scoring factors in `config/scoring.json`, and how geographies, periods and definitions were reconciled. Every factor value is **observed data processed by code**; the fit matrix, weights and presets are value judgments and live in `config/scoring.json` and `docs/assumptions.md`. Source URLs, vintages and checksums: `data/processed/sources.md`.

Build: `uv run python scripts/01_build_tracts.py && uv run python scripts/02_build_factors.py && uv run python scripts/03_build_pressure.py && uv run python scripts/04_export_app_data.py`.

## 1. Study set and common rules

| Rule | Choice | Why |
|---|---|---|
| **Unit** | 2020 census tracts, 11-digit GEOID | Every 2020s source (ACS, CHAS, SVI, QCT, HCV) is on 2020 tracts. |
| **Study set** | Tracts with ≥50% of their area inside the Pittsburgh city polygon (Census place 4261000, 2023 cartographic file): **128 of 394** county tracts | City-only layers (CDBG, URA MVA 2016) then cover the whole set; percentiles read as "compared with the rest of Pittsburgh". |
| **Ranked set** | Tracts with **≥25 households** (ACS 2020–24): **114 of 128** | The other 14 are parks, rivers, stadium land and campuses. They stay on the map, greyed, and are never ranked. |
| **Normalization** | `pct(x) = rank(x, average ties) / n` across ranked tracts with a value; result in (0, 1]; nulls stay null | A factor has no direction of its own; the fit matrix sets direction. |
| **Missing values** | Dropped from that tract's score; remaining weights renormalize. Never imputed. | Shown in the per-tract data-limits panel. |
| **Coordinate systems** | EPSG:2272 (PA South, US ft) for area, distance and buffers; EPSG:4326 for the map | |

### 2010 → 2020 geography
MVA (block groups), Opportunity Zones (tracts) and CDBG (block groups) are published on 2010 geography.

- Every 2020 tabulation block (TIGER/Line 2020, `HOUSING20`) is placed by its internal point into a 2010 block group (TIGER 2010). That gives each block a 2010 block group and 2010 tract.
- A 2010 unit's value is carried to 2020 tracts in proportion to the **2020 housing units** that now sit in each (`geo.carry_rate`). Rates become housing-unit-weighted means; designations become the share of a tract's housing units that were flagged, and the tract is flagged at ≥50%.
- `xw10_dominant` = the largest share of a 2020 tract's housing units that comes from a single 2010 tract. Below 0.8 the boundary changed a lot, and factors that depend on the crosswalk drop one confidence level.
- MVA polygons are joined to block points directly (not through the block-group crosswalk), so split `a`/`b` block groups and non-residential parts are weighted by the housing that actually sits in them.

### Other geography reconciliations
- **ZCTA → tract** (Small-Area DDA): a tract takes the ZCTA with the largest area overlap.
- **ZIP → tract** (evictions): see §3.3.
- **Neighborhood labels**: largest-area-overlap WPRDC neighborhood; label only, tracts and neighborhoods do not nest.

### Periods
Sources span 2016 to 2026. The tool does not pretend they are simultaneous: every factor carries its data year in the UI, and the confidence tag starts from data age (§4).

## 2. Confidence tags (`<factor>_conf`)
1. **Base level from data age** (2026 − data year): ≤2 years high · 3–5 medium · >5 low.
2. **Downgrade one level** (never below low) for any of: coverage < 90% · dominant crosswalk share < 0.8 · CV > 30% · an imputed or apportioned input.

| Factor | Base | Downgrade when |
|---|---|---|
| need | CHAS 2018–22 → medium | CV of the count > 30% |
| market_strength | MVA 2021 → medium | <90% of housing classified; dominant 2010 tract share < 0.8; no 2016 value (change term set to 0) |
| displacement_risk | HU-weighted mean year of parts used → medium/high | fewer than 3 parts; CHAS burden-share CV > 30%; eviction part present (it is apportioned from ZIPs) |
| subsidy_eligible | QCT/DDA 2026 → high; OZ/CDBG-only (2018 on 2010 geography) → medium | OZ/CDBG-only and dominant share < 0.8 |
| transit_access | GTFS 2026 → high | — |
| flood_exposure | 2024 → high | — (the source itself is a screening model; said in the caveat, not the tag) |

## 3. Factors

### 3.1 `need`: affordability need
- `need_count` = CHAS 2018–2022 Table 8, renter households with income ≤30% HAMFI plus >30–50% HAMFI (the cost-burden "All" subtotals). Columns are chosen by parsing the CHAS data dictionary on tenure, income band, cost burden and facilities, and the code asserts it found exactly 2 need cells and 4 burden cells.
- MOE = root-sum-square of the cell MOEs; CV = MOE / 1.645 / estimate.
- `need = pct(need_count)`.
- **Definition note:** HAMFI (HUD Area Median Family Income) is treated as AMI. Counts are households, not people; student-heavy tracts (Oakland) rank high on this count and the tool does not adjust for that.

### 3.2 `market_strength`: market strength
- Reinvestment Fund MVA letters → ordinal score within each vintage, evenly spaced from A = 1 to the last letter = 0. 2021: A–J, county model. 2016: the URA city model is used for city blocks (county model as fallback).
- Unclassified (`NC`, non-residential, too few sales) → null. Tract score = housing-unit-weighted mean over classified blocks; null if <50% of housing units are classified (20 city tracts, all non-residential or campus).
- `raw = 0.8·s21 + 0.2·clip(s21 − s16, −0.5, 0.5)`; `market_strength = pct(raw)`. No 2016 value → change term 0 and a confidence downgrade.
- **Definition note:** letters are not comparable 1:1 across vintages or between the two 2016 models, so `mva_change` is used for **direction only** (rising / flat / falling with a ±0.05 band ≈ half a letter step).

### 3.3 `displacement_risk`: displacement risk
Weighted mean of percentile-ranked parts, renormalized over the parts a tract has; null with fewer than 2 parts.

| Part | Source | Weight |
|---|---|---|
| `svi_overall` | CDC SVI 2022 `RPL_THEMES` (Pennsylvania percentile, re-ranked within the city) | 0.30 |
| `chas_burden_le50_share` | CHAS: renters ≤50% HAMFI paying >30% of income ÷ `need_count` (clipped to 1 because of HUD rounding) | 0.30 |
| `eviction_filing_rate` | Eviction Lab ETS, Pittsburgh ZIPs: mean annual filings 2023–2025, apportioned to tracts (below), per 100 renter households | 0.20 |
| `hcv_per_renter` | HUD vouchers (tenant- and project-based) ÷ ACS renter households | 0.20 |

**Eviction apportionment.** The ETS series is monthly by ZIP (01/2020 → 09/2026). For each ZIP, filings are summed per calendar year 2023–2025 and averaged. Each ZIP's annual filings are split among 2020 tracts in proportion to the 2020 housing units of the blocks inside the ZIP's ZCTA (whole county, so a ZIP's housing outside the city still counts in its denominator). A tract's rate is null when <50% of its housing sits in a covered ZIP. This is an **estimate, not a tract observation**; wherever it is used the displacement confidence drops one level, and the tract panel says so.

**Coverage today:** 81 tracts have all 4 parts, 32 have 3, 1 has 2. Vouchers are missing (suppressed) in 47 ranked tracts.

**Overlap note:** `need` and this factor both draw on CHAS renters ≤50% AMI (one as a count, one as a burden share). Raising both weights partly double-counts low-income renter concentration.

### 3.4 `subsidy_eligible`: subsidy eligibility
`1` if any flag is true, `0` if all known flags are false.

| Flag | Definition | City tracts flagged |
|---|---|---|
| `qct` | HUD LIHTC Qualified Census Tract 2026 | 41 |
| `dda` | Largest-overlap 2020 ZCTA is a 2026 Small-Area DDA in the Pittsburgh HMFA (`2026 SDDA = 1`) | 7 |
| `oz` | ≥50% of housing units in designated 2010 Opportunity Zone tracts | 22 |
| `cdbg` | ≥50% of housing units in 2010 block groups with `cdbg2018 = Yes` (HUD low/mod data); null if <50% of housing is in the CDBG file | 74 |

**Definition note:** this is a binary mixed with percentiles. With fit values of 0.8–1.0 for small apartment and senior housing it pulls those types toward eligible tracts; that is intended (LIHTC and CDBG are how they get built) and documented as a value judgment.

### 3.5 `transit_access`: transit access
- PRT GTFS static feed. Service day = the **Wednesday in the feed's date range with the most scheduled trips** (regular weekday schedule, no holiday), computed from `calendar.txt` and `calendar_dates.txt`.
- Departures = `stop_times` rows on that day, excluding `pickup_type = 1`.
- For each tract, sum departures at stops within 400 m (1,312 ft buffer in EPSG:2272) and divide by tract land acres (`ALAND`). `transit_access = pct(departures per acre)`.
- **Caveat:** schedule, not ridership or reliability; the buffer crosses tract lines, so small dense tracts score very high.

### 3.6 `flood_exposure`: flood exposure
- `flood_share_pct` = share of tract land inside a HAND (Height Above Nearest Drainage) inundation footprint derived from USGS 3DEP elevation in prior coursework (MUSA 6950); read as published.
- `flood_exposure = pct(flood_share_pct)`.
- **Caveat:** terrain-based screening, not a FEMA floodplain; it ignores stormwater and flash flooding and can flag inland low ground.

## 4. ACS context fields (`ingest.acs`)
ACS 5-year 2020–2024 via the Census API (falls back to a cached download offline). Every estimate is paired with its 90% MOE; `CV = MOE / 1.645 / estimate`; shares use the ACS handbook proportion formula (ratio formula when the radicand is negative). Sentinel values (−666666666 etc.) become null; −555555555 MOEs become 0 (controlled estimates). Context only, never a scoring input.

## 5. The C layer (`pressure.py`)
- **Queen contiguity** among study tracts (shared edge or corner, via a spatial self-join). Edge tracts have fewer neighbors because tracts outside the city are not in the set; median 5 neighbors, range 1–10.
- `market_lag` = mean of neighbors' `market_strength` (neighbors without data ignored); `market_pressure = market_lag − market_strength`; `market_pressure_pct = pct(market_pressure)`. Positive = neighbors stronger = pressure spilling in.
- `need_tercile` (L/M/H at 1/3 and 2/3 of the need percentile) × `market_direction` (rising / flat / falling from `mva_change`, ±0.05 band) → 9 bivariate classes. **Watch list = H-rising** (9 tracts).
- **Flip list**: tracts whose top typology differs between two presets; Balanced → Anti-displacement flips 14 of 114 ranked tracts.

None of this enters the score. It drives the market-pressure and bivariate map modes and the watch list.

## 6. Scoring (reference; `scoring.py` and `app/src/lib/scoring.ts`)
`S(t,k) = Σ_f w_f · c(x_tf, d_kf) / Σ_f w_f · |d_kf|` over factors with data and weight > 0; `c = d·x` if `d ≥ 0`, else `|d|·(1 − x)`. The denominator makes S a weighted-average fit in [0, 1], so a typology with more or larger fit entries is not favored for that alone. Stability: 200 Dirichlet draws (concentration 25) around the user's weights; report the share of draws where the top pick holds. Both engines are checked against `tests/fixtures/scoring_cases.json` (40 cases).
