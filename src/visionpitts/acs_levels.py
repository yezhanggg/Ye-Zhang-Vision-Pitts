"""ACS 5-year variables for six geographies: tract, block group, ZCTA, municipality, county and the city place.

The catalogue (37 derived variables from 84 ACS stems), the Census API fetch with a raw CSV cache, sentinel
cleaning, MOE arithmetic (root-sum-square for sums, the ACS proportion formula for shares with the ratio
fallback), CV and reliability, rounding, and the JSON / long shapes read by the app and the Supabase loader.
Nothing here imputes: a missing estimate stays missing at every step.
"""
from __future__ import annotations

import math
import re
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

import numpy as np
import pandas as pd
import requests

from visionpitts.config import ACS_YEAR, CENSUS_API_KEY, CITY_PLACE_GEOID, COUNTY_FIPS, RAW, STATE_FIPS

Level = Literal["tract", "bg", "zcta", "muni", "county", "city"]
LEVELS: tuple[Level, ...] = ("tract", "bg", "zcta", "muni", "county", "city")
LEVEL_LABELS: dict[str, str] = {
    "tract": "Census tract",
    "bg": "Block group",
    "zcta": "ZIP code (ZCTA)",
    "muni": "Municipality",
    "county": "County",
    "city": "City",
}
API_URL = f"https://api.census.gov/data/{ACS_YEAR}/acs/acs5"
VINTAGE = f"{ACS_YEAR - 4}-{ACS_YEAR} 5-year"
ACS_CACHE = RAW / "acs"
Z90 = 1.645  # ACS margins of error are published at the 90% level
RELIABILITY = {"high": 0.15, "medium": 0.30}  # cv < high -> high; cv <= medium -> medium; else low
UNITS = ("count", "usd", "share", "years", "age")
STEM_RE = re.compile(r"^[BC]\d{5}[A-Z]?_\d{3}$")
# geography columns the API appends after the variables, and the GEOID width they concatenate to
GEO_COLS: dict[str, tuple[str, ...]] = {
    "tract": ("state", "county", "tract"),
    "bg": ("state", "county", "tract", "block group"),
    "zcta": ("zip code tabulation area",),
    "muni": ("state", "county", "county subdivision"),
    "county": ("state", "county"),
    "city": ("state", "place"),
}
GEOID_LEN: dict[str, int] = {"tract": 11, "bg": 12, "zcta": 5, "muni": 10, "county": 5, "city": 7}


# ------------------------------------------------------------------------------------------- catalogue
@dataclass(frozen=True)
class Var:
    id: str
    label: str
    group: str
    unit: str                      # count | usd | share | years | age
    num: tuple[str, ...]           # ACS stems summed for the estimate (one stem for medians)
    den: str | None = None         # denominator stem for shares
    description: str = ""
    table_id: str = ""

    def __post_init__(self) -> None:
        if not self.table_id:
            object.__setattr__(self, "table_id", self.num[0].split("_")[0])

    @property
    def kind(self) -> str:
        """median = one published value with its MOE; sum = root-sum-square MOE; share = ACS proportion formula."""
        if self.den:
            return "share"
        return "sum" if self.unit == "count" else "median"

    @property
    def stems(self) -> tuple[str, ...]:
        return self.num + ((self.den,) if self.den else ())


def _rng(table: str, first: int, last: int) -> tuple[str, ...]:
    return tuple(f"{table}_{i:03d}" for i in range(first, last + 1))


GROUPS: list[tuple[str, str]] = [
    ("population", "Population & households"),
    ("race", "Race & ethnicity"),
    ("income", "Income & poverty"),
    ("work_edu", "Employment & education"),
    ("stock", "Housing stock"),
    ("tenure", "Tenure"),
    ("cost", "Rent, value & cost burden"),
    ("commute", "Commuting & vehicles"),
]

_BURDEN_NOTE = ("The denominator is the table total, which includes households whose burden could not be computed; "
                "this matches the tract card in Analysis.")

