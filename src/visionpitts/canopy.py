"""Tree canopy: the share of every Explore geography, every map pixel and every city lot under tree cover.

Source: PASDA "Allegheny County - Tree Canopy Change, 2015-2020" (Tree Pittsburgh and the University of Vermont, from
lidar flown in fall 2019 and spring 2020). The file carries no change class, only shapes. What they cover inside Penn
Hills is the canopy Tree Pittsburgh published for Penn Hills in 2020, so the file is read as the 2020 canopy extent.

By geography, exact: the canopy shapes are laid over each tract, block group, ZIP code, municipality, the city and the
county. A shape wholly inside a unit counts with its full area, a shape across the unit's edge with the area of the
part inside.

  canopy share  canopy area / land area, never more than 1
  land area     the unit's polygon area x land / (land + water), with the Census land and water figures of that unit
  basis         `land` when the level's file carries those figures, `total` (the whole polygon) when it does not

The canopy map stops at the county line and some ZIP codes do not. A unit that reaches past the line is measured on
its part inside the county, and gets no figure when less than MIN_INSIDE of it is inside.

On the map: a cell of the shadow run's grid (web-map zoom 15 at 512 pixels a tile, about 6 ft) is canopy when its
center is inside a canopy shape. Every lower zoom averages 2 x 2 pixels. A tile stores the share of each pixel under
canopy in 17 steps, as one green from clear to solid.

By lot: the same cells counted on the city's lots (parcel_shadow.load_lots). Canopy share of a lot = its canopy cells
/ its cells, with no figure under parcel_shadow.MIN_CELLS cells. For the Analysis page the lots are summed by tract
next to the shadow figures: vacant lots, the ones of buildable size, the ones not under trees, the ones that also get
winter sun, and the share of all lots within half a mile of a transit stop.

Display and analysis only; nothing here enters a score.
"""
from __future__ import annotations

import json
import math
import shutil
import struct
import zlib
from datetime import UTC, datetime
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
import shapely

from . import geo_levels as gl
from . import parcel_shadow as ps
from . import shadow as sh
from .config import CRS_PA_SOUTH, PROCESSED, RAW

CANOPY_SHP = RAW / "canopy" / "AlleghenyCounty_TreeCanopyChange_2015_2020_202607.shp"
SOURCE = ("PASDA Allegheny County Tree Canopy Change 2015-2020 (Tree Pittsburgh and the University of Vermont, lidar "
          "from fall 2019 and spring 2020), read as the 2020 tree canopy extent")
YEAR = 2020
LEVELS = ("tract", "bg", "zcta", "muni", "city", "county")
CENSUS_FILES = {"tract": gl.TRACTS_SHP, "bg": gl.BGS_SHP, "zcta": gl.ZCTA_GEOJSON, "muni": f"zip://{gl.COUSUB_ZIP}",
                "city": gl.CITY_SHP, "county": gl.COUNTY_SHP}   # what geo_levels reads for each level
SQFT_PER_ACRE = 43560.0
SQFT_PER_SQM = (3937 / 1200) ** 2   # the State Plane grid is in US survey feet
CUT_FT = 5280.0           # canopy shapes larger than this are cut along a one-mile grid (some are whole forests)
MIN_INSIDE = 0.5          # share of a unit that must be inside the county for it to get a figure
SAME_POLYGON = 0.02       # Census land + water has to be the polygons' own area within this, summed over a level

TILE_PX = 512
MIN_ZOOM, MAX_ZOOM = 11, 15
STEPS = 16                # a pixel's share is stored as 0..16
GREEN = (46, 125, 50)
BLOCK_PX = 1024           # shapes wider than this many cells are cut before their cells are tested

MIN_LOT_SQFT = 2000       # a vacant lot of buildable size
OPEN_BELOW = 0.5          # ... is open when less than this share of it is under canopy
HALF_MILE_FT = 2640.0


def today() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%d")


def dump(obj) -> str:
    return json.dumps(obj, separators=(",", ":"), allow_nan=False)


# ---------------------------------------------------------------------------------------------------------------------
# The canopy shapes


