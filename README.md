# VisionPitts

*Great decisions need vision. We give you one.*

**VisionPitts is a free, live map-based decision-support tool that matches Pittsburgh neighborhoods with the kinds of new housing that fit them: ADUs, duplexes and triplexes, townhomes, small apartment buildings, or senior housing.** It answers the question behind [Track 3, Housing Typology, Equity & Climate Matchmaker](https://ai-horizons-2026-ai-for-housing-hackathon.brandon831577.chatgpt.site/challenges/typology-equity-climate): not just "we need missing middle," but which type, where, for whom, at what rent, and with what trade-offs.

**Who it is for**, the four users named in the challenge:
- **Municipal planners** checking where a housing type fits and what zoning or policy changes would reach.
- **Community development corporations** choosing projects that serve the renters who live there now.
- **Developers** seeing which product types a neighborhood's renters and market can support.
- **Residents and public officials** looking at the same facts when they weigh growth options.

**How it meets the challenge:**
- **Real data for a real place:** the 128 City of Pittsburgh neighborhoods (census tracts) and all of Allegheny County, from public sources (census, HUD, CDC, FEMA, transit, zoning, property records).
- **Matches neighborhoods to housing types** using renter need and income, displacement risk, market strength, transit access, flood exposure, land use and zoning, and shows the rent a household can afford.
- **Compares scenarios, not one answer:** switch between four stances (anti-displacement, market-led, transit-first, climate-resilient), compare two places side by side, and test four policy ideas across the city.
- **Explains every ranking** with the numbers behind it, and lets you **adjust the weights** under Advanced settings.
- **Keeps facts and value judgments apart:** measured data is labeled as fact; the housing-fit rules and weights are labeled as opinion and published for review.

**Everything is live.** Every feature in this README works today on [ye-zhang-vision-pitts.vercel.app](https://ye-zhang-vision-pitts.vercel.app): the maps, place summaries, housing matches, comparisons, policy tests, exports and the AI question box. Nothing is mocked. No sign-in or install is needed.

Solo entry by **Ye Zhang** (University of Pennsylvania) for the **AI for Housing Hackathon, part of AI Horizons 2026**.

- **Live tool:** [ye-zhang-vision-pitts.vercel.app](https://ye-zhang-vision-pitts.vercel.app)
- **Demo video (4:52):** watch on [YouTube](https://youtu.be/Djrm4iL432Y?si=oSveJBN788bhJig3); a compressed copy is in this repo at [docs/demo/VisionPitts-Demo.mp4](docs/demo/VisionPitts-Demo.mp4) (1280×800, 37 MB); the full-quality version is on [Google Drive](https://drive.google.com/drive/folders/1sGpKEhHjHAfOVwkX1uGUhARW7VnUAS8f?usp=sharing)
- **Offline copy:** open `export/index.html` (one file, no install; everything except the AI question box)
- **Technical notes:** [docs/TECHNICAL.md](docs/TECHNICAL.md) (data rebuild, every source, the method)

> **Decision support only — not legal, financial or zoning advice.** The tool shows evidence and its arithmetic; people make the decision.

![The start page: a live 3D map of Downtown Pittsburgh](docs/screenshots/00-landing.png)

## Hackathon rules

| Rule | How VisionPitts follows it |
|---|---|
| Build window | Every commit in this repository was made inside the build window, Saturday, September 26, 9:00 a.m. ET to Sunday, September 27, 11:59 p.m. ET. The first commit is Saturday 3:31 p.m. ET, and the history is intact. |
| AI tools | Allowed and disclosed below, under [How AI is used](#how-ai-is-used). AI helps explain results; it never produces a score or a recommendation. |
| Libraries, APIs and data | Listed below. Public data only for everything the tool scores. |
| Privacy | No information about individual people. Everything is shown for census tracts or larger areas. |
| Secrets | No API keys or passwords in the repository or its history. Keys live in the hosting environment; see `.env.example`. |
| Team and license | Solo. MIT, see [LICENSE](LICENSE). The data keep their original licenses. |

## What it does

**Explore:** a map of the city or the whole county, by census tract, block group, ZIP code or the 129 towns.
- Color the map by any of 37 census figures, or by land use and zoning.
- Click a place for a summary next to the city and the county, including rent and income from 2014 to 2024.
- Ask a question in plain words. The answer uses only the tool's own numbers.

**Analysis:** the 128 city neighborhoods, 114 of which have enough households to rank.
- **Place:** pick a priority (for example, keeping current renters housed) and who you are planning for. The tool suggests which of five housing types fits and shows the numbers behind it.
- **Compare places:** two neighborhoods side by side.
- **Equity & policy:** where renters need help most, and what four policy ideas (such as allowing backyard homes) would change.

| Explore | Place | Compare places | Equity & policy |
|---|---|---|---|
| ![](docs/screenshots/01-explore.png) | ![](docs/screenshots/03-match-hazelwood.png) | ![](docs/screenshots/05-compare-tracts.png) | ![](docs/screenshots/06-compare-scenarios.png) |

## How AI is used

| Tool | What it does | What it never does |
|---|---|---|
| **Claude Code** (Anthropic) | Helped write the code, tests and documents. I set the method, data choices and scoring rules, and reviewed and ran every change. | — |
| **DeepSeek API** (`deepseek-flash`) | Powers VisionPitts-Chat, the question box, and the short "Insight" paragraph in Equity & policy. | Compute a score, a ranking or a recommendation. |
| **Claude API** (Anthropic) | Wired in as a backup for the same text. Not switched on for the live site. | Same as DeepSeek. |

- **Grounded:** the model only receives area-level numbers the tool already computed. No records about individual people are sent.
- **Checked:** every number in an AI answer is matched against those numbers before it is shown. In Analysis, an answer that fails the check is held back. In Explore it is shown with a warning.
- **Labeled:** every chat answer is marked "AI-written". Background from general knowledge is labeled as such and carries no figures.
- **Optional:** scores, rankings and suggestions come from published math in [config/scoring.json](config/scoring.json). The same formulas run in the app and the data pipeline, and tests check that they agree. Without an AI key, everything except the chat and the Insight paragraph still works.

## Data sources

| What it shows | Source |
|---|---|
| People, income, rent, homes | U.S. Census Bureau, American Community Survey (2020–2024, and yearly back to 2014) |
| Renters with low incomes | HUD CHAS data; HUD income limits and Fair Market Rents |
| Risk of being pushed out | CDC Social Vulnerability Index, HUD housing vouchers, Eviction Lab |
| Housing market strength | Reinvestment Fund market study (via WPRDC) |
| Transit | Pittsburgh Regional Transit schedules |
| Flood risk | FEMA flood maps and a terrain-based flood screen |
| Land use and zoning | Allegheny County property records; City of Pittsburgh zoning map (WPRDC) |
| Asking rents (information only) | RentHub listings licensed through Dewey Data, shown only as area summaries |
| Map, terrain, address search | OpenFreeMap, Mapterhorn, Photon, U.S. Census Geocoder |

Every source, with dates and links, is in the app under **Project Details & Sources** and in [data/processed/sources.md](data/processed/sources.md).

## Limitations

- Zoning is a screening reading, not checked lot by lot; it does not say what can legally be built on a site.
- No infrastructure capacity (roads, sewers) or building costs, and no carbon estimate for each housing type (no Pittsburgh data to base one on).
- Census figures for small areas are estimates with margins of error.
- Flood risk is a screening model, not an engineering study.
- Asking rents come from online listings, which lean toward newer, market-rate homes.
- Suggestions follow the stated priorities; change the priorities and the suggestions change. All choices are in [docs/assumptions.md](docs/assumptions.md).

## Run it yourself

```bash
open export/index.html                 # offline copy, no install
cd app && npm install && npm run dev   # full app at http://localhost:5173
```

Rebuilding the data needs Python 3.12 and a free Census API key; see [docs/TECHNICAL.md](docs/TECHNICAL.md#quick-start). The chat needs a `DEEPSEEK_API_KEY` (or `ANTHROPIC_API_KEY`) on the server; everything else runs without one.

## Libraries and services

Python, pandas, GeoPandas (data) · React, MapLibre, Tailwind, Motion, Zustand (app) · Supabase (county-wide data for the live site) · Vercel (hosting) · Vitest, pytest, Playwright (tests).
