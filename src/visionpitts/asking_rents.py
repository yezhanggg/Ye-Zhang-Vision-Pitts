"""Asking rents from Dewey rental listings: an INFORMATION layer, never a scoring factor.

Inputs (licensed, git-ignored): data/raw/dewey_cache/allegheny_listings.parquet, the Pennsylvania listings already
filtered to the Allegheny bounding box (scrapes 2014-01 to 2026-08), and id_mapping.parquet, Dewey's listing ->
property mapping restricted to those listing IDs (it restores PROPERTY_ID / UNIT_ID for pre-2023 rows).

Method
  1. Point-in-polygon to 2020 tracts (county tracts, so county medians are county-wide; the layer is written for
     the city study set).
  2. Keep rent $300-$10,000 and 0-5 bedrooms; one observation per unit per scrape month (median rent in the month).
  3. Levels: tract x year medians for 2BR and all units, plus pooled 2025-26. A cell is suppressed when it has
     fewer than MIN_UNITS_CELL distinct units (MIN_UNITS_POOLED for pooled cells and growth). Unit-months are
     reported next to distinct units, never used for suppression.
  4. Growth 2019-20 -> 2025-26 on EXISTING STOCK: units whose property was first listed before 2019, so a new
     building cannot read as repricing. Dewey re-keys PROPERTY_ID over time (none of the 2025 ids occur before 2019
     and only a fifth occur in 2024), so a property is identified by its PROPERTY_ID or its site (location rounded to
     about 10 m), whichever was seen first. The all-listings growth is kept as a second, labeled column.
  5. Bedroom-mix-adjusted index: median of rent / county median for the same bedroom count and year.
  6. FMR flag against the HUD FY2026 2BR FMR (Pittsburgh HMFA) and a confidence tag from distinct 2025-26 units.

Only tract aggregates leave this module; raw rows never leave data/raw (Dewey terms s.3.2: summary insights may
be published, the licensed data may not).
"""
from __future__ import annotations

import geopandas as gpd
import numpy as np
import pandas as pd

from visionpitts import hud
from visionpitts.config import CRS_WGS84, RAW

DEWEY_CACHE = RAW / "dewey_cache"
LISTINGS = DEWEY_CACHE / "allegheny_listings.parquet"
ID_MAPPING = DEWEY_CACHE / "id_mapping.parquet"
COLS = ["ID", "PROPERTY_ID", "UNIT_ID", "LATITUDE", "LONGITUDE", "RENT_PRICE", "BEDS", "DATE_POSTED",
        "SCRAPED_TIMESTAMP"]

RENT_MIN, RENT_MAX = 300, 10_000
BEDS_MAX = 5
YEARS = list(range(2019, 2027))
EARLY = (2019, 2020)
LATE = (2025, 2026)
EXISTING_BEFORE = 2019      # a property is "existing stock" if it was listed before this year
MIN_UNITS_CELL = 10         # distinct units per tract-year cell
MIN_UNITS_POOLED = 20       # distinct units for pooled 2025-26 levels, the index and both growth columns
FMR_2BR_FY2026 = hud.fmr(2) or 1299  # HUD FY2026 Fair Market Rent, 2 bedrooms, Pittsburgh HMFA (read from the HUD workbook)
CONF_UNITS = {"high": 50, "medium": 20}  # distinct 2BR units in 2025-26; below medium -> low
LL_DECIMALS = 5             # ~1 m: the location key for rows with no unit or property id
SITE_DECIMALS = 4           # ~10 m: the site key that identifies a building across Dewey's PROPERTY_ID re-keying

# Fields the app receives (export.py); everything else stays in data/processed/asking_rents.csv.
APP_FIELDS = ["rent_2br_2025_26", "n_units_2025_26", "rent_2br_growth_existing", "rent_2br_growth_all",
              "rent_index_2025_26", "rent_2br_gt_fmr", "asking_rents_conf"]


def load_listings() -> pd.DataFrame:
    return pd.read_parquet(LISTINGS, columns=COLS)


def load_id_mapping() -> pd.DataFrame:
    return pd.read_parquet(ID_MAPPING)


