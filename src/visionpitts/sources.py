"""Registry of every data source: id, name, URL, vintage, geography, method, caveats. Written to data/processed/sources.md."""
from __future__ import annotations

import hashlib
from datetime import date

from visionpitts.config import PROCESSED, RAW

SOURCES: list[dict] = [
    dict(id="tiger", name="Census cartographic boundary files 2023 (2020 tracts, Pittsburgh place)",
         url="https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html",
         vintage="2023 release (2020 geography)", geography="tract, place",
         method="Tract land area mostly inside the Pittsburgh city polygon (>=50%, EPSG:2272) defines the study set.",
         caveats="Cartographic (generalized) boundaries; fine for tract-level mapping, not parcel work."),
    dict(id="blocks2020", name="TIGER/Line 2020 tabulation blocks (PA) with HOUSING20 / POP20",
         url="https://www2.census.gov/geo/tiger/TIGER2020/TABBLOCK20/tl_2020_42_tabblock20.zip",
         vintage="2020", geography="block",
         method="Block internal points placed in 2010 block groups; 2020 housing units weight every 2010->2020 crosswalk.",
         caveats="Housing-unit weights assume units are spread evenly within a block."),
    dict(id="bg2010", name="TIGER/Line 2010 block groups (Allegheny County)",
         url="https://www2.census.gov/geo/tiger/TIGER2010/BG/2010/tl_2010_42003_bg10.zip",
         vintage="2010", geography="block group", method="Target polygons for the block-point crosswalk.", caveats=""),
    dict(id="neighborhoods", name="City of Pittsburgh neighborhoods (WPRDC)",
         url="https://data.wprdc.org/dataset/neighborhoods2", vintage="current", geography="neighborhood",
         method="Largest-area-overlap neighborhood label per tract; dissolved polygons for search.",
         caveats="Label only; tracts and neighborhoods do not nest."),
    dict(id="acs", name="ACS 5-year 2020-2024 (Census API)",
         url="https://api.census.gov/data/2024/acs/acs5", vintage="2020-2024", geography="tract",
         method="Estimates and 90% margins of error; CV = MOE/1.645/estimate. Context only, not a scoring factor.",
         caveats="Small-tract CVs are often above 30%; shown as low reliability."),
    dict(id="chas", name="HUD CHAS 2018-2022, Table 8 (tenure x income x cost burden)",
         url="https://www.huduser.gov/portal/datasets/cp.html", vintage="2018-2022", geography="tract",
         method="Renter households <=30% and 30-50% HAMFI (need_count); of those, cost burden >30% (burden share). "
                "Columns chosen by parsing the CHAS data dictionary. MOEs combined root-sum-square.",
         caveats="HUD rounds counts; small tracts have large MOEs. HAMFI is treated as AMI."),
    dict(id="svi", name="CDC/ATSDR Social Vulnerability Index 2022 (Pennsylvania)",
         url="https://www.atsdr.cdc.gov/place-health/php/svi/svi-data-documentation-download.html",
         vintage="2022 (ACS 2018-22)", geography="tract",
         method="RPL_THEMES (overall) and RPL_THEME1-4 kept; -999 -> null; re-ranked across city tracts in the composite.",
         caveats="Ranks are within Pennsylvania; the composite re-ranks them within the city."),
    dict(id="hcv", name="HUD Housing Choice Vouchers by tract (ArcGIS)",
         url="https://hudgis-hud.opendata.arcgis.com/datasets/HUD::housing-choice-vouchers-by-tract",
         vintage="through 12/2025", geography="tract",
         method="HCV_PUBLIC (tenant- and project-based) divided by ACS renter households (B25003_003).",
         caveats="HUD suppresses tracts with <=10 voucher holders: null, not zero."),
    dict(id="eviction", name="Eviction Lab Eviction Tracking System, Pittsburgh (monthly, by ZIP)",
         url="https://evictionlab.org/eviction-tracking/pittsburgh-pa/", vintage="2023-2025 mean (file updated 2026-09)", geography="ZIP",
         method="Mean annual filings 2023-2025 per ZIP, split among 2020 tracts by the housing units of the blocks inside each ZCTA; "
                "then per 100 renter households (ACS). Null where <50% of a tract's housing sits in a covered ZIP.",
         caveats="An apportioned estimate, not a tract observation: the displacement confidence tag drops one level wherever it is used."),
    dict(id="mva2021", name="Reinvestment Fund Market Value Analysis 2021, Allegheny County (WPRDC)",
         url="https://data.wprdc.org/dataset/market-value-analysis", vintage="2021", geography="block group (2010)",
         method="Letter -> ordinal score within vintage (A=1 ... J=0); 2020 block points joined to MVA polygons; "
                "housing-unit-weighted mean per tract. Null if <50% of housing units are classified.",
         caveats="NC (non-classified) areas are null."),
    dict(id="mva2016", name="Reinvestment Fund Market Value Analysis 2016, City of Pittsburgh (URA) and Allegheny County",
         url="https://data.wprdc.org/dataset/market-value-analysis", vintage="2016", geography="block group (2010)",
         method="Same letter scoring as 2021, within the 2016 model. City blocks use the URA city model, others the county model. "
                "Used only for the direction of change 2016->2021.",
         caveats="Categories are not comparable 1:1 across vintages or between the two 2016 models; direction only."),
    dict(id="qct", name="HUD LIHTC Qualified Census Tracts 2026",
         url="https://www.huduser.gov/portal/datasets/qct.html", vintage="2026", geography="tract",
         method="Tract flagged if listed.", caveats=""),
    dict(id="dda", name="HUD 2026 Small Area Difficult Development Areas (ZCTA)",
         url="https://www.huduser.gov/portal/datasets/qct.html", vintage="2026", geography="ZCTA",
         method="Pittsburgh HUD Metro FMR Area ZCTAs with 2026 SDDA = 1; a tract is flagged if its largest-overlap ZCTA is an SDDA.",
         caveats="ZCTA -> tract by area overlap."),
    dict(id="zcta", name="Census TIGERweb 2020 ZIP Code Tabulation Areas (Allegheny)",
         url="https://tigerweb.geo.census.gov/", vintage="2020", geography="ZCTA",
         method="Geometry for the DDA assignment.", caveats=""),
    dict(id="oz", name="Opportunity Zones (HUD ArcGIS)",
         url="https://hudgis-hud.opendata.arcgis.com/datasets/HUD::opportunity-zones", vintage="2018 designation",
         geography="tract (2010)",
         method="2020 tract flagged if >=50% of its housing units sit in designated 2010 tracts.",
         caveats="Designations are fixed on 2010 tracts; crosswalked."),
    dict(id="cdbg", name="City of Pittsburgh CDBG-eligible block groups 2018 (WPRDC)",
         url="https://data.wprdc.org/dataset/cdbg-eligible-block-groups", vintage="2018 (HUD LMISD)", geography="block group (2010)",
         method="2020 tract flagged if >=50% of its housing units sit in block groups with cdbg2018 = Yes.",
         caveats="City only, which matches this tool's scope."),
    dict(id="gtfs", name="Pittsburgh Regional Transit GTFS static feed",
         url="https://www.rideprt.org/business-center/developer-resources/", vintage="feed of June 2026", geography="stop",
         method="Departures on a representative Wednesday at stops within 400 m of the tract, divided by tract land acres.",
         caveats="Schedule, not ridership or reliability. The 400 m buffer crosses tract lines, so small dense tracts score high."),
    dict(id="hand", name="HAND-derived inundation share (MUSA 6950 coursework output on USGS 3DEP)",
         url="https://www.usgs.gov/3d-elevation-program", vintage="2024", geography="tract",
         method="flood_share_pct = share of tract land inside the HAND inundation footprint, read as published.",
         caveats="Terrain-based screening model, not a FEMA floodplain; ignores stormwater and flash flooding."),
    dict(id="overture", name="Overture Maps buildings (latest release)",
         url="https://docs.overturemaps.org/guides/buildings/", vintage="2026-09", geography="building footprint",
         method="Footprints inside the demo tracts; height from Overture `height`, else county assessment stories x 3.3 m + 1.5 m, "
                "else Overture floors x 3.3 m, else 6 m default (drawn faded). 3D display only.",
         caveats="Guessed heights are labeled. Not a scoring input."),
    dict(id="wprdc_parcels", name="Allegheny County parcel boundaries (WPRDC)",
         url="https://data.wprdc.org/dataset/allegheny-county-parcel-boundaries", vintage="2026-09", geography="parcel",
         method="Each demo-tract building is matched to a parcel by its representative point to look up the assessment record.",
         caveats="Condo and multi-building parcels share one record."),
    dict(id="wprdc_assessments", name="Allegheny County property assessments (WPRDC)",
         url="https://data.wprdc.org/dataset/property-assessments", vintage="2026", geography="parcel",
         method="Only STORIES and YEARBLT are read, for building heights and age. No owner, sale or value fields are used.",
         caveats="Stories are recorded for the main dwelling only; commercial and exempt parcels are often blank."),
    dict(id="dewey_listings", name="RentHub rental listings via Dewey Data, Pennsylvania (scraped asking rents; licensed)",
         url="https://www.deweydata.io/", vintage="scrapes 2014-01 to 2026-08 (layer uses 2019-2026)",
         geography="listing point -> 2020 tract",
         method="Point-in-polygon to tracts; rent $300-$10k, 0-5 BR; one observation per unit per scrape month (pre-2023 unit ids "
                "restored from Dewey's listing-property mapping). Tract medians for 2BR and all units; growth 2019-20 -> 2025-26 on "
                "units in buildings first listed before 2019 (all-listings growth kept as a labeled second column); mix-adjusted "
                "index = median of rent / county same-bedroom-and-year median; flag against the HUD FY2026 2BR FMR ($1,299, "
                "Pittsburgh HMFA). Cells with fewer than 10 distinct units (20 for pooled levels and growth) are suppressed. "
                "Information only: never a scoring factor.",
         caveats="Licensed listing data, market-rate skew: asking (not contract) rents; professionally managed and turnover units "
                 "over-represented, subsidized and long-tenure units absent. Dewey terms (s.3.2) allow publishing summary insights "
                 "but not the licensed rows, so raw files stay in data/raw and only tract aggregates are published. "
                 "Attribution (s.3.3): rental listing data by RentHub, licensed through Dewey Data Inc."),
    dict(id="acs_levels", name="ACS 5-year 2020–2024, Explore data browser (37 variables) for tracts, block groups, ZCTAs, "
                               "Allegheny County and the City of Pittsburgh",
         url="https://api.census.gov/data/2024/acs/acs5", vintage="2020–2024",
         geography="tract, block group, ZCTA, county, place",
         method="Estimates and 90% margins of error from the Census API. Sums use root-sum-square MOEs; shares use the ACS "
                "proportion formula with the ratio fallback; CV = MOE / 1.645 / estimate; reliability high < 15%, medium "
                "15–30%, low > 30%. Zero-vehicle share uses B25044 (tenure by vehicles) because B08201 is not published for "
                "block groups. Descriptive only, never scored.",
         caveats="Block-group and ZCTA estimates often have CVs above 30%; campus tracts have few households. Bundled files "
                 "hold the city subset; county-wide rows are served from Supabase when online."),
    dict(id="tiger_levels", name="Cartographic boundaries: block groups, county (Census cb_2023 500k) and ZCTAs (TIGERweb 2020)",
         url="https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html",
         vintage="2023 (2020 geography)", geography="block group, county, ZCTA",
         method="Simplified in EPSG:2272 (5 m block groups, 10 m ZCTA/county/city), coordinates to 5 decimals. City "
                "membership: block groups ≥ 50% of area inside the city, ZCTAs ≥ 1%.",
         caveats="ZCTAs approximate USPS ZIP codes and do not nest in the city."),
]

