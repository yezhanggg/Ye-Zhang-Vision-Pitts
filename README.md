# VisionPitts

*Great decisions need vision. We give you one.*

A census data browser and an anti-displacement housing matchmaker for the **City of Pittsburgh**. Solo entry for the **AI Horizons 2026 · AI for Housing Hackathon**, Track 3, built Sep 26–27, 2026. Every line of code was written after the Saturday 9:00 a.m. ET kickoff.

**Live app:** [ye-zhang-vision-pitts.vercel.app](https://ye-zhang-vision-pitts.vercel.app) · **Offline:** double-click `export/index.html` · **Docs:** [plan](docs/PLAN.md) · [methods](docs/data/factor_methods.md) · [value judgments](docs/assumptions.md) · [sources](data/processed/sources.md)

![Landing page: a live 3D map of Downtown and the four doors](docs/screenshots/00-landing.png)

## What it does

The app opens on a landing page with a live 3D map. **Open VisionPitts** flies from a globe down to Pittsburgh and lands in Explore.

**Explore** is a data browser on a 3D map, with floating panels you can collapse, hide or reopen (the layout persists per browser). Search an address, turn layers on and off (buildings, terrain, tracts, block groups, ZIP codes, the **129 municipalities** of Allegheny County outside Pittsburgh, county, city), and pick a variable under Data: one of **37 ACS 2020–2024 variables** for any geography, or one of the **Analysis layers** for city tracts (the six factor percentiles, match scores under the current priorities, market pressure and the watch list, asking rents, the raw factor inputs). Hover for the value and its margin; click a tract, ZIP code or municipality and the right panel becomes a summary: headline figures, tenure, housing stock, race, cost burden and commuting against the city and county, median income and rent **2014–2024**, and, for city tracts, what the matchmaker says. With a variable painted, the same click shows that variable's value, rank, distribution and trend. These values are **descriptive, never scored**.

**Analysis** is the Track 3 matchmaker. For any city tract it answers one question: *which housing type (ADU, duplex/triplex, townhome, small apartment, senior housing) best serves households at or below 50% of area median income without accelerating displacement?*

- **Match**: best type under your priorities, a 0–100 score, how stable the pick is, and why, factor by factor.
- **Compare scenarios**: change the weights and see every tract whose answer flips.
- **Compare tracts**: two places side by side on synced maps.
- **Copy link** puts the whole state in the URL.

| Explore | Match | Compare tracts | Compare scenarios |
|---|---|---|---|
| ![](docs/screenshots/01-explore.png) | ![](docs/screenshots/03-match-hazelwood.png) | ![](docs/screenshots/05-compare-tracts.png) | ![](docs/screenshots/06-compare-scenarios.png) |
| **Watch list** | **Asking rents** | **Sources** | **Offline file** |
| ![](docs/screenshots/04-watch-list.png) | ![](docs/screenshots/08-asking-rents.png) | ![](docs/screenshots/07-sources.png) | ![](docs/screenshots/09-single-file-export.png) |
| **Place summary** | **One variable, one municipality** | | |
| ![](docs/screenshots/10-place-summary.png) | ![](docs/screenshots/11-municipality-detail.png) | | |

Made for city planners, community development corporations and mission-driven developers. The tool produces scenarios for a meeting, not verdicts.

## Quick start

```bash
# Open it
open export/index.html                 # one 6.4 MB file; basemap and search need internet, data is inside

# Run the app
cd app && npm install && npm run dev   # http://localhost:5173
npm test && npm run build              # 46 tests; static site in app/dist
npm run export                         # rebuild export/index.html

# Rebuild the data (Python 3.12 + uv; CENSUS_API_KEY in .env)
uv sync
uv run python scripts/01_build_tracts.py        # city tracts and crosswalk
uv run python scripts/02_build_factors.py       # six scoring factors + confidence
uv run python scripts/03_build_pressure.py      # market pressure, watch list
uv run python scripts/04_export_app_data.py     # app/src/data/*.json
uv run python scripts/05_build_buildings.py     # 3D buildings, demo tracts
uv run python scripts/06_build_asking_rents.py  # optional, licensed Dewey caches: asking-rent aggregates (tracts, ZIPs, municipalities)
uv run python scripts/07_build_acs_levels.py    # Explore: 37 variables x 6 geographies (incl. municipalities)
uv run python scripts/08_publish_supabase.py    # push county-wide rows to Supabase (apply supabase/migrations first)
uv run python scripts/09_build_acs_history.py   # Explore: the same variables for every end year 2014-2024
uv run pytest                                   # 51 tests
```

**Deploy (Vercel):** Root Directory `app`; env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (public), and optionally `DEEPSEEK_API_KEY` or `ANTHROPIC_API_KEY` for the AI explanation.

## How the data flows

```
Census API, HUD, CDC, WPRDC, PRT ...        (public sources, see table below)
        │
        ▼  scripts/01–08 (Python)
data/processed/*.csv, *.geojson             (tracked, small)
        │
        ├──► app/src/data/*.json   city subset, bundled into the app and the offline file
        │
        └──► Supabase (Postgres)   county-wide rows, read by the live app when online
```

The app paints the bundled city data at once, then swaps in county-wide rows from Supabase when they arrive. Offline, or over `file://`, it never contacts Supabase.

## Supabase at a glance

Six tables, all read-only for the browser. Writes happen only from `scripts/08_publish_supabase.py` with the secret key. Migrations `0002_muni_level.sql` (the `muni` level and a `kind` column) and `0003_acs_history.sql` (the history table) are applied. The app works without Supabase: every municipality, 14 history variables and the rent aggregates ship inside the bundle; Supabase adds the county units outside the city and the other 23 history variables.

| Table | Rows | Columns | What it holds |
|---|---|---|---|
| `acs_variables` | 37 | `id, label, group, unit, description, table_id, sort` | The variable catalogue shown in the Data panel |
| `geo_units` | 1,757 | `level, geoid, name, kind, pgh_share, tract, geom` | Simplified GeoJSON per unit: 394 tracts, 1,062 block groups, 170 ZCTAs, 129 municipalities, county, city |
| `acs_values` | 65,009 | `level, geoid, var, est, moe, cv` | One row per unit and variable: estimate, 90% margin of error, coefficient of variation |
| `acs_history` | 282,088 | `level, geoid, year, var, est, moe, cv` | The same variables for every ACS 5-year end year 2014–2024 (tracts, ZCTAs, municipalities, county, city) |
| `dataset_versions` | 1 | `built_at, acs_year, git_sha, counts` | Which build is loaded |
| `scenarios` | 0 | `slug, owner, name, weights, fit_matrix, toggles, ...` | Reserved for saved scenarios (anonymous auth, owner-scoped); not wired yet |

`level` is one of `tract`, `bg`, `zcta`, `muni`, `county`, `city` (`acs_history` has no `bg`). GEOIDs are strings: 11 digits for tracts, 12 for block groups, 5 for ZCTAs and the county (`42003`), 10 for municipalities, 7 for the city (`4261000`).

The app makes two kinds of request, with the publishable key in the `apikey` and `Authorization: Bearer` headers, paging 1,000 rows at a time:

```
GET /rest/v1/acs_values?level=eq.bg&var=eq.med_gross_rent&select=geoid,est,moe,cv
GET /rest/v1/geo_units?level=eq.zcta&select=geoid,name,pgh_share,geom
```

Keys: the **publishable** key ships in the browser bundle and can only read, because row-level security allows `select` and nothing else. The **secret** key lives in a git-ignored `.env` on the machine that runs the loader. Schema: [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).

## Data sources

All scoring data is public. Full registry with links, retrieval dates and checksums: [`data/processed/sources.md`](data/processed/sources.md), also in the app under **Sources**.

| Used for | Dataset | Geography, period |
|---|---|---|
| Need | HUD CHAS Table 8 | tract, 2018–2022 |
| Displacement risk | CDC SVI · HUD vouchers · Eviction Lab filings | tract · tract · ZIP, 2022–2025 |
| Market strength | Reinvestment Fund MVA 2016 and 2021 (via WPRDC) | 2010 block group |
| Subsidy eligibility | HUD QCT and DDA 2026 · Opportunity Zones · CDBG areas | tract, ZCTA, 2010 geography |
| Transit access | Pittsburgh Regional Transit GTFS | stops, June 2026 |
| Flood exposure | HAND inundation on USGS 3DEP (screening model, not FEMA) | tract, 2024 |
| Explore browser | ACS 5-year 2020–2024, 37 variables | tract, block group, ZCTA, municipality, county, city |
| Explore history | ACS 5-year, end years 2014–2024, same 37 variables; 2010-vintage tracts carried to 2020 tracts by housing units ([method](docs/data/acs_history.md)) | tract, ZCTA, municipality, county, city |
| Municipal boundaries | Census cartographic county subdivisions 2023 (129 cities, boroughs and townships outside Pittsburgh) | municipality |
| Boundaries, names | Census TIGER and cartographic files · WPRDC neighborhoods | 2020 geography |
| 3D buildings | Overture footprints · WPRDC assessments (stories only) | demo tracts |
| Asking rents (info layer) | RentHub rental listings via Dewey Data, **licensed**; only aggregates leave the pipeline (yearly 2BR medians and unit counts, hidden under 10 units). Data by RentHub, licensed through Dewey Data Inc. | tract, ZCTA, municipality, 2019–2026 |
| Basemap, terrain, search | OpenFreeMap · Mapterhorn · Photon · Census Geocoder | live |

No individual-level data is used anywhere.

## Method in brief

- **Scores live on 2020 census tracts**: 128 city tracts, of which 114 with 25+ households are ranked. Percentiles are computed within the city, so "high need" means high for Pittsburgh.
- **Older geographies are carried forward by housing units**: 2010 block groups to 2020 tracts, ZIP filings to tracts. Each carry drops the confidence tag one level.
- **Nothing is imputed.** A missing factor is dropped and the remaining weights renormalize.
- **Explore is description only.** Sums use root-sum-square margins; shares use the ACS proportion formula; reliability is high below 15% CV, medium to 30%, low above. Two block-group substitutions (C17002 for poverty, B25044 for vehicles) are noted in the app.
- Details: [methods](docs/data/factor_methods.md), [value judgments](docs/assumptions.md).

## Limitations

- Eviction filings are apportioned from ZIPs; vouchers are suppressed in small tracts; market change is direction only.
- Flood exposure is a terrain screen, not a FEMA map. Transit access is schedule, not ridership.
- Explore values are survey estimates: block groups and ZCTAs often have low reliability, and ZCTAs only approximate ZIP codes.
- The 2014–2024 lines are overlapping five-year windows in each vintage's own dollars; values before 2020 for 19 city tracts were assembled from several 2010 tracts and are flagged as such.
- Analysis layers and the matchmaker block exist for the 128 city tracts only; municipalities and ZIP codes get census description and, where listed, asking rents.
- Not covered: zoning and buildability, infrastructure capacity, carbon, parcel feasibility, in-place rents.
- The fit matrix is a judgment and is published for review in [docs/assumptions.md](docs/assumptions.md) rather than tuned. One visible consequence: under Balanced weights senior housing tops 40 of 114 tracts, because its row is short (0 on market strength) and strongly flood-averse, so it is rarely penalized; switch to Market-led or edit the row and the picture changes.

## AI use

- **Claude Code** pair-programmed the pipeline, app, tests and docs during the sprint, with every change reviewed and run by the author; commits carry co-author attribution.
- **DeepSeek** (`deepseek-flash`, thinking off) writes the optional "why this ranking" sentence in Analysis when `DEEPSEEK_API_KEY` is configured on the deployment; **Claude** (`claude-sonnet-5`) does when only `ANTHROPIC_API_KEY` is set. The model receives computed numbers only; any figure it cannot trace is rejected and a template sentence built from the same numbers is shown instead. Without a key or a balance (and in the offline file) the template sentence is always shown, and the interface names whichever model wrote the text.
- No model computes, imputes or ranks anything. Scores come from `src/visionpitts/scoring.py` and its TypeScript mirror, checked against a shared 40-case fixture.

## Team and license

**Ye Zhang**, solo. MIT license, see [LICENSE](LICENSE); data remain under their original licenses.