def assign_tracts(df: pd.DataFrame, tracts: gpd.GeoDataFrame) -> pd.Series:
    """GEOID of the tract containing each row's point (point-in-polygon on the distinct lat/lon pairs); NaN outside."""
    pts = df[["LONGITUDE", "LATITUDE"]].dropna().drop_duplicates()
    g = gpd.GeoDataFrame(pts, geometry=gpd.points_from_xy(pts["LONGITUDE"], pts["LATITUDE"]), crs=CRS_WGS84)
    j = gpd.sjoin(g, tracts[["GEOID", "geometry"]].to_crs(CRS_WGS84), predicate="within", how="inner")
    j = j[~j.index.duplicated()][["LONGITUDE", "LATITUDE", "GEOID"]]
    hit = df[["LONGITUDE", "LATITUDE"]].merge(j, on=["LONGITUDE", "LATITUDE"], how="left")["GEOID"]
    return pd.Series(hit.to_numpy(), index=df.index, name="GEOID")


def clean(df: pd.DataFrame) -> pd.DataFrame:
    """Rent and bedroom filter; integer beds; scrape timestamp (posting date as fallback) and its calendar month."""
    ok = df["RENT_PRICE"].between(RENT_MIN, RENT_MAX) & df["BEDS"].between(0, BEDS_MAX)
    out = df[ok].copy()
    out["BEDS"] = out["BEDS"].round().astype(int)
    ts = pd.to_datetime(out["SCRAPED_TIMESTAMP"].fillna(out["DATE_POSTED"]), utc=True).dt.tz_convert(None)
    out["ts"] = ts
    out["month"] = ts.dt.to_period("M")
    return out[out["month"].notna()]


