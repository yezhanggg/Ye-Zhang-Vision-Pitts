"""Place measures for the Analysis tab: one flat row per city tract, then app/src/data/place.json and hud_2026.json.

Everything here is observed data or arithmetic on published figures. Nothing enters the score: config/scoring.json,
factors.py, scoring.py and the export's tract properties are untouched. Missing stays missing; a null in place.json
renders "not available" and nothing is imputed.

Measures (plan section 2):
  bands    HUD CHAS 2018-2022 Table 8: renter households by HAMFI band with the count paying more than 30% and more
           than 50% of income. Columns are picked by their dictionary wording, never by number.
  types    CHAS Table 7: renter households by household type x HAMFI band. Table 16 was considered and rejected: it has
           no 80-100% split and classes households by "housing problems", not by cost burden.
  hud      FY2026 income limits and Small Area FMRs from the HUD User API. The token HUD_API_KEY is read from the
           environment (visionpitts.config loads .env) and is never written or printed; raw responses are cached under
           data/raw/benchmark/hud_api/ (git-ignored).
  market   asking 2BR rent (Dewey listings, via tracts.csv), ACS rent and home value with margins of error, the
           neighbors' median home value (queen contiguity), the SAFMR for the tract's largest-overlap ZCTA; parcel
           sales since 2023 (Tier 2). ACS B25031_004 2-bedroom median gross rent (census_2br). A null 2024 ACS rent or
           value is filled from the most recent earlier vintage on disk (2023 back to 2020), its year recorded.
  stock    ACS structure shares; 2-4 family and vacant parcel counts (Tier 2).
  transit  PRT GTFS: a frequent stop has >= 64 departures on the representative Wednesday (about one every 15 minutes
           over a 16-hour service day). Distances are straight lines in EPSG:2272 from 2020 block internal points,
           weighted by 2020 block population.
  flood    HAND inundation share (terrain screen) and the FEMA NFHL Special Flood Hazard Area share of tract land (Tier 2):
           TIGER/Line 2023 AREAWATER (rivers, ponds) is removed from the tract polygon first, because the SFHA covers the
           rivers themselves and would otherwise inflate river tracts.
  zoning   WPRDC zoning district land shares and the unverified by-right table in config/zoning_rules.json (Tier 2).
  land use county assessment class/use per parcel -> residential / commercial / industrial / vacant / institutional /
           other shares of parcel land (LOTAREA) and of parcels, plus vacant lots (Tier 2).
  access   jobs within 1 mile (LEHD LODES 8 WAC 2023, C000 at 2020 work blocks), distance to the nearest public school
           and elementary school (NCES CCD 2024 directory), distance to the nearest supermarket / grocery and the count of
           everyday services within half a mile (OpenStreetMap via Overpass). Same block-point method as transit.
"""
from __future__ import annotations

import json
import math
import os
import zipfile
from collections.abc import Sequence
from pathlib import Path

import geopandas as gpd
import numpy as np
import openpyxl
import pandas as pd
import requests

from visionpitts import ingest
from visionpitts.config import APP_DATA, COUNTY_GEOID, CRS_PA_SOUTH, CRS_WGS84, INTERIM, PROCESSED, RAW, ROOT
from visionpitts.export import clean

# ------------------------------------------------------------------------------------------------ constants
BANDS = ["le30", "b30_50", "b50_80", "b80_100", "gt100"]
TYPE_BANDS = ["le30", "b30_50", "b50_80", "gt80"]           # Table 7 has 80-100 and >100; the contract merges them
TYPES = ["elderly_alone", "elderly_family", "small_family", "large_family", "other"]
ZONING_TYPES = ["adu", "duplex_triplex", "townhome", "small_apartment", "senior"]
FOCUS = {"42003562300": "Hazelwood", "42003130700": "Homewood North", "42003140300": "Squirrel Hill North"}

CHAS_ZIP = ingest.CHAS_ZIP
CHAS_DICT = ingest.CHAS_DICT
BAND_LABELS = {  # CHAS dictionary wording (Table 8; Table 7 prefixes it with "household income is ") -> band key
    "less than or equal to 30% of HAMFI": "le30",
    "greater than 30% but less than or equal to 50% of HAMFI": "b30_50",
    "greater than 50% but less than or equal to 80% of HAMFI": "b50_80",
    "greater than 80% but less than or equal to 100% of HAMFI": "b80_100",
    "greater than 100% of HAMFI": "gt100",
}
BURDEN_LABELS = {"All": "hh", "greater than 30% but less than or equal to 50%": "b30_50", "greater than 50%": "gt50"}
TYPE_LABELS = {
    "household type is elderly family (2 persons, with either or both age 62 or over)": "elderly_family",
    "household type is small family (2 persons, neither person 62 years or over, or 3 or 4 persons)": "small_family",
    "household type is large family (5 or more persons)": "large_family",
    "household type is elderly non-family": "elderly_alone",  # 1-2 person non-family households, someone 62 or over
    "other household type (non-elderly non-family)": "other",
}

HUD_API = "https://www.huduser.gov/hudapi/public"
HUD_API_DIR = RAW / "benchmark" / "hud_api"
HUD_AREA = "4200399999"  # Allegheny County -> Pittsburgh, PA HUD Metro FMR Area
FMR_KEYS = ["Efficiency", "One-Bedroom", "Two-Bedroom", "Three-Bedroom", "Four-Bedroom"]

GTFS = ingest.GTFS
FREQUENT_MIN_DEPARTURES = 64  # >= 64 weekday departures at one stop: a bus or T about every 15 minutes, 16 hours a day
QUARTER_MILE_FT = 1320.0
FT_PER_MILE = 5280.0

ACCESS_DIR = RAW / "benchmark" / "access"
LODES_WAC = ACCESS_DIR / "pa_wac_S000_JT00_2023.csv.gz"
NCES_CCD = ACCESS_DIR / "ccd_directory_pa_2024.json"
OSM_SERVICES = ACCESS_DIR / "osm_services_overpass.json"
MILE_FT = 5280.0
HALF_MILE_FT = 2640.0
CCD_OPEN = {1, 3, 4, 5, 8}  # CCD school_status: open, new, added, changed agency, reopened (2 closed, 6 inactive, 7 future)
SERVICE_KINDS = ("grocery", "pharmacy", "health", "library")

HAND_CSV = RAW / "hand" / "tract_ndvi_flood.csv"
FEMA_DIR = RAW / "benchmark" / "fema"
FEMA_LAYER = "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28"
FEMA_WHERE = "DFIRM_ID='42003C' AND SFHA_TF='T'"
FEMA_PAGE = 500  # polygons per request; larger GeoJSON pages make the service return HTTP 500
FEMA_MERGED = FEMA_DIR / "nfhl28_42003C_sfha.geojson"
AREAWATER_ZIP = RAW / "crosswalks" / "tiger" / "tl_2023_42003_areawater.zip"  # vintage of the cb_2023 tract polygons
AREAWATER_URL = "https://www2.census.gov/geo/tiger/TIGER2023/AREAWATER/tl_2023_42003_areawater.zip"

ZONING_DIR = RAW / "benchmark" / "zoning"
ZONING_GEOJSON = ZONING_DIR / "zoning.geojson"
ZONING_RESOURCE = "6127f35e-f36b-4a53-80b3-f4409609e9df"
ZONING_URL = f"https://data.wprdc.org/datastore/dump/{ZONING_RESOURCE}?format=geojson"
ZONING_RULES = ROOT / "config" / "zoning_rules.json"

PARCELS_GEOJSON = RAW / "parcels" / "alleghenycounty_parcels202609.geojson"
ASSESSMENTS_CSV = RAW / "parcels" / "assessments.csv"
PARCEL_TRACT_CACHE = INTERIM / "parcel_tract.parquet"
SALE_SINCE = "2023-01-01"
RESIDENTIAL_USES = {"SINGLE FAMILY", "ROWHOUSE", "TOWNHOUSE", "TWO FAMILY", "THREE FAMILY", "FOUR FAMILY", "CONDOMINIUM"}
TWO_TO_FOUR_USES = {"TWO FAMILY", "THREE FAMILY", "FOUR FAMILY"}
VALID_SALE = "VALID SALE"
LAND_USE_CLASSES = ["residential", "commercial", "industrial", "vacant", "institutional", "other"]
PUBLIC_HOUSING_USES = ("OWNED BY METRO HOUSING", "HUD PROJ")
INSTITUTIONAL_USES = {"CHURCHES, PUBLIC WORSHIP", "CEMETERY/MONUMENTS", "DAYCARE/PRIVATE SCHOOL"}

