# VisionPitts

*Great decisions need vision. We give you one.*

VisionPitts is a free, map-based tool about housing in Pittsburgh and Allegheny County. It shows who lives in each neighborhood, what they pay for housing, and which kinds of new homes could help renters with low incomes without pushing them out.

Solo entry for the **AI Horizons 2026 · AI for Housing Hackathon**, Track 3 (Housing Typology, Equity & Climate Matchmaker).

- **Try it:** [ye-zhang-vision-pitts.vercel.app](https://ye-zhang-vision-pitts.vercel.app)
- **Demo video:** [watch on Google Drive](https://drive.google.com/drive/folders/1sGpKEhHjHAfOVwkX1uGUhARW7VnUAS8f?usp=sharing) (a copy is also in this repository)
- **No internet needed:** double-click `export/index.html` for a one-file copy of the tool
- **Technical notes:** [docs/TECHNICAL.md](docs/TECHNICAL.md) (how to rebuild the data, every source, the method)

![The start page: a live 3D map of Downtown Pittsburgh](docs/screenshots/00-landing.png)

## Built within the hackathon rules

| Rule | How VisionPitts meets it |
|---|---|
| Build only during the event | The event started Saturday, September 26, 2026, at 9:00 a.m. ET and ends Sunday, September 27, at 11:59 p.m. ET. All code in this repository was written in that window. |
| No code written before kickoff | None. Public datasets downloaded earlier were used only as raw input, and no earlier code was copied. |
| Public repository with a real history | This repository is public. Its first commit is Saturday 3:31 p.m.; the project moved to this repository name at 3:25 p.m., bringing the work done since 10:47 a.m. with it. |
| Team | Solo: Ye Zhang. |
| Data use | Public data only for everything the tool scores. One licensed dataset (rental listings from Dewey Data) appears as information only, and only as neighborhood-level summaries, as its license allows. Raw files are never stored in this repository. |
| Privacy | No information about individual people. Everything is shown for areas of a census tract or larger. |
| AI disclosure | Every AI tool is listed under [Tools used](#tools-used). |
| Secrets | No passwords or API keys in the repository. |
| License | MIT, see [LICENSE](LICENSE). |

VisionPitts is a decision aid. It shows evidence; people make the decision. It is not legal, financial or zoning advice.

## What it does

The tool has two parts.

**Explore** is a map you can look around freely.
- Choose Pittsburgh or the whole county, and how to divide it: neighborhoods (census tracts), smaller blocks, ZIP codes, or the 129 towns around the city.
- Color the map by any of 37 census figures, such as rent, income or how many people rent, or by land use and zoning.
- Click any place to see a short summary of it next to the city and the county, including how rent and income changed from 2014 to 2024.
- Ask a question in plain words, such as "Describe the neighborhoods around Hazelwood." The answer uses only the tool's own numbers, and every number is checked.

**Analysis** helps compare options for the 128 city neighborhoods, 114 of which have enough households to rank.
- **Place:** pick what you care about most (for example, keeping current renters housed) and who you are planning for. The tool suggests which of five housing types fits each neighborhood and shows why, with the numbers behind it.
- **Compare places:** two neighborhoods side by side.
- **Equity & policy:** where renters need help most, and what four policy ideas (such as allowing backyard homes) would change.

A short guided tour explains everything the first time you open the tool.

## Who it is for

City planners, community development groups, housing nonprofits and residents who want to talk about housing with the same facts in front of them.

**Example:** a community group in Hazelwood is deciding what to ask a developer for. The tool shows that many renters there earn half the area's median income or less, what rent they can afford, and that small two- or three-unit homes fit the neighborhood. The group brings those numbers to the meeting.

| Explore | Place | Compare places | Equity & policy |
|---|---|---|---|
| ![](docs/screenshots/01-explore.png) | ![](docs/screenshots/03-match-hazelwood.png) | ![](docs/screenshots/05-compare-tracts.png) | ![](docs/screenshots/06-compare-scenarios.png) |
| **A place summary** | **A town outside the city** | **Project details and sources** | **The guided tour** |
| ![](docs/screenshots/10-place-summary.png) | ![](docs/screenshots/11-municipality-detail.png) | ![](docs/screenshots/07-sources.png) | ![](docs/screenshots/13-tour.png) |

## Where the data comes from

| What it shows | Source |
|---|---|
| People, income, rent, homes | U.S. Census Bureau, American Community Survey (2020–2024, and every year back to 2014) |
| Renters with low incomes | U.S. Department of Housing and Urban Development (HUD), CHAS data |
| Risk of being pushed out | CDC Social Vulnerability Index, HUD housing vouchers, Eviction Lab |
| Housing market strength | Reinvestment Fund market study, through the Western Pennsylvania Regional Data Center (WPRDC) |
| Transit | Pittsburgh Regional Transit schedules |
| Flood risk | A terrain-based flood screen and FEMA flood maps |
| Land use | Allegheny County property records |
| Zoning | City of Pittsburgh zoning map (WPRDC) |
| Asking rents (information only) | Rental listings from RentHub, licensed through Dewey Data |
| Map, terrain, address search | OpenFreeMap, Mapterhorn, Photon, U.S. Census Geocoder |

Every source, with dates and links, is listed in the app under **Project Details & Sources** and in [data/processed/sources.md](data/processed/sources.md).

## How AI is used

- **To help build the tool:** Claude Code helped write the code, tests and documents. Every change was reviewed and run by the author.
- **To explain, never to decide:** a language model (DeepSeek) writes short explanations and answers questions. It only receives numbers the tool already computed, and every number it writes is checked before it is shown. If a number cannot be matched, the answer is held back or marked.
- **Scores come from plain math, not AI.** The same formulas run in the app and in the data pipeline, and tests check that they agree.

## What it cannot tell you

- It does not check whether a specific lot can be built on, or what the zoning code allows there for certain; the zoning reading in the tool is marked as unverified.
- It does not cover roads, sewers and other infrastructure, or building costs.
- Census figures for small areas are estimates and can be off.
- Flood risk comes from a screening model, not a detailed engineering study.
- Asking rents come from online listings, which lean toward newer, market-rate homes.
- The housing suggestions reflect stated priorities. Change the priorities and the suggestions change. The full list of choices is in [docs/assumptions.md](docs/assumptions.md).

## Run it yourself

```bash
open export/index.html                 # the one-file copy; no install needed
cd app && npm install && npm run dev   # the full app at http://localhost:5173
```

Rebuilding the data takes Python 3.12 and a free Census API key; the steps are in [docs/TECHNICAL.md](docs/TECHNICAL.md#quick-start).

## Tools used

| Tool | Used for |
|---|---|
| Claude Code (Anthropic) | Help writing the code, tests and documents |
| DeepSeek API | Short explanations and answers inside the app |
| Claude API | Backup for those explanations when DeepSeek is not set up |
| Python, pandas, GeoPandas | Preparing the data |
| React, MapLibre, Tailwind | The website and the map |
| Supabase | Storing county-wide data for the live site |
| Vercel | Hosting the live site |
| Playwright, Vitest, pytest | Testing |

## Team and license

**Ye Zhang**, University of Pennsylvania, solo. MIT license, see [LICENSE](LICENSE). The data keep their original licenses.
