import json
import shutil
from datetime import date

import geopandas as gpd
import numpy as np
import pandas as pd
import pytest
from pyproj import Transformer
from shapely.geometry import MultiPolygon, Polygon, box

from visionpitts import parcel_shadow as ps
from visionpitts import shadow as sh

# A small made-up surface placed over Downtown, as in test_shadow: flat ground, one block of tall buildings, and a
# strip with no data down the west side. Cells of 48 ft, about one page pixel each at 256 px per chunk.
X0, Y0, CELL = 1340000.0, 412000.0, 48.0
BLOCK = box(X0 + 140 * CELL, Y0 - 160 * CELL, X0 + 160 * CELL, Y0 - 140 * CELL)
QUIET = lambda *_: None


@pytest.fixture(scope="module")
def run(tmp_path_factory):
    out = tmp_path_factory.mktemp("run")
    dsm = np.full((300, 300), 720.0, dtype=np.float32)
    dsm[140:160, 140:160] = 1200.0
    dsm[:, :20] = sh.NODATA
    days = [("jun21", "June 21", date(2026, 6, 21)), ("dec21", "December 21", date(2026, 12, 21))]
    sh.build(dsm, X0, Y0, CELL, sh.ReferenceCaster(dsm, CELL), out, days=days, chunk_px=256, overview_factor=4, log=QUIET)
    return out, ps.load_run(out)


def counted(run, shapes):
    src, m = run
    merc = gpd.GeoSeries(shapes, crs=sh.DSM_CRS).to_crs("EPSG:3857").to_numpy()
    lot, col, row = ps.lot_cells(merc, ps.resolution(m))
    return merc, (lot, col, row), ps.count(src, m, lot, col, row, len(shapes), log=QUIET)


def frame(shapes, uses=None):
    names = [f"lot{i}" for i in range(len(shapes))]
    return gpd.GeoDataFrame({"pin": names, "lot": names, "geoid": ["42003020100"] * len(shapes), "use": uses or ["residential"] * len(shapes),
                             "sqft": [g.area for g in shapes]}, geometry=shapes, crs=sh.DSM_CRS)


def chunk_edge(run):
    """A point (State Plane feet) on the line between two chunks, inside the surface."""
    _, m = run
    xs = sorted({x for x, _ in m["chunks"]})
    assert len(xs) >= 2
    to_merc = Transformer.from_crs(sh.DSM_CRS, "EPSG:3857", always_xy=True)
    back = Transformer.from_crs("EPSG:3857", sh.DSM_CRS, always_xy=True)
    _, my = to_merc.transform(X0 + 150 * CELL, Y0 - 250 * CELL)
    ex, ey = back.transform(sh.tile_bounds(m["grid"]["z"], xs[1], 0)[0], my)
    assert X0 + 30 * CELL < ex < X0 + 270 * CELL
    return ex, ey


def test_a_cell_belongs_to_a_lot_when_its_center_is_inside():
    res = 10.0
    left, top = -sh.MERC, sh.MERC
    a = box(left + 4, top - 26, left + 36, top - 4)                 # centers at 5, 15, 25, 35 across and 5, 15, 25 down
    b = Polygon([(left + 100, top - 100), (left + 130, top - 100), (left + 130, top - 110), (left + 110, top - 110),
                 (left + 110, top - 130), (left + 100, top - 130)])    # an L: three cells along the top, two more down the left
    lot, col, row = ps.lot_cells(np.array([a, b], dtype=object), res)
    assert sorted(zip(col[lot == 0].tolist(), row[lot == 0].tolist())) == [(c, r) for c in range(4) for r in range(3)]
    assert sorted(zip(col[lot == 1].tolist(), row[lot == 1].tolist())) == [(10, 10), (10, 11), (10, 12), (11, 10), (12, 10)]
    # a center exactly on the lot line is not inside, and small batches give the same cells
    edge = box(left + 5, top - 15, left + 15, top - 5)
    assert len(ps.lot_cells(np.array([edge], dtype=object), res)[0]) == 0
    again = ps.lot_cells(np.array([a, b], dtype=object), res, batch=5)
    assert all(np.array_equal(x, y) for x, y in zip(again, (lot, col, row)))


