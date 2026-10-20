"""Shadow by parcel: for every lot in the city, the share of the day it sits in shadow in each season.

The shadow run (shadow.py, scripts/13 and 14) leaves one bit per cell and half hour in web-map chunks. This module
lays the county's parcel shapes over those chunks: a cell belongs to a lot when its center is inside the lot, and for
every half hour the lot's shadowed cells are counted. From the counts, per lot and day:

  shade    of the lot's area across the whole day, the share in shadow (shadowed cell-steps / (cells x steps))
  sun_h    the same as average hours of direct sun: (1 - shade) x steps x step length
  mostly   the share of the day's steps when at least half the lot is in shadow
  profile  the share of the lot in shadow at each step

The lot is measured as seen from above (the surface is the first lidar return): roof, yard and tree tops together.
A lot with fewer than MIN_CELLS cells, or with under MIN_VALID_SHARE of its cells holding data, is not rated.
No GPU and no download: it reads a finished run. Display and analysis only; nothing here enters a score.
"""
from __future__ import annotations

import json
import math
from datetime import UTC, datetime
from itertools import pairwise
from pathlib import Path

import numpy as np

from . import shadow as sh

MIN_CELLS = 10            # about 360 sq ft at 6 ft cells; below this one cell is more than a tenth of the lot
MIN_VALID_SHARE = 0.5     # share of a lot's cells that must hold surface data
MIN_ZOOM = 14.5           # the map draws lots from this zoom
PROFILE_NODATA = 255      # in the profile bytes (0..100 = percent of the lot in shadow)
UNRECORDED = "unrecorded"  # a shape with no assessment record under its own ID (condo buildings, common ground)
POPCOUNT = np.array([i.bit_count() for i in range(256)], dtype=np.uint8)


# ---------------------------------------------------------------------------------------------------------------------
# The run's pixel grid


def load_run(src: Path) -> dict:
    """The manifest of a finished shadow run, with the few things this module relies on checked."""
    m = json.loads((Path(src) / "manifest.json").read_text())
    if m.get("version") != 1 or m.get("bitsPerPage") != sh.BITS:
        raise ValueError(f"{src}: not a shadow run this code reads (version {m.get('version')}, {m.get('bitsPerPage')} bits per page)")
    return m


def resolution(manifest: dict) -> float:
    """Web Mercator meters per pixel of the run's chunk pages."""
    return 2 * sh.MERC / ((1 << manifest["grid"]["z"]) * manifest["grid"]["px"])


def day_offsets(manifest: dict) -> list[int]:
    """Where each day's steps start in a row of all steps."""
    out, at = [], 0
    for d in manifest["days"]:
        out.append(at)
        at += len(d["steps"])
    return out


def total_steps(manifest: dict) -> int:
    return sum(len(d["steps"]) for d in manifest["days"])


def lot_cells(geoms: np.ndarray, res: float, batch: int = 4_000_000) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """For shapes in Web Mercator: (lot index, column, row) of every pixel whose center is inside a shape.

    Columns and rows count pixels across the whole world map at the run's resolution (column 0 at the left edge, row
    0 at the top), so chunk (x, y) holds columns x * px .. and rows y * px ..; the centers are the ones
    shadow.sample_index samples. A lot's bounding box is tested pixel by pixel, in batches of about `batch` tests.
    """
    import shapely

    geoms = np.asarray(geoms, dtype=object)
    shapely.prepare(geoms)
    b = shapely.bounds(geoms)
    c0 = np.ceil((b[:, 0] + sh.MERC) / res - 0.5).astype(np.int64)
    c1 = np.floor((b[:, 2] + sh.MERC) / res - 0.5).astype(np.int64)
    r0 = np.ceil((sh.MERC - b[:, 3]) / res - 0.5).astype(np.int64)
    r1 = np.floor((sh.MERC - b[:, 1]) / res - 0.5).astype(np.int64)
    w = np.maximum(c1 - c0 + 1, 0)
    n = w * np.maximum(r1 - r0 + 1, 0)
    lots, cols, rows = [], [], []
    start = 0
    while start < len(geoms):
        end = start + 1
        size = int(n[start])
        while end < len(geoms) and size + int(n[end]) <= batch:
            size += int(n[end])
            end += 1
        if size:
            idx = np.repeat(np.arange(start, end), n[start:end])
            first = np.repeat(np.cumsum(n[start:end]) - n[start:end], n[start:end])
            k = np.arange(size) - first
            col = c0[idx] + k % w[idx]
            row = r0[idx] + k // w[idx]
            inside = shapely.contains_xy(geoms[idx], -sh.MERC + (col + 0.5) * res, sh.MERC - (row + 0.5) * res)
            lots.append(idx[inside].astype(np.int32))
            cols.append(col[inside].astype(np.int32))
            rows.append(row[inside].astype(np.int32))
        start = end
    if not lots:
        return np.zeros(0, np.int32), np.zeros(0, np.int32), np.zeros(0, np.int32)
    return np.concatenate(lots), np.concatenate(cols), np.concatenate(rows)


