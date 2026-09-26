# ACS variables in the Explore data browser

Source: American Community Survey 2020-2024 5-year estimates (table B/C stems below), pulled from the Census API `https://api.census.gov/data/2024/acs/acs5` and cached under `data/raw/acs/`. Built by `scripts/07_build_acs_levels.py`; the catalogue the app reads is `app/src/data/acs_variables.json`.

These values are descriptive context for browsing. They are never scored and never feed the Track 3 match.

## Geographies

| level | unit | county-wide (CSV, Supabase) | bundled in the app (city subset) | city rule |
|---|---|---|---|---|
| `tract` | Census tract | 394 | 128 | the 128 city tracts of the main pipeline (>= 50% of area inside the city) |
| `bg` | Block group | 1062 | 314 | >= 50% of the block group's area inside the city |
| `zcta` | ZIP code (ZCTA) | 170 | 32 | >= 1% of the ZCTA's area inside the city |
| `county` | County | 1 | 1 | Allegheny County (42003) |
| `city` | City | 1 | 1 | Pittsburgh city place (4261000) |

## Method

- Every variable is published at every level with three numbers: estimate, 90% margin of error (MOE) and the coefficient of variation `cv = (moe / 1.645) / estimate` (null when the estimate is 0 or missing).
- `median`: one published value with its own MOE. `sum`: components added, MOE = root-sum-square of the component MOEs. `share`: numerator / denominator with the ACS proportion MOE `sqrt(moe_num^2 - p^2 * moe_den^2) / den`; when the radicand is negative the ratio form `sqrt(moe_num^2 + p^2 * moe_den^2) / den` is used. Shares are clipped to [0, 1]; a denominator of 0 gives null.
- Sentinels: negative estimates (-666666666 and friends) become null; an MOE of -555555555 (controlled estimate) becomes 0; other negative MOEs (including -333333333, median in an open-ended interval) become null. Nothing is imputed.
- Reliability, computed in the app from the cv: high < 0.15, medium <= 0.30, low > 0.30, n/a when null.
- Rounding: whole numbers for counts, dollars and years; 1 decimal for age; 4 decimals for shares; cv 3 decimals.
- Topcoded medians (income, home value) are kept as published. Two tables are swapped for block-group coverage: poverty uses C17002 (B17001 is tract and above) and vehicles use B25044 (B08201 is tract and above); both give the same shares where the original table exists.

## Variables

