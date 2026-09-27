# Assumptions and value judgments

Everything in VisionPitts that is a **choice** rather than an observation, in one place, with a one-line rationale and who should revisit it. Observed-data methods are in `docs/data/factor_methods.md`. Config: `config/scoring.json` v0.3.0.

## 1. The question and the typologies

| Choice | Value | Rationale | Revisit by |
|---|---|---|---|
| Target households | Renters at or below 50% of AMI (CHAS ≤50% HAMFI) | The deep-affordability gap that market-rate and 80% AMI programs do not reach. | City Planning, PHFA |
| Typologies | ADU · duplex/triplex · townhome · small apartment (5–19 units) · senior housing | Gentle-density types a city can enable by zoning or bonus, plus the two subsidized products most often built at ≤50% AMI. Large towers and single-family detached are out of scope. | Planners, CDCs |
| Geography | City of Pittsburgh tracts (≥50% of area inside the city) | The policy lever (voluntary bonus, ADU provisions) is the City's. County expansion is a roadmap item. | Ye |
| Ranked set | Tracts with ≥25 households | Parks, rivers, stadiums and campuses should not receive a recommendation. 14 of 128 tracts. | Ye |

## 2. Fit matrix (config `fit.matrix`)

How much each typology benefits from a **high** (+) or **low** (−) value of each factor, magnitude 0–1.

| | need | market | displacement | subsidy | transit | flood |
|---|---|---|---|---|---|---|
| ADU | .3 | .5 | .5 | 0 | .3 | −.8 |
| Duplex/triplex | .6 | .4 | .3 | .2 | .5 | −1 |
| Townhome | .2 | 1 | −.6 | .1 | .2 | −1 |
| Small apartment | 1 | .3 | .4 | 1 | 1 | −.5 |
| Senior | .6 | 0 | .2 | .8 | .6 | −1 |

Reading: townhomes are a market product (want a strong market, avoid high-displacement areas); small apartments want need, subsidy eligibility and transit; ADUs and duplexes are the gentle-density options that tolerate rising pressure; senior housing is subsidy-led and indifferent to market strength.

**Known consequences to review**
- Because scores are normalized by each row's total |fit|, a **short row with one strong aversion** (senior: 0 on market, −1 on flood) scores high wherever flood exposure is low and subsidy applies. Under Balanced weights senior housing ranks first in 40 of 114 tracts. **One-line answer when asked:** senior housing wins so often because its fit row is short and flood-averse, so it is rarely penalized; that is a property of the value judgments, not of the data, and a 0.1–0.2 market fit or a −0.5 flood fit spreads the wins. Options: give senior a small positive market fit (0.1–0.2) or reduce its flood aversion to −0.5; either changes the city-wide picture and must be re-run through the parity fixture.
- `subsidy_eligible` is a 0/1 flag mixed with percentiles. With fits of 0.8–1.0 it pulls small apartment and senior toward the 73 eligible tracts. Intended (LIHTC and CDBG are how they get built), but a planner may prefer 0.5.
- Townhome's −0.6 on displacement is the only negative non-flood fit; it is what makes townhomes drop under Anti-displacement weights.

**Revisit by:** a housing developer and a CDC director together; this is the table most worth arguing about.

## 3. Presets (config `presets`)

| Preset | need | market | displacement | subsidy | transit | flood | Intent |
|---|---|---|---|---|---|---|---|
| Balanced | 1 | 1 | 1 | 1 | 1 | 1 | Neutral starting point. |
| Anti-displacement | 2 | 0.5 | 3 | 1.5 | 1 | 1 | Protect vulnerable renters first; market strength matters less. |
| Market-led | 0.5 | 3 | 0.5 | 0.5 | 1 | 1 | Go where unsubsidized construction can work. |
| Transit-first | 1 | 1 | 1 | 1 | 3 | 1 | Put homes where the buses already run. |

Sliders run 0–3 in steps of 0.25; 0 removes a factor. **Revisit by:** whoever uses the tool; presets are starting points.

## 4. Scoring mechanics

| Choice | Value | Rationale |
|---|---|---|
| Score | Σ w·c(x,d) / Σ w·|d| | A weighted-average fit in [0,1]; without the |d| denominator the typology with the largest fit total wins almost everywhere. |
| Missing factors | Dropped, weights renormalize | Never impute; say so in the data-limits panel. |
| Stability | 200 Dirichlet draws, concentration 25, around the user's weights; report the share where the top pick holds | Concentration 25 gives nudges of roughly ±20% per weight, which is about how precisely anyone holds a value judgment. |
| Fixed color bins | 0, .4, .5, .6, .7, .8, 1 | Colors must compare across scenarios, so bins never rescale. |

## 5. Composite and threshold choices inside the factors

