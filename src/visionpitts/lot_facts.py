"""Lot facts for the Place page's Parcel level: for every city lot, its zoning district, its area, a rough frontage and
depth, and the homes on it today, so a person who clicks a lot sees what the code allows there without typing anything.

  district   at the lot's representative point, from the WPRDC zoning map at full resolution (as zoning_capacity);
  area       the assessment's LOTAREA, else the shape's own area;
  frontage   and depth: the short and long sides of the lot's minimum rotated rectangle, scaled to its area
             (zoning_capacity.lot_dims), a rough reading of an irregular lot;
  existing   homes on the lot today, from the assessed use (single family 1 … four family 4), else unknown.

The lots are the By parcel view's (parcel_shadow.load_lots): the same shapes, the same county lot label, and the same
chunks (the z13 web map tile holding the lot's representative point, parcel_shadow.tile_xy), so the app finds a lot's
facts next to its shape. Written to app/public/data/parcel-lots/<x>_<y>.json, keyed by lot label.

Lot facts only (Ye, 2026-10-27): no parcel ID, owner, address, value or sale leaves this module.
"""
from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import pandas as pd

from visionpitts import parcel_shadow as ps
from visionpitts import place_measures as pm
from visionpitts import zoning_capacity as zc
from visionpitts.config import CRS_PA_SOUTH, ROOT

DEST = ROOT / "app" / "public" / "data" / "parcel-lots"
GRID_Z = 13          # the By parcel files' grid (app/public/data/parcel-shadow/manifest.json "grid.z")
FIELDS = ["district", "sqft", "frontage_ft", "depth_ft", "existing_homes"]


def facts(lots: pd.DataFrame, lotarea: pd.Series, usedesc: pd.Series, district: pd.Series) -> pd.DataFrame:
    """One row per lot with a label: lot, district (or None), sqft, frontage_ft, depth_ft, existing_homes (or None),
    and the chunk (tx, ty). `lots` has pin, lot and geometry (State Plane feet); the series are indexed like `lots`."""
    have = lots["lot"].fillna("").str.strip() != ""
    lots = lots[have]
    area = pd.to_numeric(lotarea.reindex(lots.index), errors="coerce")
    sqft = area.where(area > 0, lots.geometry.area)
    dims = [zc.lot_dims(g, a) if a and a > 0 else (np.nan, np.nan) for g, a in zip(lots.geometry, sqft)]
    wgs = lots.geometry.to_crs("EPSG:4326")
    points = wgs.representative_point()
    tx, ty = ps.tile_xy(points.x.to_numpy(), points.y.to_numpy(), GRID_Z)
    use = usedesc.reindex(lots.index).fillna("").str.upper().str.strip()
    out = pd.DataFrame(
        {
            "lot": lots["lot"].str.strip().to_numpy(),
            "district": [d if isinstance(d, str) else None for d in district.reindex(lots.index)],
            "sqft": np.rint(sqft.to_numpy()).astype(int),
            "frontage_ft": [round(f) if f == f else None for f, _ in dims],
            "depth_ft": [round(d) if d == d else None for _, d in dims],
            "existing_homes": use.map(zc.EXISTING_HOMES).to_numpy(),
            "tx": tx,
            "ty": ty,
        }
    )
    # A lot drawn as more than one shape keeps its largest shape's reading.
    return out.sort_values("sqft", ascending=False, kind="stable").drop_duplicates(["tx", "ty", "lot"]).reset_index(drop=True)


def chunk_json(rows: pd.DataFrame) -> dict:
    """One chunk's file: district codes listed once, then each lot as [code index or -1, sqft, frontage, depth,
    existing homes or -1]; frontage and depth are -1 when unknown."""
    codes = sorted({d for d in rows["district"] if isinstance(d, str)})
    at = {c: i for i, c in enumerate(codes)}
    lots = {}
    for r in rows.itertuples(index=False):
        lots[r.lot] = [
            at.get(r.district, -1) if isinstance(r.district, str) else -1,
            int(r.sqft),
            int(r.frontage_ft) if r.frontage_ft is not None and r.frontage_ft == r.frontage_ft else -1,
            int(r.depth_ft) if r.depth_ft is not None and r.depth_ft == r.depth_ft else -1,
            int(r.existing_homes) if r.existing_homes == r.existing_homes and r.existing_homes is not None else -1,
        ]
    return {"codes": codes, "lots": lots}


def write(rows: pd.DataFrame, dest: Path = DEST) -> dict:
    """Replace the files in `dest`: <x>_<y>.json per chunk and manifest.json. Returns the manifest."""
    dest = Path(dest)
    dest.mkdir(parents=True, exist_ok=True)
    for old in dest.glob("*.json"):
        old.unlink()
    tiles, total = [], 0
    for (x, y), part in rows.groupby(["tx", "ty"], sort=True):
        total += (dest / f"{x}_{y}.json").write_text(json.dumps(chunk_json(part), separators=(",", ":")))
        tiles.append([int(x), int(y), int(len(part))])
    manifest = {
        "version": 1,
        "built": datetime.now(UTC).strftime("%Y-%m-%d"),
        "source": "Allegheny County parcel boundaries and property assessments (WPRDC, 2026-09); City of Pittsburgh zoning districts (WPRDC)",
        "grid": {"z": GRID_Z},
        "fields": FIELDS,
        "path": "{x}_{y}.json",
        "tiles": tiles,
        "lots": int(len(rows)),
        "bytes": total,
        "note": "Lot facts only: no parcel ID, owner, address, value or sale. Frontage and depth are a rough reading of the lot's shape.",
    }
    (dest / "manifest.json").write_text(json.dumps(manifest, separators=(",", ":")))
    return manifest


def build(log=print) -> pd.DataFrame:
    """Read the lots, their assessment area and use, and their district; return the fact rows."""
    import geopandas as gpd

    lots = ps.load_lots(log=log)  # pin, lot, geoid, use, sqft, geometry (EPSG:2272)
    a = pd.read_csv(pm.ASSESSMENTS_CSV, usecols=["PARID", "USEDESC", "LOTAREA"], dtype=str, low_memory=False).drop_duplicates("PARID").set_index("PARID")
    lotarea = lots["pin"].map(a["LOTAREA"])
    usedesc = lots["pin"].map(a["USEDESC"])
    pts = gpd.GeoDataFrame(geometry=lots.geometry.representative_point(), crs=lots.crs).to_crs(CRS_PA_SOUTH)
    zoning = pm.zoning_download().to_crs(CRS_PA_SOUTH)[["zon_new", "geometry"]]
    j = gpd.sjoin(pts, zoning, how="left", predicate="within")
    district = j[~j.index.duplicated(keep="first")]["zon_new"].reindex(lots.index)
    rows = facts(lots, lotarea, usedesc, district)
    log(f"lot facts: {len(rows):,} labelled lots; with a district {rows['district'].notna().sum():,}; "
        f"with homes today {pd.notna(rows['existing_homes']).sum():,}; chunks {rows.groupby(['tx', 'ty']).ngroups}")
    return rows