| id | label | group | unit | kind | numerator stems | denominator | description |
|---|---|---|---|---|---|---|---|
| `pop` | Total population | Population & households | count | sum | B01003_001 | — | Total population (B01003). |
| `households` | Households | Population & households | count | sum | B11001_001 | — | Occupied housing units, i.e. households (B11001). |
| `median_age` | Median age | Population & households | age | median | B01002_001 | — | Median age of the population in years (B01002). |
| `under18_share` | Under 18 | Population & households | share | share | B01001_003 … B01001_030 (8 stems) | B01001_001 | People under 18 as a share of the total population (B01001, male and female age bands summed). |
| `age65_share` | Age 65 and over | Population & households | share | share | B01001_020 … B01001_049 (12 stems) | B01001_001 | People 65 and over as a share of the total population (B01001). |
| `white_nh_share` | White (non-Hispanic) | Race & ethnicity | share | share | B03002_003 | B03002_001 | White alone, not Hispanic or Latino, as a share of the total population (B03002). |
| `black_nh_share` | Black (non-Hispanic) | Race & ethnicity | share | share | B03002_004 | B03002_001 | Black or African American alone, not Hispanic or Latino, as a share of the total population (B03002). |
| `asian_nh_share` | Asian (non-Hispanic) | Race & ethnicity | share | share | B03002_006 | B03002_001 | Asian alone, not Hispanic or Latino, as a share of the total population (B03002). |
| `hispanic_share` | Hispanic or Latino | Race & ethnicity | share | share | B03002_012 | B03002_001 | Hispanic or Latino of any race as a share of the total population (B03002). |
| `med_hh_income` | Median household income | Income & poverty | usd | median | B19013_001 | — | Median household income in the past 12 months, inflation-adjusted dollars of the final ACS year (B19013). Topcoded medians are kept as published. |
| `per_capita_income` | Per-capita income | Income & poverty | usd | median | B19301_001 | — | Per-capita income in the past 12 months (B19301). |
| `poverty_share` | Below the poverty line | Income & poverty | share | share | C17002_002, C17002_003 | C17002_001 | People with income below the poverty line (ratio of income to poverty level under 1.00) as a share of the population for whom poverty status is determined (C17002; B17001 is not published for block groups). |
| `unemployment_rate` | Unemployment rate | Employment & education | share | share | B23025_005 | B23025_003 | Unemployed people as a share of the civilian labor force, ages 16 and over (B23025). |
| `lfpr` | In the labor force (16+) | Employment & education | share | share | B23025_002 | B23025_001 | People in the labor force (civilian plus armed forces) as a share of the population 16 and over (B23025). |
| `bachelors_share` | Bachelor's or higher (25+) | Employment & education | share | share | B15003_022, B15003_023, B15003_024, B15003_025 | B15003_001 | Bachelor's, master's, professional or doctoral degree as a share of the population 25 and over (B15003). |
| `housing_units` | Housing units | Housing stock | count | sum | B25001_001 | — | Total housing units, occupied plus vacant (B25001). |
| `vacancy_share` | Vacant units | Housing stock | share | share | B25002_003 | B25002_001 | Vacant units as a share of all housing units (B25002). |
| `median_year_built` | Median year built | Housing stock | years | median | B25035_001 | — | Median year the housing structures were built (B25035). Structures built before 1940 are reported as 1939. |
| `sfd_share` | Single-family detached | Housing stock | share | share | B25024_002 | B25024_001 | One-unit detached houses as a share of all housing units (B25024). |
| `units_2_4_share` | 2-4 unit buildings | Housing stock | share | share | B25024_004, B25024_005 | B25024_001 | Units in buildings with 2 to 4 units as a share of all housing units (B25024). |
| `units_5_19_share` | 5-19 unit buildings | Housing stock | share | share | B25024_006, B25024_007 | B25024_001 | Units in buildings with 5 to 19 units as a share of all housing units (B25024). |
| `units_20plus_share` | 20+ unit buildings | Housing stock | share | share | B25024_008, B25024_009 | B25024_001 | Units in buildings with 20 or more units as a share of all housing units (B25024). |
| `renter_share` | Renter households | Tenure | share | share | B25003_003 | B25003_001 | Renter-occupied units as a share of occupied housing units (B25003). |
| `renter_hh` | Renter households (count) | Tenure | count | sum | B25003_003 | — | Renter-occupied housing units (B25003). |
| `owner_hh` | Owner households (count) | Tenure | count | sum | B25003_002 | — | Owner-occupied housing units (B25003). |
| `pop_renter_share` | People in rented homes | Tenure | share | share | B25008_003 | B25008_001 | People living in renter-occupied units as a share of the population in occupied housing units (B25008). |
| `med_gross_rent` | Median gross rent | Rent, value & cost burden | usd | median | B25064_001 | — | Median gross rent (rent plus utilities) of renter-occupied units paying cash rent, in dollars (B25064). |
| `med_home_value` | Median home value | Rent, value & cost burden | usd | median | B25077_001 | — | Median value of owner-occupied housing units, in dollars (B25077). Topcoded values are kept as published. |
| `rent_burden30_share` | Renters paying 30%+ | Rent, value & cost burden | share | share | B25070_007, B25070_008, B25070_009, B25070_010 | B25070_001 | Renter households paying 30% or more of household income on gross rent, as a share of renter households (B25070). The denominator is the table total, which includes households whose burden could not be computed; this matches the tract card in Analysis. |
| `rent_burden50_share` | Renters paying 50%+ | Rent, value & cost burden | share | share | B25070_010 | B25070_001 | Renter households paying 50% or more of household income on gross rent, as a share of renter households (B25070). The denominator is the table total, which includes households whose burden could not be computed; this matches the tract card in Analysis. |
| `owner_burden30_share` | Owners paying 30%+ | Rent, value & cost burden | share | share | B25091_008 … B25091_022 (8 stems) | B25091_001 | Owner households, with or without a mortgage, paying 30% or more of household income on selected monthly owner costs, as a share of owner households (B25091). The denominator is the table total, which includes households whose burden could not be computed; this matches the tract card in Analysis. |
| `drive_alone_share` | Drive alone to work | Commuting & vehicles | share | share | B08301_003 | B08301_001 | Workers 16 and over who drove alone (car, truck or van) as a share of all workers (B08301). |
| `transit_share` | Public transit to work | Commuting & vehicles | share | share | B08301_010 | B08301_001 | Workers 16 and over who took public transportation (excluding taxicab) as a share of all workers (B08301). |
| `walk_share` | Walk to work | Commuting & vehicles | share | share | B08301_019 | B08301_001 | Workers 16 and over who walked as a share of all workers (B08301). |
| `bike_share` | Bike to work | Commuting & vehicles | share | share | B08301_018 | B08301_001 | Workers 16 and over who bicycled as a share of all workers (B08301). |
| `wfh_share` | Work from home | Commuting & vehicles | share | share | B08301_021 | B08301_001 | Workers 16 and over who worked from home as a share of all workers (B08301). |
| `no_vehicle_share` | Households with no vehicle | Commuting & vehicles | share | share | B25044_003, B25044_010 | B25044_001 | Occupied housing units with no vehicle available (owner plus renter) as a share of all occupied units (B25044; B08201 gives the same share but is not published for block groups). |

37 variables from 85 ACS stems.
