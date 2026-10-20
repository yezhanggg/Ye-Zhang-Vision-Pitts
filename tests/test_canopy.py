import json
import math

import geopandas as gpd
import numpy as np
import pandas as pd
import pytest
import shapely
from pyproj import Transformer
from shapely.geometry import Polygon, box

from visionpitts import canopy as cn
from visionpitts import parcel_shadow as ps
from visionpitts import shadow as sh

LEFT, TOP = -sh.MERC, sh.MERC
RUN = {"stepMinutes": 30, "grid": {"z": 13, "px": 2048}, "chunks": [[2274, 3086], [2273, 3089], [2278, 3090]],
       "days": [{"id": "jun21", "steps": [{}] * 29}, {"id": "sep22", "steps": [{}] * 24}, {"id": "dec21", "steps": [{}] * 18}]}


def quiet(*_):
    return None


def shapes(*geoms):
    return np.array(geoms, dtype=object)


def cells(c0: int, r0: int, c1: int, r1: int, res: float = 10.0):
    """A box that holds the centers of columns c0..c1 and rows r0..r1 of a grid whose corner is the map's."""
    return box(LEFT + c0 * res + 1, TOP - (r1 + 1) * res + 1, LEFT + (c1 + 1) * res - 1, TOP - r0 * res - 1)


# ---------------------------------------------------------------------------------------------------------------------
# By geography


def test_a_shape_counts_whole_when_inside_and_by_its_part_when_across_the_edge():
    inside = box(10, 10, 30, 30)
    across = box(90, 40, 120, 60)                                   # 10 wide in the first unit, 20 in the second
    outside = box(300, 300, 320, 320)
    bow = Polygon([(40, 40), (60, 60), (60, 40), (40, 60)])        # crosses itself: two triangles of 100 each
    bow_across = Polygon([(90, 70), (110, 90), (110, 70), (90, 90)])   # one triangle on each side of the edge
    assert not bow.is_valid and bow.area == 0                       # as read, the two halves cancel out
    canopy, repaired = cn.repair(shapes(inside, across, outside, bow, bow_across))
    assert repaired == 2 and shapely.is_valid(canopy).all() and shapely.area(canopy).sum() == pytest.approx(400 + 600 + 400 + 200 + 200)
    units = shapes(box(0, 0, 100, 100), box(100, 0, 200, 100), box(500, 500, 600, 600))
    got = cn.canopy_inside(canopy, units)
    assert got.tolist() == pytest.approx([400 + 200 + 200 + 100, 400 + 100, 0])
    assert cn.canopy_inside(canopy, units, shapely.STRtree(canopy)).tolist() == pytest.approx(got.tolist())
    assert cn.repair(shapes(inside, across))[1] == 0


def test_large_shapes_are_cut_along_a_grid_and_cover_the_same_ground():
    ell = Polygon([(50, 0), (350, 0), (350, 50), (100, 50), (100, 250), (50, 250)])   # 300 x 50 bar with a 50 x 200 arm
    small = box(120, 120, 180, 180)
    on_a_line = box(190, 190, 210, 210)                               # smaller than a square: left whole
    out = cn.cut_large(shapes(ell, small, on_a_line), 100)
    assert len(out) == 6 + 2 and set(shapely.get_type_id(out)) == {3}   # squares the L only touches along a line give nothing
    b = shapely.bounds(out)
    assert (b[:, 2] - b[:, 0]).max() <= 100 and (b[:, 3] - b[:, 1]).max() <= 100
    assert shapely.area(out).sum() == pytest.approx(25000 + 3600 + 400)
    assert sum(g.equals(small) for g in out) == 1 and sum(g.equals(on_a_line) for g in out) == 1
    unit = shapes(box(0, 0, 220, 130))
    assert cn.canopy_inside(out, unit)[0] == pytest.approx(cn.canopy_inside(shapes(ell, small, on_a_line), unit)[0])
    assert cn.cut_large(shapes(small), 100)[0] is small
    mixed = shapely.GeometryCollection([small, shapely.LineString([(0, 0), (5, 5)])])
    assert [g.equals(small) for g in cn.polygons_only(shapes(mixed, shapely.Point(1, 1), Polygon()))] == [True]


