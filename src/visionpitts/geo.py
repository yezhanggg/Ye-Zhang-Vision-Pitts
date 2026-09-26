"""Geography: city tracts, neighborhood labels, 2020 blocks and the 2010 -> 2020 housing-unit crosswalk."""
from __future__ import annotations

import geopandas as gpd
import numpy as np
import pandas as pd

from visionpitts.config import (
    CITY_SHARE_MIN,
    COUNTY_FIPS,
    CRS_PA_SOUTH,
    CRS_WGS84,
    FOCUS_TRACTS,
    INTERIM,
    RAW,
)

TRACTS_SHP = RAW / "boundaries" / "allegheny_tracts" / "allegheny_tracts.shp"
CITY_SHP = RAW / "boundaries" / "pittsburgh_city" / "pittsburgh_city.shp"
NEIGHBORHOODS = RAW / "benchmark" / "neighborhoods" / "neighborhoods.geojson"
BLOCKS_ZIP = RAW / "crosswalks" / "tiger" / "tl_2020_42_tabblock20.zip"
BG10_ZIP = RAW / "crosswalks" / "tiger" / "tl_2010_42003_bg10.zip"
XWALK_CACHE = INTERIM / "blocks20_to_2010.parquet"


def county_tracts() -> gpd.GeoDataFrame:
    """All 394 Allegheny County 2020 tracts (Census cartographic boundary file, 2023 release), WGS84."""
    t = gpd.read_file(TRACTS_SHP)[["GEOID", "NAME", "NAMELSAD", "ALAND", "AWATER", "geometry"]]
    t["GEOID"] = t["GEOID"].astype(str)
    return t.to_crs(CRS_WGS84).sort_values("GEOID").reset_index(drop=True)


def city_boundary() -> gpd.GeoDataFrame:
    return gpd.read_file(CITY_SHP).to_crs(CRS_WGS84)


def city_share(tracts: gpd.GeoDataFrame) -> pd.Series:
    """Share of each tract's land+water area that falls inside the Pittsburgh city polygon (computed in EPSG:2272)."""
    t = tracts.to_crs(CRS_PA_SOUTH)
    city = city_boundary().to_crs(CRS_PA_SOUTH).geometry.union_all()
    inter = t.geometry.intersection(city).area
    return (inter / t.geometry.area).clip(0, 1).rename("pgh_share")


def city_tracts() -> gpd.GeoDataFrame:
    """2020 tracts whose area is mostly inside the City of Pittsburgh. Adds pgh_share and neighborhood."""
    t = county_tracts()
    t["pgh_share"] = city_share(t).round(4)
    t = t[t["pgh_share"] >= CITY_SHARE_MIN].copy()
    t["neighborhood"] = neighborhood_labels(t)
    t["name"] = t["NAMELSAD"].str.replace("Census Tract", "Tract", regex=False)
    return t.reset_index(drop=True)


def neighborhoods() -> gpd.GeoDataFrame:
    """City of Pittsburgh neighborhoods (WPRDC), dissolved to one polygon per neighborhood."""
    n = gpd.read_file(NEIGHBORHOODS)[["hood", "geometry"]].to_crs(CRS_WGS84)
    n = n.dissolve(by="hood").reset_index().rename(columns={"hood": "name"})
    return n


def neighborhood_labels(tracts: gpd.GeoDataFrame) -> pd.Series:
    """Largest-area-overlap neighborhood for each tract (label only)."""
    t = tracts[["GEOID", "geometry"]].to_crs(CRS_PA_SOUTH)
    n = neighborhoods().to_crs(CRS_PA_SOUTH)
    ov = gpd.overlay(t, n, how="intersection", keep_geom_type=False)
    ov["a"] = ov.geometry.area
    best = ov.sort_values("a", ascending=False).drop_duplicates("GEOID").set_index("GEOID")["name"]
    return tracts["GEOID"].map(best)