# ---------------------------------------------------------------------------------------------------------------------
# Counting


def read_chunk(src: Path, manifest: dict, day: dict, x: int, y: int) -> tuple[np.ndarray, np.ndarray]:
    """One chunk of one day: (shadow pages as (pages, px, px), sunlit-step counts with 255 where there is no data).

    Checked cell by cell before it is returned: where there is data, shadowed steps and sunlit steps add up to the
    day's steps; where there is none, no shadow bit is set. A page that fails is not counted from.
    """
    src = Path(src)
    paths = manifest["paths"]
    hours = sh.read_png_gray((src / paths["hours"].format(day=day["id"], x=x, y=y)).read_bytes())
    pages = np.stack([sh.read_png_gray((src / paths["page"].format(day=day["id"], x=x, y=y, p=p)).read_bytes()) for p in range(day["pages"])])
    valid = hours != manifest["hoursNoData"]
    shadowed = POPCOUNT[pages].sum(axis=0, dtype=np.int32)
    wrong = np.where(valid, shadowed + hours != len(day["steps"]), shadowed != 0)
    if wrong.any():
        raise ValueError(f"chunk {x}_{y} on {day['id']}: {int(wrong.sum()):,} cells where shadow bits and sunlit steps do not add up "
                         "(lots are counted from a run as it was cast, not from a reduced copy)")
    return pages, hours


def count(src: Path, manifest: dict, lot: np.ndarray, col: np.ndarray, row: np.ndarray, n_lots: int, log=print) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """(shaded, cells, touched): per lot, the shadowed cells at every step of every day (days side by side), the cells
    with data, and all the cells whose center is inside the lot (with or without data, inside the run or not)."""
    px = manifest["grid"]["px"]
    chunks = {(int(x), int(y)) for x, y in manifest["chunks"]}
    offsets = day_offsets(manifest)
    shaded = np.zeros((n_lots, total_steps(manifest)), dtype=np.int32)
    cells = np.zeros(n_lots, dtype=np.int64)
    touched = np.bincount(lot, minlength=n_lots).astype(np.int64)
    cx, cy = col // px, row // px
    key = cx.astype(np.int64) * (1 << 32) + cy
    order = np.argsort(key, kind="stable")
    edges = np.flatnonzero(np.diff(key[order])) + 1
    for part in np.split(order, edges):
        if not len(part):
            continue
        x, y = int(cx[part[0]]), int(cy[part[0]])
        if (x, y) not in chunks:
            continue
        flat = (row[part] % px).astype(np.int64) * px + col[part] % px
        ids = lot[part]
        valid = None
        for d, day in enumerate(manifest["days"]):
            pages, hours = read_chunk(src, manifest, day, x, y)
            ok = hours.ravel()[flat] != manifest["hoursNoData"]
            if valid is None:
                valid = ok
                cells += np.bincount(ids[valid], minlength=n_lots)
            elif not np.array_equal(ok, valid):
                raise ValueError(f"chunk {x}_{y}: {day['id']} has data in different cells than {manifest['days'][0]['id']}")
            got, here = ids[valid], flat[valid]
            for p in range(day["pages"]):
                byte = pages[p].ravel()[here]
                for k in range(p * sh.BITS, min((p + 1) * sh.BITS, len(day["steps"]))):
                    bit = (byte >> np.uint8(k % sh.BITS)) & np.uint8(1)
                    shaded[:, offsets[d] + k] += np.bincount(got[bit.astype(bool)], minlength=n_lots).astype(np.int32)
        log(f"  chunk {x}_{y}: {len(part):,} cells in {len(np.unique(ids)):,} lots")
    return shaded, cells, touched


