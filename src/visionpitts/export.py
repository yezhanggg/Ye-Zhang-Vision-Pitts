"""Write the deliverables: data/processed/tracts.geojson (+csv) and the JSON the app loads from app/public/data."""
from __future__ import annotations

import json
import math
from datetime import UTC, datetime

import geopandas as gpd
import numpy as np
import pandas as pd

from visionpitts import sources
from visionpitts.asking_rents import APP_FIELDS as ASKING_RENTS
from visionpitts.config import APP_DATA, CRS_PA_SOUTH, CRS_WGS84, INTERIM, PROCESSED, load_scoring

CONTEXT = ["pop", "households", "med_hh_income", "med_hh_income_cv", "med_gross_rent", "med_gross_rent_cv", "med_home_value",
           "renter_hh", "renter_share", "rent_burdened_share", "vacancy_share"]
RAW_FIELDS = ["need_count", "need_count_cv", "mva21", "mva16", "mva21_score", "mva16_score", "mva_change", "mva_raw",
              "svi_overall", "svi_t1", "svi_t2", "svi_t3", "svi_t4", "chas_burden_le50_share", "eviction_filing_rate", "eviction_filings_est", "eviction_coverage", "eviction_zips",
              "hcv_count", "hcv_per_renter", "displacement_n", "qct", "dda", "oz", "cdbg", "zcta",
              "transit_departures", "transit_departures_per_acre", "flood_share_pct", "flood_deep_share_pct", "veg_cover_land_pct"]
PRESSURE = ["n_neighbors", "market_lag", "market_pressure", "market_pressure_pct", "need_tercile", "market_direction",
            "bivariate_class", "watch_list"]
# ASKING_RENTS (asking_rents.APP_FIELDS): an information layer joined from data/processed/asking_rents.csv when present.
INT_FIELDS = {"pop", "households", "med_hh_income", "med_gross_rent", "med_home_value", "renter_hh", "need_count", "hcv_count",
              "transit_departures", "rent_2br_2025_26", "n_units_2025_26"}
ASKING_RENTS_CSV = PROCESSED / "asking_rents.csv"


def clean(v, nd: int = 4):
    if v is None:
        return None
    if isinstance(v, (np.bool_, bool)):
        return bool(v)
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (float, np.floating)):
        return None if math.isnan(v) or math.isinf(v) else round(float(v), nd)
    if isinstance(v, str):
        return v
    if pd.isna(v):
        return None
    return v


def properties(df: pd.DataFrame, cfg: dict, focus: dict[str, str]) -> dict[str, dict]:
    fids = [f["id"] for f in cfg["factors"]]
    cols = ["name", "neighborhood", "residential", "pgh_share", *fids, *[f"{f}_conf" for f in fids], *RAW_FIELDS, *PRESSURE, *CONTEXT,
            *ASKING_RENTS]
    cols = [c for c in cols if c in df.columns]
    out = {}
    for geoid, r in df[cols].iterrows():
        p = {"GEOID": geoid, "focus": focus.get(geoid)}
        for c in cols:
            p[c] = clean(r[c], 0 if c in INT_FIELDS else 4)
        out[geoid] = p
    return out


def with_asking_rents(df: pd.DataFrame) -> pd.DataFrame:
    """Left-join the asking-rent information fields (scripts/06) onto the wide table; a no-op when the CSV is absent."""
    if not ASKING_RENTS_CSV.exists():
        return df
    a = pd.read_csv(ASKING_RENTS_CSV, dtype={"GEOID": str, "rent_2br_gt_fmr": "boolean", "asking_rents_conf": "string"})
    a = a.set_index("GEOID")[ASKING_RENTS]
    return df.drop(columns=[c for c in ASKING_RENTS if c in df.columns]).join(a, how="left")


def to_geojson(tracts: gpd.GeoDataFrame, props: dict[str, dict], tolerance_m: float = 5.0) -> dict:
    g = tracts[["GEOID", "geometry"]].to_crs(CRS_PA_SOUTH)
    g["geometry"] = g.geometry.simplify(tolerance_m * 3.280839895, preserve_topology=True)
    g = g.to_crs(CRS_WGS84)
    feats = []
    for _, r in g.iterrows():
        geom = json.loads(gpd.GeoSeries([r.geometry], crs=CRS_WGS84).to_json())["features"][0]["geometry"]
        geom["coordinates"] = _round(geom["coordinates"])
        feats.append({"type": "Feature", "properties": props[r["GEOID"]], "geometry": geom})
    return {"type": "FeatureCollection", "features": feats}


def _round(c, nd: int = 5):
    if isinstance(c, (int, float)):
        return round(c, nd)
    return [_round(x, nd) for x in c]