CATALOGUE: list[Var] = [
    Var("pop", "Total population", "population", "count", ("B01003_001",),
        description="Total population (B01003)."),
    Var("households", "Households", "population", "count", ("B11001_001",),
        description="Occupied housing units, i.e. households (B11001)."),
    Var("median_age", "Median age", "population", "age", ("B01002_001",),
        description="Median age of the population in years (B01002)."),
    Var("under18_share", "Under 18", "population", "share", _rng("B01001", 3, 6) + _rng("B01001", 27, 30), "B01001_001",
        description="People under 18 as a share of the total population (B01001, male and female age bands summed)."),
    Var("age65_share", "Age 65 and over", "population", "share", _rng("B01001", 20, 25) + _rng("B01001", 44, 49),
        "B01001_001", description="People 65 and over as a share of the total population (B01001)."),
    Var("white_nh_share", "White (non-Hispanic)", "race", "share", ("B03002_003",), "B03002_001",
        description="White alone, not Hispanic or Latino, as a share of the total population (B03002)."),
    Var("black_nh_share", "Black (non-Hispanic)", "race", "share", ("B03002_004",), "B03002_001",
        description="Black or African American alone, not Hispanic or Latino, as a share of the total population (B03002)."),
    Var("asian_nh_share", "Asian (non-Hispanic)", "race", "share", ("B03002_006",), "B03002_001",
        description="Asian alone, not Hispanic or Latino, as a share of the total population (B03002)."),
    Var("hispanic_share", "Hispanic or Latino", "race", "share", ("B03002_012",), "B03002_001",
        description="Hispanic or Latino of any race as a share of the total population (B03002)."),
    Var("med_hh_income", "Median household income", "income", "usd", ("B19013_001",),
        description="Median household income in the past 12 months, inflation-adjusted dollars of the final ACS year "
                    "(B19013). Topcoded medians are kept as published."),
    Var("per_capita_income", "Per-capita income", "income", "usd", ("B19301_001",),
        description="Per-capita income in the past 12 months (B19301)."),
    Var("poverty_share", "Below the poverty line", "income", "share", ("C17002_002", "C17002_003"), "C17002_001",
        description="People with income below the poverty line (ratio of income to poverty level under 1.00) as a "
                    "share of the population for whom poverty status is determined (C17002; B17001 is not published "
                    "for block groups)."),
    Var("unemployment_rate", "Unemployment rate", "work_edu", "share", ("B23025_005",), "B23025_003",
        description="Unemployed people as a share of the civilian labor force, ages 16 and over (B23025)."),
    Var("lfpr", "In the labor force (16+)", "work_edu", "share", ("B23025_002",), "B23025_001",
        description="People in the labor force (civilian plus armed forces) as a share of the population 16 and over "
                    "(B23025)."),
    Var("bachelors_share", "Bachelor's or higher (25+)", "work_edu", "share", _rng("B15003", 22, 25), "B15003_001",
        description="Bachelor's, master's, professional or doctoral degree as a share of the population 25 and over "
                    "(B15003)."),
    Var("housing_units", "Housing units", "stock", "count", ("B25001_001",),
        description="Total housing units, occupied plus vacant (B25001)."),
    Var("vacancy_share", "Vacant units", "stock", "share", ("B25002_003",), "B25002_001",
        description="Vacant units as a share of all housing units (B25002)."),
    Var("median_year_built", "Median year built", "stock", "years", ("B25035_001",),
        description="Median year the housing structures were built (B25035). Structures built before 1940 are "
                    "reported as 1939."),
    Var("sfd_share", "Single-family detached", "stock", "share", ("B25024_002",), "B25024_001",
        description="One-unit detached houses as a share of all housing units (B25024)."),
    Var("units_2_4_share", "2-4 unit buildings", "stock", "share", ("B25024_004", "B25024_005"), "B25024_001",
        description="Units in buildings with 2 to 4 units as a share of all housing units (B25024)."),
    Var("units_5_19_share", "5-19 unit buildings", "stock", "share", ("B25024_006", "B25024_007"), "B25024_001",
        description="Units in buildings with 5 to 19 units as a share of all housing units (B25024)."),
    Var("units_20plus_share", "20+ unit buildings", "stock", "share", ("B25024_008", "B25024_009"), "B25024_001",
        description="Units in buildings with 20 or more units as a share of all housing units (B25024)."),
    Var("renter_share", "Renter households", "tenure", "share", ("B25003_003",), "B25003_001",
        description="Renter-occupied units as a share of occupied housing units (B25003)."),
    Var("renter_hh", "Renter households (count)", "tenure", "count", ("B25003_003",),
        description="Renter-occupied housing units (B25003)."),
    Var("owner_hh", "Owner households (count)", "tenure", "count", ("B25003_002",),
        description="Owner-occupied housing units (B25003)."),
    Var("pop_renter_share", "People in rented homes", "tenure", "share", ("B25008_003",), "B25008_001",
        description="People living in renter-occupied units as a share of the population in occupied housing units "
                    "(B25008)."),
    Var("med_gross_rent", "Median gross rent", "cost", "usd", ("B25064_001",),
        description="Median gross rent (rent plus utilities) of renter-occupied units paying cash rent, in dollars "
                    "(B25064)."),
    Var("med_home_value", "Median home value", "cost", "usd", ("B25077_001",),
        description="Median value of owner-occupied housing units, in dollars (B25077). Topcoded values are kept "
                    "as published."),
    Var("rent_burden30_share", "Renters paying 30%+", "cost", "share", _rng("B25070", 7, 10), "B25070_001",
        description="Renter households paying 30% or more of household income on gross rent, as a share of renter "
                    "households (B25070). " + _BURDEN_NOTE),
    Var("rent_burden50_share", "Renters paying 50%+", "cost", "share", ("B25070_010",), "B25070_001",
        description="Renter households paying 50% or more of household income on gross rent, as a share of renter "
                    "households (B25070). " + _BURDEN_NOTE),
    Var("owner_burden30_share", "Owners paying 30%+", "cost", "share", _rng("B25091", 8, 11) + _rng("B25091", 19, 22),
        "B25091_001",
        description="Owner households, with or without a mortgage, paying 30% or more of household income on "
                    "selected monthly owner costs, as a share of owner households (B25091). " + _BURDEN_NOTE),
    Var("drive_alone_share", "Drive alone to work", "commute", "share", ("B08301_003",), "B08301_001",
        description="Workers 16 and over who drove alone (car, truck or van) as a share of all workers (B08301)."),
    Var("transit_share", "Public transit to work", "commute", "share", ("B08301_010",), "B08301_001",
        description="Workers 16 and over who took public transportation (excluding taxicab) as a share of all workers "
                    "(B08301)."),
    Var("walk_share", "Walk to work", "commute", "share", ("B08301_019",), "B08301_001",
        description="Workers 16 and over who walked as a share of all workers (B08301)."),
    Var("bike_share", "Bike to work", "commute", "share", ("B08301_018",), "B08301_001",
        description="Workers 16 and over who bicycled as a share of all workers (B08301)."),
    Var("wfh_share", "Work from home", "commute", "share", ("B08301_021",), "B08301_001",
        description="Workers 16 and over who worked from home as a share of all workers (B08301)."),
    Var("no_vehicle_share", "Households with no vehicle", "commute", "share", ("B25044_003", "B25044_010"), "B25044_001",
        description="Occupied housing units with no vehicle available (owner plus renter) as a share of all occupied "
                    "units (B25044; B08201 gives the same share but is not published for block groups)."),
]

