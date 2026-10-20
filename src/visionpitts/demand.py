"""Who needs homes here: the Place page's "Who needs it" card. Renter households by size, age and income, the homes
they live in, what those homes rent for, and the tax credit homes already nearby, for every city tract, the city's ZIP
codes (census ZCTAs) and the city, written to app/src/data/lazy/demand.json.

ACS 2020-2024 5-year tables (labels checked against the API's variable list):
  B25009  tenure by household size            renter households of 1 to 7+ people
  B25042  tenure by bedrooms                  renter-occupied homes with 0 to 5+ bedrooms
  B25068  bedrooms by gross rent              renter homes by size and rent bracket (with cash rent)
  B25118  tenure by household income          renter households in 11 income brackets
  B25119  median income by tenure             renter median household income
  B25032  tenure by units in structure        renter homes by building size
  B25007  tenure by age of householder        renter householders by age
  B25064  median gross rent
Growth 2014 -> 2024 is read from data/processed/acs_history_<level>.csv (households x renter share, median rent,
median income), already on 2020 geography.

HUD's Low-Income Housing Tax Credit property database (the public ArcGIS layer of LIHTCPUB) gives the tax credit homes
in and near each tract. Only property fields are read: never the contact, company or telephone fields.

Nothing here imputes. Shares carry the ACS proportion margin of error and a reliability word; a missing estimate stays
null. Nothing enters the score.
"""
from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
import requests

from visionpitts import acs_levels as al
from visionpitts.config import ACS_YEAR, APP_DATA, CENSUS_API_KEY, CRS_PA_SOUTH, CRS_WGS84, PROCESSED, RAW

DEMAND_JSON = APP_DATA / "lazy" / "demand.json"
HISTORY = {level: PROCESSED / f"acs_history_{level}.csv" for level in ("tract", "zcta", "city")}
BASE_YEAR, LAST_YEAR = 2014, 2024

# ------------------------------------------------------------------------------------------------ ACS stems
def _rng(table: str, first: int, last: int) -> list[str]:
    return [f"{table}_{i:03d}" for i in range(first, last + 1)]


SIZE = _rng("B25009", 11, 17)          # renter 1, 2, 3, 4, 5, 6, 7+ person households
BEDROOMS = _rng("B25042", 10, 15)      # renter homes with 0, 1, 2, 3, 4, 5+ bedrooms
# B25068: per bedroom group (0, 1, 2, 3+) the "with cash rent" brackets, then "no cash rent".
RENT_GROUPS = {"0": 4, "1": 13, "2": 22, "3": 31}  # first bracket stem of each group
RENT_BRACKETS = 6                      # < $300, 300-499, 500-749, 750-999, 1,000-1,499, 1,500+
RENT_EDGES = [0, 300, 500, 750, 1000, 1500, None]
INCOME = _rng("B25118", 15, 25)        # renter household income, 11 brackets
INCOME_EDGES = [0, 5000, 10000, 15000, 20000, 25000, 35000, 50000, 75000, 100000, 150000, None]
STRUCTURE = _rng("B25032", 14, 23)     # renter homes: 1 detached, 1 attached, 2, 3-4, 5-9, 10-19, 20-49, 50+, mobile, other
STRUCTURE_LABELS = ["1 detached", "1 attached", "2", "3 or 4", "5 to 9", "10 to 19", "20 to 49", "50 or more", "mobile home", "boat, RV, van"]
AGE = _rng("B25007", 13, 21)           # renter householders 15-24, 25-34, 35-44, 45-54, 55-59, 60-64, 65-74, 75-84, 85+
AGE_LABELS = ["15-24", "25-34", "35-44", "45-54", "55-59", "60-64", "65-74", "75-84", "85+"]
TOTAL_HH, RENTER_HH = "B25009_001", "B25009_010"
RENTER_HOMES_STRUCT, RENTER_HH_AGE = "B25032_013", "B25007_012"
RENTER_INCOME_MED, RENT_MED = "B25119_003", "B25064_001"


def rent_stems() -> list[str]:
    out = []
    for first in RENT_GROUPS.values():
        out += [f"B25068_{first + i:03d}" for i in range(RENT_BRACKETS + 1)]  # six brackets and "no cash rent"
    return out


def stems() -> list[str]:
    return sorted({TOTAL_HH, RENTER_HH, *SIZE, *BEDROOMS, *rent_stems(), *INCOME, RENTER_INCOME_MED, RENT_MED,
                   RENTER_HOMES_STRUCT, *STRUCTURE, RENTER_HH_AGE, *AGE})


