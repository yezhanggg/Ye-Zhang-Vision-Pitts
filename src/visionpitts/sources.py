"""Registry of every data source: id, name, URL, vintage, geography, method, caveats. Written to data/processed/sources.md."""
from __future__ import annotations

import hashlib
from datetime import date

from visionpitts import hud
from visionpitts.config import PROCESSED, RAW

_HUD = hud.summary() or {}  # figures quoted below are read from the HUD workbooks, not typed in


def _usd(key: str) -> str:
    v = _HUD.get(key)
    return f"${v:,.0f}" if v is not None else "workbook not present at build time"


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
         method="Estimates and 90% margins of error; CV = MOE/1.645/estimate. Context, plus the household count that "
                "divides transit departures (floored at 400 households).",
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
         caveats="An apportioned estimate, not a tract observation. The displacement confidence tag drops one level where the "
                 "tract's housing sits in several ZIP codes and none holds at least 80% of it (eviction_zip_dominant)."),
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
         method="Tract flagged if listed. A QCT or Small-Area DDA gives the full subsidy grade (1.0).", caveats=""),
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
         method="2020 tract flagged if >=50% of its housing units sit in designated 2010 tracts. Alone (no QCT or DDA) it "
                "gives the partial subsidy grade (0.5).",
         caveats="Designations are fixed on 2010 tracts; crosswalked."),
    dict(id="cdbg", name="City of Pittsburgh CDBG-eligible block groups 2018 (WPRDC)",
         url="https://data.wprdc.org/dataset/cdbg-eligible-block-groups", vintage="2018 (HUD LMISD)", geography="block group (2010)",
         method="2020 tract flagged if >=50% of its housing units sit in block groups with cdbg2018 = Yes. Alone (no QCT or "
                "DDA) it gives the partial subsidy grade (0.5).",
         caveats="City only, which matches this tool's scope."),
    dict(id="gtfs", name="Pittsburgh Regional Transit GTFS static feed",
         url="https://www.rideprt.org/business-center/developer-resources/", vintage="feed of June 2026", geography="stop",
         method="Departures on a representative Wednesday at stops within 400 m of the tract, divided by the tract's "
                "households (ACS 2020-2024); tracts under 400 households are divided by 400. Departures per acre of land are "
                "kept as a second column.",
         caveats="Schedule, not ridership or reliability. The 400 m buffer crosses tract lines. The confidence tag drops one "
                 "level where the 400-household floor applies."),
    dict(id="hand", name="HAND-derived inundation share (MUSA 6950 coursework output on USGS 3DEP)",
         url="https://www.usgs.gov/3d-elevation-program", vintage="2024", geography="tract",
         method="flood_share_pct = share of tract land inside the HAND inundation footprint, read as published.",
         caveats="Terrain-based screening model, not a FEMA floodplain; ignores stormwater and flash flooding. Confidence is "
                 "medium at best, and low where more than 50% of the land reads as inundated. Implausibly high readings "
                 "under review: Shadyside 79.6%, Homewood South 75.5%, North Shore 74.3%, South Side Flats 68.7%."),
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
                "Pittsburgh HMFA, source `fmr`). Cells with fewer than 10 distinct units (20 for pooled levels and growth) are suppressed. "
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
                "block groups. Descriptive, except two tract shares that are scored as percentiles: residents 65 and over "
                "(B01001, factor senior_demand) and housing units in 2-4 unit buildings (B25024, factor "
                "small_multifamily_stock).",
         caveats="Block-group and ZCTA estimates often have CVs above 30%; campus tracts have few households. Bundled files "
                 "hold the city subset; county-wide rows are served from Supabase when online."),
    dict(id="tiger_levels", name="Cartographic boundaries: block groups, county (Census cb_2023 500k) and ZCTAs (TIGERweb 2020)",
         url="https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html",
         vintage="2023 (2020 geography)", geography="block group, county, ZCTA",
         method="Simplified in EPSG:2272 (5 m block groups, 10 m ZCTA/county/city), coordinates to 5 decimals. City "
                "membership: block groups ≥ 50% of area inside the city, ZCTAs ≥ 1%.",
         caveats="ZCTAs approximate USPS ZIP codes and do not nest in the city."),
    dict(id="fmr", name="HUD Fair Market Rents FY2026 (revised), county-level file",
         url="https://www.huduser.gov/portal/datasets/fmr.html", vintage="FY2026",
         geography="HUD Metro FMR Area (Pittsburgh, PA)",
         method="The Allegheny County row (fips 4200399999) of FY26_FMRs_revised.xlsx, read from the worksheet XML by "
                f"src/visionpitts/hud.py. The 2-bedroom rent ({_usd('fmr_2br')}) is the line asking rents are flagged "
                "against. Information only, never a scoring factor.",
         caveats="One rent for the whole metro area: it does not vary by neighborhood (Small Area FMRs by ZIP code are not "
                 "used). FMRs are 40th-percentile gross rents of recent movers, not asking rents."),
    dict(id="income_limits", name="HUD Section 8 income limits FY2026",
         url="https://www.huduser.gov/portal/datasets/il.html", vintage="FY2026",
         geography="HUD Metro FMR Area (Pittsburgh, PA)",
         method=f"The Allegheny County row of Section8-FY26.xlsx: median family income ({_usd('median_family_income')}) and "
                f"the limits for a four-person household at 30% ({_usd('ami_30_4p')}), 50% ({_usd('ami_50_4p')}) and 80% "
                f"({_usd('ami_80_4p')}). Shown next to the need factor so '50% of area median income' has a dollar value. "
                "Information only.",
         caveats="The need factor itself counts households with HUD CHAS 2018-2022 income bands (HAMFI), not these FY2026 "
                 "limits, so the dollar line is a guide to scale, not the threshold used in the count. HUD's 30% limit is "
                 "the greater of 30% of the median and the poverty guideline."),
    # ---- place measures (Analysis tab; scripts/10_build_place_measures.py -> app/src/data/place.json, hud_2026.json)
    dict(id="chas_bands", name="HUD CHAS 2018-2022, Table 8: renter households by HAMFI band and cost burden (place measures)",
         url="https://www.huduser.gov/portal/datasets/cp.html", vintage="2018-2022", geography="tract",
         method="Renter households (all facilities) in five HAMFI bands (<=30, 30-50, 50-80, 80-100, >100%) with the count paying "
                "more than 30% of income (the 30-50% and >50% cells added, MOE root-sum-square) and more than 50%. Columns chosen "
                "by parsing the CHAS data dictionary. Published counts, not re-estimated; MOEs at 90%.",
         caveats="HUD rounds small counts; a band whose MOE exceeds its estimate is labeled uncertain in the app. HAMFI is HUD's "
                 "area median family income, treated as AMI. Description only: the scored need factor is unchanged."),
    dict(id="chas_types", name="HUD CHAS 2018-2022, Table 7: renter households by household type and HAMFI band",
         url="https://www.huduser.gov/portal/datasets/cp.html", vintage="2018-2022", geography="tract",
         method="Renter households by type (elderly non-family = 1-2 persons, one 62 or over, shown as 'seniors living alone'; "
                "elderly family; small family 2-4 persons; large family 5+; other non-elderly non-family) in four bands "
                "(<=30, 30-50, 50-80, >80% = 80-100 plus >100). Cost-burden 'All' subtotals; one dictionary row (T7_est210) "
                "leaves that cell blank and is read as 'All'. Table 16 was rejected: no 80-100 split, 'housing problems' not cost burden.",
         caveats="Type x band cells are small and rounded; MOEs are kept in place_measures.csv but not shown per cell."),
    dict(id="hud_il_api", name="HUD User API: FY2026 income limits, Pittsburgh HMFA (entity 4200399999)",
         url="https://www.huduser.gov/hudapi/public/il/data/4200399999?year=2026", vintage="FY2026",
         geography="HUD Metro FMR Area (Pittsburgh, PA)",
         method="Median family income and the 30/50/80% limits for 1-8 persons, read from the API response cached under "
                "data/raw/benchmark/hud_api/. Affordable rent = 0.30 x limit / 12 at 1.5 persons per bedroom (a half person "
                "takes the mean of the two neighbouring limits; seniors living alone = 1 person), shown as the multiplication.",
         caveats="Gross rent with no utility allowance; a policy target, not a market price. The API token stays in .env."),
    dict(id="hud_safmr_api", name="HUD User API: FY2026 Fair Market Rents and Small Area FMRs by ZIP, Pittsburgh HMFA",
         url="https://www.huduser.gov/hudapi/public/fmr/data/4200399999?year=2026", vintage="FY2026", geography="ZIP code",
         method="Metro FMR (0-4 BR) and the Small Area FMR of every ZIP in the area; each tract takes the SAFMR of its "
                "largest-overlap ZCTA (the same assignment as the DDA flag).",
         caveats="ZCTAs approximate ZIP codes; SAFMRs are 40th-percentile gross rents of recent movers, not asking rents. "
                 "Information only, never a scoring factor."),
    dict(id="gtfs_frequent", name="Pittsburgh Regional Transit GTFS: frequent-stop access from 2020 blocks (place measures)",
         url="https://www.rideprt.org/business-center/developer-resources/", vintage="feed of June 2026 (service day 2026-07-01)",
         geography="stop, block, tract",
         method="Same representative Wednesday and pickup_type filter as the scored transit factor. A frequent stop has >= 64 "
                "departures that day (about one every 15 minutes over 16 hours). Per tract, weighted by 2020 block population: "
                "straight-line distance (EPSG:2272) from block internal points to the nearest frequent stop and to the nearest "
                "served stop; share of residents within a quarter mile (1,320 ft) of a frequent stop; weekday departures at "
                "stops within a quarter mile of the resident's block (population-weighted mean) and its percentile among ranked "
                "tracts. The departures at stops within a quarter mile of the tract polygon are kept in the CSV "
                "(departures_tract_qmi); they match the older 400 m transit_departures figure.",
         caveats="Straight-line, not walking distance; schedule, not ridership or reliability. Blocks without residents fall "
                 "back to an unweighted mean."),
    dict(id="zoning_wprdc", name="City of Pittsburgh zoning districts (WPRDC)",
         url="https://data.wprdc.org/dataset/zoning", vintage="downloaded 2026-09-27", geography="zoning polygon",
         method="Districts (zon_new) grouped into families (config/zoning_rules.json); share of each tract polygon's area in "
                "each family (EPSG:2272). By-type annotations (ADU, 2-3 unit, townhome, small apartment, senior housing) read "
                "yes / conditional / no / unknown when >= 5% of the tract's land lies in a family the table marks so, in that "
                "order. Cached under data/raw/benchmark/zoning/.",
         caveats="The by-right table is UNVERIFIED (verified: false) and must be confirmed against Pittsburgh Code Title 9; the "
                 "ADU column depends on the 2025 ordinance. Shown as an annotation, never a gate; programs (QCT, DDA, OZ, CDBG) "
                 "are a separate line. Mount Oliver Borough polygons are unmapped."),
    dict(id="fema_nfhl", name="FEMA National Flood Hazard Layer, Special Flood Hazard Areas (Allegheny County DFIRM 42003C)",
         url="https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28", vintage="effective NFHL as served 2026-09-27",
         geography="flood zone polygon",
         method="Layer 28 queried with DFIRM_ID='42003C' AND SFHA_TF='T', paged by the service's maxRecordCount and cached as "
                "GeoJSON under data/raw/benchmark/fema/. Share of each tract polygon's area (land and water, EPSG:2272) inside "
                "the SFHA union; the zone with the most area is named. Headline word: none / minor < 5% / moderate 5-15% / "
                "high > 15%.",
         caveats="Regulatory 1%-annual-chance zones only; river water inside the tract polygon counts toward the share. The "
                 "scored flood factor still uses the HAND terrain screen and is unchanged."),
    dict(id="parcel_sales", name="Allegheny County property assessments: sales, use and class fields (WPRDC), with parcel boundaries",
         url="https://data.wprdc.org/dataset/property-assessments", vintage="2026-09 extract", geography="parcel -> tract",
         method="Parcels placed in tracts by the representative point of their polygon (cached in data/interim). Per tract: "
                "median SALEPRICE of VALID SALE records dated on or after 2023-01-01 for residential dwelling uses (single family, "
                "rowhouse, townhouse, two/three/four family, condominium) and its count; the same pooled over queen neighbors; "
                "count of two- to four-family parcels; count of parcels whose use contains VACANT.",
         caveats="FAIRMARKETTOTAL is a 2012 base-year assessment and is never read. Few tracts have many valid sales in 33 "
                 "months; the count is shown beside every median. Condominium units are separate parcels."),
    dict(id="lodes_wac", name="LEHD LODES 8 Workplace Area Characteristics, Pennsylvania, all jobs (S000, JT00), 2023",
         url="https://lehd.ces.census.gov/data/lodes/LODES8/pa/wac/pa_wac_S000_JT00_2023.csv.gz", vintage="2023 (LODES 8, 2020 blocks)",
         geography="2020 census block (work place) -> tract",
         method="C000 (total primary and secondary jobs) at each Allegheny County 2020 work block, placed at the block's "
                "internal point (TIGER 2020). Per tract: for every resident block point, the jobs at work blocks within 1 "
                "mile (5,280 ft, straight line, EPSG:2272), then the 2020-population-weighted mean over the tract's blocks "
                "(jobs_1mi); jobs_1mi_pct is its percentile among the ranked tracts.",
         caveats="Straight line, not a commute or transit travel time; counts jobs, not jobs a resident is qualified for. "
                 "LODES adds noise to block counts (differential privacy style synthetic data) and places some jobs at a "
                 "firm's reporting address. Work blocks outside Allegheny County are not counted (the city is interior)."),
    dict(id="nces_schools", name="NCES Common Core of Data public school directory, Pennsylvania, 2024 (Education Data Portal)",
         url="https://educationdata.urban.org/api/v1/schools/ccd/directory/2024/?fips=42", vintage="2024-25 school year",
         geography="school point -> tract",
         method="Open (status 1, 3, 4, 5, 8), regular (school_type 1), not fully virtual public schools, district and charter, "
                "at their NCES coordinates. Per tract, 2020-population-weighted mean straight-line distance (EPSG:2272) from "
                "block internal points to the nearest such school (school_mi) and to the nearest one offering any grade K-5 "
                "(elem_mi).",
         caveats="Nearest school is not the assigned attendance school (Pittsburgh Public Schools uses feeder patterns and "
                 "magnets); special education and career-technical centers are excluded; private schools are not in CCD."),
    dict(id="osm_services", name="OpenStreetMap everyday services in Allegheny County (Overpass API)",
         url="https://overpass-api.de/api/interpreter", vintage="OSM base 2026-07-28",
         geography="point (nodes; way and relation centers) -> tract",
         method="Each element counted once, as: grocery (shop=supermarket or grocery), pharmacy (amenity or healthcare="
                "pharmacy), health (amenity=clinic, doctors, hospital or healthcare=clinic, doctor, hospital) or library "
                "(amenity=library). Per tract, 2020-population-weighted over block internal points: straight-line miles to "
                "the nearest grocery (grocery_mi) and the number of services within half a mile (2,640 ft; services_halfmi).",
         caveats="Volunteer-mapped: coverage and tagging vary, convenience stores and dollar stores are not groceries here, "
                 "and a large campus may carry several doctor or clinic points. Straight line, not walking distance. "
                 "Data (c) OpenStreetMap contributors, ODbL."),
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
    "fmr": ["benchmark/hud/FY26_FMRs_revised.xlsx"],
    "income_limits": ["benchmark/hud/Section8-FY26.xlsx"],
    "chas_bands": ["benchmark/chas/2018thru2022-140-csv.zip"],
    "chas_types": ["benchmark/chas/2018thru2022-140-csv.zip", "benchmark/chas/CHAS-data-dictionary-18-22.xlsx"],
    "hud_il_api": ["benchmark/hud_api/il_4200399999_2026.json"],
    "hud_safmr_api": ["benchmark/hud_api/fmr_4200399999_2026.json"],
    "gtfs_frequent": ["benchmark/gtfs/prt_gtfs.zip", "crosswalks/tiger/tl_2020_42_tabblock20.zip"],
    "zoning_wprdc": ["benchmark/zoning/zoning.geojson"],
    "fema_nfhl": ["benchmark/fema/nfhl28_42003C_sfha.geojson"],
    "lodes_wac": ["benchmark/access/pa_wac_S000_JT00_2023.csv.gz", "crosswalks/tiger/tl_2020_42_tabblock20.zip"],
    "nces_schools": ["benchmark/access/ccd_directory_pa_2024.json"],
    "osm_services": ["benchmark/access/osm_services_overpass.json"],
    "parcel_sales": ["parcels/assessments.csv", "parcels/alleghenycounty_parcels202609.geojson"],
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