VAR_BY_ID: dict[str, Var] = {v.id: v for v in CATALOGUE}


def raw_vars(cat: list[Var] | None = None) -> list[str]:
    """Sorted unique ACS stems needed by the catalogue (84 for the full catalogue)."""
    stems: set[str] = set()
    for v in cat or CATALOGUE:
        stems.update(v.stems)
    return sorted(stems)


def batches(stems: list[str], per_call: int = 24) -> list[list[str]]:
    """Split stems into API calls of at most `per_call` stems (E + M columns <= 50 with the geography columns)."""
    if per_call < 1 or per_call * 2 > 50:
        raise ValueError("per_call must be between 1 and 25 so that E+M columns stay within the API limit of 50")
    return [stems[i:i + per_call] for i in range(0, len(stems), per_call)]


# ---------------------------------------------------------------------------------------- Census API
def geo_clause(level: str, zctas: list[str] | None = None) -> dict[str, str]:
    """`for` / `in` parameters for one level. ZCTAs need their explicit id list (no `in` since the 2020 vintage)."""
    if level == "tract":
        return {"for": "tract:*", "in": f"state:{STATE_FIPS} county:{COUNTY_FIPS}"}
    if level == "bg":
        return {"for": "block group:*", "in": f"state:{STATE_FIPS} county:{COUNTY_FIPS} tract:*"}
    if level == "zcta":
        if not zctas:
            raise ValueError("the ZCTA clause needs the explicit list of ZCTA ids")
        return {"for": "zip code tabulation area:" + ",".join(zctas)}
    if level == "muni":
        return {"for": "county subdivision:*", "in": f"state:{STATE_FIPS} county:{COUNTY_FIPS}"}
    if level == "county":
        return {"for": f"county:{COUNTY_FIPS}", "in": f"state:{STATE_FIPS}"}
    if level == "city":
        return {"for": f"place:{CITY_PLACE_GEOID[len(STATE_FIPS):]}", "in": f"state:{STATE_FIPS}"}
    raise ValueError(f"unknown level {level!r}")


