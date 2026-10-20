# Does it pencil: sources and uses (Analysis, Place page)

Added October 2026. Question 4 of the Place page's project card ("Test a project here"), also shown side by side in Compare places. For the unit mix in "Who needs it" it runs a project's arithmetic:

- rents, operating income and the loan they carry;
- the tax credits and equity under PHFA's caps (9% credits, or 4% with tax-exempt bonds), or a market-rate yield on cost;
- sources against uses, the gap, and PHFA's own feasibility tests.

It is arithmetic on the person's inputs, not an underwriting, an appraisal or financial advice. Nothing here enters VisionPitts' scoring. The card is online only.

Inputs: `config/pencil_defaults.json`, built with HUD's MTSP limits into `app/src/data/lazy/pencil_defaults.json` by `scripts/19_build_pencil_defaults.py` (`src/visionpitts/pencil_defaults.py`). Arithmetic: `app/src/lib/pencil/` (`inputs.ts`, `rents.ts`, `finance.ts`, `grid.ts`). Card: `app/src/components/place/project/Pencil.tsx`.

## Two kinds of input

Every input is labeled on the card.

**Sourced**, with its document and section:

| Input | Value | Source |
|---|---|---|
| Credit rates | 9% (new buildings not federally subsidized); 4% (bond-financed) | 26 U.S.C. §42(b) |
| Basis boost | 130% in a QCT or DDA, applied automatically from the place's flags; PHFA's state boost only by waiver and only for 9% | §42(d)(5)(B); PHFA QAP §2.6 |
| Credit period | 10 years | §42(f)(1) |
| Bond test (4%) | Tax-exempt bonds of at least 25% of the aggregate basis of building and land, for buildings placed in service after 2025 | H.R. 1, 119th Congress (2025); confirm with bond counsel |
| Basis limit per home | $320,000 (9%), $380,000 (4%) | PHFA 2025/2026 QAP §3.4 |
| Credits per project (9%) | $1.7M; $1.8M with 60 or more affordable homes and at least 51% of homes with 2+ bedrooms; $1.85M supportive housing | QAP §2.4 |
| Developer fee | 15% of the first $10M of the lesser of cost (less acquisition) and the basis limit, 10% after. 9% caps: $2.0M (60+ affordable homes and 51% 2BR+) and $1.75M otherwise. 4%: $2.55M paid fee | QAP §3.5 |
| Feasibility | Any gap, unsecured sources included, under 50% of the developer fee | QAP §3.2.20 |
| Fully funded (D.4.a) | A gap under 25% of the developer fee | Selection criteria D.4.a |
| Set-aside | 20% of homes at 50% AMI, or 40% at 60%, or income averaging (40% of homes, average at most 60%, none above 80%) | §42(g)(1) |
| Income limits | HUD FY2026 MTSP limits, Pittsburgh HMFA, 30/50/60/80% for 1 to 8 people (4 people: $33,120 / $55,200 / $66,240 / $88,320) | HUD User API |
| Utility allowance | $111, $133, $171, $210 a month (studio to 3BR+): HACP 2026 schedule, low-rise, tenant pays electric heat pump heating, electric cooking, other electric, air conditioning and electric water heating; owner pays water, sewer and trash | HACP, effective 2026-01-01 |

**Examples**, to replace with your own. The card counts them and says so at the top:

| Input | Example |
|---|---|
| Hard cost | $300 a gross sq ft |
| Soft cost | 25% of hard cost |
| Land | $15,000 a home |
| Home sizes | 500, 700, 950, 1,200 net sq ft (studio to 3BR+) |
| Efficiency | 85% net of gross floor area |
| Vacancy | 7% |
| Operating cost | $6,500 a home a year, with property taxes |
| Reserves | $350 a home a year |
| Loan | 6.25%, 35 years, 1.20 coverage |
| Credit price | $0.88 (9%), $0.85 (4%) |
| Ineligible cost | 10% of hard and soft cost |
| Soft funds | $0 |
| Target yield on cost | 6.5% (market rate) |

No public source gives a site's construction cost, operating cost, loan terms or credit price. That is why they are examples and never presented as facts. HUD's public-housing cost limits are not used as a cost estimate.

