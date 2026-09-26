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
- Because scores are normalized by each row's total |fit|, a **short row with one strong aversion** (senior: 0 on market, −1 on flood) scores high wherever flood exposure is low and subsidy applies. Under Balanced weights senior housing ranks first in 40 of 114 tracts. Options: give senior a small positive market fit (0.1–0.2) or reduce its flood aversion to −0.5; either changes the city-wide picture and must be re-run through the parity fixture.
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
Zoning and by-right feasibility · infrastructure capacity · embodied carbon and VMT · parcel availability · listing rents · school quality. Each appears in the data-limits panel as "not integrated" rather than as a fabricated score.

## 8. Demo tracts
Hazelwood (hero, watch list) · Garfield · Middle Hill · Homewood North · Lower Lawrenceville · South Side Flats · Squirrel Hill North · Beechview. Chosen to span the need × market grid; Garfield and Beechview were resolved to the tract with the largest overlap with the neighborhood polygon (42003101900, 42003191600).