def _redact(text: str) -> str:
    return text.replace(CENSUS_API_KEY, "***") if CENSUS_API_KEY else text


def request_rows(session: requests.Session, params: dict, tries: int = 4, timeout: int = 90, url: str = API_URL) -> list[list]:
    """One Census API call. Returns the header row followed by data rows; [] when the geography is empty (204).

    Retries `tries` times with 1/2/4/8 s waits on network errors, 429 and 5xx. A 400 raises at once with the body
    and the requested columns (the API names the offending variable there). The key never appears in messages.
    `url` defaults to the catalogue vintage; the history build passes earlier vintages.
    """
    last = ""
    for attempt in range(tries):
        try:
            r = session.get(url, params=params, timeout=timeout)
        except requests.RequestException as e:
            last = type(e).__name__
        else:
            if r.status_code == 204 or (r.status_code == 200 and not r.content.strip()):
                return []
            if r.status_code == 200:
                return r.json()
            body = _redact(r.text.strip()[:500])
            if r.status_code == 400:
                raise RuntimeError(f"Census API 400: {body} | get={params.get('get')} for={params.get('for')}")
            if r.status_code == 429 or r.status_code >= 500:
                last = f"HTTP {r.status_code}"
            else:
                raise RuntimeError(f"Census API HTTP {r.status_code}: {body} | for={params.get('for')}")
        if attempt < tries - 1:
            time.sleep(2 ** attempt)
    raise RuntimeError(f"Census API gave up after {tries} tries ({last}) | for={params.get('for')}")


def rows_to_frame(rows: list[list], level: str) -> pd.DataFrame:
    """API rows (header first) -> DataFrame indexed by the zero-padded GEOID, geography columns dropped."""
    cols = GEO_COLS[level]
    if not rows:
        return pd.DataFrame(index=pd.Index([], name="GEOID", dtype=str))
    df = pd.DataFrame(rows[1:], columns=rows[0])
    missing = [c for c in cols if c not in df.columns]
    if missing:
        raise ValueError(f"{level}: geography columns {missing} missing from the API response header {rows[0][-4:]}")
    df["GEOID"] = df[list(cols)].astype(str).agg("".join, axis=1)
    bad = df["GEOID"].str.len() != GEOID_LEN[level]
    if bad.any():
        raise ValueError(f"{level}: {int(bad.sum())} GEOIDs are not {GEOID_LEN[level]} chars, e.g. {df.loc[bad, 'GEOID'].iloc[0]}")
    return df.drop(columns=list(cols)).set_index("GEOID").sort_index()


def cache_path(level: str) -> Path:
    return ACS_CACHE / f"acs5_{ACS_YEAR}_{level}.csv"


def cache_is_complete(level: str, cat: list[Var] | None = None) -> bool:
    """True when the cached CSV exists and holds every E/M column the catalogue needs."""
    path = cache_path(level)
    if not path.exists():
        return False
    header = pd.read_csv(path, nrows=0).columns
    return all(f"{s}{x}" in header for s in raw_vars(cat) for x in ("E", "M"))