def test_the_land_share_rule_and_its_fallback():
    area = np.array([1e6, 2e6])                 # square feet
    sqm = area / cn.SQFT_PER_SQM
    assert cn.land_share(area, sqm * [0.75, 1.0], sqm * [0.25, 0.0]).tolist() == pytest.approx([0.75, 1.0])
    # a simplified outline is a little off the Census figures: still the same polygons
    assert cn.land_share(area, sqm * [0.75, 1.0] * 1.01, sqm * [0.25, 0.0] * 1.01).tolist() == pytest.approx([0.75, 1.0])
    assert cn.land_share(area, None, None) is None
    assert cn.land_share(area, [np.nan, 1.0], [0.0, 0.0]) is None       # a unit without figures
    assert cn.land_share(area, [0.0, 1.0], [0.0, 0.0]) is None          # ... or with nothing in them
    assert cn.land_share(area, sqm * 2, sqm * 0) is None                # figures of other shapes


def test_canopy_share_of_land_capped_and_measured_inside_the_county():
    units = gpd.GeoDataFrame({"GEOID": ["a", "b", "c"]}, geometry=[box(0, 0, 1000, 1000), box(1000, 0, 2000, 1000), box(2000, 0, 3000, 1000)], crs=sh.DSM_CRS)
    canopy = shapes(box(-100, 0, 300, 1000), box(1000, 0, 2000, 1000), box(2400, 0, 2800, 1000))
    sqm = 1e6 / cn.SQFT_PER_SQM
    census = pd.DataFrame({"ALAND": [0.75 * sqm, 0.5 * sqm, sqm], "AWATER": [0.25 * sqm, 0.5 * sqm, 0.0]}, index=["a", "b", "c"])

    t = cn.level_table(units, canopy, census=census)
    assert list(t.columns) == ["GEOID", "canopy_acres", "land_acres", "canopy_share", "basis"] and t["GEOID"].tolist() == ["a", "b", "c"]
    assert (t["basis"] == "land").all()
    assert t["canopy_share"].tolist() == [0.4, 1.0, 0.4]                # b: all canopy over half water, capped at 1
    assert t["canopy_acres"].tolist() == [6.9, 23.0, 9.2] and t["land_acres"].tolist() == [17.2, 11.5, 23.0]

    whole = cn.level_table(units, canopy)                               # no Census figures: the whole polygon
    assert (whole["basis"] == "total").all() and whole["canopy_share"].tolist() == [0.3, 1.0, 0.4]
    assert whole["land_acres"].tolist() == [23.0, 23.0, 23.0]
    assert cn.level_table(units, canopy, census=census.drop(index="b"))["basis"].tolist() == ["total"] * 3
    water = census.assign(ALAND=[0.75 * sqm, 0.5 * sqm, 0.0], AWATER=[0.25 * sqm, 0.5 * sqm, sqm])
    assert math.isnan(cn.level_table(units, canopy, census=water)["canopy_share"].tolist()[2])   # c is all water: no land to be a share of

    # the canopy map ends at x = 2600: c is measured on the 60% of it inside, and only the canopy there counts
    part = cn.level_table(units, canopy, cover=box(-500, -500, 2600, 1500))
    assert part["canopy_share"].tolist() == [0.3, 1.0, 0.3333] and part["land_acres"].tolist() == [23.0, 23.0, 13.8]
    # ... and with only 30% inside it gets no figure
    little = cn.level_table(units, canopy, cover=box(-500, -500, 2300, 1500))
    assert little["canopy_share"].tolist()[:2] == [0.3, 1.0] and little.iloc[2, 1:4].isna().all() and little["basis"].iloc[2] == "total"