def recover_ids(df: pd.DataFrame, mapping: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Fill missing UNIT_ID / PROPERTY_ID from the listing->property mapping (keyed on listing ID).

    Returns the filled frame and, per year, how many rows lacked a UNIT_ID and what share was recovered.
    """
    m = mapping.drop_duplicates("ID").set_index("ID")
    out = df.copy()
    lacked = out["UNIT_ID"].isna()
    out["UNIT_ID"] = out["UNIT_ID"].fillna(out["ID"].map(m["UNIT_ID_MAP"]))
    out["PROPERTY_ID"] = out["PROPERTY_ID"].fillna(out["ID"].map(m["PROPERTY_ID_MAP"]))
    rec = pd.DataFrame({"year": out["ts"].dt.year, "lacked": lacked, "recovered": lacked & out["UNIT_ID"].notna()})
    by_year = rec[rec["lacked"]].groupby("year").agg(rows_lacking=("lacked", "size"), share=("recovered", "mean"))
    return out, by_year


def keys(df: pd.DataFrame) -> tuple[pd.Series, pd.Series, pd.Series]:
    """Unit key, property key and key type for every row.

    property key: PROPERTY_ID, else the rounded location. unit key: UNIT_ID, else property key + beds + rent
    (so identical re-posts of one unit within a month collapse, and different units at one address do not).
    """
    loc = "ll" + df["LATITUDE"].round(LL_DECIMALS).astype(str) + "," + df["LONGITUDE"].round(LL_DECIMALS).astype(str)
    pkey = ("p" + df["PROPERTY_ID"].astype("Int64").astype(str)).where(df["PROPERTY_ID"].notna(), loc)
    fallback = pkey + "_" + df["BEDS"].astype(int).astype(str) + "_" + df["RENT_PRICE"].round().astype(int).astype(str)
    ukey = ("u" + df["UNIT_ID"].astype("Int64").astype(str)).where(df["UNIT_ID"].notna(), fallback)
    keytype = pd.Series(np.where(df["UNIT_ID"].notna(), "unit", "fallback"), index=df.index)
    return ukey, pkey, keytype


def site_key(df: pd.DataFrame) -> pd.Series:
    """Location rounded to SITE_DECIMALS (~10 m): the building identity that survives PROPERTY_ID re-keying."""
    lat, lon = df["LATITUDE"].round(SITE_DECIMALS).astype(str), df["LONGITUDE"].round(SITE_DECIMALS).astype(str)
    return "s" + lat + "," + lon


def unit_months(df: pd.DataFrame, extra: tuple[str, ...] = ()) -> pd.DataFrame:
    """One row per unit per scrape month: median rent in the month, last beds / tract / property key / site seen.

    `extra` names further per-row keys to carry (last value seen), e.g. the ZIP code or municipality of the point.
    """
    d = df.sort_values("ts")
    aggs = dict(rent=("RENT_PRICE", "median"), beds=("BEDS", "last"), geoid=("GEOID", "last"),
                pkey=("pkey", "last"), site=("site", "last"), keytype=("keytype", "last"))
    for k in extra:
        aggs[k] = (k, "last")
    g = d.groupby(["ukey", "month"], sort=False, observed=True).agg(**aggs).reset_index()
    g["year"] = g["month"].dt.year.astype(int)
    return g


def existing_stock(um: pd.DataFrame) -> pd.Series:
    """True where the unit's property was first listed before EXISTING_BEFORE, over every year on file.

    A property is its PROPERTY_ID or its site key, whichever appeared first: Dewey PROPERTY_IDs are not stable
    across scrape eras, while the geocoded site of a building is.
    """
    by_pid = um["pkey"].map(um.groupby("pkey")["year"].min())
    by_site = um["site"].map(um.groupby("site")["year"].min())
    return pd.Series(np.minimum(by_pid, by_site), index=um.index).lt(EXISTING_BEFORE)


def mix_ratio(um: pd.DataFrame) -> pd.Series:
    """Rent divided by the median rent of the same bedroom count in the same year across the whole frame (county)."""
    return um["rent"] / um.groupby(["year", "beds"])["rent"].transform("median")


def _cell(frame: pd.DataFrame, index: pd.Index, col: str = "rent") -> pd.DataFrame:
    g = frame.groupby("geoid").agg(median=(col, "median"), units=("ukey", "nunique"), months=(col, "size"))
    return g.reindex(index)


def _level(cell: pd.DataFrame, min_units: int) -> pd.Series:
    return cell["median"].where(cell["units"] >= min_units)


def _count(cell: pd.DataFrame, col: str = "units") -> pd.Series:
    return cell[col].fillna(0).astype(int)


def growth(early: pd.DataFrame, late: pd.DataFrame, min_units: int = MIN_UNITS_POOLED) -> pd.Series:
    """late median / early median - 1, only where both pooled cells have at least `min_units` distinct units."""
    ok = (early["units"] >= min_units) & (late["units"] >= min_units)
    return (late["median"] / early["median"] - 1).where(ok)


def confidence(n_units: pd.Series) -> pd.Series:
    n = n_units.fillna(0)
    lv = np.select([n >= CONF_UNITS["high"], n >= CONF_UNITS["medium"]], ["high", "medium"], default="low")
    return pd.Series(lv, index=n.index, dtype=object)


def tract_table(um: pd.DataFrame, geoids) -> pd.DataFrame:
    """One row per tract in `geoids`. `um` must carry `existing` and `ratio` (see existing_stock, mix_ratio)."""
    idx = pd.Index(geoids, name="GEOID")
    out = pd.DataFrame(index=idx)
    d = um[um["year"].isin(YEARS) & um["geoid"].isin(idx)]
    b2 = d[d["beds"] == 2]
    for y in YEARS:
        dy = d[d["year"] == y]
        c2, ca, ci = _cell(b2[b2["year"] == y], idx), _cell(dy, idx), _cell(dy, idx, "ratio")
        out[f"rent_2br_{y}"] = _level(c2, MIN_UNITS_CELL)
        out[f"n_units_2br_{y}"] = _count(c2)
        out[f"n_months_2br_{y}"] = _count(c2, "months")
        out[f"rent_all_{y}"] = _level(ca, MIN_UNITS_CELL)
        out[f"n_units_all_{y}"] = _count(ca)
        out[f"rent_index_{y}"] = _level(ci, MIN_UNITS_CELL)
    e2, l2 = _cell(b2[b2["year"].isin(EARLY)], idx), _cell(b2[b2["year"].isin(LATE)], idx)
    ex = b2[b2["existing"]]
    xe, xl = _cell(ex[ex["year"].isin(EARLY)], idx), _cell(ex[ex["year"].isin(LATE)], idx)
    la, li = _cell(d[d["year"].isin(LATE)], idx), _cell(d[d["year"].isin(LATE)], idx, "ratio")
    out["rent_2br_2019_20"] = _level(e2, MIN_UNITS_POOLED)
    out["n_units_2019_20"] = _count(e2)
    out["rent_2br_2025_26"] = _level(l2, MIN_UNITS_POOLED)
    out["n_units_2025_26"] = _count(l2)
    out["n_months_2025_26"] = _count(l2, "months")
    out["rent_2br_growth_all"] = growth(e2, l2)
    out["rent_2br_existing_2019_20"] = _level(xe, MIN_UNITS_POOLED)
    out["rent_2br_existing_2025_26"] = _level(xl, MIN_UNITS_POOLED)
    out["n_units_existing_2019_20"] = _count(xe)
    out["n_units_existing_2025_26"] = _count(xl)
    out["rent_2br_growth_existing"] = growth(xe, xl)
    out["rent_all_2025_26"] = _level(la, MIN_UNITS_POOLED)
    out["n_units_all_2025_26"] = _count(la)
    out["rent_index_2025_26"] = _level(li, MIN_UNITS_POOLED)
    r = out["rent_2br_2025_26"]
    out["rent_2br_gt_fmr"] = (r > FMR_2BR_FY2026).where(r.notna()).astype("boolean")
    out["asking_rents_conf"] = confidence(out["n_units_2025_26"])
    return out


def _med(s: pd.Series) -> float | None:
    return None if len(s) == 0 else float(s.median())


def _pooled(sub: pd.DataFrame) -> dict:
    e, la = sub[sub["year"].isin(EARLY)], sub[sub["year"].isin(LATE)]
    ne, nl = int(e["ukey"].nunique()), int(la["ukey"].nunique())
    ok = ne >= MIN_UNITS_POOLED and nl >= MIN_UNITS_POOLED
    return {"median_2019_20": _med(e["rent"]), "median_2025_26": _med(la["rent"]), "n_units_2019_20": ne,
            "n_units_2025_26": nl, "growth": float(la["rent"].median() / e["rent"].median() - 1) if ok else None}


def trend(um: pd.DataFrame, city_geoids) -> dict:
    """County and city 2BR medians per year with distinct units, and pooled growth (all listings vs existing stock)."""
    d = um[um["year"].isin(YEARS) & um["geoid"].notna()]
    b2 = d[d["beds"] == 2]
    city = b2["geoid"].isin(set(city_geoids))
    out: dict = {"years": YEARS, "county": {}, "city": {}, "growth": {}}
    for y in YEARS:
        for k, sub in (("county", b2[b2["year"] == y]), ("city", b2[(b2["year"] == y) & city])):
            out[k][str(y)] = {"median_2br": _med(sub["rent"]), "n_units": int(sub["ukey"].nunique()),
                              "n_unit_months": len(sub)}
    for k, sub in (("county", b2), ("city", b2[city])):
        out["growth"][k] = {"all": _pooled(sub), "existing": _pooled(sub[sub["existing"]])}
    return out


AREA_YEARS = YEARS


def area_table(um: pd.DataFrame, key: str, ids) -> pd.DataFrame:
    """The tract table for another geography: `key` names the unit-month column holding that geography's id."""
    return tract_table(um.assign(geoid=um[key]), ids)


def _num(v):
    if v is None or v is pd.NA or (isinstance(v, float) and np.isnan(v)):
        return None
    return float(v) if isinstance(v, (float, np.floating)) else int(v)


def area_bundle(tables: dict[str, pd.DataFrame], years: list[int] = AREA_YEARS) -> dict:
    """Compact per-area asking-rent series for the app (aggregates only, suppression already applied).

    {years, levels: {level: {geoid: {rent_2br: [...], n_units: [...], level, n, growth_existing, growth_all, conf}}}}
    """
    out: dict = {"years": years, "levels": {}}
    for level, tab in tables.items():
        units: dict[str, dict] = {}
        for geoid, r in tab.iterrows():
            rent = [_num(r.get(f"rent_2br_{y}")) for y in years]
            n = [int(r.get(f"n_units_2br_{y}", 0) or 0) for y in years]
            level_rent = _num(r.get("rent_2br_2025_26"))
            if level_rent is None and all(v is None for v in rent):
                continue
            units[str(geoid)] = {"rent_2br": rent, "n_units": n, "level": level_rent,
                                 "n": int(r.get("n_units_2025_26", 0) or 0),
                                 "growth_existing": _num(r.get("rent_2br_growth_existing")),
                                 "growth_all": _num(r.get("rent_2br_growth_all")), "conf": r.get("asking_rents_conf")}
        out["levels"][level] = units
    return out