RAW_FILES = {
    "tiger": ["boundaries/allegheny_tracts/allegheny_tracts.shp", "boundaries/pittsburgh_city/pittsburgh_city.shp"],
    "blocks2020": ["crosswalks/tiger/tl_2020_42_tabblock20.zip"],
    "bg2010": ["crosswalks/tiger/tl_2010_42003_bg10.zip"],
    "neighborhoods": ["benchmark/neighborhoods/neighborhoods.geojson"],
    "chas": ["benchmark/chas/2018thru2022-140-csv.zip", "benchmark/chas/CHAS-data-dictionary-18-22.xlsx"],
    "svi": ["benchmark/svi/svi2022_pa.csv"],
    "hcv": ["benchmark/hcv/hcv_by_tract_42003.json"],
    "mva2021": ["benchmark/mva/mva2021.geojson"],
    "mva2016": ["benchmark/mva/mva2016.zip", "benchmark/mva/pittsmva2016.zip"],
    "qct": ["benchmark/flags/QCT2026CSV.zip"],
    "dda": ["benchmark/flags/2026-DDAs-Data-Used-to-Designate.xlsx"],
    "zcta": ["benchmark/flags/zcta2020_allegheny.geojson"],
    "oz": ["benchmark/flags/oz_42003.json"],
    "cdbg": ["benchmark/flags/cdbg2018_pgh_bg.csv"],
    "gtfs": ["benchmark/gtfs/prt_gtfs.zip"],
    "hand": ["hand/tract_ndvi_flood.csv"],
    "eviction": ["eviction/all_sites_monthly_2020_2021.csv"],
    "wprdc_parcels": ["parcels/alleghenycounty_parcels202609.geojson"],
    "wprdc_assessments": ["parcels/assessments.csv"],
    "dewey_listings": ["dewey_cache/allegheny_listings.parquet", "dewey_cache/id_mapping.parquet"],
    "acs_levels": ["acs/acs5_2024_tract.csv", "acs/acs5_2024_bg.csv", "acs/acs5_2024_zcta.csv", "acs/acs5_2024_county.csv",
                   "acs/acs5_2024_city.csv"],
    "tiger_levels": ["boundaries/allegheny_bgs/allegheny_bgs.shp", "boundaries/allegheny_county/allegheny_county.shp",
                     "benchmark/flags/zcta2020_allegheny.geojson"],
}


