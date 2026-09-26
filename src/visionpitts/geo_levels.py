"""Geometry for the five ACS levels: county-wide sets and the city subsets the app bundles.

Each loader returns a WGS84 GeoDataFrame with `GEOID`, `name`, `pgh_share` (share of the unit's area inside the
Pittsburgh city polygon, computed in EPSG:2272) and, for block groups, the parent `tract`. `to_fc` turns one into
the compact FeatureCollection the app reads, with the same simplify-and-round recipe as `export.to_geojson`.
"""
from __future__ import annotations

import json
import math
from typing import Literal

import geopandas as gpd
import pandas as pd

from visionpitts import geo
from visionpitts.config import (
    CITY_PLACE_GEOID,
    CITY_SHARE_MIN,
    COUNTY_GEOID,
    CRS_PA_SOUTH,
    CRS_WGS84,
    FT_PER_M,
    INTERIM,
    RAW,
)

TRACTS_SHP = geo.TRACTS_SHP
BGS_SHP = RAW / "boundaries" / "allegheny_bgs" / "allegheny_bgs.shp"
COUNTY_SHP = RAW / "boundaries" / "allegheny_county" / "allegheny_county.shp"
CITY_SHP = geo.CITY_SHP
ZCTA_GEOJSON = RAW / "benchmark" / "flags" / "zcta2020_allegheny.geojson"
CITY_TRACTS_PARQUET = INTERIM / "tracts_city.parquet"

Scope = Literal["county", "city"]
ZCTA_CITY_MIN = 0.01          # a ZCTA is "in the city" when at least 1% of its area is inside the city limits
BG_CITY_MIN = CITY_SHARE_MIN  # block groups follow the tract rule (>= 50%)
SIMPLIFY_M: dict[str, float] = {"tract": 5.0, "bg": 5.0, "zcta": 10.0, "county": 10.0, "city": 10.0}
EXPECTED: dict[str, dict[str, int]] = {
    "county": {"tract": 394, "bg": 1062, "zcta": 170, "county": 1, "city": 1},
    "city": {"tract": 128, "bg": 314, "zcta": 32, "county": 1, "city": 1},
}
COUNTY_NAME = "Allegheny County"
CITY_NAME = "City of Pittsburgh"


# ------------------------------------------------------------------------------------------- names
def tract_name(tractce: str) -> str:
    """'010301' -> 'Tract 103.01'; '020100' -> 'Tract 201' (the Census NAME convention)."""
    t = str(tractce).zfill(6)
    whole, frac = int(t[:4]), t[4:]
    return f"Tract {whole}" + (f".{frac}" if frac != "00" else "")


def bg_name(tractce: str, blkgrp: str) -> str:
    return f"{tract_name(tractce)} · BG {blkgrp}"


# ------------------------------------------------------------------------------------------- shares
def share_inside(units: gpd.GeoDataFrame, city: gpd.GeoDataFrame | None = None) -> pd.Series:
    """Share of each unit's area inside the city polygon, computed in EPSG:2272 and clipped to [0, 1]."""
    u = units.to_crs(CRS_PA_SOUTH)
    c = (city if city is not None else geo.city_boundary()).to_crs(CRS_PA_SOUTH).geometry.union_all()
    inter = u.geometry.intersection(c).area
    return (inter / u.geometry.area).clip(0, 1).rename("pgh_share")


def zcta_city_share(zctas: gpd.GeoDataFrame, city: gpd.GeoDataFrame | None = None) -> pd.Series:
    return share_inside(zctas, city)


def city_tract_ids() -> list[str]:
    """The 128 city tracts of the main pipeline (scripts/01), from data/interim/tracts_city.parquet."""
    ids = pd.read_parquet(CITY_TRACTS_PARQUET, columns=["GEOID"])["GEOID"].astype(str).tolist()
    if len(ids) != EXPECTED["city"]["tract"]:
        raise RuntimeError(f"{CITY_TRACTS_PARQUET} holds {len(ids)} tracts, expected {EXPECTED['city']['tract']}")
    return sorted(ids)


def _finish(g: gpd.GeoDataFrame, cols: list[str]) -> gpd.GeoDataFrame:
    g = g[cols + ["geometry"]].to_crs(CRS_WGS84)
    return g.sort_values("GEOID").reset_index(drop=True)