ACS_RAW_DIR = RAW / "acs"
ACS_CURRENT = 2024                     # vintage behind acs_tract.csv
ACS_FILL_YEARS = (2023, 2022, 2021, 2020)  # earlier 5-year vintages on 2020 tract geography, most recent first
CENSUS_2BR_VARS = ("B25031_004E", "B25031_004M")  # median gross rent, 2 bedrooms, renter-occupied units paying cash rent
CENSUS_2BR_CACHE = ACS_RAW_DIR / f"acs5_{ACS_CURRENT}_tract_b25031_2br.csv"

TRACTS_CSV = PROCESSED / "tracts.csv"
ACS_TRACT_CSV = PROCESSED / "acs_tract.csv"
PLACE_CSV = PROCESSED / "place_measures.csv"
PLACE_JSON = APP_DATA / "place.json"
HUD_JSON = APP_DATA / "hud_2026.json"


# ------------------------------------------------------------------------------------------------ CHAS
def _dict_sheet(table: str, columns: list[str]) -> pd.DataFrame:
    ws = openpyxl.load_workbook(CHAS_DICT, read_only=True)[table]
    rows = list(ws.iter_rows(values_only=True))
    return pd.DataFrame(rows[1:], columns=columns)


def chas_band_columns() -> dict[str, dict[str, str]]:
    """Table 8 columns for renter households (all facilities) by HAMFI band, chosen by dictionary wording.

    {"all": {"hh": col}, band: {"hh": col, "b30_50": col, "gt50": col}} where hh = every household in the band,
    b30_50 = paying more than 30% and at most 50% of income, gt50 = paying more than 50%.
    """
    d = _dict_sheet("Table 8", ["col", "line", "tenure", "income", "burden", "facilities"])
    d = d[(d["tenure"] == "Renter occupied") & (d["facilities"] == "All") & (d["line"] == "Subtotal")]
    out: dict[str, dict[str, str]] = {}
    for _, r in d.iterrows():
        band = "all" if r["income"] == "All" else BAND_LABELS.get(str(r["income"]))
        part = BURDEN_LABELS.get(str(r["burden"]))
        if band and part:
            out.setdefault(band, {})[part] = r["col"]
    assert "hh" in out.get("all", {}), out
    assert all(set(out.get(b, {})) == {"hh", "b30_50", "gt50"} for b in BANDS), out
    return out


def chas_type_columns() -> dict[str, dict[str, str]]:
    """Table 7 columns for renter households by HAMFI band x household type (cost burden = All), by dictionary wording."""
    d = _dict_sheet("Table 7", ["col", "line", "tenure", "income", "type", "burden"])
    # HUD's dictionary leaves the cost-burden cell blank on one Subtotal row (T7_est210, >100% x other household type)
    # where every other Subtotal says "All"; a Subtotal row with no burden wording is the same "All" cell.
    all_burden = (d["burden"] == "All") | (d["burden"].isna() & (d["line"] == "Subtotal"))
    d = d[(d["tenure"] == "Renter occupied") & all_burden & (d["income"] != "All") & (d["type"] != "All")]
    out: dict[str, dict[str, str]] = {}
    for _, r in d.iterrows():
        band = BAND_LABELS.get(str(r["income"]).replace("household income is ", ""))
        typ = TYPE_LABELS.get(str(r["type"]))
        if band and typ:
            out.setdefault(band, {})[typ] = r["col"]
    assert all(set(out.get(b, {})) == set(TYPES) for b in BANDS), out
    return out


def _chas_table(table: str, cols: list[str]) -> pd.DataFrame:
    """One CHAS tract ("140") table from the zip: estimates and MOEs for `cols`, indexed by GEOID, Allegheny only."""
    moe = [c.replace("est", "moe") for c in cols]
    with zipfile.ZipFile(CHAS_ZIP) as z:
        with z.open(f"140/{table}.csv") as f:
            header = pd.read_csv(f, nrows=0, encoding="latin1").columns
        gcol = next(c for c in header if c.lower() == "geoid")
        with z.open(f"140/{table}.csv") as f:
            t = pd.read_csv(f, usecols=[gcol, *cols, *moe], dtype={gcol: str}, encoding="latin1")
    t["GEOID"] = t[gcol].str[-11:]
    return t[t["GEOID"].str.startswith(COUNTY_GEOID)].set_index("GEOID").drop(columns=[gcol])


def rss(moes: pd.DataFrame) -> pd.Series:
    """Root-sum-square of margins of error: the ACS/CHAS rule for the MOE of a sum."""
    return np.sqrt((moes.astype(float) ** 2).sum(axis=1))


def band_table(t8: pd.DataFrame, cols: dict[str, dict[str, str]]) -> pd.DataFrame:
    """Flat band columns from a Table 8 frame (estimates + MOEs).

    renter_hh, renter_hh_moe and, per band: {band}_hh, {band}_moe, {band}_burden30 (paying more than 30% of income =
    the 30-50% and the >50% cells added), {band}_burden30_moe (root-sum-square), {band}_burden50, {band}_burden50_moe.
    """
    def m(c: str) -> str:
        return c.replace("est", "moe")

    out = pd.DataFrame(index=t8.index)
    out["renter_hh"] = t8[cols["all"]["hh"]]
    out["renter_hh_moe"] = t8[m(cols["all"]["hh"])]
    for band in BANDS:
        c = cols[band]
        out[f"{band}_hh"] = t8[c["hh"]]
        out[f"{band}_moe"] = t8[m(c["hh"])]
        out[f"{band}_burden30"] = t8[c["b30_50"]] + t8[c["gt50"]]
        out[f"{band}_burden30_moe"] = rss(t8[[m(c["b30_50"]), m(c["gt50"])]])
        out[f"{band}_burden50"] = t8[c["gt50"]]
        out[f"{band}_burden50_moe"] = t8[m(c["gt50"])]
    return out


def type_table(t7: pd.DataFrame, cols: dict[str, dict[str, str]]) -> pd.DataFrame:
    """Flat household-type columns from a Table 7 frame: types_{band}_{type} and _moe; gt80 = 80-100 plus >100."""
    def m(c: str) -> str:
        return c.replace("est", "moe")

    out = pd.DataFrame(index=t7.index)
    for band in TYPE_BANDS:
        srcs = ["b80_100", "gt100"] if band == "gt80" else [band]
        for typ in TYPES:
            est = [cols[b][typ] for b in srcs]
            out[f"types_{band}_{typ}"] = t7[est].sum(axis=1)
            out[f"types_{band}_{typ}_moe"] = rss(t7[[m(c) for c in est]])
    return out


def chas_bands(geoids: pd.Index) -> pd.DataFrame:
    cols = chas_band_columns()
    flat = sorted({c for d in cols.values() for c in d.values()})
    return band_table(_chas_table("Table8", flat), cols).reindex(geoids)


def chas_household_types(geoids: pd.Index) -> pd.DataFrame:
    cols = chas_type_columns()
    flat = sorted({c for d in cols.values() for c in d.values()})
    return type_table(_chas_table("Table7", flat), cols).reindex(geoids)


# ------------------------------------------------------------------------------------------------ HUD API
def _hud_get(kind: str, fy: int, refresh: bool = False) -> dict | None:
    """Cached HUD User API response for {kind}/data/{HUD_AREA}?year={fy}.

    Reads the cache unless `refresh`; otherwise fetches with the bearer token in HUD_API_KEY and writes the raw
    response to data/raw/benchmark/hud_api/. Returns None when there is neither a cache nor a token. The token is
    never logged, printed or written.
    """
    HUD_API_DIR.mkdir(parents=True, exist_ok=True)
    path = HUD_API_DIR / f"{kind}_{HUD_AREA}_{fy}.json"
    if path.exists() and not refresh:
        return json.loads(path.read_text())
    token = os.environ.get("HUD_API_KEY", "")
    if not token:
        return json.loads(path.read_text()) if path.exists() else None
    r = requests.get(f"{HUD_API}/{kind}/data/{HUD_AREA}", params={"year": fy},
                     headers={"Authorization": f"Bearer {token}"}, timeout=60)
    r.raise_for_status()
    d = r.json()
    path.write_text(json.dumps(d, indent=1))
    return d


def parse_limits(d: dict, fy: int = 2026) -> dict:
    """{name, fy, median, il30[8], il50[8], il80[8]} from an income-limits API response."""
    data = d["data"]
    return {
        "name": data.get("area_name"),
        "fy": int(data.get("year") or fy),
        "median": int(data["median_income"]),
        "il30": [int(data["extremely_low"][f"il30_p{n}"]) for n in range(1, 9)],
        "il50": [int(data["very_low"][f"il50_p{n}"]) for n in range(1, 9)],
        "il80": [int(data["low"][f"il80_p{n}"]) for n in range(1, 9)],
    }