def by_id() -> dict[str, dict]:
    return {s["id"]: s for s in SOURCES}


def _sha(path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def write_md() -> None:
    lines = [
        "# Data sources",
        "",
        f"Generated by `scripts/02_build_factors.py` on {date.today().isoformat()}. Factor formulas: `docs/data/factor_methods.md`.",
        (
            "Scope: City of Pittsburgh 2020 census tracts for scoring; the Explore data browser adds block groups, ZCTAs, the "
            "county and the city (acs_levels, tiger_levels) as description only. Every value shown in the app traces to one of "
            "these rows."
        ),
        "",
        "| id | name | url | vintage | geography | method | caveats |",
        "|---|---|---|---|---|---|---|",
    ]
    for s in SOURCES:
        lines.append(f"| {s['id']} | {s['name']} | {s['url']} | {s['vintage']} | {s['geography']} | {s['method']} | {s['caveats']} |")
    lines += ["", "## Local raw files (git-ignored) and checksums", "", "| file | source | bytes | sha256 (first 16) |", "|---|---|---|---|"]
    for sid, files in RAW_FILES.items():
        for rel in files:
            p = RAW / rel
            if p.exists():
                lines.append(f"| {rel} | {sid} | {p.stat().st_size:,} | `{_sha(p)}` |")
    (PROCESSED / "sources.md").write_text("\n".join(lines) + "\n")


def for_app() -> list[dict]:
    return [{k: s[k] for k in ("id", "name", "url", "vintage", "geography", "method", "caveats")} for s in SOURCES]