def polygons_only(shapes: np.ndarray) -> np.ndarray:
    """The polygons among the shapes, with the polygons inside mixed collections; lines, points and empty shapes are
    dropped. A repair or a cut can leave a line where a shape only touches itself or a grid line."""
    shapes = np.asarray(shapes, dtype=object)
    kind = shapely.get_type_id(shapes)
    parts = shapely.get_parts(shapes[kind == 7])
    out = np.concatenate([shapes[(kind == 3) | (kind == 6)], parts[np.isin(shapely.get_type_id(parts), (3, 6))]])
    return out[~shapely.is_empty(out)]


def repair(shapes: np.ndarray) -> tuple[np.ndarray, int]:
    """(shapes with the ones that cross themselves made valid, how many were)."""
    shapes = np.asarray(shapes, dtype=object)
    bad = ~shapely.is_valid(shapes)
    if not bad.any():
        return shapes, 0
    return np.concatenate([shapes[~bad], polygons_only(shapely.make_valid(shapes[bad]))]), int(bad.sum())


def cut_large(shapes: np.ndarray, block: float) -> np.ndarray:
    """Shapes wider or taller than `block` cut along a square grid of that size, the rest as they are.

    The pieces cover the same ground, so areas and cell counts do not change. Every shape that comes back fits in
    one grid square's width and height, which keeps an overlay or a cell test from handling a forest at a time.
    """
    shapes = np.asarray(shapes, dtype=object)
    b = shapely.bounds(shapes)
    big = (b[:, 2] - b[:, 0] > block) | (b[:, 3] - b[:, 1] > block)
    if not big.any():
        return shapes
    b = b[big]
    x0, y0 = np.floor(b[:, 0] / block).astype(np.int64), np.floor(b[:, 1] / block).astype(np.int64)
    nx = np.floor(b[:, 2] / block).astype(np.int64) - x0 + 1
    n = nx * (np.floor(b[:, 3] / block).astype(np.int64) - y0 + 1)
    idx = np.repeat(np.arange(len(n)), n)
    k = np.arange(n.sum()) - np.repeat(np.cumsum(n) - n, n)
    gx, gy = x0[idx] + k % nx[idx], y0[idx] + k // nx[idx]
    squares = shapely.box(gx * block, gy * block, (gx + 1) * block, (gy + 1) * block)
    return np.concatenate([shapes[~big], polygons_only(shapely.intersection(shapes[big][idx], squares))])


def load_canopy(path: Path = CANOPY_SHP, log=print) -> tuple[np.ndarray, dict]:
    """(the canopy shapes in Pennsylvania South State Plane feet, repaired and cut along the one-mile grid; what was
    read: `shapes`, `repaired`, `acres`)."""
    import pyogrio

    frame = pyogrio.read_dataframe(path, columns=[])
    if frame.crs is None or frame.crs.to_epsg() != 2272:
        raise ValueError(f"{path}: expected Pennsylvania South State Plane feet (EPSG:2272), found {frame.crs}")
    shapes = frame.geometry.to_numpy()
    shapes = shapes[~(shapely.is_missing(shapes) | shapely.is_empty(shapes))]
    read = len(shapes)
    shapes, repaired = repair(shapes)
    info = {"shapes": read, "repaired": repaired, "acres": float(shapely.area(shapes).sum() / SQFT_PER_ACRE)}
    shapes = cut_large(shapes, CUT_FT)
    log(f"canopy: {read:,} shapes read, {repaired:,} repaired, {info['acres']:,.0f} acres; {len(shapes):,} pieces after the one-mile cut")
    return shapes, info


# ---------------------------------------------------------------------------------------------------------------------
# By geography


def canopy_inside(shapes: np.ndarray, units: np.ndarray, tree: shapely.STRtree | None = None) -> np.ndarray:
    """Canopy area inside each unit, in the grid's square units: shapes wholly inside with their full area, shapes
    across the edge with the area of the part inside."""
    units = np.asarray(units, dtype=object)
    tree = shapely.STRtree(shapes) if tree is None else tree
    u_in, s_in = tree.query(units, predicate="contains")
    u_at, s_at = tree.query(units, predicate="intersects")
    edge = ~np.isin(u_at.astype(np.int64) * len(shapes) + s_at, u_in.astype(np.int64) * len(shapes) + s_in)
    u_at, s_at = u_at[edge], s_at[edge]
    whole = np.bincount(u_in, weights=shapely.area(shapes[s_in]), minlength=len(units))
    part = np.bincount(u_at, weights=shapely.area(shapely.intersection(shapes[s_at], units[u_at])), minlength=len(units))
    return whole + part