def parse_safmr(d: dict, fy: int = 2026) -> dict:
    """{name, fy, smallarea, fmr[5], safmr: {zip: [5]}} from an FMR API response (0-4 bedrooms)."""
    data = d["data"]
    rows = data.get("basicdata") or []
    if isinstance(rows, dict):  # an area without Small Area FMRs returns one object, not a list
        rows = [rows]
    metro = next((r for r in rows if str(r.get("zip_code", "")).upper().startswith("MSA")), None)
    if metro is None and rows and "zip_code" not in rows[0]:
        metro = rows[0]
    safmr = {str(r["zip_code"]).zfill(5): [int(r[k]) for k in FMR_KEYS]
             for r in rows if str(r.get("zip_code", "")).isdigit()}
    return {
        "name": data.get("area_name"),
        "fy": int(data.get("year") or fy),
        "smallarea": str(data.get("smallarea_status", "")) == "1",
        "fmr": [int(metro[k]) for k in FMR_KEYS] if metro else None,
        "safmr": safmr,
    }


def hud_limits(fy: int = 2026, refresh: bool = False) -> dict | None:
    d = _hud_get("il", fy, refresh)
    return None if d is None else parse_limits(d, fy)


def hud_safmr(fy: int = 2026, refresh: bool = False) -> dict | None:
    d = _hud_get("fmr", fy, refresh)
    return None if d is None else parse_safmr(d, fy)


def household_size(bedrooms: int) -> float:
    """HUD's occupancy convention for rent limits: 1.5 persons per bedroom; a studio counts one person."""
    return 1.0 if bedrooms <= 0 else 1.5 * bedrooms


def affordable_rent(limits: Sequence[int], bedrooms: int, persons: float | None = None, share: float = 0.30) -> int:
    """Gross monthly rent at `share` of the income limit for the household the bedrooms imply (no utility allowance).

    `limits` are the 1..8-person annual limits. A half-person size takes the mean of the two neighbouring limits
    (HUD's interpolation rule). Rounded to the dollar with Python's round().
    """
    n = household_size(bedrooms) if persons is None else persons
    lo = min(max(math.floor(n), 1), 8)
    hi = min(max(math.ceil(n), 1), 8)
    annual = (limits[lo - 1] + limits[hi - 1]) / 2
    return round(annual * share / 12)


# ------------------------------------------------------------------------------------------------ inputs on disk
def tracts_city() -> gpd.GeoDataFrame:
    """The 128 city tracts with geometry (data/interim/tracts_city.parquet, written by scripts/01_build_tracts.py)."""
    t = gpd.read_parquet(INTERIM / "tracts_city.parquet")
    t["GEOID"] = t["GEOID"].astype(str)
    return t.sort_values("GEOID").reset_index(drop=True)


def tract_table() -> pd.DataFrame:
    """data/processed/tracts.csv indexed by GEOID (ZCTA kept as a 5-character string)."""
    tr = pd.read_csv(TRACTS_CSV, dtype={"GEOID": str, "zcta": str}).set_index("GEOID")
    tr["zcta"] = tr["zcta"].map(lambda z: None if pd.isna(z) else str(z).split(".")[0].zfill(5))
    return tr


def acs_table() -> pd.DataFrame:
    return pd.read_csv(ACS_TRACT_CSV, dtype={"GEOID": str}).set_index("GEOID")


def queen_neighbors(tracts: gpd.GeoDataFrame) -> dict[str, list[str]]:
    from visionpitts import pressure  # local import: pressure pulls in scoring, which place measures never use

    return pressure.queen_neighbors(tracts)


# ------------------------------------------------------------------------------------------------ market and stock
def neighbor_median(values: pd.Series, nbrs: dict[str, list[str]]) -> pd.Series:
    """Median of the queen neighbors' values, ignoring neighbors without data; NaN if none."""
    out = {}
    for g, ns in nbrs.items():
        v = pd.to_numeric(values.reindex(ns), errors="coerce").dropna()
        out[g] = float(v.median()) if len(v) else np.nan
    return pd.Series(out, dtype=float).reindex(values.index)


def _clean_estimates(df: pd.DataFrame) -> pd.DataFrame:
    """Census API strings -> numbers; negative sentinels (-666666666 not available, -222222222 MOE not applicable) -> NaN."""
    out = df.apply(pd.to_numeric, errors="coerce")
    return out.where(out >= 0)


def acs_vintage(year: int, stems: Sequence[str], directory: Path | None = None) -> pd.DataFrame | None:
    """E/M columns for `stems` from the cached county tract file of one earlier vintage (data/raw/acs/acs5_<year>_tract.csv),
    cleaned; None when the file or a column is missing. Only 2020+ vintages share the 2020 tract GEOIDs."""
    path = (directory or ACS_RAW_DIR) / f"acs5_{year}_tract.csv"
    if not path.exists():
        return None
    cols = [f"{s}{x}" for s in stems for x in ("E", "M")]
    head = pd.read_csv(path, nrows=0).columns
    if any(c not in head for c in cols):
        return None
    raw = pd.read_csv(path, dtype=str, usecols=["GEOID", *cols]).set_index("GEOID")
    return _clean_estimates(raw)


def acs_older_vintages(stems: Sequence[str] = ("B25077_001", "B25064_001"), years: Sequence[int] = ACS_FILL_YEARS,
                       directory: Path | None = None) -> dict[int, pd.DataFrame]:
    """{year: cleaned E/M frame} for the earlier vintages on disk (missing files are skipped)."""
    out = {}
    for y in years:
        df = acs_vintage(y, stems, directory)
        if df is not None:
            out[y] = df
    return out


def fill_from_older(est: pd.Series, moe: pd.Series, older: dict[int, pd.DataFrame], stem: str
                    ) -> tuple[pd.Series, pd.Series, pd.Series]:
    """Where the current estimate is null, take the most recent earlier vintage that has one (with its own MOE) and record
    that vintage's end year; the year stays NaN for current-vintage values and for tracts no vintage covers. Never imputes."""
    est, moe = est.astype(float).copy(), moe.astype(float).copy()
    year = pd.Series(np.nan, index=est.index, dtype=float)
    for y in sorted(older, reverse=True):
        frame = older[y]
        if f"{stem}E" not in frame.columns:
            continue
        need = est.isna()
        if not need.any():
            break
        cand = frame[f"{stem}E"].reindex(est.index)
        take = need & cand.notna()
        est[take] = cand[take]
        moe[take] = frame[f"{stem}M"].reindex(est.index)[take]
        year[take] = y
    return est, moe, year


def census_2br(refresh: bool = False, cache: Path | None = None) -> pd.DataFrame:
    """ACS 2020-2024 B25031_004 (median gross rent, 2 bedrooms) with MOE for Allegheny County tracts, fetched once from
    the Census API and cached raw under data/raw/acs/ (git-ignored). Columns census_2br, census_2br_moe; suppressed -> NaN.
    CENSUS_API_KEY comes from .env via visionpitts.config and is never written or printed."""
    from visionpitts import acs_levels as al  # request_rows redacts the key from every message

    path = cache or CENSUS_2BR_CACHE
    if refresh or not path.exists():
        from visionpitts.config import CENSUS_API_KEY, COUNTY_FIPS, STATE_FIPS

        params = {"get": ",".join(CENSUS_2BR_VARS), "for": "tract:*", "in": f"state:{STATE_FIPS} county:{COUNTY_FIPS}"}
        if CENSUS_API_KEY:
            params["key"] = CENSUS_API_KEY
        rows = al.request_rows(requests.Session(), params, url=f"https://api.census.gov/data/{ACS_CURRENT}/acs/acs5")
        raw = al.rows_to_frame(rows, "tract")
        path.parent.mkdir(parents=True, exist_ok=True)
        raw.to_csv(path, index_label="GEOID")
    raw = pd.read_csv(path, dtype=str).set_index("GEOID")
    clean_ = _clean_estimates(raw[list(CENSUS_2BR_VARS)])
    return clean_.rename(columns={"B25031_004E": "census_2br", "B25031_004M": "census_2br_moe"})


