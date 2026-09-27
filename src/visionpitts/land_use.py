"""Land use (county parcels) and zoning mix (City of Pittsburgh) for every Explore geography.

Land use: every parcel of the Allegheny County assessment is placed at its representative point in a tract, block
group, ZIP code tabulation area, municipality, the city and the county, then classified with
`place_measures.land_use_class` (the same rule the Place card uses). Shares are of parcel lot area (LOTAREA); a unit
whose parcels carry no lot area falls back to shares of parcels. Counts are parcels and vacant parcels.

Zoning: the city zoning districts (WPRDC) are grouped into seven families and measured as a share of each city
unit's area with `place_measures.zoning_shares`. Zoning exists only inside the city, so ZIP codes and
municipalities get no zoning values.

Nothing here enters a score. The values ride in the Explore catalogue next to the ACS variables, with no margin of
error (they are counts of records, not survey estimates).
"""
from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path

import geopandas as gpd
import pandas as pd

from visionpitts import geo_levels as gl
from visionpitts import place_measures as pm
from visionpitts.config import APP_DATA, CRS_PA_SOUTH, INTERIM, PROCESSED

PARCEL_UNITS_CACHE = INTERIM / "parcel_units.parquet"
LAND_LEVELS = ("tract", "bg", "zcta", "muni", "city", "county")
ZONING_LEVELS = ("tract", "bg", "city")
GROUP_LAND = ("land", "Land use (county parcels, 2026)")
GROUP_ZONING = ("zoning", "Zoning (City of Pittsburgh)")
SOURCES = {"land": "parcels", "zoning": "zoning"}

LAND_NOTE = ("Allegheny County property assessments (2026): every parcel placed in the area at its representative "
             "point and classed by its assessment class and use; share of parcel lot area.")
ZONING_NOTE = ("City of Pittsburgh zoning districts (WPRDC), share of the area's land. The district-to-family "
               "grouping follows config/zoning_rules.json. City of Pittsburgh only.")


@dataclass(frozen=True)
class LandVar:
    id: str
    label: str
    group: str
    unit: str  # share | count
    description: str
    families: tuple[str, ...] = ()  # zoning families summed (zoning variables only)


CATALOGUE: list[LandVar] = [
    LandVar("lu_residential", "Residential land", "land", "share", f"{LAND_NOTE} Homes of every size, apartment buildings and public housing."),
    LandVar("lu_commercial", "Commercial land", "land", "share", f"{LAND_NOTE} Shops, offices, mixed retail with homes above, parking."),
    LandVar("lu_industrial", "Industrial land", "land", "share", f"{LAND_NOTE} Warehouses and manufacturing."),
    LandVar("lu_institutional", "Institutional & public land", "land", "share", f"{LAND_NOTE} Government, schools, churches, cemeteries and charitable land."),
    LandVar("lu_vacant", "Vacant land", "land", "share", f"{LAND_NOTE} Parcels assessed as vacant land (residential, commercial or industrial)."),
    LandVar("vacant_lots", "Vacant lots", "land", "count", "Number of parcels the county assesses as vacant land (Allegheny County property assessments, 2026)."),
    LandVar("parcels", "Parcels", "land", "count", "Number of assessed parcels whose representative point lies in the area (Allegheny County property assessments, 2026)."),
    LandVar("zoned_single", "Zoned single-unit", "zoning", "share", f"{ZONING_NOTE} Single-unit detached and attached residential (R1D, R1A).", ("R1D", "R1A")),
    LandVar("zoned_2_3", "Zoned 2–3 unit", "zoning", "share", f"{ZONING_NOTE} Two-unit and three-unit residential (R2, R3).", ("R2", "R3")),
    LandVar("zoned_multi", "Zoned multi-unit", "zoning", "share", f"{ZONING_NOTE} Multi-unit residential (RM, R-MU).", ("RM",)),
    LandVar("zoned_mixed", "Zoned mixed-use & commercial", "zoning", "share", f"{ZONING_NOTE} Neighborhood and urban commercial, office, highway commercial, riverfront mixed use, Downtown (LNC, NDO, UNC, HC, RIV, GT).", ("LNC", "NDO", "UNC", "HC", "RIV", "GT")),
    LandVar("zoned_industrial", "Zoned industrial", "zoning", "share", f"{ZONING_NOTE} Urban, neighborhood and general industrial (UI, NDI, GI).", ("UI", "NDI", "GI")),
    LandVar("zoned_parks_hillside", "Zoned parks & hillside", "zoning", "share", f"{ZONING_NOTE} Parks and open space, and hillside (P, H).", ("P", "H")),
    LandVar("zoned_planned", "Zoned planned & institutional", "zoning", "share", f"{ZONING_NOTE} Planned, institutional and special districts (EMI, SP, PUD and others).", ("PLANNED",)),
]
LAND_IDS = [v.id for v in CATALOGUE if v.group == "land"]
ZONING_IDS = [v.id for v in CATALOGUE if v.group == "zoning"]
IDS = [v.id for v in CATALOGUE]
SHARE_CLASSES = {"lu_residential": "residential", "lu_commercial": "commercial", "lu_industrial": "industrial",
                 "lu_institutional": "institutional", "lu_vacant": "vacant"}


