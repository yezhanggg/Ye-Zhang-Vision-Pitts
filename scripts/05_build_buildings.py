"""Step 5: 3D buildings for the demo tracts. Overture footprints with heights from Overture or county assessment stories.

Height source per building (`src`), first available wins:
  overture_height      Overture `height` (m)
  assessment_stories   largest building on its parcel: Allegheny County assessment STORIES x 3.3 m + 1.5 m
  accessory            a smaller building on a parcel with a record (shed, garage): 3 m
  overture_floors      Overture `num_floors` x 3.3 m
  default              6 m (drawn faded in the app)
Only PARID, STORIES and YEARBLT are read from the assessment file; no owner or sale fields.

Run: uv run python scripts/05_build_buildings.py   (after 01_build_tracts.py; needs network for Overture)
Writes app/src/data/buildings.json and data/processed/buildings_meta.json.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

import json
import subprocess

import geopandas as gpd
import numpy as np
import pandas as pd
import pyogrio

from visionpitts.config import APP_DATA, CRS_PA_SOUTH, CRS_WGS84, INTERIM, PROCESSED, RAW

OVERTURE_DIR = RAW / "overture"
PARCELS = RAW / "parcels" / "alleghenycounty_parcels202609.geojson"
ASSESSMENTS = RAW / "parcels" / "assessments.csv"
FLOOR_M = 3.3
GROUND_M = 1.5
ACCESSORY_M = 3.0
DEFAULT_M = 6.0
ACCESSORY_MAX_M2 = 40.0
SQFT_PER_M2 = 10.7639


def download_all(jobs: list[tuple[str, tuple[float, float, float, float]]]) -> dict[str, Path]:
    """Download Overture buildings for each bbox in parallel. The STAC index misses small boxes, so read S3 directly."""
    OVERTURE_DIR.mkdir(parents=True, exist_ok=True)
    procs: dict[str, subprocess.Popen] = {}
    out: dict[str, Path] = {}
    for geoid, (w, s, e, n) in jobs:
        path = OVERTURE_DIR / f"buildings_{geoid}.parquet"
        out[geoid] = path
        if path.exists() and path.stat().st_size > 0:
            continue
        cmd = ["uvx", "overturemaps", "download", f"--bbox={w:.5f},{s:.5f},{e:.5f},{n:.5f}", "-f", "geoparquet", "--type=building", "--no-stac", "-o", str(path)]
        print("  ", " ".join(cmd[2:6]))
        procs[geoid] = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
    for geoid, pr in procs.items():
        _, err = pr.communicate()
        if pr.returncode != 0 or not out[geoid].exists():
            raise RuntimeError(f"overture download failed for {geoid}: {err[-400:]}")
        print(f"   {geoid}: {out[geoid].stat().st_size / 1e6:.1f} MB")
    return out


def load_buildings(focus: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    pad = 0.002  # ~200 m so edge buildings are not cut off
    jobs = [(r["GEOID"], (r.geometry.bounds[0] - pad, r.geometry.bounds[1] - pad, r.geometry.bounds[2] + pad, r.geometry.bounds[3] + pad)) for _, r in focus.iterrows()]
    paths = download_all(jobs)
    parts = [gpd.read_parquet(p) for p in paths.values()]
    b = pd.concat(parts, ignore_index=True)
    b = gpd.GeoDataFrame(b, geometry="geometry", crs=CRS_WGS84).drop_duplicates("id")
    pts = gpd.GeoDataFrame(b[["id"]], geometry=b.representative_point(), crs=CRS_WGS84)
    j = gpd.sjoin(pts, focus[["GEOID", "geometry"]], how="inner", predicate="within").drop_duplicates("id")
    b = b.merge(j[["id", "GEOID"]], on="id", how="inner")
    keep = [c for c in ("id", "GEOID", "height", "num_floors", "geometry") if c in b.columns]
    return gpd.GeoDataFrame(b[keep], geometry="geometry", crs=CRS_WGS84)


def parcel_records(b: gpd.GeoDataFrame) -> pd.DataFrame:
    """PARID, STORIES and YEARBLT for each building (NaN when no parcel or record)."""
    info = pyogrio.read_info(PARCELS)
    crs = info.get("crs") or CRS_PA_SOUTH
    bounds = tuple(b.to_crs(crs).total_bounds)
    parcels = pyogrio.read_dataframe(PARCELS, bbox=bounds, columns=["PIN"])
    if parcels.crs is None:
        parcels = parcels.set_crs(crs)
    parcels = parcels.to_crs(CRS_PA_SOUTH)
    pts = gpd.GeoDataFrame(b[["id"]], geometry=b.to_crs(CRS_PA_SOUTH).representative_point(), crs=CRS_PA_SOUTH)
    j = gpd.sjoin(pts, parcels[["PIN", "geometry"]], how="left", predicate="within").drop_duplicates("id").set_index("id")
    a = pd.read_csv(ASSESSMENTS, usecols=["PARID", "STORIES", "YEARBLT"], dtype={"PARID": str}, low_memory=False).drop_duplicates("PARID").set_index("PARID")
    out = pd.DataFrame({"PARID": j["PIN"].reindex(b["id"]).values}, index=b.index)
    out = out.join(a, on="PARID")
    out["STORIES"] = pd.to_numeric(out["STORIES"], errors="coerce")
    out["YEARBLT"] = pd.to_numeric(out["YEARBLT"], errors="coerce")
    print(f"  parcels read: {len(parcels):,}; buildings on a parcel: {out['PARID'].notna().mean():.1%}; with STORIES: {(out['STORIES'] > 0).mean():.1%}")
    return out


def heights(b: gpd.GeoDataFrame, rec: pd.DataFrame) -> gpd.GeoDataFrame:
    h_ov = pd.to_numeric(b.get("height"), errors="coerce") if "height" in b else pd.Series(np.nan, index=b.index)
    floors = pd.to_numeric(b.get("num_floors"), errors="coerce") if "num_floors" in b else pd.Series(np.nan, index=b.index)
    area_m2 = b.to_crs(CRS_PA_SOUTH).area / SQFT_PER_M2
    has_parcel = rec["PARID"].notna()
    largest = has_parcel & (area_m2 == area_m2.groupby(rec["PARID"]).transform("max"))
    stories = rec["STORIES"].where(rec["STORIES"] > 0)
    h = pd.Series(DEFAULT_M, index=b.index)
    src = pd.Series("default", index=b.index)
    for mask, name, val in [
        (floors > 0, "overture_floors", floors * FLOOR_M),
        (has_parcel & ~largest & (area_m2 < ACCESSORY_MAX_M2), "accessory", pd.Series(ACCESSORY_M, index=b.index)),
        (largest & stories.notna(), "assessment_stories", stories * FLOOR_M + GROUND_M),
        (h_ov > 0, "overture_height", h_ov),
    ]:  # later rows win
        m = mask.fillna(False)
        h = h.where(~m, val)
        src = src.where(~m, name)
    out = b.copy()
    out["h"] = h.round(1)
    out["src"] = src
    out["yb"] = rec["YEARBLT"].where(rec["YEARBLT"] > 1600)
    return out


def _round(c, nd=5):
    if isinstance(c, (int, float)):
        return round(c, nd)
    return [_round(x, nd) for x in c]


def main() -> None:
    tracts = gpd.read_parquet(INTERIM / "tracts_city.parquet")
    focus_ids = [f["geoid"] for f in json.loads((INTERIM / "focus.json").read_text())]
    focus = tracts[tracts["GEOID"].isin(focus_ids)].to_crs(CRS_WGS84)
    print(f"buildings for {len(focus)} demo tracts")
    b = load_buildings(focus)
    print(f"  {len(b):,} Overture footprints inside the demo tracts")
    b = heights(b, parcel_records(b))
    share = b["src"].value_counts(normalize=True).round(4).to_dict()
    print("  height sources:", share)
    g = b.to_crs(CRS_PA_SOUTH)
    g["geometry"] = g.geometry.simplify(1.5, preserve_topology=True)  # ~0.5 m
    g = g.to_crs(CRS_WGS84)
    feats = []
    for _, r in g.iterrows():
        geom = json.loads(gpd.GeoSeries([r.geometry], crs=CRS_WGS84).to_json())["features"][0]["geometry"]
        geom["coordinates"] = _round(geom["coordinates"])
        props = {"h": float(r["h"]), "src": r["src"], "GEOID": r["GEOID"]}
        if pd.notna(r["yb"]):
            props["yb"] = int(r["yb"])
        feats.append({"type": "Feature", "properties": props, "geometry": geom})
    fc = {"type": "FeatureCollection", "features": feats}
    (APP_DATA / "buildings.json").write_text(json.dumps(fc, separators=(",", ":")))
    meta = {"n_buildings": len(feats), "height_source_share": share, "per_tract": b.groupby("GEOID").size().to_dict()}
    (PROCESSED / "buildings_meta.json").write_text(json.dumps(meta, indent=1))
    print(f"  wrote app/src/data/buildings.json ({(APP_DATA / 'buildings.json').stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