def market(tr: pd.DataFrame, acs: pd.DataFrame, nbrs: dict[str, list[str]], safmr: dict | None,
           older: dict[int, pd.DataFrame] | None = None, rent2br: pd.DataFrame | None = None) -> pd.DataFrame:
    """Asking rent, census rent and value with MOE, neighbors' value, ZIP and its 2BR Small Area FMR.

    `older` ({year: cleaned raw E/M frame}) fills a null 2024 ACS rent or home value from the most recent earlier vintage,
    recorded in acs_rent_year / value_acs_year. The neighbors' median stays on 2024 values only (one vintage per
    comparison). `rent2br` adds the ACS 2-bedroom median gross rent (census_2br, census_2br_moe)."""
    out = pd.DataFrame(index=tr.index)
    out["asking_2br"] = tr["rent_2br_2025_26"]
    out["asking_n"] = tr["n_units_2025_26"]
    out["asking_conf"] = tr["asking_rents_conf"]
    out["acs_rent"] = acs["med_gross_rent"].reindex(tr.index)
    out["acs_rent_moe"] = acs["med_gross_rent_moe"].reindex(tr.index)
    out["zip"] = tr["zcta"]
    table = (safmr or {}).get("safmr", {})
    out["safmr_2br"] = out["zip"].map(lambda z: table[z][2] if z in table else np.nan)
    out["value_acs"] = acs["med_home_value"].reindex(tr.index)
    out["value_acs_moe"] = acs["med_home_value_moe"].reindex(tr.index)
    out["value_nbr_acs"] = neighbor_median(out["value_acs"], nbrs)
    if older:
        out["acs_rent"], out["acs_rent_moe"], out["acs_rent_year"] = fill_from_older(
            out["acs_rent"], out["acs_rent_moe"], older, "B25064_001")
        out["value_acs"], out["value_acs_moe"], out["value_acs_year"] = fill_from_older(
            out["value_acs"], out["value_acs_moe"], older, "B25077_001")
    if rent2br is not None:
        out["census_2br"] = rent2br["census_2br"].reindex(tr.index)
        out["census_2br_moe"] = rent2br["census_2br_moe"].reindex(tr.index)
    return out


def stock(acs: pd.DataFrame, geoids: pd.Index) -> pd.DataFrame:
    cols = ["sfd_share", "units_2_4_share", "units_5_19_share", "units_20plus_share", "vacancy_share"]
    return acs[cols].apply(pd.to_numeric, errors="coerce").reindex(geoids)


# ------------------------------------------------------------------------------------------------ transit
def gtfs_stop_departures(path: Path = GTFS) -> tuple[gpd.GeoDataFrame, pd.Timestamp]:
    """Departures per stop on the representative weekday, as EPSG:2272 points with `dep`.

    Same day rule as ingest.transit: the Wednesday in the feed's range with the most scheduled trips (regular
    schedule, no holiday); stop_times rows with pickup_type == 1 (no pickup) are not departures.
    """
    with zipfile.ZipFile(path) as z:
        cal = pd.read_csv(z.open("calendar.txt"), dtype={"service_id": str})
        names = z.namelist()
        cdates = (pd.read_csv(z.open("calendar_dates.txt"), dtype={"service_id": str}) if "calendar_dates.txt" in names
                  else pd.DataFrame(columns=["service_id", "date", "exception_type"]))
        trips = pd.read_csv(z.open("trips.txt"), usecols=["trip_id", "service_id"], dtype=str)
        stops = pd.read_csv(z.open("stops.txt"), usecols=["stop_id", "stop_lat", "stop_lon"], dtype={"stop_id": str})
        st = pd.read_csv(z.open("stop_times.txt"), usecols=["trip_id", "stop_id", "pickup_type"],
                         dtype={"trip_id": str, "stop_id": str})
    trips_per_service = trips.groupby("service_id").size()

    def services_on(day: pd.Timestamp) -> set[str]:
        ymd = int(day.strftime("%Y%m%d"))
        col = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][day.weekday()]
        act = set(cal.loc[(cal[col] == 1) & (cal["start_date"] <= ymd) & (cal["end_date"] >= ymd), "service_id"])
        ex = cdates[cdates["date"] == ymd]
        act |= set(ex.loc[ex["exception_type"] == 1, "service_id"])
        act -= set(ex.loc[ex["exception_type"] == 2, "service_id"])
        return act

    lo = pd.to_datetime(cal["start_date"].astype(str)).min()
    hi = pd.to_datetime(cal["end_date"].astype(str)).max()
    wednesdays = [d for d in pd.date_range(lo, hi, freq="D") if d.weekday() == 2]
    day = max(wednesdays, key=lambda d: trips_per_service.reindex(list(services_on(d))).fillna(0).sum())
    trip_ids = set(trips.loc[trips["service_id"].isin(services_on(day)), "trip_id"])
    st = st[st["trip_id"].isin(trip_ids) & (pd.to_numeric(st["pickup_type"], errors="coerce").fillna(0) != 1)]
    dep = st.groupby("stop_id").size().rename("dep")
    pts = gpd.GeoDataFrame(stops, geometry=gpd.points_from_xy(stops["stop_lon"], stops["stop_lat"], crs=CRS_WGS84))
    pts = pts.to_crs(CRS_PA_SOUTH).join(dep, on="stop_id")
    pts["dep"] = pts["dep"].fillna(0).astype(int)
    return pts[["stop_id", "dep", "geometry"]].reset_index(drop=True), day


def _nearest_distance(points: gpd.GeoDataFrame, targets: gpd.GeoDataFrame) -> pd.Series:
    """Straight-line distance (CRS units) from each point to the nearest target; NaN when there are no targets."""
    if targets.empty:
        return pd.Series(np.nan, index=points.index, dtype=float)
    j = gpd.sjoin_nearest(points[["geometry"]], targets[["geometry"]], how="left", distance_col="d")
    return j.groupby(level=0)["d"].min().reindex(points.index)


def _weighted_mean(values: pd.Series, weights: pd.Series, groups: pd.Series) -> pd.Series:
    """Weighted mean per group; a group whose weights sum to zero (no residents) falls back to the plain mean."""
    ok = values.notna()
    v, w, g = values[ok], weights[ok].astype(float), groups[ok]
    num = (v * w).groupby(g).sum()
    den = w.groupby(g).sum()
    plain = v.groupby(g).mean()
    return (num / den.replace(0, np.nan)).where(den > 0, plain)


def transit_from_points(blocks: gpd.GeoDataFrame, stops: gpd.GeoDataFrame, tracts: gpd.GeoDataFrame,
                        freq_min: int = FREQUENT_MIN_DEPARTURES, radius_ft: float = QUARTER_MILE_FT) -> pd.DataFrame:
    """Per-tract transit measures from block points, stop points and tract polygons, all in a feet-based CRS.

    blocks: columns tract20, pop, geometry (internal points). stops: dep, geometry. tracts: GEOID, geometry.
    Returns, indexed by GEOID: freq_dist_mi (population-weighted mean distance to the nearest frequent stop),
    freq_share_qmi (share of residents within radius_ft of a frequent stop), any_dist_mi (same distance to any served
    stop), departures_qmi (weekday departures at the stops within radius_ft of a resident's block point, population-
    weighted mean over the tract's blocks: what the typical resident can walk to), departures_tract_qmi (departures at
    stops within radius_ft of the tract polygon, the sum the older 400 m `transit_departures` also gives), freq_stops_qmi
    (frequent stops within that distance of the polygon), block_pop (2020 residents in the blocks used).
    """
    geoids = pd.Index(tracts["GEOID"].astype(str))
    b = blocks[["tract20", "pop", "geometry"]].copy()
    b = b[b["tract20"].isin(geoids)]
    served = stops[stops["dep"] > 0]
    freq = served[served["dep"] >= freq_min]
    b["d_any"] = _nearest_distance(b, served)
    b["d_freq"] = _nearest_distance(b, freq)
    w = b["pop"].astype(float)
    out = pd.DataFrame(index=geoids)
    out["freq_dist_mi"] = (_weighted_mean(b["d_freq"], w, b["tract20"]) / FT_PER_MILE).reindex(geoids)
    out["any_dist_mi"] = (_weighted_mean(b["d_any"], w, b["tract20"]) / FT_PER_MILE).reindex(geoids)
    within = (b["d_freq"] <= radius_ft).astype(float).where(b["d_freq"].notna())
    out["freq_share_qmi"] = _weighted_mean(within, w, b["tract20"]).reindex(geoids)
    out["block_pop"] = w.groupby(b["tract20"]).sum().reindex(geoids).fillna(0).astype(int)
    # departures a resident can walk to: stops within radius_ft of the block point, summed, then weighted by population
    circles = gpd.GeoDataFrame({"geometry": b.geometry.buffer(radius_ft)}, index=b.index, crs=b.crs)
    jb = gpd.sjoin(served[["dep", "geometry"]], circles, how="inner", predicate="within")
    per_block = jb.groupby("index_right")["dep"].sum().reindex(b.index).fillna(0).astype(float)
    out["departures_qmi"] = _weighted_mean(per_block, w, b["tract20"]).reindex(geoids).round()
    buf = tracts[["GEOID", "geometry"]].copy()
    buf["GEOID"] = buf["GEOID"].astype(str)
    buf["geometry"] = buf.geometry.buffer(radius_ft)
    j = gpd.sjoin(served[["dep", "geometry"]], buf, how="inner", predicate="within")
    out["departures_tract_qmi"] = j.groupby("GEOID")["dep"].sum().reindex(geoids).fillna(0).astype(int)
    out["freq_stops_qmi"] = j[j["dep"] >= freq_min].groupby("GEOID").size().reindex(geoids).fillna(0).astype(int)
    return out