def test_counts_match_a_second_slower_count(run):
    src, m = run
    north = box(BLOCK.bounds[0] + 80, BLOCK.bounds[3] + 20, BLOCK.bounds[2] - 80, BLOCK.bounds[3] + 620)   # in the block's winter shadow
    south = box(BLOCK.bounds[0] + 80, Y0 - 280 * CELL, BLOCK.bounds[2] - 80, Y0 - 268 * CELL)             # open ground
    ring = Polygon(box(X0 + 60 * CELL, Y0 - 100 * CELL, X0 + 90 * CELL, Y0 - 70 * CELL).exterior.coords,
                   [box(X0 + 70 * CELL, Y0 - 90 * CELL, X0 + 80 * CELL, Y0 - 80 * CELL).exterior.coords])  # a lot with a hole
    two = MultiPolygon([box(X0 + 200 * CELL, Y0 - 60 * CELL, X0 + 210 * CELL, Y0 - 50 * CELL), box(X0 + 220 * CELL, Y0 - 60 * CELL, X0 + 226 * CELL, Y0 - 50 * CELL)])
    shapes = [north, south, ring, two, BLOCK]
    merc, _, (shaded, cells, touched) = counted(run, shapes)
    res = ps.resolution(m)
    for i, g in enumerate(merc):
        again, n = ps.recount(src, m, g, res)
        assert n == cells[i] > 0 and np.array_equal(again, shaded[i])
    assert np.array_equal(cells, touched)
    # about one cell per 48 x 48 ft; the hole's cells are not the lot's
    assert cells[2] == pytest.approx(ring.area / ps.cell_sqft(m), rel=0.06)
    r = ps.measures(shaded, cells, touched, m)
    dec = [d["id"] for d in m["days"]].index("dec21")
    jun = 1 - dec
    assert r["ok"].all()
    assert r["shade"][0, dec] > r["shade"][0, jun] > 0 and r["shade"][1, dec] < 0.05
    # the roof of the block is the highest thing there: nothing shades it
    assert r["shade"][4].max() == 0 and r["sun_h"][4, dec] == pytest.approx(9.0)
    # at the middle of the winter day the lot behind the block is mostly in its shadow, the open lot is not
    noon = ps.day_offsets(m)[dec] + len(m["days"][dec]["steps"]) // 2
    assert r["profile"][0, noon] > 50 and r["profile"][1, noon] == 0