# ------------------------------------------------------------------------------------------- loaders
def tracts(scope: Scope = "county") -> gpd.GeoDataFrame:
    t = gpd.read_file(TRACTS_SHP)
    t["GEOID"] = t["GEOID"].astype(str)
    t["name"] = t["NAMELSAD"].str.replace("Census Tract", "Tract", regex=False)
    t["pgh_share"] = share_inside(t).round(4)
    if scope == "city":
        t = t[t["GEOID"].isin(city_tract_ids())]
    return _finish(t, ["GEOID", "name", "pgh_share"])


def block_groups(scope: Scope = "county") -> gpd.GeoDataFrame:
    b = gpd.read_file(BGS_SHP)
    b["GEOID"] = b["GEOID"].astype(str)
    b["tract"] = b["GEOID"].str[:11]
    b["name"] = [bg_name(t, k) for t, k in zip(b["TRACTCE"].astype(str), b["BLKGRPCE"].astype(str), strict=True)]
    b["pgh_share"] = share_inside(b).round(4)
    if scope == "city":
        b = b[b["pgh_share"] >= BG_CITY_MIN]
    return _finish(b, ["GEOID", "name", "tract", "pgh_share"])


def zctas(scope: Scope = "county") -> gpd.GeoDataFrame:
    z = gpd.read_file(ZCTA_GEOJSON)
    z["GEOID"] = z["ZCTA5"].astype(str).str.zfill(5)
    z["name"] = "ZIP " + z["GEOID"]
    z["pgh_share"] = zcta_city_share(z).round(4)
    if scope == "city":
        z = z[z["pgh_share"] >= ZCTA_CITY_MIN]
    return _finish(z, ["GEOID", "name", "pgh_share"])


def zcta_ids() -> list[str]:
    z = gpd.read_file(ZCTA_GEOJSON)
    return sorted(z["ZCTA5"].astype(str).str.zfill(5).unique().tolist())


def county() -> gpd.GeoDataFrame:
    c = gpd.read_file(COUNTY_SHP)
    c["GEOID"] = c["GEOID"].astype(str)
    c = c[c["GEOID"] == COUNTY_GEOID].copy()
    c["name"] = COUNTY_NAME
    c["pgh_share"] = share_inside(c).round(4)
    return _finish(c, ["GEOID", "name", "pgh_share"])


def city() -> gpd.GeoDataFrame:
    c = gpd.read_file(CITY_SHP)
    c["GEOID"] = c["GEOID"].astype(str)
    c = c[c["GEOID"] == CITY_PLACE_GEOID].copy()
    c["name"] = CITY_NAME
    c["pgh_share"] = 1.0
    return _finish(c, ["GEOID", "name", "pgh_share"])


def units(level: str, scope: Scope = "county") -> gpd.GeoDataFrame:
    """County-wide or city-subset units for one level, WGS84, sorted by GEOID."""
    if level == "tract":
        return tracts(scope)
    if level == "bg":
        return block_groups(scope)
    if level == "zcta":
        return zctas(scope)
    if level == "county":
        return county()
    if level == "city":
        return city()
    raise ValueError(f"unknown level {level!r}")


def props_for(level: str) -> list[str]:
    return ["GEOID", "name", "tract", "pgh_share"] if level == "bg" else ["GEOID", "name", "pgh_share"]


# ------------------------------------------------------------------------------------------- geojson
def _round(c, nd: int):
    if isinstance(c, (int, float)):
        return round(c, nd)
    return [_round(x, nd) for x in c]


def _prop(v):
    if v is None or v is pd.NA or (isinstance(v, float) and math.isnan(v)):
        return None
    if hasattr(v, "item"):
        return v.item()
    return v


def to_fc(gdf: gpd.GeoDataFrame, props: list[str], tolerance_m: float, nd: int = 5) -> dict:
    """FeatureCollection with the given property columns; simplified in EPSG:2272 (metres, topology preserved),
    coordinates rounded to `nd` decimals, the same recipe as export.to_geojson."""
    g = gdf[props + ["geometry"]].to_crs(CRS_PA_SOUTH)
    g["geometry"] = g.geometry.simplify(tolerance_m * FT_PER_M, preserve_topology=True)
    g = g.to_crs(CRS_WGS84)
    feats = []
    for _, r in g.iterrows():
        geom = json.loads(json.dumps(r.geometry.__geo_interface__))
        geom["coordinates"] = _round(geom["coordinates"], nd)
        feats.append({"type": "Feature", "properties": {p: _prop(r[p]) for p in props}, "geometry": geom})
    return {"type": "FeatureCollection", "features": feats}
