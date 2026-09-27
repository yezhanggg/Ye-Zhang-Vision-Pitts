"""Step 5: 3D buildings for the demo tracts. Overture footprints with heights from Overture or county assessment stories.

Height source per building (`src`), first available wins:
  overture_height      Overture `height` (m)
  assessment_stories   largest building on its parcel: Allegheny County assessment STORIES x 3.3 m + 1.5 m
  accessory            a smaller building on a parcel with a record (shed, garage): 3 m
  overture_floors      Overture `num_floors` x 3.3 m
  default              6 m (drawn faded in the app)
Only PARID, STORIES and YEARBLT are read from the assessment file; no owner or sale fields.

Run: uv run python scripts/05_build_buildings.py             (after 01_build_tracts.py; needs network for Overture unless cached)
     uv run python scripts/05_build_buildings.py --reencode  (no rebuild: rewrite the current app/src/data/buildings.json in the compact form)
Writes app/src/data/buildings.json and data/processed/buildings_meta.json.

Encoding of buildings.json (compact form v1, about a fifth of the GeoJSON size; the app decodes it at load in
app/src/lib/buildingsCodec.ts and hands the map an ordinary FeatureCollection):
  {"v": 1, "scale": 100000, "tracts": [GEOID, ...], "src": [height source, ...], "b": [[h, srcIdx, tractIdx, rings], ...]}
  h         height in metres, rounded to 0.1
  srcIdx    index into "src";  tractIdx  index into "tracts"
  rings     Polygon: a list of rings, outer ring first, then holes. Each ring is a flat list of integers
            [x0, y0, dx1, dy1, dx2, dy2, ...] where x = round(lng * scale), y = round(lat * scale) and every pair after
            the first is the step from the vertex before it. The closing vertex is left out; the decoder closes the ring.
            MultiPolygon: a list of such ring lists, one per part (one level deeper), so a building stays one entry.
  Entries keep the order of the features. Year built (`yb`) is not written because nothing in the app reads it.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

import argparse
import json
import subprocess
from collections import Counter

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
DECIMALS = 5
SCALE = 10**DECIMALS  # integer coordinate units per degree: a step of 1e-5 degrees is about 1.1 m north-south and 0.85 m east-west here
ENCODING_V = 1


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


# ------------------------------------------------------------------ compact encoding
def _q(v: float) -> int:
    # Round in decimal first: v * SCALE can land on a false tie (Overture coordinates often end in ...5 at the sixth decimal).
    return int(round(round(v, DECIMALS) * SCALE))


def _encode_ring(ring) -> list[int]:
    pts = [(_q(p[0]), _q(p[1])) for p in ring]
    # Leave out the closing vertex, unless the ring would still look closed without it (a repeated last vertex).
    if len(pts) > 2 and pts[0] == pts[-1] and pts[0] != pts[-2]:
        pts = pts[:-1]
    flat: list[int] = []
    px = py = 0
    for x, y in pts:
        flat += [x - px, y - py]
        px, py = x, y
    return flat


def _decode_ring(flat: list[int]) -> list[list[float]]:
    pts: list[list[float]] = []
    x = y = 0
    for k in range(0, len(flat) - 1, 2):
        x += flat[k]
        y += flat[k + 1]
        pts.append([x / SCALE, y / SCALE])
    if pts and pts[0] != pts[-1]:
        pts.append(list(pts[0]))
    return pts


def _parts(geom: dict | None) -> list | None:
    """Polygon parts of a GeoJSON geometry (a list of ring lists), or None when it is not a usable polygon."""
    if not geom:
        return None
    if geom.get("type") == "Polygon":
        parts = [geom.get("coordinates") or []]
    elif geom.get("type") == "MultiPolygon":
        parts = [p for p in (geom.get("coordinates") or []) if p]
    else:
        return None
    if not parts or any(not p or any(len(r) < 3 for r in p) for p in parts):
        return None
    return parts


def _height(h) -> float | int:
    h = round(float(h), 1)
    return int(h) if h == int(h) else h


def encode_compact(feats: list[dict]) -> tuple[dict, list[dict], list[str]]:
    """GeoJSON features -> (compact form, the features that were encoded, a reason for every feature left out)."""
    kept, skipped = [], []
    for k, f in enumerate(feats):
        p = f.get("properties") or {}
        if _parts(f.get("geometry")) is None:
            skipped.append(f"feature {k}: geometry is not a polygon with rings of 3 or more vertices")
        elif not isinstance(p.get("h"), (int, float)) or not np.isfinite(p["h"]) or not p.get("src") or not p.get("GEOID"):
            skipped.append(f"feature {k}: missing h, src or GEOID")
        else:
            kept.append(f)
    tracts = sorted({f["properties"]["GEOID"] for f in kept})
    srcs = [s for s, _ in sorted(Counter(f["properties"]["src"] for f in kept).items(), key=lambda kv: (-kv[1], kv[0]))]
    t_ix = {t: k for k, t in enumerate(tracts)}
    s_ix = {s: k for k, s in enumerate(srcs)}
    rows = []
    for f in kept:
        p = f["properties"]
        parts = [[_encode_ring(r) for r in part] for part in _parts(f["geometry"])]
        rows.append([_height(p["h"]), s_ix[p["src"]], t_ix[p["GEOID"]], parts[0] if f["geometry"]["type"] == "Polygon" else parts])
    return {"v": ENCODING_V, "scale": SCALE, "tracts": tracts, "src": srcs, "b": rows}, kept, skipped


def decode_compact(c: dict) -> list[dict]:
    """Compact form v1 -> GeoJSON features. The mirror of decodeBuildings() in app/src/lib/buildingsCodec.ts."""
    if c.get("v") != ENCODING_V or c.get("scale") != SCALE:
        raise ValueError(f"buildings.json: unknown encoding (v={c.get('v')}, scale={c.get('scale')})")
    feats = []
    for row in c["b"]:
        h, s, t, rings = row[:4]
        multi = bool(rings) and bool(rings[0]) and isinstance(rings[0][0], list)
        coords = [[_decode_ring(r) for r in part] for part in rings] if multi else [_decode_ring(r) for r in rings]
        props = {"h": float(h), "src": c["src"][s], "GEOID": c["tracts"][t]}
        feats.append({"type": "Feature", "properties": props, "geometry": {"type": "MultiPolygon" if multi else "Polygon", "coordinates": coords}})
    return feats


def check_round_trip(kept: list[dict], compact: dict) -> tuple[float, float, int]:
    """Decode what is about to be written and compare it with the input. Returns (max coordinate error in degrees, max height error in m, vertices)."""
    back = decode_compact(json.loads(json.dumps(compact)))
    if len(back) != len(kept):
        raise RuntimeError(f"round trip: {len(kept):,} features in, {len(back):,} out")
    worst_xy = worst_h = 0.0
    n_vert = 0
    for k, (a, b) in enumerate(zip(kept, back)):
        pa, pb = a["properties"], b["properties"]
        if pa["src"] != pb["src"] or pa["GEOID"] != pb["GEOID"] or a["geometry"]["type"] != b["geometry"]["type"]:
            raise RuntimeError(f"round trip: feature {k} changed src, GEOID or geometry type")
        worst_h = max(worst_h, abs(float(pa["h"]) - pb["h"]))
        parts_a, parts_b = _parts(a["geometry"]), _parts(b["geometry"])
        if [len(p) for p in parts_a] != [len(p) for p in parts_b]:
            raise RuntimeError(f"round trip: feature {k} changed its number of rings")
        for ra, rb in zip((r for p in parts_a for r in p), (r for p in parts_b for r in p)):
            ra = [list(v[:2]) for v in ra]
            if ra[0] != ra[-1]:
                ra.append(ra[0])  # an open ring comes back closed
            if len(ra) != len(rb):
                raise RuntimeError(f"round trip: feature {k} has a ring with {len(ra)} vertices in and {len(rb)} out")
            n_vert += len(rb)
            worst_xy = max(worst_xy, max(max(abs(u[0] - v[0]), abs(u[1] - v[1])) for u, v in zip(ra, rb)))
    if worst_xy > 0.5 / SCALE + 1e-9 or worst_h > 0.05 + 1e-9:
        raise RuntimeError(f"round trip: coordinate error {worst_xy:.2e} deg or height error {worst_h:.3f} m is over the limit")
    return worst_xy, worst_h, n_vert


def write_outputs(feats: list[dict], written_by: str) -> None:
    compact, kept, skipped = encode_compact(feats)
    worst_xy, worst_h, n_vert = check_round_trip(kept, compact)
    for line in skipped:
        print("  left out,", line)
    out = APP_DATA / "buildings.json"
    out.write_text(json.dumps(compact, separators=(",", ":")))
    n = len(kept)
    by_src = Counter(f["properties"]["src"] for f in kept)
    by_tract = Counter(f["properties"]["GEOID"] for f in kept)
    meta = {
        "n_buildings": n,
        "height_source_share": {s: round(c / n, 4) for s, c in sorted(by_src.items(), key=lambda kv: (-kv[1], kv[0]))} if n else {},
        "per_tract": {t: by_tract[t] for t in sorted(by_tract)},
        "encoding": {
            "format": "compact v1: delta-coded integer coordinates with index tables for tract and height source; decoded by app/src/lib/buildingsCodec.ts",
            "scale": SCALE,
            "coordinate_step_deg": 1 / SCALE,
            "height_step_m": 0.1,
            "n_vertices": n_vert,
            "bytes": out.stat().st_size,
            "max_coordinate_error_deg": round(worst_xy, 9),
            "max_height_error_m": round(worst_h, 3),
            "properties_not_written": ["yb"],
            "features_left_out": len(skipped),
            "written_by": written_by,
        },
    }
    (PROCESSED / "buildings_meta.json").write_text(json.dumps(meta, indent=1))
    print("  height sources:", meta["height_source_share"])
    print(f"  wrote app/src/data/buildings.json: {n:,} buildings, {n_vert:,} vertices, {out.stat().st_size:,} bytes ({out.stat().st_size / 1e6:.2f} MB)")
    print(f"  round trip: max coordinate error {worst_xy:.1e} deg, max height error {worst_h:.2f} m")


def reencode() -> None:
    """Rewrite the current buildings.json in the compact form without a rebuild (reads GeoJSON or the compact form)."""
    path = APP_DATA / "buildings.json"
    data = json.loads(path.read_text())
    before = path.stat().st_size
    if isinstance(data, dict) and data.get("type") == "FeatureCollection":
        feats = data["features"]
    elif isinstance(data, dict) and "b" in data:
        feats = decode_compact(data)
    else:
        raise SystemExit("app/src/data/buildings.json is neither a FeatureCollection nor the compact form")
    print(f"re-encoding {len(feats):,} buildings ({before:,} bytes)")
    write_outputs(feats, "--reencode of the existing file (no rebuild)")


def main() -> None:
    tracts = gpd.read_parquet(INTERIM / "tracts_city.parquet")
    focus_ids = [f["geoid"] for f in json.loads((INTERIM / "focus.json").read_text())]
    focus = tracts[tracts["GEOID"].isin(focus_ids)].to_crs(CRS_WGS84)
    print(f"buildings for {len(focus)} demo tracts")
    b = load_buildings(focus)
    print(f"  {len(b):,} Overture footprints inside the demo tracts")
    b = heights(b, parcel_records(b))
    g = b.to_crs(CRS_PA_SOUTH)
    g["geometry"] = g.geometry.simplify(1.5, preserve_topology=True)  # ~0.5 m
    g = g.to_crs(CRS_WGS84)
    feats = []
    for _, r in g.iterrows():
        geom = json.loads(gpd.GeoSeries([r.geometry], crs=CRS_WGS84).to_json())["features"][0]["geometry"]
        feats.append({"type": "Feature", "properties": {"h": float(r["h"]), "src": r["src"], "GEOID": r["GEOID"]}, "geometry": geom})
    write_outputs(feats, "full build")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="3D buildings for the demo tracts")
    ap.add_argument("--reencode", action="store_true", help="rewrite the current app/src/data/buildings.json in the compact form, without a rebuild")
    if ap.parse_args().reencode:
        reencode()
    else:
        main()
