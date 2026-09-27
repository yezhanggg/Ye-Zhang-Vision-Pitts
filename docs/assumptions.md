# Assumptions and value judgments

Everything in VisionPitts that is a **choice** rather than an observation, in one place, with a one-line rationale and who should revisit it. Observed-data methods are in `docs/data/factor_methods.md`. Config: `config/scoring.json` v0.4.0 (adopted 2026-09-27 in answer to judge review 01; v0.3.0 is restored by two switches, `factor_options.subsidy.mode: "flag"` and `transit.basis: "acre"`, plus the old cells listed in `fit.changes`).

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

Every cell that changed is logged in `config/scoring.json` `fit.changes` with `source: "PROPOSED by judge review 01"` and `adopted: "2026-09-27"`. The reasons are the practitioner's, in one line each.

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

### 10a. Additions of Sat 2026-09-26 (evening): municipalities, history, Analysis layers

| Choice | Value | Rationale | Revisit by |
|---|---|---|---|
| Municipality unit | Census county subdivisions 2023, the 129 units other than Pittsburgh, bundled in full | In Pennsylvania every municipality is a county subdivision; the Census places file lacks the 42 townships. Pittsburgh stays the `city` level. | |
| History span | ACS 5-year end years 2014–2024, every year | Ye's choice; overlapping windows are stated on every chart, dollars stay nominal. | Ye |
| Carrying 2010 tracts | Housing-unit block crosswalk; counts apportioned, medians HU-weighted; tracts with a dominant 2010 share below 0.9 flagged (19 city tracts) | Same crosswalk the factors use; nothing imputed. | Data teammate |
| Bundled history | 14 variables, margins for 6, 483 KB; the full 37 stay in `data/processed/acs_history_*.csv` | Keeps the offline file small. | |
| Offline file size | Target under 6 MB for `export/index.html`; 3D buildings are stored delta-coded (`app/src/lib/buildingsCodec.ts`), about 0.47 MB instead of 2.5 MB | The submission checklist's line; a double-clickable file has to travel by email. | Ye |
| Analysis layers in Explore | Factor percentiles, scores under the current priorities, pressure, watch list, asking rents, raw inputs, painted for city tracts only with the Analysis palettes | Same values, same colours as the Analysis section, so the two screens never disagree. The list is built from the config, so the two v0.4.0 factors appear there too. | |
| Asking-rent areas | Yearly 2BR medians and distinct units per tract, ZIP and municipality, same suppression as tracts (10 per cell, 20 pooled) | Licensed aggregates only. | Ye |
| Layout | Floating, collapsible panels with per-browser persistence; no numbered steps | Ye's request; defaults keep every panel open so a first visit and the smoke tests see the full interface. | Ye |

### 10b. Additions of Sat 2026-09-26 (late): a plainer Explore and the question box

| Choice | Value | Rationale | Revisit by |
|---|---|---|---|
| Boundaries | One open at a time (tracts, block groups, ZIP codes, municipalities); Data lists the variables of the open one; Analysis layers appear with tracts only | Ye's request: people see what they ask for. An older link that lists several boundaries opens the one being browsed. | Ye |
| Pittsburgh only | On by default; shows the bundled city subset and the city limits, asks nothing of Supabase. Off = the whole county. Off and locked while municipalities are open | All 129 municipalities lie outside the city. ZIP codes that touch the city count as "in". | Ye |
| Settings | Buildings, terrain, hill shading and the ⌘ flat-view hint, collapsed by default | They change how the map looks, not what it shows. | |
| Hover | Name and the latest value only | Margins and reliability stay in the summary panel. | Ye |
| Summary panel | Folded into a tab until a place or a variable is chosen; a variable plus a click shows that variable only; the Key figures table is gone; census table numbers show only in the Sources window | Ye's request. | Ye |
| Click tip | "Click any boundary…" shows when nothing is painted or selected, can be closed, returns on every fresh opening of the tool (which also clears the selection and the painted variable) | Ye's request. | Ye |
| Shell | No name or logo on the start page header or over the map; Home returns to the start page, where Sources, Limitations and About live; no Reduce motion switch (the system setting and `lite=1` still apply) | Ye's request. | Ye |
| Question box | `app/api/chat.ts`, same provider as the explanation (DeepSeek or Claude). Facts: the selected place, places whose bounding-box centre lies within 3 miles (nearest 12, places under 50 residents left out; the 5 nearest when none is that close), city, county, the matchmaker's read, asking-rent aggregates. Numbers in the answer are checked against the facts; one retry. In Explore an answer that still fails is shown with a visible warning; in Analysis it is withheld and replaced by a plain refusal (`app/src/lib/analysis/strictChat.ts`) | The model rephrases, code computes. Analysis is where the numbers are the product, so nothing unverified is shown there. Distance between bounding-box centres is an approximation and is stated as such in the facts. | Ye |