# The labels each stem must carry in the API's variable list (checked by check_labels before a fetch is trusted).
EXPECTED_LABELS = {
    "B25009_010": "Renter occupied:", "B25009_011": "1-person household", "B25009_017": "7-or-more person household",
    "B25042_009": "Renter occupied:", "B25042_010": "No bedroom", "B25042_015": "5 or more bedrooms",
    "B25068_004": "Less than $300", "B25068_009": "$1,500 or more", "B25068_010": "No cash rent", "B25068_029": "3 or more bedrooms:",
    "B25118_015": "Less than $5,000", "B25118_025": "$150,000 or more", "B25119_003": "Renter occupied (dollars)",
    "B25032_014": "1, detached", "B25032_021": "50 or more", "B25007_019": "Householder 65 to 74 years",
    "B25007_021": "Householder 85 years and over",
}


def check_labels(variables: dict[str, dict]) -> list[str]:
    """Stems whose API label does not end with the expected wording (an empty list means the numbering is right)."""
    bad = []
    for stem, want in EXPECTED_LABELS.items():
        label = (variables.get(f"{stem}E") or {}).get("label", "")
        if not label.replace("!!", " > ").endswith(want):
            bad.append(f"{stem}: {label!r}")
    return bad


def fetch_labels(session: requests.Session | None = None) -> dict[str, dict]:
    session = session or requests.Session()
    out: dict[str, dict] = {}
    for table in sorted({s.split("_")[0] for s in EXPECTED_LABELS}):
        r = session.get(f"{al.API_URL}/groups/{table}.json", timeout=60)
        r.raise_for_status()
        out.update(r.json()["variables"])
    return out


# ------------------------------------------------------------------------------------------------ fetch
def cache_path(level: str) -> Path:
    return al.ACS_CACHE / f"acs5_{ACS_YEAR}_{level}_demand.csv"


def fetch(level: str, *, zctas: list[str] | None = None, refresh: bool = False,
          session: requests.Session | None = None) -> pd.DataFrame:
    """All E/M columns for the demand stems at one level (tracts county-wide), cached as raw API strings."""
    path = cache_path(level)
    needed = [f"{s}{x}" for s in stems() for x in ("E", "M")]
    if path.exists() and not refresh:
        cached = pd.read_csv(path, dtype=str).set_index("GEOID").sort_index()
        if all(c in cached.columns for c in needed) and (level != "zcta" or set(zctas or []) <= set(cached.index)):
            return cached
    session = session or requests.Session()
    frames = []
    for batch in al.batches(stems()):
        params = {"get": ",".join(f"{s}{x}" for s in batch for x in ("E", "M")), **al.geo_clause(level, zctas)}
        if CENSUS_API_KEY:
            params["key"] = CENSUS_API_KEY
        frames.append(al.rows_to_frame(al.request_rows(session, params), level))
    df = pd.concat(frames, axis=1)
    df.index.name = "GEOID"
    al.ACS_CACHE.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index_label="GEOID")
    return df


# ------------------------------------------------------------------------------------------------ one unit
def _num(v) -> float | None:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if np.isnan(f) else f


def _em(c: pd.Series, stem: str) -> list[float | None]:
    e, m = _num(c.get(f"{stem}E")), _num(c.get(f"{stem}M"))
    return [None if e is None else round(e), None if m is None else round(m)]


def _sum(c: pd.Series, group: list[str]) -> tuple[float | None, float | None]:
    """Sum of estimates with the root-sum-square margin of error; None when any part is missing."""
    es = [_num(c.get(f"{s}E")) for s in group]
    ms = [_num(c.get(f"{s}M")) for s in group]
    if any(v is None for v in es) or any(v is None for v in ms):
        return None, None
    return float(sum(es)), float(np.sqrt(sum(m * m for m in ms)))


def share(num: tuple[float | None, float | None], den: tuple[float | None, float | None]) -> list:
    """[share, moe, reliability] with the ACS proportion formula (al.share_with_moe); [None, None, None] when unknown."""
    if None in num or None in den or not den[0]:
        return [None, None, None]
    p, moe = al.share_with_moe(pd.Series([num[0]]), pd.Series([num[1]]), pd.Series([den[0]]), pd.Series([den[1]]))
    p, moe = float(p.iloc[0]), float(moe.iloc[0])
    cv = al.cv(pd.Series([p]), pd.Series([moe])).iloc[0]
    return [round(p, 4), round(moe, 4), al.reliability(None if pd.isna(cv) else float(cv))]


