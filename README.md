# VisionPitts

*Great decisions need vision. We give you one.*

An anti-displacement housing typology matchmaker for the **City of Pittsburgh**. Built solo for the **AI Horizons 2026 · AI for Housing Hackathon**, Track 3 (Housing Typology, Equity & Climate Matchmaker), Sep 26–27, 2026. Every line of code in this repository was written after the Saturday 9:00 a.m. ET kickoff.

> **Open it:** `export/index.html` (double-click; one self-contained file) · **Live app:** [ye-zhang-vision-pitts.vercel.app](https://ye-zhang-vision-pitts.vercel.app) · **Plan:** [docs/PLAN.md](docs/PLAN.md) · **Methods:** [docs/data/factor_methods.md](docs/data/factor_methods.md) · **Value judgments:** [docs/assumptions.md](docs/assumptions.md)

![Landing page with a live 3D map of Downtown](docs/screenshots/01-landing.png)

## What it does

One question, one map. For any City of Pittsburgh census tract: **which housing type — ADU, duplex/triplex, townhome, small apartment (5–19 units), or senior housing — best serves households at or below 50% of area median income without accelerating displacement?**

A planner or CDC staffer opens the map, searches an address or picks a neighborhood, and sees:

1. **Best match here** under the current priorities, its match score out of 100, and how solid the pick is ("Stays #1 in 7 of 10 small changes to your priorities").
2. **Why**: a plain sentence built from the numbers, then how the five types compare, then each observed factor with its percentile, source year and confidence tag.
3. **Market pressure**, the anti-displacement lens: whether neighboring markets are stronger than this one, and whether the tract is on the **watch list** (high need + market rising since 2016).
4. **What changes when values change**: switch from *Balanced* to *Anti-displacement* weights and the ranking re-orders; **Compare scenarios** outlines every tract whose best match flips and draws a rank slopegraph for the place you picked.
5. **Compare tracts**: two places side by side on synced 3D maps, with the factors that separate them.
6. **Data limits** for that tract: what we do not know and why.

What they do next: take the shortlist into a site-prioritization meeting, a density-bonus conversation, or a CDC pipeline review. The tool produces scenarios, not verdicts.

| Explore | Compare tracts | Compare scenarios |
|---|---|---|
| ![](docs/screenshots/02-explore-hazelwood.png) | ![](docs/screenshots/04-compare-tracts.png) | ![](docs/screenshots/05-compare-scenarios.png) |

## Who it's for

- **City planners** (Department of City Planning, URA) deciding where the voluntary affordable-housing bonus and ADU provisions should be encouraged first. Pittsburgh replaced mandatory citywide inclusionary zoning with a voluntary bonus in late 2025, so *where* the carrot is offered is now a spatial decision.
- **Community development corporations** (Hazelwood Initiative, Hill CDC, Bloomfield-Garfield Corp.) prioritizing sites and product types.
- **Mission-driven developers and advocates** (Pro-Housing PGH, ACTION-Housing) stress-testing where affordable production adds homes without flipping a neighborhood.

## How to run

**Just open it.** `export/index.html` is the whole app in one file (about 2 MB). It opens by double-click in Chrome, Edge or Safari; the basemap, terrain tiles and address search load from the internet, everything else is inside. If a browser blocks it over `file://`, run `export/serve.command`.

**Data pipeline** (Python ≥3.12, [uv](https://docs.astral.sh/uv/)). Raw downloads go in `data/raw/` (git-ignored; URLs and checksums in `data/processed/sources.md`).

```bash
cp .env.example .env            # add CENSUS_API_KEY (free key from api.census.gov)
uv sync
uv run python scripts/01_build_tracts.py      # city tracts, ACS context, demo tracts, 2010->2020 crosswalk
uv run python scripts/02_build_factors.py     # every source -> six factors + confidence tags + sources registry
uv run python scripts/03_build_pressure.py    # spatial lag, bivariate classes, watch list, flip list
uv run python scripts/04_export_app_data.py   # writes app/src/data/*.json and data/processed/tracts.geojson
uv run python scripts/05_build_buildings.py   # 3D buildings for the demo tracts (Overture + assessment stories)
uv run python scripts/make_parity_fixture.py  # 40 scoring cases shared by the Python and TypeScript engines
uv run pytest                                  # 17 tests
```

**App** (Vite + React + MapLibre GL). The scoring engine runs in the browser; data is imported at build time.

```bash
cd app && npm install
npm run dev        # http://localhost:5173
npm test           # engine parity + explanation number check
npm run build      # static site in app/dist (what Vercel deploys)
npm run export     # ONE self-contained file: export/index.html
npm run shoot      # Playwright smoke test + screenshots (dev server must be running)
```

**Deploy on Vercel:** import the repo, set **Root Directory = `app`** (framework Vite is auto-detected), and add the environment variable `ANTHROPIC_API_KEY` to enable the AI explanation endpoint (`app/api/explain.ts`). Without the key the app shows a template sentence built from the same numbers. The browser never sees a key.

## Data sources

All sources are public. Geography is the 2020 census tract; anything published on 2010 geography or by ZIP is reconciled as described in the next section. The generated registry with retrieval dates and checksums is [`data/processed/sources.md`](data/processed/sources.md); the same table is in the app under **Sources**.

| Dataset | Source (link) | Geography | Period | Notes |
|---|---|---|---|---|
| CHAS Table 8: renters by income band and cost burden | [HUD CHAS 2018–2022](https://www.huduser.gov/portal/datasets/cp.html) | 2020 tract | 2018–2022 | `need` count (renters ≤50% HAMFI) and cost-burden share. HUD rounds counts; small tracts have large MOEs. |
| Social Vulnerability Index | [CDC/ATSDR SVI 2022, Pennsylvania](https://www.atsdr.cdc.gov/place-health/php/svi/index.html) | 2020 tract | 2022 (ACS 2018–22) | State percentile ranks, re-ranked within the city. |
| Housing Choice Vouchers by tract | [HUD Open Data](https://hudgis-hud.opendata.arcgis.com/datasets/HUD::housing-choice-vouchers-by-tract) | 2020 tract | through 12/2025 | Suppressed where ≤10 holders (null, not zero). |
| Eviction Tracking System, Pittsburgh | [Eviction Lab](https://evictionlab.org/eviction-tracking/pittsburgh-pa/) | ZIP, monthly | 2023–2025 mean (file updated Sep 2026) | Apportioned to tracts by housing units; tagged as an estimate. |
| Market Value Analysis 2021 and 2016 | [Reinvestment Fund via WPRDC](https://data.wprdc.org/dataset/market-value-analysis) | 2010 block group | 2021, 2016 | Letter categories → ordinal within vintage; 2016→2021 used for direction only. |
| LIHTC Qualified Census Tracts; Small-Area DDAs | [HUD QCT/DDA 2026](https://www.huduser.gov/portal/datasets/qct.html) | tract; ZCTA | 2026 | DDA assigned by largest ZCTA overlap. |
| Opportunity Zones | [HUD Open Data](https://hudgis-hud.opendata.arcgis.com/datasets/HUD::opportunity-zones) | 2010 tract | 2018 designation | Crosswalked by housing units. |
| CDBG-eligible block groups | [City of Pittsburgh via WPRDC](https://data.wprdc.org/dataset/cdbg-eligible-block-groups) | 2010 block group | 2018 (HUD LMISD) | City only, which matches this tool's scope. |
| GTFS static feed | [Pittsburgh Regional Transit](https://www.rideprt.org/business-center/developer-resources/) | stop | June 2026 feed | Weekday departures within 400 m per acre. Schedule, not ridership. |
| HAND flood inundation share | Coursework output (MUSA 6950) on [USGS 3DEP](https://www.usgs.gov/3d-elevation-program) | 2020 tract | 2024 | Screening model, **not** FEMA. |
| ACS 5-year estimates + MOE | [Census API, ACS 2020–2024](https://api.census.gov/data/2024/acs/acs5) | 2020 tract | 2020–2024 | Context only; CV shown. |
| Tract, place, block and block-group boundaries | [Census TIGER/Line and cartographic files](https://www.census.gov/geographies/mapping-files.html) | various | 2020 / 2023 | Geometry, city clip, crosswalk weights. |
| ZIP Code Tabulation Areas | [Census TIGERweb](https://tigerweb.geo.census.gov/) | ZCTA | 2020 | DDA and eviction assignment. |
| Pittsburgh neighborhoods | [WPRDC](https://data.wprdc.org/dataset/neighborhoods2) | neighborhood | current | Labels and search. |
| Building footprints (demo tracts) | [Overture Maps](https://docs.overturemaps.org/guides/buildings/) | building | 2026-09 | 3D display only. |
| Parcels and property assessments (demo tracts) | [WPRDC parcels](https://data.wprdc.org/dataset/allegheny-county-parcel-boundaries), [assessments](https://data.wprdc.org/dataset/property-assessments) | parcel | 2026 | Only STORIES and YEARBLT are read, for building heights. No owner, sale or value fields. |
| Basemap, elevation, geocoding (runtime) | [OpenFreeMap](https://openfreemap.org), [Mapterhorn](https://mapterhorn.com) (USGS 3DEP), [Photon](https://photon.komoot.io), [US Census Geocoder](https://geocoding.geo.census.gov/) | tiles / addresses | live | Display and search only; never scored. |

No individual-level data is used anywhere.

## How we reconciled the data

Full detail in [docs/data/factor_methods.md](docs/data/factor_methods.md). The short version:

- **One geography.** Everything lands on 2020 census tracts. The study set is the 128 tracts with at least half their area inside the Pittsburgh city limits; 14 of them have fewer than 25 households (parks, rivers, stadium land, campuses) and are shown but never ranked, leaving **114 ranked tracts**.
- **2010 → 2020.** MVA, Opportunity Zones and CDBG are published on 2010 geography. Every 2020 block is placed by its internal point into a 2010 block group, and values are carried to 2020 tracts in proportion to 2020 housing units. Designations become "share of the tract's housing units that were designated" and flag at ≥50%. Where a tract's 2010 dominant share is under 0.8 (its boundary changed a lot), confidence drops a level.
- **ZIP → tract.** Eviction filings are monthly by ZIP. Annual filings (2023–2025 mean) are split among tracts by the housing units of the blocks inside each ZCTA and expressed per 100 renter households. This is an apportioned estimate, and every use of it drops the displacement confidence tag one level.
- **Periods.** Sources span 2016 to 2026. Each factor carries its data year in the app, and the confidence tag starts from data age (≤2 years high, 3–5 medium, older low).
- **Definitions.** MVA letters are ordinal within a vintage only, so 2016→2021 change is used for direction alone. HAMFI is treated as AMI. CHAS cost-burden shares are clipped at 1 because HUD rounding can push a part above its whole. Missing components are dropped and weights renormalize; nothing is imputed.
- **Percentiles, not raw values, enter the score**, computed across the 114 ranked city tracts, so "high need" means high for Pittsburgh.

## Limitations

Stated in the app per tract (the *Data limits* panel) and here in general:

- **Eviction filings are apportioned from ZIPs**, not observed at tract level. Tract rates inherit their ZIP's pattern.
- **Vouchers are suppressed** by HUD in tracts with ≤10 holders (47 ranked tracts), so those tracts' displacement score rests on fewer parts and is tagged low.
- **Market change is direction only.** MVA 2016 and 2021 categories are not comparable one to one, and 20 city tracts have no market classification at all (mostly non-residential or campus land).
- **Flood exposure is a terrain screening model** (HAND), not a FEMA floodplain; it ignores stormwater and flash flooding.
- **Transit access is schedule, not service quality**, and the 400 m buffer crosses tract lines, so small dense tracts score very high.
- **Need counts households, not fit for a typology.** Student-heavy tracts (Oakland) rank high on the count and the tool does not adjust for that.
- **The city is the universe.** Neighbors outside the city are not in the spatial-lag computation, so edge tracts have fewer neighbors.
- **3D buildings** exist for the eight demo tracts only; elsewhere the map shows OpenStreetMap buildings at default heights. Guessed heights are drawn faded and counted in the data-limits panel.
- **Not integrated, and the tool does not claim to answer them:** zoning and what is buildable by right, infrastructure capacity, embodied carbon and VMT, land availability and parcel-level feasibility, rents from listings.
- **The fit matrix is a judgment.** Under Balanced weights senior housing ranks first in 40 of 114 tracts, largely because its fit row is short and strongly flood-averse; this is documented in [docs/assumptions.md](docs/assumptions.md) for review rather than tuned to look better.

## Human-in-the-loop

The tool never says "build X here." It ranks options under weights the user sets, shows how often that ranking survives random nudges to the weights, and outlines the tracts where the answer depends on values. Concretely:

- **Every consequential number has a visible owner.** Factor values are observed and carry a source, year and confidence tag; the fit matrix, presets and weights are labeled value judgments and can be changed by the user in the app or in `config/scoring.json`.
- **The intended use is a meeting, not an auto-decision.** A planner or CDC brings a shortlist and the flip map into a site-prioritization or bonus-eligibility conversation; nothing in the tool grants eligibility, funding or approval.
- **AI writes prose, never numbers.** The optional Claude explanation receives only computed values and is rejected if any figure in its text cannot be traced to them; the app then shows a template sentence instead.
- **Disagreement is a feature.** Saved scenarios, the slopegraph and the flip outlines exist so two people with different priorities can see exactly which tracts they disagree about.

## AI tools used

- **Claude Code (Claude Fable 5.1)** pair-programmed the pipeline, app, tests and documentation with the author during the sprint. Commit messages carry co-author attribution.
- **Claude (Sonnet 5 by default)** powers the in-app explanation endpoint (`app/api/explain.ts`) on the deployed site. It receives computed values only, is instructed not to compute anything, and its output passes a number-check before display. The single-file export shows the template sentence instead.
- No model computes, imputes or ranks anything. All scores come from `src/visionpitts/scoring.py` and its TypeScript mirror, verified against a shared 40-case fixture.

## Team

- **Ye Zhang** — product, data pipeline, scoring method, app, documentation (solo entry).

## License

MIT. See [LICENSE](LICENSE). Data remain under their original licenses (see the sources table).