def land_csv(level: str) -> Path:
    return PROCESSED / f"land_{level}.csv"


# ------------------------------------------------------------------------------------------ parcels -> units
def parcel_units(refresh: bool = False) -> pd.DataFrame:
    """PIN -> geoid per level (tract, bg, zcta, muni) plus `in_city`, from each parcel's representative point.
    Every parcel with a point inside the county is kept. Cached in data/interim (git-ignored)."""
    if PARCEL_UNITS_CACHE.exists() and not refresh:
        return pd.read_parquet(PARCEL_UNITS_CACHE)
    import pyogrio

    p = pyogrio.read_dataframe(pm.PARCELS_GEOJSON, columns=["PIN"])
    p = p[p["PIN"].notna()].to_crs(CRS_PA_SOUTH)
    p["geometry"] = p.geometry.representative_point()
    pts = p[["PIN", "geometry"]].drop_duplicates("PIN").reset_index(drop=True)
    out = pd.DataFrame({"PIN": pts["PIN"].astype(str)})
    for level in ("tract", "bg", "zcta", "muni", "city"):
        u = gl.units(level, "county")[["GEOID", "geometry"]].to_crs(CRS_PA_SOUTH)
        j = gpd.sjoin(pts, u, how="left", predicate="within")
        j = j[~j.index.duplicated(keep="first")]
        col = j["GEOID"].reindex(pts.index)
        out["in_city" if level == "city" else level] = col.notna().to_numpy() if level == "city" else col.astype("string").to_numpy()
    PARCEL_UNITS_CACHE.parent.mkdir(parents=True, exist_ok=True)
    out.to_parquet(PARCEL_UNITS_CACHE, index=False)
    return out


def read_assessments() -> pd.DataFrame:
    return pd.read_csv(pm.ASSESSMENTS_CSV, usecols=["PARID", "CLASSDESC", "USEDESC", "LOTAREA"], dtype=str, low_memory=False)


def pin_map(units: pd.DataFrame, level: str) -> pd.Series:
    """PIN -> geoid for one level ('city' and 'county' map to their single GEOID)."""
    if level == "county":
        return pd.Series(gl.county()["GEOID"].iloc[0], index=units["PIN"])
    if level == "city":
        s = units[units["in_city"]]
        return pd.Series(city_geoid(), index=s["PIN"])
    s = units[units[level].notna()]
    return pd.Series(s[level].astype(str).to_numpy(), index=s["PIN"])


def land_table(assess: pd.DataFrame, pin_geoid: pd.Series) -> pd.DataFrame:
    """Per unit: the five land-use shares, vacant lots and parcels (the classifier and fallback of place_measures)."""
    m = pm.land_use_measures(assess, pin_geoid)
    out = pd.DataFrame(index=m.index)
    for vid, cls in SHARE_CLASSES.items():
        out[vid] = m[f"lu_{cls}"]
    out["vacant_lots"] = m["lu_vacant_lots"]
    out["parcels"] = m["lu_parcels"]
    out.index.name = "GEOID"
    return out


def group_zoning(shares: pd.DataFrame) -> pd.DataFrame:
    """Family shares (columns zoning_<family>) summed into the seven zoning variables."""
    out = pd.DataFrame(index=shares.index)
    for v in CATALOGUE:
        if v.group != "zoning":
            continue
        cols = [f"zoning_{f}" for f in v.families if f"zoning_{f}" in shares.columns]
        out[v.id] = shares[cols].sum(axis=1) if cols else 0.0
    out.index.name = "GEOID"
    return out


def zoning_table(level: str, zoning: gpd.GeoDataFrame, rules: dict) -> pd.DataFrame:
    units = gl.units(level, "city")
    return group_zoning(pm.zoning_shares(units, zoning, rules))