def unit(c: pd.Series) -> dict:
    """The demand block for one geography from its cleaned E/M row."""
    renters = _sum(c, [RENTER_HH])
    total = _sum(c, [TOTAL_HH])
    struct_total = _sum(c, [RENTER_HOMES_STRUCT])
    age_total = _sum(c, [RENTER_HH_AGE])
    rent = _num(c.get(f"{RENT_MED}E"))
    income = _num(c.get(f"{RENTER_INCOME_MED}E"))
    out = {
        "renters": _em(c, RENTER_HH),
        "households": _em(c, TOTAL_HH),
        "size": [_em(c, s) for s in SIZE],
        "br": [_em(c, s) for s in BEDROOMS],
        "rent_br": {g: [_em(c, f"B25068_{first + i:03d}") for i in range(RENT_BRACKETS)] for g, first in RENT_GROUPS.items()},
        "rent_nocash": [_em(c, f"B25068_{first + RENT_BRACKETS:03d}") for first in RENT_GROUPS.values()],
        "inc": [_em(c, s) for s in INCOME],
        "inc_med": _em(c, RENTER_INCOME_MED),
        "rent_med": _em(c, RENT_MED),
        "struct": [_em(c, s) for s in STRUCTURE],
        "age": [_em(c, s) for s in AGE],
        "shares": {
            "renter": share(renters, total),
            "one_person": share(_sum(c, SIZE[:1]), renters),
            "large5": share(_sum(c, SIZE[4:]), renters),
            "age65": share(_sum(c, AGE[6:]), age_total),
            "small_bldg": share(_sum(c, STRUCTURE[:4]), struct_total),
        },
        # Gross rent a year over renter income, both medians (a ratio of medians, so no margin of error is given).
        "rent_to_income": None if not rent or not income else round(rent * 12 / income, 4),
    }
    return out


# ------------------------------------------------------------------------------------------------ growth
def growth(level: str, path: Path | None = None) -> dict[str, dict]:
    """GEOID -> {renters, rent, income: [2014, 2024]} from the ACS history file (renters = households x renter share)."""
    path = path or HISTORY[level]
    if not path.exists():
        return {}
    h = pd.read_csv(path, dtype={"GEOID": str}, usecols=["GEOID", "year", "households", "renter_share", "med_gross_rent", "med_hh_income"])
    h = h[h["year"].isin([BASE_YEAR, LAST_YEAR])]
    out: dict[str, dict] = {}
    for g, rows in h.groupby("GEOID"):
        by = rows.set_index("year")

        def at(col: str, y: int):
            return _num(by[col].get(y)) if y in by.index else None

        def renters(y: int):
            hh, rs = at("households", y), at("renter_share", y)
            return None if hh is None or rs is None else round(hh * rs)

        out[g] = {
            "renters": [renters(BASE_YEAR), renters(LAST_YEAR)],
            "rent": [at("med_gross_rent", BASE_YEAR), at("med_gross_rent", LAST_YEAR)],
            "income": [at("med_hh_income", BASE_YEAR), at("med_hh_income", LAST_YEAR)],
        }
    return out


# ------------------------------------------------------------------------------------------------ tax credit homes
LIHTC_LAYER = "https://services.arcgis.com/VTyQ9soqVukalItT/arcgis/rest/services/LIHTC/FeatureServer/0/query"
LIHTC_WHERE = "PROJ_ST='PA' AND CURCNTY_NM='Allegheny'"
LIHTC_FIELDS = ["HUD_ID", "PROJECT", "PROJ_CTY", "PROJ_ZIP", "N_UNITS", "LI_UNITS", "N_0BR", "N_1BR", "N_2BR", "N_3BR",
                "N_4BR", "YR_PIS", "YR_ALLOC", "CREDIT", "BOND", "TYPE", "TRGT_ELD", "TRGT_FAM", "NON_PROF", "LAT", "LON"]
LIHTC_DIR = RAW / "benchmark" / "lihtc"
LIHTC_CSV = LIHTC_DIR / "lihtc_allegheny.csv"
LIHTC_INFO = LIHTC_DIR / "lihtc_allegheny.json"
LIHTC_PAGE = 1000
MILE_FT = 5280.0
USE_YEARS = 30             # 15-year compliance plus 15-year extended use; projects placed before 1990 had less
BUILD_YEAR = 2026
RECENT_YEARS = 20          # PHFA's "little affordable housing built in the past 20 years"
NEARBY_SHOWN = 10
CREDIT_WORD = {"1": "4%", "2": "9%", "3": "4% and 9%", "4": "exchange"}