def test_every_level_from_the_files_geo_levels_reads(tmp_path, monkeypatch):
    tracts = gpd.GeoDataFrame({"GEOID": ["42003000100", "42003000200"], "ALAND": [69677, 92903], "AWATER": [23226, 0]},
                              geometry=[box(0, 0, 1000, 1000), box(1000, 0, 2000, 1000)], crs=sh.DSM_CRS)
    zips = gpd.GeoDataFrame({"GEOID": ["15201", "15001"], "ZCTA5": ["15201", "15001"]}, geometry=[box(0, 0, 2000, 500), box(1900, 0, 9000, 1000)], crs=sh.DSM_CRS)
    tracts.to_file(tmp_path / "tracts.geojson", driver="GeoJSON")
    zips[["ZCTA5", "geometry"]].to_file(tmp_path / "zips.geojson", driver="GeoJSON")
    monkeypatch.setattr(cn, "CENSUS_FILES", {"tract": tmp_path / "tracts.geojson", "zcta": tmp_path / "zips.geojson"})
    monkeypatch.setattr(cn.gl, "units", lambda level, scope: {"tract": tracts, "zcta": zips}[level])
    monkeypatch.setattr(cn.gl, "county", lambda: gpd.GeoDataFrame({"GEOID": ["42003"]}, geometry=[box(0, 0, 2000, 1000)], crs=sh.DSM_CRS))
    assert cn.census_land_water("zcta") is None
    assert cn.census_land_water("tract").loc["42003000100"].tolist() == [69677.0, 23226.0]

    tables = cn.level_tables(shapes(box(0, 0, 300, 1000), box(1500, 0, 2500, 250)), levels=("tract", "zcta"), log=quiet)
    assert tables["tract"]["canopy_share"].tolist() == [0.4, 0.125] and tables["tract"]["basis"].tolist() == ["land", "land"]
    assert tables["zcta"]["basis"].tolist() == ["total", "total"]
    assert tables["zcta"]["canopy_share"].tolist()[0] == 0.275 and math.isnan(tables["zcta"]["canopy_share"].tolist()[1])   # 15001 is mostly outside

    files = cn.write_levels(tables, tmp_path / "out")
    assert [f.name for f in files] == ["canopy_tract.csv", "canopy_zcta.csv"]
    assert (tmp_path / "out" / "canopy_zcta.csv").read_text().splitlines() == ["GEOID,canopy_acres,land_acres,canopy_share,basis", "15201,6.3,23.0,0.275,total", "15001,,,,total"]

    values = cn.app_values(tables)
    assert values == {"built": cn.today(), "year": 2020, "basis": {"tract": "land", "zcta": "total"},
                      "values": {"tract": {"42003000100": 0.4, "42003000200": 0.125}, "zcta": {"15201": 0.275}}}
    text = cn.dump(values)
    assert " " not in text and json.loads(text) == values
    with pytest.raises(ValueError):
        cn.dump({"share": float("nan")})


# ---------------------------------------------------------------------------------------------------------------------
# Cells


def test_the_grid_is_the_shadow_runs_own():
    assert cn.tile_rect(RUN) == (13, 2273, 3086, 6, 5)
    assert cn.resolution() == ps.resolution(RUN)                        # zoom 15 at 512 px is zoom 13 at 2048 px
    assert cn.cell_sqft(cn.resolution()) == pytest.approx(ps.cell_sqft(RUN))
    west, south, east, north = cn.rect_bounds(13, 2273, 3086, 6, 5)
    assert (west, north) == (sh.tile_bounds(13, 2273, 3086)[0], sh.tile_bounds(13, 2273, 3086)[3])
    assert (east, south) == (sh.tile_bounds(13, 2278, 3090)[2], sh.tile_bounds(13, 2278, 3090)[1])
    assert (east - west) / cn.resolution() == pytest.approx(6 * 4 * cn.TILE_PX)


def test_a_cell_is_canopy_when_its_center_is_inside_a_shape():
    res = 10.0
    a = box(LEFT + 4, TOP - 26, LEFT + 36, TOP - 4)                    # centers at 5..35 across and 5..25 down
    grid = cn.rasterize(shapes(a), res, 0, 0, 6, 5)
    want = np.zeros((5, 6), dtype=np.uint8)
    want[0:3, 0:4] = 1
    assert grid.dtype == np.uint8 and np.array_equal(grid, want)
    assert np.array_equal(cn.rasterize(shapes(a), res, 2, 1, 3, 3), want[1:4, 2:5])   # a window further in
    assert np.array_equal(cn.rasterize(shapes(a, cells(1, 1, 2, 2)), res, 0, 0, 6, 5), want)   # a cell under two shapes is one cell
    assert cn.count_inside(grid, shapes(cells(2, 0, 5, 1)), res, 0, 0) == (8, 4)
    assert cn.count_inside(grid, shapes(cells(4, 3, 9, 9)), res, 0, 0) == (4, 0)   # the rest of it is off the grid
    # a shape wider than a block is cut before its cells are tested, and every cell still comes back once
    wide = box(LEFT, TOP - 3, LEFT + 2500, TOP)
    strip = cn.rasterize(shapes(wide), 1.0, 0, 0, 2600, 4)
    assert strip.sum() == 7500 and strip[:3, :2500].all()
    assert cn.count_inside(strip, shapes(wide), 1.0, 0, 0) == (7500, 7500)
    assert sum(len(col) for col, _ in cn.cell_groups(shapes(wide), 1.0, tests=1000)) == 7500