def land_share(area_sqft: np.ndarray, aland, awater, tolerance: float = SAME_POLYGON) -> np.ndarray | None:
    """Share of each unit that is land, from the Census land and water figures (square meters) of the same units.

    None when a figure is missing, or when land and water together are not the polygons' own area within `tolerance`
    over the level (the figures then describe other shapes): the caller measures against the whole polygon instead.
    """
    if aland is None or awater is None:
        return None
    aland, awater = np.asarray(aland, dtype=float), np.asarray(awater, dtype=float)
    both = aland + awater
    if not (np.isfinite(both).all() and (both > 0).all()):
        return None
    if abs(float(np.sum(area_sqft)) / (both.sum() * SQFT_PER_SQM) - 1) > tolerance:
        return None
    return aland / both


def census_land_water(level: str) -> pd.DataFrame | None:
    """Census land and water area (ALAND, AWATER) by GEOID from the file geo_levels reads for a level, which drops
    them. None when the file has no such columns."""
    import pyogrio

    path = CENSUS_FILES[level]
    if not {"GEOID", "ALAND", "AWATER"} <= set(pyogrio.read_info(path)["fields"]):
        return None
    t = pyogrio.read_dataframe(path, columns=["GEOID", "ALAND", "AWATER"], read_geometry=False)
    t["GEOID"] = t["GEOID"].astype(str)
    return t.drop_duplicates("GEOID").set_index("GEOID")[["ALAND", "AWATER"]].astype(float)


def level_table(units, shapes: np.ndarray, tree: shapely.STRtree | None = None, census: pd.DataFrame | None = None,
                cover=None, min_inside: float = MIN_INSIDE) -> pd.DataFrame:
    """One row per unit: GEOID, canopy_acres, land_acres, canopy_share, basis.

    units: GEOID and geometry, in the canopy shapes' grid (feet). census: ALAND and AWATER by GEOID, or None.
    cover: the ground the canopy map covers (the county), or None when every unit is inside it. A unit that reaches
    outside is measured on its part inside; with less than `min_inside` of it inside, its three figures are blank.
    A unit with no land has no share.
    """
    geoms = units.geometry.to_numpy()
    full = shapely.area(geoms)
    part = geoms.copy()
    if cover is not None:
        shapely.prepare(cover)
        out = ~shapely.contains(cover, geoms)
        part[out] = shapely.buffer(shapely.intersection(geoms[out], cover), 0)   # buffer 0 drops lines left by a touch
    area = shapely.area(part)
    ok = area >= min_inside * full
    rows = census.reindex(units["GEOID"].astype(str)) if census is not None else None
    land = None if rows is None else land_share(full, rows["ALAND"].to_numpy(), rows["AWATER"].to_numpy())
    ground = area if land is None else area * land
    canopy = np.full(len(geoms), np.nan)
    canopy[ok] = canopy_inside(shapes, part[ok], tree)
    with np.errstate(divide="ignore", invalid="ignore"):
        share = np.where(ground > 0, np.minimum(canopy / ground, 1.0), np.nan)   # no land, no share
    return pd.DataFrame({
        "GEOID": units["GEOID"].astype(str).to_numpy(),
        "canopy_acres": np.round(canopy / SQFT_PER_ACRE, 1),
        "land_acres": np.round(np.where(ok, ground, np.nan) / SQFT_PER_ACRE, 1),
        "canopy_share": np.round(share, 4),
        "basis": "total" if land is None else "land",
    })


def level_tables(shapes: np.ndarray, levels=LEVELS, log=print) -> dict[str, pd.DataFrame]:
    """`level_table` for every Explore level, county-wide."""
    tree = shapely.STRtree(shapes)
    cover = gl.county().to_crs(CRS_PA_SOUTH).geometry.iloc[0]
    out = {}
    for level in levels:
        units = gl.units(level, "county")[["GEOID", "geometry"]].to_crs(CRS_PA_SOUTH)
        t = out[level] = level_table(units, shapes, tree, census_land_water(level), cover)
        s = t["canopy_share"].dropna()
        log(f"  {level:>6}: {len(t):,} units, {len(s):,} with a figure, share of {t['basis'].iloc[0]} area; "
            f"lowest {s.min():.1%}, middle {s.median():.1%}, highest {s.max():.1%}")
    return out