def neighborhoods_geojson(nbhd: gpd.GeoDataFrame, tracts: gpd.GeoDataFrame) -> dict:
    n = nbhd.to_crs(CRS_PA_SOUTH)
    n["geometry"] = n.geometry.simplify(10 * 3.280839895, preserve_topology=True)
    n = n.to_crs(CRS_WGS84)
    t = tracts[["GEOID", "geometry"]].to_crs(CRS_PA_SOUTH)
    feats = []
    for _, r in n.iterrows():
        poly = gpd.GeoSeries([r.geometry], crs=CRS_WGS84).to_crs(CRS_PA_SOUTH).iloc[0]
        a = t.geometry.intersection(poly).area
        best = t.loc[a.idxmax(), "GEOID"] if a.max() > 0 else None
        c = poly.representative_point()
        cw = gpd.GeoSeries([c], crs=CRS_PA_SOUTH).to_crs(CRS_WGS84).iloc[0]
        geom = json.loads(gpd.GeoSeries([r.geometry], crs=CRS_WGS84).to_json())["features"][0]["geometry"]
        geom["coordinates"] = _round(geom["coordinates"], 4)
        feats.append({"type": "Feature", "properties": {"name": r["name"], "tract": best, "c": [round(cw.x, 5), round(cw.y, 5)]}, "geometry": geom})
    return {"type": "FeatureCollection", "features": feats}


def meta(df: pd.DataFrame, cfg: dict) -> dict:
    fids = [f["id"] for f in cfg["factors"]]
    med = {c: clean(df[c].median(), 4) for c in CONTEXT + ["need_count", "flood_share_pct", "transit_departures_per_acre"] if c in df}
    return {
        "built_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "scope": cfg["scope"],
        "n_tracts": len(df),
        "n_residential": int(df["residential"].sum()) if "residential" in df else None,
        "scoring_version": cfg["version"],
        "city_medians": med,
        "factor_coverage": {f: int(df[f].notna().sum()) for f in fids},
        "confidence_counts": {f: df[f"{f}_conf"].value_counts(dropna=False).rename(lambda k: str(k)).to_dict() for f in fids},
        "watch_list_count": int(df["watch_list"].sum()) if "watch_list" in df else None,
        "displacement_parts": df["displacement_n"].value_counts().rename(lambda k: str(int(k))).to_dict() if "displacement_n" in df else None,
        "asking_rents": {
            "n_with_rent_2025_26": int(df["rent_2br_2025_26"].notna().sum()),
            "n_with_growth_existing": int(df["rent_2br_growth_existing"].notna().sum()),
            "n_with_growth_all": int(df["rent_2br_growth_all"].notna().sum()),
            "n_above_fmr": int(df["rent_2br_gt_fmr"].fillna(False).astype(bool).sum()),
            "confidence_counts": df["asking_rents_conf"].value_counts(dropna=False).rename(lambda k: str(k)).to_dict(),
        } if "rent_2br_2025_26" in df else None,
    }


def write_all(tracts: gpd.GeoDataFrame, df: pd.DataFrame, cfg: dict, focus: list[dict], flips: pd.DataFrame, nbhd: gpd.GeoDataFrame) -> None:
    df = with_asking_rents(df)
    focus_map = {f["geoid"]: f["label"] for f in focus}
    props = properties(df, cfg, focus_map)
    gj = to_geojson(tracts, props)
    dump = lambda obj, path: path.write_text(json.dumps(obj, separators=(",", ":"), ensure_ascii=False))
    dump(gj, PROCESSED / "tracts.geojson")
    dump(gj, APP_DATA / "tracts.json")
    df.drop(columns=[c for c in ("geometry",) if c in df]).to_csv(PROCESSED / "tracts.csv", index_label="GEOID")
    dump(cfg, APP_DATA / "scoring.json")
    dump(sources.for_app(), APP_DATA / "sources.json")
    dump(focus, APP_DATA / "focus.json")
    dump(flips.to_dict(orient="records"), APP_DATA / "flips.json")
    dump(neighborhoods_geojson(nbhd, tracts), APP_DATA / "neighborhoods.json")
    dump(meta(df, cfg), APP_DATA / "meta.json")
    sources.write_md()
    sizes = {p.name: f"{p.stat().st_size / 1024:.0f} KB" for p in sorted(APP_DATA.glob('*'))}
    print("  app data:", sizes)


def write_from_interim() -> None:
    """Step 4 as one call: read the interim tables and write every deliverable (used by scripts 04 and 06)."""
    # local import: pressure pulls in libpysal, which the export itself never needs
    from visionpitts import geo, pressure

    cfg = load_scoring()
    t = gpd.read_parquet(INTERIM / "tracts_city.parquet")
    wide = pd.read_parquet(INTERIM / "wide_pressure.parquet")
    focus = json.loads((INTERIM / "focus.json").read_text())
    write_all(t, wide, cfg, focus, pressure.flip_list(wide, cfg), geo.neighborhoods())