def test_cells_land_where_the_shapes_are():
    # one zoom 15 tile over Downtown at 64 px (cells of about 48 ft), shapes on the State Plane grid
    zoom, px = 15, 64
    lat, lon = sh.SUN_AT
    x = int((lon + 180) / 360 * (1 << zoom))
    y = int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * (1 << zoom))
    bounds = sh.tile_bounds(zoom, x, y)
    cx, cy = Transformer.from_crs("EPSG:3857", sh.DSM_CRS, always_xy=True).transform((bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2)
    canopy = shapes(box(cx - 900, cy - 500, cx - 100, cy + 700), Polygon([(cx + 100, cy - 900), (cx + 1100, cy - 900), (cx + 100, cy + 400)]),
                    box(cx + 900, cy + 600, cx + 9000, cy + 1000), box(cx + 50000, cy, cx + 51000, cy + 1000))
    res = cn.resolution(zoom, px)
    merc = cn.web_shapes(canopy, bounds)
    assert len(merc) == 3                                               # the far one is left out
    b = shapely.bounds(merc)
    assert b[:, 0].min() >= bounds[0] and b[:, 2].max() <= bounds[2]    # the long one is clipped to the tile
    grid = cn.rasterize(merc, res, x * px, y * px, px, px)
    inside_tile = gpd.GeoSeries(merc, crs="EPSG:3857").to_crs(sh.DSM_CRS).area.sum()
    assert grid.sum() * cn.cell_sqft(res) == pytest.approx(inside_tile, rel=0.03)
    assert cn.second_look(grid, canopy, res, x * px, y * px, n=3000) == (3000, 0)
    assert cn.second_look(np.roll(grid, 1, axis=1), canopy, res, x * px, y * px, n=3000)[1] > 30   # one cell off shows


# ---------------------------------------------------------------------------------------------------------------------
# Map tiles


def test_palette_and_indexes():
    colors = cn.palette()
    assert colors.shape == (17, 4) and (colors[:, :3] == (46, 125, 50)).all()
    assert colors[:, 3].tolist() == [0, 16, 32, 48, 64, 80, 96, 112, 128, 143, 159, 175, 191, 207, 223, 239, 255]
    assert cn.palette_index(np.array([0, 1]), 1).tolist() == [0, 16]
    assert cn.palette_index(np.array([0, 1, 2, 3, 4]), 4).tolist() == [0, 4, 8, 12, 16]
    assert cn.palette_index(np.array([0, 1, 2, 5, 6, 63, 64]), 64).tolist() == [0, 0, 1, 1, 2, 16, 16]   # halves go up
    assert cn.palette_index(np.array([7, 8, 256]), 256).tolist() == [0, 1, 16]


def test_a_tile_reads_back_as_written():
    index = np.random.default_rng(4).integers(0, 17, (5, 8)).astype(np.uint8)
    data = cn.png_palette(index)
    assert data[:8] == b"\x89PNG\r\n\x1a\n" and data[12:16] == b"IHDR" and data[16:26] == b"\x00\x00\x00\x08\x00\x00\x00\x05\x08\x03"
    assert data.index(b"PLTE") < data.index(b"tRNS") < data.index(b"IDAT")
    back, colors = cn.read_png_palette(data)
    assert np.array_equal(back, index) and np.array_equal(colors, cn.palette())
    clear = cn.png_palette(np.zeros((512, 512), dtype=np.uint8))
    assert len(clear) < 1000 and not cn.read_png_palette(clear)[0].any()


def test_each_lower_zoom_adds_up_two_by_two():
    px = 4
    grid = (np.random.default_rng(1).random((px, 2 * px)) < 0.5).astype(np.uint8)   # two tiles of zoom 3, from tile (3, 2)
    levels = list(cn.pyramid(grid, 3, 3, 2, minzoom=1, tile_px=px))
    assert [(z, x, y, count.shape, parts) for z, x, y, count, parts in levels] == [(3, 3, 2, (4, 8), 1), (2, 1, 1, (4, 8), 4), (1, 0, 0, (4, 8), 16)]
    rows, cols = np.nonzero(grid)
    for z, x, y, count, _ in levels:
        want = np.zeros(count.shape, dtype=int)
        np.add.at(want, (((2 * px + rows) >> (3 - z)) - y * px, ((3 * px + cols) >> (3 - z)) - x * px), 1)   # by each cell's place on the world map
        assert np.array_equal(count, want)
    assert sum(count.sum() for *_, count, _ in levels) == 3 * grid.sum()
    # the same as averaging shares 2 x 2
    share = levels[0][3].astype(float)
    assert np.array_equal(levels[1][3][:2, 2:6] / 4, share.reshape(2, 2, 4, 2).mean(axis=(1, 3)))


def test_every_tile_that_touches_the_grid_is_written(tmp_path):
    px = 4
    grid = np.zeros((px, 3 * px), dtype=np.uint8)     # zoom 3, tiles (3, 2), (4, 2), (5, 2)
    grid[:, :px] = 1                                  # the first all canopy
    grid[0, px] = 1                                   # one cell in the second, none in the third
    dest = tmp_path / "canopy"
    (dest / "9").mkdir(parents=True)
    (dest / "9" / "old.png").write_bytes(b"left from an earlier build")
    out = cn.write_tiles(grid, 3, 3, 2, dest, minzoom=1, tile_px=px)

    files = sorted(p.relative_to(dest).as_posix() for p in dest.rglob("*.png"))
    assert files == ["1/0/0.png", "1/1/0.png", "2/1/1.png", "2/2/1.png", "3/3/2.png", "3/4/2.png", "3/5/2.png"]
    assert out == json.loads((dest / "manifest.json").read_text())
    assert set(out) == {"version", "built", "source", "year", "tileSize", "minzoom", "maxzoom", "bounds", "tiles", "bytes", "path"}
    assert (out["version"], out["year"], out["tileSize"], out["minzoom"], out["maxzoom"], out["tiles"], out["path"]) == (1, 2020, px, 1, 3, 7, "{z}/{x}/{y}.png")
    assert out["bytes"] == sum((dest / f).stat().st_size for f in files)
    assert out["bounds"] == [round(v, 6) for v in (sh.tile_lonlat(3, 3, 2)[0], sh.tile_lonlat(3, 3, 2)[1], sh.tile_lonlat(3, 5, 2)[2], sh.tile_lonlat(3, 3, 2)[3])]

    def read(name: str) -> np.ndarray:
        return cn.read_png_palette((dest / name).read_bytes())[0]

    def only(shape, at, value) -> np.ndarray:
        page = np.zeros(shape, dtype=np.uint8)
        page[at] = value
        return page

    assert (read("3/3/2.png") == 16).all() and not read("3/5/2.png").any()
    assert np.array_equal(read("3/4/2.png"), only((px, px), (0, 0), 16))
    # zoom 2: tile (3, 2) is the upper right quarter of (1, 1), tile (4, 2) the upper left quarter of (2, 1)
    assert np.array_equal(read("2/1/1.png"), only((px, px), (slice(0, 2), slice(2, 4)), 16))
    assert np.array_equal(read("2/2/1.png"), only((px, px), (0, 0), 4))             # one cell of the pixel's four
    # zoom 1: both of those sit in the lower half of their tile
    assert np.array_equal(read("1/0/0.png"), only((px, px), (2, 3), 16))
    assert np.array_equal(read("1/1/0.png"), only((px, px), (2, 0), 1))             # one cell of sixteen


# ---------------------------------------------------------------------------------------------------------------------
# By lot


def test_canopy_share_of_a_lot_and_the_smallest_lot_that_gets_one(tmp_path):
    res = 10.0
    grid = cn.rasterize(shapes(cells(0, 0, 3, 9)), res, 0, 0, 12, 12)        # canopy over the four columns on the left
    lots = shapes(cells(2, 0, 5, 4), cells(1, 7, 3, 9), cells(10, 0, 13, 4), cells(6, 6, 9, 9))
    lot, col, row = ps.lot_cells(lots, res)
    n, under = cn.lot_canopy(lot, col, row, len(lots), grid, 0, 0)
    assert n.tolist() == [20, 9, 10, 16] and under.tolist() == [10, 9, 0, 0]   # the third lot's cells off the grid are not counted
    frame = gpd.GeoDataFrame({"pin": ["0001A00001000000", "NOT ASSESSED", "", "NA"], "lot": ["1-A-1", "", "", "1-A-4"], "geoid": ["42003020100"] * 4,
                              "use": ["vacant", ps.UNRECORDED, "residential", "vacant"], "sqft": [1999.6, 880.2, 2000.4, 1600.0]}, geometry=lots, crs="EPSG:3857")
    t = cn.lot_table(frame, n, under)
    assert list(t.columns) == ["pin", "lot", "geoid", "use", "sqft", "cells", "canopy_share"]
    assert t["sqft"].tolist() == [2000, 880, 2000, 1600] and t["cells"].tolist() == [20, 9, 10, 16]
    assert t["canopy_share"].tolist()[0] == 0.5 and math.isnan(t["canopy_share"].tolist()[1]) and t["canopy_share"].tolist()[2:] == [0.0, 0.0]
    assert ps.MIN_CELLS == 10                                                  # nine cells all under canopy: still no figure

    t.to_csv(tmp_path / "parcel_canopy.csv", index=False)
    assert (tmp_path / "parcel_canopy.csv").read_text().splitlines()[:3] == [
        "pin,lot,geoid,use,sqft,cells,canopy_share", "0001A00001000000,1-A-1,42003020100,vacant,2000,20,0.5", "NOT ASSESSED,,42003020100,unrecorded,880,9,"]
    back = cn.read_lot_table(tmp_path / "parcel_canopy.csv")
    assert back["pin"].tolist() == ["0001A00001000000", "NOT ASSESSED", "", "NA"] and back["lot"].tolist() == ["1-A-1", "", "", "1-A-4"]
    assert back["geoid"].tolist() == ["42003020100"] * 4 and back["cells"].tolist() == [20, 9, 10, 16]
    assert math.isnan(back["canopy_share"].tolist()[1]) and back["canopy_share"].tolist()[0] == 0.5


# ---------------------------------------------------------------------------------------------------------------------
# By tract


def shadow_lots() -> pd.DataFrame:
    """Seven lots in two tracts as parcel_shadow.csv lists them. Three shapes carry the same placeholder ID."""
    return pd.DataFrame({
        "pin": ["A", "NOT ASSESSED", "NOT ASSESSED", "B", "C", "D", "NOT ASSESSED"],
        "lot": ["1-A-1", "", "", "1-A-2", "1-A-3", "2-B-1", ""],
        "geoid": ["t1", "t1", "t1", "t1", "t1", "t2", "t2"],
        "use": ["vacant", "vacant", "vacant", "residential", "vacant", "vacant", "vacant"],
        "sqft": [43560, 21780, 2000, 5000, 1999, 87120, 3000],
        "cells": [1200, 600, 55, 140, 55, 2400, 80],
        "rated": [True, True, True, True, True, True, False],
        "shade_jun": [0.2] * 7, "shade_sep": [0.5] * 7, "shade_dec": [0.5, 0.5, 0.5, 0.5, 0.5, 0.75, 0.1],
        "sun_h_dec": [5.0, 4.5, 4.4, 6.0, 8.0, 2.0, 9.0],
    })


def canopy_lots(shares=(0.1, 0.49, 0.2, 0.0, 0.0, 0.5, 0.0)) -> pd.DataFrame:
    t = shadow_lots()[["pin", "lot", "geoid", "use", "sqft", "cells"]]
    return t.assign(canopy_share=list(shares))


def test_lots_are_matched_row_for_row_not_by_their_id():
    shadow, canopy = shadow_lots(), canopy_lots()
    assert len(shadow.merge(canopy[["pin", "canopy_share"]], on="pin")) == 13      # what a join on the ID would do
    both = cn.join_lots(shadow, canopy)
    assert len(both) == len(shadow) == 7
    assert both["canopy_share"].tolist() == [0.1, 0.49, 0.2, 0.0, 0.0, 0.5, 0.0]   # each NOT ASSESSED shape keeps its own
    assert both["sun_h_dec"].tolist() == shadow["sun_h_dec"].tolist()
    with pytest.raises(ValueError, match="same lots"):
        cn.join_lots(shadow, canopy.iloc[::-1])
    with pytest.raises(ValueError, match="same lots"):
        cn.join_lots(shadow, canopy.iloc[:-1])
    with pytest.raises(ValueError, match="same lots"):
        cn.join_lots(shadow, canopy.assign(sqft=canopy["sqft"] + 1))


def test_vacant_lot_counts():
    both = cn.join_lots(shadow_lots(), canopy_lots())
    t1 = cn.vacant_figures(both[both["geoid"] == "t1"], "sun_h_dec", 4.5)
    # A, the two placeholder shapes and C are vacant; C is under 2,000 sq ft; the third gets 4.4 hours, under half the day
    assert t1 == {"vacant": 4, "vacant_2k": 3, "vacant_open": 3, "vacant_open_acres": 1.5, "vacant_sunny": 2, "vacant_sunny_acres": 1.5}
    # D is half under canopy, which is not under half; the placeholder shape is not rated
    assert cn.vacant_figures(both[both["geoid"] == "t2"], "sun_h_dec", 4.5) == {
        "vacant": 1, "vacant_2k": 1, "vacant_open": 0, "vacant_open_acres": 0.0, "vacant_sunny": 0, "vacant_sunny_acres": 0.0}
    assert cn.vacant_figures(both, "sun_h_dec", 4.5)["vacant"] == 5
    # a lot with no canopy figure is not called open
    blank = cn.join_lots(shadow_lots(), canopy_lots((np.nan, 0.49, 0.2, 0.0, 0.0, 0.5, 0.0)))
    assert cn.vacant_figures(blank, "sun_h_dec", 4.5)["vacant_open"] == 2
    assert set(t1) == set(cn.VACANT_FIELDS)


def test_within_half_a_mile_of_a_stop():
    stops = shapely.points([(0, 0), (10000, 0)])
    points = shapely.points([(2640, 0), (2640.5, 0), (0, -2000), (8000, 1000), (5000, 5000)])
    assert cn.near_a_stop(points, stops).tolist() == [True, False, True, True, False]
    assert cn.near_a_stop(points, stops, radius=100).tolist() == [False] * 5


def level_rows(geoids, acres, shares) -> pd.DataFrame:
    return pd.DataFrame({"GEOID": geoids, "canopy_acres": acres, "land_acres": [100.0] * len(geoids), "canopy_share": shares, "basis": "land"})


def test_the_analysis_file():
    tracts = level_rows(["t1", "t2", "t3", "t4"], [40.0, 10.0, 25.5, 99.0], [0.4, 0.1, 0.255, 0.99])
    city = level_rows(["4261000"], [14000.1], [0.3951])
    tract_shadow = pd.DataFrame({"geoid": ["t1", "t2"], "lots": [5, 1], "acres": [1.7, 2.0], "shade_jun": [0.2, 0.2], "sun_h_jun": [11.6, 11.6],
                                 "shade_sep": [0.5, 0.5], "sun_h_sep": [6.0, 6.0], "shade_dec": [0.5, 0.75], "sun_h_dec": [4.5, 2.3]})
    lots = cn.join_lots(shadow_lots(), canopy_lots())
    near = pd.DataFrame({"geoid": lots["geoid"], "near": [True, True, True, True, False, True, True]})
    site = cn.site_tract(["t1", "t2", "t3"], tracts, city, RUN, tract_shadow, lots, near)

    assert list(site) == ["built", "days", "day_hours", "city", "median", "tracts"]
    assert site["built"] == cn.today() and site["days"] == ["jun21", "sep22", "dec21"] and site["day_hours"] == [14.5, 12.0, 9.0]
    assert list(site["tracts"]) == ["t1", "t2", "t3"]
    fields = ["canopy", "canopy_acres", "sun", "shade", "lots", "vacant", "vacant_2k", "vacant_open", "vacant_open_acres", "vacant_sunny",
              "vacant_sunny_acres", "transit_half"]
    assert all(list(block) == fields for block in (site["city"], site["median"], *site["tracts"].values()))
    assert site["tracts"]["t1"] == {"canopy": 0.4, "canopy_acres": 40.0, "sun": [11.6, 6.0, 4.5], "shade": [0.2, 0.5, 0.5], "lots": 5, "vacant": 4,
                                    "vacant_2k": 3, "vacant_open": 3, "vacant_open_acres": 1.5, "vacant_sunny": 2, "vacant_sunny_acres": 1.5, "transit_half": 0.8}
    assert site["tracts"]["t2"] == {"canopy": 0.1, "canopy_acres": 10.0, "sun": [11.6, 6.0, 2.3], "shade": [0.2, 0.5, 0.75], "lots": 1, "vacant": 1,
                                    "vacant_2k": 1, "vacant_open": 0, "vacant_open_acres": 0.0, "vacant_sunny": 0, "vacant_sunny_acres": 0.0, "transit_half": 1.0}
    # a tract with no lots: canopy only, nothing to count
    assert site["tracts"]["t3"] == {"canopy": 0.255, "canopy_acres": 25.5, "sun": None, "shade": None, "lots": None, "vacant": 0, "vacant_2k": 0,
                                    "vacant_open": 0, "vacant_open_acres": 0.0, "vacant_sunny": 0, "vacant_sunny_acres": 0.0, "transit_half": None}
    # the city: shadow weighted by cells over the six rated lots, counts added up, all seven lots for transit
    dec = (0.5 * 2050 + 0.75 * 2400) / 4450
    assert site["city"] == {"canopy": 0.3951, "canopy_acres": 14000.1, "sun": [11.6, 6.0, round((1 - dec) * 9, 2)], "shade": [0.2, 0.5, round(dec, 4)],
                            "lots": 6, "vacant": 5, "vacant_2k": 4, "vacant_open": 3, "vacant_open_acres": 1.5, "vacant_sunny": 2,
                            "vacant_sunny_acres": 1.5, "transit_half": 0.8571}
    assert site["median"] == {"canopy": 0.255, "canopy_acres": 25.5, "sun": [11.6, 6.0, 3.4], "shade": [0.2, 0.5, 0.625], "lots": 3.0, "vacant": 1.0,
                              "vacant_2k": 1.0, "vacant_open": 0.0, "vacant_open_acres": 0.0, "vacant_sunny": 0.0, "vacant_sunny_acres": 0.0, "transit_half": 0.9}
    text = cn.dump(site)
    assert " " not in text.replace(cn.today(), "") and json.loads(text) == site


def test_the_analysis_file_without_the_shadow_step():
    tracts = level_rows(["t1", "t2"], [40.0, 10.0], [0.4, 0.1])
    city = level_rows(["4261000"], [14000.1], [0.3951])
    site = cn.site_tract(["t1", "t2"], tracts, city)
    nothing = dict.fromkeys(["sun", "shade", "lots", *cn.VACANT_FIELDS, "transit_half"])
    assert site["days"] is None and site["day_hours"] is None
    assert site["tracts"] == {"t1": {"canopy": 0.4, "canopy_acres": 40.0, **nothing}, "t2": {"canopy": 0.1, "canopy_acres": 10.0, **nothing}}
    assert site["city"] == {"canopy": 0.3951, "canopy_acres": 14000.1, **nothing} and site["median"] == {"canopy": 0.25, "canopy_acres": 25.0, **nothing}
    assert json.loads(cn.dump(site)) == site
    # lots and stops but no shadow tables: transit is there, the sun and vacant-lot figures are not
    near = pd.DataFrame({"geoid": ["t1", "t1", "t2"], "near": [True, False, True]})
    some = cn.site_tract(["t1", "t2"], tracts, city, RUN, None, None, near)
    assert some["day_hours"] == [14.5, 12.0, 9.0] and some["tracts"]["t1"]["transit_half"] == 0.5 and some["city"]["transit_half"] == 0.6667
    assert some["tracts"]["t1"]["sun"] is None and some["tracts"]["t1"]["vacant"] is None and some["city"]["lots"] is None