def fetch_lihtc(refresh: bool = False, session: requests.Session | None = None) -> pd.DataFrame:
    """Allegheny County tax credit properties, property fields only, cached in data/raw/benchmark/lihtc/."""
    if LIHTC_CSV.exists() and not refresh:
        return pd.read_csv(LIHTC_CSV, dtype={"HUD_ID": str, "YR_PIS": str, "YR_ALLOC": str, "CREDIT": str, "BOND": str, "TYPE": str, "PROJ_ZIP": str})
    session = session or requests.Session()
    rows: list[dict] = []
    offset = 0
    while True:
        r = session.get(LIHTC_LAYER, params={"where": LIHTC_WHERE, "outFields": ",".join(LIHTC_FIELDS), "returnGeometry": "false",
                                             "orderByFields": "OBJECTID", "resultOffset": offset, "resultRecordCount": LIHTC_PAGE, "f": "json"}, timeout=90)
        r.raise_for_status()
        d = r.json()
        if "error" in d:
            raise RuntimeError(f"LIHTC layer error: {d['error']}")
        page = [f["attributes"] for f in d.get("features", [])]
        rows += page
        if len(page) < LIHTC_PAGE and not d.get("exceededTransferLimit"):
            break
        offset += len(page)
    df = pd.DataFrame(rows, columns=LIHTC_FIELDS)
    LIHTC_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(LIHTC_CSV, index=False)
    LIHTC_INFO.write_text(json.dumps({"retrieved": datetime.now(UTC).date().isoformat(), "layer": LIHTC_LAYER, "where": LIHTC_WHERE, "rows": len(df)}, indent=1))
    return pd.read_csv(LIHTC_CSV, dtype={"HUD_ID": str, "YR_PIS": str, "YR_ALLOC": str, "CREDIT": str, "BOND": str, "TYPE": str, "PROJ_ZIP": str})


def year_placed(v) -> int | None:
    """Placed-in-service year; HUD's 8888 (not reported) and 9999 (not yet placed) are None."""
    try:
        y = int(float(v))
    except (TypeError, ValueError):
        return None
    return None if y >= 8888 or y < 1987 else y


def lihtc_points(df: pd.DataFrame) -> gpd.GeoDataFrame:
    """Properties with a location, in feet (EPSG:2272), with the year placed in service as a number."""
    d = df.copy()
    d["yr"] = d["YR_PIS"].map(year_placed)
    d["li"] = pd.to_numeric(d["LI_UNITS"], errors="coerce")
    d["n"] = pd.to_numeric(d["N_UNITS"], errors="coerce")
    d = d[pd.to_numeric(d["LAT"], errors="coerce").notna() & pd.to_numeric(d["LON"], errors="coerce").notna()]
    g = gpd.GeoDataFrame(d, geometry=gpd.points_from_xy(d["LON"].astype(float), d["LAT"].astype(float)), crs=CRS_WGS84)
    return g.to_crs(CRS_PA_SOUTH)


def supply_counts(pts: gpd.GeoDataFrame) -> dict:
    """Projects and tax credit homes in a set of properties, with the recent and 30-year counts."""
    li = pts["li"].fillna(0)
    yr = pts["yr"]
    return {
        "projects": int(len(pts)),
        "li_units": int(li.sum()),
        "li_units_recent": int(li[yr >= BUILD_YEAR - RECENT_YEARS].sum()),
        "li_units_past30": int(li[yr + USE_YEARS <= BUILD_YEAR].sum()),
        "li_units_end_5y": int(li[(yr + USE_YEARS > BUILD_YEAR) & (yr + USE_YEARS <= BUILD_YEAR + 5)].sum()),
        "no_year": int(li[yr.isna()].sum()),
    }


def _title(name) -> str:
    s = str(name or "").strip()
    return s.title() if s.isupper() else s


def nearby(pts: gpd.GeoDataFrame, origin, radius_ft: float = MILE_FT, k: int = NEARBY_SHOWN) -> list[dict]:
    """The k properties nearest a point within the radius: name, year placed in service, homes, credit, miles."""
    d = pts.geometry.distance(origin)
    near = pts.assign(d=d)[d <= radius_ft].sort_values(["d", "HUD_ID"]).head(k)
    return [{"name": _title(r.PROJECT), "yr": None if pd.isna(r.yr) else int(r.yr), "li": None if pd.isna(r.li) else int(r.li),
             "n": None if pd.isna(r.n) else int(r.n), "credit": CREDIT_WORD.get(str(r.CREDIT)), "bond": str(r.BOND) == "1",
             "mi": round(float(r.d) / MILE_FT, 2)} for r in near.itertuples()]


