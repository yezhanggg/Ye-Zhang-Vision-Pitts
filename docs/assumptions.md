# Assumptions and value judgments

Everything in VisionPitts that is a **choice** rather than an observation, in one place, with a one-line rationale and who should revisit it. Observed-data methods are in `docs/data/factor_methods.md`. Config: `config/scoring.json` v0.4.0 (v0.3.0 is restored by two switches, `factor_options.subsidy.mode: "flag"` and `transit.basis: "acre"`, plus the old cells listed in `fit.changes`).

Counts below are for the current build: 128 city tracts, 114 ranked; `tests/test_docs_numbers.py` fails when a number here drifts from `app/src/data/meta.json` or the config.

## 1. The question and the typologies

| Choice | Value | Rationale | Revisit by |
|---|---|---|---|
| Target households | Renters at or below 50% of AMI (CHAS ≤50% HAMFI) | The deep-affordability gap that market-rate and 80% AMI programs do not reach. For scale: HUD FY2026 Pittsburgh HMFA median family income is $110,400, so 50% for a family of four is $55,200 (30%: $33,100; 80%: $88,300). The need count itself uses the CHAS 2018–22 bands, not these limits. | City Planning, PHFA |
| Typologies | ADU · duplex/triplex · townhome · small apartment (5–19 units) · senior housing | Gentle-density types a city can enable by zoning or bonus (ADU, duplex/triplex, townhome), plus the two subsidized products most often built at ≤50% AMI (small apartment, senior). Large towers and single-family detached are out of scope. | Planners, CDCs |
| Geography | City of Pittsburgh tracts (≥50% of area inside the city) | The policy lever (voluntary bonus, ADU provisions) is the City's. County expansion is a roadmap item. | Ye |
| Ranked set | Tracts with ≥25 households: 114 ranked of 128 city tracts | Parks, rivers, stadiums and campuses should not receive a recommendation. 14 of 128 tracts are left unranked. | Ye |

## 2. Fit matrix (config `fit.matrix`)

How much each typology benefits from a **high** (+) or **low** (−) value of each factor, magnitude 0–1. Eight factors since v0.4.0; the two new columns are observed ACS shares (§3.7 and §3.8 of the methods).

| | need | market | displacement | subsidy | transit | flood | 65+ residents | 2–4 unit homes |
|---|---|---|---|---|---|---|---|---|
| ADU | .3 | .5 | .5 | 0 | .3 | −.8 | 0 | .3 |
| Duplex/triplex | .6 | .4 | .3 | .2 | .5 | −1 | 0 | .8 |
| Townhome | 0 | 1 | −.4 | .1 | .2 | −1 | 0 | 0 |
| Small apartment | 1 | .3 | .4 | .6 | 1 | −.5 | 0 | 0 |
| Senior | .3 | .15 | .2 | .6 | .8 | −1 | .8 | 0 |

Reading: townhomes are a market product (want a strong market, avoid high-displacement areas); small apartments want need, subsidy eligibility and transit; ADUs and duplexes are the gentle-density options that tolerate rising pressure and fit the fine-grained housing stock; senior housing is subsidy-led, transit-dependent and goes where seniors already live.

### Changes in v0.4.0

Every cell that changed from v0.3.0 is logged in `config/scoring.json` `fit.changes` with its old and new value. The reasons are the practitioner's, in one line each.

| Cell | From | To | Reason |
|---|---|---|---|
| townhome × need | .2 | 0 | A market townhome serves no ≤50% AMI renter without inclusionary zoning or a density bonus. |
| townhome × displacement | −.6 | −.4 | The aversion stays; at −.6 townhomes vanished under Anti-displacement before the market factor could speak. |
| small apartment × subsidy | 1 | .6 | With a graded flag, a partial grade (Opportunity Zone or CDBG only) is not a tax credit; at 1 the flag alone decided the pick. |
| senior × need | .6 | .3 | `need` counts all-age family demand, not seniors. |
| senior × market | 0 | .15 | A senior LIHTC deal still needs a market study and a lender. |
| senior × subsidy | .8 | .6 | Same reason as small apartment: a 2026 QCT or DDA is what makes the deal pencil, a 2018 line is weaker. |
| senior × transit | .6 | .8 | Seniors depend on transit more than any other household here. |
| senior × 65+ residents | (new) | .8 | Senior housing goes where seniors already are. |
| ADU, duplex, townhome, small apartment × 65+ residents | (new) | 0 | A share of residents 65 and over says nothing about the other four types. |
| duplex/triplex × 2–4 unit homes | (new) | .8 | Duplexes and triplexes get built where the 2–4 unit fabric exists: the lots, the builders and the lenders know the product. |
| ADU × 2–4 unit homes | (new) | .3 | An ADU fits the same fine-grained fabric, a little. |
| townhome, small apartment, senior × 2–4 unit homes | (new) | 0 | Indifferent to the existing house-scale stock. |

