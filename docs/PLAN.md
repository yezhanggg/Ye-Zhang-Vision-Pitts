# VisionPitts build plan (sprint of Sat Sep 26 – Sun Sep 27, 2026)

*Great decisions need vision. We give you one.*

Written at kickoff for the AI Horizons 2026 · AI for Housing Hackathon, Track 3 (Housing Typology, Equity & Climate Matchmaker). Solo team. Every line of code in this repo is written after the Sat 9:00 a.m. ET kickoff; downloaded public data and design notes from the week before are used as inputs and as a spec only.

## 1. Scope decisions

| Decision | Choice | Why |
|---|---|---|
| Geography | **City of Pittsburgh only** (2020 census tracts whose land is mostly inside the city, ≈128) | Every layer we have covers the city (CDBG, MVA 2016 URA model, neighborhoods). Percentiles across city tracts read as "compared with the rest of Pittsburgh", which is what a City planner or CDC asks. Scoring stays city-only; since W4 the Explore browser reads county-wide census rows from Supabase when online. |
| Question | For each tract: which housing type (ADU, duplex/triplex, townhome, small apartment 5–19 units, senior) best serves renter households at or below 50% AMI **without accelerating displacement** | Track 3 brief plus Pittsburgh's Oct 2025 switch from mandatory inclusionary zoning to a voluntary bonus. Where the carrot is offered is now a spatial decision. |
| Two layers | **C** = anti-displacement headline (market pressure, bivariate need × market change, flip map). **A** = scoring machinery (6 factors × 5 typologies × user weights, stability, confidence). | C is what people see first. A is what they click into. |
| Delivery | Static web app (Vite + React + MapLibre) deployed on **Vercel**, plus a one-file `export/index.html` that opens by double-click; the Python pipeline writes small JSON the app imports at build time. Claude explanation endpoint as a Vercel serverless function so the API key never ships to the browser. | Judges must be able to open a URL. Serverless keeps "AI explains, code computes" honest and keyless on the client. |
| AI role | The LLM never produces a number that feeds the map. It explains computed values and every number in its text is checked against the JSON before display. | Data & AI integrity is scored directly. |

## 2. Build order (cut from the bottom)

| # | Item | Est. | Status |
|---|---|---|---|
| S0 | Repo skeleton, `.gitignore`, README with the 10 required sections, plan, first commit | 0.5 h | done |
| P1 | Pipeline: boundaries → city tracts; ACS context via Census API; 2010→2020 housing-unit crosswalk | 1.5 h | done |
| P2 | Factors: need (CHAS), market_strength (MVA 2021 + 2016 direction), displacement_risk (SVI + CHAS burden + vouchers, eviction slot), subsidy_eligible (QCT/DDA/OZ/CDBG), transit_access (GTFS), flood_exposure (HAND). Confidence tags. Sources registry. | 2.5 h | done |
| P3 | Scoring engine (Python) + tests + `config/scoring.json` v0.3.0 | 1 h | done |
| P4 | C layer: queen-contiguity spatial lag → market pressure; bivariate need × market-change class; flip list Balanced → Anti-displacement | 1.5 h | done |
| W1 | App skeleton: map of city tracts, choropleth by best match, preset cards, sliders, tract panel with ranking + contributions + confidence, `vercel.json` | 3 h | done |
| W2 | Compare scenarios: up to 4 saved weight sets, flip map, watch list; data-limits panel; sources modal | 2.5 h | done (rebuilt on the VisionPitts design: 3D terrain map, floating panel, compare tracts, compare scenarios; the landing page became the About modal in W4) |
| W3 | Market-pressure and bivariate map modes (the C headline) | 1.5 h | done (market-pressure and watch-list lenses in the Match tab's *Color the map by* picker) |
| A1 | Claude explanation endpoint (`app/api/explain.ts`) with number-check assertion; fallback template text | 2 h | done (Vercel function + dev middleware; template fallback) |
| P5 | Eviction Lab ETS (Pittsburgh by ZIP) → tracts by renter units; restores the eviction component | 1 h | done (Eviction Lab ETS apportioned ZIP -> tract) |
| P6 | HUD FY2026 income limits → "≤50% AMI ≈ $X for a family of 4" | 0.5 h | |
| D1 | README data table, reconciliation, limitations, human-in-the-loop, AI tools, license; `docs/assumptions.md` | 2 h | done |
| D2 | Demo script, screenshots, submission form | 2 h | |
| P7 | Explore data: 37 ACS 2020–2024 variables (estimate, 90% MOE, CV) for tracts, block groups, ZCTAs, Allegheny County and the city; county-wide CSVs, city subset bundled (`scripts/07_build_acs_levels.py`) | 2 h | done |
| P8 | Supabase: migration `supabase/migrations/0001_init.sql` (public read under RLS, scenarios table for later) and the PostgREST loader `scripts/08_publish_supabase.py` | 1.5 h | done (migration and loader written; the publish runs with `SUPABASE_SECRET_KEY` in `.env` and is re-run after every step 7) |
| W4 | Explore data browser as the opening screen (search, layers, Data panel, hover tooltip, place card vs city and county, legend); Analysis section with Match / Compare tracts / Compare scenarios sub-tabs and Copy link; the landing page becomes the About modal (Sources, Limitations) | 4 h | done |
| E2 | Single-file export re-checked after Explore: bundled city subset over `file://`, no Supabase requests, Analysis reachable (`app/scripts/check_export.mjs`) | 0.5 h | done (about 5.5 MB) |
| Stretch | Supabase saved scenarios; LISA clusters; IZ overlay polygons; zoning; 3D buildings; terrain | | |

Commit after every item with the item ID in the message.

## 3. Guardrails

1. Code computes every score; AI only explains.
2. Observed data and value judgments are labeled separately in the config, the UI and the docs.
3. Every factor carries source, vintage and a confidence tag. Nothing is imputed silently.
4. Scenarios, not verdicts: "under these values X ranks first, and it stays first in N of 10 nudges".
5. No PII. Tract-level aggregates only. No parcel owner fields.
6. `data/raw/` never enters git. Keys live in `.env` and Vercel environment variables only.
7. If an item overruns its estimate by 2×, write the one-sentence stub for the data-limits panel and move on.

## 4. Open decisions (Ye decides)

1. Add an `opportunity_access` factor (jobs, schools, services)? Default for this sprint: **no**, list it under Limitations and Roadmap.
2. Policy toggles (density bonus, ADU by right)? Default: **no** in v0.3, roadmap.
3. Promote market pressure into displacement_risk? Default: **no**, it stays a map mode and a watch list.
4. Focus tracts for the demo: Hazelwood (hero), Garfield, Middle Hill, Homewood North, Lower Lawrenceville, South Side Flats, Squirrel Hill North, Beechview. Confirm the Garfield and Beechview GEOIDs from the neighborhood polygons.