def transit_measures(tracts: gpd.GeoDataFrame, blocks: gpd.GeoDataFrame | None = None) -> tuple[pd.DataFrame, dict]:
    """Transit measures for the city tracts from the GTFS feed and 2020 blocks; returns (frame, notes)."""
    from visionpitts import geo

    stops, day = gtfs_stop_departures()
    b = (geo.blocks2020() if blocks is None else blocks).to_crs(CRS_PA_SOUTH)
    t = tracts[["GEOID", "geometry"]].to_crs(CRS_PA_SOUTH)
    out = transit_from_points(b, stops, t)
    notes = {"service_date": day.date().isoformat(), "stops_served": int((stops["dep"] > 0).sum()),
             "stops_frequent": int((stops["dep"] >= FREQUENT_MIN_DEPARTURES).sum()), "frequent_min": FREQUENT_MIN_DEPARTURES}
    return out, notes


# ------------------------------------------------------------------------------------------------ access
def count_within(points: gpd.GeoDataFrame, targets: gpd.GeoDataFrame, radius_ft: float,
                 weight: str | None = None) -> pd.Series:
    """Per point: the number of targets (or the sum of targets[weight]) within radius_ft, straight line, edges included."""
    if targets.empty:
        return pd.Series(0.0, index=points.index)
    cols = ["geometry"] + ([weight] if weight else [])
    j = gpd.sjoin(points[["geometry"]], targets[cols], how="inner", predicate="dwithin", distance=radius_ft)
    agg = j.groupby(level=0)[weight].sum() if weight else j.groupby(level=0).size()
    return agg.reindex(points.index).fillna(0).astype(float)


def load_lodes_wac(path: Path = LODES_WAC) -> pd.DataFrame:
    """LODES WAC: block20 (15-digit 2020 work block), jobs (C000, all jobs)."""
    w = pd.read_csv(path, usecols=["w_geocode", "C000"], dtype={"w_geocode": str})
    return w.rename(columns={"w_geocode": "block20", "C000": "jobs"})


def load_schools(path: Path = NCES_CCD) -> gpd.GeoDataFrame:
    """NCES CCD directory: open, regular (school_type 1), not fully virtual public schools with coordinates.

    elem: offers at least one grade from kindergarten to 5 (CCD grade codes: -1 pre-K, 0 K, 1-12).
    """
    rows = json.loads(Path(path).read_text())["results"]
    d = pd.DataFrame(rows)
    d = d[d["school_status"].isin(CCD_OPEN) & (d["school_type"] == 1) & (d["virtual"] != 1)]
    d = d.dropna(subset=["latitude", "longitude"])
    lo = pd.to_numeric(d["lowest_grade_offered"], errors="coerce")
    hi = pd.to_numeric(d["highest_grade_offered"], errors="coerce")
    d = d.assign(elem=(lo <= 5) & (hi >= 0))
    return gpd.GeoDataFrame(d[["ncessch", "school_name", "elem"]].reset_index(drop=True),
                            geometry=gpd.points_from_xy(d["longitude"], d["latitude"], crs=CRS_WGS84))


def service_kind(tags: dict) -> str | None:
    """OSM tags -> grocery / pharmacy / health / library, or None. One element counts once."""
    shop, amenity, hc = tags.get("shop"), tags.get("amenity"), tags.get("healthcare")
    if shop in ("supermarket", "grocery"):
        return "grocery"
    if amenity == "pharmacy" or hc == "pharmacy":
        return "pharmacy"
    if amenity in ("clinic", "doctors", "hospital") or hc in ("clinic", "doctor", "hospital"):
        return "health"
    if amenity == "library":
        return "library"
    return None


def load_osm_services(path: Path = OSM_SERVICES) -> gpd.GeoDataFrame:
    """Overpass JSON (nodes with lat/lon, ways and relations with center) -> points with kind in SERVICE_KINDS."""
    recs = []
    for e in json.loads(Path(path).read_text())["elements"]:
        kind = service_kind(e.get("tags") or {})
        c = e if "lat" in e else e.get("center") or {}
        if kind and c.get("lat") is not None:
            recs.append({"osm": f"{e['type']}/{e['id']}", "kind": kind, "lat": c["lat"], "lon": c["lon"]})
    d = pd.DataFrame(recs, columns=["osm", "kind", "lat", "lon"]).drop_duplicates("osm")
    return gpd.GeoDataFrame(d[["osm", "kind"]], geometry=gpd.points_from_xy(d["lon"], d["lat"], crs=CRS_WGS84))


def access_from_points(blocks: gpd.GeoDataFrame, tracts: gpd.GeoDataFrame, work: gpd.GeoDataFrame | None = None,
                       schools: gpd.GeoDataFrame | None = None, services: gpd.GeoDataFrame | None = None) -> pd.DataFrame:
    """Per-tract access measures from resident block points, all layers in a feet-based CRS.

    blocks: tract20, pop, geometry. work: jobs, geometry. schools: elem, geometry. services: kind, geometry.
    A missing layer (None) leaves its columns NaN. Returns, indexed by GEOID and weighted by 2020 block population:
    jobs_1mi (jobs at work blocks within 1 mile), school_mi / elem_mi (miles to the nearest public / elementary school),
    grocery_mi (miles to the nearest supermarket or grocery), services_halfmi (services within half a mile).
    """
    geoids = pd.Index(tracts["GEOID"].astype(str))
    b = blocks[["tract20", "pop", "geometry"]].copy()
    b = b[b["tract20"].isin(geoids)]
    w, g = b["pop"].astype(float), b["tract20"]
    out = pd.DataFrame(index=geoids, columns=["jobs_1mi", "school_mi", "elem_mi", "grocery_mi", "services_halfmi"], dtype=float)

    def wm(v: pd.Series) -> pd.Series:
        return _weighted_mean(v, w, g).reindex(geoids)

    if work is not None:
        out["jobs_1mi"] = wm(count_within(b, work[work["jobs"] > 0], MILE_FT, weight="jobs")).round()
    if schools is not None:
        out["school_mi"] = wm(_nearest_distance(b, schools)) / FT_PER_MILE
        if "elem" in schools.columns and schools["elem"].notna().any():
            out["elem_mi"] = wm(_nearest_distance(b, schools[schools["elem"].fillna(False).astype(bool)])) / FT_PER_MILE
    if services is not None:
        groc = services[services["kind"] == "grocery"]
        out["grocery_mi"] = wm(_nearest_distance(b, groc)) / FT_PER_MILE
        out["services_halfmi"] = wm(count_within(b, services[services["kind"].isin(SERVICE_KINDS)], HALF_MILE_FT))
    return out


def access_measures(tracts: gpd.GeoDataFrame, blocks: gpd.GeoDataFrame | None = None) -> tuple[pd.DataFrame, dict]:
    """Access measures for the city tracts; a missing raw file leaves its fields null and is named in notes['missing']."""
    from visionpitts import geo

    b = (geo.blocks2020() if blocks is None else blocks).to_crs(CRS_PA_SOUTH)
    t = tracts[["GEOID", "geometry"]].to_crs(CRS_PA_SOUTH)
    notes: dict = {"missing": []}
    work = schools = services = None
    if LODES_WAC.exists():
        wac = load_lodes_wac()
        work = b[["block20", "geometry"]].merge(wac, on="block20", how="inner")
        work = gpd.GeoDataFrame(work, geometry="geometry", crs=b.crs)
        notes["jobs_county"] = int(work["jobs"].sum())
    else:
        notes["missing"].append(str(LODES_WAC))
    if NCES_CCD.exists():
        schools = load_schools().to_crs(CRS_PA_SOUTH)
        notes["schools"] = int(len(schools))
        notes["elementary"] = int(schools["elem"].sum())
    else:
        notes["missing"].append(str(NCES_CCD))
    if OSM_SERVICES.exists():
        services = load_osm_services().to_crs(CRS_PA_SOUTH)
        notes["services"] = services["kind"].value_counts().to_dict()
    else:
        notes["missing"].append(str(OSM_SERVICES))
    return access_from_points(b, t, work, schools, services), notes


def percentile(s: pd.Series, mask: pd.Series | None = None) -> pd.Series:
    """Percentile rank in (0, 1] among the tracts in `mask` (ranked tracts) that have a value; others NaN."""
    v = pd.to_numeric(s, errors="coerce")
    if mask is not None:
        v = v.where(mask.reindex(v.index).fillna(False).astype(bool))
    return v.rank(method="average", pct=True)