def measures(shaded: np.ndarray, cells: np.ndarray, touched: np.ndarray, manifest: dict, min_cells: int = MIN_CELLS,
             min_valid: float = MIN_VALID_SHARE) -> dict:
    """The figures per lot. `ok` marks the lots that are rated; `shade`, `sun_h` and `mostly` are (lots, days), NaN for
    a lot with no cells; `profile` is (lots, steps) in whole percent, PROFILE_NODATA where the lot is not rated."""
    ok = (cells >= min_cells) & (cells >= min_valid * touched)
    some = cells > 0
    share = np.full(shaded.shape, np.nan)
    share[some] = shaded[some] / cells[some, None]
    offsets = day_offsets(manifest)
    days = manifest["days"]
    shade = np.full((len(cells), len(days)), np.nan)
    mostly = np.full_like(shade, np.nan)
    sun_h = np.full_like(shade, np.nan)
    for d, day in enumerate(days):
        n = len(day["steps"])
        part = share[:, offsets[d] : offsets[d] + n]
        shade[some, d] = part[some].mean(axis=1)
        mostly[some, d] = (part[some] >= 0.5).mean(axis=1)
        sun_h[:, d] = (1 - shade[:, d]) * n * manifest["stepMinutes"] / 60
    profile = np.full(shaded.shape, PROFILE_NODATA, dtype=np.uint8)
    profile[ok] = np.rint(share[ok] * 100).astype(np.uint8)
    return {"ok": ok, "shade": shade, "sun_h": sun_h, "mostly": mostly, "profile": profile}