| Choice | Value | Rationale | Revisit by |
|---|---|---|---|
| Displacement weights | SVI .30 · cost burden .30 · evictions .20 · vouchers .20 | Two structural measures, two behavioral ones; evictions and vouchers are noisier and suppressed more often. | Data teammate |
| Minimum parts for displacement | 2 | One part is not a composite. | |
| Market change term | 20% weight, clipped to ±0.5 | Direction matters, but 2016 and 2021 letters are not comparable enough for more. | |
| Market classification coverage | Tract null if <50% of housing classified | Avoid scoring campuses and parks on a handful of sales. | |
| Designation flag threshold | ≥50% of housing units in a designated 2010 unit | Majority rule after crosswalking. | |
| Transit buffer | 400 m (≈5 min walk) from the tract polygon | Standard walk-to-stop distance. | |
| Eviction period | Mean of 2023, 2024, 2025 | Post-moratorium years; 2020–22 are not representative. | |
| Confidence rule | Age (≤2 high, 3–5 medium, >5 low) then one downgrade for coverage <90%, dominant crosswalk share <0.8, CV >30%, or an apportioned/imputed input | Simple enough to explain in one sentence. | |

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
Zoning and by-right feasibility · infrastructure capacity · embodied carbon and VMT · parcel availability · contract (in-place) rents · school quality. Each appears in the data-limits panel as "not integrated" rather than as a fabricated score. Asking rents from listings are integrated as information only (§9), and the Explore data browser (§10) shows census variables as description only; neither enters a score.

## 8. Demo tracts
Hazelwood (hero, watch list) · Garfield · Middle Hill · Homewood North · Lower Lawrenceville · South Side Flats · Squirrel Hill North · Beechview. Chosen to span the need × market grid; Garfield and Beechview were resolved to the tract with the largest overlap with the neighborhood polygon (42003101900, 42003191600).

## 9. Asking rents: information only (`asking_rents.py`)

| Choice | Value | Rationale | Revisit by |
|---|---|---|---|
| Role | Information layer on the tract card, the map and the Sources modal; **never a scoring factor** | Existing-stock growth has no positive relation to the market signals the score uses (Spearman 0.03 with market strength, −0.31 with the 2016→2021 market change); it exists for only 30 of 114 ranked tracts; and the source is licensed, so judges cannot open it. Scored factors stay public-data only. | Ye, after a public rent source appears |
| Level | Median 2BR asking rent, pooled 2025–26, one observation per unit per scrape month | 2BR is the FMR benchmark unit and the largest listing share (35%). | |
| Growth window | Pooled 2019–20 → pooled 2025–26 | 2019–20 is the earliest window with enough listings; pooling smooths the thin 2020 scrape. | |
| Existing stock | A building's site (location rounded to 4 decimals, about 10 m) first listed before 2019 | Removes new buildings from both windows so growth reads as repricing. Dewey re-keys PROPERTY_ID between scrape eras (none of the 2025 ids appear before 2019), so the site is the only identity that persists. | Data teammate |
| Suppression | Fewer than 10 distinct units per tract-year cell; fewer than 20 for pooled levels, the index and growth | Distinct units, not unit-months: a unit re-listed monthly is one unit. | |
| Confidence | Distinct 2BR units in 2025–26: ≥50 high, 20–49 medium, else low | Coverage is the only tract-specific uncertainty; the market-rate skew applies everywhere and is stated in the caveat instead. | |
| FMR benchmark | HUD FY2026 2BR FMR, Pittsburgh HMFA, $1,299 | The 40th-percentile rent HUD uses for vouchers. | |
| Publication | Tract aggregates only; raw rows and the caches stay in git-ignored `data/raw/dewey_cache` | Dewey terms §3.2 permit summary insights, not the licensed data; §3.3 asks for attribution to Dewey and the provider. | Ye |

## 10. Explore data browser: description only (`acs_levels.py`, `geo_levels.py`, `app/src/lib/explore/`)

| Choice | Value | Rationale | Revisit by |
|---|---|---|---|
| Role | 37 ACS 2020–2024 5-year variables at tract, block-group and ZIP level, with the city and county as reference lines; **never a scoring factor** | People want to see the census behind a tract before they trust a score; keeping the browser out of the score keeps the six-factor method auditable. | Ye |
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
| Bundled history | 14 variables, margins for 6, 483 KB; the full 37 stay in `data/processed/acs_history_*.csv` | Keeps the offline file under 6.5 MB. | |
| Analysis layers in Explore | Factor percentiles, scores under the current priorities, pressure, watch list, asking rents, raw inputs, painted for city tracts only with the Analysis palettes | Same values, same colours as the Analysis section, so the two screens never disagree. | |
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
| Question box | `app/api/chat.ts`, same provider as the explanation (DeepSeek flash). Facts: the selected place, places whose bounding-box centre lies within 3 miles (nearest 12, places under 50 residents left out; the 5 nearest when none is that close), city, county, the matchmaker's read, asking-rent aggregates. Numbers in the answer are checked against the facts; one retry, then a visible warning | The model rephrases, code computes. Distance between bounding-box centres is an approximation and is stated as such in the facts. | Ye |