# ------------------------------------------------------------------------------------------------ flood
def hand_share(geoids: pd.Index) -> pd.Series:
    f = pd.read_csv(HAND_CSV, dtype={"GEOID": str}).set_index("GEOID")
    return pd.to_numeric(f["flood_share_pct"], errors="coerce").reindex(geoids).rename("hand_pct")


def fema_download(refresh: bool = False) -> gpd.GeoDataFrame:
    """Special Flood Hazard Area polygons for DFIRM 42003C from NFHL layer 28, paged and cached as raw GeoJSON."""
    FEMA_DIR.mkdir(parents=True, exist_ok=True)
    if FEMA_MERGED.exists() and not refresh:
        return gpd.read_file(FEMA_MERGED)
    meta = requests.get(FEMA_LAYER, params={"f": "json"}, timeout=60).json()
    # the service advertises maxRecordCount 2000 but answers a 2000-polygon GeoJSON page with HTTP 500; 500 works
    page = min(int(meta.get("maxRecordCount") or FEMA_PAGE), FEMA_PAGE)
    feats: list[dict] = []
    offset = 0
    while True:
        r = requests.get(f"{FEMA_LAYER}/query", timeout=300, params={
            "where": FEMA_WHERE, "outFields": "FLD_ZONE,ZONE_SUBTY,SFHA_TF,DFIRM_ID", "outSR": 4326, "f": "geojson",
            "resultOffset": offset, "resultRecordCount": page, "returnGeometry": "true", "geometryPrecision": 7})
        r.raise_for_status()
        d = r.json()
        if "error" in d:
            raise RuntimeError(f"FEMA NFHL query failed: {d['error']}")
        got = d.get("features", [])
        (FEMA_DIR / f"nfhl28_42003C_sfha_p{offset // page}.geojson").write_text(json.dumps(d))
        feats.extend(got)
        exceeded = bool((d.get("properties") or {}).get("exceededTransferLimit"))
        if not got or (len(got) < page and not exceeded):
            break
        offset += page
    FEMA_MERGED.write_text(json.dumps({"type": "FeatureCollection", "features": feats}))
    return gpd.GeoDataFrame.from_features(feats, crs=CRS_WGS84)


def areawater_download(refresh: bool = False) -> gpd.GeoDataFrame:
    """TIGER/Line 2023 AREAWATER polygons for Allegheny County (42003), cached as the Census zip under data/raw."""
    if refresh or not AREAWATER_ZIP.exists():
        AREAWATER_ZIP.parent.mkdir(parents=True, exist_ok=True)
        r = requests.get(AREAWATER_URL, timeout=300)
        r.raise_for_status()
        AREAWATER_ZIP.write_bytes(r.content)
    return gpd.read_file(AREAWATER_ZIP)


def fema_share(tracts: gpd.GeoDataFrame, sfha: gpd.GeoDataFrame, water: gpd.GeoDataFrame | None = None) -> pd.DataFrame:
    """Share (%) of each tract's land inside the SFHA union, and the zone with the most land area (EPSG:2272).

    Land = tract polygon minus the `water` polygons (TIGER AREAWATER): fema_sfha_pct = area(SFHA n land) / area(land)
    x 100. The SFHA covers the rivers, so counting water would inflate river tracts. With no `water`, the whole polygon
    is used. A tract with no land area gets None.
    """
    t = tracts[["GEOID", "geometry"]].to_crs(CRS_PA_SOUTH).copy()
    t["GEOID"] = t["GEOID"].astype(str)
    if water is not None and len(water):
        w = water.to_crs(CRS_PA_SOUTH).geometry.make_valid().union_all()
        t["geometry"] = t.geometry.difference(w)
    s = sfha[["FLD_ZONE", "geometry"]].to_crs(CRS_PA_SOUTH).copy()
    s["geometry"] = s.geometry.make_valid()
    union = s.geometry.union_all()
    land = t.geometry.area.values
    inter = t.geometry.intersection(union).area.values
    out = pd.DataFrame(index=pd.Index(t["GEOID"], name="GEOID"))
    out["fema_sfha_pct"] = np.where(land > 0, inter / np.where(land > 0, land, 1) * 100, np.nan)
    ov = gpd.overlay(t[~t.geometry.is_empty], s, how="intersection", keep_geom_type=False)
    ov["a"] = ov.geometry.area
    zone = ov.groupby(["GEOID", "FLD_ZONE"])["a"].sum().reset_index().sort_values("a", ascending=False)
    zone = zone[zone["a"] > 0].drop_duplicates("GEOID").set_index("GEOID")["FLD_ZONE"].to_dict()
    # object dtype on purpose: pandas 3 would otherwise store the column as `str` and turn None into NaN
    out["fema_zone"] = pd.Series([zone.get(g) if p > 0 and isinstance(zone.get(g), str) else None
                                  for g, p in zip(out.index, out["fema_sfha_pct"])], index=out.index, dtype=object)
    return out


# ------------------------------------------------------------------------------------------------ zoning
def load_zoning_rules(path: Path = ZONING_RULES) -> dict:
    return json.loads(Path(path).read_text())


def zoning_family(code: str | None, rules: dict) -> str | None:
    """District family for a zon_new code: an exact code match first, then the longest prefix ending in '-'."""
    if code is None or (not isinstance(code, str)):
        return None
    code = code.strip().upper()
    best, best_len = None, -1
    for fam in rules["families"]:
        for c in fam["codes"]:
            c = c.upper()
            if (code == c or (c.endswith("-") and code.startswith(c))) and len(c) > best_len:
                best, best_len = fam["id"], len(c)
    return best


def zoning_download(refresh: bool = False) -> gpd.GeoDataFrame:
    """WPRDC zoning polygons (cached under data/raw/benchmark/zoning/); downloaded only when absent or `refresh`."""
    ZONING_DIR.mkdir(parents=True, exist_ok=True)
    if not ZONING_GEOJSON.exists() or refresh:
        r = requests.get(ZONING_URL, timeout=300)
        r.raise_for_status()
        ZONING_GEOJSON.write_bytes(r.content)
    return gpd.read_file(ZONING_GEOJSON)


def zoning_shares(tracts: gpd.GeoDataFrame, zoning: gpd.GeoDataFrame, rules: dict) -> pd.DataFrame:
    """Share of each tract polygon's area in each district family (EPSG:2272), plus zoning_unmapped and zoning_covered."""
    t = tracts[["GEOID", "geometry"]].to_crs(CRS_PA_SOUTH).copy()
    t["GEOID"] = t["GEOID"].astype(str)
    z = zoning[["zon_new", "geometry"]].to_crs(CRS_PA_SOUTH).copy()
    z["geometry"] = z.geometry.make_valid()
    z["family"] = z["zon_new"].map(lambda c: zoning_family(c, rules) or "_unmapped")
    z = z.dissolve(by="family").reset_index()
    ov = gpd.overlay(t, z[["family", "geometry"]], how="intersection", keep_geom_type=False)
    ov["a"] = ov.geometry.area
    area = t.set_index("GEOID").geometry.area
    shares = ov.groupby(["GEOID", "family"])["a"].sum().unstack(fill_value=0.0)
    shares = shares.div(area.reindex(shares.index), axis=0)
    fams = [f["id"] for f in rules["families"]]
    out = pd.DataFrame(index=pd.Index(t["GEOID"], name="GEOID"))
    for fam in fams:
        out[f"zoning_{fam}"] = shares[fam].reindex(out.index).fillna(0.0) if fam in shares else 0.0
    out["zoning_unmapped"] = shares["_unmapped"].reindex(out.index).fillna(0.0) if "_unmapped" in shares else 0.0
    out["zoning_covered"] = out[[f"zoning_{f}" for f in fams] + ["zoning_unmapped"]].sum(axis=1)
    return out


def zoning_by_type(shares: dict[str, float], rules: dict, threshold: float | None = None) -> dict[str, str]:
    """yes / conditional / no / unknown per building type from family land shares and the by-right table.

    `yes` when at least `threshold` of the tract's land lies in families where the table says yes; else `conditional`
    when at least that much lies in conditional families; else `unknown` when at least that much lies in families the
    table leaves unknown; else `no`. The table is unverified and this is an annotation, never a gate.
    """
    thr = rules.get("threshold_share", 0.05) if threshold is None else threshold
    table = {f["id"]: f["by_type"] for f in rules["families"]}
    out = {}
    for typ in ZONING_TYPES:
        tally = {"yes": 0.0, "conditional": 0.0, "no": 0.0, "unknown": 0.0}
        for fam, share in shares.items():
            status = table.get(fam, {}).get(typ, "unknown")
            tally[status] += float(share or 0.0)
        if tally["yes"] >= thr:
            out[typ] = "yes"
        elif tally["conditional"] >= thr:
            out[typ] = "conditional"
        elif tally["unknown"] >= thr:
            out[typ] = "unknown"
        else:
            out[typ] = "no"
    return out