def fetch_level(level: str, *, zctas: list[str] | None = None, refresh: bool = False,
                session: requests.Session | None = None, cat: list[Var] | None = None) -> pd.DataFrame:
    """All E/M columns for one level, county-wide, as returned by the API (strings; sentinels intact).

    Cached in data/raw/acs/acs5_<year>_<level>.csv; `refresh` bypasses the cache. Empty geographies give an
    empty frame rather than an error so the caller can report the count.
    """
    path = cache_path(level)
    needed = [f"{s}{x}" for s in raw_vars(cat) for x in ("E", "M")]
    if path.exists() and not refresh:
        cached = pd.read_csv(path, dtype=str).set_index("GEOID").sort_index()
        missing = [c for c in needed if c not in cached.columns]
        if not missing:
            return cached
        print(f"  cache {path.name} lacks {len(missing)} columns (catalogue changed, e.g. {missing[0]}); refetching")
    session = session or requests.Session()
    frames = []
    for stems in batches(raw_vars(cat)):
        cols = [f"{s}{x}" for s in stems for x in ("E", "M")]
        params = {"get": ",".join(cols), **geo_clause(level, zctas)}
        if CENSUS_API_KEY:
            params["key"] = CENSUS_API_KEY
        frames.append(rows_to_frame(request_rows(session, params), level))
    df = pd.concat(frames, axis=1) if frames else pd.DataFrame()
    df.index.name = "GEOID"
    ACS_CACHE.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index_label="GEOID")
    return df


# -------------------------------------------------------------------------------------------- math
def clean_raw(df: pd.DataFrame) -> pd.DataFrame:
    """Numeric E/M columns with the ACS sentinels applied: E < 0 -> NaN; M == -555555555 -> 0; other M < 0 -> NaN."""
    cols: dict[str, pd.Series] = {}
    for c in df.columns:
        s = pd.to_numeric(df[c], errors="coerce").astype(float)
        if c.endswith("M"):
            s = s.mask(s == -555555555, 0.0)
        cols[c] = s.where(s >= 0)
    return pd.DataFrame(cols, index=df.index)


def moe_sum(moes: pd.DataFrame) -> pd.Series:
    """Root-sum-square MOE of a sum of estimates; NaN if any component MOE is missing."""
    return np.sqrt((moes.astype(float) ** 2).sum(axis=1, skipna=False))


def share_with_moe(num: pd.Series, num_moe: pd.Series, den: pd.Series, den_moe: pd.Series) -> tuple[pd.Series, pd.Series]:
    """p = num/den clipped to [0, 1] with the ACS proportion MOE; the ratio formula when the radicand is negative.

    Denominators <= 0 give NaN for both.
    """
    d = den.where(den > 0)
    p = (num / d).clip(0, 1)
    rad = num_moe ** 2 - p ** 2 * den_moe ** 2
    moe = np.sqrt(rad.where(rad >= 0, num_moe ** 2 + p ** 2 * den_moe ** 2)) / d
    return p, moe


def cv(est: pd.Series, moe: pd.Series) -> pd.Series:
    """Coefficient of variation from a 90% MOE; NaN where the estimate is <= 0 or either input is missing."""
    return (moe / Z90) / est.where(est > 0)


def reliability(value: float | None) -> str | None:
    """high (cv < 0.15) · medium (cv <= 0.30) · low (cv > 0.30) · None when the cv is missing."""
    if value is None or (isinstance(value, float) and math.isnan(value)) or value is pd.NA:
        return None
    if value < RELIABILITY["high"]:
        return "high"
    if value <= RELIABILITY["medium"]:
        return "medium"
    return "low"


def reliability_series(cvs: pd.Series) -> pd.Series:
    c = cvs.astype(float)
    out = pd.Series(
        np.select([c < RELIABILITY["high"], c <= RELIABILITY["medium"], c > RELIABILITY["medium"]],
                  ["high", "medium", "low"], default="n/a"),
        index=c.index,
    )
    return out.where(c.notna(), "n/a")