def write_levels(tables: dict[str, pd.DataFrame], dest: Path = PROCESSED) -> list[Path]:
    """canopy_<level>.csv for every level."""
    dest = Path(dest)
    dest.mkdir(parents=True, exist_ok=True)
    out = []
    for level, t in tables.items():
        t.to_csv(dest / f"canopy_{level}.csv", index=False)
        out.append(dest / f"canopy_{level}.csv")
    return out


def app_values(tables: dict[str, pd.DataFrame]) -> dict:
    """What the Explore map reads: the canopy share of every unit that has one, by level and GEOID."""
    return {
        "built": today(),
        "year": YEAR,
        "basis": {level: str(t["basis"].iloc[0]) for level, t in tables.items()},
        "values": {level: {g: float(v) for g, v in zip(t["GEOID"], t["canopy_share"]) if np.isfinite(v)} for level, t in tables.items()},
    }


# ---------------------------------------------------------------------------------------------------------------------
# The canopy as cells of the shadow run's grid


def resolution(zoom: int = MAX_ZOOM, tile_px: int = TILE_PX) -> float:
    """Web Mercator meters per pixel of a tile. At zoom 15 and 512 pixels it is the shadow run's own cell."""
    return 2 * sh.MERC / ((1 << zoom) * tile_px)


def cell_sqft(res: float, lat: float = sh.SUN_AT[0]) -> float:
    """Ground area of one cell, square feet (a Web Mercator pixel shrinks with the cosine of the latitude)."""
    return (res * math.cos(math.radians(lat)) * 3.28084) ** 2