## The arithmetic

**Rents**

- **Tax credit homes:** 30% of the MTSP limit for the household the bedrooms imply ÷ 12, rounded down, less the utility allowance. The household is 1.5 persons a bedroom; a studio counts one person; a half person takes the mean of the two neighboring limits. Examples: a 2-bedroom at 60% AMI is $59,640 × 30% ÷ 12 = $1,491 − $171 = $1,320. A 1-bedroom at 50% is (38,650 + 44,200) ÷ 2 = $41,425 × 30% ÷ 12 = $1,035. A tax credit rent is never set above the market rent for the same size. Before the utility allowance, these rents equal PHFA's published 2026 maximum rents for Allegheny County at every level and size from studio to 3BR, and a test holds them equal.
- **Market homes:** the tract's 2-bedroom asking rent (medium or high confidence), else the ZIP's 2-bedroom Small Area FMR, scaled to each size by the ZIP's Small Area FMR ratios.

The Place page's other rent figure, "the rent that fits", uses the Section 8 limits. The two agree at 50% AMI and differ by a few dollars at 30% and 80%; each is labeled.

**Operating income and loan**

- Gross rent = homes × rent × 12, by level and size.
- Effective gross income = gross rent × (1 − vacancy).
- Net operating income = effective gross income − homes × (operating cost + reserves).
- Loan = net operating income ÷ coverage ÷ the mortgage constant, where the constant is 12 × the monthly payment on $1 at the rate and amortization.

**Uses**

- Gross floor area = the mix's net floor area ÷ efficiency.
- Hard cost = gross floor area × cost a sq ft.
- Soft cost = hard × share.
- Land = homes × land a home.
- Developer fee: PHFA's formula and caps, as above.
- Total development cost = the sum.

**Credits (9% and 4%)**

1. Eligible basis = (hard + soft) × (1 − ineligible share), held to PHFA's basis limit × homes, plus the developer fee.
2. × 1.3 in a QCT or DDA (or by PHFA waiver, 9% only).
3. × the applicable fraction, the lesser of the share of homes with an income limit and their share of floor area.
4. × the credit rate, held to PHFA's per-project cap for 9%.
5. Equity = the annual credits × 10 years × the credit price.

**Sources and gap**

- Sources = loan + equity + soft funds you expect.
- Gap = uses − sources.
- The developer fee is deferred against a gap before anything else. The card shows the gap before and after, and the tax credit sheet reads the deferred share for line 4.5.9.

**Checks**

- PHFA feasibility and D.4.a (above);
- the federal set-aside (which test the mix meets);
- homes at 80% AMI count only under income averaging;
- for 4% deals, the bond volume the 25% test asks for.

**Market rate**

- Yield on cost = net operating income ÷ total development cost (no developer fee line: the yield is the return).
- Average rent that breaks even = (target yield × cost + operating cost) ÷ (1 − vacancy) ÷ 12 ÷ homes.
- Land value the rents support = net operating income ÷ target yield − (hard + soft).

Where most of the tract is in the inclusionary overlay and the project has 20 or more homes, 10% of the homes (rounded up) move to 50% AMI before the arithmetic runs (§907.04.A).

**Sensitivity:** a 5 × 5 table of hard cost (±10% and ±20%) against the credit price (±3 and ±6 cents) for the gap, or against market rents (±5% and ±10%) for the yield. The middle cell is the base case, and a test holds it equal to the card's own figure.

## What it feeds

The tax credit sheet reads the pencil for D.4.b (loan and soft funds ÷ total development cost) and the draft's 4.5.9 (deferred fee ÷ developer fee), and hints at D.4.a. "Project sheet (CSV)" downloads every line with its arithmetic.

## Limits

- **Not an underwriting:** no construction loan, no lease-up, no operating pro forma by year, no tax abatement, no project-based subsidy, no historic credits, no acquisition credits.
- **Examples:** the costs, operating figures, loan terms and credit price are the person's to enter.
- **The tract stands in for the site:** QCT and DDA status and the overlay come from the tract, not the site.
- **Rules change:** PHFA can change its caps each round, and the 2027/2028 plan was a draft on 2026-10-15.