def derive(raw: pd.DataFrame, cat: list[Var] | None = None) -> pd.DataFrame:
    """Every catalogue variable as `{id}`, `{id}_moe`, `{id}_cv` from a cleaned E/M frame (unrounded)."""
    cat = cat or CATALOGUE
    cols: dict[str, pd.Series] = {}
    for v in cat:
        est_cols = [f"{s}E" for s in v.num]
        moe_cols = [f"{s}M" for s in v.num]
        if v.kind == "median":
            est, moe = raw[est_cols[0]].astype(float), raw[moe_cols[0]].astype(float)
        else:
            est = raw[est_cols].astype(float).sum(axis=1, skipna=False)
            moe = moe_sum(raw[moe_cols])
            if v.kind == "share":
                est, moe = share_with_moe(est, moe, raw[f"{v.den}E"].astype(float), raw[f"{v.den}M"].astype(float))
        cols[v.id] = est
        cols[f"{v.id}_moe"] = moe
        cols[f"{v.id}_cv"] = cv(est, moe)
    out = pd.DataFrame(cols, index=raw.index)
    out.index.name = "GEOID"
    return out


DECIMALS = {"count": 0, "usd": 0, "years": 0, "age": 1, "share": 4}


def round_values(df: pd.DataFrame, cat: list[Var] | None = None) -> pd.DataFrame:
    """Round per unit: whole numbers (nullable Int64) for count/usd/years, 1 dp age, 4 dp share; cv 3 dp."""
    out = df.copy()
    for v in cat or CATALOGUE:
        nd = DECIMALS[v.unit]
        for c in (v.id, f"{v.id}_moe"):
            if c not in out:
                continue
            out[c] = out[c].astype(float).round(nd)
            if nd == 0:
                out[c] = out[c].astype("Int64")
        if f"{v.id}_cv" in out:
            out[f"{v.id}_cv"] = out[f"{v.id}_cv"].astype(float).round(3)
    return out


def jsonable(v):
    """Python scalar for JSON: NaN / NA -> None, numpy ints -> int, floats kept as floats."""
    if v is None or v is pd.NA:
        return None
    if isinstance(v, (bool, np.bool_)):
        return bool(v)
    if isinstance(v, (int, np.integer)):
        return int(v)
    if isinstance(v, (float, np.floating)):
        return None if math.isnan(v) or math.isinf(v) else float(v)
    return v


def to_values_json(df: pd.DataFrame, cat: list[Var] | None = None, geoids=None) -> dict[str, dict[str, list]]:
    """`{geoid: {var: [est, moe, cv]}}` with nulls kept; `geoids` restricts and orders the rows (city subset)."""
    cat = cat or CATALOGUE
    sub = df if geoids is None else df.reindex(list(geoids))
    cols = [c for v in cat for c in (v.id, f"{v.id}_moe", f"{v.id}_cv")]
    records = sub[cols].to_dict(orient="index")
    return {str(g): {v.id: [jsonable(r[v.id]), jsonable(r[f"{v.id}_moe"]), jsonable(r[f"{v.id}_cv"])] for v in cat}
            for g, r in records.items()}


def to_long(df: pd.DataFrame, level: str, cat: list[Var] | None = None) -> pd.DataFrame:
    """Long rows `level, geoid, var, est, moe, cv` (NaN kept) for the acs_values table."""
    parts = []
    for v in cat or CATALOGUE:
        parts.append(pd.DataFrame({
            "level": level, "geoid": df.index.astype(str), "var": v.id,
            "est": df[v.id].astype("float64").to_numpy(),
            "moe": df[f"{v.id}_moe"].astype("float64").to_numpy(),
            "cv": df[f"{v.id}_cv"].astype("float64").to_numpy(),
        }))
    return pd.concat(parts, ignore_index=True)