def zoning(tracts: gpd.GeoDataFrame, zoning_gdf: gpd.GeoDataFrame | None = None, rules: dict | None = None,
           refresh: bool = False) -> pd.DataFrame:
    """District family shares and by-type annotations per tract (Tier 2). Adds zoning_ok = True on every row."""
    rules = load_zoning_rules() if rules is None else rules
    z = zoning_download(refresh) if zoning_gdf is None else zoning_gdf
    out = zoning_shares(tracts, z, rules)
    fams = [f["id"] for f in rules["families"]]
    for g, r in out.iterrows():
        bt = zoning_by_type({f: r[f"zoning_{f}"] for f in fams}, rules)
        for typ in ZONING_TYPES:
            out.loc[g, f"zoning_bytype_{typ}"] = bt[typ]
    out["zoning_ok"] = True
    return out


# ------------------------------------------------------------------------------------------------ parcels (Tier 2)
def parcel_tracts(tracts: gpd.GeoDataFrame, refresh: bool = False) -> pd.Series:
    """PIN -> GEOID for parcels whose representative point falls in a city tract. Cached in data/interim."""
    if PARCEL_TRACT_CACHE.exists() and not refresh:
        c = pd.read_parquet(PARCEL_TRACT_CACHE)
        return c.set_index("PIN")["GEOID"]
    import pyogrio

    t = tracts[["GEOID", "geometry"]].to_crs(CRS_PA_SOUTH).copy()
    t["GEOID"] = t["GEOID"].astype(str)
    bbox = tuple(float(x) for x in t.total_bounds)
    p = pyogrio.read_dataframe(PARCELS_GEOJSON, columns=["PIN"], bbox=bbox)
    p = p[p["PIN"].notna()].to_crs(CRS_PA_SOUTH)
    p["geometry"] = p.geometry.representative_point()
    j = gpd.sjoin(p[["PIN", "geometry"]], t, how="inner", predicate="within").drop_duplicates("PIN")
    out = j[["PIN", "GEOID"]].reset_index(drop=True)
    out.to_parquet(PARCEL_TRACT_CACHE, index=False)
    return out.set_index("PIN")["GEOID"]


def parcel_measures(assess: pd.DataFrame, pin_tract: pd.Series, nbrs: dict[str, list[str]],
                    since: str = SALE_SINCE) -> pd.DataFrame:
    """Per tract: median valid residential sale price since `since` (and count), the same pooled over queen neighbors,
    the number of 2-4 family parcels and of vacant parcels. `assess` needs PARID, CLASSDESC, USEDESC, SALEDATE,
    SALEPRICE, SALEDESC. FAIRMARKETTOTAL (a 2012 base-year value) is never read. Also returns the city-wide median.
    """
    a = assess.copy()
    a["GEOID"] = a["PARID"].map(pin_tract)
    a = a[a["GEOID"].notna()]
    use = a["USEDESC"].fillna("").str.upper()
    geoids = pd.Index(sorted(set(nbrs) | set(a["GEOID"])))
    out = pd.DataFrame(index=geoids)
    out["parcels_2_4"] = a[use.isin(TWO_TO_FOUR_USES)].groupby("GEOID").size().reindex(geoids).fillna(0).astype(int)
    out["vacant_parcels"] = a[use.str.contains("VACANT")].groupby("GEOID").size().reindex(geoids).fillna(0).astype(int)
    res = a[(a["CLASSDESC"].fillna("").str.upper() == "RESIDENTIAL") & use.isin(RESIDENTIAL_USES)].copy()
    res["date"] = pd.to_datetime(res["SALEDATE"], format="%m-%d-%Y", errors="coerce")
    res["price"] = pd.to_numeric(res["SALEPRICE"], errors="coerce")
    valid = res[(res["SALEDESC"].fillna("").str.upper() == VALID_SALE) & (res["date"] >= pd.Timestamp(since)) & (res["price"] > 0)]
    by = valid.groupby("GEOID")["price"]
    out["sale_median"] = by.median().reindex(geoids)
    out["sale_n"] = by.size().reindex(geoids).fillna(0).astype(int)
    prices = {g: grp["price"].to_numpy() for g, grp in valid.groupby("GEOID")}
    nbr_med, nbr_n = {}, {}
    for g in geoids:
        arrays = [prices[n] for n in nbrs.get(g, []) if n in prices]
        pooled = np.concatenate(arrays) if arrays else np.array([])
        nbr_med[g] = float(np.median(pooled)) if pooled.size else np.nan
        nbr_n[g] = int(pooled.size)
    out["sale_nbr_median"] = pd.Series(nbr_med)
    out["sale_nbr_n"] = pd.Series(nbr_n)
    out.attrs["city_sale_median"] = float(valid["price"].median()) if len(valid) else None
    out.attrs["city_sale_n"] = len(valid)
    return out


def land_use_class(classdesc: str | None, usedesc: str | None) -> str:
    """County assessment class + use -> residential / commercial / industrial / vacant / institutional / other.

    Vacant first (any use containing VACANT: vacant land, vacant commercial or industrial land, >10 acres vacant);
    then government, charitable-exempt (class OTHER), churches, cemeteries and private schools/daycare as
    institutional; residential class, apartment buildings (APART: ..., assessed as commercial) and public housing
    (housing authority and HUD project parcels, assessed as government) as residential;
    then the commercial and industrial classes; utilities, railroads, agriculture and anything else as other.
    """
    c = (classdesc or "").strip().upper() if isinstance(classdesc, str) else ""
    u = (usedesc or "").strip().upper() if isinstance(usedesc, str) else ""
    if "VACANT" in u:
        return "vacant"
    if u.startswith(PUBLIC_HOUSING_USES):  # housing authority and HUD project parcels are homes, whatever the owner class
        return "residential"
    if c in ("GOVERNMENT", "OTHER") or u in INSTITUTIONAL_USES or u.startswith("OWNED BY"):
        return "institutional"
    if c == "RESIDENTIAL" or u.startswith("APART"):
        return "residential"
    if c == "COMMERCIAL":
        return "commercial"
    if c == "INDUSTRIAL":
        return "industrial"
    return "other"


def land_use_measures(assess: pd.DataFrame, pin_tract: pd.Series) -> pd.DataFrame:
    """Per tract: land-use shares of parcel land (assessment LOTAREA, sq ft) as lu_{class}, shares of parcels as
    lu_n_{class}, lu_parcels (parcels) and lu_vacant_lots (vacant parcels). A tract whose parcels carry no lot area
    falls back to the parcel shares for the land shares. `assess` needs PARID, CLASSDESC, USEDESC, LOTAREA."""
    a = assess.copy()
    a["GEOID"] = a["PARID"].map(pin_tract)
    a = a[a["GEOID"].notna()]
    a["cls"] = [land_use_class(c, u) for c, u in zip(a["CLASSDESC"], a["USEDESC"])]
    a["area"] = pd.to_numeric(a["LOTAREA"], errors="coerce").astype(float).fillna(0.0).clip(lower=0)
    geoids = pd.Index(sorted(set(a["GEOID"])))
    n = a.groupby(["GEOID", "cls"]).size().unstack(fill_value=0).reindex(index=geoids, columns=LAND_USE_CLASSES, fill_value=0)
    ar = a.groupby(["GEOID", "cls"])["area"].sum().unstack(fill_value=0.0).reindex(index=geoids, columns=LAND_USE_CLASSES, fill_value=0.0)
    n_share = n.div(n.sum(axis=1).replace(0, np.nan), axis=0)
    a_share = ar.div(ar.sum(axis=1).replace(0, np.nan), axis=0)
    a_share = a_share.where(ar.sum(axis=1) > 0, n_share, axis=0)
    out = pd.DataFrame(index=geoids)
    for k in LAND_USE_CLASSES:
        out[f"lu_{k}"] = a_share[k]
        out[f"lu_n_{k}"] = n_share[k]
    out["lu_parcels"] = n.sum(axis=1).astype(int)
    out["lu_vacant_lots"] = n["vacant"].astype(int)
    return out


def parcels(tracts: gpd.GeoDataFrame, nbrs: dict[str, list[str]], refresh: bool = False) -> pd.DataFrame:
    pin_tract = parcel_tracts(tracts, refresh)
    a = pd.read_csv(ASSESSMENTS_CSV, usecols=["PARID", "CLASSDESC", "USEDESC", "LOTAREA", "SALEDATE", "SALEPRICE", "SALEDESC"],
                    dtype=str, low_memory=False)
    geoids = pd.Index(tracts["GEOID"].astype(str))
    out = parcel_measures(a, pin_tract, nbrs)
    attrs = dict(out.attrs)
    out = out.join(land_use_measures(a, pin_tract)).reindex(geoids)
    out.attrs.update(attrs)
    return out