def tile_rect(manifest: dict) -> tuple[int, int, int, int, int]:
    """(zoom, x0, y0, tiles across, tiles down): the rectangle of map tiles around a shadow run's chunks."""
    xs, ys = [int(x) for x, _ in manifest["chunks"]], [int(y) for _, y in manifest["chunks"]]
    return manifest["grid"]["z"], min(xs), min(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1


def rect_bounds(zoom: int, x0: int, y0: int, nx: int, ny: int) -> tuple[float, float, float, float]:
    """Web Mercator (minx, miny, maxx, maxy) of a rectangle of tiles."""
    west, _, _, north = sh.tile_bounds(zoom, x0, y0)
    _, south, east, _ = sh.tile_bounds(zoom, x0 + nx - 1, y0 + ny - 1)
    return west, south, east, north


def web_shapes(shapes: np.ndarray, bounds: tuple[float, float, float, float], tree: shapely.STRtree | None = None,
               crs: str = CRS_PA_SOUTH) -> np.ndarray:
    """The shapes that reach into a Web Mercator box, moved to Web Mercator and clipped to the box."""
    tree = shapely.STRtree(shapes) if tree is None else tree
    frame = shapely.box(*bounds)
    there = gpd.GeoSeries([shapely.segmentize(frame, (bounds[2] - bounds[0]) / 64)], crs="EPSG:3857").to_crs(crs).iloc[0]
    merc = gpd.GeoSeries(shapes[np.sort(tree.query(there, predicate="intersects"))], crs=crs).to_crs("EPSG:3857").to_numpy()
    shapely.prepare(frame)
    over = ~shapely.contains(frame, merc)
    merc[over] = shapely.intersection(merc[over], frame)
    return polygons_only(merc)


def cell_groups(shapes: np.ndarray, res: float, block_px: int = BLOCK_PX, tests: int = 16_000_000):
    """Yields (column, row) of the cells whose center is inside a shape (Web Mercator), a group of shapes at a time.

    Columns and rows are the world-wide ones of parcel_shadow.lot_cells, which does the testing. Shapes wider than
    `block_px` cells are cut first: Web Mercator's origin is a pixel corner at every zoom, so the cuts run along cell
    edges and never through a center. A cell under two shapes comes back twice.
    """
    shapes = cut_large(polygons_only(shapes), block_px * res)
    b = shapely.bounds(shapes)
    size = np.maximum((b[:, 2] - b[:, 0]) / res + 1, 1) * np.maximum((b[:, 3] - b[:, 1]) / res + 1, 1)
    group = (np.cumsum(size) // tests).astype(np.int64)
    for part in np.split(np.arange(len(shapes)), np.flatnonzero(np.diff(group)) + 1):
        if len(part):
            _, col, row = ps.lot_cells(shapes[part], res)
            yield col.astype(np.int64), row.astype(np.int64)


def on_grid(grid: np.ndarray, col: np.ndarray, row: np.ndarray, col0: int, row0: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """(which of the cells are on the grid, their grid column, their grid row)."""
    c, r = np.asarray(col, dtype=np.int64) - col0, np.asarray(row, dtype=np.int64) - row0
    on = (c >= 0) & (c < grid.shape[1]) & (r >= 0) & (r < grid.shape[0])
    return on, c[on], r[on]


def rasterize(shapes: np.ndarray, res: float, col0: int, row0: int, width: int, height: int) -> np.ndarray:
    """(height, width) of 0 and 1: 1 where a cell's center is inside a shape. Cell (0, 0) is world column col0, row row0."""
    grid = np.zeros((height, width), dtype=np.uint8)
    for col, row in cell_groups(shapes, res):
        _, c, r = on_grid(grid, col, row, col0, row0)
        grid[r, c] = 1
    return grid


def count_inside(grid: np.ndarray, shapes: np.ndarray, res: float, col0: int, row0: int) -> tuple[int, int]:
    """(cells of the grid whose center is inside the shapes, how many of them are 1). The shapes must not overlap."""
    cells = ones = 0
    for col, row in cell_groups(shapes, res):
        on, c, r = on_grid(grid, col, row, col0, row0)
        cells += int(on.sum())
        ones += int(grid[r, c].sum())
    return cells, ones


def second_look(grid: np.ndarray, shapes: np.ndarray, res: float, col0: int, row0: int, n: int = 20_000, seed: int = 16,
                tree: shapely.STRtree | None = None, crs: str = CRS_PA_SOUTH) -> tuple[int, int]:
    """Checks the grid against the shapes a second way: (cells looked at, cells that disagree).

    `n` cells are drawn at random. Each one's center is moved from Web Mercator to the shapes' own grid and looked up
    among the shapes there, where `rasterize` moved the shapes to Web Mercator and tested them on that side.
    """
    from pyproj import Transformer

    tree = shapely.STRtree(shapes) if tree is None else tree
    rng = np.random.default_rng(seed)
    c, r = rng.integers(0, grid.shape[1], n), rng.integers(0, grid.shape[0], n)
    x, y = Transformer.from_crs("EPSG:3857", crs, always_xy=True).transform(-sh.MERC + (col0 + c + 0.5) * res, sh.MERC - (row0 + r + 0.5) * res)
    under = np.zeros(n, dtype=bool)
    under[tree.query(shapely.points(x, y), predicate="intersects")[0]] = True
    return n, int((under != (grid[r, c] == 1)).sum())


# ---------------------------------------------------------------------------------------------------------------------
# Map tiles


def palette() -> np.ndarray:
    """The 17 colors of a tile, (red, green, blue, alpha): one green from clear to solid."""
    return np.array([[*GREEN, round(255 * i / STEPS)] for i in range(STEPS + 1)], dtype=np.uint8)


def palette_index(count: np.ndarray, parts: int) -> np.ndarray:
    """Palette index of each pixel: its share under canopy (count of canopy cells / cells in the pixel) x 16, to the
    nearest whole step, halves up."""
    return ((count.astype(np.uint32) * (2 * STEPS) + parts) // (2 * parts)).astype(np.uint8)


def png_palette(index: np.ndarray) -> bytes:
    """An 8-bit palette PNG of the indexes, with the 17 colors and their alpha (PLTE and tRNS) and nothing else."""
    index = np.ascontiguousarray(index, dtype=np.uint8)
    h, w = index.shape
    rows = np.zeros((h, w + 1), dtype=np.uint8)   # each row starts with filter type 0 (none)
    rows[:, 1:] = index
    colors = palette()

    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 3, 0, 0, 0))
            + chunk(b"PLTE", colors[:, :3].tobytes()) + chunk(b"tRNS", colors[:, 3].tobytes())
            + chunk(b"IDAT", zlib.compress(rows.tobytes(), 9)) + chunk(b"IEND", b""))


def read_png_palette(data: bytes) -> tuple[np.ndarray, np.ndarray]:
    """Inverse of png_palette: (indexes, colors as (n, 4) red, green, blue, alpha). Only reads what png_palette writes."""
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    pos, w, h, idat, rgb, alpha = 8, 0, 0, b"", b"", b""
    while pos < len(data):
        (n,), kind = struct.unpack(">I", data[pos : pos + 4]), data[pos + 4 : pos + 8]
        body = data[pos + 8 : pos + 8 + n]
        if kind == b"IHDR":
            w, h = struct.unpack(">II", body[:8])
            assert body[8:10] == b"\x08\x03"
        elif kind == b"PLTE":
            rgb = body
        elif kind == b"tRNS":
            alpha = body
        elif kind == b"IDAT":
            idat += body
        pos += 12 + n
    colors = np.column_stack([np.frombuffer(rgb, dtype=np.uint8).reshape(-1, 3), np.frombuffer(alpha, dtype=np.uint8)])
    return np.frombuffer(zlib.decompress(idat), dtype=np.uint8).reshape(h, w + 1)[:, 1:].copy(), colors


def pyramid(grid: np.ndarray, zoom: int, x0: int, y0: int, minzoom: int = MIN_ZOOM, tile_px: int = TILE_PX):
    """Yields (zoom, first tile x, first tile y, canopy cells per pixel, cells per pixel) from the grid's zoom down to
    `minzoom`. Each step down sums 2 x 2 pixels, which is the average of their shares. Where the tiles of a lower
    zoom reach past the grid, the pixels out there hold no canopy."""
    count, parts = grid, 1
    while True:
        yield zoom, x0, y0, count, parts
        if zoom <= minzoom:
            return
        ny, nx = count.shape[0] // tile_px, count.shape[1] // tile_px
        count = np.pad(count, ((y0 % 2 * tile_px, (y0 + ny) % 2 * tile_px), (x0 % 2 * tile_px, (x0 + nx) % 2 * tile_px)))
        h, w = count.shape
        count = count.reshape(h // 2, 2, w // 2, 2).sum(axis=(1, 3), dtype=np.uint32)
        zoom, x0, y0, parts = zoom - 1, x0 // 2, y0 // 2, parts * 4


def write_tiles(grid: np.ndarray, zoom: int, x0: int, y0: int, dest: Path, minzoom: int = MIN_ZOOM, tile_px: int = TILE_PX) -> dict:
    """The canopy map tiles (replacing what is in `dest`): {z}/{x}/{y}.png and manifest.json. Returns the manifest.

    `grid` holds 0 and 1 for whole tiles of `zoom`, the first being tile (x0, y0). Every tile that touches the grid
    is written at every zoom from `zoom` down to `minzoom`, clear ones too, so the map never asks for a missing file.
    """
    dest = Path(dest)
    if dest.exists():
        shutil.rmtree(dest)
    tiles = total = 0
    for z, tx, ty, count, parts in pyramid(grid, zoom, x0, y0, minzoom, tile_px):
        for i in range(count.shape[1] // tile_px):
            (dest / str(z) / str(tx + i)).mkdir(parents=True)
            for j in range(count.shape[0] // tile_px):
                page = palette_index(count[j * tile_px : (j + 1) * tile_px, i * tile_px : (i + 1) * tile_px], parts)
                total += (dest / str(z) / str(tx + i) / f"{ty + j}.png").write_bytes(png_palette(page))
                tiles += 1
    west, _, _, north = sh.tile_lonlat(zoom, x0, y0)
    _, south, east, _ = sh.tile_lonlat(zoom, x0 + grid.shape[1] // tile_px - 1, y0 + grid.shape[0] // tile_px - 1)
    out = {"version": 1, "built": today(), "source": SOURCE, "year": YEAR, "tileSize": tile_px, "minzoom": minzoom, "maxzoom": zoom,
           "bounds": [round(v, 6) for v in (west, south, east, north)], "tiles": tiles, "bytes": total, "path": "{z}/{x}/{y}.png"}
    (dest / "manifest.json").write_text(dump(out))
    return out


# ---------------------------------------------------------------------------------------------------------------------
# By lot


def lot_canopy(lot: np.ndarray, col: np.ndarray, row: np.ndarray, n_lots: int, grid: np.ndarray, col0: int, row0: int) -> tuple[np.ndarray, np.ndarray]:
    """(cells, canopy cells) per lot from the cells parcel_shadow.lot_cells found. A cell off the grid is not counted."""
    on, c, r = on_grid(grid, col, row, col0, row0)
    cells = np.bincount(lot[on], minlength=n_lots)
    return cells, np.bincount(lot[on], weights=grid[r, c], minlength=n_lots).astype(np.int64)


def lot_table(lots, cells: np.ndarray, canopy: np.ndarray, min_cells: int = ps.MIN_CELLS) -> pd.DataFrame:
    """One row per lot, in the order given: pin, lot, geoid, use, sqft, cells, canopy_share (blank under `min_cells`)."""
    out = pd.DataFrame({k: lots[k].to_numpy() for k in ("pin", "lot", "geoid", "use")})
    out["sqft"] = np.rint(lots["sqft"].to_numpy()).astype(int)
    out["cells"] = cells
    out["canopy_share"] = np.where(cells >= min_cells, np.round(canopy / np.maximum(cells, 1), 4), np.nan)
    return out


# ---------------------------------------------------------------------------------------------------------------------
# By tract, for the Analysis page

LOT_KEYS = ["pin", "lot", "geoid", "sqft"]
VACANT_FIELDS = ("vacant", "vacant_2k", "vacant_open", "vacant_open_acres", "vacant_sunny", "vacant_sunny_acres")
DECIMALS = {"canopy": 4, "canopy_acres": 1, "sun": 2, "shade": 4, "lots": 1, "vacant": 1, "vacant_2k": 1, "vacant_open": 1,
            "vacant_open_acres": 1, "vacant_sunny": 1, "vacant_sunny_acres": 1, "transit_half": 4}


def read_lot_table(path: Path) -> pd.DataFrame:
    """A lot table as written (parcel_shadow.csv, parcel_canopy.csv): IDs and uses as the text they are, `rated` as
    true or false, the rest as numbers with blanks missing."""
    t = pd.read_csv(path, dtype=str, keep_default_na=False)
    for c in t.columns:
        if c == "rated":
            t[c] = t[c] == "True"
        elif c not in ("pin", "lot", "geoid", "use"):
            t[c] = pd.to_numeric(t[c])
    return t


def join_lots(shadow: pd.DataFrame, canopy: pd.DataFrame) -> pd.DataFrame:
    """The shadow table with each lot's canopy share next to it, matched row for row.

    A parcel ID does not name one lot (NOT ASSESSED and other placeholders sit on hundreds of shapes), so nothing is
    joined on it. Both tables list the lots of parcel_shadow.load_lots in the same order; that is checked on ID, lot
    label, tract and size, and a ValueError says so when they are not the same lots.
    """
    same = len(shadow) == len(canopy) and all(
        np.array_equal(shadow[k].fillna("").astype(str).to_numpy(), canopy[k].fillna("").astype(str).to_numpy()) for k in LOT_KEYS)
    if not same:
        raise ValueError("the shadow table and the canopy table do not list the same lots in the same order "
                         "(rebuild the shadow table: scripts/15_build_parcel_shadow.py)")
    out = shadow.reset_index(drop=True).copy()
    out["canopy_share"] = canopy["canopy_share"].to_numpy()
    assert len(out) == len(shadow)
    return out


def vacant_figures(lots: pd.DataFrame, sun: str, half_day: float) -> dict:
    """The vacant-lot figures of one group of lots (rows of `join_lots`). `sun` is the column with hours of direct sun
    on the shortest day, `half_day` half the length of that day.

      vacant       rated lots assessed as vacant land
      vacant_2k    ... of at least MIN_LOT_SQFT square feet
      vacant_open  ... with less than OPEN_BELOW of the lot under canopy
      vacant_sunny ... that get direct sun for at least half of the shortest day
    """
    vacant = lots[lots["rated"].astype(bool) & (lots["use"] == "vacant")]
    sized = vacant[vacant["sqft"] >= MIN_LOT_SQFT]
    open_ = sized[sized["canopy_share"] < OPEN_BELOW]
    sunny = open_[open_[sun] >= half_day]
    return {"vacant": len(vacant), "vacant_2k": len(sized), "vacant_open": len(open_),
            "vacant_open_acres": round(float(open_["sqft"].sum()) / SQFT_PER_ACRE, 1), "vacant_sunny": len(sunny),
            "vacant_sunny_acres": round(float(sunny["sqft"].sum()) / SQFT_PER_ACRE, 1)}


def near_a_stop(points: np.ndarray, stops: np.ndarray, radius: float = HALF_MILE_FT) -> np.ndarray:
    """True for each point with a stop within `radius` in a straight line (a stop exactly that far counts)."""
    stops = np.asarray(stops, dtype=object)
    return shapely.distance(points, stops[shapely.STRtree(stops).nearest(points)]) <= radius


def day_hours(run: dict) -> list[float]:
    """Length of each measured day of a shadow run, hours: its steps x the step length."""
    return [len(d["steps"]) * run["stepMinutes"] / 60 for d in run["days"]]


def site_tract(geoids: list[str], tracts: pd.DataFrame, city: pd.DataFrame, run: dict | None = None,
               tract_shadow: pd.DataFrame | None = None, lots: pd.DataFrame | None = None, near: pd.DataFrame | None = None) -> dict:
    """What the Analysis page reads about a tract as a place to build: canopy, sun, vacant lots, transit.

    tracts, city: `level_table` rows. run: the shadow run's manifest. tract_shadow: tract_shadow.csv. lots: rows of
    `join_lots`. near: one row per city lot of any use, with `geoid` and `near` (a transit stop within half a mile).
    Anything whose input is None comes out as null. `city` holds the same fields for all the lots together, `median`
    the middle tract for each field.
    """
    days = run["days"] if run is not None else []
    hours = day_hours(run) if run is not None else []
    tags = [d["id"][:3] for d in days]
    short = int(np.argmin(hours)) if hours else 0
    canopy = tracts.set_index("GEOID")
    shadow = None if tract_shadow is None or run is None else tract_shadow.assign(geoid=tract_shadow["geoid"].astype(str)).set_index("geoid")
    lots = lots if run is not None else None
    by_tract = {} if lots is None else dict(tuple(lots.groupby("geoid")))
    near_share = None if near is None else near.groupby("geoid")["near"].mean()

    def fields(row, sun, shade, n_lots, mine, transit) -> dict:
        out = {"canopy": number(row["canopy_share"], 4), "canopy_acres": number(row["canopy_acres"], 1)}
        out["sun"] = None if sun is None else [number(v, 2) for v in sun]
        out["shade"] = None if shade is None else [number(v, 4) for v in shade]
        out["lots"] = n_lots
        out.update(dict.fromkeys(VACANT_FIELDS) if mine is None else vacant_figures(mine, f"sun_h_{tags[short]}", hours[short] / 2))
        out["transit_half"] = number(transit, 4)
        return out

    out = {}
    for g in geoids:
        s = shadow.loc[g] if shadow is not None and g in shadow.index else None   # as the shadow step rolled it up
        out[g] = fields(canopy.loc[g], None if s is None else [s[f"sun_h_{t}"] for t in tags], None if s is None else [s[f"shade_{t}"] for t in tags],
                        None if s is None else int(s["lots"]), None if lots is None else by_tract.get(g, lots.iloc[:0]),
                        None if near_share is None else near_share.get(g))
    rated = None if lots is None else lots[lots["rated"].astype(bool)]
    shade = None if rated is None or not len(rated) else [float(np.average(rated[f"shade_{t}"], weights=rated["cells"])) for t in tags]
    whole = fields(city.iloc[0], None if shade is None else [(1 - v) * h for v, h in zip(shade, hours)], shade,
                   None if rated is None else len(rated), lots, None if near is None else float(near["near"].mean()))
    return {"built": today(), "days": [d["id"] for d in days] or None, "day_hours": hours or None, "city": whole,
            "median": middle(list(out.values())), "tracts": out}


def number(v, decimals: int) -> float | None:
    """A rounded plain number, or None for a missing one."""
    return None if v is None or not np.isfinite(v) else round(float(v), decimals)


def middle(rows: list[dict]) -> dict:
    """The median of every field across the rows; lists position by position. Missing values are left out."""
    def median(values, key):
        values = [v for v in values if v is not None]
        return number(np.median(values), DECIMALS[key]) if values else None

    out = {}
    for key in rows[0] if rows else []:
        lists = [r[key] for r in rows if isinstance(r[key], list)]
        out[key] = [median(col, key) for col in zip(*lists)] if lists else median([r[key] for r in rows], key)
    return out