# ---------------------------------------------------------------------------------------- catalogue out
def catalogue_json(levels_meta: dict[str, dict[str, int]], cat: list[Var] | None = None) -> dict:
    cat = cat or CATALOGUE
    return {
        "meta": {
            "acs_year": ACS_YEAR,
            "vintage": VINTAGE,
            "built_at": datetime.now(UTC).isoformat(timespec="seconds"),
            "moe_level": 90,
            "reliability": dict(RELIABILITY),
            "levels": {lv: dict(levels_meta[lv]) for lv in LEVELS if lv in levels_meta},
        },
        "groups": [{"id": g, "label": label} for g, label in GROUPS],
        "variables": [
            {"id": v.id, "label": v.label, "group": v.group, "unit": v.unit, "kind": v.kind, "num": list(v.num),
             "den": v.den, "table_id": v.table_id, "description": v.description, "sort": i}
            for i, v in enumerate(cat)
        ],
    }


def catalogue_markdown(levels_meta: dict[str, dict[str, int]] | None = None, cat: list[Var] | None = None) -> str:
    cat = cat or CATALOGUE
    labels = dict(GROUPS)
    lines = [
        "# ACS variables in the Explore data browser",
        "",
        (f"Source: American Community Survey {VINTAGE} estimates (table B/C stems below), pulled from the Census API "
         f"`{API_URL}` and cached under `data/raw/acs/`. Built by `scripts/07_build_acs_levels.py`; the catalogue the "
         "app reads is `app/src/data/acs_variables.json`."),
        "",
        "These values are descriptive context for browsing. They are never scored and never feed the Track 3 match.",
        "",
        "## Geographies",
        "",
        "| level | unit | county-wide (CSV, Supabase) | bundled in the app (city subset) | city rule |",
        "|---|---|---|---|---|",
    ]
    rules = {
        "tract": "the 128 city tracts of the main pipeline (>= 50% of area inside the city)",
        "bg": ">= 50% of the block group's area inside the city",
        "zcta": ">= 1% of the ZCTA's area inside the city",
        "muni": "all 129 municipalities other than Pittsburgh (county subdivisions), bundled in full",
        "county": "Allegheny County (42003)",
        "city": "Pittsburgh city place (4261000)",
    }
    for lv in LEVELS:
        m = (levels_meta or {}).get(lv, {})
        lines.append(f"| `{lv}` | {LEVEL_LABELS[lv]} | {m.get('total', '')} | {m.get('bundled', '')} | {rules[lv]} |")
    lines += [
        "",
        "## Method",
        "",
        ("- Every variable is published at every level with three numbers: estimate, 90% margin of error (MOE) and "
         "the coefficient of variation `cv = (moe / 1.645) / estimate` (null when the estimate is 0 or missing)."),
        ("- `median`: one published value with its own MOE. `sum`: components added, MOE = root-sum-square of the "
         "component MOEs. `share`: numerator / denominator with the ACS proportion MOE "
         "`sqrt(moe_num^2 - p^2 * moe_den^2) / den`; when the radicand is negative the ratio form "
         "`sqrt(moe_num^2 + p^2 * moe_den^2) / den` is used. Shares are clipped to [0, 1]; a denominator of 0 gives "
         "null."),
        ("- Sentinels: negative estimates (-666666666 and friends) become null; an MOE of -555555555 (controlled "
         "estimate) becomes 0; other negative MOEs (including -333333333, median in an open-ended interval) become "
         "null. Nothing is imputed."),
        "- Reliability, computed in the app from the cv: high < 0.15, medium <= 0.30, low > 0.30, n/a when null.",
        "- Rounding: whole numbers for counts, dollars and years; 1 decimal for age; 4 decimals for shares; cv 3 decimals.",
        ("- Topcoded medians (income, home value) are kept as published. Two tables are swapped for block-group "
         "coverage: poverty uses C17002 (B17001 is tract and above) and vehicles use B25044 (B08201 is tract and "
         "above); both give the same shares where the original table exists."),
        "",
        "## Variables",
        "",
        "| id | label | group | unit | kind | numerator stems | denominator | description |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for v in cat:
        stems = ", ".join(v.num) if len(v.num) <= 4 else f"{v.num[0]} … {v.num[-1]} ({len(v.num)} stems)"
        lines.append(f"| `{v.id}` | {v.label} | {labels.get(v.group, v.group)} | {v.unit} | {v.kind} | {stems} | "
                     f"{v.den or '—'} | {v.description} |")
    lines += ["", f"{len(cat)} variables from {len(raw_vars(cat))} ACS stems.", ""]
    return "\n".join(lines)