def test_a_lot_across_a_chunk_edge_is_counted_once(run):
    src, m = run
    ex, ey = chunk_edge(run)
    shape = box(ex - 300, ey - 200, ex + 300, ey + 200)
    merc, (lot, col, _row), (shaded, cells, touched) = counted(run, [shape])
    assert len(np.unique(col // m["grid"]["px"])) == 2
    again, n = ps.recount(src, m, merc[0], ps.resolution(m))
    assert n == cells[0] == touched[0] == len(lot) and np.array_equal(again, shaded[0])


def test_cells_without_data_are_left_out_and_thin_lots_are_not_rated(run):
    _, m = run
    half = box(X0 + 12 * CELL, Y0 - 60 * CELL, X0 + 30 * CELL, Y0 - 40 * CELL)     # 8 of its 18 columns are in the no-data strip
    mostly_out = box(X0 + 4 * CELL, Y0 - 60 * CELL, X0 + 26 * CELL, Y0 - 40 * CELL)   # 16 of 22 are
    outside = box(X0 + 2 * CELL, Y0 - 60 * CELL, X0 + 12 * CELL, Y0 - 40 * CELL)      # all of it is
    tiny = box(X0 + 100 * CELL, Y0 - 102 * CELL, X0 + 102 * CELL, Y0 - 100 * CELL)    # about four cells
    far = box(X0 - 90000, Y0, X0 - 89000, Y0 + 1000)                                  # nowhere near the run
    _, _, (shaded, cells, touched) = counted(run, [half, mostly_out, outside, tiny, far])
    assert 0 < cells[0] < touched[0] and cells[2] == 0 < touched[2] and cells[4] == 0 < touched[4]
    r = ps.measures(shaded, cells, touched, m)
    assert r["ok"].tolist() == [True, False, False, False, False]
    assert (r["profile"][1:] == ps.PROFILE_NODATA).all() and (r["profile"][0] <= 100).all()
    assert np.isnan(r["shade"][2]).all() and not np.isnan(r["shade"][3]).any()


def test_a_page_whose_bits_and_hours_disagree_is_refused(run, tmp_path):
    src, m = run
    bad = tmp_path / "run"
    shutil.copytree(src, bad)
    day = m["days"][0]
    x, y = next((x, y) for x, y in m["chunks"] if (sh.read_png_gray((src / day["id"] / f"{x}_{y}_h.png").read_bytes()) != sh.HOURS_NODATA).any())
    hours = sh.read_png_gray((bad / day["id"] / f"{x}_{y}_h.png").read_bytes())
    page = sh.read_png_gray((bad / day["id"] / f"{x}_{y}_p0.png").read_bytes())
    r, c = np.argwhere(hours != sh.HOURS_NODATA)[0]
    page[r, c] ^= 1
    (bad / day["id"] / f"{x}_{y}_p0.png").write_bytes(sh.png_gray(page))
    ps.read_chunk(src, m, day, x, y)
    with pytest.raises(ValueError, match="do not add up"):
        ps.read_chunk(bad, m, day, x, y)


def test_the_three_figures():
    m = {"days": [{"id": "aaa01", "steps": [{}] * 2}, {"id": "bbb02", "steps": [{}] * 4}], "stepMinutes": 30}
    shaded = np.array([[10, 0, 5, 5, 0, 10], [9, 9, 9, 9, 9, 9], [0, 0, 0, 0, 0, 0]], dtype=np.int32)
    cells = np.array([10, 9, 0])
    r = ps.measures(shaded, cells, cells.copy(), m)
    assert r["ok"].tolist() == [True, False, False]
    assert r["shade"][0].tolist() == [0.5, 0.5] and r["mostly"][0].tolist() == [0.5, 0.75] and r["sun_h"][0].tolist() == [0.5, 1.0]
    assert r["profile"][0].tolist() == [100, 0, 50, 50, 0, 100]
    assert r["shade"][1].tolist() == [1.0, 1.0] and (r["profile"][1] == ps.PROFILE_NODATA).all()   # counted, but too small to rate
    assert np.isnan(r["shade"][2]).all()
    assert ps.day_offsets(m) == [0, 2] and ps.total_steps(m) == 6


def test_tables_and_map_files(run, tmp_path):
    _, m = run
    ex, ey = chunk_edge(run)
    shapes = [box(ex - 2000, ey - 300, ex - 1400, ey + 300), box(ex - 1900, ey - 100, ex - 1700, ey + 100),   # a lot, and a small one inside it
              box(ex + 500, ey - 300, ex + 1100, ey + 300), box(ex - 200, ey - 300, ex + 400, ey + 300),       # the last one crosses the edge
              box(X0 + 2 * CELL, Y0 - 60 * CELL, X0 + 12 * CELL, Y0 - 40 * CELL)]                               # no data at all
    lots = frame(shapes, ["residential", "vacant", "commercial", "residential", "residential"])
    _, _, (shaded, cells, touched) = counted(run, shapes)
    r = ps.measures(shaded, cells, touched, m)

    sizes = ps.write_tables(lots, r, shaded, cells, m, tmp_path / "tables")
    assert set(sizes) == {"parcel_shadow.csv", "parcel_shadow.gpkg", "parcel_profiles.parquet", "tract_shadow.csv", "use_shadow.csv"}
    t = pd.read_csv(tmp_path / "tables" / "parcel_shadow.csv")
    assert len(t) == 5 and t["rated"].tolist() == [True, True, True, True, False]
    assert {"pin", "lot", "geoid", "use", "sqft", "cells", "shade_jun", "sun_h_dec", "mostly_dec"} <= set(t.columns)
    assert len(gpd.read_file(tmp_path / "tables" / "parcel_shadow.gpkg")) == 5
    prof = pd.read_parquet(tmp_path / "tables" / "parcel_profiles.parquet")
    assert prof.columns[1] == "jun21_0630" and prof.shape == (5, 1 + ps.total_steps(m)) and prof.iloc[4, 1:].isna().all()
    # a roll-up weighs lots by their cells
    use = pd.read_csv(tmp_path / "tables" / "use_shadow.csv", index_col=0)
    homes = [0, 3]
    n = len(m["days"][0]["steps"])
    assert use.loc["residential", "lots"] == 2
    assert use.loc["residential", "shade_jun"] == pytest.approx(shaded[homes, :n].sum() / (cells[homes].sum() * n), abs=1e-4)

    out = ps.write_app(lots, r, cells, m, tmp_path / "app")
    assert out["lots"] == 4 and out["rated"] == 4 and out["minZoom"] == ps.MIN_ZOOM
    assert [d["steps"] for d in out["days"]] == [len(d["steps"]) for d in m["days"]]
    assert len(out["chunks"]) == 2
    seen = 0
    for x, y, n_lots, west, south, east, north in out["chunks"]:
        fc = json.loads((tmp_path / "app" / f"{x}_{y}.json").read_text())
        feats = fc["features"]
        assert [f["properties"]["i"] for f in feats] == list(range(n_lots))
        sf = [f["properties"]["sf"] for f in feats]
        assert sf == sorted(sf, reverse=True)
        for f in feats:
            p = f["properties"]
            assert set(p) == {"i", "lot", "u", "sf", "n", "s0", "s1", "m0", "m1"} and all(not isinstance(v, (list, dict)) for v in p.values())
            assert 0 <= p["s0"] <= 100 and out["uses"][p["u"]] in {"residential", "vacant", "commercial"}
            xs = [pt[0] for pt in f["geometry"]["coordinates"][0]]
            ys = [pt[1] for pt in f["geometry"]["coordinates"][0]]
            assert west <= min(xs) and max(xs) <= east and south <= min(ys) and max(ys) <= north
        rows = np.frombuffer((tmp_path / "app" / f"{x}_{y}.bin").read_bytes(), dtype=np.uint8).reshape(n_lots, ps.total_steps(m))
        at = [int(f["properties"]["lot"][3:]) for f in feats]
        assert np.array_equal(rows, r["profile"][at])
        seen += n_lots
    assert seen == 4
    # the lot across the edge sits whole in one chunk, and that chunk's extent reaches past its own tile
    tile_edge = sh.tile_lonlat(m["grid"]["z"], sorted({c[0] for c in out["chunks"]})[1], 0)[0]
    assert any(c[3] < tile_edge < c[5] for c in out["chunks"])


def test_lots_are_kept_by_where_they_are_not_by_their_id(tmp_path, monkeypatch):
    from visionpitts import place_measures as pm

    tract = gpd.GeoDataFrame({"GEOID": ["42003020100"]}, geometry=[box(X0, Y0 - 5000, X0 + 5000, Y0)], crs=sh.DSM_CRS)
    bow = Polygon([(X0 + 3000, Y0 - 3000), (X0 + 3200, Y0 - 3200), (X0 + 3200, Y0 - 3000), (X0 + 3000, Y0 - 3200)])   # crosses itself
    shapes = gpd.GeoDataFrame(
        {"PIN": ["0001A00001000000", "NOT ASSESSED", "NOT ASSESSED", "0001A00002000000", "0001A00003000000"],
         "MAPBLOCKLO": ["1-A-1", "NOT ASSESSED", " ", "1-A-2", "1-A-3"]},
        geometry=[box(X0 + 100, Y0 - 200, X0 + 200, Y0 - 100), box(X0 + 300, Y0 - 200, X0 + 400, Y0 - 100),
                  box(X0 + 9000, Y0 - 200, X0 + 9100, Y0 - 100), box(X0 + 500, Y0 - 200, X0 + 600, Y0 - 100), bow], crs=sh.DSM_CRS)
    shapes.to_file(tmp_path / "parcels.geojson", driver="GeoJSON")
    pd.DataFrame({"PARID": ["0001A00001000000", "0001A00002000000"], "CLASSDESC": ["RESIDENTIAL", "COMMERCIAL"],
                  "USEDESC": ["SINGLE FAMILY", "VACANT COMMERCIAL LAND"], "OWNER": ["nobody reads this", ""]}).to_csv(tmp_path / "assess.csv", index=False)
    monkeypatch.setattr(pm, "PARCELS_GEOJSON", tmp_path / "parcels.geojson")
    monkeypatch.setattr(pm, "ASSESSMENTS_CSV", tmp_path / "assess.csv")
    monkeypatch.setattr(pm, "tracts_city", lambda: tract)
    lots = ps.load_lots(log=QUIET)
    assert lots["pin"].tolist() == ["0001A00001000000", "NOT ASSESSED", "0001A00002000000", "0001A00003000000"]
    assert lots["use"].tolist() == ["residential", ps.UNRECORDED, "vacant", ps.UNRECORDED]
    assert lots["lot"].tolist() == ["1-A-1", "", "1-A-2", "1-A-3"] and (lots["geoid"] == "42003020100").all()
    assert lots.geometry.is_valid.all() and lots["sqft"].iloc[0] == pytest.approx(10000)
    assert list(lots.columns) == ["pin", "lot", "geoid", "use", "sqft", "geometry"]