def tract_supply(pts: gpd.GeoDataFrame, tracts: gpd.GeoDataFrame) -> dict[str, dict]:
    """Per tract: properties inside it, within a mile of its edge, and the nearest ones to its center."""
    t = tracts.to_crs(CRS_PA_SOUTH)
    out = {}
    for row in t.itertuples():
        inside = pts[pts.within(row.geometry)]
        mile = pts[pts.within(row.geometry.buffer(MILE_FT))]
        out[row.GEOID] = {**supply_counts(inside), "mile": supply_counts(mile), "nearby": nearby(pts, row.geometry.representative_point())}
    return out


def _hh(place: dict, band: str) -> float:
    v = ((place.get("bands") or {}).get(band) or {}).get("hh")
    return float(v) if v is not None else 0.0


def tract_depth(tracts: gpd.GeoDataFrame, places: dict[str, dict]) -> dict[str, dict]:
    """Per tract: renter households at or below 60% AMI in the city tracts within a mile of its edge (itself included),
    from CHAS Table 8 bands in place.json. CHAS has no 60% cut, so 60% = the ≤50% bands + one third of the 50–80% band
    (a straight line across the band). A tract counts when its representative point lies inside the one-mile buffer."""
    t = tracts.to_crs(CRS_PA_SOUTH)
    pts = t.assign(geometry=t.geometry.representative_point())
    out = {}
    for row in t.itertuples():
        ids = set(pts.loc[pts.within(row.geometry.buffer(MILE_FT)), "GEOID"]) | {row.GEOID}
        ids = sorted(g for g in ids if g in places)
        le50 = sum(_hh(places[g], "le30") + _hh(places[g], "b30_50") for g in ids)
        b50_80 = sum(_hh(places[g], "b50_80") for g in ids)
        out[row.GEOID] = {"tracts": len(ids), "le50": round(le50), "b50_80": round(b50_80), "le60": round(le50 + b50_80 / 3)}
    return out


def area_supply(pts: gpd.GeoDataFrame, areas: gpd.GeoDataFrame) -> dict[str, dict]:
    a = areas.to_crs(CRS_PA_SOUTH)
    return {row.GEOID: supply_counts(pts[pts.within(row.geometry)]) for row in a.itertuples()}


# ------------------------------------------------------------------------------------------------ the file
def build(tract_raw: pd.DataFrame, zcta_raw: pd.DataFrame, city_raw: pd.DataFrame, tract_zip: dict[str, str | None],
          supply: dict | None = None, zip_supply: dict | None = None, city_supply: dict | None = None,
          histories: dict[str, dict] | None = None, lihtc_info: dict | None = None, depth: dict | None = None) -> dict:
    """The demand.json payload. `tract_zip` maps each city tract to the ZIP its Market card uses."""
    histories = histories or {}

    def block(raw: pd.DataFrame, level: str, g: str, extra: dict | None = None) -> dict:
        c = al.clean_raw(raw.loc[[g]]).iloc[0]
        u = unit(c)
        u["g"] = histories.get(level, {}).get(g)
        return {**u, **(extra or {})}

    tracts = {g: block(tract_raw, "tract", g, {"zip": tract_zip.get(g), "lihtc": (supply or {}).get(g), "depth": (depth or {}).get(g)}) for g in sorted(tract_zip) if g in tract_raw.index}
    zips = {z: block(zcta_raw, "zcta", z, {"lihtc": (zip_supply or {}).get(z)}) for z in sorted(zcta_raw.index)}
    city_id = city_raw.index[0]
    return {
        "built": datetime.now(UTC).date().isoformat(),
        "acs": f"{ACS_YEAR - 4}–{ACS_YEAR} 5-year",
        "growth_years": [BASE_YEAR, LAST_YEAR],
        "edges": {"income": INCOME_EDGES, "rent": RENT_EDGES},
        "labels": {"structure": STRUCTURE_LABELS, "age": AGE_LABELS},
        "lihtc": {**(lihtc_info or {}), "use_years": USE_YEARS, "recent_years": RECENT_YEARS, "as_of": BUILD_YEAR},
        "city": block(city_raw, "city", city_id, {"lihtc": city_supply}),
        "zips": zips,
        "tracts": tracts,
    }


def write(payload: dict, path: Path = DEMAND_JSON) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, separators=(",", ":"), ensure_ascii=False))