def resolve_focus(tracts: gpd.GeoDataFrame) -> list[dict]:
    """Focus tracts in demo order. Unresolved names take the tract with the largest overlap with that neighborhood."""
    t = tracts[["GEOID", "geometry"]].to_crs(CRS_PA_SOUTH)
    n = neighborhoods().to_crs(CRS_PA_SOUTH).set_index("name")
    out = []
    for name, geoid in FOCUS_TRACTS:
        if geoid is None:
            poly = n.loc[name, "geometry"]
            a = t.geometry.intersection(poly).area
            geoid = t.loc[a.idxmax(), "GEOID"]
        out.append({"geoid": geoid, "label": name})
    return out


def blocks2020() -> gpd.GeoDataFrame:
    """Allegheny 2020 tabulation blocks as internal points with HOUSING20 and POP20 (TIGER/Line 2020)."""
    b = gpd.read_file(BLOCKS_ZIP, where=f"COUNTYFP20='{COUNTY_FIPS}'")
    pts = gpd.points_from_xy(b["INTPTLON20"].astype(float), b["INTPTLAT20"].astype(float), crs=CRS_WGS84)
    out = gpd.GeoDataFrame(
        {
            "block20": b["GEOID20"].astype(str),
            "tract20": b["GEOID20"].astype(str).str[:11],
            "hu": b["HOUSING20"].astype(int),
            "pop": b["POP20"].astype(int),
        },
        geometry=pts,
        crs=CRS_WGS84,
    )
    return out


def crosswalk() -> pd.DataFrame:
    """Every 2020 block (as a point) placed in its 2010 block group and tract. Cached in data/interim.

    Columns: block20, tract20, hu, pop, bg10, tract10. Weights derived from `hu` (2020 housing units):
    a 2010 unit's value is carried to 2020 tracts in proportion to the housing that now sits in each.
    """
    if XWALK_CACHE.exists():
        return pd.read_parquet(XWALK_CACHE)
    b = blocks2020()
    bg = gpd.read_file(BG10_ZIP)[["GEOID10", "geometry"]].to_crs(CRS_WGS84)
    j = gpd.sjoin(b, bg, how="left", predicate="within").drop(columns=["index_right", "geometry"])
    # a handful of points can sit exactly on a boundary or in water; fall back to nearest 2010 block group
    miss = j["GEOID10"].isna()
    if miss.any():
        near = gpd.sjoin_nearest(b[miss].to_crs(CRS_PA_SOUTH), bg.to_crs(CRS_PA_SOUTH), how="left")
        j.loc[miss, "GEOID10"] = near["GEOID10"].values
    j = j.rename(columns={"GEOID10": "bg10"})
    j["tract10"] = j["bg10"].str[:11]
    j = j.drop_duplicates("block20")
    j.to_parquet(XWALK_CACHE, index=False)
    return j


def carry_rate(values: pd.Series, unit: str, xw: pd.DataFrame) -> pd.DataFrame:
    """Housing-unit-weighted mean of a 2010-geography value onto 2020 tracts.

    values: indexed by 2010 unit id (bg10 or tract10). Returns tract20 -> value, coverage (share of HU with a value),
    dominant (largest share of the tract's HU coming from a single 2010 unit; low = boundary changed a lot).
    """
    d = xw[[unit, "tract20", "hu"]].copy()
    d["v"] = d[unit].map(values)
    tot = d.groupby("tract20")["hu"].sum()
    has = d[d["v"].notna()]
    wsum = has.groupby("tract20")["hu"].sum()
    wv = (has["v"] * has["hu"]).groupby(has["tract20"]).sum()
    dom = d.groupby(["tract20", unit])["hu"].sum().groupby(level=0).max() / tot.replace(0, np.nan)
    out = pd.DataFrame({"value": wv / wsum.replace(0, np.nan), "coverage": wsum / tot.replace(0, np.nan), "dominant": dom})
    return out.reindex(tot.index)


def carry_flag(flags: pd.Series, unit: str, xw: pd.DataFrame) -> pd.DataFrame:
    """Share of a 2020 tract's housing units that sit in flagged 2010 units (True/False; NaN = unit not covered)."""
    f = flags.astype("boolean")
    return carry_rate(f.astype("Float64").astype(float), unit, xw)