Proposed and **not** adopted, because they were run with the shipped engine on the v0.4.0 data: small apartment × flood −.8 moves 5 Balanced picks, mostly from small apartment to senior and townhome, which is the dominance the rebalance set out to reduce (the judge's underwriting point is kept in the corrected rule R10 instead); duplex × subsidy .5 and × market .2 left duplex at 0 wins on v0.3.0 and on v0.4.0 would move 9 more Balanced picks on top of the 2–4 unit factor without a rule behind them; senior × flood −.5 (see the consequences below).

### Rulebook

Each rule sets one or more cells; a cell with no rule is 0. Edit the rules, not the numbers. All 40 cells of the matrix above are covered.

| # | Rule (plain language) | Cells set | Status |
|---|---|---|---|
| R1 | Small apartments are the LIHTC product: they go where need is; subsidy eligibility helps, but a partial grade is not a tax credit | small apt need 1, subsidy .6 | subsidy .6 since v0.4.0 |
| R2 | Small apartments and senior housing depend on transit: car-free households | small apt transit 1; senior transit .8 | senior .8 since v0.4.0 |
| R3 | Senior housing is subsidy-led, but a senior LIHTC deal still needs a market study and a lender, and `need` counts all-age family demand | senior subsidy .6, market .15, need .3 | since v0.4.0 (was .8 / 0 / .6) |
| R4 | Townhomes are a market-rate product: they need a strong market, and a market townhome serves no ≤50% AMI renter without inclusionary zoning or a bonus | townhome market 1, need 0, subsidy .1 | need 0 since v0.4.0 |
| R5 | Market-rate product in a fragile neighborhood accelerates displacement | townhome displacement −.4 | since v0.4.0 (was −.6) |
| R6 | ADUs need an owner with equity: they work where homes hold value | ADU market .5 | unchanged |
| R7a | ADUs and duplexes add units without removing anyone: gentle density tolerates rising pressure | ADU displacement .5; duplex .3 | unchanged, split from R7 |
| R7b | Subsidized rental belongs where displacement pressure is, as protection; but a 5–19 unit building is not gentle density and on an occupied site can itself remove tenants, so the fit is smaller | small apt displacement .4; senior .2 | unchanged, split from R7 |
| R8 | Duplex/triplex serves need in any market, rarely subsidized | duplex need .6, market .4, subsidy .2, transit .5 | unchanged (the judge's subsidy .5 / market .2 was run: 0 wins on v0.3.0, 9 picks moved on v0.4.0; not adopted) |
| R9 | ADUs can't use LIHTC | ADU subsidy 0 | unchanged |
| R10 | Nobody builds in a floodplain. The flat commercial lots on Second Avenue and Carson Street **are** the flood land (South Side Flats reads 68.7%), so a small apartment is exposed like everything else; its smaller aversion is a judgment that a 5–19 unit building can raise its ground floor, which a lender may not accept | flood: ADU −.8, duplex −1, townhome −1, small apt −.5, senior −1 | unchanged; rationale corrected |
| R11 | Low-income and senior households depend most on walkable jobs and services | opportunity access | **not shipped**: no such factor exists in v0.4.0; the cells once proposed (.8 / .9 / .4 / .3 / .2) are not in the config |
| R12 | Modest transit fit for owner-oriented types | ADU transit .3, townhome transit .2 | unchanged |
| R13 | An ADU carries no land cost, so it is the one market unit that can rent near 50% AMI | ADU need .3 | new rule for a cell that had none |
| R14 | A 5–19 unit building carries a first mortgage sized on market rents even with LIHTC | small apt market .3 | new rule for a cell that had none |
| R15 | Senior housing goes where seniors already are; the share of residents 65 and over says nothing about the other four types | senior 65+ .8; others 0 | new factor in v0.4.0 |
| R16 | Duplexes and triplexes fit where the 2–4 unit fabric exists; an ADU fits the same fabric a little; townhomes, small apartments and senior housing are indifferent | duplex 2–4 units .8; ADU .3; others 0 | new factor in v0.4.0 |

**Known consequences to review**
- **Senior dominance, measured.** Under v0.3.0 senior housing ranked first in 40 of 114 tracts under Balanced weights, because its row was short (0 on market) and flood-averse, so it was rarely penalized. The two remedies this file used to offer were run with the shipped engine: a .15 market fit alone moves senior to 37 wins, and a −.5 flood fit makes it worse, 57 wins, because the flood aversion was the only thing holding senior back where subsidy applied. So the flood fit stays −1, and v0.4.0 answers with data instead: a factor that measures seniors (65+ residents, senior .8), a smaller subsidy fit and the graded flag. Under Balanced weights senior housing now ranks first in 17 of 114 tracts (Anti-displacement 17, Transit-first 17, Market-led 34). Balanced picks are ADU 8 / duplex 13 / townhome 41 / small apartment 35 / senior 17, against 8 / 0 / 31 / 35 / 40 under v0.3.0; 44 tracts changed pick. **One-line answer when asked:** senior housing used to win because its row was short; now it wins where seniors live and subsidy applies, and every changed cell is logged.
- **Duplex/triplex** won 0 tracts under v0.3.0 whatever the fit edit; it wins 13 once the 2–4 unit stock is measured. That factor is built form, not zoning: the tool still cannot see by-right districts or vacant lots (§7).
- **Eligible tracts** are now a grade, not a switch: 47 ranked tracts carry the full grade (a 2026 QCT or Small-Area DDA), 31 the partial grade (Opportunity Zone or CDBG only), 36 none. With fits of .6 for small apartment and senior it still pulls those types toward eligible tracts; intended (LIHTC and CDBG are how they get built).
- **Close calls.** Under Balanced weights the #1–#2 margin is under .05 in 63 of 114 tracts (39 under .03, 29 under .02; 9 ties within .005; median .042). The app says "close call" or "tie" instead of painting them solid. Hazelwood, the hero tract, is small apartment .702 against senior .697.
- Townhome's −.4 on displacement is the only negative non-flood fit; it is what makes townhomes drop under Anti-displacement weights.
- **North Oakland 42003040400** reads 45% of residents aged 65 and over with 89% of its housing in 20+ unit buildings: the 65+ factor is most likely counting senior buildings already built there. No score hack; the data-limits panel says the factor may be reading existing senior homes.

**Revisit by:** a housing developer and a CDC director together; this is the table most worth arguing about.

## 3. Presets (config `presets`)

| Preset | need | market | displacement | subsidy | transit | flood | 65+ | 2–4 units | Intent |
|---|---|---|---|---|---|---|---|---|---|
| Balanced | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | Neutral starting point. |
| Anti-displacement | 2 | 0.5 | 3 | 1.5 | 1 | 1 | 1 | 1 | Protect vulnerable renters first; market strength matters less. |
| Market-led | 0.5 | 3 | 0.5 | 0.5 | 1 | 1 | 1 | 1 | Go where unsubsidized construction can work. |
| Transit-first | 1 | 1 | 1 | 1 | 3 | 1 | 1 | 1 | Put homes where the buses already run. |

The two new factors weigh 1 in every preset so that a six-weight link saved before v0.4.0 keeps its meaning (a missing weight is filled with 1). Sliders run 0–4 in steps of 0.1; 0 removes a factor. **Revisit by:** whoever uses the tool; presets are starting points.

## 4. Scoring mechanics

| Choice | Value | Rationale |
|---|---|---|
| Score | Σ w·c(x,d) / Σ w·|d| | A weighted-average fit in [0,1]; without the |d| denominator the typology with the largest fit total wins almost everywhere. |
| Missing factors | Dropped, weights renormalize | Never impute; say so in the data-limits panel and on the answer card ("scored on 7 of 8 factors"). |
| Stability | 1,000 Dirichlet draws, concentration 25, seed 42, around the user's weights; report the share where the top pick holds | Concentration 25 gives nudges of roughly ±20% per weight, which is about how precisely anyone holds a value judgment. 200 draws gave "N of 10" a standard error of a third of a step; 1,000 draws is what the parity fixture cross-checks between Python and TypeScript (8 stability cases, tolerance .05). |
| Tie and close call | #1–#2 margin under .005 is a tie, under .03 a close call | A tie is not a pick; a close call is shown as one, on the card and on the "Which type wins" map. |
| Fixed color bins | 0, .4, .5, .6, .7, .8, 1 | Colors must compare across scenarios, so bins never rescale. |

## 5. Composite and threshold choices inside the factors

| Choice | Value | Rationale | Revisit by |
|---|---|---|---|
| Subsidy grade | 1.0 for a 2026 QCT or Small-Area DDA · 0.5 when the only designation is an Opportunity Zone or CDBG area (2018, carried from 2010 geography) · 0 for none | A tax-credit designation is what makes a LIHTC deal pencil; a 2018 CDBG or OZ line is an older, weaker signal. Entered as the grade, not a percentile. | Data teammate |
| Transit denominator | Weekday departures within 400 m per household, households floored at 400 | Per acre penalized large low-density tracts (Hazelwood); per household is what a rider is. Floors of 0, 250 and 400 give identical winners and 500 changes one pick; the floor only stops South Shore (132 households) ranking first on a tiny denominator. It applies to 5 ranked tracts. | Data teammate |
| Displacement weights | SVI .30 · cost burden .30 · evictions .20 · vouchers .20 | Two structural measures, two behavioral ones; evictions and vouchers are noisier and suppressed more often (HUD suppresses vouchers in 33 of 114 ranked tracts). | Data teammate |
| Minimum parts for displacement | 2 | One part is not a composite. | |
| Displacement confidence (R-5) | Down one level only if fewer than 3 parts are present, the burden CV is above 30%, or the eviction estimate draws on several ZIP codes and none holds at least 80% of the tract's housing units | Under the old rule every use of the apportioned evictions dropped the tag, so it read "low" in 114 of 114 tracts and carried no information. Now medium 74, low 40. | |
| Market change term | 20% weight, clipped to ±0.5 | Direction matters, but 2016 and 2021 letters are not comparable enough for more. | |
| Market classification coverage | Tract null if <50% of housing classified | Avoid scoring campuses and parks on a handful of sales. | |
| Designation threshold | ≥50% of housing units in a designated 2010 unit | Majority rule after crosswalking. | |
| Transit buffer | 400 m (≈5 min walk) from the tract polygon | Standard walk-to-stop distance. | |
| Eviction period | Mean of 2023, 2024, 2025 | Post-moratorium years; 2020–22 are not representative. | |
| Flood confidence | Medium at best; low where more than 50% of the land reads as inundated (14 ranked tracts: Shadyside 79.6%, Homewood South 75.5%, North Shore 74.3%, South Side Flats 68.7% among them) | A HAND terrain screen is not a FEMA map, and readings that high are not plausible for these neighborhoods. FEMA flood zones are the replacement when time allows. | Ye |
| Share factors (65+, 2–4 units) | Percentile of the ACS share; tag down one level when the CV is above 30% or cannot be computed (a zero estimate has no CV) | The Census Bureau's own reliability line; a share with no margin cannot be called reliable. The 2–4 unit share has a CV above 30% in 67 ranked tracts, so that factor reads medium in 69. | |
| Confidence rule | Age (≤2 high, 3–5 medium, >5 low) then one downgrade for coverage <90%, dominant crosswalk share <0.8, CV >30%, or an apportioned or imputed input, with the factor-specific rules above | Simple enough to explain in one sentence, and it now varies: no tag reads the same in every tract. | |

## 6. Market pressure and the watch list (C layer)

| Choice | Value | Rationale | Revisit by |
|---|---|---|---|
| Neighborhood definition | Queen contiguity among city tracts | Transparent and reproducible; a 2 km band would reach across rivers. | Planner |
| Pressure | mean(neighbors' market_strength) − own | Positive = stronger neighbors = pressure spilling in. | |
| Pressure map bins | ±0.08 "about the same", ±0.25 "much" | Roughly one and three letter steps in percentile terms. | |
| Need terciles | thirds of the need percentile | | |
| Market direction band | ±0.05 on the within-vintage score (≈ half a letter) | Smaller changes are noise between two separately calibrated models. | |
| Watch list | high-need tercile **and** rising market | The tracts where adding market-rate units without protections is most likely to displace. 9 tracts today. | CDCs |

Market pressure is **not** a scoring factor. Promoting it into displacement risk is an open decision (default: no).

## 7. Things deliberately not modeled
Zoning and by-right feasibility · infrastructure capacity · embodied carbon and VMT · parcel availability · contract (in-place) rents · school quality · access to jobs and services beyond transit frequency (rule R11, not shipped). Each appears in the data-limits panel as "not integrated" rather than as a fabricated score. Asking rents from listings are integrated as information only (§9), and the Explore data browser (§10) shows census variables as description only; neither enters a score. The 2–4 unit factor is built form, not zoning: it says where the house-scale stock is, not where it is allowed.

## 8. Demo tracts
Hazelwood (hero, watch list) · Garfield · Middle Hill · Homewood North · Lower Lawrenceville · South Side Flats · Squirrel Hill North · Beechview. Chosen to span the need × market grid; Garfield and Beechview were resolved to the tract with the largest overlap with the neighborhood polygon (42003101900, 42003191600). Under v0.4.0 Hazelwood is a half-point call (small apartment .702, senior .697; Anti-displacement makes it small apartment clearly), Homewood North is small apartment .697 against senior .645, Squirrel Hill North townhome .745 against ADU .631, and Garfield reads duplex/triplex.

## 9. Asking rents: information only (`asking_rents.py`)

| Choice | Value | Rationale | Revisit by |
|---|---|---|---|
| Role | Information layer on the tract card, the map and the Sources modal; **never a scoring factor** | Existing-stock growth has no positive relation to the market signals the score uses (Spearman 0.03 with market strength, −0.31 with the 2016→2021 market change); it exists for only 30 of 114 ranked tracts; and the source is licensed, so judges cannot open it. Scored factors stay public-data only. | Ye, after a public rent source appears |
| Level | Median 2BR asking rent, pooled 2025–26, one observation per unit per scrape month | 2BR is the FMR benchmark unit and the largest listing share (35%). | |
| Growth window | Pooled 2019–20 → pooled 2025–26 | 2019–20 is the earliest window with enough listings; pooling smooths the thin 2020 scrape. | |
| Existing stock | A building's site (location rounded to 4 decimals, about 10 m) first listed before 2019 | Removes new buildings from both windows so growth reads as repricing. Dewey re-keys PROPERTY_ID between scrape eras (none of the 2025 ids appear before 2019), so the site is the only identity that persists. | Data teammate |
| Suppression | Fewer than 10 distinct units per tract-year cell; fewer than 20 for pooled levels, the index and growth | Distinct units, not unit-months: a unit re-listed monthly is one unit. | |
| Confidence | Distinct 2BR units in 2025–26: ≥50 high, 20–49 medium, else low | Coverage is the only tract-specific uncertainty; the market-rate skew applies everywhere and is stated in the caveat instead. | |
| FMR benchmark | HUD FY2026 2BR FMR, Pittsburgh HMFA, $1,299, read from the HUD workbook by `hud.py` (source row `fmr`) | The 40th-percentile rent HUD uses for vouchers. | |
| Publication | Tract aggregates only; raw rows and the caches stay in git-ignored `data/raw/dewey_cache` | Dewey terms §3.2 permit summary insights, not the licensed data; §3.3 asks for attribution to Dewey and the provider. | Ye |

## 10. Explore data browser: description only (`acs_levels.py`, `geo_levels.py`, `app/src/lib/explore/`)

| Choice | Value | Rationale | Revisit by |
|---|---|---|---|
| Role | 37 ACS 2020–2024 5-year variables at tract, block-group and ZIP level, with the city and county as reference lines; **never a scoring factor** (two of the tract shares, residents 65+ and units in 2–4 unit buildings, are also read by the factor pipeline and scored as percentiles; the browser itself scores nothing) | People want to see the census behind a tract before they trust a score; keeping the browser out of the score keeps the eight-factor method auditable. | Ye |
| Reliability chip | From the coefficient of variation, CV = MOE ÷ 1.645 ÷ estimate: high < 15%, medium 15–30%, low > 30%, n/a when the estimate is 0 or missing | The Census Bureau's own rule of thumb for 90% margins; the same thresholds the tract card already uses. | |
| Color bins | 5 quantile classes computed over the loaded scope (city subset offline, county-wide online); tied breaks collapse into fewer classes | Quantiles show contrast within whatever is on screen. Re-binning when the scope changes is deliberate, so a county-wide load re-colors the city. Colors are not comparable across variables or scopes; the legend prints the breaks. | |
| City subset | Tracts and block groups with ≥ 50% of their area inside the city limits (128, 314); ZCTAs with ≥ 1% (32) | The tract rule is the study set and block groups follow it. ZCTAs are large and straddle the line, so a 50% rule would drop ZIP codes that city addresses use. | |
| Bundled vs online | The export and the first paint carry the city subset; when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set and the page is not `file://`, county-wide rows (394 tracts, 1,062 block groups, 170 ZCTAs) replace them; any fetch error falls back to the bundle | A double-clickable file must work offline; the hosted app gets the county without a rebuild. The tables are read-only under row-level security. | |
| Table substitutions | Poverty from C17002 (not B17001); vehicles from B25044 (not B08201) | B17001 and B08201 are not published for block groups; the substitutes give the same shares wherever both exist. | |
| Sentinels and rounding | Negative estimates → null; MOE −555555555 → 0; other negative MOEs → null; counts, dollars and years as integers, shares to 4 decimals, CV to 3 | Nothing is imputed; topcoded medians stay as published. | |
| Simplification | EPSG:2272, 5 m for tracts and block groups, 10 m for ZCTAs, county and city; coordinates to 5 decimals | Keeps the bundle small enough for one file; fine for choropleths, not for parcel work. | |

### 10a. Municipalities, history and Analysis layers

| Choice | Value | Rationale | Owner |
|---|---|---|---|
| Municipality unit | Census county subdivisions 2023, the 129 units other than Pittsburgh, bundled in full | In Pennsylvania every municipality is a county subdivision; the Census places file lacks the 42 townships. Pittsburgh stays the `city` level. | |
| History span | ACS 5-year end years 2014–2024, every year | Overlapping windows are stated on every chart; dollars stay nominal. | Author |
| Carrying 2010 tracts | Housing-unit block crosswalk; counts apportioned, medians HU-weighted; tracts with a dominant 2010 share below 0.9 flagged (19 city tracts) | Same crosswalk the factors use; nothing imputed. | Data lead |
| Bundled history | 14 variables, margins for 6; the full 37 stay in `data/processed/acs_history_*.csv` | Keeps the offline file small. | |
| Offline file size | Under 6 MB for `export/index.html`; 3D buildings are stored delta-coded (`app/src/lib/buildingsCodec.ts`), about 0.47 MB instead of 2.5 MB | A double-clickable file has to travel by email. | Author |
| Analysis layers in Explore | Factor percentiles, scores under the current priorities, pressure, watch list, asking rents, raw inputs, painted for city tracts only with the Analysis palettes | Same values, same colours as the Analysis section, so the two screens never disagree. The list is built from the config. | |
| Asking-rent areas | Yearly 2BR medians and distinct units per tract, ZIP and municipality, same suppression as tracts (10 per cell, 20 pooled) | Licensed aggregates only. | Author |
| Layout | Floating, collapsible panels with per-browser persistence; Explore opens with Boundary and Data expanded | A first visit sees what it can choose; the rest stays folded. | Author |

### 10b. Explore map and the question box

| Choice | Value | Rationale | Owner |
|---|---|---|---|
| Boundaries | One open at a time (tracts, block groups, ZIP codes, municipalities); Data lists the variables of the open one; Analysis layers appear with tracts only | People see what they ask for. A link that lists several boundaries opens the one being browsed. | Author |
| Area | A two-way choice, Pittsburgh or Allegheny County; locked to the county while municipalities are open | All 129 municipalities lie outside the city. ZIP codes that touch the city count as "in". | Author |
| Settings | Buildings, terrain, hill shading and the ⌘ flat-view hint, collapsed by default | They change how the map looks, not what it shows. | |
| Hover | Name and the latest value only | Details stay in the summary panel. | Author |
| Summary panel | Folded into a tab until a place or a variable is chosen; a variable plus a click shows that variable only; census table numbers are listed in the Project Details & Sources window | One thing at a time. | Author |
| Click tip | "Click any boundary…" shows when nothing is painted or selected and can be closed | Tells a first visitor where to start. | Author |
| Question box (VisionPitts-Chat) | `app/api/chat.ts`, DeepSeek (Claude when no DeepSeek key is set). Facts: the selected place, places whose bounding-box centre lies within 3 miles (nearest 12, places under 50 residents left out; the 5 nearest when none is that close), city, county, the matchmaker's read, asking-rent aggregates. Numbers in the answer are checked against the facts; one retry. In Explore an answer that still fails is shown with a visible warning; in Analysis it is withheld and replaced by a plain refusal (`app/src/lib/analysis/strictChat.ts`) | The model rephrases, code computes. Analysis is where the numbers are the product, so nothing unverified is shown there. Distance between bounding-box centres is an approximation and is stated as such in the facts. | Author |

### 10c. Shell, search and the answer format

| Choice | Value | Rationale | Owner |
|---|---|---|---|
| Heading | The same in Explore and Analysis: Home at the top left, Explore / Analysis in the middle, the search-and-question box at the top right; the address bar carries the link (`/explore`, `/place`, `/compare`, `/equity`) | One layout everywhere. | Author |
| Search and questions in one box | Sorted in the browser (`app/src/lib/explore/intent.ts`): a house number and a street is an address; text that ends with "?", starts like a question or a request, or runs to six words is a question; anything else is a place. "go to…", "find…", "where is…" are searches. Every list offers "Ask the assistant" as an explicit row | Searching is free and only questions cost tokens; the visitor can always overrule the sorting. | Author |
| Token budget | Facts first (cached by the provider on a second question about the same place), last exchange only as history, 8 nearby places, answers capped at 380 tokens, repeats served from memory in the browser and on the warm function | Keeps the cost per question low. Measured: 1,955 input tokens for a first question, 1,920 of 2,088 billed as cached for the second. | Author |
| Thinking time | An answer is shown after at least 5 seconds, with the `thinking-orbs` mark and three phrases; a refusal (offline file, service down) after 0.9 seconds | The pause reads as thinking. | Author |
| Values only in Explore | No margins of error, reliability chips, reliability mix or margin bands anywhere in Explore; the Analysis section keeps its confidence tags; the Project Details & Sources window documents margins and the reliability rule | Small-area ACS estimates can be noisy (some tract medians carry margins above half their value), so the figures should be read as estimates. | Author |
| Default summary | Empty until a place or a variable is chosen: one line on where to click | A clean first view. | Author |
| Flat when far | The map lies flat once the view is zoomed out far enough to fit the city limits plus 5 miles (`app/src/lib/farView.ts`), checked when a move ends, with 0.25 zoom levels of slack before the tilt returns | A tilted map reads poorly at county scale. | Author |
| Start page | Three doors: Open VisionPitts, Project Details & Sources (Overview, Data & method, Calculations, Limitations, What comes next), About Author | Everything about the project in one window; the author on a separate card. | Author |

### 10d. Land use and zoning mix

| Choice | Value | Rationale | Owner |
|---|---|---|---|
| Land-use measure | Share of parcel lot area by assessed class, county-wide at every level; vacant lots and parcels as counts | Same classifier the Place card uses, so the two never disagree; area reads better than parcel counts for land. | Author |
| Zoning mix | Seven family groups, city tracts and block groups only | Zoning data exists only for the city. | Author |
| Use | Information only: Explore variables, place summary, Place card fold, Compare places rows, question-box facts | Nothing enters a score. | Author |

## 11. Sun and shadow: information only (`shadow.py`, `parcel_shadow.py`, `app/src/lib/explore/sunShadow*.ts`, `parcelShadow*.ts`; added October 2026)

Method and checks: [docs/data/shadow.md](data/shadow.md).

| Choice | Value | Rationale | Owner |
|---|---|---|---|
| Role | A map layer in Explore (first item under Data), off by default; never a scoring factor | It shows something people ask about housing sites (winter sun, overshadowing), but a 2015 surface with trees as solid objects is not sound enough to rank places by. | Ye |
| Surface | PASDA 2015 lidar, first-return surface, 6 ft cells | The only public surface model of the whole city with buildings in it. Older than the rest of the data, and stated as such in the app. | Ye |
| Days | June 21, September 22, December 21 | The usual set for a shadow study: the longest and shortest days and an equinox. | Ye |
| Time step | 30 minutes, sun at least 2 degrees up | Half the step of the course assignment; below 2 degrees almost everything is in shadow and the ray march is longest. | Author |
| Trees | Left in as solid objects | Removing them needs a classified point cloud; leaving them in is stated in the app. | Author |
| Spike removal | Cells above 2,300 ft NAVD88 and the cone around them set to the surrounding level (one spike, 420 cells) | Nothing real in the city is that high; left in, it would shade Downtown. | Author |
| Published detail | Cast at 6 ft. Regular pages at 12 ft (a 12 ft cell is in shadow when at least half of its 6 ft cells are), 68 MB, tracked. The 6 ft shadow pages are a close-zoom level (from map zoom 15.5), 162 MB, git-ignored by default | The site stays light and still works without the close-zoom pages; publishing them is one line in `.gitignore`. | Ye |
| Season names | Summer (June 21), Spring / Fall (September 22), Winter (December 21) | Plainer than dates. Spring shares the fall day: the sun is as high around March 20 and runs 16 minutes later on the clock, which the control says. | Ye |
| Shadow edges | Smoothed between cell centers and cut at one half | Square cells read as a rendering fault at close zoom. The curve is an estimate, stated in the method. | Author |
| Offline file | Not included; the switch reads "Needs the online version" there | The pages are fetched at runtime; the single file stays under its size limit. | Author |
| Terrain | Sun and shadow and 3D Terrain are never on together | The layer is drawn on the flat ground plane. The shadows already include the hills. | Author |
| By parcel: the figure | Each lot's share of the day in shadow: shadowed cell-steps over cells x steps, from the 6 ft run. Hours of sun, the share of the day at least half shaded and the half-hour profile come from the same counts | The plain reading of "how much of the day is this lot in shadow", weighted by area. | Author |
| By parcel: what counts as the lot | The whole lot as seen from above: roof, yard and tree tops together | It is what the surface gives without citywide building footprints. Said in the control. | Ye |
| By parcel: small lots | Under 10 cells (about 360 sq ft) not rated, drawn gray | One cell is more than a tenth of such a lot. 3,687 of 142,642 lots. | Author |
| By parcel: publishing | Map files (58 MB) git-ignored by default; the view is offered only where they are, and not on phones. A lot shows its county label, assessed use and size, never an owner or an address | Local analysis first. Publishing is one line in `.gitignore`, and the README's privacy line (tracts or larger) would need rewording. | Ye |

## 12. Tax credit score sheet: a self-score, information only (`app/src/lib/lihtc/`, `app/src/data/lazy/lihtc_pa.json`; added October 2026)

Method, sources and checks: [docs/data/lihtc.md](data/lihtc.md).

| Choice | Value | Rationale | Owner |
|---|---|---|---|
| Role | A self-scoring sheet on the Place page, filled in for the selected tract. Never a factor in VisionPitts' own scoring, and not a prediction of an award | Ye asked for the Analysis tab to say what a development needs to score higher on the state's own sheet. PHFA scores applications; the app adds up what a person enters. | Ye |
| Which rules | PHFA's 2025/2026 plan (adopted) and the 2027/2028 draft of July 13, 2026, side by side; the adopted sheet opens first | The next round may run under the draft, which scores differently (pass or fail, 205 points). Showing only one would mislead. | Author |
| Transcription | Points, tiers and caps copied by hand from PHFA's PDFs; each line keeps its PHFA reference | PHFA publishes no machine-readable sheet. The arithmetic is tested against PHFA's stated totals (232 and 205). | Author |
| Who decides a line | Each line is tagged: the place, a score to look up, the parcel, the design, partners, the team, the financing | This is the project's reading, there to sort "to score higher" into what a site gives and what a sponsor chooses. PHFA does not use these words. | Author |
| What the place settles | One line: transit-oriented design, counted when at least 99.5% of the tract's lots are within 2,640 ft of a transit stop; a person can override it for a site | It is the only line that is a plain distance. Everything else the tract can only inform. | Author |
| Scores that are not measured | Walk Score, PHFA's PolicyMap score and the school proficiency figure are typed in, with a link to where each is published | Walk Score and PolicyMap are other organizations' products; copying them into the app is not ours to do. | Author |
| Sun, trees, vacant lots, need | Shown next to the lines they bear on (energy and green building, infill, income targeting, large families, zoning); they add no points | PHFA gives no points for sun or tree cover. Saying they "score" would be false. | Author |
| Tiers | Urban tiers only | PHFA lists the City of Pittsburgh in the urban pool, and the app covers the city. | Author |
| Minimum shown | 125 for 9% credits on the 2025/2026 sheet | PHFA's plan says 125 in the scoring table and 120 in two sections; the sheet uses the table and says so. | Author |
| Entries | Project entries stay across places; site entries are kept per place; saved in the browser only | A unit mix does not change when another tract is opened; a Walk Score does. | Author |
| Lines the plan answers | B.1, B.4, D.4.b (adopted) and 4.3.1, 4.3.4.a, 4.5.9 (draft) from the unit mix and the pencil, each with its formula; a typed entry, even an explicit none, wins; D.4.a and the mixed-income lines are hints only | Ye asked for the sheet to read the project rather than be typed twice; lines that need signed documents stay with the person | Ye |
| Offline file | Not included, with its two source rows | `export/index.html` has no room under its 6 MB mark. Online-only data lives in `app/src/data/online/` and `app/src/data/lazy/`. | Author |

## 13. Tree canopy, and sun, shade and trees on the Place page: information only (`canopy.py`, `app/src/lib/explore/canopy*.ts`, `app/src/components/place/SiteConditions.tsx`; added October 2026)

Method and checks: [docs/data/canopy.md](data/canopy.md).

| Choice | Value | Rationale | Owner |
|---|---|---|---|
| Role | A variable and a map in Explore, a section on the Place page, and figures shown beside lines of the tax credit score sheet. Never a scoring factor | Ye asked for tree canopy in Explore and in the analysis, and for sun and shadow in the analysis. | Ye |
| Source | PASDA "Tree Canopy Change, 2015-2020", read as the 2020 canopy extent | The file carries no change class. Its extent in Penn Hills is within 0.1% of the 2020 figure published for Penn Hills. | Author |
| Measure | Canopy area over land area, by exact overlay; ZIP codes over total area | Rivers would otherwise make riverside tracts look bare. ZIP code areas come without land and water figures. | Author |
| Units past the county line | Measured on the part inside; no figure when less than half is inside | The canopy file stops at the county line; a ZIP code mostly in another county would read as treeless. | Author |
| County-wide values | Carried in the build (`app/src/data/online/canopy.json`), not published to the database | No database write was needed, and the variable works wherever the county scope does. | Author |
| Canopy map | 6 ft cells on the shadow run's grid, 12.3 MB of tiles, published with the site | Public data about tree cover, not about anyone's property; small enough to track. | Author |
| Sun on the Place page | The tract's lots from shadow by parcel, weighted by area | The same figures as the By parcel view, so the two never disagree. Streets and rivers are not lots. | Author |
| Vacant-lot screen | 2,000 sq ft or more; less than half under canopy; direct sun for at least half of December 21 | A first pass at "which vacant lots are worth a look". The marks are the author's, not a program's, and are named in the section. | Author |
| Transit distance | Share of lots within 2,640 ft, straight line, of any transit stop | PHFA's half mile. Service level is not part of PHFA's test, so it is not part of this one. | Author |
| Offline file | Not included | No room under the 6 MB mark. | Author |

## 14. Suggestion rules on the Place page (`app/src/lib/place/recommend.ts`, thresholds in `app/src/lib/place/thresholds.ts`)

The rules that turn a place's evidence into a suggested building type, under the focusing issue (stance) and the planning inputs. Every threshold is printed beside the line it decides on the page. None is a gate on what may be built; they say which types the evidence supports.

| Choice | Value | Rationale | Owner |
|---|---|---|---|
| Who the homes are for | At an income level (30, 50 or 80% AMI): every CHAS band at or below it. With no level: the band with the most renter households paying over 30% of income; ties go to the more severe burden | Ye asked for the answer to name who the homes serve. The burdened count is CHAS's own, so nothing is modeled. | Ye |
| Price | 30% of the HUD income limit ÷ 12. With a household size, the limit for that many people; otherwise 1.5 persons per bedroom (a studio or a senior living alone counts one person). Gross rent; the utility allowance is not known here | HUD's affordability convention and the tax credit program's persons-per-bedroom rule | Author |
| Market test | The 2-bedroom ceiling against the tract's 2-bedroom asking rent (medium or high confidence only) and the ZIP Small Area Fair Market Rent: the market reaches the band, a voucher reaches it, or the gap in dollars | Asking rents are listed for 2-bedroom homes only, so the test compares like with like | Author |
| Anti-displacement | Displacement score at or above 0.67: the ADU and 2–4 unit conversion only, for the ≤50% bands, subsidized; senior and small apartment buildings only with at least 100 vacant parcels; no townhome. Below 0.33, or between: all types, with the townhome left out for the ≤50% bands. At market rate where the score is at or above 0.67: nothing | Adding homes without demolition is the stance's point. A for-sale rowhouse does not serve renters at those incomes | Ye |
| Market-led | Passes when the 2-bedroom asking rent is at or above the ZIP Fair Market Rent and the home value is at or above the city median (the sale median since 2023 when there are at least 10 sales, otherwise the ACS median value). Then every type but senior; otherwise "No unsubsidized product is supported here". At the "market rate" income level the same test applies under every stance, with the transit or climate test added under those two | It recommends only what the market pays for, and says who that leaves out | Ye |
| Transit-first | Passes when at least 50% of residents live within a quarter mile of a frequent stop (64 or more weekday departures) or there are at least 1,000 weekday departures within a quarter mile; with a transit distance chosen, when the nearest frequent stop is within it. Then the densest feasible type first; no ADU | Frequent service is what makes car-free living work; the densest type uses it most | Ye |
| Climate-resilient | Passes when at most 5% of the tract's land is in a FEMA flood zone and the nearest frequent stop is within the chosen distance (half a mile when none is chosen). Then attached and multi-unit forms before the ADU | Fewer car trips and less energy per home. Embodied carbon is not modeled (no Pittsburgh data) | Ye |
| Order inside the suggested set | Renter demand signals first when the demand data is loaded (§15), then the household type CHAS counts most of at the level (each building type serves listed household types), then the fit order. A chosen household of seniors puts senior housing first; a family puts the 2–4 unit conversion and the townhome first. Transit-first and Climate-resilient keep their own fixed orders | The order should follow who needs the homes; the stance only narrows the set | Author |
| Fit order | The weighted ranking under the stance's preset weights (the Advanced panel), the last tie-break | The weights only order types inside the set; they never add or remove one | Ye |
| Overrides | No burdened renters at the level → nothing suggested; a householder under 62 → no senior housing; FEMA share above the reader's flood limit → nothing suggested | A need-driven stance has nothing to answer where CHAS counts no need | Author |
| The decision | The fixed sentence "This page does not choose…" closes every answer | Site, scale, sponsor, financing, zoning relief and the neighborhood plan are decisions for people | Ye |

### 14a. Policy basis: "Policies that apply here" (online Place and Compare places; added October 20, 2026)

Online, the Place tab and both sides of Compare places no longer ask for a focusing issue. Ye's reason: a focus has to rest on a planning document or a policy, and it should be something you include or leave out, not one forced pick. In its place, the left panel lists the policies that apply here, each with its source document and status. The suggestion becomes "types that pass your screens" (`app/src/lib/policy/compose.ts`), built on the §14 rules. The offline single file keeps the four stances above.

The research and the first draft of this list came from a review in three roles on 2026-10-20 (a developer, a planner, an engineer). Statuses were checked on the web that day. Items marked unverified carry no numbers in the app.

| Item | Source and status | Kind | What the app does |
|---|---|---|---|
| Inclusionary overlay | Code §907.04.A, adopted | Binding, always on | Where more than half the tract is in the IZ-O, 20+ homes set aside 10% at ≤50% AMI (already in the pencil and zoning card) |
| Floodplain overlay | Code §906.02, adopted | Binding, always on | Notes the 18 in elevation rule wherever the tract has FEMA 1%-a-year flood-zone land. This is a tract proxy; the site needs a survey |
| ADU overlay | Code §912.08, adopted; none mapped (read 2026-10-15) | Binding, always on | No ADU is suggested anywhere |
| PHFA QAP 2025/26 | Adopted | Funding | Counted when the project uses credits (the score sheet) |
| QCT / DDA basis boost | IRC §42, federal | Funding | Automatic 130% basis in the pencil |
| Height bonus for affordable homes | Code §915.07.D.4, adopted | Funding | Lists eligible districts (RIV, UPR, UC-E, R-MU, UC-MU) in the tract; no height is modeled |
| PHFA QAP 2027/28 | Draft | Funding, off | When on, scores on the draft sheet |
| Affordable Housing Bonus | Bill 2025-1545, proposed | Funding, off | Note only |
| URA Housing Opportunity Fund | 2026 plan, adopted | Funding, off | Note: enter the gap funding as soft funds |
| Tax abatement (Act 42 / LERTA) | Terms unverified | Funding, off | Note only; operating costs not reduced |
| Parking reduction near transit | Code §914.07.G, numbers unverified | Funding, off | Note only |
| Neighborhood plan | City Neighborhood Plan Guide (2020) | Link | Uptown/EcoInnovation (adopted 2017) is named for Bluff; elsewhere, a link only |
| Displacement risk | HNA 2022 (a study, not policy) | Your screen, off | The §14 Anti-displacement rule; the 0.67 and 0.33 cut points are your assumption |
| Frequent transit within ½ mile | PHFA QAP and HNA use ½ mile | Your screen, off | No suggestion beyond ½ mile of a stop with 64+ weekday departures (that mark is your assumption) |
| Most flood-zone land | Your assumption | Your screen, off | The §14 flood limit (none, ≤5%, ≤15%) |
| Market check | Your assumption | Always shown | The §14 market test. At market rate, nothing is suggested unless the Market-led test passes |

**Other changes, online only:**
- **No focus underneath.** With no screens on, the suggestion reads renter need at the income level with the displacement branch left out: the §14 Anti-displacement rule with no score. At market rate it reads the Market-led test.
- **Residents.** One switch, General or Senior 62+, sets both the PHFA occupancy and whether senior housing can be suggested.
- **Inputs dropped.** Household size is no longer asked; each place's largest group sets it. Transit distance is fixed at ½ mile. Income moves into Unit mix; with your own mix, the suggestion reads the mix's deepest level (60% reads as ≤80%).
- **Weights.** The fit order uses the published equal-weights reference, and the weight sliders are gone from the panel.
- **Not yet built.** The Market-led, Transit-first and Climate-resilient type orders (densest first; attached first) are not applied, because no document sets them. Renter demand and the fit order decide the order.

**Sun for open space.** Pittsburgh has no rule (checked 2026-10-20). The yardstick is UK BRE BR 209: at least half of the space gets two or more hours of sun on March 21, read on the run's September 22, which has the same sun. NYC CEQR's 6 hours (lawns, play) and 4 hours (planted) are shown as a stricter reference. See docs/data/shadow.md.

**Sources:**
- Pittsburgh Code: https://ecode360.com/PI6865 (§907.04.A at https://ecode360.com/45475368, §912.08 at https://ecode360.com/45477942).
- Floodplain: https://pittsburghpa.gov/Business-Development/Zoning/Plan-Reviews-and-Notices/Environmental-Review/Floodplain
- Bill 2025-1545: https://engage.pittsburghpa.gov/implementing-the-housing-needs-assessment/affordable-housing-bonus-program
- HNA 2022: https://pittsburghpa.gov/files/assets/city/v/1/dcp/documents/21887_pittsburgh_hna_final_report.pdf
- PHFA QAP 2025/26 and 2027/28 draft: see §12.
- URA HOF: https://www.ura.org/pages/hof
- Neighborhood Plan Guide: https://www.pittsburghpa.gov/Business-Development/City-Planning/Neighborhood-Planning/Neighborhood-Plan-Guide
- NYC CEQR Technical Manual ch. 8 (2025): https://www.nyc.gov/assets/oec/technical-manual/08_Shadows_2025.pdf

## 15. Who needs it: renter demand, unit mix and tax credit supply (`demand.py`, `app/src/lib/demand/`; added October 2026)

Method, sources and checks: [docs/data/demand.md](data/demand.md).

| Choice | Value | Rationale | Owner |
|---|---|---|---|
| Role | A card on the Place page and an order for the suggested types (card, map, Compare). Never a scoring factor | Ye asked for the housing type to follow the renter share and one-person households of the area, the way a developer or planner reads a market | Ye |
| Signals | Renting households, one-person renters, renters of 5+ people, renter householders 65+, renter homes in 1–4 unit buildings; marks of 5, 5, 2, 5 and 10 points from the city, and beyond the 90% margin of error | Each share bears on a building type. The marks are wide enough that a tract has to differ visibly from the city; the margin test keeps survey noise from deciding | Author |
| Tract or ZIP | The tract first; its ZIP code (the whole ZCTA) when the tract's margin is too wide to tell | Ye thinks of demand by ZIP code, and tract margins are often ±15–20 points | Ye |
| Which signals favor which type | Small apartment: one-person and renter share above the city. ADU: one-person above, renter share below. Senior: 65+ above. Townhome: 5+ people above, renter share below. Duplex / triplex: 5+ people above, 1–4 unit buildings above | A value judgment, printed on the card. Owner-heavy areas with small renter households read as ADU country; renter areas with many singles as apartments | Author |
| Order | Demand signals first, then the household type CHAS counts most of at the level, then the weighted fit order. A household the reader chose still comes first. Transit-first and Climate-resilient keep their fixed orders | Ye chose to let demand reorder the pick inside what the stance allows. The stance rules still decide the set | Ye |
| Context only | Renter growth since 2014 and rent over renter income are shown and never counted | Growth has no margin of error across two surveys; rent over income is a ratio of medians | Author |
| Unit mix | Renter households by size → home size by the answer card's rule (1–2 people → 1-bedroom, 3–4 → 2, 5+ → 3); largest remainders; studios left to the person planning | One rule on the whole page. The census does not say which one-person households want a studio | Author |
| Homes | "Homes needed", or an example of 40 when empty, labeled as an example | The mix and the pencil need a number of homes to work with | Author |
| Capture rate | Homes with an income limit ÷ (qualifying renter households − tax credit homes already there); ZIP from B25118 at the 3-person limit, tract from CHAS | A common market-study screen, shown with its formula; no pass or fail mark is set | Author |
| 30-year mark | Placed-in-service year + 30 for tax credit homes nearing the end of their use restriction | The federal 15-year compliance period plus 15 years of extended use; properties placed before 1990 had less | Author |
| Offline file | Not included; the offline map keeps the weighted order | No room under the 6 MB mark | Author |

## 16. What can be built: zoning capacity (`zoning_capacity.py`, `app/src/lib/zoning/`, `config/zoning_standards.json`; added October 2026)

Method, sources and checks: [docs/data/zoning_capacity.md](data/zoning_capacity.md).

| Choice | Value | Rationale | Owner |
|---|---|---|---|
| Role | A card on the Place page: homes by right on vacant lots, more homes on lived-in lots, the districts present, the inclusionary overlay, a lot calculator. Never a scoring factor | Ye asked for the Analysis tab to be practical about zoning for developers and planners | Ye |
| Source | Title Nine on eCode360, current through 2026-09-16, transcribed by hand with each row's section; marked verified | The zoning code is the rule. The older by-right table stays unverified because the scoring data reads it | Author |
| Homes on a capped lot | R1D 1, R1A 1, R2 2, R3 3, when the lot meets the minimum lot size | Base residential districts set no lot area per home (§903.03, §911.02) | Author |
| Envelope districts | RM, NDO, LNC, NDI, UNC: footprint inside the setbacks × stories, held to coverage and FAR; homes at 850 sq ft and 85% of floor area | RM has no density limit of its own; the assumptions are printed beside every envelope figure | Author |
| Lot shape | Short and long sides of the lot's smallest enclosing rectangle, scaled to the lot's area | Parcels carry no frontage field | Author |
| Not modeled | Contextual setbacks and heights, compatibility standards, slopes, parking, variances | Each needs a site plan; leaving them out makes the vacant-lot figure an upper bound, said so on the card | Author |
| Not computed | Height-map districts (UC-MU, UC-E, R-MU), downtown, riverfront, special and planned districts, districts without housing by right | Their limits cannot be read from one table | Author |
| ADUs | Shown as needing an ADU overlay, none mapped | §912.08 allows ADUs only inside such an overlay; the City's overlay layer shows none on 2026-10-15 | Author |
| Inclusionary overlay | 10% of homes, rounded up, at 50% AMI to rent or 80% to own, for projects of 20 or more where most of the tract is in the IZ-O (the City's layer) | §907.04.A; the overlay is tested by tract share, so a site near its edge needs the City's map | Author |
| Privacy | Tract totals only | The README promises published data at tract scale or larger | Ye |
| Offline file | Not included | No room under the 6 MB mark | Author |

## 17. Does it pencil: sources and uses (`app/src/lib/pencil/`, `config/pencil_defaults.json`; added October 2026)

Method, sources and checks: [docs/data/pencil.md](data/pencil.md).

| Choice | Value | Rationale | Owner |
|---|---|---|---|
| Role | A card on the Place page: rents, operating income, loan, tax credits and equity or a market yield, sources against uses, PHFA's tests, a sensitivity table. Never a scoring factor | Ye asked for the Analysis tab to show how a project pencils, for developers and planners | Ye |
| Example values | Costs, operating figures, loan terms and credit price start as labeled examples; the card counts them at the top | Ye chose a sheet that computes on first open over an empty one; no public source gives these for a site | Ye |
| Sourced values | Credit rates, the 130% boost, PHFA's basis limits, credit caps, fee formula and gap tests, HUD MTSP limits, HACP utility allowances, each with its section | These are rules or published figures, not estimates | Author |
| Tax credit rents | MTSP limits at 1.5 persons a bedroom, rounded down, less utilities, never above the market rent for the size | The program's rule; capping at market keeps the income honest where tax credit rents exceed what the market pays | Author |
| Boost | Automatic in a QCT or DDA; PHFA's state boost only as a 9% waiver the person turns on | §42(d)(5)(B) and PHFA §2.6 | Author |
| Developer fee deferral | Deferred against the gap first; the deferred share feeds line 4.5.9 | How a gap is usually closed, and the measure PHFA's draft scores | Author |
| Plan in force | The plan the tax credit sheet is scored on, the 2027/2028 draft by default ("by round date": the 2027-02-17 round runs under it once adopted), labeled draft until adopted; the adopted plan one switch away | The next round's rules, not the last round's | Ye (2026-10-21) |
| Underwriting values | PHFA's on tax credit paths, tagged sourced: 5% vacancy, $500 / $375 reserves (general / 55+), 1.15 coverage, +2% / +3% trends; market rate keeps the examples | PHFA underwrites with these (Tab 2) | Ye (2026-10-21) |
| Committed and expected funds | Two inputs; PHFA's tests read committed only, and the card shows the gap if the expected funds come. New amounts start as expected | PHFA counts unsecured sources as gap (§3.2.20; draft §3.4.2) | Author |
| Loan and cash flow | Loan held to the debt that keeps cash flow at or above zero through year 10; negative cash flow before year 11 fails; the deferred fee repaid by year 15 is shown, not counted | PHFA's threshold; the 15-year repayment is investor practice (adopted §5.4 for fee waivers only, dropped in the draft) | Ye (2026-10-21) |
| Headroom | A gap below zero is headroom: credits sized to need, shown as the share of the most the project could get | PHFA issues credits to need (adopted §2.10; draft §7.2) | Author |
| QCT list | HUD's 2027 list for the pencil's boost, the finder's QCT filter and the sheet's designation line; the scored subsidy factor stays on 2026 | Allocations after 2026-12-31 use 2027's; changing the scores is a separate decision | Author |
| Where it would close (a line under Sensitivity) | One input at a time (hard cost, credit price, committed soft funds, homes moved to 60% AMI; market rate: hard cost, rents), with every other input held | Arithmetic on the person's own inputs; each line says whose number it moves | Author |
| Market rate | Yield on cost against a target, the rent that breaks even, the land value the rents support; the IZ-O set-aside applied at 20 or more homes where most of the tract is inside | The three questions a market-rate developer asks first | Author |
| Not modeled | Construction loan, lease-up, multi-year pro forma, abatements, subsidies, historic or acquisition credits | Each needs a deal; the card says it is arithmetic, not an underwriting | Author |
| Offline file | Not included | No room under the 6 MB mark | Author |

## 18. Find places for a project, three ways to pay, and PHFA dates (`app/src/lib/project/size.ts`, `paths.ts`, `app/src/lib/finder/`, `app/src/lib/demand/depth.ts`; added October 2026)

Method: [docs/data/finder.md](data/finder.md).

| Choice | Value | Rationale | Owner |
|---|---|---|---|
| Where | Find places in the Place view's start card (no tract picked); the paths on "Does it pencil"; no new sub-tab | Ye's choice, 2026-10-20 | Ye |
| Standing | Ranks, tiers and figures; no composite number or "/ 100" | Ye's rule since update 3 | Ye |
| Award odds | PHFA points against the minimum with a low–high range; chance of award not modeled | PHFA publishes no past scores to draw a base rate from | Ye |
| Tiers | Closes = the gap PHFA counts (uncommitted soft funds are gap) under 50% of the developer fee and cash flow at or above zero in years 1–10; over PHFA's limit = covered only by deferring more than half the fee; market rate closes at the target yield. Only "closes" counts in the sweep | PHFA's own tests; "close call" renamed "over PHFA's limit" because PHFA does not accept it, and because "close call" means a near tie between types elsewhere in the app | Ye (2026-10-21) |
| Size range | The person's range cut by homes by right (vacant and lived-in lots) and, for tax credits, market depth | Zoning and demand bound a project before money does | Author |
| Market depth | Renters ≤ 60% AMI within a mile (60% = ≤ 50% + ⅓ of the 50–80% band), less tax credit homes within the mile, × 10% (5–15%) | A common screening capture rate, labeled an example; city tracts only | Author |
| Order | Closes → over PHFA's limit → gap; uncut range first; smaller gap a home; more place points; lower cost a home | Printed under every list; the person decides | Author |
| PHFA dates | 2027 9% due 2027-02-17 3:00 p.m.; 4% rolling to 2027-07-01; from the 2027/2028 draft, checked 2026-10-20 | The plan was still a draft; re-check on adoption | Author |
| Map tint by tier | Not built | No room under the 6 MB mark (80 bytes left after this update) | Author |
| Offline file | Not included, apart from the 82-byte export hook | No room under the 6 MB mark | Author |