def round_table(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    for v in CATALOGUE:
        if v.id not in out.columns:
            continue
        col = pd.to_numeric(out[v.id], errors="coerce").astype("float64")
        out[v.id] = col.round(4) if v.unit == "share" else col.round(0).astype("Int64")
    return out


# ------------------------------------------------------------------------------------------ bundles
def _num(v):
    if v is None or v is pd.NA:
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    if math.isnan(f):
        return None
    return int(f) if f.is_integer() and abs(f) > 1 else f


def catalogue_entries(start_sort: int) -> tuple[list[dict], list[dict]]:
    groups = [{"id": GROUP_LAND[0], "label": GROUP_LAND[1]}, {"id": GROUP_ZONING[0], "label": GROUP_ZONING[1]}]
    variables = [
        {"id": v.id, "label": v.label, "group": v.group, "unit": v.unit, "kind": "share" if v.unit == "share" else "sum",
         "num": [], "den": None, "table_id": "", "description": v.description, "sort": start_sort + i, "source": SOURCES[v.group]}
        for i, v in enumerate(CATALOGUE)
    ]
    return groups, variables


def merge_catalogue(cat: dict) -> dict:
    """The ACS catalogue with the land and zoning groups and variables appended (any earlier copy replaced)."""
    ours = {g for g, _ in (GROUP_LAND, GROUP_ZONING)}
    base_groups = [g for g in cat.get("groups", []) if g["id"] not in ours]
    base_vars = [v for v in cat.get("variables", []) if v["id"] not in IDS]
    start = max([v.get("sort", 0) for v in base_vars], default=-1) + 1
    groups, variables = catalogue_entries(start)
    return {**cat, "groups": base_groups + groups, "variables": base_vars + variables}


def merge_values(values: dict, table: pd.DataFrame | None) -> dict:
    """`{geoid: {var: [est, moe, cv]}}` with the land and zoning triples set for every geoid already in the file."""
    out = {}
    for geoid, rec in values.items():
        rec = {k: v for k, v in rec.items() if k not in IDS}
        row = table.loc[geoid] if table is not None and geoid in table.index else None
        for vid in IDS:
            est = _num(row[vid]) if row is not None and vid in row.index else None
            rec[vid] = [est, None, None]
        out[geoid] = rec
    return out


def load_tables() -> dict[str, pd.DataFrame]:
    return {lv: pd.read_csv(land_csv(lv), dtype={"GEOID": str}).set_index("GEOID") for lv in LAND_LEVELS if land_csv(lv).exists()}


def merge_into_bundles(tables: dict[str, pd.DataFrame] | None = None) -> list[str]:
    """Write the land and zoning variables into the catalogue (processed + app) and the bundled value files.
    Idempotent. Returns the files touched."""
    tables = tables if tables is not None else load_tables()
    if not tables:
        return []
    touched = []
    for path in (PROCESSED / "acs_variables.json", APP_DATA / "acs_variables.json"):
        if path.exists():
            path.write_text(json.dumps(merge_catalogue(json.loads(path.read_text())), separators=(",", ":"), ensure_ascii=False))
            touched.append(str(path))
    for level in LAND_LEVELS:
        path = APP_DATA / f"acs_{level}.json"
        if not path.exists():
            continue
        merged = merge_values(json.loads(path.read_text()), tables.get(level))
        path.write_text(json.dumps(merged, separators=(",", ":"), ensure_ascii=False))
        touched.append(str(path))
    return touched


def long_rows(level: str, table: pd.DataFrame) -> list[dict]:
    """acs_values rows (`level, geoid, var, est, moe, cv`) for every land and zoning value that exists."""
    rows = []
    for geoid, r in table.iterrows():
        for vid in IDS:
            if vid not in table.columns:
                continue
            est = _num(r[vid])
            if est is None:
                continue
            rows.append({"level": level, "geoid": str(geoid), "var": vid, "est": est, "moe": None, "cv": None})
    return rows


def city_geoid() -> str:
    return str(gl.city()["GEOID"].iloc[0])


def coverage(tables: dict[str, pd.DataFrame]) -> dict[str, dict[str, int]]:
    return {lv: {"units": len(t), "with_land": int(t["parcels"].fillna(0).gt(0).sum()),
                 "with_zoning": int(t[ZONING_IDS].notna().any(axis=1).sum()) if set(ZONING_IDS) <= set(t.columns) else 0}
            for lv, t in tables.items()}


__all__ = ["CATALOGUE", "IDS", "LAND_IDS", "ZONING_IDS", "LAND_LEVELS", "ZONING_LEVELS", "parcel_units", "read_assessments", "pin_map",
           "land_table", "group_zoning", "zoning_table", "round_table", "merge_catalogue", "merge_values", "merge_into_bundles",
           "long_rows", "land_csv", "coverage", "city_geoid"]