def recount(src: Path, manifest: dict, geom, res: float, cache: dict | None = None) -> tuple[np.ndarray, int]:
    """One lot counted the slow way, for checking `lot_cells` and `count` against: every pixel center in the lot's
    box is tested with an even-odd ray through the lot's rings, and each step is unpacked from its page on its own.
    Returns (shadowed cells per step, cells with data). `cache` keeps the chunks read, for a caller counting several lots."""
    import shapely

    px = manifest["grid"]["px"]
    chunks = {(int(x), int(y)) for x, y in manifest["chunks"]}
    minx, miny, maxx, maxy = shapely.bounds(geom)
    cols = np.arange(math.floor((minx + sh.MERC) / res) - 1, math.ceil((maxx + sh.MERC) / res) + 1)
    rows = np.arange(math.floor((sh.MERC - maxy) / res) - 1, math.ceil((sh.MERC - miny) / res) + 1)
    gc, gr = np.meshgrid(cols, rows)
    xs, ys = -sh.MERC + (gc + 0.5) * res, sh.MERC - (gr + 0.5) * res
    inside = np.zeros(gc.shape, dtype=bool)
    # outer rings and holes alike: a point is inside when a ray from it crosses an odd number of edges
    for ring in shapely.get_rings(shapely.get_parts(geom)):
        c = shapely.get_coordinates(ring)
        for (x1, y1), (x2, y2) in pairwise(c):
            if y1 == y2:
                continue
            between = (y1 > ys) != (y2 > ys)
            with np.errstate(divide="ignore", invalid="ignore"):
                inside ^= between & (xs < (x2 - x1) * (ys - y1) / (y2 - y1) + x1)
    out = np.zeros(total_steps(manifest), dtype=np.int64)
    cells = 0
    offsets = day_offsets(manifest)
    cache = {} if cache is None else cache
    for c, r in zip(gc[inside], gr[inside]):
        x, y = int(c // px), int(r // px)
        if (x, y) not in chunks:
            continue
        for d, day in enumerate(manifest["days"]):
            if (x, y, d) not in cache:
                cache[(x, y, d)] = read_chunk(src, manifest, day, x, y)
            pages, hours = cache[(x, y, d)]
            if hours[r % px, c % px] == manifest["hoursNoData"]:
                continue
            cells += d == 0
            for k in range(len(day["steps"])):
                out[offsets[d] + k] += (int(pages[k // sh.BITS][r % px, c % px]) >> (k % sh.BITS)) & 1
    return out, int(cells)


# ---------------------------------------------------------------------------------------------------------------------
# The lots


def load_lots(log=print):
    """The city's parcel shapes (GeoDataFrame, Pennsylvania South State Plane feet): pin, lot (the county's lot and
    block label), geoid (tract), use (assessed use class), sqft, geometry.

    A shape is kept when its representative point is in a city tract. That is tested per shape, not per parcel ID:
    a few placeholder IDs (NOT ASSESSED, COMMON GROUND, blank) sit on hundreds of shapes across the county. Only the
    class and use of the assessment record are read; no owner, sale or address fields.
    """
    import geopandas as gpd
    import pandas as pd
    import pyogrio

    from . import place_measures as pm

    tracts = pm.tracts_city()[["GEOID", "geometry"]].to_crs(sh.DSM_CRS)
    lots = pyogrio.read_dataframe(pm.PARCELS_GEOJSON, columns=["PIN", "MAPBLOCKLO"], bbox=tuple(float(v) for v in tracts.total_bounds))
    lots = lots.to_crs(sh.DSM_CRS)
    lots = lots[lots.geometry.notna() & ~lots.geometry.is_empty].reset_index(drop=True)
    read = len(lots)
    bad = ~lots.geometry.is_valid
    if bad.any():
        lots.loc[bad, "geometry"] = lots.geometry[bad].buffer(0)
    points = gpd.GeoDataFrame({"at": np.arange(len(lots))}, geometry=lots.geometry.representative_point(), crs=lots.crs)
    hit = gpd.sjoin(points, tracts, how="inner", predicate="within").drop_duplicates("at").sort_values("at")
    lots = lots.iloc[hit["at"].to_numpy()].copy()
    lots["geoid"] = hit["GEOID"].to_numpy()
    lots = lots[~lots.geometry.is_empty].reset_index(drop=True)
    a = pd.read_csv(pm.ASSESSMENTS_CSV, usecols=["PARID", "CLASSDESC", "USEDESC"], dtype=str, low_memory=False)
    a = a[a["PARID"].isin(set(lots["PIN"].dropna()))].drop_duplicates("PARID")
    use = {p: pm.land_use_class(c, u) for p, c, u in zip(a["PARID"], a["CLASSDESC"], a["USEDESC"])}
    lots["use"] = [use.get(p, UNRECORDED) for p in lots["PIN"]]
    lots["pin"] = lots["PIN"].fillna("").str.strip()
    label = lots["MAPBLOCKLO"].fillna("").str.strip()
    lots["lot"] = label.where(label.str.contains(r"\d"), "")   # the placeholder shapes carry words here, not a lot number
    lots["sqft"] = lots.geometry.area
    log(f"lots: {read:,} shapes read around the city, {len(lots):,} with their point in a city tract ({int(bad.sum())} repaired); "
        f"{int((lots['use'] == UNRECORDED).sum()):,} without an assessment record of their own")
    return lots[["pin", "lot", "geoid", "use", "sqft", "geometry"]]


def use_classes() -> list[str]:
    from . import place_measures as pm

    return [*pm.LAND_USE_CLASSES, UNRECORDED]


def table(lots, m: dict, cells: np.ndarray, manifest: dict):
    """One row per lot: what it is, how many cells it has, whether it is rated, and the three figures for each day."""
    out = lots.drop(columns="geometry").copy()
    out["sqft"] = out["sqft"].round(0).astype(int)
    out["cells"] = cells
    out["rated"] = m["ok"]
    for d, day in enumerate(manifest["days"]):
        s = day["id"][:3]
        out[f"shade_{s}"] = m["shade"][:, d].round(4)
        out[f"sun_h_{s}"] = m["sun_h"][:, d].round(2)
        out[f"mostly_{s}"] = m["mostly"][:, d].round(4)
    return out


def rollup(lots, shaded: np.ndarray, cells: np.ndarray, ok: np.ndarray, manifest: dict, by: str):
    """Shadow share by tract or by use class, weighted by cells (so by area), over the rated lots."""
    import pandas as pd

    offsets = day_offsets(manifest)
    keys = lots[by].to_numpy()[ok]
    frame = pd.DataFrame({by: keys, "lots": 1, "cells": cells[ok]})
    for d, day in enumerate(manifest["days"]):
        frame[day["id"]] = shaded[ok, offsets[d] : offsets[d] + len(day["steps"])].sum(axis=1)
    g = frame.groupby(by).sum()
    out = g[["lots"]].copy()
    out["acres"] = (g["cells"] * cell_sqft(manifest) / 43560).round(1)
    for day in manifest["days"]:
        n = len(day["steps"])
        s = day["id"][:3]
        out[f"shade_{s}"] = (g[day["id"]] / (g["cells"] * n)).round(4)
        out[f"sun_h_{s}"] = ((1 - g[day["id"]] / (g["cells"] * n)) * n * manifest["stepMinutes"] / 60).round(2)
    return out


def cell_sqft(manifest: dict, lat: float = sh.SUN_AT[0]) -> float:
    """Ground area of one page pixel, square feet (a Web Mercator pixel shrinks with the cosine of the latitude)."""
    return (resolution(manifest) * math.cos(math.radians(lat)) * 3.28084) ** 2


def step_names(manifest: dict) -> list[str]:
    """A column name for every step: jun21_0630, ..."""
    return [f"{d['id']}_{s['min'] // 60:02d}{s['min'] % 60:02d}" for d in manifest["days"] for s in d["steps"]]


def write_tables(lots, m: dict, shaded: np.ndarray, cells: np.ndarray, manifest: dict, dest: Path) -> dict[str, int]:
    """The analysis files: parcel_shadow.csv, parcel_shadow.gpkg (the same with shapes), parcel_profiles.parquet
    (percent of the lot in shadow at each half hour, blank where not rated), tract_shadow.csv and use_shadow.csv."""
    import geopandas as gpd
    import pandas as pd

    dest = Path(dest)
    dest.mkdir(parents=True, exist_ok=True)
    t = table(lots, m, cells, manifest)
    t.to_csv(dest / "parcel_shadow.csv", index=False)
    gpd.GeoDataFrame(t, geometry=lots.geometry.to_numpy(), crs=lots.crs).to_file(dest / "parcel_shadow.gpkg", driver="GPKG", engine="pyogrio")
    prof = pd.DataFrame(m["profile"], columns=step_names(manifest)).astype("UInt8").mask(m["profile"] == PROFILE_NODATA)
    prof.insert(0, "pin", lots["pin"].to_numpy())
    prof.to_parquet(dest / "parcel_profiles.parquet", index=False)
    rollup(lots, shaded, cells, m["ok"], manifest, "geoid").to_csv(dest / "tract_shadow.csv")
    rollup(lots, shaded, cells, m["ok"], manifest, "use").to_csv(dest / "use_shadow.csv")
    return {f.name: f.stat().st_size for f in sorted(dest.iterdir()) if f.is_file()}


# ---------------------------------------------------------------------------------------------------------------------
# Map files


def write_app(lots, m: dict, cells: np.ndarray, manifest: dict, dest: Path) -> dict:
    """The files the Explore map draws lots from (replacing what is in `dest`): manifest.json, and per chunk of the
    run's grid <x>_<y>.json (GeoJSON) and <x>_<y>.bin (one row of profile bytes per lot, in the same order).

    A lot goes whole into the chunk that holds its representative point, largest lots first so a small lot inside a
    big one is drawn on top. Lots with no cell of data are left out. Feature properties are plain numbers and text:
    i (row in the chunk, also the feature id), lot, u (index into the manifest's use classes), sf (lot square feet),
    n (cells), s0.. (percent of the day in shadow per day, to one decimal so hours of sun can be worked out from it,
    -1 = not rated) and m0.. (percent of the day when at least half the lot is in shadow). Returns the manifest.
    """
    import shutil

    import shapely

    dest = Path(dest)
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    z = manifest["grid"]["z"]
    uses = use_classes()
    wgs = lots.geometry.to_crs("EPSG:4326")
    keep = np.flatnonzero(cells > 0)
    points = wgs.iloc[keep].representative_point()
    n = 1 << z
    tx = np.floor((points.x.to_numpy() + 180) / 360 * n).astype(int)
    ty = np.floor((1 - np.arcsinh(np.tan(np.radians(points.y.to_numpy()))) / np.pi) / 2 * n).astype(int)
    area = lots["sqft"].to_numpy()[keep]
    shapes = shapely.transform(wgs.to_numpy()[keep], lambda c: np.round(c, 6))
    bounds = shapely.bounds(shapes)
    text = shapely.to_geojson(shapes)
    pct = np.where(m["ok"][:, None], np.round(np.nan_to_num(m["shade"]) * 100, 1), -1.0)
    half = np.where(m["ok"][:, None], np.rint(np.nan_to_num(m["mostly"]) * 100), -1).astype(int)
    lot_label, use = lots["lot"].to_numpy(), lots["use"].to_numpy()
    chunks, total = [], 0
    for x, y in sorted(set(zip(tx.tolist(), ty.tolist()))):
        here = np.flatnonzero((tx == x) & (ty == y))
        here = here[np.argsort(-area[here], kind="stable")]
        feats = []
        for i, j in enumerate(here):
            at = keep[j]
            props = {"i": i, "lot": lot_label[at], "u": uses.index(use[at]), "sf": int(np.rint(area[j])), "n": int(cells[at])}
            props.update({f"s{d}": float(v) if v >= 0 else -1 for d, v in enumerate(pct[at])})
            props.update({f"m{d}": int(v) for d, v in enumerate(half[at])})
            feats.append('{"type":"Feature","properties":' + json.dumps(props, separators=(",", ":")) + ',"geometry":' + text[j] + "}")
        total += (dest / f"{x}_{y}.json").write_text('{"type":"FeatureCollection","features":[' + ",".join(feats) + "]}")
        total += (dest / f"{x}_{y}.bin").write_bytes(np.ascontiguousarray(m["profile"][keep[here]]).tobytes())
        b = bounds[here]
        chunks.append([x, y, len(here), *(round(float(v), 6) for v in (b[:, 0].min(), b[:, 1].min(), b[:, 2].max(), b[:, 3].max()))])
    out = {
        "version": 1,
        "built": datetime.now(UTC).strftime("%Y-%m-%d"),
        "source": "Allegheny County parcel boundaries and property assessments (WPRDC, 2026-09) over the shadow run: " + manifest["source"],
        "cellFt": manifest["cellFt"],
        "grid": {"z": z},
        "minZoom": MIN_ZOOM,
        "minCells": MIN_CELLS,
        "stepMinutes": manifest["stepMinutes"],
        "uses": uses,
        "days": [{"id": d["id"], "label": d["label"], "steps": len(d["steps"]), "first": d["steps"][0]["min"]} for d in manifest["days"]],
        "profile": {"noData": PROFILE_NODATA},
        "paths": {"lots": "{x}_{y}.json", "profile": "{x}_{y}.bin"},
        "chunks": chunks,
        "lots": int(sum(c[2] for c in chunks)),
        "rated": int(m["ok"][keep].sum()),
        "bytes": total,
    }
    (dest / "manifest.json").write_text(json.dumps(out, separators=(",", ":")))
    return out