# ------------------------------------------------------------------------------------------------ assemble and write
def assemble(tr: pd.DataFrame, parts: list[pd.DataFrame]) -> pd.DataFrame:
    """One flat row per tract: name, neighborhood, residential, displacement and programs from tracts.csv + the parts."""
    out = tr[["name", "neighborhood", "residential", "displacement_risk", "displacement_risk_conf", "qct", "dda", "oz", "cdbg"]].copy()
    out = out.rename(columns={"displacement_risk": "displacement_score", "displacement_risk_conf": "displacement_conf"})
    for p in parts:
        dup = [c for c in p.columns if c in out.columns]
        out = out.join(p.drop(columns=dup).reindex(out.index))
    out = out.copy()  # de-fragment after the joins
    if "departures_qmi" in out.columns:
        out["departures_pct"] = percentile(out["departures_qmi"], out["residential"])
    if "jobs_1mi" in out.columns:
        out["jobs_1mi_pct"] = percentile(out["jobs_1mi"], out["residential"])
    out.index.name = "GEOID"
    return out


def _int(v):
    c = clean(v, 0)
    return None if c is None or isinstance(c, str) else int(c)


def _num(v, nd: int):
    c = clean(v, nd)
    return None if isinstance(c, str) else c


def _bool(v):
    if v is None or (not isinstance(v, str) and pd.isna(v)):
        return None
    return bool(v)


def _str(v):
    if v is None or (not isinstance(v, str) and pd.isna(v)):
        return None
    return str(v)


def _pct(v):
    """A share stored as a percent, 1 decimal place."""
    return _num(v, 1)


def _land_use_block(get) -> dict | None:
    """land_use: shares of parcel land by class (4 dp), vacant_lots, parcels and the per-parcel shares; null until built."""
    if get("lu_parcels") is None or pd.isna(get("lu_parcels")):
        return None
    block: dict = {k: _num(get(f"lu_{k}"), 4) for k in LAND_USE_CLASSES}
    block["vacant_lots"] = _int(get("lu_vacant_lots"))
    block["parcels"] = _int(get("lu_parcels"))
    block["parcel_shares"] = {k: _num(get(f"lu_n_{k}"), 4) for k in LAND_USE_CLASSES}
    return block


def to_place_json(df: pd.DataFrame, rules: dict | None = None) -> dict:
    """{GEOID: PlaceMeasures} in exactly the plan's shape. Households as published, dollars integers, shares 4 dp,
    miles 2 dp, percents 1 dp. `zoning` is null until the Tier 2 columns exist (zoning_ok)."""
    fams = [f["id"] for f in rules["families"]] if rules else []
    out = {}
    for g, r in df.iterrows():
        get = r.to_dict().get  # absent columns (a Tier 2 source that did not build) read as None
        zoning_block = None
        if fams and "zoning_ok" in df.columns and _bool(get("zoning_ok")):
            shares = {f: _num(get(f"zoning_{f}"), 4) for f in fams}
            shares = {k: v for k, v in shares.items() if v}
            zoning_block = {"shares": shares, "by_type": {t: _str(get(f"zoning_bytype_{t}")) for t in ZONING_TYPES}, "verified": False}
        out[str(g)] = {
            "renter_hh": _int(get("renter_hh")),
            "bands": {b: {"hh": _int(get(f"{b}_hh")), "moe": _int(get(f"{b}_moe")),
                          "burden30": _int(get(f"{b}_burden30")), "burden50": _int(get(f"{b}_burden50"))} for b in BANDS},
            "types": {b: {t: _int(get(f"types_{b}_{t}")) for t in TYPES} for b in TYPE_BANDS},
            "market": {
                "asking_2br": _int(get("asking_2br")), "asking_n": _int(get("asking_n")), "asking_conf": _str(get("asking_conf")),
                "acs_rent": _int(get("acs_rent")), "acs_rent_moe": _int(get("acs_rent_moe")), "zip": _str(get("zip")),
                "safmr_2br": _int(get("safmr_2br")), "value_acs": _int(get("value_acs")), "value_acs_moe": _int(get("value_acs_moe")),
                "value_nbr_acs": _int(get("value_nbr_acs")), "sale_median": _int(get("sale_median")), "sale_n": _int(get("sale_n")),
                "sale_nbr_median": _int(get("sale_nbr_median")), "sale_nbr_n": _int(get("sale_nbr_n")),
                "census_2br": _int(get("census_2br")), "census_2br_moe": _int(get("census_2br_moe")),
                # vintage end year only where an earlier ACS vintage filled a null 2024 value (absent = 2024)
                **{f"{k}_year": _int(get(f"{k}_year")) for k in ("value_acs", "acs_rent") if _int(get(f"{k}_year")) is not None},
            },
            "stock": {
                "sfd_share": _num(get("sfd_share"), 4), "units_2_4_share": _num(get("units_2_4_share"), 4),
                "units_5_19_share": _num(get("units_5_19_share"), 4), "units_20plus_share": _num(get("units_20plus_share"), 4),
                "vacancy_share": _num(get("vacancy_share"), 4), "parcels_2_4": _int(get("parcels_2_4")),
                "vacant_parcels": _int(get("vacant_parcels")),
            },
            "transit": {
                "freq_share_qmi": _num(get("freq_share_qmi"), 4), "freq_dist_mi": _num(get("freq_dist_mi"), 2),
                "any_dist_mi": _num(get("any_dist_mi"), 2), "departures_qmi": _int(get("departures_qmi")),
                "departures_pct": _num(get("departures_pct"), 4),
            },
            "access": {
                "jobs_1mi": _int(get("jobs_1mi")), "jobs_1mi_pct": _num(get("jobs_1mi_pct"), 4),
                "school_mi": _num(get("school_mi"), 2), "elem_mi": _num(get("elem_mi"), 2),
                "grocery_mi": _num(get("grocery_mi"), 2), "services_halfmi": _num(get("services_halfmi"), 1),
            },
            "flood": {"fema_sfha_pct": _pct(get("fema_sfha_pct")), "fema_zone": _str(get("fema_zone")), "hand_pct": _pct(get("hand_pct"))},
            "zoning": zoning_block,
            "land_use": _land_use_block(get),
            "programs": {k: _bool(get(k)) for k in ("qct", "dda", "oz", "cdbg")},
            "displacement": {"score": _num(get("displacement_score"), 4), "conf": _str(get("displacement_conf"))},
        }
    return out


def to_hud_json(limits: dict | None, safmr: dict | None, fy: int = 2026, city: dict | None = None) -> dict:
    """{metro: {name, fy, median, il30, il50, il80, fmr}, safmr: {zip: [5]}, city: {sale_median, sale_n}}; nulls where missing.

    `city` carries the city-wide median valid residential sale, so a tract's sale median is compared with a sale median
    (not with the ACS home value, which is a different measure).
    """
    metro = {
        "name": (limits or safmr or {}).get("name"),
        "fy": fy,
        "median": limits["median"] if limits else None,
        "il30": limits["il30"] if limits else None,
        "il50": limits["il50"] if limits else None,
        "il80": limits["il80"] if limits else None,
        "fmr": safmr["fmr"] if safmr else None,
    }
    return {"metro": metro, "safmr": dict(sorted((safmr or {}).get("safmr", {}).items())), "city": city or {"sale_median": None, "sale_n": None}}


PLACE_KEYS = ["renter_hh", "bands", "types", "market", "stock", "transit", "access", "flood", "zoning", "land_use", "programs", "displacement"]


def coverage(place: dict) -> dict[str, int]:
    """Tracts with a non-null value for each leaf of place.json (for the build log)."""
    counts: dict[str, int] = {}
    for rec in place.values():
        for key, val in rec.items():
            if isinstance(val, dict):
                for k2, v2 in val.items():
                    if isinstance(v2, dict):
                        for k3, v3 in v2.items():
                            counts[f"{key}.{k2}.{k3}"] = counts.get(f"{key}.{k2}.{k3}", 0) + (v3 is not None)
                    else:
                        counts[f"{key}.{k2}"] = counts.get(f"{key}.{k2}", 0) + (v2 is not None)
            else:
                counts[key] = counts.get(key, 0) + (val is not None)
    return counts


def write_outputs(df: pd.DataFrame, place: dict, hud: dict) -> dict[str, int]:
    PLACE_CSV.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(PLACE_CSV, index=True)
    PLACE_JSON.write_text(json.dumps(place, separators=(",", ":"), allow_nan=False) + "\n")
    HUD_JSON.write_text(json.dumps(hud, separators=(",", ":"), allow_nan=False) + "\n")
    return {str(p): p.stat().st_size for p in (PLACE_CSV, PLACE_JSON, HUD_JSON)}
