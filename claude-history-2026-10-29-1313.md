# unify-project-checks-policy-lab

Folder: `/Users/ye/Documents/Ye-Zhang-Vision-Pitts`  
Session: `fd1245d5-7295-46f7-b55d-9f1eb164a569`  
Started: 2026-10-15T17:15:04.641Z  
Saved: 2026-10-29 13:13

---

**Come back to this conversation:** double-click [Resume Claude - unify-project-checks-policy-lab.command](<Resume Claude - unify-project-checks-policy-lab.command>) in Finder.

---

## You

for the shadow feature, i think it would be realy important to have public space planning, where you can have enough sun light for poeple to use and play. just make a note somewhere

- *Bash*: Check shadow doc structure and any future-work section
- *Bash*: Read shadow doc intro, parcel, limits, rebuild sections
- *Bash*: Check parcel use classes for parks and open space
- *Bash*: Read parcel shadow memory file
- *Bash*: Check whether shadow doc is bundled into the app

## Claude

I'm adding a short "public space" idea section to the shadow method doc, `docs/data/shadow.md`.

- *Edit*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/docs/data/shadow.md
- *Bash*: Record the public space idea in project memory

## Claude

I added the note to the shadow method doc as a new section, "Next: sun for public space (idea, not built)". It's at `docs/data/shadow.md:137`, between Limits and Rebuild. It covers:

- **The goal:** parks, playgrounds and plazas only get used and played in if they get enough sun at the right times of year. That means sun in spring, fall and winter, and some shade on summer afternoons.
- **Where to start:** parks don't have their own class in the lot figures; they fall under institutional or other. A city parks and playgrounds layer from WPRDC would fix that. Vacant lots that could become public space are already counted: 22,028 lots, averaging 2.87 hours of direct sun on December 21.
- **New buildings:** the bigger planning question is how much sun a proposed building would take from a park next to it. That needs a second shadow run with the building added.
- **A possible standard:** UK guidance asks that at least half of an outdoor space get two or more hours of sun on March 21. Before picking a threshold, check whether any US city uses something similar.
- **Trees:** the shadow data treats tree crowns as solid. For parks this matters most, because in summer the shade under trees is often where people want to be.

I also added a line to my memory notes so a future session will see this idea. Only the doc changed in the repo; the app is unchanged and nothing is committed.

## You

create a click button in this folder so that i can resume to this chat history

- *Bash*: Confirm this session's ID and find the claude binary
- *Bash*: Create double-click resume launcher and keep it out of git

## Claude

I added **`Resume Claude chat.command`** to the project folder (`/Users/ye/Documents/Ye-Zhang-Vision-Pitts`). Double-click it in Finder to open Terminal and reopen this chat with its full history. Behind the scenes it runs `claude --resume` with this chat's ID.

- **First time:** macOS may ask whether to open it. If it does, right-click the file, choose **Open**, then confirm. After that a normal double-click works.
- **Kept out of git:** I listed the file in `.git/info/exclude`, which is git's local-only ignore list. Git won't show it as a new file, so it can't end up in a commit by accident. Your `.gitignore` is unchanged.
- **Before clicking:** close this chat first. Two windows resuming the same chat at once can step on each other.

I didn't run the file myself, because it opens an interactive window. I did check that this chat's saved history exists under that ID.

## You

can you run this on localhost

- *Bash*: Check app dev scripts and any server already running
- *Bash*: Identify which processes hold the dev ports

## Claude

Those are other projects' servers, so 5173 is free. Starting the VisionPitts dev server.

- *Bash*: Start the VisionPitts dev server
- *Bash*: Wait for the server and check the page loads
- *Bash*: Read the dev server startup output
- *Bash*: Open the app in the default browser

## Claude

VisionPitts is running at **http://localhost:5173/**, and I opened it in your browser. The server started without errors and the page loads.

- **Sun and shadow:** in Explore, open **Data**, then **Sun and shadow**. The **By parcel** view appears there because the parcel shadow files are on this machine. It doesn't show on phones.
- **Your other projects:** the other dev servers already running (Real-Insights and Journal on port 5180, Portfolio on 4321/4322) were left alone.
- **Stopping it:** the server keeps running in the background until you tell me to stop it or close this chat.

## You

Based on the existing structure, can you review the folder /Users/ye/Documents/Deepblue-Dashboards and see if there are anything from LIHTC / Affordability Analyzer and Market Analysis Tool and County Screen (only public source, no private data source) and improve on the current tool. For now, I just think the Analysis section for VisionPitts is not practical enough. One thing just came to my mind is like housing type recommednation could based on the renter percentage and number of single hosuholder in the zipcode. Things like this are pushing the decision for different project. Like it is for affordable housing, LITHC score is important. I just want to make the tool more practical from a real estate developer and planning profesional when they look into the zoning, financial and how to pencil. I just want to amek this more practical. Please ultrathink to /plan for the update

- *ToolSearch*: select:EnterPlanMode,ExitPlanMode
- *Bash*: Read memories on the Analysis section and LIHTC work
- *EnterPlanMode*
- *Bash*: List the Deepblue-Dashboards folder structure
- *Bash*: Read the README and property tool layout
- *Bash*: Map the property tool modules and LIHTC files
- *Agent*: Deepblue affordability and market tools
- *Agent*: Deepblue County Screen and docs
- *Agent*: VisionPitts Analysis section today
- *ToolSearch*: select:WebSearch,WebFetch
- *WebSearch*: Pittsburgh inclusionary zoning 2025 2026 citywide expansion affordable units AMI
- *WebSearch*: PHFA 2027-2028 Qualified Allocation Plan adopted
- *WebSearch*: One Big Beautiful Bill LIHTC 12% allocation increase 25% bond test 2026
- *WebSearch*: HUD Total Development Cost limits 2026 public housing Pittsburgh TDC
- *WebSearch*: Pittsburgh zoning code parking minimums eliminated residential 2024 2025
- *WebSearch*: HUD Multifamily Tax Subsidy Project income limits FY2026 MTSP huduser
- *WebFetch*: https://www.phfa.org/news/
- *AskUserQuestion*
- *WebSearch*: Pittsburgh zoning code 903.03 site development standards R1D R2 R3 RM minimum lot size per unit maximum height table
- *WebFetch*: https://ecode360.com/45474218

## Claude

The official zoning text is on eCode360, which blocks automated fetching, so transcribing it later will go through the browser. I'm waiting on the three searches before drafting the plan.

## You

<task-notification>
<task-id>af8ac3058984f1a5f</task-id>
<tool-use-id>toolu_01TXcKBVyBuEC8cHZELjRWw8</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/tasks/af8ac3058984f1a5f.output</output-file>
<status>completed</status>
<summary>Agent "Deepblue County Screen and docs" finished</summary>
<note>A task-notification fires each time this agent stops with no live background children of its own. The user can send it another message and resume it, so the same task-id may notify more than once.</note>
<result>I went through all four areas without changing anything and didn't open any .env files. The County Screen is a pass/fail filter: six yes/no filters in four groups, with no weighted overall score. The only weighted formula is the growth score that ranks counties. Two of the six filters use CoStar data, which you can't reuse. The other four use only public data.

## 1. County Screen workbooks

**Folder:** `/Users/ye/Documents/Deepblue-Dashboards/nopush/County Screen/`
- `County_Overview_815_vF.xlsx` is the older version. `County_Overview_815_v4.xlsx` is newer and adds a 26% institutional-ownership line (Settings C16) and two extra columns at the end of the Overview (AK–AL).
- `Round 2 Update/` holds:
  - another v4 copy (not byte-identical to the parent v4; I didn't diff the cells)
  - `_CoStar_MF_CapMkts_Metrics_2026-09_v3.xlsx` (CoStar, private)
  - `County_Growth_Stories_Round2_202610_v2.pdf` (16 slides)
  - `Next_Markets_to_Research_2026-10.docx`

**Sheets:** Conclusions, Overview 815, Settings, Metro judgment, Institutional buyers, Ranking, Markets (CoStar), Institutional buyers by year (hidden), Property tax (reference).

**Universe:** 815 counties, i.e. every county the Census surveys yearly in ACS 1-year (population 65,000+) that has complete data.

**The six filters.** All lines are on `Settings!C4:C16`. Column definitions and sources are at `Settings!B19:E55`.

| # | Filter | Formula (Overview 815) | Line | Source |
|---|---|---|---|---|
| ① | Institutional ownership of the metro | `M = Institutional buyers!AT`; v4: `AK = IF(S&lt;=Settings!C16)` | ≤30% of sales, or ≤26% of building value (v4) | **PRIVATE** (CoStar) |
| ② | Metro apartment value | `V = IF(U&gt;=Settings!C8)` | ≥ $4.9B (Little Rock) | **PRIVATE** (CoStar) |
| ② | County population 2024 | `Y = AND(X&gt;=C10, X&lt;=C11)` | 100k–1M | PUBLIC (ACS 1-yr) |
| ③ | Rent ÷ income | `AA` = 12 × median gross rent ÷ median household income; `AB = IF(AA&lt;=C12)` | ≤ 25% | PUBLIC (ACS 1-yr 2024) |
| ③ | Home value ÷ income | `AC` = median home value ÷ median household income; `AD = IF(AC&lt;=C13)` | ≤ 4.5× | PUBLIC (ACS 1-yr) |
| ④ | Growth rank | `AG = IF(AE&lt;=C14)` | top half (rank ≤ 407) | Public inputs (see below) |

- **Result:** `AI` = AND of all six; `AJ` = how many of the six pass (count of "yes"). `AL` repeats `AI` using the 26% line.
- **Information-only columns:** metro value ≤ $32.5B (Kansas City), Top 200, private-buyer share ≥ 66%, Census population change 2024–25.

**Growth score** (`Ranking!A2`, columns F–L): 1.2 × income growth + population growth + rent growth + home value growth + jobs growth + GDP growth (each a yearly rate over 2019–24) + Census population change 2024–25. Counties are ranked 1–815. I recomputed this for all 815 rows and it matches to rounding error. The workbook doesn't name the source for each part. My guess is ACS for income, population, rent and home value, and BEA or BLS for jobs and GDP.

**Which metro a county is judged against** (`Metro judgment` tab, all public inputs):
- Each county is placed at its Census 2020 population centre. Metro centres are the cities named in the Census metro title, located with the 2024 Census Gazetteer.
- Drive time with no traffic comes from the free OSRM road router.
- A county counts as part of a metro if it is within 30 minutes or contains a named city. Metro data is used only if the county has its own CoStar market or is within 45 minutes (`Overview F`).

**Institutional "combined judgment"** (`Institutional buyers!AB13`, CoStar inputs but a reusable idea): use the shortest sales window that has at least $500M of sales behind it (`Settings!C6`), widening from 12 months up to 2016–26. If no window has enough, the market is "quiet" and passes. The general point: widen the time window when the sample is thin.

**How the screen leads to a decision** (Conclusions B5:B10, then the docx and PDF):
- The funnel at default settings: 815 → 437 with a usable CoStar report → 209 → 132 → 88 → **38** pass everything. On the 26% line, 55 pass.
- List 2 is far-out counties that fail only on institutional share. List 3 is counties with no CoStar report and more than 45 minutes from a big metro.
- Two CoStar charts then pick markets: cap rate ≥ 6.5% with institutional ownership ≤ 24%, and institutional share of buying at least 10 points above their ownership share.
- Each shortlisted county is then typed by how it grows (PDF p.2/p.5):
  - **A, metro spillover:** households priced out of the core move in and keep their core jobs.
  - **B, own job engine:** local jobs grow at least as fast as population.
  - **C, core reinvestment:** jobs and pay grow, population doesn't.
- The evidence types used (PDF p.6–9) all have public sources: share of residents working outside the county (LEHD/ACS), top origin counties of in-movers (IRS migration), net domestic movers (Census population estimates), jobs growth 2015–25 (QCEW).
- Supply and vacancy (PDF p.10–11) come from CoStar and Green Street, both private.

**Pittsburgh** (docx §5): "Not now". No county passes; the best is Butler at rank #483. On the public filters:
- Butler, Westmoreland, Washington, Fayette and Beaver each pass 5 of 6 and fail only on growth rank (#483–#811).
- Allegheny passes 4: it fails on population (1.23M, over the 1M cap) and on growth rank (#645).
- Rent ÷ income is 14–18% and home value ÷ income is 2.6–3.2×, so affordability passes everywhere.
- Jobs growth is negative in 5 of the 6 counties (Butler is +0.2%).

## 2. Docs and other method ideas

- `/Users/ye/Documents/Deepblue-Dashboards/next-built.md`: a plan to add 12 HUD rows to the market tool: area median income, 30/50/80% income limits, Fair Market Rents, whether the area is a Qualified Census Tract (QCT) or Difficult Development Area (DDA). It insists on HUD-published numbers only, with no calculations.
- `/Users/ye/Documents/Deepblue-Dashboards/deep-blue-property-tool/docs/MARKET_ANALYSIS_PLAYBOOK.md` (I found this outside `docs/`): a recipe for submarket pages. It pulls 19 ACS variables per year for 2014–24 by ZIP code area, with retry and backoff and treatment of negative sentinel values as missing. ZIPs are picked by radius around a geocoded address.
- **LIHTC rent and demand logic** (`src/modules/analyze/components/affordability/`):
  - `utils/amiCalc.js`: max gross rent = floor(income limit × 0.30 ÷ 12), with assumed household size = 1.5 × bedrooms (studio = 1, interpolating between whole sizes). Net rent = gross rent − utility allowance.
  - `scripts/lihtc/fetchAcsDemandByAmi.cjs`: counts renter households under each income-limit cut by interpolating within ACS B25118 income brackets, using the 4-person limit. Rent burden comes from ACS B25070 (30%+ and 50%+ of income on rent).
  - `scripts/lihtc/README.md`: 60% income limit = 50% limit × 1.2.
- **Metro benchmarks** (`utils/generatedZipDataUtils.js`, AGG_RULES, `scripts/buildMetroBenchmarks.mjs`): combine ZIPs into a metro figure using the ratio of summed counts for rates and Pareto interpolation on summed income brackets for medians, all within 30 miles.
- `nopush/Q/DFW/*.md`: weekly news memos that track planned projects from public filings (the Texas state construction register, city council and zoning agendas).
- `PRODUCT_ROADMAP.md`, `context.md`, `memory.md`, `skills.md` and `docs/research/` have no county screen or feasibility method. They cover T-12 and rent roll work. Unit-mix scoring and development/lease-up modelling are only one-line items.

## 3. App code and public data endpoints

**County screen code:** `src/modules/analyze/components/countyOverview/countyOverviewModel.js` copies the workbook formulas exactly. The rules are in `evaluateMarket`, `evaluateCounty`, `funnel` and `FEATURES`. `scripts/buildCountyOverview.mjs` rebuilds the app data from the workbook and fails if any yes/no cell differs from what the workbook saved.

**No BLS, LAUS, QCEW, building permits, FHFA HPI, IRS or LEHD code** exists in src or scripts. The "LAUS" matches were unrelated. Unemployment comes from ACS B23025 (in `submarketDashboardGenerator.js`), and migration from ACS B07010.

**Endpoints the build scripts call:**
- `api.census.gov/data/{yr}/acs/acs5`, used by about 25 scripts. Main tables: B25003, B19013, B03002, B19001, B07010, B25119, B25118, B25077, B23025, B17001, B01003.
- `geocoding.geo.census.gov/geocoder/locations/onelineaddress`
- `www2.census.gov`: TIGER/cartographic boundaries (county, tract, ZIP area, place, PUMA, school district), the 2020 Gazetteer, ACS summary files, and 2010→2020 tract relationship files.
- `data.census.gov/api/access/data/table`, used only by the verify scripts.
- `www.huduser.gov/hudapi/public`: `/il/data/{fips}`, `/fmr/data/{fips}`, `/fmr/listCounties/{st}`, and the USPS crosswalk.
- `egis.hud.gov/.../AffhtMapService/MapServer/30` for the LIHTC project database.
- ArcGIS `QUALIFIED_CENSUS_TRACTS_{yr}` and `Difficult_Development_Areas_{yr}` feature layers.
- `fred.stlouisfed.org/graph/fredgraph.csv` for BEA metro GDP (series NGMP/RGMP + metro code).

**What's private:** everything sourced from CoStar or Green Street: institutional ownership and buyer shares, metro apartment value, cap rates, supply/vacancy/absorption, and the "Markets (CoStar)" and "Institutional buyers" tabs. To replace the metro-size filter with public data, you could use renter-occupied units from ACS B25003, or apartment permits from Census building permits as a supply measure. That's my suggestion; the repo doesn't do it.</result>
<usage><subagent_tokens>165554</subagent_tokens><tool_uses>50</tool_uses><duration_ms>280932</duration_ms></usage>
</task-notification>

## Claude

The County Screen findings are in. I'll wait for the other two searches before drafting.

## You

<task-notification>
<task-id>a93b792b1f77bd9fb</task-id>
<tool-use-id>toolu_014Mtue4UeLdRKfLpxVkf5qn</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/tasks/a93b792b1f77bd9fb.output</output-file>
<status>completed</status>
<summary>Agent "Deepblue affordability and market tools" finished</summary>
<note>A task-notification fires each time this agent stops with no live background children of its own. The user can send it another message and resume it, so the same task-id may notify more than once.</note>
<result>I read everything you listed (no `.env` files) plus the ETL scripts that fill the tables, and nothing was changed. The short version: **neither module has any LIHTC financing math.** There is no eligible basis, applicable fraction, credit rate, 130% boost calculation, equity price, gap, sources &amp; uses or LIHTC pro forma. Several of the ACS tables you care most about are also missing (list in Part 2). What is here and worth copying is good public-data plumbing, a correct way to combine medians, and careful presentation. Paths below are relative to `/Users/ye/Documents/Deepblue-Dashboards/deep-blue-property-tool/`.

---

## 1. LIHTC / Affordability Analyzer

**Files:** `src/modules/analyze/components/affordability/`
- `AffordabilityAnalyzer.jsx`
- `hooks/`: `useAmiData.js`, `useLihtcProjects.js`
- `panels/`: `ScopeSelector`, `AmiSummaryPanel`, `QctDdaBadge`, `AmiIncomeGrid`, `FmrGrid`, `DemandByAmi`, `LihtcCompetitionMap`, `LihtcCompetitionTable`, `ExportPanel`, `lihtcTokens`
- `utils/`: `amiCalc.js`, `sourceLinks.js`, `Abbr.jsx`

Data is loaded by `scripts/lihtc/*.cjs` into Supabase.

**What the user sees.** Search an address (geocoded, then matched to a ZIP and census tract by point-in-polygon) or type a ZIP; Texas only. A summary card shows the HUD area name, 100% AMI for a 4-person household, the fiscal year, a QCT/DDA chip and a HERA chip. Four tabs follow:
- **Limits:** HUD income limits for household sizes 1–8 at 30/50/80% AMI, then FMR or Small Area FMR by ZIP, with your ZIP pinned first.
- **Demand:** renter households by income bracket, plus cost-burden tiles.
- **Competition:** a map of LIHTC properties colored by decade placed in service, and a table filterable by credit type (9%/4%) and by "year placed in service ≥".
- **Export:** XLSX, PDF or PNG.

**Public sources and endpoints (all reusable):**

| Data | Endpoint | Code |
|---|---|---|
| Income limits | HUD User API `/il/data/{county fips10}?year=`; county list from `/fmr/listCounties/{ST}` | `fetchHudIncomeLimits.cjs:131-139` |
| FMR / SAFMR | `/fmr/data/{fips10}?year=` (`basicdata` comes back as an array for SAFMR areas, an object otherwise) | `fetchHudFmr.cjs:9-10,140` |
| ZIP → HUD area | `/usps?type=2&amp;query={zip}`; residential ratios summed per area, largest = primary area | `fetchHudUspsXwalk.cjs:133-147` |
| QCT / DDA | ArcGIS `QUALIFIED_CENSUS_TRACTS_{YR}` and `Difficult_Development_Areas_{YR}` FeatureServers | `fetchQctDda.cjs:48-50` |
| LIHTC properties | `egis.hud.gov/.../AffhtMapService/MapServer/30/query` | `fetchLihtcProjects.cjs:53` |
| Renter income and burden | ACS5 B25118_014–025 and B25070_002–011 by ZCTA | `fetchAcsDemandByAmi.cjs:75-82` |

**Formulas:**
- **60% AMI** = 50% limit × 1.2, stored with `source='computed'` because the MTSP spreadsheet is blocked by a firewall. `fetchHudIncomeLimits.cjs:153-158`: `il60[...] = Math.round(v * 1.2)`. The UI hides 60% and links out to HUD MTSP and Novogradac instead (`AmiIncomeGrid.jsx:15-17`).
- **Max rent (dead code).** `amiCalc.js` isn't imported anywhere; its UI (`AmiRentGrid`) was deleted in commit `342727b`.
  - Imputed household size per bedroom: 0BR=1.0, 1BR=1.5, 2BR=3.0, 3BR=4.5, 4BR=6.0 (`:13-19`).
  - Half-person sizes use the average of the two neighboring columns (`:28-41`).
  - `gross = Math.floor(income*0.30/12)` (`:55`).
  - `net = max(0, gross − UA)` (`:62-66`).
  - The utility allowance was a manual per-bedroom input defaulting to $0. There is no utility allowance data source.
- **Renter households below an AMI threshold** (`fetchAcsDemandByAmi.cjs:137-155`): linear interpolation inside the B25118 bracket that contains the threshold, `count += n*(T−L)/(U−L)`. Bands are 30 / 30–50 / 50–60 / 60–80 / 80+, all against the **4-person** limit (a stated simplification, `:22-25`).
- **Cost burden** (`:167-169`): `burdened = Σ B25070_007..010 / Σ _002..010`; `severe = _010 / Σ _002..010` (the "not computed" row `_011` is excluded).
- **Credit type**: `BOND=1 → '4pct'`, otherwise `'9pct'` (`fetchLihtcProjects.cjs:96`). This is a rough proxy. HUD's database also has an explicit `CREDIT` field, which I believe is the better choice; check its codes before using it.
- **Capture rate (deleted, recoverable with `git show 342727b^:…/CaptureRateCard.jsx`)**: `units / (Σ cumulative AMI-band shares × total renters)`. Below 10% = healthy, 10–25% = caution, above 25% = lease-up risk. Its own footer listed the limits: ZIP-level denominator, no subtraction of existing LIHTC supply.
- **Radius competition search** exists (bounding box, then haversine filter, `useLihtcProjects.js:24-46`) but is switched off: `radiusMiles: null` at `AffordabilityAnalyzer.jsx:81`.

**Presentation ideas worth copying:**
- Every card says "Verbatim from HUD/ACS" and has a "Verify on HUD ↗" or Census Reporter table link (`sourceLinks.js:47-50` builds `censusreporter.org/data/table/?table=B25118&amp;geo_ids=86000US{zip}`).
- Computed numbers were deliberately taken out of the UI (`AffordabilityAnalyzer.jsx:64-67,158-159`).
- An "FMR ≠ LIHTC max rent" warning (`FmrGrid.jsx:98-104`).
- The QCT/DDA chip says "30% basis boost" in plain language, with an IRC §42(d)(5)(B) tooltip (`QctDdaBadge.jsx:9-12`).
- A note on HUD's 45-day effective-date rule (`AmiSummaryPanel.jsx:87-89`).
- Cost-burden tiles turn red or amber at ≥50/40% (burdened) and ≥30/20% (severe) (`DemandByAmi.jsx:133-151`).
- A hover glossary of 28 abbreviations (`Abbr.jsx`).
- Every input in this module is public. The only private piece is the Supabase hosting itself.

**Acquisition underwriting (all inputs private: T-12, rent roll, purchase price, debt terms).** The methods are generic:
- Monthly cash flow (`underwritingCalculator.js:71-131`).
- Exit value = forward NOI / exit cap (`:161-167`).
- Newton-Raphson IRR (`waterfallCalculations.js:24-49`).
- Default waterfall: return of capital, 6% preferred return, then 20/30/40% GP split at 10% and 15% IRR (`:9-14`).
- `SensitivityAnalysis.jsx:21-30`: a 5×5 grid of exit cap (base ±0.5/1.0) by rent growth (base ±1/2 percentage points). IRR cells colored at 20/15/10/5%, equity multiple at 2.0/1.75/1.5/1.25×, base cell outlined (`:192-210`).
- `ScenarioManager` saves, duplicates and compares full assumption sets.

**`floorPlanScoring.js` is not Census-driven unit-mix logic.** It scores uploaded floor plans on livable %, hallway %, proportions and flow (`:142-206`) against built-in size benchmarks (`:21-110`), plus rent/SF percentile against **internal comp plans stored in IndexedDB** (`:208-233`), which is private. The header says "US Census avg apartment sizes (studio 514, 1BR 757, 2BR 1138)". Those figures look like RentCafe/Yardi numbers, not Census, so verify before reusing.

---

## 2. Market Analysis Tool

**What the user sees.**
- **Map home (`MarketAnalyzer.jsx`):** county, tract, place, ZCTA, PUMA and school-district layers. Clicking an area shows Census Reporter figures next to the state's (`MarketBoundaryPanel.jsx:173-177`).
- **New Analysis wizard (`ZipcodeTableExport.jsx:55-61`):** select PUMAs → pick ZIPs into a main group and a sub-group → aggregate data table → map preview → choose a radius → generate a dashboard.
- **Generated dashboard (`GeneratedMarketView.jsx`):** switch between ZIP, PUMA and tract. Metric buttons: Population, Race, Income, Home Value, Renter, Employment, Poverty. Then a year slider, a map, a trend chart (Absolute vs % Growth / Δpp) with a chosen start year, an age pyramid, and a year-by-year table (Values vs YoY) with pinned rows for Metro, Selected Range, Property bundle and City.
- **`SubmarketAnalysisList.jsx`:** sortable cards for the hand-built and generated dashboards.

**Data:** ACS5 2014–2024 is pre-built into `public/data/tx{Zip,Puma}AcsTimeSeries.json` (23 variables, `submarketDashboardGenerator.js:48-59`). Bracket bundles support exact medians. A live tract fetch uses `api.census.gov/data/{yr}/acs/acs5?get=…&amp;for=tract:*&amp;in=state:48` with a 24-hour localStorage cache (`censusAcsService.js:65-69`). The click panel uses `api.censusreporter.org/1.0/data/show`, release `acs2024_5yr` (`censusReporterService.js:12-28`).

**Metrics (`buildEntry`, `submarketDashboardGenerator.js:199-263`):**

| Metric | Formula |
|---|---|
| Renter % | B25003_003 / B25003_001 × 100 |
| Renter share by race | B25003{H,B,D,I}_003 / B25003_003 |
| Race % | B03002_003/004/006/012 ÷ B03002_001 |
| Median HHI, by race | B19013, B19013{H,B,D,I} |
| Renter / owner median income | B25119_003 / B25119_002 (`ownerIncomeUtils.js`) |
| Unemployment | B23025_005 / B23025_003 |
| "Job Growth" (employed residents) | B23025_003 − B23025_005 |
| Poverty | B17001_002 / B17001_001 |
| Owner-occupied | B25003_001 − B25003_003 |
| Click panel only | Vacancy = B25002_003/001; median gross rent B25064; per-capita income B19301; bachelor's+ = B15003_022..025 / 001 |
| Age pyramid | B01001 in 5-year brackets, male+female summed, shown as % (`ageBracketUtils.js:61-87`) |
| Migration (one dashboard) | B07010 by PUMA (`scripts/buildWoodBayouMigration.mjs`) |

**How groups of areas are combined (the most reusable part):**
- **Rules table** (`generatedZipDataUtils.js:358-383`): sum for counts, ratio of summed counts for rates, and **Pareto interpolation on summed bracket counts** for medians. It never averages medians.
- **`paretoMedian`** (`censusRenterAggregation.js:84-138`): `α = ln(C≥L / C≥U) / ln(U/L)`, `median = L·(C≥L/(C≥L−want))^(1/α)`, with a Pareto-tail formula for the open top bracket. Brackets: B19001 (16), B25118 (11), B25075 (26; 24 in 2014).
- **Capped medians** (250001, 2499, 2000001, 1000001, 9999) display as "$250k+" and are left out of growth and color scales (`:115-140`).
- **Scaled-total mean** (`:405-431`): total ÷ a fixed count of areas, so population growth isn't faked when Census redrew ZCTAs in 2021.
- **Growth** (`growthUtils.js:20-28`): every line rebased to the same start year. Percentage-point change for rate metrics; series missing a base-year value are hidden and counted.
- **Metro benchmark:** every ZCTA touching a 30-mile circle around the metro anchor (`zipDisplayUtils.js:126`, `scripts/buildMetroBenchmarks.mjs`).
- **Tracts** (`tractDataUtils.js`): a tract joins the dashboard if ≥50% of its land is inside the chosen ZIPs (`:19`). Reliability uses `CV = MOE/1.645/est`: good below 15%, fair 15–30%, low above 30% (`:102-106`). Pre-2021 data is moved from 2010 to 2020 tracts with block-level land/population weights, the NHGIS method (`buildTractTimeSeries.mjs:18,205`).
- **Wizard table** (`ZipcodeTableExport.jsx:119-155`): Pareto on `zipcodeBracketData.json`, which has 2,240 ZCTAs keyed `{totalHouseholds, incomeBrackets[16] (B19001), homeValueBrackets[26] (B25075)}`.

**`metroBenchmarks.json` keys:** `generatedAt`, `radiusMiles`, `years` (2014–2024), and `metros` (DFW, Houston, San Antonio, Austin, Fayetteville, Memphis). Each metro has `{label, anchor, radiusMiles, zipCount, populationMeanZipCount, employedMeanZipCount, medianMethod, populationMethod, zips, metrics}`, with 22 metric series.

**Not in this module at all:**
- Single-person households (B11001/B11016) and household size (B25009/B25010).
- Householder age by tenure (B25007) and income by householder age (B19037).
- Burden by income (B25074) and rent distribution (B25063).
- Units in structure / year built (B25024/B25034).
- Any demand, absorption, unit-mix or "what to build" logic.

B25070 cost burden appears only in the LIHTC module.

**Playbook (`docs/MARKET_ANALYSIS_PLAYBOOK.md`):**
- ETL query: `acs5?get=NAME,{vars}&amp;for=zip%20code%20tabulation%20area:*`, then filter in JS. A direct ZCTA filter fails for pre-2020 years.
- Retry on 429/5xx with backoff capped at 15s; negative sentinel values (e.g. −666666666) become null.
- Address geocoding: Census `onelineaddress?benchmark=Public_AR_Current`.
- Fixed rules include color bins that **don't change with the year** (min/max across all years and areas, §9 rule 3), no default highlight on the target ZIP, and percentage-point growth for percent metrics.

**Presentation ideas:** benchmark lines on every chart (metro, selected range, property bundle, city). Hover text on pinned rows explains how each was computed. Map, chart and table share the selection color. Click-to-rename dashboards. Map info card always shows the race mix.

**Private parts to avoid:**
- `analyzeCoStarData` (`MarketAnalyzer.jsx:251`).
- The "CoStar Report Analysis" slide (`:1002`).
- Hard-coded supply star ratings (`:137-205`).
- Niche school-district grades (`isdNicheService`, `:1112`). The TEA scores are public.

---

**Best candidates to rebuild for Pittsburgh:**
1. The HUD ETL chain (income limits → USPS crosswalk → FMR/SAFMR → QCT/DDA → HUD LIHTC database).
2. The `amiCalc` rent formula, paired with a real utility allowance source (the PHA schedule, or the state housing agency's QAP).
3. B25118 bracket interpolation into AMI bands, plus B25070 burden.
4. The capture-rate card, with existing LIHTC units subtracted.
5. Pareto aggregation and the scaled-total mean.
6. Common-base-year growth and fixed color bins.
7. MOE reliability marks.
8. "Verbatim + verify" source links.

You'd need to add the missing ACS tables (B11016, B25007, B19037, B25074) and build the basis/credit/equity/gap math from scratch.</result>
<usage><subagent_tokens>209861</subagent_tokens><tool_uses>68</tool_uses><duration_ms>342500</duration_ms></usage>
</task-notification>

## Claude

Two of the three searches are back. The Deepblue affordability module has no tax credit financing math, so the pencil step will be built from scratch. Its rent rule, demand-by-income-band count, capture-rate idea and nearby tax credit project map are worth rebuilding on public data. Waiting on the VisionPitts search.

## You

<task-notification>
<task-id>a00158208bca8c464</task-id>
<tool-use-id>toolu_017daVPzSU59QipuCs3Jzg8G</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/tasks/a00158208bca8c464.output</output-file>
<status>completed</status>
<summary>Agent "VisionPitts Analysis section today" finished</summary>
<note>A task-notification fires each time this agent stops with no live background children of its own. The user can send it another message and resume it, so the same task-id may notify more than once.</note>
<result>I've mapped what exists today. Everything below was read from the code; I modified nothing.

**The headline:** the Place page turns census need into a housing type and an affordable rent. It has no costs, no pro forma and no zoning dimensions, and the copy explicitly says it does not tell you "whether a project pencils" (`app/src/lib/place/copy.ts:40-50`).

All paths are under `/Users/ye/Documents/Ye-Zhang-Vision-Pitts/`.

## 1. Analysis UI structure

**Modes** (`app/src/lib/store.ts:6-9`): `'explore' | 'match' | 'tracts' | 'scenarios'`.
- In the UI these are "Place", "Compare places" and "Equity &amp; policy" (`app/src/lib/copy.ts:182-184`; pills in `app/src/components/AppShell.tsx:12-15`).
- Web URLs are `/explore`, `/place`, `/compare`, `/equity`. The offline file uses `#m=place|compare|equity` instead (`app/src/lib/hash.ts:194-195, 228-261`).
- Only these go into the URL: `t` (place), `b` (second place), `w` (weights), `s/sa/sb`, `c`, `L`, `p`, `lite`.
- The planning inputs and the tax credit entries are **never in the URL**. Planning inputs are session-only (`app/src/lib/place/planStore.ts`); tax credit entries are saved in the browser under `visionpitts.lihtc.v1` (`app/src/lib/lihtc/store.ts:7`).

**Container:** `app/src/components/AnalysisView.tsx` keeps the views mounted. There is no `Match/` folder; the Place view is `app/src/components/MatchView.tsx`.

**Place page layout** (`MatchView.tsx:449-498`):
- **Left rail:**
  - Tracts | ZIPs switch (`AreaSwitch`).
  - "Focusing issue": `place/FocusPicker.tsx`, four stance cards (Anti-displacement, Market-led, Transit-first, Climate-resilient). Picking one also applies that stance's preset weights (`MatchView.tsx:476-482`).
  - "Who you're planning for": `place/PlanInputs.tsx`.
  - Advanced settings: `place/AdvancedSettings.tsx`, which wraps `WeightPanel.tsx`. The weights only *order* types inside the suggested set; they never add or remove one.
- **Right column:** `AnalysisChat`, then one of: `ZipPanel` (ZIP mode), `TractDetail`, or `StartCard`.
- **Bottom-left:** `SuggestionLegend`.

**Order of the page for a selected place** (`TractDetail`, `MatchView.tsx:327-359`):
1. `PlanAnswer`, the answer card.
2. `TaxCreditSheet` (loaded on demand; left out of the offline file, `:47`).
3. `PlaceFolds` (`place/PlaceFolds.tsx:71-123`), in this order: Affordability, Who lives here, Market, Transit, Flood, Sun/shade/trees (`SiteConditions`, loaded on demand, not offline), Land use, Zoning (`ZoningPrograms`), Rules, Fit order.

If `place.json` is missing, the page falls back to `FitOrder`, `FactorTable`, `PressureCard` and `AboutPlace`.

**Inputs** (`app/src/lib/place/planStore.ts:21-30`):
- Focus (stance).
- Income level: 30, 50 or 80% AMI, or "market".
- Household size: `'auto'` (the default) or 1–5+.
- Age: "any" or an age bracket from census table B25007.
- Homes needed (optional).
- Flood limit: none, ≤5%, ≤15% or any.
- Transit distance: ¼, ½ or 1 mile.

**Homes needed never changes the recommendation.** It is not passed to `suggestAll` (`MatchView.tsx:401`). It only feeds `homesLines`, which writes two sentences in the collapsed Details: share of qualifying households served, and the yearly rent gap = (asking − rent that fits) × 12 × homes.

**Outputs** (`place/PlanAnswer.tsx:166-322`):
- Lead housing type, home size and who it serves; "Also fits" chips.
- Rows: Rent (what fits, or the market rent), Serves (CHAS household count), Age (B25007), Market (asking rent and gap per month, or the income needed at market rate), Flood.
- A Details fold, then the "not advice" note.
- The map is colored by each tract's lead type.

## 2. Rules library

**`app/src/lib/place/thresholds.ts`**
- All cut-offs live in `THRESHOLDS` (`:4-61`): 64 departures = frequent stop; transit test 50% of residents or 1,000 departures within ¼ mile; displacement 0.67 / 0.33; `min_sales` 10; price-to-income 3×; 2–4 unit share 10% or 50 parcels; 100 vacant parcels; flood check above 15%; climate flood ≤5%; 1.5 persons per bedroom; 30% of income.
- Also: `DENSITY_ORDER`, `DEFAULT_FIT_ORDER`, `CLIMATE_ORDER`, `SERVES` (household types each building type serves), `TYPE_BEDROOMS`.

**`app/src/lib/place/afford.ts`**
- `limitFor` (`:44`): HUD income limit; a half-person size is the mean of the two neighbouring sizes.
- `limitAt100` (`:58`): derived 100% line, median × HUD family-size factor.
- `ceilingRent` (`:103`): `limit ÷ 40` (= 30% ÷ 12), with persons = 1.5 per bedroom (studio = 1; senior alone = 1).
- `marketTest` (`:142`), using the 2BR asking rent only when confidence is medium or high:
  - asking ≤ ceiling → `market_reaches`;
  - ceiling &lt; SAFMR and asking ≤ SAFMR → `needs_subsidy` (a voucher reaches it);
  - otherwise → `gap` in $/month;
  - no usable asking rent but ceiling &lt; SAFMR → `needs_subsidy`; else `unknown`.

**`app/src/lib/place/bands.ts`**
- `rankBands` (`:25`) and `targetBand` (`:44`): the band with the most renters paying over 30% of income.
- `tenantProfile` (`:108`): the largest CHAS type sets the bedrooms.
- `sumBands` / `sumTypes`.

**`app/src/lib/place/plan.ts`**
- `levelBands` (`:149`): a level reads every band at or below it; "market" reads 80–100% and above 100%.
- `sizeBedrooms` (`:155`): 1–2 people → 1BR, 3–4 → 2BR, 5+ → 3BR.
- `ceilingForSize` (`:159`): limit for N persons × 30% ÷ 12.
- `marketRent` (`:173`), `resolveHousehold` (`:272`; with `'auto'`, size comes from the largest CHAS type: elderly alone 1, other 1, elderly family 2, small family 3, large family 5), `planTenants` (`:309`), `levelTarget` (`:358`), `floodCheck` (`:396`), `transitTestMiles` (`:409`), `homesLines` (`:421`).

**Important nuance on the price rule:** the UI always passes a size (the default is `'auto'`), so the **displayed rent uses `ceilingForSize` (persons = household size), not the 1.5-per-bedroom rule**. `ceilingRent`'s 1.5 rule only drives the 2BR market-test ceiling (3 persons), the anti-displacement 50% rent shown beside the 30% rent, and calls made without a size.

**`app/src/lib/place/feasibility.ts`** (annotations, never gates)
- `lotPattern` (`:18`), `floodWord` / `floodNote` (`:53/62`), `zoningNote` (`:81`, always suffixed "(unverified: confirm in Title 9)").

**`app/src/lib/place/recommend.ts`**
- `recommend()` (`:366`) works in this order: band → tenants → price → market test.
- Stance rules (`:427-487`):
  - **Market rate + Anti-displacement + high risk:** nothing.
  - **Market rate (other cases):** the Market-led test (`marketLedTest` `:293`: asking ≥ SAFMR **and** home value ≥ city median). Transit-first and Climate-resilient also apply their own test.
  - **Anti-displacement:** risk ≥ 0.67 → ADU and duplex/triplex only, plus senior and small apartment only if there are ≥100 vacant parcels; townhome excluded. Otherwise all types, with townhome excluded for the ≤50% bands.
  - **Market-led:** if the test passes, the fit order minus senior.
  - **Climate-resilient** (`climateTest` `:339`): flood share ≤5% and frequent transit within the chosen distance.
  - **Transit-first:** densest first; no ADU.
- Overrides afterwards: no burdened renters → nothing (`:491-498`); under-62 → no senior (`:500`); over the flood limit → nothing (`:505`).
- `homeValue` (`:286`): uses the sale median since 2023 when there are ≥10 sales, else the ACS value.
- `notServedByMarket` (`:248`): for townhomes, price &gt; 3 × the band's income limit.
- `underEachStance` (`:576`) is exported but **only used in tests**.

**Other files in `app/src/lib/place/`:**
- `suggest.ts`: runs `recommend` over all 128 tracts.
- `context.ts`: the city median home value comes from `meta.city_medians` (207,850). That is the **median of the tracts' medians**, not the city's ACS figure.
- `zoningAnalysis.ts`: a copy of the zoning family table; `landForType`, `landByGroup`, `multiUnitLand`.
- Also `whyDiffer.ts`, `zipView.ts`, `fixture.ts`, and `copy.ts` (below).

**`app/src/lib/lihtc/` (tax credit score sheet)**
- `score.ts`: `itemPoints` (`:122`), `tally` (`:152`, applies shared caps, then section caps), `scoreSheet` (`:223`), `moves` (`:254`, open lines ranked by gain).
- `place.ts`:
  - `factsFor` (`:49`): transit counts only if ≥99.5% of the tract's lots are within ½ mile of a stop.
  - `evidenceFor` (`:72`): text facts only (need, families, seniors, poverty, owners, market, vacant, zoning, sun, canopy).
  - `designations` (`:118`): QCT, DDA, OZ.
- `store.ts`: local storage; project entries are kept per sheet, site entries per sheet and place.

**Which tax credit lines are measured vs typed in:**
- **Measured:** only A.2.d / A.2.j, transit-oriented design (2 pts, `input:auto`). The 2027/28 draft line 4.2.3 also needs the transit fact.
- **Typed in:** everything else (check boxes, choices, percents with tiers, points). That includes A.1.a "Area of opportunity" (13 pts, tagged as a place line but entered as points), Walk Score and the school score.
- **Two sheets** in `app/src/data/lazy/lihtc_pa.json`:
  - 2025/26 adopted: 232 points, minimum 125 (9%) / 110, sections A, B, C, D, F, four cap groups.
  - 2027/28 draft: 205 points, minimum 120.
- There is **no credit pricing, equity or gap calculation**. QCT/DDA are shown only as "Eligible basis counts at 130%. More equity, no points."

## 3. Data products

**`app/src/data/place.json`** (275 KB): 128 tracts keyed by GEOID. Example tract `42003562300`, abbreviated:
```
renter_hh:720
bands:{le30|b30_50|b50_80|b80_100|gt100:{hh,moe,burden30,burden50}}
types:{le30|b30_50|b50_80|gt80:{elderly_alone,elderly_family,small_family,large_family,other}}
market:{asking_2br:1150,asking_n,asking_conf,acs_rent:644,acs_rent_moe,zip:"15207",safmr_2br:1350,
        value_acs,value_acs_moe,value_nbr_acs,sale_median:162800,sale_n:32,sale_nbr_median,sale_nbr_n,census_2br,census_2br_moe}
stock:{sfd_share,units_2_4_share,units_5_19_share,units_20plus_share,vacancy_share,parcels_2_4,vacant_parcels}
transit:{freq_share_qmi,freq_dist_mi,any_dist_mi,departures_qmi,departures_pct}
access:{jobs_1mi,jobs_1mi_pct,school_mi,elem_mi,grocery_mi,services_halfmi}
flood:{fema_sfha_pct,fema_zone,hand_pct}
zoning:{shares:{R1D:.10,…,P:.45},by_type:{adu:"conditional",…},verified:false}
land_use:{residential…other,vacant_lots,parcels,parcel_shares}
programs:{qct,dda,oz,cdbg}  displacement:{score:.717,conf}  renter_age:[7 B25007 brackets]
```
`access` and `land_use` are not in `app/src/lib/place/types.ts`; the code reads them with casts.

**`app/src/data/hud_2026.json`:**
- `metro`: name, fy, median 110,400, `il30/il50/il80` for 1–8 persons, `fmr` for 0–4BR.
- `safmr`: 393 ZIPs × 0–4BR.
- `city`: sale median 255,000, 6,193 sales.

**How they're built:** `scripts/10_build_place_measures.py` (`--tier2` adds zoning, FEMA and parcels) calls `src/visionpitts/place_measures.py`. The module header (`:7-31`) lists the sources:
- CHAS 2018–22 Table 8 (bands) and Table 7 (types).
- HUD User API (income limits, SAFMR).
- Dewey asking rents; ACS B25064, B25077 (filled from older vintages when null), B25031_004, B25007.
- Assessment sales since 2023 (`parcel_measures` `:930`).
- PRT GTFS; LODES, NCES and OSM for access.
- HAND terrain screen and FEMA flood zones (water removed first).
- WPRDC zoning plus `config/zoning_rules.json`.

**Zoning:**
- `config/zoning_rules.json`: `verified:false`, `threshold_share:0.05`, 17 families (R1D, R1A, R2, R3, RM, H, LNC, NDO, UNC, HC, UI, NDI, GI, RIV, GT, P, PLANNED), each with a by-right status (yes / conditional / no / unknown) for the five types.
- `app/src/data/zoning_districts.json` (536 KB, inside the offline bundle): 56 features with `code, family, family_label, zfam` and the five statuses.
- **Dimensional standards (height, FAR, lot coverage, minimum lot size, setbacks, parking): not found anywhere.**

## 4. Geography and ACS coverage

**Levels** (`src/visionpitts/acs_levels.py:24-32`): tract, block group, ZCTA, muni, county, city.
- Bundled city subset: 128 tracts, 314 block groups, 32 ZCTAs, 129 munis.
- County-wide rows (394 / 1,062 / 170) come from Supabase tables `acs_values` / `geo_units` (`supabase/migrations/0001_init.sql`).

**Variables:** 37 ACS-derived variables plus land use and zoning give the 51 keys per unit in `app/src/data/acs_{level}.json`.
- **Place data** (tenure, CHAS bands and types, renter age, 2BR rent) exists for the 128 city tracts only.
- **ZIP data:** `app/src/data/equity_zip.json` holds tract aggregates weighted by housing units (burdened renters, renters by level, access, asking rent). There is no CHAS data at ZCTA level.

| Table | Tract | ZCTA | Notes |
|---|---|---|---|
| B25003 tenure | yes | yes | `renter_share`, `renter_hh`, `owner_hh` |
| B11001 | total only | total only | **no one-person households**; B11016 and B25009: not found |
| B25007 age by tenure | city tracts only | no | `place.json` `renter_age` |
| B25118 income by tenure | not found | not found | |
| B25070 rent burden | yes | yes | 30%+ and 50%+ shares; B25072: not found |
| B25042 bedrooms by tenure | not found | not found | |
| B25024 units in structure | yes | yes | SFD, 2–4, 5–19, 20+ shares; B25032: not found |
| Year built | B25035 median only | same | B25034 distribution: not found |
| B25063 rent distribution | not found | not found | B25031_004 (2BR median) only, in `place.json` |

For a single-person proxy, the CHAS "elderly_alone" and "other" types exist by tract.

## 5. Financial items already in the app

- **Asking rents (Dewey):**
  - `app/src/data/asking_rents.json`: county and city 2BR medians, 2019–26.
  - `app/src/data/asking_rents_areas.json`: 115 tracts, 29 ZCTAs, 108 munis (rent series, level, growth, confidence).
  - `place.json` `market.asking_2br`.
- **Sale prices:** tract and neighbour medians plus the city median (above). The parcel card shows no prices.
- **Rent gap / subsidy** (`app/src/lib/equity/policy.ts`):
  - `rent60TwoBedroom` (`:98`): 60% limit = 50% limit × 1.2.
  - `gapCost` (`:133`): max(0, gap) × 12 × homes.
  - `largestGaps` (`:148`).
  - `bonusAffordableHomes` (`:112`): 10%.
- **Equity rent gap** (`app/src/lib/equity/measures.ts:123-181`): falls back to the census 2BR rent; the 100% AMI rent = median × 0.9 ÷ 40.
- **Not found:** pro forma, NOI, cap rate, construction or land cost, operating expenses, debt sizing, tax credit equity, development cost.

## 6. Constraints and conventions

- **Offline file:** `docs/assumptions.md:177` says `export/index.html` must stay under 6 MB. It is currently **5,999,341 bytes**, so there is effectively no room. Lines 253 and 270 say online-only data goes in `app/src/data/lazy/` (`lihtc_pa.json` 56 KB, `site_tract.json` 32 KB) or `app/src/data/online/` (`canopy.json`, `sources.json`).
  - Excluded pieces are guarded with `import.meta.env.MODE === 'export' ? null : lazy(...)`.
  - No automated size check was found; `app/scripts/check_export.mjs` is a Playwright smoke test only.
- **Tests:**
  - App: 45 `*.test.ts` files, about 452 `it`/`test` calls by static count. `docs/TECHNICAL.md:50` says 472.
  - Python: 15 files, 175 `def test_` by static count. `TECHNICAL.md:68` says 271, including parametrized cases.
  - `tests/test_docs_numbers.py` checks numbers written in `docs/assumptions.md`, `docs/data/factor_methods.md`, `docs/TECHNICAL.md` and `app/src/lib/about.ts` against `meta.json`, `scoring.json`, `tracts.json`, the flips list and the slider.
  - Tests also keep the zoning table copies in step with the config.
- **Docs:**
  - `docs/TECHNICAL.md` sections: Build timeline, What it does, Quick start, How the data flows, Supabase, Data sources, Method, Limitations, Tools, AI use, Team.
  - Its Analysis text still says "Match / Compare scenarios / Compare tracts". This is out of date.
  - **The stance rules are not documented in `docs/assumptions.md`.** Three places cite "§11" for them (`app/src/lib/place/copy.ts:71`, `app/src/lib/export/builders/compare.ts:195`, `PlaceFolds.tsx:108`), but §11 is now Sun and shadow.
  - The tax credit sheet is in §12 and `docs/data/lihtc.md`.
  - README "What it does" (`:52-55`) and "Limitations" (`:91-99`) already say there are no building costs and that zoning is a screening reading.
- **Copy style** (`app/src/lib/place/copy.ts`):
  - Every number carries its arithmetic ("$49,700 × 30% ÷ 12 = $1,242").
  - "not available" is shown instead of a guess; nothing is imputed.
  - The fixed `DECIDE` sentence (`:37`) and `REFUSES` list (`:40-50`): construction or land cost, whether a project pencils, a site, verified zoning, the PHFA score, absorption, 2026 incomes. These are rendered as `NOT_CLAIMED` in `place/Rules.tsx:20`.
  - `RULES_IN_WORDS` (`:52`), `STANCE_MEANING` / `STANCE_CAVEAT`.
  - `NOT_ADVICE` from `app/src/lib/about.ts`.</result>
<usage><subagent_tokens>241445</subagent_tokens><tool_uses>78</tool_uses><duration_ms>523387</duration_ms></usage>
</task-notification>

## Claude

All three searches are back. Before designing, I'm checking two details myself: which PHFA score lines could be measured, and how the zoning district codes are written.

- *Bash*: List the PHFA score sheet lines and their input types
- *Bash*: List zoning district codes and data folders
- *Bash*: Read definitions of measurable PHFA score lines

## Claude

I have what I need for the design. Next, one planning agent will check it against the actual files, tests and data flow, while I verify the remaining policy and data facts.

- *Agent*: Design practical Analysis update
- *WebFetch*: https://engage.pittsburghpa.gov/implementing-the-housing-needs-assessment/affordable-housing-bonus-program
- *WebSearch*: PHFA 2025-2026 QAP maximum tax credit per development cap per unit development cost limits
- *WebSearch*: Housing Authority City of Pittsburgh utility allowance schedule 2026
- *Bash*: Check LIHTC doc for credit caps and ACS history contents
- *Bash*: Inspect ACS history metadata and LIHTC doc header
- *WebFetch*: https://www.phfa.org/forms/multifamily_application_guidelines/guidelines/2025/2025-mpg-03.pdf
- *Bash*: Search the PHFA plan PDF for credit caps and underwriting rules
- *Bash*: Read the PHFA basis limit, developer fee and credit cap text
- *Bash*: Search the plan text for award caps and underwriting standards
- *Bash*: Read the per-project credit maximums and pool shares

## Claude

I've confirmed the key public figures from PHFA's adopted 2025/2026 plan:

- **Basis limit per home:** $320,000 for 9% deals, $380,000 for 4% deals.
- **Annual credits per 9% project:** at most $1.7–1.85M.
- **Developer fee:** 15% of the first $10M of cost, then 10%, capped at $1.75–2.55M.
- **Feasibility test:** a project's funding gap must be under 50% of its developer fee.

Pittsburgh's inclusionary overlay requires 50% AMI rents, held for 35 years. The proposed citywide bonus, Council Bill 2025-1545, is not adopted. I'm waiting on the planning agent's check before writing the plan.

## You

<task-notification>
<task-id>ab0689ad93b621435</task-id>
<tool-use-id>toolu_01FF8bn61raK2N8EzaQnCJzr</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/tasks/ab0689ad93b621435.output</output-file>
<status>completed</status>
<summary>Agent "Design practical Analysis update" finished</summary>
<note>A task-notification fires each time this agent stops with no live background children of its own. The user can send it another message and resume it, so the same task-id may notify more than once.</note>
<result>I've finished the review. Below is the file-level plan. I changed nothing.

# VisionPitts Analysis upgrade: implementation plan

## A. Parts of the draft that are wrong, too big, or clash with the code

1. **4.7.1 (cost vs the round's median) can't be filled in.** Its own rule text in `lihtc_pa.json` says "Known only after the round closes". Leave it typed.
2. **D.4.a needs "commitments in place".** The model can only show the arithmetic: gap under 25% of the developer fee. Show that as a hint, not a ticked box. A.2.c and A.2.i are the same case: they need a "shown financial benefit" and are not allowed with income averaging.
3. **The denominators are specific.**
   - B.1 counts all units, market-rate included.
   - B.4 and 4.3.4.a are affordable 3+ bedroom homes ÷ all rental units. They don't apply at 7 or more stories or to senior housing, so the building inputs need a stories field.
   - Every tier is strict "over".
4. **"7+ people → 4 bedrooms" conflicts with the code.** `Bedrooms` is `0|1|2|3` (`lib/place/types.ts`), and `plan.ts` already has `SIZE_RULE`/`sizeBedrooms` (5 or more → 3 bedrooms). Reuse that rule and label the top group "3+ bedrooms", which also matches B.4. A second rule would disagree with the answer card.
5. **Comparing household size (B25009) with renter units by bedrooms (B25042) doesn't measure supply.** Both describe the same occupied homes, so the result shows how current renters are housed. Word it as "N renter households of 1–2 people; M renter homes with 0–1 bedrooms". Print the margin of error, and don't say "short" when the margins overlap.
6. **B25063 has no bedroom split.** Use **B25068** (bedrooms × gross rent) for "existing homes below the tax credit rent" by size. For rent ÷ income, add **B25119** (renter median income); the all-household median understates the burden.
7. **No Pareto interpolation is needed.** ZIP comes straight from the ZCTA and the city from the city-level ACS. **Renter growth from 2014 to 2024** can come from the existing `data/processed/acs_history_{tract,zcta,city}.csv`; no new fetch.
8. **Re-verifying `config/zoning_rules.json` is too big for this round.**
   - `tests/test_place_measures.py:355` asserts `verified is False`.
   - The families mix several districts.
   - Changing it changes the eagerly loaded `place.json` and `zoning_districts.json`, plus `ZONING_SUFFIX` and `ZONING_CAVEAT`.
   - Instead, put checked per-district use permissions (P/A/S/C/N) in the new standards file, used only by the new section.
9. **Inclusionary zoning by neighborhood outline is wrong.** The overlay boundaries are not the neighborhood outlines. Use the City's overlay polygons if they are published; otherwise label it as a neighborhood approximation. Check whether the rule has been expanded citywide; don't hard-code four neighborhoods.
10. **MTSP limits must not go in `hud_2026.json`, and new thresholds must not go in `lib/place/thresholds.ts`.** Both are in the main bundle. Put them in lazy data and lazy modules.
11. **A.1.b (school score) is low value.** It is worth 2 points on the adopted sheet only, is not in the 2027/28 draft, and there are no school feeder boundaries in the repo (assessments only carry SCHOOLCODE, the district). Show it as evidence or defer it.
12. **The store drops "no" answers.** `putAnswer` deletes `false`, so a typed "no" can't override a "yes" that came from the plan (only `TRANSIT_KEY` is exempt). This needs a general fix.
13. **"Homes needed" already exists** as `planStore.homes`. Use it as the single number of homes.

## B. Byte budget and where everything mounts

`export/index.html` is 5,999,341 bytes, so there are **659 bytes** of room.

- **One lazy slot.** In `app/src/components/MatchView.tsx:47`, replace the `TaxCreditSheet` lazy load with `const ProjectPanel = import.meta.env.MODE === 'export' ? null : lazy(() =&gt; import('./place/project/ProjectPanel'))` in the same place (`:336-340`). This costs about zero bytes.
  - `ProjectPanel.tsx` shows four cards in Ye's order: **Who needs it** (`DemandMix.tsx`), **What can be built** (`BuildCapacity.tsx`), **Tax credit score** (the existing `TaxCreditSheet`, imported normally inside the lazy chunk), and **Does it pencil** (`Pencil.tsx`, a nested lazy chunk).
- **ZIP view:** in `ZipPanel.tsx`, add one guarded `lazy(() =&gt; import('./project/ZipDemand'))` below `zip-profile`. Measure the bytes.
- **No new fields** in `place.json`, `hud_2026.json`, `sources.json`, `about.ts`, or `thresholds.ts`. New sources use `online=True` in `src/visionpitts/sources.py`, which writes `data/online/sources.json`.
- **Stale "§11" references:** change "§11" to "§14" in `copy.ts:71`, `export/builders/compare.ts:195` and `PlaceFolds.tsx:108`. Same length, so no bytes.
- **REFUSES:** it is still true; the pencil card says "arithmetic on your inputs". Optionally swap 'verified zoning' for 'a zoning ruling', which is 2 bytes shorter, and update `copy.test.ts:31`.
- **Guard test (new `app/src/lib/lazyGuard.test.ts`):** fail if any main-bundle file (`MatchView`, `PlaceFolds`, `ZipPanel`, `lib/place/*`, `lib/export/*`) statically imports `components/place/project/*`, `lib/{demand,zoning,pencil,project}/*`, or `data/lazy/*`.
- **Measure** with `cd app &amp;&amp; npm run export &amp;&amp; wc -c ../export/index.html` after every phase.
- **Exports:** the new sections stay out of the PDF and CSV builders. `ProjectPanel` gets its own "Project sheet (CSV)" button using `lib/export/csv.ts` `toCsv`/`downloadCsv`, called from the lazy chunk.

## C. Module 1: Who needs it (type and unit mix)

**Python**
- New `src/visionpitts/demand.py` and `scripts/17_build_demand.py`.
- Reuse `acs_levels.request_rows`, `rows_to_frame`, `geo_clause('zcta', zctas)` (take the ZCTA ids from the `acs_zcta.json` keys), `share_with_moe`, `cv` and `reliability`, plus `place_measures._clean_estimates`. Cache in `data/raw/acs/acs5_2024_{level}_demand.csv`.
- Tables: B25009, B25042, B25068, B25118, B25119, B25032, B25014 (crowding, optional), and B25007 at ZCTA only.
- Check every variable's label against the API's `variables.json` instead of trusting cell numbers.
- The same script reads the **HUD LIHTC database** (LIHTCPUB, county 42003) into `data/raw/benchmark/lihtc/`. Aggregate only per tract, per tract plus a 1-mile buffer, and per ZCTA.

`app/src/data/lazy/demand.json`:
```
{built, acs:"2020–2024", edges:{inc:[...11], rent68:[...]}, lihtc_through:&lt;max YR_PIS&gt;,
 city:U, zips:{"15206":U}, tracts:{"42003…":U &amp; {zip}}}
U = {renters:[e,m], size:[7], br:[6], rent_br:{"0":[..],"1":[..],"2":[..],"3":[..]}, inc:[11],
     inc_renter_med:[e,m], struct:[10], age?:[7], g:{renters:[y14,y24], rent:[..], income:[..]},
     rel:{one_person:"high|medium|low",…}, lihtc:{projects, li_units, li_units_20y, li_units_1mi, ending_30y_by_2031}}
```
- `tract.zip` = `place.market.zip`, the same ZIP the Market card uses for the ZIP rent level, rather than `mainZipOf`.
- Label the ZIP column "whole ZIP (census ZCTA)". The ZIP panel's CHAS figures cover the city part only.

**TypeScript (`app/src/lib/demand/`)**
- `thresholds.ts`: the signal cut-offs, printed.
- `interp.ts`: renters below a cut-off by straight-line interpolation inside a bracket; the top bracket is not interpolated.
- `mix.ts`:
  - `demandMix` reuses `sizeBedrooms`.
  - `stockCompare` works from B25042.
  - `recommendedMix(N, shares)` uses largest-remainder rounding with a fixed tie order.
  - `belowRent(rent_br, rent)` counts homes below a rent.
  - `captureRate(proposed, qualified, existingLI)` returns its formula.
- `signals.ts`: tract vs ZIP vs city for renter share, one-person share, share of renter householders 65+, share of 5+ person households, renter growth, and rent ÷ income. Every line carries its arithmetic. Reuse `bundledValues()` from `lib/explore/catalog` (already in the main bundle) for shares that already exist.
- At tract level, the tenants at a given income level still come from CHAS through `planTenants`/`typesUpTo`. ACS figures are shown beside them for tract and ZIP alike, so the comparison is like for like.
- **Signals never change `recommend()` or `suggest.ts`**, so the map is unchanged. The card says "within the suggested types (…) the demand points to …".

**Store (`app/src/lib/project/store.ts`)**
- Saved in the browser under `visionpitts.project.v1`. Same `load()` and subscribe pattern as `lib/lihtc/store.ts`.
- `{mix:{mode:'suggested'|'mine', shares, counts:Record&lt;'30'|'50'|'60'|'80'|'mkt', [n0,n1,n2,n3]&gt;}, building:{stories, perPlace:{[geoid]:{district, lotSqft, frontageFt}}}, pencil:{branch, inputs}}`
- The number of homes is `usePlan().homes`. In "mine" mode it is the sum of the counts.

## D. Module 2: What can be built (zoning)

**`config/zoning_standards.json`**, transcribed by reading ecode360 in Chrome, two passes:
```
{code:"Pittsburgh Code, Title Nine", url, current_through, read_on,
 districts:[{code:"R2-M", chapter:"903", section:"§903.03…", verified:true,
   uses:{single_detached:"P",single_attached:"…",two_unit:"P",three_unit:"…",multi_unit:"N",elderly:"…"},
   min_lot_sqft, lot_sqft_per_unit, min_frontage_ft, front_ft, rear_ft, side_ft, max_height_ft,
   max_stories, max_coverage, max_units, notes}],
 not_computed:["RIV-*","SP-*","EMI","UPR-*",…], parking:[{use, rule, section, verified}],
 inclusionary:{section, share, ami, min_units, tenure, areas_source, verified}}
```

**Python**
- New `src/visionpitts/zoning_capacity.py` and `scripts/18_build_zoning_capacity.py`.
- Reuse `land_use.read_assessments` (LOTAREA, USEDESC), `place_measures.parcel_tracts`, `zoning_download`, and `land_use_class`. Join on a representative point in each lot.
- `units_by_right(std, lot_sqft)` = 0 below the minimum lot size (flagged), else `min(floor(lot / per_unit), max_units)`, with the use status for that building type.
- Output tract totals only: vacant lots, median vacant lot size, homes by right on vacant lots by district, lots below the minimum, and lots allowed more homes than they have today.
- Writes `app/src/data/lazy/zoning_capacity.json`, a copy at `data/lazy/zoning_standards.json`, and `tests/fixtures/zoning_capacity_cases.json` (a new fixture; existing ones untouched).

**TypeScript:** `lib/zoning/capacity.ts` holds the same rule plus `envelope()`: (frontage − sides) × (depth − front − rear) × stories, where depth = area ÷ frontage, labelled "rough". `BuildCapacity.tsx` shows the district table for the tract and the lot calculator. It links to the existing Zoning card, which stays as it is.

## E. Module 3: Tax credit score, more measured

New `lib/lihtc/fromPlan.ts`:
- `planFacts(mix, building, pencil?)` gives the ≤50% share, the affordable 3+ bedroom share, the market share, the stories, and the finance results.
- `autoAnswers(sheet, setup, facts)` fills **B.1, B.4, 4.3.1, 4.3.4.a, D.4.b and 4.5.9** (the option ids `'under10'` and `'10-30'`). Each value carries a formula such as "17 ÷ 50 = 34%".
- `hints()` covers D.4.a, A.2.c and A.2.i.
- `mixMoves()` finds the smallest unit change that reaches the next tier and re-runs `scoreSheet` to get the gain, e.g. "3 more affordable 3-bedroom homes → B.4 +2".

Changes to existing files:
- `TaxCreditSheet.tsx`: answers = `{...auto, ...typed}`, a "from your plan" tag on each line, and a "Mix changes" list next to `moves()`.
- `store.ts`: keep an explicit `false` for lines that have a plan value.
- `place.ts` `evidenceFor`: add `lihtc` (tax credit homes in the tract, within 1 mile, and in the last 20 years).
- `lihtc_pa.json`: add `"lihtc"` to the evidence of A.1.a, A.1.c, 4.2.1.g and 4.2.1.s. `score.ts` does not change.

## F. Module 4: Does it pencil

**Defaults file**
- `config/pencil_defaults.json`, copied to `app/src/data/lazy/pencil_defaults.json` by `src/visionpitts/pencil_defaults.py` and `scripts/19_build_pencil_defaults.py`.
- MTSP limits come from `place_measures._hud_get('mtspil', 2026)`. Read the published 60% and 80% tables rather than computing them.
```
{retrieved, mtsp:{fy, area, l:{"30":[8],"50":[8],"60":[8],"80":[8]}, source},
 ua:{source:"HACP schedule", effective, by_br:[5], verified},
 inputs:{key:{value|null, unit, kind:"sourced"|"assumption", source?, ref?, note}}}
```
- **Sourced:** credit rates (9% and 4% floors, IRC §42(b)), the 130% basis boost (§42(d)(5)(B)), and the 25% bond test (2025 law; check). The PHFA credit and developer-fee caps are sourced only if they are found in the QAP.
- **Your assumption:** hard cost per square foot (HUD TDC limits shown as a reference only), opex, equity price, rate, DSCR, vacancy, unit sizes. Ye decides between leaving these blank and an "example values" button.

**Arithmetic (`app/src/lib/pencil/`, pure functions that each return `{value, formula}`)**
- `rents.ts`: `taxCreditRent` = floor(MTSP × 30% ÷ 12) at 1.5 persons per bedroom, minus the utility allowance.
- `operating.ts`: gross rent → effective gross income → NOI.
- `debt.ts`: `mortgageConstant` and `loanFromNoi`.
- `credits.ts`: eligible basis, the boost (automatic from `programs.qct`/`dda`), the applicable fraction = min(unit share, floor-space share), credits × 10 × price, `bondTest`, and `setAside` (40/60, 20/50, income averaging).
- `gap.ts`: sources and uses, gap, and gap per affordable home.
- `market.ts`: yield on cost, break-even rent, residual land value.
- `grid.ts`: the 5×5 sensitivity table.
- `inclusionary.ts`: applies the set-aside when the site is in the overlay and has 20 or more homes.

## G. Phases (each one leaves the app working and the tests passing)

- **Phase 0:** add the `ProjectPanel` shell holding only `TaxCreditSheet`, the lazy guard test, the §11→§14 fixes, and `docs/assumptions.md` §14 (the stance rules written out from `recommend.ts` and `RULES_IN_WORDS`). Measure the bytes.
- **Phase 1:** `demand.py`, script 17, LIHTC supply, the project store, `lib/demand`, `DemandMix`, `ZipDemand`, `docs/data/demand.md`, §15, sources.
- **Phase 2:** transcribe the standards, `zoning_capacity.py`, script 18, `lib/zoning`, `BuildCapacity`, `docs/data/zoning_capacity.md`, §16.
- **Phase 3:** `fromPlan.ts`, the store fix, the evidence additions, updates to `docs/data/lihtc.md` and §12.
- **Phase 4:** script 19 and the MTSP and utility allowance data, `lib/pencil`, `Pencil`, filling D.4.b and 4.5.9, `docs/data/pencil.md`, §17, the Analysis text in `TECHNICAL.md`, and the REFUSES decision.
- **Before Ye commits:** Ye runs a case-insensitive `git grep` for the employer name by hand. Don't put the name in any test.

## H. Tests

**vitest**
- `demand/{interp,mix,signals}.test.ts`: brackets add up; largest remainder sums to N; null-safe.
- `zoning/capacity.test.ts`: TS gives exactly the Python fixture's results.
- `lihtc/fromPlan.test.ts`:
  - exactly 10% scores 0 on B.1;
  - B.4 is off at 7 stories and for senior housing;
  - every mapped line id exists in both sheets, so a new sheet fails loudly.
- `lihtc/store.test.ts`: an explicit `false` survives.
- `pencil/*.test.ts`: hand-worked cases; the base cell of the grid equals the base gap.
- **Rent parity:** a fixture of PHFA's published 2026 Allegheny County tax credit maximum rents.
- `project/store.test.ts`: handles corrupted storage.
- The existing ~472 tests stay unchanged except `copy.test.ts`, if REFUSES changes.

**pytest**
- `test_demand.py`: label checks and bracket mapping on fixture rows.
- `test_lihtc_supply.py`: county filter, the 20-year window, the buffer.
- `test_zoning_capacity.py`: every row has a section and a `verified` flag; every residential or mixed district in `zoning_districts.json` is either covered or listed as not computed; aggregation.
- `test_pencil_defaults.py`: every input has a `kind`; every source id is in `sources.by_id()`; 8 household sizes; MTSP 60% = 1.2 × 50% within HUD's rounding.

**`test_docs_numbers.py`**
- Don't reword the sentences it matches; the income-limit and FMR sentences are in `assumptions.md`.
- Any number in the new docs gets a claim computed from the new JSON files, with the new docs added to `DOCS`.

## I. Risks

1. **659 bytes of room.** Everything new goes through the one lazy slot, and bytes are measured after each phase.
2. **`place.json` is in the main bundle:** add no fields.
3. **The map:** `suggest.ts` and `recommend()` stay unchanged.
4. **Rent figures will disagree on the same page.**
   - Today's 30% rule uses Section 8 limits rounded half to even.
   - The tax credit rent uses MTSP, rounded down, net of the utility allowance.
   - At 30% for a 3-bedroom, Section 8's poverty-line floor (5 people = $38,680) gives $897, while MTSP (0.6 × 50%) gives about $861.
   - Fix: label the two figures differently, and add a test that pins down how MTSP 50% relates to Section 8 50%.
5. **Zoning transcription.**
   - Read ecode360 twice and record the "current through" date.
   - Check the City's legislation records for amendments made after that date.
   - Riverfront and specially planned districts show "not computed".
   - Parking reform stays marked unverified.
6. **Vacant land isn't buildable land** (slopes, lots of record, rights of way). Label the figure as an upper bound.
7. **Tract ACS margins are wide:** show the reliability rating.
8. **The ZIP figure is the whole ZCTA,** while the ZIP panel shows the city part.
9. **HUD LIHTC data:** the placed-in-service year runs only to the file's latest year, and "ending use" is placed-in-service year + 30 (an assumption).
10. **Unsourced defaults can look official.** Mark them clearly as your assumptions.
11. **If PHFA adopts the 2027/28 plan,** the line-id test catches the change.

### Critical files for implementation
- /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/MatchView.tsx
- /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/TaxCreditSheet.tsx
- /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/lihtc/store.ts
- /Users/ye/Documents/Ye-Zhang-Vision-Pitts/src/visionpitts/place_measures.py
- /Users/ye/Documents/Ye-Zhang-Vision-Pitts/tests/test_docs_numbers.py</result>
<usage><subagent_tokens>193694</subagent_tokens><tool_uses>50</tool_uses><duration_ms>671942</duration_ms></usage>
</task-notification>

## Claude

The planning agent's review is back with several useful corrections. I'm checking the section numbering in `docs/assumptions.md` before writing the plan.

- *Bash*: List assumptions doc sections and check new ACS tables

## Claude

Two choices change what people will see, so they're yours to make.

- *AskUserQuestion*

## Claude

Both answers are in. I'm writing the plan file now.

- *Write*: /Users/ye/.claude/plans/humming-juggling-corbato.md
- *ExitPlanMode*

## Claude

The plan is approved. I'll save the decisions to memory first, then start Phase 0.

- *Write*: /Users/ye/.claude/projects/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/memory/visionpitts-update4-practical-analysis.md
- *Bash*: Index the memory and check repo state and export size

## Claude

Starting Phase 0. Reading the Place page container and the files with the stale section references.

- *Bash*: Size up Place page files and find stale references
- *Bash*: Find section references in Place page code
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/MatchView.tsx
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/place/recommend.ts
- *Bash*: Read Place copy and find fit order uses
- *Bash*: Find fit order consumers and read the tax credit sheet top
- *Bash*: Read the rest of the tax credit sheet and its store

## Claude

Phase 0: building the lazy `ProjectPanel` shell, its guard test and the stance-rules doc section.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/project/ProjectPanel.tsx
- *Edit*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/MatchView.tsx
- *Edit*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/MatchView.tsx
- *Bash*: Find test patterns that read source files
- *Bash*: Look at a test that reads files from disk
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/lazyGuard.test.ts
- *Bash*: Run the new lazy guard test
- *Edit*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/lazyGuard.test.ts
- *Edit*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/lazyGuard.test.ts

## Claude

Now the stance-rules section for `docs/assumptions.md`. Reading the end of the file to match its style.

- *Bash*: Read the last sections of the assumptions doc
- *Bash*: Read thresholds and the docs-number test claims
- *Bash*: Read the file end and remaining thresholds
- *Bash*: Add the stance rules section and fix the stale references
- *Edit*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/docs/assumptions.md
- *Bash*: Typecheck and measure the offline file

## Claude

Phase 0 is done, and the offline file is unchanged at 5,999,341 bytes. Moving to Phase 1, the demand data build. Reading the existing ACS helpers.

- *Bash*: List ACS helper functions and constants
- *Bash*: Read the ACS fetch and share helpers

## Claude

Before writing the build, I'm checking each new ACS table's variable labels against the Census API.

- *Bash*: Fetch variable labels for the seven new ACS tables

## Claude

The labels match the plan, and the rent brackets in B25068 are coarse (under $300 up to $1,500+). Next I'm checking the HUD LIHTC project database download.

- *Bash*: Download the HUD LIHTC project database
- *Bash*: Find the HUD ArcGIS pattern and probe the LIHTC layer

## Claude

The HUD LIHTC layer on ArcGIS works. I'll pull only property fields (no contact names or phone numbers). Checking the Allegheny County records.

- *Bash*: Count Allegheny LIHTC records and inspect sample rows
- *Bash*: Inspect county field formats on Pittsburgh records
- *Bash*: Read sample attributes and count by county code
- *Bash*: Read place measures module header and functions
- *Bash*: Read HUD API helper, tract loaders and renter age fetch
- *Bash*: Inspect history CSVs, city ZCTAs and place ZIPs
- *Bash*: Read a build script pattern and config paths
- *Bash*: List geography loaders and the sources registry shape

## Claude

Writing the demand build module: seven ACS tables for city tracts, the city's ZIPs and the city, plus tax credit supply from HUD's project database.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/src/visionpitts/demand.py

## Claude

Now the build script that runs it, checks the labels and prints sanity checks.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/scripts/17_build_demand.py
- *Bash*: Run the demand build

## Claude

The build ran and every table adds up to the city's 72,332 renter households. The renter share and the one-person share both print 52.3%, so I'm checking that isn't a bug.

- *Bash*: Inspect city and Hazelwood demand values
- *Bash*: Test signal margins on tracts and ZIPs
- *Bash*: List format, data and plan store exports
- *Bash*: Read size rule and rent ceiling functions

## Claude

Next, the TypeScript demand library. Checking the shared Place components so the new card matches the existing style.

- *Bash*: Read shared Place components and a sample fold

## Claude

Now writing the demand library: types and data access, bracket interpolation, unit mix, signals and the demand order.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/demand/types.ts
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/demand/data.ts
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/demand/interp.ts
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/demand/signals.ts
- *Bash*: Reuse the existing capitalize helper
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/demand/order.ts
- *Edit*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/demand/order.ts
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/demand/mix.ts

## Claude

Now the project store, which keeps the unit mix, building and pencil inputs in this browser.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/project/store.ts
- *Bash*: Read Explainer, Segmented and planOptions signatures

## Claude

Now `lib/project/plan.ts`, which works out the mix the cards use (suggested from the place, or the person's own).

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/project/plan.ts

## Claude

Now the "Who needs it" card itself.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/project/DemandMix.tsx
- *Bash*: Wire the demand card into the project panel

## Claude

Now the small main-bundle hook that loads the demand order on demand, used by both the Place map and Compare.

- *Bash*: Read how Compare computes suggestions
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/place/useDemandOrders.ts
- *Bash*: Use demand orders on Place and Compare, then typecheck

## Claude

Typecheck passes. Measuring the offline file now that the hook is in the main bundle.

- *Bash*: Rebuild the offline file and measure it

## Claude

The offline file grew by 158 bytes to 5,999,499 (501 left), and none of the demand code is in it. Running the full app test suite.

- *Bash*: Run the whole app test suite

## Claude

All 475 pass. Now tests for the demand library.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/demand/demand.test.ts
- *Bash*: Run the demand tests

## Claude

The tests pass. Next a quick one-off check of how many places change their lead type with demand, so I can report real numbers.

- *Bash*: Count lead changes from demand ordering
- *Bash*: Add demand scores as their own input to recommend
- *Bash*: Keep fixed-order stances untouched and pass demand through suggestAll

## Claude

Now switching the hook and `order.ts` to scores rather than reordered fit orders.

- *Bash*: Switch the hook and callers to demand scores
- *Bash*: Update tests and run typecheck plus the suite

## Claude

490 tests pass. Re-running the probe to see how often demand changes the lead now.

- *Bash*: Count lead changes with demand scores

## Claude

Demand now changes the lead in 44 of 114 places under the default Anti-displacement at 50% AMI, and in 18 of 28 under Market-led. Checking the offline file size.

- *Bash*: Measure the offline file again

## Claude

5,999,676 bytes, 324 left. Next the ZIP-mode card. Reading `ZipPanel` to see where it fits.

- *Bash*: Find the ZIP profile mount point
- *Bash*: Read the ZipPanel body
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/project/ZipDemand.tsx
- *Bash*: Mount the ZIP card lazily and measure the offline file

## Claude

313 bytes left. Now a visual check of the new card in the running app.

- *ToolSearch*: select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-c
- *mcp__claude-in-chrome__tabs_context_mcp*
- *mcp__claude-in-chrome__navigate*: http://localhost:5173/place?t=42003562300
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*

## Claude

The "Reads" column gets pushed off the edge of the narrow panel. I'll drop that column and mark the deciding figure in place (bold with ↑/↓), with shorter row labels.

- *Bash*: Compact the signals table with in-cell markers
- *Bash*: Spell out the signal marks plainly
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*

## Claude

The card works and the map renders. The two context lines (growth, rent ÷ income) wrap badly, so I'm moving them into the same table as muted "context" rows.

- *Bash*: Move growth and rent-to-income into the table
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*

## Claude

The "How renters are housed today" table overflows the same way because of its long sentence column. I'm switching it to three columns with the sentences listed underneath.

- *Bash*: Rework the housed-today table into three columns
- *mcp__claude-in-chrome__computer*
- *Bash*: Use short size labels in narrow tables

## Claude

The ZIP card's signal table has the same overflow risk, so it gets the same treatment.

- *Bash*: Compact the ZIP card signal table
- *mcp__claude-in-chrome__computer*
- *Bash*: Shorten the card's source line
- *mcp__claude-in-chrome__find*: 'How renters are housed today' and 'How deep the qualifying market is' fold buttons
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*

## Claude

The card reads well now. One small fix: the capture-rate formula prints parentheses when nothing is subtracted ("40 ÷ (590)").

- *Bash*: Drop parentheses when nothing is subtracted
- *Bash*: Rename the formula variable

## Claude

Phase 1's data and UI are in. Now its Python tests, docs and source rows. Starting with `tests/test_demand.py`.

- *Bash*: Look at the Python test layout
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/tests/test_demand.py
- *Bash*: Run the demand Python tests

## Claude

The Python tests pass. Now the two new source rows. Checking how `sources.py` writes its outputs.

- *Bash*: Read how sources are written for the app
- *Bash*: Read the export step for sources and raw-file list
- *Bash*: Add the two source rows and regenerate source lists
- *Bash*: Regenerate the online source list and sources.md
- *Bash*: Check the sources.md change

## Claude

I hadn't verified the HUD open-data URL I wrote, so I'm switching it to HUD User's dataset page, which is the official home of the database.

- *Bash*: Point the source at HUD User and regenerate

## Claude

Now the method doc for the demand card.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/docs/data/demand.md

## Claude

Now `docs/assumptions.md` §15, then test claims for the new doc's numbers.

- *Bash*: Add §15 and read the docs-number test harness
- *Bash*: Drop the byte count from §15 and read expected()
- *Bash*: Add demand doc claims to the docs-number test

## Claude

The docs-number checks pass, including the new demand claims. §14's "Order inside the suggested set" row needs updating now that demand comes first.

- *Bash*: Update §14 for demand-first ordering

## Claude

Phase 1 is done. Running both full test suites before starting Phase 2.

- *Bash*: Run the full Python and app test suites

## Claude

Both suites pass (282 Python, 490 app). Phase 2 is the zoning transcription. Opening the official Title 9 text on eCode360 in the browser.

- *mcp__claude-in-chrome__navigate*: https://ecode360.com/45474218
- *mcp__claude-in-chrome__get_page_text*

## Claude

§903.03 (the development subdistrict standards) reads cleanly. Next I need §903.02, the use subdistricts that set how many units each district allows.

- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__navigate*: https://ecode360.com/45474198
- *mcp__claude-in-chrome__get_page_text*

## Claude

The page holds the whole chapter, but the text reader only returns the last section. I'll pull §903.02 directly by its element.

- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__navigate*: https://ecode360.com/45474193
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__computer*

## Claude

The code is current through 2026-09-16 (shown in the breadcrumb). Searching the code for the lot-area-per-unit rule.

- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__get_page_text*
- *mcp__claude-in-chrome__computer*

## Claude

The phrase appears only in special districts. Searching related wordings.

- *mcp__claude-in-chrome__navigate*: https://ecode360.com/PI6865/search?query=%22minimum%20lot%20size%22%20%22dwelling%20unit%22&scope=all&sortOrder=relevance
- *mcp__claude-in-chrome__get_page_text*
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__get_page_text*

## Claude

Three sections matter here: §925.01 (lot size), §907.04 (the inclusionary overlay) and §912.08 (the ADU overlay). Opening §925.01 first.

- *mcp__claude-in-chrome__find*: search result links titled '§ 925.01 Lot Size', '§ 912.08 Accessory Dwelling Unit Overlay District', and the IZ-O § 907.04 result
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__navigate*: https://ecode360.com/45479640
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*

## Claude

§925.03 "Density" is the rule I need. Reading it in chunks.

- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__navigate*: https://ecode360.com/PI6865/search?query=%22square%20feet%20per%20unit%22%20OR%20%22per%20dwelling%20unit%22%20OR%20%22lot%20size%20per%22&scope=all&sortOrder=r
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__get_page_text*

## Claude

The navigation didn't take. One useful finding from §925.06: contextual setbacks let infill match its neighbors, so the district setbacks are upper bounds. Next the Use Table, §911.02.

- *mcp__claude-in-chrome__navigate*: https://ecode360.com/PI6865/search?query=%22Use%20Table%22%20%22Multi-Unit%20Residential%22&scope=all&sortOrder=relevance
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__navigate*: https://ecode360.com/45476524
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__navigate*: https://ecode360.com/45474193
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__navigate*: https://ecode360.com/45474257
- *mcp__claude-in-chrome__javascript_tool*

## Claude

Extracting each mixed-use district's site-development table (NDO, LNC, NDI, UNC, then the rest).

- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*

## Claude

The UC-MU and R-MU standards aren't in table form, so I'm reading them from the text.

- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*

## Claude

UC-MU and R-MU heights are set by a height map with performance points, so those go in the "not computed" list along with GT, RIV and SP. Next the inclusionary overlay, §907.04.

- *mcp__claude-in-chrome__navigate*: https://ecode360.com/45475368
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *Bash*: Inspect the WPRDC zoning file's fields

## Claude

The overlay boundary isn't in that file. Searching for a published overlay layer.

- *Bash*: Search WPRDC for an inclusionary overlay layer
- *Bash*: Search ArcGIS Online for the overlay layer

## Claude

The City publishes the overlay itself (account pgh.admin): `InclusionaryHousingOverlayDistrict`. Downloading it.

- *Bash*: Inspect the City's inclusionary overlay layer
- *Bash*: Download the overlay and see which neighborhoods it covers

## Claude

It's the official City polygon: 2,457 acres covering Bloomfield, Lower, Central and Upper Lawrenceville, Polish Hill, and much of Oakland. Last code section: the ADU overlay (§912.08).

- *mcp__claude-in-chrome__navigate*: https://ecode360.com/45477942
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*

## Claude

ADUs are allowed only inside an ADU overlay district (under 800 sq ft, accessory to a single-unit home). Checking whether any other section allows ADUs more widely.

- *mcp__claude-in-chrome__navigate*: https://ecode360.com/PI6865/search?query=%22Accessory%20Dwelling%20Unit%22&scope=all&sortOrder=relevance
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__get_page_text*
- *Bash*: Look for a City ADU overlay layer
- *Bash*: List the City's combined zoning overlay layers
- *Bash*: List the overlay types in the combined layer
- *mcp__claude-in-chrome__navigate*: https://ecode360.com/PI6865/search?query=%22Off-Street%20Parking%20Schedule%22&scope=all&sortOrder=relevance
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__javascript_tool*

## Claude

Reading the parking chapter for the residential minimums.

- *mcp__claude-in-chrome__navigate*: https://ecode360.com/45478192
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *Bash*: Read parcel, assessment and zoning helpers
- *Bash*: Read the parcel loaders and land use classes

## Claude

Writing the standards file needs one more check: the UNC lot-coverage row came back blank.

- *mcp__claude-in-chrome__navigate*: https://ecode360.com/45474257
- *mcp__claude-in-chrome__javascript_tool*

## Claude

The UNC row really has no coverage value, so it stays null. Writing `config/zoning_standards.json` from what I read.

- *Bash*: Write the zoning standards config and check district coverage
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/src/visionpitts/zoning_capacity.py
- *Bash*: Check the parcel file's coordinate system
- *Bash*: Write and run the zoning capacity build
- *Bash*: Silence sliver warnings, rebuild, inspect two tracts

## Claude

Hazelwood's 2,401 RM homes come from the envelope rule on a few large vacant lots. I'm adding the largest vacant lot's size and homes so the card can say when one lot dominates.

- *Bash*: Record the largest vacant lot per tract and rebuild
- *Bash*: Write the TypeScript capacity rule and its parity test

## Claude

The TypeScript rule matches the Python on all 11 fixture lots. Now the card.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/project/BuildCapacity.tsx
- *Bash*: Mount the zoning card and typecheck
- *mcp__claude-in-chrome__navigate*: http://localhost:5173/place?t=42003060300
- *mcp__claude-in-chrome__find*: 'What can be built' card heading
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*
- *Bash*: Polish the zoning card's labels and default district

## Claude

The zoning card is in. Now its Python tests, method doc, §16 and source rows.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/tests/test_zoning_capacity.py
- *Bash*: Run the zoning capacity tests

## Claude

The rotated-rectangle warning also fires on a plain box, so I'm moving the suppression into `lot_dims` itself.

- *Bash*: Move the warning guard and rerun tests and build

## Claude

Adding the two source rows (the zoning code and the City's inclusionary overlay layer).

- *Bash*: Add zoning code and overlay source rows

## Claude

Now the zoning method doc and §16.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/docs/data/zoning_capacity.md
- *Bash*: Add §16 and zoning doc claims, run the docs test

## Claude

Phase 2 is done. Phase 3 next: filling the tax credit sheet from the plan. Reading the scoring code first.

- *Bash*: Read the tax credit scoring types and points rule
- *Bash*: Read tally, moves and the evidence builder

## Claude

The scoring code is clear. Now `lib/lihtc/fromPlan.ts`, which reads the plan's facts and fills the design and finance lines, each with its formula.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/lihtc/fromPlan.ts

## Claude

The next-step lookup is convoluted, so I'm switching it to the existing `nextTier` helper.

- *Bash*: Use nextTier for the next mix step

## Claude

Now the store fix, so an explicit "none" typed over a plan value is kept, plus a way to return to the plan value.

- *Bash*: Let typed entries override plan values

## Claude

Now wiring the plan values into the tax credit sheet.

- *Bash*: Fill the sheet from the plan and list mix changes that score
- *Bash*: Feed plan facts and tax credit supply into the sheet
- *Bash*: Check the score sheet file's formatting

## Claude

I accidentally re-indented the score-sheet file (2 spaces became 1). Restoring the original indentation.

- *Bash*: Restore two-space indentation and run sheet tests

## Claude

Restored (56,135 bytes, matching the original size) and the 33 sheet tests pass. Now tests for `fromPlan` and the store fix.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/lihtc/fromPlan.test.ts
- *Bash*: Run the plan-to-sheet tests

## Claude

All 7 pass. A quick look at the sheet in the browser.

- *mcp__claude-in-chrome__navigate*: http://localhost:5173/place?t=42003562300
- *mcp__claude-in-chrome__find*: 'Changes to your mix that score' heading in the tax credit sheet
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*

## Claude

The sheet now fills from the plan. With 40 homes at 50% AMI, B.1 scores its full 20, and the card suggests "5 more affordable homes with 3+ bedrooms → +6". Updating the tax credit doc and §12.

- *Bash*: List sections in the tax credit doc
- *Bash*: Document plan-answered lines and update §12

## Claude

Phase 3 is done. Phase 4, the pencil, starts with the tax credit income limits. Trying HUD's MTSP endpoint through the existing API helper.

- *Bash*: Fetch FY2026 MTSP income limits from HUD's API
- *WebSearch*: HACP Housing Authority City of Pittsburgh utility allowance schedule 2026 hacp.org
- *Bash*: Download and read the HACP 2026 utility allowance PDF
- *Bash*: Write the pencil defaults config

## Claude

Checking the PHFA section numbers I cited (I used §2.4 for the credit cap).

- *Bash*: Find the section holding PHFA's per-project credit caps

## Claude

The PHFA section numbers check out. I'm also changing the 2025 law's citation to H.R. 1 (119th Congress), since I'm not certain of its public law number.

- *Bash*: Build the pencil defaults with HUD MTSP limits
- *Bash*: Write pencil inputs and rent modules

## Claude

Now the core model, `finance.ts`: costs, developer fee, basis, credits, debt, sources and uses, the gap, PHFA's checks and the market-rate branch.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/pencil/finance.ts

## Claude

Next the 5×5 sensitivity grid, then tests that check the arithmetic by hand.

- *Bash*: Write the grid and pencil tests and run them
- *Bash*: Correct the hand-worked expectations and rerun

## Claude

All 10 pencil tests pass. Before the card, a look at the existing CSV helpers so the card can offer a project-sheet download.

- *Bash*: Read the CSV export helper signatures
- *Bash*: Read the CSV column type

## Claude

Now the "Does it pencil" card.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/project/Pencil.tsx

## Claude

Wiring the pencil into the project panel: it runs once, and its finance figures feed the tax credit sheet.

- *Bash*: Compute the pencil in the panel and mount the card
- *Bash*: Drop the unused store read and typecheck
- *mcp__claude-in-chrome__navigate*: http://localhost:5173/place?t=42003562300
- *mcp__claude-in-chrome__find*: 'Does it pencil' card heading
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*

## Claude

The pencil card works end to end, including PHFA's checks and the boost note. Next its Python test, method doc, §17 and source rows.

- *Bash*: Add pencil tests and source rows

## Claude

Now the pencil's method doc and §17.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/docs/data/pencil.md
- *Bash*: Add §17 and rerun the docs-number test

## Claude

Before the copy changes, measuring the offline file, since the copy lives in the main bundle.

- *Bash*: Measure the offline file and run the lazy guard
- *Bash*: Confirm the lazy guard passes and find store importers
- *Bash*: Find which modules import the tax credit store
- *Bash*: Guard the tax credit modules and find doc passages to update
- *Bash*: Read the Analysis passages in TECHNICAL and README

## Claude

Updating the Analysis text in README and TECHNICAL.md.

- *Bash*: Refresh the Analysis text in README and TECHNICAL

## Claude

Docs are done. Running the full Python and app suites, the offline build and the Deepblue check together.

- *Bash*: Run all tests, the offline build and the name check
- *mcp__claude-in-chrome__navigate*: http://localhost:5173/place?t=42003140300
- *mcp__claude-in-chrome__read_console_messages*
- *mcp__claude-in-chrome__find*: 'Market rate' income level button in left panel
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__find*: 'Does it pencil' card heading
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__find*: 'Does it pencil' card heading
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*

## Claude

The ZIP card works. Last check: the Compare page, which also uses the demand order.

- *mcp__claude-in-chrome__navigate*: http://localhost:5173/compare?t=42003562300&b=42003140300
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__read_console_messages*

## Claude

Compare matches the Place page (Hazelwood duplex/triplex, Squirrel Hill North ADU), and the console shows no errors. Closing the browser tab and checking the working tree for anything unexpected.

- *mcp__claude-in-chrome__tabs_close_mcp*
- *Bash*: Review new and changed files from this work

## Claude

Everything is in place. Updating the project memory with what was built and the open decisions.

- *Write*: /Users/ye/.claude/projects/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/memory/visionpitts-update4-practical-analysis.md
- *Bash*: Update the memory index line

## Claude

The four practical cards are built on Analysis > Place, under the answer card in your order. Nothing is committed. Both test suites pass (301 Python, 511 app), and the offline file is 5,999,725 bytes, 275 under the 6 MB mark. I checked the cards in the running app on Hazelwood, Lower Lawrenceville, Squirrel Hill North, the ZIP view and Compare places, with no app errors in the console.

- **Who needs it:** renter share, one-person, 65+ and 5+ person renter households for the tract, its ZIP and the city. A signal counts only if it's clearly different from the city; when the tract's margin of error is too wide, the ZIP is read instead. Demand now reorders the suggested type on the card, the map and Compare: it changes the lead in 44 of 114 places at 50% AMI under Anti-displacement. The card also sets a unit mix for "Homes needed" and shows:
  - homes renting below what fits;
  - a capture rate;
  - tax credit homes nearby, from HUD's database.
- **What can be built:** I transcribed Pittsburgh's zoning code (current through 2026-09-16) with section numbers. It gives homes allowed by right on vacant lots (33,749 citywide, an upper bound) and 10,530 more homes possible on R2/R3 lots with fewer homes than allowed. It also shows the City's own inclusionary overlay layer and a lot calculator.
- **Tax credit score:** the PHFA sheet now fills six lines from your mix and the pencil, each showing its arithmetic. Anything you type still wins. It also lists mix changes that would score, such as "5 more affordable 3BR homes → +6".
- **Does it pencil:**
  - **Tax credit deals (9%, or 4% with bonds):** sources and uses, with PHFA's basis limits, credit caps, fee rules and gap tests. Tax credit rents come from HUD's FY2026 tax credit (MTSP) income limits less HACP's 2026 utility allowances.
  - **Market rate:** yield on cost, break-even rent, and the 10% inclusionary set-aside where it applies.
  - **Example inputs:** 16 inputs (costs, loan terms, credit price) are marked as examples, and the card says so at the top.

The zoning code says three things the old unverified table didn't:
- **Homes per lot:** base districts have no lot area per home. R1D and R1A allow 1, R2 allows 2, R3 allows 3, and RM is limited only by height and setbacks.
- **ADUs:** they're allowed only inside an ADU overlay district, and the City's published overlay layer has none.
- **Parking:** the minimums (1 space per home) are still in the code.

Where I changed the plan:
- **How demand reorders:** I pass demand to the rules as its own input instead of reordering the weights. Otherwise the CHAS household type still decided almost every pick at 50% AMI. A household you choose still comes first, and Transit-first and Climate-resilient keep their own orders.
- **No "Unit mix" row on the answer card:** the offline file has no room for it. The mix opens the Who needs it card instead.
- **"Does not claim" list unchanged:** it still says the tool doesn't claim whether a project pencils. That stays true, because the pencil card says it's arithmetic on your inputs.

Decisions for you:
- **ADUs:** demand can put ADU first (Squirrel Hill North, for example) even though no ADU overlay exists. The zoning card flags this but doesn't demote ADUs. Should zoning demote them?
- **Exports:** the new cards aren't in the PDF/CSV place export or the offline file. The pencil card has its own CSV download.
- **PHFA plan:** the 2027/2028 plan is still a draft on phfa.org. If it's adopted, its lines need re-reading.

To rebuild the data, run `scripts/17_build_demand.py`, `scripts/18_build_zoning_capacity.py` and `scripts/19_build_pencil_defaults.py`. The methods are in `docs/data/demand.md`, `docs/data/zoning_capacity.md` and `docs/data/pencil.md`, with assumptions §14–§17. Deepblue is named nowhere in the repo. The dev server is still running at http://localhost:5173.

Sources:
- [Pittsburgh Zoning Code, Title 9 (eCode360)](https://ecode360.com/PI6865)
- [City inclusionary overlay layer](https://services1.arcgis.com/YZCmUqbcsUpOKfj7/arcgis/rest/services/InclusionaryHousingOverlayDistrict/FeatureServer)
- [Affordable housing bonus program (city engagement page)](https://engage.pittsburghpa.gov/implementing-the-housing-needs-assessment/affordable-housing-bonus-program)
- [PHFA 2025/2026 QAP](https://www.phfa.org/forms/multifamily_application_guidelines/guidelines/2025/2025-mpg-03.pdf)
- [PHFA news (2027/2028 draft)](https://www.phfa.org/news/)
- [HUD MTSP income limits](https://www.huduser.gov/portal/datasets/mtsp.html)
- [HACP 2026 utility allowance schedule](https://hacp.org/app/uploads/2025/10/2026-HCV-Utility-Allowance-Schedule.pdf)
- [HUD LIHTC database](https://www.huduser.gov/portal/datasets/lihtc.html)
- [Moss Adams on the 2025 LIHTC law changes](https://www.mossadams.com/articles/2025/09/what-one-big-beautiful-bill-act-means-for-lihtc)
- [City parking reform page](https://engage.pittsburghpa.gov/implementing-housing-needs-assessment/parking-reform)
- [BikePGH on parking mandates](https://bikepgh.org/2025/07/01/pittsburgh-must-eliminate-costly-parking-mandates/)
- [PublicSource on the competing inclusionary proposal](https://www.publicsource.org/pittsburgh-planning-commission-zoning-reform-competing-proposal-affordable-housing/)

## You

show me on local host

- *Bash*: Check the dev server and open Hazelwood's Place page

## Claude

I opened **http://localhost:5173/place?t=42003562300** (Hazelwood) in your browser. The server is still running.

Scroll down the right-hand panel, below the "Best match" answer card, to find the four new cards in this order:

1. **Who needs it:** the demand table (tract, ZIP, city), the unit mix and its "My mix" grid, then folds for how renters are housed, rents, market depth and nearby tax credit homes.
2. **What can be built:** homes by right on vacant lots, the zoning districts in the tract, and the "Try a lot" calculator.
3. **Tax credit score sheet:** lines marked "From your plan", and a new "Changes to your mix that score" list.
4. **Does it pencil:** switch between 9% credits, 4% + bonds and Market rate, then open **Inputs** to replace the example values.

Other places worth trying:
- **Lower Lawrenceville** (http://localhost:5173/place?t=42003060300): the inclusionary overlay notice.
- **Squirrel Hill North** (http://localhost:5173/place?t=42003140300): set Income level to "Market rate" on the left to see the market-rate pencil.
- **Homes needed** (left panel): type a number and the mix, zoning set-aside, score sheet and pencil all update.

Your inputs are saved in this browser only, so a reload keeps the mix and pencil numbers but resets the left-panel choices.

## You

there is a glitch, i am not suppose to scroll down in analysis tab, there is a large empty space. please fix. You probably need to fix the Project Details & Sources page please.

## Claude

Reproducing it in the browser first, to see which element is making the page taller than the window.

- *mcp__claude-in-chrome__tabs_context_mcp*
- *mcp__claude-in-chrome__navigate*: http://localhost:5173/place?t=42003562300
- *mcp__claude-in-chrome__javascript_tool*

## Claude

The page is 1,961 px tall in a 1,069 px window. The panel content itself is 6,647 px, but it should scroll inside its own container. Finding which element escapes clipping and stretches the page.

- *mcp__claude-in-chrome__javascript_tool*

## Claude

Nothing outside a clipping container is too tall, so the overflow must come from a positioned element escaping its container. Walking down from the page root to find which box carries the 1,961 px.

- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*

## Claude

That was the left rail. The right column (`w-[440px]`, scroll height 1,949) is the culprit. Inspecting its children.

- *mcp__claude-in-chrome__javascript_tool*
- *Bash*: Find scroll containers in panel components

## Claude

Several scroll boxes share the `scroll-quiet` class. Giving that class `position: relative` fixes all of them in one place. Checking how it's defined.

- *Bash*: Read the scroll-quiet style and count its uses
- *Bash*: Check scroll-quiet uses that set their own position
- *Bash*: Find the Details and Sources window component
- *Bash*: Read scroll and sources handling in the Details modal
- *Bash*: See how the Details modal gets its sources and tabs

## Claude

First the scroll fix on the four scroll boxes, then a check of the Details window.

- *Bash*: Contain absolutely positioned children in the panel scrollers
- *mcp__claude-in-chrome__navigate*: http://localhost:5173/place?t=42003562300
- *mcp__claude-in-chrome__javascript_tool*

## Claude

Fixed on the Place page: the page is now exactly the window height. Checking it stays that way with every fold open, and on the other Analysis tabs.

- *mcp__claude-in-chrome__javascript_tool*

## Claude

Compare and Equity also stay at window height, even with every fold open. Now the Details & Sources window.

- *mcp__claude-in-chrome__navigate*: http://localhost:5173/place?t=42003562300
- *mcp__claude-in-chrome__find*: button or link that opens Details / Data & method / sources window
- *Bash*: Find what opens the Details window

## Claude

The "Project Details & Sources" tile on the landing page opens the Details window, so that's the page to update. It doesn't describe the four new cards yet. Reading the window's code.

- *Bash*: Read the Details window body

## Claude

Opening the window in the browser to see what's wrong with it.

- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__navigate*: http://localhost:5173/
- *mcp__claude-in-chrome__find*: 'Project Details & Sources' tile
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*
- *Bash*: Measure bytes and map the Details window sections

## Claude

248 bytes left, enough for one small lazy slot. Checking `about.ts` for the repo link so the new section can link to the method docs.

- *Bash*: Find the repo link and limits structure in about.ts

## Claude

Writing the online-only Details section, pulling its numbers from the same data files the cards use so they stay in step.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/details/ProjectCardsDetails.tsx

## Claude

Wiring the section into the Details window: inside Overview after "What it has", near the top of Data & method, and after the content of the other tabs.

- *Bash*: Add the lazy section to the Details window, typecheck, measure

## Claude

175 bytes left. Checking the updated window in the browser, tab by tab.

- *mcp__claude-in-chrome__navigate*: http://localhost:5173/
- *mcp__claude-in-chrome__find*: 'Project Details & Sources' tile button
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*

## Claude

The Overview now shows the four cards. Checking Data & method and Calculations.

- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__find*: 'Project cards: data and method' heading
- *mcp__claude-in-chrome__computer*

## Claude

My click landed outside the window (the viewport size changed) and closed it. Reopening and using the tab buttons directly.

- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__computer*

## Claude

Data & method renders correctly. A quick check that Calculations, Limitations and What comes next each show their section.

- *mcp__claude-in-chrome__javascript_tool*

## Claude

All five tabs show the right section, and the page stays at window height with the window open. Running the full app test suite and closing the browser tab.

- *Bash*: Typecheck, run all app tests, confirm the offline size
- *mcp__claude-in-chrome__tabs_close_mcp*
- *Bash*: Record the new byte budget in memory

## Claude

I fixed both. The Analysis tab no longer scrolls into empty space, and Project Details & Sources now covers the four new cards. Reload http://localhost:5173 to see them.

**The scrolling glitch:** each table in the new cards has a hidden caption for screen readers. Those captions slipped out of the right panel's scroll area and stretched the whole page down to the last table, about 900 px past the bottom of the screen. I made the panel's scroll areas (right panel, left panel and the Compare page) hold their contents. In the browser, the page now matches the window height on Place (with every fold open), Compare places, Equity & policy, and with the Details window open.

**Project Details & Sources** still described Analysis the old way. Each tab now has a section on the cards:
- **Overview:** four tiles for Who needs it, What can be built, Tax credit score and Does it pencil.
- **Data & method:** what each card uses and the rules it applies, including the demand thresholds and the zoning code sections. The new data sources were already listed in the sources table.
- **Calculations:** the arithmetic for the unit mix, capture rate, homes by right, tax credit rent, loan, developer fee, credits, gap and market yield.
- **Limitations** and **What comes next:** the cards' limits and open items, such as the ADU overlay question.

This section loads only online, like the cards, so the offline copy is unaffected. It is now 5,999,825 bytes, 175 under the 6 MB limit. All 511 app tests pass.

The "Method" links in that section point to the new docs files on GitHub. They won't open until you commit and push those files.

## Summary of earlier conversation

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
1. Primary Request and Intent:
   - **Shadow note (done):** add a note that the shadow feature should support public space planning (enough sunlight for people to use and play). I added a section "Next: sun for public space (idea, not built)" to `docs/data/shadow.md` (between Limits and Rebuild) and a memory line.
   - **Resume button (done):** I created `/Users/ye/Documents/Ye-Zhang-Vision-Pitts/Resume Claude chat.command` (`#!/bin/zsh`, cd to the repo, `exec /Users/ye/.local/bin/claude --resume fd1245d5-7295-46f7-b55d-9f1eb164a569`), made it executable, and listed it in `.git/info/exclude`.
   - **Run on localhost (done):** `npm run dev` in `app/` (background task bixh2ihnp), Vite at http://localhost:5173/.
   - **Main request (done):** review `/Users/ye/Documents/Deepblue-Dashboards` (LIHTC/Affordability Analyzer, Market Analysis Tool, County Screen; "only public source, no private data source") and make VisionPitts' Analysis section practical for developers and planners: housing type recommendation from renter share and single householders by ZIP, LIHTC score, zoning, financials, "how to pencil". This was planned in plan mode, approved, and implemented in Phases 0–4.
   - **Ye's decisions:**
     - all four modules, priority order: (1) who needs it → type and unit mix, (2) what can be built (zoning), (3) tax credit score more measured, (4) does it pencil;
     - the place stays the tract with its ZIP shown beside it;
     - Deepblue: "Methods only, no mention" (no code copied, never named in repo, app, docs or tests);
     - type pick: renter demand reorders the lead within the stance's allowed set on the card AND the map (online; offline unchanged);
     - pencil: example values clearly marked.
   - **"show me on local host" (done):** opened http://localhost:5173/place?t=42003562300.
   - **Most recent request:** "there is a glitch, i am not suppose to scroll down in analysis tab, there is a large empty space. please fix. You probably need to fix the Project Details & Sources page please." The glitch is fixed and the Details window updated; the final report to the user has NOT been written yet.

2. Key Technical Concepts:
   - **Stack:** React + Vite + TypeScript app (`app/`); Python pipeline (`src/visionpitts`, `scripts/`, uv). Run Python with `PYTHONPATH=src uv run --no-sync python` (the hidden .pth quirk).
   - **Offline single-file export:** `export/index.html` must stay under 6,000,000 bytes. It is now 5,999,825 (175 left).
     - New features use lazy modules guarded with `import.meta.env.MODE === 'export' ? null : lazy(...)`.
     - Data goes in `app/src/data/lazy/` (or `app/src/data/online/`).
     - `lazyGuard.test.ts` walks static imports from `main.tsx`.
   - **Data:**
     - ACS 5-year 2020–2024 tables via the Census API, with the ACS proportion MOE and reliability.
     - HUD LIHTC ArcGIS layer; HUD User API (`mtspil` MTSP limits); HACP 2026 utility allowance PDF.
     - Pittsburgh Title 9 on eCode360, read through the Chrome tools (WebFetch gets 403).
     - City IZ-O ArcGIS layer; PHFA 2025/2026 QAP figures.
   - **Recommendation pipeline:** `recommend()` stance rules decide the allowed set. Order inside it: demand scores, then CHAS lead household (`fitToLead`), then weights fit order. Transit-first and Climate-resilient keep their fixed orders.
   - **Tax credit math:**
     - MTSP rent at 1.5 persons per bedroom, floor(limit × 0.3 ÷ 12), minus utility allowance, capped at market rent.
     - Eligible basis capped at PHFA $320k (9%) / $380k (4%) per home, plus developer fee; × 1.3 in a QCT/DDA; × applicable fraction; × 9% or 4%; capped at PHFA $1.7M / $1.8M / $1.85M.
     - Developer fee 15% of the first $10M then 10%, on the lesser of cost and the basis limit; caps $1.75M / $2.0M (9%), $2.55M (4%).
     - Feasibility: gap < 50% of fee; D.4.a: gap < 25% of fee.
     - Federal set-aside 20/50, 40/60 or income averaging; 4% bond test 25%.
   - **Zoning capacity:** R1D/R1A 1 home, R2 2, R3 3 if the lot meets the minimum lot size; RM and mixed-use by envelope × 85% ÷ 850 sq ft. ADUs only in an ADU overlay (none mapped). Parking minimum 1 per home. IZ-O: 20+ homes, 10% rounded up, 50% AMI rent / 80% own, 35 years.
   - **CSS lesson:** `sr-only` captions (absolute) inside a non-positioned `overflow-y-auto` container escape it and stretch the page. Fix: add `relative` to the scroll container. Don't put `position: relative` on the `.scroll-quiet` CSS class: unlayered CSS beats Tailwind's layered utilities and would break elements that use `absolute`.

3. Files and Code Sections:
   - **Phase 0:**
     - `app/src/components/MatchView.tsx`:
       - `const ProjectPanel = import.meta.env.MODE === 'export' ? null : lazy(() => import('./place/project/ProjectPanel'));`
       - Rendered `<ProjectPanel t={t} place={place} hud={hud} rec={rec} fitOrder={fitOrder ?? (r.ranking as Typology[])} />`.
       - `const demand = useDemandScores();` and `suggestAll(placeById, hudTable, focus, {...}, fitOrders, demand)` with deps `fitOrders, demand`.
     - `app/src/components/place/project/ProjectPanel.tsx`:
       - computes `mix = projectMix(project, plan.level, plan.homes, tract, zip)`;
       - pencil branch: `project.pencil.branch`, else the lihtc `setup.credit` when the mix has affordable homes, else `'market'`;
       - `inputs/kinds = resolveInputs(project.pencil, branch)`;
       - `args = {counts, inputs, marketRents: marketRents(place, hud).rents, qctOrDda, inOverlay: izo_share > 0.5}`;
       - `result = pencil(args)`; `facts = planFacts(mix.counts, project.stories, result.finance)`;
       - extra evidence `lihtc` sentence;
       - renders DemandMix, BuildCapacity, `TaxCreditSheet plan={facts} extraEvidence={evidence}`, Pencil.
     - `app/src/lib/lazyGuard.test.ts`: static-import graph walk. ON_DEMAND list: components/place/project/, TaxCreditSheet.tsx, SiteConditions.tsx, components/details/ProjectCardsDetails.tsx, lib/demand/, lib/zoning/, lib/pencil/, lib/project/, lib/lihtc/, data/lazy/.
     - `docs/assumptions.md`: added §14 (stance rules; order row updated for demand first), §15 (demand), §16 (zoning), §17 (pencil), plus a §12 row for lines the plan answers. Stale §11 references changed to §14 in `app/src/lib/place/copy.ts`, `app/src/lib/export/builders/compare.ts`, `app/src/components/place/PlaceFolds.tsx`.
   - **Phase 1 (demand):**
     - `src/visionpitts/demand.py`: stems, `check_labels`/`fetch_labels`, `fetch(level)` cached to `data/raw/acs/acs5_2024_{level}_demand.csv`, `unit()`, `share()`, `growth()` from `data/processed/acs_history_*.csv`. LIHTC: `fetch_lihtc` (cached `data/raw/benchmark/lihtc/lihtc_allegheny.csv`), `lihtc_points`, `supply_counts` (USE_YEARS 30, RECENT_YEARS 20, BUILD_YEAR 2026), `nearby`, `tract_supply`, `area_supply`, `build`, `write`.
     - `scripts/17_build_demand.py` writes `app/src/data/lazy/demand.json`.
     - `app/src/lib/demand/`:
       - `types.ts`, `data.ts` (DEMAND, demandTract, demandZip, demandCity);
       - `interp.ts` (`belowCut`, open top bracket gives a lower bound);
       - `signals.ts` (SIGNAL_MARGIN, SIGNAL_KEYS, SIGNAL_LABEL, SIGNAL_SHORT, SIGNAL_TABLE, `decide`, `readSignal` tract-then-ZIP, `signalsFor`, `renterGrowth`);
       - `order.ts` (FAVORED_BY: small_apartment one_person↑ + renter↑; adu one_person↑ + renter↓; senior age65↑; townhome large5↑ + renter↓; duplex_triplex large5↑ + small_bldg↑. Plus FIXED_ORDER_STANCES, `scoreTypes`, `demandOrder`, `demandScores()`, `aheadBecause`);
       - `mix.ts` (SIZE_GROUPS, SIZE_GROUP_LABEL/HOUSEHOLDS/SHORT, householdsByGroup, homesByGroup, groupShares, `recommendedMix` by largest remainder, compareGroups, belowRent, captureRate);
       - `demand.test.ts`.
     - `app/src/lib/place/recommend.ts`:
       - new option `demand?: Partial<Record<Typology, number>>`;
       - `ds = t => opts.demand?.[t] ?? 0`; `byDemand`; `householdD = byDemand && resolved?.auto ? undefined : household`;
       - `orderByLead(types, c, fitOrder, ds)` sorts `ds(b)-ds(a) || fitToLead || fitOrder`;
       - the market-led and at-market fitOrder filters are sorted by ds; transit and climate use `household` unchanged.
     - `app/src/lib/place/suggest.ts`: `planOptions(plan, fitOrder?, demand?)`; `suggestAll(..., fitOrders?, demand?)`.
     - `app/src/lib/place/useDemandScores.ts`: main-bundle hook, `if (import.meta.env.MODE !== 'export' && !loaded) void import('../demand/order').then(m => setScores(loaded = m.demandScores()))`.
     - `app/src/components/CompareTractsView.tsx`: uses `useDemandScores`.
     - `app/src/lib/project/store.ts`:
       - useProject (localStorage `visionpitts.project.v1`), MixLevel '30'|'50'|'60'|'80'|'mkt', Counts rows [studio, 1BR, 2BR, 3BR+];
       - EXAMPLE_HOMES 40; DEFAULT_PROJECT {mode 'suggested', stories 4, sites {}, pencil {}};
       - `levelOf`, `total`, `suggestedCounts`, `parseProject`.
     - `app/src/lib/project/plan.ts`: `projectMix`, `homesAt`, `homesOfSize`, AFFORDABLE_LEVELS.
     - `app/src/components/place/project/DemandMix.tsx`: OrderLine; signals table with ShareCell (bold violet ↑/↓ on the deciding figure); two grey context rows; unit mix with suggested/My mix Segmented and MixEditor grid; stories input; Explainers for housed today (3 columns), homes below rent, market depth, tax credit homes nearby.
     - `app/src/components/place/project/ZipDemand.tsx`, mounted lazily in `ZipPanel.tsx`.
     - `tests/test_demand.py`.
     - `src/visionpitts/sources.py`: rows acs_demand, hud_lihtc_db (online=True), plus RAW_FILES entries. `app/src/data/online/sources.json` and `data/processed/sources.md` regenerated.
     - `docs/data/demand.md`.
     - `tests/test_docs_numbers.py`: DOCS "demand" and "zoning" with claims; `demand_values()` and `zoning_values()`.
   - **Phase 2 (zoning):**
     - `config/zoning_standards.json`: districts with section, min_lot_sqft, max_homes, setbacks, height/stories, far, coverage, uses, verified; not_computed (34 codes); adu, parking, inclusionary, sources, legend, density_note, contextual_note. Current through 2026-09-16.
     - `src/visionpitts/zoning_capacity.py`: HOME_SQFT 850, EFFICIENCY 0.85, STORY_FT 10; `envelope`, `homes_by_right`, `lot_dims` (with np.errstate), `izo_overlay`, `city_lots`, `lot_capacity`, `tract_totals` (vacant incl. `largest`, gentle, districts, izo_share), FIXTURE_CASES, `fixture_cases`, `write`.
     - `scripts/18_build_zoning_capacity.py`.
     - `app/src/lib/zoning/capacity.ts` (STANDARDS, CAPACITY, STANDARD_BY_CODE, tractCapacity, storiesOf, envelope, homesByRight with formula, inclusionaryHomes) and `capacity.test.ts` (parity with the fixture).
     - `app/src/components/place/project/BuildCapacity.tsx`: two stat tiles, IZ-O notice, ADU notice, districts table, "Try a lot" calculator (defaults to a district where the lead type is by right), parking/ADU/pending fold, source line.
     - `tests/test_zoning_capacity.py`; sources rows pgh_zoning_code, pgh_izo; `docs/data/zoning_capacity.md`.
   - **Phase 3 (tax credit):**
     - `app/src/lib/lihtc/fromPlan.ts`: FinanceFacts, PlanFacts, `planFacts`, LE50_LINES ['B.1','4.3.1'], LARGE_LINES ['B.4','4.3.4.a'], PRIVATE_SOFT_LINES ['D.4.b'], FEE_LINES ['4.5.9'], LARGE_MAX_STORIES 7, `autoAnswers`, `mergeAnswers`, `hints`, `mixMoves` (uses nextTier). Plus `fromPlan.test.ts`.
     - `app/src/lib/lihtc/store.ts`: `putAnswer(e, sheet, geoid, item, value, keepEmpty = false, forget = false)`.
     - `app/src/components/place/TaxCreditSheet.tsx`: props `plan`, `extraEvidence`; typed vs auto; `followPlan`; "From your plan" / "Use the plan"; "Changes to your mix that score".
     - `app/src/data/lazy/lihtc_pa.json`: 'lihtc' added to the evidence of A.1.a, A.1.c, 4.2.1.g, 4.2.1.s (indent 2, 56,135 bytes).
     - `docs/data/lihtc.md`: new section "What the plan answers".
   - **Phase 4 (pencil):**
     - `config/pencil_defaults.json`: sources irc42, phfa_qap, hud_mtsp, hacp_ua, obbba (H.R. 1, 119th Congress); credit, phfa, set_aside, ua {by_br [111,133,171,210], parts}, inputs (17 examples).
     - `src/visionpitts/pencil_defaults.py` (`parse_mtsp`, `build`, `write`) and `scripts/19_build_pencil_defaults.py`, writing `app/src/data/lazy/pencil_defaults.json`.
     - `app/src/lib/pencil/`:
       - `inputs.ts` (DEFAULTS, PencilInputs, `resolveInputs`);
       - `rents.ts` (`mtspLimit`, `taxCreditRent`, `marketRents`);
       - `finance.ts` (`mortgageConstant`, `developerFee`, `applyInclusionary`, `pencil` returning PencilResult with income/loan/uses/credits/sources/gap/deferredFee/checks/market/izo/finance);
       - `grid.ts` (`sensitivity` 5×5);
       - `pencil.test.ts`.
     - `app/src/components/place/project/Pencil.tsx`: branch Segmented (also sets the lihtc setup credit), examples banner, headline tiles, Uses/Sources tables, checks, Inputs editor with sourced/example/yours tags and reset, rents/income, credits, sensitivity grid, CSV download.
     - `tests/test_pencil_defaults.py`; sources hud_mtsp, hacp_ua; `docs/data/pencil.md`; README (Place project cards bullets, Limitations updated); `docs/TECHNICAL.md` Analysis bullets refreshed.
   - **Glitch fix (most recent):**
     - `app/src/components/PanelFrame.tsx`: `<div className="scroll-quiet relative min-h-0 flex-1 overflow-y-auto rounded-2xl">{children}</div>`
     - `app/src/components/Rail.tsx`: `const BODY = 'scroll-quiet relative min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 pb-3 pt-1';`
     - `app/src/components/CompareTractsView.tsx`: `<div className="scroll-quiet relative min-h-0 flex-1 overflow-y-auto">`
     - `app/src/components/DetailsModal.tsx`:
       - added `import { Suspense, lazy, type ReactNode } from 'react';`;
       - `const CardDetails = import.meta.env.MODE === 'export' ? null : lazy(() => import('./details/ProjectCardsDetails'));`;
       - `function Overview({ cards }: { cards: ReactNode })` renders `{cards}` after "What it has";
       - in DetailsModal: `const cards = CardDetails && (<Suspense fallback={null}><CardDetails tab={tab} /></Suspense>);`;
       - `<Overview cards={cards} />`; `{cards}` inside the calc/limits/next blocks (calc block now `space-y-6 px-6 py-5`); `{tab === 'sources' && cards}` after `<PlanningInputsDetails />`.
     - `app/src/components/details/ProjectCardsDetails.tsx` (new, lazy): `export default function ProjectCardsDetails({ tab }: { tab: DetailsTab })`:
       - overview: four tiles, "Project cards on the Place page";
       - sources: "Project cards: data and method", per card with links to `https://github.com/yezhanggg/Ye-Zhang-Vision-Pitts/blob/main/docs/data/*.md`;
       - calc: "Project cards: the arithmetic";
       - limits / next: card lists.
       - Values are read from DEMAND, STANDARDS, CAPACITY, DEFAULTS, FAVORED_BY and SIGNAL_MARGIN.
   - **Memory:** `/Users/ye/.claude/projects/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/memory/visionpitts-update4-practical-analysis.md` and its MEMORY.md index line (175 bytes left, ADU question open).

4. Errors and fixes:
   - **HUD LIHTC zip download** (huduser lihtcpub.zip) returned 202 with an empty body → used the ArcGIS FeatureServer instead. The query `CURCNTY='42003'` returned 0 rows → switched to `CURCNTY_NM='Allegheny'`.
   - **eCode360 blocked WebFetch (403)** → read the code with the Chrome tools. JS outputs blocked with "[BLOCKED: Cookie/query string data]" or truncated at ~1,400 characters → sanitized and chunked the extraction.
   - **`ModuleNotFoundError: visionpitts`** with `uv run python -c` → used `PYTHONPATH=src`.
   - **pyogrio bbox:** the parcels GeoJSON is in EPSG:2272, so the bbox is taken in 2272.
   - **Shapely oriented_envelope warnings** → `np.errstate` inside `lot_dims`.
   - **Demand reorder had zero effect** under Anti-displacement at 50% (CHAS `fitToLead` dominated) → passed demand scores into `recommend` as the primary sort, and dropped the auto CHAS household preference when demand has signals. Leads now change in 44/114.
   - **Pencil test expectation wrong:** the fee base is capped by PHFA's basis limit, so the fee is $1.75M → corrected the test with explicit numbers.
   - **`lihtc_pa.json` re-indented to 1 space by mistake** → restored indent 2.
   - **Signals and housed-today tables overflowed** the 440 px panel → ShareCell markers, SIGNAL_SHORT/SIZE_GROUP_SHORT labels, 3-column tables.
   - **TS6133** unused `project` in Pencil.tsx → removed. Renamed `usePlan` to `followPlan` in TaxCreditSheet (hook-name clash).
   - **User-reported glitch:** page scrolled with large empty space (document 1,961 px vs window 1,069 px). Cause: sr-only `<caption>` elements in the new cards' tables escaped the non-positioned scroll container. Fixed with `relative` on the scroll containers; verified scrollHeight == innerHeight on Place (all folds open), Compare, Equity, and the landing page with the modal open.

5. Problem Solving:
   - **Solved:** all four modules implemented and verified in the browser (Hazelwood, Lower Lawrenceville IZ-O, Squirrel Hill North market branch, ZIP view, Compare).
     - Tests: pytest 301 passed; vitest 511 passed; tsc clean.
     - Offline export 5,999,825 bytes.
     - `git grep -i deepblue` clean (only an unrelated "deep blue" color comment in palettes.ts).
   - **Console:** "Access to storage is not allowed from this context" exceptions at 0:0 are likely from the automation extension, not app code.
   - **Open decisions for Ye:**
     - demand can make ADU the lead although no ADU overlay exists (flagged, not demoted);
     - the cards are not in the PDF/CSV place export or the offline file;
     - the PHFA 2027/2028 plan is still a draft;
     - the GitHub doc links in the Details section 404 until Ye commits and pushes the new docs.

6. All user messages:
   - "for the shadow feature, i think it would be realy important to have public space planning, where you can have enough sun light for poeple to use and play. just make a note somewhere"
   - "create a click button in this folder so that i can resume to this chat history"
   - "can you run this on localhost"
   - "Based on the existing structure, can you review the folder /Users/ye/Documents/Deepblue-Dashboards and see if there are anything from LIHTC / Affordability Analyzer and Market Analysis Tool and County Screen (only public source, no private data source) and improve on the current tool. For now, I just think the Analysis section for VisionPitts is not practical enough. One thing just came to my mind is like housing type recommednation could based on the renter percentage and number of single hosuholder in the zipcode. Things like this are pushing the decision for different project. Like it is for affordable housing, LITHC score is important. I just want to make the tool more practical from a real estate developer and planning profesional when they look into the zoning, financial and how to pencil. I just want to amek this more practical. Please ultrathink to /plan for the update"
   - AskUserQuestion answers: Scope = "Who needs it → type & unit mix, What can be built (zoning), Tax credit score, more measured, Does it pencil"; Geography = "Tract, with ZIP shown beside it (Recommended)"; Reuse = "Methods only, no mention (Recommended)"; Type pick = "Reorder the pick, card and map (Recommended)"; Pencil start = "Example values, clearly marked (Recommended)". The plan was approved via ExitPlanMode.
   - "show me on local host"
   - "there is a glitch, i am not suppose to scroll down in analysis tab, there is a large empty space. please fix. You probably need to fix the Project Details & Sources page please."
   - **Constraints that remain in force:**
     - "only public source, no private data source";
     - Deepblue methods only, never named in the repo, app, docs or tests, no code copied;
     - from memory: Ye commits their own work, never git commit or push;
     - never mention the Hack a House/AI Housing folder or a prototype;
     - ask Ye before raising the 6 MB offline mark;
     - published contact is only the UPenn email and LinkedIn.

7. Pending Tasks:
   - Write the final report to the user on the glitch fix and the Project Details & Sources update (not yet delivered). No other pending implementation tasks. Do not commit.

8. Current Work:
   Immediately before the summary request I had finished the user's last request ("there is a glitch... please fix. You probably need to fix the Project Details & Sources page please."):
   - **Scroll fix:** added `relative` to the scroll containers in PanelFrame.tsx, Rail.tsx and CompareTractsView.tsx.
   - **Details window:** created the lazy `components/details/ProjectCardsDetails.tsx` and wired it into DetailsModal.tsx (Overview tiles, Data & method, Calculations, Limitations and What comes next sections for the four project cards; online only).
   - **Guard:** added it to the lazyGuard ON_DEMAND list.
   - **Verified:** document scrollHeight equals the window height on all Analysis tabs and with the modal open; each Details tab shows its "Project cards" section.
   - **Checks:** tsc clean, vitest 511 passed, export 5,999,825 bytes (175 left).
   - **Housekeeping:** updated memory and closed the browser tab. The dev server is still running at http://localhost:5173.

9. Optional Next Step:
   Report to the user, in plain text and without new tool calls unless asked, answering the user's request: "there is a glitch, i am not suppose to scroll down in analysis tab, there is a large empty space. please fix. You probably need to fix the Project Details & Sources page please." The report should cover:
   - **Cause:** screen-reader table captions in the new cards escaped the panel's scroll box and stretched the page to 1,961 px.
   - **Fix:** `relative` on the scroll boxes in PanelFrame, Rail and Compare; verified the page no longer scrolls on Place, Compare, Equity and in the Details window.
   - **Details window:** now has an online-only "Project cards on the Place page" part in Overview, Data & method, Calculations, Limitations and What comes next.
   - **Results:** tests 511 pass; offline file 5,999,825 bytes (175 under).
   - **Note:** the doc links point to GitHub and work once Ye commits and pushes.
   - **Prompt to check:** suggest reloading http://localhost:5173/place?t=42003562300.

If you need specific details from before compaction (like exact code snippets, error messages, or content you generated), read the full transcript at: /Users/ye/.claude/projects/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569.jsonl
Continue the conversation from where it left off without asking the user any further questions. Resume directly — do not acknowledge the summary, do not recap what was happening, do not preface with "I'll continue" or similar. Pick up the last task as if the break never happened.

The messages after this summary are the most recent messages from before compaction, kept verbatim. The summary was written without seeing them, so something it says has not happened yet may already have happened in them.

## You

continue

- *Bash*: List project modules and check the answer card for a unit mix row
- *Bash*: Check existing tests for the project store and explicit false answers
- *Bash*: Read how demand tests build units and what mix and data export
- *Bash*: See existing projectMix test coverage

## Claude

The plan's one missing test is the project store's handling of corrupted browser storage. Adding it now.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/project/store.test.ts
- *Bash*: Run the new project store tests
- *Bash*: List the pencil test cases
- *ToolSearch*: select:WebFetch,WebSearch
- *WebSearch*: PHFA 2026 LIHTC rent and income limits Allegheny County
- *Bash*: Download PHFA's 2026 tax credit rent and income limits PDF

## Claude

Checking the pencil's tax credit rents against PHFA's published 2026 table for Allegheny County, then I'll add it as a test.

- *Bash*: Extract the Allegheny County rows from the PHFA PDF

## Claude

PHFA's Allegheny income limits match the ones the app uses. Now comparing the rents.

- *Bash*: Read the tax credit rent function and its test
- *Edit*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/pencil/pencil.test.ts
- *Bash*: Run the pencil tests with the PHFA rent check

## Claude

All 16 rents (studio to 3BR at 30, 50, 60 and 80% AMI) match PHFA's published table. Noting that in the method doc.

- *Edit*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/docs/data/pencil.md
- *Bash*: Run the docs number check, all app tests and the type check
- *Bash*: Find the planning level type
- *Bash*: Use an allowed planning level in the test and recheck types
- *Edit*: /Users/ye/.claude/projects/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/memory/visionpitts-update4-practical-analysis.md

## Claude

I closed the last two checks the plan called for. The four project cards are now fully built and tested.

- **Tax credit rents match PHFA:** PHFA's 2026 tax credit rent and income limits list the maximum rents for Allegheny County. The pencil gives the same rent in all 16 cases: studio to 3BR at 30, 50, 60 and 80% AMI, before the utility allowance. The income limits match too. A test now pins those 16 rents, and `docs/data/pencil.md` says so.
- **Saved project:** a new test covers what happens if the project saved in the browser is broken or malformed. The cards fall back to the defaults and keep whatever fields are still valid. Two more cases cover your own mix and borrowing the ZIP's household sizes when the tract has none.

All 517 app tests and the docs number check pass, and the type check is clean. Only tests and a doc changed, so the offline file is still 5,999,825 bytes.

Decisions still open for you:
- **ADU as the lead:** renter demand can make ADU the top suggestion (Squirrel Hill North, for example), but no ADU overlay is mapped. The zoning card points this out but doesn't push ADU down. Should it?
- **Unit mix on the answer card:** the plan had a "Unit mix" line on the main answer card. I didn't add it because the offline file is only 175 bytes under its 6 MB limit, so the mix shows in the "Who needs it" card instead. Adding it means raising that limit, which is your call.
- **Where the cards don't appear:** they aren't in the PDF/CSV place report, Compare places or the offline file.
- **Doc links:** the method links in Project Details & Sources will work once you commit and push the new docs.

Source: [PHFA 2026 rent and income limits](https://www.phfa.org/forms/housing_management/tax_credits/rent_and_income_limits/2026_mtxr041.pdf)

## You

show me on localhost

- *Bash*: Check the dev server is still up
- *Bash*: Open the Hazelwood Place page in the browser

## Claude

I opened http://localhost:5173/place?t=42003562300 (Hazelwood) in your browser. The dev server is still running.

The four project cards sit below the suggestion in the right panel: Who needs it, What can be built, Tax credit score and Does it pencil. The Details button opens Project Details & Sources, where each tab now has a "Project cards" section.

Nothing on screen changed since your last look. This round only added tests and a sentence to a doc. The page should also no longer scroll down into empty space.

Two more tracts are worth a look:
- **Lower Lawrenceville:** http://localhost:5173/place?t=42003060300 shows the inclusionary housing notice and its required affordable homes in the pencil.
- **Squirrel Hill North:** http://localhost:5173/place?t=42003140300 shows the market-rate pencil, and ADU coming out on top even though no ADU overlay is mapped.

## You

for analysis page, i want all the infomration to presnet in more concise format, too mnay tabs right in analysis. Also make changes conencted to compare places. try a lot faeture should be more clear and more intuitive .please fix

- *ToolSearch*: select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_page,mcp__claude-in-c
- *mcp__claude-in-chrome__tabs_context_mcp*
- *mcp__claude-in-chrome__navigate*: http://localhost:5173/place?t=42003562300
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__javascript_tool*

## Claude

I'm looking over the Place panel as it is now. It is about 6,600 px tall, roughly 7½ screens. Next I'll check the Try a lot calculator and Compare places before I restructure.

- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__javascript_tool*
- *Bash*: Size up the Place and Compare components
- *Bash*: Read ProjectPanel and the Place render section of MatchView
- *Bash*: Read the What can be built card

## Claude

I'm reading the four project cards' code now, to work out how to cut the panel down and where Compare places should pick them up.

- *Bash*: Read the Who needs it card
- *Bash*: Read the Does it pencil card
- *Bash*: Skim the tax credit sheet structure
- *mcp__claude-in-chrome__navigate*: http://localhost:5173/place?t=42003562300
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__computer*
- *Bash*: Read the tax credit sheet body
- *Bash*: Map the Compare view's sections
- *Bash*: Read the Compare view's render section and section helpers
- *Bash*: Read the SideInfo shape used by Compare blocks
- *Bash*: List UI primitives and read the Explainer fold
- *Bash*: Read the zoning capacity module and the standards file shape
- *Bash*: Read homesByRight and list every district's standards
- *Bash*: Find other users of the cards and the plan store's homes setter
- *Bash*: Find other references to the project cards
- *Bash*: Check ZipDemand's imports and the shared Table helper
- *Bash*: List exports of the tax credit and pencil modules

## Claude

Writing the shared project model first, so the Place panel and Compare places compute the same numbers.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/lihtc/sheetState.ts

## Claude

Now the zoning helper Try a lot needs, the lot size it takes to fit a given number of homes, plus plain district names:

- *Bash*: Add district names and a lot-size-needed helper to the zoning module
- *Bash*: Read the zoning test's imports and ending
- *Bash*: Test the lot-size helper and district names

## Claude

Now the shared model hook:

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/project/useProjectModel.ts

## Claude

Now the new Try a lot:

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/project/TryLot.tsx

## Claude

Now the trimmed What can be built body:

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/project/BuildCapacity.tsx

## Claude

Now the trimmed Who needs it body, with an Edit button on the unit mix in place of its tab row:

- *Bash*: Rewire the Who needs it card to the shared model
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/project/DemandMix.tsx
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/project/DemandMix.tsx

## Claude

Replacing the top part of that card with the compact version:

- *Bash*: Replace the top of the Who needs it card with the compact layout

## Claude

Now the tax credit sheet: its four tab rows become three small dropdowns, and the credit type comes from the single Financing choice.

- *Bash*: Rewrite the tax credit sheet body around the shared sheet state

## Claude

Now the pencil body, minus its own financing tab row:

- *Bash*: Turn the pencil card into a body without its financing tabs

## Claude

Moving the Uses and Sources tables into a fold, so the pencil leads with the answer:

- *Bash*: Fold the pencil's uses and sources tables
- *Bash*: Read the demand signal keys and labels
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/project/summary.ts
- *Bash*: Confirm type and label exports

## Claude

Now the new ProjectPanel: one card with a setup row and four rows that open one at a time.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/project/ProjectPanel.tsx
- *Bash*: Check the motion import and type-check
- *Bash*: Fix the motion import and type-check

## Claude

Type check is clean. Checking it in the browser:

- *mcp__claude-in-chrome__navigate*: http://localhost:5173/place?t=42003562300
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__computer*

## Claude

The panel went from 6,647 px to 1,350 px. Opening each question to check the details:

- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*

## Claude

Try a lot now opens on the tract's typical vacant lot and reads clearly. Checking the other three:

- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__computer*

## Claude

All four questions work. A few polish fixes, then Compare places:

- *Bash*: Polish the setup caption, mix wording and points list
- *Bash*: Check the place data exports and Compare's imports

## Claude

Now the Compare places section:

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/compare/CompareProject.tsx

## Claude

Wiring it into Compare places as a lazy, online-only slot:

- *Bash*: Add the project section to Compare places and type-check
- *mcp__claude-in-chrome__navigate*: http://localhost:5173/compare?t=42003562300&b=42003101900&w=anti_displacement
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__computer*
- *Bash*: Fix the overlay row, type-check, build the offline file and measure it

## Claude

The offline file is now 912 bytes over the 6 MB mark. Finding what leaked into it:

- *Bash*: Search the offline file for new project strings
- *Bash*: See where the district name text appears in the offline file
- *Bash*: Measure the offline file without the Compare slot, then restore it

## Claude

The Compare slot costs only 11 bytes, so the overage comes from somewhere else. Searching the offline file for text from each file I changed:

- *Bash*: Look for strings from the changed files in the offline file
- *Bash*: Read the export script and its build log

## Claude

The overage is Tailwind CSS. Every new class name in the lazy files still adds a rule to the main stylesheet. Listing the class names only my changed files use:

- *Bash*: List Tailwind classes used only by the changed project files

## Claude

Some of those were already there before this change. To get an exact list, I'll extract the stylesheet from the offline file and find every rule that only my changed files use:

- *Bash*: Find stylesheet rules used only by the project files

## Claude

About 14 new class names each added a CSS rule, roughly 1,100 bytes in all. That matches the overage. I'll swap each for a class already in the stylesheet. Checking which replacements exist:

- *Bash*: Check which existing classes can stand in

## Claude

I'll swap each of them for an existing class:

- *Bash*: Swap the new classes for existing ones and remeasure the offline file

## Claude

Back under the limit: 5,999,798 bytes, 202 to spare. Rechecking the layout after the class swaps:

- *mcp__claude-in-chrome__navigate*: http://localhost:5173/place?t=42003060300
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__computer*

## Claude

Testing the Try a lot buttons:

- *mcp__claude-in-chrome__javascript_tool*

## Claude

Both buttons work: the lot size jumps to what the project needs, and "Test 20 homes" updates the Homes boxes on both sides and the pencil. Now I'll undo the test entries I made in your browser:

- *Bash*: Check whether the planning inputs are saved in the browser
- *mcp__claude-in-chrome__javascript_tool*

## Claude

Updating the Details window, which still describes four separate cards and lists Compare as future work:

- *Bash*: Update the Details window text for the new layout
- *Bash*: Find docs that describe the project cards
- *Bash*: Read the README and technical notes on the project cards

## Claude

Updating the README and docs to match:

- *Bash*: Update README, technical notes and method docs, then run the docs check
- *Bash*: Run all tests, type check, offline build size and the name check
- *Bash*: Check new files never name the employer's tool

## Claude

All checks pass: 520 app tests, 301 Python tests, clean type check, offline file 5,999,798 bytes. One last look at Compare after the class swaps:

- *mcp__claude-in-chrome__navigate*: http://localhost:5173/compare?t=42003562300&b=42003060300&w=anti_displacement
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__computer*

## Claude

The block titles wrap in the narrow label column. Moving them above each block:

- *Bash*: Put Compare block titles on their own line and remeasure
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__computer*

## Claude

Compare looks right. Saving what I learned to memory, then opening the page for you.

- *Edit*: /Users/ye/.claude/projects/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/memory/visionpitts-update4-practical-analysis.md
- *Edit*: /Users/ye/.claude/projects/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/memory/visionpitts-update4-practical-analysis.md
- *Bash*: Update the memory index line
- *mcp__claude-in-chrome__tabs_close_mcp*
- *Bash*: Open the Lower Lawrenceville Place page in the browser

## Claude

I've made all three changes, and the page is open at http://localhost:5173/place?t=42003060300 (Lower Lawrenceville).

**A shorter Analysis panel**
- **One card:** the four project cards are now a single card, "Test a project here." The Place panel went from about 6,600 px tall to about 1,350 px.
- **Setup row:** homes, stories and financing are set once at the top. Financing is now one dropdown. Before, 9% vs 4% credits was asked twice, once in the tax credit sheet and once in the pencil.
- **Four questions:** each shows its answer in one line, for example "What can be built · 2,946 homes" or "Does it pencil · $1.51M gap". Click one to open the detail. Only one opens at a time.
- **Fewer tab rows:** the six rows of tab buttons are gone.
  - The tax credit sheet's settings are three small dropdowns.
  - The unit mix has an "Edit mix" link.
  - The two "how to score higher" lists are now one list, largest gain first.
- **Shorter explanations:** long ones moved behind ⓘ icons or into folds.

**Try a lot**
- **Starting point:** it opens on the tract's typical vacant lot. The "0 homes" glitch came from districts with no minimum lot size, and it's fixed.
- **Steps:** (1) pick a district, listed by name, with those in the tract first and their lot counts; (2) enter a lot size or tap a preset (typical lot here, district minimum, 5,000, 10,000, ½ acre, 1 acre).
- **Result:** the number of homes allowed by right, the height and floor area, and colored chips showing which building types are allowed by right, need a hearing, or are not allowed.
- **Your project:** it says whether your homes fit. If they don't, it gives the lot size they need, with a "Try that lot" button. "Test N homes in the project" sends that number to the project, so the mix, the tax credit score and the pencil update.

**Compare places**
There is a new section 4, "Your project in each place." It tests the same project in both neighborhoods: who needs it, what can be built, the tax credit score, and the pencil. A change on either tab shows on both. For example, Hazelwood pencils with a $277k surplus while Lower Lawrenceville has a $3.0M gap. The difference comes from Hazelwood's 130% basis boost (it is a qualified census tract).

**Checks**
- **Tests:** all 520 app tests and 301 Python tests pass, and the type check is clean. New tests cover the "lot your project needs" calculation and the district names.
- **Offline file:** it stays at 5,999,798 bytes, 202 under the 6 MB limit, and does not include the project card or the new Compare section. My first build was 912 bytes over, because Tailwind adds a CSS rule for every new class name even in parts that load later. I reused existing classes to get back under.
- **Docs:** the README, the method docs and the Details window describe the new layout.

**Still open**
- **ADU as the lead:** renter demand can still put ADU first even though no ADU overlay is mapped.
- **PDF report:** the project isn't in the PDF place report yet.

Nothing is committed.

## You

this is making much more sense. can you create a button that continue to back this conversation.

- *Bash*: Check the existing resume button and this session's file

## Claude

The button already exists and opens this same conversation. I'll just update its description so it matches what we've been working on.

- *Bash*: Update the resume button's description

## Claude

Glad it reads better now. The button is already there: double-click **Resume Claude chat.command** in your project folder (/Users/ye/Documents/Ye-Zhang-Vision-Pitts). It opens Terminal and brings back this same conversation. I updated its description so it mentions the Analysis work too.

- **Stays current:** it doesn't need updating as we keep going. It always resumes the latest point of this chat, including everything from today.
- **Stays out of git:** it's on the repo's local ignore list, so it won't show up when you commit.
- **First time only:** if macOS blocks it, right-click it, choose Open, then confirm.

## You

<task-notification>
<task-id>bixh2ihnp</task-id>
<tool-use-id>toolu_015VEmF67N28ZCR3B1WNTkaL</tool-use-id>
<status>stopped</status>
<summary>Background shell command didn't finish before the previous session ended</summary>
<note>No completion record was found for it in the previous session. It may have been stopped (via the UI, Monitor timeout, or agent teardown — these leave no transcript marker), or it may have been running when the previous Claude Code process exited. Check the output file for partial results before assuming it completed.</note>
</task-notification>

## You

<task-notification>
<task-id>bixh2ihnp</task-id>
<tool-use-id>toolu_015VEmF67N28ZCR3B1WNTkaL</tool-use-id>
<status>stopped</status>
<summary>Background shell command didn't finish before the previous session ended</summary>
<note>No completion record was found for it in the previous session. It may have been stopped (via the UI, Monitor timeout, or agent teardown — these leave no transcript marker), or it may have been running when the previous Claude Code process exited. Check the output file for partial results before assuming it completed.</note>
</task-notification>

## You

Can you describe me the current state of the app please?

- *Bash*: Read the newer project notes and check repo and server state
- *Bash*: Read the truncated parts of the update notes
- *Bash*: Read the policy panel and update 8 notes
- *Bash*: Check recent commits and uncommitted changes

## Claude

Here's where VisionPitts stands. Since we last worked here, other Claude sessions on Oct 20–22 changed the app a fair amount. This summary comes from the project notes those sessions left and a check of the repo. I haven't clicked through the app today, and the local preview isn't running, so I can start it if you want to look.

## Overall
- **What it is:** a housing decision tool for Pittsburgh's 128 city neighborhoods. It uses only public data.
- **Landing page:** online, it opens with a short story video of downtown, three tiles and four cards that lead into the app. The offline copy keeps the older 3D map landing page.
- **Two halves:** **Explore**, a plain data browser on a 3D map, and **Analysis**, which recommends.
- **Chat:** a "VisionPitts Chat" pill sits at the top right of every view.

## Analysis → Place (the main working page)
- **Left panel: everything you set.**
  - **Policies that apply here** replaced the old "focusing issue" stances. It has three groups:
    - **Binding:** the inclusionary overlay, flood overlay and ADU overlay.
    - **Funding and incentives:** PHFA, QCT, the height bonus, and toggles for the PHFA draft plan, the proposed bonus bill, and others.
    - **Your own screens:** displacement, transit within ½ mile and flood. These are off by default.
  - **Project inputs:** who you're planning for, homes, stories, financing, the unit mix, the lot and the pencil inputs. Changes wait until you press **Confirm and update**.
  - **Folds:** each section folds, and a "Fold all" button closes them at once.
- **Right panel: results only.**
  - The suggested housing type, then the project questions, each with a one-line answer:
    1. Who needs it
    2. What can be built (reads your own lot once you set one)
    3. Tax credit score
    4. Does it pencil
    5. Open space and sun
  - The evidence folds sit below them.
- **Find places:** at the start of the Place page, it ranks the tracts where your project works. It shows ranks and plain words, never a single score.
- **Address box and draggable pin:** the pin reads the zoning district and the inclusionary overlay at that exact spot.
- **Money math follows PHFA:**
  - It uses the 2027/28 draft plan, which governs the February 2027 round and is labeled "draft".
  - Rents, vacancy, reserves and coverage use PHFA's underwriting values.
  - Soft funds are split into committed and expected.
  - It checks cash flow over the first 10 years.
  - A gap that only closes by deferring more than half the developer fee is labeled "Over PHFA's limit".
  - It uses HUD's 2027 QCT list, which drops Hazelwood, East Liberty, South Side Flats and East Allegheny. Hazelwood's surplus from our earlier example would likely shrink because of this.
- **Three ways to pay:** 9% credits, 4% credits with bonds, or market rate. It also shows PHFA's key dates and a low–high score range.
- **Reports:** the place PDF and CSV include the project.

## Analysis → Compare places
- **Layout:** three strips. Place A's map and inputs are on the left, the comparison is in the middle, and B is on the right.
- **Settings:** B can use **the same settings as A** or **its own**, so you can compare two sites on one project or two different projects.
- **Phones and the offline copy** keep the older one-page Compare.

## Equity & policy
This is unchanged: where renters need help most, and what four policy ideas would change.

## Housekeeping
- **Commits:** you committed and pushed four times on Oct 20–21, and `main` matches GitHub. About 50 files still have uncommitted changes, mostly from the Oct 21–22 sessions.
- **Offline file:** 5,999,880 bytes, 120 under the 6 MB limit. The newer features are online only.
- **Tests:** the last recorded run on Oct 21 had 568 app tests and 311 Python tests passing.

## Open items from the notes
- Demand can still rank ADU first even though no ADU overlay is mapped.
- The parking reform and the property tax abatement are unverified, so the app shows them as text only.
- When PHFA adopts the 2027/28 plan, the "draft" labels and dates need updating.
- A few of your decisions are still pending: the finder's ordering, adding "Supportive" as a residents option, and a building-type input.

## You

tell me what is your thought on this system? useful? practicla?

## Claude

Yes, it's useful and getting practical, but more as a **screening tool** than as something a developer would underwrite a deal with. Here's my view.

## What's genuinely strong
- **It answers the questions people actually ask, in their order:** who needs housing here, what can be built, will it score for tax credits, does it pencil. Most public tools stop at "here's a map of need."
- **The money math has real substance.** PHFA's caps, the developer fee formula, the feasibility test and the 2027 QCT list are things a tax credit consultant would recognize. The tax credit rents match PHFA's own 2026 table exactly. That earns trust.
- **It's honest.** Every number shows its source and arithmetic. Example inputs are labeled as examples. It says it isn't a zoning determination and that award chances aren't modeled. Planners will respect that.
- **Find places plus Compare is a good combination.** You can go from "where would this work?" to "why here and not there?", which is how site selection really goes.
- **Public data only** means a city, a nonprofit or a student can use it without paying for anything.

## Where it's weaker
- **It reads at the tract level, but deals happen on parcels.** The pin and lot reader help, but slopes, ownership, lot assembly and whether a lot is actually for sale aren't there. A developer will still need a site visit and a title search before it means much.
- **The costs drive everything, and they're guesses.** Hard cost per square foot, land and the credit price swing the gap by millions. The defaults are reasonable, but a pro will overwrite them right away, and a non-pro may trust them too much.
- **Zoning is a careful reading, but it's still a reading.** Pittsburgh's code has contextual rules, overlays and pending reforms (parking, the bonus bill) that change answers. "By right" in the app is an upper bound.
- **The demand signals rest on thin samples.** Tract margins of error are wide. The app handles that correctly, but the type ordering can rest on one signal.
- **It's dense.** The structure is much better since the "too many tabs" fix, but there's still a lot on screen. A planner has to learn it, and a council member probably won't.
- **It goes stale.** PHFA plans, QCT lists, rents and the zoning code all change yearly. Without a clear update routine, it loses credibility within a year or two.

## Who it serves best
1. **Planners and housing staff:** "Where should we steer affordable housing, and what would it take?" This is its best fit.
2. **Nonprofit and early-stage developers:** a first screen before paying a consultant.
3. **Students and advocates:** learning how tax credit deals and zoning actually constrain housing.
4. **Experienced tax credit developers:** less useful. They have their own models and broker data, though Find places and the PHFA score could still save them time.

## What would make it more practical
- **Let people save and share a scenario** (site, inputs, result), so the work can be handed to a colleague or a lender.
- **Parcel-level detail at the pin:** owner type (public land especially), lot size, slope, flood. Public land is the most actionable lead for affordable housing.
- **One "deal summary" export** in the format a lender or PHFA pre-application meeting expects.
- **An update routine** for each source, with a visible "data current as of…" date.
- **Decide the ADU question.** Recommending a type the code doesn't allow anywhere undercuts trust.

**Bottom line:** it's a credible, transparent site screen with real PHFA substance, beyond typical civic-tech dashboards. It won't replace a pro forma or a zoning attorney, but it makes the first conversation about a site much faster and better informed. That's a valuable, realistic role for it.

## You

Let people save and share a scenario is important, please ultrathink and add this feature

## Claude

I'll start by reading how the app holds its state today: the URL, the browser storage and the stores. A scenario has to capture all of it.

- *Bash*: Size up the state modules and look for the old link file
- *Bash*: Read the URL state module
- *Bash*: Read the planning, project and side stores

## Claude

You asked about parcel-level data while I was working. I'll check what parcel data the repo already holds, answer that, then finish save and share.

- *Bash*: Look at the parcel data already in the repo
- *Bash*: See which parcel files and fields are cached
- *Bash*: Count city parcels, vacant lots and owner types in the assessment file

## Claude

While that count runs, I'll keep reading the stores a scenario has to capture:

- *Bash*: Read the draft, compare, policy, finder and tax credit stores

## Claude

The planning inputs, policies, Compare's B settings and the finder live only in memory today. They're lost on reload, so saving them adds real value. Next I'll find where the controls should go:

- *Bash*: Find any existing copy-link control and the online layout files
- *Bash*: Read the Analysis shell and the online top navigation
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/tasks/bjoq17tgl.output

## Claude

Here's my answer on parcel-level data. I checked what's already on disk first.

**What you already have:**
- **Parcels:** 142,395 city parcels from the county's September 2026 assessment file, with lot area, use, land value, last sale, condition and year built, plus their shapes.
- **Vacant lots:** 22,354 of those parcels are vacant.
- **Public land:** 10,312 are government-owned.
- **Lot-level calculations already done:** homes allowed by right on each lot (today only added up to tracts), and hours of sun on each lot (kept local so far).

So most of the parcel work is already done. It just isn't shown lot by lot.

**What I think would actually be useful, in order:**
1. **Lots that fit.** Inside "What can be built," list the real lots in the tract where your project fits by right: the zoning allows the type and the lot is big enough. Show address, size, zoning district, homes allowed, whether it's public or private, and last sale. Clicking a lot moves the pin there, fills in Try a lot, and reruns the pencil. This turns "this tract could work" into "call about these 6 lots," which is a developer's real next step.
2. **Combining neighboring lots.** Typical vacant lots here are small (about 2,500 sq ft in Hazelwood, 2,000 in Lower Lawrenceville), so most projects need several lots combined. Find runs of touching vacant or public lots, for example "5 touching lots, 12,400 sq ft, 14 homes by right." No public tool I know of does this.
3. **Public land first.** Lots owned by the City, the URA, the Housing Authority or the Land Bank are the most actionable lead for affordable housing: land costs almost nothing and there's a set process for getting it. Add a public-land filter to Find places and to the lot list. I'd name the agency from the City and Land Bank's own published lists, not from the assessment file.
4. **Land cost from the record.** Land is one of the biggest example inputs in the pencil, now a flat $15,000 a home. Replace it with the lot's last sale or assessed land value, clearly labeled. County assessments still use 2012 values, so recent sales should come first.
5. **Site problems flagged on each lot:** flood zone, steep slope (from the elevation data already on disk), landslide-prone ground, old mines, sun and distance to frequent transit. This keeps the tool from recommending a hillside lot.
6. **Buildings worth buying and fixing up**, for PHFA's preservation path: older apartment buildings in poor condition or behind on taxes. This fits the anti-displacement goal.

**What I'd avoid:** owner names and mailing addresses (personal data that adds risk, not value), and a single "site score" per lot (false precision).

**One decision is yours:** so far the app has published only tract totals, and lot-level files have stayed local. Showing lots means publishing lot-level public records. My suggestion is lot facts plus public-or-private ownership, no names, online only, so the offline file isn't affected. I'd start with 1, 3 and 4 together, because the per-lot zoning calculation already exists.

Now your Place inputs request. I'll compare the Place left panel with Compare's per-place inputs, rework Place to match, and show you on localhost. I'll come back to save and share after that.

- *Bash*: Read the online Place page layout
- *ToolSearch*: select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claud
- *Bash*: Check running dev servers and local changes to the input panels
- *Bash*: Start the VisionPitts dev server on port 5288
- *mcp__claude-in-chrome__tabs_context_mcp*

## Claude

I'll look at the live site first, since that's the version you're describing:

- *mcp__claude-in-chrome__browser_batch*
- *mcp__claude-in-chrome__get_page_text*

## Claude

Now the live Place tab, for comparison:

- *mcp__claude-in-chrome__browser_batch*

## Claude

Both pages use the same input fields. The difference is how they behave and where they sit. I'll check the local version too, since it has a few changes that aren't deployed:

- *mcp__claude-in-chrome__browser_batch*
- *Bash*: Read the dev server output
- *Bash*: Check whether the dev server process is up
- *Bash*: Check the dev server's listening address
- *ToolSearch*: select:Monitor,TaskStop
- *Bash*: Wait up to 40 seconds for the dev server

## Claude

The local preview is up on port 5288. Next I'll compare the local Place and Compare inputs.

- *mcp__claude-in-chrome__browser_batch*
- *mcp__claude-in-chrome__browser_batch*
- *Bash*: Check what answers on port 5288
- *mcp__claude-in-chrome__browser_batch*
- *mcp__claude-in-chrome__browser_batch*
- *Bash*: Read the Place left panel and map the Compare strip code
- *Bash*: Read the Compare strip and the shared input component entry points
- *Bash*: Find code that depends on the Confirm draft and the finder's applied form
- *Bash*: Read how the finder uses its confirmed inputs
- *Bash*: Find copy that mentions the search box position or Confirm
- *Bash*: Find user-facing text that mentions Confirm

## Claude

Before changing anything, I'll save the current stylesheet's class list. New class names add bytes to the offline file, which is almost full, so I'll compare against this list afterward.

- *Bash*: Record the current stylesheet classes and check the offline search box

## Claude

Now the change: Place's left panel will work like a Compare strip.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/PlaceRail.tsx

## Claude

Now removing the duplicate search box from the right column and fixing the start card wording that pointed to it:

- *Bash*: Drop the right-column search, fix wording, and type-check
- *Bash*: See how the parcel map layer loads and where its files are
- *Bash*: Check the type check result

## Claude

The type check is still running. Meanwhile, checking the new Place panel in the browser:

- *mcp__claude-in-chrome__browser_batch*
- *mcp__claude-in-chrome__browser_batch*
- *mcp__claude-in-chrome__browser_batch*
- *mcp__claude-in-chrome__browser_batch*

## Claude

Turning on Sun and shadow, which holds the By parcel view:

- *mcp__claude-in-chrome__browser_batch*
- *mcp__claude-in-chrome__browser_batch*
- *mcp__claude-in-chrome__browser_batch*

## Claude

The tilted view zooms slowly with the scroll wheel, so I'll use the zoom buttons:

- *mcp__claude-in-chrome__browser_batch*

## Claude

The parcel map loads. Every lot is drawn and colored by how much of the day it spends in shadow. Clicking one lot to show its card:

- *mcp__claude-in-chrome__browser_batch*

## Claude

The parcel map works on localhost. Next I'll run the tests and the offline-size check on the Place change:

- *Bash*: Run app tests, build the offline file, and diff its classes
- *Write*: /Users/ye/.claude/projects/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/memory/visionpitts-planning-uses-guideline.md
- *Bash*: Index the guideline memory and open the new Place page for the user
- *Bash*: Find any copy-link button and the planning input value lists

## Claude

Next, the finder's inputs and the place-label helpers, for the scenario summary line:

- *Bash*: Read the finder inputs, stance labels and place label helpers
- *Bash*: Find Compare's header buttons and read the export menu for styling
- *Bash*: Read the export menu markup and Compare's header row
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/scenario/codec.ts

## Claude

Now the scenario module itself: what it saves, how it cleans a link's contents before trusting them, and how it restores them.

- *Bash*: Confirm the type and helper exports the scenario module needs
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/scenario/scenario.ts
- *Bash*: Simplify the undo restore of the page

## Claude

Now the saved-list store and the hand-off from the address bar:

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/scenario/store.ts
- *Bash*: Let the address bar hand a shared scenario to the scenario module

## Claude

Now the "Save & share" menu:

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/scenario/ScenarioMenu.tsx
- *Bash*: Compute the on-screen scenario once per render in the menu

## Claude

Now the part that opens a shared link, and the notice it shows:

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/scenario/SharedScenario.tsx

## Claude

Wiring it into the Place panel and Compare places:

- *Bash*: Mount the menu and the shared-link reader, and guard them out of the offline file

## Claude

Now tests. First checking the Node version (for the compression the links use) and the test setup:

- *Bash*: Check Node's compression support and the test environment
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/scenario/scenario.test.ts
- *Bash*: Run the scenario, hash and guard tests
- *Bash*: Run the scenario, hash and guard tests

## Claude

All 28 pass. Now the type check, and a real test in the browser: save a scenario, copy its link, and open the link fresh.

- *Bash*: Type-check the app
- *mcp__claude-in-chrome__browser_batch*
- *mcp__claude-in-chrome__browser_batch*
- *Bash*: Read the type check result
- *mcp__claude-in-chrome__computer*

## Claude

The type check passes, and "Save & share" sits next to Export in Compare. I'll set up a distinctive scenario first: 24 homes, and B with its own settings.

- *mcp__claude-in-chrome__browser_batch*

## Claude

The menu opens, but the Comparison column's scroll area clips its left edge. I'll render the menu above the page so it can't be clipped:

- *Bash*: Draw the menu in a portal and type-check
- *mcp__claude-in-chrome__browser_batch*
- *mcp__claude-in-chrome__browser_batch*

## Claude

The menu now draws in full. The reload reset my test inputs, so I'll set them again, then save and copy the link:

- *mcp__claude-in-chrome__browser_batch*

## Claude

Giving B 9 stories so its settings differ from A, then saving and copying the link:

- *mcp__claude-in-chrome__browser_batch*
- *mcp__claude-in-chrome__javascript_tool*

## Claude

The link is 755 characters. Next I'll open a fresh page, which wipes the in-memory settings, then follow the link:

- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__browser_batch*

## Claude

The link restored everything: Compare places, both neighborhoods, 24 homes, and B with its own settings and 9 stories. The notice at the bottom offers "Save to my scenarios" and "Undo". Testing Undo:

- *mcp__claude-in-chrome__browser_batch*
- *mcp__claude-in-chrome__browser_batch*

## Claude

Removing Save & share entirely. The Export menu stays as it was. The Place input change from earlier stays, since you asked for that separately.

- *Bash*: Delete the save-and-share files and undo their hooks

## Claude

All save-and-share code is gone and the files I touched are back to how they were. Next I'll clear the test scenario I saved in the browser:

- *mcp__claude-in-chrome__javascript_tool*
- *Bash*: Type-check, run all app tests, rebuild the offline file and diff its classes

## Claude

Everything checks out: the type check passes, all 559 app tests pass, and the offline file is 5,999,882 bytes (118 to spare) with no new styles. Last look at the Place panel:

- *mcp__claude-in-chrome__browser_batch*

## Claude

The Place panel now has just the address box, with no Save & share, and Export stays on the right. I'll save what happened today to memory and close my test tab:

- *Write*: /Users/ye/.claude/projects/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/memory/visionpitts-oct27-place-inputs.md
- *Bash*: Index the session memory and mark the old Confirm note as superseded
- *mcp__claude-in-chrome__tabs_close_mcp*

## Claude

I removed Save & share. Export stays exactly as it was, and nothing from Save & share is left in the code or in your browser.

**Place inputs now work like Compare's.** You can see it at http://localhost:5288/place?t=42003562300.
- **Instant updates:** every edit on the left updates the map and the results right away. The Confirm button is gone.
- **Address box:** the left panel now starts with it, followed by a line naming the place you're testing, the way a Compare column starts with its place.
- **One change to know about:** the "Address or place" box used to sit above the results on the right. It's now only in the left panel. I can put it back on the right if you prefer.

**Parcel map:** yes, it loads on localhost. Go to Explore → Data → Sun and shadow → By parcel, then zoom in. Every lot shows how much of the day it's in shadow, and clicking a lot gives its sun in each season. It's missing from the live site because its map files (39 MB of lots, plus 165 MB of shadow pages) have never been published; that's your call.

**Parcel-level ideas** are in my earlier message. My recommendation is to start with three together:
- **Lots that fit:** real lots in the tract where your project fits by right.
- **Public land first:** a filter for lots owned by the City, URA, Housing Authority or Land Bank.
- **Land cost from the record:** the lot's last sale in place of the $15,000-a-home example.

The per-lot zoning calculation already exists. Showing lots means publishing lot-level public records (lot facts and public-or-private only, never owner names), so I'll wait for your go-ahead.

**Your guideline** of six planning uses is saved to memory, as a yardstick for future features rather than a change request.

The type check passes and all 559 app tests pass. The offline file is 5,999,882 bytes, 118 under the 6 MB limit. Nothing is committed, and the preview is still running on port 5288.

## You

For analysis, I think it should be like this. Three level, parcel level, Tracts and zipcode level. parcel level is when you test out really specific project, this is where you can test the financial to see if something pencils out. For Tracts and Zipcode they don't need to have the Pencil Inputs, just more on projects, unit mix and what policy and types of projects. Can you based on this standard and update and fix the Analysis Place. No need to change the Analysis Compare Places. No need to include "Project, Unit mix, site, policies, open space and sun, pencil inputs. fold all" no need to include this. I want you to use this standard to continue to fix. I want you to ultrathink and /plan for this action. I want it to be super easy to use view understand for different element.

## Claude

I'll plan this before changing anything, as you asked.

- *ToolSearch*: select:EnterPlanMode,ExitPlanMode
- *EnterPlanMode*

## Claude

I'll explore the current Place page code first, with two read-only searches in parallel.

- *Agent*: Map the Place page UI structure
- *Agent*: Find parcel-level data and pin features

## Claude

Both searches are running. While they work, I'll check the existing plan file so I can replace it:

- *Bash*: Peek at the existing plan file

## Claude

That's the finished plan from October 15; I'll replace it with the new one. Waiting on the two searches.

- *Bash*: Check the parcel map files' layout and sizes

## Claude

The parcel files are 23 map tiles, each a lot-outline file of up to about 5 MB plus a binary file. Waiting for the searches to finish.

- *Bash*: Read the shape of one parcel tile file
- *Bash*: Read the parcel tiles' manifest

## Claude

While the searches finish, a few decisions in your new structure are yours to make:

- *AskUserQuestion*
- *Bash*: Check git ignore rules, deploy config and parcel file sizes
- *Bash*: Read the parcel ignore rule and the Vercel config
- *Bash*: Read the shared project model
- *Bash*: Read the ZIP view store and find its users
- *Bash*: Size up the Place project, flat and finder components
- *Bash*: See how the tax credit sheet is split and where it is used
- *Bash*: Check how the map takes extra layers and clicks
- *Bash*: Read the map's overlay and click props
- *Bash*: List the parcel tile helpers already written

## Claude

The parcel tile code already has reusable helpers for reading the index, choosing which tiles to load, and labeling lots. I'll start drafting the plan while the two searches finish:

- *Write*: /Users/ye/.claude/plans/humming-juggling-corbato.md
- *Bash*: Read the parcel tile types and manifest parser
- *Bash*: Read the top of the shared input component
- *Bash*: Read the shared input sections

## Claude

I'll write the design into the plan now and fill in details when the searches report back:

- *Edit*: /Users/ye/.claude/plans/humming-juggling-corbato.md
- *Bash*: List the ZIP panel's components
- *Bash*: Read the ZIP switch and the ZIP results panel
- *Bash*: Check how the search box handles addresses and pins

## Claude

The address box already turns an address into a pin and picks its tract, so at the Parcel level an address can go straight to its lot. Adding the implementation steps to the plan:

- *Edit*: /Users/ye/.claude/plans/humming-juggling-corbato.md
- *Bash*: Read how the parcel layer follows the map view

## Claude

Now writing the implementation steps into the plan:

- *Edit*: /Users/ye/.claude/plans/humming-juggling-corbato.md
- *Bash*: Read the right-panel question list
- *Bash*: Read the rest of the right-panel question list

## Claude

Now the full step list:

- *Edit*: /Users/ye/.claude/plans/humming-juggling-corbato.md
- *Edit*: /Users/ye/.claude/plans/humming-juggling-corbato.md
- *Bash*: Find tour text that describes the Place panel
- *Bash*: Read the Place tour step text
- *Bash*: Find the lot helper exports
- *Bash*: See what the open space and sun answer reads

## Claude

The plan is mostly drafted. I'm waiting on the two code searches, then I'll finish the details and show you the plan for approval.

- *Edit*: /Users/ye/.claude/plans/humming-juggling-corbato.md
- *Edit*: /Users/ye/.claude/plans/humming-juggling-corbato.md
- *Bash*: Read the start card shown before a place is picked
- *Bash*: Check the unit mix, pencil input and ZIP demand components
- *Edit*: /Users/ye/.claude/plans/humming-juggling-corbato.md
- *Edit*: /Users/ye/.claude/plans/humming-juggling-corbato.md
- *Bash*: Read the map's click handling order
- *Write*: /Users/ye/.claude/plans/humming-juggling-corbato.md
- *ExitPlanMode*

## Claude

Plan approved. I'll start with the Python lot facts file, which needs the most data processing, so it can build while I work on the page. First, reading the zoning and parcel code it reuses:

- *Bash*: Read the zoning capacity lot functions
- *Bash*: Find the parcel shadow tiling code
- *Bash*: Read how lots are loaded and written into chunks
- *Bash*: Read the build script and test patterns to follow

## Claude

Writing the lot facts module. I'll pull the tile formula out of the parcel-map build into a small shared function, so the facts files and the lot outlines always land in the same tiles:

- *Bash*: Share the parcel tile formula as one function
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/src/visionpitts/lot_facts.py
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/scripts/22_build_lot_facts.py

## Claude

Running the lot facts build in the background. It reads the full county parcel file, so it takes a few minutes.

- *Bash*: Build the lot facts files

## Claude

While that builds, I'll write the app side, starting with the lot reader. First the geometry and tile helpers it reuses:

- *Bash*: Read the geometry and parcel tile helpers
- *Bash*: Read the map registry and how the parcel layer follows the view
- *Bash*: Read how the parcel layer builds its map overlays

## Claude

The parcel map's pattern is clear, so I'll mirror it for the Place map. Checking for a tract-center helper and the zip helpers:

- *Bash*: Find tract geometry helpers and ZIP data exports

## Claude

`tractBounds` exists, so the map can zoom into a tract. Now the code, starting with the site record that stores a picked lot:

- *Bash*: Add the picked-lot record to the site

## Claude

Now the lot reader:

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/parcel/lots.ts

## Claude

Next, the map layer that draws the lots on the Place map. Checking where the phone check lives:

- *Bash*: Find the phone check import and the overlay data type
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/parcel/usePlaceLots.tsx

## Claude

Now the shared input sections. I'll split each into its body and its foldable wrapper, so Compare keeps the wrappers exactly as they are and the new Place panel reuses the bodies:

- *Bash*: Split the shared input sections into reusable bodies and type-check
- *Bash*: Read the lot facts build result

## Claude

The lot facts are built: 142,366 lots across 23 tiles, 4.2 MB. 142,160 have a zoning district and 92,109 have homes recorded today. Checking the tiles line up with the lot outlines:

- *Bash*: Check the facts tiles match the lot outline tiles

## Claude

Every labelled lot in the outline files has facts. Now the Python tests:

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/tests/test_lot_facts.py
- *Bash*: Run the lot facts tests
- *Bash*: Fix the tile expectation and see the other failure
- *Bash*: Keep missing districts as None and rerun the tests
- *Bash*: Show the remaining assertion
- *Bash*: Loosen the missing-district check and run the lot and zoning tests

## Claude

The Python side passes. Now the app: the lot-picking actions, then their tests.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/parcel/pick.ts
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/parcel/lots.test.ts
- *Bash*: Run the lot reader tests

## Claude

The lot reader passes its 6 tests. Now the level switch, copying the look of the existing Tracts/ZIPs switch:

- *Bash*: Read ZipPanel imports and widen the level type
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/levels/levels.ts
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/levels/LevelSwitch.tsx

## Claude

Next, the left-panel inputs for each level. First, how each policy row decides whether it applies, so the ZIP level can count across its tracts:

- *Bash*: Read how each policy row decides whether it applies
- *Bash*: Let the Homes box take a mix and add an income field

## Claude

Now the ZIP policy counts:

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/policy/zipCounts.ts

## Claude

Now the lot card, which shows a picked lot's facts:

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/levels/LotCard.tsx

## Claude

Now the left-panel inputs for each level:

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/levels/LevelInputs.tsx
- *Bash*: Type-check the new level files

## Claude

Now the left panel itself: the level switch at the top, then that level's picker, then its inputs.

- *Bash*: Put the level switch, picker and level inputs in the left panel

## Claude

Now the right panel. Reading the open space and sun answer so the Tract level can show just the tract's sun, and the Parcel level the lot's own:

- *Bash*: Read the sun answer body and the start of the build answer
- *Bash*: Find where the lot calculator sits in the build answer

## Claude

I'll give the build answer a Tract mode without the lot calculator, and the sun answer a Tract mode and a lot mode:

- *Bash*: Add Tract and lot modes to the build and sun answers

## Claude

Now the project card on the right, by level:

- *Bash*: Read the project card imports
- *Bash*: Make the project card show each level's answers

## Claude

The sun answer needs the lot's hours in words. That helper goes in its own small file, shared with the lot card:

- *Bash*: Add the lot sun helper and type-check

## Claude

Now the Parcel-level results panel:

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/levels/SiteDetail.tsx
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/levels/Starts.tsx

## Claude

Now the ZIP-level results panel:

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/levels/ZipDetail.tsx
- *Bash*: Type-check the new result panels

## Claude

Now wiring it all into the Place page: the lot layer on the map, picking a lot from a click, an address or a dragged pin, and each level's results panel.

- *Bash*: Add the Parcel level's lot picking and the tract-level site card to the Place page
- *Bash*: Wire the map clicks and each level's results panel, then type-check

## Claude

Now the "Change … on the left" fix: search only inside the visible page, and point each answer at its numbered group:

- *Bash*: Scope the edit links to the visible page and hide links with no inputs

## Claude

PoliciesCard also uses `editOn` with "policy", which matches the new group name. Now the lazy guard, plus tests for the level tables and the ZIP policy counts:

- *Bash*: Guard the new modules, add level and ZIP policy tests, and run them

## Claude

All 15 new tests pass. Now in the browser, starting with the Tract level (the default):

- *Bash*: Check the dev server is still up
- *mcp__claude-in-chrome__tabs_context_mcp*
- *mcp__claude-in-chrome__browser_batch*
- *mcp__claude-in-chrome__javascript_tool*

## Claude

The Tract results have three answers (who needs it, what can be built, sun) and no pencil or tax credit, plus "Test a specific site in Hazelwood". Clicking that to go to the Parcel level:

- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__computer*
- *mcp__claude-in-chrome__browser_batch*

## Claude

Lot outlines and tinted vacant lots are showing. Clicking a lot near the houses:

- *mcp__claude-in-chrome__browser_batch*
- *mcp__claude-in-chrome__browser_batch*

## Claude

The address search works too: "5050 2nd Ave" found Lot 56-K-135 (institutional, 1 acre, LNC zoning, 88 homes by right) and kept the address as the pin label. Now the ZIP code level:

- *mcp__claude-in-chrome__browser_batch*
- *Bash*: Check the overlay shares for tracts in ZIP 15207

## Claude

Those are mapping slivers along the overlay's edge, at 0.2% of a tract. For ZIP counts I'll require at least 1% of a tract inside the overlay:

- *Bash*: Ignore overlay slivers in ZIP counts and retest

## Claude

Fixed. Now checking that Compare places is unchanged:

- *mcp__claude-in-chrome__browser_batch*

## Claude

Compare places is unchanged: same chips, sections and Fold all. Running the full checks now: type check, all app tests, offline file size and the class list.

- *Bash*: Run all checks and the offline size and class diff

## Claude

All 572 app tests pass, the offline file is unchanged at 5,999,882 bytes, and no new styles were added. Now the full Python suite:

- *Bash*: Run all Python tests

## Claude

All 315 Python tests pass. Next, publishing the lot files: removing the ignore rule so your next commit includes them.

- *Bash*: Stop ignoring the lot files and confirm git sees them

## Claude

Git now sees both lot folders as new files. Now the README, starting with the privacy line and the Place description:

- *Bash*: Read the README's privacy line and Place section
- *Bash*: Describe the three levels and the lot privacy rule in the README
- *Bash*: Read the docs lines that describe the Place panel and privacy
- *Bash*: Update the assumptions, technical notes and finder doc

## Claude

Now the new method doc for the Parcel level:

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/docs/data/parcel_level.md

## Claude

Now the Details window text:

- *Bash*: Find the Details window lines to update
- *Bash*: Read the Details window lines in full
- *Bash*: Update the Details window and list the stale Confirm comments
- *Bash*: Find every user of the old draft module

## Claude

Only the two "set both" helpers are still used, so I'll shrink the old draft module to just those, now that nothing waits for Confirm:

- *Bash*: Shrink the draft module, fix stale comments and type-check

## Claude

Now the lot facts note in the data sources list:

- *Bash*: Find the parcels and assessments rows in the sources list
- *Bash*: Read the parcels and assessments source rows

## Claude

The parcels and assessments rows feed the offline file, which only has 118 bytes to spare, so I'll add the lot facts as a new online-only source row instead:

- *Bash*: Read an online-only source row and how the lists are written
- *Bash*: Find how the online sources file is written
- *Bash*: Find the script that writes the app's source lists
- *Bash*: Read how the source lists are dumped

## Claude

I'll add the row, then rewrite only the online sources list and the sources page:

- *Bash*: Add the lot facts source row and rewrite the online list and sources page

## Claude

The offline sources list is untouched. Running the full checks again after the cleanup:

- *Bash*: Rerun the type check, app tests and offline checks

## Claude

Everything still passes. A final browser check that lot picking still works after the cleanup, then I'll clear my test entries:

- *mcp__claude-in-chrome__browser_batch*
- *mcp__claude-in-chrome__browser_batch*
- *mcp__claude-in-chrome__browser_batch*
- *mcp__claude-in-chrome__javascript_tool*
- *mcp__claude-in-chrome__browser_batch*

## Claude

The test lots are cleared. Saving the decisions to memory:

- *Write*: /Users/ye/.claude/projects/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/memory/visionpitts-update9-three-levels.md
- *Bash*: Index the memory and open the Place page in the user's browser
- *mcp__claude-in-chrome__tabs_close_mcp*

## Claude

Place now works at three levels, picked at the top of the left panel: **Parcel**, **Tract** and **ZIP code**, in that order, opening on Tract. Compare places is unchanged. It's open at http://localhost:5288/place?t=42003562300.

**What each level shows**
- **Every level:** the left panel starts with the level switch, a one-line description and the place picker. Below that come only that level's inputs, in numbered groups that are always open. The chip row and Fold all are gone. The right panel answers in the same order.
- **Tract (no money):**
  - Left: 1 Who it's for, 2 Your project (homes and unit mix), 3 Policies and screens.
  - Right: best housing type, policies, who needs it, what can be built, and sun.
  - A "Test a site here" button moves you to Parcel.
- **ZIP code (no money):**
  - Left: the same three groups. Each policy rule shows how many of the ZIP's tracts it applies in, for example "in 3 of 4 tracts".
  - Right: which types fit and in how many tracts, who needs homes, the unit mix for your homes, policies across the tracts, and the ZIP's profile.
- **Parcel (the money level):**
  - Left: 1 Your site, 2 Your project, 3 Money (financing and pencil inputs), 4 Open space, 5 Policies.
  - Right: what can be built on this lot, does it pencil, tax credit score, and open space and sun on the lot. A last line sums up the neighborhood and links back to Tract.
  - Before you pick a site, **Find places** (which ranks by whether a project pencils) appears here; it no longer appears at Tract.

**Real lots at the Parcel level**
- **Picking a site:** click a lot on the map (lots show as you zoom in, vacant ones tinted), search an address, or drag the pin.
- **What fills in:** the lot number, use, area, zoning district, rough shape, homes today, whether the overlay applies at the pin, and hours of sun. Example: 5050 Second Ave → Lot 56-K-135, 1 acre, LNC zoning, 88 homes by right.
- **Where the facts come from:** a new build step writes them for all 142,366 city lots (4.2 MB, alongside the 58 MB of lot outlines that already existed).
- **Phones:** no lot outlines, because the files are too big; the address box still finds the lot.

**Publishing:** the lot files are no longer git-ignored, so your next commit will include about 62 MB of them. Vercel will then serve them, and Explore's "By parcel" view will work live too. I updated the README's privacy line: it now names the Parcel level as the one exception to "tracts or larger", with lot facts only and never owners, values or sales.

**Fixed along the way:**
- **ZIP overlay counts:** the ZIP level first counted slivers of the inclusionary overlay along its edge, so ZIP 15207 showed it in 2 of 4 tracts. It now requires at least 1% of a tract.
- **"Change … on the left":** these links could scroll the hidden Compare panel; they now stay on the Place page.

**Checks:**
- **Tests:** all 572 app tests and 315 Python tests pass, including new ones for finding lots, the level tables, the ZIP counts and the lot facts build.
- **Offline file:** unchanged at 5,999,882 bytes, with no new styles.
- **In the browser:** I checked each level, a lot click, an address search, the Lower Lawrenceville overlay, and that Compare looks the same. I removed the test lots I picked, so your saved project is as it was.

**Limits to know:**
- **District:** read at the lot's center, so a lot split by a district line reads one side.
- **Shape:** frontage × depth is a rough rectangle.
- **Homes today:** apartment buildings show "not recorded".

Nothing is committed.

## You

<task-notification>
<task-id>bh9ayyche</task-id>
<tool-use-id>toolu_01HKwCUDMxEYZxHTrj4dq7TL</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/tasks/bh9ayyche.output</output-file>
<status>failed</status>
<summary>Background command "Start the VisionPitts dev server on port 5288" failed with exit code 143</summary>
</task-notification>

## Claude

The preview server stopped, so I'm restarting it so the page I opened keeps working:

- *Bash*: Restart the VisionPitts dev server on port 5288
- *Bash*: Wait for the dev server to answer

## Claude

The preview server had stopped, so I restarted it, and it's answering again. If the page shows an error, reload http://localhost:5288/place?t=42003562300.

## You

Here are some edits that I want you to make. I want you to make Sun and Shadow also only appear after a layer is selected for Explore tab. For Explore tab, include parcel as part of the boundary. For the analysis tab, i dont need to so much light grey hint text. Keep the search bar clean. When i click on Parcel level, I could either click on site, or search. Then the first tab is Site (change from Your site). No need to have Zoning district and Lot area, sq ft input. Next is Project (change from Your project), Change Homes into Units. Residents just make it Market, Senior, Affordble, Mixed Use, Commerical, like development type, this should com before Units. If it is housing, it should include Income level. When I select the type and size, the riht tab should tell me if it is going to be allowed by zoning and restrictions. Change Money into Capital. Keep it easy, keep it easy with basic real estate development capital stack, loan, equity, vacancy, construction period and so on. this can also be ai suggested by the project that you propose. Open space is good. Policies and screens should just be the things that I want to be elgible for or the things that I wanto take consider. Right now Policies and screens is not straight forward, make it more clean. Also for the tool, when i turn on the parcel level, dont show the cenuss tract level on the map. Policies and screens should be like this, it should be have two section, one section is what is eligible which is going to show automatic, and another section is the things that I am interested in and i want to study, which will reflect on the right tab. Can you based on this flow to ultrathink and revise. Make sure the right panel need to be more readable. Using some graphics and easy takeaway. keep is straighforward.

## Claude

This is a big revision. I'll start with the Explore code I haven't worked in yet, to see how boundaries and Sun and shadow are wired.

- *Bash*: Size up the Explore components and boundary definitions
- *Bash*: Read the Explore boundary and data panels

## Claude

Analysis has many interlocking changes, so first the Explore side, where the shared code is tight on bytes. Reading how Explore builds its map layers and its right panel:

- *Bash*: Map how Explore composes overlays and its boundary rows
- *Bash*: Read Explore's overlay and right-panel code and the parcel store
- *AskUserQuestion*
- *Bash*: Read the pencil inputs module
- *Bash*: Read the pencil finance arithmetic
- *Bash*: Read the pencil defaults config and its build step

## Claude

I'll add the construction period and construction loan rate to the defaults, and lower the soft-cost share from 25% to 20% so construction interest isn't counted twice:

- *Bash*: Add construction inputs to the pencil defaults and rebuild them

## Claude

The config diff is far larger than the change, probably because rewriting it reformatted the file. Checking:

- *Bash*: See what changed in the defaults config formatting

## Claude

The original used one-space indent. Rewriting with that format so the diff shows only the real change:

- *Bash*: Restore the config's one-space formatting and recheck the diff

## Claude

Clean diff. Now the pencil code: new inputs, suggested starting values by development type, and the construction interest line:

- *Bash*: Add construction interest and suggested values to the pencil, then run the tests

## Claude

All 572 tests still pass. Next, development types and the zoning check. First the TractSearch props, since the "Pinned:" line is what clutters the search bar:

- *Bash*: Read TractSearch props and the pinned line, and the Segmented control

## Claude

I'll write the development-type module: the five types, which income levels each allows, and the suggested starting values for each.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/project/devType.ts

## Claude

Now the project record gets the development type and commercial floor area, and the model uses them:

- *Bash*: Store the development type and feed suggestions and land price to the model

## Claude

Next the zoning and restrictions check, the answer the right panel will show for the type and size you pick:

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/zoning/check.ts
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/zoning/check.test.ts
- *Bash*: Run the zoning check tests

## Claude

The zoning check passes all 7 tests. Next I'll read the policy result shapes, so the right panel can show what each studied item means:

- *Bash*: Read the composed policy results and the policies card

## Claude

I have what I need for the panels. Two small shared changes first: the Homes box takes a label (so Parcel can say "Units"), and the search box gets an option to hide its "Pinned:" line.

- *Bash*: Add a label to the Homes box and a pinned-line option to the search

## Claude

Now the new Policies design: what applies automatically, and what you want to study.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/levels/Policies.tsx

## Claude

Now the Capital inputs: a short list of the basics, with everything else folded under "More":

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/levels/CapitalInputs.tsx

## Claude

Now the Parcel results panel, with a quick-takeaway row, the zoning checklist, a capital stack bar, the tax credit meter, what you're studying, and sun bars:

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/levels/ParcelResults.tsx
- *Bash*: Type-check the new panels

## Claude

The new panels type-check. Continuing: wiring them into the Place page, then Explore.

- *Bash*: Rename the groups: Site, Project, Capital, Open space, Policies

## Claude

Now the left panel for each level, with the new Project step (development type first, then units and income level), the Capital basics and the new Policies:

- *Bash*: Rebuild the left panel's groups for each level

## Claude

Now the Parcel results panel replaces the old project card on the right:

- *Bash*: Put the Parcel results panel in the site view
- *Bash*: Drop the unused parameter and type-check

## Claude

Type check passes. Now cutting the grey helper text from the left panel and keeping the search bar clean:

- *Bash*: Remove the level line, the caption and the pinned line from the left panel

## Claude

Now the map: at the Parcel level, the tract layer is hidden and a small lot legend replaces the tract legend.

- *Bash*: Hide the tract layer at the Parcel level and add a lot legend

## Claude

Now the Explore side. First, Sun and shadow appears only once a boundary or Parcels is open:

- *Bash*: Show Sun and shadow only with a boundary open, and flag the Parcels boundary

## Claude

Next, Parcels as an Explore boundary. Checking the Sun and shadow controls, so turning it on with Parcels open goes straight to the by-lot view:

- *Bash*: Read the sun store's view setter and the layer setter

## Claude

Got it. I'll read your pro forma first and build the Capital step around its structure:

- *Bash*: Dump the pro forma's sheets, values and formulas
- *Bash*: Add Parcels as an Explore boundary with its lot layer and lot card

## Claude

Explore type-checks. Now the simple pro forma module, written to match your workbook line for line. Its test reproduces your Community Center example.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/pencil/simple.ts
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/pencil/simple.test.ts
- *Bash*: Test the simple pro forma against the workbook

## Summary of earlier conversation

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.


Summary:
1. Primary Request and Intent:
   - **Earlier in this session (done):**
     - Added the project-store and PHFA rent tests.
     - Built the concise "Test a project here" card (since replaced) and the Try a lot redesign.
     - Added section 4 of Compare places.
     - Made the resume button and described the app.
     - Gave my opinion of the tool and parcel-level suggestions.
     - Made Place inputs apply at once, like Compare.
     - Showed the parcel map on localhost and saved the planning-uses guideline to memory.
     - Built Save & share, then **removed it on request** ("Remove Save & Share. Just keep export is good enough").
     - Built update 9 from an approved plan: Place in three levels, Parcel | Tract | ZIP code.
   - **Current major request (user, verbatim):** "Here are some edits that I want you to make. I want you to make Sun and Shadow also only appear after a layer is selected for Explore tab. For Explore tab, include parcel as part of the boundary. For the analysis tab, i dont need to so much light grey hint text. Keep the search bar clean. When i click on Parcel level, I could either click on site, or search. Then the first tab is Site (change from Your site). No need to have Zoning district and Lot area, sq ft input. Next is Project (change from Your project), Change Homes into Units. Residents just make it Market, Senior, Affordble, Mixed Use, Commerical, like development type, this should com before Units. If it is housing, it should include Income level. When I select the type and size, the riht tab should tell me if it is going to be allowed by zoning and restrictions. Change Money into Capital. Keep it easy, keep it easy with basic real estate development capital stack, loan, equity, vacancy, construction period and so on. this can also be ai suggested by the project that you propose. Open space is good. Policies and screens should just be the things that I want to be elgible for or the things that I wanto take consider. Right now Policies and screens is not straight forward, make it more clean. Also for the tool, when i turn on the parcel level, dont show the cenuss tract level on the map. Policies and screens should be like this, it should be have two section, one section is what is eligible which is going to show automatic, and another section is the things that I am interested in and i want to study, which will reflect on the right tab. Can you based on this flow to ultrathink and revise. Make sure the right panel need to be more readable. Using some graphics and easy takeaway. keep is straighforward."
   - **User's answers to my questions:**
     - Commercial and mixed use: **"Zoning check only"**. The capital stack covers only the housing part; commercial gets no money test.
     - Capital suggestions: **"Suggested by type, no AI call"**.
   - **Latest instruction (user, verbatim):** "use this simple pro forma for the finance strucutre /Users/ye/Desktop/OLD\ DAYZ/UPenn/SS\ 26/LAW\ 667/In\ Class\ Exercise\ Skeleton\ Financing\ Model_v2.xlsx  keep it easy and simple please". The user also said "continue" mid-turn.
   - **Standing constraints (preserve):**
     - Ye commits their own work: **never git commit or push**.
     - Never mention the Hack a House/AI Housing folder or a prototype.
     - Deepblue is never named and none of its code is copied.
     - The published contact is only the UPenn email and LinkedIn.
     - Ask Ye before raising the 6 MB offline mark.
     - Public data only.
     - Lot facts only: never owners, addresses on record, values or sales.
     - Compare places should not change.
     - Keep Export; no Save & share.

2. Key Technical Concepts:
   - **Stack:** React + Vite + TypeScript app in `app/`, Python pipeline (`src/visionpitts`, `scripts/`), run with `PYTHONPATH=src uv run --no-sync python`.
   - **Offline file:** `export/index.html` must stay ≤ 6,000,000 bytes. It is now 5,999,882 (118 left).
     - Online-only modules load through `import.meta.env.MODE === 'export' ? null : lazy(...)`.
     - Every new Tailwind class costs offline CSS bytes, even in lazy files. Reuse existing classes and use inline styles for new visuals.
     - Class-diff check: `python3 $S/classes.py ../export/index.html $S/classes_afterN.txt; diff $S/classes_before.txt …`, where `S=/private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad`.
   - **lazyGuard:** `app/src/lib/lazyGuard.test.ts` lists the `ON_DEMAND` paths.
   - **Stores (zustand):**
     - `useApp` (pin, selectedId, layers, mode);
     - `usePlan` (level, age, homes);
     - `useProject` (localStorage `visionpitts.project.v1`);
     - `useLihtc`, `usePolicy`;
     - `useZipView` (area `'parcel' | 'tract' | 'zip'`, zip);
     - `useParcelShadow` (overlays, active, minZoom, selected, boundary);
     - `useSunShadow` (on, view).
   - **SideContext:** `SIDE_A` / `SIDE_B` via `useSide()`.
   - **Lot files:**
     - `app/public/data/parcel-shadow/`: shapes, 58 MB, 23 chunks keyed by z13 tile.
     - `app/public/data/parcel-lots/`: facts keyed by lot label, `[codeIdx, sqft, frontage, depth, existing]`.
     - Both are now published: the `.gitignore` rule was removed.
   - **Dev server:** background task `bdicpwqxe`, `npx vite --port 5288 --strictPort`. It listens on `[::1]`; Chrome automation uses `http://[::1]:5288`.
   - **Pencil:** PHFA-based, with construction interest now added.
   - **Workbook pro forma** (user's Excel, sheet "Model"):
     - **Uses:**
       - acquisition;
       - hard = $/sf × size;
       - soft = ratio × (acq + hard);
       - financing = interest carry (debt × 7%/12 × months) + origination (1% × debt);
       - developer fee = % × (acq + hard + soft + financing);
       - total.
     - **Sources:**
       - credit equity;
       - debt = LTV × (acq + hard + soft);
       - other subsidy = % × total;
       - deferred fee = fee × %;
       - developer equity = plug.
     - **Operations, years 1–7:**
       - revenue escalates 2%;
       - expense = ratio × revenue, escalating 3%;
       - NOI;
       - interest-only debt service = debt × 7%;
       - DSCR;
       - cash flow to developer = NOI − debt service.
     - **Exit:**
       - sale price = year-7 NOI ÷ exit cap 6.5%;
       - net sale = price − debt (the sheet's F28 subtracts cumulative debt service, a skeleton quirk);
       - total return = Σ cash flow + net sale + paid fee;
       - multiple of equity = total ÷ developer equity.
     - **Sheet values to test against:**
       - total 13,173,232.38;
       - debt 2,500,400;
       - developer equity 1,595,630.46;
       - year-1 NOI 323,000;
       - year-1 DSCR 1.8454;
       - sale price 5,536,626.74;
       - multiple 3.52 (computed with the sheet's debt quirk).

3. Files and Code Sections (this round):
   - **`config/pencil_defaults.json`** (rewritten with indent=1 to keep the diff small) and **`app/src/data/lazy/pencil_defaults.json`** (rebuilt by `scripts/19`):
     - `soft_share` 0.25 → 0.2, note "…construction interest is its own line";
     - added `construction_months` 18 and `construction_rate` 0.075, both kind example.
   - **`app/src/lib/pencil/inputs.ts`:**
     - `PencilInputs` gained `constructionMonths` and `constructionRate`;
     - `KEYS` maps them to `construction_months` / `construction_rate`;
     - `resolveInputs(..., ctx: { plan?, senior?, suggest?: Partial<Record<string, number>> })`;
     - the example default is now `pick(k, ctx.suggest?.[k] ?? d.inputs[fk]?.value ?? 0)`.
   - **`app/src/lib/pencil/finance.ts`:**
     - `interest = (hard + soft) * 0.5 * constructionRate * months/12`;
     - `build = hard + soft + interest`, used in the developer fee base, eligible basis (`depreciable = build * (1 - ineligible)`) and the residual;
     - new uses line `'Construction interest'`.
   - **`app/src/lib/project/devType.ts`** (new):
     - `DevType = 'market' | 'affordable' | 'senior' | 'mixed' | 'commercial'`;
     - exports `DEV_TYPES` (label, line), `DEV_TYPE_LABEL`, `isHousing`, `levelsFor` (market `['market']`, affordable `[30, 50, 80]`, commercial `[]`, others all four), `isDevType`, `devTypeOf(project, level, senior)`;
     - `setDevType(side, t)` clears `pencil.branch`, sets `commercialSf` defaults (mixed 3000, commercial 10000), moves the plan level into range, sets age `senior62`/`any` and the lihtc occupancy;
     - `suggestFor(t, market)`: months (mixed 20, affordable 18, senior 16, else 14); for market also dscr 1.25, rate 0.0675, vacancy 0.06 (mixed 0.07) and target yield 0.065 (mixed 0.07).
   - **`app/src/lib/project/store.ts`:** `ProjectState` gained `devType?` and `commercialSf?`, both parsed in `parseProject`; `SiteLot` / `Site.lot` came from update 9.
   - **`app/src/lib/project/model.ts`:** `atSize` passes `suggest = suggestFor(devTypeOf(b.project, b.level, senior), branch === 'market')`; if `project.pencil.landTotal` is set, `landPerHome = landTotal / homes` with kind `yours`.
   - **`app/src/lib/zoning/check.ts`** (new) and **`check.test.ts`** (7 tests pass):
     - `checkZoning(CheckInput)` returns `{ verdict: 'yes' | 'hearing' | 'no' | 'unknown', district, maxUnits, rows }`;
     - rows: use (by dev type; units → single/two/three/multi; senior → elderly uses; commercial/mixed allowed only where `s.kind === 'mixed'`), density (`homesByRight`), height (`storiesOf`), lot size, floor area (envelope), izo (info), parking (info), flood (info);
     - `VERDICT_WORD`.
   - **`app/src/components/place/flat/FlatInputs.tsx`:** `HomesField({ mix, lotHomes, label = 'Homes' })`. Earlier this session it also gained the exported bodies `Residents`, `StoriesField`, `FinancingField`, `IncomeField`, `MixBody`, `PoliciesBody` (with `stateFor`), `OpenBody` and `useSiteLot`. `FlatInputsFor`, Jump and Section stay for Compare.
   - **`app/src/components/TractSearch.tsx`:** prop `pinned?: boolean` (default true) hides the "Pinned:" line.
   - **`app/src/components/place/levels/Policies.tsx`** (new):
     - `PolicyPicker({ ctx, counts? })` has two sections:
       - "Applies here": read automatically from `AUTO` — izo and fpo required, qct, perf and plan eligible — with icons;
       - "I want to study": checkboxes over `STUDY = ['phfa_draft', 'ahb', 'hof', 'abatement', 'parking', 'displacement', 'transit', 'flood']`, flood showing a limit segmented control.
     - `StudyCard({ composed, ctx, policy, sheet })`: results on the right, screens from `composed.checks`, others from `policyRows` notes.
   - **`app/src/components/place/levels/CapitalInputs.tsx`** (new, **to be rewritten for the simple pro forma**):
     - tax credits 9%/4% segmented, or the text "conventional loan and investor equity";
     - BASICS: hardPerSf, landTotal, constructionMonths, constructionRate, rate, dscr, vacancy, price (credits), targetYield (market);
     - MORE fold;
     - tags sourced / suggested / yours.
   - **`app/src/components/place/levels/ParcelResults.tsx`** (new):
     - a 2×2 Tile grid: Zoning verdict; Units vs by-right with a Bar; Capital (pencils / gap / yield); Tax credits, Equity or Floor area;
     - zoning checklist card with lucide icons;
     - `CapitalStack` (a stacked bar via inline styles, legend, key numbers, folds "Sources and uses in full" using `Pencil` and "Three ways to pay" using `Paths`);
     - `CreditMeter` with a fold holding `TaxCreditSheet` and `KeyDates`;
     - `StudyCard`;
     - `SunCard` with sun bars;
     - exports `useParcelCheck`.
     - **It may use new classes** (`grid-cols-[1fr_auto]`, `col-span-2`, `h-4`, etc.) that need the class diff.
   - **`app/src/components/place/levels/levels.ts`:**
     - `INPUT_TITLE` = Site, Who it's for, Project, Capital, Open space, Policies, Find places for this project;
     - `inputsFor` / `answersFor` / `GROUP_OF` unchanged.
   - **`app/src/components/place/levels/LevelInputs.tsx`:**
     - `ParcelProject`: development type Segmented (3 cols), then Units (HomesField label "Units") or Floor area via `SfField`, Stories, ground-floor commercial for mixed, Income level (`levelsFor` subset, or `IncomeField` when the mix is the person's own), MixInputs;
     - Site = LotCard or "No lot yet.";
     - Capital = CapitalInputs (commercial: "Commercial: zoning check only.");
     - Open space = OpenBody for housing only;
     - Policies = PolicyPicker, used at Tract and ZIP too (ZIP with counts);
     - helper notes removed.
   - **`SiteDetail.tsx`:** renders `ParcelResults` instead of ProjectPanel and PoliciesCard; the prompt is "Click a lot on the map or search an address."; the `fitOrder` parameter was made optional and unused.
   - **`LevelSwitch.tsx`:** the description line was removed; `frameLevel('parcel')` with no tract and no pin zooms to `PARCEL_ZOOM` (15.6).
   - **`PlaceRail.tsx`:** the caption was removed; the search is `TractSearch dense pinned={false}` with placeholder "Search an address" at Parcel.
   - **`PlaceStudio.tsx`:**
     - `baseTracts={!zipMode && !parcel}`;
     - `selectedId` is null at Parcel;
     - a `LotLegend` component (swatches via inline styles) replaces SuggestionLegend at Parcel.
   - **`ProjectPanel.tsx`** (Tract only now): the stamp line was removed.
   - **Explore:**
     - **`lib/explore/parcelShadowStore.ts`:** an optional `boundary?: boolean` field.
     - **`components/explore/DataPanel.tsx`:**
       - `const parcels = import.meta.env.MODE !== 'export' && useParcelShadow((s) => !!s.boundary);`
       - SunShadowSwitch shows only when `open || parcels`;
       - the "dataClosed" message is hidden when Parcels is open.
     - **`lib/parcel/usePlaceLots.tsx`:** `usePlaceLots(on, picked, onPick, mapKey = 'place')` returns `{ overlays, minZoom, zoomOk }`.
     - **`components/explore/ParcelsSwitch.tsx`** (new, lazy): a Switch "Parcels"; turning it on closes the other boundaries, eases to zoom 15.2 and sets `boundary: true`.
     - **`components/explore/ParcelsBoundary.tsx`** (new, lazy):
       - publishes the lot overlays into `useParcelShadow` while Sun and shadow is off;
       - closes Parcels when another boundary opens;
       - sets the sun view to `'parcel'` when Sun and shadow is on;
       - shows a bottom-left card (inline width 320) with LotCard for the clicked lot.
     - **`LayersPanel.tsx`** and **`ExploreView.tsx`:** MODE-guarded lazy slots for ParcelsSwitch and ParcelsBoundary.
     - **lazyGuard:** added `components/explore/ParcelsSwitch.tsx` and `ParcelsBoundary.tsx`; `components/place/levels/` and `lib/parcel/` were added earlier.
   - **Update 9 files (from earlier this session, done):**
     - `src/visionpitts/lot_facts.py`, `scripts/22_build_lot_facts.py`, `tests/test_lot_facts.py`, `parcel_shadow.tile_xy`;
     - `lib/parcel/lots.ts` and `pick.ts`, `lib/policy/zipCounts.ts` (with `IZO_MIN_SHARE` 0.01) and its test;
     - `components/place/levels/*` (LotCard, lotSun, ZipDetail, Starts);
     - `lib/project/draft.ts`, reduced to `setProjectBoth` / `setLihtcBoth`;
     - `editStore` scoped to the active view;
     - docs: `docs/data/parcel_level.md`, README privacy line, assumptions, TECHNICAL, finder.md;
     - the `lot_facts` online source row in `sources.py`.
   - **Memory:** `visionpitts-update9-three-levels.md`, `visionpitts-oct27-place-inputs.md` (Save & share declined) and `visionpitts-planning-uses-guideline.md` were written and indexed in MEMORY.md.

4. Errors and fixes:
   - **Dev server unreachable at `localhost` from Chrome automation:** it listens on `[::1]`, so I used `http://[::1]:5288`. When the server died (exit 143) I restarted it.
   - **`tsc` TDZ:** `pd` was used before `t` was defined in PlaceStudio, so I moved it after `c`.
   - **lot_facts test:** the tile y expectation was wrong; 3088 is correct, not 3087. A missing district became NaN, so I build a list of strings or None and relaxed the assertion.
   - **ZIP inclusionary overlay over-count:** slivers along the overlay's edge were being counted. Added `IZO_MIN_SHARE = 0.01` with a test.
   - **Config JSON diff ballooned:** the file had been reformatted, so I rewrote it with `indent=1`.
   - **Unused `fitOrder` in SiteDetail:** made it optional and removed it from the destructuring.
   - **Test scripts set the level through a separate module copy:** importing the module directly from the dev server gave a different HMR instance. Clicking the UI radio worked.
   - **Earlier lesson:** new Tailwind classes pushed the offline file over 6 MB. Swap to existing classes or inline styles.

5. Problem Solving:
   - All update 9 checks passed earlier:
     - 572 app tests and 315 Python tests;
     - the offline file unchanged at 5,999,882 with no new classes;
     - verified in the browser.
   - For the current round, the latest `tsc` runs showed no errors (the last output was only a file-modified note), but the full vitest, export, class diff and browser verification have **not** been run since the newest components.
   - Expected: ParcelResults likely added new classes (`grid-cols-[1fr_auto]`, `col-span-2`, maybe `h-4`, `gap-x-3 gap-y-1`, `mt-1.5 h-1.5`). Fix them with existing classes or inline styles.
   - Side effects to mention to the user:
     - The type suggestions apply to all market-branch projects.
     - The soft share change from 25% to 20% plus construction interest shifts pencil numbers everywhere, including Compare and the finder.

6. All user messages:
   - "continue"
   - "show me on localhost"
   - "for analysis page, i want all the infomration to presnet in more concise format, too mnay tabs right in analysis. Also make changes conencted to compare places. try a lot faeture should be more clear and more intuitive .please fix"
   - "this is making much more sense. can you create a button that continue to back this conversation."
   - "Can you describe me the current state of the app please?"
   - "tell me what is your thought on this system? useful? practicla?"
   - "Let people save and share a scenario is important, please ultrathink and add this feature"
   - "how can we incorprate parcel level information to this tool. ultrathink to give me sugestion and something that is actually going to be useful."
   - "with the current deploy tool, i think the Compare Places's metrics input for each placs is more intuitive than the inputs for Place tab it self. Can we try to adjust and fix this and run on localhost to show the result please"
   - "can we load the parcel map?"
   - "[Image #1] This image include what the tools can help with planning decision. This should also this VisionPitt should be able to help with. this is the guideline, you dont need to change anything based on this image"
   - "Remove Save & Share. Just keep export is good enough"
   - "For analysis, I think it should be like this. Three level, parcel level, Tracts and zipcode level. parcel level is when you test out really specific project, this is where you can test the financial to see if something pencils out. For Tracts and Zipcode they don't need to have the Pencil Inputs, just more on projects, unit mix and what policy and types of projects. Can you based on this standard and update and fix the Analysis Place. No need to change the Analysis Compare Places. No need to include "Project, Unit mix, site, policies, open space and sun, pencil inputs. fold all" no need to include this. I want you to use this standard to continue to fix. I want you to ultrathink and /plan for this action. I want it to be super easy to use view understand for different element."
   - Plan answers: "Real lots, publish (Recommended)", "Parcel → Tract → ZIP", "Parcel only (Recommended)", "Tract (Recommended)". The plan was approved.
   - The big edits request, quoted in full in section 1.
   - Answers: "Zoning check only"; "Suggested by type, no AI call (Recommended)".
   - "continue"
   - "use this simple pro forma for the finance strucutre /Users/ye/Desktop/OLD\ DAYZ/UPenn/SS\ 26/LAW\ 667/In\ Class\ Exercise\ Skeleton\ Financing\ Model_v2.xlsx  keep it easy and simple please"

7. Pending Tasks:
   - **Implement the simple pro forma for Capital at the Parcel level, following the workbook:**
     - a new pure module, e.g. `app/src/lib/pencil/simple.ts`, with tests that reproduce the sheet's numbers;
     - rewrite `CapitalInputs.tsx` with simple fields:
       - basics: construction cost $/sf, land price (acquisition), loan-to-cost, interest rate, months of interest carry, vacancy, expense ratio, exit cap;
       - credit types also show tax credit price and other subsidy %;
       - More: soft cost ratio, developer fee %, origination fee, deferred fee %, rent and expense growth;
       - suggested by type.
     - Replace the parcel `CapitalStack` in `ParcelResults.tsx`:
       - Uses table;
       - Sources stack bar (tax credit equity, loan, other subsidy, deferred fee, developer equity);
       - a compact 7-year NOI / debt service / cash flow / DSCR table;
       - Exit and return (sale price, net sale, total return, multiple of equity);
       - the Capital tile shows the equity multiple and year-1 DSCR.
     - Revenue = the unit mix's gross rent × (1 − vacancy). Housing part only; commercial has no money test.
     - Simple tax credit equity: (total − acquisition) × 1.3 if QCT/DDA × applicable fraction × credit rate × 10 × price.
     - Debt at sale = full balance (interest-only); tell the user this differs from the sheet's F28.
   - Run tsc, the full vitest and Python tests, the export size check and the class diff. Fix any new classes, using inline styles.
   - Verify in the browser:
     - Explore: Sun and shadow appears only after a boundary is selected; the Parcels boundary works.
     - Parcel level: no tract layer, flow Site → Project → Capital → Open space → Policies, zoning answer, readable right panel.
     - Tract and ZIP: the policy picker.
     - Compare unchanged.
   - Clean any test entries in the browser's localStorage.
   - Update docs (`parcel_level.md`, `pencil.md` for construction interest, soft 20% and the simple pro forma, README) and memory.
   - Report to the user. Do not commit.

8. Current Work:
   - Immediately before the summary, I had read the user's workbook (structure and values recorded in section 2) and then finished the Explore Parcels boundary pieces:
     - added `mapKey` and `zoomOk` to `usePlaceLots`;
     - created `ParcelsSwitch.tsx` and `ParcelsBoundary.tsx`;
     - added the lazy slots in `LayersPanel.tsx` and `ExploreView.tsx`;
     - added the lazyGuard entries.
   - The last command ran `npx tsc -b --noEmit`. Its output showed only "[This command modified 3 files you've previously read…]" with no type errors listed.
   - The simple pro forma itself has not been started.

9. Optional Next Step:
   - Implement the workbook-based simple pro forma for Parcel Capital, per the user's latest instruction: "use this simple pro forma for the finance strucutre /Users/ye/Desktop/OLD\ DAYZ/UPenn/SS\ 26/LAW\ 667/In\ Class\ Exercise\ Skeleton\ Financing\ Model_v2.xlsx  keep it easy and simple please".
   - I had told the user: "I'll make Capital follow exactly that, with rents from the unit mix as revenue and vacancy added as you asked earlier. First I'll finish the Explore Parcels boundary I was in the middle of."
   - Next:
     1. Confirm tsc passes.
     2. Create `app/src/lib/pencil/simple.ts` and its test (check the Community Center example: total 13,173,232.38, debt 2,500,400, developer equity 1,595,630.46, year-1 DSCR 1.8454, sale price 5,536,626.74).
     3. Rewrite `CapitalInputs.tsx` and the capital parts of `ParcelResults.tsx` around it.
     4. Run the full checks (vitest, export size, class diff) and verify in the browser on `[::1]:5288`.

If you need specific details from before compaction (like exact code snippets, error messages, or content you generated), read the full transcript at: /Users/ye/.claude/projects/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569.jsonl
Continue the conversation from where it left off without asking the user any further questions. Resume directly — do not acknowledge the summary, do not recap what was happening, do not preface with "I'll continue" or similar. Pick up the last task as if the break never happened.

The messages after this summary are the most recent messages from before compaction, kept verbatim. The summary was written without seeing them, so something it says has not happened yet may already have happened in them.

## Claude

The workbook test passes: all 5 checks match your sheet. Next, Capital inputs and the right panel get rebuilt around it. Reading the current files first.

- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/levels/CapitalInputs.tsx
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/levels/ParcelResults.tsx
- *Bash*: Show this round's pencil and model changes
- *Bash*: Find uses of the reverted fields and the store's pencil parsing
- *Bash*: Find uses of the reverted fields and rent lines in finance

## Claude

All five diffs are this round's own changes, so I'm reverting them and checking that the rebuilt defaults file comes out identical to the committed one.

- *Bash*: Revert old-pencil changes, rebuild defaults, read operating lines
- *Bash*: Read credit cap code and project store parsing
- *Bash*: Find planRules and the project model's shape

## Claude

Next I'm loading the chart guidance before drawing the capital stack bars and the 7-year chart.

- *Skill*
- *Bash*: Read the reference palette
- *Bash*: Validate the Sources palette in light mode
- *Bash*: Try three Sources palette orders
- *Bash*: Check all pairs for the Sources palette
- *Bash*: Validate every Sources stack combination
- *Bash*: Read the lazy guard list and side store shape

## Claude

Both `lib/pencil/` and `lib/project/` are already in the on-demand list. Now the store field, then the capital module with the type-by-type suggestions and the tax credit equity.

- *Bash*: Read the ProjectState fields
- *Bash*: Add the capital field and drop the old suggestions
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/project/capital.ts
- *Bash*: Read the defaults file type
- *Bash*: Cast the defaults file's input values

## Claude

Next, the hook that builds the context from the project model. Inputs and results both use it.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/levels/useCapital.ts

## Claude

Now the Capital inputs, rewritten around the simple pro forma.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/levels/CapitalInputs.tsx
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/levels/CapitalCard.tsx

## Claude

Now wiring it into the Parcel results: the Capital tile, the fourth tile, and the card in place of the old stack.

- *Bash*: Wire the capital card into the Parcel results and type-check

## Claude

Types pass. Next, tests for the capital module: type suggestions, your changes winning, and the credit equity with PHFA's cap.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/project/capital.test.ts
- *Bash*: Run the capital and pro forma tests

## Claude

Both pass. Now the full app test suite.

- *Bash*: Run the full app test suite
- *Bash*: Build the offline file and diff its class list
- *Bash*: Find the numeric classes and existing colour classes
- *Bash*: Locate numeric class selectors in the offline CSS
- *Bash*: Show the CSS around the numeric tokens

## Claude

Both numbers are colour variables that come with the new `-600` classes. Swapping the icons to the existing `-700` shades removes all five. SunCard's grid becomes a flex row.

- *Bash*: Swap to existing classes, rebuild, and re-diff
- *Bash*: Fix the policy icons, rebuild, and re-diff
- *Bash*: Run the Python test suite
- *ToolSearch*: select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__tabs_create_mcp,mcp__claud
- *mcp__claude-in-chrome__tabs_context_mcp*
- *Bash*: Check Python results, Playwright, and the dev server

## Claude

Python: 315 passed. The Chrome extension can't connect (it's signed into a different claude.ai account), so I'm checking whether Playwright is installed on this Mac to drive the browser instead.

- *Bash*: Look for a Playwright browser install and scratch scripts
- *Bash*: Find an installed Playwright package

## Claude

Playwright is installed in the home folder. Next I'm checking how the app's URL picks a view, so the script can open Explore and Place directly.

- *Bash*: Find URL parameters for views
- *Bash*: Find where the URL state is read
- *Bash*: List files that read URL parameters
- *Bash*: Read the hash parameters
- *Bash*: Show the hash module
- *Write*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/verify.cjs

## Claude

API Error: Your computer went to sleep mid-response. The response above may be incomplete.

- *Bash*: Run the browser check script

## Claude

The first run failed to load a module ("network changed"). I'm checking the dev server's log and the screenshot it got.

- *Bash*: Read the dev server log and probe a module

## Claude

The server is healthy and the module loads now, so the failure was a one-off network blip. Running the checks again.

- *Bash*: Rerun the browser check script
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/shots/tract.png
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/shots/parcel_full.png
- *Bash*: Size credits to need, size the suggested loan by income, retest

## Claude

Tests pass (12). Next, the plain words for losses, on the card and the tile.

- *Bash*: Update the loss wording, type-check, rerun Parcel checks
- *Bash*: Fix the reset locator and rerun Parcel checks
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/shots/parcel_full.png
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/shots/capital_market.png
- *Bash*: Move the debt service label into a legend and recheck
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/shots/capital_affordable.png
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/shots/capital_inputs.png

## Claude

The capital card reads cleanly now. Next, Explore (Sun and shadow only after a boundary, plus the Parcels boundary) and Compare.

- *Bash*: Run the Explore and Compare checks
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/shots/explore_before.png

## Claude

Explore's panels start folded, which is why the script didn't find the switches. Next it unfolds Boundary and Data, then turns on Parcels.

- *Bash*: Check Explore's Sun and shadow and the Parcels boundary
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/shots/explore_parcels.png
- *Bash*: Read the Parcels card position and Explore's overlays
- *Bash*: Move the Parcels card beside the panel

## Claude

Now a look at Compare, which should be unchanged.

- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/shots/compare.png

## Claude

Compare renders as before. Next I'm checking whether Parcel's Export still writes the old pencil's numbers, which would now disagree with the screen.

- *Bash*: Find what Export writes for the project
- *Bash*: Read the StudioExport component
- *Bash*: Check whether the Place report includes the pencil
- *Bash*: Find the project section of the report
- *Bash*: Inspect the project report module
- *Bash*: Find where the project report is added to exports
- *Bash*: See how the project report reaches the export
- *Bash*: Read the project report builder and export hook
- *Bash*: Add the Parcel capital report builder
- *Bash*: Check the CSV rows hook and report block shapes

## Claude

Now registering it from the Parcel results.

- *Bash*: Register the capital report and type-check
- *Bash*: Type-check and test the Parcel CSV export

## Claude

The Parcel CSV now carries the project rows, and they match the card. Next, a small guard so a credit-balanced deal never shows a hair of "developer equity" from rounding, then the full checks.

- *Bash*: Run all app tests, the offline build and the class diff
- *Bash*: Find doc passages about Parcel money and capital
- *Bash*: Read the docs passages to update

## Claude

I'm updating the Parcel method doc first, then the README, TECHNICAL and the About text in the app.

- *Bash*: Document type, zoning check, policies and the simple pro forma
- *Bash*: Confirm the verdict words and automatic policy rows
- *Bash*: Update README, TECHNICAL and the About text

## Claude

Docs are updated. A final pass now: type-check, the offline build, and one more browser run of Parcel and Explore after the last edits.

- *Bash*: Final type-check, offline build and browser runs

## Claude

All checks pass. Last, I'm saving this round's decisions to memory so the next session knows them.

- *Write*: /Users/ye/.claude/projects/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/memory/visionpitts-update10-parcel-flow.md
- *Bash*: Index the new memory

## Claude

Capital at the Parcel level now follows your class workbook, and the rest of the flow you described is built. It's running on your dev server at http://localhost:5288. Pick Analysis, then Place, then Parcel. All tests pass (591 app, 315 Python), and a headless browser run of Explore, Parcel, Tract and Compare showed no errors. The Chrome extension wouldn't connect (it's signed into a different claude.ai account), so I used Playwright instead. Nothing is committed.

**The flow**
- **Explore:** Sun and shadow appears under Data only once a boundary is open. Parcels is now one of the boundaries; turning it on closes the others and draws the county lots, and clicking a lot shows its facts.
- **Analysis search bar:** cleaner, with the grey hint lines removed.
- **Parcel level:** you pick a site by clicking a lot or searching an address. The map shows lots, not census tracts.
  - **Site:** the lot you picked. The zoning district and lot area inputs are gone.
  - **Project:** development type first (Market, Affordable, Senior, Mixed use, Commercial), then Units, stories, income level (housing only) and the unit mix. The right panel then says whether zoning allows it: allowed by right, needs a hearing, or not allowed as is, with a checklist.
  - **Capital:** the simple pro forma (below).
  - **Open space:** unchanged.
  - **Policies:** "Applies here" fills in automatically; "I want to study" is checkboxes, and each one you check shows its result on the right.
- **Right panel:** four headline tiles (zoning, units against what's allowed by right, capital, tax credit score), then the capital card:
  - a stacked bar of where the money comes from;
  - bars for what it pays for;
  - a 7-year chart of net operating income against debt service;
  - the year-7 sale, with what the developer puts in against what comes back.

**Capital follows the workbook line for line.** Land, hard and soft cost, financing (interest carry plus origination), developer fee and total. Then loan, tax credit equity, other subsidy, deferred fee, and developer equity as the plug. Then 7 years at 2% rent and 3% expense growth, debt service, DSCR, cash flow, and a sale at the exit cap. A test reproduces your Community Center numbers (total $13,173,232, developer equity $1,595,630, year-1 DSCR 1.85). Every input starts as a suggestion for the development type, with no AI call; PHFA's values are used on tax credit deals. Change one and it's marked "yours" with a reset. Commercial gets the zoning check only.

**Where I went beyond the sheet:**
- **Loan at sale:** it's interest only, so the whole loan is subtracted at the sale. The sheet subtracts the debt service paid instead, which looks like a quirk of the skeleton.
- **Vacancy** comes off the rent first, as you asked.
- **Tax credits are sized to need,** as PHFA does. Without this, the affordable test site came out with credits above the cost.
- **The suggested loan is the one year-1 income can carry** at the coverage lenders ask for, so the starting numbers aren't underwater.
- **Losing deals say so in words,** "Loan not covered" or "Loses money", instead of a negative multiple.

**Other changes**
- **Earlier changes reverted:** I undid my earlier construction-interest and soft-cost changes to the old model. Compare places and Find places keep exactly their previous numbers; the simple pro forma is used only at Parcel.
- **Export:** Parcel's PDF and CSV now carry the zoning reading and the pro forma.
- **Offline file:** 5,999,962 bytes, so only 38 bytes are left under 6 MB.

**One result to expect:** a market-rate project in Hazelwood, at the area's rents and the suggested $300 a sq ft, shows "Loses money" (about 0.14×). New construction there doesn't pencil at market rents, so that's the honest answer rather than a bug.

The method is written up in `docs/data/parcel_level.md`, with short updates to the README, TECHNICAL and the in-app About text.

## Summary of earlier conversation

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.


Summary:
1. Primary Request and Intent:
   - **Big edits request (user, verbatim):** "Here are some edits that I want you to make. I want you to make Sun and Shadow also only appear after a layer is selected for Explore tab. For Explore tab, include parcel as part of the boundary. For the analysis tab, i dont need to so much light grey hint text. Keep the search bar clean. When i click on Parcel level, I could either click on site, or search. Then the first tab is Site (change from Your site). No need to have Zoning district and Lot area, sq ft input. Next is Project (change from Your project), Change Homes into Units. Residents just make it Market, Senior, Affordble, Mixed Use, Commerical, like development type, this should com before Units. If it is housing, it should include Income level. When I select the type and size, the riht tab should tell me if it is going to be allowed by zoning and restrictions. Change Money into Capital. Keep it easy, keep it easy with basic real estate development capital stack, loan, equity, vacancy, construction period and so on. this can also be ai suggested by the project that you propose. Open space is good. Policies and screens should just be the things that I want to be elgible for or the things that I wanto take consider. Right now Policies and screens is not straight forward, make it more clean. Also for the tool, when i turn on the parcel level, dont show the cenuss tract level on the map. Policies and screens should be like this, it should be have two section, one section is what is eligible which is going to show automatic, and another section is the things that I am interested in and i want to study, which will reflect on the right tab. Can you based on this flow to ultrathink and revise. Make sure the right panel need to be more readable. Using some graphics and easy takeaway. keep is straighforward."
   - **The user's answers to my questions:**
     - "Zoning check only" for commercial and mixed use.
     - "Suggested by type, no AI call (Recommended)" for the capital inputs.
   - **Then (user):** "use this simple pro forma for the finance strucutre /Users/ye/Desktop/OLD\ DAYZ/UPenn/SS\ 26/LAW\ 667/In\ Class\ Exercise\ Skeleton\ Financing\ Model_v2.xlsx  keep it easy and simple please".
   - **Then:** "continue", sent twice: once before the last compaction and once mid-turn after it.
   - **Standing constraints (keep):**
     - Ye commits their own work: **never git commit or push**.
     - Never mention the Hack a House/AI Housing folder or a prototype.
     - Deepblue is never named, and none of its code is copied.
     - The published contact is only the UPenn email and LinkedIn.
     - Ask Ye before raising the 6 MB offline mark.
     - Public data only.
     - Lot facts only: never owners, addresses on record, values or sales.
     - Compare places should not change.
     - Keep Export; no Save & share.

2. Key Technical Concepts:
   - **App and pipeline:**
     - React, Vite and TypeScript in `app/`, with zustand stores and the side stores `SIDE_A` / `SIDE_B`.
     - The Python pipeline runs with `PYTHONPATH=src uv run --no-sync python`.
   - **Offline file:** `export/index.html` must stay ≤ 6,000,000 bytes.
     - It is now **5,999,962** bytes, 38 left.
     - New Tailwind classes cost bytes even in lazy files, so use existing classes or inline styles.
     - The `-600` icon colours pulled in CSS colour variables; switched to `-700`.
     - Class-diff check: `python3 $S/classes.py ../export/index.html $S/classes_afterN.txt; diff $S/classes_before.txt …`, where `S=/private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad`.
   - **Lazy guard:** `lib/pencil/`, `lib/project/` and `components/place/levels/` are already in the `ON_DEMAND` list.
   - **Dev server:** background task `bdicpwqxe` on `http://[::1]:5288`.
     - The Chrome extension is unavailable (account mismatch).
     - Playwright from `/Users/ye/node_modules/playwright` works headless.
     - Scripts: `scratchpad/verify.cjs` (steps all/explore/place/tract/compare), `explore2.cjs`, `csv.cjs`; screenshots go to `scratchpad/shots/`.
   - **URL hash:** `#m=explore`, `#m=compare`, and `#m=place&p=lng,lat,label`, which opens Parcel.
   - **Simple pro forma (the workbook model):**
     - **Uses:** acquisition, hard = $/sf × size, soft = ratio × (acq + hard), financing = loan × rate/12 × months + origination × loan, fee = % × (acq + hard + soft + financing).
     - **Sources:** loan = LTC × (acq + hard + soft), tax credit equity (sized to need), other subsidy = % × total, deferred = % × fee, developer equity = plug, clamped to 0 when |plug| < 0.5.
     - **Years 1–7:** revenue = gross rent × (1 − vacancy), growing yearly; expense = ratio × revenue, growing yearly; NOI; interest-only debt service = loan × rate; DSCR; cash flow.
     - **Exit:** sale = year-7 NOI / exit cap; net sale = sale − loan, where the sheet's F28 quirk is replaced; return = Σ cash flow + net sale + fee paid; multiple = return / equity.
   - **Dataviz colours** (validated with the validator, every stack combination):
     - Sources stack order: Developer equity `#eb6834`, Loan `#2a78d6`, Other subsidy `#eda100`, Tax credit equity `#1baf7a`, Deferred developer fee `#e87ba4`.
     - Uses bars use one hue, `#64748b`.
     - NOI bars are `#7c3aed`; debt service is a dashed `#334155` line, labelled in an HTML legend above the chart.

3. Files and Code Sections:
   - **New `app/src/lib/pencil/simple.ts`:**
     - `HOLD_YEARS = 7`;
     - the `SimpleInputs` interface (sizeSf, hardPerSf, softRatio, feePct, acquisition, ltc, rate, carryMonths, originationFee, otherSubsidyPct, deferredFeePct, grossRent, vacancy, expenseRatio, revenueGrowth, expenseGrowth, exitCap);
     - the `Line` and `SimpleResult` types, the result being { uses, total, sources, loan, developerEquity, years[], salePrice, netSale, feePaid, developerReturn, multiple|null, creditsCould|null };
     - `simpleProForma(i, creditEquity?)`, which holds credits to `room = total − loan − other − deferred`.
   - **New `app/src/lib/pencil/simple.test.ts`:** 5 tests that reproduce the workbook:
     - total 13,173,232.38;
     - loan 2,500,400;
     - developer equity 1,595,630.46;
     - year-1 NOI 323,000 and DSCR 1.8454;
     - sale 5,536,626.74.
   - **New `app/src/lib/project/capital.ts`:**
     - **Field lists:**
       - `CapitalKey` and `CapitalKind` ('sourced' | 'suggested' | 'yours');
       - `CAPITAL_BASICS`: Land price, Construction cost $/sf, Construction period months, Loan-to-cost, Loan interest rate, Vacancy, Operating expenses of revenue, Exit cap rate (sale in year 7), and Other subsidy (shown in basics for credits only);
       - `CAPITAL_MORE`: soft, developer fee, share of the fee deferred, origination fee, rent growth, expense growth, and tax credit price (credits only).
     - **`CapitalContext`:** devType, branch, plan, units, affordable, large, qctOrDda, sizeSf, grossRent, opexPerUnit, price, dscrNeed.
     - **`suggestCapital(c, vacancyInForce?)`:**
       - LTC caps: market 0.65, mixed 0.6, nine 0.2, four 0.45;
       - rate: market 0.07, credits 0.0625;
       - months: 14 market, 16 senior, 18 affordable, 20 mixed;
       - vacancy: market 0.06, mixed 0.07; credit deals use PHFA's 0.05, labelled sourced;
       - expense ratio = opex × units / EGI, clamped to 0.25–0.85;
       - exit cap: market 0.06, mixed 0.065, credits 0.07;
       - soft 0.2 / 0.25, fee 0.04 / 0.10, deferred 0 / 0.25 (market / credits);
       - growth: PHFA's 2% and 3%.
     - **`runCapital(c, overrides)`:**
       - applies overrides, which are marked 'yours';
       - when LTC is not yours, the suggested LTC = min(cap, floor(NOI / dscrNeed / rate / cost, to 1%));
       - credit equity = (total − land) × boost × affordable share × rate × 10 × price, held to the 9% `credit_cap.base` (or `large`).
   - **New `app/src/lib/project/capital.test.ts`:** 7 tests covering the suggestions, your changes winning, the market stack, the income-sized loan, credits sized to need, and the credit formula and cap.
   - **New `app/src/components/place/levels/useCapital.ts`:**
     - `capitalContext(m, devType)` takes the gross rent from `m.result.income` 'Gross rent', size from netSf / efficiency, and `dscrNeed` from `m.args.inputs.dscr`;
     - `useCapital(m, devType)` is memoised on `side.project(s => s.capital)`;
     - `setCapital(side, key, v|null)`.
   - **`app/src/lib/project/store.ts`:** `capital?: Record<string, number>` was added to `ProjectState`; `parseProject` keeps only finite numbers.
   - **`app/src/lib/project/devType.ts`:** `suggestFor` was removed.
   - **Reverted with `git checkout`:** `finance.ts`, `inputs.ts`, `model.ts`, `config/pencil_defaults.json` and `app/src/data/lazy/pencil_defaults.json`. This removed construction interest, the 20% soft cost and the type suggestions, so Compare and the finder are unchanged. The rebuilt lazy JSON matched the committed file.
   - **Rewritten `CapitalInputs.tsx`:**
     - the 9%/4% Segmented control for credits only;
     - rows with sourced/suggested/yours tags, the note in `title`, and a reset link;
     - a "More" Explainer.
   - **New `CapitalCard.tsx`:**
     - `SourcesBar`, with 2px gaps, a legend showing share and value, a "Tax credits sized to need" note, and an over-funding note;
     - `UsesBars`;
     - a legend row, then `YearsChart` (SVG NOI bars with rounded tops, a dashed debt-service line, Y1/Y7 labels, `<title>` tooltips);
     - a 3-stat dl;
     - the sale line, `ReturnBars` (puts in / gets back, negative shown as text) or a no-equity sentence;
     - folds "Year by year" (table) and "Sources and uses in full" (formulas).
   - **`ParcelResults.tsx`:**
     - uses `useCapital`;
     - Capital tile logic: DSCR < 1 → "Loan not covered"; multiple null → "No equity needed"; multiple < 1 → "Loses money"; otherwise "N× equity", tinted warn if DSCR < need or multiple < 1.5;
     - the market fourth tile reads "Developer equity";
     - `CapitalStack`, Pencil, Paths and tierOf were removed;
     - SunCard's grid became a flex layout;
     - icons use the `-700` colours;
     - a `useEffect` registers `placeExtra.at` with `capitalReport(...)`, importing `tractLabel` from `lib/data` and `lotName` from `lib/explore/parcelShadow`.
   - **`app/src/lib/project/report.ts`:** added `CapitalReportInput` and `capitalReport()`, which builds PDF blocks (setup kv, zoning list, uses, sources, years table, exit kv) and CSV rows.
   - **`Policies.tsx`:** icons switched to `-700`.
   - **`ParcelsBoundary.tsx`:** the card style became `{ width: 320, left: 384 }`, beside the rail.
   - **Docs:**
     - `docs/data/parcel_level.md`: updated table; new sections on development type and the zoning check (verdicts Allowed by right / Needs a hearing / Not allowed as is / Check the code), policies, the simple pro forma with a suggestions table, and Parcels in Explore.
     - `README.md`: the Parcel bullet.
     - `docs/TECHNICAL.md`: the Parcel part.
     - `ProjectCardsDetails.tsx`: the About text.
   - **Memory:** new `visionpitts-update10-parcel-flow.md`, indexed in MEMORY.md.

4. Errors and fixes:
   - **New classes:** the class diff added `179` and `585` (colour variables), `col-span-2`, `grid-cols-[1fr_auto]` and `text-amber/emerald/rose-600`, putting the file at 6,000,323 bytes. Fixed by using the `-700` colours (ParcelResults and Policies) and a flex layout in SunCard; now 5,999,962 bytes with no new classes.
   - **Defaults file typing:** `DefaultsFile.inputs` values are typed as unions, so I added an `inp(k)` cast helper.
   - **Browser:**
     - The Chrome extension can't connect, so I switched to Playwright.
     - One run hit ERR_NETWORK_CHANGED; a rerun was fine.
     - Explore's panels start folded, so the script clicks Boundary and Data first.
     - The Tract check missed "Applies here" because CSS uppercases the heading; it is actually present.
     - The reset-button locator was wrong; fixed to `[data-capital] button` with text 'reset'.
   - **Over-funded credits:** credits exceeded the need and pushed developer equity negative. Now sized to need.
   - **DSCR around 0.2:** the suggested loan is now sized by year-1 income.
   - **Negative multiple display:** replaced with plain words.
   - **Debt-service label overlapping bars:** moved into an HTML legend.
   - **Wrong import:** `tractLabel` comes from `lib/data`, not `lib/format`.

5. Problem Solving:
   - **Final state:**
     - tsc clean;
     - vitest 66 files, 591 tests passed;
     - pytest 315 passed;
     - offline file 5,999,962 bytes, no new classes;
     - Playwright runs with no errors.
   - **Explore:** Sun and shadow shows only when a boundary or Parcels is open, and is gone with none; the Parcels switch works.
   - **Parcel:** the type changes the stack; LTC edit and reset work; the CSV export carries the Project rows.
   - **Tract:** the policy picker shows.
   - **Compare:** renders unchanged.
   - **Example numbers (Hazelwood, lot 56-P-285-0-1, R1A-H, 40 units):**
     - Affordable 9%: total $16.5M; loan $2.07M; credits $14.0M (sized to need, of $16.3M possible); DSCR 1.23; no equity needed; gets back $1.54M.
     - Market: DSCR 1.21; "Loses money" at 0.14×.
     - Zoning: "Not allowed as is".

6. All user messages:
   - "continue"
   - "show me on localhost"
   - "for analysis page, i want all the infomration to presnet in more concise format, too mnay tabs right in analysis. Also make changes conencted to compare places. try a lot faeture should be more clear and more intuitive .please fix"
   - "this is making much more sense. can you create a button that continue to back this conversation."
   - "Can you describe me the current state of the app please?"
   - "tell me what is your thought on this system? useful? practicla?"
   - "Let people save and share a scenario is important, please ultrathink and add this feature"
   - "how can we incorprate parcel level information to this tool. ultrathink to give me sugestion and something that is actually going to be useful."
   - "with the current deploy tool, i think the Compare Places's metrics input for each placs is more intuitive than the inputs for Place tab it self. Can we try to adjust and fix this and run on localhost to show the result please"
   - "can we load the parcel map?"
   - "[Image #1] This image include what the tools can help with planning decision. This should also this VisionPitt should be able to help with. this is the guideline, you dont need to change anything based on this image"
   - "Remove Save & Share. Just keep export is good enough"
   - The three-level plan request: Parcel / Tract / ZIP, with no pencil at Tract and ZIP, Compare unchanged, no chip row. Plan answers: "Real lots, publish (Recommended)", "Parcel → Tract → ZIP", "Parcel only (Recommended)", "Tract (Recommended)".
   - The big edits request, quoted in full in section 1.
   - Answers: "Zoning check only"; "Suggested by type, no AI call (Recommended)".
   - "continue"
   - "use this simple pro forma for the finance strucutre /Users/ye/Desktop/OLD\ DAYZ/UPenn/SS\ 26/LAW\ 667/In\ Class\ Exercise\ Skeleton\ Financing\ Model_v2.xlsx  keep it easy and simple please"
   - "continue" (sent mid-turn)

7. Pending Tasks:
   - Report to the user. Do not commit.

8. Current Work:
   - Everything is finished and verified, and the memory is written.
   - The last actions were the final type-check, export and Playwright runs (all clean), writing the memory file and adding its index line to MEMORY.md.

9. Optional Next Step:
   - Give the user the final report (no more tool work needed). Cover:
     - **The flow:** Site → Project (dev type first, Units, income level for housing) → Capital → Open space → Policies.
     - **Zoning verdict** on the right panel.
     - **Capital** follows their LAW 667 workbook. Say that the tests reproduce the sheet's numbers, and that three choices depart from it:
       - vacancy added;
       - credits sized to need;
       - the full loan repaid at sale instead of the sheet's F28.
     - **Suggestions:** by type (no AI); the suggested loan is sized by income at DSCR 1.20, or PHFA's 1.15.
     - **Commercial:** zoning check only.
     - **Policies:** two sections.
     - **Explore:** the Parcels boundary; Sun and shadow appears only once a boundary is open.
     - **Export** carries the pro forma.
     - **Old pencil:** the same-day changes were reverted, so Compare and Find places keep their numbers.
     - **Example readings:** Hazelwood market "Loses money" at 0.14×; affordable "No equity needed".
     - **Checks:** 591 app and 315 Python tests passed; the offline file is 5,999,962 bytes, 38 left.
     - **Browser check:** done with headless Playwright, because the Chrome extension is signed into another claude.ai account.
     - **Commits:** nothing committed; Ye commits.

If you need specific details from before compaction (like exact code snippets, error messages, or content you generated), read the full transcript at: /Users/ye/.claude/projects/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569.jsonl
Continue the conversation from where it left off without asking the user any further questions. Resume directly — do not acknowledge the summary, do not recap what was happening, do not preface with "I'll continue" or similar. Pick up the last task as if the break never happened.

The messages after this summary are the most recent messages from before compaction, kept verbatim. The summary was written without seeing them, so something it says has not happened yet may already have happened in them.

## You

can you move down a few spot for tax credit in Capital, there is also Historical Tax Credit, i think it will auto calcualte. can you refernce the excel model that I hinted and make the chanage like that. Make it for people who are working on these easier to understand.

- *Bash*: Dump the workbook's cells and formulas
- *Bash*: Read capital model and inputs code
- *Bash*: Read pro forma tests and capital card
- *Bash*: Search for historic data and palette slots
- *Bash*: Find label uses and Segmented component
- *Bash*: Find other uses of sources labels
- *Bash*: Validate candidate six-colour stacks
- *Bash*: Validate every stack subset for candidate colours
- *Bash*: Validate every subset with dev equity first order
- *Bash*: Validate stacks where the loan is always present

## Claude

Green passes in every stack the bar can show (with the loan present). Now the model change.

- *Bash*: Add historic tax credit to the simple pro forma and tests

## Claude

Now the input groups in `capital.ts`.

- *Bash*: Group capital inputs and add historic credit suggestions

## Claude

Now the left panel, `CapitalInputs.tsx`.

- *Bash*: Rewrite Capital inputs into groups; update card colours
- *Bash*: Check report setup lines and type-check

## Claude

Types are clean. Running the tests and the offline-size check.

- *Bash*: Run tests, build offline file, diff classes

## Claude

Same offline size (5,999,962 bytes), no new classes. Now a browser check of the new inputs.

- *Bash*: Drive Capital inputs with the historic toggle in Playwright
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/shots/htc_inputs_Affordable_on.png
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/shots/htc_card_Affordable.png

## Claude

Both look right. Updating the method doc and memory.

- *Bash*: Read the pro forma section of the method doc
- *Bash*: Update method doc, memory note, rerun capital tests

## Claude

The tax credit controls have moved down into their own group in Capital, and the historic tax credit is in. You turn it on with a switch, and then it calculates from the cost by itself. It's live at http://localhost:5288 (Parcel). All 593 app tests pass, the offline file hasn't grown, and nothing is committed.

**The Capital inputs now follow your workbook's order:**
1. **Uses: what it costs:** land price, hard cost $/sq ft, soft cost %, developer fee %.
2. **The loan:** loan-to-cost, interest rate, construction period.
3. **Tax credits and subsidy:**
   - the LIHTC 9% or 4% choice (affordable and senior only), which used to sit at the very top;
   - the historic tax credit switch, "No" or "Certified historic rehab";
   - one line saying how each credit is worked out;
   - the credit prices, other subsidy, and the share of the developer fee deferred.
4. **Operations:** vacancy, operating expenses.
5. **Sale:** exit cap.

Origination fee and the two growth rates are under **More**. Soft cost and developer fee are no longer hidden there, because your sheet shows them up front.

**How the historic tax credit works**
- **Formula:** it's your sheet's HTC line, (total − land) × 20% × the HTC price. The price starts at your sheet's $0.82 and you can change it.
- **Off by default:** it only applies to a certified historic building being renovated. I have no historic-building data to detect that, so the switch starts at "No"; the ⓘ next to it explains who qualifies.
- **Any kind of housing:** it works for market rate as well as affordable.
- **With LIHTC:** the historic credit counts first. LIHTC is then sized to fill only the gap that's left, as before, so the two can't add up to more than the cost.

**Right panel:** the money sources now read Loan, LIHTC equity, Historic tax credit equity, Other subsidy, Deferred developer fee, Developer equity. The historic credit has its own colour in the bar, and the colours stay distinguishable in every combination the bar can show. In the Hazelwood example with the switch on, affordable shows $2.6M of historic credit equity, and market rate's developer equity drops by about the same.

**Checks**
- A new test reproduces your sheet's HTC number exactly: $1,832,410.
- With the historic credit added, developer equity still matches your sheet: $1,595,630.

**Decision for you:** I left out your sheet's New Markets Tax Credit line, because it funds community facilities and commercial space, not rental housing. I can add it the same way if you want it.

The method doc (`docs/data/parcel_level.md`) is updated to match.

## You

what is renter's split

- *Bash*: Search for renter's split in the app
- *Bash*: Search for renter's split wording
- *Bash*: Read how the renters' split mix is computed
- *Bash*: Read the mix recommendation arithmetic
- *Bash*: Read size groups and household mapping

## Claude

"Renters' split" is the app's default unit mix. Your units are divided between apartment sizes in the same proportions as the renter households who already live in the tract. It's one of the two choices under Unit mix in Project; the other is **My mix**, where you type the counts yourself.

**How it works** (`app/src/lib/demand/mix.ts` and `lib/project/plan.ts`):
1. It takes the tract's renter households by household size from the census (ACS 2020–24, table B25009). If the tract has no data, it uses the ZIP code instead.
2. It matches each household size to an apartment size:
   - 1–2 people → studio or 1-bedroom
   - 3–4 people → 2-bedroom
   - 5 or more people → 3+ bedrooms
3. It splits your units by those shares. For example, if 52% of the area's renters are 1–2 person households and you plan 40 units, that's 52% × 40 = 20.8, so about 21 one-bedrooms. Leftover fractions are rounded so the total always equals your unit count.
4. All of these units sit at the income level you picked.

**Limits:**
- It never suggests studios, because the census doesn't say whether a one-person household wants a studio or a 1-bedroom. Switch to My mix if you want some.
- It reflects who rents there today, which is a reasonable starting point, but it isn't a market study.

The name probably isn't obvious to someone reading the panel. I can rename it to something plainer, such as "Match local renters" or "Based on who rents here", and put a one-line note under the switch.

## You

for Project, change home into units for Tract and Zipcode

## Claude

Finding where Tract and ZIP Project say "homes".

- *Bash*: List level files and how inputs vary by level
- *Bash*: Read Tract and ZIP input bodies
- *Bash*: Find HomesField and how Parcel labels units
- *Bash*: Label Tract and ZIP size field as Units; check mix editor wording
- *Bash*: Read the mix editor and its users
- *Bash*: Find who uses the mix inputs

## Claude

The Units field is done for both levels. Now the "Homes" header in the unit mix table. Compare shares that table, so I'll pass the word in rather than change it everywhere.

- *Bash*: Pass Units header into the mix editor at the three levels
- *Bash*: Type-check, test, offline size, and browser check

## Claude

The Project section at Tract and ZIP code now says **Units** instead of Homes, matching Parcel. That covers the size field ("Units") and the column header of the unit mix table you see when you pick "My mix".

Compare places still says "Homes", because you asked me to leave Compare unchanged. Its table shares the same code, so I passed the word in only for Place rather than changing it everywhere.

I checked in the browser at Tract and at ZIP code: both show "Units" and no "Homes" is left in the panel. Type-check and the 593 app tests pass, and the offline file stays at 5,999,962 bytes. Nothing is committed.

## You

I think tract and zipcode should have the similar options just like the Parcel. so same selection as the parcel and apply to all three options and also for the compare places. I want you to update the right panel like the ones for Pacel level and update for Tract and Zicpode. I also want you to update the similar result for Comparison in the Compare Places middle section like the right panel from Parcel Level. I want you to ultrathink and just just review all the suggestion we have over here, it should be calculated everytime we adjust the input, so there needs to be an feaature where logic and thinking (can involve ai) are used. certain model. I wnat you to review all the ouput and make sure they are concise and understandable. If they apply and follow the zoning laws, heigh restriction, any overlays, match with the surrounding deomgraphis and etc. i also want you to really better design the insights and functions for the Equity & Policy tab where it is going to be a more policy focused feature to see how everything is working and not working if we adjust something. Please do research if needed use /agents to get better understanding and I want to this tool to be actually useful and functionable please.

- *ToolSearch*: select:EnterPlanMode,ExitPlanMode
- *EnterPlanMode*
- *Bash*: Locate the Equity & Policy tab and list components
- *Bash*: List equity and analysis components
- *Agent*: Map Tract/ZIP/Compare panels
- *Agent*: Map zoning, demand, AI checks
- *Agent*: Map Equity & Policy tab

## Claude

I'm in planning mode for this one. Three read-only searches are mapping the code in parallel:
- how Place's three levels and Compare places are built;
- what zoning, height, overlay, demographic and AI logic already exists;
- what the Equity & policy tab does today, plus a little research on policy tools.

Once they report back, I'll draft the plan and ask you a few questions before I write any code.

## You

<task-notification>
<task-id>a2ecbf9fda2f6dd05</task-id>
<tool-use-id>toolu_01Fm1AomT85YnJiGZM38L81W</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/tasks/a2ecbf9fda2f6dd05.output</output-file>
<status>completed</status>
<summary>Agent "Map Tract/ZIP/Compare panels" finished</summary>
<note>A task-notification fires each time this agent stops with no live background children of its own. The user can send it another message and resume it, so the same task-id may notify more than once.</note>
<result>I've mapped all five areas below. Every path is under `/Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/`.

## 1. Parcel level (the reference design)

**Left panel.** `PlaceRail.tsx:72-73` wraps `&lt;LevelInputs t rec/&gt;` in `SideContext.Provider value={SIDE_A}`.
- `levels/levels.ts`:
  - `inputsFor(level, picked)` (L28-31): parcel with a place picked gets `['site','project','money','open','policy']`; parcel with none gets `['project','finder']`; tract and zip get `['who','project','policy']`.
  - `INPUT_TITLE` (L17-25), `answersFor(level)` (L36-38: parcel `['build','pencil','score','open']`, otherwise `['need','build','open']`), `GROUP_OF` (L41).
  - `levels.test.ts` locks in these exact arrays, including "no pencil or score at tract and zip".
- `levels/LevelInputs.tsx`:
  - `LevelInputs({t, rec})` (L199): `area==='zip'` renders `ZipInputs`, otherwise `PlaceInputs`.
  - `PlaceInputs({level, t, rec})` (L109-161) builds:
    - `m = useProjectModel(t?.GEOID, placeFor(GEOID), hudTable)` (L112)
    - `site = useSiteLot(t, m, rec)` (L113)
    - `lot` and `pinIzo` from `side.project().sites[GEOID]`
    - `ctx: PolicyContext` (L116, `draftSheet: false`)
    - `type = devTypeOf(...)` (L120)
  - What each group renders:
    - `site`: `LotCard({lot, izo})` (`levels/LotCard.tsx:27`), which reads `useLotManifest` and `lotSunHours` (`lotSun.ts`).
    - `project` (parcel): `ParcelProject({t, m, lotHomes})` (L82-107):
      - A `Segmented` for development type that calls `setDevType(side, v)`.
      - `HomesField`, or `SfField` (L70, writes `project.commercialSf`).
      - `StoriesField`.
      - An income `Segmented` limited by `levelsFor(type)`, which writes `plan.level`; it becomes `IncomeField` when the mix is the person's own.
      - `MixInputs({mix: m.mix})`.
    - `money`: `CapitalInputs({m, devType})` for housing; commercial shows "zoning check only".
    - `open`: `OpenBody({m, lot: {lotSqft, maxCoverage}})` (`flat/FlatInputs.tsx:306`).
    - `policy`: `PolicyPicker({ctx, counts?})` (`levels/Policies.tsx:66`). Its "Applies here" list comes from `policyRows(ctx)`, or from ZIP counts. Its "I want to study" checkboxes write `side.policy` / `side.lihtc.sheet`.
    - `finder`: `FinderInputs`.
- `levels/CapitalInputs.tsx:42`: `CapitalInputs({m, devType})`. It calls `useCapital(m, devType)` and renders `CAPITAL_GROUPS` / `CAPITAL_MORE` (lib/project/capital). Edits go through `setCapital(side, key, v)`, which writes `side.project.capital`. The LIHTC 9%/4% choice goes through `setFinancingOn`.
- `levels/useCapital.ts`:
  - `capitalContext(m, devType): CapitalContext` (L11-33) uses only ProjectModel fields: `m.args.inputs` (unitSf, efficiency, plan, opex, price, dscr), `m.mix.counts/homes`, `m.result.affordable`, `m.result.income['Gross rent']`, `m.branch`, `m.qctOrDda`.
  - `useCapital(m, devType)` (L35) is `runCapital(capitalContext(...), side.project.capital)`.

**Right panel.** At the parcel level `PlaceStudio.tsx:302-307` renders `SiteDetail` when `t`, `c` and the place data exist, otherwise `ParcelStart` (`levels/Starts.tsx:10`, which holds `FinderCard`).
- `levels/SiteDetail.tsx:27`: `SiteDetail({t, place, hud, c, fitOrder?, actions})`.
  - It reads `useProject`, `usePlan`, `usePolicy` and `useLihtc` **directly (always side A), not `useSide()`**.
  - `m = useProjectModel(t.GEOID, place, hud)` (L36); `devType = devTypeOf(project, level, senior)` (L37); `ctx` (L39).
  - It renders `ParcelResults` (L67), then a "The neighborhood" card (L68-79, using `signalShare(m, …)` and `setLevel('tract')`).
- `levels/ParcelResults.tsx`:
  - `ParcelResultsProps {t, place, m, lot, devType, c: Composed, ctx, policy, sheet}` (L132-142).
  - `useParcelCheck({m, lot, devType, place})` (L145-164) calls `checkZoning(CheckInput)` (`lib/zoning/check.ts:79`). Its inputs:
    - district / lotSqft / frontage from `lot ?? m.base.project.sites[geoid]`, plus `depthFt` from the lot
    - units from `m.mix.homes`; stories and commercialSf from `m.base.project`
    - `avgUnitSf` from the mix × `m.args.inputs.unitSf`, and `efficiency`
    - `inIzo` from `site.pin?.izo ?? m.base.inIzo`
    - `floodPct` from `place.flood.fema_sfha_pct`
  - `ParcelResults` (L166-243) uses `run = useCapital(m, devType)` and draws these blocks:
    - Four `Tile`s: Zoning (`check.verdict`), Type/units against `check.maxUnits`, Capital (`run.result.years[0].dscr` and `multiple`), and Tax credits (`m.sheet.score`) or Developer equity or Floor area.
    - The "Zoning and restrictions" list (`check.rows`).
    - `CapitalCard({run})` (`levels/CapitalCard.tsx:198`) when housing with units &gt; 0.
    - `CreditMeter({m, t, place})` (L73) for non-market housing; it opens to `TaxCreditSheet` + `KeyDates`.
    - `StudyCard({composed, ctx, policy, sheet})` (`Policies.tsx:125`): `composed.checks` plus `policyRows`.
    - `SunCard({lot, m, rec, geoid})` (L101) when a lot is picked and the project is housing. It uses `lotSunHours` and `useOpenSun`.
  - A side effect sets the global `placeExtra.at = capitalReport(...)` (L190-199), the export hook.
- `levels/ZipDetail.tsx` and `Starts.tsx` are covered in section 2.

## 2. Tract level today; ZIP data

**Tract right panel.** `PlaceStudio.tsx:308-314` renders `StudioDetail` when `t`, `r` and `c` exist, falls back to `TractDetail` (from MatchView) when there is no `c`, and shows `TractStart` (`Starts.tsx:21`) with no place.

`StudioDetail({t, c, fitOrder, words, onClose})` (L147-167) gets `placeDataFor(t.GEOID)` and `m = useProjectModel(...)`, then renders:
1. `PlanAnswer({rec, hud, level, size:'auto', age, homes, context, why})` (`place/PlanAnswer.tsx:75`). This is pure lib/place recommendation, not the project model.
2. `PoliciesCard({composed, ctx, policy})` (`flat/PoliciesCard.tsx:15`).
3. `ProjectPanel level="tract"` (`project/ProjectPanel.tsx:100`). It runs `answersFor('tract')`, which gives three questions:
   - `need`: `DemandMix({model, place, hud, rec, fitOrder})` (`DemandMix.tsx:107`; uses `place` for `recommend` and `cumulative`).
   - `build`: `BuildCapacity({geoid, cap, rec, homes, homesExample, scope:'tract'})` (`BuildCapacity.tsx:12`).
   - `open`: `OpenQuestion` (L87), which wraps `useOpenSun(geoid, m, cap, rec)` (`OpenSun.tsx:15`, which uses `useLot` and `sunFor(geoid)`) and `OpenSun scope='tract'`.
4. `TestSite` (L133), a button to go to the parcel level.
5. `PlaceFolds` (offline evidence blocks).

Development type, capital, zoning check and study results are **not** shown at the tract level today.

**Tract left panel.** It goes through the same `PlaceInputs`. Groups are `who` (`IncomeField` with all `PLAN_LEVELS` + `Residents`), `project` (`HomesField` + `MixInputs`, no type, stories or SF) and `policy` (`PolicyPicker ctx`). `m` and `site` are still computed (L112-113).

**useProjectModel** (`project/useProjectModel.ts`):
- `useProjectModel(geoid, place, hud, side?)` (L78) returns null unless `geoid &amp;&amp; place &amp;&amp; hud`. It reads `side.plan.level/homes/age`, `side.project()` and `side.lihtc()`, applying `entriesFor` (L86).
- `projectModel(geoid, place, hud, level, homes, project, entries)` (L46) calls `projectBase` (`lib/project/model.ts:39`), which needs:
  - **Tract GEOID:** `demandTract(geoid)`, `tractCapacity(geoid)`, `qctYears(geoid)`, and `project.sites[geoid].pin.izo`.
  - **PlaceMeasures:** `place.market.zip` (fallback ZIP), `place.programs.dda`, and `marketRents(place, hud)` (`lib/pencil/rents.ts:45`, which reads `place.market.asking_2br/asking_conf/safmr_2br/zip` and `hud.safmr[zip]`).
  - `sheetState(entries, geoid, place, facts, evidence)` (`lib/lihtc/sheetState.ts:24`) is per tract.
- So **a tract GEOID and PlaceMeasures are both required.**

**Could it run for a ZIP?**
- **Via a tract:** `useProjectModel(zipTracts(zip).main[i], placeFor(that), hud)` would run as is. The mix would split on that tract's households, because `projectMix` prefers tract shares over ZIP shares (`lib/project/plan.ts:24-26`).
- **Pieces that already exist at ZIP level:**
  - `projectMix(project, level, homes, null, demandZip(zip))` is already used at the ZIP level (`LevelInputs.tsx:169`, `ZipDetail.tsx:70`).
  - `signalsFor` takes a DemandUnit, and `demandZip` has the same shape (only `depth` is tracts-only).
  - Market rents could come from `zipById.get(zip).asking` + `hud.safmr[zip]`.
  - qct/izo/perf counts across tracts: `zipPolicyCounts`.
- **Missing at ZIP level:** capacity / district (it would need aggregating `tractCapacity` over the tracts), a ZIP PlaceMeasures, and the score sheet.
- **Capital** needs only `CapitalContext`, so it can run once there is a pencil `result`.
- **checkZoning** needs one district + lotSqft. At the tract level, `lotRead(cap, lead, homes, site)` (`project/TryLot.tsx:50`) already supplies a default: a by-right district in the tract (or the most common one) and the typical vacant lot size.

**ZIP-level data that exists:**
- `lib/demand/data.ts:8` `demandZip(zip): DemandUnit` (`lib/demand/types.ts:32`):
  - renters/households
  - `size` (renter household sizes 1..7+)
  - `br`
  - `rent_br` / `rent_med`
  - `inc` (11 brackets) / `inc_med`
  - `shares`, `struct`, `age`, `g` growth, `lihtc`
  - This lives in `data/lazy`, so it is online only.
- `lib/equity/zip.ts:9` `ZipRec` via `zipById`: `hu`, `share`, `tracts`, `edge`, `burdened[30|50|80|100]`, `jobs/school/transit/services`, `asking` (median 2BR). Helpers: `zipName`, `zipCoverage`, `zipPlaces`, `zipValue`. These are in the offline bundle.
- `lib/place/zipView.ts`:
  - `useZipView {area, zip, set}` (L18), `PlaceArea` (L10)
  - `zipExtra` (`main` tracts + `renters[30|50|80|100]`, L23-47)
  - `mainZipOf` (tract → ZIP, L49), `placeZips` (L51), `zipLevelKey` (L55), `zipTracts(zip) → {main, partly}` (L58)
- `lib/policy/zipCounts.ts:26` `zipPolicyCounts(zip)` and `zipPolicyWords`.
- `project/ZipDemand.tsx:12` `ZipDemand({zip})`.

**ZIP today:**
- Left panel: `ZipInputs` (`LevelInputs.tsx:163`) has `who` / `project` (mix from `demandZip`) / `PolicyPicker ctx={null} counts`. There is no project model.
- Right panel: `ZipDetail({suggestions, hud, level})` (`levels/ZipDetail.tsx:58`) reads `useProject` / `usePlan` directly. It shows four cards: Types that fit, Who needs it + unit mix, Policies across tracts, Profile. `ZipDemand` sits after card 2.

## 3. Compare places

- `compare/CompareStudio.tsx`:
  - `CompareStudio({active})` (L199) renders `CompareTractsView` on phones, otherwise `Studio` (L203).
  - Side selection: `sideB = separate ? SIDE_B : SIDE_A` (L220). `useCompare.separate` comes from `lib/compare/store.ts`, whose `setSeparate` calls `copyAToB`.
  - Side info: `A/B: SideInfo {tag, color, t, p: placeById.get, rec}` (L286-287; type at `CompareBlocks.tsx:31`).
  - Side inputs: `SideInputs({side, info, only?})` (L169-179) renders `&lt;SideContext.Provider value={side}&gt;&lt;FlatInputsFor t place hud rec only/&gt;`.
    - A always uses `SIDE_A` (L414).
    - B uses `SIDE_B` when separate (L559). Otherwise it uses `SIDE_A` with `only={['build','open']}` (L561).
  - `FlatInputsFor({t, place, hud, rec, area?, only?})` (`flat/FlatInputs.tsx:383`) shows the old folding sections: setup (Homes/Stories/Residents/Financing), need (IncomeField + MixInputs), build (`LotInputs`), policy (`PoliciesBody`), open (`OpenBody`), pencil (`PencilInputs`), finder. It has **no development type, no Capital, and no LevelInputs groups.**
- Middle "Comparison" column (L417-536):
  1. "At a glance": `Glance` (L84) using `glanceRows` / `GROUPS` / `Measure` / `Value` / `PlaceHead` from CompareBlocks.
  2. "What each place would get": `Gets` (L136) using `getsCells`.
  3. "Why they differ": `WhyParagraphs` + `whyTheyDiffer`, plus an optional scoring detail (`SideRanking`, `FactorDeltaBars`).
  4. `CompareProject({A, B, sideA: SIDE_A, sideB, stacked})` (L535).
- `compare/CompareProject.tsx:102`:
  - `ma = useProjectModel(A.t?.GEOID, A.p, hud, sideA)` and `mb = useProjectModel(B.t?.GEOID, B.p, hud, sideB)` (L103-104).
  - It shows four blocks of row tables built from the `summary.ts` headlines: Who needs it, What can be built, Tax credit score, Does it pencil (old pencil, not Capital).
- `compare/glance.test.ts` only tests `glanceFlag` / `glanceRows` from CompareBlocks.
- Compare places are tracts only (TractSearch). There is no lot picking in Compare, so `site.lot` is never set there unless it was picked on the Place tab.

## 4. Offline vs online

- `lib/lazyGuard.test.ts:13-40` `ON_DEMAND` includes:
  - `components/place/project/`, `components/place/levels/`, `components/place/flat/`
  - `PlaceStudio.tsx`, `PlaceRail.tsx`, `TaxCreditSheet.tsx`
  - `compare/CompareStudio.tsx`, `compare/CompareProject.tsx`
  - `lib/project/`, `lib/zoning/`, `lib/demand/`, `lib/policy/`, `lib/compare/`, `lib/pencil/`, `lib/lihtc/`, `lib/parcel/`, `data/lazy/`
  - and others
- **On demand:** every file in your questions 1–3 except those listed next.
- **In the offline bundle** (statically reachable from `main.tsx`):
  - `AnalysisView`, `MatchView`, `CompareTractsView`
  - `compare/CompareBlocks.tsx`, `SuggestLegendBar`, `FocusSegmented`, `ToolbarParts`
  - `place/ZipPanel`, `PlanAnswer`, `PlaceFolds`, `PlanInputs` (whose `Segmented` LevelInputs imports)
  - `lib/place/*` (including `zipView`, `data`, `planStore`), `lib/equity/zip`
- **Swap mechanism:** there are no `isOnline` flags. It is decided at build time with `import.meta.env.MODE === 'export' ? null : lazy(() =&gt; import(...))`, rendered as `X ? &lt;Suspense&gt;&lt;X/&gt;&lt;/Suspense&gt; : &lt;OfflineFallback/&gt;`.
  - `AnalysisView.tsx:11`: CompareStudio (offline fallback: CompareTractsView, L42-49)
  - `AnalysisView.tsx:14`: PlaceStudio (offline fallback: MatchView, L34-41)
  - `MatchView.tsx:48-51`: ProjectPanel / FinderCard / PlaceRail
  - `CompareTractsView.tsx:79`: CompareProject, mounted at L835
  - `ZipPanel.tsx:23`: ZipDemand
  - `PlaceFolds.tsx:26`
  - Only `location.protocol === 'file:'` checks exist, and only for chat, Supabase and sun-shadow.
- **CompareStudio is not offline-bundled.** It is lazy (online only) and always was. So anything CompareStudio imports statically from an on-demand path stays out of `export/index.html`, and no extra lazy wrapper is needed for an online-only middle section.
  - The bundle risk is editing modules the offline file shares: CompareBlocks, CompareTractsView, lib/place, lib/equity, ZipPanel, PlanAnswer.
  - `export/index.html` is 5,999,962 bytes today (`vite.config.ts` export mode with viteSingleFile; the 6 MB rule is in `docs/assumptions.md:177`).

## 5. Development type and income per side

- **Development type:** `ProjectState.devType?` and `commercialSf?` (`lib/project/store.ts:60-62`), plus `capital?` (L64).
  - `devTypeOf(project, level, senior)` (`lib/project/devType.ts:36`) falls back to senior, market or affordable.
  - `setDevType(side, t)` (L43) also moves `plan.level` into `levelsFor(t)`, sets `plan.age`, clears `pencil.branch`, and for side A sets `lihtc.setup.occupancy`.
- **Income level:** `PlanState.level` in `usePlan` (`lib/place/planStore.ts:11`; session only). Homes: `plan.homes`. Residents: `plan.age`.
- **Per side:** `SIDE_A = {usePlan, useProject (localStorage), useLihtc, usePolicy}`; `SIDE_B = {usePlanB, useProjectB, useLihtc shared, usePolicyB}` (`lib/project/side.ts:24-30`). `copyAToB` clones the project, so devType and capital carry over.
- **Who reads devType today:** only `LevelInputs` (ParcelProject, money group), `SiteDetail`, `ParcelResults`, `useCapital` / `CapitalInputs`, `lib/zoning/check`, and `lib/project/capital`. The tract right panel (`StudioDetail` / `ProjectPanel`), `ZipInputs` / `ZipDetail`, `FlatInputsFor`, `CompareStudio` and `CompareProject` do not read it. All of them do read `plan.level`.

**Reuse opportunities and gotchas:**
- `ParcelResults`, `useParcelCheck`, `useCapital`, `StudyCard` and `PolicyPicker` are already driven by `m` + `useSide()`. Pairing them with `lotRead` would give a tract-level zoning input.
- `SiteDetail` hard-wires the side A stores.
- `ParcelResults` writes the one global `placeExtra.at`, so two copies mounted side by side in Compare would compete for it.
- `TaxCreditSheet` writes side A only, through `setLihtcBoth`.</result>
<usage><subagent_tokens>199154</subagent_tokens><tool_uses>60</tool_uses><duration_ms>313148</duration_ms></usage>
</task-notification>

## Claude

The first search is back with a detailed map of Place and Compare. I'm waiting on the other two (zoning and AI, and Equity & policy) before drafting the plan.

## You

<task-notification>
<task-id>a253463e19d7e49c3</task-id>
<tool-use-id>toolu_01V8B2v9CtjecLfHqoea5nKn</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/tasks/a253463e19d7e49c3.output</output-file>
<status>completed</status>
<summary>Agent "Map Equity &amp; Policy tab" finished</summary>
<note>A task-notification fires each time this agent stops with no live background children of its own. The user can send it another message and resume it, so the same task-id may notify more than once.</note>
<result>I've mapped the current Equity &amp; policy tab, its data, the policy logic elsewhere in the repo, and how it's bundled. In short, the four levers are on/off switches with fixed settings. Only the subsidy's homes per tract can be changed. The adjustable policy logic (inclusionary rules, lot sizes, tax-credit rules, finder ranking) lives in on-demand modules the tab can't import directly.

## 1. What the tab does today

**Layout** (`app/src/components/equity/EquityPolicyView.tsx`, header comment at L1–4):
- Header "Equity &amp; policy", subtitle "Where renters need help most, and what four policy levers would change." (L370–371).
- One toolbar (`EquityToolbar.tsx`) with four steps: ① Measure (6 choices, plus a Tracts/ZIPs switch), ② Income (≤30%, ≤50%, ≤80%, Market; shared with the Place tab through `usePlan.level`), ③ Policies (four lever chips plus a "What these do" pop-up), ④ Export.
- Below: map on the left (44%) and `MeasurePanel` on the right (56%). The panel holds:
  - the definition and plain sentences (`explainMeasure`, `explainLocal`, `cityTakeaway`)
  - a "What the policies change" box
  - an optional DeepSeek "VisionPitts Insight" paragraph
  - a donut of tracts per map class and a spread histogram with the median
  - the selected tract against the city on all six measures
  - a "Most need first" ranked list (MeasurePanel L266–532)

**Geography:**
- Rows are the ranked tracts that have place data, 114 in total (L160: `rankedTracts.filter((t) =&gt; placeById.has(t.GEOID))`).
- The ZIP level is display only. The levers are switched off there: `LEVERS_TRACT_ONLY = 'Policies are computed for census tracts…'` (EquityToolbar L55).
- No municipality level.

**What the user can change:**
- Measure, income level, Tracts/ZIPs.
- Four booleans: `useState({ adu:false, bonus:false, voucher:false, transit:false })` (L123).
- One number: homes per tract for the subsidy (`homesText` '40', limited to 0–10000, L124/L156).
- Nothing else. The 10% bonus share, the 60% AMI level, the 1-mile transit distance, the top 10 funded tracts and the 5% land rule are all constants.

**Lever math** (`app/src/lib/equity/policy.ts`, wired in `components/equity/usePolicy.ts` L11–32):

| Lever | Function | Rule | Rough result now (my Python re-run on place.json) |
|---|---|---|---|
| ADU by right | `aduByRight(rows, hud, opts)` L55 | ADU becomes by right in R1D/R1A/R2/R3/RM, using `zoningFlip`. Also re-runs `recommend(...,'anti_displacement')` to count tracts newly recommended for an ADU | 0 → 107 of 114 tracts |
| Density bonus | `densityBonus(rows)` L114 | Small apartments go from conditional to by right in `SMALL_APT_CONDITIONAL_FAMILIES` (R3, NDO, HC, NDI). Assumes `BONUS_AFFORDABLE_SHARE = 0.1` at 60% AMI (L83) | 84 → 90 |
| Rent-gap subsidy | `gapCost` L133, `largestGaps(rows,hud,ami,homes,n=10)` L148 | `max(0, asking − fits) × 12 × homes`. Funds the top 10 tracts ranked by `gap × burdenedLe50` | $0 → total $/yr |
| Wider transit standard | `transitExtension(rows, chosenMi, 1)` L169 | Passes when distance to frequent transit is within `max(chosen, 1 mi)`. Changes the standard, not the bus network | 97 → 109 (from the default ½ mi) |

- **By-right status:** `statusFromShares(shares, t, override)` (`lib/equity/zoning.ts` L48) returns "yes" when ≥5% of the tract's land is in by-right families. `FAMILY_RULES` (L10) is copied from the unverified `config/zoning_rules.json`.
- **60% AMI rent:** `rent60TwoBedroom` (policy.ts L98) computes the 50% limit × 1.2, then ÷ 40.

**Outputs:**
- `leverSummaries(r, on)` (`lib/equity/export.ts` L58) builds the rule, what is counted, before → after, a headline and the `changed` tract IDs.
- Changed tracts are outlined on the map (`flips`).
- `explainPolicies` (`lib/equity/explain.ts` L182) writes one fixed paragraph per lever that is on, including "N of the 20 tracts with the most need on &lt;measure&gt; are among them".
- The pop-up (`PolicySimulator.tsx`) shows each lever's rule, an Assumption tag, the arithmetic, the selected tract's before → after, and `LEAVE_OUT` caveats (export.ts L205).
- Exports: PDF (`buildEquityReport` L212), measure CSV, policy CSV (`policyRows` L170), plus chat facts (`equityFacts` L281) and suggested questions (`equityPrompts` L300).

**Weaknesses worth knowing for the redesign:**
- **ADU lever contradicts the verified code.** It flips "conditional → by right" using the unverified table. But `lib/policy/catalog.ts` L78 and `zoning_standards.json` `adu` say "allowed only inside an ADU overlay district (§912.08). None is mapped." The lever also changes almost every tract, so it tells the user little.
- **Density bonus is the tool's own made-up example.** It is labelled "this tool's example, not a city rule" (PolicySimulator L31). It is not the IZ-O and not Bill 2025-1545.
- **Results are counts of tracts, not homes, affordable units or cost.** The only exception is the subsidy's dollar total.

## 2. Data and measures

**Bundled files** (statically imported, `import.meta.glob ... ?raw`):
- `app/src/data/place.json`: 128 tracts, 275 KB. Fields: CHAS `bands` (hh, burden30/50 by AMI band), `market` (asking_2br, conf, census_2br, safmr), `transit`, `access` (jobs_1mi, school_mi, services_halfmi, grocery_mi), `zoning.shares/by_type`, `programs` (qct/dda/oz/cdbg), `displacement.score`, `flood`, `stock`, `land_use`.
- `hud_2026.json` (HUD FY2026 Pittsburgh limits and FMR).
- `tracts.json`.
- `equity_zip.json` (built by `scripts/12_build_equity_zip.py`; tracts weighted by housing units).
- Supabase: none for this tab. The DeepSeek Insight is called at runtime (`lib/equity/reading.ts`).

**The six measures** (`MEASURES`, `lib/equity/measures.ts` L43–113; `measureValue` L195):
- **rent_gap:** asking 2BR rent (or ACS B25031 census rent as a fallback) minus 30% of the 3-person limit at the chosen AMI.
- **burdened:** CHAS renters paying over 30%, summed over the bands at or below the chosen AMI.
- **jobs:** LODES jobs within 1 mile.
- **school:** miles to a public school (NCES).
- **transit:** miles to a stop with ≥64 weekday departures (GTFS).
- **services:** OpenStreetMap places within ½ mile.

**Not used by the tab:**
- Displacement risk (`place.displacement.score`, from the HNA) is in place.json but not used here.
- Race, income and poverty exist only in the Explore ACS tables (`acs_tract.json`: `white_nh_share`, `black_nh_share`, `poverty_share`, `med_hh_income`, `rent_burden30_share`…).

**Docs:**
- There is no method note for the Equity tab. `docs/TECHNICAL.md` L35 only says: "Equity &amp; policy: where renters need help most and what four policy ideas would change."
- Related notes: `docs/assumptions.md` §14a "Policy basis" (L291–334, the policy catalog and statuses), §16 zoning capacity (L353), §17 pencil (L371), §18 finder (L394), and `docs/data/zoning_capacity.md`, `pencil.md`, `finder.md`.

## 3. Policy logic elsewhere that a simulator could re-run (all on demand)

- **`lib/policy/catalog.ts` `POLICIES` (L52).** 16 sourced rows with a kind (binding, funding, screen) and a status (adopted, draft, proposed…):
  - `izo`: "20 or more new homes… at least 10% (rounded up) at or below 50% AMI to rent, or 80% to own, for 35 years"
  - `adu` overlay (none mapped)
  - `phfa` and `phfa_draft` QAPs
  - `qct` (130% basis)
  - `perf` (+15 ft per point in RIV/UPR/UC-E/R-MU/UC-MU)
  - `ahb` (Bill 2025-1545: 10–20% at 50% AMI earns 2, 4 or 6 points; would also sunset the IZ-O and drop parking minimums)
  - `hof` (URA), `abatement`, `parking`, `displacement`, `transit`, `flood`, `market`
- **`lib/policy/applies.ts` `policyRows(c, s)` (L39).** Says per tract which policies apply. **`zipCounts.ts` `zipPolicyCounts` (L26)** already loops over tracts to count where each policy applies, which is the pattern a citywide re-run would use.
- **`lib/policy/compose.ts` `composeAll(places, hud, input, s)` (L134).** Applies the displacement, transit and flood screens to every tract. Re-running it with different screen settings answers "how many tracts get a suggestion".
- **`lib/zoning/capacity.ts`:**
  - `homesByRight(std, lotSqft, frontage, depth, a)` L94
  - `inclusionaryHomes(homes, inOverlay)` L113, which reads `STANDARDS.inclusionary` {min_homes 20, share 0.1, ami_rental 50, ami_owner 80, years 35}
  - `lotFor` L144
  - `tractCapacity(geoid)` L67, which reads the precomputed `zoning_capacity.json`: per tract `vacant.homes`, `gentle.homes`, `districts`, `izo_share`. Citywide totals from `docs/data/zoning_capacity.md` L82: "16,273 vacant lots… allow 33,749 homes by right… 4,365 under minimum lot size… R2/R3 10,295 lived-in lots… 10,530 more homes. 17 tracts mostly inside the IZ-O."
  - Re-running "units by right if the minimum lot size or homes per lot changes" needs the per-lot facts in `app/public/data/parcel-lots/` (24 chunks, 4 MB, loaded by `lib/parcel/lots.ts` `loadFacts`: district, sqft, frontage, depth, existing homes).
  - Python twin: `src/visionpitts/zoning_capacity.py` `tract_totals` L163.
  - The district minimums in `zoning_standards.json` (R1D-VL 6000, L 3000, M 2400, H 1200, VH 0) already reflect the May 2025 lot-size reform. That gives a real before/after scenario with the old 8000/5000/3200/1800 values.
- **`lib/pencil/finance.ts`:**
  - `pencil(a)` L132, which returns gap, headroom, `capped`, `izo`, `checks`, and a market yield and break-even.
  - `applyInclusionary(c, inOverlay)` L102 **hard-codes** `homes &gt;= 20 ? Math.ceil(homes * 0.1)` (L104) and only runs on the market branch (L136). It would need parameters before an IZ set-aside slider could work.
  - `feeCap` L78 and `developerFee` L86 read `planRules(plan)` (`pencil/inputs.ts` L80). The adopted plan has a $1.7M/$1.8M credit cap and $320K/$380K basis per home; the draft has $1.85M/$2.0M and no basis cap for 9%.
  - Defaults: `config/pencil_defaults.json` and `app/src/data/lazy/pencil_defaults.json`. The two copies differ. Underwriting DSCR 1.15, target yield 0.065, $300 hard cost per sq ft, $15K land per home.
- **`lib/project/size.ts` `sweepSizes` (L79) and `tierOf` (L56).** Tiers are closes / over PHFA's limit / gap. **`lib/project/model.ts` `projectBase` (L39)** sets `inIzo: … (cap?.izo_share ?? 0) &gt; 0.5` (L58).
- **`lib/finder/rank.ts` `findPlaces(ctx, i, izoShare)` (L157).** Tests every tract with the full project model. It returns `rows`, `excluded` by reason, `nearMisses` and `relax` (places that would join if one filter were dropped). This is the closest existing tool to "how many tracts pencil under policy X". Overlay filter: `overlay: 'any'|'inside'|'outside'` (L37).
- **`lib/lihtc/score.ts` `scoreSheet` (L245)**, for QAP points.

## 4. Bundling and tests

- **Offline-bundled, not on demand.** The import chain is static: `App.tsx` L7 → `AnalysisView.tsx` L7 (`import EquityPolicyView from './equity/EquityPolicyView'`).
- `lib/equity/` is not in `ON_DEMAND` (`app/src/lib/lazyGuard.test.ts` L13–40). That list does include `lib/policy/`, `lib/zoning/`, `lib/pencil/`, `lib/project/`, `lib/finder/`, `lib/lihtc/` and `data/lazy/`.
- A redesign that reuses those modules must load them with `lazy(() =&gt; import(...))` behind `import.meta.env.MODE === 'export' ? null : …`, as `ChatPill`, `CompareStudio` and `PlaceStudio` already do. Otherwise the lazyGuard test fails, and the offline file is near its 6 MB cap (assumptions §16).
- **Tests:** `lib/equity/{equity,explain,export,local,reading,zip}.test.ts`. The lever tests are in `equity.test.ts` L203–305. There are no component tests. Other references: `lib/tour.ts` L187/198 (`equity-bar`, `equity-levers`), `lib/hash.ts` L162 (`/equity`), `app/scripts/shoot.mjs`, and `tests/test_equity_zip.py`.

## 5. What established tools and Pittsburgh's rules suggest

- **Let users trade the set-aside against offsets, then show profit.** The Grounded Solutions Inclusionary Housing Calculator does this: users try incentives such as a parking reduction to see whether they cover the cost of the required affordable units, under strong or soft market presets. In one Chicago case a 21% set-aside did not pencil and 16% did. ([NMHC](https://www.nmhc.org/research-insight/external-resources/grounded-solutions-inclusionary-zoning-housing-calculator/), [Planetizen](https://planetizen.com/node/94016), [UIC](https://greatcities.uic.edu/news-stories/new-housing-calculator-tool-democratizes-real-estate-economics/)) For this repo: `pencil()` plus `sweepSizes`, with a set-aside and AMI slider against bonus height or parking, run per tract.
- **Report market-rate and below-market homes together, and show the tradeoff.** The Terner Housing Policy Simulator estimates the best number of units per site, whether a project is feasible, and how likely it is to be built under each policy. Phillips (2024) used it to show how different IZ requirements give "sharply different outcomes", and Terner's 2022 LA dashboard ran a pro forma over every residential parcel. ([Terner IZ modeling](https://ternercenter.berkeley.edu/research-and-policy/inclusionary-zoning-housing-production-modeling), [LA dashboard](https://ternercenter.berkeley.edu/research-and-policy/policy-dashboard-los-angeles/), [2026 brief](https://ternercenter.berkeley.edu/wp-content/uploads/2026/05/HowLocalMarketConditionsShapePolicyOutcomes2026.pdf))
- **Make the method transparent and repeatable.** A Terner and Grounded Solutions convening found no standard feasibility method, but agreed studies should be transparent and replicable. That fits this repo's "every figure keeps its arithmetic" style. ([Terner](https://ternercenter.berkeley.edu/research-and-policy/strengthening-feasibility-studies-for-inclusionary-housing-policies/))
- **Use the real IZ-O terms as lever defaults.** Rentals in projects of 20+ units: 10% at ≤50% AMI. Rent plus utilities capped at 30% of a 50% AMI income, with household size = bedrooms × 1.5. 35-year deed restriction. An equal share of family-sized units. For-sale units are priced so a 70% AMI household pays ≤28% of income (the repo says "80% to own"; worth checking). The overlay began in Lawrenceville (Ordinance 28 of 2019) and expanded to Bloomfield, Polish Hill and residential Oakland in 2021–23. ([Controller special report, June 2025](https://www.pittsburghpa.gov/files/assets/city/v/1/controller/special-report-inclusionary-zoning.pdf), p.3–4)
- **Show what actually happened, not only the model.** In Lawrenceville, 35 IZ units were occupied by early 2025, with 116 expected (10% of 1,149) across six projects. The Controller's difference-in-differences estimate is −55.5 units against South Side Flats and the Strip, but it calls the result inconclusive because the sample is small. A "what works / what doesn't" tool should put observed production beside the modeled result. (Same report, p.25–27)
- **Model the citywide IZ debate as alternatives.** Bill 2025-1545 started as mandatory citywide IZ (July 2025 draft). It became an optional bonus (October 2025), then a bonus tied to the existing performance-point system in all districts that allow multi-unit housing (June 2026). It also covers ADUs and removing parking minimums, and is still held in Council. Good scenarios: today's IZ-O, a citywide mandate, and an optional bonus at 10/15/20% for 2/4/6 points. ([City engage page](https://engage.pittsburghpa.gov/implementing-the-housing-needs-assessment/affordable-housing-bonus-program), [Implementing HNA](https://engage.pittsburghpa.gov/implementing-housing-needs-assessment), [PublicSource](https://www.publicsource.org/inclusionary-zoning-pittsburgh-city-planning-commission-votes-council-mayor-gainey/), [WESA](https://www.wesa.fm/politics-government/2024-09-05/gainey-proposes-zoning-changes-to-boost-affordable-housing-options-in-pittsburgh))
- **Lot-size reform is a ready-made before/after lever.** Passed May 6, 2025: very low density 8,000 → 6,000 sq ft, low 5,000 → 3,000, moderate 3,200 → 2,400, high 1,800 → 1,200, very high eliminated, and per-unit minimums for multifamily removed. Re-running `homesByRight` over the parcel-lots facts with old and new minimums answers "lots made legal" and "homes by right gained". ([City Council](https://www.pittsburghpa.gov/City-Government/City-Council/Districts/Bobby-Wilson-District-1/Follow-Us/Councilman-Wilson-Passes-Legislation-to-Reduce-Minimum-Lot-Sizes))
- **ADU and parking levers should stay "proposed".** The code still requires an ADU overlay (none mapped) and keeps parking minimums (current through 2026-09-16, per `zoning_standards.json`). These levers should say what would change if the bill passes: lots where an ADU becomes legal, and parking cost removed from the pro forma.</result>
<usage><subagent_tokens>205566</subagent_tokens><tool_uses>64</tool_uses><duration_ms>343217</duration_ms></usage>
</task-notification>

## Claude

The Equity & policy search is back too. In short, today's four policy switches are on/off toggles with fixed settings, and they count tracts rather than homes or cost. I'm still waiting on the zoning and AI search before drafting the plan.

## You

<task-notification>
<task-id>a9bac55cc55dba3ae</task-id>
<tool-use-id>toolu_01EXh5GvsevTa6C7PMZ4LSYy</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/tasks/a9bac55cc55dba3ae.output</output-file>
<status>completed</status>
<summary>Agent "Map zoning, demand, AI checks" finished</summary>
<note>A task-notification fires each time this agent stops with no live background children of its own. The user can send it another message and resume it, so the same task-id may notify more than once.</note>
<result>I mapped all five areas. Two things matter most for your plan. First, the live zoning check you want mostly exists already as `useParcelCheck` → `checkZoning`, which re-runs on every render. Second, nothing compares a proposed project with the area's demographics; you would build that. File names below are relative to `/Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/`.

## 1. Zoning

### `src/lib/zoning/check.ts`
- **Types:**
  - `Tone = 'yes'|'hearing'|'no'|'info'|'unknown'` (L9)
  - `CheckRow { key: 'use'|'density'|'height'|'lot'|'floor'|'izo'|'parking'|'flood'; tone; title; text }` (L11)
  - `ZoningCheck { verdict: 'yes'|'hearing'|'no'|'unknown'; district; maxUnits; rows }` (L18)
- **`CheckInput` (L27):** `district, lotSqft, frontageFt, depthFt, devType, units, stories, commercialSf, avgUnitSf, efficiency, inIzo: boolean|null, floodPct`.
- **`checkZoning(i)` (L79–122), row by row:**
  - **No district, or a district without standards:** returns `unknown` with the reason from `STANDARDS.not_computed` (L82–90).
  - **Use (`useRow`, L67):**
    - The number of units picks the use key (`homeUse`, L60): 1 → single, 2 → two-unit, 3 → three-unit, 4+ → `multi_unit`.
    - Senior reads `elderly_limited`/`elderly_general`.
    - Commercial and mixed use are "yes" when the district `kind==='mixed'` and "no" in residential districts.
    - Use status maps to tone: P and P/S → yes; A, S, C → hearing; N → no (L46–55).
  - **Units:** `homesByRight(...)` against `units` (L93–102).
  - **Height:** `stories &lt;= storiesOf(s)` (L103–105). It checks stories only; there is no input for height in feet.
  - **Lot size:** against `min_lot_sqft` (L106).
  - **Floor area:** only in districts without `max_homes`. Need = `units*avgUnitSf/efficiency + commercialSf`, compared with the envelope (L107–110).
  - **Info rows that never block:** IZ-O set-aside (L111–115), parking at `min_per_home` × units when 4 or more (L116), and flood when the tract's `floodPct &gt; 0` (L118).
  - **Verdict:** the worst tone among use, density, height, lot and floor (L119–120).
- `VERDICT_WORD` (L124) gives the labels: Allowed by right / Needs a hearing / Not allowed as is / Check the code.
- **What it ignores:**
  - Market and affordable are treated the same; income level only enters through the IZ-O info row.
  - It does not check whether the mix actually meets the IZ-O share.
- **Where it runs:** `components/place/levels/ParcelResults.tsx`. `useParcelCheck` (L145–164) builds the input:
  - It reads the picked lot first, then the typed site.
  - `inIzo` is `site.pin?.izo ?? m.base.inIzo`.
  - `avgUnitSf` comes from mix counts × `unitSf`.
- Tiles are at L209–220 and the checklist at L222–235. It recomputes on every render, so it is already live.

### `src/lib/zoning/capacity.ts`
- **Data sources:**
  - Imports `src/data/lazy/zoning_standards.json` (identical to `config/zoning_standards.json`) and `src/data/lazy/zoning_capacity.json`.
  - Assumptions: `home_sqft 850, efficiency 0.85, story_ft 10`.
- **`DistrictStandard` (L10):** `code, family, kind, section, min_lot_sqft, max_homes, front_ft, rear_ft, ext_side_ft, side_total_ft, max_height_ft, max_stories, max_far, max_coverage, uses: Record&lt;UseKey, UseStatus&gt;, verified, notes, near_transit?`
- **`Standards` (L31):** adds `parking.rules[]`, `inclusionary {section §907.04.A, min_homes 20, share 0.1, ami_rental 50, ami_owner 80, years 35}`, `adu {mapped:false}` and `not_computed`.
- **Functions:**
  - `STANDARD_BY_CODE` (L66)
  - `tractCapacity(geoid)` (L67)
  - `storiesOf` (L69): uses `max_stories`, else `floor(height/10)`
  - `envelope` (L73): (frontage − side setbacks) × (depth − front − rear), capped by coverage, × stories, capped by FAR
  - `homesByRight(s, lotSqft, frontage?, depth?) → {homes, below_min, computed, floor_area, formula}` (L94). Missing frontage or depth defaults to √lot.
  - `inclusionaryHomes(homes, inOverlay)` (L113)
  - `districtName` (L132)
  - `lotFor(s, homes, frontage) → {kind:'fits',lotSqft}|{kind:'cap',max}|{kind:'none'}` (L144), found by halving
- **The 23 computed districts:**

| Districts | Min lot (sq ft) | Homes per lot | Height | Stories | FAR | Coverage |
|---|---|---|---|---|---|---|
| R1A/R1D -H/-M/-VH/-VL/-L | 0–6000 | 1 | 40 ft | 3 | — | — |
| R2 -H/-L/-M/-VH | 0–3000 | 2 | 40 ft | 3 | — | — |
| R3 -L/-M | 2400–3000 | 3 | 40 ft | 3 | — | — |
| RM-VL | 6000 | — | 40 ft | 3 | — | — |
| RM-M | 2400 | — | 55 ft | 4 | — | — |
| RM-H | 1200 | — | 85 ft | 9 | — | — |
| RM-VH | 0 | — | 180 ft | null (read as 18) | — | — |
| NDO | 0 | — | 45 ft | 3 | 3.0 | 0.9 |
| LNC | 0 | — | 45 ft | 3 | 2.0 | 0.9 |
| NDI | 0 | — | 45 ft | 3 | 2.0 | 0.9 |
| UNC | 0 | — | 45 ft | 3 | 3.0 | — |

- Setbacks (front, rear, side total, exterior side) exist for every district; `ext_side_ft` is never used.
- UNC's `near_transit {far 4, 60 ft, 4 stories}` is defined but never read anywhere.
- **34 districts are not computed (`not_computed`):**
  - UC-MU, UC-E, R-MU (set by the Height Map)
  - GT-A to GT-E (downtown)
  - RIV-MU, RIV-RM, RIV-NS, RIV-IMU, RIV-GI (Riverfront)
  - HC, GI, UI, EMI, P, H, AP, CP
  - GPRA/B/C, RP, UPR-A/B
  - SP-1, -4, -5, -8, -9, -10, -11

### Overlays
- **IZ-O:**
  - **Polygon:** `src/data/lazy/izo_overlay.json` (`{source, geometry: MultiPolygon}`).
  - **Pin test:** `src/lib/zoning/atPin.ts` `inIzoAt(lng,lat)` (L61) is a point-in-polygon test.
  - **District at the pin:** `zoningAtPin` (L35) returns `PinZoning` and looks around the point (15/30/50 m) when the pin lands in a street.
  - **Storage:** `components/place/PlaceStudio.tsx` L63–66 writes `Site.pin {code, computed, near, why, izo}`.
  - **Tract fallback:** `zoning_capacity.tracts[g].izo_share`, counted as in the overlay when above 0.5 (`lib/project/model.ts` L58).
  - **Gap:** no test of the lot polygon against the overlay.
- **Floodplain:** tract only (`place.flood.fema_sfha_pct`); there is no lot-level reading.
- **ADU overlay:** a rule only; none is mapped.
- **Missing entirely:**
  - Historic district or preservation overlays: none. "Historic" appears only as the capital model's historic tax credit toggle (`lib/project/capital.ts`, `lib/pencil/simple.ts`).
  - Height map, parking-reduction areas and neighborhood-plan areas. `lib/policy/applies.ts` L67 just matches `/Bluff/` against the tract label.

### Tract-level zoning composition (when no lot is picked)
- **(a)** `src/data/place.json` `[geoid].zoning`:
  - `shares` by family (`R1A, H, LNC, GT, P, PLANNED`), stored as fractions even though `place/types.ts` L77 says percent.
  - `by_type: Record&lt;Typology, 'yes'|'conditional'|'no'|'unknown'&gt;` from the unverified `config/zoning_rules.json`.
  - Helpers in `lib/place/zoningAnalysis.ts`: `landByGroup` (L50), `landForType(shares, t)` (L60), `multiUnitLand` (L67).
- **(b)** `zoning_capacity.json` `tracts[geoid]` (128 tracts): `{lots, vacant{lots, acres, median_sqft, homes, by_family, largest}, gentle{lots,homes}, districts: {fullCode: lotCount}, izo_share}`.
- **(c)** `acs_tract.json` has `zoned_single`, `zoned_2_3`, `zoned_multi`, `zoned_mixed`, …
- `components/place/project/TryLot.tsx` `lotRead` (L50) already picks a default district from `cap.districts` and the typical vacant lot size.

### Lot facts
- **Correction:** no `facts_*.json` files exist. Facts are in `public/data/parcel-lots/{x}_{y}.json`, as `{codes[], lots: {label: [districtIdx, sqft, frontage, depth, homesToday]}}`, with -1 for missing.
- Shapes are in `public/data/parcel-shadow/{x}_{y}.json` (properties `i, lot, u, sf, s0–s2`).
- `src/lib/parcel/lots.ts`: `FactsFile` (L16), `LotFacts` (L22), `lotIn` (L58, `NEAR_M=30`), `factsOf` (L98), `siteLot` (L106), `loadFacts` (L160), `lotAt(lng,lat)` (L173), `lotByRow` (L189).
- `pick.ts` `pickLot` fills `Site.district/lotSqft/frontageFt`.
- `SiteLot` is defined in `lib/project/store.ts` and holds `label, use, point, sqft, district, frontageFt, depthFt, existing, shade[3]`.

## 2. Demographics and demand

### Data shapes
- **`lib/demand/types.ts` `DemandUnit` (L32), from `data/lazy/demand.json`:** covers 128 tracts, 32 ZIPs and the city, ACS 2020–24. Every field is `[estimate, moe]`.
  - `renters`, `households`
  - `size[7]` (renter households of 1–7+ people, B25009)
  - `br[6]` (renter homes by bedrooms, B25042)
  - `rent_br{'0'..'3': EM[6]}` (B25068; edges 0/300/500/750/1000/1500/open), `rent_nocash`
  - `inc[11]` (B25118; edges up to 150k/open), `inc_med`, `rent_med`
  - `struct[10]`
  - `age[9]` (B25007: 15–24 … 60–64, 65–74, 75–84, 85+)
  - `shares{renter, one_person, large5, age65, small_bldg}: [share, moe, reliability]`
  - `rent_to_income`
  - `g{renters, rent, income: [2014, 2024]}`
  - `lihtc{projects, li_units, li_units_recent, li_units_past30, li_units_end_5y, mile{…}, nearby[{name, yr, li, n, credit, bond, mi}]}`
  - `zip`
  - `depth{tracts, le50, b50_80, le60}` (tracts only)
- **`data.ts`:** `demandTract`, `demandZip`, `demandCity`.
- **`lib/place/types.ts` `PlaceMeasures` (from `data/place.json`):**
  - `renter_hh`
  - `bands{le30, b30_50, b50_80, b80_100, gt100: {hh, moe, burden30, burden50}}` (CHAS)
  - `types{le30|b30_50|b50_80|gt80: {elderly_alone, elderly_family, small_family, large_family, other}}`: the only 62+ by income data
  - `market{asking_2br, asking_conf, acs_rent, safmr_2br, census_2br, value_acs, sale_median…}`
  - `stock`, `transit`, `flood`, `zoning`, `programs{qct, dda, oz, cdbg}`, `displacement.score`
  - `renter_age[7]` (55–64 straddles 62)

### Logic
- **`signals.ts`:**
  - `SIGNAL_MARGIN` (L11)
  - `readSignal`/`signalsFor` (L59/L82): a share counts as different from the city only when the gap clears both the printed margin and the tract's MOE, with the ZIP used as fallback
  - `renterGrowth` (L87)
- **`order.ts`:** `FAVORED_BY` (L12) maps signals to Typology; `scoreTypes` (L29), `demandOrder` (L43), `demandScores` (L48).
- **`mix.ts`:**
  - `householdsByGroup`/`homesByGroup` (L34/36), `groupShares` (L39)
  - `recommendedMix(n, shares)` (L57) splits by largest remainder
  - `compareGroups` (L83)
  - `belowRent(u, br, rent, edges)` (L109)
  - `captureRate(proposed, qualified, existing)` (L127)
- **`depth.ts`:** `CAPTURE {0.10, low 0.05, high 0.15}` (L7); `depthHomes(tract)` (L25) = (≤60% AMI renters within a mile − LIHTC homes within a mile) × capture.
- **`interp.ts`:** `belowCut` (L17).
- **Capture for a proposed mix:** computed inside `components/place/project/DemandMix.tsx` L116–124 (ZIP via B25118 below the 3-person limit, tract via CHAS cumulative). This is component code, not a library function.

### Suggestion rules
- **`lib/place/recommend.ts`:**
  - `recommend(p, hud, stance, opts) → Recommendation` (L368)
  - Output fields: `band, tenants, price: Ceiling, market: MarketTest, types[{typology, because, bedrooms}], not[], lead, headline, lot, flood, floodLimit, marketRent, household…`
  - Stance branches are at L434–494; senior is dropped for under-62 (L507); the flood limit blocks suggestions (L512).
- **`lib/place/plan.ts`:**
  - `levelBands` (L149), `ceilingForSize` (L159, limit/40), `marketRent` (L173)
  - `resolveHousehold` (L272), `planTenants` (L309), `levelTarget` (L358), `floodCheck` (L396), `homesLines` (L421)
- **`afford.ts`:** `ceilingRent(hud, pct, br, seniorAlone)` (L103), `marketTest(ceiling, asking, conf, safmr)` (L142).
- **`suggest.ts`:** `suggestAll` (L19), which runs `recommend` for all 128 tracts.
- **`thresholds.ts`:** `THRESHOLDS`, `SERVES`, `TYPE_BEDROOMS`.
- **`feasibility.ts`:** `lotPattern`, `floodNote`, `zoningNote`.
- **Unit mix:** `lib/project/plan.ts` `projectMix` (L20) is the renters' split, and `lib/project/model.ts` `projectBase` (L39) wraps signals, cap, inIzo, rents and depth.

### "Fit" or "match" logic
- None between a proposed project and the area.
- `recommend` produces suggestions; `DemandMix` shows the renters' split next to your mix without scoring them; `whyDiffer.ts` compares two places.
- No mapping exists between `DevType` and `Typology`. Two partial bridges exist: `TryLot.USE_FOR` (Typology → use keys) and `check.ts` `homeUse` (units → use keys).

## 3. Policies
- **`lib/policy/catalog.ts` `POLICIES` (L52), 16 entries in three kinds:**
  - binding: `izo`, `fpo`, `adu`
  - funding: `phfa`, `qct`, `perf`, `phfa_draft`, `ahb`, `hof`, `abatement`, `parking`, `plan`
  - screen: `displacement`, `transit`, `flood`, `market`
  - `PERF_DISTRICTS` (L199)
- **`applies.ts` `policyRows(ctx, state) → {policy, applies, on, note}[]` (L39), with `PolicyContext` at L21:**
  - IZ-O uses the pin when set, else the tract share (above 0.5 = in; any share = "check the site")
  - Flood: FEMA share &gt; 0
  - QCT/DDA: the 2027 list
  - Performance points: an eligible district in `cap.districts`
  - Plan: the `/Bluff/` regex
- **`compose.ts` `composeRec`/`composeAll` (L64/L134):**
  - Runs `recommend` under the anti-displacement or market-led stance.
  - Then drops ADU (no overlay), drops senior unless residents are senior, and applies the transit, flood and displacement screens.
  - Returns `{rec, checks[{id, on, passed, sentence}], why}`. `PlaceStudio` L183 runs it for every tract.
- **`zipCounts.ts`:** `IZO_MIN_SHARE=0.01`; it counts tracts for `izo`, `fpo`, `qct`, `perf`.
- **`store.ts`:** `PolicyState {displacement, transit, flood, on{ahb, hof, abatement, parking}}`.
- **`sun.ts`:** `openFit` (L45) is the only check that uses `max_coverage`.
- **`components/place/levels/Policies.tsx`:**
  - "Applies here" shows the rows in `AUTO` (L34: izo, fpo required; qct, perf, plan eligible) whose `applies === true`; at ZIP level it shows `zipPolicyWords`.
  - "I want to study" is the `STUDY` list (L43); `isOn` is at L45.
  - `StudyCard` (L125) shows `composed.checks` sentences for the screens and `policyRows` notes for the incentives.

## 4. AI
- **Server: `app/api/chat.ts` only.** There is no `api/explain.ts`, although `vite.config.ts` L22 also registers a dev route for `explain`.
  - **Provider:** `pickProvider` (L46) uses DeepSeek `deepseek-flash` when `DEEPSEEK_API_KEY` is set, else Claude `claude-sonnet-5` when `ANTHROPIC_API_KEY` is set. `EXPLAIN_PROVIDER` forces one; `CHAT_MODEL`/`EXPLAIN_MODEL` override the model.
  - **Settings:** `LIMITS {question 400, facts 16000, history 2, turn 1500}`, `MAX_TOKENS 380`, temperature 0.2. The `SYSTEM` prompt (L56) asks for plain text, at most 120 words, no invented numbers, and a decline line for out-of-scope questions.
  - **Message order:** `buildMessages` (L119) sends `FACTS` first, then a fixed acknowledgement, then the last exchange, then `QUESTION`, so the opening repeats for prompt caching.
  - **Token savings:** a regex check (`offTopic`, L89) declines without calling the model; answers are memoized while the function is warm (L184); a repeated question in the same visit is answered from memory on the client.
  - **Number check:** `checkNumbers` (L130) gives one retry, then marks the answer `checked:false`.
  - **No key:** returns `{ok:false, reason:'no_api_key'}` (L199).
  - **Gap:** the Anthropic request sets no `cache_control`, so Claude never bills the facts as cached input; only DeepSeek's automatic caching applies.
- **Clients:**
  - `lib/explore/chat.ts`: `buildFacts(scope)`/`composeFacts` (L199/L98) build tract census facts plus nearby places. `useChat.ask` (L411) sends at most the last exchange as history. Over `file://` it shows `CHAT_COPY.offline`; on errors it shows `CHAT_COPY.down`.
  - `components/AnalysisChat.tsx` wraps `ask` with `extraFacts` (L40–54). `components/ChatPill.tsx` renders it and is mounted in `PlaceStudio` L298.
  - `lib/analysis/strictChat.ts` hides unchecked answers in Analysis.
  - `lib/equity/reading.ts` `useEquityReading` waits 700 ms before asking, caches per facts text, and switches off for the session on `no_api_key` or a 401/402/403.
- **README rule:** the AI never computes a score, ranking or recommendation.
- **Gap:** the Place chat currently sends tract census facts only, with no project or zoning-check facts.

## 5. Tests (names only)
- **API:** `app/api/chat.test.ts`
- **zoning:** `src/lib/zoning/{check,capacity,atPin}.test.ts`
- **demand:** `src/lib/demand/{demand,depth}.test.ts`
- **place:** `src/lib/place/{afford,bands,copy,data,feasibility,plan,recommend,whyDiffer,zoningAnalysis}.test.ts`
- **policy:** `src/lib/policy/{compose,zipCounts}.test.ts`
- **parcel:** `src/lib/parcel/lots.test.ts`, `src/lib/explore/{parcelShadow,zoning,chat,chatThread}.test.ts`
- **project:** `src/lib/project/{capital,paths,report,side,size,store}.test.ts`
- **analysis and equity:** `src/lib/analysis/strictChat.test.ts`, `src/lib/equity/{reading,explain}.test.ts`
- **pencil and LIHTC:** `src/lib/pencil/{pencil,simple}.test.ts`, `src/lib/lihtc/{fromPlan,place,score,store}.test.ts`
- **components:** `src/components/place/levels/levels.test.ts`, `src/components/place/rules.test.ts`
- **Python (repo root `tests/`):** `test_zoning_capacity.py`, `test_lot_facts.py`, `test_demand.py`, `test_place_measures.py`, `test_designations.py`

## Gaps for your plan
- **Zoning data:**
  - No historic district data, and no overlay data other than IZ-O.
  - Lot coverage exists only for NDO/LNC/NDI; FAR only for the four mixed districts.
  - Height is checked in stories only, and UNC's `near_transit` is unused.
  - 34 districts are not computed.
  - IZ-O is read at the pin or by tract share, never by lot polygon; flood is tract-only.
- **Zoning logic:**
  - The check does not distinguish affordable from market housing and does not check IZ-O compliance.
  - Commercial uses are a general reading, not the full use table (§911.02).
- **Demographics:**
  - 62+ by income comes only from the CHAS household types. ACS age bands split at 60–64 and 55–64.
  - The top rent bracket is open at $1,500 or more, and asking rent exists for 2-bedrooms only.
  - Market depth is computed for tracts only.
- **Missing pieces to build:**
  - A project-vs-area fit function.
  - A mapping between `DevType` and `Typology`.
  - Capture-rate logic moved out of `DemandMix.tsx` into a library.
  - Project facts for the AI.</result>
<usage><subagent_tokens>262169</subagent_tokens><tool_uses>60</tool_uses><duration_ms>384644</duration_ms></usage>
</task-notification>

## Claude

The three searches have reported back. Before I write the plan, I need your call on three decisions.

- *AskUserQuestion*
- *Write*: /Users/ye/.claude/plans/humming-juggling-corbato.md
- *Edit*: /Users/ye/.claude/plans/humming-juggling-corbato.md
- *ExitPlanMode*
- *Bash*: Read zoning check and project model hook
- *Bash*: Read model base, capture math and depth
- *Bash*: Read cumulative, limits, ceilingRent and devType
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/levels/ParcelResults.tsx
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/levels/LevelInputs.tsx
- *Bash*: Read levels config, SiteDetail and lotRead
- *Bash*: Read PlaceStudio level wiring
- *Bash*: Read pencil market branch and displacement scale
- *Bash*: Look up type names and constants

## Claude

Writing the review engine now: the zoning, height, overlay, fit-with-the-area and money checks, each with computed fixes.

- *Bash*: Check share, edges and household type shapes
- *Bash*: Find income edges and household types
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/review/fit.ts
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/review/review.ts
- *Bash*: Tidy review imports; read zoning check tests
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/review/review.test.ts
- *Bash*: Run the review tests

## Claude

Done so far: the review engine and its 7 tests pass. Next I'm wiring it into Place: a shared hook, then the new results panel for all three levels.

- *Bash*: Read ZIP tract helpers and report input
- *Bash*: Thread a mix-from override through the project model
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/levels/useReview.ts
- *Bash*: Type-check the new hook
- *Bash*: Find users of ParcelResults and read StudyCard
- *Bash*: Find users of ParcelResults and read StudyCard
- *Bash*: Read the AI reading client and chat API
- *Bash*: Read the rest of the chat API

## Claude

Writing the server side of "Second opinion": a review mode in `api/chat.ts` that always uses Claude Haiku 5.5.

- *Bash*: Add review mode to the chat API
- *Bash*: Read chat test header and end
- *Bash*: Add review-mode tests and run API tests

## Claude

Now the client side: the facts builder and the Second opinion button.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/review/ai.ts

## Claude

Now the shared results panel: verdict, tiles, review with fixes and Second opinion, fit with the area, then capital.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/levels/ProjectResults.tsx
- *Bash*: Remove leftovers and type-check

## Claude

Now wiring the panel in: Parcel first (SiteDetail), then Tract and ZIP.

- *Bash*: Read ZipDetail and Starts
- *Bash*: Read ZipDetail tail

## Claude

Now editing ZipDetail and SiteDetail to use the shared panel.

- *Bash*: Switch ZIP and Parcel panels to ProjectResults

## Claude

Now the Tract right panel in PlaceStudio.

- *Bash*: Replace the Tract right panel with ProjectResults

## Claude

Now the left panel: the same groups at every level.

- *Bash*: Same input groups at every level
- *Bash*: Remove unused imports and type-check

## Claude

The dev server stopped, so I'm restarting it and running the tests.

- *Bash*: Start the dev server on port 5288
- *Bash*: Run all app tests
- *Bash*: Read the lazy guard list
- *Bash*: Add lazy guard paths and check the three levels in the browser
- *Bash*: Inspect tract capacity shape and lotFor
- *Bash*: Read tracts on a lot big enough for the project
- *Bash*: Say units, not homes, in the zoning check
- *Bash*: Run tests and recheck Tract and ZIP

## Claude

The Tract and ZIP readings make sense now. One gap: the verdict says "Works" while the tax credit score is far short of PHFA's minimum. I'm adding that as a review finding.

- *Bash*: Add the tax credit score to the review

## Claude

Next, Compare places: the same inputs on each side, and a Parcel-style middle.

- *Bash*: Read CompareStudio header and side inputs
- *Bash*: Read Compare's columns and middle section
- *Bash*: Let capital and review read a given side; export pieces for Compare
- *Bash*: Export the sources bar; check SectionHead
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/compare/CompareResults.tsx

## Claude

The stand-in model I used to keep hook order stable in Compare is fragile. I'm changing the review hook to accept a missing model and return nothing instead.

- *Bash*: Make the review hook accept a missing model

## Claude

Wiring CompareResults into CompareStudio: project results first, then the existing place comparison.

- *Bash*: Put the project results first in Compare's middle
- *Bash*: Check Compare places in the browser
- *Bash*: Find Compare's URL parameters
- *Bash*: Open Compare with two places picked

## Claude

Compare now shows paired results for Hazelwood and Bloomfield, with no errors. Two tidy-ups: tile labels repeat the row heading, and "Where they differ" lists trivial differences.

- *Bash*: Tidy Compare tile labels and differences
- *Bash*: Survey the zoning capacity pipeline
- *Bash*: Read the capacity pipeline and minimum lot sizes
- *Bash*: Look for the old lot minimums in the repo
- *ToolSearch*: select:WebSearch
- *WebSearch*: Pittsburgh minimum lot size reform 2025 very low 8,000 low 5,000 moderate 3,200 high 1,800 very high
- *Bash*: Add old-minimum capacity to the pipeline
- *Bash*: Test the old minimums
- *Bash*: Rebuild zoning capacity with the old minimums
- *Bash*: Check the rebuild changed only the new fields
- *Bash*: Read AnalysisView and pencil default inputs
- *Bash*: Look up place fields and rent helpers
- *Bash*: Check transit and flood fields, defaults shape

## Claude

Writing the Policy lab engine. It runs the test project's pro forma in all 128 tracts under the levers, plus each lever alone against today.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/policylab/lab.ts
- *Bash*: Type-check and test the Policy lab engine
- *Bash*: Peek at scenario summaries
- *ToolSearch*: select:TaskStop
- *TaskStop*
- *Bash*: Peek at scenario summaries
- *Bash*: Write the peek test and run it
- *Bash*: Add gap-based verdicts and rerun lab tests

## Claude

The engine is tested. Now the Policy lab screen. I'm looking at how the current Equity view lays out its map so I can reuse it.

- *Bash*: Read the Equity view layout
- *Bash*: Check CSV and map prop signatures
- *Bash*: Read MapView props and CSV column type

## Claude

Writing the Policy lab screen: levers on the left, the map in the middle, outcomes on the right.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/equity/lab/PolicyLab.tsx
- *Bash*: Type-check the Policy lab screen

## Claude

The lab type-checks. Now the swap in `AnalysisView`, the only edit that touches the offline file. I'll measure the offline size before and after.

- *Bash*: Measure the offline file before the swap

## Claude

Four new Tailwind classes put the offline file 126 bytes over the limit. I'm swapping them for existing classes or inline styles.

- *Bash*: Find the new classes
- *Bash*: Replace new classes with existing ones or inline styles

## Claude

Now the AnalysisView swap, then the offline size again.

- *Bash*: Swap in the Policy lab and measure the offline file

## Claude

The offline file is still exactly 5,999,962 bytes, with no new classes: the build drops the swap from the offline file. Running all tests and checking the Policy lab in the browser.

- *Bash*: Run all tests and drive the Policy lab

## Claude

The lab works, but the gap measure misleads: with inclusionary housing on, I divided the gap by the 4 affordable homes, so it read $2.3M a home. I'm changing it to the gap per unit.

- *Bash*: Report the gap per unit
- *Bash*: Check Apply and Second opinion in the browser

## Claude

Apply works: the stories fix clears the height finding and the next fix moves up. Without a key, Second opinion says plainly that it isn't set up. Now the docs.

- *Bash*: Find doc lines to update

## Claude

Updating the README, TECHNICAL and the in-app About text, then writing the two method notes.

- *Bash*: Update README, TECHNICAL and About text
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/docs/data/project_review.md
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/docs/data/policy_lab.md

## Claude

Final checks: types, all tests, Python, the offline file, and a browser pass over every view.

- *Bash*: Run every check and the browser pass
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/shots/policy_lab.png

## Claude

The Policy lab looks right. Saving project memory, then reporting.

- *Write*: /Users/ye/.claude/projects/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/memory/visionpitts-update11-review-policylab.md
- *Bash*: Index the new memory

## Claude

Parcel, Tract, ZIP code and Compare places now share one set of inputs and one results layout. Every answer is checked live by a review that re-runs on each change, and Equity & policy is now a Policy lab. It's running at http://localhost:5288 (I restarted the dev server; it had stopped).

All 608 app tests and 316 Python tests pass. A browser run of all three levels, Compare and the Policy lab showed no errors. The offline file is unchanged at 5,999,962 bytes. Nothing is committed.

**Same inputs everywhere.** Every level asks for Project (type, Units, stories, income, mix), Capital, Open space and Policies; Parcel also has its Site. Each side of Compare places gets the same groups.

**One results panel for every level.** Top to bottom:
1. **Verdict:** Works, Works with changes, or Doesn't work as is, with one line on why.
2. **Four tiles:** zoning, units against what's allowed by right, capital, tax credits.
3. **Review:** problems listed worst first, with up to three "Try" fixes you can apply in one click (for example "Use 3 stories (40 ft limit)", "Make 4 units 50% AMI (IZ-O)", or the rent a market project needs).
   - **Zoning:** use, units by right, lot size, floor area, and height checked in feet as well as stories.
   - **Inclusionary overlay:** the IZ-O set-aside checked against your actual mix.
   - **Floodplain**, and the historic credit's certification.
   - **Fit with the area:** the share of qualifying renters your units would need, your mix against household sizes, seniors, market renters, displacement risk.
   - **Money:** loan coverage, return, funding gap, tax credit score.
4. **Fit with the area** as bars, then the capital stack, the tax credit score and what you're studying.

**Where Tract and ZIP read the project.** A neighborhood has no single lot, so the project is read on a lot of the size it needs, in a district there that allows it. The panel says how many of the tract's lots are zoned for it, and warns when no vacant lot is that big. ZIP runs on its main tract with the most renters, using the ZIP's own renters and asking rent.

**AI second opinion.** On a click, Claude Haiku 5.5 reads the review's findings and gives one sentence, two risks and one change to try, in under 90 words. Its numbers go through the existing check. The rules always set the verdict.

**Key needed:** the button will say "not set up" until you add `ANTHROPIC_API_KEY` yourself, in Vercel and in `app/.env.local`. I didn't store the key you pasted. It starts `sk-ant-usr-`, which doesn't look like an API key (those start `sk-ant-api`), so it may not work. Since it's now in this chat, consider rotating it.

**Compare places.** The middle starts with "The project in each place": the verdicts and tiles side by side, both capital stacks on one scale, the share of qualifying renters each would need, and only the checks that differ. Your existing At a glance, What each place gets and Why they differ sections follow.

**Policy lab (Equity & policy).** You move real Pittsburgh levers:
- **Inclusionary housing:** off, IZ-O or citywide; 0–30%; minimum project size; 30–80% AMI; required, or the proposed Bill 2025-1545 bonus.
- **Minimum lot sizes:** today's or the pre-May 2025 ones.
- **Parking minimums**, **PHFA plan**, **gap subsidy**, **tax abatement**, and the **screens**.

A 40-unit test project runs in all 128 tracts. You see homes allowed by right, where it works, homes with an income limit, the funding gap per unit and who gains, with a map. Each lever you move also gets its own verdict against today (works, trade-off, no effect, backfires), plus the Controller's finding on what the IZ-O has actually produced. "Where need is →" opens the old six-measure view, and there's a CSV download.

**Readings at the defaults:**
- **Market rate:** works in only 3 of 128 tracts, which matches the "Loses money" result you saw earlier. Lever verdicts therefore also look at whether the funding gap shrinks.
- **Pre-2025 lot minimums:** about 7,400 fewer homes allowed by right (44,279 → 36,889).
- **Removing parking minimums:** cuts the funding gap by about $18,800 a unit.

**Assumptions to check:**
- **Pre-reform minimums:** the 8,000 / 5,000 / 3,200 / 1,800 sq ft figures are from the [City Council release](https://www.pittsburghpa.gov/City-Government/City-Council/Districts/Bobby-Wilson-District-1/Follow-Us/Councilman-Wilson-Passes-Legislation-to-Reduce-Minimum-Lot-Sizes) and the [City's minimum lot size page](https://engage.pittsburghpa.gov/implementing-housing-needs-assessment/minimum-lot-size). The old very-high-density figure isn't published, so 1,200 sq ft is my assumption.
- **Labeled examples:** parking at $15,000 a space, the $1,500 abatement, and 1.5× equity as the "works" bar.
- **Bonus height:** the optional bonus assumes the lot can carry the extra floors, so it is an upper bound.

**Other changes:**
- The pipeline now also writes by-right capacity under the old lot minimums; today's figures are unchanged.
- Zoning text says "units" instead of "homes".
- The PDF and CSV export now carry the full review.
- Methods are in `docs/data/project_review.md` and `docs/data/policy_lab.md`, with updates to the README, TECHNICAL and the About text.

## You

for each of the analysis left panel, there should be a browse button, so that i could jsut see what is a better fit of a project without actual test a project? showing the income, rent, tenant mix, etc. do you undertsand? do this for parcel tract and zipcodes, to understand what is needed the most, brieft overview

## Claude

I understand: a **Browse** mode on the left panel at each level. Instead of testing a project, it gives a short overview of what the place needs most (incomes, rents, who rents there, what zoning allows) and the project that fits best, with a button to test that project. Building it now.

- *Bash*: Read PlaceRail and demand data types
- *Bash*: Read the Recommendation shape and ZIP counts
- *Bash*: Read composeRec signature
- *Bash*: Inspect ZIP burden fields
- *Bash*: Inspect the ZIP file structure
- *Bash*: Read LevelSwitch and demand score hook

## Claude

Writing the Browse store, the switch and the overview panel.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/levels/browse.ts
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/levels/Overview.tsx

## Claude

Wiring Browse into the left panel and the three right panels.

- *Bash*: Wire Browse into the rail and the three panels
- *Bash*: Try Browse at every level in the browser
- *Bash*: Fix best-fit size, lot fit and rent line; recheck
- *Bash*: Run tests and check the offline file

## Claude

Simplifying the Browse wording now.

- *Bash*: Simplify Browse wording and recheck
- *Bash*: Document Browse and update memory

## Claude

Browse is in at all three levels, with the shorter wording you asked for. Under the Parcel / Tract / ZIP code switch there's now a **Browse | Test a project** toggle. In Browse, the left panel says only "Pick a neighborhood. See what it needs most, then test the best fit." The right panel shows a short overview. It's live at http://localhost:5288. The 608 app tests pass, a browser run at all three levels showed no errors, and the offline file is unchanged at 5,999,962 bytes. Nothing is committed.

**What Browse shows**
- **Best fit here:** the housing type that fits, for the income group with the most cost-burdened renters, with a size suited to the type and a unit mix. At Parcel it's the best fit on this lot. For the lot I tried, a townhome fits, and it notes that the tract's best fit (duplex/triplex) isn't allowed by right there.
- **This lot** (Parcel only): its zoning, size and the units allowed by right.
- **Income:** renters by income band, with the cost-burdened share in red, and the median renter income.
- **Rent:** the 2-bed asking rent and the median paid, against what's affordable at 30, 50 and 80% AMI. One line sums it up, e.g. "≤30% AMI renters are $405 a month short of a 2-bed."
- **Renters:** household sizes, seniors, people living alone.
- **Since 2014:** the change in renters, rent and income.
- **Zoning:** vacant lots and the homes they allow by right.

**Test this project** fills in the type, income level, units and stories, and switches to Test a project, where the full review runs.

**Things to know**
- **Size follows the type:** 1 unit for an ADU, 3 for a duplex or triplex, about 6 townhomes. Apartments and senior housing are sized to how many qualifying renters live nearby.
- **ZIP code:** the best fit is the most common type across the ZIP's tracts. ZIP figures come from the census and the ZIP file, tract figures from HUD and the census.
- **Testing at ≤30% AMI:** most of Hazelwood reads ≤30% AMI as the greatest need. A test at that level will usually show a funding gap, with a fix to add subsidy.

The Browse section is added to `docs/data/project_review.md`.

## You

can you make all the controls for Equity & policy like previous maps that is floating on the map please. make this deisgn the same across all tabs please, expect for compare places

- *Bash*: Read the floating panel frame
- *Bash*: Locate layout code in the Policy lab
- *Bash*: Rebuild the Policy lab as a floating-panel map view
- *Bash*: Read the equity measure helpers
- *Bash*: Read legend type and the old paint
- *Bash*: Find measure types and view references
- *Bash*: Fold need measures into the floating lab map

## Claude

My first edit script had a syntax error and never ran, but the second one did, so the file is half-edited. Re-applying the first part correctly.

- *Bash*: Apply the remaining Policy lab edits
- *Bash*: Check the floating Policy lab in the browser
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/shots/lab_need.png
- *Bash*: Run final checks and update docs and memory

## Claude

Equity & policy now uses the same floating layout as Explore and Place. The map fills the screen and the controls float over it. Compare places is unchanged. Explore and Place already worked this way. The 608 app tests pass, the browser check showed no errors, and the offline file is still 5,999,962 bytes. Nothing is committed.

- **Left panel (floats, folds away like Place's):** the Policy lab levers. At the top there's a new **Color the map by** menu, plus Download CSV.
- **Right panel (floats):** the outcomes (today against your scenario, what works and what doesn't), the tract you click, and the AI second opinion.
- **Bottom left:** the map legend.

**"Where need is" changed too.** That separate screen had the old non-floating layout, and it shares code with the offline file, which has only 38 bytes left. Instead, its six need measures are now choices in "Color the map by":
- rent gap and cost burden, each with an income picker (≤30%, ≤50%, ≤80%, market);
- jobs, school, transit and services.

When you pick one, the map is colored by that measure. The right panel adds its definition, the five tracts with the most need, and where the selected tract ranks. The offline file keeps the old Equity screen.

The README, TECHNICAL and `docs/data/policy_lab.md` are updated.

## Summary of earlier conversation

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.


Summary:
## Standing constraints (from the user and memory; keep)
- **Ye commits their own work. Never git commit or push.**
- Never mention the Hack a House/AI Housing folder or a prototype. Deepblue is never named, and none of its code is copied.
- The published contact is only the UPenn email and LinkedIn.
- Ask Ye before raising the 6 MB offline mark. Public data only. Lot facts only: never owners, addresses on record, values or sales.
- Keep Export; no Save & share.
- **Credentials:**
  - Mid-turn, Ye pasted a Claude key into chat (it starts `sk-ant-usr-`).
  - I did not store or enter it. I told Ye to set `ANTHROPIC_API_KEY` themselves (in Vercel and `app/.env.local`), that it may not be a Messages API key (those start `sk-ant-api`), and to consider rotating it.
  - Never type or store keys.
- Ye wants wording kept simple and short.
- **Compare places is excluded** from the floating-panel design request.

## Environment and checks
- **App:** `/Users/ye/Documents/Ye-Zhang-Vision-Pitts/app` (React, Vite, TypeScript, zustand).
- **Dev server:** background task `b0w3z9ezf`, `npx vite --port 5288 --strictPort`, at `http://[::1]:5288`. It replaced the old task, which died.
- **Python:** `PYTHONPATH=src uv run --no-sync python ...`.
- **Playwright:** `/Users/ye/node_modules/playwright`. Scripts are in `S=/private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad`:
  - `levels.cjs`, `cmp.cjs` (`#m=compare&t=42003562300&b=42003080200`), `lab.cjs`, `lab2.cjs`, `browse.cjs`, `fix.cjs`, `htc.cjs`, `units.cjs`.
- **Offline file:** `export/index.html` must stay ≤ 6,000,000 bytes. It is still **5,999,962 bytes** (38 left).
  - Class-diff check: `python3 $S/classes.py ../export/index.html $S/classes_now.txt; diff $S/classes_before.txt ...`.
  - New Tailwind classes cost bytes, so use existing classes or inline styles.
  - The lazy swaps in `AnalysisView` cost 0 bytes.
- **Last check status:**
  - tsc clean; vitest 68 files, 608 tests passed; pytest 316 passed.
  - No new classes; Playwright runs show no errors.
- **Shell pitfall:** `cat > file` without input hangs.

## Work done this session (all uncommitted)

### 1. Capital: historic tax credit and grouped inputs
- `lib/pencil/simple.ts` has `htcRate` and `htcPrice`. HTC = (total − acquisition) × rate × price, the workbook's F14.
  - LIHTC room subtracts HTC.
  - Source order: Loan, LIHTC equity, Historic tax credit equity, Other subsidy, Deferred developer fee, Developer equity.
  - The label is "LIHTC equity", no longer "Tax credit equity".
- `lib/project/capital.ts`:
  - `CAPITAL_GROUPS` (Uses: what it costs; The loan; Tax credits and subsidy; Operations; Sale) and `CAPITAL_MORE` (origination, growth rates).
  - `HTC_RATE = 0.2`; suggestions `htcRate` 0 and `htcPrice` 0.82.
- `CapitalInputs.tsx`: grouped, with a LIHTC 9%/4% Segmented control and a "Historic tax credit" No / Certified historic rehab switch.
- `CapitalCard`: HTC colour `#008300`. The bar order is Developer equity, Loan, LIHTC, HTC, Other, Deferred, validated for every stack with a loan. `SourcesBar` is now exported.
- Tests updated: `simple.test.ts` (HTC 1,832,410.11), `capital.test.ts`.

### 2. Wording "Units"
- Tract and ZIP `HomesField label="Units"`; `MixInputs`/`MixEditor` take a `head` prop.
- `check.ts` texts say units.

### 3. Big plan (approved; plan file `/Users/ye/.claude/plans/humming-juggling-corbato.md`)
Ye's choices:
- Rules live; AI only on click, Claude Haiku 5.5 `claude-haiku-5-5`.
- Replace the Equity levers with real levers.

**Review engine: `lib/review/`**
- `review.ts`: `reviewProject`, `Finding`, `Fix`, `FixAction`, `TypicalLot`, `rentForMultiple`, `verdictWord`, `TONE_RANK`, `MULTIPLE_GOOD` 1.5.
  - Zoning rows; height in feet; IZ-O compliance; historic note.
  - Fit: capture, mix, senior, market, displacement.
  - Money: DSCR, return, gap, tax credit score, credits sized to need.
  - Fixes, at most 3.
- `fit.ts`: `captureFit`, `captureTone`, `mixFit`, `seniorHouseholds`, `marketHouseholds`, `limitAt`.
- `ai.ts`: `reviewFacts`, `useSecondOpinion`, `OFF_WORDS`.
- Tests: `review.test.ts`.

**Hook: `components/place/levels/useReview.ts`**
- `useProjectRead`: overloaded, accepts a null model, takes a `side`.
- `typicalIn`: the lot size the project needs in a by-right district, with the lot count and largest lot.
- `useZipModel`: the ZIP's main tract with the most renters, `mixFrom`, the ZIP's asking rent.
- Also `applyFix`, `withHomesAt50`, `devTypeTypology`, `checkInputFor`.
- `projectBase` and `projectModel` take `mixFrom`; `useProjectModel` takes a 5th parameter `mixFrom`. `useCapital` takes `side?`.

**Results panel: `ProjectResults.tsx`** (`ParcelResults.tsx` deleted)
- Contents: verdict, `Takeaway4`/`takeaways`, `ReviewCard` with Apply and `SecondOpinion`, `FitCard`, `CapitalCard`, `CreditMeter`, `StudyCard`, `SunCard`.
- Export goes through `capitalReport` with the review findings.
- Used by `SiteDetail` (now `useSide`), the Tract `StudioDetail` in `PlaceStudio` (`SuggestedHere` plus the evidence fold), and `ZipDetail`.

**Levels and inputs**
- `levels.ts`: tract and ZIP inputs are `['project','money','open','policy']`. `LevelInputs`: `ProjectGroup` at all levels; `ProjectInputs` export for Compare.

**Compare**
- `components/compare/CompareResults.tsx` is section 1. It replaced `CompareProject`.
- Side inputs come from `ProjectInputs`.

**API**
- `api/chat.ts` mode `review`: `reviewProvider`, `REVIEW_MODEL`, `REVIEW_SYSTEM`, `cache_control`. Tests added.

**Pipeline**
- `zoning_capacity.py`: `OLD_MIN_LOT` {VL 8000, L 5000, M 3200, H 1800, VH 1200 (assumption)}, `old_minimums`, `add_old` writing `homes_old`, `below_min_old` and gentle `homes_old`.
- Wired in `scripts/18_build_zoning_capacity.py` and rerun: old 30,195 vs 33,749 vacant; gentle 6,694 vs 10,530.
- A test was added to `tests/test_zoning_capacity.py`. The `TractCapacity` type is updated.

**Policy lab**
- Engine: `lib/policylab/lab.ts`.
  - `Scenario`, `TODAY`, `TEST_PROJECT`, `EXAMPLES` (parking $15k, abatement $1,500, flood 5%, 1.5×, credit AMI 60), `rentAt`, `bonusPoints`.
  - `runTract`, `runScenario` (the summary includes `breakEven` and `medianGap` per unit), `leverEffects` with verdicts.
  - Tests: `lab.test.ts`.
- UI: `components/equity/lab/PolicyLab.tsx`, loaded lazily from `AnalysisView`; the offline file keeps `EquityPolicyView`.
- `lazyGuard` `ON_DEMAND` adds `lib/review/`, `lib/policylab/` and `components/equity/lab/`.

**Docs**
- `docs/data/project_review.md`, including the Browse section, and `docs/data/policy_lab.md`.
- README, `docs/TECHNICAL.md` and `ProjectCardsDetails` About updated.
- `report.ts` heading is now "Project review: ...".

### 4. Browse mode
- `components/place/levels/browse.ts` (`useBrowse`, mode browse|test, default test).
- A `BrowseSwitch` in `PlaceRail` under the level switch.
- `LevelInputs` shows a short note in browse mode: "Pick a neighborhood. See what it needs most, then test the best fit."
- `Overview.tsx` (scope parcel/tract/zip):
  - **Best fit:** composeRec at the level with the most cost-burdened renters. On a lot, the first type allowed by right.
  - **Size by type:** ADU 1, duplex 3, townhome 6, apartments 8–40 and senior 20–60 by market depth.
  - Sections: This lot, Income, Rent, Renters, Since 2014, Zoning.
  - "Test this project" sets the type, level, units and stories, then switches to test.
- Wired in `SiteDetail`, `StudioDetail` and `ZipDetail`. The wording was simplified per Ye.

### 5. Latest request: floating controls in Equity & policy
User: "make all the controls for Equity & policy like previous maps that is floating on the map please. make this deisgn the same across all tabs please, expect for compare places".
- `PolicyLab` is now a full-screen `MapView` with:
  - a foldable `PlaceRail`-style left rail (title, "Color the map by" select, Income Segmented for rent gap and burden, Download CSV, the levers);
  - a bottom-left legend;
  - `RightColumn` + `PanelFrame inline title="Outcomes"`: the need card, Outcomes, Effects, the tract picked, the Opinion.
- The six need measures moved in as map colours (`MEASURES`, `buildLegend`, `measureValue`), with a "Where need is" card showing the definition and the top 5. The old "Where need is →" view was removed online; `EquityPolicyView` is offline-only.
- Explore and Place already float.
- Verified in the browser, no errors. Docs (policy_lab.md layout paragraph, TECHNICAL, README) and memory updated.

## Memory
- `visionpitts-update10-parcel-flow.md` updated earlier with the HTC note.
- New `visionpitts-update11-review-policylab.md`, indexed in `MEMORY.md`. It includes Browse and the floating layout notes.

## Next step
Give Ye the final report for the floating-layout change:
- **Policy lab:** now floats like Explore and Place, with need measures as map colours.
- **Compare places:** unchanged.
- **Checks:** 608 tests pass, offline unchanged, nothing committed.

If you need specific details from before compaction (like exact code snippets, error messages, or content you generated), read the full transcript at: /Users/ye/.claude/projects/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569.jsonl
Continue the conversation from where it left off without asking the user any further questions. Resume directly — do not acknowledge the summary, do not recap what was happening, do not preface with "I'll continue" or similar. Pick up the last task as if the break never happened.

The messages after this summary are the most recent messages from before compaction, kept verbatim. The summary was written without seeing them, so something it says has not happened yet may already have happened in them.

## You

Can you make the Policy lab more clear and more detailed and defined? review the requirement of the hacakthon and make sure this policy lab is doing what it suppose to do. make it easier to use, like different policy or zoning, make sure all the changes on the map are match with the controls. please ultrathink and refine

- *Read*: /Users/ye/.claude/projects/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/memory/visionpitts-hackathon-context.md
- *Bash*: List docs and Policy lab files with sizes
- *Bash*: Find hackathon requirement docs
- *Bash*: Search for hackathon track requirements
- *Bash*: List nopush docs and grep top-level docs
- *Bash*: Show Track 3 text in README and TECHNICAL

## Claude

I'm reading the Track 3 challenge page and the current Policy lab code. Then I'll plan the changes.

- *ToolSearch*: select:WebFetch,TaskStop
- *TaskStop*
- *WebFetch*: https://ai-horizons-2026-ai-for-housing-hackathon.brandon831577.chatgpt.site/challenges/typology-equity-climate
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/policylab/lab.ts
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/equity/lab/PolicyLab.tsx
- *Bash*: Read zoning capacity module and data shape
- *Bash*: Inspect tract capacity records and zoning doc
- *Bash*: Survey capital, devType, climate, transit, parking data
- *Bash*: Read transit/flood types and capital context
- *Bash*: Show transit/flood fields and climate mentions
- *Bash*: Find zoning check API and typical-lot helpers
- *Bash*: Read zoning check and review hook
- *Bash*: Probe Policy lab outcome distributions
- *Bash*: Remove probe; check export script and lazy guard

## Claude

Data check is done. Lazy data stays out of the offline file, so I can add zoning fields. Now I'm checking the pipeline for a new "more homes on house lots" zoning lever.

- *Bash*: Survey zoning capacity pipeline functions
- *Bash*: Read gentle-density and old-minimum code plus build script
- *Bash*: Read lab tests, Segmented, MapPaint and flips usage
- *Bash*: Check paint kinds, InfoTip and switch components
- *Bash*: Read class-diff helper and export size
- *Bash*: Inspect zoning capacity tests and existing-homes map

## Claude

Plan is set. I'm starting with the data step: per tract, the homes added if house lots allowed an ADU, or up to 3 or 4 homes.

- *Bash*: Show constants and the old-minimums test

## Claude

Now the pipeline edit: one helper for the house-lot gains, used for today's and the old minimums.

- *Bash*: Add house-lot gains to pipeline and a test
- *Bash*: Add house-lot totals to the build script log

## Claude

Now rerunning the zoning build in the background (it reads every city lot).

- *Bash*: Rebuild zoning capacity with house-lot gains
- *Bash*: List uncomputed districts and cost defaults
- *Bash*: Read build log and check capacity distributions
- *Bash*: Find pencil defaults for cost inputs
- *Bash*: Find external users of the lab module
- *Bash*: Check users and extend the capacity type
- *Bash*: Document the new capacity fields

## Claude

Now the engine itself.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/policylab/lab.ts

## Claude

Quick sanity run of the new engine before the screen:

- *Bash*: Probe new engine outcomes by type and package

## Claude

A few findings to fix:
- **Senior** shows as allowed by right nowhere, which suggests senior housing needs a hearing.
- **Frequent bus** changes nothing.

Checking both against the data:

- *Bash*: Check elderly-housing uses and place data location
- *Bash*: Check frequent and any-stop distance data
- *Bash*: Add hearing status, screened change and reasons

## Claude

The bonus is taken in 6 tracts, but it reads as "No effect" because the gap is averaged over all tracts. I'll count better and worse tracts the same way the map does.

- *Bash*: Locate leverEffects and its interface
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/policylab/lab.ts
- *Bash*: Count better and worse tracts per policy
- *Bash*: Refine change classes and plurals; rerun probe
- *Bash*: Use return first, then gap, for better or worse

## Claude

Engine verdicts now read sensibly. Updating the engine tests:

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/policylab/lab.test.ts
- *Bash*: Run the Policy lab engine tests

## Claude

Engine tests pass (12 of 12). Now the screen. I'm splitting it into the map shell, the left controls and the right results.

- *Bash*: Read InfoTip, PanelFrame and measure definitions
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/equity/lab/ui.ts

## Claude

Next, the left controls:

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/equity/lab/LabLevers.tsx
- *Bash*: Drop the ring class on package buttons

## Claude

Now the right panel (results):

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/equity/lab/LabResults.tsx
- *Bash*: Tidy imports and add readable result text colors

## Claude

Now the main file that ties the map to the controls:

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/equity/lab/PolicyLab.tsx
- *Bash*: Type-check the app
- *Bash*: Memoize palette and simplify outlines; type-check

## Claude

Type-check passes. Now checking that I added no Tailwind classes, since any new class adds bytes to the offline file:

- *Bash*: List Tailwind classes not in the offline CSS

## Claude

No new classes ("fills" is a word in the copy). Running the full test suite and the offline build:

- *Bash*: Run the full app test suite
- *Bash*: Build the offline file and check its size

## Claude

The offline file is 5,999,989 bytes. That is still under the 6,000,000 limit, but 27 bytes more than before. Finding what grew:

- *Bash*: Diff offline CSS classes before and after

## Claude

The new class is `contents`. Tailwind picked up the `display: 'contents'` string. I'll use a React Fragment instead:

- *Bash*: Replace display-contents with Fragment and rebuild

## Claude

The offline file is back to 5,999,962 bytes, as before. Now checking the lab in the browser with Playwright.

- *Bash*: Read the earlier lab Playwright script

## Claude

Moving the non-component exports out of `LabResults` so hot reload works, then running the browser check:

- *Bash*: Move answer and evidence into ui.ts; type-check
- *Bash*: Drive the Policy lab in a headless browser
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/shots/lab3_start.png
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/shots/lab3_lots.png
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/shots/lab3_tract.png
- *Bash*: Tighten the "not allowed" rule and fix the tested label
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/shots/lab3_change.png
- *Bash*: Check fact length limits for the second opinion
- *Bash*: Read server fact limit and the opinion hook

## Claude

The server accepts up to 16,000 characters and the summary is about 2,500, so it fits. Now the docs: first, where the Policy lab is described.

- *Bash*: Find Policy lab mentions in docs
- *Bash*: Show full README and About Policy lab lines

## Claude

Now the method doc, rewritten for the new design:

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/docs/data/policy_lab.md

## Claude

Re-checking each number in "Readings at the defaults" against the engine, since the zoning rule just changed:

- *Bash*: Verify the documented default readings
- *Bash*: Correct the default readings in the doc

## Claude

Now the README, TECHNICAL, the About text and the zoning doc:

- *Bash*: Update README, TECHNICAL, zoning doc and About text

## Claude

Running every check again: types, app tests, Python tests, offline size and the class list.

- *Bash*: Run all checks and the offline build

## Claude

All checks pass and the offline file is unchanged. A last browser pass covers the senior type, the transit package, a phone-width view and the lower part of the panel:

- *Bash*: Check senior type, transit package and phone layout
- *Bash*: Explain a screen that leaves nothing out
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/shots/lab4_bottom.png
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/shots/lab4_phone.png

## Claude

On a phone the panel header takes most of the space, so I'll hide its two helper lines at phone width (the class already exists, so no offline cost):

- *Bash*: Hide helper lines on phones; recheck and rebuild

## Claude

Everything checks out. Last, I'll update the project memory with this round:

- *Bash*: Record the Policy lab refinement in memory

## Claude

I rebuilt the Policy lab to follow the Track 3 brief, with clearer controls, and the map now changes with every control you move. The app tests (613), Python tests (317) and type check pass. The browser check showed no errors, and the offline file is still 5,999,962 bytes. Nothing is committed.

**What the brief asks, and what the lab does now**

| Brief asks for | Policy lab now |
|---|---|
| Test zoning changes | More homes on house lots (an extra small home beside a house, or up to 3 or 4 homes a lot), minimum lot sizes (today's or before May 2025), parking minimums (keep, none near transit, none) |
| Density bonuses | Inclusionary requirement (where, how much, at what income) and the proposed height bonus (Bill 2025-1545) |
| Tax incentives | Tax abatement and gap subsidy, at preset amounts, plus the PHFA tax credit plan |
| Infrastructure investment | New: frequent bus on every line (every 15 minutes) |
| Show whether zoning allows a type | Each tract now says "by right", "needs a hearing", "not allowed" or "not read here" for the test building |
| Compare scenarios | Five ready-made packages: today's rules, missing middle, more affordable homes, build near transit, and the proposals before the City |
| Separate data from values | "Your values" (where you would not build) and "Assumptions" (the developer's bar, building cost, parking cost) are their own groups. A fold in the results lists what is data, law, proposal, example or value. |

**Easier to use**
- **Test building:** pick a type (duplex, triplex, fourplex, townhomes, small apartments, apartments, senior) instead of only "market or affordable".
- **Each policy shows:** today's rule, whether it's in force, proposed or an idea, and an (i) explaining how the lab uses it.
- **Changes are marked:** a moved policy gets a violet edge, and each group counts its changes.

**The map matches the controls**
- "The map shows" now has three maps of your rules: does it work, what changed from today, and homes allowed by right. The six need maps are still there.
- If you move a policy the current map doesn't show, the map switches to one that does. For example, lot sizes switch to homes by right, and parking switches back. A line under the menu says what the map shows.

**Results:** a short answer in words, then today against your rules (the building, homes, who gains, climate), then what each policy adds. That last part now compares your rules with and without each policy, and says why when a policy has no effect.

**Things to know**
- **Market rate rarely pencils:** a 40-unit market-rate building works in only 3 of 128 tracts, so most policies shrink the gap rather than change the count. The "What changed" map shows that, for example 73 tracts better off by about $17k a unit with no parking minimums.
- **Senior housing is never allowed by right** in Pittsburgh's base districts (§911.02). It needs a hearing in 60 tracts and isn't allowed in 55 (4 stories is over the limit there).
- **The house-lot numbers are large but they are room, not homes built:** up to 3 homes per lot adds about 120,000 homes allowed by right. The lab says so.
- **New zoning data:** I reran the zoning data step to add the house-lot numbers, and the other totals didn't change.

The method doc `docs/data/policy_lab.md` is rewritten. README, TECHNICAL, the zoning doc and the About text are updated.

## Summary of earlier conversation

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.


Summary:
## Standing constraints (from the user and memory; keep)
- **Ye commits their own work. Never git commit or push.**
- Never mention the Hack a House/AI Housing folder or a prototype. Deepblue is never named, and none of its code is copied.
- The published contact is only the UPenn email and LinkedIn.
- Ask Ye before raising the 6 MB offline mark. Public data only. Lot facts only: never owners, addresses on record, values or sales.
- Keep Export; no Save & share.
- **Credentials:** earlier, Ye pasted a Claude key starting `sk-ant-usr-`. I did not store or enter it. I told Ye to set `ANTHROPIC_API_KEY` themselves (in Vercel and `app/.env.local`), that it may not be a Messages API key (those start `sk-ant-api`), and to consider rotating it. Never type or store keys.
- Ye wants wording kept simple and short.
- Compare places keeps its own (non-floating) layout.

## Environment
- **App:** `/Users/ye/Documents/Ye-Zhang-Vision-Pitts/app` (React, Vite, TypeScript, zustand).
- **Dev server:** background task `b0w3z9ezf` at `http://[::1]:5288`.
- **Python:** `PYTHONPATH=src uv run --no-sync python ...`.
- **Playwright:** `/Users/ye/node_modules/playwright`. Scratchpad: `S=/private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad`.
  - Scripts there: `lab3.cjs` and `lab4.cjs` (Policy lab checks); screenshots in `$S/shots/`.
  - Other files: `newclasses.py` (lists candidate new Tailwind classes against `classes_before.txt`), `classes.py`, `zoning_capacity.before.json`.
- **Offline file:** `export/index.html` must stay ≤ 6,000,000 bytes. It is **5,999,962** (unchanged).
  - New Tailwind classes cost bytes, even from plain string literals: `display: 'contents'` once added `.contents` (+27 bytes), so I used a Fragment.
  - Class check: `diff $S/classes_before.txt` against `classes_now.txt` showed no change.
- **Last checks:** tsc clean; vitest 68 files, 613 tests passed; pytest 317 passed; Playwright runs showed no errors.

## The request this session
Ye asked (ultrathink): "Can you make the Policy lab more clear and more detailed and defined? review the requirement of the hacakthon and make sure this policy lab is doing what it suppose to do. make it easier to use, like different policy or zoning, make sure all the changes on the map are match with the controls."

I fetched the Track 3 challenge page. Its policy simulator should "test zoning changes, tax incentives, density bonuses, or infrastructure investments" and show whether current zoning permits a housing type. Its success criteria are:
- compare scenarios;
- show why;
- let users change weights;
- separate data from values and assumptions;
- document uncertainty.

## Work done (all uncommitted)

### Pipeline
- `src/visionpitts/zoning_capacity.py`:
  - added `HOUSE_CAP` {R1D 1, R1A 1, R2 2, R3 3} and `house_lot_gains(rows)` → `adu`, `up3`, `up4`;
  - covers lived-in house lots at or above the minimum lot size with known homes;
  - ADU = max(today's gain, 1 if the lot holds a single home);
  - wired into `tract_totals` (gentle `**house_lot_gains`) and `add_old` (`*_old` versions).
- `scripts/18_build_zoning_capacity.py` logs the totals. It was rerun: +62,799 with an ADU, +130,793 at up to 3, +200,619 at up to 4 (gains over today's 10,530: 52,269, 120,263, 190,089). Other data is unchanged.
- Test `test_house_lot_gains` added to `tests/test_zoning_capacity.py`.
- The `TractCapacity.gentle` type in `lib/zoning/capacity.ts` gained `adu`, `up3`, `up4` and their `_old` versions.

### Engine: `app/src/lib/policylab/lab.ts` (rewritten)
**Types**
- `Scenario = Policies & TestProject & Assumptions`.
- `Policies` {izWhere, izMin, izShare, izAmi, bonus (share, 0 = off), houseLots today|adu|three|four, lots today|pre2025, parking keep|transit|remove, plan, subsidy, abatement ($/home/yr), frequentBus, displacement, transitMi, flood}.
- `TestProject` {type duplex|triplex|fourplex|townhomes|small|apartments|senior, devType market|affordable, units, stories}.
- `Assumptions` {bar 1.5, hardPerSf 300, parkingSpace 15000}.

**Constants**
- `TODAY`, `TEST_TYPES`, `TEST_PROJECT` (40-unit apartments), `ASSUMPTIONS`, `START`.
- `typeFor()`.
- `EXAMPLES` {floodPct 5, creditAmi 60, nearMi 0.5, costSpread 50}; `ABATEMENTS` [0, 1500, 3000]; `SUBSIDIES` [0, 25k, 50k, 100k].
- `PACKAGES`: today, middle, affordable, transit, proposed.

**Zoning and inputs**
- `zoningIn()` → `ZoningRead` {status yes|hearing|no|unknown, lots, hearing, of}. "No" applies only when unread lots ≤ 25%. `noHomes` regex covers the uncomputed districts that allow no housing.
- `capacityOf()`, `transitMiles()`, `spacesFor()` (parking by use).
- Senior mix is 80% one-bedroom. The bonus is offered only where no set-aside is required (market, units ≥ izMin) and taken only if `better()`.

**Running it**
- `runTract`: screens → no data → status `zoning` (money still computed) → displacement screen → works/fails. Gap = (equity − return/bar)/units.
- `runScenario` → `ScenarioRun`, whose `Summary` holds: tracts, capacity, allowed, hearing, zoned, works, tested, breakEven, screened, bonusTaken, homes, affordable, medianGap, riskAffordable, riskMarketOnly, nearTransit, inFlood.
- `costRange()` reruns at ±$50 a sq ft.

**Map classes**
- `ResultClass`/`RESULT_CLASSES`/`resultClass`: works, close, gap50/150/250/More, zoning, screened, nodata.
- `ChangeClass`/`CHANGE_CLASSES`/`changeClass`: nowWorks, better, same, worse, stops, zoning, screened, nodata. Read on the multiple when it moves ≥ 0.01 (0.1 if it works both ways), else on the gap when it moves ≥ $1k.

**Policy effects**
- `LEVER_KEYS`/`LEVER_LABEL`/`moved()`.
- `leverEffects(s, yours)` compares your rules against your rules with that policy reset to today. It counts better/worse tracts with `changeClass`, plus dw, dz, da, dc, dt (bus only) and ds (screened).
- The verdict is gains/losses; screens are always a trade-off.
- `whyNothing()` explains no-effect cases, including the screens case ("with your other choices, no tract is left out").

**Tests:** `lab.test.ts` rewritten, 12 tests.

### Screen: `app/src/components/equity/lab/`
- **`ui.ts`:**
  - `Layer`, `isNeed`, FIELD/CARD/SUB, colors, `n0`/`usdK`/`plural`;
  - RESULT_/CHANGE_ COLOR and WORD, `RESULT_TEXT`, CAP_BINS/CAP_CHANGE and the bin functions;
  - TYPE_SHORT/TYPE_TIP, `projectName`, `EVIDENCE`, `anyMoved`, `answer()`.
- **`LabLevers.tsx`:**
  - "Start from" package buttons and the test project (type, financing, units, stories);
  - groups Zoning / Inclusionary and bonus / Tax breaks and funding / Infrastructure / Your values / Assumptions;
  - each lever is a Segmented with an `info` (i), a status line underneath, a violet left edge when moved, and an "N changed" count per group;
  - a "Back to today's rules" button.
- **`LabResults.tsx`:**
  - the answer card;
  - "Today → your rules" bars in groups (test project, homes, who gains, climate) with hover definitions;
  - "What each policy adds";
  - the tract card (today vs yours grid);
  - the "What is data, and what is assumed" fold;
  - the Opinion button and the footer.
- **`PolicyLab.tsx`:**
  - map layers result / change / capacity (count, or change once a zoning policy moves it) / need, chosen in "The map shows" (optgroups) with a description line;
  - `follow()` auto-switches the layer to one that responds to the moved control;
  - outlines on the result layer; the legend lists classes with counts;
  - tooltips per layer; CSV export with today and yours; `scenarioFacts` for the AI and ChatPill;
  - `useDeferredValue`; helper lines hidden on phones (`max-sm:hidden`).
- In the browser: the layer follows the controls, and the views look right.

### Docs and memory
- `docs/data/policy_lab.md` fully rewritten. Its readings were verified:
  - 40-unit apartments: allowed by right in 60, not allowed in 55, 13 not read; works in 3, breaks even in 3; median gap about $247k; 0–3 tracts across the cost range.
  - Removing parking minimums: better off in 73 tracts, about $17k a unit.
  - Old lot minimums: −7,390 homes by right (44,279 → 36,889).
  - Up to 3 on house lots: 164,542 homes by right; a triplex is allowed in 116 tracts, from 105.
  - Height bonus: taken in 7 tracts.
  - Senior: a hearing in 60 tracts, not allowed in 55.
- README (the Equity & policy bullet plus the "Compares scenarios" line), `docs/TECHNICAL.md`, `docs/data/zoning_capacity.md` (house-lot fields) and the `ProjectCardsDetails.tsx` About text are updated.
- Memory: `visionpitts-update11-review-policylab.md` gained a "Policy lab refined (2026-10-28)" paragraph and the note about the `contents` class; its line in `MEMORY.md` is updated.

## Next step
Give Ye the final report:
- what changed and why it matches the brief;
- the map now follows the controls;
- the new zoning ideas and the test types;
- the key readings;
- checks: tests pass, offline file unchanged, nothing committed.

Caveats to mention:
- Market-rate rarely pencils, so most policies move the gap rather than the count.
- Senior housing always needs a hearing.
- House-lot numbers are zoning room, not homes built.
- The senior cost range of 0–72 tracts reflects the 9% credit cap binding.

If you need specific details from before compaction (like exact code snippets, error messages, or content you generated), read the full transcript at: /Users/ye/.claude/projects/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569.jsonl
Continue the conversation from where it left off without asking the user any further questions. Resume directly — do not acknowledge the summary, do not recap what was happening, do not preface with "I'll continue" or similar. Pick up the last task as if the break never happened.

The messages after this summary are the most recent messages from before compaction, kept verbatim. The summary was written without seeing them, so something it says has not happened yet may already have happened in them.

## You

I am going to do a 5 minutes demo on this tool tmr, either with slides or live demo. can you hlep me to prepare something in the nopush folder please

- *Bash*: List nopush folder and read README
- *Bash*: Check screenshots, docs, routing
- *Bash*: Find deep-link code and existing Playwright script
- *Bash*: Read hash routing and list screenshots
- *Bash*: Read prior Playwright scripts for navigation

## Claude

Writing a screenshot script against the local dev server so the backup slides show the latest build. The script and talk track come after that.

- *Bash*: Capture demo screenshots from the dev server
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/shots/6-lab-today.png
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/shots/3-parcel.png

## Claude

The address change didn't reload the page, so I'll open a fresh page for each shot.

- *Bash*: Rerun screenshot capture with a fresh page per shot
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/shots/3-parcel.png
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/shots/8-lab-middle.png
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/shots/2-explore.png
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/shots/5-compare.png
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/shots/7-lab-parking.png
- *Bash*: Capture the change map and house-lots map shots
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/shots/7b-lab-parking-change.png
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/shots/4-tract.png

## Claude

The screenshots are done. Now I'm writing the talk track and the backup slides.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/README.md
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/slides.html

## Claude

Checking that the slides render.

- *Bash*: Screenshot a few slides for a visual check
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/shots/slide1.png
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/shots/slide3.png

## Claude

I put a demo kit in `nopush/demo/`. I recommend a **live demo**, with slides as the backup. A map tool lands better when people watch it react to clicks. I checked that the slides render.

**What's there**
- **`README.md`:** the 5-minute script. It has a timed table (screen, what to click, what to say), the numbers to have ready, likely questions with short answers, and what to cut if you run long.
- **`slides.html`:** 10 backup slides. Open it in a browser and use the arrow keys or a click to move, and F for full screen. They follow the same order as the live demo, using the screenshots.
- **`shots/`:** fresh screenshots of today's build. They cover Explore, Parcel, Tract, Compare and three Policy lab views.

**The story (5:00)**
1. **0:00 The question:** not "missing middle", but which type, where, for whom, and what changes it.
2. **0:30 Explore Hazelwood:** the facts next to the city and the county.
3. **1:10 Parcel:** 40 affordable units on a real R1A-H lot. The answer is no, with the reasons and fixes. Then switch to Tract: "works with changes", and the tax credit score is what's left.
4. **2:20 Compare:** Hazelwood works with changes; Bloomfield doesn't.
5. **3:00 Policy lab:**
   - Today, the 40-unit market-rate building works in 3 of 128 tracts.
   - With no parking minimums, 73 tracts are better off, but the count stays at 3.
   - With up to 3 homes on house lots, the map switches by itself, and homes allowed by right go from 44,279 to 164,542.
6. **4:20 Close:** facts and values are kept apart, and AI only explains.

**Before you present**
- **The live site doesn't have today's work.** The Policy lab changes, the levels and the review are all uncommitted. Either commit and push tonight and check that the Vercel build passes, or run it locally with `cd app && npm run dev`. Don't use the offline file for this demo: it has the older Equity view.
- **Use a fresh private window** and open the four links listed in the README ahead of time, so each map has loaded once.

## You

Can you do some ultrathink inspect to see if anywhere of the site that doesn't make sense? Please use two /agents, one is a planner and one is a developer to see what might not be useful or helpful on this site. I want you to really some some time interact with the website to give a couple improvement or things to fix. Think through human perspective and uses.

## Claude

I'll start two reviewers in parallel. One works as a City of Pittsburgh planner and the other as a housing developer. Both are target users named in the challenge. Each will use the running site through a browser for real tasks and report what is confusing, wrong or not useful. When they report back, I'll check their main findings myself.

- *Agent*: Planner persona site review
- *Agent*: Developer persona site review

## Claude

Both reviewers are now using the site, one as a city planner and one as a housing developer. When their reports come back, I'll check their main findings against the site myself and give you a short list of fixes and improvements.

- *Bash*: Check land price and expense cap claims in code
- *Bash*: Find suggested land price logic
- *Bash*: Check LIHTC 60% AMI eligibility rule

## Claude

I checked three of the developer's claims in the code, and all three hold:
- **Land price:** the suggested land price is units × $15k (`lib/project/capital.ts:128`).
- **Operating cost:** it is capped at 85% of income (line 125).
- **Tax credit income limit:** nothing checks the 60% AMI limit for tax credit units.

The planner reviewer is still running, and I'll combine both reports when it finishes.

- *Bash*: Verify unknown-zoning handling and weights panel
- *Bash*: Check how unknown zoning is classed

## Claude

Both reviewers spent real time in the browser, about 140 scripted sessions together with no console errors. I checked the main claims in the code, and they hold up. The two reports agree on the main problem: **the site sometimes gives a confident answer that its own screen contradicts.** That hurts trust more than any missing feature.

## Fix first: things a judge or user would catch

1. **Policy lab treats "zoning not read" as allowed.**
   - 13 tracts have zoning the tool can't read (downtown, the riverfront, special districts), and the lab still lets the building "work" there. I confirmed this in `lib/policylab/lab.ts:281` and `:415`.
   - **2 of the 3 tracts where the building works today** (Strip District, South Shore) are among those 13. My demo line "works in 3 of 128" leans on that.
   - The legend has no class for them, so "allowed in 60" sits next to a map with 73 colored tracts.
   - Senior housing has a similar gap: it needs a hearing everywhere, yet 65 tracts show green "Works".
   - **Fix:** a grey "Zoning not read" class and an amber "Needs a hearing" class, both left out of the "works" count.
2. **You can't change the weights online, but the brief asks for it.**
   - "Advanced settings" only appears in the old fallback view (`MatchView.tsx:502`). The online Place view doesn't show it.
   - Three places in the text still say "change it under Advanced settings".
3. **One tract, three "best fits".** Hazelwood says "Best fit: Duplex / triplex", the fold below it says "Small apartment first", and Explore says Small apartment. The PDF says Bloomfield matches an ADU, while the app says ADUs are allowed nowhere.
4. **"Works" on tax credits the project can't win.**
   - The Tract verdict says "Works with changes" and "No equity needed" because of $14M of credit equity, while the same screen shows 20 of 205 points against a minimum of 120.
   - Find places says "closes · 9% credits" on rows whose best case is still under 120.
   - At 80% AMI the project gets full credits, but credit units must be at or below 60% AMI. I confirmed there's no check for that.
5. **Parcel defaults ignore the lot.**
   - A 2,800 sq ft R1A-H lot opens with 40 units, 4 stories and $16.5M.
   - Land is suggested at $15k × units (`capital.ts:128`), so the same lot is $600k at 40 units and $15k at 1.
   - Review never checks floor area at Parcel; the "too big for the lot" warning hides under Open space.
   - Clicking "Use 1 unit" turns the tax credit deal into a 1-unit project that "works".

## Money logic (developer view)

6. **Operating cost is capped at 85% of income** (`capital.ts:125`). At 30% AMI, cash flow goes negative by year 7 while the tile stays green.
7. **The loan is interest-only**, which makes DSCR look better than it is: 1.23 would be about 1.09 with a 35-year loan. Find places and Place also size the loan differently.
8. **Tax credit deals are judged like market deals:** an equity multiple and a sale in year 7, despite the 15-year compliance period. Showing "Gap to fill", DSCR and cash flow would fit better.
9. **"What each policy adds" says "No effect" for both policies when two overlap.** For example, a subsidy and an abatement that each close the same 8 tracts on their own.

## Find places

10. **It doesn't follow the project.** A market fourplex still shows 9% credit rows, and the type filter doesn't filter. Names repeat with no tract number (Bloomfield ×5). Oakland student tracts rank first for tax credits. The "by right" filter is off by default.

## Smaller items, or things to cut

- **Policy lab:**
  - The "Missing middle" package still tests the 40-unit apartment building, so it reports "same as today".
  - Turning inclusionary zoning off is badged "Works" with no mention of affordable homes lost.
  - "Homes with an income limit 0 → 4" reads like citywide output, but it counts one test building per tract.
- **Labels:**
  - "Renter income +121%" is really household income.
  - The Hazelwood "demo" badge looks like sample data.
  - Code paths show on screen ("lib/place/recommend").
  - Flood and ADU rules are labeled "ANTI-DISPLACEMENT RULE".
- **Exports:**
  - The Compare PDF shows sections the screen no longer has.
  - It puts "City of Pittsburgh" where a letterhead goes, so it could pass for a City memo. Worth changing.
  - The Place CSV has no inputs or rents.
  - Mixed use gives the same numbers as Affordable.
- **Phone:** the Policy lab results cover the controls, and the map is hidden.

**What works well (both agreed):** the zoning reasons are exact with code citations, and the Apply fixes work. Sources and uses check out line by line. The PHFA score sheet is strong. Compare matches Place exactly. The Policy lab arithmetic agrees with itself, and the "What is data, and what is assumed" panel is good.

**For tomorrow's demo:** items 1 and 4 touch the script. Unless I fix them tonight, say "works in 3 tracts, 2 of them in districts the tool can't read". At Tract level, say "the money works only if it wins tax credits, and it scores 20 of the 120 needed" instead of "the loan carries it".

The screenshots are in `/private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/review-planner/` and `/private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/review-developer/`. I haven't changed any code.

Should I fix items 1–5 tonight before the demo? Item 1 would also update the demo numbers.

## You

can you fix right now, ultrathink to finish everything at product level please

## Claude

I'll map the code areas first so the work can be split cleanly. The offline file has only 38 bytes to spare, so I need to know which files go into it.

- *Bash*: List online-only modules and key folders
- *Bash*: Show working tree status and offline file size

## Claude

Before anything changes I'll take a backup copy of the uncommitted work. It goes in the scratchpad, not git.

- *Bash*: Back up work tree and size key files
- *Bash*: Read capital model header and loan logic
- *Agent*: Fix money model issues
- *Agent*: Fix project review and Place exports
- *Agent*: Fix Find places issues
- *Agent*: Fix site consistency and labels

## Claude

Four agents are running. I'm starting on the Policy lab fixes now.

- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/policylab/lab.ts
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/equity/lab/PolicyLab.tsx
- *Bash*: Inspect MapView selection zoom and RightColumn
- *Bash*: Read MapView fly-to-selection logic
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/equity/lab/LabResults.tsx
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/equity/lab/LabLevers.tsx

## Claude

An important correction for the agents: the Tailwind stylesheet is shared, so a new class name in any file, online-only ones included, adds bytes to the offline file. I'll tell all four now.

- *SendMessage*
- *SendMessage*
- *SendMessage*
- *SendMessage*

## Claude

Now the Policy lab engine. First: tracts with unread zoning, and tracts that need a hearing, get their own status and are left out of "works by right".

- *Bash*: Add hearing and unread statuses to the lab engine

## Claude

Next, "What each policy adds". It needs to catch overlapping policies, count lost set-aside homes, and use badge words that can't be mistaken for "works".

- *Bash*: Rewrite lever effects with overlap and set-aside accounting

## Claude

Now the words, colors and the answer text in `ui.ts`.

- *Bash*: Update lab words, colors and answer text
- *Bash*: Make cost range follow the headline count

## Claude

Now the results panel.

- *Bash*: Update lab results and package wiring, then type-check
- *Bash*: List MapView optional props and zoom constants
- *Bash*: Cap lab zoom, phone layout, update AI facts
- *Bash*: Check default map view zoom
- *Bash*: Type-check and run the lab tests

## Claude

The lab tests pass. I'll read them and add cases for the new behavior.

- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/policylab/lab.test.ts
- *Bash*: Add lab tests for statuses, set-aside and overlap

## Claude

The lab tests pass. Now a quick check of the live lab.

- *Bash*: Check the lab's answer, legend and effects in the browser
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/lead/lab-phone.png
- *Bash*: Survey policy lab doc sections
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/docs/data/policy_lab.md
- *Bash*: Update the Policy lab doc for new statuses and verdicts
- *Bash*: Note click and phone behavior in the doc

## Claude

The Policy lab fixes are done and checked in the browser, and its method doc is updated. Four agents are still working on the money model, the project review and exports, Find places, and consistency across the site. When they finish, I'll:
1. Recheck the lab against their new money model.
2. Run all tests.
3. Rebuild the offline file and keep it under 6 MB.
4. Go through every screen in the browser.
5. Update the demo kit numbers.

- *SendMessage*

## Claude

The Find places fixes are in: the list follows the project, each row shows its tract number, and a row's money now matches its Place view. One item is not done: there is no student data in the repo to flag the Oakland student tracts. I've asked the review agent to remove the duplicated read logic once its own fixes are done. Three agents are still running.

## Claude

The consistency fixes are in, and they freed 133 bytes in the offline file.
- **Weights:** the weight controls are back online, and the export no longer looks like a City document.
- **One answer everywhere:** Place, Explore and Compare now give the same suggested type for a tract.
- **Labels:** the household income and renter household figures are labeled correctly.

One decision is yours, and I'll include it in the final report. Today the weights reorder the fit list but never change a tract's suggested type. Letting them change it is a one-line change, but it would also change the Balanced default; Hazelwood, for example, would become Small apartment. I'm leaving the method as you designed it unless you say otherwise.

The money agent and the review agent are still running.

## You

<task-notification>
<task-id>a2652ad6dae1ab683</task-id>
<tool-use-id>toolu_01VuxcsB4nQuJf9ddy6ohBMo</tool-use-id>
<output-file>/private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/tasks/a2652ad6dae1ab683.output</output-file>
<status>completed</status>
<summary>Agent "Fix site consistency and labels" finished</summary>
<note>A task-notification fires each time this agent stops with no live background children of its own. The user can send it another message and resume it, so the same task-id may notify more than once.</note>
<result>This agent's report was delivered to you as a message from "a2652ad6dae1ab683" (its SubagentHandback call). Read it there; it is not repeated here.
</result>
<usage><subagent_tokens>377008</subagent_tokens><tool_uses>155</tool_uses><duration_ms>2492115</duration_ms></usage>
</task-notification>

## Claude

The money model has landed. Now I'll fit the Policy lab to it. Credit deals no longer have a multiple, so the lab must judge them by the gap and cash flow.

- *Bash*: Inspect new pro forma result fields
- *Bash*: Adapt the lab to the new credit framing
- *Bash*: Recheck lab numbers after the money changes
- *Bash*: Say when hearing tracts all fall short

## Claude

While the review agent finishes, one leftover: a "demo neighborhood" label in the tract search.

- *Bash*: Find demo label in tract search
- *Bash*: Replace demo wording (same length)

## Claude

The search label now reads "Or try one of these places:", which is also a few bytes shorter. I'm waiting on the review agent, the last one still running.

## Claude

All four agents are done. I'll close the last loose ends they flagged:
- the Capital tile shows a green "No gap" even when the credits can't be won;
- a "Test as Affordable" fix appears on 1-unit lots;
- "Exit cap" is still listed for tax credit deals.

- *Bash*: Locate capital tile, exit cap and affordable fix
- *Bash*: Read surrounding code for the three fixes
- *Bash*: Find the credit floor constant and No-gap tile
- *Bash*: Read the capital tile function
- *Bash*: See tile context and score best-case fields
- *Bash*: Amber capital tile until credits are won; drop exit cap for credit deals

## Claude

I'm closing those loose ends now: the capital tile now stays amber until the credits are won. Next I'll remove the second "Exit cap rate" for credit deals in the export.

- *Bash*: Find report input context
- *Bash*: Drop exit cap for credit deals in export; run all tests

## Claude

All 656 tests pass and the type check is clean. Now I'll rebuild the offline file and check its size.

- *Bash*: Build the offline file and check size

## Claude

The offline file is 5,999,844 bytes, 156 under the 6 MB limit. Now a browser pass over every screen, which also gives the demo kit its new screenshots.

- *Bash*: Walk every screen and refresh demo screenshots

## Claude

Problem: the parcel's lot-sized suggestion (1 unit) carries over to Tract level, where there is no lot. At Tract the default project should come back. I'll check how the suggestion is stored.

- *Bash*: Find lot-suggestion state in project store
- *Bash*: Read suggestForLot and its callers
- *Bash*: Find callers and level setter
- *Bash*: Read setLevel and the lot-suggestion hook
- *Bash*: Find side exports and setPlan signature
- *Bash*: Find PlanState homes type
- *Bash*: Check homes field and imports

## Claude

I'm stopping the lot-sized suggestion from following you off the Parcel level. Leaving Parcel brings back the default project unless you typed the values yourself.

- *Bash*: Drop the lot suggestion when leaving Parcel level
- *Bash*: Read draft test pattern
- *Bash*: Test dropping the lot suggestion
- *Bash*: Re-walk Tract and Find places
- *Bash*: Find the score range computation
- *Bash*: Read score range logic
- *Bash*: Read credit verdict logic and range.high uses
- *Bash*: Find all uses of the score's best case
- *Bash*: See finder's reach logic and review score input

## Claude

The finder already computes this true ceiling (`pointsOf(...).most`), so I'll reuse it in the review and the tiles.

- *Bash*: Use the true score ceiling for can't-win verdicts
- *Bash*: Rename variable; read failing test
- *Bash*: Update review test for the true ceiling
- *Bash*: Show the assertion failure
- *Bash*: Fix the assertion and rerun all tests

## Claude

Now I'll walk Parcel, Tract and Compare again to see the verdicts on screen.

- *Bash*: Recheck verdicts after score-ceiling fix
- *Bash*: Rebuild offline file; list docs needing updates

## Claude

The offline file is still 5,999,844 bytes. I'll hand the method docs to one agent with a full list of the changes. Meanwhile I'll update the Policy lab readings, the demo kit and memory.

- *Agent*: Update method docs for fixes
- *Bash*: Compute fresh Policy lab readings

## Claude

One bug: the height bonus moved alone comes out as "Overlaps". That's because "taken in 6 tracts" counts as a change even though nothing else moves. I'll fix it.

- *Bash*: Fix bonus overlap misread and test it

## Claude

Now the readings section of the lab doc, with the fresh numbers.

- *Bash*: Refresh readings and money notes in lab doc
- *Bash*: Explain credit test in the bar tooltip

## Claude

Now I'll refresh the demo kit. First, fresh screenshots and the exact Parcel text the script will quote.

- *Bash*: Refresh screenshots and read Parcel fixes
- *Bash*: Find the plural slip
- *Bash*: Fix unit/units plural
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/shots/4-tract.png

## Claude

The screenshots look right. Now the demo script and slides get the new numbers.

- *Bash*: Update demo script and slides with new numbers
- *Bash*: Read the current memory entry
- *Bash*: Record the fixes and open decisions in memory

## Claude

Memory is updated. I'm waiting for the docs agent, then a final round of checks.

## Claude

The docs are done. Final checks:

- *Bash*: Final type check, tests, offline build, pytest

## Claude

I fixed everything both reviewers found except one item, the student tracts, which has no data in the repo. The main change: the site no longer gives a confident answer that its own screen contradicts.

The type check is clean, all 658 app tests and 317 Python tests pass, and the browser walk-through of every screen showed no errors. The offline file is 5,999,844 bytes, 156 under the 6 MB limit. Nothing is committed.

**Policy lab**
- **"Works" means allowed by right.** The 13 tracts whose zoning can't be read (downtown, the riverfront, special districts) are shown in pale amber and no longer counted. Projects that need a zoning hearing get their own class.
- **Today's count drops from 3 to 1.** The 40-unit market-rate building works by right in 1 tract; 2 of the old 3 were in unread zoning. Senior housing needs a hearing everywhere, and a $50k gap subsidy makes it work in 59 tracts.
- **New badges:** Helps / Trade-off / Hurts / Overlaps / No effect. "Overlaps" covers two policies that close the same gap, such as a subsidy and an abatement. Turning inclusionary zoning off now counts the affordable homes lost.
- **Smaller fixes:** "Missing middle" now tests a triplex. Clicking a tract keeps the city in view. On a phone, the controls and the results take turns.

**Money model**
- **The loan is paid down over time:** 35 years for tax credit deals, 30 for market. Setting it to 0 gives back your class version, interest-only.
- **Operating cost is a fixed amount a unit, with no cap.** The cap used to hide negative cash flow.
- **Land is priced from the lot:** lot sq ft × $20, as an example.
- **Tax credits:** only units at or below 60% AMI earn them. Credit deals are judged on the gap left and 15 years of cash flow, with no sale.
- **Also new:** mixed use includes ground-floor shop income, and a rent table shows the rent used for each unit size.

**Review and Find places**
- **Fit on the lot:** every level now checks whether the building fits on the lot.
- **No tiny credit deals:** fixes never cut a tax credit deal below 12 units.
- **Tax credit verdict:** "Doesn't work" appears only when no possible score can reach PHFA's 120.
- **Lot suggestions:** picking a lot suggests units and stories that fit it.
- **Find places follows your project.** Each row's money matches its Place view, and rows show the tract number.

**Consistency**
- The weight controls are back online, and Place, Explore and Compare give the same suggested type for a tract.
- The labels are corrected (household income, renter households, small samples marked).
- The Compare export says "Not a City document".

**Demo tomorrow:** the script, slides and screenshots in `nopush/demo/` are updated to these numbers. The live site still doesn't have any of this, so commit and push tonight or demo from localhost.

**Decisions for you**
1. **Should the weights change which type is suggested?** Today they only reorder the fit list. Changing that is one line, but it shifts the Balanced defaults; Hazelwood would become Small apartment.
2. **Keep or drop Explore's "Weighted fit by preset" maps?** I renamed them so they no longer read as the suggestion.
3. **Student tracts in Oakland** still rank high for tax credits, because there is no student data. Adding the census student table to the pipeline would allow flagging them.

The method docs, the README and memory are updated. A backup of everything from before these fixes is at `/private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/backup-before-fixes.tgz`.

## Summary of earlier conversation

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.


Summary:
## Standing constraints (from the user and memory; keep)
- **Ye commits their own work. Never git commit or push.** (Also: no stash, checkout, reset or restore.)
- Never mention the Hack a House/AI Housing folder or a prototype. Deepblue is never named, and none of its code is copied.
- Published contact is only the UPenn email and LinkedIn.
- Ask Ye before raising the 6 MB offline mark (`export/index.html` ≤ 6,000,000 bytes).
- Public data only. Lot facts only: never owners, addresses on record, values or sales.
- Keep Export; no Save & share.
- **Credentials:** Ye earlier pasted a Claude key starting `sk-ant-usr-`. I did not store or enter it. I told Ye to set `ANTHROPIC_API_KEY` themselves (in Vercel and `app/.env.local`), that it may not be a Messages API key (those start `sk-ant-api`), and to consider rotating it. Never type or store keys.
- Ye wants wording kept simple and short. Compare places keeps its own non-floating layout.
- New Tailwind class names anywhere, online-only files included, add CSS bytes to the offline file. Reuse existing classes or use inline styles.

## Environment
- App: `/Users/ye/Documents/Ye-Zhang-Vision-Pitts/app` (React, Vite, TypeScript, zustand, Tailwind). Dev server: background task `b0w3z9ezf` at `http://[::1]:5288`.
- Python: `PYTHONPATH=src uv run --no-sync python ...`.
- Playwright: `/Users/ye/node_modules/playwright`. Open a new page or context per deep link, because a hash-only change doesn't reload the app.
- Scratchpad `S=/private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad`:
  - Backup taken before the fixes: `$S/backup-before-fixes.tgz` (app/src, app/api, src, scripts, tests, docs, README, export).
  - My scripts: `$S/lead/lab.cjs` and `$S/lead/all.cjs`. The latter walks every screen and writes the demo screenshots.
  - Reviewer and agent artifacts: `$S/review-planner/`, `$S/review-developer/`, `$S/fix-money/`, `$S/fix-review/`, `$S/fix-finder/`, `$S/fix-consistency/`.
- Online-only paths are listed in `ON_DEMAND` in `app/src/lib/lazyGuard.test.ts`. The deep links, the hooks such as `[data-lab-answer]` and the names Hazelwood (tract 42003562300) and Bloomfield (42003080200) are used throughout.

## Conversation flow
1. Earlier work (before this context): the Policy lab rebuild per the Track 3 brief. A final report was given.
2. **Demo prep (user: "5 minutes demo tmr… prepare something in the nopush folder").** Created `nopush/demo/` (`nopush` is git-ignored):
   - `README.md`: run of show with timings, what to click and say, numbers, likely questions and backup.
   - `slides.html`: 10 backup slides; arrow keys or click to move, F for full screen.
   - `shots/`: screenshots.

   I recommended a live demo. Warning: the live Vercel site lacks the uncommitted work, so Ye should push tonight or run `cd app && npm run dev`. Don't use the offline file, which has the old Equity view.
3. **Review (user: "ultrathink inspect… use two /agents, one is a planner and one is a developer…").** I ran two persona agents, a city planner and a housing developer, through Playwright and gave Ye a ranked list. I verified key claims in code before reporting.
4. **Fix (user: "can you fix right now, ultrathink to finish everything at product level please").** I split the work across four agents (money, review/exports, finder, consistency), did the Policy lab myself, then used a docs agent. All finished.

## Fixes made (all uncommitted)

**Policy lab** (me: `lib/policylab/lab.ts`, `components/equity/lab/{ui.ts,LabResults.tsx,LabLevers.tsx,PolicyLab.tsx}`, `lab.test.ts`)
- **Statuses:** `Status` adds `'hearing' | 'unread'`; `TractOutcome.pencils`. Zoning `unknown` maps to `unread`, and `hearing` maps to `hearing`; the money is still computed for both.
- **Summary** adds:
  - `worksHearing`, `unread`, `unreadPencils`, `asked`, `askedHomes`;
  - `works` = by right only; `tested` = works + fails + hearing.
- **Map classes:**
  - `ResultClass` adds `hearingWorks` (#0891b2) and `unread` (#fde68a, "Zoning not read"); `zoning` now reads "Not allowed".
  - `ChangeClass` adds `unread`, plus `builds()` and `zoningRank`.
- **Cost range:** `headline()` = works, or worksHearing when nothing is allowed by right (senior); `costRange` uses it.
- **`leverEffects`:**
  - Rewritten with `compare()`.
  - `Verdict` adds `'overlap'`. `VERDICT_WORD`: Helps / Trade-off / No effect / Hurts / Overlaps.
  - Overlap is set only when the policy alone has gains or losses. A bonus "taken in N tracts" with nothing else becomes "…, but nothing else changes."
  - Set-aside homes asked count as a gain or loss, so IZ off reads as a trade-off.
  - `whyNothing(id, s, run)` takes the run.
- **Credit tests** use `run.gap` and `firstNegative` (no multiple); the "why" text says so.
- **Packages:** `PACKAGES[].project`; Missing middle tests a triplex.
- **`answer()`** rewritten:
  - lead "works by right in N", or for senior "allowed by right nowhere: needs a hearing in N";
  - lines for hearing, unread tracts, the credit-cap note and the credits-assumed note;
  - "Even with a hearing, the money falls short everywhere."
- **Results panel:** the IZ evidence line shows only when IZ or bonus is moved. Bars are relabeled ("works by right", "with a hearing", "in the test buildings").
- **Map and phone:** `onMapReady={(m)=>m.setMaxZoom(12.5)}` keeps the city view. On phone, the controls and results take turns ("See the results"), and the results/ChatPill are hidden while the rail is open.
- 16 lab tests pass.

**Money** (agent: `lib/pencil/simple.ts`, `lib/project/capital.ts`, `CapitalCard.tsx`, `useCapital.ts`, `CapitalInputs.tsx`)
- Land = lot sq ft × $20 (example), falling back to $15k a unit.
- Opex $/unit with no cap ($7,000 credit / $6,850 market).
- Amortizing loan: `amortYears` 35 credit / 30 market, 0 = interest-only. The loan is sized at 1.15× with cash flow above zero for 15 years.
- `creditUnits`: credits only for units at ≤60% AMI.
- Credit deals: 15 years, no sale or multiple; the leftover line is "Gap to fill".
- Mixed-use commercial at $18 a sq ft, 10% vacancy.
- Rent table, editable.
- New `simpleProForma` inputs: `amortYears`, `opexPerUnit`, `units`, `years`, `sale`, `commercialSf`/`Rent`/`Vacancy`/`CostPerSf`.
- New result fields: `gap`, `firstNegative`, `saleCounted`, `payoff`, `debtService`, `income`.
- Finder should call `runCapital(capitalContext(m, devType, lotSqft), overrides)`.

**Review/exports** (agent)
- "Fits on the lot" check (`lib/zoning/check.ts`, `openFit`).
- `MIN_CREDIT_UNITS = 12`, with alternatives offered (Market rate if it works, Tract level, Find places).
- Lot picks suggest units and stories (`suggestForLot` in `lib/project/draft.ts`).
- The Place PDF leads with the project; the CSV is complete.
- `projectRead()` is a pure function, used by `lib/finder/read.ts`.

**Lead follow-ups**
- Capital tile reads "No gap if credits are won": amber, or red when out of reach.
- Exit cap is omitted for credit deals (two places in `ProjectResults.tsx`).
- The "Test it as Affordable" fix requires ≥12 units.
- `dropLotSuggestion(side)` in `draft.ts` is called from `setLevel` (`LevelSwitch.tsx`) when leaving Parcel, and tested.
- Credit verdict uses `most` = `pointsOf(s).most` (from `lib/finder/rank.ts`), which counts every sheet line including team, partners and site:
  - `most` < 120: stop.
  - `high` < 120 ≤ `most`: warn, "works with changes; the other N from team, partner and site lines".
  - Wired into `useReview.ts`, `review.ts` (`score.most`), the `ProjectResults` tiles (`credMost`) and tests.
- Fixed "1 units" plural.
- TractSearch "demo neighborhood" is now "Or try one of these places:".

**Finder** (agent)
- Driven by the project inputs.
- Market math fixed.
- Honest PHFA line, with a 4% path.
- "Bloomfield · Tract 802" names.
- Row click opens Tract level.
- By-right filter on, using the verified check.
- Same money as Place.
- Not done: no student data, so no student flag.

**Consistency** (agent; offline net −133 bytes)
- "What matters most" + Advanced settings in `PlaceRail`; weights used in Place and Compare, carried in the URL as `w=`.
- One suggested type everywhere; Explore's "Weighted fit by preset" layers are renamed.
- Labels: household income, renter households, source years.
- "demo" badge and code paths removed; rule labels fixed.
- Small-sample stars in Explore lists.
- Compare PDF/CSV lead with the project; letterhead says "Not a City document".

**Docs**
- Me: `docs/data/policy_lab.md` (statuses, verdicts, phone, readings).
- Agents: README, `docs/TECHNICAL.md`, `docs/assumptions.md`, `docs/data/parcel_level.md`, `project_review.md`, `finder.md`. `pencil.md` was left alone (a different model).
- Memory: the `visionpitts-update11-review-policylab.md` evening-fixes paragraph and its `MEMORY.md` line updated (156 bytes left).

**Demo kit:** README script, numbers, Q&A and slide captions updated; screenshots refreshed (`7-lab-parking.png` removed; `9-finder.png` added).

## Final verification (last step)
- tsc clean; vitest 70 files, 658 tests passed; pytest 317 passed.
- `npm run export` gives `export/index.html` of 5,999,844 bytes (156 under).
- Playwright walks showed no console errors. HEAD is still `0ecf8db`, nothing committed.

## Key readings now
- **Policy lab, 40-unit market rate:**
  - works by right in 1 of 128 tracts;
  - by right in 60, not allowed in 55, unread 13 (money works in 2 of those);
  - median gap about $240k a unit; range 0–1.
- **Lab policies:**
  - No parking minimums: 60 tracts better off (about $17,918 a unit), still 1 works.
  - Old lot minimums: 44,279 → 36,889 homes by right.
  - IZ 20% citywide: trade-off (1,024 homes asked vs 68; −1 tract; 55 worse off).
  - Up to 3 on house lots: 164,542 homes by right; triplex by right in 116 tracts (from 105).
  - Bonus taken in 6 tracts.
  - Senior: hearing in 60 tracts, not allowed in 55, works with a hearing in 0, median gap about $15k; with a $50k subsidy, 59.
- **Place:**
  - Hazelwood Parcel lot 56-P-285-0-1 (2,800 sq ft R1A-H) suggests 1 unit, 2 stories; Affordable reads "Doesn't work as is: too small for tax credits".
  - Tract, 40 affordable units: Works with changes; RM-M 18,600 sq ft lot; "No gap if credits are won"; 20 of 205 points, needs 120, design and financing reach 90, up to 190.
- **Compare:** Hazelwood works with changes; Bloomfield doesn't (height over LNC's 3 stories / 45 ft).

## Open items / next step
Give Ye the final report:
- what was fixed, grouped by area;
- checks passed;
- the offline file at 5,999,844 bytes;
- nothing committed;
- the demo kit updated, with new numbers (works by right in 1, not 3);
- the live site still needs a push for the demo.

Decisions for Ye:
1. Should the weights change the suggested type? (One line in `orderByLead` in `lib/place/recommend.ts`; it would change the Balanced defaults, e.g. Hazelwood becomes Small apartment.)
2. Drop Explore's "Weighted fit by preset" layers?

Known gaps:
- no student data (would need ACS B14007);
- the ZIP level isn't PHFA-scored;
- the Policy lab land is still $15k a unit (it has no lot);
- someone who typed exactly 4 stories before their first lot pick gets them replaced;
- `ProjectPanel.tsx` may be unused;
- the `zoning_capacity.md` diff predates this work.

If you need specific details from before compaction (like exact code snippets, error messages, or content you generated), read the full transcript at: /Users/ye/.claude/projects/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569.jsonl
Continue the conversation from where it left off without asking the user any further questions. Resume directly — do not acknowledge the summary, do not recap what was happening, do not preface with "I'll continue" or similar. Pick up the last task as if the break never happened.

The messages after this summary are the most recent messages from before compaction, kept verbatim. The summary was written without seeing them, so something it says has not happened yet may already have happened in them.

## You

are there anything else that you need to run, please run, show on local host

- *Bash*: Check dev server is up and HEAD

## Claude

Server is up. I'll run one last pass, including the production build Vercel will run.

- *Bash*: Type check, tests, production build

## Claude

All green. Now I'll open the four demo screens in your browser.

- *Bash*: Open the four demo links in the browser

## Claude

Nothing else needs running. The four demo screens should now be open as tabs in your default browser, served by the local dev server at `http://localhost:5288`:

1. Explore, Hazelwood: `localhost:5288/#m=explore&u=tract:42003562300`
2. Place, the Hazelwood lot: `localhost:5288/#m=place&p=-79.94155,40.40640,Hazelwood`
3. Compare, Hazelwood vs Bloomfield: `localhost:5288/#m=compare&t=42003562300&b=42003080200`
4. Policy lab: `localhost:5288/#m=equity`

**Final checks just now:** the type check is clean, all 658 tests pass, and the production build Vercel will run builds in 6.5 s. Nothing is committed (HEAD is still `0ecf8db`).

**For tomorrow:**
- **Live site:** it still lacks this work. Commit and push tonight and check the Vercel build is green, or demo from localhost.
- **Address:** the demo README uses `localhost:5173`. That's the address if you start the server yourself with `cd app && npm run dev`. Tonight's server is on `5288`, and it stops when this session ends.

## You

what is the reason that you bring back What matters most in Analysis. can we not select on anything, just pure land test. Can you make policy tab's right panel more readble and simple pelase

- *Bash*: See PlaceRail changes and lab file sizes
- *Bash*: Read rest of PlaceRail and diff with backup
- *Bash*: Find weights URL param and other references
- *Bash*: Find docs mentioning What matters most

## Claude

Removing the block from the left panel first.

- *Bash*: Remove What matters most block; read LabResults

## Claude

Left panel done. Now a look at the Policy lab's right panel as it stands.

- *Bash*: Look at existing lab Playwright script
- *Bash*: Screenshot current lab results panel
- *Bash*: Retake screenshot with tall viewport
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/before-middle.png
- *Bash*: Read lab ui helpers and usages
- *Bash*: Find answer() callers and text size classes

## Claude

Tidying the lab's right panel now: a short answer with three headline numbers, and fewer rows below.

- *Bash*: Find answer callers and available text sizes
- *Bash*: See facts builder and text size tokens
- *Bash*: Check which Tailwind classes already exist offline
- *Bash*: Check classes exist in offline CSS

## Claude

Now the edits: `answer()` also returns just the caveat lines, and the panel gets the new layout.

- *Bash*: Split answer lines into notes
- *Bash*: Rewrite lab results panel; type check
- *Bash*: Screenshot new lab panel
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/after-middle.png
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/after-today.png

## Claude

Much shorter. One more tweak: hide "today X" under a tile when it hasn't changed.

- *Bash*: Hide unchanged today line; find text to update
- *Bash*: Check offline picker and doc lines
- *Bash*: Read more doc context
- *Bash*: Update docs and comments for removed picker
- *Bash*: Check AdvancedSettings users and PlaceStudio header
- *Bash*: Fix remaining comments; tsc and tests

## Claude

Tests pass. Now checking the offline file size and the Place left panel, then refreshing the demo screenshots.

- *Bash*: Export offline file; see screenshot script

## Claude

Offline file is unchanged at 5,999,844 bytes. Refreshing the demo screenshots:

- *Bash*: Regenerate demo screenshots
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/shots/3-parcel.png
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/shots/7b-lab-parking-change.png

## Claude

Both look right. Last, the demo notes' Q&A about weights:

- *Edit*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/README.md
- *Bash*: Find memory lines about weights
- *Bash*: Update project memory with Ye's decision

## Claude

I took "What matters most" off the Place panel. I also simplified the Policy lab's right panel to one sentence, three numbers and short notes.

**Why it came back:** in the review, the city-planner reviewer found that the suggested type depended on weights you couldn't see or change online. Place and Compare could then show different suggestions for the same tract. The agent fixing consistency put the picker back so the weights would be visible. I should have asked you before restoring something you'd removed.

**Place is now a plain land test.** The left panel goes straight from the address to Site, Project, Capital and Policies, with nothing to pick for priorities.
- **Browse inputs gone too:** I also removed the Income level and Residents buttons the agent added to Browse. Browse now uses the income level from your project.
- **Suggested type:** Place and Compare use the published Balanced weights everywhere. The offline file keeps its own picker; I didn't touch it.
- **Old links:** a link that already carries weights (`w=` in the address) still applies them, now without a visible control. New links don't carry any.

**Policy lab right panel, top to bottom:**
1. **The answer:** one sentence, then three numbers: tracts where it works, tracts where zoning allows it, and the median gap a unit. Each number turns green or red when your rules move it, with today's value under it only when it changed. Two or three short notes cover unread zoning, the cost range and the credits.
2. **What each policy does:** shown only once you move a policy, with the Helps / Trade-off badge. Hovering the badge explains it, so the legend paragraph is gone.
3. **The tract you click:** today and with your rules, as before.
4. **More numbers:** the ten pairs of bars became a three-column table (label, Today, Yours). Rows that are zero both ways are hidden, which usually leaves three.
5. **The rest:** "What is data, and what is assumed" (it now holds the old footer line) and the second-opinion button.

**Checks:**
- The type check is clean and all 658 tests pass.
- The offline file is unchanged at 5,999,844 bytes.
- No console errors.
- The demo screenshots in `nopush/demo/shots/` are retaken.
- I updated the docs, the demo Q&A answer about weights, and memory.

The dev server on `localhost:5288` already shows all of this; refresh your tabs. Nothing is committed.

## You

UIUX fix, when i open the vision chat, the right panel should shift down and leave space for the chat box

- *Bash*: Find chat pill and its open state
- *Bash*: Read ChatPill
- *Bash*: Find chat pill placements and right panels
- *Bash*: Read PanelFrame and chat placement contexts

## Claude

The chat box floats over the right panel because it's absolutely positioned. I'll put it in the column's normal flow, so the panel below moves down and shrinks to fit.

- *Bash*: Make chat box flow in the right column

## Claude

Checking it on each view with the chat open:

- *Bash*: Screenshot each view with chat open
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/chat-place.png
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/chat-explore.png
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/chat-compare.png

## Claude

Place and Explore now push the panel down. Compare has no right column, so its chat still covers B's map. I'll fix that separately.

- *Bash*: Read Compare layout and Strip
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/chat-lab.png
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/chat-place-phone.png
- *Bash*: Find strip B and react imports
- *Bash*: Add onHeight to chat; push Compare strip B
- *Bash*: Add state, type check, re-screenshot
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/chat-compare.png

## Claude

Compare works now: B moves down while the chat is open. Final checks:

- *Bash*: Run tests and check offline size
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/chat-place-narrow.png

## Claude

At 1000 px the chat box sticks out past the narrower column. I'll cap it to the column's width:

- *Bash*: Cap chat width to column; re-screenshot
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/chat-place-narrow.png
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/chat-compare.png

## Claude

The right panel now moves down when the chat opens and moves back up when it closes. I checked it with screenshots on Place, Explore, the Policy lab, Compare, a 1000 px wide window and a phone, with the chat open.

- **Place, Explore and Policy lab:** the chat box now sits above the right panel instead of over it. The panel starts below the chat and gets shorter to fit. The space follows the box, so it grows when a conversation gets longer.
- **Compare:** this view has no right panel. B's column (search, map, settings) moves down by the chat's height instead.
- **Narrower windows:** the chat box keeps to the column's width, so it no longer sticks out on the left at 1000 px.

If a conversation gets very long, the panel under it gets short. I didn't set a minimum height for it.

All 658 tests pass, the offline file is unchanged at 5,999,844 bytes, and there were no console errors. The changes are in `app/src/components/ChatPill.tsx` and `app/src/components/compare/CompareStudio.tsx`. Refresh `localhost:5288` to see it. Nothing is committed.

## You

can you move zoning district and lanuse into data layer please

- *Bash*: Find zoning district and land use in Explore
- *Bash*: Read DataPanel and LayersPanel
- *Bash*: Check layer conditions in ExploreView

## Claude

Zoning districts and the Land-use map are switches under Boundary today, and repeated inside two Data groups. I'll put them once, at the top of Data next to Sun and shadow.

- *Bash*: Move switches into the Data panel; type check
- *Bash*: Check other sun switch and doc/tour references
- *Bash*: Find docs describing where the switches live

## Claude

Nothing in the docs needs changing. Checking it in the browser, then running tests and the offline size check:

- *Bash*: Test switches in Data panel
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/layers.png
- *Bash*: Find all browser storage use
- *Bash*: Read chat storage, project store, hash parse
- *Bash*: Find hash load, chat save, project sites
- *Bash*: Read hash apply, chat save, Site type
- *Bash*: Inspect Site type and lot stores
- *Bash*: Check what UI storage keeps
- *Bash*: Read setMode auto-selection

## Claude

The Policy lab and Compare also pick example places when you open them, so the lab shows a tract you never clicked. I'll remove that too.

- *Bash*: Apply fresh-start changes
- *Bash*: See unused lines
- *Bash*: Fix unused; tsc and tests

## Claude

Tests pass. Now a browser check of each case: old saved chat and lots, a reload, and opening the Policy lab and Compare.

- *Bash*: Test fresh start behaviour in browser

## Claude

Old chats and old lot picks are gone, and a reload opens with nothing selected. One leftover: after a reload the address bar still lists the old tract. I'll clear that too.

- *Bash*: Clear stale selection from address bar on reload
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/fresh-equity.png
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/fresh-compare.png

## Claude

Fresh start works everywhere: the Policy lab opens with no tract card, and Compare opens empty with "Pick two places". Checking the offline file, then I'll write the talk script.

- *Bash*: Tests, offline size, offline page errors

## Claude

All passing; the offline file shrank to 5,998,526 bytes. Now writing the talk script and questions into `nopush/demo/`.

- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/talk.md
- *Bash*: Fix wording; add reload warning to demo README
- *Bash*: Save fresh-start rule to memory

## Claude

I did all three: the map layers moved, every visit now starts fresh, and there's a talk script with audience questions in `nopush/demo/talk.md`. All 658 tests pass and no screen showed errors online or offline. The offline file is now 5,998,526 bytes, smaller than before. Nothing is committed.

**1. Zoning districts and Land-use map are under Data now.** They're gone from Boundary and from inside the two variable groups. Data now starts with three switches: Sun and shadow, Zoning districts and Land-use map. The land-use map needs a boundary open; until then its switch is greyed out and says so.

**2. Every visit starts fresh:**
- **AI chat:** no conversation is kept or brought back. Any chat saved by the older version is deleted on first load.
- **Lots and places:**
  - Picked lots are no longer remembered between visits.
  - A reload, or a tab the browser restores, opens the same page with nothing selected, and the address bar drops the old selection.
  - The Policy lab no longer picks a tract for you, and Compare no longer fills in two example places; it opens empty with "Pick two places".
- **Still remembered:** project inputs (type, units, costs) and which panels are open. Say if you want those cleared too.
- **Links still work:** opening a link with a place in it, like the demo links, still shows that place. Only a reload clears it.

**3. Talk script (`nopush/demo/talk.md`):**
- a one-line pitch;
- a spoken script of about 5 minutes that follows the demo clicks, with the numbers to say;
- extra talking points if you have time;
- about 25 likely questions with short answers, grouped by data, method, money and tax credits, Policy lab, AI, and use and next steps;
- what to do if something breaks.

**For tomorrow:** I added a warning to the demo README: don't reload the demo tabs, because a reload now clears the selection. If a tab loses its place, open its link again.

Refresh `localhost:5288` to see these changes.

## You

for analysis, can you make capital can be turned off so that poeple would have to worry about money just the zoning and other stuff. open space can also be turned off. make I want to study a fifth purple button please. update it for parcel, tract, and zipcode, also for compare please

- *Bash*: List level files
- *Bash*: Read levels and LevelInputs
- *Bash*: Read PolicyPicker and review engine outline
- *Bash*: Read review input and reviewProject
- *Bash*: Find openShare use and useProjectRead

## Claude

Still on it: reading how the review is put together so I can wire in the Capital and Open space on/off switches.

- *Bash*: Read checkInputFor and projectRead
- *Bash*: Map capital/open usage in ProjectResults

## Claude

Noted. I'll do the Policy lab controls after the Capital and Open space switches.

- *Bash*: Read takeaways and ProjectResults body
- *Bash*: Find takeaway uses in Compare
- *Bash*: Locate insertion points
- *Bash*: Wire capital/open off flags into model and review
- *Bash*: Confirm model carries full project state

## Claude

Now the panel: on/off switches on Capital and Open space, and "I want to study" as its own numbered group.

- *Bash*: Add switches and study group; split policy picker
- *Bash*: Remove unused const; format; type check
- *Bash*: Check formatting didn't churn the file
- *Bash*: Measure churn vs backup
- *Bash*: Look for prettier config
- *Bash*: Reformat with repo-like settings and diff

## Claude

A formatter I ran reflowed the whole policies file, so I'm putting the file back the way it was and redoing only my small edits.

- *Bash*: Restore Policies.tsx and reapply edits minimally
- *Bash*: Hide money/open cards in results; read Compare
- *Bash*: Respect capital-off per side in Compare
- *Bash*: Read export input builder
- *Bash*: See how report uses run

## Claude

Now a browser check of the switches at Tract and Parcel level and in Compare:

- *Bash*: Test switches and groups in browser
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/toggle-tract.png
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/toggle-compare.png

## Claude

The switches work at every level and in Compare. Turning Capital off leaves only the Zoning and Units tiles, and the verdict says "money not checked". Running tests:

- *Bash*: Run tests
- *Bash*: Find test helpers in review tests
- *Bash*: See the thin-capital test
- *Edit*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/review/review.test.ts
- *Bash*: Run review and level tests

## Claude

Capital and Open space are done. Now the Policy lab's left-panel controls.

- *Bash*: Read LabLevers
- *Bash*: Read the left panel and packages
- *Bash*: Find map-layer labels and packages
- *Bash*: Read package labels and test refs
- *Bash*: Read layer line and label references
- *Bash*: Find label references across repo
- *Bash*: Shorten Policy lab controls
- *Bash*: Screenshot the lab controls
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/levers.png

## Claude

Much easier to scan. Updating docs, then the final checks:

- *Bash*: Update docs; run tests and export
- *Bash*: Note changes in project memory

## Claude

I made all three changes, and they work at Parcel, Tract and ZIP code and on both sides of Compare. All 659 tests pass, including a new one checking that the money stays out when Capital is off. The browser checks showed no errors, and the offline file is unchanged. Nothing is committed.

**1. Capital can be turned off.** The Capital heading now has an On/Off switch.
- **When off:** the left panel says "Off: the money is not checked. Zoning, the lot and the area still are." The review drops the money, tax-credit and "too small for tax credits" checks.
- **The verdict** is based on zoning, the lot and the area only, and says "money not checked". For the 40-unit Hazelwood project at Tract level it reads "Works".
- **The right panel** shows just the Zoning and Units tiles. The Capital and Tax credits tiles, the capital card and the score meter are hidden.
- **In Compare,** a side with Capital off shows "Off" in its money rows. With both sides off, the money rows and capital stacks disappear.

**2. Open space can be turned off.** It has the same switch. When off, no open space is set aside on the lot, so the fits-on-the-lot check uses 0%, and the "Open space and sun" card is hidden.

**3. "I want to study" is its own numbered purple group.** Tract, ZIP code and Compare now read: 1 Project, 2 Capital, 3 Open space, 4 Policies (what applies here), 5 I want to study. At Parcel it comes sixth, because Site is first.

**4. Policy lab controls are shorter.**
- **Packages:** one short line each, such as "Triplexes, less parking" or "Bills before the City".
- **Each policy:** the long sentence under it is now a small coloured tag (In force, Proposed, Idea, Your value) plus a few words, for example "1 space a home (2+ homes)". The full rule and its source are in the (i) tooltip, so nothing was lost.
- **Groups:** the subtitles are gone, and headings are shorter: Affordable homes asked, Money, Transit, Where not to build, Assumptions (examples).
- **Renamed:** "Height bonus", "Homes on house lots", "Tax credits (9%)", "Tax abatement per home, yearly" and "Gap subsidy per affordable home". The header line and the map description are shorter too. Package names didn't change, so the demo script still matches.

**Not changed:** the Place PDF/CSV export still includes the money section even when Capital is off. Say if you want it left out there too.

I updated `docs/data/project_review.md`, `docs/data/policy_lab.md` and memory. Refresh `localhost:5288` to see it.

## You

can you edit my /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/slides.html  based on my new tool. add my contact, my email yezhang1@upenn.edu, my linkedin, the live url of this site, happy to connect with anyone

- *Bash*: Find LinkedIn URL and live URL
- *Bash*: Check screenshot script setup

## Claude

Refreshing all the demo screenshots, plus two new ones: a zoning-only check with Capital off, and Explore with the land-use map on.

- *Bash*: Regenerate and add demo screenshots
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/shots/10-zoning-only.png
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/shots/11-explore-landuse.png
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/shots/4-tract.png

## Claude

The new screenshots look good. Now rewriting the slides.

- *Bash*: Update slides with new content and contact
- *Bash*: Render slides and check for missing images
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/slide-13.png
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/slide-7.png
- *Bash*: Check README slide refs; add contact to talk

## Claude

I updated `nopush/demo/slides.html` and checked all 13 slides in a browser; every image loads and nothing errors. It now has a closing contact slide and shows the new features.

**New slides:**
- **Map layers under Data** (after Explore): the land-use map on, with the Zoning districts and Sun and shadow switches beside it.
- **Zoning only, if you like** (after the tract slide): Capital turned off, so the check reads only zoning, the lot and the area, and the verdict says "money not checked".
- **Happy to connect with anyone** (last slide):
  - Try it live: ye-zhang-vision-pitts.vercel.app
  - Email: yezhang1@upenn.edu
  - LinkedIn: linkedin.com/in/yezhang03
  - "Ye Zhang · University of Pennsylvania · Thank you"

  The three links can be clicked; clicking one doesn't move to the next slide.

**Updated:**
- All screenshots were retaken from the current build, so the Policy lab slides show the shorter controls and results panel.
- The Compare caption now says "Same inputs on both sides… 4 stories is over LNC's 3".
- The "Facts and values" slide adds "Public data only" and no longer carries the web address; the contact slide does.

**Please check:** I took the LinkedIn address `linkedin.com/in/yezhang03` from the repo, because you didn't give one. Tell me if yours is different.

**Talk script:** the closing line in `talk.md` now points to the contact slide.

The live address only shows the new features once you push tonight.

## You

i just realized something, in parcel level for explore, when you click on it, the right side shows nothing, can you just give the zoning and parcel info please. ultrathink to add this layer

- *Bash*: Read ParcelsSwitch and list Explore files
- *Bash*: Read parcel store, boundary and card
- *Bash*: Read ExploreView top half
- *Bash*: Read ExploreView bottom half

## Claude

Two things to cover: what clicking a lot shows, and how Parcels works with each Data layer. I'll read the lot data and the Data panel code first.

- *Bash*: Read lot layer hook and lot helpers
- *Bash*: Read lots module
- *Bash*: Read usePlaceLots and LotCard
- *Bash*: Read zoning tooltip and zoning exports
- *Bash*: Read zoning standards and helpers
- *Bash*: Read land-use classes and legend

## Claude

Still reading: next is how lots, tracts and the inclusionary overlay are looked up, so the lot panel can show the neighborhood and the overlay.

- *Bash*: Check lot use classes, IZ-O lookup, tract lookup
- *Bash*: Find IZ-O and tract-at-point helpers
- *Bash*: Read pin helpers and lazy guard list
- *Bash*: Find how pins are set
- *Bash*: See address search to lot flow
- *Bash*: See how Place reads a pin into a lot

## Claude

Still on this. I've mapped how lots are loaded and clicked. Next I'll build the lot panel for Explore, then the Browse change you just asked for.

- *Bash*: Find the Best fit on this lot card
- *Bash*: Read the Browse overview panel
- *Bash*: Inspect zoning standards JSON
- *Bash*: Find Overview use and canopy layer wiring
- *Bash*: Read SiteDetail and group references
- *Bash*: Check available flag, frameLevel, canopy wiring
- *Bash*: Read the draft module
- *Bash*: Read the side abstraction
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/levels/LotZoning.tsx

## Claude

Now LotCard's optional zoning row, and the Site group moving out of the left panel:

- *Bash*: LotCard option; drop Site group from left

## Claude

Next, the Confirm step for Test a project, so I'm done with `LevelInputs.tsx` before the Compare agent starts.

- *Bash*: Check plan/policy state and effects in results
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/lib/project/confirm.ts
- *Bash*: Add Confirm bar and right-panel gate
- *Bash*: Read tract and ZIP result rendering
- *Bash*: Gate results on Confirm at all three levels

## Claude

Confirm is wired up at all three levels. Now I'll hand Compare to a helper agent so it runs in parallel, giving it its own files.

- *Agent*: Compare: Parcel/Tract/ZIP levels

## Claude

Compare is running in the background. Next, the Browse order: lot and zoning first, "Best fit on this lot" at the bottom.

- *Bash*: Move best fit to the end on a lot
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/levels/Overview.tsx
- *Edit*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/place/levels/Overview.tsx
- *Bash*: Fix indentation and type check
- *Bash*: Remove unused import; type check

## Claude

Now Explore's Parcels. First the lot layer learns to follow the Data layers: colored by use when Land use is on, outlines only when Zoning is on.

- *Bash*: Add lot paint modes to the lot layer
- *Bash*: Fix expression typing

## Claude

Now the Explore pieces: the store holds the clicked lot, Parcels writes it, and the right panel reads it.

- *Bash*: Store picked lot; rewrite ParcelsBoundary
- *Write*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/app/src/components/explore/ParcelSummary.tsx

## Claude

Now `ExploreView` and the Data panel. These two are in the offline file, so I'm keeping the edits small.

- *Bash*: Wire lot panel, lot legend and Data panel
- *Bash*: Lazy guard, tests, offline size

## Claude

Tests pass and the offline file is 5,998,703 bytes. Now a browser check of the Explore lot panel and the Place Confirm step:

- *Bash*: Test Explore lot panel and Place confirm
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/ex-parcels-lot.png

## Claude

The panel stayed closed, probably because my test click landed on a street. Retrying on a lot:

- *Bash*: Retry the lot click on a lot
- *Bash*: Debug the lot click in Explore
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/ex-parcels-empty.png
- *Bash*: Screenshot after lot click

## Claude

The loop: the picked-lot object was rebuilt on every render, which redrew the lots, which re-rendered the page. Memoizing it:

- *Bash*: Memoize picked lot; retest
- *Bash*: See the full test output

## Claude

The panel opens now. Running the full flow: lot panel, land-use colors, Test a project on this lot, Confirm, then Browse.

- *Bash*: Run the full lot and confirm flow

## Claude

All of it works. Two screenshots to check the look:

- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/place-test-before.png
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/ex-parcels-landuse.png
- *Bash*: Look at the old Equity policy controls
- *Bash*: Read old policy levers definition
- *Bash*: Read lever keys and today defaults
- *Bash*: Simplify Policy lab controls: switches on top

## Claude

That type error comes from the Compare agent's work in progress, not this change. I'll also drop the long explanation I moved into "More options", then screenshot:

- *Bash*: Tidy and screenshot the simpler lab
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/labsimple.png
- *Bash*: Find demo steps naming lab controls
- *Bash*: Update demo steps for lab switches

## Claude

Now the slides, rewritten with minimal styling: same 13 slides and content, plain text, no shadows or colour accents.

- *Bash*: List current slide content

## Claude

One thing to add first: pressing Apply on a suggested fix should count as confirming, so the results stay visible after it.

- *Bash*: Auto-confirm on Apply; read screenshot script

## Claude

Now the minimal slides:

- *Bash*: Strip slides to minimal styling

## Claude

The slides are now plain: white background, system font, plain text and screenshots with a thin border. Next, the method docs for today's changes:

- *Bash*: Document today's changes
- *Bash*: Record the Confirm reversal in memory
- *Bash*: Correct the memory note

## Claude

While Compare finishes, I'm updating the screenshot script for the new flows (Confirm in Place, switches in the lab):

- *Bash*: Update screenshot script for new flows
- *Bash*: Update extra screenshot script

## Claude

I've done my part. The Compare agent is still working, so here is where things stand. I'll finish the checks and retake the demo screenshots when it reports back.

- *Bash*: Interim type check and tests

## Claude

Everything except Compare is built and checked in the browser at `localhost:5288`. The helper agent is still building Compare's Parcel, Tract and ZIP code levels. The type-check errors right now are all in its unfinished `CompareStudio.tsx`. When it reports back I'll re-run every check, test Compare myself and retake the demo screenshots.

**Explore, Parcels:**
- **Clicking a lot fills the right panel:** the lot facts (use, area, shape, homes today, sun hours) and its zoning.
- **Zoning details:** the district, units allowed by right on this lot, what's allowed by right and with approval, minimum lot, height and setbacks, plus the inclusionary overlay where it applies.
- **"Test a project on this lot"** opens that lot in Place at the Parcel level.
- **Before any click,** the panel says where to click and what each Data layer does with lots.

**Parcels and the Data layers:**
- **Land-use map:** each lot is colored by its own use, with a "Lot use" legend.
- **Zoning districts:** the district colors show through the lot outlines.
- **Sun and shadow:** works by lot as before, and the lot you pick there also fills the right panel.
- **Canopy map:** moved up with the other map layers, so it works with Parcels.
- **Census figures:** they're counted by area, so with Parcels open the panel says to open a boundary to map them.

**Place:**
- **Site moved right:** at Parcel level, "Site" left the left panel, and the right panel now opens with a "Site and zoning" card in both Browse and Test. The left panel now has the same five groups at every level.
- **Browse:** lot and zoning come first, and "Best fit on this lot" is now at the bottom.
- **Confirm (Test a project):** a "Confirm and test" button sits at the bottom of the left panel at all three levels. Until you press it, the right panel shows only the place (at Parcel level, the lot and its zoning). Changing any input hides the results again until you press "Confirm changes". "Apply" on a suggested fix counts as confirming, so the demo's "Read 40 units at Tract level" still works in one click.

**Policy lab:** it opens with six on/off switches:
- up to 3 homes on house lots;
- no parking minimums;
- affordable set-aside citywide;
- height bonus;
- $50k gap subsidy;
- frequent bus.

Below them are the test building's type and financing, and "Back to today's rules". Everything else is under "More options". The map and results panel are unchanged.

**Demo kit:**
- `slides.html` is now plain: white background, system font, plain text and screenshots. Same 13 slides and contact slide.
- The demo README and `talk.md` now use the new switch names.
- **Live demo:** there's now a Confirm click in the Place step. I'll add it to the script and retake the screenshots once Compare is done.

**So far:** 662 tests pass, the offline file is 5,998,703 bytes, and nothing is committed.

## You

i don't quite understand the The map shows in Policy Lab

- *Bash*: Find map-layer picker code
- *Bash*: Read the picker block and measure names

## Claude

The "The map shows" menu mixes two kinds of maps in one dropdown, and the option names aren't plain. I'll replace it with four short buttons, each with a one-line explanation of the colors.

- *Bash*: Replace map menu with four plain buttons
- *Bash*: Check the new map buttons
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/mapbtn.png

## Claude

Updating the demo step that names the old menu:

- *Bash*: Update demo step for the map buttons
- *Bash*: Update screenshot script for map buttons

## Claude

"The map shows" picked what colors the map, but it mixed two kinds of map in one dropdown, and the option names weren't plain. I've replaced it with four buttons named **Map**, with a sentence under them saying what the colors mean.

| Button | What the map shows |
|---|---|
| **Works?** (default) | Where the test building works under your rules. Green: it works. Red: it falls short, darker means a bigger gap. Orange: zoning doesn't allow it. |
| **Changed** | Compared with today's rules: green is better off, red is worse off, grey is no change. |
| **Homes** | How many homes zoning allows by right in each tract. That's room to build, not homes built. Once you change a zoning switch, it shows the change from today. |
| **Need** | Where the need is today, from public data: rent gap, burdened renters, jobs, school, transit, services. Pick one in the small menu that appears. Your policies don't change this map. |

The map still switches by itself when a policy makes another view more useful. Turning on "Up to 3 homes on house lots" jumps to **Homes**, for example.

I checked all four buttons in the browser with no errors. I also updated the demo README step to "Map → **Changed**". Refresh `localhost:5288` to see it.

The Compare agent is still running. When it finishes I'll re-run all the checks and retake the demo screenshots.

## You

move test Test building up than policy

- *Bash*: Put Test building above Policies
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/mapbtn.png

## Claude

In the Policy lab, Test building now sits above Policies: Map, then Test building (type and financing), then the six policy switches, then "Back to today's rules" and "More options". I checked it in the browser with no errors. Refresh `localhost:5288` to see it.

The Compare agent is still running.

## You

no map layer, green is work and red is not always. make these works change homes need section into the right panel. do you think this is reasonable?

- *Bash*: Read PolicyLab state and map paint
- *Bash*: Read results wiring, legend, classes
- *Bash*: Read imports and render middle
- *Bash*: Rewrite PolicyLab map and right-panel wiring

## Claude

Now the tabs in the right panel: Works (today's answer), Changed, Homes, Need.

- *Bash*: Add Works/Changed/Homes/Need tabs to results

## Claude

Compare is done. First I'll clean up the unused imports from the Policy lab change.

- *Bash*: Clean imports; type check
- *Bash*: Check the map and right-panel tabs
- *Bash*: Drop No change row; retest tract pick

## Claude

Picking a tract from the Need list didn't switch back to Works. Fixing that:

- *Bash*: Need list picks switch to Works
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/tabs-works.png

## Claude

You'd rather keep the earlier right panel, so I'll take the tabs back out and keep the green/red map.

- *Bash*: Remove tabs; restore previous right panel
- *Bash*: See imports and pencils field
- *Bash*: Add yellow could-work class; check
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/labsimple.png
- *Bash*: Find chat scope limits
- *Bash*: Read chat system prompt and scope check
- *Bash*: See how answers are number-checked
- *Bash*: Give the chat a guide to the tool
- *Bash*: Add chat guide tests

## Claude

Now the clicked-tract card: it moves to the top of the right panel, with Today and Your rules side by side in large type.

- *Bash*: Bigger Today vs Your rules tract card at top
- *Bash*: Check the tract comparison card
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/tract.png

## Claude

The card works: Today and Your rules side by side at the top of the panel. Now the slides. First I'll retake every screenshot from the current build:

- *Bash*: Regenerate demo screenshots

## Claude

Adding one new screenshot, Explore with a lot clicked, then checking the key shots:

- *Bash*: Screenshot Explore lot panel
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/shots/12-explore-parcel.png
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/shots/7b-lab-parking-change.png
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/shots/5-compare.png

## Claude

The screenshots are current. Now rewriting the slides to match the tool as it stands:

- *Bash*: Rewrite slides for the current tool

## Claude

Now the PDF, one slide per page, plus a check that every image loads:

- *Bash*: Render slides PDF and verify
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/slides.pdf

## Claude

The PDF has 15 pages and every image loads. Last, the demo script gets the Confirm click, and then a full check of everything, including a quick look at Compare myself:

- *Bash*: Update script; run all checks
- *Bash*: Spot-check Compare levels
- *Bash*: Check the sun layer's method
- *Bash*: Screenshot sun and shadow layer
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/shots/13-sun.png

## Claude

A good shot. Now reordering the slides (explore features, sun, a parcel, the right panel summary, then Analysis) and adding the sun slide:

- *Bash*: Reorder slides, add sun, rebuild PDF
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/slides.pdf
- *Bash*: Record tonight's state in memory

## Claude

The slides are updated and there's now a PDF at `nopush/demo/slides.pdf`, 16 pages, built from the current slides with fresh screenshots. All 664 tests pass, the type check is clean, there were no errors online or offline, the offline file is 5,998,703 bytes, and nothing is committed.

**About "machine learning":** the sun and shadow layer isn't machine learning. It's a GPU calculation: shadows ray-cast from the 2015 lidar surface on a Tesla T4, about 95 million map cells, using your MUSA 6950 method. The slide is titled "Sun and shadow, computed on a GPU", so a judge can't catch "ML" as an overstatement. I'd say it that way out loud too.

**Slide order:**
1. Title
2. "Not just missing middle"
3. Explore: map layers
4. Sun and shadow (new)
5. Click any lot (new)
6. The place's summary (the right panel)
7. Analysis, Place: the site first (new)
8. After Confirm
9. Tract level
10. Zoning only
11. Compare
12. Policy lab today
13. No parking minimums
14. Up to 3 homes
15. Facts and values
16. Contact

**Other changes since you last heard:**
- **Compare:** Parcel, Tract and ZIP code all work. I switched between them myself with no errors.
  - At Parcel, click a lot on each map; at ZIP code, pick one above each map.
  - Under "Same as A", both lots can't be in the same tract; set B to "Its own" for that.
  - Phones still get the old tract-only Compare.
- **Policy lab:**
  - The map now always uses one meaning: green works, yellow could work, red doesn't. Yellow covers "works with a zoning hearing", "breaks even but under the developer's bar" and "zoning not read but the money works".
  - The right panel is back to the layout you liked.
  - A clicked tract now sits at the top in a larger card, with Today and Your rules side by side.
- **Chat:** it now has a short guide to the whole tool, so it answers questions like "what does yellow mean?" or "what does Confirm do?" as well as questions about places.
- **Demo notes:** `README.md` and `talk.md` include the Confirm click in the Place step and a likely question about asking the chat how the tool works.

**Before you present:** the live site still has none of tonight's work. Push tonight, or demo from `localhost:5288`.

## You

make /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/slides.pdf  the text slight bigger and have more spaceing between lines and bewteen image and lines please.

- *Bash*: Bigger text, more spacing; rebuild PDF
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/slides.pdf
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/slides.pdf

## Claude

I rebuilt `nopush/demo/slides.pdf` with bigger text and more space. It's still 16 pages, and I checked it page by page; every image loads.

- **Bigger text:** headings, captions and bullets are all about 10–15% larger.
- **More space between lines:** lines are spaced further apart, and bullets have a small gap between them.
- **More space under the text:** on screenshot slides, the gap between the caption and the image is about twice what it was. On the text-only slides (title, "Not just missing middle", "Facts and values", contact), the blocks are spaced further apart.

The screenshots shrink slightly to make room, but they stay readable. `slides.html` has the same changes.

## You

make the last page on info big, state the website, my name, my program at UPenn and my email, and my linkedin.

- *Bash*: Check Ye's program from profile memory
- *Bash*: Bigger contact slide; rebuild PDF
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/slides.pdf

## Claude

The last page of `nopush/demo/slides.pdf` now shows your contact details in large type, and I checked the rendered page. From the top:

1. **Happy to connect with anyone.**
2. **ye-zhang-vision-pitts.vercel.app**, the largest line
3. **Ye Zhang**, in bold
4. Master of City Planning and Master of Urban Spatial Analytics, University of Pennsylvania (Weitzman School of Design)
5. Email: yezhang1@upenn.edu
6. LinkedIn: linkedin.com/in/yezhang03

I took the program name from your LinkedIn profile as I'd noted it earlier. If you'd rather it read "MCP/MUSA candidate, 2027", or something else, tell me.

I dropped the "try it, break it" line and the old footer to make room. The website, email and LinkedIn can still be clicked in the PDF and in `slides.html`.

## You

move the link belong my name please, cna you be more creative with this slide please

- *Bash*: Redesign contact slide; rebuild PDF
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/slides.pdf

## Claude

The right side shows bits of the app's buttons. I'll take a clean map-only shot for it instead:

- *Bash*: Clean map art for contact slide; rebuild
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/slides.pdf

## Claude

The last slide is redone with the links below your name and the right side given over to a map. I rebuilt `nopush/demo/slides.pdf` and checked the page; it's still 16 pages and every image loads.

**Left side, from the top:**
- **Kicker:** a small purple line, "THANK YOU · HAPPY TO CONNECT WITH ANYONE".
- **Your name:** "Ye Zhang", very large.
- **Program:** "Master of City Planning and Master of Urban Spatial Analytics / University of Pennsylvania, Weitzman School of Design".
- **Links:** three rows below your name, each with a small grey label and a large value underlined in light violet:
  - Try it live: ye-zhang-vision-pitts.vercel.app
  - Email: yezhang1@upenn.edu
  - LinkedIn: linkedin.com/in/yezhang03

**Right side:** a full-height, tilted map of Pittsburgh from the tool itself, with the land-use colors and Hazelwood outlined. I took a fresh map-only capture so no buttons or panels show. A small white label reads "VisionPitts · Pittsburgh, block by block".

The links can still be clicked in the PDF and in `slides.html`. The new map image is saved as `nopush/demo/shots/14-contact-map.png`.

## You

Master of City Planning & Master of Urban Spatial Analytics
University of Pennsylvania
Wharton Zell Lurie Real Estate Center    use this

- *Bash*: Update program text; rebuild PDF
- *Read*: /Users/ye/Documents/Ye-Zhang-Vision-Pitts/nopush/demo/slides.pdf
- *Bash*: Create standalone connect page and check it
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/connect.png

## Claude

I've updated the program lines and also made a separate page with only the connect slide.

**Program lines** now read exactly as you gave them, in both `slides.html` and `slides.pdf`:
- Master of City Planning & Master of Urban Spatial Analytics
- University of Pennsylvania
- Wharton Zell Lurie Real Estate Center

**The new page** is `nopush/demo/connect.html`. It looks the same as the last slide: your name, the program, the website, email and LinkedIn on the left, and the Pittsburgh map on the right. It has no slide numbers or arrow keys, and the links are clickable. I opened it in a browser and it loads without errors.

It uses the map image in `nopush/demo/shots/`, so keep `connect.html` in the same folder as `shots` if you move it.

## You

add my phone number 2133730948

- *Bash*: Add phone to contact page and slides
- *Read*: /private/tmp/claude-501/-Users-ye-Documents-Ye-Zhang-Vision-Pitts/fd1245d5-7295-46f7-b55d-9f1eb164a569/scratchpad/simp/connect.png

## Claude

I added your phone number, **(213) 373-0948**, between Email and LinkedIn. It's on the separate page `connect.html` and on the last slide of `slides.html`, and I rebuilt `slides.pdf` to match.

It's styled like the other contact lines, and tapping it on a phone starts a call. I checked the page in a browser; it loads with no errors.

The number is only in the demo files in `nopush/demo`, which aren't part of the repo. The app, the README and the live site don't have it.

## You

/s