### 10c. Additions of Sun 2026-09-27 (early): one box, values only, Details and About

| Choice | Value | Rationale | Revisit by |
|---|---|---|---|
| Heading | The same in Explore and Analysis: Home at the top left, Explore / Analysis in the middle, the search-and-question box at the top right. Panels and Copy link are gone (the address bar still carries the link) | Ye's request. | Ye |
| Area | A two-way choice, Pittsburgh or Allegheny County, replaces the "Pittsburgh only" switch; locked to the county while municipalities are open | Ye's request. | Ye |
| Search and questions in one box | Sorted in the browser (`app/src/lib/explore/intent.ts`): a house number and a street is an address; text that ends with "?", starts like a question or a request, or runs to six words is a question; anything else is a place. "go to…", "find…", "where is…" are searches. Every list offers "Ask the assistant" as an explicit row | Searching is free and only questions cost tokens; the visitor can always overrule the sorting. | Ye |
| Token budget | Facts first (cached by the provider on a second question about the same place), last exchange only as history, 8 nearby places, answers capped at 380 tokens, repeats served from memory in the browser and on the warm function | Ye asked to save tokens and money. Measured on 2026-09-27: 1,955 input tokens for a first question, 1,920 of 2,088 billed as cached for the second. | Ye |
| Thinking time | An answer is shown after at least 5 seconds, with the `thinking-orbs` mark and three phrases; a refusal (offline file, service down) after 0.9 seconds | Ye's request: the pause reads as thinking. | Ye |
| Values only in Explore | No margins of error, reliability chips, reliability mix or margin bands anywhere in Explore; the Analysis section keeps its confidence tags; the Details window documents margins and the reliability rule | Ye's request. Small-area ACS estimates can be noisy (some tract medians carry margins above half their value), so the figures should be read as estimates. | Ye |
| Default summary | Empty until a place or a variable is chosen: one line on where to click. The city-at-a-glance panel was removed | Ye's request. | Ye |
| Flat when far | The map lies flat once the view is zoomed out far enough to fit the city limits plus 5 miles (`app/src/lib/farView.ts`), checked when a move ends, with 0.25 zoom levels of slack before the tilt returns | Ye's request. | Ye |
| Start page | Three doors: Open, Details (Overview, Data & method, Limitations, What comes next), About (the author: background, education, experience, UPenn email, LinkedIn) | Ye's request. About is written from Ye's LinkedIn profile as read on 2026-09-27. | Ye |

### 10d. Land use and zoning mix (Sun 2026-09-27, afternoon)

| Choice | Value | Rationale | Revisit by |
|---|---|---|---|
| Land-use measure | Share of parcel lot area by assessed class, county-wide at every level; vacant lots and parcels as counts | Same classifier the Place card uses, so the two never disagree; area reads better than parcel counts for land. | Ye |
| Zoning mix | Seven family groups, city tracts and block groups only | Zoning data exists only for the city. | Ye |
| Use | Information only: Explore variables, place summary, Place card fold, Compare places rows, question-box facts | Nothing enters a score. | Ye |
